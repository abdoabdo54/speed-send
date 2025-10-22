from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum

# Enums
class AccountStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    PREPARING = "preparing"
    READY = "ready"
    SENDING = "sending"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

class EmailStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"

class DraftStatus(str, Enum):
    DRAFT = "draft"
    UPLOADED = "uploaded"
    LAUNCHED = "launched"
    FAILED = "failed"

# Service Account Schemas
class ServiceAccountBase(BaseModel):
    name: str
    client_email: str
    domain: Optional[str] = None
    project_id: Optional[str] = None
    admin_email: Optional[str] = None

class ServiceAccountCreate(ServiceAccountBase):
    json_content: Dict[str, Any]

class ServiceAccountUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    admin_email: Optional[str] = None
    status: Optional[AccountStatus] = None
    daily_limit: Optional[int] = None
    quota_limit: Optional[int] = None

class ServiceAccountResponse(ServiceAccountBase):
    id: int
    status: str
    total_users: int
    daily_limit: int
    daily_sent: int
    quota_limit: int
    quota_used_today: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_synced: Optional[datetime] = None

    class Config:
        from_attributes = True

# Workspace User Schemas
class WorkspaceUserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True

class WorkspaceUserCreate(WorkspaceUserBase):
    service_account_id: int
    quota_limit: int = 100

class WorkspaceUserUpdate(BaseModel):
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    quota_limit: Optional[int] = None

class WorkspaceUserResponse(WorkspaceUserBase):
    id: int
    service_account_id: int
    emails_sent_today: int
    quota_limit: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_used: Optional[datetime] = None

    class Config:
        from_attributes = True

# Contact List Schemas
class ContactListBase(BaseModel):
    name: str
    description: Optional[str] = None

class ContactListCreate(ContactListBase):
    pass

class ContactListUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ContactListResponse(ContactListBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    contacts: List['ContactResponse'] = []

    class Config:
        from_attributes = True

# Contact Schemas
class ContactBase(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class ContactCreate(ContactBase):
    contact_list_id: int

class ContactUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class ContactResponse(ContactBase):
    id: int
    contact_list_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Data List Schemas
class DataListBase(BaseModel):
    name: str
    description: Optional[str] = None
    recipients: List[str] = []
    list_type: str = 'custom'

class DataListCreate(DataListBase):
    pass

class DataListUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    recipients: Optional[List[str]] = None
    list_type: Optional[str] = None

class DataListResponse(DataListBase):
    id: int
    total_recipients: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Campaign Schemas
class CampaignBase(BaseModel):
    name: str
    subject: str
    body_html: Optional[str] = None
    body_plain: Optional[str] = None
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    reply_to: Optional[str] = None
    return_path: Optional[str] = None

class CampaignCreate(CampaignBase):
    sender_account_ids: List[int]
    recipients: List[Dict[str, Any]]
    sender_rotation: str = "round_robin"
    use_ip_pool: bool = False
    ip_pool: Optional[List[str]] = None
    custom_headers: Optional[Dict[str, str]] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    rate_limit: int = 500
    concurrency: int = 5
    is_test: bool = False
    test_recipients: Optional[List[Dict[str, Any]]] = None
    test_after_email: Optional[str] = None
    test_after_count: int = 0

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_plain: Optional[str] = None
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    reply_to: Optional[str] = None
    return_path: Optional[str] = None
    sender_account_ids: Optional[List[int]] = None
    recipients: Optional[List[Dict[str, Any]]] = None
    sender_rotation: Optional[str] = None
    use_ip_pool: Optional[bool] = None
    ip_pool: Optional[List[str]] = None
    custom_headers: Optional[Dict[str, str]] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    rate_limit: Optional[int] = None
    concurrency: Optional[int] = None
    is_test: Optional[bool] = None
    test_recipients: Optional[List[Dict[str, Any]]] = None
    test_after_email: Optional[str] = None
    test_after_count: Optional[int] = None

class CampaignResponse(CampaignBase):
    id: int
    status: str
    total_recipients: int
    sent_count: int
    failed_count: int
    pending_count: int
    rate_limit: int
    concurrency: int
    is_test: bool
    test_after_email: Optional[str] = None
    test_after_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    prepared_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    sender_accounts: List[ServiceAccountResponse] = []

    class Config:
        from_attributes = True

# Draft Campaign Schemas
class DraftCampaignBase(BaseModel):
    name: str
    from_name: Optional[str] = None
    subject: str
    body_html: Optional[str] = None
    emails_per_user: int = 1

class DraftCampaignCreate(DraftCampaignBase):
    selected_account_ids: List[int]
    selected_user_ids: List[int]
    selected_contact_list_ids: List[int]

class DraftCampaignUpdate(BaseModel):
    name: Optional[str] = None
    from_name: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    emails_per_user: Optional[int] = None
    selected_account_ids: Optional[List[int]] = None
    selected_user_ids: Optional[List[int]] = None
    selected_contact_list_ids: Optional[List[int]] = None

class DraftCampaignResponse(DraftCampaignBase):
    id: int
    status: str
    created_at: datetime
    selected_accounts: List[ServiceAccountResponse] = []
    selected_users: List[WorkspaceUserResponse] = []
    selected_contacts: List[ContactListResponse] = []

    class Config:
        from_attributes = True

# Email Log Schemas
class EmailLogBase(BaseModel):
    sender_email: str
    recipient_email: str
    subject: Optional[str] = None
    status: EmailStatus = EmailStatus.PENDING
    error_message: Optional[str] = None

class EmailLogCreate(EmailLogBase):
    campaign_id: int
    service_account_id: int

class EmailLogResponse(EmailLogBase):
    id: int
    campaign_id: int
    service_account_id: int
    created_at: datetime
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Gmail Draft Schemas
class GmailDraftBase(BaseModel):
    gmail_draft_id: Optional[str] = None
    gmail_message_id: Optional[str] = None
    status: str = 'created'
    recipients: Optional[List[str]] = None

class GmailDraftCreate(GmailDraftBase):
    draft_campaign_id: int
    user_id: int

class GmailDraftResponse(GmailDraftBase):
    id: int
    draft_campaign_id: int
    user_id: int
    created_at: datetime
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Test Email Schemas
class TestEmailRequest(BaseModel):
    sender_account_id: int
    sender_user_id: Optional[int] = None
    recipient_email: str
    subject: str
    body_html: Optional[str] = None
    body_plain: Optional[str] = None

class TestEmailResponse(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None

# Dashboard Schemas
class DashboardStats(BaseModel):
    total_campaigns: int
    active_campaigns: int
    total_emails_sent: int
    emails_sent_today: int
    emails_failed_today: int
    success_rate: float
    quota_usage: Dict[str, Any]

# Campaign Control Schemas
class CampaignControl(BaseModel):
    action: str  # pause, resume, cancel

# Update forward references
ContactListResponse.model_rebuild()
ContactResponse.model_rebuild()
ServiceAccountResponse.model_rebuild()
WorkspaceUserResponse.model_rebuild()