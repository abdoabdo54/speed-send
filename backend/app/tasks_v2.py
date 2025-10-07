"""
V2 PowerMTA Engine - Redis-backed pre-generation and instant resume
Implements the full V2 architecture with preparation phase and instant sending.
"""

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import Campaign, EmailLog, WorkspaceUser, ServiceAccount, CampaignStatus, EmailStatus
from app.google_api import GoogleWorkspaceService, substitute_variables
from app.encryption import encryption_service
from datetime import datetime
import logging
import json
import redis
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import uuid

logger = logging.getLogger(__name__)

# Redis connection
redis_client = redis.from_url("redis://redis:6379/0", decode_responses=True)


def get_campaign_redis_key(campaign_id: int) -> str:
    """Get Redis key for campaign task queue"""
    return f"campaign:{campaign_id}:tasks"


def get_campaign_progress_key(campaign_id: int) -> str:
    """Get Redis key for campaign progress tracking"""
    return f"campaign:{campaign_id}:progress"


def _is_admin_email(user_email: str, service_account_admin_email: str | None) -> bool:
    """Heuristic to exclude admin addresses from sender pool without schema change.
    Excludes:
    - Exact match with configured ServiceAccount.admin_email
    - Common admin aliases: admin@, administrator@, postmaster@
    - Google default addresses: abuse@, support@
    """
    if not user_email:
        return False
    email_lower = user_email.strip().lower()
    if service_account_admin_email and email_lower == service_account_admin_email.strip().lower():
        return True
    local_part = email_lower.split("@")[0]
    return local_part in {"admin", "administrator", "postmaster", "abuse", "support"}


