from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import base64
import json
from typing import List, Dict, Optional
from app.config import settings
from app.encryption import encryption_service


class GoogleWorkspaceService:
    """Service for interacting with Google Workspace APIs"""
    
    def __init__(self, service_account_json: str):
        """
        Initialize with service account JSON (decrypted)
        
        Args:
            service_account_json: JSON string of service account credentials
        """
        self.service_account_info = json.loads(service_account_json)
        self.credentials = None
    
    def get_delegated_credentials(self, user_email: str, scopes: List[str]):
        """
        Get credentials for a specific user via domain-wide delegation
        
        Args:
            user_email: Email of the user to impersonate
            scopes: List of OAuth scopes
        
        Returns:
            Delegated credentials object
        """
        credentials = service_account.Credentials.from_service_account_info(
            self.service_account_info,
            scopes=scopes
        )
        delegated_credentials = credentials.with_subject(user_email)
        return delegated_credentials
    
    def fetch_workspace_users(self, admin_email: str = None) -> List[Dict]:
        """
        Fetch all users from Google Workspace domain
        
        Args:
            admin_email: Email of an admin user for delegation (optional, will auto-detect from JSON)
        
        Returns:
            List of user dictionaries
        """
        try:
            # Auto-detect admin email from service account if not provided
            if not admin_email:
                # Try to extract from service account JSON
                client_email = self.service_account_info.get('client_email', '')
                if '@' in client_email:
                    # Extract domain and create admin email
                    domain = client_email.split('@')[1]
                    # Try common admin emails
                    possible_admins = [
                        f'admin@{domain}',
                        f'administrator@{domain}',
                        f'postmaster@{domain}'
                    ]
                    admin_email = possible_admins[0]
                else:
                    raise Exception("Admin email is required and could not be auto-detected")
            
            credentials = self.get_delegated_credentials(admin_email, settings.ADMIN_SCOPES)
            service = build('admin', 'directory_v1', credentials=credentials)
            
            users = []
            page_token = None
            
            while True:
                results = service.users().list(
                    customer='my_customer',
                    maxResults=500,
                    orderBy='email',
                    pageToken=page_token
                ).execute()
                
                users.extend(results.get('users', []))
                page_token = results.get('nextPageToken')
                
                if not page_token:
                    break
            
            # Parse user data
            parsed_users = []
            for user in users:
                parsed_users.append({
                    'email': user.get('primaryEmail'),
                    'full_name': user.get('name', {}).get('fullName'),
                    'first_name': user.get('name', {}).get('givenName'),
                    'last_name': user.get('name', {}).get('familyName'),
                    'is_active': not user.get('suspended', False)
                })
            
            return parsed_users
        
        except HttpError as error:
            raise Exception(f"Failed to fetch users: {error}")
    
    def send_email(
        self,
        sender_email: str,
        recipient_email: str,
        subject: str,
        body_html: Optional[str] = None,
        body_plain: Optional[str] = None,
        custom_headers: Optional[Dict[str, str]] = None,
        attachments: Optional[List[Dict]] = None
    ) -> str:
        """
        Send an email using Gmail API
        
        Args:
            sender_email: Email address to send from (will be impersonated)
            recipient_email: Recipient email address
            subject: Email subject
            body_html: HTML body content
            body_plain: Plain text body content
            custom_headers: Dictionary of custom headers
            attachments: List of attachment dictionaries
        
        Returns:
            Message ID of sent email
        """
        try:
            credentials = self.get_delegated_credentials(sender_email, settings.GMAIL_SCOPES)
            service = build('gmail', 'v1', credentials=credentials)
            
            # Create message
            if body_html and body_plain:
                message = MIMEMultipart('alternative')
                part1 = MIMEText(body_plain, 'plain')
                part2 = MIMEText(body_html, 'html')
                message.attach(part1)
                message.attach(part2)
            elif body_html:
                message = MIMEText(body_html, 'html')
            else:
                message = MIMEText(body_plain or '', 'plain')
            
            message['To'] = recipient_email
            message['From'] = sender_email
            message['Subject'] = subject
            
            # Add custom headers
            if custom_headers:
                for key, value in custom_headers.items():
                    message[key] = value
            
            # Add attachments (if provided)
            if attachments:
                # Convert to multipart if not already
                if not isinstance(message, MIMEMultipart):
                    old_message = message
                    message = MIMEMultipart()
                    message['To'] = recipient_email
                    message['From'] = sender_email
                    message['Subject'] = subject
                    message.attach(old_message)
                
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(base64.b64decode(attachment['content']))
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename={attachment["filename"]}'
                    )
                    message.attach(part)
            
            # Encode and send
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            send_message = {'raw': raw_message}
            
            result = service.users().messages().send(
                userId='me',
                body=send_message
            ).execute()
            
            return result['id']
        
        except HttpError as error:
            raise Exception(f"Failed to send email: {error}")
    
    def test_connection(self, admin_email: str) -> bool:
        """
        Test if the service account can connect and fetch users
        
        Args:
            admin_email: Email of an admin user
        
        Returns:
            True if connection successful
        """
        try:
            users = self.fetch_workspace_users(admin_email)
            return len(users) > 0
        except Exception:
            return False


def substitute_variables(text: str, variables: Dict[str, str]) -> str:
    """
    Replace {{variable}} placeholders with actual values
    
    Args:
        text: Text containing {{variable}} placeholders
        variables: Dictionary of variable names to values
    
    Returns:
        Text with substituted values
    """
    result = text
    for key, value in variables.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, str(value))
    return result

