"""
Daily sending limits and statistics tracking
Handles 2k daily limit per account with automatic 24h reset
"""
from sqlalchemy.orm import Session
from app.database import SessionLocal, get_db
from app.models import ServiceAccount, EmailLog, EmailStatus
from datetime import date, datetime, timedelta
import logging
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name='app.daily_limits.reset_daily_limits')
def reset_daily_limits():
    """
    Celery task to reset daily limits for all accounts
    Called automatically every day at midnight
    """
    logger.info("🔄 Starting daily limit reset task...")
    db = next(get_db())
    try:
        check_and_reset_daily_limits(db=db)
    finally:
        db.close()
    logger.info("✅ Daily limit reset task completed")


def check_and_reset_daily_limits(db: Session):
    """
    Check all accounts and reset daily limits if it's a new day.
    This should be called periodically.
    """
    try:
        today = date.today()
        accounts_to_reset = db.query(ServiceAccount).filter(
            ServiceAccount.daily_reset_date < today
        ).all()
        
        if accounts_to_reset:
            logger.info(f"🔄 Resetting daily limits for {len(accounts_to_reset)} accounts")
            for account in accounts_to_reset:
                account.total_sent_all_time += account.daily_sent
                account.daily_sent = 0
                account.daily_reset_date = today
            db.commit()
            logger.info(f"✅ Daily limits reset for {len(accounts_to_reset)} accounts")
        else:
            logger.info("✅ No accounts need daily limit reset")
            
    except Exception as e:
        logger.error(f"❌ Error resetting daily limits: {e}")
        db.rollback()


def check_daily_limit(account_id: int, emails_to_send: int, db: Session) -> tuple[bool, int, int]:
    """
    Check if account can send the requested number of emails today
    Returns: (can_send, remaining_limit, would_exceed_by)
    """
    try:
        account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
        if not account:
            return False, 0, emails_to_send
        
        today = date.today()
        if account.daily_reset_date < today:
            account.total_sent_all_time += account.daily_sent
            account.daily_sent = 0
            account.daily_reset_date = today
            db.commit()
            logger.info(f"🔄 Auto-reset daily limit for account {account.name}")
        
        remaining_limit = account.daily_limit - account.daily_sent
        can_send = remaining_limit >= emails_to_send
        would_exceed_by = max(0, (account.daily_sent + emails_to_send) - account.daily_limit)
        
        return can_send, remaining_limit, would_exceed_by
        
    except Exception as e:
        logger.error(f"❌ Error checking daily limit: {e}")
        return False, 0, emails_to_send


def update_daily_sent(db: Session, account_id: int, sent_count: int):
    """
    Update the daily sent count for an account
    """
    try:
        account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
        if account:
            account.daily_sent += sent_count
            db.commit()
    except Exception as e:
        logger.error(f"❌ Error updating daily sent for account {account_id}: {e}")
        db.rollback()


def get_account_statistics(db: Session, account_id: int) -> dict:
    """
    Get comprehensive statistics for a single account using the provided session.
    """
    try:
        account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
        if not account:
            return {}
        
        today_start = datetime.combine(date.today(), datetime.min.time())
        
        today_sent = db.query(EmailLog).filter(
            EmailLog.service_account_id == account_id,
            EmailLog.status == EmailStatus.SENT,
            EmailLog.created_at >= today_start
        ).count()
        
        today_failed = db.query(EmailLog).filter(
            EmailLog.service_account_id == account_id,
            EmailLog.status == EmailStatus.FAILED,
            EmailLog.created_at >= today_start
        ).count()

        total_sent = db.query(EmailLog).filter(
            EmailLog.service_account_id == account_id,
            EmailLog.status == EmailStatus.SENT
        ).count()
        
        divisor = today_sent + today_failed
        success_rate = (today_sent / divisor) * 100 if divisor > 0 else 0

        return {
            "account_id": account_id,
            "account_name": account.name,
            "daily_limit": account.daily_limit,
            "daily_sent": today_sent,
            "daily_remaining": max(0, account.daily_limit - today_sent),
            "total_sent_all_time": total_sent,
            "today_failed": today_failed,
            "daily_reset_date": account.daily_reset_date.isoformat() if account.daily_reset_date else None,
            "success_rate": round(success_rate, 2)
        }
    except Exception as e:
        logger.error(f"❌ Error in get_account_statistics for account {account_id}: {e}")
        return {}

def get_all_accounts_statistics(db: Session) -> list:
    """
    Get statistics for all accounts using the provided session.
    """
    try:
        accounts = db.query(ServiceAccount).all()
        stats = [get_account_statistics(db, account.id) for account in accounts]
        return [s for s in stats if s] # Filter out empty dicts from failed accounts
    except Exception as e:
        logger.error(f"❌ Error in get_all_accounts_statistics: {e}")
        return []
