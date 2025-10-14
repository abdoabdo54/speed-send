
from pydantic import BaseModel
from typing import List, Optional, Dict, Literal
from datetime import datetime
from enum import Enum

class EmailStatus(str, Enum):
    PENDING = 'pending'
    SENT = 'sent'
    FAILED = 'failed'
    OPENED = 'opened'
    CLICKED = 'clicked'

class DraftStatus(str, Enum):
    CREATED = "created"
    SENT = "sent"
    DELETED = "deleted"
    FAILED = "failed"

class WorkspaceUserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    is_active: bool = True

class WorkspaceUserCreate(WorkspaceUserBase):
    service_account_id: int

class WorkspaceUserResponse(WorkspaceUserBase):
    id: int
    service_account_id: int

    class Config:
        from_attributes = True

class ServiceAccountBase(BaseModel):
    name: str
    client_email: str
    domain: Optional[str] = None

class ServiceAccountCreate(ServiceAccountBase):
    json_content: Dict

class ServiceAccountResponse(ServiceAccountBase):
    id: int
    status: str
    total_users: int
    quota_used_today: int
    quota_limit: int
    last_synced: Optional[datetime] = None
    workspace_users: List[WorkspaceUserResponse] = []

    class Config:
        from_attributes = True

class Recipient(BaseModel):
    email: str
    variables: Optional[Dict[str, str]] = {}

class CampaignBase(BaseModel):
    name: str
    subject: str
    body_html: str
    from_name: Optional[str] = None

class CampaignCreate(CampaignBase):
    recipients: List[Recipient]
    sender_account_ids: List[int]
    status: Optional[str] = 'draft'
    sender_rotation: Optional[str] = 'round_robin'
    custom_headers: Optional[Dict[str, str]] = {}
    attachments: Optional[List[str]] = []
    rate_limit: Optional[int] = 2000
    concurrency: Optional[int] = 6
    test_after_email: Optional[str] = None
    test_after_count: Optional[int] = 0
    body_plain: Optional[str] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    from_name: Optional[str] = None
    recipients: Optional[List[Recipient]] = None
    sender_account_ids: Optional[List[int]] = None
    status: Optional[str] = None
    body_plain: Optional[str] = None

class CampaignResponse(CampaignBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class CampaignControl(BaseModel):
    action: Literal['pause', 'resume', 'cancel']

class EmailLogResponse(BaseModel):
    id: int
    campaign_id: int
    recipient_email: str
    status: EmailStatus
    created_at: datetime
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class DataListCreate(BaseModel):
    name: str
    recipients: List[str]
    geo_filter: Optional[str] = None
    list_type: Optional[str] = 'custom'
    tags: Optional[List[str]] = []

class DataListUpdate(BaseModel):
    recipients: List[str]
    geo_filter: Optional[str] = None
    list_type: Optional[str] = 'custom'

class DataListResponse(DataListCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TestEmailSchema(BaseModel):
    recipient_email: str
    subject: str
    body_html: str
    from_name: str
    sender_account_id: int

class DashboardStats(BaseModel):
    total_campaigns: int
    active_campaigns: int
    completed_campaigns: int
    total_service_accounts: int
    total_users: int
    emails_sent_today: int
    emails_failed_today: int

# --- New Draft System Schemas ---

class GmailDraftResponse(BaseModel):
    id: int
    gmail_draft_id: str
    status: DraftStatus
    recipients: List[str]
    user_email: str # Derived from the user relationship
    created_at: datetime

    class Config:
        from_attributes = True

class DraftCampaignCreate(BaseModel):
    campaign_name: str
    subject: str
    html_body: str
    number_of_drafts_per_user: int
    email_list: List[str]
    selected_accounts: List[int]

class DraftCampaignResponse(BaseModel):
    id: int
    name: str
    subject: str
    created_at: datetime
    total_drafts: int
    drafts_by_user: Dict[str, int]

    class Config:
        from_attributes = True

class DraftLaunchResponse(BaseModel):
    total_launched: int
    total_failed: int
    details: List[Dict[str, str]]

# --- End New Draft System Schemas ---
