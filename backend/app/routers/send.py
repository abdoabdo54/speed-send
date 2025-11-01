from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import SendEmailRequest
from app.services.mailer import build_mime, to_gmail_raw, send_via_smtp
from app.models import ServiceAccount
from app.google_api import GoogleWorkspaceService
import os

router = APIRouter(prefix="/send", tags=["send"]) 


def _get_any_service_account(db: Session) -> ServiceAccount | None:
    return db.query(ServiceAccount).first()


@router.post("")
def send_email(req: SendEmailRequest, db: Session = Depends(get_db)):
    msg, local_msgid = build_mime(req)

    # Gmail path (domain-wide delegation via any configured service account)
    if req.use_gmail:
        sa = _get_any_service_account(db)
        if not sa:
            raise HTTPException(status_code=400, detail="No service account configured for Gmail send.")
        try:
            # Decrypt and send using our existing Google API utility
            from app.encryption import encryption_service
            decrypted_json = encryption_service.decrypt(sa.encrypted_json)
            gw = GoogleWorkspaceService(decrypted_json)
            # Use custom headers when present
            # Build minimal inputs for google_service that match our current helper
            raw = to_gmail_raw(msg)
            # Use Gmail insert to preserve custom headers as much as possible
            # Reconstruct via existing helper that accepts fields (safer)
            gmail_id = gw.send_email_with_custom_headers(
                sender_email=req.from_email,
                recipient_email=req.to[0],
                subject=req.subject,
                body_html=req.html,
                body_plain=req.text,
                from_name=req.from_name,
                custom_headers=dict(req.custom_headers or {})
            )
            return {
                "status": "sent_via_gmail",
                "local_message_id": local_msgid,
                "gmail_id": gmail_id,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gmail send failed: {e}")

    # SMTP path
    if os.getenv("SMTP_ENABLED", "false").lower() == "true":
        try:
            send_via_smtp(msg)
            return {"status": "sent_via_smtp", "message_id": msg["Message-ID"]}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"SMTP send failed: {e}")

    raise HTTPException(status_code=400, detail="SMTP is disabled. Enable SMTP or set use_gmail=true.")


