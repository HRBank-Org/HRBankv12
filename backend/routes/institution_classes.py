"""
Institution Classes, Templates, and Credential Management Routes
Hierarchy: Faculty → Program → Cohort (Class) → Students → Credentials
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List
from datetime import datetime, timedelta, timezone
from auth.dependencies import get_current_user, require_role
from models.institution_classes import (
    ClassTemplate, InstitutionClass, CredentialIssuance, VerificationRequest,
    CREDENTIAL_TYPES, CLASS_STATUS
)
from utils.credential_guardrails import validate_credential_issuance, get_credential_types_for_institution
import uuid

router = APIRouter(prefix="/api/institution", tags=["Institution Classes"])

def get_db():
    from server import db
    return db


# ==================== CLASS TEMPLATES ====================

@router.get("/class-templates", response_model=Dict)
async def get_class_templates(
    current_user: dict = Depends(require_role(["institution"])),
    db = Depends(get_db)
):
    """Get all class templates for institution"""
    templates = await db.class_templates.find({
        "institution_id": current_user["user_id"],
        "is_active": True
    }, {"_id": 0}).to_list(100)
    
    return {
        "success": True,
        "data": {
            "templates": templates,
            "count": len(templates)
        }
    }


@router.post("/class-templates", response_model=Dict)

async def create_class_template(
    template_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Create a new class template"""
    template = ClassTemplate(
        institution_id=current_user["user_id"],
        template_name=template_data.get("template_name"),
        description=template_data.get("description"),
        credential_type=template_data.get("credential_type"),
        validity_period_months=template_data.get("validity_period_months")
    )
    
    await db.class_templates.insert_one(template.model_dump())
    
    return {
        "success": True,
        "data": {"template_id": template.template_id},
        "message": "Class template created successfully"
    }


@router.put("/class-templates/{template_id}", response_model=Dict)

