from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from models.occupation import OccupationProfile
from typing import Dict, List
from datetime import datetime
import uuid

router = APIRouter(prefix="/occupations", tags=["Occupations"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.get("/me", response_model=Dict)
async def get_my_occupations(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get all occupation profiles for current worker (max 3) with detailed credential and employment info"""
    occupations = await db.occupation_profiles.find(
        {"workforce_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(3)
    
    # Enrich each occupation with credential details and employment history
    for occ in occupations:
        # Get detailed credential information with verification status
        credential_ids = occ.get("certifications", [])
        detailed_credentials = []
        
        for cred_id in credential_ids:
            cred = await db.workforce_credentials.find_one(
                {"credential_id": cred_id},
                {"_id": 0}
            )
            if cred:
                detailed_credentials.append({
                    "credential_id": cred.get("credential_id"),
                    "credential_name": cred.get("credential_name"),
                    "credential_type": cred.get("credential_type"),
                    "institution_name": cred.get("institution_name"),
                    "status": cred.get("status", "pending"),
                    "issue_date": cred.get("issue_date"),
                    "expiry_date": cred.get("expiry_date")
                })
        
        occ["credential_details"] = detailed_credentials
        
        # Get employment history for this worker
        employment_history = await db.employment_relationships.find(
            {"workforce_id": current_user["user_id"]},
            {"_id": 0}
        ).to_list(None)
        
        # Format employment history
        formatted_history = []
        for emp in employment_history:
            # Get employer company name
            employer = await db.employer_profiles.find_one(
                {"employer_id": emp.get("employer_id")},
                {"company_name": 1, "_id": 0}
            )
            
            formatted_history.append({
                "company_name": employer.get("company_name", "Unknown Company") if employer else "Unknown Company",
                "position_title": emp.get("position_title"),
                "employment_type": emp.get("employment_type"),
                "status": emp.get("status"),
                "start_date": emp.get("employment_start_date").isoformat() if emp.get("employment_start_date") else None,
                "end_date": emp.get("employment_end_date").isoformat() if emp.get("employment_end_date") else None,
                "total_shifts": emp.get("total_shifts_completed", 0),
                "total_hours": emp.get("total_hours_worked", 0.0)
            })
        
        occ["employment_history"] = formatted_history
    
    return {
        "success": True,
        "data": {
            "occupations": occupations,
            "count": len(occupations),
            "can_add_more": len(occupations) < 3
        }
    }

@router.post("", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_occupation_profile(
    occupation_data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Create new occupation profile (max 3 total)
    No admin approval needed if account is already active
    """
    
    # Verify account is active
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    if user.get("profile_status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account must be approved by admin before creating occupation profiles"
        )
    
    # Check current occupation count
    current_count = await db.occupation_profiles.count_documents({
        "workforce_id": current_user["user_id"]
    })
    
    if current_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 3 occupation profiles allowed. Please delete an existing occupation to add a new one."
        )
    
    # Check if occupation title already exists for this worker
    existing = await db.occupation_profiles.find_one({
        "workforce_id": current_user["user_id"],
        "occupation_title": occupation_data.get("occupation_title")
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a profile for this occupation"
        )
    
    # Create occupation profile - NO ADMIN APPROVAL NEEDED
    # Profile is immediately active for job matching (without certifications)
    occupation = OccupationProfile(
        workforce_id=current_user["user_id"],
        active=True,  # Immediately active
        **occupation_data
    )
    
    await db.occupation_profiles.insert_one(occupation.model_dump())
    
    # Update workforce profile occupation count
    await db.workforce_profiles.update_one(
        {"workforce_id": current_user["user_id"]},
        {"$inc": {"occupation_count": 1}}
    )
    
    return {
        "success": True,
        "data": {"occupation_id": occupation.occupation_id},
        "message": "Occupation profile created successfully. You can now add certifications and start receiving job offers!"
    }

@router.delete("/{occupation_id}", response_model=Dict)
async def delete_occupation_profile(
    occupation_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Delete occupation profile (only if no active jobs or financial obligations)"""
    
    # Verify occupation belongs to worker
    occupation = await db.occupation_profiles.find_one({
        "occupation_id": occupation_id,
        "workforce_id": current_user["user_id"]
    })
    
    if not occupation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Occupation profile not found"
        )
    
    # Check for active bookings for this occupation
    # TODO: Implement check for active bookings linked to this occupation
    active_bookings = await db.bookings.count_documents({
        "workforce_id": current_user["user_id"],
        "occupation_id": occupation_id,
        "status": {"$in": ["pending", "accepted"]}
    })
    
    if active_bookings > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete occupation with {active_bookings} active job placement(s). Complete or cancel jobs first."
        )
    
    # Check for pending payments
    # TODO: Implement financial obligation check
    
    # Delete occupation profile
    await db.occupation_profiles.delete_one({"occupation_id": occupation_id})
    
    # Delete associated credentials
    await db.workforce_credentials.delete_many({
        "occupation_id": occupation_id,
        "workforce_id": current_user["user_id"]
    })
    
    # Update occupation count
    await db.workforce_profiles.update_one(
        {"workforce_id": current_user["user_id"]},
        {"$inc": {"occupation_count": -1}}
    )
    
    return {
        "success": True,
        "message": "Occupation profile deleted. Admin will review this request."
    }

@router.patch("/{occupation_id}", response_model=Dict)
async def update_occupation_profile(
    occupation_id: str,
    update_data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Update occupation profile (skills, availability, rate)"""
    
    # Verify ownership
    occupation = await db.occupation_profiles.find_one({
        "occupation_id": occupation_id,
        "workforce_id": current_user["user_id"]
    })
    
    if not occupation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Occupation profile not found"
        )
    
    # Prevent changing occupation title (must delete and recreate)
    if "occupation_title" in update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change occupation title. Delete this profile and create a new one."
        )
    
    update_data["updated_date"] = datetime.utcnow().isoformat()
    
    await db.occupation_profiles.update_one(
        {"occupation_id": occupation_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Occupation profile updated"
    }

@router.get("/categories", response_model=Dict)
async def get_occupation_categories(db = Depends(get_db)):
    """Get list of occupation categories and occupations"""
    from utils.occupation_categories import OCCUPATION_CATEGORIES
    
    # Return structured categories with occupations
    return {
        "success": True,
        "data": {
            "categories": OCCUPATION_CATEGORIES
        }
    }
