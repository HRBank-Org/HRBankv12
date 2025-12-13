from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from typing import Dict, List
from auth.dependencies import require_role
from database import get_database

router = APIRouter(prefix="/api/compliance", tags=["compliance"])

# Break requirements (in minutes)
BREAK_REQUIREMENTS = {
    "short_break": {
        "duration": 10,  # minutes
        "after_hours": 2,  # after 2 hours of work
        "description": "10-minute break required after 2 hours of work"
    },
    "meal_break": {
        "duration": 30,  # minutes
        "after_hours": 4,  # after 4 hours of work
        "description": "30-minute meal break required after 4 hours of work"
    }
}

# Provincial weekly hour limits (standard + overtime threshold)
PROVINCIAL_LIMITS = {
    "ON": {"standard": 44, "max": 48, "max_with_agreement": 60},
    "QC": {"standard": 40, "max": 50, "max_with_agreement": 60},
    "BC": {"standard": 40, "max": 48, "max_with_agreement": 60},
    "AB": {"standard": 44, "max": 48, "max_with_agreement": 60},
    "MB": {"standard": 40, "max": 48, "max_with_agreement": 60},
    "SK": {"standard": 40, "max": 48, "max_with_agreement": 60},
    "NS": {"standard": 48, "max": 48, "max_with_agreement": 60},
    "NB": {"standard": 44, "max": 48, "max_with_agreement": 60},
    "NL": {"standard": 40, "max": 48, "max_with_agreement": 60},
    "PE": {"standard": 48, "max": 48, "max_with_agreement": 60},
}

@router.get("/worker-weekly-hours/{worker_id}")
async def get_worker_weekly_hours(
    worker_id: str,
    week_start_date: str,  # ISO format YYYY-MM-DD
    current_user: dict = Depends(require_role('employer'))
):
    """Calculate worker's total hours for a specific week"""
    db = await get_database()
    
    # Parse week start date
    week_start = datetime.fromisoformat(week_start_date)
    week_end = week_start + timedelta(days=7)
    
    # Get all assigned shifts for this worker in the week
    assignments = await db.shift_assignments.find({
        "worker_id": worker_id,
        "shift_date": {
            "$gte": week_start.isoformat(),
            "$lt": week_end.isoformat()
        },
        "status": {"$in": ["assigned", "confirmed", "completed"]}
    }).to_list(100)
    
    total_hours = 0
    shift_details = []
    
    for assignment in assignments:
        # Get shift details
        shift = await db.calendar_shifts.find_one({"shift_id": assignment["shift_id"]})
        if shift:
            # Calculate hours
            start_time = datetime.fromisoformat(shift["start_time"])
            end_time = datetime.fromisoformat(shift["end_time"])
            hours = (end_time - start_time).total_seconds() / 3600
            total_hours += hours
            
            shift_details.append({
                "shift_id": shift["shift_id"],
                "date": shift["shift_date"],
                "position": shift["position_title"],
                "hours": round(hours, 2),
                "workplace": shift["workplace_name"]
            })
    
    # Get worker's province to check limits
    worker = await db.workforce_profiles.find_one({"user_id": worker_id})
    province = worker.get("province_code", "ON") if worker else "ON"
    
    limits = PROVINCIAL_LIMITS.get(province, PROVINCIAL_LIMITS["ON"])
    
    return {
        "success": True,
        "data": {
            "worker_id": worker_id,
            "week_start": week_start_date,
            "total_hours": round(total_hours, 2),
            "shift_count": len(shift_details),
            "shifts": shift_details,
            "compliance": {
                "province": province,
                "standard_hours": limits["standard"],
                "max_hours": limits["max"],
                "max_with_agreement": limits["max_with_agreement"],
                "is_within_standard": total_hours <= limits["standard"],
                "is_compliant": total_hours <= limits["max"],
                "overtime_hours": max(0, total_hours - limits["standard"]),
                "warning_level": (
                    "none" if total_hours <= limits["standard"] else
                    "overtime" if total_hours <= limits["max"] else
                    "excess"
                )
            }
        }
    }


