"""
Partner API - Webhook-based integration for external platforms (e.g., CleanGrid)
Allows partners to forward jobs and receive application updates via webhooks.
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone
from database import db
import uuid
import hashlib
import hmac
import httpx
import os

router = APIRouter(prefix="/partner", tags=["Partner API"])


# ============== Models ==============

class PartnerCreate(BaseModel):
    """Register a new partner"""
    partner_name: str
    contact_email: str
    webhook_url: str  # URL to receive updates
    description: Optional[str] = None


class PartnerResponse(BaseModel):
    partner_id: str
    partner_name: str
    api_key: str
    webhook_secret: str
    message: str


class JobForward(BaseModel):
    """Job forwarded from partner platform"""
    external_job_id: str  # Partner's job ID
    title: str
    description: str
    company_name: str
    location_city: str
    location_province: str = "Ontario"
    job_type: str = "full_time"  # full_time, part_time, contract, casual
    hourly_rate_min: Optional[float] = None
    hourly_rate_max: Optional[float] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    required_skills: List[str] = []
    required_certifications: List[str] = []
    start_date: Optional[str] = None
    application_deadline: Optional[str] = None
    positions_available: int = 1
    is_coop_eligible: bool = False
    is_volunteer: bool = False
    contact_email: Optional[str] = None
    external_apply_url: Optional[str] = None  # If applications go back to partner
    metadata: Optional[Dict] = None


class ApplicationUpdate(BaseModel):
    """Application status update sent to partner"""
    external_job_id: str
    hrbank_application_id: str
    applicant_name: str
    applicant_email: str
    status: str  # applied, reviewed, interviewed, offered, hired, rejected
    updated_at: str
    notes: Optional[str] = None


# ============== Helper Functions ==============

def generate_api_key() -> str:
    """Generate a secure API key"""
    return f"hrb_pk_{uuid.uuid4().hex}{uuid.uuid4().hex[:8]}"


def generate_webhook_secret() -> str:
    """Generate a webhook signing secret"""
    return f"whsec_{uuid.uuid4().hex}"


def verify_api_key(api_key: str = Header(..., alias="X-API-Key")):
    """Dependency to verify partner API key"""
    return api_key


async def get_partner_by_api_key(api_key: str) -> Optional[dict]:
    """Get partner by API key"""
    partner = await db.partners.find_one({"api_key": api_key, "status": "active"})
    return partner


def sign_webhook_payload(payload: str, secret: str) -> str:
    """Sign webhook payload with HMAC-SHA256"""
    return hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()


async def send_webhook(url: str, payload: dict, secret: str):
    """Send webhook to partner with signature"""
    import json
    payload_str = json.dumps(payload)
    signature = sign_webhook_payload(payload_str, secret)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-HRBank-Signature": signature,
                    "X-HRBank-Timestamp": datetime.now(timezone.utc).isoformat()
                },
                timeout=30.0
            )
            return {"success": response.status_code < 400, "status_code": response.status_code}
        except Exception as e:
            return {"success": False, "error": str(e)}


# ============== Admin Endpoints ==============

@router.post("/register", response_model=PartnerResponse)
async def register_partner(
    partner_data: PartnerCreate,
    admin_key: str = Header(..., alias="X-Admin-Key")
):
    """
    Register a new partner platform (Admin only).
    Returns API key and webhook secret.
    """
    # Verify admin key (simple check - in production use proper admin auth)
    expected_admin_key = os.environ.get("PARTNER_ADMIN_KEY", "hrbank_admin_secret")
    if admin_key != expected_admin_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    # Check if partner already exists
    existing = await db.partners.find_one({"contact_email": partner_data.contact_email})
    if existing:
        raise HTTPException(status_code=400, detail="Partner with this email already exists")
    
    # Generate credentials
    partner_id = f"partner_{uuid.uuid4().hex[:12]}"
    api_key = generate_api_key()
    webhook_secret = generate_webhook_secret()
    
    partner = {
        "partner_id": partner_id,
        "partner_name": partner_data.partner_name,
        "contact_email": partner_data.contact_email,
        "webhook_url": partner_data.webhook_url,
        "description": partner_data.description,
        "api_key": api_key,
        "webhook_secret": webhook_secret,
        "status": "active",
        "created_date": datetime.now(timezone.utc).isoformat(),
        "jobs_forwarded": 0,
        "applications_sent": 0
    }
    
    await db.partners.insert_one(partner)
    
    return PartnerResponse(
        partner_id=partner_id,
        partner_name=partner_data.partner_name,
        api_key=api_key,
        webhook_secret=webhook_secret,
        message="Partner registered successfully. Store your API key and webhook secret securely."
    )


@router.get("/list")
async def list_partners(
    admin_key: str = Header(..., alias="X-Admin-Key")
):
    """List all registered partners (Admin only)"""
    expected_admin_key = os.environ.get("PARTNER_ADMIN_KEY", "hrbank_admin_secret")
    if admin_key != expected_admin_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    partners = await db.partners.find({}, {"_id": 0, "api_key": 0, "webhook_secret": 0}).to_list(100)
    return {"success": True, "data": {"partners": partners, "total": len(partners)}}


# ============== Partner Endpoints ==============

@router.post("/jobs/forward")
async def forward_job(
    job_data: JobForward,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """
    Forward a job posting from partner platform to HR Bank.
    The job will appear in HR Bank's job board.
    """
    # Verify partner
    partner = await get_partner_by_api_key(api_key)
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Check if job already exists
    existing = await db.partner_jobs.find_one({
        "partner_id": partner["partner_id"],
        "external_job_id": job_data.external_job_id
    })
    
    if existing:
        # Update existing job
        await db.partner_jobs.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                **job_data.dict(),
                "updated_date": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "success": True,
            "data": {
                "hrbank_job_id": existing["hrbank_job_id"],
                "action": "updated",
                "message": "Job posting updated successfully"
            }
        }
    
    # Create new job
    hrbank_job_id = f"pjob_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    job = {
        "hrbank_job_id": hrbank_job_id,
        "partner_id": partner["partner_id"],
        "partner_name": partner["partner_name"],
        "external_job_id": job_data.external_job_id,
        "title": job_data.title,
        "description": job_data.description,
        "company_name": job_data.company_name,
        "location_city": job_data.location_city,
        "location_province": job_data.location_province,
        "job_type": job_data.job_type,
        "hourly_rate_min": job_data.hourly_rate_min,
        "hourly_rate_max": job_data.hourly_rate_max,
        "salary_min": job_data.salary_min,
        "salary_max": job_data.salary_max,
        "required_skills": job_data.required_skills,
        "required_certifications": job_data.required_certifications,
        "start_date": job_data.start_date,
        "application_deadline": job_data.application_deadline,
        "positions_available": job_data.positions_available,
        "is_coop_eligible": job_data.is_coop_eligible,
        "is_volunteer": job_data.is_volunteer,
        "contact_email": job_data.contact_email,
        "external_apply_url": job_data.external_apply_url,
        "metadata": job_data.metadata,
        "status": "active",
        "applications_count": 0,
        "created_date": now,
        "updated_date": now
    }
    
    await db.partner_jobs.insert_one(job)
    
    # Update partner stats
    await db.partners.update_one(
        {"partner_id": partner["partner_id"]},
        {"$inc": {"jobs_forwarded": 1}}
    )
    
    return {
        "success": True,
        "data": {
            "hrbank_job_id": hrbank_job_id,
            "action": "created",
            "message": "Job posting created successfully",
            "job_url": f"https://www.hrbank.ca/jobs/{hrbank_job_id}"
        }
    }


@router.get("/jobs")
async def get_partner_jobs(
    status: Optional[str] = None,
    api_key: str = Depends(verify_api_key)
):
    """Get all jobs forwarded by this partner"""
    partner = await get_partner_by_api_key(api_key)
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    query = {"partner_id": partner["partner_id"]}
    if status:
        query["status"] = status
    
    jobs = await db.partner_jobs.find(query, {"_id": 0}).to_list(500)
    
    return {
        "success": True,
        "data": {
            "jobs": jobs,
            "total": len(jobs)
        }
    }


@router.get("/jobs/{external_job_id}")
async def get_job_by_external_id(
    external_job_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get a specific job by partner's external ID"""
    partner = await get_partner_by_api_key(api_key)
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    job = await db.partner_jobs.find_one(
        {"partner_id": partner["partner_id"], "external_job_id": external_job_id},
        {"_id": 0}
    )
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get applications for this job
    applications = await db.partner_job_applications.find(
        {"hrbank_job_id": job["hrbank_job_id"]},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": {
            "job": job,
            "applications": applications
        }
    }


