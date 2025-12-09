"""
Weekly Timesheet Management
Aggregates shifts into weekly timesheets (Sun 12:00 AM - Sat 11:59 PM)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from auth.dependencies import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api/employer/weekly-timesheets", tags=["Weekly Timesheets"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

class TimesheetAdjustment(BaseModel):
    """Model for adjusting timesheet hours"""
    adjusted_hours: float
    adjustment_reason: str

def get_week_boundaries(date_str: str):
    """
    Get week start (Sunday 12:00 AM) and end (Saturday 11:59 PM) for a given date
    """
    date = datetime.fromisoformat(date_str).date()
    
    # Find the Sunday of the week
    days_since_sunday = date.weekday() + 1 if date.weekday() != 6 else 0
    week_start = date - timedelta(days=days_since_sunday)
    week_end = week_start + timedelta(days=6)
    
    return week_start.isoformat(), week_end.isoformat()

async def generate_weekly_timesheets(db, employer_id: str, week_start: str, week_end: str):
    """
    Generate weekly timesheets by aggregating completed shifts
    Groups by: workforce_id + employer_id + week
    """
    
    # Get all completed shifts for the week
    shifts = await db.bookings.find({
        "employer_id": employer_id,
        "shift_date": {"$gte": week_start, "$lte": week_end},
        "status": "completed"
    }, {"_id": 0}).to_list(1000)
    
    if not shifts:
        return []
    
    # Group shifts by worker
    worker_shifts = {}
    for shift in shifts:
        workforce_id = shift.get('workforce_id') or shift.get('worker_id')
        if not workforce_id:
            continue
        
        if workforce_id not in worker_shifts:
            worker_shifts[workforce_id] = []
        worker_shifts[workforce_id].append(shift)
    
    # Create/update weekly timesheets
    timesheets = []
    
    for workforce_id, shifts_list in worker_shifts.items():
        # Calculate totals
        total_hours = 0
        total_pay = 0
        shift_ids = []
        workplace_ids = set()
        positions = set()
        
        for shift in shifts_list:
            # Get actual hours from attendance records
            attendance = await db.attendance.find_one({
                "shift_id": shift['shift_id']
            })
            
            if attendance and attendance.get('clock_in_time') and attendance.get('clock_out_time'):
                # Calculate hours from clock in/out
                clock_in = datetime.fromisoformat(attendance['clock_in_time'])
                clock_out = datetime.fromisoformat(attendance['clock_out_time'])
                hours = (clock_out - clock_in).total_seconds() / 3600
            else:
                # Use scheduled hours if no attendance
                start_time = datetime.fromisoformat(f"{shift['shift_date']} {shift.get('start_time', '09:00:00')}")
                end_time = datetime.fromisoformat(f"{shift['shift_date']} {shift.get('end_time', '17:00:00')}")
                hours = (end_time - start_time).total_seconds() / 3600
            
            hourly_rate = shift.get('hourly_rate', 0)
            pay = hours * hourly_rate
            
            total_hours += hours
            total_pay += pay
            shift_ids.append(shift['shift_id'])
            
            if shift.get('workplace_id'):
                workplace_ids.add(shift['workplace_id'])
            if shift.get('position'):
                positions.add(shift['position'])
        
        # Get or create weekly timesheet
        timesheet_id = f"wk_{week_start}_{workforce_id}_{employer_id}"
        
        existing = await db.weekly_timesheets.find_one({
            "timesheet_id": timesheet_id
        })
        
        if existing:
            # Update existing
            await db.weekly_timesheets.update_one(
                {"timesheet_id": timesheet_id},
                {"$set": {
                    "total_hours": round(total_hours, 2),
                    "total_pay": round(total_pay, 2),
                    "shift_ids": shift_ids,
                    "shift_count": len(shift_ids),
                    "updated_at": datetime.utcnow().isoformat()
                }}
            )
        else:
            # Create new
            timesheet = {
                "timesheet_id": timesheet_id,
                "workforce_id": workforce_id,
                "employer_id": employer_id,
                "week_start": week_start,
                "week_end": week_end,
                "total_hours": round(total_hours, 2),
                "total_pay": round(total_pay, 2),
                "shift_ids": shift_ids,
                "shift_count": len(shift_ids),
                "workplace_ids": list(workplace_ids),
                "positions": list(positions),
                "status": "pending_approval",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            await db.weekly_timesheets.insert_one(timesheet)
        
        timesheets.append(timesheet_id)
    
    return timesheets

@router.post("/generate", response_model=Dict)
async def generate_timesheets_for_week(
    week_date: str = Query(..., description="Any date in the week (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Generate weekly timesheets for the week containing the given date
    """
    
    week_start, week_end = get_week_boundaries(week_date)
    
    timesheets = await generate_weekly_timesheets(
        db, 
        current_user['user_id'], 
        week_start, 
        week_end
    )
    
    return {
        "success": True,
        "data": {
            "week_start": week_start,
            "week_end": week_end,
            "timesheets_created": len(timesheets)
        },
        "message": f"Generated {len(timesheets)} weekly timesheets"
    }

