"""
WorkPassport Routes - Global Credential Network
Allows anyone worldwide to build a verified credential portfolio
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from database import db
import uuid
import hashlib
import logging
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workpassport", tags=["WorkPassport"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============== Models ==============

class WorkPassportSignup(BaseModel):
    """Global WorkPassport registration - minimal requirements"""
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    country: str  # ISO country code (CA, US, UK, IN, etc.)
    city: Optional[str] = None


class WorkPassportProfile(BaseModel):
    full_name: str
    headline: Optional[str] = None  # "Certified Electrician | 5 Years Experience"
    bio: Optional[str] = None
    country: str
    city: Optional[str] = None
    skills: List[str] = []
    languages: List[str] = []
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    profile_visibility: str = "public"  # public, private, verified_only


class CredentialRequest(BaseModel):
    """Request credential verification from an institution"""
    institution_id: str
    credential_type: str  # certificate, diploma, license, skill_badge
    credential_name: str
    issue_date: str
    expiry_date: Optional[str] = None
    credential_id: Optional[str] = None  # External ID from institution
    supporting_documents: List[str] = []  # URLs to uploaded docs


# ============== Helpers ==============

def gen_id(prefix=""):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def generate_passport_id():
    """Generate a unique WorkPassport ID like WP-XXXX-XXXX-XXXX"""
    parts = [uuid.uuid4().hex[:4].upper() for _ in range(3)]
    return f"WP-{'-'.join(parts)}"


def generate_share_token():
    """Generate a shareable profile token"""
    return uuid.uuid4().hex[:16]


# ============== Registration ==============

@router.post("/register")
async def register_workpassport(data: WorkPassportSignup):
    """
    Register a new WorkPassport account.
    Available globally - no work eligibility required.
    """
    # Check if email exists
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    now = datetime.now(timezone.utc).isoformat()
    user_id = gen_id("wp")
    passport_id = generate_passport_id()
    share_token = generate_share_token()
    
    # Create user account
    user = {
        "user_id": user_id,
        "email": data.email.lower(),
        "password_hash": pwd_context.hash(data.password),
        "user_type": "workpassport",  # New user type
        "status": "active",
        "email_verified": False,
        "created_date": now,
        "last_login": now
    }
    await db.users.insert_one(user)
    
    # Create WorkPassport profile
    profile = {
        "user_id": user_id,
        "passport_id": passport_id,  # Public ID like WP-ABCD-1234-EFGH
        "share_token": share_token,  # For shareable profile links
        "email": data.email.lower(),
        "full_name": data.full_name,
        "headline": None,
        "bio": None,
        "country": data.country.upper(),
        "city": data.city,
        "skills": [],
        "languages": [],
        "profile_photo": None,
        "profile_visibility": "public",
        
        # Credential stats
        "total_credentials": 0,
        "verified_credentials": 0,
        "pending_credentials": 0,
        
        # Engagement
        "profile_views": 0,
        "credential_verifications": 0,  # Times employers verified
        
        # Premium features
        "is_premium": False,
        "premium_until": None,
        
        # Upgrade path
        "upgraded_to_workforce": False,
        "workforce_region": None,
        
        "created_date": now,
        "updated_date": now
    }
    await db.workpassport_profiles.insert_one(profile)
    
    # Send verification email
    try:
        from utils.email_service import EmailService
        email_service = EmailService()
        
        # Generate verification token
        verification_token = uuid.uuid4().hex
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        # Store verification token
        await db.email_verifications.insert_one({
            "user_id": user_id,
            "email": data.email.lower(),
            "token": verification_token,
            "expires_at": expires_at.isoformat(),
            "verified": False,
            "created_at": now
        })
        
        # Send email
        await email_service.send_verification_email(
            to_email=data.email.lower(),
            full_name=data.full_name,
            verification_token=verification_token
        )
        logger.info(f"Verification email sent to {data.email}")
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
        # Don't fail signup if email fails - log it for debugging
        print(f"📧 Email verification link: /verify-email?token={verification_token}")
    
    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "passport_id": passport_id,
            "share_url": f"/passport/{share_token}",
            "message": "WorkPassport created! Verify your email to unlock all features."
        }
    }


# ============== Profile Management ==============

@router.get("/profile")
async def get_my_profile(user_id: str = Header(..., alias="X-User-ID")):
    """Get current user's WorkPassport profile"""
    profile = await db.workpassport_profiles.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {"success": True, "data": {"profile": profile}}


