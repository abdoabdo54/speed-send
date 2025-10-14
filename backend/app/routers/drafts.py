from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app import models, schemas
from app.database import get_dbrom typing import List, Dict
import math

router = APIRouter()

@router.post("/api/v1/drafts/create", response_model=schemas.DraftCampaignResponse)
def create_draft_campaign(draft_data: schemas.DraftCampaignCreate, db: Session = Depends(get_db)):
    """
    Creates a new Draft Campaign and distributes the recipient list among the selected users to create individual Gmail Drafts.
    """
    # Step 1: Create the parent DraftCampaign entry
    new_draft_campaign = models.DraftCampaign(
        name=draft_data.campaign_name,
        subject=draft_data.subject,
        body_html=draft_data.html_body,
        number_of_drafts_per_user=draft_data.number_of_drafts_per_user
    )
    db.add(new_draft_campaign)
    db.flush() # Use flush to get the ID before committing

    # Step 2: Fetch all active users from the provided service account IDs
    users = db.query(models.WorkspaceUser).filter(
        models.WorkspaceUser.service_account_id.in_(draft_data.selected_accounts),
        models.WorkspaceUser.is_active == True
    ).all()

    if not users:
        db.rollback()
        raise HTTPException(status_code=404, detail="No active users found for the selected service accounts.")

    # Step 3: Distribute recipients and create GmailDraft records
    total_users = len(users)
    total_drafts_to_create = total_users * draft_data.number_of_drafts_per_user
    
    recipients_list = draft_data.email_list
    total_recipients = len(recipients_list)

    if total_drafts_to_create == 0 or total_recipients == 0:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot create drafts without users, drafts per user, or recipients.")

    recipients_per_draft = math.ceil(total_recipients / total_drafts_to_create)
    
    recipient_iterator = 0
    drafts_created_count = 0
    drafts_by_user_map: Dict[str, int] = {user.email: 0 for user in users}

    for user in users:
        for i in range(draft_data.number_of_drafts_per_user):
            start_index = recipient_iterator
            end_index = start_index + recipients_per_draft
            draft_recipients = recipients_list[start_index:end_index]

            if not draft_recipients:
                continue

            simulated_gmail_draft_id = f"simulated_{new_draft_campaign.id}_{user.id}_{i}"

            new_gmail_draft = models.GmailDraft(
                draft_campaign_id=new_draft_campaign.id,
                user_id=user.id,
                gmail_draft_id=simulated_gmail_draft_id,
                status=schemas.DraftStatus.CREATED,
                recipients=draft_recipients
            )
            db.add(new_gmail_draft)
            
            drafts_created_count += 1
            drafts_by_user_map[user.email] += 1
            recipient_iterator = end_index

    db.commit()
    db.refresh(new_draft_campaign)

    return schemas.DraftCampaignResponse(
        id=new_draft_campaign.id,
        name=new_draft_campaign.name,
        subject=new_draft_campaign.subject,
        created_at=new_draft_campaign.created_at,
        total_drafts=drafts_created_count,
        drafts_by_user=drafts_by_user_map,
    )

@router.get("/api/v1/drafts", response_model=List[schemas.DraftCampaignResponse])
def get_draft_campaigns(db: Session = Depends(get_db)):
    draft_campaigns = db.query(models.DraftCampaign).options(joinedload(models.DraftCampaign.gmail_drafts).joinedload(models.GmailDraft.user)).all()
    response = []
    for campaign in draft_campaigns:
        total_drafts = len(campaign.gmail_drafts)
        drafts_by_user = {}
        for draft in campaign.gmail_drafts:
            user_email = draft.user.email
            drafts_by_user[user_email] = drafts_by_user.get(user_email, 0) + 1
        
        response.append(schemas.DraftCampaignResponse(
            id=campaign.id,
            name=campaign.name,
            subject=campaign.subject,
            created_at=campaign.created_at,
            total_drafts=total_drafts,
            drafts_by_user=drafts_by_user,
        ))
    return response

@router.get("/api/v1/drafts/{draft_id}", response_model=schemas.DraftCampaignResponse)
def get_draft_campaign(draft_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.DraftCampaign).options(joinedload(models.DraftCampaign.gmail_drafts).joinedload(models.GmailDraft.user)).filter(models.DraftCampaign.id == draft_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Draft campaign not found")

    total_drafts = len(campaign.gmail_drafts)
    drafts_by_user = {}
    for draft in campaign.gmail_drafts:
        user_email = draft.user.email
        drafts_by_user[user_email] = drafts_by_user.get(user_email, 0) + 1

    return schemas.DraftCampaignResponse(
        id=campaign.id,
        name=campaign.name,
        subject=campaign.subject,
        created_at=campaign.created_at,
        total_drafts=total_drafts,
        drafts_by_user=drafts_by_user,
    )

@router.delete("/api/v1/drafts/{draft_id}")
def delete_draft_campaign(draft_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.DraftCampaign).filter(models.DraftCampaign.id == draft_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Draft campaign not found")

    db.delete(campaign)
    db.commit()
    return {"detail": f"Draft campaign '{campaign.name}' and all its associated drafts have been deleted."}


@router.post("/api/v1/drafts/launch", response_model=schemas.DraftLaunchResponse)
def launch_all_drafts(db: Session = Depends(get_db)):
    drafts_to_launch = db.query(models.GmailDraft).filter(models.GmailDraft.status == schemas.DraftStatus.CREATED).all()
    
    launched_count = 0
    failed_count = 0
    details = []

    for draft in drafts_to_launch:
        try:
            # Simulate sending the draft via Gmail API
            draft.status = schemas.DraftStatus.SENT
            db.add(draft)
            launched_count += 1
            details.append({"draft_id": draft.gmail_draft_id, "status": "success"})
        except Exception as e:
            draft.status = schemas.DraftStatus.FAILED
            db.add(draft)
            failed_count += 1
            details.append({"draft_id": draft.gmail_draft_id, "status": "failed", "reason": str(e)})

    db.commit()

    return schemas.DraftLaunchResponse(
        total_launched=launched_count,
        total_failed=failed_count,
        details=details
    )

@router.patch("/api/v1/drafts/{draft_id}", response_model=schemas.DraftCampaignResponse)
def update_draft_campaign(draft_id: int, draft_data: dict, db: Session = Depends(get_db)):
    # Placeholder for future implementation
    raise HTTPException(status_code=501, detail="Update functionality not implemented yet.")
