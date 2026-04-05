from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from datetime import datetime, timezone
from auth.dependencies import require_role
from models.shift_ratings import ShiftRatingRequest, WorkerRatingCategories
import uuid

router = APIRouter(prefix="/api/employer/ratings", tags=["Shift Ratings"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.get("/pending", response_model=Dict)
async def get_pending_ratings(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get list of completed shifts that need ratings
    Only shows shifts that have ended but haven't been rated yet
    """
    employer_id = current_user["user_id"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Get completed shifts (ended before now)
    completed_shifts = await db.shifts.find({
        "employer_id": employer_id,
        "end_time": {"$lt": now}
    }, {"_id": 0}).sort("end_time", -1).to_list(100)
    
    # Filter out shifts that already have ratings
    pending_shifts = []
    for shift in completed_shifts:
        # Check if ratings exist for each assigned worker
        for worker in shift.get("assigned_workers", []):
            worker_id = worker.get("worker_id")
            if not worker_id:
                continue
                
            # Check if rating exists
            existing_rating = await db.shift_ratings.find_one({
                "shift_id": shift["shift_id"],
                "worker_id": worker_id
            })
            
            if not existing_rating:
                # Get worker details
                worker_user = await db.users.find_one(
                    {"user_id": worker_id},
                    {"_id": 0, "full_name": 1}
                )
                
                worker_profile = await db.workforce_profiles.find_one(
                    {"workforce_id": worker_id},
                    {"_id": 0, "profile_photo_url": 1}
                )
                
                pending_shifts.append({
                    "shift_id": shift["shift_id"],
                    "worker_id": worker_id,
                    "worker_name": worker.get("worker_name") or (worker_user.get("full_name") if worker_user else "Worker"),
                    "worker_photo": worker_profile.get("profile_photo_url") if worker_profile else None,
                    "position_title": shift.get("position_title", "Position"),
                    "workplace_name": shift.get("workplace_name", "Workplace"),
                    "workplace_id": shift.get("workplace_id"),
                    "shift_date": shift.get("start_time", "")[:10],  # YYYY-MM-DD
                    "start_time": shift.get("start_time"),
                    "end_time": shift.get("end_time")
                })
    
    return {
        "success": True,
        "data": {
            "pending_ratings": pending_shifts,
            "count": len(pending_shifts)
        }
    }


@router.post("/submit", response_model=Dict)
async def submit_shift_rating(
    rating_request: ShiftRatingRequest,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Submit rating for a worker after a shift
    """
    employer_id = current_user["user_id"]
    
    # Verify shift exists and belongs to employer
    shift = await db.shifts.find_one({
        "shift_id": rating_request.shift_id,
        "employer_id": employer_id
    }, {"_id": 0})
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Verify shift has ended
    now = datetime.now(timezone.utc).isoformat()
    if shift.get("end_time", "") >= now:
        raise HTTPException(status_code=400, detail="Cannot rate shift that hasn't ended yet")
    
    # Check if rating already exists
    existing_rating = await db.shift_ratings.find_one({
        "shift_id": rating_request.shift_id,
        "worker_id": rating_request.worker_id
    })
    
    if existing_rating:
        raise HTTPException(status_code=400, detail="Rating already submitted for this shift and worker")
    
    # Calculate overall ratings
    worker_ratings_dict = rating_request.worker_ratings.dict()
    worker_overall = sum(worker_ratings_dict.values()) / len(worker_ratings_dict)
    
    employer_overall = None
    employer_ratings_dict = None
    if rating_request.employer_ratings:
        employer_ratings_dict = rating_request.employer_ratings.dict()
        employer_overall = sum(employer_ratings_dict.values()) / len(employer_ratings_dict)
    
    # Create rating document
    rating_id = f"rating_{uuid.uuid4().hex[:12]}"
    rating_doc = {
        "rating_id": rating_id,
        "shift_id": rating_request.shift_id,
        "employer_id": employer_id,
        "worker_id": rating_request.worker_id,
        "workplace_id": shift.get("workplace_id"),
        "position_title": shift.get("position_title", "Position"),
        "shift_date": shift.get("start_time", "")[:10],
        
        # Worker ratings
        "worker_ratings": worker_ratings_dict,
        "worker_overall_rating": round(worker_overall, 2),
        "worker_comments": rating_request.worker_comments,
        
        # Employer ratings (if provided)
        "employer_ratings": employer_ratings_dict,
        "employer_overall_rating": round(employer_overall, 2) if employer_overall else None,
        "employer_comments": rating_request.employer_comments,
        
        # Timestamps
        "rated_by_employer_at": datetime.now(timezone.utc).isoformat(),
        "rated_by_worker_at": datetime.now(timezone.utc).isoformat() if rating_request.employer_ratings else None,
        "created_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.shift_ratings.insert_one(rating_doc)
    
    # Update worker's overall average rating in occupation profile
    await update_worker_average_rating(db, rating_request.worker_id, shift.get("position_title"))
    
    return {
        "success": True,
        "data": {
            "rating_id": rating_id,
            "worker_overall_rating": round(worker_overall, 2)
        }
    }


@router.get("/analytics", response_model=Dict)
async def get_rating_analytics(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get rating analytics and insights for employer
    """
    employer_id = current_user["user_id"]
    
    # Get all ratings for this employer
    ratings = await db.shift_ratings.find({
        "employer_id": employer_id
    }, {"_id": 0}).to_list(1000)
    
    if not ratings:
        return {
            "success": True,
            "data": {
                "total_ratings": 0,
                "average_rating": 0,
                "category_averages": {},
                "top_performers": [],
                "recent_ratings": []
            }
        }
    
    # Calculate averages
    total_ratings = len(ratings)
    overall_avg = sum(r["worker_overall_rating"] for r in ratings) / total_ratings
    
    # Category averages
    category_totals = {}
    for rating in ratings:
        for category, value in rating["worker_ratings"].items():
            if category not in category_totals:
                category_totals[category] = []
            category_totals[category].append(value)
    
    category_averages = {
        category: round(sum(values) / len(values), 2)
        for category, values in category_totals.items()
    }
    
    # Top performers (workers with highest average ratings)
    worker_ratings = {}
    for rating in ratings:
        worker_id = rating["worker_id"]
        if worker_id not in worker_ratings:
            worker_ratings[worker_id] = []
        worker_ratings[worker_id].append(rating["worker_overall_rating"])
    
    top_performers = []
    for worker_id, worker_rating_list in worker_ratings.items():
        avg_rating = sum(worker_rating_list) / len(worker_rating_list)
        
        # Get worker details
        worker = await db.users.find_one(
            {"user_id": worker_id},
            {"_id": 0, "full_name": 1}
        )
        
        if worker:
            top_performers.append({
                "worker_id": worker_id,
                "worker_name": worker.get("full_name", "Worker"),
                "average_rating": round(avg_rating, 2),
                "total_ratings": len(worker_rating_list)
            })
    
    top_performers.sort(key=lambda x: x["average_rating"], reverse=True)
    
    # Recent ratings
    recent_ratings = sorted(ratings, key=lambda x: x["created_date"], reverse=True)[:10]
    
    return {
        "success": True,
        "data": {
            "total_ratings": total_ratings,
            "average_rating": round(overall_avg, 2),
            "category_averages": category_averages,
            "top_performers": top_performers[:10],
            "recent_ratings": recent_ratings
        }
    }


async def update_worker_average_rating(db, worker_id: str, position_title: str):
    """
    Update worker's average rating in their occupation profile AND workforce profile.
    Handles both new schema (worker_overall_rating) and legacy schema (rating field).
    """
    # Get all ratings for this worker (handle both schemas)
    new_ratings = await db.shift_ratings.find(
        {"worker_id": worker_id},
        {"_id": 0, "worker_overall_rating": 1}
    ).to_list(1000)
    
    legacy_ratings = await db.shift_ratings.find(
        {"rated_user_id": worker_id},
        {"_id": 0, "rating": 1}
    ).to_list(1000)
    
    all_scores = []
    for r in new_ratings:
        if r.get("worker_overall_rating") is not None:
            all_scores.append(r["worker_overall_rating"])
    for r in legacy_ratings:
        if r.get("rating") is not None:
            all_scores.append(r["rating"])
    
    if not all_scores:
        return
    
    avg_rating = round(sum(all_scores) / len(all_scores), 2)
    total_count = len(all_scores)
    
    # Update occupation profile if matching one exists
    if position_title:
        await db.occupation_profiles.update_one(
            {"workforce_id": worker_id, "occupation_title": position_title},
            {"$set": {
                "skill_rating_avg": avg_rating,
                "skill_rating_count": total_count
            }}
        )
    
    # Always update workforce profile's general rating
    await db.workforce_profiles.update_one(
        {"workforce_id": worker_id},
        {"$set": {
            "general_rating_avg": avg_rating,
            "general_rating_count": total_count,
            "updated_date": datetime.now(timezone.utc).isoformat()
        }}
    )
