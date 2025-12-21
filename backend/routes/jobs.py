from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from utils.matching_engine import calculate_match_score
from utils.calculations import haversine_distance
from typing import Dict, List, Optional
from datetime import datetime

router = APIRouter(prefix="/jobs", tags=["Jobs"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


# ==================== PUBLIC ENDPOINTS ====================

@router.get("/public", response_model=Dict)
async def get_public_jobs(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0),
    search: Optional[str] = None,
    location: Optional[str] = None,
    work_type: Optional[str] = None,
    min_rate: Optional[float] = None,
    db = Depends(get_db)
):
    """
    Get public job listings - no authentication required.
    Used for the public job board.
    """
    # Build query for active job postings
    query = {"status": "active"}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    
    if location:
        query["$or"] = query.get("$or", []) + [
            {"workplace_city": {"$regex": location, "$options": "i"}},
            {"workplace_address": {"$regex": location, "$options": "i"}},
        ]
    
    if work_type:
        query["work_type"] = work_type
    
    if min_rate:
        query["hourly_rate"] = {"$gte": min_rate}
    
    # Fetch job postings
    postings = await db.job_postings.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    # Enrich with employer info and ratings
    enriched_jobs = []
    for posting in postings:
        # Get employer profile for company name and ratings
        employer_profile = await db.employer_profiles.find_one(
            {"employer_id": posting.get("employer_id")},
            {"_id": 0, "company_name": 1, "business_address": 1, "rating_avg": 1, "rating_count": 1}
        )
        
        # Get role requirements
        role = await db.workplace_roles.find_one(
            {"role_id": posting.get("role_id")},
            {"_id": 0, "required_certifications": 1, "skills_required": 1}
        )
        
        enriched_jobs.append({
            **posting,
            "company_name": employer_profile.get("company_name") if employer_profile else "Company",
            "employer_rating": employer_profile.get("rating_avg", 0) if employer_profile else 0,
            "employer_rating_count": employer_profile.get("rating_count", 0) if employer_profile else 0,
            "requirements": role.get("required_certifications", []) if role else [],
            "skills": role.get("skills_required", []) if role else [],
        })
    
    # Get total count
    total_count = await db.job_postings.count_documents(query)
    
    return {
        "success": True,
        "data": enriched_jobs,
        "meta": {
            "total": total_count,
            "limit": limit,
            "offset": offset
        }
    }


# ==================== AUTHENTICATED ENDPOINTS ====================

@router.get("/offers", response_model=Dict)
async def get_job_offers(
    occupation_id: str = None,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Get matched job offers for workforce user
    Matches based on occupation, skills, availability, location
    Filters out shifts with scheduling conflicts
    """
    
    # Get worker profile
    worker = await db.workforce_profiles.find_one({"workforce_id": current_user["user_id"]})
    
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workforce profile not found"
        )
    
    # Get worker's occupations
    occupations = await db.occupation_profiles.find(
        {"workforce_id": current_user["user_id"], "active": True},
        {"_id": 0}
    ).to_list(3)
    
    if not occupations:
        return {
            "success": True,
            "data": {
                "job_offers": [],
                "message": "Create an occupation profile to start receiving job offers"
            }
        }
    
    # Get worker's accepted bookings to check for conflicts
    accepted_bookings = await db.bookings.find(
        {
            "workforce_id": current_user["user_id"],
            "status": {"$in": ["accepted", "pending", "completed"]}
        }
    ).to_list(100)
    
    # Build list of occupied time slots - OPTIMIZED: Batch queries
    occupied_slots = []
    if accepted_bookings:
        # Batch fetch all roles
        role_ids = [booking["role_id"] for booking in accepted_bookings]
        roles = await db.roles.find({"role_id": {"$in": role_ids}}).to_list(100)
        role_map = {role["role_id"]: role for role in roles}
        
        # Batch fetch all shifts
        shift_ids = [role["shift_id"] for role in roles if "shift_id" in role]
        shifts = await db.shifts.find({"shift_id": {"$in": shift_ids}}).to_list(100)
        shift_map = {shift["shift_id"]: shift for shift in shifts}
        
        # Build occupied slots
        for booking in accepted_bookings:
            role = role_map.get(booking["role_id"])
            if role:
                shift = shift_map.get(role["shift_id"])
                if shift:
                    occupied_slots.append({
                        "date": shift["shift_date"],
                        "start": shift["start_time"],
                        "end": shift["end_time"]
                    })
    
    # If occupation_id specified, filter to that occupation
    if occupation_id:
        occupations = [occ for occ in occupations if occ["occupation_id"] == occupation_id]
    
    all_offers = []
    
    # OPTIMIZED: Fetch all data upfront to avoid N+1 queries
    # Fetch all open shifts once
    all_shifts = await db.shifts.find(
        {"status": "open"},
        {"_id": 0, "shift_id": 1, "shift_date": 1, "start_time": 1, "end_time": 1, "workplace_id": 1}
    ).to_list(100)
    
    if not all_shifts:
        return {"success": True, "data": {"offers": [], "occupied_slots": occupied_slots}}
    
    # Batch fetch workplaces
    workplace_ids = list(set(shift["workplace_id"] for shift in all_shifts))
    workplaces = await db.workplaces.find(
        {"workplace_id": {"$in": workplace_ids}},
        {"_id": 0}
    ).to_list(100)
    workplace_map = {wp["workplace_id"]: wp for wp in workplaces}
    
    # Batch fetch all open roles for these shifts
    shift_ids = [shift["shift_id"] for shift in all_shifts]
    all_roles = await db.roles.find(
        {"shift_id": {"$in": shift_ids}, "status": "open"},
        {"_id": 0}
    ).to_list(1000)
    roles_by_shift = {}
    for role in all_roles:
        roles_by_shift.setdefault(role["shift_id"], []).append(role)
    
    # Batch fetch employers
    employer_ids = list(set(wp["employer_id"] for wp in workplaces if "employer_id" in wp))
    employers = await db.employer_profiles.find(
        {"employer_id": {"$in": employer_ids}},
        {"_id": 0, "employer_id": 1, "company_name": 1, "industry": 1}
    ).to_list(100)
    employer_map = {emp["employer_id"]: emp for emp in employers}
    
    # Now process with all data in memory
    for occupation in occupations:
        for shift in all_shifts:
            # CHECK FOR SCHEDULING CONFLICT
            has_conflict = False
            for occupied in occupied_slots:
                if occupied["date"] == shift["shift_date"]:
                    # Check time overlap
                    shift_start = shift["start_time"]
                    shift_end = shift["end_time"]
                    occ_start = occupied["start"]
                    occ_end = occupied["end"]
                    
                    # Simple overlap check
                    if not (shift_end <= occ_start or shift_start >= occ_end):
                        has_conflict = True
                        break
            
            # Skip this shift if conflict detected
            if has_conflict:
                continue
            
            # Get workplace from map
            workplace = workplace_map.get(shift["workplace_id"])
            if not workplace:
                continue
            
            # Get roles for this shift from map
            roles = roles_by_shift.get(shift["shift_id"], [])
            
            for role in roles:
                # Calculate match score
                match_score = calculate_match_score(
                    worker_data=worker,
                    occupation_data=occupation,
                    role_data=role,
                    shift_data=shift,
                    workplace_data=workplace
                )
                
                # Only include if match score >= 50%
                if match_score >= 50.0:
                    # Get employer info from map
                    employer = employer_map.get(workplace.get("employer_id"))
                    
                    # Calculate distance
                    distance = 0
                    if worker.get('lat') and worker.get('long'):
                        distance = haversine_distance(
                            worker['lat'], worker['long'],
                            workplace['lat'], workplace['long']
                        )
                    
                    # Calculate estimated weekly income (if shift is recurring)
                    shift_duration = 8  # Default, calculate from times
                    estimated_weekly_income = role['hourly_rate'] * shift_duration
                    
                    offer = {
                        "offer_id": f"{role['role_id']}_{occupation['occupation_id']}",
                        "role_id": role["role_id"],
                        "shift_id": shift["shift_id"],
                        "workplace_id": workplace["workplace_id"],
                        "occupation_id": occupation["occupation_id"],
                        "occupation_title": occupation["occupation_title"],
                        
                        # Job details
                        "role_title": role["role_title"],
                        "company_name": employer.get("company_name", "Anonymous Company") if employer else "Company",
                        "industry": employer.get("industry", "General") if employer else "General",
                        "workplace_name": workplace["workplace_name"],
                        "workplace_address": workplace["address"],
                        "workplace_city": workplace.get("city"),
                        "workplace_province": workplace.get("province"),
                        
                        # Shift details
                        "shift_date": shift["shift_date"],
                        "start_time": shift["start_time"],
                        "end_time": shift["end_time"],
                        "shift_type": shift.get("shift_type", "regular"),
                        
                        # Compensation
                        "hourly_rate": role["hourly_rate"],
                        "estimated_weekly_income": estimated_weekly_income,
                        
                        # Matching info
                        "match_score": match_score,
                        "distance_km": round(distance, 1),
                        "required_skills": role.get("required_skills", []),
                        "required_certifications": role.get("required_certifications", []),
                        
                        # Privacy note
                        "contact_note": "Communication through app only"
                    }
                    
                    all_offers.append(offer)
        
        # Sort by match score descending
        all_offers.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "success": True,
        "data": {
            "job_offers": all_offers[:20],  # Top 20 matches
            "total_matches": len(all_offers)
        }
    }

@router.post("/offers/{offer_id}/accept", response_model=Dict)
async def accept_job_offer(
    offer_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Accept a job offer (creates booking)
    """
    
    # Parse offer_id to get role_id and occupation_id
    parts = offer_id.split('_')
    if len(parts) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid offer ID"
        )
    
    role_id = f"{parts[0]}_{parts[1]}"
    occupation_id = f"{parts[2]}_{parts[3]}"
    
    # Verify role is still open
    role = await db.roles.find_one({"role_id": role_id})
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job offer no longer available"
        )
    
    if role.get("status") != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This position has been filled"
        )
    
    # Create booking
    from models.employer import Booking
    booking = Booking(
        role_id=role_id,
        workforce_id=current_user["user_id"],
        occupation_id=occupation_id,
        status="accepted"
    )
    
    await db.bookings.insert_one(booking.model_dump())
    
    # AUTO-CREATE EMPLOYMENT RELATIONSHIP if first time working with this employer
    shift = await db.shifts.find_one({"shift_id": role["shift_id"]})
    if shift:
        employer_id = shift.get("employer_id")
        
        # Check if employment relationship already exists
        existing_relationship = await db.employment_relationships.find_one({
            "employer_id": employer_id,
            "workforce_id": current_user["user_id"],
            "status": "active"
        })
        
        if not existing_relationship:
            from models.employment import EmploymentRelationship
            relationship = EmploymentRelationship(
                employer_id=employer_id,
                workforce_id=current_user["user_id"],
                workplace_id=shift.get("workplace_id"),
                employment_type="contract",
                position_title=role.get("role_title"),
                status="active"
            )
            await db.employment_relationships.insert_one(relationship.model_dump())
    
    # Update role status to filled
    await db.roles.update_one(
        {"role_id": role_id},
        {"$set": {"status": "filled"}}
    )
    
    # Check if all roles in shift are filled
    shift = await db.shifts.find_one({"shift_id": role["shift_id"]})
    all_roles = await db.roles.find({"shift_id": role["shift_id"]}).to_list(100)
    all_filled = all(r.get("status") == "filled" for r in all_roles)
    
    if all_filled:
        await db.shifts.update_one(
            {"shift_id": role["shift_id"]},
            {"$set": {"status": "filled"}}
        )
    
    # AUTO-CREATE CHAT THREAD for communication
    from models.messaging import ChatThread
    
    # Get workplace and employer info
    workplace = await db.workplaces.find_one({"workplace_id": shift.get("workplace_id")})
    
    # Check if thread already exists
    existing_thread = await db.chat_threads.find_one({"booking_id": booking.booking_id})
    
    if not existing_thread and workplace:
        chat_thread = ChatThread(
            booking_id=booking.booking_id,
            workforce_id=current_user["user_id"],
            employer_id=workplace["employer_id"],
            shift_id=role["shift_id"],
            role_title=role.get("role_title", "Job")
        )
        await db.chat_threads.insert_one(chat_thread.model_dump())
    
    # TODO: Send notification to employer
    # TODO: Send confirmation to worker
    
    return {
        "success": True,
        "data": {
            "booking_id": booking.booking_id
        },
        "message": "Job offer accepted! You can now chat with the employer."
    }

