#!/usr/bin/env python3
"""
Database initialization script to populate with sample data
"""
import json
import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import ServiceAccount, ContactList, Contact, DataList, WorkspaceUser
from app.encryption import EncryptionService

logger = logging.getLogger(__name__)

def init_sample_data():
    """Initialize database with sample data if empty"""
    db = SessionLocal()
    encryption_service = EncryptionService()
    
    try:
        # Check if data already exists
        existing_accounts = db.query(ServiceAccount).count()
        if existing_accounts > 0:
            logger.info("✅ Database already has data, skipping initialization")
            return
        
        logger.info("🔄 Initializing database with sample data...")
        
        # 1. Add service account
        service_account_json = {
            "type": "service_account",
            "project_id": "maximal-emitter-474109-t8",
            "client_email": "bdrfgb@maximal-emitter-474109-t8.iam.gserviceaccount.com",
            "universe_domain": "googleapis.com"
        }
        
        encrypted_json = encryption_service.encrypt(json.dumps(service_account_json))
        
        service_account = ServiceAccount(
            name='Maximal Emitter Service Account',
            client_email='bdrfgb@maximal-emitter-474109-t8.iam.gserviceaccount.com',
            domain='maximal-emitter-474109-t8.iam.gserviceaccount.com',
            admin_email='alberto@alberto.camdvr.org',
            encrypted_json=encrypted_json,
            total_users=5,
            daily_limit=2000,
            quota_limit=500,
            quota_used_today=0
        )
        
        db.add(service_account)
        db.commit()
        db.refresh(service_account)
        
        logger.info(f"✅ Added service account: {service_account.name} (ID: {service_account.id})")
        
        # 2. Add workspace users
        users_data = [
            ('alberto@alberto.camdvr.org', 'Alberto User', 'Alberto', 'User'),
            ('user1@alberto.camdvr.org', 'User One', 'User', 'One'),
            ('user2@alberto.camdvr.org', 'User Two', 'User', 'Two'),
            ('user3@alberto.camdvr.org', 'User Three', 'User', 'Three'),
            ('user4@alberto.camdvr.org', 'User Four', 'User', 'Four')
        ]
        
        for email, full_name, first_name, last_name in users_data:
            user = WorkspaceUser(
                service_account_id=service_account.id,
                email=email,
                full_name=full_name,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
                quota_limit=100,
                emails_sent_today=0
            )
            db.add(user)
        
        db.commit()
        logger.info(f"✅ Added {len(users_data)} workspace users")
        
        # 3. Add contact lists
        contact_lists_data = [
            ('Sample Contact List', 'A sample contact list for testing'),
            ('Business Contacts', 'Business contacts for professional campaigns')
        ]
        
        for name, description in contact_lists_data:
            contact_list = ContactList(name=name, description=description)
            db.add(contact_list)
        
        db.commit()
        
        # Get the contact list IDs
        contact_list1 = db.query(ContactList).filter(ContactList.name == 'Sample Contact List').first()
        contact_list2 = db.query(ContactList).filter(ContactList.name == 'Business Contacts').first()
        
        # 4. Add contacts
        contacts_data = [
            (contact_list1.id, 'john.doe@example.com', 'John', 'Doe'),
            (contact_list1.id, 'jane.smith@example.com', 'Jane', 'Smith'),
            (contact_list1.id, 'bob.wilson@example.com', 'Bob', 'Wilson'),
            (contact_list1.id, 'alice.brown@example.com', 'Alice', 'Brown'),
            (contact_list1.id, 'charlie.davis@example.com', 'Charlie', 'Davis'),
            (contact_list2.id, 'ceo@company.com', 'CEO', 'Company'),
            (contact_list2.id, 'manager@company.com', 'Manager', 'Person'),
            (contact_list2.id, 'director@company.com', 'Director', 'Executive')
        ]
        
        for contact_list_id, email, first_name, last_name in contacts_data:
            contact = Contact(
                contact_list_id=contact_list_id,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            db.add(contact)
        
        db.commit()
        logger.info(f"✅ Added {len(contacts_data)} contacts")
        
        # 5. Add data list
        data_list = DataList(
            name='Sample Data List',
            description='A sample data list for testing',
            recipients=['test1@example.com', 'test2@example.com', 'test3@example.com'],
            total_recipients=3,
            list_type='custom'
        )
        db.add(data_list)
        db.commit()
        
        logger.info("🎉 SUCCESS: Database initialized with sample data!")
        logger.info("The app should now work properly with accounts, users, and contacts.")
        
    except Exception as e:
        logger.error(f"❌ Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_sample_data()
