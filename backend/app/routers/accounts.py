from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

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
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        from app.encryption import EncryptionService
        
        # Convert JSON content to string if it's a dict
        json_content = account.json_content
        if isinstance(json_content, dict):
            import json
            json_content = json.dumps(json_content)
        
        # Encrypt the JSON content before storing
        encryption_service = EncryptionService()
        encrypted_json = encryption_service.encrypt(json_content)
        
        # Create account
        db_account = ServiceAccount(
            name=account.name,
            client_email=account.client_email,
            domain=account.domain,
            admin_email=account.admin_email,
            encrypted_json=encrypted_json
        )
        db.add(db_account)
        db.commit()
        db.refresh(db_account)
        return db_account
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create service account: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))

@router.get("/{account_id}", response_model=ServiceAccountResponse)
async def get_service_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(ServiceAccount).options(joinedload(ServiceAccount.workspace_users)).filter(ServiceAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Service account not found")
    return account

@router.put("/{account_id}", response_model=ServiceAccountResponse)
async def update_service_account(
    account_id: int,
    account_update: ServiceAccountCreate,
    db: Session = Depends(get_db)
):
    account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Service account not found")
    
    try:
        for field, value in account_update.dict().items():
            if field == "json_content" and value:
                # Encrypt the JSON content if it's being updated
                from app.encryption import EncryptionService
                encryption_service = EncryptionService()
                if isinstance(value, dict):
                    import json
                    value = json.dumps(value)
                encrypted_json = encryption_service.encrypt(value)
                setattr(account, "encrypted_json", encrypted_json)
            elif field != "json_content":
                setattr(account, field, value)
        
        db.commit()
        db.refresh(account)
        return account
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{account_id}")
async def delete_service_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Service account not found")
    
    try:
        db.delete(account)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{account_id}/sync", response_model=List[WorkspaceUserResponse])
async def sync_service_account(
    account_id: int,
    admin_email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Service account not found")
            
        # Use provided admin_email or account's admin_email
        admin = admin_email or account.admin_email
        
        # Decrypt service account JSON
        decrypted_json = account.get_json_content()
        
        # Create Google service
        from app.google_api import GoogleWorkspaceService
        google_service = GoogleWorkspaceService(decrypted_json)
        
        # Get user list
        users = google_service.fetch_workspace_users(admin)
        
        # Clear existing users for this account
        db.query(WorkspaceUser).filter(WorkspaceUser.service_account_id == account_id).delete()
        
        # Save users to database
        saved_users = []
        for user_data in users:
            user = WorkspaceUser(
                service_account_id=account_id,
                email=user_data['email'],
                full_name=user_data.get('full_name', ''),
                first_name=user_data.get('first_name', ''),
                last_name=user_data.get('last_name', ''),
                is_active=user_data.get('is_active', True),
                quota_limit=100,  # Default quota
                emails_sent_today=0
            )
            db.add(user)
            saved_users.append(user)
            
        # Update account total_users count
        account.total_users = len(saved_users)
        
        db.commit()
        
        logger.info(f"✅ Successfully synced {len(saved_users)} users")
        return saved_users
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to sync service account: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
