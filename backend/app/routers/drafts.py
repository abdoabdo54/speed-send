from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app import models, schemas
from app.database import get_db
from typing import List, Dict
import math
from datetime import datetime

router = APIRouter()

@router.post("/drafts", response_model=schemas.DraftCampaignResponse)
def create_draft_campaign(draft_data: schemas.DraftCampaignCreate, db: Session = Depends(get_db)):
    """
    Creates a new Draft Campaign.
    """
    new_draft_campaign = models.DraftCampaign(
        name=draft_data.name,
        subject=draft_data.subject,
        from_name=draft_data.from_name,
        body_html=draft_data.body_html,
        status='draft'
    )
    db.add(new_draft_campaign)
    db.commit()
    db.refresh(new_draft_campaign)

    return schemas.DraftCampaignResponse(
        id=new_draft_campaign.id,
        name=new_draft_campaign.name,
        subject=new_draft_campaign.subject,
        from_name=new_draft_campaign.from_name,
        created_at=new_draft_campaign.created_at,
        total_drafts=0,
        drafts_by_user={},
        status=new_draft_campaign.status,
        recipients_count=0,
        users_count=0,
        emails_per_user=0
    )

@router.get("/drafts", response_model=List[schemas.DraftCampaignResponse])
def get_draft_campaigns(db: Session = Depends(get_db)):
    """
    Get all draft campaigns.
    """
    draft_campaigns = db.query(models.DraftCampaign).options(
        joinedload(models.DraftCampaign.gmail_drafts).joinedload(models.GmailDraft.user)
    ).all()
    
    response = []
    for campaign in draft_campaigns:
        total_drafts = len(campaign.gmail_drafts)
        drafts_by_user = {}
        for draft in campaign.gmail_drafts:
            if draft.user:
                user_email = draft.user.email
                drafts_by_user[user_email] = drafts_by_user.get(user_email, 0) + 1
        
        # Calculate recipients count from all drafts
        recipients_count = sum(len(draft.recipients) for draft in campaign.gmail_drafts)
        users_count = len(set(draft.user_id for draft in campaign.gmail_drafts if draft.user_id))
        
        response.append(schemas.DraftCampaignResponse(
            id=campaign.id,
            name=campaign.name,
            subject=campaign.subject,
            from_name=campaign.from_name,
            created_at=campaign.created_at,
            total_drafts=total_drafts,
            drafts_by_user=drafts_by_user,
            status=campaign.status,
            recipients_count=recipients_count,
            users_count=users_count,
            emails_per_user=campaign.emails_per_user or 0
        ))
    return response

