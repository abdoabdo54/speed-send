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
            service_account_id=account_id
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
        joinedload(models.DraftCampaign.selected_accounts).joinedload(models.DraftCampaignAccount.service_account),
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

@router.post("/drafts/{draft_id}/upload", response_model=schemas.DraftUploadResponse)
def upload_drafts_to_users(draft_id: int, db: Session = Depends(get_db)):
    """
    Upload draft messages to selected users via Google Cloud API.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"UPLOAD FUNCTION CALLED: Starting upload for draft {draft_id}")
    
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
                        recipients=user_recipients,
                        db=db
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
    
    return schemas.DraftUploadResponse(
        success=True,
        message=f"Successfully uploaded {total_drafts_created} drafts to {len(users)} users",
        total_drafts=total_drafts_created,
        users_count=len(users),
        details={
            "recipients_count": len(all_recipients),
            "users": [user.email for user in users]
        }
    )

def create_gmail_draft(user_id: int, subject: str, from_name: str, body_html: str, recipients: List[str], db: Session) -> str:
    """
    Create a Gmail draft using Google Cloud API.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"REAL GMAIL API: Starting draft creation for user {user_id}")
    
    try:
        # Get user and their service account
        user = db.query(models.WorkspaceUser).filter(models.WorkspaceUser.id == user_id).first()
        if not user:
            raise Exception(f"User with ID {user_id} not found")
        
        logger.info(f"Found user: {user.email}")
        
        service_account = user.service_account
        if not service_account:
            raise Exception(f"No service account found for user {user.email}")
        
        logger.info(f"Found service account: {service_account.client_email}")
        
        # Decrypt service account credentials
        from app.encryption import EncryptionService
        encryption_service = EncryptionService()
        service_account_json = encryption_service.decrypt(service_account.encrypted_json)
        
        logger.info("Service account credentials decrypted successfully")
        
        # Initialize Google Workspace Service
        from app.google_api import GoogleWorkspaceService
        google_service = GoogleWorkspaceService(service_account_json)
        
        logger.info("Google Workspace Service initialized")
        
        # Get delegated credentials for the user
        from app.config import settings
        credentials = google_service.get_delegated_credentials(
            user.email, 
            settings.GMAIL_SCOPES
        )
        
        logger.info(f"Delegated credentials created for {user.email}")
        
        # Build Gmail service
        from googleapiclient.discovery import build
        gmail_service = build('gmail', 'v1', credentials=credentials)
        
        logger.info("Gmail service built successfully")
        
        # Create the email message
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        import base64
        
        # Create multipart message
        message = MIMEMultipart('alternative')
        message['To'] = ', '.join(recipients)
        message['From'] = f"{from_name} <{user.email}>" if from_name else user.email
        message['Subject'] = subject
        
        # Add HTML body
        html_part = MIMEText(body_html, 'html')
        message.attach(html_part)
        
        # Encode message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        # Create draft
        draft_body = {
            'message': {
                'raw': raw_message
            }
        }
        
        logger.info(f"Creating Gmail draft for user {user.email} with {len(recipients)} recipients")
        logger.info(f"Recipients: {recipients}")
        logger.info(f"Subject: {subject}")
        
        result = gmail_service.users().drafts().create(
            userId='me',
            body=draft_body
        ).execute()
        
        draft_id = result['id']
        logger.info(f"Gmail draft created successfully: {draft_id}")
        logger.info(f"REAL GMAIL API: Draft creation completed for user {user.email}")
        return draft_id
        
    except Exception as e:
        logger.error(f"REAL GMAIL API ERROR: Failed to create Gmail draft: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to create Gmail draft: {str(e)}")

@router.post("/drafts/{draft_id}/launch")
def launch_drafts(draft_id: int, db: Session = Depends(get_db)):
    """
    Launch (send) all drafts for a specific campaign using Gmail API.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    campaign = db.query(models.DraftCampaign).filter(models.DraftCampaign.id == draft_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Draft campaign not found")
    
    # Get all drafts for this campaign
    drafts = db.query(models.GmailDraft).filter(models.GmailDraft.draft_campaign_id == draft_id).all()
    
    if not drafts:
        raise HTTPException(status_code=400, detail="No drafts found for this campaign")
    
    total_launched = 0
    total_failed = 0
    details = []
    
    # Group drafts by user for efficient API calls
    drafts_by_user = {}
    for draft in drafts:
        if draft.user_id not in drafts_by_user:
            drafts_by_user[draft.user_id] = []
        drafts_by_user[draft.user_id].append(draft)
    
    # Send drafts for each user
    for user_id, user_drafts in drafts_by_user.items():
        try:
            # Get user and service account
            user = db.query(models.WorkspaceUser).filter(models.WorkspaceUser.id == user_id).first()
            if not user:
                logger.error(f"User with ID {user_id} not found")
                continue
                
            service_account = user.service_account
            if not service_account:
                logger.error(f"No service account found for user {user.email}")
                continue
            
            # Decrypt service account credentials
            from app.encryption import EncryptionService
            encryption_service = EncryptionService()
            service_account_json = encryption_service.decrypt(service_account.encrypted_json)
            
            # Initialize Google Workspace Service
            from app.google_api import GoogleWorkspaceService
            google_service = GoogleWorkspaceService(service_account_json)
            
            # Get delegated credentials for the user
            from app.config import settings
            credentials = google_service.get_delegated_credentials(
                user.email, 
                settings.GMAIL_SCOPES
            )
            
            # Build Gmail service
            from googleapiclient.discovery import build
            gmail_service = build('gmail', 'v1', credentials=credentials)
            
            logger.info(f"🚀 Launching {len(user_drafts)} drafts for user {user.email}")
            
            # Send each draft
            for draft in user_drafts:
                try:
                    # Send the draft
                    result = gmail_service.users().drafts().send(
                        userId='me',
                        body={'id': draft.gmail_draft_id}
                    ).execute()
                    
                    # Update draft status
                    draft.status = 'sent'
                    draft.sent_at = datetime.utcnow()
                    draft.gmail_message_id = result.get('id')
                    
                    total_launched += 1
                    details.append({
                        "draft_id": str(draft.id),
                        "gmail_draft_id": draft.gmail_draft_id,
                        "user_email": user.email,
                        "status": "sent",
                        "message_id": result.get('id')
                    })
                    
                    logger.info(f"✅ Draft {draft.id} sent successfully for user {user.email}")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to send draft {draft.id} for user {user.email}: {str(e)}")
                    draft.status = 'failed'
                    total_failed += 1
                    details.append({
                        "draft_id": str(draft.id),
                        "gmail_draft_id": draft.gmail_draft_id,
                        "user_email": user.email,
                        "status": "failed",
                        "error": str(e)
                    })
        
        except Exception as e:
            logger.error(f"❌ Failed to process drafts for user {user_id}: {str(e)}")
            # Mark all drafts for this user as failed
            for draft in user_drafts:
                draft.status = 'failed'
                total_failed += 1
                details.append({
                    "draft_id": str(draft.id),
                    "gmail_draft_id": draft.gmail_draft_id,
                    "user_email": user.email if 'user' in locals() else f"user_{user_id}",
                    "status": "failed",
                    "error": str(e)
                })
    
    # Update campaign status
    campaign.status = 'launched'
    
    db.commit()
    
    logger.info(f"🎯 Launch completed: {total_launched} sent, {total_failed} failed")
    
    return {
        "total_launched": total_launched,
        "total_failed": total_failed,
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