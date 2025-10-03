from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import (
    Campaign, CampaignStatus, ServiceAccount, EmailLog, EmailStatus,
    CampaignSender
)
from app.schemas import (
    CampaignCreate, CampaignUpdate, CampaignResponse,
    CampaignControl, EmailLogResponse
)
from app.tasks import send_campaign_emails
from celery.result import AsyncResult

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.post("/", response_model=CampaignResponse)
async def create_campaign(
    campaign: CampaignCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new email campaign
    """
    try:
        # Validate sender accounts exist
        sender_accounts = db.query(ServiceAccount).filter(
            ServiceAccount.id.in_(campaign.sender_account_ids)
        ).all()
        
        if len(sender_accounts) != len(campaign.sender_account_ids):
            raise HTTPException(
                status_code=400,
                detail="One or more sender accounts not found"
            )
        
        # Create campaign
        new_campaign = Campaign(
            name=campaign.name,
            subject=campaign.subject,
            body_html=campaign.body_html,
            body_plain=campaign.body_plain,
            from_name=campaign.from_name,
            from_email=campaign.from_email,
            reply_to=campaign.reply_to,
            return_path=campaign.return_path,
            recipients=[r.dict() for r in campaign.recipients],
            total_recipients=len(campaign.recipients),
            pending_count=len(campaign.recipients),
            sender_rotation=campaign.sender_rotation,
            use_ip_pool=campaign.use_ip_pool,
            ip_pool=campaign.ip_pool,
            custom_headers=campaign.custom_headers,
            attachments=campaign.attachments,
            rate_limit=campaign.rate_limit,
            concurrency=campaign.concurrency,
            is_test=campaign.is_test,
            test_recipients=campaign.test_recipients,
            status=CampaignStatus.DRAFT
        )
        
        db.add(new_campaign)
        db.flush()
        
        # Associate sender accounts
        for account in sender_accounts:
            association = CampaignSender(
                campaign_id=new_campaign.id,
                service_account_id=account.id
            )
            db.add(association)
        
        db.commit()
        db.refresh(new_campaign)
        
        return new_campaign
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[CampaignResponse])
async def list_campaigns(
    status: Optional[CampaignStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all campaigns with optional status filter
    """
    query = db.query(Campaign)
    
    if status:
        query = query.filter(Campaign.status == status)
    
    campaigns = query.order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()
    return campaigns


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific campaign
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return campaign


@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    updates: CampaignUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a campaign (only if in DRAFT status)
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status != CampaignStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail="Can only update campaigns in DRAFT status"
        )
    
    # Update fields
    for field, value in updates.dict(exclude_unset=True).items():
        if field == "recipients" and value:
            setattr(campaign, field, [r.dict() for r in value])
            campaign.total_recipients = len(value)
            campaign.pending_count = len(value)
        elif field == "sender_account_ids" and value:
            # Update sender associations
            db.query(CampaignSender).filter(
                CampaignSender.campaign_id == campaign_id
            ).delete()
            
            for account_id in value:
                association = CampaignSender(
                    campaign_id=campaign_id,
                    service_account_id=account_id
                )
                db.add(association)
        else:
            setattr(campaign, field, value)
    
    db.commit()
    db.refresh(campaign)
    
    return campaign


