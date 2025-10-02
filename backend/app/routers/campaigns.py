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
            recipients=[r.dict() for r in campaign.recipients],
            total_recipients=len(campaign.recipients),
            pending_count=len(campaign.recipients),
            sender_rotation=campaign.sender_rotation,
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


@router.post("/{campaign_id}/control")
async def control_campaign(
    campaign_id: int,
    control: CampaignControl,
    db: Session = Depends(get_db)
):
    """
    Control campaign execution: start, pause, resume, cancel
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if control.action == "start":
        if campaign.status != CampaignStatus.DRAFT:
            raise HTTPException(
                status_code=400,
                detail="Can only start campaigns in DRAFT status"
            )
        
        # Update status to queued
        campaign.status = CampaignStatus.QUEUED
        db.commit()
        
        # Start async task
        task = send_campaign_emails.delay(campaign_id)
        campaign.celery_task_id = task.id
        db.commit()
        
        return {
            "message": "Campaign started",
            "task_id": task.id
        }
    
    elif control.action == "pause":
        if campaign.status != CampaignStatus.RUNNING:
            raise HTTPException(
                status_code=400,
                detail="Can only pause RUNNING campaigns"
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
        
        campaign.status = CampaignStatus.RUNNING
        campaign.paused_at = None
        db.commit()
        
        return {"message": "Campaign resumed"}
    
    elif control.action == "cancel":
        if campaign.status not in [CampaignStatus.RUNNING, CampaignStatus.PAUSED, CampaignStatus.QUEUED]:
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

