from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging
import asyncio
import json

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
from fastapi import Response, Request
from fastapi.responses import StreamingResponse
# Correctly import the updated functions
from app.daily_limits import get_all_accounts_statistics, get_account_statistics

router = APIRouter(prefix="/campaigns")

# Module logger
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[CampaignResponse])
async def list_campaigns(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Campaign)
    if status:
        query = query.filter(Campaign.status == status)
    campaigns = query.order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()
    return campaigns

@router.get("/{campaign_id}/", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.post("/", response_model=CampaignResponse)
async def create_campaign(
    campaign: CampaignCreate,
    db: Session = Depends(get_db)
):
    try:
        sender_accounts = db.query(ServiceAccount).filter(
            ServiceAccount.id.in_(campaign.sender_account_ids)
        ).all()
        if not sender_accounts:
            raise HTTPException(status_code=400, detail="No sender accounts found")
        
        new_campaign = Campaign(
            name=campaign.name,
            subject=campaign.subject,
            body_html=campaign.body_html,
            body_plain=campaign.body_plain,
            from_name=campaign.from_name,
            recipients=[r.dict() for r in campaign.recipients],
            total_recipients=len(campaign.recipients),
            pending_count=len(campaign.recipients),
            status=CampaignStatus.DRAFT,
            header_type=campaign.header_type,
            custom_header=campaign.custom_header
        )
        db.add(new_campaign)
        db.flush()

        for account in sender_accounts:
            association = CampaignSender(campaign_id=new_campaign.id, service_account_id=account.id)
            db.add(association)
        
        db.commit()
        db.refresh(new_campaign)
        logger.info(f"📝 Campaign {new_campaign.id} created in DRAFT status")
        return new_campaign
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {str(e)}")

@router.patch("/{campaign_id}/", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    campaign_update: CampaignUpdate,
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    update_data = campaign_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(campaign, key, value)
    
    if 'sender_account_ids' in update_data:
        db.query(CampaignSender).filter(CampaignSender.campaign_id == campaign_id).delete()
        for account_id in update_data['sender_account_ids']:
            association = CampaignSender(campaign_id=campaign_id, service_account_id=account_id)
            db.add(association)

    campaign.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(campaign)
    return campaign

@router.post("/{campaign_id}/launch/")
async def launch_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    # This is a legacy endpoint, the new flow uses prepare -> resume
    raise HTTPException(status_code=400, detail="Legacy launch endpoint. Use /prepare and /resume instead.")

@router.delete("/{campaign_id}/")
async def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status in [CampaignStatus.SENDING, CampaignStatus.PREPARING]:
        raise HTTPException(status_code=400, detail="Cannot delete active campaigns")
    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted successfully"}

# --- New lifecycle endpoints ---

@router.post("/{campaign_id}/prepare/")
async def prepare_campaign_endpoint(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    from app.tasks_v2 import prepare_campaign_redis
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.FAILED]:
        raise HTTPException(status_code=400, detail=f"Can only prepare DRAFT/FAILED campaigns. Current: {campaign.status}")
    
    try:
        task = prepare_campaign_redis.delay(campaign_id)
        campaign.status = CampaignStatus.PREPARING
        db.commit()
        return {"message": "Campaign preparation started", "task_id": str(task.id)}
    except Exception as e:
        logger.error(f"Failed to start campaign preparation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start preparation: {str(e)}")

@router.post("/{campaign_id}/control/")
async def control_campaign_endpoint(
    campaign_id: int,
    control: CampaignControl,
    db: Session = Depends(get_db)
):
    # Implementation for pause/resume/cancel
    pass # Add logic as needed

@router.post("/{campaign_id}/resume/")
async def resume_campaign_endpoint(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    from app.tasks_v2 import resume_campaign_instant
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status not in [CampaignStatus.READY, CampaignStatus.PAUSED]:
        raise HTTPException(status_code=400, detail=f"Campaign must be READY or PAUSED. Current: {campaign.status}")

    try:
        task = resume_campaign_instant.delay(campaign_id)
        campaign.status = CampaignStatus.SENDING
        campaign.celery_task_id = str(task.id)
        campaign.started_at = datetime.utcnow()
        db.commit()
        return {"message": "Campaign resumed", "task_id": str(task.id)}
    except Exception as e:
        logger.error(f"Failed to resume campaign: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resume: {str(e)}")

@router.get("/statistics/")
async def get_general_statistics(db: Session = Depends(get_db)):
    """
    Get comprehensive campaign and account statistics using a single DB session.
    """
    try:
        account_stats = get_all_accounts_statistics(db=db)
        
        total_campaigns = db.query(Campaign).count()
        active_campaigns = db.query(Campaign).filter(Campaign.status == CampaignStatus.SENDING).count()
        completed_campaigns = db.query(Campaign).filter(Campaign.status == CampaignStatus.COMPLETED).count()
        
        today_start = datetime.combine(datetime.now().date(), datetime.min.time())
        today_sent = db.query(EmailLog).filter(EmailLog.status == EmailStatus.SENT, EmailLog.created_at >= today_start).count()
        total_sent = db.query(EmailLog).filter(EmailLog.status == EmailStatus.SENT).count()
        
        total_daily_limit = sum(acc.get('daily_limit', 0) for acc in account_stats)
        total_sent_today = sum(acc.get('daily_sent', 0) for acc in account_stats)

        return {
            "accounts": account_stats,
            "campaigns": {"total": total_campaigns, "active": active_campaigns, "completed": completed_campaigns},
            "emails": {"sent_today": today_sent, "sent_all_time": total_sent},
            "daily_limits": {
                "total_daily_limit": total_daily_limit,
                "total_sent_today": total_sent_today,
                "total_remaining": total_daily_limit - total_sent_today
            }
        }
    except Exception as e:
        logger.error(f"Error getting statistics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

@router.get("/{campaign_id}/progress/")
async def get_campaign_progress(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    # Logic for campaign progress
    pass # Add logic as needed


@router.get("/{campaign_id}/logs/", response_model=List[EmailLogResponse])
async def get_campaign_logs(
    campaign_id: int,
    status: Optional[EmailStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(EmailLog).filter(EmailLog.campaign_id == campaign_id)
    if status:
        query = query.filter(EmailLog.status == status)
    logs = query.order_by(EmailLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs
