from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Dict, List
from datetime import datetime, timedelta, timezone
from auth.dependencies import get_current_user
from models.documents import Document, WORKFORCE_DOCUMENT_TYPES, EMPLOYER_DOCUMENT_TYPES, INSTITUTION_DOCUMENT_TYPES, get_institution_document_types
import base64
import os

router = APIRouter(prefix="/api/documents", tags=["Documents"])

def get_db():
    from server import db
    return db

async def get_document_types_for_user(user_type: str, user_id: str, db) -> dict:
    """Get document types for user type, considering country for institutions"""
    if user_type == 'workforce':
        return WORKFORCE_DOCUMENT_TYPES
    elif user_type == 'employer':
        return EMPLOYER_DOCUMENT_TYPES
    elif user_type == 'institution':
        # Check institution's country
        profile = await db.institution_profiles.find_one({"institution_id": user_id})
        country = profile.get("country") if profile else None
        return get_institution_document_types(country)
    return {}

def get_document_types(user_type: str):
    """Get document types for user type (legacy function for non-institution types)"""
    type_map = {
        'workforce': WORKFORCE_DOCUMENT_TYPES,
        'employer': EMPLOYER_DOCUMENT_TYPES,
        'institution': INSTITUTION_DOCUMENT_TYPES  # Default Canadian
    }
    return type_map.get(user_type, {})

def calculate_expiry_status(expiry_date: str):
    """Calculate if document is expired and days until expiry"""
    if not expiry_date:
        return False, None
    
    try:
        expiry = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
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

