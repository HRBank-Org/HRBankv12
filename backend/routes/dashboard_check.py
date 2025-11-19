"""
Dashboard Check Routes - Check if user needs to complete profile or upload documents
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from datetime import datetime, date

from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard Check"])


def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


@router.get("/check-status", response_model=Dict)
async def check_dashboard_status(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Check if user can access dashboard or needs to complete actions first
    Returns blocking issues and action items
    """
    try:
        user_id = current_user["user_id"]
        user_type = current_user["user_type"]
        
        blocking_issues = []
        warnings = []
        
        # Check based on user type
        if user_type == "workforce":
            # Check profile completion
            profile = await db.workforce_profiles.find_one({"user_id": user_id})
            
            if not profile:
                blocking_issues.append({
                    "type": "profile_missing",
                    "title": "Complete Your Profile",
                    "description": "Please complete your workforce profile to access the platform.",
                    "action": "Complete Profile",
                    "link": "/workforce/profile-wizard"
                })
            else:
                # Check required profile fields
                required_fields = ["full_name", "phone", "date_of_birth", "sin_number"]
                missing_fields = [field for field in required_fields if not profile.get(field)]
                
                if missing_fields:
                    blocking_issues.append({
                        "type": "profile_incomplete",
                        "title": "Complete Required Information",
                        "description": f"Please provide: {', '.join(missing_fields).replace('_', ' ').title()}",
                        "action": "Update Profile",
                        "link": "/workforce/profile"
                    })
            
            # Check required documents
            documents_cursor = db.documents.find({
                "user_id": user_id,
                "required": True
            })
            documents = await documents_cursor.to_list(length=None)
            
            # Check for missing required documents
            required_doc_types = ["work_permit", "sin_card", "void_cheque"]
            uploaded_types = [doc.get("document_type") for doc in documents]
            missing_doc_types = [dt for dt in required_doc_types if dt not in uploaded_types]
            
            if missing_doc_types:
                blocking_issues.append({
                    "type": "documents_missing",
                    "title": "Upload Required Documents",
                    "description": f"Missing documents: {', '.join(missing_doc_types).replace('_', ' ').title()}",
                    "action": "Upload Documents",
                    "link": "/workforce/documents"
                })
            
            # Check for expired documents
            expired_docs = []
            expiring_soon_docs = []
            
            for doc in documents:
                if doc.get("status") != "verified":
                    continue
                
                expiry_date_str = doc.get("expiry_date")
                if expiry_date_str:
                    try:
                        if isinstance(expiry_date_str, str):
                            expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00')).date()
                        else:
                            expiry_date = expiry_date_str
                        
                        today = date.today()
                        days_until_expiry = (expiry_date - today).days
                        
                        if days_until_expiry < 0:
                            expired_docs.append(doc.get("document_name", doc.get("document_type")))
                        elif days_until_expiry <= 7:
                            expiring_soon_docs.append({
                                "name": doc.get("document_name", doc.get("document_type")),
                                "days": days_until_expiry
                            })
                    except:
                        pass
            
            if expired_docs:
                blocking_issues.append({
                    "type": "documents_expired",
                    "title": "Documents Expired",
                    "description": f"These documents have expired: {', '.join(expired_docs)}. Please upload new versions.",
                    "action": "Upload New Documents",
                    "link": "/workforce/documents"
                })
            
            if expiring_soon_docs:
                for doc_info in expiring_soon_docs:
                    warnings.append({
                        "type": "document_expiring",
                        "title": f"{doc_info['name']} Expiring Soon",
                        "description": f"This document will expire in {doc_info['days']} day(s). Please upload a new version soon.",
                        "action": "Upload Document",
                        "link": "/workforce/documents"
                    })
        
        elif user_type == "employer":
            # Check employer profile completion
            profile = await db.employer_profiles.find_one({"user_id": user_id})
            
            if not profile:
                blocking_issues.append({
                    "type": "profile_missing",
                    "title": "Complete Your Company Profile",
                    "description": "Please complete your employer profile to access the platform.",
                    "action": "Complete Profile",
                    "link": "/employer/onboarding"
                })
            else:
                # Check required profile fields
                required_fields = ["company_name", "contact_name", "phone", "address", "city", "province"]
                missing_fields = [field for field in required_fields if not profile.get(field)]
                
                if missing_fields:
                    blocking_issues.append({
                        "type": "profile_incomplete",
                        "title": "Complete Company Information",
                        "description": f"Please provide: {', '.join(missing_fields).replace('_', ' ').title()}",
                        "action": "Update Profile",
                        "link": "/employer/profile"
                    })
                
                # Check compliance status
                if not profile.get("wsib_verified"):
                    blocking_issues.append({
                        "type": "wsib_verification",
                        "title": "WSIB Verification Required",
                        "description": "Your WSIB coverage must be verified to post shifts and hire workers.",
                        "action": "Complete Verification",
                        "link": "/employer/compliance"
                    })
            
            # Check employer documents
            documents_cursor = db.documents.find({
                "user_id": user_id,
                "required": True
            })
            documents = await documents_cursor.to_list(length=None)
            
            # Check for expired employer documents
            expired_docs = []
            for doc in documents:
                if doc.get("status") != "verified":
                    continue
                
                expiry_date_str = doc.get("expiry_date")
                if expiry_date_str:
                    try:
                        if isinstance(expiry_date_str, str):
                            expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00')).date()
                        else:
                            expiry_date = expiry_date_str
                        
                        if expiry_date < date.today():
                            expired_docs.append(doc.get("document_name", doc.get("document_type")))
                    except:
                        pass
            
            if expired_docs:
                blocking_issues.append({
                    "type": "documents_expired",
                    "title": "Business Documents Expired",
                    "description": f"These documents have expired: {', '.join(expired_docs)}. Please upload new versions.",
                    "action": "Upload Documents",
                    "link": "/employer/documents"
                })
        
        # Determine if dashboard should be blocked
        should_block = len(blocking_issues) > 0
        
        return {
            "success": True,
            "data": {
                "should_block": should_block,
                "blocking_issues": blocking_issues,
                "warnings": warnings,
                "user_type": user_type
            }
        }
        
    except Exception as e:
        print(f"Dashboard Check Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check dashboard status: {str(e)}")
