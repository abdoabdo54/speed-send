from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models import ServiceAccount, User
from app.schemas import ServiceAccountResponse, UserResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.get("/", response_model=List[ServiceAccountResponse])
async def list_service_accounts(db: Session = Depends(get_db)):
    """
    List all service accounts with their associated users and user counts.
    This version manually constructs the response to prevent serialization errors.
    """
    try:
        # Eager load the 'users' relationship to avoid N+1 query problems
        accounts = db.query(ServiceAccount).options(joinedload(ServiceAccount.users)).all()
        
        response_list = []
        for acc in accounts:
            # Manually create the Pydantic response models to ensure correctness
            user_responses = [UserResponse.from_orm(u) for u in acc.users]
            
            response_list.append(
                ServiceAccountResponse(
                    id=acc.id,
                    name=acc.name,
                    client_email=acc.client_email,
                    domain=acc.domain,
                    project_id=acc.project_id,
                    status=acc.status.value,  # Use .value for Enums
                    users=user_responses,
                    total_users=len(user_responses)
                )
            )
        return response_list

    except Exception as e:
        import traceback
        traceback.print_exc() # Log the full stack trace to the server logs
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while listing accounts: {str(e)}")