@router.post("/{campaign_id}/prepare")
async def prepare_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Prepare campaign: Create all email log entries (DRAFT → PREPARING → READY)
    """
    from app.models import WorkspaceUser
    from datetime import datetime
    
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.READY]:
        raise HTTPException(
            status_code=400,
            detail="Can only prepare campaigns in DRAFT or READY status"
        )
    
    try:
        campaign.status = CampaignStatus.PREPARING
        db.commit()
        
        # Get all sender accounts with their users
        sender_accounts = campaign.sender_accounts
        if not sender_accounts:
            raise HTTPException(status_code=400, detail="No sender accounts configured")
        
        # Get all active users from sender accounts
        all_senders = []
        for account in sender_accounts:
            users = db.query(WorkspaceUser).filter(
                WorkspaceUser.service_account_id == account.id,
                WorkspaceUser.is_active == True
            ).all()
            
            for user in users:
                all_senders.append({
                    'user_email': user.email,
                    'service_account_id': account.id,
                    'client_email': account.client_email
                })
        
        if not all_senders:
            raise HTTPException(status_code=400, detail="No active users found in sender accounts")
        
        # Delete existing email logs if re-preparing
        db.query(EmailLog).filter(EmailLog.campaign_id == campaign_id).delete()
        
        # Create email log entries for each recipient
        recipients = campaign.recipients if isinstance(campaign.recipients, list) else []
        
        for idx, recipient in enumerate(recipients):
            # Select sender using rotation strategy
            if campaign.sender_rotation == "round_robin":
                sender = all_senders[idx % len(all_senders)]
            elif campaign.sender_rotation == "random":
                import random
                sender = random.choice(all_senders)
            else:  # sequential
                sender = all_senders[0]
            
            # Create email log entry
            email_log = EmailLog(
                campaign_id=campaign_id,
                recipient_email=recipient.get('email'),
                recipient_name=recipient.get('variables', {}).get('name', ''),
                sender_email=sender['user_email'],
                service_account_id=sender['service_account_id'],
                subject=campaign.subject,
                status=EmailStatus.PENDING
            )
            db.add(email_log)
        
        campaign.status = CampaignStatus.READY
        campaign.prepared_at = datetime.utcnow()
        campaign.pending_count = len(recipients)
        db.commit()
        
        return {
            "message": f"Campaign prepared successfully with {len(recipients)} emails",
            "total_emails": len(recipients),
            "total_senders": len(all_senders)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        campaign.status = CampaignStatus.DRAFT
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to prepare campaign: {str(e)}")


@router.post("/{campaign_id}/launch")
async def launch_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Launch prepared campaign: Start sending all emails (READY → SENDING)
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status != CampaignStatus.READY:
        raise HTTPException(
            status_code=400,
            detail="Can only launch campaigns in READY status. Please prepare the campaign first."
        )
    
    # Update status to sending
    campaign.status = CampaignStatus.SENDING
    campaign.started_at = datetime.utcnow()
    db.commit()
    
    # DIRECT SENDING - No Celery, immediate Gmail API calls
    try:
        from app.google_api import GoogleWorkspaceService
        from app.encryption import encryption_service
        from app.models import EmailLog, EmailStatus
        import logging
        
        logger = logging.getLogger(__name__)
        logger.info(f"🚀 DIRECT SENDING: Campaign {campaign_id}")
        
        # Get all email logs for this campaign
        email_logs = db.query(EmailLog).filter(
            EmailLog.campaign_id == campaign_id,
            EmailLog.status == EmailStatus.PENDING
        ).all()
        
        if not email_logs:
            raise HTTPException(status_code=400, detail="No pending emails found")
        
        # Get sender accounts
        sender_accounts = campaign.sender_accounts
        if not sender_accounts:
            raise HTTPException(status_code=400, detail="No sender accounts configured")
        
        # Build sender pool
        sender_pool = []
        for account in sender_accounts:
            users = db.query(WorkspaceUser).filter(
                WorkspaceUser.service_account_id == account.id,
                WorkspaceUser.is_active == True
            ).all()
            
            # Decrypt service account JSON
            decrypted_json = encryption_service.decrypt(account.encrypted_json)
            
            for user in users:
                sender_pool.append({
                    'service_account_id': account.id,
                    'service_account_json': decrypted_json,
                    'user_email': user.email,
                    'user_id': user.id
                })
        
        if not sender_pool:
            raise HTTPException(status_code=400, detail="No active users available for sending")
        
        logger.info(f"📊 Sending {len(email_logs)} emails using {len(sender_pool)} senders")
        
        # Send emails directly
        sent_count = 0
        failed_count = 0
        
        for idx, email_log in enumerate(email_logs):
            try:
                # Select sender (round-robin)
                sender = sender_pool[idx % len(sender_pool)]
                
                # Update email log
                email_log.status = EmailStatus.SENDING
                email_log.sender_email = sender['user_email']
                email_log.service_account_id = sender['service_account_id']
                db.commit()
                
                # Create Google service
                google_service = GoogleWorkspaceService(sender['service_account_json'])
                
                # Send email
                message_id = google_service.send_email(
                    sender_email=sender['user_email'],
                    recipient_email=email_log.recipient_email,
                    subject=campaign.subject,
                    body_html=campaign.body_html,
                    body_plain=campaign.body_plain,
                    custom_headers=campaign.custom_headers,
                    attachments=campaign.attachments
                )
                
                # Update email log
                email_log.status = EmailStatus.SENT
                email_log.message_id = message_id
                email_log.sent_at = datetime.utcnow()
                db.commit()
                
                sent_count += 1
                logger.info(f"✅ Sent: {email_log.recipient_email} via {sender['user_email']}")
                
            except Exception as e:
                logger.error(f"❌ Failed to send to {email_log.recipient_email}: {e}")
                email_log.status = EmailStatus.FAILED
                email_log.error_message = str(e)
                db.commit()
                failed_count += 1
        
        # Update campaign
        campaign.sent_count = sent_count
        campaign.failed_count = failed_count
        campaign.status = CampaignStatus.COMPLETED
        campaign.completed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"🎉 Campaign {campaign_id} completed: {sent_count} sent, {failed_count} failed")
        
        return {
            "message": f"Campaign completed successfully! {sent_count} emails sent, {failed_count} failed",
            "sent_count": sent_count,
            "failed_count": failed_count,
            "total_emails": campaign.total_recipients
        }
        
    except Exception as e:
        logger.error(f"❌ Campaign {campaign_id} failed: {e}")
        campaign.status = CampaignStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Campaign failed: {str(e)}")


@router.post("/{campaign_id}/control")
async def control_campaign(
    campaign_id: int,
    control: CampaignControl,
    db: Session = Depends(get_db)
):
    """
    Control campaign execution: pause, resume, cancel
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if control.action == "start":
        # Deprecated: Use /prepare and /launch endpoints instead
        raise HTTPException(
            status_code=400,
            detail="Please use /prepare endpoint first, then /launch to start sending"
        )
    
    elif control.action == "pause":
        if campaign.status != CampaignStatus.SENDING:
            raise HTTPException(
                status_code=400,
                detail="Can only pause SENDING campaigns"
            )
        
        campaign.status = CampaignStatus.PAUSED
        campaign.paused_at = datetime.utcnow()
        db.commit()
        
        return {"message": "Campaign paused"}
    
    elif control.action == "resume":
        if campaign.status != CampaignStatus.PAUSED:
            raise HTTPException(
                status_code=400,
                detail="Can only resume PAUSED campaigns"
            )
        
        campaign.status = CampaignStatus.SENDING
        campaign.paused_at = None
        db.commit()
        
        return {"message": "Campaign resumed"}
    
    elif control.action == "cancel":
        if campaign.status not in [CampaignStatus.SENDING, CampaignStatus.PAUSED, CampaignStatus.READY]:
            raise HTTPException(
                status_code=400,
                detail="Can only cancel active campaigns"
            )
        
        campaign.status = CampaignStatus.FAILED
        
        # Revoke Celery task if exists
        if campaign.celery_task_id:
            AsyncResult(campaign.celery_task_id).revoke(terminate=True)
        
        db.commit()
        
        return {"message": "Campaign cancelled"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")


@router.post("/{campaign_id}/duplicate", response_model=CampaignResponse)
async def duplicate_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Duplicate an existing campaign
    """
    original = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not original:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Create duplicate
    duplicate = Campaign(
        name=f"{original.name} (Copy)",
        subject=original.subject,
        body_html=original.body_html,
        body_plain=original.body_plain,
        recipients=original.recipients,
        total_recipients=original.total_recipients,
        pending_count=original.total_recipients,
        sender_rotation=original.sender_rotation,
        custom_headers=original.custom_headers,
        attachments=original.attachments,
        rate_limit=original.rate_limit,
        concurrency=original.concurrency,
        is_test=original.is_test,
        test_recipients=original.test_recipients,
        status=CampaignStatus.DRAFT,
        sent_count=0,
        failed_count=0
    )
    
    db.add(duplicate)
    db.flush()
    
    # Copy sender associations
    sender_associations = db.query(CampaignSender).filter(
        CampaignSender.campaign_id == campaign_id
    ).all()
    
    for assoc in sender_associations:
        new_assoc = CampaignSender(
            campaign_id=duplicate.id,
            service_account_id=assoc.service_account_id
        )
        db.add(new_assoc)
    
    db.commit()
    db.refresh(duplicate)
    
    return duplicate


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a campaign
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status in [CampaignStatus.RUNNING, CampaignStatus.QUEUED]:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete active campaigns"
        )
    
    db.delete(campaign)
    db.commit()
    
    return {"message": "Campaign deleted successfully"}


@router.get("/{campaign_id}/logs", response_model=List[EmailLogResponse])
async def get_campaign_logs(
    campaign_id: int,
    status: Optional[EmailStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get email logs for a campaign
    """
    query = db.query(EmailLog).filter(EmailLog.campaign_id == campaign_id)
    
    if status:
        query = query.filter(EmailLog.status == status)
    
    logs = query.order_by(EmailLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs

