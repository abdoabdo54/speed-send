#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   SERVICE ACCOUNT CLIENT ID CHECKER${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get the account ID from database
ACCOUNT_ID=$(docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -t -c "SELECT id FROM service_accounts ORDER BY id DESC LIMIT 1;" | xargs)

if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${RED}❌ No service accounts found in database${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found account ID: $ACCOUNT_ID${NC}"
echo ""

# Get encrypted JSON from database
ENCRYPTED_JSON=$(docker-compose exec -T postgres psql -U gmailsaas -d gmail_saas -t -c "SELECT encrypted_json FROM service_accounts WHERE id = $ACCOUNT_ID;")

echo -e "${YELLOW}📋 Service Account Details:${NC}"
echo ""

# Create a temporary Python script to decrypt and extract info
docker-compose exec -T backend python3 << 'PYTHON_SCRIPT'
import os
import sys
from app.database import SessionLocal
from app.models import ServiceAccount
from app.encryption import decrypt_data
import json

db = SessionLocal()
account = db.query(ServiceAccount).order_by(ServiceAccount.id.desc()).first()

if not account:
    print("❌ No account found")
    sys.exit(1)

# Decrypt JSON
try:
    decrypted = decrypt_data(account.encrypted_json)
    sa_info = json.loads(decrypted)
    
    print(f"Service Account Email: {sa_info.get('client_email', 'N/A')}")
    print(f"Project ID: {sa_info.get('project_id', 'N/A')}")
    print(f"")
    print(f"🔑 CLIENT ID (for Domain-Wide Delegation): {sa_info.get('client_id', 'N/A')}")
    print(f"")
    print(f"⚠️  This is the EXACT value you must enter in Google Admin Console")
    print(f"    under Domain-wide Delegation > Client ID")
    print(f"")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

db.close()
PYTHON_SCRIPT

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}📌 Next Steps:${NC}"
echo ""
echo -e "1. Copy the ${GREEN}CLIENT ID${NC} shown above"
echo -e "2. Go to: ${BLUE}https://admin.google.com${NC}"
echo -e "3. Navigate to: Security > API Controls > Domain-wide Delegation"
echo -e "4. Find your app or click 'Add new'"
echo -e "5. Paste the ${GREEN}CLIENT ID${NC} (NOT the email, NOT any other number)"
echo -e "6. Add these scopes:"
echo -e "   ${GREEN}https://www.googleapis.com/auth/admin.directory.user${NC}"
echo -e "   ${GREEN}https://www.googleapis.com/auth/admin.directory.user.security${NC}"
echo -e "   ${GREEN}https://www.googleapis.com/auth/admin.directory.orgunit${NC}"
echo -e "   ${GREEN}https://www.googleapis.com/auth/admin.directory.domain.readonly${NC}"
echo -e "   ${GREEN}https://www.googleapis.com/auth/gmail.send${NC}"
echo -e "   ${GREEN}https://www.googleapis.com/auth/gmail.compose${NC}"
echo -e "   ${GREEN}https://www.googleapis.com/auth/gmail.insert${NC}"
echo -e "   ${GREEN}https://www.googleapis.com/auth/gmail.modify${NC}"
echo -e "   ${GREEN}https://www.googleapis.com/auth/gmail.readonly${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"