@router.get("/drafts/{draft_id}", response_model=schemas.DraftCampaignResponse)
def get_draft_campaign(draft_id: int, db: Session = Depends(get_db)):
    """
    Get a specific draft campaign.
    """
    campaign = db.query(models.DraftCampaign).options(
        joinedload(models.DraftCampaign.gmail_drafts).joinedload(models.GmailDraft.user)
    ).filter(models.DraftCampaign.id == draft_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Draft campaign not found")

    total_drafts = len(campaign.gmail_drafts)
    drafts_by_user = {}
    for draft in campaign.gmail_drafts:
        if draft.user:
            user_email = draft.user.email
            drafts_by_user[user_email] = drafts_by_user.get(user_email, 0) + 1

    recipients_count = sum(len(draft.recipients) for draft in campaign.gmail_drafts)
    users_count = len(set(draft.user_id for draft in campaign.gmail_drafts if draft.user_id))

    return schemas.DraftCampaignResponse(
        id=campaign.id,
        name=campaign.name,
        subject=campaign.subject,
        from_name=campaign.from_name,
        created_at=campaign.created_at,
        total_drafts=total_drafts,
        drafts_by_user=drafts_by_user,
        status=campaign.status,
        recipients_count=recipients_count,
        users_count=users_count,
        emails_per_user=campaign.emails_per_user or 0
    )

@router.patch("/drafts/{draft_id}", response_model=schemas.DraftCampaignResponse)
def update_draft_campaign(draft_id: int, draft_data: schemas.DraftCampaignUpdate, db: Session = Depends(get_db)):
    """
    Update a draft campaign.
    """
    campaign = db.query(models.DraftCampaign).filter(models.DraftCampaign.id == draft_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Draft campaign not found")

    # Update fields if provided
    if draft_data.name is not None:
        campaign.name = draft_data.name
    if draft_data.subject is not None:
        campaign.subject = draft_data.subject
    if draft_data.from_name is not None:
        campaign.from_name = draft_data.from_name
    if draft_data.body_html is not None:
        campaign.body_html = draft_data.body_html

    db.commit()
    db.refresh(campaign)

    return schemas.DraftCampaignResponse(
        id=campaign.id,
        name=campaign.name,
        subject=campaign.subject,
        from_name=campaign.from_name,
        created_at=campaign.created_at,
        total_drafts=len(campaign.gmail_drafts),
        drafts_by_user={},
        status=campaign.status,
        recipients_count=0,
        users_count=0,
        emails_per_user=campaign.emails_per_user or 0
    )

@router.delete("/drafts/{draft_id}")
def delete_draft_campaign(draft_id: int, db: Session = Depends(get_db)):
    """
    Delete a draft campaign and all associated drafts.
    """
    campaign = db.query(models.DraftCampaign).filter(models.DraftCampaign.id == draft_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Draft campaign not found")

    # Delete all associated GmailDraft records
    db.query(models.GmailDraft).filter(models.GmailDraft.draft_campaign_id == draft_id).delete()
    
    # Delete the campaign
    db.delete(campaign)
    db.commit()
    
    return {"detail": f"Draft campaign '{campaign.name}' and all its associated drafts have been deleted."}

@router.post("/drafts/{draft_id}/upload")
def upload_drafts_to_users(draft_id: int, upload_data: schemas.DraftUploadRequest, db: Session = Depends(get_db)):
    """
    Upload draft messages to selected users with specified recipients.
    """
    campaign = db.query(models.DraftCampaign).filter(models.DraftCampaign.id == draft_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Draft campaign not found")

    # Get selected users
    users = db.query(models.WorkspaceUser).filter(
        models.WorkspaceUser.id.in_(upload_data.user_ids),
        models.WorkspaceUser.is_active == True
    ).all()

    if not users:
        raise HTTPException(status_code=400, detail="No active users found")

    # Get contact lists and extract all recipients
    contact_lists = db.query(models.ContactList).filter(
        models.ContactList.id.in_(upload_data.contact_list_ids)
    ).all()

    all_recipients = []
    for contact_list in contact_lists:
        all_recipients.extend(contact_list.contacts)

    if not all_recipients:
        raise HTTPException(status_code=400, detail="No recipients found in selected contact lists")

    # Clear existing drafts for this campaign
    db.query(models.GmailDraft).filter(models.GmailDraft.draft_campaign_id == draft_id).delete()

    # Create new drafts for each user
    total_drafts_created = 0
    recipients_per_draft = math.ceil(len(all_recipients) / (len(users) * upload_data.emails_per_user))
    
    for user in users:
        for i in range(upload_data.emails_per_user):
            start_idx = (user.id * upload_data.emails_per_user + i) * recipients_per_draft
            end_idx = start_idx + recipients_per_draft
            draft_recipients = all_recipients[start_idx:end_idx]

            if not draft_recipients:
                continue

            # Create GmailDraft record
            gmail_draft_id = f"draft_{campaign.id}_{user.id}_{i}_{datetime.now().timestamp()}"
            
            new_draft = models.GmailDraft(
                draft_campaign_id=campaign.id,
                user_id=user.id,
                gmail_draft_id=gmail_draft_id,
                status='created',
                recipients=draft_recipients
            )
            db.add(new_draft)
            total_drafts_created += 1

    # Update campaign status
    campaign.status = 'uploaded'
    campaign.emails_per_user = upload_data.emails_per_user
    db.commit()

    return {
        "detail": f"Successfully uploaded {total_drafts_created} drafts to {len(users)} users",
        "total_drafts": total_drafts_created,
        "users_count": len(users),
        "recipients_count": len(all_recipients)
    }

@router.post("/drafts/{draft_id}/launch")
def launch_drafts(draft_id: int, db: Session = Depends(get_db)):
    """
    Launch (send) all drafts for a specific campaign.
    """
    campaign = db.query(models.DraftCampaign).filter(models.DraftCampaign.id == draft_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Draft campaign not found")

    if campaign.status != 'uploaded':
        raise HTTPException(status_code=400, detail="Drafts must be uploaded before launching")

    # Get all drafts for this campaign
    drafts = db.query(models.GmailDraft).filter(models.GmailDraft.draft_campaign_id == draft_id).all()
    
    if not drafts:
        raise HTTPException(status_code=400, detail="No drafts found for this campaign")

    launched_count = 0
    failed_count = 0
    details = []

    for draft in drafts:
        try:
            # Simulate sending the draft via Gmail API
            # In a real implementation, this would call the Gmail API
            draft.status = 'sent'
            db.add(draft)
            launched_count += 1
            details.append({
                "draft_id": draft.gmail_draft_id,
                "user_id": draft.user_id,
                "status": "success"
            })
        except Exception as e:
            draft.status = 'failed'
            db.add(draft)
            failed_count += 1
            details.append({
                "draft_id": draft.gmail_draft_id,
                "user_id": draft.user_id,
                "status": "failed",
                "reason": str(e)
            })

    # Update campaign status
    campaign.status = 'launched'
    db.commit()

    return {
        "detail": f"Launched {launched_count} drafts successfully, {failed_count} failed",
        "total_launched": launched_count,
        "total_failed": failed_count,
        "details": details
    }

@router.post("/drafts/launch", response_model=schemas.DraftLaunchResponse)
def launch_all_drafts(db: Session = Depends(get_db)):
    """
    Launch all uploaded drafts across all campaigns.
    """
    drafts_to_launch = db.query(models.GmailDraft).filter(models.GmailDraft.status == 'created').all()
    
    launched_count = 0
    failed_count = 0
    details = []

    for draft in drafts_to_launch:
        try:
            # Simulate sending the draft via Gmail API
            draft.status = 'sent'
            db.add(draft)
            launched_count += 1
            details.append({"draft_id": draft.gmail_draft_id, "status": "success"})
        except Exception as e:
            draft.status = 'failed'
            db.add(draft)
            failed_count += 1
            details.append({"draft_id": draft.gmail_draft_id, "status": "failed", "reason": str(e)})

    db.commit()

    return schemas.DraftLaunchResponse(
        total_launched=launched_count,
        total_failed=failed_count,
        details=details
    )