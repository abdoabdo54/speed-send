from celery import Celery
from app.config import settings

# Create Celery app
celery_app = Celery(
    'gmail_saas',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=['app.tasks', 'app.tasks_powermta']
)

# Configure Celery for PowerMTA-style performance
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max per task
    task_soft_time_limit=3300,  # 55 minutes soft limit
    worker_prefetch_multiplier=1,  # Fetch one task at a time for instant execution
    worker_max_tasks_per_child=1000,
    broker_connection_retry_on_startup=True,
    # PowerMTA optimization
    task_acks_late=True,  # Acknowledge after task completion
    task_reject_on_worker_lost=True,
    task_compression='gzip',  # Compress large task payloads
)

# Task routes
celery_app.conf.task_routes = {
    'app.tasks.send_campaign_emails': {'queue': 'email_queue'},
    'app.tasks.send_bulk_from_single_sender': {'queue': 'email_queue'},
    'app.tasks.send_single_email': {'queue': 'email_queue'},
    'app.tasks.sync_workspace_users': {'queue': 'sync_queue'},
}

