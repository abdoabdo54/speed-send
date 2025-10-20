from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app import models, schemas
from app.database import get_db
from typing import List, Dict
import math
from datetime import datetime
import asyncio
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import json

router = APIRouter()

@router.post("/drafts", response_model=schemas.DraftCampaignResponse)
def create_draft_campaign(draft_data: schemas.DraftCampaignCreate, db: Session = Depends(get_db)):
    """
    Creates a new Draft Campaign with selected accounts, users, and contacts.
    """
    # Create the draft campaign
    new_draft_campaign = models.DraftCampaign(
        name=draft_data.name,
        subject=draft_data.subject,
        from_name=draft_data.from_name,
        body_html=draft_data.body_html,
        status='draft',
        emails_per_user=draft_data.emails_per_user
    )
    db.add(new_draft_campaign)
    db.flush()  # Get the ID before committing
    
    # Save selected accounts
    for account_id in draft_data.selected_account_ids:
        draft_account = models.DraftCampaignAccount(
            draft_campaign_id=new_draft_campaign.id,
            account_id=account_id
        )
        db.add(draft_account)
    
    # Save selected users
    for user_id in draft_data.selected_user_ids:
        draft_user = models.DraftCampaignUser(
            draft_campaign_id=new_draft_campaign.id,
            user_id=user_id
        )
        db.add(draft_user)
    
    # Save selected contact lists
    for contact_list_id in draft_data.selected_contact_list_ids:
        draft_contact = models.DraftCampaignContact(
                draft_campaign_id=new_draft_campaign.id,
            contact_list_id=contact_list_id
        )
        db.add(draft_contact)

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
        status='draft',
        recipients_count=0,
        users_count=len(draft_data.selected_user_ids),
        emails_per_user=draft_data.emails_per_user
    )

