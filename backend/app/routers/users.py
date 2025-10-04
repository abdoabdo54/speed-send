from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import WorkspaceUser
from app.schemas import WorkspaceUserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[WorkspaceUserResponse])
async def list_workspace_users(
    service_account_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db)
):
    """
    List workspace users with optional filters
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("🔄 Fetching workspace users...")
        query = db.query(WorkspaceUser)
        
        if service_account_id:
            query = query.filter(WorkspaceUser.service_account_id == service_account_id)
            logger.info(f"🔍 Filtering by service_account_id: {service_account_id}")
        
        if is_active is not None:
            query = query.filter(WorkspaceUser.is_active == is_active)
            logger.info(f"🔍 Filtering by is_active: {is_active}")
        
        users = query.offset(skip).limit(limit).all()
        logger.info(f"✅ Found {len(users)} workspace users")
        
        return users
        
    except Exception as e:
        logger.error(f"❌ Failed to list workspace users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list workspace users: {str(e)}")


@router.get("/{user_id}", response_model=WorkspaceUserResponse)
async def get_workspace_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific workspace user
    """
    user = db.query(WorkspaceUser).filter(WorkspaceUser.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.patch("/{user_id}")
async def update_workspace_user(
    user_id: int,
    is_active: Optional[bool] = None,
    quota_limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Update workspace user settings
    """
    user = db.query(WorkspaceUser).filter(WorkspaceUser.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if is_active is not None:
        user.is_active = is_active
    
    if quota_limit is not None:
        user.quota_limit = quota_limit
    
    db.commit()
    db.refresh(user)
    
    return user

