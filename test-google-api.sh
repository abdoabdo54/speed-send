#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   GOOGLE API DIRECT TEST${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if admin email is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Usage: $0 <admin_email>${NC}"
    echo -e "${YELLOW}Example: $0 selina@kpgsrypj7nx1tnctr.brightlegals.co.uk${NC}"
    exit 1
fi

ADMIN_EMAIL="$1"

echo -e "${CYAN}📧 Testing with admin email: ${GREEN}$ADMIN_EMAIL${NC}"
echo ""

# Create test script
docker-compose exec -T backend python3 << PYTHON_SCRIPT
import os
import sys
import json
from app.database import SessionLocal
from app.models import ServiceAccount
from app.encryption import decrypt_data
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

print("=" * 60)
print("🔍 GOOGLE API DIRECT TEST")
print("=" * 60)
print()

# Get database session
db = SessionLocal()

try:
    # Get the latest service account
    account = db.query(ServiceAccount).order_by(ServiceAccount.id.desc()).first()
    
    if not account:
        print("❌ No service accounts found in database")
        sys.exit(1)
    
    print(f"✅ Found account: {account.client_email}")
    print(f"📝 Account name: {account.name}")
    print()
    
    # Decrypt the JSON
    decrypted = decrypt_data(account.encrypted_json)
    sa_info = json.loads(decrypted)
    
    print("🔑 Service Account Details:")
    print(f"   Client Email: {sa_info.get('client_email')}")
    print(f"   Project ID: {sa_info.get('project_id')}")
    print(f"   Client ID: {sa_info.get('client_id')}")
    print(f"   Private Key ID: {sa_info.get('private_key_id')}")
    print()
    
    # Define scopes
    SCOPES = [
        'https://www.googleapis.com/auth/admin.directory.user',
        'https://www.googleapis.com/auth/admin.directory.user.security',
        'https://www.googleapis.com/auth/admin.directory.orgunit',
        'https://www.googleapis.com/auth/admin.directory.domain.readonly'
    ]
    
    print("📋 Using scopes:")
    for scope in SCOPES:
        print(f"   • {scope}")
    print()
    
    admin_email = "$ADMIN_EMAIL"
    print(f"👤 Admin email for delegation: {admin_email}")
    print()
    
    # Create credentials
    print("🔐 Creating credentials...")
    try:
        credentials = service_account.Credentials.from_service_account_info(
            sa_info,
            scopes=SCOPES
        )
        print("   ✓ Base credentials created")
        
        # Delegate to admin
        delegated_credentials = credentials.with_subject(admin_email)
        print(f"   ✓ Delegated to {admin_email}")
        print()
        
        # Build service
        print("🌐 Building Admin Directory service...")
        service = build('admin', 'directory_v1', credentials=delegated_credentials)
        print("   ✓ Service built successfully")
        print()
        
        # Try to fetch users
        print("👥 Attempting to fetch users...")
        print("-" * 60)
        
        try:
            results = service.users().list(
                customer='my_customer',
                maxResults=10,
                orderBy='email'
            ).execute()
            
            users = results.get('users', [])
            
            print()
            print("=" * 60)
            print(f"✅ SUCCESS! Retrieved {len(users)} users")
            print("=" * 60)
            print()
            
            if users:
                print("📋 First few users:")
                for i, user in enumerate(users[:5], 1):
                    email = user.get('primaryEmail', 'N/A')
                    name = user.get('name', {}).get('fullName', 'N/A')
                    suspended = user.get('suspended', False)
                    status = "🔴 Suspended" if suspended else "🟢 Active"
                    print(f"   {i}. {email} - {name} {status}")
                print()
                
                if len(users) > 5:
                    print(f"   ... and {len(users) - 5} more users")
                    print()
            else:
                print("⚠️  No users found in workspace")
                print()
            
            print("=" * 60)
            print("🎉 API CALL SUCCESSFUL!")
            print("=" * 60)
            print()
            print("✅ Your service account is configured correctly")
            print("✅ Domain-wide delegation is working")
            print("✅ The app should now be able to sync users")
            print()
            
        except HttpError as e:
            print()
            print("=" * 60)
            print("❌ GOOGLE API ERROR")
            print("=" * 60)
            print()
            print(f"Error Status: {e.resp.status}")
            print(f"Error Reason: {e.resp.get('reason', 'N/A')}")
            print()
            print("Error Details:")
            print(e.content.decode('utf-8'))
            print()
            print("=" * 60)
            print("🔧 TROUBLESHOOTING")
            print("=" * 60)
            print()
            
            error_content = e.content.decode('utf-8')
            
            if 'unauthorized_client' in error_content:
                print("❌ ISSUE: Client is unauthorized")
                print()
                print("📌 SOLUTION:")
                print("   1. Go to https://admin.google.com")
                print("   2. Navigate to: Security > API Controls > Domain-wide Delegation")
                print(f"   3. Verify the Client ID is EXACTLY: {sa_info.get('client_id')}")
                print("   4. Make sure ALL required scopes are added")
                print()
                
            elif 'invalid_grant' in error_content:
                print("❌ ISSUE: Invalid grant (wrong admin email or delegation)")
                print()
                print("📌 SOLUTION:")
                print(f"   1. Verify {admin_email} is a valid admin in your workspace")
                print("   2. Verify the admin has super admin privileges")
                print("   3. Check domain-wide delegation is enabled for this client")
                print()
                
            elif 'Not Authorized' in error_content or '403' in str(e.resp.status):
                print("❌ ISSUE: Missing required scopes or permissions")
                print()
                print("📌 SOLUTION:")
                print("   1. Go to https://admin.google.com")
                print("   2. Navigate to: Security > API Controls > Domain-wide Delegation")
                print(f"   3. Find Client ID: {sa_info.get('client_id')}")
                print("   4. Add these scopes:")
                for scope in SCOPES:
                    print(f"      • {scope}")
                print()
            
            print()
            sys.exit(1)
            
    except Exception as cred_error:
        print(f"❌ Credential Error: {cred_error}")
        print()
        import traceback
        print("Full traceback:")
        print(traceback.format_exc())
        sys.exit(1)
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    print()
    print("Full traceback:")
    print(traceback.format_exc())
    sys.exit(1)
    
finally:
    db.close()

PYTHON_SCRIPT

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${CYAN}Test complete!${NC}"
echo -e "${BLUE}========================================${NC}"