@router.delete("/jobs/{external_job_id}")
async def close_job(
    external_job_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Close/deactivate a job posting"""
    partner = await get_partner_by_api_key(api_key)
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    result = await db.partner_jobs.update_one(
        {"partner_id": partner["partner_id"], "external_job_id": external_job_id},
        {"$set": {"status": "closed", "closed_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"success": True, "message": "Job closed successfully"}


@router.get("/applications")
async def get_all_applications(
    status: Optional[str] = None,
    api_key: str = Depends(verify_api_key)
):
    """Get all applications for partner's jobs"""
    partner = await get_partner_by_api_key(api_key)
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Get partner's job IDs
    jobs = await db.partner_jobs.find(
        {"partner_id": partner["partner_id"]},
        {"hrbank_job_id": 1}
    ).to_list(500)
    job_ids = [j["hrbank_job_id"] for j in jobs]
    
    query = {"hrbank_job_id": {"$in": job_ids}}
    if status:
        query["status"] = status
    
    applications = await db.partner_job_applications.find(query, {"_id": 0}).to_list(500)
    
    return {
        "success": True,
        "data": {
            "applications": applications,
            "total": len(applications)
        }
    }


# ============== Internal Endpoints (for HR Bank to notify partners) ==============

async def notify_partner_application_update(
    partner_id: str,
    application_data: dict
):
    """
    Send webhook notification to partner when application status changes.
    Called internally by HR Bank when application is updated.
    """
    partner = await db.partners.find_one({"partner_id": partner_id})
    if not partner or not partner.get("webhook_url"):
        return
    
    payload = {
        "event": "application.updated",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": application_data
    }
    
    result = await send_webhook(
        partner["webhook_url"],
        payload,
        partner["webhook_secret"]
    )
    
    # Log webhook delivery
    await db.webhook_logs.insert_one({
        "partner_id": partner_id,
        "event": "application.updated",
        "payload": payload,
        "result": result,
        "created_date": datetime.now(timezone.utc).isoformat()
    })
    
    return result


# ============== Public Job Endpoints (for HR Bank users) ==============

@router.get("/public/jobs")
async def get_public_partner_jobs(
    city: Optional[str] = None,
    job_type: Optional[str] = None,
    coop_only: bool = False,
    limit: int = 50,
    offset: int = 0
):
    """
    Get partner jobs for public job board (no auth required).
    These appear alongside HR Bank's native job postings.
    """
    query = {"status": "active"}
    
    if city:
        query["location_city"] = {"$regex": city, "$options": "i"}
    if job_type:
        query["job_type"] = job_type
    if coop_only:
        query["is_coop_eligible"] = True
    
    jobs = await db.partner_jobs.find(
        query,
        {"_id": 0, "partner_id": 0, "metadata": 0}
    ).skip(offset).limit(limit).to_list(limit)
    
    total = await db.partner_jobs.count_documents(query)
    
    return {
        "success": True,
        "data": {
            "jobs": jobs,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.post("/public/jobs/{hrbank_job_id}/apply")
async def apply_to_partner_job(
    hrbank_job_id: str,
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Apply to a partner job.
    Requires workforce authentication.
    """
    # Get auth token from header
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user (simplified - use proper auth dependency in production)
    from auth.dependencies import get_current_user
    from fastapi.security import HTTPAuthorizationCredentials
    
    token = auth_header.replace("Bearer ", "")
    
    # Get job
    job = await db.partner_jobs.find_one({"hrbank_job_id": hrbank_job_id, "status": "active"})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer active")
    
    # Get user from token (simplified)
    import jwt
    try:
        payload = jwt.decode(token, os.environ.get("JWT_SECRET", "secret"), algorithms=["HS256"])
        user_id = payload.get("user_id")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get workforce profile
    profile = await db.workforce_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=400, detail="Workforce profile not found")
    
    # Check if already applied
    existing = await db.partner_job_applications.find_one({
        "hrbank_job_id": hrbank_job_id,
        "applicant_user_id": user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this job")
    
    # Create application
    application_id = f"papp_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    application = {
        "application_id": application_id,
        "hrbank_job_id": hrbank_job_id,
        "external_job_id": job["external_job_id"],
        "partner_id": job["partner_id"],
        "applicant_user_id": user_id,
        "applicant_name": profile.get("full_name", ""),
        "applicant_email": profile.get("email", ""),
        "applicant_phone": profile.get("phone", ""),
        "status": "applied",
        "created_date": now,
        "updated_date": now
    }
    
    await db.partner_job_applications.insert_one(application)
    
    # Update job application count
    await db.partner_jobs.update_one(
        {"hrbank_job_id": hrbank_job_id},
        {"$inc": {"applications_count": 1}}
    )
    
    # Notify partner via webhook (in background)
    background_tasks.add_task(
        notify_partner_application_update,
        job["partner_id"],
        {
            "external_job_id": job["external_job_id"],
            "application_id": application_id,
            "applicant_name": profile.get("full_name", ""),
            "applicant_email": profile.get("email", ""),
            "status": "applied",
            "applied_at": now
        }
    )
    
    return {
        "success": True,
        "data": {
            "application_id": application_id,
            "message": "Application submitted successfully"
        }
    }
