from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models import AccountStatus, CampaignStatus, EmailStatus


# Service Account Schemas
class ServiceAccountCreate(BaseModel):
    name: str
    json_content: str  # Base64 encoded or raw JSON string


class ServiceAccountResponse(BaseModel):
    id: int
    name: str
    client_email: str
    domain: str
    project_id: Optional[str]
    status: AccountStatus
    total_users: int
    quota_limit: int
    quota_used_today: int
    created_at: datetime
    updated_at: Optional[datetime]
    last_synced: Optional[datetime]
    
    class Config:
        from_attributes = True


# Workspace User Schemas
class WorkspaceUserResponse(BaseModel):
    id: int
    service_account_id: int
    email: str
    full_name: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    emails_sent_today: int
    quota_limit: int
    is_active: bool
    last_used: Optional[datetime]
    
    class Config:
        from_attributes = True


# Campaign Schemas
class RecipientData(BaseModel):
    email: EmailStr
    variables: Optional[Dict[str, str]] = {}


class CampaignCreate(BaseModel):
    name: str
    subject: str
    body_html: Optional[str]
    body_plain: Optional[str]
    
    # Advanced sender settings
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    reply_to: Optional[str] = None
    return_path: Optional[str] = None
    
    recipients: List[RecipientData]
    sender_account_ids: List[int]
    sender_rotation: str = "round_robin"
    use_ip_pool: bool = False
    ip_pool: Optional[List[str]] = []
    custom_headers: Optional[Dict[str, str]] = {}
    attachments: Optional[List[Dict[str, Any]]] = []
    rate_limit: int = 500
    concurrency: int = 5
    is_test: bool = False
    test_recipients: Optional[List[str]] = []
    test_after_email: Optional[str] = None
    test_after_count: int = 0


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_plain: Optional[str] = None
    recipients: Optional[List[RecipientData]] = None
    sender_account_ids: Optional[List[int]] = None
    rate_limit: Optional[int] = None
    concurrency: Optional[int] = None


class CampaignResponse(BaseModel):
    id: int
    name: str
    subject: str
    body_html: Optional[str]
    body_plain: Optional[str]
    
    # Advanced sender settings
    from_name: Optional[str]
    from_email: Optional[str]
    reply_to: Optional[str]
    return_path: Optional[str]
    
    total_recipients: int
    status: CampaignStatus
    sent_count: int
    failed_count: int
    pending_count: int
    rate_limit: int
    concurrency: int
    is_test: bool
    created_at: datetime
    updated_at: Optional[datetime]
    prepared_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    paused_at: Optional[datetime]
    celery_task_id: Optional[str]
    
    class Config:
        from_attributes = True


# Email Log Schemas
class EmailLogResponse(BaseModel):
    id: int
    campaign_id: int
    recipient_email: str
    recipient_name: Optional[str]
    sender_email: str
    subject: Optional[str]
    status: EmailStatus
    error_message: Optional[str]
    retry_count: int
    created_at: datetime
    sent_at: Optional[datetime]
    failed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Dashboard Stats
class DashboardStats(BaseModel):
    total_accounts: int
    total_users: int
    total_campaigns: int
    active_campaigns: int
    emails_sent_today: int
    emails_failed_today: int
    quota_usage: Dict[str, Any]


# Campaign Control
class CampaignControl(BaseModel):
    action: str  # start, pause, resume, cancel


# Test Email
class TestEmail(BaseModel):
    subject: str
    body_html: Optional[str]
    body_plain: Optional[str]
    recipient: EmailStr
    sender_account_id: int
    sender_user_email: Optional[str]

