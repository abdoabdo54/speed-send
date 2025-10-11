from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import DataList
from app.schemas import DataListCreate, DataListUpdate, DataListResponse
from datetime import datetime

router = APIRouter(prefix="/data-lists", tags=["data-lists"])


@router.get("/", response_model=List[DataListResponse])
def get_data_lists(db: Session = Depends(get_db)):
    """Get all data lists"""
    try:
        data_lists = db.query(DataList).filter(DataList.is_active == True).all()
        return data_lists
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data lists: {str(e)}")


@router.get("/{list_id}", response_model=DataListResponse)
def get_data_list(list_id: int, db: Session = Depends(get_db)):
    """Get a specific data list by ID"""
    try:
        data_list = db.query(DataList).filter(DataList.id == list_id).first()
        if not data_list:
            raise HTTPException(status_code=404, detail="Data list not found")
        return data_list
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data list: {str(e)}")


@router.post("/", response_model=DataListResponse)
def create_data_list(data_list: DataListCreate, db: Session = Depends(get_db)):
    """Create a new data list"""
    try:
        # Check if name already exists
        existing = db.query(DataList).filter(DataList.name == data_list.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Data list with this name already exists")
        
        # Create new data list
        db_data_list = DataList(
            name=data_list.name,
            description=data_list.description,
            list_type=data_list.list_type,
            geo_filter=data_list.geo_filter,
            recipients=data_list.recipients,
            tags=data_list.tags,
            total_recipients=len(data_list.recipients)
        )
        
        db.add(db_data_list)
        db.commit()
        db.refresh(db_data_list)
        
        return db_data_list
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create data list: {str(e)}")


@router.put("/{list_id}", response_model=DataListResponse)
def update_data_list(list_id: int, data_list: DataListUpdate, db: Session = Depends(get_db)):
    """Update an existing data list"""
    try:
        db_data_list = db.query(DataList).filter(DataList.id == list_id).first()
        if not db_data_list:
            raise HTTPException(status_code=404, detail="Data list not found")
        
        # Update fields if provided
        if data_list.name is not None:
            # Check if new name conflicts with existing
            existing = db.query(DataList).filter(
                DataList.name == data_list.name,
                DataList.id != list_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Data list with this name already exists")
            db_data_list.name = data_list.name
            
        if data_list.description is not None:
            db_data_list.description = data_list.description
        if data_list.list_type is not None:
            db_data_list.list_type = data_list.list_type
        if data_list.geo_filter is not None:
            db_data_list.geo_filter = data_list.geo_filter
        if data_list.recipients is not None:
            db_data_list.recipients = data_list.recipients
            db_data_list.total_recipients = len(data_list.recipients)
        if data_list.tags is not None:
            db_data_list.tags = data_list.tags
        if data_list.is_active is not None:
            db_data_list.is_active = data_list.is_active
            
        db_data_list.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_data_list)
        
        return db_data_list
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update data list: {str(e)}")


@router.delete("/{list_id}")
def delete_data_list(list_id: int, db: Session = Depends(get_db)):
    """Delete a data list (soft delete by setting is_active to False)"""
    try:
        db_data_list = db.query(DataList).filter(DataList.id == list_id).first()
        if not db_data_list:
            raise HTTPException(status_code=404, detail="Data list not found")
        
        # Soft delete
        db_data_list.is_active = False
        db_data_list.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {"message": "Data list deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete data list: {str(e)}")


@router.get("/search/{query}", response_model=List[DataListResponse])
def search_data_lists(query: str, db: Session = Depends(get_db)):
    """Search data lists by name or tags"""
    try:
        data_lists = db.query(DataList).filter(
            DataList.is_active == True,
            (DataList.name.ilike(f"%{query}%")) | 
            (DataList.tags.contains([query]))
        )
        return data_lists.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search data lists: {str(e)}")
