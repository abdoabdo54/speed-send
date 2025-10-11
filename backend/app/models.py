from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class AccountStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    QUOTA_EXCEEDED = "quota_exceeded"


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    PREPARING = "preparing"
    READY = "ready"
    SENDING = "sending"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class EmailStatus(str, enum.Enum):
    PENDING = "pending"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    RETRY = "retry"


class ServiceAccount(Base):
    __tablename__ = "service_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    client_email = Column(String(255), nullable=False, unique=True)
    domain = Column(String(255), nullable=False)
    project_id = Column(String(255))
    admin_email = Column(String(255))  # Admin email for domain-wide delegation
    
    # Encrypted JSON content
    encrypted_json = Column(Text, nullable=False)
    
    # Metadata
    status = Column(Enum(AccountStatus), default=AccountStatus.ACTIVE)
    total_users = Column(Integer, default=0)
    
    # Daily sending limits and tracking
    daily_limit = Column(Integer, default=2000)  # 2k emails per day per account
    daily_sent = Column(Integer, default=0)  # Emails sent today
    daily_reset_date = Column(Date, default=func.current_date())  # Last reset date
    total_sent_all_time = Column(Integer, default=0)  # Total emails sent ever
    
    # Legacy quota fields (keeping for compatibility)
    quota_limit = Column(Integer, default=500)  # Daily quota per user
    quota_used_today = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_synced = Column(DateTime(timezone=True))
    
    # Relationships
    workspace_users = relationship("WorkspaceUser", back_populates="service_account", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", secondary="campaign_senders", back_populates="sender_accounts")


class WorkspaceUser(Base):
    __tablename__ = "workspace_users"
    
    id = Column(Integer, primary_key=True, index=True)
    service_account_id = Column(Integer, ForeignKey("service_accounts.id", ondelete="CASCADE"))
    
    email = Column(String(255), nullable=False, index=True)
    full_name = Column(String(255))
    first_name = Column(String(255))
    last_name = Column(String(255))
    
    # Quota tracking
    emails_sent_today = Column(Integer, default=0)
    quota_limit = Column(Integer, default=500)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_used = Column(DateTime(timezone=True))
    
    # Relationships
    service_account = relationship("ServiceAccount", back_populates="workspace_users")


class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    
    # Campaign configuration
    subject = Column(String(998), nullable=False)  # RFC 2822 limit
    body_html = Column(Text)
    body_plain = Column(Text)
    
    # Advanced sender settings
    from_name = Column(String(255))  # Display name for sender
    from_email = Column(String(255))  # From email (can be different from sender)
    reply_to = Column(String(255))  # Reply-to address
    return_path = Column(String(255))  # Return-path for bounces
    
    # Recipients
    recipients = Column(JSON)  # List of recipient objects with email and variables
    total_recipients = Column(Integer, default=0)
    
    # Sender configuration
    sender_rotation = Column(String(50), default="round_robin")  # round_robin, random, sequential
    use_ip_pool = Column(Boolean, default=False)  # Use IP pool rotation
    ip_pool = Column(JSON)  # List of IPs if using pool
    
    # Headers and attachments
    custom_headers = Column(JSON)  # Dict of custom headers
    attachments = Column(JSON)  # List of attachment metadata
    
    # Status and progress
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    pending_count = Column(Integer, default=0)
    
    # Rate limiting
    rate_limit = Column(Integer, default=500)  # Emails per hour
    concurrency = Column(Integer, default=5)  # Concurrent workers
    
    # Test mode
    is_test = Column(Boolean, default=False)
    test_recipients = Column(JSON)
    
    # Test After feature
    test_after_email = Column(String(255))  # Email to send test to
    test_after_count = Column(Integer, default=0)  # Send test after every X emails (0 = disabled)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    prepared_at = Column(DateTime(timezone=True))  # When emails were prepared
    started_at = Column(DateTime(timezone=True))  # When sending started
    completed_at = Column(DateTime(timezone=True))
    paused_at = Column(DateTime(timezone=True))
    
    # Celery task tracking
    celery_task_id = Column(String(255), index=True)
    
    # Relationships
    sender_accounts = relationship("ServiceAccount", secondary="campaign_senders", back_populates="campaigns")
    email_logs = relationship("EmailLog", back_populates="campaign", cascade="all, delete-orphan")


class CampaignSender(Base):
    """Association table for campaign and service accounts"""
    __tablename__ = "campaign_senders"
    
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), primary_key=True)
    service_account_id = Column(Integer, ForeignKey("service_accounts.id", ondelete="CASCADE"), primary_key=True)


class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"))
    
    # Recipient info
    recipient_email = Column(String(255), nullable=False, index=True)
    recipient_name = Column(String(255))
    
    # Sender info
    sender_email = Column(String(255), nullable=False)
    service_account_id = Column(Integer)
    
    # Message details
    subject = Column(String(998))
    message_id = Column(String(255))  # Gmail message ID
    
    # Status
    status = Column(Enum(EmailStatus), default=EmailStatus.PENDING)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Timing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True))
    failed_at = Column(DateTime(timezone=True))
    next_retry_at = Column(DateTime(timezone=True))
    
    # Relationships
    campaign = relationship("Campaign", back_populates="email_logs")


class SystemLog(Base):
    __tablename__ = "system_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    level = Column(String(20))  # INFO, WARNING, ERROR, CRITICAL
    message = Column(Text)
    context = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DataList(Base):
    __tablename__ = "data_lists"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    list_type = Column(String(50), default="custom")  # custom, openers, clickers, leaders, unsubscribers, delivery
    geo_filter = Column(String(100))  # Country/region filter
    recipients = Column(JSON, nullable=False, default=list)  # List of email addresses
    tags = Column(JSON, default=list)  # Tags for categorization
    is_active = Column(Boolean, default=True)
    
    # Metadata
    total_recipients = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

