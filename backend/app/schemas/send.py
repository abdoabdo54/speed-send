from typing import Dict, List, Optional
from pydantic import BaseModel, EmailStr


class SendEmailRequest(BaseModel):
    from_email: EmailStr
    from_name: Optional[str] = None
    to: List[EmailStr]
    subject: str
    html: Optional[str] = None
    text: Optional[str] = None
    use_gmail: bool = True
    custom_headers: Dict[str, str] = {}


