#!/usr/bin/env python3
"""
Script to add sample data to the database for testing the drafts feature.
This will populate the database with sample accounts, users, and contacts.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import ServiceAccount, WorkspaceUser, ContactList, Contact
from app.encryption import EncryptionService
import json

def add_sample_data():
    """Add sample data to the database"""
    db = SessionLocal()
    encryption_service = EncryptionService()
    
    try:
        print("🚀 Adding sample data to database...")
        
        # 1. Add sample service accounts
        print("📧 Adding service accounts...")
        sample_accounts = [
            {
                "name": "Google Workspace Account 1",
                "client_email": "admin1@yourdomain.com",
                "domain": "yourdomain.com",
                "status": "active",
                "total_users": 10,
                "quota_used_today": 0,
                "quota_limit": 2000
            },
            {
                "name": "Google Workspace Account 2", 
                "client_email": "admin2@yourdomain.com",
                "domain": "yourdomain.com",
                "status": "active",
                "total_users": 15,
                "quota_used_today": 0,
                "quota_limit": 2000
            },
            {
                "name": "Google Workspace Account 3",
                "client_email": "admin3@yourdomain.com", 
                "domain": "yourdomain.com",
                "status": "active",
                "total_users": 20,
                "quota_used_today": 0,
                "quota_limit": 2000
            }
        ]
        
        account_ids = []
        for account_data in sample_accounts:
            # Create sample encrypted JSON
            sample_json = {
                "type": "service_account",
                "project_id": "sample-project",
                "private_key_id": "sample-key-id",
                "private_key": "-----BEGIN PRIVATE KEY-----\nSAMPLE_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
                "client_email": account_data["client_email"],
                "client_id": "sample-client-id",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{account_data['client_email']}"
            }
            
            encrypted_json = encryption_service.encrypt(json.dumps(sample_json))
            
            account = ServiceAccount(
                name=account_data["name"],
                client_email=account_data["client_email"],
                domain=account_data["domain"],
                status=account_data["status"],
                total_users=account_data["total_users"],
                quota_used_today=account_data["quota_used_today"],
                quota_limit=account_data["quota_limit"],
                encrypted_json=encrypted_json
            )
            db.add(account)
            db.flush()  # Get the ID
            account_ids.append(account.id)
            print(f"✅ Added account: {account_data['name']}")
        
        # 2. Add sample workspace users
        print("👥 Adding workspace users...")
        sample_users = [
            {"email": "user1@yourdomain.com", "full_name": "User One", "account_id": account_ids[0]},
            {"email": "user2@yourdomain.com", "full_name": "User Two", "account_id": account_ids[0]},
            {"email": "user3@yourdomain.com", "full_name": "User Three", "account_id": account_ids[1]},
            {"email": "user4@yourdomain.com", "full_name": "User Four", "account_id": account_ids[1]},
            {"email": "user5@yourdomain.com", "full_name": "User Five", "account_id": account_ids[2]},
            {"email": "user6@yourdomain.com", "full_name": "User Six", "account_id": account_ids[2]}
        ]
        
        user_ids = []
        for user_data in sample_users:
            user = WorkspaceUser(
                email=user_data["email"],
                full_name=user_data["full_name"],
                is_active=True,
                service_account_id=user_data["account_id"]
            )
            db.add(user)
            db.flush()  # Get the ID
            user_ids.append(user.id)
            print(f"✅ Added user: {user_data['email']}")
        
        # 3. Add sample contact lists
        print("📋 Adding contact lists...")
        sample_contact_lists = [
            {"name": "Marketing List 1", "description": "Primary marketing contacts"},
            {"name": "Sales List 1", "description": "Sales prospects"},
            {"name": "Newsletter List 1", "description": "Newsletter subscribers"},
            {"name": "VIP Customers", "description": "High-value customers"}
        ]
        
        contact_list_ids = []
        for list_data in sample_contact_lists:
            contact_list = ContactList(
                name=list_data["name"],
                description=list_data["description"]
            )
            db.add(contact_list)
            db.flush()  # Get the ID
            contact_list_ids.append(contact_list.id)
            print(f"✅ Added contact list: {list_data['name']}")
        
        # 4. Add sample contacts
        print("👤 Adding contacts...")
        sample_contacts = [
            # Marketing List 1
            {"email": "customer1@example.com", "name": "Customer One", "list_id": contact_list_ids[0]},
            {"email": "customer2@example.com", "name": "Customer Two", "list_id": contact_list_ids[0]},
            {"email": "customer3@example.com", "name": "Customer Three", "list_id": contact_list_ids[0]},
            # Sales List 1
            {"email": "prospect1@example.com", "name": "Prospect One", "list_id": contact_list_ids[1]},
            {"email": "prospect2@example.com", "name": "Prospect Two", "list_id": contact_list_ids[1]},
            {"email": "prospect3@example.com", "name": "Prospect Three", "list_id": contact_list_ids[1]},
            # Newsletter List 1
            {"email": "subscriber1@example.com", "name": "Subscriber One", "list_id": contact_list_ids[2]},
            {"email": "subscriber2@example.com", "name": "Subscriber Two", "list_id": contact_list_ids[2]},
            # VIP Customers
            {"email": "vip1@example.com", "name": "VIP Customer One", "list_id": contact_list_ids[3]},
            {"email": "vip2@example.com", "name": "VIP Customer Two", "list_id": contact_list_ids[3]}
        ]
        
        for contact_data in sample_contacts:
            contact = Contact(
                email=contact_data["email"],
                name=contact_data["name"],
                contact_list_id=contact_data["list_id"]
            )
            db.add(contact)
            print(f"✅ Added contact: {contact_data['email']}")
        
        # Commit all changes
        db.commit()
        
        print("\n🎉 Sample data added successfully!")
        print(f"📊 Summary:")
        print(f"   - Service Accounts: {len(account_ids)}")
        print(f"   - Workspace Users: {len(user_ids)}")
        print(f"   - Contact Lists: {len(contact_list_ids)}")
        print(f"   - Contacts: {len(sample_contacts)}")
        print("\n✅ Your frontend should now show accounts and contacts!")
        
    except Exception as e:
        print(f"❌ Error adding sample data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_sample_data()
