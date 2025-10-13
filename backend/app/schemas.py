from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models import CampaignStatus, AccountStatus, EmailStatus

# --- Base Pydantic Model Configuration ---
class AppBaseModel(BaseModel):
    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(AppBaseModel):
    email: EmailStr
    name: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    service_account_id: int

class UserResponse(UserBase):
    id: int
    service_account_id: int

class WorkspaceUserResponse(AppBaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool
    service_account_id: int
    quota_limit: Optional[int] = None
    emails_sent_today: int = 0
    last_used: Optional[datetime] = None

# --- Service Account Schemas ---
class ServiceAccountBase(AppBaseModel):
    name: str

class ServiceAccountCreate(ServiceAccountBase):
    json_content: str  # The raw JSON key file content

class ServiceAccountResponse(ServiceAccountBase):
    id: int
    client_email: EmailStr
    domain: str
    project_id: str
    status: AccountStatus
    total_users: int
    daily_limit: int
    daily_sent: int
    users: List[WorkspaceUserResponse] = []

# --- Data List Schemas ---
class DataListBase(AppBaseModel):
    name: str
    description: Optional[str] = None

class DataListCreate(DataListBase):
    recipients: List[EmailStr]

class DataListUpdate(DataListBase):
    recipients: List[EmailStr]

class DataListResponse(DataListBase):
    id: int
    created_at: datetime
    total_recipients: int

# --- Recipient Schema for Campaigns ---
class Recipient(AppBaseModel):
    email: EmailStr
    variables: Optional[Dict[str, Any]] = {}

# --- Campaign Schemas ---
class CampaignBase(AppBaseModel):
    name: str
    subject: str
    from_name: Optional[str] = None
    body_html: str

class CampaignCreate(CampaignBase):
    sender_account_ids: List[int]
    recipients: List[Recipient] = []

class CampaignUpdate(AppBaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    from_name: Optional[str] = None
    body_html: Optional[str] = None
    sender_account_ids: Optional[List[int]] = None
    status: Optional[CampaignStatus] = None
    recipients: Optional[List[Recipient]] = None

class CampaignResponse(CampaignBase):
    id: int
    created_at: datetime
    status: CampaignStatus
    total_recipients: int
    sent_count: int
    failed_count: int
    sender_accounts: List[ServiceAccountResponse] = []

# --- Dashboard Schemas ---
class QuotaUsage(BaseModel):
    sent: int
    limit: int
    percentage: float

class DashboardStats(AppBaseModel):
    total_accounts: int
    total_users: int
    total_campaigns: int
    active_campaigns: int
    emails_sent_today: int
    emails_failed_today: int
    quota_usage: Dict[str, QuotaUsage]

# --- Other Schemas ---
class CampaignControl(AppBaseModel):
    action: str # e.g., 'pause', 'resume', 'cancel'

class EmailLogResponse(AppBaseModel):
    id: int
    recipient_email: EmailStr
    status: EmailStatus
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None