@router.patch("/profile")
async def update_profile(
    updates: WorkPassportProfile,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Update WorkPassport profile"""
    profile = await db.workpassport_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    update_data["updated_date"] = datetime.now(timezone.utc).isoformat()
    
    await db.workpassport_profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Profile updated"}


@router.get("/profile/share-link")
async def get_share_link(user_id: str = Header(..., alias="X-User-ID")):
    """Get shareable profile link"""
    profile = await db.workpassport_profiles.find_one(
        {"user_id": user_id},
        {"share_token": 1, "passport_id": 1}
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {
        "success": True,
        "data": {
            "share_url": f"/passport/{profile['share_token']}",
            "passport_id": profile["passport_id"],
            "full_url": f"https://hrbank.ca/passport/{profile['share_token']}"
        }
    }


class ProfileUpdate(BaseModel):
    """Profile update request"""
    full_name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    profile_visibility: Optional[str] = None


@router.put("/profile")
async def update_profile(
    data: ProfileUpdate,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Update WorkPassport profile"""
    profile = await db.workpassport_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Build update dict with only provided fields
    update_data = {"updated_date": now}
    
    if data.full_name is not None:
        update_data["full_name"] = data.full_name
    if data.country is not None:
        update_data["country"] = data.country
    if data.city is not None:
        update_data["city"] = data.city
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.bio is not None:
        update_data["bio"] = data.bio
    if data.profile_visibility is not None:
        if data.profile_visibility not in ["public", "employers", "private"]:
            raise HTTPException(status_code=400, detail="Invalid visibility option")
        update_data["profile_visibility"] = data.profile_visibility
    
    await db.workpassport_profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Profile updated successfully"
    }



# ============== Credentials ==============

