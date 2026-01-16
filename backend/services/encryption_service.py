"""
AWS KMS-based Encryption Service for SOC2 Compliance
Provides field-level encryption for sensitive data (PII/PHI).
Supports PIPEDA requirements for data protection.
"""

import os
import base64
import json
import logging
from typing import Optional, Union, Dict, Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import hashlib

logger = logging.getLogger(__name__)

# Try to import boto3 for AWS KMS
try:
    import boto3
    from botocore.exceptions import ClientError
    AWS_AVAILABLE = True
except ImportError:
    AWS_AVAILABLE = False
    logger.warning("boto3 not installed. AWS KMS encryption unavailable. Using local fallback.")


class EncryptionService:
    """
    Encryption service with AWS KMS integration.
    Falls back to local encryption if KMS is unavailable.
    """
    
    # Fields that should be encrypted
    SENSITIVE_FIELDS = {
        'sin',  # Social Insurance Number (Canada)
        'ssn',  # Social Security Number (US)
        'bank_account_number',
        'routing_number',
        'credit_card_number',
        'date_of_birth',
        'drivers_license',
        'passport_number',
        'health_card_number',
        'tax_id',
        'direct_deposit_account',
        'emergency_contact_phone',
    }
    
    # Fields that should be hashed (one-way, for searching)
    SEARCHABLE_SENSITIVE_FIELDS = {
        'sin_hash',
        'email_hash',
    }
    
    def __init__(self):
        self._kms_client = None
        self._kms_key_id = os.environ.get('AWS_KMS_KEY_ID')
        self._local_key = None
        self._fernet = None
        self._use_kms = False
        
        self._initialize()
    
    def _initialize(self):
        """Initialize encryption service"""
        # Try AWS KMS first
        if AWS_AVAILABLE and self._kms_key_id:
            try:
                self._kms_client = boto3.client(
                    'kms',
                    region_name=os.environ.get('AWS_REGION', 'us-east-1'),
                    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
                )
                # Test the connection
                self._kms_client.describe_key(KeyId=self._kms_key_id)
                self._use_kms = True
                logger.info("AWS KMS encryption initialized successfully")
            except Exception as e:
                logger.warning(f"AWS KMS unavailable: {str(e)}. Using local encryption.")
                self._use_kms = False
        
        # Initialize local fallback encryption
        if not self._use_kms:
            self._initialize_local_encryption()
    
    def _initialize_local_encryption(self):
        """Initialize local Fernet encryption as fallback"""
        # Use environment variable or generate deterministic key
        master_key = os.environ.get('ENCRYPTION_MASTER_KEY', 'hrbank-encryption-key-2026')
        salt = os.environ.get('ENCRYPTION_SALT', 'hrbank-salt-2026').encode()
        
        # Derive a proper key using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(master_key.encode()))
        self._fernet = Fernet(key)
        logger.info("Local Fernet encryption initialized")
    
    async def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a string value.
        
        Args:
            plaintext: The string to encrypt
            
        Returns:
            Base64-encoded encrypted string with prefix
        """
        if not plaintext:
            return plaintext
        
        try:
            if self._use_kms:
                return await self._kms_encrypt(plaintext)
            else:
                return self._local_encrypt(plaintext)
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise EncryptionError(f"Failed to encrypt data: {str(e)}")
    
    async def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt an encrypted string.
        
        Args:
            ciphertext: The encrypted string to decrypt
            
        Returns:
            Decrypted plaintext string
        """
        if not ciphertext:
            return ciphertext
        
        # Check if it's actually encrypted
        if not ciphertext.startswith(('kms:', 'enc:')):
            return ciphertext  # Return as-is if not encrypted
        
        try:
            if ciphertext.startswith('kms:'):
                return await self._kms_decrypt(ciphertext)
            else:
                return self._local_decrypt(ciphertext)
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise EncryptionError(f"Failed to decrypt data: {str(e)}")
    
    async def _kms_encrypt(self, plaintext: str) -> str:
        """Encrypt using AWS KMS"""
        response = self._kms_client.encrypt(
            KeyId=self._kms_key_id,
            Plaintext=plaintext.encode('utf-8')
        )
        ciphertext = base64.b64encode(response['CiphertextBlob']).decode('utf-8')
        return f"kms:{ciphertext}"
    
    async def _kms_decrypt(self, ciphertext: str) -> str:
        """Decrypt using AWS KMS"""
        # Remove prefix
        encrypted_data = ciphertext.replace('kms:', '')
        ciphertext_blob = base64.b64decode(encrypted_data)
        
        response = self._kms_client.decrypt(
            CiphertextBlob=ciphertext_blob
        )
        return response['Plaintext'].decode('utf-8')
    
    def _local_encrypt(self, plaintext: str) -> str:
        """Encrypt using local Fernet"""
        encrypted = self._fernet.encrypt(plaintext.encode('utf-8'))
        return f"enc:{encrypted.decode('utf-8')}"
    
    def _local_decrypt(self, ciphertext: str) -> str:
        """Decrypt using local Fernet"""
        # Remove prefix
        encrypted_data = ciphertext.replace('enc:', '')
        decrypted = self._fernet.decrypt(encrypted_data.encode('utf-8'))
        return decrypted.decode('utf-8')
    
    def hash_for_search(self, value: str) -> str:
        """
        Create a searchable hash of a value.
        Use this for fields that need to be searched but not displayed.
        """
        if not value:
            return None
        
        salt = os.environ.get('HASH_SALT', 'hrbank-hash-salt-2026')
        hash_input = f"{salt}:{value.lower().strip()}"
        return hashlib.sha256(hash_input.encode()).hexdigest()
    
    async def encrypt_document(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Encrypt sensitive fields in a document.
        
        Args:
            document: Dictionary with potentially sensitive fields
            
        Returns:
            Document with sensitive fields encrypted
        """
        encrypted_doc = document.copy()
        
        for field in self.SENSITIVE_FIELDS:
            if field in encrypted_doc and encrypted_doc[field]:
                encrypted_doc[field] = await self.encrypt(str(encrypted_doc[field]))
                
                # Also create searchable hash if applicable
                hash_field = f"{field}_hash"
                if hash_field in self.SEARCHABLE_SENSITIVE_FIELDS:
                    encrypted_doc[hash_field] = self.hash_for_search(str(document[field]))
        
        return encrypted_doc
    
    async def decrypt_document(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decrypt sensitive fields in a document.
        
        Args:
            document: Dictionary with potentially encrypted fields
            
        Returns:
            Document with sensitive fields decrypted
        """
        if not document:
            return document
            
        decrypted_doc = document.copy()
        
        for field in self.SENSITIVE_FIELDS:
            if field in decrypted_doc and decrypted_doc[field]:
                value = decrypted_doc[field]
                if isinstance(value, str) and value.startswith(('kms:', 'enc:')):
                    decrypted_doc[field] = await self.decrypt(value)
        
        return decrypted_doc
    
    def mask_value(self, value: str, visible_chars: int = 4) -> str:
        """
        Mask a sensitive value for display.
        Shows only the last few characters.
        """
        if not value or len(value) <= visible_chars:
            return '*' * len(value) if value else ''
        
        return '*' * (len(value) - visible_chars) + value[-visible_chars:]
    
    def is_encrypted(self, value: str) -> bool:
        """Check if a value is encrypted"""
        if not value or not isinstance(value, str):
            return False
        return value.startswith(('kms:', 'enc:'))
    
    @property
    def encryption_type(self) -> str:
        """Return the current encryption type being used"""
        return "AWS_KMS" if self._use_kms else "LOCAL_FERNET"


class EncryptionError(Exception):
    """Custom exception for encryption errors"""
    pass


# Singleton instance
encryption_service = EncryptionService()


# Convenience functions
async def encrypt_field(value: str) -> str:
    """Encrypt a single field value"""
    return await encryption_service.encrypt(value)


async def decrypt_field(value: str) -> str:
    """Decrypt a single field value"""
    return await encryption_service.decrypt(value)


async def encrypt_pii(document: dict) -> dict:
    """Encrypt all PII fields in a document"""
    return await encryption_service.encrypt_document(document)


async def decrypt_pii(document: dict) -> dict:
    """Decrypt all PII fields in a document"""
    return await encryption_service.decrypt_document(document)
