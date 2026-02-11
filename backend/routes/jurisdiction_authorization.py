"""
Jurisdiction Authorization Routes
=================================
Manages employer jurisdiction authorization for multi-province/state operations.

Key Concepts:
- Employers are locked to their registration jurisdiction upon account creation
- To expand to other provinces/states, they must submit an expansion request
- HR Bank staff review and approve/reject expansion requests
- This integrates with the geo-access system for country-level controls
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from auth.dependencies import get_current_user, require_role
from utils.jurisdiction import (
    get_jurisdiction_from_address,
    get_compliance_rules,
    JURISDICTIONS,
    COMPLIANCE_RULES
)

router = APIRouter(prefix="/api/jurisdiction", tags=["Jurisdiction Authorization"])

def get_db():
    from server import db
    return db


# ==================== PYDANTIC MODELS ====================

class ExpansionRequestCreate(BaseModel):
    """Request to expand operations to a new jurisdiction"""
    target_jurisdiction: str  # e.g., "CA-BC", "US-TX"
    business_registration_number: str
    tax_registration_number: Optional[str] = None
    notes: Optional[str] = None


class ExpansionRequestReview(BaseModel):
    """Admin review of expansion request"""
    action: str  # "approve" or "reject"
    rejection_reason: Optional[str] = None
    admin_notes: Optional[str] = None


# ==================== EMPLOYER ENDPOINTS ====================

@router.get("/my-authorizations")
async def get_my_jurisdiction_authorizations(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get employer's current authorized jurisdictions.
    Shows where they can create workplaces and roles.
    """
    employer_id = current_user["user_id"]
    
    # Get employer profile
    employer = await db.employer_profiles.find_one(
        {"employer_id": employer_id},
        {"_id": 0}
    )
    
    if not employer:
        raise HTTPException(status_code=404, detail="Employer profile not found")
    
    # Get authorized jurisdictions (default to registration jurisdiction)
    authorized = employer.get("authorized_jurisdictions", [])
    
    # If no authorized jurisdictions set, derive from registration province
    if not authorized:
        province = employer.get("province", "ON")
        country = employer.get("country", "CA")
        
        # Create jurisdiction code
        if country == "CA":
            jurisdiction_code = f"CA-{province}"
        elif country == "US":
            jurisdiction_code = f"US-{province}"
        else:
            jurisdiction_code = f"{country}-{province}" if province else country
        
        authorized = [jurisdiction_code]
        
        # Update employer with default authorization
        await db.employer_profiles.update_one(
            {"employer_id": employer_id},
            {"$set": {"authorized_jurisdictions": authorized}}
        )
    
    # Enrich with jurisdiction details
    enriched = []
    for code in authorized:
        info = JURISDICTIONS.get(code, {})
        rules = COMPLIANCE_RULES.get(code, {})
        enriched.append({
            "jurisdiction_code": code,
            "name": info.get("name", code),
            "country": info.get("country", "Unknown"),
            "country_code": info.get("country_code", ""),
            "minimum_wage": rules.get("minimum_wage"),
            "currency": rules.get("currency"),
            "compliance_badges": rules.get("compliance_badges", []),
            "is_primary": code == authorized[0]  # First one is primary (registration)
        })
    
    # Get pending expansion requests
    pending_requests = await db.jurisdiction_expansion_requests.find(
        {"employer_id": employer_id, "status": "pending"},
        {"_id": 0}
    ).to_list(20)
    
    return {
        "success": True,
        "data": {
            "authorized_jurisdictions": enriched,
            "pending_expansion_requests": pending_requests,
            "primary_jurisdiction": authorized[0] if authorized else None
        }
    }


