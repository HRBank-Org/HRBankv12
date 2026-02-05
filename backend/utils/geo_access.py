"""
Geo-Access Control Middleware
=============================
Controls access based on user location/country.

Rules:
- Admin accounts: Allowed from configured admin countries
- Employer/Workforce accounts: Restricted to employment countries (Canada by default)
- Workpassport/Institution accounts: Worldwide (blockchain credentials)
"""

from fastapi import Request, HTTPException
from typing import Optional, Set
import httpx

# Default settings (used if database not available)
DEFAULT_ADMIN_COUNTRIES = {"CA", "AF", "US", "GB", "IN", "PK"}
DEFAULT_EMPLOYMENT_COUNTRIES = {"CA"}
WORLDWIDE_USER_TYPES = {"workpassport", "institution", "admin", "super_admin"}
RESTRICTED_USER_TYPES = {"employer", "workforce"}

# Paths that require geo-checking for restricted user types
RESTRICTED_PATHS = {
    "/api/auth/signup",
    "/api/auth/google/login",
    "/api/auth/linkedin/login",
}

# Paths always allowed regardless of location
ALWAYS_ALLOWED_PATHS = {
    "/api/auth/login",
    "/api/admin",
    "/api/super-admin",
    "/api/admin-management",
    "/api/admin-messaging",
    "/health",
    "/",
}


async def get_geo_settings_from_db():
    """Get geo settings from database"""
    try:
        from server import db
        settings = await db.platform_settings.find_one({"setting_type": "geo_access"})
        if settings:
            return settings.get("settings", {})
    except Exception as e:
        print(f"Failed to get geo settings from DB: {e}")
    return None


async def get_admin_countries() -> Set[str]:
    """Get allowed admin countries from database or defaults"""
    settings = await get_geo_settings_from_db()
    if settings:
        return set(settings.get("admin_countries", DEFAULT_ADMIN_COUNTRIES))
    return DEFAULT_ADMIN_COUNTRIES


async def get_employment_countries() -> Set[str]:
    """Get allowed employment countries from database or defaults"""
    settings = await get_geo_settings_from_db()
    if settings:
        return set(settings.get("employment_countries", DEFAULT_EMPLOYMENT_COUNTRIES))
    return DEFAULT_EMPLOYMENT_COUNTRIES


async def get_country_from_ip(ip: str) -> Optional[str]:
    """
    Get country code from IP address using free IP geolocation API.
    Returns ISO 3166-1 alpha-2 country code (e.g., 'CA', 'AF', 'US')
    """
    if ip in ("127.0.0.1", "localhost", "::1"):
        return "CA"  # Localhost treated as Canada for testing
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"http://ip-api.com/json/{ip}?fields=countryCode")
            if response.status_code == 200:
                data = response.json()
                return data.get("countryCode")
    except Exception as e:
        print(f"Geo lookup failed for {ip}: {e}")
    
    return None


def get_client_ip(request: Request) -> str:
    """Extract real client IP from request, handling proxies"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    return request.client.host if request.client else "127.0.0.1"


def is_path_allowed(path: str) -> bool:
    """Check if path is always allowed regardless of location"""
    for allowed_path in ALWAYS_ALLOWED_PATHS:
        if path.startswith(allowed_path):
            return True
    return False


def is_path_restricted(path: str) -> bool:
    """Check if path requires geo-checking"""
    for restricted_path in RESTRICTED_PATHS:
        if path.startswith(restricted_path):
            return True
    return False


async def check_geo_access(
    request: Request,
    user_type: Optional[str] = None,
    is_admin: bool = False
) -> dict:
    """Check if request is allowed based on geographic location."""
    path = request.url.path
    
    if is_path_allowed(path):
        return {"allowed": True, "country": None, "reason": None}
    
    # Admins check against admin countries
    if is_admin:
        client_ip = get_client_ip(request)
        country = await get_country_from_ip(client_ip)
        admin_countries = await get_admin_countries()
        
        if country in admin_countries:
            return {"allowed": True, "country": country, "reason": None}
        else:
            return {
                "allowed": False,
                "country": country,
                "reason": f"Admin access not allowed from {country}. Contact super admin for access."
            }
    
    if not is_path_restricted(path):
        return {"allowed": True, "country": None, "reason": None}
    
    if user_type in WORLDWIDE_USER_TYPES:
        return {"allowed": True, "country": None, "reason": None}
    
    if user_type in RESTRICTED_USER_TYPES:
        client_ip = get_client_ip(request)
        country = await get_country_from_ip(client_ip)
        employment_countries = await get_employment_countries()
        
        if country in employment_countries:
            return {"allowed": True, "country": country, "reason": None}
        else:
            return {
                "allowed": False,
                "country": country,
                "reason": f"Employer and Workforce accounts are currently only available in Canada. "
                         f"For global access, please sign up as a WorkPassport holder or Institution."
            }
    
    return {"allowed": True, "country": None, "reason": None}


async def geo_access_middleware(request: Request, call_next):
    """Middleware to check geo-access for signup requests."""
    path = request.url.path
    
    if not is_path_restricted(path) or is_path_allowed(path):
        return await call_next(request)
    
    user_type = request.query_params.get("user_type")
    
    if user_type in WORLDWIDE_USER_TYPES:
        return await call_next(request)
    
    geo_check = await check_geo_access(request, user_type=user_type)
    
    if not geo_check["allowed"]:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "geo_restricted",
                "message": geo_check["reason"],
                "country": geo_check["country"]
            }
        )
    
    return await call_next(request)
