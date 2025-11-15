from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List
from datetime import datetime, timedelta
from auth.dependencies import get_current_user, require_role
from models.scheduling import ShiftRequest, UnavailableBlock, AvailableSlot, WorkerMatch
from utils.scheduling_algorithm import (
    detect_conflicts,
    calculate_available_slots,
    match_workers_for_shift,
    check_shift_fits_in_available_slot
)

router = APIRouter(prefix="/api/scheduling", tags=["Shift Scheduling"])

def get_db():
    from server import db
    return db

# ==================== EMPLOYER ENDPOINTS ====================

@router.post("/shift-requests", response_model=Dict)
async def create_shift_request(
    shift_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Employer posts a shift request (like Uber ride request)
    Platform automatically matches available workers
    """
    # Calculate duration
    start_dt = datetime.fromisoformat(shift_data['start_time'].replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(shift_data['end_time'].replace('Z', '+00:00'))
    duration_hours = (end_dt - start_dt).total_seconds() / 3600
    
    # Create shift request
    shift_request = ShiftRequest(
        employer_id=current_user["user_id"],
        workplace_id=shift_data['workplace_id'],
        title=shift_data['title'],
        description=shift_data.get('description'),
        start_time=shift_data['start_time'],
        end_time=shift_data['end_time'],
        duration_hours=round(duration_hours, 2),
        skills_required=shift_data.get('skills_required', []),
        min_rating=shift_data.get('min_rating'),
        max_distance_km=shift_data.get('max_distance_km', 10),
        positions_needed=shift_data.get('positions_needed', 1),
        hourly_rate=shift_data['hourly_rate'],
        expires_at=(datetime.utcnow() + timedelta(hours=24)).isoformat()  # 24 hour expiry
    )
    
    # Find matching workers
    matched_workers = await match_workers_for_shift(db, shift_request.model_dump())
    shift_request.matched_workers = [w['worker_id'] for w in matched_workers if w['available']]
    
    # Save to database
    await db.shift_requests.insert_one(shift_request.model_dump())
    
    return {
        "success": True,
        "data": {
            "shift_request_id": shift_request.shift_request_id,
            "matched_workers_count": len(shift_request.matched_workers),
            "message": f"Found {len(shift_request.matched_workers)} available workers"
        }
    }

@router.get("/shift-requests/{request_id}/matches", response_model=Dict)
async def get_matched_workers(
    request_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get matched workers for a shift request (Tinder-style swipe interface)
    Returns workers sorted by match score
    """
    shift_request = await db.shift_requests.find_one({"shift_request_id": request_id})
    
    if not shift_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift request not found"
        )
    
    if shift_request['employer_id'] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Get detailed matches
    matched_workers = await match_workers_for_shift(db, shift_request)
    
    # Only return available workers
    available_workers = [w for w in matched_workers if w['available']]
    
    return {
        "success": True,
        "data": {
            "shift_request": shift_request,
            "matched_workers": available_workers,
            "total_matches": len(available_workers)
        }
    }

