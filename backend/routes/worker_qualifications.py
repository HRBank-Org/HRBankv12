from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Dict, Optional
from datetime import datetime
from database import get_database
from auth.dependencies import get_current_user, require_role
from models.occupation_templates import (
    WorkerQualification,
    CreateWorkerQualificationRequest,
    UpdateWorkerQualificationRequest
)
from utils.match_score_calculator import calculate_match_score
import uuid
import os
import json
from pathlib import Path

router = APIRouter()

# Document upload directory
DOCUMENTS_DIR = Path("/app/backend/uploads/documents")
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/worker/qualifications/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role("workforce"))
):
    """Upload certification or requirement document"""
    
    # Validate file type
    allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not allowed. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique filename
    filename = f"{current_user['user_id']}_{uuid.uuid4()}{file_ext}"
    file_path = DOCUMENTS_DIR / filename
    
    # Save file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        document_url = f"/api/uploads/documents/{filename}"
        
        return {
            "success": True,
            "data": {
                "document_url": document_url,
                "filename": file.filename
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/worker/qualifications")
async def get_my_qualifications(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_database)
):
    """Get all qualifications for current worker"""
    qualifications = await db.worker_qualifications.find(
        {"worker_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": qualifications
    }


@router.get("/worker/qualifications/{qualification_id}")
async def get_qualification_by_id(
    qualification_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_database)
):
    """Get single qualification by ID"""
    qualification = await db.worker_qualifications.find_one(
        {
            "qualification_id": qualification_id,
            "worker_id": current_user["user_id"]
        },
        {"_id": 0}
    )
    
    if not qualification:
        raise HTTPException(status_code=404, detail="Qualification not found")
    
    return {
        "success": True,
        "data": qualification
    }


@router.post("/worker/qualifications")
async def create_qualification(
    request: CreateWorkerQualificationRequest,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_database)
):
    """Create new worker qualification for an occupation"""
    
    # Get occupation template
    template = await db.occupation_templates.find_one(
        {"template_id": request.occupation_template_id, "active": True},
        {"_id": 0}
    )
    
    if not template:
        raise HTTPException(status_code=404, detail="Occupation template not found or inactive")
    
    # Check if qualification already exists for this occupation
    existing = await db.worker_qualifications.find_one({
        "worker_id": current_user["user_id"],
        "occupation_template_id": request.occupation_template_id
    })
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Qualification for this occupation already exists. Use update endpoint instead."
        )
    
    # Calculate match score
    worker_qual_data = {
        "certifications": [cert.dict() for cert in request.certifications],
        "skills": [skill.dict() for skill in request.skills],
        "experience": request.experience.dict(),
        "physical_requirements": [pr.dict() for pr in request.physical_requirements],
        "other_requirements": [ot.dict() for ot in request.other_requirements]
    }
    
    match_score = calculate_match_score(template, worker_qual_data)
    
    # Create qualification
    qualification = {
        "qualification_id": str(uuid.uuid4()),
        "worker_id": current_user["user_id"],
        "occupation_template_id": request.occupation_template_id,
        "occupation_name": template["name"],
        "certifications": [cert.dict() for cert in request.certifications],
        "skills": [skill.dict() for skill in request.skills],
        "experience": request.experience.dict(),
        "physical_requirements": [pr.dict() for pr in request.physical_requirements],
        "other_requirements": [ot.dict() for ot in request.other_requirements],
        "match_score": match_score,
        "last_calculated": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.worker_qualifications.insert_one(qualification)
    
    return {
        "success": True,
        "data": qualification,
        "message": f"Qualification created with match score: {match_score}%"
    }


@router.put("/worker/qualifications/{qualification_id}")
async def update_qualification(
    qualification_id: str,
    request: UpdateWorkerQualificationRequest,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_database)
):
    """Update worker qualification"""
    
    # Get existing qualification
    qualification = await db.worker_qualifications.find_one({
        "qualification_id": qualification_id,
        "worker_id": current_user["user_id"]
    })
    
    if not qualification:
        raise HTTPException(status_code=404, detail="Qualification not found")
    
    # Get occupation template
    template = await db.occupation_templates.find_one(
        {"template_id": qualification["occupation_template_id"]},
        {"_id": 0}
    )
    
    if not template:
        raise HTTPException(status_code=404, detail="Occupation template not found")
    
    # Build update data
    update_data = {}
    if request.certifications is not None:
        update_data["certifications"] = [cert.dict() for cert in request.certifications]
    if request.skills is not None:
        update_data["skills"] = [skill.dict() for skill in request.skills]
    if request.experience is not None:
        update_data["experience"] = request.experience.dict()
    if request.physical_requirements is not None:
        update_data["physical_requirements"] = [pr.dict() for pr in request.physical_requirements]
    if request.other_requirements is not None:
        update_data["other_requirements"] = [ot.dict() for ot in request.other_requirements]
    
    # Merge with existing data for match score calculation
    updated_qual_data = {
        "certifications": update_data.get("certifications", qualification.get("certifications", [])),
        "skills": update_data.get("skills", qualification.get("skills", [])),
        "experience": update_data.get("experience", qualification.get("experience", {})),
        "physical_requirements": update_data.get("physical_requirements", qualification.get("physical_requirements", [])),
        "other_requirements": update_data.get("other_requirements", qualification.get("other_requirements", []))
    }
    
    # Recalculate match score
    match_score = calculate_match_score(template, updated_qual_data)
    
    update_data["match_score"] = match_score
    update_data["last_calculated"] = datetime.utcnow()
    update_data["updated_at"] = datetime.utcnow()
    
    # Update
    await db.worker_qualifications.update_one(
        {"qualification_id": qualification_id},
        {"$set": update_data}
    )
    
    # Get updated qualification
    updated = await db.worker_qualifications.find_one(
        {"qualification_id": qualification_id},
        {"_id": 0}
    )
    
    return {
        "success": True,
        "data": updated,
        "message": f"Qualification updated with new match score: {match_score}%"
    }


