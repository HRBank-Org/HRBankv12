"""
Rate Limiting Configuration for HR Bank API
============================================
Protects API endpoints from abuse and DDoS attacks.
Uses slowapi for rate limiting with in-memory storage.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
import os

# Get client IP address for rate limiting
def get_client_ip(request: Request) -> str:
    """
    Extract client IP from request, considering proxy headers.
    """
    # Check for forwarded headers (common in production behind load balancers)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # X-Forwarded-For can contain multiple IPs; first is the client
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct client address
    return get_remote_address(request)

# Initialize rate limiter
# Default: 100 requests per minute per IP
limiter = Limiter(
    key_func=get_client_ip,
    default_limits=["100/minute"],
    storage_uri="memory://",
    strategy="fixed-window"
)

# Rate limit configurations for different endpoint types
RATE_LIMITS = {
    # Authentication endpoints - stricter limits to prevent brute force
    "auth_login": "5/minute",  # 5 login attempts per minute
    "auth_register": "3/minute",  # 3 registrations per minute
    "auth_forgot_password": "3/minute",
    "auth_otp": "10/minute",  # OTP verification
    
    # Standard API endpoints
    "standard": "100/minute",
    
    # Heavy operations
    "file_upload": "10/minute",
    "ai_operations": "20/minute",  # AI translation, transcript processing
    "blockchain": "30/minute",  # Blockchain operations
    
    # Read-heavy endpoints (more permissive)
    "read_heavy": "200/minute",
    
    # Admin endpoints
    "admin": "50/minute",
    
    # Public endpoints (verification, etc.)
    "public": "60/minute"
}

def get_rate_limit(limit_type: str) -> str:
    """Get rate limit string for a specific endpoint type."""
    return RATE_LIMITS.get(limit_type, RATE_LIMITS["standard"])


# Decorator functions for common rate limits
def auth_rate_limit():
    """Rate limit for authentication endpoints."""
    return limiter.limit(RATE_LIMITS["auth_login"])

def standard_rate_limit():
    """Standard rate limit for general API endpoints."""
    return limiter.limit(RATE_LIMITS["standard"])

def upload_rate_limit():
    """Rate limit for file upload endpoints."""
    return limiter.limit(RATE_LIMITS["file_upload"])

def ai_rate_limit():
    """Rate limit for AI-powered endpoints."""
    return limiter.limit(RATE_LIMITS["ai_operations"])

def blockchain_rate_limit():
    """Rate limit for blockchain operations."""
    return limiter.limit(RATE_LIMITS["blockchain"])

def public_rate_limit():
    """Rate limit for public endpoints."""
    return limiter.limit(RATE_LIMITS["public"])