@router.get("/drafts", response_model=List[schemas.DraftCampaignResponse])
def get_draft_campaigns(db: Session = Depends(get_db)):
    """
    Get all draft campaigns with their associations.
    """
    draft_campaigns = db.query(models.DraftCampaign).options(
        joinedload(models.DraftCampaign.selected_accounts).joinedload(models.DraftCampaignAccount.account),
        joinedload(models.DraftCampaign.selected_users).joinedload(models.DraftCampaignUser.user),
        joinedload(models.DraftCampaign.selected_contacts).joinedload(models.DraftCampaignContact.contact_list),
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
        
        # Calculate recipients count from selected contact lists
        recipients_count = 0
        for contact_assoc in campaign.selected_contacts:
            if contact_assoc.contact_list:
                recipients_count += len(contact_assoc.contact_list.contacts)
        
        response.append(schemas.DraftCampaignResponse(
            id=campaign.id,
            name=campaign.name,
            subject=campaign.subject,
            from_name=campaign.from_name,
            created_at=campaign.created_at,
            total_drafts=total_drafts,
            drafts_by_user=drafts_by_user,
            status=campaign.status or 'draft',
            recipients_count=recipients_count,
            users_count=len(campaign.selected_users),
            emails_per_user=campaign.emails_per_user or 0
        ))
    return response

@router.get("/drafts/{draft_id}", response_model=schemas.DraftCampaignResponse)
def get_draft_campaign(draft_id: int, db: Session = Depends(get_db)):
    """
    Get a specific draft campaign with its associations.
    """
    campaign = db.query(models.DraftCampaign).options(
        joinedload(models.DraftCampaign.selected_accounts).joinedload(models.DraftCampaignAccount.account),
        joinedload(models.DraftCampaign.selected_users).joinedload(models.DraftCampaignUser.user),
        joinedload(models.DraftCampaign.selected_contacts).joinedload(models.DraftCampaignContact.contact_list),
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

    # Calculate recipients count
    recipients_count = 0
    for contact_assoc in campaign.selected_contacts:
        if contact_assoc.contact_list:
            recipients_count += len(contact_assoc.contact_list.contacts)
    
    return schemas.DraftCampaignResponse(
        id=campaign.id,
        name=campaign.name,
        subject=campaign.subject,
        from_name=campaign.from_name,
        created_at=campaign.created_at,
        total_drafts=total_drafts,
        drafts_by_user=drafts_by_user,
        status=campaign.status or 'draft',
        recipients_count=recipients_count,
        users_count=len(campaign.selected_users),
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
        total_drafts=0,
        drafts_by_user={},
        status=campaign.status or 'draft',
        recipients_count=0,
        users_count=0,
        emails_per_user=campaign.emails_per_user or 0
    )

@router.delete("/drafts/{draft_id}")
def delete_draft_campaign(draft_id: int, db: Session = Depends(get_db)):
    """
    Delete a draft campaign and all associated data.
    """
    campaign = db.query(models.DraftCampaign).filter(models.DraftCampaign.id == draft_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Draft campaign not found")

    db.delete(campaign)
    db.commit()
    
    return {"detail": f"Draft campaign '{campaign.name}' and all its associated data have been deleted."}

@router.post("/drafts/{draft_id}/upload")
def upload_drafts_to_users(draft_id: int, db: Session = Depends(get_db)):
    """
    Upload draft messages to selected users via Google Cloud API.
    """
    campaign = db.query(models.DraftCampaign).options(
        joinedload(models.DraftCampaign.selected_users).joinedload(models.DraftCampaignUser.user),
        joinedload(models.DraftCampaign.selected_contacts).joinedload(models.DraftCampaignContact.contact_list)
    ).filter(models.DraftCampaign.id == draft_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Draft campaign not found")
    
    if not campaign.selected_users:
        raise HTTPException(status_code=400, detail="No users selected for this campaign")
    
    if not campaign.selected_contacts:
        raise HTTPException(status_code=400, detail="No contact lists selected for this campaign")
    
    # Get all recipients from selected contact lists
    all_recipients = []
    for contact_assoc in campaign.selected_contacts:
        if contact_assoc.contact_list:
            all_recipients.extend([contact.email for contact in contact_assoc.contact_list.contacts])
    
    if not all_recipients:
        raise HTTPException(status_code=400, detail="No recipients found in selected contact lists")
    
    # Calculate recipients per user
    users = [assoc.user for assoc in campaign.selected_users if assoc.user]
    recipients_per_user = math.ceil(len(all_recipients) / len(users)) if users else 0
    
    # Create Gmail drafts for each user
    total_drafts_created = 0
    for user in users:
        # Get recipients for this user
        user_recipients = all_recipients[:recipients_per_user]
        all_recipients = all_recipients[recipients_per_user:]
        
        # Create drafts for this user
        for i in range(campaign.emails_per_user):
            if user_recipients:
                # Create Gmail draft via API
                try:
                    gmail_draft_id = create_gmail_draft(
                        user_id=user.id,
                        subject=campaign.subject,
                        from_name=campaign.from_name,
                        body_html=campaign.body_html,
                        recipients=user_recipients
                    )
                    
                    # Save draft to database
                    draft = models.GmailDraft(
                        draft_campaign_id=campaign.id,
                        user_id=user.id,
                        gmail_draft_id=gmail_draft_id,
                        status='created',
                        recipients=user_recipients
                    )
                    db.add(draft)
                    total_drafts_created += 1
                    
                except Exception as e:
                    print(f"Failed to create draft for user {user.email}: {str(e)}")
                    continue
    
    # Update campaign status
    campaign.status = 'uploaded'
    db.commit()
    
    return {
        "total_drafts": total_drafts_created,
        "users_count": len(users),
        "recipients_count": len(all_recipients)
    }

def create_gmail_draft(user_id: int, subject: str, from_name: str, body_html: str, recipients: List[str]) -> str:
    """
    Create a Gmail draft using Google Cloud API.
    """
    try:
        # Get user's credentials (this would need to be implemented based on your auth system)
        # For now, we'll return a mock draft ID
        import uuid
        return f"draft_{uuid.uuid4().hex[:16]}"
        
        # TODO: Implement actual Gmail API integration
        # 1. Get user's OAuth credentials
        # 2. Build Gmail service
        # 3. Create draft message
        # 4. Return draft ID
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Gmail draft: {str(e)}")

@router.post("/drafts/{draft_id}/launch")
def launch_drafts(draft_id: int, db: Session = Depends(get_db)):
    """
    Launch (send) all drafts for a specific campaign.
    """
    campaign = db.query(models.DraftCampaign).filter(models.DraftCampaign.id == draft_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Draft campaign not found")
    
    # Get all drafts for this campaign
    drafts = db.query(models.GmailDraft).filter(models.GmailDraft.draft_campaign_id == draft_id).all()
    
    if not drafts:
        raise HTTPException(status_code=400, detail="No drafts found for this campaign")
    
    # Update draft status to launched (simulate sending)
    for draft in drafts:
        draft.status = 'sent'
        draft.sent_at = datetime.utcnow()
    
    # Update campaign status
    campaign.status = 'launched'
    
    db.commit()
    
    return {
        "total_launched": len(drafts),
        "total_failed": 0,
        "details": [{"draft_id": str(draft.id), "status": "sent"} for draft in drafts]
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
            draft.status = 'sent'
            draft.sent_at = datetime.utcnow()
            launched_count += 1
            details.append({"draft_id": str(draft.id), "status": "sent"})
        except Exception as e:
            failed_count += 1
            details.append({"draft_id": str(draft.id), "status": "failed", "error": str(e)})

    db.commit()

    return schemas.DraftLaunchResponse(
        total_launched=launched_count,
        total_failed=failed_count,
        details=details
    )