from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Enum, Float, Date
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

class DraftStatus(str, enum.Enum):
    CREATED = "created"
    SENT = "sent"
    DELETED = "deleted"
    FAILED = "failed"

class ServiceAccount(Base):
    __tablename__ = "service_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    client_email = Column(String(255), nullable=False, unique=True)
    domain = Column(String(255), nullable=False)
    project_id = Column(String(255))
    admin_email = Column(String(255))  # Admin email for domain-wide delegation
    
    encrypted_json = Column(Text, nullable=False)
    
    status = Column(Enum(AccountStatus), default=AccountStatus.ACTIVE)
    total_users = Column(Integer, default=0)
    
    daily_limit = Column(Integer, default=2000)
    daily_sent = Column(Integer, default=0)
    daily_reset_date = Column(Date, default=func.current_date())
    total_sent_all_time = Column(Integer, default=0)
    
    quota_limit = Column(Integer, default=500)
    quota_used_today = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_synced = Column(DateTime(timezone=True))
    
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
    
    emails_sent_today = Column(Integer, default=0)
    quota_limit = Column(Integer, default=500)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_used = Column(DateTime(timezone=True))
    
    service_account = relationship("ServiceAccount", back_populates="workspace_users")
    gmail_drafts = relationship("GmailDraft", back_populates="user", cascade="all, delete-orphan")


class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    
    subject = Column(String(998), nullable=False)
    body_html = Column(Text)
    body_plain = Column(Text)
    
    from_name = Column(String(255))
    from_email = Column(String(255))
    reply_to = Column(String(255))
    return_path = Column(String(255))
    
    recipients = Column(JSON)
    total_recipients = Column(Integer, default=0)
    
    sender_rotation = Column(String(50), default="round_robin")
    use_ip_pool = Column(Boolean, default=False)
    ip_pool = Column(JSON)
    
    custom_headers = Column(JSON)
    attachments = Column(JSON)
    
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    pending_count = Column(Integer, default=0)
    
    rate_limit = Column(Integer, default=500)
    concurrency = Column(Integer, default=5)
    
    is_test = Column(Boolean, default=False)
    test_recipients = Column(JSON)
    
    test_after_email = Column(String(255))
    test_after_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    prepared_at = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    paused_at = Column(DateTime(timezone=True))
    
    celery_task_id = Column(String(255), index=True)
    
    sender_accounts = relationship("ServiceAccount", secondary="campaign_senders", back_populates="campaigns")
    email_logs = relationship("EmailLog", back_populates="campaign", cascade="all, delete-orphan")


class CampaignSender(Base):
    __tablename__ = "campaign_senders"
    
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), primary_key=True)
    service_account_id = Column(Integer, ForeignKey("service_accounts.id", ondelete="CASCADE"), primary_key=True)


class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"))
    
    recipient_email = Column(String(255), nullable=False, index=True)
    recipient_name = Column(String(255))
    
    sender_email = Column(String(255), nullable=False)
    service_account_id = Column(Integer)
    
    subject = Column(String(998))
    message_id = Column(String(255))
    
    status = Column(Enum(EmailStatus), default=EmailStatus.PENDING)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True))
    failed_at = Column(DateTime(timezone=True))
    next_retry_at = Column(DateTime(timezone=True))
    
    campaign = relationship("Campaign", back_populates="email_logs")

# --- New Draft System Models ---

class DraftCampaign(Base):
    __tablename__ = "draft_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    subject = Column(String(998), nullable=False)
    body_html = Column(Text)
    number_of_drafts_per_user = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    gmail_drafts = relationship("GmailDraft", back_populates="draft_campaign", cascade="all, delete-orphan")

class GmailDraft(Base):
    __tablename__ = "gmail_drafts"

    id = Column(Integer, primary_key=True, index=True)
    draft_campaign_id = Column(Integer, ForeignKey("draft_campaigns.id"))
    user_id = Column(Integer, ForeignKey("workspace_users.id"))
    gmail_draft_id = Column(String(255), index=True)  # The draft ID from Gmail API
    status = Column(Enum(DraftStatus), default=DraftStatus.CREATED)
    recipients = Column(JSON, nullable=False) # List of recipient emails
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True))

    draft_campaign = relationship("DraftCampaign", back_populates="gmail_drafts")
    user = relationship("WorkspaceUser", back_populates="gmail_drafts")

# --- End New Draft System Models ---

class SystemLog(Base):
    __tablename__ = "system_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    level = Column(String(20))
    message = Column(Text)
    context = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ContactList(Base):
    __tablename__ = "contact_lists"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    contacts = relationship("Contact", back_populates="contact_list", cascade="all, delete-orphan")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    contact_list_id = Column(Integer, ForeignKey("contact_lists.id"))
    email = Column(String(255), nullable=False, index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    
    contact_list = relationship("ContactList", back_populates="contacts")
