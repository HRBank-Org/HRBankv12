from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from auth.dependencies import require_role
from datetime import datetime

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
        "status": "active"
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
        recent_shift = await db.calendar_shifts.find_one(
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
                
                days_without_shift = (datetime.utcnow() - last_shift_date).days
                
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
                
                days_without_shift = (datetime.utcnow() - start_date).days
                
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
        active_shifts = await db.calendar_shifts.count_documents({
            "employer_id": employer_id,
            "workplace_id": wp["workplace_id"],
            "start_time": {"$gte": now}
        })
        
        # Get workers assigned to this workplace (from recent shifts)
        recent_shifts = await db.calendar_shifts.find({
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
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_later = today + timedelta(days=7)
    
    upcoming_shifts = await db.calendar_shifts.count_documents({
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
        active_shifts_count = await db.calendar_shifts.count_documents({
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