@router.post("/offers/{offer_id}/decline", response_model=Dict)
async def decline_job_offer(
    offer_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Decline a job offer (just removes from feed, no record created)
    """
    
    # We don't store declined offers, just acknowledge
    # In future, could track for better matching algorithm
    
    return {
        "success": True,
        "message": "Job offer declined"
    }

@router.get("/my-shifts", response_model=Dict)
async def get_my_shifts(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Get all shifts worker is booked for
    """
    
    # Get all bookings for this worker
    bookings = await db.bookings.find(
        {"workforce_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    shifts_data = []
    
    for booking in bookings:
        # Get role
        role = await db.roles.find_one({"role_id": booking["role_id"]}, {"_id": 0})
        if not role:
            continue
        
        # Get shift
        shift = await db.shifts.find_one({"shift_id": role["shift_id"]}, {"_id": 0})
        if not shift:
            continue
        
        # Get workplace
        workplace = await db.workplaces.find_one(
            {"workplace_id": shift["workplace_id"]},
            {"_id": 0}
        )
        
        # Get employer
        employer = await db.employer_profiles.find_one(
            {"employer_id": workplace["employer_id"]},
            {"_id": 0, "company_name": 1}
        )
        
        shifts_data.append({
            "booking_id": booking["booking_id"],
            "shift_date": shift["shift_date"],
            "start_time": shift["start_time"],
            "end_time": shift["end_time"],
            "role_title": role["role_title"],
            "hourly_rate": role["hourly_rate"],
            "workplace_name": workplace["workplace_name"],
            "company_name": employer.get("company_name") if employer else "Company",
            "status": booking["status"]
        })
    
    return {
        "success": True,
        "data": {
            "shifts": shifts_data
        }
    }
