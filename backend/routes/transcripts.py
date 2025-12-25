"""
Transcript Management Routes
============================
API endpoints for uploading, extracting, and managing academic transcripts.
Integrates with AI extraction and blockchain credential issuance.
"""

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Query
from typing import Dict, Optional
from datetime import datetime, timezone
from uuid import uuid4
import os
import json

from auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/transcripts", tags=["Transcripts"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


@router.post("/upload")
async def upload_transcript(
    file: UploadFile = File(...),
    workforce_id: Optional[str] = Query(None, description="Link transcript to a workforce user"),
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Upload a transcript PDF and extract structured data using AI.
    Institutions can upload transcripts for their students.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    # Save uploaded file
    upload_dir = "/app/backend/uploads/transcripts"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_id = f"transcript_{uuid4().hex[:12]}"
    file_path = os.path.join(upload_dir, f"{file_id}.pdf")
    
    try:
        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Try AI extraction
        extracted_data = None
        extraction_error = None
        
        try:
            from services.transcript_extraction import TranscriptExtractor, validate_transcript_data
            extractor = TranscriptExtractor()
            extraction_result = await extractor.extract_from_pdf(file_path)
            
            if extraction_result.get("success"):
                extracted_data = extraction_result["data"]
                validation = validate_transcript_data(extracted_data)
            else:
                extraction_error = extraction_result.get("error", "Extraction failed")
                validation = {"is_valid": False, "missing_fields": ["all"], "warnings": [extraction_error]}
        except Exception as e:
            extraction_error = str(e)
            validation = {"is_valid": False, "missing_fields": ["all"], "warnings": [str(e)]}
        
        # Store transcript record
        transcript_record = {
            "transcript_id": file_id,
            "file_path": file_path,
            "original_filename": file.filename,
            "file_size": len(content),
            "institution_id": current_user["user_id"],
            "workforce_id": workforce_id,
            "extracted_data": extracted_data,
            "extraction_error": extraction_error,
            "validation": validation,
            "status": "extracted" if extracted_data else "pending_manual_entry",
            "blockchain_credential_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user["user_id"]
        }
        
        await db.transcripts.insert_one(transcript_record)
        
        return {
            "success": True,
            "transcript_id": file_id,
            "extracted_data": extracted_data,
            "extraction_error": extraction_error,
            "validation": validation,
            "status": transcript_record["status"],
            "message": "Transcript uploaded successfully" + (
                " - data extracted" if extracted_data else " - manual entry required"
            )
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process transcript: {str(e)}"
        )


@router.put("/{transcript_id}/data")
async def update_transcript_data(
    transcript_id: str,
    data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Update/correct extracted transcript data manually.
    """
    transcript = await db.transcripts.find_one({"transcript_id": transcript_id})
    
    if not transcript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript not found")
    
    if transcript["institution_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Validate the updated data
    try:
        from services.transcript_extraction import validate_transcript_data
        validation = validate_transcript_data(data)
    except:
        validation = {"is_valid": True, "warnings": []}
    
    await db.transcripts.update_one(
        {"transcript_id": transcript_id},
        {"$set": {
            "extracted_data": data,
            "validation": validation,
            "status": "verified" if validation.get("is_valid") else "pending_verification",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user["user_id"]
        }}
    )
    
    return {
        "success": True,
        "transcript_id": transcript_id,
        "validation": validation,
        "message": "Transcript data updated"
    }


@router.get("/{transcript_id}")
async def get_transcript(
    transcript_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get transcript details by ID."""
    transcript = await db.transcripts.find_one(
        {"transcript_id": transcript_id},
        {"_id": 0}
    )
    
    if not transcript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript not found")
    
    # Check access
    user_id = current_user["user_id"]
    user_type = current_user["user_type"]
    
    if user_type == "institution" and transcript["institution_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if user_type == "workforce" and transcript.get("workforce_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    return {"success": True, "data": transcript}


@router.get("")
async def list_transcripts(
    status_filter: Optional[str] = Query(None),
    workforce_id: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """List transcripts for the current user."""
    user_id = current_user["user_id"]
    user_type = current_user["user_type"]
    
    query = {}
    if user_type == "institution":
        query["institution_id"] = user_id
    elif user_type == "workforce":
        query["workforce_id"] = user_id
    elif user_type == "admin":
        pass  # Admin can see all
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    if status_filter:
        query["status"] = status_filter
    if workforce_id:
        query["workforce_id"] = workforce_id
    
    transcripts = await db.transcripts.find(
        query, 
        {"_id": 0, "file_path": 0}  # Exclude sensitive data
    ).sort("created_at", -1).to_list(limit)
    
    return {
        "success": True,
        "data": {
            "transcripts": transcripts,
            "total": len(transcripts)
        }
    }


@router.delete("/{transcript_id}")
async def delete_transcript(
    transcript_id: str,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Delete a transcript."""
    transcript = await db.transcripts.find_one({"transcript_id": transcript_id})
    
    if not transcript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript not found")
    
    if transcript["institution_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    if transcript.get("blockchain_credential_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete transcript with issued credential"
        )
    
    # Delete file
    if os.path.exists(transcript.get("file_path", "")):
        os.remove(transcript["file_path"])
    
    await db.transcripts.delete_one({"transcript_id": transcript_id})
    
    return {"success": True, "message": "Transcript deleted"}


@router.post("/{transcript_id}/issue-credential")
async def issue_credential_from_transcript(
    transcript_id: str,
    options: Optional[dict] = None,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Issue a blockchain credential from transcript data.
    """
    transcript = await db.transcripts.find_one({"transcript_id": transcript_id})
    
    if not transcript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript not found")
    
    if transcript["institution_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    if transcript.get("blockchain_credential_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credential already issued for this transcript"
        )
    
    if not transcript.get("extracted_data"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript data not available. Please upload or enter data first."
        )
    
    # Get institution profile
    institution = await db.institution_profiles.find_one(
        {"institution_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    # Prepare credential data
    extracted = transcript["extracted_data"]
    credential_data = {
        "worker_id": transcript.get("workforce_id", ""),
        "credential_name": f"Academic Transcript - {extracted.get('program', {}).get('name', 'Unknown Program')}",
        "program_name": extracted.get("program", {}).get("name", ""),
        "issue_date": datetime.now(timezone.utc).isoformat(),
        "student_name": extracted.get("student", {}).get("name", ""),
        "student_id": extracted.get("student", {}).get("student_id", ""),
        "grade_gpa": str(extracted.get("academic_record", {}).get("cumulative_gpa", "")),
        "additional_details": {
            "institution": extracted.get("institution", {}),
            "academic_record": extracted.get("academic_record", {}),
            "courses_count": len(extracted.get("courses", [])),
            "transcript_id": transcript_id
        }
    }
    
    # Import and call existing credential issuance
    try:
        from routes.blockchain_credentials import issue_blockchain_credential
        result = await issue_blockchain_credential(credential_data, current_user, db)
        
        # Update transcript with credential ID
        credential_id = result.get("data", {}).get("credential_id")
        if credential_id:
            await db.transcripts.update_one(
                {"transcript_id": transcript_id},
                {"$set": {
                    "blockchain_credential_id": credential_id,
                    "status": "credentialed"
                }}
            )
        
        return {
            "success": True,
            "transcript_id": transcript_id,
            "credential": result.get("data"),
            "message": "Blockchain credential issued from transcript"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to issue credential: {str(e)}"
        )


@router.get("/{transcript_id}/courses")
async def get_transcript_courses(
    transcript_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get course list from a transcript."""
    transcript = await db.transcripts.find_one(
        {"transcript_id": transcript_id},
        {"_id": 0, "extracted_data.courses": 1, "institution_id": 1, "workforce_id": 1}
    )
    
    if not transcript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript not found")
    
    # Check access
    user_id = current_user["user_id"]
    user_type = current_user["user_type"]
    
    if user_type == "institution" and transcript.get("institution_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if user_type == "workforce" and transcript.get("workforce_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    courses = transcript.get("extracted_data", {}).get("courses", [])
    
    return {
        "success": True,
        "data": {
            "courses": courses,
            "total": len(courses)
        }
    }
