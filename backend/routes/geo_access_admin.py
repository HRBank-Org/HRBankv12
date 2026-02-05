"""
Geo-Access Admin Routes
=======================
Manage geographic access controls for the platform.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List
from datetime import datetime, timezone
from auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/admin/geo-access", tags=["Geo Access Control"])

def get_db():
    from server import db
    return db

# Default settings if none exist in database
DEFAULT_GEO_SETTINGS = {
    "employment_countries": ["CA"],  # Countries for employer/workforce
    "admin_countries": ["CA", "AF", "US", "GB", "IN", "PK"],  # Countries for admin access
    "worldwide_user_types": ["workpassport", "institution"],  # User types with global access
    "restricted_user_types": ["employer", "workforce"],  # User types restricted to employment_countries
}

# All supported countries with names
ALL_COUNTRIES = [
    {"code": "CA", "name": "Canada", "flag": "🇨🇦"},
    {"code": "AF", "name": "Afghanistan", "flag": "🇦🇫"},
    {"code": "US", "name": "United States", "flag": "🇺🇸"},
    {"code": "GB", "name": "United Kingdom", "flag": "🇬🇧"},
    {"code": "IN", "name": "India", "flag": "🇮🇳"},
    {"code": "PK", "name": "Pakistan", "flag": "🇵🇰"},
    {"code": "BD", "name": "Bangladesh", "flag": "🇧🇩"},
    {"code": "PH", "name": "Philippines", "flag": "🇵🇭"},
    {"code": "NG", "name": "Nigeria", "flag": "🇳🇬"},
    {"code": "KE", "name": "Kenya", "flag": "🇰🇪"},
    {"code": "ZA", "name": "South Africa", "flag": "🇿🇦"},
    {"code": "AU", "name": "Australia", "flag": "🇦🇺"},
    {"code": "NZ", "name": "New Zealand", "flag": "🇳🇿"},
    {"code": "DE", "name": "Germany", "flag": "🇩🇪"},
    {"code": "FR", "name": "France", "flag": "🇫🇷"},
    {"code": "IT", "name": "Italy", "flag": "🇮🇹"},
    {"code": "ES", "name": "Spain", "flag": "🇪🇸"},
    {"code": "NL", "name": "Netherlands", "flag": "🇳🇱"},
    {"code": "BE", "name": "Belgium", "flag": "🇧🇪"},
    {"code": "CH", "name": "Switzerland", "flag": "🇨🇭"},
    {"code": "SE", "name": "Sweden", "flag": "🇸🇪"},
    {"code": "NO", "name": "Norway", "flag": "🇳🇴"},
    {"code": "DK", "name": "Denmark", "flag": "🇩🇰"},
    {"code": "FI", "name": "Finland", "flag": "🇫🇮"},
    {"code": "IE", "name": "Ireland", "flag": "🇮🇪"},
    {"code": "PT", "name": "Portugal", "flag": "🇵🇹"},
    {"code": "PL", "name": "Poland", "flag": "🇵🇱"},
    {"code": "CZ", "name": "Czech Republic", "flag": "🇨🇿"},
    {"code": "AT", "name": "Austria", "flag": "🇦🇹"},
    {"code": "GR", "name": "Greece", "flag": "🇬🇷"},
    {"code": "MX", "name": "Mexico", "flag": "🇲🇽"},
    {"code": "BR", "name": "Brazil", "flag": "🇧🇷"},
    {"code": "AR", "name": "Argentina", "flag": "🇦🇷"},
    {"code": "CL", "name": "Chile", "flag": "🇨🇱"},
    {"code": "CO", "name": "Colombia", "flag": "🇨🇴"},
    {"code": "PE", "name": "Peru", "flag": "🇵🇪"},
    {"code": "JP", "name": "Japan", "flag": "🇯🇵"},
    {"code": "KR", "name": "South Korea", "flag": "🇰🇷"},
    {"code": "CN", "name": "China", "flag": "🇨🇳"},
    {"code": "SG", "name": "Singapore", "flag": "🇸🇬"},
    {"code": "MY", "name": "Malaysia", "flag": "🇲🇾"},
    {"code": "TH", "name": "Thailand", "flag": "🇹🇭"},
    {"code": "VN", "name": "Vietnam", "flag": "🇻🇳"},
    {"code": "ID", "name": "Indonesia", "flag": "🇮🇩"},
    {"code": "AE", "name": "United Arab Emirates", "flag": "🇦🇪"},
    {"code": "SA", "name": "Saudi Arabia", "flag": "🇸🇦"},
    {"code": "EG", "name": "Egypt", "flag": "🇪🇬"},
    {"code": "TR", "name": "Turkey", "flag": "🇹🇷"},
    {"code": "IL", "name": "Israel", "flag": "🇮🇱"},
    {"code": "RU", "name": "Russia", "flag": "🇷🇺"},
    {"code": "UA", "name": "Ukraine", "flag": "🇺🇦"},
]


async def get_geo_settings(db) -> dict:
    """Get geo settings from database or return defaults"""
    settings = await db.platform_settings.find_one({"setting_type": "geo_access"})
    if settings:
        return settings.get("settings", DEFAULT_GEO_SETTINGS)
    return DEFAULT_GEO_SETTINGS


@router.get("/settings", response_model=Dict)
async def get_geo_access_settings(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get current geo-access settings"""
    
    # Only super_admin can view geo settings
    if current_user.get("user_type") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    settings = await get_geo_settings(db)
    
    return {
        "success": True,
        "data": {
            "settings": settings,
            "all_countries": ALL_COUNTRIES
        }
    }


