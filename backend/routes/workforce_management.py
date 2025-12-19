from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import Dict, List
from datetime import datetime, timedelta, timezone
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
            "created_date": datetime.utcnow().isoformat()
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
        "created_date": datetime.utcnow().isoformat()
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
