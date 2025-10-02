from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
import json
import traceback

from app.database import get_db
from app.models import ServiceAccount
from app.google_api import GoogleWorkspaceService
from app.encryption import encryption_service

router = APIRouter(prefix="/test", tags=["testing"])


@router.get("/sync/{account_id}")
async def test_sync(
    account_id: int,
    admin_email: str,
    db: Session = Depends(get_db)
) -> Dict:
    """
    Test if we can sync users from Google Workspace
    This endpoint runs synchronously and returns detailed error information
    """
    try:
        # Get service account
        account = db.query(ServiceAccount).filter(ServiceAccount.id == account_id).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Service account not found")
        
        # Decrypt JSON
        try:
            decrypted_json = encryption_service.decrypt(account.encrypted_json)
            json_data = json.loads(decrypted_json)
        except Exception as e:
            return {
                "success": False,
                "error": "Failed to decrypt/parse service account JSON",
                "details": str(e),
                "step": "decrypt"
            }
        
        # Verify required fields
        required_fields = ['client_email', 'private_key', 'project_id']
        missing_fields = [f for f in required_fields if f not in json_data]
        if missing_fields:
            return {
                "success": False,
                "error": f"Missing required fields: {missing_fields}",
                "step": "validation"
            }
        
        # Initialize Google API service
        try:
            google_service = GoogleWorkspaceService(decrypted_json)
        except Exception as e:
            return {
                "success": False,
                "error": "Failed to initialize Google Workspace Service",
                "details": str(e),
                "traceback": traceback.format_exc(),
                "step": "init_service"
            }
        
        # Try to fetch users
        try:
            users = google_service.fetch_workspace_users(admin_email)
            
            return {
                "success": True,
                "message": "Successfully fetched users!",
                "user_count": len(users),
                "sample_users": users[:5] if users else [],  # First 5 users as sample
                "admin_email_used": admin_email,
                "service_account": json_data.get('client_email')
            }
        except Exception as e:
            error_msg = str(e)
            full_trace = traceback.format_exc()
            
            # Parse common Google API errors
            error_details = {
                "success": False,
                "error": "Failed to fetch users from Google Workspace",
                "details": error_msg,
                "traceback": full_trace,
                "step": "fetch_users",
                "admin_email": admin_email,
                "service_account": json_data.get('client_email')
            }
            
            # Provide helpful hints based on error
            if "403" in error_msg or "Forbidden" in error_msg:
                error_details["hint"] = (
                    "403 Forbidden - The service account doesn't have permission. "
                    "Please ensure:\n"
                    "1. Domain-wide delegation is enabled in Google Admin Console\n"
                    "2. The service account client ID is authorized with these scopes:\n"
                    "   - https://www.googleapis.com/auth/admin.directory.user.readonly\n"
                    "3. The admin email has super admin privileges"
                )
            elif "401" in error_msg or "Unauthorized" in error_msg:
                error_details["hint"] = (
                    "401 Unauthorized - Authentication failed. "
                    "The service account credentials might be invalid."
                )
            elif "404" in error_msg:
                error_details["hint"] = (
                    "404 Not Found - The domain or user doesn't exist."
                )
            elif "domain" in error_msg.lower():
                error_details["hint"] = (
                    "Domain error - Make sure the admin email belongs to the same domain "
                    "as the service account."
                )
            
            return error_details
    
    except Exception as e:
        return {
            "success": False,
            "error": "Unexpected error in test endpoint",
            "details": str(e),
            "traceback": traceback.format_exc(),
            "step": "unknown"
        }