@router.get("/pending", response_model=Dict)
async def get_pending_weekly_timesheets(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all pending weekly timesheets for approval
    """
    
    timesheets = await db.weekly_timesheets.find({
        "employer_id": current_user['user_id'],
        "status": "pending_approval"
    }, {"_id": 0}).sort("week_start", -1).to_list(1000)
    
    # Enrich with worker details
    for ts in timesheets:
        # Get worker
        worker = await db.users.find_one(
            {"user_id": ts['workforce_id']},
            {"_id": 0, "first_name": 1, "last_name": 1, "email": 1}
        )
        
        if worker:
            ts['worker_name'] = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip()
            ts['worker_email'] = worker.get('email')
        
        # Get primary workplace
        if ts.get('workplace_ids') and len(ts['workplace_ids']) > 0:
            workplace = await db.workplaces.find_one(
                {"workplace_id": ts['workplace_ids'][0]},
                {"_id": 0, "name": 1}
            )
            if workplace:
                ts['workplace_name'] = workplace.get('name')
        
        # Get primary position
        if ts.get('positions') and len(ts['positions']) > 0:
            ts['position'] = ts['positions'][0]
    
    return {
        "success": True,
        "data": {
            "timesheets": timesheets,
            "total_pending": len(timesheets)
        }
    }

@router.put("/{timesheet_id}/adjust", response_model=Dict)
async def adjust_weekly_timesheet(
    timesheet_id: str,
    adjustment: TimesheetAdjustment,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Adjust hours for a weekly timesheet
    """
    
    timesheet = await db.weekly_timesheets.find_one({
        "timesheet_id": timesheet_id,
        "employer_id": current_user['user_id']
    })
    
    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )
    
    if timesheet['status'] != 'pending_approval':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only adjust pending timesheets. Current status: {timesheet['status']}"
        )
    
    # Calculate new pay (use average rate from total_pay / total_hours)
    avg_rate = timesheet['total_pay'] / timesheet['total_hours'] if timesheet['total_hours'] > 0 else 0
    new_pay = round(adjustment.adjusted_hours * avg_rate, 2)
    
    # Update timesheet
    await db.weekly_timesheets.update_one(
        {"timesheet_id": timesheet_id},
        {"$set": {
            "adjusted_hours": adjustment.adjusted_hours,
            "adjusted_pay": new_pay,
            "adjustment_reason": adjustment.adjustment_reason,
            "adjusted_at": datetime.utcnow().isoformat(),
            "adjusted_by": current_user['user_id'],
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Timesheet hours adjusted successfully",
        "data": {
            "timesheet_id": timesheet_id,
            "original_hours": timesheet['total_hours'],
            "adjusted_hours": adjustment.adjusted_hours,
            "original_pay": timesheet['total_pay'],
            "adjusted_pay": new_pay
        }
    }

@router.post("/{timesheet_id}/approve", response_model=Dict)
async def approve_weekly_timesheet(
    timesheet_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Approve a weekly timesheet - moves to Payroll tab
    """
    
    timesheet = await db.weekly_timesheets.find_one({
        "timesheet_id": timesheet_id,
        "employer_id": current_user['user_id']
    })
    
    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )
    
    if timesheet['status'] != 'pending_approval':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Timesheet already {timesheet['status']}"
        )
    
    # Update status
    await db.weekly_timesheets.update_one(
        {"timesheet_id": timesheet_id},
        {"$set": {
            "status": "approved",
            "approved_at": datetime.utcnow().isoformat(),
            "approved_by": current_user['user_id'],
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Timesheet approved successfully",
        "data": {
            "timesheet_id": timesheet_id,
            "status": "approved"
        }
    }

@router.get("/approved", response_model=Dict)
async def get_approved_weekly_timesheets(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all approved weekly timesheets ready for payroll
    """
    
    timesheets = await db.weekly_timesheets.find({
        "employer_id": current_user['user_id'],
        "status": "approved"
    }, {"_id": 0}).sort("week_start", -1).to_list(1000)
    
    # Enrich with worker details
    for ts in timesheets:
        # Get worker
        worker = await db.users.find_one(
            {"user_id": ts['workforce_id']},
            {"_id": 0, "first_name": 1, "last_name": 1, "email": 1}
        )
        
        if worker:
            ts['worker_name'] = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip()
            ts['worker_email'] = worker.get('email')
        
        # Get primary workplace
        if ts.get('workplace_ids') and len(ts['workplace_ids']) > 0:
            workplace = await db.workplaces.find_one(
                {"workplace_id": ts['workplace_ids'][0]},
                {"_id": 0, "name": 1}
            )
            if workplace:
                ts['workplace_name'] = workplace.get('name')
        
        # Get primary position
        if ts.get('positions') and len(ts['positions']) > 0:
            ts['position'] = ts['positions'][0]
    
    return {
        "success": True,
        "data": {
            "timesheets": timesheets,
            "total_approved": len(timesheets)
        }
    }

@router.post("/{timesheet_id}/move-back", response_model=Dict)
async def move_back_to_pending(
    timesheet_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Move approved timesheet back to pending for editing
    """
    
    timesheet = await db.weekly_timesheets.find_one({
        "timesheet_id": timesheet_id,
        "employer_id": current_user['user_id']
    })
    
    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )
    
    if timesheet['status'] != 'approved':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only edit approved timesheets. Current status: {timesheet['status']}"
        )
    
    # Move back to pending
    await db.weekly_timesheets.update_one(
        {"timesheet_id": timesheet_id},
        {"$set": {
            "status": "pending_approval",
            "returned_for_edit": True,
            "returned_at": datetime.utcnow().isoformat(),
            "returned_by": current_user['user_id'],
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Timesheet moved back to Timesheets tab for editing",
        "data": {
            "timesheet_id": timesheet_id,
            "new_status": "pending_approval"
        }
    }
