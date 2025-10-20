from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import DataList
from app.schemas import DataListResponse, DataListCreate, DataListUpdate

router = APIRouter(prefix="/data-lists", tags=["data-lists"])

@router.get("/", response_model=List[DataListResponse])
async def list_data_lists(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all data lists
    """
    data_lists = db.query(DataList).offset(skip).limit(limit).all()
    return data_lists

@router.get("/{data_list_id}", response_model=DataListResponse)
async def get_data_list(
    data_list_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific data list
    """
    data_list = db.query(DataList).filter(DataList.id == data_list_id).first()
    if not data_list:
        raise HTTPException(status_code=404, detail="Data list not found")
    return data_list

@router.post("/", response_model=DataListResponse)
async def create_data_list(
    data_list: DataListCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new data list
    """
    db_data_list = DataList(
        name=data_list.name,
        description=data_list.description,
        recipients=data_list.recipients,
        total_recipients=len(data_list.recipients),
        geo_filter=data_list.geo_filter,
        list_type=data_list.list_type
    )
    db.add(db_data_list)
    db.commit()
    db.refresh(db_data_list)
    return db_data_list

@router.put("/{data_list_id}", response_model=DataListResponse)
async def update_data_list(
    data_list_id: int,
    data_list: DataListUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a data list
    """
    db_data_list = db.query(DataList).filter(DataList.id == data_list_id).first()
    if not db_data_list:
        raise HTTPException(status_code=404, detail="Data list not found")
    
    update_data = data_list.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_data_list, field, value)
    
    if 'recipients' in update_data:
        db_data_list.total_recipients = len(update_data['recipients'])
    
    db.commit()
    db.refresh(db_data_list)
    return db_data_list

@router.delete("/{data_list_id}")
async def delete_data_list(
    data_list_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a data list
    """
    data_list = db.query(DataList).filter(DataList.id == data_list_id).first()
    if not data_list:
        raise HTTPException(status_code=404, detail="Data list not found")
    
    db.delete(data_list)
    db.commit()
    return {"message": "Data list deleted successfully"}

@router.get("/search/{query}", response_model=List[DataListResponse])
async def search_data_lists(
    query: str,
    db: Session = Depends(get_db)
):
    """
    Search data lists by name
    """
    data_lists = db.query(DataList).filter(DataList.name.contains(query)).all()
    return data_lists