@celery_app.task(name='app.tasks_v2.prepare_campaign_redis')
def prepare_campaign_redis(campaign_id: int):
    """
    V2 Preparation: Pre-generate all email tasks and store in Redis
    This makes the later resume instant - no generation time.
    
    Args:
        campaign_id: ID of campaign to prepare
    """
    db = SessionLocal()
    request_id = str(uuid.uuid4())[:8]
    
    try:
        logger.info(f"[{request_id}] 🎯 V2 PREPARE START: Campaign {campaign_id}")
        start_time = time.time()
        
        # Get campaign
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise Exception(f"Campaign {campaign_id} not found")
        
        campaign.status = CampaignStatus.PREPARING
        campaign.prepared_at = datetime.utcnow()
        db.commit()
        
        # Get sender accounts
        sender_accounts = campaign.sender_accounts
        if not sender_accounts:
            raise Exception("No sender accounts configured")
        
        # Build sender pool
        sender_pool = []
        for account in sender_accounts:
            users = db.query(WorkspaceUser).filter(
                WorkspaceUser.service_account_id == account.id,
                WorkspaceUser.is_active == True
            ).all()
            
            # Decrypt once during preparation
            decrypted_json = encryption_service.decrypt(account.encrypted_json)
            
            for user in users:
                # Skip admin addresses (must not be used as senders)
                if _is_admin_email(user.email, getattr(account, 'admin_email', None)):
                    continue
                sender_pool.append({
                    'service_account_id': account.id,
                    'service_account_json': decrypted_json,
                    'user_email': user.email,
                    'user_id': user.id
                })
        
        if not sender_pool:
            raise Exception("No active users available")
        
        logger.info(f"[{request_id}] 👥 Sender pool: {len(sender_pool)} users across {len(sender_accounts)} accounts")
        
        # Create email logs if they don't exist
        existing_logs_count = db.query(EmailLog).filter(EmailLog.campaign_id == campaign_id).count()
        
        if existing_logs_count == 0:
            logger.info(f"[{request_id}] 📝 Creating {len(campaign.recipients)} email logs...")
            
            from itertools import cycle
            round_robin = cycle(sender_pool)
            
            for recipient in campaign.recipients:
                sender = next(round_robin)
                db.add(EmailLog(
                    campaign_id=campaign_id,
                    recipient_email=recipient.get('email'),
                    recipient_name=recipient.get('variables', {}).get('name', ''),
                    sender_email=sender['user_email'],
                    service_account_id=sender['service_account_id'],
                    subject=campaign.subject,
                    status=EmailStatus.PENDING,
                ))
            db.commit()
            logger.info(f"[{request_id}] ✅ Email logs created")
        
        # Fetch all email logs
        email_logs = db.query(EmailLog).filter(
            EmailLog.campaign_id == campaign_id,
            EmailLog.status.in_([EmailStatus.PENDING, EmailStatus.FAILED])
        ).all()
        
        logger.info(f"[{request_id}] 📦 Preparing {len(email_logs)} tasks for Redis...")
        
        # Pre-generate all tasks and push to Redis
        redis_key = get_campaign_redis_key(campaign_id)
        redis_client.delete(redis_key)  # Clear any old tasks
        
        # Check if test_after is configured
        test_after_enabled = campaign.test_after_email and campaign.test_after_count > 0
        if test_after_enabled:
            logger.info(f"[{request_id}] 🧪 Test After enabled: {campaign.test_after_count} emails -> {campaign.test_after_email}")
        
        # Group tasks by sender
        sender_batches = {}
        task_counter = 0  # Track position for test_after
        
        for email_log in email_logs:
            sender_email = email_log.sender_email
            
            if sender_email not in sender_batches:
                # Find sender data
                sender = next((s for s in sender_pool if s['user_email'] == sender_email), None)
                if not sender:
                    logger.warning(f"[{request_id}] ⚠️ No sender found for {sender_email}, using first available")
                    sender = sender_pool[0]
                
                sender_batches[sender_email] = {
                    'sender': sender,
                    'tasks': []
                }
            
            # Get recipient variables
            recipient_data = next(
                (r for r in campaign.recipients if r['email'] == email_log.recipient_email),
                {'email': email_log.recipient_email, 'variables': {}}
            )
            
            # Pre-render subject and body
            variables = recipient_data.get('variables', {})
            final_subject = substitute_variables(campaign.subject, variables)
            final_body_html = substitute_variables(campaign.body_html, variables) if campaign.body_html else None
            final_body_plain = substitute_variables(campaign.body_plain, variables) if campaign.body_plain else None
            
            task = {
                'email_log_id': email_log.id,
                'recipient_email': email_log.recipient_email,
                'subject': final_subject,
                'body_html': final_body_html,
                'body_plain': final_body_plain,
                'from_name': campaign.from_name,
                'custom_headers': campaign.custom_headers,
                'attachments': campaign.attachments,
            }
            
            sender_batches[sender_email]['tasks'].append(task)
            task_counter += 1
            
            # Add test_after email if needed
            if test_after_enabled and task_counter % campaign.test_after_count == 0:
                test_task = {
                    'email_log_id': None,  # Special test task
                    'recipient_email': campaign.test_after_email,
                    'subject': f"[TEST AFTER {task_counter}] {final_subject}",
                    'body_html': f"<p><strong>Test After Email #{task_counter}</strong></p><p>This is a test email sent after {task_counter} campaign emails.</p>{final_body_html}",
                    'body_plain': f"Test After Email #{task_counter}\n\nThis is a test email sent after {task_counter} campaign emails.\n\n{final_body_plain}",
                    'from_name': campaign.from_name,
                    'custom_headers': campaign.custom_headers,
                    'attachments': campaign.attachments,
                    'is_test_after': True,
                    'test_after_count': task_counter
                }
                sender_batches[sender_email]['tasks'].append(test_task)
                logger.info(f"[{request_id}] 🧪 Added test_after email at position {task_counter}")
        
        # Push batches to Redis
        task_count = 0
        for sender_email, batch_data in sender_batches.items():
            redis_task = {
                'campaign_id': campaign_id,
                'sender': batch_data['sender'],
                'tasks': batch_data['tasks']
            }
            redis_client.rpush(redis_key, json.dumps(redis_task))
            task_count += len(batch_data['tasks'])
        
        logger.info(f"[{request_id}] ✅ Pushed {len(sender_batches)} sender batches ({task_count} tasks) to Redis")
        
        # Initialize progress tracker
        progress_key = get_campaign_progress_key(campaign_id)
        redis_client.hset(progress_key, mapping={
            'total': task_count,
            'sent': 0,
            'failed': 0,
            'pending': task_count,
            'test_after_enabled': '1' if test_after_enabled else '0',
            'test_after_email': campaign.test_after_email or '',
            'test_after_count': campaign.test_after_count or 0
        })
        redis_client.expire(progress_key, 86400)  # 24 hour expiry
        
        # Mark campaign as READY
        campaign.status = CampaignStatus.READY
        campaign.pending_count = task_count
        campaign.sent_count = 0
        campaign.failed_count = 0
        db.commit()
        
        elapsed = time.time() - start_time
        logger.info(f"[{request_id}] 🎉 V2 PREPARE COMPLETE in {elapsed:.2f}s - Campaign {campaign_id} READY")
        
        return {
            'campaign_id': campaign_id,
            'status': 'ready',
            'total_tasks': task_count,
            'sender_count': len(sender_batches),
            'preparation_time': elapsed
        }
        
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Preparation failed: {e}")
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.status = CampaignStatus.FAILED
            db.commit()
        raise
    
    finally:
        db.close()