@router.put("/settings", response_model=Dict)
async def update_geo_access_settings(
    data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Update geo-access settings"""
    
    # Only super_admin can update geo settings
    if current_user.get("user_type") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    admin_countries = data.get("admin_countries", [])
    employment_countries = data.get("employment_countries", [])
    
    # Validate - Canada must always be in employment countries
    if "CA" not in employment_countries:
        employment_countries.append("CA")
    
    # Validate - Canada must always be in admin countries
    if "CA" not in admin_countries:
        admin_countries.append("CA")
    
    settings = {
        "admin_countries": admin_countries,
        "employment_countries": employment_countries,
        "worldwide_user_types": data.get("worldwide_user_types", ["workpassport", "institution"]),
        "restricted_user_types": data.get("restricted_user_types", ["employer", "workforce"]),
    }
    
    await db.platform_settings.update_one(
        {"setting_type": "geo_access"},
        {
            "$set": {
                "settings": settings,
                "updated_by": current_user["user_id"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Log the change
    await db.audit_logs.insert_one({
        "action": "geo_settings_updated",
        "admin_id": current_user["user_id"],
        "changes": settings,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": "Geo-access settings updated successfully",
        "data": {"settings": settings}
    }


@router.post("/toggle-country", response_model=Dict)
async def toggle_country_access(
    data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Toggle a country's access for admin or employment"""
    
    # Only super_admin can toggle countries
    if current_user.get("user_type") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    country_code = data.get("country_code")
    access_type = data.get("access_type")  # "admin" or "employment"
    enabled = data.get("enabled", True)
    
    if not country_code or access_type not in ["admin", "employment"]:
        raise HTTPException(status_code=400, detail="Invalid country_code or access_type")
    
    # Canada cannot be disabled
    if country_code == "CA" and not enabled:
        raise HTTPException(status_code=400, detail="Canada cannot be disabled")
    
    settings = await get_geo_settings(db)
    
    field = f"{access_type}_countries"
    countries = set(settings.get(field, []))
    
    if enabled:
        countries.add(country_code)
    else:
        countries.discard(country_code)
    
    settings[field] = list(countries)
    
    await db.platform_settings.update_one(
        {"setting_type": "geo_access"},
        {
            "$set": {
                "settings": settings,
                "updated_by": current_user["user_id"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Log the change
    await db.audit_logs.insert_one({
        "action": "geo_country_toggled",
        "admin_id": current_user["user_id"],
        "country_code": country_code,
        "access_type": access_type,
        "enabled": enabled,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"{country_code} {'enabled' if enabled else 'disabled'} for {access_type} access",
        "data": {"settings": settings}
    }
