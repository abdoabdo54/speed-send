from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from typing import List
import json
import base64

from app.database import get_db
from app.models import ServiceAccount, AccountStatus
from app.schemas import ServiceAccountCreate, ServiceAccountResponse
from app.encryption import encryption_service
from app.tasks import sync_workspace_users

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("/", response_model=ServiceAccountResponse)
async def create_service_account(
    account: ServiceAccountCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new service account by uploading JSON credentials
    """
    try:
        try:
            json_data = json.loads(account.json_content)
        except json.JSONDecodeError:
            try:
                decoded = base64.b64decode(account.json_content)
                json_data = json.loads(decoded)
            except:
                raise HTTPException(status_code=400, detail="Invalid JSON format")
        
        required_fields = ['client_email', 'project_id', 'private_key']
        for field in required_fields:
            if field not in json_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        client_email = json_data['client_email']
        domain = client_email.split('@')[1] if '@' in client_email else ''
        
        existing = db.query(ServiceAccount).filter(
            ServiceAccount.client_email == client_email
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Service account {client_email} already exists"
            )
        
        encrypted_json = encryption_service.encrypt(json.dumps(json_data))
        
        new_account = ServiceAccount(
            name=account.name,
            client_email=client_email,
            domain=domain,
            project_id=json_data['project_id'],
            encrypted_json=encrypted_json,
            status=AccountStatus.ACTIVE
        )
        
        db.add(new_account)
        db.commit()
        db.refresh(new_account)
        
        return new_account
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[ServiceAccountResponse])
async def list_service_accounts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all service accounts with their associated users.
    This is a read-only operation.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Fetching service accounts and their users...")
        accounts = db.query(ServiceAccount).options(joinedload(ServiceAccount.users)).offset(skip).limit(limit).all()
        logger.info(f"Successfully fetched {len(accounts)} accounts.")
        return accounts
        
    except Exception as e:
        logger.error(f"Failed to list service accounts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list service accounts.")


@router.get("/{account_id}", response_model=ServiceAccountResponse)
async def get_service_account(
    account_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific service account
    """
    account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Service account not found")
    
    return account


@router.delete("/{account_id}")
async def delete_service_account(
    account_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a service account
    """
    account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Service account not found")
    
    db.delete(account)
    db.commit()
    
    return {"message": "Service account deleted successfully"}


@router.post("/{account_id}/sync")
async def sync_account_users(
    account_id: int,
    admin_email: str = None,
    db: Session = Depends(get_db)
):
    """
    Sync users from Google Workspace. This is a write-heavy operation.
    """
    from app.models import WorkspaceUser
    from app.google_api import GoogleWorkspaceService
    from datetime import datetime
    import logging
    
    logger = logging.getLogger(__name__)
    
    account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Service account not found")
    
    if admin_email:
        account.admin_email = admin_email
    elif not account.admin_email:
        raise HTTPException(
            status_code=400, 
            detail="Admin email is required for the first sync."
        )
    admin_email_to_use = admin_email or account.admin_email

    try:
        decrypted_json = encryption_service.decrypt(account.encrypted_json)
        google_service = GoogleWorkspaceService(decrypted_json)
        
        logger.info(f"Starting sync for {account.client_email} with admin {admin_email_to_use}")
        users_from_google = google_service.fetch_workspace_users(admin_email_to_use)
        logger.info(f"Fetched {len(users_from_google)} users from Google Workspace.")

        # Efficiently update users
        existing_users_map = {user.email: user for user in account.users}
        synced_count = 0
        
        for user_data in users_from_google:
            user_email = user_data['email']
            if user_email in existing_users_map:
                # Update existing user
                user = existing_users_map.pop(user_email)
                user.full_name = user_data['full_name']
                user.is_active = user_data['is_active']
            else:
                # Add new user
                new_user = WorkspaceUser(**user_data, service_account_id=account.id)
                db.add(new_user)
            synced_count += 1

        # Deactivate users that are no longer in the workspace
        for user_to_deactivate in existing_users_map.values():
            user_to_deactivate.is_active = False

        account.total_users = synced_count
        account.last_synced = datetime.utcnow()
        db.commit()
        
        logger.info(f"Sync complete. Synced {synced_count} users.")
        return {"message": f"Successfully synced {synced_count} users."}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Sync failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to sync users: {str(e)}")