@router.get("/me", response_model=Dict)
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
    file_data: str = None,  # base64 encoded (optional for number-only docs)
    file_type: str = None,
    document_number: str = None,  # For number-only documents
    issue_date: str = None,
    expiry_date: str = None,
    notes: str = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Upload a document (file or number)"""
    
    # Validate document type
    document_types = get_document_types(current_user["user_type"])
    if document_type not in document_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document type"
        )
    
    doc_config = document_types[document_type]
    file_url = None
    file_size = None
    
    # Handle number-only documents
    if doc_config.get('is_number_only'):
        if not document_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document number is required for this document type"
            )
        
        # Validate number format
        import re
        pattern = doc_config.get('number_pattern')
        if pattern:
            # Normalize spaces for validation
            normalized_number = ' '.join(document_number.split())
            if not re.match(pattern, normalized_number):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid format. Expected: {doc_config.get('number_format')}. Example: {doc_config.get('number_example')}"
                )
    
    # Handle file-based documents
    elif doc_config.get('requires_file', True):
        if not file_data or not file_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is required for this document type"
            )
        
        # Validate file type
        allowed_types = ['pdf', 'jpg', 'jpeg', 'png']
        if file_type.lower() not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type must be one of: {', '.join(allowed_types)}"
            )
        
        # Decode and store file
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
            file_name = f"{current_user['user_id']}_{document_type}_{datetime.now(timezone.utc).timestamp()}.{file_type}"
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
        document_number=document_number,
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
        "message": "Document submitted successfully"
    }

@router.delete("/{document_id}", response_model=Dict)
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Delete a document (only if not approved or pending)"""
    document = await db.documents.find_one({
        "document_id": document_id,
        "user_id": current_user["user_id"]
    })
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Prevent deletion if approved or pending review
    if document.get("verification_status") in ["verified", "pending"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete documents that are approved or pending review. Please contact HR Bank support."
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


# ==================== ADMIN ROUTES ====================

@router.get("/admin/pending-documents", response_model=Dict)
async def get_pending_documents_for_review(
    user_type_filter: str = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get all pending documents for admin review"""
    query = {"verification_status": "pending"}
    if user_type_filter:
        query["user_type"] = user_type_filter
    
    documents = await db.documents.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with user information
    for doc in documents:
        user = await db.users.find_one(
            {"user_id": doc["user_id"]},
            {"_id": 0, "full_name": 1, "email": 1, "user_type": 1}
        )
        if user:
            doc["user_info"] = user
    
    return {
        "success": True,
        "data": {
            "pending_documents": documents,
            "total_count": len(documents)
        }
    }

@router.post("/admin/documents/{document_id}/approve", response_model=Dict)
async def approve_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Approve a document"""
    document = await db.documents.find_one({"document_id": document_id})
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update document status
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {
            "verification_status": "verified",
            "verified_by": current_user["user_id"],
            "verified_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send notification to user
    import uuid
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": document["user_id"],
        "type": "document_approved",
        "title": "Document Approved",
        "message": f"Your {document['document_name']} has been verified and approved.",
        "data": {
            "document_id": document_id,
            "document_type": document["document_type"]
        },
        "read": False,
        "created_date": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Update account status
    await update_account_status(db, document["user_id"], document["user_type"])
    
    return {
        "success": True,
        "message": "Document approved successfully"
    }

@router.post("/admin/documents/{document_id}/reject", response_model=Dict)
async def reject_document(
    document_id: str,
    rejection_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Reject a document"""
    document = await db.documents.find_one({"document_id": document_id})
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    rejection_reason = rejection_data.get("rejection_reason", "Document did not meet requirements")
    
    # Update document status
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {
            "verification_status": "rejected",
            "verified_by": current_user["user_id"],
            "verified_date": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": rejection_reason
        }}
    )
    
    # Send notification to user
    import uuid
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": document["user_id"],
        "type": "document_rejected",
        "title": "Document Rejected",
        "message": f"Your {document['document_name']} was rejected. Reason: {rejection_reason}",
        "data": {
            "document_id": document_id,
            "document_type": document["document_type"],
            "rejection_reason": rejection_reason
        },
        "read": False,
        "created_date": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Update account status
    await update_account_status(db, document["user_id"], document["user_type"])
    
    return {
        "success": True,
        "message": "Document rejected"
    }

@router.post("/admin/send-expiry-notifications", response_model=Dict)
async def trigger_expiry_notifications(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Send notifications for documents expiring in 7 days"""
    try:
        count = await send_expiry_notifications(db)
        return {
            "success": True,
            "message": f"Sent {count} expiry notifications"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed: {str(e)}"
        )

@router.post("/admin/run-expiry-check", response_model=Dict)
async def manual_expiry_check(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Manually trigger full document expiry check (admin only)"""
    # Verify admin permissions
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        from services.document_scheduler import run_manual_check
        result = await run_manual_check(db)
        return {
            "success": True,
            "data": result,
            "message": "Manual expiry check completed"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed: {str(e)}"
        )

# ==================== HELPER FUNCTIONS ====================

async def update_account_status(db, user_id: str, user_type: str):
    """Update user account status based on document compliance"""
    document_types = get_document_types(user_type)
    required_types = [k for k, v in document_types.items() if v.get('required')]
    
    # Get verified documents
    documents = await db.documents.find({
        "user_id": user_id,
        "verification_status": "verified"
    }).to_list(100)
    
    # Check for expired documents
    verified_types = []
    for doc in documents:
        if doc.get("expiry_date"):
            is_expired, _ = calculate_expiry_status(doc["expiry_date"])
            if not is_expired:
                verified_types.append(doc["document_type"])
        else:
            verified_types.append(doc["document_type"])
    
    # Check if all required documents are verified
    all_required_verified = all(req_type in verified_types for req_type in required_types)
    
    # Update user account status
    account_status = "active" if all_required_verified else "incomplete_documents"
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"account_status": account_status}}
    )

async def send_expiry_notifications(db):
    """Send notifications for documents expiring in 7 days"""
    import uuid
    
    documents = await db.documents.find({
        "expiry_date": {"$ne": None},
        "verification_status": "verified"
    }).to_list(10000)
    
    notifications_sent = 0
    
    for doc in documents:
        if not doc.get("expiry_date"):
            continue
            
        try:
            expiry_date_obj = datetime.fromisoformat(doc["expiry_date"].replace('Z', '+00:00'))
            days_until = (expiry_date_obj - datetime.now(timezone.utc)).days
            
            # Send notification if expiring in exactly 7 days
            if days_until == 7:
                # Check if notification already sent today
                today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
                existing_notif = await db.notifications.find_one({
                    "user_id": doc["user_id"],
                    "type": "document_expiring",
                    "data.document_id": doc["document_id"],
                    "created_date": {"$gte": today_start.isoformat()}
                })
                
                if not existing_notif:
                    notification = {
                        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                        "user_id": doc["user_id"],
                        "type": "document_expiring",
                        "title": "Document Expiring Soon",
                        "message": f"⚠️ Your {doc['document_name']} expires in 7 days on {expiry_date_obj.strftime('%B %d, %Y')}. Please upload a new document.",
                        "data": {
                            "document_id": doc["document_id"],
                            "document_type": doc["document_type"],
                            "expiry_date": doc["expiry_date"]
                        },
                        "read": False,
                        "created_date": datetime.now(timezone.utc).isoformat()
                    }
                    await db.notifications.insert_one(notification)
                    notifications_sent += 1
        except Exception as e:
            print(f"Error processing document expiry: {e}")
            continue
    
    return notifications_sent

