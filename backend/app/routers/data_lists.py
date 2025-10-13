from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import schemas, models
from app.database import get_db
from app.crud import data_lists as crud_data_lists

router = APIRouter()

@router.post("/data-lists", response_model=schemas.DataListResponse)
def create_data_list(data_list: schemas.DataListCreate, db: Session = Depends(get_db)):
    return crud_data_lists.create_data_list(db=db, data_list=data_list)

@router.get("/data-lists", response_model=List[schemas.DataListResponse])
def read_data_lists(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    data_lists = crud_data_lists.get_data_lists(db, skip=skip, limit=limit)
    return data_lists

@router.get("/data-lists/{data_list_id}", response_model=schemas.DataListResponse)
def read_data_list(data_list_id: int, db: Session = Depends(get_db)):
    db_data_list = crud_data_lists.get_data_list(db, data_list_id=data_list_id)
    if db_data_list is None:
        raise HTTPException(status_code=404, detail="Data list not found")
    return db_data_list

@router.put("/data-lists/{data_list_id}", response_model=schemas.DataListResponse)
def update_data_list(data_list_id: int, data_list: schemas.DataListUpdate, db: Session = Depends(get_db)):
    db_data_list = crud_data_lists.update_data_list(db, data_list_id=data_list_id, data_list=data_list)
    if db_data_list is None:
        raise HTTPException(status_code=404, detail="Data list not found")
    return db_data_list

@router.delete("/data-lists/{data_list_id}", response_model=schemas.DataListResponse)
def delete_data_list(data_list_id: int, db: Session = Depends(get_db)):
    db_data_list = crud_data_lists.delete_data_list(db, data_list_id=data_list_id)
    if db_data_list is None:
        raise HTTPException(status_code=404, detail="Data list not found")
    return db_data_list
