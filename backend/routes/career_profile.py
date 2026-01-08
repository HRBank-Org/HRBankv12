"""Verified Career Profile - Public shareable profile for workforce users"""
from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid
import hashlib
import qrcode
import io
import base64
import os

router = APIRouter(prefix="/career-profile", tags=["Career Profile"])

def get_db():
    from server import db
    return db

# Default privacy settings - all public by default
DEFAULT_PRIVACY_SETTINGS = {
    "show_full_name": True,
    "show_photo": True,
    "show_location": True,  # City, Province, Country only
    "show_occupation_profiles": True,
    "show_experience": True,
    "show_credentials": True,
    "show_skills": True,
    "show_ratings": True,
    "show_hours_worked": True,
    "show_employment_history": True,
    "profile_visibility": "public"  # public, private, or link_only
}

def generate_profile_code(workforce_id: str) -> str:
    """Generate a unique 8-character profile code"""
    hash_input = f"{workforce_id}-{datetime.now(timezone.utc).timestamp()}"
    hash_value = hashlib.sha256(hash_input.encode()).hexdigest()
    return hash_value[:8].upper()

def generate_qr_code(url: str) -> str:
    """Generate QR code as base64 data URL"""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#1f2937", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

@router.get("/my-settings", response_model=Dict)
async def get_my_privacy_settings(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get current user's Work Passport privacy settings"""
    settings = await db.career_profile_settings.find_one(
        {"workforce_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not settings:
        # Create default settings
        settings = {
            "workforce_id": current_user["user_id"],
            "profile_code": generate_profile_code(current_user["user_id"]),
            "privacy": DEFAULT_PRIVACY_SETTINGS.copy(),
            "created_date": datetime.now(timezone.utc).isoformat(),
            "updated_date": datetime.now(timezone.utc).isoformat()
        }
        await db.career_profile_settings.insert_one(settings)
        settings.pop("_id", None)
    
    # Generate profile URL and QR code (using /passport URL)
    frontend_url = os.environ.get('FRONTEND_URL', 'https://hrbank.ca')
    profile_url = f"{frontend_url}/passport/{settings['profile_code']}"
    qr_code = generate_qr_code(profile_url)
    
    return {
        "success": True,
        "data": {
            **settings,
            "profile_url": profile_url,
            "qr_code": qr_code
        }
    }

@router.patch("/my-settings", response_model=Dict)
async def update_privacy_settings(
    privacy_updates: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Update career profile privacy settings"""
    # Get existing settings or create new
    existing = await db.career_profile_settings.find_one(
        {"workforce_id": current_user["user_id"]}
    )
    
    if not existing:
        # Create with defaults
        settings = {
            "workforce_id": current_user["user_id"],
            "profile_code": generate_profile_code(current_user["user_id"]),
            "privacy": DEFAULT_PRIVACY_SETTINGS.copy(),
            "created_date": datetime.now(timezone.utc).isoformat(),
            "updated_date": datetime.now(timezone.utc).isoformat()
        }
        await db.career_profile_settings.insert_one(settings)
        existing = settings
    
    # Update privacy settings
    current_privacy = existing.get("privacy", DEFAULT_PRIVACY_SETTINGS.copy())
    
    # Only allow updating valid privacy keys
    valid_keys = set(DEFAULT_PRIVACY_SETTINGS.keys())
    for key, value in privacy_updates.items():
        if key in valid_keys:
            current_privacy[key] = value
    
    await db.career_profile_settings.update_one(
        {"workforce_id": current_user["user_id"]},
        {
            "$set": {
                "privacy": current_privacy,
                "updated_date": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "data": {"privacy": current_privacy},
        "message": "Privacy settings updated successfully"
    }

@router.post("/regenerate-code", response_model=Dict)
async def regenerate_profile_code(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Regenerate the profile share code (invalidates old links)"""
    new_code = generate_profile_code(current_user["user_id"])
    
    await db.career_profile_settings.update_one(
        {"workforce_id": current_user["user_id"]},
        {
            "$set": {
                "profile_code": new_code,
                "updated_date": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    frontend_url = os.environ.get('FRONTEND_URL', 'https://hrbank.ca')
    profile_url = f"{frontend_url}/passport/{new_code}"
    qr_code = generate_qr_code(profile_url)
    
    return {
        "success": True,
        "data": {
            "profile_code": new_code,
            "profile_url": profile_url,
            "qr_code": qr_code
        },
        "message": "Work Passport code regenerated. Old links will no longer work."
    }

@router.get("/public/{profile_code}", response_model=Dict)
async def get_public_career_profile(
    profile_code: str,
    db = Depends(get_db)
):
    """
    Public endpoint - Get verified career profile by share code.
    No authentication required.
    Returns only data allowed by privacy settings.
    """
    # Find settings by profile code
    settings = await db.career_profile_settings.find_one(
        {"profile_code": profile_code.upper()},
        {"_id": 0}
    )
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found or has been removed"
        )
    
    workforce_id = settings["workforce_id"]
    privacy = settings.get("privacy", DEFAULT_PRIVACY_SETTINGS)
    
    # Check if profile is public
    if privacy.get("profile_visibility") == "private":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This profile is private"
        )
    
    # Get user basic info
    user = await db.users.find_one(
        {"user_id": workforce_id},
        {"_id": 0, "full_name": 1, "created_date": 1}
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Get workforce profile
    profile = await db.workforce_profiles.find_one(
        {"workforce_id": workforce_id},
        {"_id": 0}
    )
    
    # Get name from workforce profile first, then user
    full_name = None
    if profile:
        full_name = profile.get("full_name") or f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
    if not full_name:
        full_name = user.get("full_name")
    
    # Build public profile based on privacy settings
    public_profile = {
        "profile_code": profile_code.upper(),
        "verified": True,
        "member_since": user.get("created_date")
    }
    
    # Name
    if privacy.get("show_full_name", True):
        public_profile["full_name"] = full_name or "HR Bank Member"
    else:
        # Show initials only
        name = full_name or ""
        if name:
            parts = name.split()
            public_profile["full_name"] = f"{parts[0][0]}. {parts[-1][0]}." if len(parts) > 1 else f"{parts[0][0]}."
        else:
            public_profile["full_name"] = "HR Bank Member"
    
    # Photo
    if privacy.get("show_photo", True) and profile:
        # Try both field names - profile_photo_url is the actual field name used
        photo = profile.get("profile_photo_url") or profile.get("photo_url", "")
        public_profile["photo_url"] = photo
    
    # Location (city, province, country only - never address)
    if privacy.get("show_location", True) and profile:
        public_profile["location"] = {
            "city": profile.get("city", ""),
            "province": profile.get("province", ""),
            "country": "Canada"
        }
    
    # Get occupation profiles
    occupation_profiles = []
    if privacy.get("show_occupation_profiles", True):
        occupations = await db.occupation_profiles.find(
            {"workforce_id": workforce_id},
            {"_id": 0}
        ).to_list(3)
        
        for occ in occupations:
            occ_data = {
                "occupation_id": occ.get("occupation_id"),
                "occupation_title": occ.get("occupation_title"),
                "occupation_category": occ.get("occupation_category")
            }
            
            # Experience stats
            if privacy.get("show_experience", True):
                occ_data["years_of_experience"] = occ.get("years_of_experience", 0)
            
            if privacy.get("show_hours_worked", True):
                occ_data["total_hours_worked"] = round(occ.get("total_hours_worked", 0))
            
            if privacy.get("show_ratings", True):
                occ_data["skill_rating_avg"] = occ.get("skill_rating_avg")
                occ_data["skill_rating_count"] = occ.get("skill_rating_count", 0)
            
            # Skills
            if privacy.get("show_skills", True):
                occ_data["skills"] = occ.get("skills", [])
            
            # Credentials/Certifications
            if privacy.get("show_credentials", True):
                credential_ids = occ.get("certifications", [])
                credentials = []
                for cred_id in credential_ids:
                    cred = await db.workforce_credentials.find_one(
                        {"credential_id": cred_id, "status": "verified"},
                        {"_id": 0}
                    )
                    if cred:
                        credentials.append({
                            "credential_name": cred.get("credential_name"),
                            "credential_type": cred.get("credential_type"),
                            "institution_name": cred.get("institution_name"),
                            "issue_date": cred.get("issue_date"),
                            "expiry_date": cred.get("expiry_date"),
                            "verified": True
                        })
                occ_data["credentials"] = credentials
            
            # Employment history
            if privacy.get("show_employment_history", True):
                employment = await db.employment_relationships.find(
                    {"workforce_id": workforce_id},
                    {"_id": 0}
                ).to_list(None)
                
                emp_history = []
                for emp in employment:
                    employer = await db.employer_profiles.find_one(
                        {"employer_id": emp.get("employer_id")},
                        {"company_name": 1, "_id": 0}
                    )
                    emp_history.append({
                        "company_name": employer.get("company_name", "Company") if employer else "Company",
                        "position_title": emp.get("position_title"),
                        "status": emp.get("status"),
                        "total_shifts": emp.get("total_shifts_completed", 0),
                        "total_hours": round(emp.get("total_hours_worked", 0))
                    })
                occ_data["employment_history"] = emp_history
            
            occupation_profiles.append(occ_data)
    
    public_profile["occupation_profiles"] = occupation_profiles
    
    # Get blockchain credentials
    blockchain_credentials = []
    if privacy.get("show_credentials", True):
        bc_creds = await db.blockchain_credentials.find(
            {"worker_id": workforce_id, "status": "issued"},
            {"_id": 0}
        ).to_list(20)
        
        for cred in bc_creds:
            blockchain_credentials.append({
                "credential_id": cred.get("credential_id"),
                "credential_name": cred.get("credential_name"),
                "program_name": cred.get("program_name"),
                "issue_date": cred.get("issue_date"),
                "institution_id": cred.get("institution_id"),
                "on_chain": cred.get("on_chain", False),
                "blockchain_status": cred.get("blockchain_status"),
                "verification_url": cred.get("verification_url")
            })
            
            # Get institution name
            inst = await db.institution_profiles.find_one(
                {"institution_id": cred.get("institution_id")},
                {"institution_name": 1, "_id": 0}
            )
            if inst:
                blockchain_credentials[-1]["institution_name"] = inst.get("institution_name")
    
    public_profile["blockchain_credentials"] = blockchain_credentials
    
    # Calculate summary stats
    total_hours = sum(occ.get("total_hours_worked", 0) for occ in occupation_profiles if "total_hours_worked" in occ)
    total_experience = max((occ.get("years_of_experience", 0) for occ in occupation_profiles), default=0)
    avg_rating = None
    ratings = [occ.get("skill_rating_avg") for occ in occupation_profiles if occ.get("skill_rating_avg")]
    if ratings:
        avg_rating = round(sum(ratings) / len(ratings), 1)
    
    public_profile["summary"] = {
        "total_occupations": len(occupation_profiles),
        "total_hours_worked": round(total_hours) if privacy.get("show_hours_worked", True) else None,
        "years_of_experience": total_experience if privacy.get("show_experience", True) else None,
        "average_rating": avg_rating if privacy.get("show_ratings", True) else None,
        "verified_credentials": len(blockchain_credentials),
        "is_blockchain_verified": len(blockchain_credentials) > 0
    }
    
    # Track profile view
    await db.career_profile_views.insert_one({
        "profile_code": profile_code.upper(),
        "workforce_id": workforce_id,
        "viewed_at": datetime.now(timezone.utc).isoformat(),
        "source": "public_link"
    })
    
    # Update view count
    await db.career_profile_settings.update_one(
        {"profile_code": profile_code.upper()},
        {"$inc": {"view_count": 1}}
    )
    
    return {
        "success": True,
        "data": public_profile
    }

@router.get("/stats", response_model=Dict)
async def get_profile_stats(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get profile view statistics"""
    settings = await db.career_profile_settings.find_one(
        {"workforce_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not settings:
        return {
            "success": True,
            "data": {
                "total_views": 0,
                "views_this_month": 0,
                "views_this_week": 0
            }
        }
    
    # Get view counts
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()
    
    views_this_week = await db.career_profile_views.count_documents({
        "workforce_id": current_user["user_id"],
        "viewed_at": {"$gte": week_ago}
    })
    
    views_this_month = await db.career_profile_views.count_documents({
        "workforce_id": current_user["user_id"],
        "viewed_at": {"$gte": month_ago}
    })
    
    return {
        "success": True,
        "data": {
            "total_views": settings.get("view_count", 0),
            "views_this_month": views_this_month,
            "views_this_week": views_this_week
        }
    }
