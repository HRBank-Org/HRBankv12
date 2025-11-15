from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from models.ratings import WorkforceRating, EmployerRating
from typing import Dict
from datetime import datetime

router = APIRouter(prefix="/ratings", tags=["Ratings"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.post("/workforce/{booking_id}", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def rate_workforce(
    booking_id: str,
    rating_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Employer rates workforce after shift completion
    """
    
    # Verify booking exists and belongs to this employer
    booking = await db.bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Get shift and workplace to verify employer
    role = await db.roles.find_one({"role_id": booking["role_id"]})
    shift = await db.shifts.find_one({"shift_id": role["shift_id"]})
    workplace = await db.workplaces.find_one({"workplace_id": shift["workplace_id"]})
    
    if workplace["employer_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only rate your own workers"
        )
    
    # Check if already rated
    existing = await db.workforce_ratings.find_one({"booking_id": booking_id})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You've already rated this worker for this shift"
        )
    
    # Calculate overall rating
    categories = [
        rating_data.get('technical_skills', 0),
        rating_data.get('communication', 0),
        rating_data.get('quality_of_work', 0),
        rating_data.get('timeliness', 0),
        rating_data.get('professionalism', 0),
        rating_data.get('teamwork', 0)
    ]
    overall_rating = sum(categories) / len(categories) if categories else 0
    
    # Create rating
    rating = WorkforceRating(
        booking_id=booking_id,
        shift_id=role["shift_id"],
        from_employer_id=current_user["user_id"],
        to_workforce_id=booking["workforce_id"],
        occupation_id=booking.get("occupation_id", ""),
        overall_rating=round(overall_rating, 2),
        **rating_data
    )
    
    await db.workforce_ratings.insert_one(rating.model_dump())
    
    # Update occupation profile skill rating
    occupation_id = booking.get("occupation_id")
    if occupation_id:
        occupation = await db.occupation_profiles.find_one({"occupation_id": occupation_id})
        if occupation:
            current_avg = occupation.get("skill_rating_avg", 0)
            current_count = occupation.get("skill_rating_count", 0)
            
            new_avg = ((current_avg * current_count) + overall_rating) / (current_count + 1)
            
            await db.occupation_profiles.update_one(
                {"occupation_id": occupation_id},
                {
                    "$set": {
                        "skill_rating_avg": round(new_avg, 2),
                        "skill_rating_count": current_count + 1
                    }
                }
            )
    
    # Also update general rating (shared across occupations)
    workforce = await db.workforce_profiles.find_one({"workforce_id": booking["workforce_id"]})
    if workforce:
        current_gen_avg = workforce.get("general_rating_avg", 0)
        current_gen_count = workforce.get("general_rating_count", 0)
        
        # Use professionalism score for general rating
        prof_score = rating_data.get('professionalism', 0)
        new_gen_avg = ((current_gen_avg * current_gen_count) + prof_score) / (current_gen_count + 1)
        
        await db.workforce_profiles.update_one(
            {"workforce_id": booking["workforce_id"]},
            {
                "$set": {
                    "general_rating_avg": round(new_gen_avg, 2),
                    "general_rating_count": current_gen_count + 1
                }
            }
        )
    
    return {
        "success": True,
        "data": {"rating_id": rating.rating_id},
        "message": "Rating submitted successfully"
    }

@router.post("/employer/{booking_id}", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def rate_employer(
    booking_id: str,
    rating_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Workforce rates employer after shift completion
    """
    
    # Verify booking belongs to this worker
    booking = await db.bookings.find_one({
        "booking_id": booking_id,
        "workforce_id": current_user["user_id"]
    })
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if already rated
    existing = await db.employer_ratings.find_one({"booking_id": booking_id})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You've already rated this employer for this shift"
        )
    
    # Get employer from shift
    role = await db.roles.find_one({"role_id": booking["role_id"]})
    shift = await db.shifts.find_one({"shift_id": role["shift_id"]})
    workplace = await db.workplaces.find_one({"workplace_id": shift["workplace_id"]})
    
    # Calculate overall rating
    categories = [
        rating_data.get('communication', 0),
        rating_data.get('management_support', 0),
        rating_data.get('work_environment', 0),
        rating_data.get('respect_and_inclusivity', 0),
        rating_data.get('pay_and_benefits', 0),
        rating_data.get('workplace_safety', 0)
    ]
    overall_rating = sum(categories) / len(categories) if categories else 0
    
    # Create rating
    rating = EmployerRating(
        booking_id=booking_id,
        shift_id=role["shift_id"],
        from_workforce_id=current_user["user_id"],
        to_employer_id=workplace["employer_id"],
        overall_rating=round(overall_rating, 2),
        **rating_data
    )
    
    await db.employer_ratings.insert_one(rating.model_dump())
    
    # Update employer rating
    employer = await db.employer_profiles.find_one({"employer_id": workplace["employer_id"]})
    if employer:
        current_avg = employer.get("rating_avg", 0)
        current_count = employer.get("rating_count", 0)
        
        new_avg = ((current_avg * current_count) + overall_rating) / (current_count + 1)
        
        await db.employer_profiles.update_one(
            {"employer_id": workplace["employer_id"]},
            {
                "$set": {
                    "rating_avg": round(new_avg, 2),
                    "rating_count": current_count + 1
                }
            }
        )
    
    return {
        "success": True,
        "data": {"rating_id": rating.rating_id},
        "message": "Rating submitted successfully"
    }

@router.get("/pending", response_model=Dict)
async def get_pending_ratings(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get shifts that need to be rated (completed but not rated)
    """
    
    user_type = current_user["user_type"]
    user_id = current_user["user_id"]
    
    # Get all completed bookings
    bookings = await db.bookings.find(
        {
            "workforce_id" if user_type == "workforce" else "employer_id": user_id,
            "status": "completed"
        },
        {"_id": 0}
    ).to_list(100)
    
    pending = []
    
    for booking in bookings:
        # Check if already rated
        if user_type == "workforce":
            existing = await db.employer_ratings.find_one({"booking_id": booking["booking_id"]})
        else:
            existing = await db.workforce_ratings.find_one({"booking_id": booking["booking_id"]})
        
        if not existing:
            # Get shift details
            role = await db.roles.find_one({"role_id": booking["role_id"]}, {"_id": 0})
            shift = await db.shifts.find_one({"shift_id": role["shift_id"]}, {"_id": 0})
            
            pending.append({
                "booking_id": booking["booking_id"],
                "shift_date": shift["shift_date"],
                "role_title": role["role_title"]
            })
    
    return {
        "success": True,
        "data": {
            "pending_ratings": pending,
            "count": len(pending)
        }
    }
