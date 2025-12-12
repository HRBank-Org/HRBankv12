"""
Compliance Validation Utilities
Validates labor law compliance including maximum weekly hours
"""
from datetime import datetime, timedelta
from typing import Dict, List

MAX_WEEKLY_HOURS = 44  # Ontario Employment Standards Act maximum

async def validate_weekly_hours(db, worker_id: str, new_shift_hours: float, shift_start: str) -> Dict:
    """
    Validate that adding a shift doesn't exceed 44 hours/week limit
    
    Args:
        db: Database connection
        worker_id: Worker's user ID
        new_shift_hours: Hours for the new/edited shift
        shift_start: ISO format datetime string for shift start
        
    Returns:
        Dict with 'compliant' (bool) and 'current_hours' (float) and 'message' (str)
    """
    try:
        # Parse shift start date
        shift_date = datetime.fromisoformat(shift_start.replace('Z', '+00:00'))
        
        # Calculate week boundaries (Monday to Sunday)
        # Get Monday of the week
        days_since_monday = shift_date.weekday()
        week_start = (shift_date - timedelta(days=days_since_monday)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_end = week_start + timedelta(days=7)
        
        # Get all shifts for this worker in this week
        shifts = await db.calendar_shifts.find({
            "assigned_workers.worker_id": worker_id,
            "start_time": {
                "$gte": week_start.isoformat(),
                "$lt": week_end.isoformat()
            }
        }, {"_id": 0, "duration_hours": 1, "shift_id": 1}).to_list(1000)
        
        # Calculate current weekly hours
        current_hours = sum(shift.get("duration_hours", 0) for shift in shifts)
        total_hours = current_hours + new_shift_hours
        
        is_compliant = total_hours <= MAX_WEEKLY_HOURS
        
        return {
            "compliant": is_compliant,
            "current_hours": current_hours,
            "total_hours": total_hours,
            "max_hours": MAX_WEEKLY_HOURS,
            "remaining_hours": max(0, MAX_WEEKLY_HOURS - current_hours),
            "week_start": week_start.strftime("%Y-%m-%d"),
            "week_end": (week_end - timedelta(seconds=1)).strftime("%Y-%m-%d"),
            "message": f"Adding {new_shift_hours}h would result in {total_hours}h/week (limit: {MAX_WEEKLY_HOURS}h)" if not is_compliant
                      else f"Within compliance: {total_hours}h/{MAX_WEEKLY_HOURS}h for week of {week_start.strftime('%b %d')}"
        }
        
    except Exception as e:
        return {
            "compliant": True,  # Don't block on validation errors
            "current_hours": 0,
            "total_hours": new_shift_hours,
            "max_hours": MAX_WEEKLY_HOURS,
            "remaining_hours": MAX_WEEKLY_HOURS,
            "message": f"Could not validate hours: {str(e)}",
            "error": str(e)
        }


async def validate_role_weekly_hours(db, role_data: Dict) -> Dict:
    """
    Validate that a role's weekly schedule doesn't exceed 44 hours
    
    Args:
        db: Database connection
        role_data: Role data with shift_start_time, shift_end_time, days_of_week
        
    Returns:
        Dict with 'compliant' (bool) and 'weekly_hours' (float) and 'message' (str)
    """
    try:
        # Parse shift times
        start_time = role_data.get("shift_start_time", "09:00")
        end_time = role_data.get("shift_end_time", "17:00")
        days_of_week = role_data.get("days_of_week", [])
        
        # Calculate hours per shift
        start_hour, start_min = map(int, start_time.split(':'))
        end_hour, end_min = map(int, end_time.split(':'))
        
        hours_per_shift = (end_hour + end_min/60) - (start_hour + start_min/60)
        
        # Calculate total weekly hours
        weekly_hours = hours_per_shift * len(days_of_week)
        
        is_compliant = weekly_hours <= MAX_WEEKLY_HOURS
        
        return {
            "compliant": is_compliant,
            "hours_per_shift": hours_per_shift,
            "days_per_week": len(days_of_week),
            "weekly_hours": weekly_hours,
            "max_hours": MAX_WEEKLY_HOURS,
            "remaining_hours": max(0, MAX_WEEKLY_HOURS - weekly_hours),
            "message": f"Role schedule: {weekly_hours}h/week exceeds {MAX_WEEKLY_HOURS}h limit" if not is_compliant
                      else f"Role schedule: {weekly_hours}h/week (within {MAX_WEEKLY_HOURS}h limit)"
        }
        
    except Exception as e:
        return {
            "compliant": True,  # Don't block on validation errors
            "weekly_hours": 0,
            "max_hours": MAX_WEEKLY_HOURS,
            "message": f"Could not validate role hours: {str(e)}",
            "error": str(e)
        }
