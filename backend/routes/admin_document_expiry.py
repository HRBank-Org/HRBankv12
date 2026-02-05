"""
Admin Document Expiry Dashboard API
View and manage expiring documents across the platform.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Optional, List
from datetime import datetime, timezone

from auth.dependencies import require_role

router = APIRouter(prefix="/admin/document-expiry", tags=["Admin Document Expiry"])


def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


@router.get("/summary")
async def get_expiry_summary(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get summary of document expiry status across the platform"""
    from services.document_expiry_service import document_expiry_service
    
    summary = await document_expiry_service.get_expiry_summary()
    
    return {
        "success": True,
        "data": summary
    }


@router.get("/expiring")
async def get_expiring_documents(
    days_ahead: int = Query(30, ge=1, le=90, description="Days to look ahead"),
    user_type: Optional[str] = Query(None, description="Filter by user type"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get list of documents expiring within specified days"""
    from services.document_expiry_service import document_expiry_service
    
    documents = await document_expiry_service.get_expiring_documents(
        days_ahead=days_ahead,
        user_type=user_type,
        document_type=document_type
    )
    
    # Paginate
    total = len(documents)
    start = (page - 1) * limit
    end = start + limit
    paginated_docs = documents[start:end]
    
    return {
        "success": True,
        "data": {
            "documents": paginated_docs,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
    }


@router.get("/expired")
async def get_expired_documents(
    user_type: Optional[str] = Query(None, description="Filter by user type"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get list of expired documents"""
    from services.document_expiry_service import document_expiry_service
    
    documents = await document_expiry_service.get_expired_documents(user_type=user_type)
    
    # Paginate
    total = len(documents)
    start = (page - 1) * limit
    end = start + limit
    paginated_docs = documents[start:end]
    
    return {
        "success": True,
        "data": {
            "documents": paginated_docs,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
    }


@router.get("/document-types")
async def get_document_types_config(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get configuration of document types and their expiry requirements"""
    from services.document_expiry_service import (
        DOCUMENTS_REQUIRING_EXPIRY,
        DOCUMENTS_NO_EXPIRY,
        REMINDER_INTERVALS
    )
    
    return {
        "success": True,
        "data": {
            "requires_expiry": DOCUMENTS_REQUIRING_EXPIRY,
            "no_expiry": DOCUMENTS_NO_EXPIRY,
            "reminder_intervals_days": REMINDER_INTERVALS
        }
    }


@router.post("/trigger-reminders")
async def trigger_expiry_reminders(
    send_sms: bool = Query(True, description="Also send SMS reminders"),
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Manually trigger expiry reminder processing"""
    from services.document_expiry_service import document_expiry_service
    from services.audit_logger import audit_logger, AuditEventType
    
    results = await document_expiry_service.process_all_reminders(send_sms=send_sms)
    
    # Log admin action
    await audit_logger.log(
        event_type=AuditEventType.ADMIN_ACTION,
        action="trigger_expiry_reminders",
        description=f"Admin triggered document expiry reminders",
        actor_id=current_user["user_id"],
        actor_email=current_user["email"],
        actor_type="admin",
        metadata=results
    )
    
    return {
        "success": True,
        "data": results,
        "message": f"Processed {results['total_processed']} documents, sent {results['reminders_sent']} reminders"
    }


@router.post("/send-reminder/{document_id}")
async def send_single_reminder(
    document_id: str,
    send_sms: bool = Query(True, description="Also send SMS"),
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Send reminder for a specific document"""
    from services.document_expiry_service import document_expiry_service
    from services.audit_logger import audit_logger, AuditEventType
    
    # Get document
    document = await db.documents.find_one({"document_id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.get("expiry_date"):
        raise HTTPException(status_code=400, detail="Document has no expiry date")
    
    # Get user and profile
    user = await db.users.find_one({"user_id": document["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    profile = await document_expiry_service._get_user_profile(
        document["user_id"],
        user.get("user_type")
    )
    
    # Calculate days until expiry
    expiry_date = datetime.fromisoformat(document["expiry_date"].replace('Z', '+00:00'))
    days_until = (expiry_date - datetime.now(timezone.utc)).days
    
    # Send reminder
    result = await document_expiry_service.send_expiry_reminder(
        document=document,
        user=user,
        profile=profile,
        days_until=days_until,
        send_sms=send_sms
    )
    
    # Log admin action
    await audit_logger.log(
        event_type=AuditEventType.ADMIN_ACTION,
        action="send_single_reminder",
        description=f"Admin sent expiry reminder for document {document_id}",
        actor_id=current_user["user_id"],
        actor_email=current_user["email"],
        actor_type="admin",
        target_type="document",
        target_id=document_id,
        metadata={"days_until_expiry": days_until, **result}
    )
    
    return {
        "success": True,
        "data": {
            "document_id": document_id,
            "user_email": user.get("email"),
            "days_until_expiry": days_until,
            **result
        }
    }


@router.get("/user/{user_id}/documents")
async def get_user_documents_expiry(
    user_id: str,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get all documents for a specific user with expiry info"""
    from services.document_expiry_service import DOCUMENTS_REQUIRING_EXPIRY
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    documents = await db.documents.find({"user_id": user_id}).to_list(100)
    
    now = datetime.now(timezone.utc)
    
    enriched_docs = []
    for doc in documents:
        doc_type = doc.get("document_type", "")
        requires_expiry = doc_type in DOCUMENTS_REQUIRING_EXPIRY
        
        days_until = None
        is_expired = False
        
        if doc.get("expiry_date"):
            try:
                expiry = datetime.fromisoformat(doc["expiry_date"].replace('Z', '+00:00'))
                days_until = (expiry - now).days
                is_expired = days_until < 0
            except:
                pass
        
        enriched_docs.append({
            "document_id": doc.get("document_id"),
            "document_type": doc_type,
            "document_name": doc.get("document_name") or DOCUMENTS_REQUIRING_EXPIRY.get(doc_type, {}).get("name", doc_type),
            "verification_status": doc.get("verification_status"),
            "expiry_date": doc.get("expiry_date"),
            "days_until_expiry": days_until,
            "is_expired": is_expired,
            "requires_expiry_date": requires_expiry,
            "missing_expiry": requires_expiry and not doc.get("expiry_date"),
            "reminders_sent": doc.get("reminders_sent", []),
            "last_reminder_sent": doc.get("last_reminder_sent"),
            "uploaded_at": doc.get("uploaded_at") or doc.get("created_at")
        })
    
    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "user_email": user.get("email"),
            "user_type": user.get("user_type"),
            "documents": enriched_docs,
            "total": len(enriched_docs),
            "expiring_soon": len([d for d in enriched_docs if d.get("days_until_expiry") is not None and 0 <= d["days_until_expiry"] <= 30]),
            "expired": len([d for d in enriched_docs if d.get("is_expired")]),
            "missing_expiry": len([d for d in enriched_docs if d.get("missing_expiry")])
        }
    }


@router.get("/restricted-accounts")
async def get_restricted_accounts(
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get accounts restricted due to expired documents"""
    
    query = {
        "account_status": "restricted",
        "restriction_reason": "expired_documents"
    }
    
    total = await db.users.count_documents(query)
    
    users = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).skip((page - 1) * limit).limit(limit).to_list(length=limit)
    
    # Enrich with profile info
    enriched_users = []
    for user in users:
        user_type = user.get("user_type")
        profile = {}
        
        if user_type == "workforce":
            profile = await db.workforce_profiles.find_one({"workforce_id": user["user_id"]}) or {}
        elif user_type == "employer":
            profile = await db.employer_profiles.find_one({"employer_id": user["user_id"]}) or {}
        elif user_type == "institution":
            profile = await db.institution_profiles.find_one({"institution_id": user["user_id"]}) or {}
        
        enriched_users.append({
            "user_id": user.get("user_id"),
            "email": user.get("email"),
            "user_type": user_type,
            "full_name": profile.get("full_name") or profile.get("contact_name") or profile.get("institution_name"),
            "restricted_date": user.get("restricted_date"),
            "expired_documents": user.get("expired_documents", [])
        })
    
    return {
        "success": True,
        "data": {
            "users": enriched_users,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
    }


@router.post("/unrestrict-account/{user_id}")
async def unrestrict_account(
    user_id: str,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Manually unrestrict an account (admin override)"""
    from services.audit_logger import audit_logger, AuditEventType
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("account_status") != "restricted":
        raise HTTPException(status_code=400, detail="Account is not restricted")
    
    # Unrestrict account
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "account_status": "active",
            "restriction_reason": None,
            "restricted_date": None,
            "admin_unrestricted_by": current_user["user_id"],
            "admin_unrestricted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log admin action
    await audit_logger.log(
        event_type=AuditEventType.ADMIN_ACTION,
        action="unrestrict_account",
        description=f"Admin manually unrestricted account",
        actor_id=current_user["user_id"],
        actor_email=current_user["email"],
        actor_type="admin",
        target_type="user",
        target_id=user_id
    )
    
    return {
        "success": True,
        "message": f"Account {user.get('email')} has been unrestricted"
    }
