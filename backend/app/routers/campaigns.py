from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.database import get_db
from app.models import (
    Campaign, CampaignStatus, ServiceAccount, EmailLog, EmailStatus,
    CampaignSender, WorkspaceUser
)
from app.schemas import (
    CampaignCreate, CampaignUpdate, CampaignResponse,
    CampaignControl, EmailLogResponse
)
from app.tasks import send_campaign_emails

router = APIRouter()

@router.get("/", response_model=List[CampaignResponse])
async def list_campaigns(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all campaigns
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

@router.post("", response_model=CampaignResponse)
@router.post("/", response_model=CampaignResponse)
async def create_campaign(
    campaign: CampaignCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new campaign
    """
    try:
        # Get sender accounts
        sender_accounts = db.query(ServiceAccount).filter(
            ServiceAccount.id.in_(campaign.sender_account_ids)
        ).all()
        
        if not sender_accounts:
            raise HTTPException(status_code=400, detail="No sender accounts found")
        
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
        
        # Campaign created in DRAFT status - ready for preparation and launch
        logger = logging.getLogger(__name__)
        logger.info(f"📝 Campaign {new_campaign.id} created in DRAFT status")
        logger.info(f"📊 Recipients: {len(new_campaign.recipients)}")
        logger.info(f"👥 Sender accounts: {len(sender_accounts)}")
        
        return new_campaign
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {str(e)}")


@router.post("/{campaign_id}/launch")
async def launch_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Launch a campaign - send all emails immediately
    """
    try:
        # Get campaign
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        if campaign.status != CampaignStatus.DRAFT:
            raise HTTPException(status_code=400, detail=f"Campaign must be in DRAFT status to launch. Current status: {campaign.status}")
        
        logger.info(f"🚀 LAUNCHING CAMPAIGN: {campaign_id}")
        
        # Get sender accounts
        sender_accounts = campaign.sender_accounts
        if not sender_accounts:
            raise HTTPException(status_code=400, detail="No sender accounts configured")
        
        # Build sender pool
        from app.google_api import GoogleWorkspaceService
        from app.encryption import encryption_service
        from app.models import WorkspaceUser, EmailLog, EmailStatus
        
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
        
        # Create email logs for each recipient
        email_logs = []
        for idx, recipient in enumerate(campaign.recipients):
            # Select sender (round-robin)
            sender = sender_pool[idx % len(sender_pool)]
            
            email_log = EmailLog(
                campaign_id=campaign.id,
                recipient_email=recipient.get('email'),
                recipient_name=recipient.get('variables', {}).get('name', ''),
                sender_email=sender['user_email'],
                service_account_id=sender['service_account_id'],
                subject=campaign.subject,
                status=EmailStatus.PENDING
            )
            db.add(email_log)
            email_logs.append(email_log)
        
        db.commit()
        
        # Update campaign status
        campaign.status = CampaignStatus.SENDING
        campaign.started_at = datetime.utcnow()
        db.commit()
        
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
        
        logger.info(f"🎉 Campaign {campaign.id} completed: {sent_count} sent, {failed_count} failed")
        
        return {
            "message": "Campaign launched successfully",
            "campaign_id": campaign.id,
            "sent_count": sent_count,
            "failed_count": failed_count,
            "status": campaign.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Launch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to launch campaign: {str(e)}")

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
    
    if campaign.status in [CampaignStatus.SENDING, CampaignStatus.PREPARING]:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete active campaigns"
        )
    
    db.delete(campaign)
    db.commit()
    
    return {"message": "Campaign deleted successfully"}

# --- New lifecycle endpoints expected by frontend ---

@router.post("/{campaign_id}/prepare/")
async def prepare_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Move campaign from DRAFT to READY by precomputing sender assignments and
    creating email log skeletons. This makes the later launch extremely fast.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.FAILED]:
        raise HTTPException(status_code=400, detail=f"Can only prepare DRAFT/FAILED campaigns. Current: {campaign.status}")

    # Build sender pool
    sender_accounts = campaign.sender_accounts
    if not sender_accounts:
        raise HTTPException(status_code=400, detail="No sender accounts configured")

    # Pre-create logs if they do not exist
    existing_logs = db.query(EmailLog).filter(EmailLog.campaign_id == campaign.id).count()
    if existing_logs == 0:
        # Materialize sender pool from active users
        pool_users = db.query(WorkspaceUser).filter(
            WorkspaceUser.service_account_id.in_([sa.id for sa in sender_accounts]),
            WorkspaceUser.is_active == True,
        ).all()
        if not pool_users:
            raise HTTPException(status_code=400, detail="No active users available for sending")

        from itertools import cycle
        round_robin = cycle(pool_users)

        for recipient in campaign.recipients:
            user = next(round_robin)
            db.add(EmailLog(
                campaign_id=campaign.id,
                recipient_email=recipient.get('email'),
                recipient_name=recipient.get('variables', {}).get('name', ''),
                sender_email=user.email,
                service_account_id=user.service_account_id,
                subject=campaign.subject,
                status=EmailStatus.PENDING,
            ))
        db.commit()

    campaign.status = CampaignStatus.READY
    campaign.prepared_at = datetime.utcnow()
    db.commit()

    return {"message": "Campaign prepared", "status": campaign.status}


@router.post("/{campaign_id}/control/")
async def control_campaign(
    campaign_id: int,
    control: CampaignControl,
    db: Session = Depends(get_db)
):
    """
    Pause/Resume/Cancel a running campaign.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    action = (control.action or "").lower()
    if action == "pause":
        if campaign.status != CampaignStatus.SENDING:
            raise HTTPException(status_code=400, detail="Can only pause SENDING campaigns")
        campaign.status = CampaignStatus.PAUSED
        campaign.paused_at = datetime.utcnow()
    elif action == "resume":
        if campaign.status != CampaignStatus.PAUSED:
            raise HTTPException(status_code=400, detail="Can only resume PAUSED campaigns")
        campaign.status = CampaignStatus.SENDING
    elif action in ["cancel", "abort", "stop"]:
        if campaign.status not in [CampaignStatus.SENDING, CampaignStatus.PREPARING, CampaignStatus.PAUSED]:
            raise HTTPException(status_code=400, detail="Only active campaigns can be cancelled")
        campaign.status = CampaignStatus.FAILED
    else:
        raise HTTPException(status_code=400, detail="Unsupported action")

    db.commit()
    return {"message": f"Action '{action}' applied", "status": campaign.status}


@router.post("/{campaign_id}/duplicate/")
async def duplicate_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Create a new campaign by cloning fields and associations from an existing one.
    """
    source = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Campaign not found")

    clone = Campaign(
        name=f"{source.name} (copy)",
        subject=source.subject,
        body_html=source.body_html,
        body_plain=source.body_plain,
        from_name=source.from_name,
        from_email=source.from_email,
        reply_to=source.reply_to,
        return_path=source.return_path,
        recipients=list(source.recipients or []),
        total_recipients=source.total_recipients,
        pending_count=source.total_recipients,
        sender_rotation=source.sender_rotation,
        use_ip_pool=source.use_ip_pool,
        ip_pool=list(source.ip_pool or []),
        custom_headers=dict(source.custom_headers or {}),
        attachments=list(source.attachments or []),
        rate_limit=source.rate_limit,
        concurrency=source.concurrency,
        is_test=False,
        status=CampaignStatus.DRAFT,
    )
    db.add(clone)
    db.flush()

    # Clone sender associations
    for assoc in source.sender_accounts:
        db.add(CampaignSender(campaign_id=clone.id, service_account_id=assoc.id))

    db.commit()
    db.refresh(clone)
    return clone

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
