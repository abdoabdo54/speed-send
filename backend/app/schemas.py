from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    service_account_id: int

class UserResponse(UserBase):
    id: int
    service_account_id: int

    class Config:
        orm_mode = True

# Service Account Schemas
class ServiceAccountBase(BaseModel):
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
    total_users: int = 0 # Added this field to match the response

    class Config:
        orm_mode = True

# Data List Schemas
class DataListBase(BaseModel):
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

    class Config:
        orm_mode = True

# Campaign Schemas
class Recipient(BaseModel):
    email: EmailStr
    variables: Optional[dict] = None

class CampaignBase(BaseModel):
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

    class Config:
        orm_mode = True
