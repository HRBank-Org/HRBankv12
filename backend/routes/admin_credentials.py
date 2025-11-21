from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import require_role
from typing import Dict
from datetime import datetime

router = APIRouter(prefix="/admin/credentials", tags=["Admin Credentials"])

def get_db():
    from server import db
    return db

@router.get("/unassigned", response_model=Dict)
async def get_unassigned_credentials(
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Get all credentials that haven't been assigned to an institution yet"""
    
    # Find verification requests with empty institution assignment
    unassigned = await db.credential_verification_requests.find({
        "$or": [
            {"assigned_to_institution_id": ""},
            {"assigned_to_institution_id": {"$exists": False}}
        ],
        "status": "pending"
    }).to_list(100)
    
    # Enrich with workforce and credential details
    enriched = []
    for req in unassigned:
        # Get workforce info
        workforce = await db.workforce_profiles.find_one(
            {"workforce_id": req.get("workforce_id")},
            {"_id": 0, "full_name": 1, "first_name": 1, "last_name": 1}
        )
        
        # Get credential details
        credential = await db.workforce_credentials.find_one(
            {"credential_id": req.get("credential_id")},
            {"_id": 0}
        )
        
        if credential:
            enriched.append({
                "request_id": req.get("request_id"),
                "credential_id": req.get("credential_id"),
                "workforce_id": req.get("workforce_id"),
                "workforce_name": workforce.get("full_name") if workforce else f"{workforce.get('first_name', '')} {workforce.get('last_name', '')}",
                "credential_type_name": credential.get("credential_type_name"),
                "issuing_institution_name": credential.get("issuing_institution_name"),
                "credential_id_number": credential.get("credential_id_number"),
                "issue_date": credential.get("issue_date"),
                "expiration_date": credential.get("expiration_date"),
                "document_url": credential.get("document_url"),
                "submitted_date": credential.get("submitted_date")
            })
    
    return {
        "success": True,
        "data": {
            "unassigned_credentials": enriched,
            "count": len(enriched)
        }
    }


@router.get("/institutions/search", response_model=Dict)
async def search_institutions(
    query: str,
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Search for institutions by name for credential assignment"""
    
    institutions = await db.institution_profiles.find({
        "institution_name": {"$regex": query, "$options": "i"}
    }, {
        "_id": 0,
        "institution_id": 1,
        "institution_name": 1,
        "city": 1,
        "province": 1
    }).to_list(50)
    
    return {
        "success": True,
        "data": {
            "institutions": institutions
        }
    }


@router.post("/assign", response_model=Dict)
async def assign_credential_to_institution(
    assignment_data: dict,
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Manually assign a credential to an institution for verification
    
    Body: {
        "request_id": "vr_xxx",
        "institution_id": "inst_xxx"
    }
    """
    
    request_id = assignment_data.get("request_id")
    institution_id = assignment_data.get("institution_id")
    
    if not request_id or not institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="request_id and institution_id are required"
        )
    
    # Verify institution exists
    institution = await db.institution_profiles.find_one({"institution_id": institution_id})
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    # Update verification request
    result = await db.credential_verification_requests.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "assigned_to_institution_id": institution_id,
                "assigned_by_admin_id": current_user["user_id"],
                "assigned_date": datetime.utcnow().isoformat(),
                "updated_date": datetime.utcnow().isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request not found"
        )
    
    return {
        "success": True,
        "message": f"Credential assigned to {institution.get('institution_name')}"
    }


@router.post("/auto-assign-by-name", response_model=Dict)
async def auto_assign_by_institution_name(
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Auto-assign unassigned credentials to institutions by matching institution names
    """
    
    # Get unassigned verification requests
    unassigned = await db.credential_verification_requests.find({
        "$or": [
            {"assigned_to_institution_id": ""},
            {"assigned_to_institution_id": {"$exists": False}}
        ],
        "status": "pending"
    }).to_list(1000)
    
    assigned_count = 0
    matched_institutions = {}
    
    for req in unassigned:
        # Get credential to find institution name
        credential = await db.workforce_credentials.find_one(
            {"credential_id": req.get("credential_id")}
        )
        
        if not credential:
            continue
            
        institution_name = credential.get("issuing_institution_name", "").strip()
        if not institution_name:
            continue
        
        # Check if we already found this institution
        if institution_name in matched_institutions:
            institution_id = matched_institutions[institution_name]
        else:
            # Search for matching institution (case-insensitive, partial match)
            institution = await db.institution_profiles.find_one({
                "institution_name": {"$regex": f"^{institution_name}$", "$options": "i"}
            })
            
            if institution:
                institution_id = institution.get("institution_id")
                matched_institutions[institution_name] = institution_id
            else:
                # No match found
                continue
        
        # Assign the credential
        await db.credential_verification_requests.update_one(
            {"request_id": req.get("request_id")},
            {
                "$set": {
                    "assigned_to_institution_id": institution_id,
                    "assigned_by_admin_id": current_user["user_id"],
                    "assigned_date": datetime.utcnow().isoformat(),
                    "auto_assigned": True,
                    "updated_date": datetime.utcnow().isoformat()
                }
            }
        )
        
        assigned_count += 1
    
    return {
        "success": True,
        "data": {
            "assigned_count": assigned_count,
            "total_unassigned": len(unassigned),
            "matched_institutions": list(matched_institutions.keys())
        },
        "message": f"Successfully auto-assigned {assigned_count} credentials"
    }
