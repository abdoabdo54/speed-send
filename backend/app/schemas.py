from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

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
    # Advanced options
    status: Optional[str] = 'draft'
    sender_rotation: Optional[str] = 'round_robin'
    custom_headers: Optional[Dict[str, str]] = {}
    attachments: Optional[List[str]] = []
    rate_limit: Optional[int] = 2000
    concurrency: Optional[int] = 6
    test_after_email: Optional[str] = None
    test_after_count: Optional[int] = 0

class CampaignResponse(CampaignBase):
    id: int
    status: str
    created_at: datetime

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
