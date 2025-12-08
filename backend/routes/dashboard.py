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
            {"workforce_id": workforce_id},
            {"_id": 0, "profile_photo_url": 1, "city": 1, "province": 1}
        )
        
        # Get occupation profiles (worker can have multiple occupations)
        occupations = await db.occupation_profiles.find(
            {"workforce_id": workforce_id},
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
        
        workers.append({
            "user_id": worker["user_id"],
            "name": worker.get("full_name") or worker["email"],
            "email": worker["email"],
            "occupation": primary_occupation.get("occupation_title") if primary_occupation else "General Worker",
            "photo_url": profile.get("profile_photo_url") if profile else None,
            "rating": avg_rating,
            "rating_count": total_rating_count,
            "status": "active",
            "skills": list(all_skills)[:10],  # Limit to 10 skills for display
            "certifications": all_certifications,
            "workplace_id": recent_shift.get("workplace_id") if recent_shift else None,
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
    workplaces = await db.workplaces.find(
        {"employer_id": employer_id},
        {"_id": 0, "workplace_id": 1, "workplace_name": 1, "address": 1, "postal_code": 1, 
         "lat": 1, "long": 1, "attendance_geofence_radius_m": 1, "is_active": 1, "status": 1}
    ).to_list(100)
    
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
    """
    employer_id = current_user["user_id"]
    
    # Get current workplace
    workplace = await db.workplaces.find_one({
        "workplace_id": workplace_id,
        "employer_id": employer_id
    }, {"_id": 0})
    
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")
    
    # Toggle status
    current_status = workplace.get("is_active", True)
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
