from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
from auth.dependencies import require_role, get_current_user
import uuid

router = APIRouter(prefix="/api/match-engine", tags=["Match Engine"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

# ==================== MATCH ENGINE CORE ====================

async def find_qualified_workers(db, job_posting: dict, role: dict) -> List[dict]:
    """
    Find all qualified workers for a job posting.
    Qualified = Active profile + Has all required certifications
    """
    required_certs = role.get("required_certifications", [])
    required_certs_lower = [c.lower() for c in required_certs]
    
    # Find active workforce profiles
    profiles = await db.workforce_profiles.find({
        "matching_active": {"$ne": False},  # Default to active if not set
        "status": {"$ne": "inactive"}
    }, {"_id": 0}).to_list(1000)
    
    qualified_workers = []
    
    for profile in profiles:
        # Check certification compliance
        worker_certs = [c.lower() for c in profile.get("certifications", [])]
        
        if required_certs_lower:
            # All required certs must be present
            has_all_certs = all(cert in worker_certs for cert in required_certs_lower)
            if not has_all_certs:
                continue
        
        # Get worker user data
        worker = await db.users.find_one(
            {"user_id": profile.get("workforce_id")},
            {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "phone": 1, "status": 1}
        )
        
        if not worker or worker.get("status") != "active":
            continue
        
        # Check if already applied to this posting
        existing_app = await db.job_applications.find_one({
            "posting_id": job_posting["posting_id"],
            "applicant_id": worker["user_id"]
        })
        
        if existing_app:
            continue  # Already applied
        
        # Check if already employed by this employer for this role
        existing_employment = await db.employment_relationships.find_one({
            "employer_id": job_posting["employer_id"],
            "workforce_id": worker["user_id"],
            "role_id": role.get("role_id"),
            "status": "active"
        })
        
        if existing_employment:
            continue  # Already employed in this role
        
        qualified_workers.append({
            **worker,
            "profile": profile,
            "certifications": profile.get("certifications", []),
            "skills": profile.get("skills", []),
            "experience_years": profile.get("experience_years", 0)
        })
    
    return qualified_workers


async def auto_apply_for_worker(db, worker: dict, job_posting: dict, role: dict) -> dict:
    """
    Create an auto-application for a qualified worker.
    Status: 'matched' (pending worker confirmation)
    """
    application = {
        "application_id": f"app_{uuid.uuid4().hex[:12]}",
        "posting_id": job_posting["posting_id"],
        "employer_id": job_posting["employer_id"],
        "applicant_id": worker["user_id"],
        "position_title": job_posting.get("title"),
        "role_id": role.get("role_id"),
        "stage": "matched",  # Special stage for auto-matched
        "match_source": "match_engine",
        "auto_applied": True,
        "applied_date": datetime.now(timezone.utc).isoformat(),
        "stage_updated_at": datetime.now(timezone.utc).isoformat(),
        "worker_confirmed": False,
        "worker_response": None,  # 'confirmed', 'declined', None
        "source": "match_engine"
    }
    
    await db.job_applications.insert_one(application)
    return application


async def create_notification(db, user_id: str, notification_type: str, data: dict) -> dict:
    """Create an in-app notification for a user"""
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": notification_type,
        "title": data.get("title", "New Notification"),
        "message": data.get("message", ""),
        "data": data,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    return notification


async def run_match_engine_for_posting(db, posting_id: str) -> dict:
    """
    Run match engine for a specific job posting.
    Finds qualified workers and auto-applies for them.
    """
    # Get job posting
    posting = await db.job_postings.find_one({"posting_id": posting_id})
    if not posting or posting.get("status") != "active":
        return {"success": False, "error": "Posting not found or inactive"}
    
    # Get role requirements
    role = await db.workplace_roles.find_one({"role_id": posting.get("role_id")})
    if not role:
        return {"success": False, "error": "Role not found"}
    
    # Find qualified workers
    qualified_workers = await find_qualified_workers(db, posting, role)
    
    results = {
        "posting_id": posting_id,
        "posting_title": posting.get("title"),
        "qualified_count": len(qualified_workers),
        "auto_applied": [],
        "notifications_sent": []
    }
    
    for worker in qualified_workers:
        # Auto-apply
        application = await auto_apply_for_worker(db, worker, posting, role)
        results["auto_applied"].append({
            "worker_id": worker["user_id"],
            "worker_name": worker["full_name"],
            "application_id": application["application_id"]
        })
        
        # Create in-app notification
        notification = await create_notification(db, worker["user_id"], "job_match", {
            "title": "🎯 New Job Match!",
            "message": f"You've been matched with {posting.get('title')} at {posting.get('company_name', 'a company')}. Review and confirm to apply!",
            "posting_id": posting_id,
            "application_id": application["application_id"],
            "job_title": posting.get("title"),
            "company_name": posting.get("company_name"),
            "hourly_rate": posting.get("hourly_rate"),
            "work_type": posting.get("work_type")
        })
        results["notifications_sent"].append(notification["notification_id"])
    
    # Update posting with match count
    await db.job_postings.update_one(
        {"posting_id": posting_id},
        {"$set": {
            "last_match_run": datetime.now(timezone.utc).isoformat(),
            "match_count": len(qualified_workers)
        }}
    )
    
    return {"success": True, "data": results}


# ==================== API ENDPOINTS ====================

@router.post("/run/{posting_id}", response_model=Dict)
async def run_match_engine(
    posting_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Manually trigger match engine for a specific job posting.
    Finds qualified workers and auto-applies for them.
    """
    # Verify posting belongs to employer
    posting = await db.job_postings.find_one({
        "posting_id": posting_id,
        "employer_id": current_user["user_id"]
    })
    
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Run match engine
    result = await run_match_engine_for_posting(db, posting_id)
    
    return result


@router.post("/run-all", response_model=Dict)
async def run_match_engine_all(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Run match engine for all active job postings of this employer.
    """
    employer_id = current_user["user_id"]
    
    postings = await db.job_postings.find({
        "employer_id": employer_id,
        "status": "active"
    }).to_list(100)
    
    total_results = {
        "postings_processed": 0,
        "total_matches": 0,
        "details": []
    }
    
    for posting in postings:
        result = await run_match_engine_for_posting(db, posting["posting_id"])
        if result.get("success"):
            total_results["postings_processed"] += 1
            total_results["total_matches"] += result["data"]["qualified_count"]
            total_results["details"].append(result["data"])
    
    return {"success": True, "data": total_results}


@router.get("/matches", response_model=Dict)
async def get_my_matches(
    status: Optional[str] = None,  # 'pending', 'confirmed', 'declined'
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get job matches for current worker (workforce user).
    """
    if current_user.get("user_type") != "workforce":
        raise HTTPException(status_code=403, detail="Only workforce users can view matches")
    
    query = {
        "applicant_id": current_user["user_id"],
        "match_source": "match_engine"
    }
    
    if status == "pending":
        query["worker_confirmed"] = False
        query["worker_response"] = None
    elif status == "confirmed":
        query["worker_response"] = "confirmed"
    elif status == "declined":
        query["worker_response"] = "declined"
    
    matches = await db.job_applications.find(query, {"_id": 0}).to_list(100)
    
    # Enrich with posting details
    for match in matches:
        posting = await db.job_postings.find_one(
            {"posting_id": match["posting_id"]},
            {"_id": 0, "title": 1, "company_name": 1, "hourly_rate": 1, "work_type": 1, "workplace_name": 1}
        )
        if posting:
            match["job_details"] = posting
    
    return {
        "success": True,
        "data": {
            "matches": matches,
            "total": len(matches),
            "pending": len([m for m in matches if not m.get("worker_confirmed") and not m.get("worker_response")])
        }
    }


@router.post("/matches/{application_id}/confirm", response_model=Dict)
async def confirm_match(
    application_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Worker confirms interest in a matched job.
    Moves application from 'matched' to 'applied' stage.
    """
    if current_user.get("user_type") != "workforce":
        raise HTTPException(status_code=403, detail="Only workforce users can confirm matches")
    
    application = await db.job_applications.find_one({
        "application_id": application_id,
        "applicant_id": current_user["user_id"],
        "match_source": "match_engine"
    })
    
    if not application:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if application.get("worker_response"):
        raise HTTPException(status_code=400, detail="Already responded to this match")
    
    # Update application
    await db.job_applications.update_one(
        {"application_id": application_id},
        {"$set": {
            "worker_confirmed": True,
            "worker_response": "confirmed",
            "worker_confirmed_at": datetime.now(timezone.utc).isoformat(),
            "stage": "applied",  # Move to applied stage
            "stage_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify employer
    await create_notification(db, application["employer_id"], "match_confirmed", {
        "title": "✅ Candidate Confirmed Match",
        "message": f"A qualified candidate has confirmed interest in your {application.get('position_title')} position.",
        "application_id": application_id,
        "position_title": application.get("position_title")
    })
    
    return {
        "success": True,
        "message": "Match confirmed! Your application has been submitted."
    }


@router.post("/matches/{application_id}/decline", response_model=Dict)
async def decline_match(
    application_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Worker declines a matched job.
    """
    if current_user.get("user_type") != "workforce":
        raise HTTPException(status_code=403, detail="Only workforce users can decline matches")
    
    application = await db.job_applications.find_one({
        "application_id": application_id,
        "applicant_id": current_user["user_id"],
        "match_source": "match_engine"
    })
    
    if not application:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if application.get("worker_response"):
        raise HTTPException(status_code=400, detail="Already responded to this match")
    
    # Update application
    await db.job_applications.update_one(
        {"application_id": application_id},
        {"$set": {
            "worker_confirmed": False,
            "worker_response": "declined",
            "worker_declined_at": datetime.now(timezone.utc).isoformat(),
            "decline_reason": reason,
            "stage": "declined"
        }}
    )
    
    return {
        "success": True,
        "message": "Match declined."
    }


@router.put("/matching-status", response_model=Dict)
async def update_matching_status(
    active: bool,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Toggle matching active/inactive for workforce profile.
    Inactive profiles won't be matched with new jobs.
    """
    if current_user.get("user_type") != "workforce":
        raise HTTPException(status_code=403, detail="Only workforce users can update matching status")
    
    result = await db.workforce_profiles.update_one(
        {"workforce_id": current_user["user_id"]},
        {"$set": {
            "matching_active": active,
            "matching_status_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    status_text = "active" if active else "inactive"
    return {
        "success": True,
        "message": f"Job matching is now {status_text}",
        "matching_active": active
    }


# ==================== NOTIFICATIONS ====================

@router.get("/notifications", response_model=Dict)
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get notifications for current user"""
    query = {"user_id": current_user["user_id"]}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(
        query, 
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    unread_count = await db.notifications.count_documents({
        "user_id": current_user["user_id"],
        "read": False
    })
    
    return {
        "success": True,
        "data": {
            "notifications": notifications,
            "total": len(notifications),
            "unread_count": unread_count
        }
    }


@router.put("/notifications/{notification_id}/read", response_model=Dict)
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": current_user["user_id"]},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True, "message": "Notification marked as read"}


@router.put("/notifications/read-all", response_model=Dict)
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Mark all notifications as read"""
    result = await db.notifications.update_many(
        {"user_id": current_user["user_id"], "read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": f"Marked {result.modified_count} notifications as read"}
