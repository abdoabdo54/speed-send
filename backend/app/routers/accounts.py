from fastapi import APIRouter, Depends, HTTPException, status
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
        raise HTTPException(status_code=400, detail=str(e))

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

@router.post("/{account_id}/sync")
async def sync_service_account(account_id: int, admin_email: str = None, db: Session = Depends(get_db)):
    """
    Sync workspace users for a service account using Google Workspace API
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Get the service account
        account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Service account not found")
        
        logger.info(f"🔄 Starting sync for account: {account.name}")
        
        # Decrypt service account credentials
        from app.encryption import EncryptionService
        encryption_service = EncryptionService()
        service_account_json = encryption_service.decrypt(account.encrypted_json)
        
        # Initialize Google Workspace Service
        from app.google_api import GoogleWorkspaceService
        google_service = GoogleWorkspaceService(service_account_json)
        
        # Use admin_email if provided, otherwise use account admin_email
        admin_email_to_use = admin_email or account.admin_email
        if not admin_email_to_use:
            raise HTTPException(status_code=400, detail="Admin email is required for syncing users")
        
        logger.info(f"🔍 Syncing users with admin email: {admin_email_to_use}")
        
        # Fetch workspace users
        users = google_service.fetch_workspace_users(admin_email_to_use)
        
        logger.info(f"📊 Found {len(users)} users from Google Workspace")
        
        # Clear existing users for this account
        db.query(WorkspaceUser).filter(WorkspaceUser.service_account_id == account_id).delete()
        
        # Add new users
        synced_users = []
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
            synced_users.append(user)
        
        # Update account total_users count
        account.total_users = len(synced_users)
        
        db.commit()
        
        logger.info(f"✅ Successfully synced {len(synced_users)} users")
        
        return {
            "message": f"Successfully synced {len(synced_users)} users!",
            "user_count": len(synced_users),
            "admin_email_used": admin_email_to_use,
            "users": [
                {
                    "email": user.email,
                    "full_name": user.full_name,
                    "is_active": user.is_active
                } for user in synced_users
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Sync failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync users: {str(e)}")
