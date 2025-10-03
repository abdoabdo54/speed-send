from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import ServiceAccount, WorkspaceUser
from app.google_api import GoogleWorkspaceService
from app.encryption import encryption_service
import logging

router = APIRouter(prefix="/test-email", tags=["test-email"])

class TestEmailRequest(BaseModel):
    recipient_email: str
    subject: str
    body_html: str
    body_plain: str
    from_name: str
    sender_account_id: int

@router.post("/")
async def send_test_email(
    request: TestEmailRequest,
    db: Session = Depends(get_db)
):
    """
    Send a direct test email without creating a campaign
    """
    try:
        logger = logging.getLogger(__name__)
        logger.info(f"🧪 DIRECT TEST EMAIL: {request.recipient_email}")
        
        # Get service account
        service_account = db.query(ServiceAccount).filter(
            ServiceAccount.id == request.sender_account_id
        ).first()
        
        if not service_account:
            raise HTTPException(status_code=404, detail="Service account not found")
        
        # Get first active user from this account
        user = db.query(WorkspaceUser).filter(
            WorkspaceUser.service_account_id == request.sender_account_id,
            WorkspaceUser.is_active == True
        ).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="No active users found in this account")
        
        # Decrypt service account JSON
        decrypted_json = encryption_service.decrypt(service_account.encrypted_json)
        
        # Create Google service
        google_service = GoogleWorkspaceService(decrypted_json)
        
        # Send email directly
        message_id = google_service.send_email(
            sender_email=user.email,
            recipient_email=request.recipient_email,
            subject=request.subject,
            body_html=request.body_html,
            body_plain=request.body_plain,
            custom_headers={},
            attachments=[]
        )
        
        logger.info(f"✅ TEST EMAIL SENT: {request.recipient_email} via {user.email}")
        
        return {
            "message": "Test email sent successfully",
            "message_id": message_id,
            "sender_email": user.email,
            "recipient_email": request.recipient_email
        }
        
    except Exception as e:
        logger.error(f"❌ TEST EMAIL FAILED: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")