@router.get("/unstaffed-shifts")
async def get_unstaffed_shifts(
    days_ahead: int = 7,
    current_user: dict = Depends(require_role('employer'))
):
    """Get shifts that are understaffed or have no workers assigned"""
    db = await get_database()
    
    # Get shifts for next X days
    today = datetime.now()
    end_date = today + timedelta(days=days_ahead)
    
    shifts = await db.calendar_shifts.find({
        "employer_id": current_user["user_id"],
        "shift_date": {
            "$gte": today.date().isoformat(),
            "$lte": end_date.date().isoformat()
        },
        "status": {"$in": ["open", "partial"]}
    }).to_list(500)
    
    understaffed_shifts = []
    
    for shift in shifts:
        # Count assigned workers
        assignments = await db.shift_assignments.count_documents({
            "shift_id": shift["shift_id"],
            "status": {"$in": ["assigned", "confirmed"]}
        })
        
        positions_needed = shift.get("positions_needed", 1)
        open_positions = positions_needed - assignments
        
        if open_positions > 0:
            understaffed_shifts.append({
                "shift_id": shift["shift_id"],
                "workplace_id": shift["workplace_id"],
                "workplace_name": shift["workplace_name"],
                "position_title": shift["position_title"],
                "shift_date": shift["shift_date"],
                "start_time": shift["start_time"],
                "end_time": shift["end_time"],
                "positions_needed": positions_needed,
                "positions_filled": assignments,
                "open_positions": open_positions,
                "urgency": (
                    "critical" if open_positions == positions_needed else  # No workers assigned
                    "high" if open_positions >= positions_needed / 2 else  # More than half empty
                    "medium"
                )
            })
    
    # Sort by urgency and date
    urgency_order = {"critical": 0, "high": 1, "medium": 2}
    understaffed_shifts.sort(key=lambda x: (urgency_order[x["urgency"]], x["shift_date"]))
    
    return {
        "success": True,
        "data": {
            "total_understaffed": len(understaffed_shifts),
            "critical_count": sum(1 for s in understaffed_shifts if s["urgency"] == "critical"),
            "high_count": sum(1 for s in understaffed_shifts if s["urgency"] == "high"),
            "shifts": understaffed_shifts
        }
    }


@router.post("/check-assignment-compliance")
async def check_assignment_compliance(
    data: dict,
    current_user: dict = Depends(require_role('employer'))
):
    """
    Check if assigning a worker to a shift would violate weekly hour limits
    Request body: { worker_id, shift_id }
    """
    db = await get_database()
    
    worker_id = data.get("worker_id")
    shift_id = data.get("shift_id")
    
    if not worker_id or not shift_id:
        raise HTTPException(status_code=400, detail="worker_id and shift_id required")
    
    # Get shift details
    shift = await db.calendar_shifts.find_one({"shift_id": shift_id})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Calculate shift hours
    start_time = datetime.fromisoformat(shift["start_time"])
    end_time = datetime.fromisoformat(shift["end_time"])
    shift_hours = (end_time - start_time).total_seconds() / 3600
    
    # Get week start (Monday)
    shift_date = datetime.fromisoformat(shift["shift_date"])
    week_start = shift_date - timedelta(days=shift_date.weekday())
    
    # Get worker's current weekly hours
    weekly_hours_response = await get_worker_weekly_hours(
        worker_id=worker_id,
        week_start_date=week_start.date().isoformat(),
        current_user=current_user
    )
    
    current_hours = weekly_hours_response["data"]["total_hours"]
    projected_hours = current_hours + shift_hours
    compliance = weekly_hours_response["data"]["compliance"]
    
    warnings = [
        {
            "level": "info",
            "message": f"Worker currently has {round(current_hours, 2)} hours this week"
        }
    ]
    
    if projected_hours > compliance["standard_hours"]:
        warnings.append({
            "level": "warning",
            "message": f"This shift adds {round(shift_hours, 2)} hours, bringing total to {round(projected_hours, 2)} hours (overtime)"
        })
    
    if projected_hours > compliance["max_hours"]:
        warnings.append({
            "level": "error",
            "message": f"⚠️ COMPLIANCE VIOLATION: Exceeds {compliance['province']} maximum of {compliance['max_hours']} hours/week"
        })
    
    return {
        "success": True,
        "data": {
            "worker_id": worker_id,
            "shift_id": shift_id,
            "shift_hours": round(shift_hours, 2),
            "current_weekly_hours": round(current_hours, 2),
            "projected_weekly_hours": round(projected_hours, 2),
            "compliance": compliance,
            "can_assign": projected_hours <= compliance["max_hours"],
            "warnings": [w for w in warnings if w is not None]
        }
    }




