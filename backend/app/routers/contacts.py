
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models import ContactList, Contact
from app.schemas import ContactListResponse, ContactListCreate

router = APIRouter(prefix="/contacts", tags=["contacts"])

@router.get("/", response_model=List[ContactListResponse])
async def list_contact_lists(db: Session = Depends(get_db)):
    try:
        contact_lists = db.query(ContactList).options(
            joinedload(ContactList.contacts)
        ).all()
        return contact_lists
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=ContactListResponse)
async def create_contact_list(contact_list: ContactListCreate, db: Session = Depends(get_db)):
    try:
        db_contact_list = ContactList(name=contact_list.name, description=contact_list.description)
        for contact_data in contact_list.contacts:
            db_contact = Contact(**contact_data.dict())
            db_contact_list.contacts.append(db_contact)
        db.add(db_contact_list)
        db.commit()
        db.refresh(db_contact_list)
        return db_contact_list
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{contact_list_id}", response_model=ContactListResponse)
async def get_contact_list(contact_list_id: int, db: Session = Depends(get_db)):
    contact_list = db.query(ContactList).options(joinedload(ContactList.contacts)).filter(ContactList.id == contact_list_id).first()
    if not contact_list:
        raise HTTPException(status_code=404, detail="Contact list not found")
    return contact_list

@router.delete("/{contact_list_id}")
async def delete_contact_list(contact_list_id: int, db: Session = Depends(get_db)):
    contact_list = db.query(ContactList).filter(ContactList.id == contact_list_id).first()
    if not contact_list:
        raise HTTPException(status_code=404, detail="Contact list not found")
    
    try:
        db.delete(contact_list)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
