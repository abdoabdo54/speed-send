"""
PowerMTA-Style Bulk Sending Engine
Sends multiple emails per sender in parallel using thread pools
"""

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import Campaign, EmailLog, WorkspaceUser, CampaignStatus, EmailStatus
from app.google_api import GoogleWorkspaceService, substitute_variables
from datetime import datetime
import logging
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

logger = logging.getLogger(__name__)


def send_single_email_sync(
    google_service: GoogleWorkspaceService,
    sender_email: str,
    recipient_email: str,
    subject: str,
    body_html: str,
    body_plain: str,
    variables: Dict,
    custom_headers: Dict = None,
    attachments: List = None,
    from_name: str = None
) -> tuple:
    """
    Synchronous email sending (for thread pool)
    
    Returns:
        (success: bool, message_id: str, error: str)
    """
    try:
        # Substitute variables
        final_subject = substitute_variables(subject, variables)
        final_body_html = substitute_variables(body_html, variables) if body_html else None
        final_body_plain = substitute_variables(body_plain, variables) if body_plain else None
        
        # Send email
        message_id = google_service.send_email(
            sender_email=sender_email,
            recipient_email=recipient_email,
            subject=final_subject,
            body_html=final_body_html,
            body_plain=final_body_plain,
            from_name=from_name,
            custom_headers=custom_headers,
            attachments=attachments
        )
        
        return (True, message_id, None)
    
    except Exception as e:
        return (False, None, str(e))


@celery_app.task(name='app.tasks.send_bulk_from_single_sender')
def send_bulk_from_single_sender(
    campaign_id: int,
    sender_data: Dict,
    email_batch: List[Dict],
    subject: str,
    body_html: str = None,
    body_plain: str = None,
    custom_headers: Dict = None,
    attachments: List = None,
    from_name: str = None
):
    """
    Send multiple emails from a single sender using thread pool
    This enables one user to send their batch instantly in parallel
    
    Args:
        campaign_id: Campaign ID
        sender_data: Dict with service_account_json, user_email, etc.
        email_batch: List of emails to send from this sender
        subject: Email subject
        body_html: HTML body
        body_plain: Plain text body
        custom_headers: Custom headers
        attachments: Attachments
    """
    db = SessionLocal()
    sender_email = sender_data['user_email']
    
    try:
        # Check daily limit before sending
        from app.daily_limits import check_daily_limit, update_daily_sent
        account_id = sender_data['service_account_id']
        emails_to_send = len(email_batch)
        
        can_send, remaining_limit, would_exceed_by = check_daily_limit(account_id, emails_to_send)
        
        if not can_send:
            logger.warning(f"🚫 Daily limit exceeded for account {account_id}: {emails_to_send} emails requested, {remaining_limit} remaining")
            # Mark all emails as failed due to daily limit
            for email_data in email_batch:
                email_log = db.query(EmailLog).filter(EmailLog.id == email_data['email_log_id']).first()
                if email_log:
                    email_log.status = EmailStatus.FAILED
                    email_log.error_message = f"Daily limit exceeded: {would_exceed_by} emails over limit"
            db.commit()
            return {"sent": 0, "failed": emails_to_send, "error": "Daily limit exceeded"}
        
        logger.info(f"✅ Daily limit check passed: {emails_to_send} emails, {remaining_limit} remaining")
        # Initialize Google API service once
        google_service = GoogleWorkspaceService(sender_data['service_account_json'])
        
        # Use thread pool for parallel sending from this sender
        # Gmail API is thread-safe for different messages
        max_threads = len(email_batch)  # UNLIMITED threads - send ALL emails instantly
        
        logger.info(f"👤 Sender {sender_email}: Sending {len(email_batch)} emails with {max_threads} threads")
        start_time = time.time()
        
        results = []
        with ThreadPoolExecutor(max_workers=max_threads) as executor:
            # Submit all emails for this sender
            future_to_email = {}
            
            for email_data in email_batch:
                future = executor.submit(
                    send_single_email_sync,
                    google_service,
                    sender_email,
                    email_data['recipient_email'],
                    subject,
                    body_html,
                    body_plain,
                    email_data['variables'],
                    custom_headers,
                    attachments,
                    from_name
                )
                future_to_email[future] = email_data
            
            # Collect results as they complete
            for future in as_completed(future_to_email):
                email_data = future_to_email[future]
                success, message_id, error = future.result()
                
                results.append({
                    'email_log_id': email_data['email_log_id'],
                    'success': success,
                    'message_id': message_id,
                    'error': error
                })
        
        elapsed = time.time() - start_time
        logger.info(f"✅ Sender {sender_email}: Completed {len(email_batch)} emails in {elapsed:.2f}s ({len(email_batch)/elapsed:.1f} emails/sec)")
        
        # Batch update database
        sent_count = 0
        failed_count = 0
        
        for result in results:
            email_log = db.query(EmailLog).filter(EmailLog.id == result['email_log_id']).first()
            
            if email_log:
                if result['success']:
                    email_log.status = EmailStatus.SENT
                    email_log.message_id = result['message_id']
                    email_log.sender_email = sender_email
                    email_log.service_account_id = sender_data['service_account_id']
                    email_log.sent_at = datetime.utcnow()
                    sent_count += 1
                else:
                    email_log.status = EmailStatus.FAILED
                    email_log.error_message = result['error']
                    email_log.sender_email = sender_email
                    email_log.failed_at = datetime.utcnow()
                    failed_count += 1
        
        # Update campaign counters
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.sent_count += sent_count
            campaign.failed_count += failed_count
            campaign.pending_count = max(0, campaign.pending_count - len(results))
        
        # Update workspace user stats
        workspace_user = db.query(WorkspaceUser).filter(
            WorkspaceUser.service_account_id == sender_data['service_account_id'],
            WorkspaceUser.email == sender_email
        ).first()
        if workspace_user:
            workspace_user.emails_sent_today += sent_count
            workspace_user.last_used = datetime.utcnow()
        
        db.commit()
        
        # Update daily sent count for the account
        if sent_count > 0:
            update_daily_sent(account_id, sent_count)
            logger.info(f"📊 Updated daily sent: +{sent_count} emails for account {account_id}")
        
        logger.info(f"📊 Sender {sender_email}: {sent_count} sent, {failed_count} failed")
        
    except Exception as e:
        logger.error(f"❌ Sender {sender_email} bulk send failed: {e}")
        
        # Mark all as failed
        for email_data in email_batch:
            email_log = db.query(EmailLog).filter(EmailLog.id == email_data['email_log_id']).first()
            if email_log and email_log.status == EmailStatus.PENDING:
                email_log.status = EmailStatus.FAILED
                email_log.error_message = str(e)
                email_log.failed_at = datetime.utcnow()
        
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.failed_count += len(email_batch)
            campaign.pending_count = max(0, campaign.pending_count - len(email_batch))
        
        db.commit()
        raise
    
    finally:
        db.close()

