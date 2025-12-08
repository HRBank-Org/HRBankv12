from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import Dict, List
from datetime import datetime, timedelta
from auth.dependencies import require_role, get_current_user
from models.employment import EmploymentRelationship, TerminationRequest, RehireRequest
from services.shift_notification_service import notify_employment_status_change
import uuid

router = APIRouter(prefix="/api/employer/workforce-management", tags=["Workforce Management"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

# ==================== EMPLOYER ENDPOINTS ====================

@router.get("/active", response_model=Dict)
async def get_active_workforce(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all active workers for this employer
    Includes employment details and performance metrics
    """
    relationships = await db.employment_relationships.find({
        "employer_id": current_user["user_id"],
        "status": "active"
    }).to_list(1000)
    
    # Enrich with worker details
    workers = []
    for rel in relationships:
        worker = await db.users.find_one(
            {"user_id": rel["workforce_id"]},
            {"_id": 0, "user_id": 1, "email": 1, "full_name": 1, "phone": 1}
        )
        
        if worker:
            worker_profile = await db.workforce_profiles.find_one(
                {"workforce_id": rel["workforce_id"]},
                {"_id": 0, "profile_picture": 1, "average_rating": 1}
            )
            
            workers.append({
                **worker,
                "relationship_id": rel["relationship_id"],
                "employment_start_date": rel["employment_start_date"],
                "position_title": rel.get("position_title"),
                "employment_type": rel.get("employment_type"),
                "total_shifts_completed": rel.get("total_shifts_completed", 0),
                "total_hours_worked": rel.get("total_hours_worked", 0.0),
                "average_rating": worker_profile.get("average_rating") if worker_profile else None,
                "profile_picture": worker_profile.get("profile_picture") if worker_profile else None
            })
    
    return {
        "success": True,
        "data": {
            "active_workers": workers,
            "total_count": len(workers)
        }
    }


@router.get("/inactive", response_model=Dict)
async def get_inactive_workforce(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all inactive/terminated workers for this employer
    Includes termination details and employment history
    """
    relationships = await db.employment_relationships.find({
        "employer_id": current_user["user_id"],
        "status": {"$in": ["inactive", "terminated"]}
    }).sort("employment_end_date", -1).to_list(1000)
    
    # Enrich with worker details
    workers = []
    for rel in relationships:
        worker = await db.users.find_one(
            {"user_id": rel["workforce_id"]},
            {"_id": 0, "user_id": 1, "email": 1, "full_name": 1, "phone": 1}
        )
        
        if worker:
            workers.append({
                **worker,
                "relationship_id": rel["relationship_id"],
                "employment_start_date": rel["employment_start_date"],
                "employment_end_date": rel.get("employment_end_date"),
                "last_worked_date": rel.get("last_worked_date"),
                "position_title": rel.get("position_title"),
                "employment_type": rel.get("employment_type"),
                "termination_reason": rel.get("termination_reason"),
                "termination_notes": rel.get("termination_notes"),
                "total_shifts_completed": rel.get("total_shifts_completed", 0),
                "total_hours_worked": rel.get("total_hours_worked", 0.0),
                "average_rating": rel.get("average_rating"),
                "eligible_for_rehire": rel.get("eligible_for_rehire", True),
                "status": rel["status"]
            })
    
    return {
        "success": True,
        "data": {
            "inactive_workers": workers,
            "total_count": len(workers)
        }
    }


@router.post("/{workforce_id}/terminate", response_model=Dict)
async def terminate_employment(
    workforce_id: str,
    termination_data: TerminationRequest,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Terminate employment relationship with a worker
    Cancels future shifts, updates relationship status
    """
    # Find active relationship
    relationship = await db.employment_relationships.find_one({
        "employer_id": current_user["user_id"],
        "workforce_id": workforce_id,
        "status": "active"
    })
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active employment relationship not found"
        )
    
    # Parse last working day
    last_working_day = None
    if termination_data.last_working_day:
        try:
            last_working_day = datetime.fromisoformat(termination_data.last_working_day)
        except:
            last_working_day = datetime.utcnow()
    else:
        last_working_day = datetime.utcnow()
    
    # Cancel future shifts if requested
    cancelled_shifts_count = 0
    if termination_data.cancel_future_shifts:
        # Find all future shifts for this worker with this employer
        future_bookings = await db.bookings.find({
            "employer_id": current_user["user_id"],
            "workforce_id": workforce_id,
            "status": {"$in": ["pending", "accepted", "confirmed"]},
            "shift_date": {"$gte": last_working_day.isoformat()}
        }).to_list(1000)
        
        for booking in future_bookings:
            await db.bookings.update_one(
                {"booking_id": booking["booking_id"]},
                {"$set": {
                    "status": "cancelled",
                    "cancellation_reason": "Employment terminated",
                    "cancelled_by": current_user["user_id"],
                    "cancelled_date": datetime.utcnow().isoformat()
                }}
            )
            cancelled_shifts_count += 1
    
    # Calculate employment metrics
    completed_bookings = await db.bookings.find({
        "employer_id": current_user["user_id"],
        "workforce_id": workforce_id,
        "status": "completed"
    }).to_list(1000)
    
    total_shifts = len(completed_bookings)
    total_hours = sum([b.get("duration_hours", 0) for b in completed_bookings])
    
    # Get average rating
    ratings = await db.ratings.find({
        "from_user_id": current_user["user_id"],
        "to_user_id": workforce_id
    }).to_list(1000)
    
    avg_rating = None
    if ratings:
        avg_rating = sum([r.get("rating_overall", 0) for r in ratings]) / len(ratings)
    
    # Update employment relationship
    await db.employment_relationships.update_one(
        {"relationship_id": relationship["relationship_id"]},
        {"$set": {
            "status": "terminated",
            "employment_end_date": datetime.utcnow().isoformat(),
            "last_worked_date": last_working_day.isoformat(),
            "termination_reason": termination_data.termination_reason,
            "termination_notes": termination_data.termination_notes,
            "terminated_by": current_user["user_id"],
            "eligible_for_rehire": termination_data.eligible_for_rehire,
            "total_shifts_completed": total_shifts,
            "total_hours_worked": total_hours,
            "average_rating": avg_rating,
            "updated_date": datetime.utcnow().isoformat()
        }}
    )
    
    # Send notification to worker if requested
    if termination_data.notify_worker:
        # Create notification
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": workforce_id,
            "type": "employment_terminated",
            "title": "Employment Status Update",
            "message": f"Your employment has ended. Reason: {termination_data.termination_reason.replace('_', ' ').title()}",
            "data": {
                "employer_id": current_user["user_id"],
                "termination_reason": termination_data.termination_reason,
                "last_working_day": last_working_day.isoformat(),
                "eligible_for_rehire": termination_data.eligible_for_rehire
            },
            "read": False,
            "created_date": datetime.utcnow().isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {
        "success": True,
        "data": {
            "relationship_id": relationship["relationship_id"],
            "cancelled_shifts": cancelled_shifts_count,
            "total_shifts_completed": total_shifts,
            "total_hours_worked": total_hours,
            "average_rating": avg_rating
        },
        "message": "Employment terminated successfully"
    }


@router.post("/{workforce_id}/rehire", response_model=Dict)
async def rehire_worker(
    workforce_id: str,
    rehire_data: RehireRequest,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Rehire a past worker
    Creates new active employment relationship
    """
    # Check if worker exists
    worker = await db.users.find_one({"user_id": workforce_id, "user_type": "workforce"})
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found"
        )
    
    # Find past relationship
    past_relationship = await db.employment_relationships.find_one({
        "employer_id": current_user["user_id"],
        "workforce_id": workforce_id,
        "status": {"$in": ["inactive", "terminated"]}
    })
    
    if not past_relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No past employment relationship found"
        )
    
    # Check rehire eligibility
    if not past_relationship.get("eligible_for_rehire", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Worker is not eligible for rehire"
        )
    
    # Check if already has active relationship
    existing_active = await db.employment_relationships.find_one({
        "employer_id": current_user["user_id"],
        "workforce_id": workforce_id,
        "status": "active"
    })
    
    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Worker already has active employment with you"
        )
    
    # Create new employment relationship
    new_relationship = EmploymentRelationship(
        employer_id=current_user["user_id"],
        workforce_id=workforce_id,
        workplace_id=rehire_data.workplace_id,
        employment_type=rehire_data.employment_type,
        position_title=rehire_data.position_title,
        status="active",
        rehire_notes=rehire_data.rehire_notes
    )
    
    await db.employment_relationships.insert_one(new_relationship.model_dump())
    
    # Send notification to worker
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": workforce_id,
        "type": "rehired",
        "title": "You've Been Rehired!",
        "message": f"You've been rehired. Welcome back!",
        "data": {
            "employer_id": current_user["user_id"],
            "relationship_id": new_relationship.relationship_id,
            "position_title": rehire_data.position_title
        },
        "read": False,
        "created_date": datetime.utcnow().isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {
        "success": True,
        "data": {
            "relationship_id": new_relationship.relationship_id,
            "worker_name": worker.get("full_name"),
            "employment_start_date": new_relationship.employment_start_date.isoformat()
        },
        "message": "Worker rehired successfully"
    }


@router.get("/{workforce_id}/details", response_model=Dict)
async def get_workforce_details(
    workforce_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get detailed information about a specific worker
    Includes current relationship, performance, and history
    """
    # Get current relationship
    relationship = await db.employment_relationships.find_one({
        "employer_id": current_user["user_id"],
        "workforce_id": workforce_id
    })
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employment relationship not found"
        )
    
    # Get worker details
    worker = await db.users.find_one(
        {"user_id": workforce_id},
        {"_id": 0, "password_hash": 0}
    )
    
    # Get all bookings
    bookings = await db.bookings.find({
        "employer_id": current_user["user_id"],
        "workforce_id": workforce_id
    }).to_list(1000)
    
    # Get ratings
    ratings = await db.ratings.find({
        "from_user_id": current_user["user_id"],
        "to_user_id": workforce_id
    }).to_list(100)
    
    return {
        "success": True,
        "data": {
            "worker": worker,
            "relationship": {
                "relationship_id": relationship["relationship_id"],
                "status": relationship["status"],
                "employment_start_date": relationship.get("employment_start_date"),
                "employment_end_date": relationship.get("employment_end_date"),
                "position_title": relationship.get("position_title"),
                "employment_type": relationship.get("employment_type"),
                "termination_reason": relationship.get("termination_reason"),
                "eligible_for_rehire": relationship.get("eligible_for_rehire", True)
            },
            "performance": {
                "total_shifts": len([b for b in bookings if b.get("status") == "completed"]),
                "total_hours": sum([b.get("duration_hours", 0) for b in bookings if b.get("status") == "completed"]),
                "pending_shifts": len([b for b in bookings if b.get("status") in ["pending", "accepted", "confirmed"]]),
                "average_rating": relationship.get("average_rating"),
                "total_ratings": len(ratings)
            }
        }
    }


# ==================== WORKFORCE ENDPOINTS ====================

@router.get("/my-employment-history", response_model=Dict)
async def get_my_employment_history(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Get employment history for the current workforce user
    Shows all past and current employers
    """
    relationships = await db.employment_relationships.find({
        "workforce_id": current_user["user_id"]
    }).sort("employment_start_date", -1).to_list(1000)
    
    # Enrich with employer details
    history = []
    for rel in relationships:
        employer = await db.users.find_one(
            {"user_id": rel["employer_id"]},
            {"_id": 0, "user_id": 1, "email": 1, "full_name": 1}
        )
        
        employer_profile = await db.employer_profiles.find_one(
            {"employer_id": rel["employer_id"]},
            {"_id": 0, "company_name": 1, "company_logo": 1}
        )
        
        if employer:
            history.append({
                "relationship_id": rel["relationship_id"],
                "employer_id": rel["employer_id"],
                "company_name": employer_profile.get("company_name") if employer_profile else employer.get("full_name"),
                "company_logo": employer_profile.get("company_logo") if employer_profile else None,
                "status": rel["status"],
                "employment_start_date": rel.get("employment_start_date"),
                "employment_end_date": rel.get("employment_end_date"),
                "last_worked_date": rel.get("last_worked_date"),
                "position_title": rel.get("position_title"),
                "employment_type": rel.get("employment_type"),
                "termination_reason": rel.get("termination_reason"),
                "total_shifts_completed": rel.get("total_shifts_completed", 0),
                "total_hours_worked": rel.get("total_hours_worked", 0.0),
                "average_rating": rel.get("average_rating"),
                "eligible_for_rehire": rel.get("eligible_for_rehire", True)
            })
    
    return {
        "success": True,
        "data": {
            "employment_history": history,
            "total_employers": len(history),
            "active_employers": len([h for h in history if h["status"] == "active"]),
            "past_employers": len([h for h in history if h["status"] in ["inactive", "terminated"]])
        }
    }
