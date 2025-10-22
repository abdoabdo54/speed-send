
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models import ContactList, Contact
from app.schemas import ContactListResponse, ContactListCreate

router = APIRouter(prefix="/contacts", tags=["contacts"])

@router.get("/", response_model=List[ContactListResponse])
async def list_contact_lists(db: Session = Depends(get_db)):
    return db.query(ContactList).options(joinedload(ContactList.contacts)).all()

@router.post("/", response_model=ContactListResponse)
async def create_contact_list(contact_list: ContactListCreate, db: Session = Depends(get_db)):
    db_contact_list = ContactList(name=contact_list.name, description=contact_list.description)
    for contact_data in contact_list.contacts:
        db_contact = Contact(**contact_data.dict())
        db_contact_list.contacts.append(db_contact)
    db.add(db_contact_list)
    db.commit()
    db.refresh(db_contact_list)
    return db_contact_list

@router.get("/{contact_list_id}", response_model=ContactListResponse)
async def get_contact_list(contact_list_id: int, db: Session = Depends(get_db)):
    contact_list = db.query(ContactList).options(joinedload(ContactList.contacts)).filter(ContactList.id == contact_list_id).first()
    if not contact_list:
        raise HTTPException(status_code=404, detail="Contact list not found")
    return contact_list

@router.delete("/{contact_list_id}", status_code=204)
async def delete_contact_list(contact_list_id: int, db: Session = Depends(get_db)):
    contact_list = db.query(ContactList).filter(ContactList.id == contact_list_id).first()
    if not contact_list:
        raise HTTPException(status_code=404, detail="Contact list not found")
    db.delete(contact_list)
    db.commit()
    return