async def update_class_template(
    template_id: str,
    template_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Update a class template"""
    template = await db.class_templates.find_one({
        "template_id": template_id,
        "institution_id": current_user["user_id"]
    })
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    update_data = {
        "template_name": template_data.get("template_name", template["template_name"]),
        "description": template_data.get("description", template.get("description")),
        "credential_type": template_data.get("credential_type", template["credential_type"]),
        "validity_period_months": template_data.get("validity_period_months", template.get("validity_period_months")),
        "updated_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.class_templates.update_one(
        {"template_id": template_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Template updated successfully"
    }


@router.delete("/class-templates/{template_id}", response_model=Dict)

async def delete_class_template(
    template_id: str,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Soft delete a class template"""
    result = await db.class_templates.update_one(
        {
            "template_id": template_id,
            "institution_id": current_user["user_id"]
        },
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return {
        "success": True,
        "message": "Template deleted successfully"
    }


# ==================== CLASSES ====================

@router.get("/classes", response_model=Dict)

async def get_classes(
    status_filter: str = None,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get all classes for institution"""
    query = {"institution_id": current_user["user_id"]}
    if status_filter:
        query["status"] = status_filter
    
    classes = await db.institution_classes.find(query, {"_id": 0}).to_list(1000)
    
    return {
        "success": True,
        "data": {
            "classes": classes,
            "count": len(classes)
        }
    }


@router.get("/classes/{class_id}", response_model=Dict)

async def get_class_details(
    class_id: str,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get class details"""
    class_data = await db.institution_classes.find_one({
        "class_id": class_id,
        "institution_id": current_user["user_id"]
    }, {"_id": 0})
    
    if not class_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Get enrolled students info
    students = []
    if class_data.get("enrolled_students"):
        student_profiles = await db.workforce_profiles.find({
            "user_id": {"$in": class_data["enrolled_students"]}
        }, {"_id": 0, "user_id": 1, "full_name": 1, "email": 1}).to_list(100)
        
        for profile in student_profiles:
            user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0, "email": 1})
            students.append({
                "user_id": profile["user_id"],
                "full_name": profile.get("full_name"),
                "email": user.get("email") if user else None
            })
    
    class_data["students"] = students
    
    return {
        "success": True,
        "data": class_data
    }


@router.post("/classes", response_model=Dict)
async def create_class(
    class_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Create a new cohort (class) - MUST be linked to a program.
    
    Hierarchy enforcement:
    - Faculty → Program → Cohort → Students → Credentials
    - Cohort inherits credential_type from Program
    - Stats cascade up to Program
    """
    institution_id = current_user["user_id"]
    
    # GUARDRAIL: program_id is REQUIRED
    program_id = class_data.get("program_id")
    if not program_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="program_id is required. Every cohort must belong to a program."
        )
    
    # Verify program exists and belongs to this institution
    program = await db.institution_programs.find_one({
        "program_id": program_id,
        "institution_id": institution_id,
        "is_active": True
    })
    
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Program not found or inactive"
        )
    
    # Get faculty info for full hierarchy tracking
    faculty = await db.institution_faculties.find_one({
        "faculty_id": program["faculty_id"],
        "institution_id": institution_id
    })
    
    # Build hierarchy info (for display and auditing)
    hierarchy_info = {
        "faculty_id": program["faculty_id"],
        "faculty_name": faculty["faculty_name"] if faculty else None,
        "program_id": program["program_id"],
        "program_name": program["program_name"],
        "program_credential_type": program.get("credential_type")
    }
    
    # INHERITANCE: credential_type comes from Program (can be overridden if needed)
    credential_type = class_data.get("credential_type") or program.get("credential_type")
    if not credential_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="credential_type is required. Set it on the Program or provide it here."
        )
    
    # Validity period inherited from program
    validity_period = class_data.get("validity_period_months") or program.get("validity_period_months")
    
    institution_class = InstitutionClass(
        institution_id=institution_id,
        template_id=class_data.get("template_id"),
        program_id=program_id,
        title=class_data.get("title"),
        description=class_data.get("description"),
        credential_type=credential_type,
        start_date=class_data.get("start_date"),
        end_date=class_data.get("end_date"),
        validity_period_months=validity_period,
        status=class_data.get("status", "draft"),
        created_by=current_user["user_id"]
    )
    
    class_dict = institution_class.model_dump()
    class_dict["hierarchy"] = hierarchy_info  # Store full hierarchy for queries
    
    await db.institution_classes.insert_one(class_dict)
    
    # CASCADE: Update program's cohort count
    await db.institution_programs.update_one(
        {"program_id": program_id},
        {"$inc": {"total_cohorts": 1}}
    )
    
    return {
        "success": True,
        "data": {
            "class_id": institution_class.class_id,
            "program_id": program_id,
            "hierarchy": hierarchy_info
        },
        "message": f"Cohort created under program '{program['program_name']}'"
    }


@router.put("/classes/{class_id}", response_model=Dict)

async def update_class(
    class_id: str,
    class_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Update a class"""
    existing_class = await db.institution_classes.find_one({
        "class_id": class_id,
        "institution_id": current_user["user_id"]
    })
    
    if not existing_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    update_data = {
        "title": class_data.get("title", existing_class["title"]),
        "description": class_data.get("description", existing_class.get("description")),
        "credential_type": class_data.get("credential_type", existing_class["credential_type"]),
        "start_date": class_data.get("start_date", existing_class["start_date"]),
        "end_date": class_data.get("end_date", existing_class["end_date"]),
        "validity_period_months": class_data.get("validity_period_months", existing_class.get("validity_period_months")),
        "status": class_data.get("status", existing_class["status"]),
        "updated_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.institution_classes.update_one(
        {"class_id": class_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Class updated successfully"
    }


@router.delete("/classes/{class_id}", response_model=Dict)
async def delete_class(
    class_id: str,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Delete a cohort (only if no credentials issued).
    Cascades count decrement up to Program.
    """
    existing_class = await db.institution_classes.find_one({
        "class_id": class_id,
        "institution_id": current_user["user_id"]
    })
    
    if not existing_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cohort not found"
        )
    
    # Check if credentials have been issued
    if existing_class.get("credentials_issued", 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete cohort with issued credentials. Archive it instead."
        )
    
    # CASCADE: Decrement program's cohort count
    program_id = existing_class.get("program_id")
    if program_id:
        students_count = existing_class.get("total_enrolled", 0)
        await db.institution_programs.update_one(
            {"program_id": program_id},
            {
                "$inc": {
                    "total_cohorts": -1,
                    "total_students": -students_count
                }
            }
        )
    
    await db.institution_classes.delete_one({"class_id": class_id})
    
    return {
        "success": True,
        "message": "Cohort deleted successfully"
    }


# ==================== STUDENT INVITATIONS ====================

@router.post("/students/invite", response_model=Dict)
async def invite_students(
    invitation_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Invite students to join HR Bank and enroll in cohort.
    
    Hierarchy enforcement:
    - Cohort must belong to a Program
    - Student count cascades up to Program
    """
    class_id = invitation_data.get("class_id")
    emails = invitation_data.get("emails", [])
    
    if not class_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="class_id (cohort) is required"
        )
    
    if not emails:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No email addresses provided"
        )
    
    # Verify cohort exists
    institution_class = await db.institution_classes.find_one({
        "class_id": class_id,
        "institution_id": current_user["user_id"]
    })
    
    if not institution_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cohort not found"
        )
    
    # GUARDRAIL: Cohort must belong to a program
    program_id = institution_class.get("program_id")
    if not program_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This cohort is not linked to a program. Link it first."
        )
    
    # Get institution info
    institution = await db.institution_profiles.find_one({"institution_id": current_user["user_id"]})
    institution_name = institution.get("institution_name", "Institution") if institution else "Institution"
    
    # Create invitation records
    invitations_sent = 0
    students_enrolled = 0
    
    for email in emails:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": email})
        
        if existing_user and existing_user.get("user_type") == "workforce":
            # User exists, just enroll them in cohort
            await db.institution_classes.update_one(
                {"class_id": class_id},
                {
                    "$addToSet": {"enrolled_students": existing_user["user_id"]},
                    "$inc": {"total_enrolled": 1}
                }
            )
            students_enrolled += 1
        else:
            # Create invitation token
            invite_token = f"inv_{uuid.uuid4().hex[:12]}"
            invitation = {
                "invite_token": invite_token,
                "email": email,
                "invited_by": current_user["user_id"],
                "institution_id": current_user["user_id"],
                "class_id": class_id,
                "program_id": program_id,  # Track program in invitation
                "user_type": "workforce",
                "status": "pending",
                "created_date": datetime.now(timezone.utc).isoformat(),
                "expires_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            }
            
            await db.invitations.insert_one(invitation)
            
            print(f"Invitation sent to {email} for cohort {institution_class['title']}")
        
        invitations_sent += 1
    
    # CASCADE: Update program's total students
    if students_enrolled > 0:
        await db.institution_programs.update_one(
            {"program_id": program_id},
            {"$inc": {"total_students": students_enrolled}}
        )
    
    return {
        "success": True,
        "data": {
            "invitations_sent": invitations_sent,
            "students_enrolled": students_enrolled,
            "class_id": class_id,
            "program_id": program_id
        },
        "message": f"Sent {invitations_sent} invitation(s), enrolled {students_enrolled} existing student(s)"
    }


# ==================== CREDENTIAL ISSUANCE ====================

@router.post("/credentials/issue", response_model=Dict)
async def issue_credentials(
    issuance_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Issue credentials to students in a cohort.
    
    Hierarchy enforcement:
    - MUST have class_id (cohort)
    - Cohort MUST belong to a Program
    - Credential type is inherited from Program → Cohort
    - Stats cascade up: Cohort → Program → Faculty
    """
    class_id = issuance_data.get("class_id")
    student_ids = issuance_data.get("student_ids", [])  # List of user_ids or "all"
    
    if not class_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="class_id is required. Credentials must be issued through a cohort."
        )
    
    # Get cohort details
    institution_class = await db.institution_classes.find_one({
        "class_id": class_id,
        "institution_id": current_user["user_id"]
    })
    
    if not institution_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cohort not found"
        )
    
    # GUARDRAIL: Cohort must belong to a program
    program_id = institution_class.get("program_id")
    if not program_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This cohort is not linked to a program. Please link it to a program first."
        )
    
    # Get program for hierarchy tracking
    program = await db.institution_programs.find_one({
        "program_id": program_id,
        "institution_id": current_user["user_id"]
    })
    
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Program not found"
        )
    
    # Build full hierarchy info for the credential
    hierarchy = {
        "faculty_id": program.get("faculty_id"),
        "program_id": program_id,
        "program_name": program.get("program_name"),
        "cohort_id": class_id,
        "cohort_name": institution_class.get("title")
    }
    
    # Determine which students to issue credentials to
    if student_ids == "all":
        target_students = institution_class.get("enrolled_students", [])
    else:
        target_students = student_ids
    
    if not target_students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No students to issue credentials to"
        )
    
    # INHERITANCE: Credential type comes from cohort (which inherited from program)
    credential_type = institution_class.get("credential_type") or program.get("credential_type")
    if not credential_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No credential type defined. Set it on the Program."
        )
    
    # Calculate expiry date
    issue_date = datetime.now(timezone.utc)
    validity_months = institution_class.get("validity_period_months") or program.get("validity_period_months")
    expiry_date = None
    if validity_months:
        expiry_date = issue_date + timedelta(days=validity_months * 30)
    
    # Issue credentials
    credentials_issued = 0
    
    for student_id in target_students:
        # Check if credential already issued
        existing = await db.credential_issuances.find_one({
            "class_id": class_id,
            "student_id": student_id
        })
        
        if existing:
            continue  # Skip if already issued
        
        credential = CredentialIssuance(
            institution_id=current_user["user_id"],
            class_id=class_id,
            student_id=student_id,
            credential_type=credential_type,
            credential_name=institution_class["title"],
            issue_date=issue_date.isoformat(),
            expiry_date=expiry_date.isoformat() if expiry_date else None,
            issued_by=current_user["user_id"]
        )
        
        cred_dict = credential.model_dump()
        cred_dict["hierarchy"] = hierarchy  # Store full hierarchy
        cred_dict["program_id"] = program_id
        cred_dict["program_name"] = program.get("program_name")
        
        await db.credential_issuances.insert_one(cred_dict)
        credentials_issued += 1
    
    # CASCADE STATS UP: Update cohort count
    await db.institution_classes.update_one(
        {"class_id": class_id},
        {"$inc": {"credentials_issued": credentials_issued}}
    )
    
    # CASCADE STATS UP: Update program's total credentials
    await db.institution_programs.update_one(
        {"program_id": program_id},
        {"$inc": {"total_credentials_issued": credentials_issued}}
    )
    
    return {
        "success": True,
        "data": {
            "credentials_issued": credentials_issued,
            "class_id": class_id,
            "program_id": program_id,
            "credential_type": credential_type,
            "hierarchy": hierarchy
        },
        "message": f"Issued {credentials_issued} credential(s) for program '{program['program_name']}'"
    }


@router.get("/credentials/issued", response_model=Dict)

async def get_issued_credentials(
    class_id: str = None,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get all credentials issued by institution"""
    query = {"institution_id": current_user["user_id"]}
    if class_id:
        query["class_id"] = class_id
    
    credentials = await db.credential_issuances.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with student and class info
    for cred in credentials:
        # Get student name
        student = await db.workforce_profiles.find_one(
            {"user_id": cred["student_id"]},
            {"_id": 0, "full_name": 1}
        )
        cred["student_name"] = student.get("full_name") if student else "Unknown"
        
        # Get class name
        class_data = await db.institution_classes.find_one(
            {"class_id": cred["class_id"]},
            {"_id": 0, "title": 1}
        )
        cred["class_name"] = class_data.get("title") if class_data else "Unknown"
    
    return {
        "success": True,
        "data": {
            "credentials": credentials,
            "count": len(credentials)
        }
    }


# ==================== VERIFICATION REQUESTS ====================

@router.get("/verification-requests", response_model=Dict)

async def get_verification_requests(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get all verification requests for institution"""
    requests = await db.verification_requests.find({
        "institution_id": current_user["user_id"],
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    # Enrich with workforce info
    for req in requests:
        workforce = await db.workforce_profiles.find_one(
            {"user_id": req["workforce_id"]},
            {"_id": 0, "full_name": 1}
        )
        req["workforce_name"] = workforce.get("full_name") if workforce else "Unknown"
    
    return {
        "success": True,
        "data": {
            "requests": requests,
            "count": len(requests)
        }
    }


@router.post("/verification-requests/{request_id}/verify", response_model=Dict)

async def verify_credential_request(
    request_id: str,
    verification_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Verify a credential request"""
    request = await db.verification_requests.find_one({
        "request_id": request_id,
        "institution_id": current_user["user_id"]
    })
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request not found"
        )
    
    # Update request status
    update_data = {
        "status": "verified",
        "verified_by": current_user["user_id"],
        "verified_date": datetime.now(timezone.utc).isoformat(),
        "updated_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.verification_requests.update_one(
        {"request_id": request_id},
        {"$set": update_data}
    )
    
    # Create credential record
    credential = CredentialIssuance(
        institution_id=current_user["user_id"],
        class_id="manual_verification",  # Not from a class
        student_id=request["workforce_id"],
        credential_type=request["credential_type"],
        credential_name=request["credential_name"],
        issue_date=request.get("issue_date", datetime.now(timezone.utc).isoformat()),
        expiry_date=request.get("expiry_date"),
        issued_by=current_user["user_id"]
    )
    
    await db.credential_issuances.insert_one(credential.model_dump())
    
    return {
        "success": True,
        "message": "Credential verified successfully"
    }


@router.post("/verification-requests/{request_id}/reject", response_model=Dict)

async def reject_credential_request(
    request_id: str,
    rejection_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Reject a credential request"""
    request = await db.verification_requests.find_one({
        "request_id": request_id,
        "institution_id": current_user["user_id"]
    })
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request not found"
        )
    
    update_data = {
        "status": "rejected",
        "rejection_reason": rejection_data.get("reason", "Credential could not be verified"),
        "verified_by": current_user["user_id"],
        "verified_date": datetime.now(timezone.utc).isoformat(),
        "updated_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.verification_requests.update_one(
        {"request_id": request_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Verification request rejected"
    }


# ==================== DASHBOARD ANALYTICS ====================

@router.get("/analytics/dashboard", response_model=Dict)

async def get_dashboard_analytics(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get analytics for institution dashboard"""
    
    # 1. Total credentials issued
    total_credentials = await db.credential_issuances.count_documents({
        "institution_id": current_user["user_id"]
    })
    
    # 2. Active classes count
    active_classes = await db.institution_classes.count_documents({
        "institution_id": current_user["user_id"],
        "status": "active"
    })
    
    # 3. Upcoming credential expirations (next 30 days)
    from datetime import timezone
    now = datetime.now(timezone.utc)
    thirty_days_later = now + timedelta(days=30)
    
    expiring_soon = await db.credential_issuances.count_documents({
        "institution_id": current_user["user_id"],
        "expiry_date": {
            "$gte": now.isoformat(),
            "$lte": thirty_days_later.isoformat()
        },
        "status": "active"
    })
    
    # 4. Total students enrolled
    classes = await db.institution_classes.find({
        "institution_id": current_user["user_id"]
    }, {"_id": 0, "total_enrolled": 1}).to_list(1000)
    
    total_students = sum(c.get("total_enrolled", 0) for c in classes)
    
    # 5. Pending verification requests
    pending_verifications = await db.verification_requests.count_documents({
        "institution_id": current_user["user_id"],
        "status": "pending"
    })
    
    # Recent activity
    recent_classes = await db.institution_classes.find({
        "institution_id": current_user["user_id"]
    }, {"_id": 0}).sort("created_date", -1).limit(5).to_list(5)
    
    recent_credentials = await db.credential_issuances.find({
        "institution_id": current_user["user_id"]
    }, {"_id": 0}).sort("issued_date", -1).limit(5).to_list(5)
    
    return {
        "success": True,
        "data": {
            "total_credentials_issued": total_credentials,
            "active_classes": active_classes,
            "upcoming_expirations": expiring_soon,
            "total_students_enrolled": total_students,
            "pending_verification_requests": pending_verifications,
            "recent_classes": recent_classes,
            "recent_credentials": recent_credentials
        }
    }


# ==================== METADATA ====================

@router.get("/metadata/credential-types", response_model=Dict)
async def get_credential_types():
    """Get available credential types"""
    return {
        "success": True,
        "data": {
            "credential_types": CREDENTIAL_TYPES
        }
    }


@router.get("/metadata/class-statuses", response_model=Dict)
async def get_class_statuses():
    """Get available class statuses"""
    return {
        "success": True,
        "data": {
            "class_statuses": CLASS_STATUS
        }
    }
