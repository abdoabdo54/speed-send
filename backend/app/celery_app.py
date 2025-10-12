from celery import Celery
from app.config import settings

# Create Celery app
celery_app = Celery(
    'gmail_saas',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=['app.tasks', 'app.tasks_powermta', 'app.tasks_v2']
)

# Configure Celery for MAXIMUM PowerMTA-style performance - NO LIMITS
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    # REMOVED ALL TIME LIMITS - UNLIMITED EXECUTION
    worker_prefetch_multiplier=1000,  # Fetch MANY tasks for instant execution
    worker_max_tasks_per_child=100000,  # NO LIMIT on tasks per worker
    broker_connection_retry_on_startup=True,
    # ULTRA-MAXIMUM PowerMTA optimization - NO DELAYS, NO LIMITS
    task_acks_late=False,  # Acknowledge immediately for speed
    task_reject_on_worker_lost=False,  # Don't reject for speed
    task_compression=None,  # NO compression for speed
    # ULTRA-MAXIMUM CONCURRENCY - USE ALL CPU/RAM
    worker_prefetch_multiplier=10000,  # Fetch 10k tasks for instant execution
    worker_concurrency=2000,  # 2000 concurrent workers (MAXIMUM)
    worker_pool='threads',  # Use threads for maximum speed
    worker_disable_rate_limits=True,  # DISABLE ALL RATE LIMITS
    task_ignore_result=True,  # Ignore results for speed
    task_store_eager_result=True,  # Store results immediately
    worker_max_tasks_per_child=1000000,  # NO LIMIT on tasks per worker
)

# Task routes
celery_app.conf.task_routes = {
    'app.tasks.send_campaign_emails': {'queue': 'email_queue'},
    'app.tasks.send_bulk_from_single_sender': {'queue': 'email_queue'},
    'app.tasks.send_single_email': {'queue': 'email_queue'},
    'app.tasks.sync_workspace_users': {'queue': 'sync_queue'},
    'app.daily_limits.reset_daily_limits': {'queue': 'maintenance_queue'},
}

# Celery Beat schedule for daily limit reset
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'reset-daily-limits': {
        'task': 'app.daily_limits.reset_daily_limits',
        'schedule': crontab(hour=0, minute=0),  # Every day at midnight
    },
}