@router.get("/shift-break-requirements/{shift_id}")
async def get_shift_break_requirements(
    shift_id: str,
    current_user: dict = Depends(require_role(['employer', 'workforce']))
):
    """Calculate required breaks for a shift based on duration"""
    db = await get_database()
    
    shift = await db.calendar_shifts.find_one({"shift_id": shift_id})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Calculate shift duration
    start_time = datetime.fromisoformat(shift["start_time"])
    end_time = datetime.fromisoformat(shift["end_time"])
    shift_hours = (end_time - start_time).total_seconds() / 3600
    
    required_breaks = []
    
    # 10-min break after 2 hours
    if shift_hours >= 2:
        # Calculate when break should be taken (2 hours into shift)
        break_time = start_time + timedelta(hours=2)
        required_breaks.append({
            "type": "short_break",
            "duration": 10,
            "required_after_hours": 2,
            "suggested_time": break_time.isoformat(),
            "description": "10-minute break",
            "is_mandatory": True
        })
    
    # 30-min meal break after 4 hours
    if shift_hours >= 4:
        break_time = start_time + timedelta(hours=4)
        required_breaks.append({
            "type": "meal_break",
            "duration": 30,
            "required_after_hours": 4,
            "suggested_time": break_time.isoformat(),
            "description": "30-minute meal break",
            "is_mandatory": True
        })
    
    # Additional 10-min break for every additional 2 hours
    if shift_hours >= 6:
        break_time = start_time + timedelta(hours=6)
        required_breaks.append({
            "type": "short_break",
            "duration": 10,
            "required_after_hours": 6,
            "suggested_time": break_time.isoformat(),
            "description": "10-minute break",
            "is_mandatory": True
        })
    
    if shift_hours >= 8:
        break_time = start_time + timedelta(hours=8)
        required_breaks.append({
            "type": "short_break",
            "duration": 10,
            "required_after_hours": 8,
            "suggested_time": break_time.isoformat(),
            "description": "10-minute break",
            "is_mandatory": True
        })
    
    return {
        "success": True,
        "data": {
            "shift_id": shift_id,
            "shift_hours": round(shift_hours, 2),
            "total_break_time": sum(b["duration"] for b in required_breaks),
            "required_breaks": required_breaks,
            "compliance_notes": [
                "Breaks are mandatory under labor law",
                "Workers must clock out for breaks",
                "System will notify workers when breaks are due"
            ]
        }
    }


