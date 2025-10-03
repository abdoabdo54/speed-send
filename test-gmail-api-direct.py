#!/usr/bin/env python3
"""
Direct Gmail API Test - Bypass Celery and test Gmail API directly
"""

import sys
import os
sys.path.append('/opt/speed-send/backend')

from app.database import SessionLocal
from app.models import ServiceAccount, WorkspaceUser
from app.google_api import GoogleWorkspaceService
from app.encryption import encryption_service
import json

def test_gmail_api_direct():
    print("🧪 Testing Gmail API directly...")
    
    db = SessionLocal()
    try:
        # Get first service account
        account = db.query(ServiceAccount).first()
        if not account:
            print("❌ No service accounts found")
            return
        
        print(f"📧 Testing with account: {account.name}")
        print(f"📧 Client email: {account.client_email}")
        
        # Get first workspace user
        user = db.query(WorkspaceUser).filter(
            WorkspaceUser.service_account_id == account.id,
            WorkspaceUser.is_active == True
        ).first()
        
        if not user:
            print("❌ No workspace users found")
            return
            
        print(f"👤 Testing with user: {user.email}")
        
        # Decrypt service account JSON
        decrypted_json = encryption_service.decrypt(account.encrypted_json)
        print(f"🔑 Service account JSON decrypted: {len(decrypted_json)} chars")
        
        # Test Gmail API
        google_service = GoogleWorkspaceService(decrypted_json)
        
        print("📤 Sending test email...")
        message_id = google_service.send_email(
            sender_email=user.email,
            recipient_email="salssapp@gmail.com",  # Your test email
            subject="🧪 Direct Gmail API Test",
            body_html="<h1>Test Email</h1><p>This is a direct Gmail API test!</p>",
            body_plain="Test Email\n\nThis is a direct Gmail API test!"
        )
        
        print(f"✅ Email sent successfully! Message ID: {message_id}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_gmail_api_direct()