@router.post("/request-expansion")
async def request_jurisdiction_expansion(
    request_data: ExpansionRequestCreate,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Request authorization to operate in a new jurisdiction.
    Requires business registration proof for the target jurisdiction.
    """
    employer_id = current_user["user_id"]
    target = request_data.target_jurisdiction.upper()
    
    # Validate target jurisdiction exists
    if target not in JURISDICTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid jurisdiction code: {target}. Use format like CA-ON, US-TX"
        )
    
    # Get employer profile
    employer = await db.employer_profiles.find_one(
        {"employer_id": employer_id},
        {"_id": 0}
    )
    
    if not employer:
        raise HTTPException(status_code=404, detail="Employer profile not found")
    
    # Check if already authorized
    authorized = employer.get("authorized_jurisdictions", [])
    if target in authorized:
        raise HTTPException(
            status_code=400,
            detail=f"You are already authorized to operate in {JURISDICTIONS[target]['name']}"
        )
    
    # Check if there's already a pending request for this jurisdiction
    existing = await db.jurisdiction_expansion_requests.find_one({
        "employer_id": employer_id,
        "target_jurisdiction": target,
        "status": "pending"
    })
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"You already have a pending expansion request for {JURISDICTIONS[target]['name']}"
        )
    
    # Get target jurisdiction info
    target_info = JURISDICTIONS[target]
    
    # Create expansion request
    request_id = f"exp_{uuid.uuid4().hex[:12]}"
    expansion_request = {
        "request_id": request_id,
        "employer_id": employer_id,
        "company_name": employer.get("company_name"),
        "current_jurisdictions": authorized,
        "target_jurisdiction": target,
        "target_jurisdiction_name": target_info.get("name"),
        "target_country": target_info.get("country"),
        "target_country_code": target_info.get("country_code"),
        "business_registration_number": request_data.business_registration_number,
        "tax_registration_number": request_data.tax_registration_number,
        "employer_notes": request_data.notes,
        "required_documents": get_required_documents_for_jurisdiction(target),
        "documents_submitted": [],  # Will be populated when docs are uploaded
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": None,
        "reviewed_at": None,
        "admin_notes": None,
        "rejection_reason": None
    }
    
    await db.jurisdiction_expansion_requests.insert_one(expansion_request)
    
    # Log the request
    await db.audit_logs.insert_one({
        "action": "jurisdiction_expansion_requested",
        "employer_id": employer_id,
        "target_jurisdiction": target,
        "request_id": request_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Expansion request submitted for {target_info['name']}. HR Bank will review your application.",
        "data": {
            "request_id": request_id,
            "target_jurisdiction": target,
            "status": "pending",
            "required_documents": expansion_request["required_documents"]
        }
    }


@router.post("/expansion-request/{request_id}/upload-document")
async def upload_expansion_document(
    request_id: str,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Upload a supporting document for an expansion request.
    Document types: business_registration, tax_certificate, insurance_certificate, other
    """
    employer_id = current_user["user_id"]
    
    # Find the request
    request = await db.jurisdiction_expansion_requests.find_one({
        "request_id": request_id,
        "employer_id": employer_id
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Expansion request not found")
    
    if request.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Can only upload documents for pending requests")
    
    # Save file (in production, upload to S3/cloud storage)
    import os
    upload_dir = "/app/uploads/expansion_docs"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    saved_filename = f"{request_id}_{document_type}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = f"{upload_dir}/{saved_filename}"
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Add document to request
    doc_record = {
        "document_type": document_type,
        "original_filename": file.filename,
        "saved_filename": saved_filename,
        "file_path": file_path,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.jurisdiction_expansion_requests.update_one(
        {"request_id": request_id},
        {"$push": {"documents_submitted": doc_record}}
    )
    
    return {
        "success": True,
        "message": f"Document '{document_type}' uploaded successfully",
        "data": {"document": doc_record}
    }


@router.get("/expansion-request/{request_id}")
async def get_expansion_request_status(
    request_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get status of a specific expansion request"""
    employer_id = current_user["user_id"]
    
    request = await db.jurisdiction_expansion_requests.find_one(
        {"request_id": request_id, "employer_id": employer_id},
        {"_id": 0}
    )
    
    if not request:
        raise HTTPException(status_code=404, detail="Expansion request not found")
    
    return {
        "success": True,
        "data": request
    }


@router.delete("/expansion-request/{request_id}")
async def cancel_expansion_request(
    request_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Cancel a pending expansion request"""
    employer_id = current_user["user_id"]
    
    request = await db.jurisdiction_expansion_requests.find_one({
        "request_id": request_id,
        "employer_id": employer_id,
        "status": "pending"
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Pending expansion request not found")
    
    await db.jurisdiction_expansion_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Expansion request cancelled"
    }


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/expansion-requests")
async def get_all_expansion_requests(
    request_status: Optional[str] = None,
    country_code: Optional[str] = None,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Get all jurisdiction expansion requests for admin review.
    Filter by status: pending, approved, rejected, cancelled
    """
    query = {}
    if request_status:
        query["status"] = request_status
    if country_code:
        query["target_country_code"] = country_code
    
    requests = await db.jurisdiction_expansion_requests.find(
        query,
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(200)
    
    # Get counts by status
    status_counts = {}
    for s in ["pending", "approved", "rejected", "cancelled"]:
        count = await db.jurisdiction_expansion_requests.count_documents({"status": s})
        status_counts[s] = count
    
    return {
        "success": True,
        "data": {
            "requests": requests,
            "status_counts": status_counts,
            "total": len(requests)
        }
    }


@router.post("/admin/expansion-request/{request_id}/review")
async def review_expansion_request(
    request_id: str,
    review_data: ExpansionRequestReview,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Approve or reject a jurisdiction expansion request.
    Upon approval, the employer's authorized_jurisdictions is updated.
    """
    action = review_data.action
    
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    
    if action == "reject" and not review_data.rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    
    # Find the request
    request = await db.jurisdiction_expansion_requests.find_one({"request_id": request_id})
    
    if not request:
        raise HTTPException(status_code=404, detail="Expansion request not found")
    
    if request.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Can only review pending requests")
    
    employer_id = request["employer_id"]
    target_jurisdiction = request["target_jurisdiction"]
    
    # Update request status
    new_status = "approved" if action == "approve" else "rejected"
    update_data = {
        "status": new_status,
        "reviewed_by": current_user["user_id"],
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "admin_notes": review_data.admin_notes
    }
    
    if action == "reject":
        update_data["rejection_reason"] = review_data.rejection_reason
    
    await db.jurisdiction_expansion_requests.update_one(
        {"request_id": request_id},
        {"$set": update_data}
    )
    
    # If approved, add jurisdiction to employer's authorized list
    if action == "approve":
        await db.employer_profiles.update_one(
            {"employer_id": employer_id},
            {"$addToSet": {"authorized_jurisdictions": target_jurisdiction}}
        )
        
        # Also update the users collection if needed
        await db.users.update_one(
            {"user_id": employer_id},
            {"$addToSet": {"authorized_jurisdictions": target_jurisdiction}}
        )
    
    # Log the review
    await db.audit_logs.insert_one({
        "action": f"jurisdiction_expansion_{action}d",
        "admin_id": current_user["user_id"],
        "employer_id": employer_id,
        "request_id": request_id,
        "target_jurisdiction": target_jurisdiction,
        "rejection_reason": review_data.rejection_reason if action == "reject" else None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    target_name = JURISDICTIONS.get(target_jurisdiction, {}).get("name", target_jurisdiction)
    
    return {
        "success": True,
        "message": f"Expansion request {action}d for {target_name}",
        "data": {"status": new_status}
    }


@router.get("/admin/employer/{employer_id}/jurisdictions")
async def get_employer_jurisdictions_admin(
    employer_id: str,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Admin view of an employer's authorized jurisdictions"""
    
    employer = await db.employer_profiles.find_one(
        {"employer_id": employer_id},
        {"_id": 0}
    )
    
    if not employer:
        raise HTTPException(status_code=404, detail="Employer not found")
    
    authorized = employer.get("authorized_jurisdictions", [])
    
    # Get all expansion request history
    requests = await db.jurisdiction_expansion_requests.find(
        {"employer_id": employer_id},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(50)
    
    # Get workplaces and their jurisdictions
    workplaces = await db.workplaces.find(
        {"employer_id": employer_id},
        {"_id": 0, "workplace_id": 1, "workplace_name": 1, "province": 1, "city": 1}
    ).to_list(100)
    
    return {
        "success": True,
        "data": {
            "employer_id": employer_id,
            "company_name": employer.get("company_name"),
            "authorized_jurisdictions": authorized,
            "expansion_history": requests,
            "workplaces": workplaces
        }
    }


@router.post("/admin/employer/{employer_id}/add-jurisdiction")
async def admin_add_employer_jurisdiction(
    employer_id: str,
    data: dict,
    current_user: dict = Depends(require_role("super_admin")),
    db = Depends(get_db)
):
    """
    Super admin can manually add jurisdiction authorization for an employer.
    Use for special cases or corrections.
    """
    jurisdiction_code = data.get("jurisdiction_code", "").upper()
    reason = data.get("reason", "Admin override")
    
    if jurisdiction_code not in JURISDICTIONS:
        raise HTTPException(status_code=400, detail="Invalid jurisdiction code")
    
    # Add to employer
    result = await db.employer_profiles.update_one(
        {"employer_id": employer_id},
        {"$addToSet": {"authorized_jurisdictions": jurisdiction_code}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employer not found")
    
    # Also update users collection
    await db.users.update_one(
        {"user_id": employer_id},
        {"$addToSet": {"authorized_jurisdictions": jurisdiction_code}}
    )
    
    # Log the action
    await db.audit_logs.insert_one({
        "action": "admin_jurisdiction_override",
        "admin_id": current_user["user_id"],
        "employer_id": employer_id,
        "jurisdiction_added": jurisdiction_code,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Jurisdiction {jurisdiction_code} added to employer"
    }


@router.delete("/admin/employer/{employer_id}/jurisdiction/{jurisdiction_code}")
async def admin_remove_employer_jurisdiction(
    employer_id: str,
    jurisdiction_code: str,
    current_user: dict = Depends(require_role("super_admin")),
    db = Depends(get_db)
):
    """
    Super admin can remove jurisdiction authorization from an employer.
    Cannot remove their primary (registration) jurisdiction.
    """
    jurisdiction_code = jurisdiction_code.upper()
    
    # Get employer
    employer = await db.employer_profiles.find_one({"employer_id": employer_id})
    if not employer:
        raise HTTPException(status_code=404, detail="Employer not found")
    
    authorized = employer.get("authorized_jurisdictions", [])
    
    # Cannot remove primary jurisdiction
    if authorized and jurisdiction_code == authorized[0]:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove primary (registration) jurisdiction"
        )
    
    if jurisdiction_code not in authorized:
        raise HTTPException(status_code=400, detail="Employer not authorized for this jurisdiction")
    
    # Check if employer has active workplaces in this jurisdiction
    # This would need to check workplaces and their jurisdictions
    
    # Remove from employer
    await db.employer_profiles.update_one(
        {"employer_id": employer_id},
        {"$pull": {"authorized_jurisdictions": jurisdiction_code}}
    )
    
    await db.users.update_one(
        {"user_id": employer_id},
        {"$pull": {"authorized_jurisdictions": jurisdiction_code}}
    )
    
    # Log the action
    await db.audit_logs.insert_one({
        "action": "admin_jurisdiction_removed",
        "admin_id": current_user["user_id"],
        "employer_id": employer_id,
        "jurisdiction_removed": jurisdiction_code,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Jurisdiction {jurisdiction_code} removed from employer"
    }


# ==================== HELPER FUNCTIONS ====================

def get_required_documents_for_jurisdiction(jurisdiction_code: str) -> List[Dict]:
    """
    Get list of required documents for expansion to a jurisdiction.
    """
    country_code = jurisdiction_code.split("-")[0] if "-" in jurisdiction_code else jurisdiction_code
    
    base_docs = [
        {
            "type": "business_registration",
            "name": "Business Registration Certificate",
            "description": "Certificate of incorporation or business registration in the target jurisdiction",
            "required": True
        }
    ]
    
    if country_code == "CA":
        base_docs.extend([
            {
                "type": "provincial_registration",
                "name": "Provincial Business Registration",
                "description": "Extra-provincial registration or incorporation in the target province",
                "required": True
            },
            {
                "type": "wsib_certificate",
                "name": "WSIB/Workers' Compensation Certificate",
                "description": "Workers' compensation coverage certificate for the province",
                "required": True
            }
        ])
    elif country_code == "US":
        base_docs.extend([
            {
                "type": "state_registration",
                "name": "State Business Registration",
                "description": "Foreign qualification or state registration certificate",
                "required": True
            },
            {
                "type": "ein_certificate",
                "name": "EIN Certificate",
                "description": "Employer Identification Number from IRS",
                "required": True
            },
            {
                "type": "workers_comp",
                "name": "Workers' Compensation Insurance",
                "description": "State-required workers' compensation insurance certificate",
                "required": True
            }
        ])
    elif country_code == "IN":
        base_docs.extend([
            {
                "type": "gst_certificate",
                "name": "GST Registration Certificate",
                "description": "Goods and Services Tax registration",
                "required": True
            },
            {
                "type": "pf_registration",
                "name": "PF Registration",
                "description": "Provident Fund registration certificate",
                "required": True
            },
            {
                "type": "esic_registration",
                "name": "ESIC Registration",
                "description": "Employees' State Insurance Corporation registration",
                "required": True
            }
        ])
    elif country_code == "GB":
        base_docs.extend([
            {
                "type": "companies_house",
                "name": "Companies House Registration",
                "description": "Company registration with Companies House",
                "required": True
            },
            {
                "type": "employers_liability",
                "name": "Employers' Liability Insurance",
                "description": "Compulsory employers' liability insurance certificate",
                "required": True
            }
        ])
    else:
        # Generic requirements for other countries
        base_docs.extend([
            {
                "type": "tax_registration",
                "name": "Tax Registration Certificate",
                "description": "Business tax registration in the target jurisdiction",
                "required": True
            },
            {
                "type": "insurance_certificate",
                "name": "Workers' Insurance Certificate",
                "description": "Workers' compensation or liability insurance certificate",
                "required": True
            }
        ])
    
    return base_docs