@celery_app.task(name='app.tasks_v2.resume_campaign_instant')
def resume_campaign_instant(campaign_id: int):
    """
    V2 Resume: Instantly fan out all pre-generated tasks from Redis
    No generation time - everything is ready to send NOW.
    
    Args:
        campaign_id: ID of campaign to resume
    """
    db = SessionLocal()
    request_id = str(uuid.uuid4())[:8]
    
    try:
        logger.info(f"[{request_id}] ⚡ V2 RESUME START: Campaign {campaign_id}")
        start_time = time.time()
        
        # Get campaign
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise Exception(f"Campaign {campaign_id} not found")
        
        if campaign.status not in [CampaignStatus.READY, CampaignStatus.PAUSED]:
            raise Exception(f"Campaign must be READY or PAUSED. Current: {campaign.status}")
        
        campaign.status = CampaignStatus.SENDING
        campaign.started_at = datetime.utcnow()
        db.commit()
        
        # Fetch all tasks from Redis
        redis_key = get_campaign_redis_key(campaign_id)
        task_batches = []
        
        while True:
            batch_json = redis_client.lpop(redis_key)
            if not batch_json:
                break
            task_batches.append(json.loads(batch_json))
        
        if not task_batches:
            raise Exception("No tasks found in Redis. Campaign may not be prepared.")
        
        logger.info(f"[{request_id}] 🚀 Launching {len(task_batches)} sender batches instantly...")
        
        # Fan out to Celery workers - ALL AT ONCE
        from celery import group
        celery_tasks = [
            execute_sender_batch_v2.s(batch_data, campaign_id, request_id)
            for batch_data in task_batches
        ]
        
        job = group(celery_tasks)
        result = job.apply_async()
        
        logger.info(f"[{request_id}] ✅ All batches dispatched in {time.time() - start_time:.2f}s")
        
        # Wait for completion (with timeout)
        try:
            result.get(timeout=600)  # 10 min timeout
            elapsed = time.time() - start_time
            logger.info(f"[{request_id}] 🎉 V2 RESUME COMPLETE in {elapsed:.2f}s")
        except Exception as e:
            logger.error(f"[{request_id}] ⚠️ Some tasks timed out or failed: {e}")
        
        # Update final campaign status
        db.refresh(campaign)
        if campaign.status == CampaignStatus.SENDING:
            campaign.status = CampaignStatus.COMPLETED
            campaign.completed_at = datetime.utcnow()
            db.commit()
        
        return {
            'campaign_id': campaign_id,
            'status': 'completed',
            'total_time': time.time() - start_time
        }
        
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Resume failed: {e}")
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.status = CampaignStatus.FAILED
            db.commit()
        raise
    
    finally:
        db.close()


