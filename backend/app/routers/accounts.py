from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models import ServiceAccount
from app.schemas import ServiceAccountResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])

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
    try:
        accounts = db.query(ServiceAccount).options(joinedload(ServiceAccount.users)).offset(skip).limit(limit).all()
        return accounts
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to list service accounts.")