@router.post("/track-break")
async def track_break(
    data: dict,
    current_user: dict = Depends(require_role(['employer', 'workforce']))
):
    """
    Record when a worker takes a break
    Request: { shift_id, worker_id, break_type, break_start, break_end }
    """
    db = await get_database()
    
    shift_id = data.get("shift_id")
    worker_id = data.get("worker_id")
    break_type = data.get("break_type")  # 'short_break' or 'meal_break'
    break_start = data.get("break_start")  # ISO timestamp
    break_end = data.get("break_end")  # ISO timestamp (optional if ongoing)
    
    if not all([shift_id, worker_id, break_type, break_start]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Calculate break duration
    start_dt = datetime.fromisoformat(break_start)
    duration_minutes = None
    
    if break_end:
        end_dt = datetime.fromisoformat(break_end)
        duration_minutes = (end_dt - start_dt).total_seconds() / 60
    
    # Create or update break record
    break_record = {
        "shift_id": shift_id,
        "worker_id": worker_id,
        "break_type": break_type,
        "break_start": break_start,
        "break_end": break_end,
        "duration_minutes": round(duration_minutes, 2) if duration_minutes else None,
        "status": "completed" if break_end else "ongoing",
        "created_at": datetime.now().isoformat()
    }
    
    # Check if break already exists
    existing_break = await db.break_tracking.find_one({
        "shift_id": shift_id,
        "worker_id": worker_id,
        "break_type": break_type,
        "status": "ongoing"
    })
    
    if existing_break and break_end:
        # Update existing ongoing break
        await db.break_tracking.update_one(
            {"_id": existing_break["_id"]},
            {"$set": {
                "break_end": break_end,
                "duration_minutes": round(duration_minutes, 2),
                "status": "completed",
                "updated_at": datetime.now().isoformat()
            }}
        )
    else:
        # Insert new break record
        await db.break_tracking.insert_one(break_record)
    
    return {
        "success": True,
        "message": "Break recorded successfully",
        "data": break_record
    }


@router.get("/worker-break-status/{worker_id}/{shift_id}")
async def get_worker_break_status(
    worker_id: str,
    shift_id: str,
    current_user: dict = Depends(require_role(['employer', 'workforce']))
):
    """Get break compliance status for a worker's current shift"""
    db = await get_database()
    
    # Get shift details
    shift = await db.calendar_shifts.find_one({"shift_id": shift_id})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Get attendance record to see when worker clocked in
    attendance = await db.attendance.find_one({
        "shift_id": shift_id,
        "worker_id": worker_id,
        "clock_out_time": None  # Currently clocked in
    })
    
    if not attendance:
        return {
            "success": True,
            "data": {
                "is_clocked_in": False,
                "message": "Worker not currently clocked in"
            }
        }
    
    clock_in_time = datetime.fromisoformat(attendance["clock_in_time"])
    current_time = datetime.now()
    hours_worked = (current_time - clock_in_time).total_seconds() / 3600
    
    # Get required breaks
    break_reqs_response = await get_shift_break_requirements(shift_id, current_user)
    required_breaks = break_reqs_response["data"]["required_breaks"]
    
    # Get taken breaks
    taken_breaks = await db.break_tracking.find({
        "shift_id": shift_id,
        "worker_id": worker_id,
        "status": "completed"
    }).to_list(20)
    
    # Check compliance
    break_compliance = []
    missing_breaks = []
    
    for req_break in required_breaks:
        if hours_worked >= req_break["required_after_hours"]:
            # This break should have been taken
            taken = any(
                b["break_type"] == req_break["type"] 
                for b in taken_breaks
            )
            
            if taken:
                break_compliance.append({
                    "break_type": req_break["type"],
                    "description": req_break["description"],
                    "status": "taken",
                    "compliant": True
                })
            else:
                missing_breaks.append({
                    "break_type": req_break["type"],
                    "description": req_break["description"],
                    "status": "overdue",
                    "compliant": False,
                    "should_notify": True
                })
    
    # Determine if worker needs break now
    needs_break_now = len(missing_breaks) > 0
    
    return {
        "success": True,
        "data": {
            "worker_id": worker_id,
            "shift_id": shift_id,
            "is_clocked_in": True,
            "hours_worked": round(hours_worked, 2),
            "break_compliance": break_compliance,
            "missing_breaks": missing_breaks,
            "needs_break_now": needs_break_now,
            "next_break_due": missing_breaks[0] if missing_breaks else None,
            "taken_breaks_count": len(taken_breaks),
            "compliance_status": "compliant" if len(missing_breaks) == 0 else "non_compliant"
        }
    }


@router.get("/pending-break-notifications")
async def get_pending_break_notifications(
    current_user: dict = Depends(require_role('employer'))
):
    """Get list of workers who need break reminders"""
    db = await get_database()
    
    # Get all currently clocked-in workers for this employer
    today = datetime.now().date().isoformat()
    
    attendance_records = await db.attendance.find({
        "employer_id": current_user["user_id"],
        "attendance_date": today,
        "clock_out_time": None  # Currently clocked in
    }).to_list(500)
    
    workers_needing_breaks = []
    
    for attendance in attendance_records:
        worker_id = attendance["worker_id"]
        shift_id = attendance["shift_id"]
        
        # Get break status
        try:
            status_response = await get_worker_break_status(
                worker_id=worker_id,
                shift_id=shift_id,
                current_user=current_user
            )
            
            status_data = status_response["data"]
            
            if status_data["needs_break_now"]:
                workers_needing_breaks.append({
                    "worker_id": worker_id,
                    "worker_name": attendance.get("worker_name", "Unknown"),
                    "shift_id": shift_id,
                    "workplace_name": attendance.get("workplace_name", "Unknown"),
                    "hours_worked": status_data["hours_worked"],
                    "missing_breaks": status_data["missing_breaks"],
                    "next_break": status_data["next_break_due"]
                })
        except Exception as e:
            print(f"Error checking break status for worker {worker_id}: {str(e)}")
            continue
    
    return {
        "success": True,
        "data": {
            "total_workers_on_shift": len(attendance_records),
            "workers_needing_breaks": len(workers_needing_breaks),
            "workers": workers_needing_breaks
        }
    }
