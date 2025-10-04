from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models import (
    ServiceAccount, WorkspaceUser, Campaign, EmailLog,
    CampaignStatus, EmailStatus
)
from app.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Get dashboard statistics
    """
    # Total counts
    total_accounts = db.query(ServiceAccount).count()
    total_users = db.query(WorkspaceUser).count()
    total_campaigns = db.query(Campaign).count()
    active_campaigns = db.query(Campaign).filter(
        Campaign.status.in_([CampaignStatus.SENDING, CampaignStatus.PAUSED, CampaignStatus.PREPARING])
    ).count()
    
    # Today's stats
    today = datetime.utcnow().date()
    tomorrow = today + timedelta(days=1)
    
    emails_sent_today = db.query(func.count(EmailLog.id)).filter(
        EmailLog.status == EmailStatus.SENT,
        EmailLog.sent_at >= today,
        EmailLog.sent_at < tomorrow
    ).scalar() or 0
    
    emails_failed_today = db.query(func.count(EmailLog.id)).filter(
        EmailLog.status == EmailStatus.FAILED,
        EmailLog.failed_at >= today,
        EmailLog.failed_at < tomorrow
    ).scalar() or 0
    
    # Quota usage by account
    quota_usage = {}
    accounts = db.query(ServiceAccount).all()
    
    for account in accounts:
        # Get users for this account
        users = db.query(WorkspaceUser).filter(
            WorkspaceUser.service_account_id == account.id
        ).all()
        
        total_sent = sum(user.emails_sent_today for user in users)
        total_quota = sum(user.quota_limit for user in users)
        
        quota_usage[account.name] = {
            "sent": total_sent,
            "limit": total_quota,
            "percentage": round((total_sent / total_quota * 100) if total_quota > 0 else 0, 2)
        }
    
    return DashboardStats(
        total_accounts=total_accounts,
        total_users=total_users,
        total_campaigns=total_campaigns,
        active_campaigns=active_campaigns,
        emails_sent_today=emails_sent_today,
        emails_failed_today=emails_failed_today,
        quota_usage=quota_usage
    )


@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get recent email activity
    """
    recent_logs = db.query(EmailLog).order_by(
        EmailLog.created_at.desc()
    ).limit(limit).all()
    
    activity = []
    for log in recent_logs:
        campaign = db.query(Campaign).filter(Campaign.id == log.campaign_id).first()
        
        activity.append({
            "id": log.id,
            "campaign_name": campaign.name if campaign else "Unknown",
            "recipient": log.recipient_email,
            "sender": log.sender_email,
            "status": log.status,
            "timestamp": log.created_at,
            "error": log.error_message if log.error_message else None
        })
    
    return activity

