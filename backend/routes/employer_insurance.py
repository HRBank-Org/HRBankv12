"""
Employer Insurance Document Routes
==================================
Allows employers to submit workers' insurance documents for their country.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Dict, Optional
from datetime import datetime, timezone
import uuid
from auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/employer/insurance", tags=["Employer Insurance"])

def get_db():
    from server import db
    return db


# Country-specific insurance names
INSURANCE_NAMES = {
    "CA": "WSIB Certificate",
    "US": "Workers' Compensation Insurance",
    "GB": "Employers' Liability Insurance",
    "AU": "WorkCover Certificate",
    "NZ": "ACC Levy Certificate",
    "DE": "Berufsgenossenschaft Certificate",
    "FR": "URSSAF Certificate",
}


@router.get("/requirements", response_model=Dict)
async def get_my_insurance_requirements(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get insurance requirements for the employer's country"""
    
    # Get employer's country from profile
    employer = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "country": 1, "province": 1, "insurance_verified": 1, "insurance_expiry": 1}
    )
    
    country_code = employer.get("country", "CA") if employer else "CA"
    
    # Get geo settings to check if country is enabled
    geo_settings = await db.platform_settings.find_one({"setting_type": "geo_access"})
    employment_countries = geo_settings.get("settings", {}).get("employment_countries", ["CA"]) if geo_settings else ["CA"]
    
    if country_code not in employment_countries:
        return {
            "success": True,
            "data": {
                "country_code": country_code,
                "requirements": None,
                "message": "Insurance verification not required for your country"
            }
        }
    
    # Get custom requirements from database
    custom_reqs = await db.platform_settings.find_one({"setting_type": "insurance_requirements"})
    custom_requirements = custom_reqs.get("requirements", {}) if custom_reqs else {}
    
    # Get requirement for this country
    if country_code in custom_requirements:
        requirement = custom_requirements[country_code]
    else:
        # Use default based on country
        requirement = {
            "name": INSURANCE_NAMES.get(country_code, "Workers' Insurance Certificate"),
            "full_name": INSURANCE_NAMES.get(country_code, "Workers' Compensation/Insurance Certificate"),
            "description": f"Proof of workers' insurance coverage required for employers",
            "required": True,
            "expiry_required": True
        }
    
    # Get current submission status
    current_submission = await db.employer_insurance_docs.find_one(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    return {
        "success": True,
        "data": {
            "country_code": country_code,
            "requirement": requirement,
            "is_verified": employer.get("insurance_verified", False) if employer else False,
            "expiry_date": employer.get("insurance_expiry") if employer else None,
            "current_submission": current_submission
        }
    }


@router.post("/submit", response_model=Dict)
async def submit_insurance_document(
    document_name: str = Form(...),
    certificate_number: str = Form(None),
    expiry_date: str = Form(None),
    notes: str = Form(None),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Submit insurance document for verification"""
    
    # Get employer's country
    employer = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "country": 1, "company_name": 1}
    )
    
    country_code = employer.get("country", "CA") if employer else "CA"
    
    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Allowed: PDF, JPEG, PNG"
        )
    
    # Check file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be under 10MB")
    
    # Generate document ID
    doc_id = f"INS-{uuid.uuid4().hex[:12].upper()}"
    
    # Store file (in production, upload to S3/cloud storage)
    import base64
    file_data = base64.b64encode(contents).decode('utf-8')
    
    # Check for existing pending submission
    existing = await db.employer_insurance_docs.find_one({
        "employer_id": current_user["user_id"],
        "status": "pending"
    })
    
    if existing:
        # Update existing submission
        await db.employer_insurance_docs.update_one(
            {"doc_id": existing["doc_id"]},
            {"$set": {
                "document_name": document_name,
                "certificate_number": certificate_number,
                "expiry_date": expiry_date,
                "notes": notes,
                "file_name": file.filename,
                "file_type": file.content_type,
                "file_data": file_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        doc_id = existing["doc_id"]
        message = "Insurance document updated successfully"
    else:
        # Create new submission
        submission = {
            "doc_id": doc_id,
            "employer_id": current_user["user_id"],
            "company_name": employer.get("company_name", "Unknown") if employer else "Unknown",
            "country_code": country_code,
            "document_name": document_name,
            "certificate_number": certificate_number,
            "expiry_date": expiry_date,
            "notes": notes,
            "file_name": file.filename,
            "file_type": file.content_type,
            "file_data": file_data,
            "status": "pending",
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.employer_insurance_docs.insert_one(submission)
        message = "Insurance document submitted for verification"
    
    return {
        "success": True,
        "message": message,
        "data": {"doc_id": doc_id, "status": "pending"}
    }


@router.get("/status", response_model=Dict)
async def get_submission_status(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get current insurance submission status"""
    
    submission = await db.employer_insurance_docs.find_one(
        {"employer_id": current_user["user_id"]},
        {"_id": 0, "file_data": 0}  # Exclude file data for lighter response
    )
    
    employer = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "insurance_verified": 1, "insurance_expiry": 1}
    )
    
    return {
        "success": True,
        "data": {
            "submission": submission,
            "is_verified": employer.get("insurance_verified", False) if employer else False,
            "expiry_date": employer.get("insurance_expiry") if employer else None
        }
    }


@router.delete("/submission", response_model=Dict)
async def delete_submission(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Delete a pending insurance submission"""
    
    result = await db.employer_insurance_docs.delete_one({
        "employer_id": current_user["user_id"],
        "status": "pending"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No pending submission found")
    
    return {
        "success": True,
        "message": "Submission deleted successfully"
    }
