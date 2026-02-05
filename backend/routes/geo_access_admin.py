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


# ============================================
# Country-specific Employer Insurance Requirements
# ============================================

# Default insurance requirements by country
DEFAULT_INSURANCE_REQUIREMENTS = {
    "CA": {
        "name": "WSIB Certificate",
        "full_name": "Workplace Safety and Insurance Board Certificate",
        "description": "Proof of workers' compensation coverage in Ontario/Canada",
        "required": True,
        "expiry_required": True
    },
    "US": {
        "name": "Workers' Compensation Insurance",
        "full_name": "Workers' Compensation Insurance Certificate",
        "description": "Proof of workers' compensation coverage as required by state law",
        "required": True,
        "expiry_required": True
    },
    "GB": {
        "name": "Employers' Liability Insurance",
        "full_name": "Employers' Liability Insurance Certificate",
        "description": "Compulsory insurance for employers in the UK",
        "required": True,
        "expiry_required": True
    },
    "AU": {
        "name": "WorkCover Certificate",
        "full_name": "WorkCover/Workers' Compensation Certificate",
        "description": "State-based workers' compensation coverage",
        "required": True,
        "expiry_required": True
    }
}


@router.get("/insurance-requirements", response_model=Dict)
async def get_insurance_requirements(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get employer insurance requirements for all employment-enabled countries"""
    
    # Get current geo settings
    geo_settings = await get_geo_settings(db)
    employment_countries = geo_settings.get("employment_countries", ["CA"])
    
    # Get custom requirements from database
    custom_reqs = await db.platform_settings.find_one({"setting_type": "insurance_requirements"})
    custom_requirements = custom_reqs.get("requirements", {}) if custom_reqs else {}
    
    # Build requirements list for each employment country
    requirements = {}
    for country_code in employment_countries:
        country_info = next((c for c in ALL_COUNTRIES if c["code"] == country_code), None)
        if country_info:
            # Use custom requirement if exists, otherwise use default or generic
            if country_code in custom_requirements:
                req = custom_requirements[country_code]
            elif country_code in DEFAULT_INSURANCE_REQUIREMENTS:
                req = DEFAULT_INSURANCE_REQUIREMENTS[country_code]
            else:
                req = {
                    "name": "Workers' Insurance Certificate",
                    "full_name": "Workers' Compensation/Insurance Certificate",
                    "description": f"Proof of workers' insurance coverage required for employers in {country_info['name']}",
                    "required": True,
                    "expiry_required": True
                }
            
            requirements[country_code] = {
                **req,
                "country_name": country_info["name"],
                "country_flag": country_info["flag"]
            }
    
    return {
        "success": True,
        "data": {
            "requirements": requirements,
            "employment_countries": employment_countries
        }
    }


@router.put("/insurance-requirements/{country_code}", response_model=Dict)
async def update_insurance_requirement(
    country_code: str,
    data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Update insurance requirement for a specific country"""
    
    if current_user.get("user_type") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Validate country exists
    country_info = next((c for c in ALL_COUNTRIES if c["code"] == country_code), None)
    if not country_info:
        raise HTTPException(status_code=404, detail="Country not found")
    
    # Get current geo settings to verify country is enabled for employment
    geo_settings = await get_geo_settings(db)
    if country_code not in geo_settings.get("employment_countries", []):
        raise HTTPException(
            status_code=400, 
            detail=f"{country_info['name']} is not enabled for employment. Enable it first in Geo-Access settings."
        )
    
    # Get existing custom requirements
    custom_reqs = await db.platform_settings.find_one({"setting_type": "insurance_requirements"})
    requirements = custom_reqs.get("requirements", {}) if custom_reqs else {}
    
    # Update the requirement for this country
    requirements[country_code] = {
        "name": data.get("name", "Workers' Insurance Certificate"),
        "full_name": data.get("full_name", "Workers' Compensation/Insurance Certificate"),
        "description": data.get("description", f"Proof of workers' insurance coverage for {country_info['name']}"),
        "required": data.get("required", True),
        "expiry_required": data.get("expiry_required", True)
    }
    
    await db.platform_settings.update_one(
        {"setting_type": "insurance_requirements"},
        {
            "$set": {
                "requirements": requirements,
                "updated_by": current_user["user_id"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Log the change
    await db.audit_logs.insert_one({
        "action": "insurance_requirement_updated",
        "admin_id": current_user["user_id"],
        "country_code": country_code,
        "new_requirement": requirements[country_code],
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Insurance requirement updated for {country_info['name']}",
        "data": {"requirement": requirements[country_code]}
    }


# ============================================
# Employer Insurance Document Submissions
# ============================================

@router.get("/insurance-submissions", response_model=Dict)
async def get_pending_insurance_submissions(
    status: str = "pending",
    country_code: str = None,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get employer insurance document submissions for admin review"""
    
    query = {}
    if status:
        query["status"] = status
    if country_code:
        query["country_code"] = country_code
    
    submissions = await db.employer_insurance_docs.find(
        query,
        {"_id": 0}
    ).sort("submitted_at", -1).limit(100).to_list(100)
    
    # Get employer details for each submission
    for sub in submissions:
        employer = await db.users.find_one(
            {"user_id": sub.get("employer_id")},
            {"_id": 0, "company_name": 1, "email": 1}
        )
        if employer:
            sub["company_name"] = employer.get("company_name", "Unknown")
            sub["employer_email"] = employer.get("email", "")
    
    # Get counts by status
    status_counts = {}
    for s in ["pending", "approved", "rejected", "expired"]:
        count = await db.employer_insurance_docs.count_documents({"status": s})
        status_counts[s] = count
    
    return {
        "success": True,
        "data": {
            "submissions": submissions,
            "status_counts": status_counts,
            "total": len(submissions)
        }
    }


@router.post("/insurance-submissions/{doc_id}/review", response_model=Dict)
async def review_insurance_submission(
    doc_id: str,
    data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Approve or reject an employer insurance document submission"""
    
    action = data.get("action")  # "approve" or "reject"
    rejection_reason = data.get("rejection_reason", "")
    notes = data.get("notes", "")
    
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    
    if action == "reject" and not rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    
    # Find the submission
    submission = await db.employer_insurance_docs.find_one({"doc_id": doc_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Can only review pending submissions")
    
    # Update the submission
    new_status = "approved" if action == "approve" else "rejected"
    update_data = {
        "status": new_status,
        "reviewed_by": current_user["user_id"],
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "admin_notes": notes
    }
    
    if action == "reject":
        update_data["rejection_reason"] = rejection_reason
    
    await db.employer_insurance_docs.update_one(
        {"doc_id": doc_id},
        {"$set": update_data}
    )
    
    # Update employer's compliance status if approved
    if action == "approve":
        await db.users.update_one(
            {"user_id": submission["employer_id"]},
            {"$set": {
                "insurance_verified": True,
                "insurance_verified_at": datetime.now(timezone.utc).isoformat(),
                "insurance_expiry": submission.get("expiry_date")
            }}
        )
    
    # Log the review
    await db.audit_logs.insert_one({
        "action": f"insurance_doc_{action}d",
        "admin_id": current_user["user_id"],
        "employer_id": submission["employer_id"],
        "doc_id": doc_id,
        "country_code": submission.get("country_code"),
        "rejection_reason": rejection_reason if action == "reject" else None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Insurance document {action}d successfully",
        "data": {"status": new_status}
    }