@router.post("/shift-requests/{request_id}/select-worker", response_model=Dict)
async def select_worker_for_shift(
    request_id: str,
    data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Employer selects a worker for the shift (after swiping)
    Creates a shift offer and notifies worker
    """
    worker_id = data.get('worker_id')
    
    shift_request = await db.shift_requests.find_one({"shift_request_id": request_id})
    
    if not shift_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift request not found"
        )
    
    if shift_request['employer_id'] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Check worker is in matched list
    if worker_id not in shift_request.get('matched_workers', []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Worker not matched for this shift"
        )
    
    # Double-check availability (might have changed)
    conflicts = await detect_conflicts(
        db, 
        worker_id, 
        shift_request['start_time'], 
        shift_request['end_time']
    )
    
    if conflicts:
        return {
            "success": False,
            "message": "Worker is no longer available for this shift",
            "conflicts": conflicts
        }
    
    # Create shift with "pending" status (awaiting worker acceptance)
    shift_id = f"shift_{datetime.utcnow().timestamp()}"
    shift = {
        "shift_id": shift_id,
        "shift_request_id": request_id,
        "employer_id": current_user["user_id"],
        "workforce_id": worker_id,
        "workplace_id": shift_request['workplace_id'],
        "title": shift_request['title'],
        "description": shift_request.get('description'),
        "start_time": shift_request['start_time'],
        "end_time": shift_request['end_time'],
        "duration_hours": shift_request['duration_hours'],
        "hourly_rate": shift_request['hourly_rate'],
        "status": "pending",  # pending → accepted → active → completed
        "created_date": datetime.utcnow().isoformat()
    }
    
    await db.shifts.insert_one(shift)
    
    # Update shift request status
    await db.shift_requests.update_one(
        {"shift_request_id": request_id},
        {"$set": {
            "status": "pending_acceptance",
            "selected_worker_id": worker_id
        }}
    )
    
    # Send notification to worker
    await db.notifications.insert_one({
        "notification_id": f"notif_{datetime.utcnow().timestamp()}",
        "user_id": worker_id,
        "type": "shift_offer",
        "title": "New Shift Offer",
        "message": f"You have a new shift offer: {shift_request['title']}",
        "data": {"shift_id": shift_id},
        "read": False,
        "created_date": datetime.utcnow().isoformat()
    })
    
    return {
        "success": True,
        "data": {
            "shift_id": shift_id,
            "message": "Shift offer sent to worker"
        }
    }

# ==================== WORKER ENDPOINTS ====================

@router.get("/my-availability", response_model=Dict)
async def get_my_availability(
    date_start: str,
    date_end: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Get worker's available time slots for a date range
    Shows gaps between locked shifts and unavailable blocks
    """
    available_slots = await calculate_available_slots(
        db,
        current_user["user_id"],
        date_start,
        date_end,
        min_duration_hours=1.0
    )
    
    return {
        "success": True,
        "data": {
            "available_slots": available_slots,
            "total_slots": len(available_slots),
            "total_available_hours": sum(slot['duration_hours'] for slot in available_slots)
        }
    }

@router.post("/unavailable-blocks", response_model=Dict)
async def create_unavailable_block(
    block_data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Worker marks time as unavailable (college, personal time, sleep)
    This prevents them from being matched for shifts during this time
    """
    block = UnavailableBlock(
        worker_id=current_user["user_id"],
        type=block_data['type'],
        title=block_data['title'],
        start_time=block_data['start_time'],
        end_time=block_data['end_time'],
        recurring=block_data.get('recurring', False),
        recurring_pattern=block_data.get('recurring_pattern'),
        recurring_days=block_data.get('recurring_days')
    )
    
    await db.unavailable_blocks.insert_one(block.model_dump())
    
    return {
        "success": True,
        "data": {"block_id": block.block_id},
        "message": "Unavailable block created"
    }

@router.get("/unavailable-blocks", response_model=Dict)
async def get_unavailable_blocks(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get all unavailable blocks for worker"""
    blocks = await db.unavailable_blocks.find({
        "worker_id": current_user["user_id"]
    }).to_list(None)
    
    return {
        "success": True,
        "data": {"unavailable_blocks": blocks}
    }

@router.delete("/unavailable-blocks/{block_id}", response_model=Dict)
async def delete_unavailable_block(
    block_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Delete unavailable block - makes that time available again"""
    result = await db.unavailable_blocks.delete_one({
        "block_id": block_id,
        "worker_id": current_user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )
    
    return {
        "success": True,
        "message": "Unavailable block deleted"
    }

@router.post("/shifts/{shift_id}/accept", response_model=Dict)
async def accept_shift_offer(
    shift_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Worker accepts shift offer
    Shift becomes "locked" and time becomes unavailable for other employers
    """
    shift = await db.shifts.find_one({"shift_id": shift_id})
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    
    if shift['workforce_id'] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    if shift['status'] != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shift is already {shift['status']}"
        )
    
    # Final conflict check
    conflicts = await detect_conflicts(
        db,
        current_user["user_id"],
        shift['start_time'],
        shift['end_time']
    )
    
    if conflicts:
        # Remove conflicting shifts that were pending
        return {
            "success": False,
            "message": "Schedule conflict detected",
            "conflicts": conflicts
        }
    
    # Accept shift - becomes locked
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {"$set": {
            "status": "accepted",
            "accepted_date": datetime.utcnow().isoformat()
        }}
    )
    
    # Update shift request
    await db.shift_requests.update_one(
        {"shift_request_id": shift.get('shift_request_id')},
        {"$set": {"status": "filled"}}
    )
    
    # Notify employer
    await db.notifications.insert_one({
        "notification_id": f"notif_{datetime.utcnow().timestamp()}",
        "user_id": shift['employer_id'],
        "type": "shift_accepted",
        "title": "Shift Accepted",
        "message": f"Worker accepted your shift: {shift['title']}",
        "data": {"shift_id": shift_id},
        "read": False,
        "created_date": datetime.utcnow().isoformat()
    })
    
    return {
        "success": True,
        "message": "Shift accepted - time is now locked"
    }

@router.post("/shifts/{shift_id}/reject", response_model=Dict)
async def reject_shift_offer(
    shift_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Worker rejects shift offer"""
    shift = await db.shifts.find_one({"shift_id": shift_id})
    
    if not shift or shift['workforce_id'] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    
    # Update shift
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {"$set": {"status": "rejected"}}
    )
    
    # Reopen shift request
    await db.shift_requests.update_one(
        {"shift_request_id": shift.get('shift_request_id')},
        {"$set": {
            "status": "open",
            "selected_worker_id": None
        }}
    )
    
    return {
        "success": True,
        "message": "Shift offer rejected"
    }

@router.get("/check-availability", response_model=Dict)
async def check_shift_availability(
    start_time: str,
    end_time: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Check if worker is available for a specific time slot
    Returns conflicts if any
    """
    conflicts = await detect_conflicts(
        db,
        current_user["user_id"],
        start_time,
        end_time
    )
    
    available = len(conflicts) == 0
    
    return {
        "success": True,
        "data": {
            "available": available,
            "conflicts": conflicts,
            "message": "Available" if available else f"Conflicts with {len(conflicts)} events"
        }
    }
