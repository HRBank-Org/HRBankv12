from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Dict
from datetime import datetime, timedelta
from ..auth.dependencies import get_current_user, require_role, get_db
from ..models.compliance import (
    EmployerCompliance, 
    WorkerCompliance, 
    WSIBDocument,
    PAYROLL_PROVIDERS,
    WSIB_INDUSTRY_TYPES,
    EMPLOYER_CLASSIFICATION_DISCLOSURE,
    EMPLOYER_TOS_TEXT,
    WORKER_CASUAL_EMPLOYMENT_DISCLOSURE,
    WORKER_TOS_TEXT
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/compliance", tags=["compliance"])


# ==================== EMPLOYER COMPLIANCE ====================

@router.get("/employer/legal-texts")
async def get_employer_legal_texts():
    """Get legal disclosure texts for employer onboarding"""
    return {
        "success": True,
        "data": {
            "classification_disclosure": EMPLOYER_CLASSIFICATION_DISCLOSURE,
            "terms_of_service": EMPLOYER_TOS_TEXT,
            "payroll_providers": PAYROLL_PROVIDERS,
            "wsib_industry_types": WSIB_INDUSTRY_TYPES
        }
    }


@router.post("/employer/confirm-classification")
async def confirm_worker_classification(
    data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Employer confirms workers are employees (T4, not T4A)
    Required before employer can post shifts
    """
    payroll_provider = data.get("payroll_provider")
    
    if not payroll_provider or payroll_provider not in PAYROLL_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payroll provider. Must be one of: {', '.join(PAYROLL_PROVIDERS)}"
        )
    
    # Get or create compliance record
    compliance = await db.employer_compliance.find_one({"employer_id": current_user["user_id"]})
    
    if compliance:
        # Update existing
        await db.employer_compliance.update_one(
            {"employer_id": current_user["user_id"]},
            {"$set": {
                "payroll_type": "T4_employee",
                "payroll_provider": payroll_provider,
                "classification_confirmed": True,
                "classification_confirmed_date": datetime.utcnow(),
                "updated_date": datetime.utcnow()
            }}
        )
    else:
        # Create new
        new_compliance = EmployerCompliance(
            employer_id=current_user["user_id"],
            payroll_type="T4_employee",
            payroll_provider=payroll_provider,
            classification_confirmed=True,
            classification_confirmed_date=datetime.utcnow()
        )
        await db.employer_compliance.insert_one(new_compliance.model_dump())
    
    return {
        "success": True,
        "message": "Worker classification confirmed. You can now upload WSIB certificate."
    }


@router.post("/employer/acknowledge-terms")
async def acknowledge_employer_terms(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Employer acknowledges platform terms of service
    """
    compliance = await db.employer_compliance.find_one({"employer_id": current_user["user_id"]})
    
    if not compliance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please confirm worker classification first"
        )
    
    await db.employer_compliance.update_one(
        {"employer_id": current_user["user_id"]},
        {"$set": {
            "terms_acknowledged": True,
            "terms_acknowledged_date": datetime.utcnow(),
            "updated_date": datetime.utcnow()
        }}
    )
    
    return {
        "success": True,
        "message": "Terms acknowledged successfully"
    }


@router.post("/employer/wsib/upload")
async def upload_wsib_certificate(
    wsib_account_number: str,
    industry_type: str,
    certificate_url: str,  # Already uploaded via file upload endpoint
    issue_date: str,
    expiry_date: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Upload WSIB certificate for verification
    Certificate must be manually verified by admin before employer can post shifts
    """
    if industry_type not in WSIB_INDUSTRY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid industry type. Must be one of: {', '.join(WSIB_INDUSTRY_TYPES)}"
        )
    
    # Parse dates
    try:
        issue_dt = datetime.fromisoformat(issue_date)
        expiry_dt = datetime.fromisoformat(expiry_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    # Check if expiry date is valid (should be future date)
    if expiry_dt < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="WSIB certificate has already expired. Please upload current certificate."
        )
    
    # Calculate days until expiry
    days_until_expiry = (expiry_dt - datetime.utcnow()).days
    
    # Create WSIB document
    wsib_doc = WSIBDocument(
        employer_id=current_user["user_id"],
        wsib_account_number=wsib_account_number,
        certificate_url=certificate_url,
        industry_type=industry_type,
        issue_date=issue_dt,
        expiry_date=expiry_dt,
        days_until_expiry=days_until_expiry,
        verification_status='pending'
    )
    
    await db.wsib_documents.insert_one(wsib_doc.model_dump())
    
    # Update employer compliance
    await db.employer_compliance.update_one(
        {"employer_id": current_user["user_id"]},
        {"$set": {
            "wsib_account_number": wsib_account_number,
            "wsib_certificate_url": certificate_url,
            "wsib_industry_type": industry_type,
            "wsib_expiry_date": expiry_dt,
            "wsib_verified": False,  # Awaiting admin verification
            "updated_date": datetime.utcnow()
        }}
    )
    
    return {
        "success": True,
        "message": "WSIB certificate uploaded successfully. Awaiting admin verification.",
        "data": {
            "wsib_doc_id": wsib_doc.wsib_doc_id,
            "verification_status": "pending",
            "days_until_expiry": days_until_expiry
        }
    }


@router.get("/employer/status")
async def get_employer_compliance_status(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get employer's current compliance status
    """
    compliance = await db.employer_compliance.find_one(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not compliance:
        # Create default compliance record
        new_compliance = EmployerCompliance(employer_id=current_user["user_id"])
        await db.employer_compliance.insert_one(new_compliance.model_dump())
        compliance = new_compliance.model_dump()
    
    # Check if employer can post shifts
    can_post_shifts = (
        compliance.get("classification_confirmed", False) and
        compliance.get("terms_acknowledged", False) and
        compliance.get("wsib_verified", False)
    )
    
    # Update can_post_shifts status
    await db.employer_compliance.update_one(
        {"employer_id": current_user["user_id"]},
        {"$set": {"can_post_shifts": can_post_shifts}}
    )
    
    compliance["can_post_shifts"] = can_post_shifts
    
    return {
        "success": True,
        "data": {
            "compliance": compliance,
            "requirements": {
                "classification_confirmed": compliance.get("classification_confirmed", False),
                "terms_acknowledged": compliance.get("terms_acknowledged", False),
                "wsib_verified": compliance.get("wsib_verified", False),
                "can_post_shifts": can_post_shifts
            }
        }
    }


# ==================== WORKER COMPLIANCE ====================

@router.get("/worker/legal-texts")
async def get_worker_legal_texts():
    """Get legal disclosure texts for worker onboarding"""
    return {
        "success": True,
        "data": {
            "casual_employment_disclosure": WORKER_CASUAL_EMPLOYMENT_DISCLOSURE,
            "terms_of_service": WORKER_TOS_TEXT
        }
    }


@router.post("/worker/acknowledge-casual-employment")
async def acknowledge_casual_employment(
    data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Worker acknowledges casual employment status
    """
    ip_address = data.get("ip_address")  # Frontend should send client IP
    
    # Get or create compliance record
    compliance = await db.worker_compliance.find_one({"worker_id": current_user["user_id"]})
    
    if compliance:
        # Update existing
        await db.worker_compliance.update_one(
            {"worker_id": current_user["user_id"]},
            {"$set": {
                "casual_employment_acknowledged": True,
                "casual_employment_acknowledged_date": datetime.utcnow(),
                "casual_employment_ip_address": ip_address,
                "updated_date": datetime.utcnow()
            }}
        )
    else:
        # Create new
        new_compliance = WorkerCompliance(
            worker_id=current_user["user_id"],
            casual_employment_acknowledged=True,
            casual_employment_acknowledged_date=datetime.utcnow(),
            casual_employment_ip_address=ip_address
        )
        await db.worker_compliance.insert_one(new_compliance.model_dump())
    
    return {
        "success": True,
        "message": "Casual employment status acknowledged"
    }


@router.post("/worker/acknowledge-terms")
async def acknowledge_worker_terms(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Worker acknowledges platform terms of service
    """
    compliance = await db.worker_compliance.find_one({"worker_id": current_user["user_id"]})
    
    if not compliance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please acknowledge casual employment status first"
        )
    
    await db.worker_compliance.update_one(
        {"worker_id": current_user["user_id"]},
        {"$set": {
            "terms_acknowledged": True,
            "terms_acknowledged_date": datetime.utcnow(),
            "updated_date": datetime.utcnow()
        }}
    )
    
    return {
        "success": True,
        "message": "Terms acknowledged successfully"
    }


@router.get("/worker/status")
async def get_worker_compliance_status(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Get worker's current compliance status
    """
    compliance = await db.worker_compliance.find_one(
        {"worker_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not compliance:
        # Create default compliance record
        new_compliance = WorkerCompliance(worker_id=current_user["user_id"])
        await db.worker_compliance.insert_one(new_compliance.model_dump())
        compliance = new_compliance.model_dump()
    
    return {
        "success": True,
        "data": {
            "compliance": compliance,
            "requirements": {
                "casual_employment_acknowledged": compliance.get("casual_employment_acknowledged", False),
                "terms_acknowledged": compliance.get("terms_acknowledged", False)
            }
        }
    }


# ==================== ADMIN - WSIB VERIFICATION ====================

@router.get("/admin/wsib/pending", response_model=Dict)
async def get_pending_wsib_verifications(
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Admin: Get list of pending WSIB certificate verifications
    """
    pending_docs = await db.wsib_documents.find(
        {"verification_status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with employer info
    for doc in pending_docs:
        employer = await db.users.find_one(
            {"user_id": doc["employer_id"]},
            {"_id": 0, "email": 1, "full_name": 1}
        )
        if employer:
            doc["employer_email"] = employer.get("email")
            doc["employer_name"] = employer.get("full_name")
    
    return {
        "success": True,
        "data": {
            "pending_verifications": pending_docs,
            "count": len(pending_docs)
        }
    }


@router.post("/admin/wsib/verify/{wsib_doc_id}")
async def verify_wsib_certificate(
    wsib_doc_id: str,
    data: dict,
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Admin: Approve or reject WSIB certificate
    """
    action = data.get("action")  # approve or reject
    notes = data.get("notes", "")
    
    if action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be 'approve' or 'reject'"
        )
    
    wsib_doc = await db.wsib_documents.find_one({"wsib_doc_id": wsib_doc_id})
    
    if not wsib_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="WSIB document not found"
        )
    
    if action == "approve":
        # Update WSIB document
        await db.wsib_documents.update_one(
            {"wsib_doc_id": wsib_doc_id},
            {"$set": {
                "verification_status": "approved",
                "verified_by": current_user["user_id"],
                "verified_date": datetime.utcnow(),
                "notes": notes
            }}
        )
        
        # Update employer compliance
        await db.employer_compliance.update_one(
            {"employer_id": wsib_doc["employer_id"]},
            {"$set": {
                "wsib_verified": True,
                "wsib_verified_by": current_user["user_id"],
                "wsib_verified_date": datetime.utcnow(),
                "updated_date": datetime.utcnow()
            }}
        )
        
        # Check if employer can now post shifts
        compliance = await db.employer_compliance.find_one({"employer_id": wsib_doc["employer_id"]})
        can_post_shifts = (
            compliance.get("classification_confirmed", False) and
            compliance.get("terms_acknowledged", False) and
            compliance.get("wsib_verified", False)
        )
        
        await db.employer_compliance.update_one(
            {"employer_id": wsib_doc["employer_id"]},
            {"$set": {"can_post_shifts": can_post_shifts}}
        )
        
        return {
            "success": True,
            "message": "WSIB certificate approved. Employer can now post shifts.",
            "data": {"can_post_shifts": can_post_shifts}
        }
    
    else:  # reject
        rejection_reason = data.get("rejection_reason", "Certificate not valid")
        
        await db.wsib_documents.update_one(
            {"wsib_doc_id": wsib_doc_id},
            {"$set": {
                "verification_status": "rejected",
                "verified_by": current_user["user_id"],
                "verified_date": datetime.utcnow(),
                "rejection_reason": rejection_reason,
                "notes": notes
            }}
        )
        
        return {
            "success": True,
            "message": f"WSIB certificate rejected: {rejection_reason}"
        }
