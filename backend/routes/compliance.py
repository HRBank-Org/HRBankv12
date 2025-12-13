from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from typing import Dict, List
import pytz
from ..dependencies import require_role, get_database

router = APIRouter(prefix="/api/compliance", tags=["compliance"])

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
