"""
Time-Off Request Management API
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from auth.dependencies import get_current_user, require_role
from database import get_database
from models.time_off import TimeOffRequest, TimeOffType, TimeOffStatus
from services.shift_notification_service import notify_employment_status_change
from datetime import datetime, date, timedelta
from typing import List
import uuid

router = APIRouter(prefix="/api/time-off", tags=["Time-Off"])


@router.post("/request")
async def create_time_off_request(
    request_data: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role('workforce'))
):
    """Worker creates time-off request"""
    db = await get_database()
    
    # Parse dates
    start_date = datetime.fromisoformat(request_data['start_date']).date()
    end_date = datetime.fromisoformat(request_data['end_date']).date()
    
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    # Calculate total days
    total_days = (end_date - start_date).days + 1
    
    # Find affected shifts
    affected_shifts = await db.calendar_shifts.find({
        "employer_id": request_data['employer_id'],
        "assigned_workers.worker_id": current_user['user_id'],
        "start_time": {
            "$gte": datetime.combine(start_date, datetime.min.time()).isoformat(),
            "$lte": datetime.combine(end_date, datetime.max.time()).isoformat()
        }
    }).to_list(100)
    
    affected_shift_ids = [shift['shift_id'] for shift in affected_shifts]
    
    # Create request
    time_off_request = TimeOffRequest(
        request_id=f"timeoff_{uuid.uuid4().hex[:12]}",
        worker_id=current_user['user_id'],
        employer_id=request_data['employer_id'],
        type=request_data['type'],
        start_date=start_date,
        end_date=end_date,
        reason=request_data.get('reason'),
        notes=request_data.get('notes'),
        affected_shifts=affected_shift_ids,
        total_days=total_days
    )
    
    # Save to database
    await db.time_off_requests.insert_one(time_off_request.model_dump())
    
    # Notify employer (in background)
    employer = await db.employer_profiles.find_one(
        {"employer_id": request_data['employer_id']},
        {"_id": 0, "company_name": 1, "email": 1, "phone_number": 1}
    )
    
    worker = await db.workforce_users.find_one(
        {"user_id": current_user['user_id']},
        {"_id": 0, "first_name": 1, "last_name": 1}
    )
    
    # TODO: Add email notification for employer about time-off request
    
    return {
        "success": True,
        "data": {
            "request_id": time_off_request.request_id,
            "affected_shifts_count": len(affected_shift_ids),
            "total_days": total_days
        },
        "message": f"Time-off request submitted for {total_days} day(s)"
    }


@router.get("/requests")
async def get_time_off_requests(
    status: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get time-off requests (filtered by user role)"""
    db = await get_database()
    
    query = {}
    
    if current_user['user_type'] == 'workforce':
        # Workers see only their own requests
        query['worker_id'] = current_user['user_id']
    elif current_user['user_type'] == 'employer':
        # Employers see requests for their workers
        query['employer_id'] = current_user['user_id']
    
    if status:
        query['status'] = status
    
    requests = await db.time_off_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with worker details for employers
    if current_user['user_type'] == 'employer':
        worker_ids = list(set([r['worker_id'] for r in requests]))
        workers = await db.workforce_users.find(
            {"user_id": {"$in": worker_ids}},
            {"_id": 0, "user_id": 1, "first_name": 1, "last_name": 1, "email": 1, "profile_picture": 1}
        ).to_list(100)
        worker_map = {w['user_id']: w for w in workers}
        
        for req in requests:
            worker = worker_map.get(req['worker_id'], {})
            req['worker_name'] = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip()
            req['worker_email'] = worker.get('email')
            req['worker_photo'] = worker.get('profile_picture')
    
    return {
        "success": True,
        "data": requests
    }


@router.patch("/{request_id}/approve")
async def approve_time_off(
    request_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role('employer'))
):
    """Employer approves time-off request"""
    db = await get_database()
    
    # Get request
    request = await db.time_off_requests.find_one({
        "request_id": request_id,
        "employer_id": current_user['user_id']
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Time-off request not found")
    
    if request['status'] != 'pending':
        raise HTTPException(status_code=400, detail=f"Cannot approve request with status: {request['status']}")
    
    # Update request status
    await db.time_off_requests.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "approved",
                "reviewed_by": current_user['user_id'],
                "reviewed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Mark affected shifts as "on_time_off"
    if request['affected_shifts']:
        await db.calendar_shifts.update_many(
            {"shift_id": {"$in": request['affected_shifts']}},
            {
                "$set": {
                    "time_off_request_id": request_id,
                    "status": "on_time_off"
                }
            }
        )
        
        # Unassign worker from these shifts
        await db.calendar_shifts.update_many(
            {"shift_id": {"$in": request['affected_shifts']}},
            {
                "$pull": {
                    "assigned_workers": {"worker_id": request['worker_id']}
                }
            }
        )
    
    # Notify worker (in background)
    worker = await db.workforce_users.find_one(
        {"user_id": request['worker_id']},
        {"_id": 0, "email": 1, "phone_number": 1, "first_name": 1, "last_name": 1}
    )
    
    # TODO: Add time-off approval notification
    
    return {
        "success": True,
        "message": f"Time-off approved for {request['total_days']} day(s). {len(request['affected_shifts'])} shifts marked as covered."
    }


@router.patch("/{request_id}/reject")
async def reject_time_off(
    request_id: str,
    rejection_data: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role('employer'))
):
    """Employer rejects time-off request"""
    db = await get_database()
    
    # Get request
    request = await db.time_off_requests.find_one({
        "request_id": request_id,
        "employer_id": current_user['user_id']
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Time-off request not found")
    
    if request['status'] != 'pending':
        raise HTTPException(status_code=400, detail=f"Cannot reject request with status: {request['status']}")
    
    # Update request status
    await db.time_off_requests.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "rejected",
                "reviewed_by": current_user['user_id'],
                "reviewed_at": datetime.utcnow(),
                "rejection_reason": rejection_data.get('reason', ''),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Notify worker (in background)
    worker = await db.workforce_users.find_one(
        {"user_id": request['worker_id']},
        {"_id": 0, "email": 1, "phone_number": 1}
    )
    
    # TODO: Add time-off rejection notification
    
    return {
        "success": True,
        "message": "Time-off request rejected"
    }


@router.delete("/{request_id}")
async def cancel_time_off_request(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Worker cancels their own pending time-off request"""
    db = await get_database()
    
    request = await db.time_off_requests.find_one({
        "request_id": request_id,
        "worker_id": current_user['user_id']
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Time-off request not found")
    
    if request['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Can only cancel pending requests")
    
    await db.time_off_requests.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "cancelled",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Time-off request cancelled"
    }
