from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models import ServiceAccount, WorkspaceUser
from app.schemas import ServiceAccountResponse, ServiceAccountCreate, WorkspaceUserResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.get("/", response_model=List[ServiceAccountResponse])
async def list_service_accounts(db: Session = Depends(get_db)):
    accounts = db.query(ServiceAccount).options(joinedload(ServiceAccount.workspace_users)).all()
    return accounts

@router.post("/", response_model=ServiceAccountResponse)
async def create_service_account(account: ServiceAccountCreate, db: Session = Depends(get_db)):
    # Logic to create a service account
    from app.encryption import EncryptionService
    
    # Encrypt the JSON content before storing
    encryption_service = EncryptionService()
    encrypted_json = encryption_service.encrypt(account.json_content)
    
    db_account = ServiceAccount(
        name=account.name,
        client_email=account.client_email,
        domain=account.domain,
        encrypted_json=encrypted_json
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

@router.get("/{account_id}", response_model=ServiceAccountResponse)
async def get_service_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(ServiceAccount).options(joinedload(ServiceAccount.workspace_users)).filter(ServiceAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Service account not found")
    return account

@router.delete("/{account_id}", status_code=204)
async def delete_service_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Service account not found")
    db.delete(account)
    db.commit()
    return

@router.post("/{account_id}/sync", response_model=WorkspaceUserResponse)
async def sync_service_account(account_id: int, db: Session = Depends(get_db)):
    # Logic to sync users for a service account
    account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Service account not found")
    # Placeholder for sync logic
    return WorkspaceUserResponse(id=1, service_account_id=account_id, email="sync@complete.com", full_name="Sync Complete", is_active=True)
