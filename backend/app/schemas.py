from pydantic import BaseModel, EmailStr
from typing import List, Optional
import datetime

# Pydantic Model Configuration
class AppBaseModel(BaseModel):
    class Config:
        from_attributes = True

# User Schemas
class UserBase(AppBaseModel):
    email: EmailStr
    name: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    service_account_id: int

class UserResponse(UserBase):
    id: int
    service_account_id: int

# This was the missing schema causing the crash
class WorkspaceUserResponse(AppBaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool
    service_account_id: int
    quota_limit: Optional[int] = None
    quota_usage: int = 0

# Service Account Schemas
class ServiceAccountBase(AppBaseModel):
    name: str
    
class ServiceAccountCreate(ServiceAccountBase):
    json_content: str

class ServiceAccountResponse(ServiceAccountBase):
    id: int
    client_email: EmailStr
    domain: str
    project_id: str
    status: str
    users: List[UserResponse] = []
    total_users: int = 0

# Data List Schemas
class DataListBase(AppBaseModel):
    name: str
    description: Optional[str] = None

class DataListCreate(DataListBase):
    recipients: List[EmailStr]

class DataListUpdate(DataListBase):
    recipients: List[EmailStr]

class DataListResponse(DataListBase):
    id: int
    created_at: datetime.datetime
    recipients_count: int

# Campaign Schemas
class Recipient(AppBaseModel):
    email: EmailStr
    variables: Optional[dict] = None

class CampaignBase(AppBaseModel):
    name: str
    subject: str
    from_name: Optional[str] = None
    body_html: str

class CampaignCreate(CampaignBase):
    recipients: List[Recipient]
    sender_account_ids: List[int]
    status: str = "draft"

class CampaignResponse(CampaignBase):
    id: int
    created_at: datetime.datetime
    status: str
    total_recipients: int
    sent_count: int
    failed_count: int
