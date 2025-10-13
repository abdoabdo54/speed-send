from sqlalchemy.orm import Session
from app import models, schemas

def get_data_list(db: Session, data_list_id: int):
    return db.query(models.DataList).filter(models.DataList.id == data_list_id).first()

def get_data_lists(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.DataList).offset(skip).limit(limit).all()

def create_data_list(db: Session, data_list: schemas.DataListCreate):
    db_data_list = models.DataList(
        name=data_list.name,
        description=data_list.description,
        recipients=data_list.recipients,
        total_recipients=len(data_list.recipients)
    )
    db.add(db_data_list)
    db.commit()
    db.refresh(db_data_list)
    return db_data_list

def update_data_list(db: Session, data_list_id: int, data_list: schemas.DataListUpdate):
    db_data_list = get_data_list(db, data_list_id)
    if db_data_list:
        update_data = data_list.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_data_list, key, value)
        if 'recipients' in update_data:
            db_data_list.total_recipients = len(update_data['recipients'])
        db.commit()
        db.refresh(db_data_list)
    return db_data_list

def delete_data_list(db: Session, data_list_id: int):
    db_data_list = get_data_list(db, data_list_id)
    if db_data_list:
        db.delete(db_data_list)
        db.commit()
    return db_data_list