@router.get("/credentials")
async def get_my_credentials(
    status: Optional[str] = None,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Get all blockchain-verified credentials for current user"""
    # Query blockchain_credentials - the unified collection for all verified credentials
    query = {"worker_id": user_id}
    if status:
        query["status"] = status
    
    credentials = await db.blockchain_credentials.find(
        query, {"_id": 0}
    ).sort("issue_date", -1).to_list(100)
    
    # Group by status
    verified = [c for c in credentials if c.get("status") in ["verified", "issued"]]
    pending = [c for c in credentials if c.get("status") == "pending"]
    
    return {
        "success": True,
        "data": {
            "credentials": credentials,
            "summary": {
                "total": len(credentials),
                "verified": len(verified),
                "pending": len(pending)
            }
        }
    }


# DEPRECATED: User-initiated credential request removed
# All credentials must now be issued by institutions via /credential-payments/issue-pending
# This ensures trust - institutions decide who gets credentials, not users claiming them
# @router.post("/credentials/request") - REMOVED


# DEPRECATED: Self-reported credentials removed to maintain trust and verification integrity
# All credentials must now be issued by verified institutions
# @router.post("/credentials/add-self") - REMOVED
# Users should get credentials from institutions via /credential-payments/issue-pending


# ============== Public Profile & Verification ==============

@router.get("/public/{share_token}")
async def get_public_profile(share_token: str):
    """
    Get public WorkPassport profile by share token.
    No authentication required - for sharing with employers.
    """
    profile = await db.workpassport_profiles.find_one(
        {"share_token": share_token},
        {"_id": 0, "user_id": 0, "share_token": 0}  # Hide sensitive fields
    )
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if profile.get("profile_visibility") == "private":
        raise HTTPException(status_code=403, detail="This profile is private")
    
    # Get user_id from profile to find their blockchain credentials
    full_profile = await db.workpassport_profiles.find_one(
        {"passport_id": profile["passport_id"]},
        {"user_id": 1}
    )
    
    # Get verified blockchain credentials for public view
    credentials = await db.blockchain_credentials.find(
        {"worker_id": full_profile["user_id"], "status": {"$in": ["verified", "issued"]}},
        {"_id": 0, "worker_id": 0}
    ).to_list(50)
    
    # Increment view count
    await db.workpassport_profiles.update_one(
        {"passport_id": profile["passport_id"]},
        {"$inc": {"profile_views": 1}}
    )
    
    return {
        "success": True,
        "data": {
            "profile": profile,
            "credentials": credentials
        }
    }


@router.get("/verify/{passport_id}/{credential_id}")
async def verify_credential(passport_id: str, credential_id: str):
    """
    Public endpoint for employers to verify a credential.
    Returns verification status and details.
    """
    credential = await db.blockchain_credentials.find_one(
        {"credential_id": credential_id},
        {"_id": 0}
    )
    
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    # Increment verification count
    await db.blockchain_credentials.update_one(
        {"credential_id": credential_id},
        {"$inc": {"verification_count": 1}}
    )
    
    # Log verification for analytics
    await db.credential_verifications.insert_one({
        "verification_id": gen_id("ver"),
        "credential_id": credential_id,
        "passport_id": passport_id,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "ip_hash": None  # Could hash requester IP for analytics
    })
    
    is_valid = credential.get("status") in ["verified", "issued"]
    is_expired = False
    if credential.get("expiry_date"):
        try:
            expiry = datetime.fromisoformat(credential["expiry_date"].replace("Z", "+00:00"))
            is_expired = expiry < datetime.now(timezone.utc)
        except:
            pass
    
    return {
        "success": True,
        "data": {
            "is_valid": is_valid and not is_expired,
            "status": credential.get("status"),
            "credential_name": credential.get("credential_name"),
            "credential_type": credential.get("credential_type"),
            "institution_name": credential.get("institution_name"),
            "issue_date": credential.get("issue_date"),
            "expiry_date": credential.get("expiry_date"),
            "is_expired": is_expired,
            "verified_date": credential.get("verified_date"),
            "blockchain_hash": credential.get("credential_hash"),
            "blockchain_tx": credential.get("blockchain_transaction_hash"),
            "ipfs_url": credential.get("ipfs_url")
        }
    }


# ============== Upgrade to Workforce ==============

@router.post("/upgrade-to-workforce")
async def upgrade_to_workforce(
    data: dict,
    user_id: str = Header(..., alias="X-User-ID")
):
    """
    Upgrade WorkPassport to full Workforce account.
    Requires work eligibility verification for the target region.
    """
    profile = await db.workpassport_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if profile.get("upgraded_to_workforce"):
        raise HTTPException(status_code=400, detail="Already upgraded to Workforce")
    
    region = data.get("region", "CA")  # Default to Canada
    
    # Supported regions for workforce
    SUPPORTED_REGIONS = ["CA"]  # Expand later: UK, AU, US, etc.
    
    if region not in SUPPORTED_REGIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Workforce accounts not yet available in {region}. Coming soon!"
        )
    
    # For now, mark as pending upgrade - will need work eligibility verification
    await db.workpassport_profiles.update_one(
        {"user_id": user_id},
        {"$set": {
            "upgrade_requested": True,
            "upgrade_region": region,
            "upgrade_requested_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "data": {
            "status": "pending",
            "region": region,
            "message": "Upgrade requested. Complete work eligibility verification to activate Workforce features.",
            "next_steps": [
                "Verify your identity",
                "Confirm work eligibility for Canada",
                "Complete workforce profile"
            ]
        }
    }


# ============== Institution Credential Issuance ==============
# NOTE: Institutions should use /api/credential-payments/issue-pending for credential issuance
# This ensures proper payment flow and blockchain verification


# ============== WorkPassport Occupations ==============

class OccupationProfile(BaseModel):
    """Occupation profile for WorkPassport users"""
    occupation_title: str
    years_of_experience: int = 0
    skill_level: str = "intermediate"  # beginner, intermediate, advanced, expert
    description: Optional[str] = None
    skills: List[str] = []


@router.get("/occupations")
async def get_user_occupations(
    user_id: str = Header(..., alias="X-User-ID")
):
    """Get all occupation profiles for a WorkPassport user"""
    profile = await db.workpassport_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    occupations = await db.workpassport_occupations.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(50)
    
    return {
        "success": True,
        "data": {
            "occupations": occupations,
            "total": len(occupations)
        }
    }


@router.post("/occupations")
async def create_occupation(
    data: OccupationProfile,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Create a new occupation profile (max 3 allowed)"""
    profile = await db.workpassport_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Check occupation limit (same as Workforce - max 3)
    existing_count = await db.workpassport_occupations.count_documents({"user_id": user_id})
    if existing_count >= 3:
        raise HTTPException(
            status_code=400, 
            detail="Maximum of 3 occupation profiles allowed. Please delete an existing one to add a new one."
        )
    
    now = datetime.now(timezone.utc).isoformat()
    occupation_id = gen_id("occ")
    
    occupation = {
        "occupation_id": occupation_id,
        "user_id": user_id,
        "passport_id": profile["passport_id"],
        "occupation_title": data.occupation_title,
        "years_of_experience": data.years_of_experience,
        "skill_level": data.skill_level,
        "description": data.description,
        "skills": data.skills,
        "created_date": now,
        "updated_date": now
    }
    
    await db.workpassport_occupations.insert_one(occupation)
    
    # Update profile stats
    await db.workpassport_profiles.update_one(
        {"user_id": user_id},
        {"$inc": {"occupation_count": 1}}
    )
    
    return {
        "success": True,
        "data": {"occupation_id": occupation_id},
        "message": "Occupation profile created successfully"
    }


@router.put("/occupations/{occupation_id}")
async def update_occupation(
    occupation_id: str,
    data: OccupationProfile,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Update an existing occupation profile"""
    occupation = await db.workpassport_occupations.find_one({
        "occupation_id": occupation_id,
        "user_id": user_id
    })
    
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.workpassport_occupations.update_one(
        {"occupation_id": occupation_id},
        {"$set": {
            "occupation_title": data.occupation_title,
            "years_of_experience": data.years_of_experience,
            "skill_level": data.skill_level,
            "description": data.description,
            "skills": data.skills,
            "updated_date": now
        }}
    )
    
    return {
        "success": True,
        "message": "Occupation profile updated successfully"
    }


@router.delete("/occupations/{occupation_id}")
async def delete_occupation(
    occupation_id: str,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Delete an occupation profile"""
    occupation = await db.workpassport_occupations.find_one({
        "occupation_id": occupation_id,
        "user_id": user_id
    })
    
    if not occupation:
        raise HTTPException(status_code=404, detail="Occupation not found")
    
    await db.workpassport_occupations.delete_one({"occupation_id": occupation_id})
    
    # Update profile stats
    await db.workpassport_profiles.update_one(
        {"user_id": user_id},
        {"$inc": {"occupation_count": -1}}
    )
    
    return {
        "success": True,
        "message": "Occupation profile deleted successfully"
    }



# ============== Job Viewing for WorkPassport Users ==============

@router.get("/jobs")
async def view_available_jobs(
    user_id: str = Header(..., alias="X-User-ID"),
    location: Optional[str] = None,
    occupation: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """
    View job postings available in Canada.
    WorkPassport users can view jobs but must upgrade to Workforce to apply.
    """
    profile = await db.workpassport_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    is_canadian = profile.get("country") == "CA"
    
    # Build query for active jobs
    query = {"status": "active"}
    
    if location:
        query["$or"] = [
            {"city": {"$regex": location, "$options": "i"}},
            {"province": {"$regex": location, "$options": "i"}}
        ]
    
    if occupation:
        query["position_title"] = {"$regex": occupation, "$options": "i"}
    
    # Get jobs from the jobs collection
    skip = (page - 1) * limit
    jobs = await db.jobs.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.jobs.count_documents(query)
    
    # Add upgrade prompt info
    for job in jobs:
        job["can_apply"] = False
        job["upgrade_required"] = True
        if is_canadian:
            job["upgrade_message"] = "Upgrade to Workforce to apply for this job"
        else:
            job["upgrade_message"] = "This job requires Canadian work authorization. Upgrade to Workforce if you have work eligibility."
    
    return {
        "success": True,
        "data": {
            "jobs": jobs,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "user_country": profile.get("country"),
            "can_apply_directly": False,
            "upgrade_info": {
                "required": True,
                "is_canadian": is_canadian,
                "message": "Upgrade to a Workforce account to apply for jobs, manage shifts, and access payroll features." if is_canadian else "Job marketplace features are currently available for Canadian workers. Build your credential portfolio to prepare for when we expand to your region."
            }
        }
    }


@router.get("/jobs/{job_id}")
async def view_job_details(
    job_id: str,
    user_id: str = Header(..., alias="X-User-ID")
):
    """
    View detailed job posting.
    WorkPassport users see job details but with upgrade prompt.
    """
    profile = await db.workpassport_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get employer info
    employer = await db.employer_profiles.find_one(
        {"employer_id": job.get("employer_id")},
        {"_id": 0, "company_name": 1, "logo_url": 1, "city": 1, "province": 1}
    )
    
    is_canadian = profile.get("country") == "CA"
    
    # Track job view
    await db.workpassport_profiles.update_one(
        {"user_id": user_id},
        {"$inc": {"jobs_viewed": 1}}
    )
    
    return {
        "success": True,
        "data": {
            "job": job,
            "employer": employer,
            "can_apply": False,
            "upgrade_required": True,
            "upgrade_info": {
                "is_canadian": is_canadian,
                "title": "Upgrade to Apply" if is_canadian else "Coming Soon to Your Region",
                "message": "To apply for this job, you need a Workforce account which requires Canadian work eligibility verification." if is_canadian else "Job applications are currently available for Canadian workers. We're expanding to more regions soon!",
                "cta_text": "Upgrade to Workforce" if is_canadian else "Build Your Portfolio",
                "cta_link": "/workpassport/upgrade" if is_canadian else "/workpassport/credentials"
            }
        }
    }


# ============== Credential System ==============
# NOTE: All credentials are now managed through /api/credential-payments
# - Institutions issue credentials via /api/credential-payments/issue-pending
# - Users pay and claim via /api/credential-payments/initiate-payment
# - All credentials stored in blockchain_credentials collection
# The /credentials GET endpoint is defined above (line ~264)
