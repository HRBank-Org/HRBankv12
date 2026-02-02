from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from auth.dependencies import require_role
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/employer/dashboard", tags=["Dashboard"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.get("/workforce", response_model=Dict)
async def get_dashboard_workforce(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get comprehensive workforce data for dashboard
    Includes worker details, skills, certifications, ratings, and workplace assignments
    """
    employer_id = current_user["user_id"]
    
    # Get all active employment relationships
    relationships = await db.employment_relationships.find({
        "employer_id": employer_id,
        "employment_status": "active"
    }, {"_id": 0}).to_list(1000)
    
    workers = []
    
    for rel in relationships:
        workforce_id = rel["workforce_id"]
        
        # Get worker basic info
        worker = await db.users.find_one(
            {"user_id": workforce_id},
            {"_id": 0, "user_id": 1, "email": 1, "full_name": 1}
        )
        
        if not worker:
            continue
        
        # Get workforce profile with photo
        profile = await db.workforce_profiles.find_one(
            {"user_id": workforce_id},
            {"_id": 0, "profile_photo_url": 1, "city": 1, "province": 1, "occupation_titles": 1}
        )
        
        # Get occupation profiles (worker can have multiple occupations)
        occupations = await db.occupation_profiles.find(
            {"user_id": workforce_id},
            {"_id": 0}
        ).to_list(100)
        
        # Aggregate skills and certifications from all occupations
        all_skills = set()
        all_certifications = []
        total_rating_sum = 0
        total_rating_count = 0
        
        for occ in occupations:
            if occ.get("skills"):
                all_skills.update(occ["skills"])
            if occ.get("certifications"):
                all_certifications.extend(occ["certifications"])
            
            # Aggregate ratings
            if occ.get("general_rating_avg") and occ.get("general_rating_count"):
                total_rating_sum += occ["general_rating_avg"] * occ["general_rating_count"]
                total_rating_count += occ["general_rating_count"]
        
        # Calculate overall average rating
        avg_rating = round(total_rating_sum / total_rating_count, 2) if total_rating_count > 0 else None
        
        # Get primary occupation (the one with most shifts)
        primary_occupation = max(occupations, key=lambda x: x.get("total_shifts_completed", 0)) if occupations else None
        
        # Find worker's primary workplace (from most recent shift assignment)
        recent_shift = await db.shifts.find_one(
            {
                "employer_id": employer_id,
                "assigned_workers.worker_id": workforce_id
            },
            {"_id": 0, "workplace_id": 1, "workplace_name": 1},
            sort=[("start_time", -1)]
        )
        
        # Calculate days without shift (14-day rule tracking)
        last_completed_shift = await db.bookings.find_one(
            {
                "employer_id": employer_id,
                "workforce_id": workforce_id,
                "status": "completed"
            },
            {"_id": 0, "end_time": 1, "shift_date": 1},
            sort=[("end_time", -1)]
        )
        
        days_without_shift = None
        last_shift_date = None
        shift_status = "active"
        
        if last_completed_shift:
            last_shift_date_str = last_completed_shift.get('end_time') or last_completed_shift.get('shift_date')
            if last_shift_date_str:
                if isinstance(last_shift_date_str, str):
                    last_shift_date = datetime.fromisoformat(last_shift_date_str.replace('Z', '+00:00'))
                else:
                    last_shift_date = last_shift_date_str
                
                days_without_shift = (datetime.now(timezone.utc) - last_shift_date).days
                
                # Determine shift status
                if days_without_shift >= 14:
                    shift_status = "at_risk_pool_return"  # Should be returned to pool
                elif days_without_shift >= 10:
                    shift_status = "warning"  # Warning zone
                else:
                    shift_status = "active"  # Good standing
        else:
            # No completed shifts - use employment start date
            start_date_str = rel.get('employment_start_date')
            if start_date_str:
                if isinstance(start_date_str, str):
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                else:
                    start_date = start_date_str
                
                days_without_shift = (datetime.now(timezone.utc) - start_date).days
                
                if days_without_shift >= 14:
                    shift_status = "no_shifts_given"
                elif days_without_shift >= 10:
                    shift_status = "warning"
                else:
                    shift_status = "new_hire"
        
        # Determine occupation to display
        if primary_occupation and primary_occupation.get("occupation_title"):
            occupation_display = primary_occupation.get("occupation_title")
        elif profile and profile.get("occupation_titles") and len(profile.get("occupation_titles")) > 0:
            occupation_display = profile.get("occupation_titles")[0]
        elif rel.get("role_name"):
            occupation_display = rel.get("role_name")
        else:
            occupation_display = "General Worker"
        
        workers.append({
            "user_id": worker["user_id"],
            "name": worker.get("full_name") or worker["email"],
            "email": worker["email"],
            "occupation": occupation_display,
            "photo_url": profile.get("profile_photo_url") if profile else None,
            "rating": avg_rating,
            "rating_count": total_rating_count,
            "status": "active",
            "skills": list(all_skills)[:10],  # Limit to 10 skills for display
            "certifications": all_certifications,
            "workplace_id": recent_shift.get("workplace_id") if recent_shift else None,
            "days_without_shift": days_without_shift,
            "last_shift_date": last_shift_date.isoformat() if last_shift_date else None,
            "shift_status": shift_status,
            "workplace_name": recent_shift.get("workplace_name") if recent_shift else None,
            "total_hours": rel.get("total_hours_worked", 0),
            "shifts_completed": rel.get("total_shifts_completed", 0),
            "employment_start_date": rel.get("employment_start_date"),
            "location": f"{profile.get('city', '')}, {profile.get('province', '')}" if profile else None
        })
    
    return {
        "success": True,
        "data": {
            "workers": workers,
            "total_count": len(workers)
        }
    }


@router.get("/stats", response_model=Dict)
async def get_dashboard_stats(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get dashboard statistics
    - Total workers, active workers
    - Workplaces count
    - Upcoming shifts count
    - Pending ratings count
    """
    employer_id = current_user["user_id"]
    
    # Count active workers
    active_workers_count = await db.employment_relationships.count_documents({
        "employer_id": employer_id,
        "status": "active"
    })
    
    # Get workplaces from proper workplaces collection
    workplaces_raw = await db.workplaces.find(
        {"employer_id": employer_id},
        {"_id": 0, "workplace_id": 1, "workplace_name": 1, "address": 1, "postal_code": 1, 
         "lat": 1, "long": 1, "attendance_geofence_radius_m": 1, "is_active": 1, "status": 1}
    ).to_list(100)
    
    # Add active shift count and workers for each workplace
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    
    workplaces = []
    for wp in workplaces_raw:
        active_shifts = await db.shifts.count_documents({
            "employer_id": employer_id,
            "workplace_id": wp["workplace_id"],
            "start_time": {"$gte": now}
        })
        
        # Get workers assigned to this workplace (from recent shifts)
        recent_shifts = await db.shifts.find({
            "employer_id": employer_id,
            "workplace_id": wp["workplace_id"]
        }, {"_id": 0, "assigned_workers": 1}).limit(50).to_list(50)
        
        # Collect unique workers
        worker_ids = set()
        for shift in recent_shifts:
            for worker in shift.get("assigned_workers", []):
                worker_ids.add(worker.get("worker_id"))
        
        # Get worker details
        workers = []
        for worker_id in list(worker_ids)[:12]:  # Limit to 12 for display
            worker = await db.users.find_one(
                {"user_id": worker_id},
                {"_id": 0, "user_id": 1, "full_name": 1}
            )
            if worker:
                profile = await db.workforce_profiles.find_one(
                    {"workforce_id": worker_id},
                    {"_id": 0, "profile_photo_url": 1}
                )
                workers.append({
                    "worker_id": worker["user_id"],
                    "name": worker.get("full_name", "Worker"),
                    "photo_url": profile.get("profile_photo_url") if profile else None
                })
        
        workplaces.append({
            **wp,
            "active_shifts_count": active_shifts,
            "workers": workers,
            "total_workers": len(worker_ids)
        })
    
    # Count upcoming shifts (next 7 days)
    from datetime import timedelta
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_later = today + timedelta(days=7)
    
    upcoming_shifts = await db.shifts.count_documents({
        "employer_id": employer_id,
        "start_time": {
            "$gte": today.isoformat(),
            "$lte": week_later.isoformat()
        }
    })
    
    # Count pending ratings (shifts that ended but not rated)
    # For now, return 0 - will implement in Phase 3
    pending_ratings = 0
    
    return {
        "success": True,
        "data": {
            "active_workers": active_workers_count,
            "workplaces_count": len(workplaces),
            "workplaces": workplaces,
            "upcoming_shifts": upcoming_shifts,
            "pending_ratings": pending_ratings
        }
    }


@router.patch("/workplaces/{workplace_id}/toggle", response_model=Dict)
async def toggle_workplace_status(
    workplace_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Toggle workplace active/inactive status
    Only workplaces with no active (future) shifts can be deactivated
    """
    employer_id = current_user["user_id"]
    
    # Get current workplace
    workplace = await db.workplaces.find_one({
        "workplace_id": workplace_id,
        "employer_id": employer_id
    }, {"_id": 0})
    
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")
    
    current_status = workplace.get("is_active", True)
    
    # If trying to deactivate, check for active shifts
    if current_status:  # Currently active, trying to deactivate
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        
        # Check for any future shifts at this workplace
        active_shifts_count = await db.shifts.count_documents({
            "employer_id": employer_id,
            "workplace_id": workplace_id,
            "start_time": {"$gte": now}
        })
        
        if active_shifts_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot deactivate workplace with {active_shifts_count} upcoming shift(s). Please remove or reassign shifts first."
            )
    
    # Toggle status
    new_status = not current_status
    
    # Update workplace
    await db.workplaces.update_one(
        {"workplace_id": workplace_id, "employer_id": employer_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {
        "success": True,
        "data": {
            "workplace_id": workplace_id,
            "is_active": new_status
        }
    }



@router.get("/operational-kpis", response_model=Dict)
async def get_operational_kpis(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get comprehensive operational KPIs for employer dashboard
    Aggregates data from all three work modes: Standard, Field Service, Continental
    """
    employer_id = current_user["user_id"]
    now = datetime.now(timezone.utc)
    
    # Time ranges
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    
    # === SHIFTS (Standard + Continental) ===
    
    # Today's shifts
    today_shifts = await db.shifts.find({
        "employer_id": employer_id,
        "shift_date": today_start.strftime("%Y-%m-%d")
    }, {"_id": 0}).to_list(500)
    
    # This week's shifts
    week_shifts = await db.shifts.find({
        "employer_id": employer_id,
        "start_time": {
            "$gte": week_start.isoformat(),
            "$lte": now.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    # Separate standard, continental, and remote
    standard_shifts_week = [s for s in week_shifts if s.get("work_type") not in ["continental", "remote"] and s.get("shift_type") not in ["continental", "remote"]]
    continental_shifts_week = [s for s in week_shifts if s.get("work_type") == "continental" or s.get("shift_type") == "continental"]
    remote_shifts_week = [s for s in week_shifts if s.get("work_type") == "remote" or s.get("shift_type") == "remote"]
    
    # === ATTENDANCE ===
    
    # Get attendance records for the week
    attendance_records = await db.attendance.find({
        "employer_id": employer_id,
        "clock_in_time": {"$gte": week_start.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    # Calculate total hours from attendance
    total_shift_hours_week = 0
    for record in attendance_records:
        hours = record.get("hours_worked", 0)
        if not hours and record.get("clock_in_time") and record.get("clock_out_time"):
            try:
                clock_in = datetime.fromisoformat(record["clock_in_time"].replace("Z", "+00:00"))
                clock_out = datetime.fromisoformat(record["clock_out_time"].replace("Z", "+00:00"))
                hours = (clock_out - clock_in).total_seconds() / 3600
            except (ValueError, TypeError):
                hours = 0
        total_shift_hours_week += hours
    
    # === FIELD SERVICE TASKS ===
    
    # Get service tasks for the week
    service_tasks = await db.service_tasks.find({
        "employer_id": employer_id,
        "scheduled_date": {
            "$gte": week_start.strftime("%Y-%m-%d"),
            "$lte": now.strftime("%Y-%m-%d")
        }
    }, {"_id": 0}).to_list(1000)
    
    completed_tasks = [t for t in service_tasks if t.get("status") == "completed"]
    in_progress_tasks = [t for t in service_tasks if t.get("status") == "in_progress"]
    pending_tasks = [t for t in service_tasks if t.get("status") in ["pending", "assigned"]]
    
    # Calculate task hours
    total_task_hours_week = 0
    for task in completed_tasks:
        if task.get("actual_duration_minutes"):
            total_task_hours_week += task["actual_duration_minutes"] / 60
        elif task.get("check_in") and task.get("check_out"):
            try:
                check_in = datetime.fromisoformat(task["check_in"]["timestamp"].replace("Z", "+00:00"))
                check_out = datetime.fromisoformat(task["check_out"]["timestamp"].replace("Z", "+00:00"))
                total_task_hours_week += (check_out - check_in).total_seconds() / 3600
            except (ValueError, TypeError, KeyError):
                pass
    
    # === WORKERS ===
    
    # Active workers
    active_relationships = await db.employment_relationships.count_documents({
        "employer_id": employer_id,
        "employment_status": "active"
    })
    
    # Workers on duty today
    workers_on_duty_today = set()
    for shift in today_shifts:
        for w in shift.get("assigned_workers", []):
            worker_id = w.get("worker_id") if isinstance(w, dict) else w
            if worker_id:
                workers_on_duty_today.add(worker_id)
    
    # Add field service workers
    today_tasks = [t for t in service_tasks if t.get("scheduled_date") == today_start.strftime("%Y-%m-%d")]
    for task in today_tasks:
        if task.get("worker_id"):
            workers_on_duty_today.add(task["worker_id"])
    
    # === CONTINENTAL SHIFTS SPECIFIC ===
    
    continental_groups = {}
    for shift in continental_shifts_week:
        group = shift.get("rotation_group", "Unknown")
        if group not in continental_groups:
            continental_groups[group] = {"day": 0, "night": 0}
        day_night = shift.get("day_night", "day")
        continental_groups[group][day_night] = continental_groups[group].get(day_night, 0) + 1
    
    # === REMOTE WORK SPECIFIC ===
    
    remote_total_expected_hours = sum(s.get("duration_hours", 0) or s.get("expected_hours", 0) or 0 for s in remote_shifts_week)
    remote_total_actual_hours = sum(s.get("actual_hours", 0) or 0 for s in remote_shifts_week)
    remote_total_deliverables = sum(s.get("total_deliverables", 0) or 0 for s in remote_shifts_week)
    remote_completed_deliverables = sum(s.get("completed_deliverables", 0) or 0 for s in remote_shifts_week)
    remote_approved_deliverables = sum(s.get("approved_deliverables", 0) or 0 for s in remote_shifts_week)
    
    # === ATTENDANCE RATE ===
    
    expected_today = sum(len(s.get("assigned_workers", [])) for s in today_shifts)
    actual_checkins = await db.attendance.count_documents({
        "employer_id": employer_id,
        "shift_date": today_start.strftime("%Y-%m-%d"),
        "clock_in_time": {"$exists": True}
    })
    
    attendance_rate = round((actual_checkins / expected_today * 100), 1) if expected_today > 0 else 100
    
    return {
        "success": True,
        "data": {
            "summary": {
                "total_hours_this_week": round(total_shift_hours_week + total_task_hours_week + remote_total_actual_hours, 1),
                "shift_hours_week": round(total_shift_hours_week, 1),
                "task_hours_week": round(total_task_hours_week, 1),
                "remote_hours_week": round(remote_total_actual_hours, 1),
                "active_workers": active_relationships,
                "workers_on_duty_today": len(workers_on_duty_today),
                "attendance_rate_today": attendance_rate
            },
            "shifts": {
                "today_count": len(today_shifts),
                "week_total": len(week_shifts),
                "by_type": {
                    "on_site": len(standard_shifts_week),
                    "continental": len(continental_shifts_week),
                    "route_based": len(service_tasks),
                    "remote": len(remote_shifts_week)
                }
            },
            "field_service": {
                "total_tasks_week": len(service_tasks),
                "completed": len(completed_tasks),
                "in_progress": len(in_progress_tasks),
                "pending": len(pending_tasks),
                "completion_rate": round(len(completed_tasks) / len(service_tasks) * 100, 1) if service_tasks else 0
            },
            "continental": {
                "rotation_groups": continental_groups,
                "total_shifts_week": len(continental_shifts_week)
            },
            "remote": {
                "total_shifts_week": len(remote_shifts_week),
                "expected_hours": round(remote_total_expected_hours, 1),
                "actual_hours": round(remote_total_actual_hours, 1),
                "efficiency_rate": round(remote_total_actual_hours / remote_total_expected_hours * 100, 1) if remote_total_expected_hours > 0 else 0,
                "deliverables": {
                    "total": remote_total_deliverables,
                    "completed": remote_completed_deliverables,
                    "approved": remote_approved_deliverables,
                    "completion_rate": round(remote_completed_deliverables / remote_total_deliverables * 100, 1) if remote_total_deliverables > 0 else 0
                }
            },
            "period": {
                "today": today_start.strftime("%Y-%m-%d"),
                "week_start": week_start.strftime("%Y-%m-%d"),
                "generated_at": now.isoformat()
            }
        }
    }
