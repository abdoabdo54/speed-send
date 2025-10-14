
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import ContactList, Contact
from app.schemas import ContactListResponse, ContactResponse

router = APIRouter(prefix="/contacts", tags=["contacts"])

@router.get("/", response_model=List[ContactListResponse])
async def list_contact_lists(db: Session = Depends(get_db)):
    lists = db.query(ContactList).all()
    return lists

@router.get("/{list_id}", response_model=ContactListResponse)
async def get_contact_list(list_id: int, db: Session = Depends(get_db)):
    contact_list = db.query(ContactList).filter(ContactList.id == list_id).first()
    if not contact_list:
        raise HTTPException(status_code=404, detail="Contact list not found")
    return contact_list