@router.delete("/worker/qualifications/{qualification_id}")
async def delete_qualification(
    qualification_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_database)
):
    """Delete worker qualification"""
    
    qualification = await db.worker_qualifications.find_one({
        "qualification_id": qualification_id,
        "worker_id": current_user["user_id"]
    })
    
    if not qualification:
        raise HTTPException(status_code=404, detail="Qualification not found")
    
    await db.worker_qualifications.delete_one({"qualification_id": qualification_id})
    
    return {
        "success": True,
        "message": "Qualification deleted successfully"
    }


@router.post("/worker/qualifications/{qualification_id}/recalculate")
async def recalculate_match_score(
    qualification_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_database)
):
    """Recalculate match score for a qualification (useful after template updates)"""
    
    qualification = await db.worker_qualifications.find_one({
        "qualification_id": qualification_id,
        "worker_id": current_user["user_id"]
    })
    
    if not qualification:
        raise HTTPException(status_code=404, detail="Qualification not found")
    
    # Get template
    template = await db.occupation_templates.find_one(
        {"template_id": qualification["occupation_template_id"]},
        {"_id": 0}
    )
    
    if not template:
        raise HTTPException(status_code=404, detail="Occupation template not found")
    
    # Recalculate
    match_score = calculate_match_score(template, qualification)
    
    await db.worker_qualifications.update_one(
        {"qualification_id": qualification_id},
        {
            "$set": {
                "match_score": match_score,
                "last_calculated": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "data": {
            "match_score": match_score
        },
        "message": "Match score recalculated"
    }


# Employer/Admin endpoints to view worker qualifications
@router.get("/employer/workers/{worker_id}/qualifications")
async def get_worker_qualifications_by_employer(
    worker_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_database)
):
    """Get worker qualifications (Employer view)"""
    qualifications = await db.worker_qualifications.find(
        {"worker_id": worker_id},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": qualifications
    }


@router.post("/employer/workers/{worker_id}/qualifications/{qualification_id}/verify")
async def verify_worker_skill_or_cert(
    worker_id: str,
    qualification_id: str,
    verification_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_database)
):
    """
    Employer verifies a worker's skill or certification
    verification_data: {
        "type": "skill" or "certification",
        "name": "Conflict Resolution",
        "verified": true
    }
    """
    
    qualification = await db.worker_qualifications.find_one({
        "qualification_id": qualification_id,
        "worker_id": worker_id
    })
    
    if not qualification:
        raise HTTPException(status_code=404, detail="Qualification not found")
    
    verification_type = verification_data.get("type")
    item_name = verification_data.get("name")
    verified = verification_data.get("verified", True)
    
    if verification_type == "skill":
        # Update skill verification
        skills = qualification.get("skills", [])
        for skill in skills:
            if skill["name"] == item_name:
                skill["verified"] = verified
                skill["verified_by"] = current_user["user_id"]
                skill["verified_date"] = datetime.utcnow().isoformat()
                break
        
        await db.worker_qualifications.update_one(
            {"qualification_id": qualification_id},
            {"$set": {"skills": skills, "updated_at": datetime.utcnow()}}
        )
    
    elif verification_type == "certification":
        # Update certification verification
        certifications = qualification.get("certifications", [])
        for cert in certifications:
            if cert["name"] == item_name:
                cert["verified"] = verified
                cert["verified_by"] = current_user["user_id"]
                cert["verified_date"] = datetime.utcnow().isoformat()
                break
        
        await db.worker_qualifications.update_one(
            {"qualification_id": qualification_id},
            {"$set": {"certifications": certifications, "updated_at": datetime.utcnow()}}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Invalid verification type")
    
    return {
        "success": True,
        "message": f"{verification_type.capitalize()} '{item_name}' verification updated"
    }
