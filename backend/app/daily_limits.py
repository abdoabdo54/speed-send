"""
Daily sending limits and statistics tracking
Handles 2k daily limit per account with automatic 24h reset
"""
from sqlalchemy.orm import Session
from app.database import SessionLocal
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
    check_and_reset_daily_limits()
    logger.info("✅ Daily limit reset task completed")


def check_and_reset_daily_limits():
    """
    Check all accounts and reset daily limits if it's a new day
    This should be called periodically (every hour via Celery Beat)
    """
    db = SessionLocal()
    try:
        today = date.today()
        accounts_to_reset = db.query(ServiceAccount).filter(
            ServiceAccount.daily_reset_date < today
        ).all()
        
        if accounts_to_reset:
            logger.info(f"🔄 Resetting daily limits for {len(accounts_to_reset)} accounts")
            
            for account in accounts_to_reset:
                # Store yesterday's count before reset
                yesterday_sent = account.daily_sent
                account.total_sent_all_time += yesterday_sent
                
                # Reset daily counters
                account.daily_sent = 0
                account.daily_reset_date = today
                
                logger.info(f"   📊 Account {account.name}: Reset daily limit (was {yesterday_sent} sent)")
            
            db.commit()
            logger.info(f"✅ Daily limits reset for {len(accounts_to_reset)} accounts")
        else:
            logger.info("✅ No accounts need daily limit reset")
            
    except Exception as e:
        logger.error(f"❌ Error resetting daily limits: {e}")
        db.rollback()
    finally:
        db.close()


def check_daily_limit(account_id: int, emails_to_send: int) -> tuple[bool, int, int]:
    """
    Check if account can send the requested number of emails today
    
    Returns:
        (can_send, remaining_limit, would_exceed_by)
    """
    db = SessionLocal()
    try:
        account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
        if not account:
            return False, 0, emails_to_send
        
        # Check if we need to reset (new day)
        today = date.today()
        if account.daily_reset_date < today:
            # Reset the account
            account.total_sent_all_time += account.daily_sent
            account.daily_sent = 0
            account.daily_reset_date = today
            db.commit()
            logger.info(f"🔄 Auto-reset daily limit for account {account.name}")
        
        # Check if we can send
        remaining_limit = account.daily_limit - account.daily_sent
        can_send = remaining_limit >= emails_to_send
        would_exceed_by = max(0, (account.daily_sent + emails_to_send) - account.daily_limit)
        
        return can_send, remaining_limit, would_exceed_by
        
    except Exception as e:
        logger.error(f"❌ Error checking daily limit: {e}")
        return False, 0, emails_to_send
    finally:
        db.close()


def update_daily_sent(account_id: int, sent_count: int):
    """
    Update the daily sent count for an account
    """
    db = SessionLocal()
    try:
        account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
        if account:
            account.daily_sent += sent_count
            db.commit()
            logger.info(f"📊 Account {account.name}: Daily sent updated to {account.daily_sent}")
    except Exception as e:
        logger.error(f"❌ Error updating daily sent: {e}")
        db.rollback()
    finally:
        db.close()


def get_account_statistics(account_id: int) -> dict:
    """
    Get comprehensive statistics for an account
    """
    db = SessionLocal()
    try:
        account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
        if not account:
            return {}
        
        # Get today's actual sent count from EmailLog
        today = date.today()
        today_sent = db.query(EmailLog).filter(
            EmailLog.service_account_id == account_id,
            EmailLog.status == EmailStatus.SENT,
            EmailLog.created_at >= datetime.combine(today, datetime.min.time())
        ).count()
        
        # Get total sent from EmailLog
        total_sent = db.query(EmailLog).filter(
            EmailLog.service_account_id == account_id,
            EmailLog.status == EmailStatus.SENT
        ).count()
        
        # Get failed count
        today_failed = db.query(EmailLog).filter(
            EmailLog.service_account_id == account_id,
            EmailLog.status == EmailStatus.FAILED,
            EmailLog.created_at >= datetime.combine(today, datetime.min.time())
        ).count()
        
        return {
            "account_id": account_id,
            "account_name": account.name,
            "daily_limit": account.daily_limit,
            "daily_sent": today_sent,  # Real count from EmailLog
            "daily_remaining": max(0, account.daily_limit - today_sent),
            "total_sent_all_time": total_sent,
            "today_failed": today_failed,
            "daily_reset_date": account.daily_reset_date,
            "success_rate": round((today_sent / (today_sent + today_failed)) * 100, 2) if (today_sent + today_failed) > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting account statistics: {e}")
        return {}
    finally:
        db.close()


def get_all_accounts_statistics() -> list:
    """
    Get statistics for all accounts
    """
    db = SessionLocal()
    try:
        accounts = db.query(ServiceAccount).all()
        stats = []
        
        for account in accounts:
            account_stats = get_account_statistics(account.id)
            if account_stats:
                stats.append(account_stats)
        
        return stats
        
    except Exception as e:
        logger.error(f"❌ Error getting all accounts statistics: {e}")
        return []
    finally:
        db.close()