@celery_app.task(name='app.tasks_v2.execute_sender_batch_v2')
def execute_sender_batch_v2(batch_data: Dict, campaign_id: int, request_id: str):
    """
    Execute a single sender's batch using thread pool
    With configurable 5ms micro-delay per email
    
    Args:
        batch_data: Dict with sender info and pre-rendered tasks
        campaign_id: Campaign ID
        request_id: Request tracking ID
    """
    db = SessionLocal()
    sender = batch_data['sender']
    tasks = batch_data['tasks']
    sender_email = sender['user_email']
    
    # Configurable micro-delay (in seconds)
    MICRO_DELAY = 0.005  # 5ms between sends per user
    
    try:
        logger.info(f"[{request_id}] 👤 Sender {sender_email}: Executing {len(tasks)} tasks")
        start_time = time.time()
        
        # Initialize Google service once
        google_service = GoogleWorkspaceService(sender['service_account_json'])
        
        # Thread pool for parallel sending
        max_threads = min(len(tasks), 50)  # Up to 50 parallel per sender
        
        results = []
        with ThreadPoolExecutor(max_workers=max_threads) as executor:
            futures = []
            
            for task in tasks:
                future = executor.submit(
                    send_prerendered_email,
                    google_service,
                    sender_email,
                    task,
                    MICRO_DELAY
                )
                futures.append((future, task))
            
            # Collect results
            for future, task in futures:
                success, message_id, error = future.result()
                results.append({
                    'email_log_id': task['email_log_id'],
                    'success': success,
                    'message_id': message_id,
                    'error': error
                })
        
        elapsed = time.time() - start_time
        test_after_info = f", {test_after_sent} test_after" if test_after_sent > 0 else ""
        logger.info(f"[{request_id}] ✅ Sender {sender_email}: {len(tasks)} tasks in {elapsed:.2f}s ({len(tasks)/elapsed:.1f}/sec){test_after_info}")
        
        # Batch DB update
        sent = 0
        failed = 0
        test_after_sent = 0
        
        for result in results:
            # Handle test_after emails (no email_log_id)
            if result['email_log_id'] is None:
                if result['success']:
                    test_after_sent += 1
                    logger.info(f"[{request_id}] 🧪 Test After email sent successfully to {result.get('recipient_email', 'unknown')}")
                else:
                    logger.warning(f"[{request_id}] 🧪 Test After email failed: {result['error']}")
                continue
            
            # Handle regular campaign emails
            email_log = db.query(EmailLog).filter(EmailLog.id == result['email_log_id']).first()
            if email_log:
                if result['success']:
                    email_log.status = EmailStatus.SENT
                    email_log.message_id = result['message_id']
                    email_log.sent_at = datetime.utcnow()
                    sent += 1
                else:
                    email_log.status = EmailStatus.FAILED
                    email_log.error_message = result['error']
                    email_log.failed_at = datetime.utcnow()
                    failed += 1
        
        # Update campaign counters
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.sent_count += sent
            campaign.failed_count += failed
            campaign.pending_count = max(0, campaign.pending_count - len(results))
        
        # Update user stats
        user = db.query(WorkspaceUser).filter(
            WorkspaceUser.service_account_id == sender['service_account_id'],
            WorkspaceUser.email == sender_email
        ).first()
        if user:
            user.emails_sent_today += sent
            user.last_used = datetime.utcnow()
        
        db.commit()
        
        # Update Redis progress
        progress_key = get_campaign_progress_key(campaign_id)
        redis_client.hincrby(progress_key, 'sent', sent)
        redis_client.hincrby(progress_key, 'failed', failed)
        redis_client.hincrby(progress_key, 'pending', -len(results))
        
        # Check if we need to send a test email
        if campaign and campaign.test_after_count > 0 and campaign.test_after_email:
            total_sent = redis_client.hget(progress_key, 'sent') or '0'
            total_sent = int(total_sent)
            
            # Check if we've reached a test email milestone
            if total_sent > 0 and total_sent % campaign.test_after_count == 0:
                try:
                    logger.info(f"[{request_id}] 🧪 Sending test email after {total_sent} emails sent")
                    
                    # Send test email using the same campaign content
                    test_subject = f"[TEST AFTER {total_sent}] {campaign.subject}"
                    test_body_html = campaign.body_html or ""
                    test_body_plain = campaign.body_plain or ""
                    
                    message_id = google_service.send_email(
                        sender_email=sender_email,
                        recipient_email=campaign.test_after_email,
                        subject=test_subject,
                        body_html=test_body_html,
                        body_plain=test_body_plain,
                        from_name=campaign.from_name
                    )
                    
                    logger.info(f"[{request_id}] ✅ Test email sent successfully: {message_id}")
                    
                except Exception as e:
                    logger.error(f"[{request_id}] ❌ Failed to send test email: {e}")
            
            # Also check if we just sent emails in this batch that trigger a test
            elif sent > 0:
                # Check if the current batch puts us over a milestone
                previous_total = total_sent - sent
                current_total = total_sent
                
                # Check if we crossed a milestone in this batch
                previous_milestone = (previous_total // campaign.test_after_count) * campaign.test_after_count
                current_milestone = (current_total // campaign.test_after_count) * campaign.test_after_count
                
                if current_milestone > previous_milestone and current_milestone > 0:
                    try:
                        logger.info(f"[{request_id}] 🧪 Sending test email after reaching {current_milestone} emails")
                        
                        # Send test email using the same campaign content
                        test_subject = f"[TEST AFTER {current_milestone}] {campaign.subject}"
                        test_body_html = campaign.body_html or ""
                        test_body_plain = campaign.body_plain or ""
                        
                        message_id = google_service.send_email(
                            sender_email=sender_email,
                            recipient_email=campaign.test_after_email,
                            subject=test_subject,
                            body_html=test_body_html,
                            body_plain=test_body_plain,
                            from_name=campaign.from_name
                        )
                        
                        logger.info(f"[{request_id}] ✅ Test email sent successfully: {message_id}")
                        
                    except Exception as e:
                        logger.error(f"[{request_id}] ❌ Failed to send test email: {e}")
        
        logger.info(f"[{request_id}] 📊 Sender {sender_email}: {sent} sent, {failed} failed")
        
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Sender {sender_email} failed: {e}")
        
        # Mark all as failed
        for task in tasks:
            email_log = db.query(EmailLog).filter(EmailLog.id == task['email_log_id']).first()
            if email_log and email_log.status == EmailStatus.PENDING:
                email_log.status = EmailStatus.FAILED
                email_log.error_message = str(e)
                email_log.failed_at = datetime.utcnow()
        
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.failed_count += len(tasks)
            campaign.pending_count = max(0, campaign.pending_count - len(tasks))
        
        db.commit()
        raise
    
    finally:
        db.close()


def send_prerendered_email(
    google_service: GoogleWorkspaceService,
    sender_email: str,
    task: Dict,
    micro_delay: float = 0.005
) -> tuple:
    """
    Send a pre-rendered email (no variable substitution needed)
    
    Args:
        google_service: Initialized Google API service
        sender_email: Sender email
        task: Pre-rendered task dict
        micro_delay: Optional delay between sends (seconds)
    
    Returns:
        (success: bool, message_id: str, error: str)
    """
    try:
        # Apply micro-delay if configured
        if micro_delay > 0:
            time.sleep(micro_delay)
        
        # Send (everything is already prepared)
        message_id = google_service.send_email(
            sender_email=sender_email,
            recipient_email=task['recipient_email'],
            subject=task['subject'],
            body_html=task['body_html'],
            body_plain=task['body_plain'],
            from_name=task.get('from_name'),
            custom_headers=task.get('custom_headers'),
            attachments=task.get('attachments')
        )
        
        return (True, message_id, None)
    
    except Exception as e:
        return (False, None, str(e))

