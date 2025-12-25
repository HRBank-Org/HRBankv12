from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import Dict, List
from datetime import datetime, timedelta, timezone
from auth.dependencies import require_role, get_current_user
from models.employment import EmploymentRelationship, TerminationRequest, RehireRequest
from services.shift_notification_service import notify_employment_status_change
import uuid
from pydantic import BaseModel
from typing import Optional
import math

# ESA Compliance Constants (Ontario)
ESA_WEEKLY_MAX = 48  # Max hours without written agreement
ESA_OVERTIME_THRESHOLD = 44  # Overtime threshold

class AutoAssignRequest(BaseModel):
    include_route_based: bool = True
    include_continental: bool = True
    route_to_job_board: bool = False

class AutoAssignResult(BaseModel):
    proposed_assignments: list
    unfilled_roles: list
    summary: dict


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


@router.get("/worker-kpis", response_model=Dict)
async def get_worker_kpis(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get detailed KPIs for all active workers
    Includes this week's performance, attendance rate, and work type breakdown
    """
    employer_id = current_user["user_id"]
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    
    # Get active workers
    relationships = await db.employment_relationships.find({
        "employer_id": employer_id,
        "status": "active"
    }).to_list(1000)
    
    worker_kpis = []
    
    for rel in relationships:
        worker_id = rel["workforce_id"]
        
        # Get worker basic info
        worker = await db.users.find_one(
            {"user_id": worker_id},
            {"_id": 0, "user_id": 1, "email": 1, "full_name": 1, "phone": 1}
        )
        
        if not worker:
            continue
            
        worker_profile = await db.workforce_profiles.find_one(
            {"workforce_id": worker_id},
            {"_id": 0, "profile_picture": 1, "average_rating": 1}
        )
        
        # Get this week's attendance (shifts)
        week_attendance = await db.attendance.find({
            "$or": [
                {"worker_id": worker_id},
                {"workforce_id": worker_id}
            ],
            "employer_id": employer_id,
            "clock_in_time": {"$gte": week_start.isoformat()}
        }, {"_id": 0}).to_list(100)
        
        # Calculate shift hours this week
        shift_hours_week = 0
        shifts_this_week = len(week_attendance)
        for record in week_attendance:
            hours = record.get("hours_worked", 0)
            if not hours and record.get("clock_in_time") and record.get("clock_out_time"):
                try:
                    clock_in = datetime.fromisoformat(record["clock_in_time"].replace("Z", "+00:00"))
                    clock_out = datetime.fromisoformat(record["clock_out_time"].replace("Z", "+00:00"))
                    hours = (clock_out - clock_in).total_seconds() / 3600
                except (ValueError, TypeError):
                    hours = 0
            shift_hours_week += hours
        
        # Get this week's field service tasks
        week_tasks = await db.service_tasks.find({
            "worker_id": worker_id,
            "employer_id": employer_id,
            "scheduled_date": {"$gte": week_start.strftime("%Y-%m-%d")}
        }, {"_id": 0}).to_list(100)
        
        completed_tasks = [t for t in week_tasks if t.get("status") == "completed"]
        in_progress_tasks = [t for t in week_tasks if t.get("status") == "in_progress"]
        
        # Calculate task hours this week
        task_hours_week = 0
        for task in completed_tasks:
            if task.get("actual_duration_minutes"):
                task_hours_week += task["actual_duration_minutes"] / 60
            elif task.get("check_in") and task.get("check_out"):
                try:
                    check_in = datetime.fromisoformat(task["check_in"]["timestamp"].replace("Z", "+00:00"))
                    check_out = datetime.fromisoformat(task["check_out"]["timestamp"].replace("Z", "+00:00"))
                    task_hours_week += (check_out - check_in).total_seconds() / 3600
                except (ValueError, TypeError, KeyError):
                    pass
        
        # Get assigned shifts this week for attendance rate
        assigned_shifts_week = await db.calendar_shifts.count_documents({
            "employer_id": employer_id,
            "assigned_workers": {"$elemMatch": {"worker_id": worker_id}},
            "start_time": {"$gte": week_start.isoformat(), "$lte": now.isoformat()}
        })
        
        # Also check string format assigned_workers
        if assigned_shifts_week == 0:
            assigned_shifts_week = await db.calendar_shifts.count_documents({
                "employer_id": employer_id,
                "assigned_workers": worker_id,
                "start_time": {"$gte": week_start.isoformat(), "$lte": now.isoformat()}
            })
        
        # Calculate attendance rate
        attendance_rate = 100.0
        if assigned_shifts_week > 0:
            attendance_rate = min(100, round((shifts_this_week / assigned_shifts_week) * 100, 1))
        
        # Check if worker is on duty today
        today_shifts = await db.calendar_shifts.count_documents({
            "employer_id": employer_id,
            "$or": [
                {"assigned_workers": {"$elemMatch": {"worker_id": worker_id}}},
                {"assigned_workers": worker_id}
            ],
            "shift_date": today_start.strftime("%Y-%m-%d")
        })
        
        today_tasks = await db.service_tasks.count_documents({
            "worker_id": worker_id,
            "employer_id": employer_id,
            "scheduled_date": today_start.strftime("%Y-%m-%d")
        })
        
        is_on_duty_today = today_shifts > 0 or today_tasks > 0
        
        # Check if clocked in today
        clocked_in_today = await db.attendance.find_one({
            "$or": [
                {"worker_id": worker_id},
                {"workforce_id": worker_id}
            ],
            "employer_id": employer_id,
            "date": today_start.strftime("%Y-%m-%d"),
            "clock_in_time": {"$exists": True},
            "clock_out_time": {"$exists": False}
        })
        
        # Get workplace name
        workplace_name = None
        if rel.get("workplace_id"):
            workplace = await db.workplaces.find_one(
                {"workplace_id": rel["workplace_id"]},
                {"_id": 0, "workplace_name": 1, "name": 1}
            )
            if workplace:
                workplace_name = workplace.get("workplace_name") or workplace.get("name")
        
        worker_kpis.append({
            "user_id": worker["user_id"],
            "full_name": worker.get("full_name"),
            "email": worker.get("email"),
            "phone": worker.get("phone"),
            "profile_picture": worker_profile.get("profile_picture") if worker_profile else None,
            "position_title": rel.get("position_title"),
            "employment_type": rel.get("employment_type"),
            "employment_start_date": rel.get("employment_start_date"),
            "workplace_id": rel.get("workplace_id"),
            "workplace_name": workplace_name,
            
            # Overall stats
            "total_shifts_completed": rel.get("total_shifts_completed", 0),
            "total_hours_worked": rel.get("total_hours_worked", 0.0),
            "average_rating": worker_profile.get("average_rating") if worker_profile else rel.get("average_rating"),
            
            # ESA Compliance tracking
            "has_excess_hours_agreement": rel.get("has_excess_hours_agreement", False),
            
            # This week KPIs
            "week_kpis": {
                "total_hours": round(shift_hours_week + task_hours_week, 1),
                "shift_hours": round(shift_hours_week, 1),
                "task_hours": round(task_hours_week, 1),
                "shifts_completed": shifts_this_week,
                "tasks_completed": len(completed_tasks),
                "tasks_in_progress": len(in_progress_tasks),
                "attendance_rate": attendance_rate
            },
            
            # Today status
            "today_status": {
                "is_scheduled": is_on_duty_today,
                "is_clocked_in": clocked_in_today is not None,
                "scheduled_shifts": today_shifts,
                "scheduled_tasks": today_tasks
            }
        })
    
    # Sort by hours worked this week (most active first)
    worker_kpis.sort(key=lambda x: x["week_kpis"]["total_hours"], reverse=True)
    
    return {
        "success": True,
        "data": {
            "workers": worker_kpis,
            "total_count": len(worker_kpis),
            "period": {
                "week_start": week_start.strftime("%Y-%m-%d"),
                "today": today_start.strftime("%Y-%m-%d")
            }
        }
    }


@router.post("/{workforce_id}/terminate", response_model=Dict)
async def terminate_employment(
    workforce_id: str,
    termination_data: TerminationRequest,
    background_tasks: BackgroundTasks,
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
            last_working_day = datetime.now(timezone.utc)
    else:
        last_working_day = datetime.now(timezone.utc)
    
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
                    "cancelled_date": datetime.now(timezone.utc).isoformat()
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
            "employment_end_date": datetime.now(timezone.utc).isoformat(),
            "last_worked_date": last_working_day.isoformat(),
            "termination_reason": termination_data.termination_reason,
            "termination_notes": termination_data.termination_notes,
            "terminated_by": current_user["user_id"],
            "eligible_for_rehire": termination_data.eligible_for_rehire,
            "total_shifts_completed": total_shifts,
            "total_hours_worked": total_hours,
            "average_rating": avg_rating,
            "updated_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send notification to worker if requested
    if termination_data.notify_worker:
        # Create in-app notification
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
            "created_date": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
        
        # Send email and SMS notifications
        worker = await db.workforce_users.find_one(
            {"user_id": workforce_id},
            {"_id": 0, "email": 1, "phone_number": 1, "first_name": 1, "last_name": 1}
        )
        
        employer = await db.employer_profiles.find_one(
            {"employer_id": current_user["user_id"]},
            {"_id": 0, "company_name": 1}
        )
        
        if worker:
            worker_name = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip() or "Worker"
            employer_name = employer.get('company_name', 'Employer') if employer else 'Employer'
            
            background_tasks.add_task(
                notify_employment_status_change,
                worker_email=worker.get('email'),
                worker_phone=worker.get('phone_number'),
                worker_name=worker_name,
                status="fired",
                employer_name=employer_name
            )
    
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
    background_tasks: BackgroundTasks,
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
        "created_date": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Send email and SMS notifications
    worker_data = await db.workforce_users.find_one(
        {"user_id": workforce_id},
        {"_id": 0, "email": 1, "phone_number": 1, "first_name": 1, "last_name": 1}
    )
    
    employer = await db.employer_profiles.find_one(
        {"employer_id": current_user["user_id"]},
        {"_id": 0, "company_name": 1}
    )
    
    if worker_data:
        worker_name = f"{worker_data.get('first_name', '')} {worker_data.get('last_name', '')}".strip() or "Worker"
        employer_name = employer.get('company_name', 'Employer') if employer else 'Employer'
        
        background_tasks.add_task(
            notify_employment_status_change,
            worker_email=worker_data.get('email'),
            worker_phone=worker_data.get('phone_number'),
            worker_name=worker_name,
            status="hired",
            employer_name=employer_name
        )
    
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
    Includes profile, performance metrics, ratings, skills, certifications, and work history
    """
    # Get worker profile
    workforce_profile = await db.workforce_profiles.find_one(
        {"user_id": workforce_id},
        {"_id": 0}
    )
    
    if not workforce_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found"
        )
    
    # Get user basic info
    user = await db.users.find_one(
        {"user_id": workforce_id},
        {"_id": 0, "password_hash": 0}
    )
    
    # Get occupation profiles for skills and certifications
    occupations = await db.occupation_profiles.find({
        "user_id": workforce_id,
        "active": True
    }, {"_id": 0}).to_list(10)
    
    # Aggregate skills and certifications from all occupations
    all_skills = set()
    all_certifications = []
    total_experience_years = 0
    primary_occupation = None
    
    for occ in occupations:
        all_skills.update(occ.get('skills', []))
        all_certifications.extend(occ.get('certifications', []))
        total_experience_years = max(total_experience_years, occ.get('years_of_experience', 0))
        if not primary_occupation:
            primary_occupation = occ.get('occupation_title')
    
    # Get all completed bookings with this employer
    bookings = await db.bookings.find({
        "employer_id": current_user["user_id"],
        "workforce_id": workforce_id,
        "status": "completed"
    }, {"_id": 0}).to_list(1000)
    
    # Calculate total hours worked
    total_hours = sum([b.get("duration_hours", 0) for b in bookings])
    
    # Get all ratings from this employer
    ratings = await db.shift_ratings.find({
        "employer_id": current_user["user_id"],
        "workforce_id": workforce_id
    }, {"_id": 0}).to_list(1000)
    
    # Calculate average rating per metric
    rating_metrics = {}
    if ratings:
        metrics = ['technical_skills', 'communication', 'quality_of_work', 'timeliness', 'professionalism', 'teamwork']
        for metric in metrics:
            metric_values = [r.get('worker_ratings', {}).get(metric, 0) for r in ratings if r.get('worker_ratings', {}).get(metric)]
            if metric_values:
                rating_metrics[metric] = sum(metric_values) / len(metric_values)
    
    # Calculate overall average
    average_rating = sum(rating_metrics.values()) / len(rating_metrics) if rating_metrics else 0
    
    # Get hourly rate (from first occupation or employment relationship)
    hourly_rate = None
    relationship = await db.employment_relationships.find_one({
        "employer_id": current_user["user_id"],
        "workforce_id": workforce_id
    }, {"_id": 0})
    
    if occupations and occupations[0].get('hourly_rate_preference'):
        hourly_rate = occupations[0].get('hourly_rate_preference')
    elif relationship:
        hourly_rate = relationship.get('hourly_rate')
    
    # Prepare response data
    return {
        "success": True,
        "data": {
            "user_id": workforce_id,
            "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('full_name', 'Worker'),
            "photo_url": workforce_profile.get('profile_photo_url'),
            "occupation": primary_occupation or 'General Worker',
            "experience_years": total_experience_years,
            "hourly_rate": hourly_rate,
            "total_hours_worked": round(total_hours, 1),
            "total_shifts_completed": len(bookings),
            "average_rating": round(average_rating, 1) if average_rating > 0 else None,
            "rating_count": len(ratings),
            "ratings": rating_metrics,
            "skills": list(all_skills),
            "certifications": list(set(all_certifications))
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


# ==================== AUTO-ASSIGN WORKFORCE ====================

@router.post("/auto-assign", response_model=Dict)
async def auto_assign_workforce(
    request: AutoAssignRequest,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Automatically propose worker assignments for unfilled roles.
    Considers:
    - Work type (On-Site, Route-Based, Continental)
    - ESA compliance (weekly hours limit)
    - Worker proximity to workplace
    - Worker preferences and availability
    - Workers currently on time-off
    """
    employer_id = current_user["user_id"]
    
    # Get all active employment relationships for this employer
    relationships = await db.employment_relationships.find({
        "employer_id": employer_id,
        "status": "active"
    }).to_list(1000)
    
    # Build worker data with hours and availability
    available_workers = []
    for rel in relationships:
        worker = await db.users.find_one(
            {"user_id": rel["workforce_id"]},
            {"_id": 0, "user_id": 1, "full_name": 1, "email": 1}
        )
        if not worker:
            continue
            
        # Get workforce profile for location and preferences
        profile = await db.workforce_profiles.find_one(
            {"workforce_id": rel["workforce_id"]},
            {"_id": 0}
        )
        
        # Calculate hours worked this week
        week_start = datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Get attendance records for this week
        attendance_records = await db.attendance_records.find({
            "worker_id": rel["workforce_id"],
            "clock_in_time": {"$gte": week_start}
        }).to_list(100)
        
        weekly_hours = sum(
            (r.get("total_hours", 0) or 0) for r in attendance_records
        )
        
        # Check if worker is on time-off
        time_off = await db.time_off_requests.find_one({
            "worker_id": rel["workforce_id"],
            "status": "approved",
            "start_date": {"$lte": datetime.now(timezone.utc)},
            "end_date": {"$gte": datetime.now(timezone.utc)}
        })
        
        if time_off:
            continue  # Skip workers on time-off
        
        # Calculate remaining available hours
        remaining_hours = ESA_WEEKLY_MAX - weekly_hours
        
        if remaining_hours <= 0:
            continue  # Skip workers at ESA limit
        
        available_workers.append({
            "user_id": worker["user_id"],
            "full_name": worker["full_name"],
            "email": worker["email"],
            "position_title": rel.get("position_title"),
            "workplace_id": rel.get("workplace_id"),
            "weekly_hours": round(weekly_hours, 1),
            "remaining_hours": round(remaining_hours, 1),
            "work_type": rel.get("work_type", "on_site"),
            "home_location": profile.get("home_location") if profile else None,
            "preferred_hours": profile.get("preferred_hours") if profile else None,
            "skills": profile.get("skills", []) if profile else [],
            "vehicle_type": profile.get("vehicle_type") if profile else None,
            "has_valid_license": profile.get("has_valid_license", False) if profile else False
        })
    
    # Get all roles with unfilled positions
    roles = await db.workplace_roles.find({
        "employer_id": employer_id,
        "status": "active"
    }).to_list(100)
    
    proposed_assignments = []
    unfilled_roles = []
    
    for role in roles:
        # Get current assigned count
        assigned_count = await db.employment_relationships.count_documents({
            "employer_id": employer_id,
            "role_id": role["role_id"],
            "status": "active"
        })
        
        positions_needed = role.get("positions_available", 1) - assigned_count
        
        if positions_needed <= 0:
            continue  # Role is fully staffed
        
        # Get workplace for location
        workplace = await db.workplaces.find_one(
            {"workplace_id": role.get("workplace_id")},
            {"_id": 0, "name": 1, "workplace_name": 1, "address": 1, "location": 1}
        )
        
        work_type = role.get("work_type", role.get("shift_type", "on_site"))
        
        # Skip route-based or continental if not included
        if work_type == "route_based" and not request.include_route_based:
            continue
        if work_type == "continental" and not request.include_continental:
            continue
        
        # Find best matching workers for this role
        matched_workers = []
        
        for worker in available_workers:
            # Skip if worker already proposed for another role
            if any(p["worker_id"] == worker["user_id"] for p in proposed_assignments):
                continue
            
            score = 0
            reasons = []
            
            # Check role match
            if worker.get("position_title") == role.get("role_name"):
                score += 50
                reasons.append("Matching role")
            
            # Check workplace match
            if worker.get("workplace_id") == role.get("workplace_id"):
                score += 30
                reasons.append("Same workplace")
            
            # Check hours availability
            if worker["remaining_hours"] >= 8:
                score += 20
                reasons.append(f"{worker['remaining_hours']}h available")
            
            # Work type specific scoring
            if work_type == "route_based":
                if worker.get("vehicle_type") and worker.get("has_valid_license"):
                    score += 25
                    reasons.append("Has vehicle & license")
                else:
                    score -= 50  # Penalty for missing requirements
                    
            elif work_type == "continental":
                # Continental shifts need workers who can do rotating schedules
                if worker.get("preferred_hours", {}).get("flexible"):
                    score += 20
                    reasons.append("Flexible schedule")
            
            if score > 0:
                matched_workers.append({
                    "worker": worker,
                    "score": score,
                    "reasons": reasons
                })
        
        # Sort by score and take top matches
        matched_workers.sort(key=lambda x: x["score"], reverse=True)
        
        assigned_to_role = 0
        for match in matched_workers[:positions_needed]:
            proposed_assignments.append({
                "worker_id": match["worker"]["user_id"],
                "worker_name": match["worker"]["full_name"],
                "worker_email": match["worker"]["email"],
                "weekly_hours": match["worker"]["weekly_hours"],
                "remaining_hours": match["worker"]["remaining_hours"],
                "role_id": role["role_id"],
                "role_name": role.get("role_name"),
                "work_type": work_type,
                "workplace_id": role.get("workplace_id"),
                "workplace_name": workplace.get("name") or workplace.get("workplace_name") if workplace else "Unknown",
                "hourly_rate": role.get("hourly_rate"),
                "match_score": match["score"],
                "match_reasons": match["reasons"]
            })
            assigned_to_role += 1
        
        # Track unfilled positions
        still_needed = positions_needed - assigned_to_role
        if still_needed > 0:
            unfilled_roles.append({
                "role_id": role["role_id"],
                "role_name": role.get("role_name"),
                "work_type": work_type,
                "workplace_id": role.get("workplace_id"),
                "workplace_name": workplace.get("name") or workplace.get("workplace_name") if workplace else "Unknown",
                "positions_needed": still_needed,
                "hourly_rate": role.get("hourly_rate"),
                "reason": "Workforce shortage or ESA compliance limit",
                "route_to_job_board": request.route_to_job_board
            })
    
    return {
        "success": True,
        "data": {
            "proposed_assignments": proposed_assignments,
            "unfilled_roles": unfilled_roles,
            "summary": {
                "total_workers_available": len(available_workers),
                "total_roles_checked": len(roles),
                "assignments_proposed": len(proposed_assignments),
                "roles_unfilled": len(unfilled_roles),
                "positions_unfilled": sum(r["positions_needed"] for r in unfilled_roles)
            }
        }
    }


@router.post("/auto-assign/confirm", response_model=Dict)
async def confirm_auto_assignments(
    assignments: List[Dict],
    route_unfilled_to_board: bool = False,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Confirm and execute the proposed auto-assignments.
    Optionally route unfilled roles to job board.
    """
    employer_id = current_user["user_id"]
    results = {
        "assigned": [],
        "failed": [],
        "routed_to_board": []
    }
    
    for assignment in assignments:
        try:
            # Update employment relationship with role assignment
            result = await db.employment_relationships.update_one(
                {
                    "employer_id": employer_id,
                    "workforce_id": assignment["worker_id"],
                    "status": "active"
                },
                {
                    "$set": {
                        "role_id": assignment["role_id"],
                        "position_title": assignment["role_name"],
                        "workplace_id": assignment.get("workplace_id"),
                        "hourly_rate": assignment.get("hourly_rate"),
                        "last_assignment_date": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            if result.modified_count > 0:
                results["assigned"].append({
                    "worker_id": assignment["worker_id"],
                    "worker_name": assignment["worker_name"],
                    "role_name": assignment["role_name"]
                })
            else:
                results["failed"].append({
                    "worker_id": assignment["worker_id"],
                    "reason": "No matching employment relationship found"
                })
                
        except Exception as e:
            results["failed"].append({
                "worker_id": assignment["worker_id"],
                "reason": str(e)
            })
    
    # Route unfilled roles to job board if requested
    if route_unfilled_to_board and "unfilled_roles" in assignments:
        for role in assignments.get("unfilled_roles", []):
            try:
                # Create job posting
                job_posting = {
                    "posting_id": f"job_{uuid.uuid4().hex[:12]}",
                    "employer_id": employer_id,
                    "role_id": role["role_id"],
                    "role_name": role["role_name"],
                    "workplace_id": role.get("workplace_id"),
                    "work_type": role.get("work_type"),
                    "hourly_rate": role.get("hourly_rate"),
                    "positions_available": role["positions_needed"],
                    "status": "active",
                    "posted_date": datetime.now(timezone.utc).isoformat(),
                    "source": "auto_assign_overflow"
                }
                
                await db.job_postings.insert_one(job_posting)
                results["routed_to_board"].append({
                    "role_name": role["role_name"],
                    "posting_id": job_posting["posting_id"]
                })
                
            except Exception as e:
                results["failed"].append({
                    "role_id": role["role_id"],
                    "reason": f"Failed to post to board: {str(e)}"
                })
    
    return {
        "success": True,
        "data": results,
        "message": f"Assigned {len(results['assigned'])} workers, {len(results['routed_to_board'])} roles posted to job board"
    }


# ==================== JOB BOARD & CANDIDATE PIPELINE ====================

class JobPostingCreate(BaseModel):
    role_id: str
    title: str
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    hourly_rate: Optional[float] = None
    positions_available: int = 1
    work_type: str = "on_site"
    workplace_id: Optional[str] = None

class CandidateStageUpdate(BaseModel):
    stage: str  # applied, screening, interview, offer, hired, rejected

@router.get("/job-postings", response_model=Dict)
async def get_job_postings(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all active job postings for this employer"""
    employer_id = current_user["user_id"]
    
    postings = await db.job_postings.find({
        "employer_id": employer_id,
        "status": {"$in": ["active", "paused"]}
    }, {"_id": 0}).to_list(100)
    
    # Enrich with candidate counts
    for posting in postings:
        candidate_count = await db.job_applications.count_documents({
            "posting_id": posting["posting_id"]
        })
        posting["candidate_count"] = candidate_count
        
        # Get stage breakdown
        stages = await db.job_applications.aggregate([
            {"$match": {"posting_id": posting["posting_id"]}},
            {"$group": {"_id": "$stage", "count": {"$sum": 1}}}
        ]).to_list(10)
        posting["stage_counts"] = {s["_id"]: s["count"] for s in stages}
    
    return {"success": True, "data": postings}


@router.post("/job-postings", response_model=Dict)
async def create_job_posting(
    posting: JobPostingCreate,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Create a new job posting to the job board"""
    employer_id = current_user["user_id"]
    
    # Get role details
    role = await db.workplace_roles.find_one(
        {"role_id": posting.role_id, "employer_id": employer_id},
        {"_id": 0}
    )
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Get workplace details
    workplace = None
    if posting.workplace_id or role.get("workplace_id"):
        workplace = await db.workplaces.find_one(
            {"workplace_id": posting.workplace_id or role.get("workplace_id")},
            {"_id": 0, "name": 1, "workplace_name": 1, "address": 1, "city": 1}
        )
    
    # Get employer profile for company info
    profile = await db.employer_profiles.find_one(
        {"employer_id": employer_id},
        {"_id": 0, "company_name": 1, "company_logo": 1, "industry": 1}
    )
    
    job_posting = {
        "posting_id": f"job_{uuid.uuid4().hex[:12]}",
        "employer_id": employer_id,
        "role_id": posting.role_id,
        "title": posting.title or role.get("role_name"),
        "description": posting.description or role.get("description", ""),
        "requirements": posting.requirements or role.get("requirements", []),
        "hourly_rate": posting.hourly_rate or role.get("hourly_rate"),
        "positions_available": posting.positions_available,
        "work_type": posting.work_type or role.get("work_type", "on_site"),
        "workplace_id": posting.workplace_id or role.get("workplace_id"),
        "workplace_name": workplace.get("name") or workplace.get("workplace_name") if workplace else None,
        "workplace_address": workplace.get("address") if workplace else None,
        "workplace_city": workplace.get("city") if workplace else None,
        "company_name": profile.get("company_name") if profile else None,
        "company_logo": profile.get("company_logo") if profile else None,
        "industry": profile.get("industry") if profile else None,
        "status": "active",
        "posted_date": datetime.now(timezone.utc).isoformat(),
        "expires_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "views": 0,
        "applications": 0
    }
    
    await db.job_postings.insert_one(job_posting)
    
    return {
        "success": True,
        "data": {k: v for k, v in job_posting.items() if k != "_id"},
        "message": "Job posted to board successfully"
    }


class JobPostingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    hourly_rate: Optional[float] = None
    positions_available: Optional[int] = None
    requirements: Optional[List[str]] = None
    work_type: Optional[str] = None

@router.put("/job-postings/{posting_id}", response_model=Dict)
async def update_job_posting(
    posting_id: str,
    update_data: JobPostingUpdate,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Update an existing job posting"""
    employer_id = current_user["user_id"]
    
    # Build update dict with only non-None values
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.job_postings.update_one(
        {"posting_id": posting_id, "employer_id": employer_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    updated = await db.job_postings.find_one({"posting_id": posting_id}, {"_id": 0})
    
    return {
        "success": True,
        "data": updated,
        "message": "Job posting updated successfully"
    }


@router.post("/job-postings/{posting_id}/toggle-status", response_model=Dict)
async def toggle_job_posting_status(
    posting_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Toggle job posting between active and paused status"""
    employer_id = current_user["user_id"]
    
    posting = await db.job_postings.find_one(
        {"posting_id": posting_id, "employer_id": employer_id}
    )
    
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    current_status = posting.get("status", "active")
    new_status = "paused" if current_status == "active" else "active"
    
    await db.job_postings.update_one(
        {"posting_id": posting_id},
        {"$set": {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "data": {"posting_id": posting_id, "status": new_status},
        "message": f"Job posting {'paused' if new_status == 'paused' else 'activated'}"
    }


@router.delete("/job-postings/{posting_id}", response_model=Dict)
async def remove_job_posting(
    posting_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Remove a job posting from the board"""
    employer_id = current_user["user_id"]
    
    result = await db.job_postings.update_one(
        {"posting_id": posting_id, "employer_id": employer_id},
        {"$set": {"status": "closed", "closed_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    return {"success": True, "message": "Job posting removed from board"}


@router.get("/candidates", response_model=Dict)
async def get_candidates(
    posting_id: Optional[str] = None,
    stage: Optional[str] = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all candidates/applications for this employer"""
    employer_id = current_user["user_id"]
    
    # Build query
    query = {"employer_id": employer_id}
    if posting_id:
        query["posting_id"] = posting_id
    if stage:
        query["stage"] = stage
    
    applications = await db.job_applications.find(query, {"_id": 0}).to_list(500)
    
    # Enrich with applicant details
    for app in applications:
        applicant = await db.users.find_one(
            {"user_id": app.get("applicant_id")},
            {"_id": 0, "full_name": 1, "email": 1, "phone": 1}
        )
        if applicant:
            app["applicant_name"] = applicant.get("full_name")
            app["applicant_email"] = applicant.get("email")
            app["applicant_phone"] = applicant.get("phone")
        
        # Get applicant profile
        profile = await db.workforce_profiles.find_one(
            {"workforce_id": app.get("applicant_id")},
            {"_id": 0, "skills": 1, "experience_years": 1, "resume_url": 1, "profile_photo": 1}
        )
        if profile:
            app["skills"] = profile.get("skills", [])
            app["experience_years"] = profile.get("experience_years")
            app["resume_url"] = profile.get("resume_url")
            app["profile_photo"] = profile.get("profile_photo")
    
    # Group by stage for pipeline view
    pipeline = {
        "applied": [],
        "screening": [],
        "interview": [],
        "offer": [],
        "hired": [],
        "rejected": []
    }
    
    for app in applications:
        stage = app.get("stage", "applied")
        if stage in pipeline:
            pipeline[stage].append(app)
    
    return {
        "success": True,
        "data": {
            "all": applications,
            "pipeline": pipeline,
            "total": len(applications)
        }
    }


@router.put("/candidates/{application_id}/stage", response_model=Dict)
async def update_candidate_stage(
    application_id: str,
    update: CandidateStageUpdate,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Move a candidate to a different pipeline stage"""
    employer_id = current_user["user_id"]
    
    valid_stages = ["applied", "screening", "interview", "offer", "hired", "rejected"]
    if update.stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {valid_stages}")
    
    application = await db.job_applications.find_one({
        "application_id": application_id,
        "employer_id": employer_id
    })
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    old_stage = application.get("stage", "applied")
    
    # Update stage
    result = await db.job_applications.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "stage": update.stage,
                "stage_updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "stage_history": {
                    "from_stage": old_stage,
                    "to_stage": update.stage,
                    "changed_at": datetime.now(timezone.utc).isoformat(),
                    "changed_by": employer_id
                }
            }
        }
    )
    
    # If hired, create employment relationship
    if update.stage == "hired":
        posting = await db.job_postings.find_one({"posting_id": application["posting_id"]})
        if posting:
            # Create employment relationship
            employment = {
                "relationship_id": f"rel_{uuid.uuid4().hex[:12]}",
                "employer_id": employer_id,
                "workforce_id": application["applicant_id"],
                "role_id": posting.get("role_id"),
                "workplace_id": posting.get("workplace_id"),
                "position_title": posting.get("title"),
                "hourly_rate": posting.get("hourly_rate"),
                "work_type": posting.get("work_type"),
                "status": "active",
                "start_date": datetime.now(timezone.utc).isoformat(),
                "source": "job_board",
                "application_id": application_id
            }
            await db.employment_relationships.insert_one(employment)
            
            # Update posting positions
            await db.job_postings.update_one(
                {"posting_id": application["posting_id"]},
                {"$inc": {"positions_filled": 1}}
            )
            
            # Check if all positions filled
            updated_posting = await db.job_postings.find_one({"posting_id": application["posting_id"]})
            if updated_posting and updated_posting.get("positions_filled", 0) >= updated_posting.get("positions_available", 1):
                await db.job_postings.update_one(
                    {"posting_id": application["posting_id"]},
                    {"$set": {"status": "filled"}}
                )
    
    return {
        "success": True,
        "message": f"Candidate moved to {update.stage}",
        "data": {"old_stage": old_stage, "new_stage": update.stage}
    }


@router.get("/recruitment-stats", response_model=Dict)
async def get_recruitment_stats(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get recruitment statistics for dashboard"""
    employer_id = current_user["user_id"]
    
    # Count active postings
    active_postings = await db.job_postings.count_documents({
        "employer_id": employer_id,
        "status": "active"
    })
    
    # Count total candidates
    total_candidates = await db.job_applications.count_documents({
        "employer_id": employer_id
    })
    
    # Count by stage
    stage_counts = await db.job_applications.aggregate([
        {"$match": {"employer_id": employer_id}},
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}}
    ]).to_list(10)
    
    stages = {s["_id"]: s["count"] for s in stage_counts}
    
    # Count scheduled interviews
    interviews_scheduled = stages.get("interview", 0)
    
    # Count pending offers
    offers_pending = stages.get("offer", 0)
    
    # Recent hires (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_hires = await db.job_applications.count_documents({
        "employer_id": employer_id,
        "stage": "hired",
        "stage_updated_at": {"$gte": thirty_days_ago}
    })
    
    return {
        "success": True,
        "data": {
            "active_postings": active_postings,
            "total_candidates": total_candidates,
            "interviews_scheduled": interviews_scheduled,
            "offers_pending": offers_pending,
            "recent_hires": recent_hires,
            "by_stage": stages
        }
    }


# ==================== INTERVIEW SCHEDULING ====================

class InterviewScheduleRequest(BaseModel):
    application_id: str
    interview_type: str  # "video" or "in_person"
    scheduled_date: str  # ISO datetime
    duration_minutes: int = 30
    location: Optional[str] = None  # For in-person
    notes: Optional[str] = None
    attendees: Optional[List[str]] = None  # Additional attendee emails

@router.post("/interviews/schedule", response_model=Dict)
async def schedule_interview(
    request: InterviewScheduleRequest,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Schedule an interview for a candidate.
    Supports video (Google Meet) or in-person interviews.
    """
    employer_id = current_user["user_id"]
    
    # Get application
    application = await db.job_applications.find_one({
        "application_id": request.application_id,
        "employer_id": employer_id
    })
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Get applicant details
    applicant = await db.users.find_one(
        {"user_id": application["applicant_id"]},
        {"_id": 0, "full_name": 1, "email": 1}
    )
    
    # Get employer details
    employer = await db.users.find_one(
        {"user_id": employer_id},
        {"_id": 0, "full_name": 1, "email": 1}
    )
    
    # Get job posting
    posting = await db.job_postings.find_one(
        {"posting_id": application["posting_id"]},
        {"_id": 0, "title": 1, "company_name": 1, "workplace_name": 1}
    )
    
    # Generate meeting link for video interviews
    meeting_link = None
    if request.interview_type == "video":
        # Generate a placeholder meeting link
        # In production, this would integrate with Google Meet API
        meeting_id = uuid.uuid4().hex[:10]
        meeting_link = f"https://meet.google.com/placeholder-{meeting_id}"
    
    # Create interview record
    interview = {
        "interview_id": f"int_{uuid.uuid4().hex[:12]}",
        "application_id": request.application_id,
        "employer_id": employer_id,
        "candidate_id": application["applicant_id"],
        "candidate_name": applicant.get("full_name") if applicant else "Unknown",
        "candidate_email": applicant.get("email") if applicant else None,
        "employer_name": employer.get("full_name") if employer else "Unknown",
        "employer_email": employer.get("email") if employer else None,
        "position_title": application.get("position_title") or posting.get("title"),
        "company_name": posting.get("company_name") if posting else None,
        "interview_type": request.interview_type,
        "scheduled_date": request.scheduled_date,
        "duration_minutes": request.duration_minutes,
        "location": request.location if request.interview_type == "in_person" else None,
        "meeting_link": meeting_link,
        "notes": request.notes,
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": employer_id
    }
    
    await db.interviews.insert_one(interview)
    
    # Update application stage to interview if not already
    if application.get("stage") != "interview":
        await db.job_applications.update_one(
            {"application_id": request.application_id},
            {
                "$set": {
                    "stage": "interview",
                    "stage_updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {
                    "stage_history": {
                        "from_stage": application.get("stage"),
                        "to_stage": "interview",
                        "changed_at": datetime.now(timezone.utc).isoformat(),
                        "changed_by": employer_id,
                        "reason": "Interview scheduled"
                    }
                }
            }
        )
    
    return {
        "success": True,
        "data": {k: v for k, v in interview.items() if k != "_id"},
        "message": f"Interview scheduled for {interview['scheduled_date']}"
    }


@router.get("/interviews", response_model=Dict)
async def get_interviews(
    status: Optional[str] = None,
    upcoming_only: bool = False,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all interviews for this employer"""
    employer_id = current_user["user_id"]
    
    query = {"employer_id": employer_id}
    
    if status:
        query["status"] = status
    
    if upcoming_only:
        query["scheduled_date"] = {"$gte": datetime.now(timezone.utc).isoformat()}
        query["status"] = {"$in": ["scheduled", "confirmed"]}
    
    interviews = await db.interviews.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(100)
    
    # Group by date for calendar view
    by_date = {}
    for interview in interviews:
        date_key = interview["scheduled_date"][:10]  # YYYY-MM-DD
        if date_key not in by_date:
            by_date[date_key] = []
        by_date[date_key].append(interview)
    
    return {
        "success": True,
        "data": {
            "all": interviews,
            "by_date": by_date,
            "total": len(interviews),
            "upcoming": len([i for i in interviews if i["scheduled_date"] >= datetime.now(timezone.utc).isoformat()])
        }
    }


@router.put("/interviews/{interview_id}", response_model=Dict)
async def update_interview(
    interview_id: str,
    status: Optional[str] = None,
    scheduled_date: Optional[str] = None,
    notes: Optional[str] = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Update an interview (reschedule, cancel, complete)"""
    employer_id = current_user["user_id"]
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if status:
        valid_statuses = ["scheduled", "confirmed", "completed", "cancelled", "no_show"]
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        update_fields["status"] = status
    
    if scheduled_date:
        update_fields["scheduled_date"] = scheduled_date
    
    if notes:
        update_fields["notes"] = notes
    
    result = await db.interviews.update_one(
        {"interview_id": interview_id, "employer_id": employer_id},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    return {
        "success": True,
        "message": f"Interview updated successfully"
    }


@router.delete("/interviews/{interview_id}", response_model=Dict)
async def cancel_interview(
    interview_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Cancel an interview"""
    employer_id = current_user["user_id"]
    
    result = await db.interviews.update_one(
        {"interview_id": interview_id, "employer_id": employer_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    return {"success": True, "message": "Interview cancelled"}


# ==================== CANDIDATE MATCHING & SCORING ====================

def calculate_match_score(candidate_profile: dict, role: dict) -> dict:
    """
    Calculate how well a candidate matches a role's requirements.
    Certifications are HARD REQUIREMENTS (compliance) - missing = not qualified.
    Returns score (0-100) and breakdown.
    """
    score = 0
    max_score = 0
    breakdown = {
        "skills": {"matched": [], "missing": [], "score": 0, "max": 40},
        "certifications": {"matched": [], "missing": [], "score": 0, "max": 30, "required": True},
        "experience": {"years": 0, "preferred": 0, "score": 0, "max": 20},
        "rating": {"value": 0, "score": 0, "max": 10}
    }
    
    # Track compliance (certifications are mandatory in Canada)
    is_qualified = True
    disqualification_reasons = []
    
    # Skills matching (40 points max)
    required_skills = role.get("required_skills", [])
    candidate_skills = [s.lower() for s in candidate_profile.get("skills", [])]
    
    if required_skills:
        for skill in required_skills:
            if skill.lower() in candidate_skills:
                breakdown["skills"]["matched"].append(skill)
            else:
                breakdown["skills"]["missing"].append(skill)
        
        if len(required_skills) > 0:
            skill_ratio = len(breakdown["skills"]["matched"]) / len(required_skills)
            breakdown["skills"]["score"] = int(skill_ratio * 40)
    else:
        # No required skills = full points if candidate has any skills
        breakdown["skills"]["score"] = 40 if candidate_skills else 20
    
    score += breakdown["skills"]["score"]
    max_score += 40
    
    # Certifications matching - HARD REQUIREMENT FOR COMPLIANCE
    required_certs = role.get("required_certifications", [])
    candidate_certs = [c.lower() for c in candidate_profile.get("certifications", [])]
    
    if required_certs:
        for cert in required_certs:
            if cert.lower() in candidate_certs:
                breakdown["certifications"]["matched"].append(cert)
            else:
                breakdown["certifications"]["missing"].append(cert)
        
        # COMPLIANCE CHECK: All required certifications must be present
        if breakdown["certifications"]["missing"]:
            is_qualified = False
            disqualification_reasons.append(f"Missing required certification(s): {', '.join(breakdown['certifications']['missing'])}")
            breakdown["certifications"]["score"] = 0  # No partial credit for compliance
        else:
            breakdown["certifications"]["score"] = 30  # Full points only if ALL certs present
    else:
        # No required certs = full points
        breakdown["certifications"]["score"] = 30
    
    score += breakdown["certifications"]["score"]
    max_score += 30
    
    # Experience scoring (20 points max)
    candidate_exp = candidate_profile.get("experience_years", 0) or 0
    preferred_exp = role.get("preferred_experience_years", 2)
    breakdown["experience"]["years"] = candidate_exp
    breakdown["experience"]["preferred"] = preferred_exp
    
    if candidate_exp >= preferred_exp:
        breakdown["experience"]["score"] = 20
    elif candidate_exp > 0:
        exp_ratio = candidate_exp / preferred_exp
        breakdown["experience"]["score"] = int(exp_ratio * 20)
    else:
        breakdown["experience"]["score"] = 5  # Some points for being willing
    
    score += breakdown["experience"]["score"]
    max_score += 20
    
    # Rating scoring (10 points max)
    avg_rating = candidate_profile.get("average_rating", 0) or 0
    breakdown["rating"]["value"] = avg_rating
    
    if avg_rating >= 4.5:
        breakdown["rating"]["score"] = 10
    elif avg_rating >= 4.0:
        breakdown["rating"]["score"] = 8
    elif avg_rating >= 3.5:
        breakdown["rating"]["score"] = 6
    elif avg_rating >= 3.0:
        breakdown["rating"]["score"] = 4
    elif avg_rating > 0:
        breakdown["rating"]["score"] = 2
    else:
        breakdown["rating"]["score"] = 5  # No rating = neutral
    
    score += breakdown["rating"]["score"]
    max_score += 10
    
    return {
        "score": score,
        "max_score": max_score,
        "percentage": int((score / max_score) * 100) if max_score > 0 else 0,
        "breakdown": breakdown,
        "is_qualified": is_qualified,
        "disqualification_reasons": disqualification_reasons
    }


@router.get("/candidates/enriched", response_model=Dict)
async def get_enriched_candidates(
    posting_id: Optional[str] = None,
    stage: Optional[str] = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get candidates with full profile data, ratings, and match scores.
    Enhanced version of /candidates endpoint for comparison features.
    """
    employer_id = current_user["user_id"]
    
    # Build query
    query = {"employer_id": employer_id}
    if posting_id:
        query["posting_id"] = posting_id
    if stage:
        query["stage"] = stage
    
    applications = await db.job_applications.find(query, {"_id": 0}).to_list(500)
    
    # Get all relevant job postings and roles for match scoring
    posting_ids = list(set(app["posting_id"] for app in applications))
    postings = {}
    roles = {}
    
    for pid in posting_ids:
        posting = await db.job_postings.find_one({"posting_id": pid}, {"_id": 0})
        if posting:
            postings[pid] = posting
            if posting.get("role_id"):
                role = await db.workplace_roles.find_one(
                    {"role_id": posting["role_id"]},
                    {"_id": 0}
                )
                if role:
                    roles[posting["role_id"]] = role
    
    # Enrich each application
    enriched_apps = []
    for app in applications:
        # Get applicant user data (no email/phone for privacy)
        applicant = await db.users.find_one(
            {"user_id": app.get("applicant_id")},
            {"_id": 0, "full_name": 1, "user_id": 1}
        )
        
        # Get full workforce profile
        profile = await db.workforce_profiles.find_one(
            {"workforce_id": app.get("applicant_id")},
            {"_id": 0}
        )
        
        # Get ratings for this candidate
        ratings = await db.shift_ratings.find({
            "rated_user_id": app.get("applicant_id"),
            "rating_type": "employer_to_workforce"
        }, {"_id": 0, "rating": 1, "review": 1}).to_list(100)
        
        avg_rating = 0
        review_count = len(ratings)
        if ratings:
            avg_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings)
        
        # Build enriched candidate object
        enriched = {
            **app,
            "applicant_name": applicant.get("full_name") if applicant else "Unknown",
            "skills": profile.get("skills", []) if profile else [],
            "certifications": profile.get("certifications", []) if profile else [],
            "experience_years": profile.get("experience_years", 0) if profile else 0,
            "average_rating": round(avg_rating, 1),
            "review_count": review_count,
            "profile_photo": profile.get("profile_photo") if profile else None,
            "availability": profile.get("availability") if profile else None,
        }
        
        # Calculate match score if we have the role
        posting = postings.get(app["posting_id"])
        if posting and posting.get("role_id"):
            role = roles.get(posting["role_id"], {})
            match_result = calculate_match_score(
                {**enriched, "average_rating": avg_rating},
                role
            )
            enriched["match_score"] = match_result
        else:
            enriched["match_score"] = None
        
        enriched_apps.append(enriched)
    
    # Group by stage for pipeline view
    pipeline = {
        "applied": [],
        "screening": [],
        "interview": [],
        "offer": [],
        "hired": [],
        "rejected": []
    }
    
    for app in enriched_apps:
        stage = app.get("stage", "applied")
        if stage in pipeline:
            pipeline[stage].append(app)
    
    # Sort each stage by match score (highest first)
    for stage_name in pipeline:
        pipeline[stage_name].sort(
            key=lambda x: x.get("match_score", {}).get("percentage", 0) if x.get("match_score") else 0,
            reverse=True
        )
    
    return {
        "success": True,
        "data": {
            "all": enriched_apps,
            "pipeline": pipeline,
            "total": len(enriched_apps)
        }
    }



# ==================== OFFER MANAGEMENT ====================

class OfferRequest(BaseModel):
    application_id: str
    salary: float
    salary_type: str = "hourly"  # hourly, annual
    start_date: str
    employment_type: str = "full_time"
    benefits: Optional[List[str]] = []
    custom_message: Optional[str] = None

@router.post("/offers/send", response_model=Dict)
async def send_offer(
    request: OfferRequest,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Send an offer letter to a candidate"""
    employer_id = current_user["user_id"]
    
    # Get application
    application = await db.job_applications.find_one({
        "application_id": request.application_id,
        "employer_id": employer_id
    })
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Get applicant details
    applicant = await db.users.find_one(
        {"user_id": application["applicant_id"]},
        {"_id": 0, "full_name": 1, "email": 1}
    )
    
    # Get employer/company details
    employer_profile = await db.employer_profiles.find_one(
        {"employer_id": employer_id},
        {"_id": 0, "company_name": 1}
    )
    
    # Create offer record
    offer = {
        "offer_id": f"offer_{uuid.uuid4().hex[:12]}",
        "application_id": request.application_id,
        "employer_id": employer_id,
        "candidate_id": application["applicant_id"],
        "candidate_name": applicant.get("full_name") if applicant else None,
        "candidate_email": applicant.get("email") if applicant else None,
        "position_title": application.get("position_title"),
        "company_name": employer_profile.get("company_name") if employer_profile else None,
        "salary": request.salary,
        "salary_type": request.salary_type,
        "start_date": request.start_date,
        "employment_type": request.employment_type,
        "benefits": request.benefits,
        "custom_message": request.custom_message,
        "status": "sent",
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "created_by": employer_id
    }
    
    await db.offers.insert_one(offer)
    
    # Create notification for candidate
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": application["applicant_id"],
        "type": "offer_received",
        "title": "🎉 You received a job offer!",
        "message": f"Congratulations! You have received an offer for {application.get('position_title')} position.",
        "data": {
            "offer_id": offer["offer_id"],
            "position_title": application.get("position_title"),
            "salary": request.salary,
            "salary_type": request.salary_type
        },
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {
        "success": True,
        "data": {k: v for k, v in offer.items() if k != "_id"},
        "message": f"Offer sent to {applicant.get('full_name') if applicant else 'candidate'}"
    }


# ==================== CONTRACT GENERATION ====================

class ContractRequest(BaseModel):
    application_id: str
    contract_type: str = "standard"  # standard, fixed_term, part_time, casual
    start_date: str
    end_date: Optional[str] = None
    probation_days: int = 90
    hourly_rate: float
    work_schedule: Optional[str] = None
    additional_terms: Optional[str] = None

@router.post("/contracts/generate", response_model=Dict)
async def generate_contract(
    request: ContractRequest,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Generate an employment contract PDF"""
    import base64
    
    employer_id = current_user["user_id"]
    
    # Get application
    application = await db.job_applications.find_one({
        "application_id": request.application_id,
        "employer_id": employer_id
    })
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Get applicant details
    applicant = await db.users.find_one(
        {"user_id": application["applicant_id"]},
        {"_id": 0, "full_name": 1, "email": 1, "phone": 1}
    )
    
    # Get employer/company details
    employer_profile = await db.employer_profiles.find_one(
        {"employer_id": employer_id},
        {"_id": 0, "company_name": 1, "business_address": 1}
    )
    
    employer_user = await db.users.find_one(
        {"user_id": employer_id},
        {"_id": 0, "full_name": 1}
    )
    
    # Generate contract content
    company_name = employer_profile.get("company_name", "Company") if employer_profile else "Company"
    employee_name = applicant.get("full_name", "Employee") if applicant else "Employee"
    position = application.get("position_title", "Position")
    
    contract_types = {
        "standard": "Full-Time Employment",
        "fixed_term": "Fixed-Term Contract",
        "part_time": "Part-Time Employment",
        "casual": "Casual Employment"
    }
    
    contract_text = f"""
EMPLOYMENT CONTRACT

This Employment Contract ("Agreement") is entered into on {datetime.now().strftime('%B %d, %Y')}

BETWEEN:
{company_name} ("Employer")
AND
{employee_name} ("Employee")

1. POSITION AND DUTIES
The Employee is hired for the position of {position}.
Employment Type: {contract_types.get(request.contract_type, 'Employment')}
Start Date: {request.start_date}
{f'End Date: {request.end_date}' if request.end_date else ''}

2. COMPENSATION
Hourly Rate: ${request.hourly_rate:.2f} CAD
Payment Schedule: Bi-weekly

3. WORK SCHEDULE
{request.work_schedule if request.work_schedule else 'As determined by Employer based on operational needs.'}

4. PROBATIONARY PERIOD
{f'The Employee will be subject to a {request.probation_days}-day probationary period.' if request.probation_days > 0 else 'No probationary period.'}

5. EMPLOYMENT STANDARDS
This agreement is subject to the Ontario Employment Standards Act, 2000 (ESA).
- Maximum weekly hours: 48 (unless written agreement)
- Overtime threshold: 44 hours per week
- Minimum vacation: 2 weeks after 12 months

6. TERMINATION
Either party may terminate this agreement with proper notice as required by the ESA.

{f'7. ADDITIONAL TERMS{chr(10)}{request.additional_terms}' if request.additional_terms else ''}

SIGNATURES:

_______________________          Date: _______________
{company_name}
Employer Representative

_______________________          Date: _______________
{employee_name}
Employee
"""

    # Create contract record
    contract = {
        "contract_id": f"contract_{uuid.uuid4().hex[:12]}",
        "application_id": request.application_id,
        "employer_id": employer_id,
        "employee_id": application["applicant_id"],
        "employee_name": employee_name,
        "position_title": position,
        "contract_type": request.contract_type,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "probation_days": request.probation_days,
        "hourly_rate": request.hourly_rate,
        "work_schedule": request.work_schedule,
        "additional_terms": request.additional_terms,
        "status": "generated",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": employer_id
    }
    
    await db.contracts.insert_one(contract)
    
    # Encode contract text as base64 (simulating PDF)
    # In production, use a PDF library like ReportLab
    pdf_content = contract_text.encode('utf-8')
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
    
    return {
        "success": True,
        "data": {
            "contract_id": contract["contract_id"],
            "pdf_base64": pdf_base64,
            "filename": f"employment_contract_{employee_name.replace(' ', '_')}.txt"
        },
        "message": "Contract generated successfully"
    }
