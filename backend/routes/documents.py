from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Dict, List
from datetime import datetime, timedelta
from auth.dependencies import get_current_user
from models.documents import Document, WORKFORCE_DOCUMENT_TYPES, EMPLOYER_DOCUMENT_TYPES, INSTITUTION_DOCUMENT_TYPES
import base64
import os

router = APIRouter(prefix="/api/documents", tags=["Documents"])

def get_db():
    from server import db
    return db

def get_document_types(user_type: str):
    """Get document types for user type"""
    type_map = {
        'workforce': WORKFORCE_DOCUMENT_TYPES,
        'employer': EMPLOYER_DOCUMENT_TYPES,
        'institution': INSTITUTION_DOCUMENT_TYPES
    }
    return type_map.get(user_type, {})

def calculate_expiry_status(expiry_date: str):
    """Calculate if document is expired and days until expiry"""
    if not expiry_date:
        return False, None
    
    try:
        expiry = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
        now = datetime.utcnow()
        days_until = (expiry - now).days
        is_expired = days_until < 0
        return is_expired, days_until if not is_expired else 0
    except:
        return False, None

@router.get("/types", response_model=Dict)
async def get_required_document_types(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get required document types for current user"""
    document_types = get_document_types(current_user["user_type"])
    
    return {
        "success": True,
        "data": {
            "document_types": document_types,
            "user_type": current_user["user_type"]
        }
    }

@router.get("/my-documents", response_model=Dict)
async def get_my_documents(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get all documents for current user with validity tracking"""
    documents = await db.documents.find({
        "user_id": current_user["user_id"]
    }, {"_id": 0}).to_list(100)
    
    # Update expiry status for each document
    for doc in documents:
        if doc.get("expiry_date"):
            is_expired, days_until = calculate_expiry_status(doc["expiry_date"])
            doc["is_expired"] = is_expired
            doc["days_until_expiry"] = days_until
            
            # Auto-update verification status if expired
            if is_expired and doc.get("verification_status") != "expired":
                await db.documents.update_one(
                    {"document_id": doc["document_id"]},
                    {"$set": {"verification_status": "expired"}}
                )
                doc["verification_status"] = "expired"
    
    # Get document types
    document_types = get_document_types(current_user["user_type"])
    
    # Calculate compliance
    required_types = [k for k, v in document_types.items() if v.get('required')]
    uploaded_types = [d["document_type"] for d in documents if d.get("verification_status") == "verified"]
    missing_required = [t for t in required_types if t not in uploaded_types]
    
    compliance_percentage = 0
    if required_types:
        compliance_percentage = int((len([t for t in required_types if t in uploaded_types]) / len(required_types)) * 100)
    
    return {
        "success": True,
        "data": {
            "documents": documents,
            "compliance": {
                "percentage": compliance_percentage,
                "missing_required": missing_required,
                "total_required": len(required_types),
                "uploaded_required": len([t for t in required_types if t in uploaded_types])
            }
        }
    }

@router.post("/upload", response_model=Dict)
async def upload_document(
    document_type: str,
    document_name: str,
    file_data: str,  # base64 encoded
    file_type: str,
    issue_date: str = None,
    expiry_date: str = None,
    notes: str = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Upload a document (base64 encoded)"""
    
    # Validate document type
    document_types = get_document_types(current_user["user_type"])
    if document_type not in document_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document type"
        )
    
    # Validate file type
    allowed_types = ['pdf', 'jpg', 'jpeg', 'png']
    if file_type.lower() not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type must be one of: {', '.join(allowed_types)}"
        )
    
    # Decode and store file (simplified - in production, use cloud storage)
    try:
        file_bytes = base64.b64decode(file_data)
        file_size = len(file_bytes)
        
        # Check file size (10MB limit)
        if file_size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 10MB"
            )
        
        # Create uploads directory if it doesn't exist
        upload_dir = "/app/backend/uploads/documents"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_name = f"{current_user['user_id']}_{document_type}_{datetime.utcnow().timestamp()}.{file_type}"
        file_path = os.path.join(upload_dir, file_name)
        
        with open(file_path, 'wb') as f:
            f.write(file_bytes)
        
        file_url = f"/uploads/documents/{file_name}"
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Calculate expiry status
    is_expired, days_until = calculate_expiry_status(expiry_date) if expiry_date else (False, None)
    
    # Create document record
    document = Document(
        user_id=current_user["user_id"],
        user_type=current_user["user_type"],
        document_type=document_type,
        document_name=document_name,
        file_url=file_url,
        file_type=file_type,
        file_size=file_size,
        issue_date=issue_date,
        expiry_date=expiry_date,
        is_expired=is_expired,
        days_until_expiry=days_until,
        verification_status='pending',
        notes=notes
    )
    
    await db.documents.insert_one(document.model_dump())
    
    return {
        "success": True,
        "data": {
            "document_id": document.document_id,
            "verification_status": document.verification_status
        },
        "message": "Document uploaded successfully"
    }

@router.delete("/{document_id}", response_model=Dict)
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Delete a document"""
    document = await db.documents.find_one({
        "document_id": document_id,
        "user_id": current_user["user_id"]
    })
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete file
    try:
        file_path = f"/app/backend{document['file_url']}"
        if os.path.exists(file_path):
            os.remove(file_path)
    except:
        pass
    
    # Delete record
    await db.documents.delete_one({"document_id": document_id})
    
    return {
        "success": True,
        "message": "Document deleted"
    }

@router.get("/expiring-soon", response_model=Dict)
async def get_expiring_documents(
    days: int = 30,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get documents expiring within specified days"""
    documents = await db.documents.find({
        "user_id": current_user["user_id"],
        "expiry_date": {"$ne": None}
    }, {"_id": 0}).to_list(100)
    
    expiring_soon = []
    for doc in documents:
        is_expired, days_until = calculate_expiry_status(doc.get("expiry_date"))
        if days_until is not None and 0 <= days_until <= days:
            doc["days_until_expiry"] = days_until
            expiring_soon.append(doc)
    
    return {
        "success": True,
        "data": {
            "expiring_documents": expiring_soon,
            "count": len(expiring_soon)
        }
    }
