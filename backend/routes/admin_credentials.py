from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import require_role
from typing import Dict
from datetime import datetime, timezone

router = APIRouter(prefix="/admin/credentials", tags=["Admin Credentials"])

def get_db():
    from server import db
    return db

import uuid



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
                "assigned_date": datetime.now(timezone.utc).isoformat(),
                "updated_date": datetime.now(timezone.utc).isoformat()
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
                    "assigned_date": datetime.now(timezone.utc).isoformat(),
                    "auto_assigned": True,
                    "updated_date": datetime.now(timezone.utc).isoformat()
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


@router.post("/seed-credential-types", response_model=Dict)
async def seed_credential_types(
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Seed the database with standard credential types for Ontario healthcare/trades
    This is a one-time setup to populate the credential_types collection
    """
    
    standard_types = [
        # Healthcare Certifications
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Registered Nurse (RN)",
            "category": "Healthcare",
            "issuing_body_type": "Provincial College",
            "typical_issuer": "College of Nurses of Ontario (CNO)",
            "requires_renewal": True,
            "typical_validity_years": 1,
            "description": "Registration as a Registered Nurse in Ontario"
        },
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Personal Support Worker (PSW) Certificate",
            "category": "Healthcare",
            "issuing_body_type": "Educational Institution",
            "typical_issuer": "Ontario Colleges",
            "requires_renewal": False,
            "typical_validity_years": None,
            "description": "Personal Support Worker training certificate"
        },
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Registered Practical Nurse (RPN)",
            "category": "Healthcare",
            "issuing_body_type": "Provincial College",
            "typical_issuer": "College of Nurses of Ontario (CNO)",
            "requires_renewal": True,
            "typical_validity_years": 1,
            "description": "Registration as a Registered Practical Nurse"
        },
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "CPR/First Aid Certification",
            "category": "Healthcare",
            "issuing_body_type": "Training Organization",
            "typical_issuer": "St. John Ambulance, Red Cross",
            "requires_renewal": True,
            "typical_validity_years": 2,
            "description": "Standard First Aid and CPR Level C"
        },
        
        # Trades Certifications
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Certificate of Qualification (Red Seal)",
            "category": "Skilled Trades",
            "issuing_body_type": "Provincial Authority",
            "typical_issuer": "Ontario College of Trades",
            "requires_renewal": True,
            "typical_validity_years": 5,
            "description": "Red Seal certification for skilled trades"
        },
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Electrical License",
            "category": "Skilled Trades",
            "issuing_body_type": "Provincial Regulator",
            "typical_issuer": "Electrical Safety Authority (ESA)",
            "requires_renewal": True,
            "typical_validity_years": 5,
            "description": "Licensed electrician certification"
        },
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Gas Technician License",
            "category": "Skilled Trades",
            "issuing_body_type": "Provincial Regulator",
            "typical_issuer": "Technical Standards and Safety Authority (TSSA)",
            "requires_renewal": True,
            "typical_validity_years": 5,
            "description": "Gas technician certification (G1, G2, G3)"
        },
        
        # Safety Certifications
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "WHMIS 2015 Certificate",
            "category": "Safety",
            "issuing_body_type": "Training Provider",
            "typical_issuer": "Various approved providers",
            "requires_renewal": True,
            "typical_validity_years": 3,
            "description": "Workplace Hazardous Materials Information System"
        },
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Forklift Operator Certificate",
            "category": "Safety",
            "issuing_body_type": "Training Provider",
            "typical_issuer": "WSIB approved trainers",
            "requires_renewal": True,
            "typical_validity_years": 3,
            "description": "Forklift operation certification"
        },
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Working at Heights Certificate",
            "category": "Safety",
            "issuing_body_type": "Provincial Approved Trainer",
            "typical_issuer": "MOL approved training providers",
            "requires_renewal": True,
            "typical_validity_years": 3,
            "description": "Working at Heights training (Ontario mandatory)"
        },
        
        # Food Service
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Food Handler Certificate",
            "category": "Food Service",
            "issuing_body_type": "Health Authority",
            "typical_issuer": "Local Public Health Units",
            "requires_renewal": True,
            "typical_validity_years": 5,
            "description": "Safe food handling certification"
        },
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Smart Serve Certificate",
            "category": "Food Service",
            "issuing_body_type": "Provincial Program",
            "typical_issuer": "Smart Serve Ontario",
            "requires_renewal": True,
            "typical_validity_years": 5,
            "description": "Responsible alcohol service certification"
        },
        
        # Education
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Ontario College Certificate",
            "category": "Education",
            "issuing_body_type": "Educational Institution",
            "typical_issuer": "Ontario Colleges",
            "requires_renewal": False,
            "typical_validity_years": None,
            "description": "One-year college certificate program"
        },
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Ontario College Diploma",
            "category": "Education",
            "issuing_body_type": "Educational Institution",
            "typical_issuer": "Ontario Colleges",
            "requires_renewal": False,
            "typical_validity_years": None,
            "description": "Two-year college diploma program"
        },
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "University Degree",
            "category": "Education",
            "issuing_body_type": "Educational Institution",
            "typical_issuer": "Ontario Universities",
            "requires_renewal": False,
            "typical_validity_years": None,
            "description": "Bachelor's, Master's, or Doctoral degree"
        },
        
        # Security
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Security Guard License",
            "category": "Security",
            "issuing_body_type": "Provincial Ministry",
            "typical_issuer": "Ministry of the Solicitor General",
            "requires_renewal": True,
            "typical_validity_years": 2,
            "description": "Ontario security guard license"
        },
        
        # Transport
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Ontario Driver's License (G)",
            "category": "Transport",
            "issuing_body_type": "Provincial Government",
            "typical_issuer": "Ministry of Transportation",
            "requires_renewal": True,
            "typical_validity_years": 5,
            "description": "Full Ontario driver's license"
        },
        {
            "credential_type_id": str(uuid.uuid4()),
            "credential_name": "Commercial Driver's License (AZ)",
            "category": "Transport",
            "issuing_body_type": "Provincial Government",
            "typical_issuer": "Ministry of Transportation",
            "requires_renewal": True,
            "typical_validity_years": 5,
            "description": "Commercial truck driving license"
        }
    ]
    
    # Check if already seeded
    existing_count = await db.credential_types.count_documents({})
    if existing_count > 0:
        return {
            "success": False,
            "message": f"Database already has {existing_count} credential types. Use DELETE endpoint first if you want to re-seed.",
            "data": {"existing_count": existing_count}
        }
    
    # Insert all standard types
    result = await db.credential_types.insert_many(standard_types)
    
    return {
        "success": True,
        "message": f"Successfully seeded {len(standard_types)} credential types",
        "data": {
            "inserted_count": len(result.inserted_ids),
            "categories": list(set([t["category"] for t in standard_types]))
        }
    }


@router.delete("/clear-credential-types", response_model=Dict)
async def clear_credential_types(
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    DANGER: Clear all credential types from database
    Use this only if you need to re-seed with updated data
    """
    
    result = await db.credential_types.delete_many({})
    
    return {
        "success": True,
        "message": f"Deleted {result.deleted_count} credential types",
        "data": {"deleted_count": result.deleted_count}
    }

