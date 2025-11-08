from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import ServiceAccount, WorkspaceUser

router = APIRouter(prefix="/accounts", tags=["accounts"])

class SyncRequest(BaseModel):
    admin_email: str

@router.post("/{account_id}/sync")
async def sync_workspace_users(account_id: int, payload: SyncRequest, db: Session = Depends(get_db)):
    """
    Stub: Sync workspace users for a given service account.
    This implementation ensures the frontend doesn't 404. It validates the account exists
    and returns a structure compatible with the frontend expectations.

    In a full implementation, decrypt the stored service account JSON and use
    GoogleWorkspaceService to fetch users, then upsert WorkspaceUser rows.
    """
    account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Service account not found")

    user_count = db.query(WorkspaceUser).filter(WorkspaceUser.service_account_id == account_id).count()

    return {
        "status": "ok",
        "message": "Sync endpoint stubbed. Implement Google Workspace fetch to populate users.",
        "account_id": account_id,
        "admin_email": payload.admin_email,
        "user_count": user_count
    }
