from cryptography.fernet import Fernet
from app.config import settings
import base64
import hashlib


class EncryptionService:
    """Service for encrypting and decrypting sensitive data"""
    
    def __init__(self):
        # Ensure the encryption key is 32 bytes (URL-safe base64 encoded)
        key = settings.ENCRYPTION_KEY.encode()
        
        # If key is not already base64 encoded, derive it
        if len(key) != 44:  # Base64 encoded 32 bytes = 44 chars
            # Use SHA256 to derive a consistent 32-byte key
            key = base64.urlsafe_b64encode(hashlib.sha256(key).digest())
        
        self.cipher = Fernet(key)
    
    def encrypt(self, data: str) -> str:
        """Encrypt a string and return base64 encoded encrypted data"""
        encrypted = self.cipher.encrypt(data.encode())
        return base64.b64encode(encrypted).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt base64 encoded encrypted data and return original string"""
        encrypted = base64.b64decode(encrypted_data.encode())
        decrypted = self.cipher.decrypt(encrypted)
        return decrypted.decode()


# Singleton instance
encryption_service = EncryptionService()

