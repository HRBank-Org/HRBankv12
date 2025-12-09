"""
Encryption utilities for sensitive data like SIN numbers
"""
from cryptography.fernet import Fernet
import os
import base64
import hashlib

# Generate or load encryption key from environment
def get_encryption_key():
    """Get encryption key from environment or generate one"""
    key = os.getenv('ENCRYPTION_KEY')
    if not key:
        # In production, this should be from environment variable
        # For now, generate a deterministic key from JWT_SECRET
        jwt_secret = os.getenv('JWT_SECRET', 'default-secret-key')
        key = base64.urlsafe_b64encode(hashlib.sha256(jwt_secret.encode()).digest())
    elif isinstance(key, str):
        key = key.encode()
    return key

# Initialize Fernet cipher
cipher_suite = Fernet(get_encryption_key())

def encrypt_sin(sin: str) -> str:
    """
    Encrypt SIN number
    Args:
        sin: Social Insurance Number (format: XXX-XXX-XXX or XXXXXXXXX)
    Returns:
        Encrypted string
    """
    if not sin:
        return None
    
    # Remove any formatting (dashes, spaces)
    clean_sin = sin.replace('-', '').replace(' ', '')
    
    # Encrypt
    encrypted = cipher_suite.encrypt(clean_sin.encode())
    return encrypted.decode()

def decrypt_sin(encrypted_sin: str) -> str:
    """
    Decrypt SIN number
    Args:
        encrypted_sin: Encrypted SIN string
    Returns:
        Decrypted SIN (without formatting)
    """
    if not encrypted_sin:
        return None
    
    decrypted = cipher_suite.decrypt(encrypted_sin.encode())
    return decrypted.decode()

def hash_sin(sin: str) -> str:
    """
    Create a one-way hash of SIN for verification purposes
    Args:
        sin: Social Insurance Number
    Returns:
        SHA-256 hash of the SIN
    """
    if not sin:
        return None
    
    # Remove any formatting
    clean_sin = sin.replace('-', '').replace(' ', '')
    
    # Create hash
    return hashlib.sha256(clean_sin.encode()).hexdigest()

def validate_sin_format(sin: str) -> bool:
    """
    Validate Canadian SIN format
    Args:
        sin: Social Insurance Number
    Returns:
        True if valid format
    """
    if not sin:
        return False
    
    # Remove formatting
    clean_sin = sin.replace('-', '').replace(' ', '')
    
    # Must be exactly 9 digits
    if len(clean_sin) != 9 or not clean_sin.isdigit():
        return False
    
    # Luhn algorithm validation for Canadian SIN
    def luhn_checksum(number):
        def digits_of(n):
            return [int(d) for d in str(n)]
        
        digits = digits_of(number)
        odd_digits = digits[-1::-2]
        even_digits = digits[-2::-2]
        checksum = sum(odd_digits)
        for d in even_digits:
            checksum += sum(digits_of(d * 2))
        return checksum % 10
    
    return luhn_checksum(int(clean_sin)) == 0

def format_sin_display(sin: str) -> str:
    """
    Format SIN for display (XXX-XXX-XXX)
    Args:
        sin: SIN number (9 digits)
    Returns:
        Formatted SIN
    """
    if not sin:
        return None
    
    clean_sin = sin.replace('-', '').replace(' ', '')
    if len(clean_sin) == 9:
        return f"{clean_sin[:3]}-{clean_sin[3:6]}-{clean_sin[6:]}"
    return clean_sin
