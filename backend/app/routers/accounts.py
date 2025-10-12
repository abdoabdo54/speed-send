from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
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
        # Parse JSON
        try:
            json_data = json.loads(account.json_content)
        except json.JSONDecodeError:
            # Try base64 decode first
            try:
                decoded = base64.b64decode(account.json_content)
                json_data = json.loads(decoded)
            except:
                raise HTTPException(status_code=400, detail="Invalid JSON format")
        
        # Validate required fields
        required_fields = ['client_email', 'project_id', 'private_key']
        for field in required_fields:
            if field not in json_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        # Extract domain from client_email
        client_email = json_data['client_email']
        domain = client_email.split('@')[1] if '@' in client_email else ''
        
        # Check if account already exists
        existing = db.query(ServiceAccount).filter(
            ServiceAccount.client_email == client_email
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Service account {client_email} already exists"
            )
        
        # Encrypt JSON
        encrypted_json = encryption_service.encrypt(json.dumps(json_data))
        
        # Create service account
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
        
        # Note: User sync should be triggered from frontend with admin email
        # We cannot auto-sync here because we need the admin email from user
        
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
    List all service accounts with computed user counts
    """
    from app.models import WorkspaceUser
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("🔄 Fetching service accounts...")
        accounts = db.query(ServiceAccount).offset(skip).limit(limit).all()
        logger.info(f"✅ Found {len(accounts)} service accounts")
        
        # Ensure total_users is computed for each account
        for account in accounts:
            # Count active users for this account
            user_count = db.query(WorkspaceUser).filter(
                WorkspaceUser.service_account_id == account.id,
                WorkspaceUser.is_active == True
            ).count()
            
            # Update the account's total_users if different
            if account.total_users != user_count:
                account.total_users = user_count
                db.commit()
                logger.info(f"📊 Updated user count for {account.client_email}: {user_count}")
        
        logger.info(f"✅ Returning {len(accounts)} accounts with user counts")
        return accounts
        
    except Exception as e:
        logger.error(f"❌ Failed to list service accounts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list service accounts: {str(e)}")


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
    Sync users from Google Workspace - RUNS SYNCHRONOUSLY for immediate results
    Requires admin email from your workspace domain (e.g., admin@yourdomain.com)
    """
    from app.models import WorkspaceUser
    from app.google_api import GoogleWorkspaceService
    from app.encryption import encryption_service
    from datetime import datetime
    import logging
    
    logger = logging.getLogger(__name__)
    
    account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Service account not found")
    
    # Use provided admin_email or stored admin_email
    if admin_email:
        # Update stored admin email
        account.admin_email = admin_email
        db.commit()
    elif account.admin_email:
        # Use stored admin email
        admin_email = account.admin_email
    else:
        # No admin email available
        raise HTTPException(
            status_code=400, 
            detail="Admin email is required. Please provide an admin email from your workspace domain (e.g., admin@yourdomain.com)"
        )
    
    try:
        # Decrypt service account JSON
        decrypted_json = encryption_service.decrypt(account.encrypted_json)
        logger.info(f"🔄 Starting sync for account: {account.client_email} with admin: {admin_email}")
        
        # Initialize Google API service
        google_service = GoogleWorkspaceService(decrypted_json)
        
        # Fetch users with the provided admin email (admin detection happens automatically)
        users = google_service.fetch_workspace_users(admin_email)
        logger.info(f"✅ Fetched {len(users)} users from Google (admin users automatically excluded)")
        
        # Clear all existing users for this account to prevent duplicates when domain changes
        logger.info(f"🗑️ Clearing existing users for account {account_id} to prevent duplicates")
        deleted_count = db.query(WorkspaceUser).filter(WorkspaceUser.service_account_id == account_id).delete()
        logger.info(f"🗑️ Deleted {deleted_count} old users")
        
        # Insert fresh users from the new domain (no duplicates possible)
        synced_count = 0
        for user_data in users:
            # Skip admin-like addresses from being used as senders
            local_part = (user_data['email'] or '').split('@')[0].lower()
            if local_part in {'admin', 'administrator', 'postmaster', 'abuse', 'support'}:
                continue
                
            # Create new user (no duplicates possible since we cleared all existing)
            new_user = WorkspaceUser(
                service_account_id=account_id,
                email=user_data['email'],
                full_name=user_data['full_name'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                is_active=user_data['is_active']
            )
            db.add(new_user)
            synced_count += 1
        
        # Update service account metadata
        account.total_users = len(users)
        account.last_synced = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"✅ Synced {synced_count} users successfully")
        
        return {
            "success": True,
            "message": f"Successfully synced {synced_count} users",
            "user_count": synced_count,
            "service_account": account.client_email
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Sync failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to sync users: {str(e)}"
        )

