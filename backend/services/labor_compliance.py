"""
Labor Compliance Service
Canadian Employment Standards Act (ESA) compliance for Ontario and other provinces.
Handles:
- Maximum hours enforcement
- Overtime calculations
- Break scheduling
- Route duration validation
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# ============================================
# PROVINCIAL LABOR STANDARDS
# ============================================

LABOR_STANDARDS = {
    "ON": {  # Ontario
        "name": "Ontario",
        "min_wage": 16.55,
        "standard_hours_day": 8,
        "max_hours_day": 13,  # Can work up to 13 with agreement
        "absolute_max_hours_day": 13,
        "standard_hours_week": 44,
        "max_hours_week": 48,
        "overtime_threshold_week": 44,
        "overtime_multiplier": 1.5,
        "break_after_hours": 5,
        "break_duration_minutes": 30,
        "min_hours_between_shifts": 11,  # ESA rest period
        "weekly_rest_hours": 24,  # One day off per week
    },
    "BC": {  # British Columbia
        "name": "British Columbia",
        "min_wage": 16.75,
        "standard_hours_day": 8,
        "max_hours_day": 12,
        "absolute_max_hours_day": 12,
        "standard_hours_week": 40,
        "max_hours_week": 48,
        "overtime_threshold_week": 40,
        "overtime_multiplier": 1.5,
        "break_after_hours": 5,
        "break_duration_minutes": 30,
        "min_hours_between_shifts": 8,
        "weekly_rest_hours": 32,
    },
    "AB": {  # Alberta
        "name": "Alberta",
        "min_wage": 15.00,
        "standard_hours_day": 8,
        "max_hours_day": 12,
        "absolute_max_hours_day": 12,
        "standard_hours_week": 44,
        "max_hours_week": 48,
        "overtime_threshold_week": 44,
        "overtime_multiplier": 1.5,
        "break_after_hours": 5,
        "break_duration_minutes": 30,
        "min_hours_between_shifts": 8,
        "weekly_rest_hours": 24,
    },
    "QC": {  # Quebec
        "name": "Quebec",
        "min_wage": 15.25,
        "standard_hours_day": 8,
        "max_hours_day": 12,
        "absolute_max_hours_day": 14,  # With breaks
        "standard_hours_week": 40,
        "max_hours_week": 50,
        "overtime_threshold_week": 40,
        "overtime_multiplier": 1.5,
        "break_after_hours": 5,
        "break_duration_minutes": 30,
        "min_hours_between_shifts": 8,
        "weekly_rest_hours": 32,
    },
    # Default for other provinces
    "DEFAULT": {
        "name": "Canada (Default)",
        "min_wage": 15.00,
        "standard_hours_day": 8,
        "max_hours_day": 12,
        "absolute_max_hours_day": 12,
        "standard_hours_week": 40,
        "max_hours_week": 48,
        "overtime_threshold_week": 44,
        "overtime_multiplier": 1.5,
        "break_after_hours": 5,
        "break_duration_minutes": 30,
        "min_hours_between_shifts": 8,
        "weekly_rest_hours": 24,
    }
}


def get_labor_standards(province: str = "ON") -> Dict:
    """Get labor standards for a province"""
    return LABOR_STANDARDS.get(province.upper(), LABOR_STANDARDS["DEFAULT"])


# ============================================
# ROUTE DURATION VALIDATION
# ============================================

class RouteComplianceResult:
    def __init__(self):
        self.is_valid = True
        self.warnings: List[str] = []
        self.errors: List[str] = []
        self.suggested_breaks: List[Dict] = []
        self.estimated_duration_hours: float = 0
        self.overtime_hours: float = 0
        self.requires_agreement: bool = False
    
    def to_dict(self) -> Dict:
        return {
            "is_valid": self.is_valid,
            "warnings": self.warnings,
            "errors": self.errors,
            "suggested_breaks": self.suggested_breaks,
            "estimated_duration_hours": round(self.estimated_duration_hours, 2),
            "overtime_hours": round(self.overtime_hours, 2),
            "requires_agreement": self.requires_agreement
        }


def validate_route_duration(
    estimated_duration_minutes: int,
    province: str = "ON",
    worker_hours_this_week: float = 0,
    has_overtime_agreement: bool = False
) -> RouteComplianceResult:
    """
    Validate route duration against labor standards.
    
    Args:
        estimated_duration_minutes: Total estimated route duration
        province: Canadian province code
        worker_hours_this_week: Hours already worked this week
        has_overtime_agreement: Whether worker has signed overtime agreement
    
    Returns:
        RouteComplianceResult with validation status and suggestions
    """
    result = RouteComplianceResult()
    standards = get_labor_standards(province)
    
    duration_hours = estimated_duration_minutes / 60
    result.estimated_duration_hours = duration_hours
    
    # Check daily maximum
    if duration_hours > standards["absolute_max_hours_day"]:
        result.is_valid = False
        result.errors.append(
            f"Route duration ({duration_hours:.1f}h) exceeds maximum allowed daily hours "
            f"({standards['absolute_max_hours_day']}h) under {standards['name']} employment standards."
        )
        return result
    
    # Check if exceeds standard hours (requires agreement)
    if duration_hours > standards["standard_hours_day"]:
        result.requires_agreement = True
        if not has_overtime_agreement:
            result.warnings.append(
                f"Route duration ({duration_hours:.1f}h) exceeds standard {standards['standard_hours_day']}h workday. "
                f"Worker agreement for extended hours is recommended."
            )
    
    # Check weekly hours impact
    projected_weekly_hours = worker_hours_this_week + duration_hours
    
    if projected_weekly_hours > standards["max_hours_week"]:
        result.is_valid = False
        result.errors.append(
            f"Adding this route would result in {projected_weekly_hours:.1f} weekly hours, "
            f"exceeding the {standards['max_hours_week']}h weekly maximum."
        )
        return result
    
    if projected_weekly_hours > standards["overtime_threshold_week"]:
        overtime_hours = projected_weekly_hours - standards["overtime_threshold_week"]
        result.overtime_hours = overtime_hours
        result.warnings.append(
            f"This route will trigger {overtime_hours:.1f}h of overtime "
            f"(1.5x pay after {standards['overtime_threshold_week']}h/week)."
        )
    
    # Calculate required breaks
    result.suggested_breaks = calculate_required_breaks(
        duration_hours, 
        standards["break_after_hours"],
        standards["break_duration_minutes"]
    )
    
    if result.suggested_breaks:
        result.warnings.append(
            f"Route requires {len(result.suggested_breaks)} break(s) of "
            f"{standards['break_duration_minutes']} minutes each."
        )
    
    return result


def calculate_required_breaks(
    duration_hours: float,
    break_after_hours: float,
    break_duration_minutes: int
) -> List[Dict]:
    """
    Calculate required breaks for a shift/route duration.
    
    ESA requires a 30-minute break after every 5 hours of work.
    """
    breaks = []
    
    if duration_hours <= break_after_hours:
        return breaks
    
    # Calculate how many breaks are needed
    num_breaks = int(duration_hours / break_after_hours)
    
    for i in range(num_breaks):
        break_time_hours = (i + 1) * break_after_hours
        breaks.append({
            "break_number": i + 1,
            "after_hours": break_time_hours,
            "duration_minutes": break_duration_minutes,
            "type": "meal_break" if i == 0 else "rest_break",
            "paid": False  # Standard meal breaks are unpaid in Ontario
        })
    
    return breaks


# ============================================
# SHIFT CREATION FROM ROUTE
# ============================================

def create_shift_from_route(route: Dict, province: str = "ON") -> Tuple[Dict, RouteComplianceResult]:
    """
    Create a shift record from a completed route.
    
    Args:
        route: Completed route document
        province: Province for labor standards
    
    Returns:
        Tuple of (shift_record, compliance_result)
    """
    import uuid
    
    # Calculate actual duration
    actual_start = route.get("actual_start_time")
    actual_end = route.get("actual_end_time")
    
    if actual_start and actual_end:
        start_dt = datetime.fromisoformat(actual_start.replace('Z', '+00:00')) if isinstance(actual_start, str) else actual_start
        end_dt = datetime.fromisoformat(actual_end.replace('Z', '+00:00')) if isinstance(actual_end, str) else actual_end
        actual_duration_minutes = (end_dt - start_dt).total_seconds() / 60
    else:
        # Use estimated duration
        actual_duration_minutes = sum(
            stop.get("estimated_duration_minutes", 15) 
            for stop in route.get("stops", [])
        )
    
    # Validate compliance
    compliance = validate_route_duration(int(actual_duration_minutes), province)
    
    # Calculate hours worked (excluding breaks)
    hours_worked = actual_duration_minutes / 60
    break_time_hours = sum(b["duration_minutes"] for b in compliance.suggested_breaks) / 60
    billable_hours = hours_worked - break_time_hours
    
    # Create shift record
    shift = {
        "shift_id": str(uuid.uuid4()),
        "source_type": "field_service_route",
        "source_id": route.get("route_id"),
        "employer_id": route.get("employer_id"),
        "worker_id": route.get("worker_id"),
        "worker_name": route.get("worker_name"),
        "workplace_id": route.get("workplace_id"),
        
        # Timing
        "shift_date": route.get("scheduled_date"),
        "scheduled_start": route.get("scheduled_start_time"),
        "scheduled_end": route.get("scheduled_end_time"),
        "actual_start": route.get("actual_start_time"),
        "actual_end": route.get("actual_end_time"),
        
        # Duration
        "total_duration_hours": round(hours_worked, 2),
        "break_time_hours": round(break_time_hours, 2),
        "billable_hours": round(billable_hours, 2),
        "overtime_hours": compliance.overtime_hours,
        
        # Route details
        "route_type": route.get("route_type"),
        "route_name": route.get("route_name"),
        "stops_completed": len([s for s in route.get("stops", []) if s.get("status") == "completed"]),
        "total_stops": len(route.get("stops", [])),
        "distance_km": route.get("actual_distance_km", route.get("estimated_distance_km", 0)),
        
        # Compliance
        "breaks_taken": compliance.suggested_breaks,
        "compliance_warnings": compliance.warnings,
        "province": province,
        
        # Status
        "status": "completed" if route.get("status") == "completed" else "in_progress",
        "payroll_status": "pending",  # To be processed in payroll
        
        # Unified shift source
        "source_type": "route",  # Identifies this came from field service route
        "work_type": "route_based",
        
        # Metadata
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_from": "route_completion"
    }
    
    # Calculate platform fees
    from utils.fee_calculator import calculate_shift_fees
    hourly_rate = route.get("hourly_rate", 20.00)  # Default if not specified
    stops_completed = shift["stops_completed"]
    
    fee_calc = calculate_shift_fees(
        hourly_rate=hourly_rate,
        duration_hours=billable_hours,
        work_type="route_based",
        stops_completed=stops_completed
    )
    
    shift["fee_calculation"] = {
        "hourly_rate": hourly_rate,
        "hourly_fee": fee_calc["platform_revenue_per_hour"],
        "stop_fee_per_stop": fee_calc["stop_fee_per_stop"],
        "stop_fee_total": fee_calc["stop_fee_total"],
        "platform_fee_total": fee_calc["platform_revenue_total"],
        "employer_cost_total": fee_calc["employer_cost_total"]
    }
    
    return shift, compliance


# ============================================
# WEEKLY HOURS TRACKING
# ============================================

async def get_worker_hours_this_week(
    db,
    worker_id: str,
    week_start: datetime = None
) -> Dict:
    """
    Get worker's hours for the current week.
    
    Args:
        db: Database connection
        worker_id: Worker's ID
        week_start: Start of week (defaults to most recent Monday)
    
    Returns:
        Dict with hours breakdown
    """
    if week_start is None:
        today = datetime.now(timezone.utc)
        # Find most recent Monday
        days_since_monday = today.weekday()
        week_start = today - timedelta(days=days_since_monday)
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    week_end = week_start + timedelta(days=7)
    
    # Get ALL shifts (unified collection includes route-based via source_type)
    shifts = await db.shifts.find({
        "worker_id": worker_id,
        "shift_date": {
            "$gte": week_start.strftime("%Y-%m-%d"),
            "$lt": week_end.strftime("%Y-%m-%d")
        },
        "status": {"$in": ["completed", "approved"]}
    }).to_list(100)
    
    total_hours = 0
    regular_hours = 0
    overtime_hours = 0
    route_count = 0
    
    for shift in shifts:
        hours = shift.get("billable_hours", shift.get("hours_worked", 0))
        total_hours += hours
        if shift.get("source_type") == "route" or shift.get("work_type") == "route_based":
            route_count += 1
    
    standards = get_labor_standards("ON")  # Default to Ontario
    
    if total_hours > standards["overtime_threshold_week"]:
        regular_hours = standards["overtime_threshold_week"]
        overtime_hours = total_hours - standards["overtime_threshold_week"]
    else:
        regular_hours = total_hours
    
    return {
        "week_start": week_start.strftime("%Y-%m-%d"),
        "week_end": week_end.strftime("%Y-%m-%d"),
        "total_hours": round(total_hours, 2),
        "regular_hours": round(regular_hours, 2),
        "overtime_hours": round(overtime_hours, 2),
        "shifts_count": len(shifts),
        "routes_count": route_count,
        "max_hours_remaining": round(standards["max_hours_week"] - total_hours, 2),
        "overtime_threshold": standards["overtime_threshold_week"]
    }


# ============================================
# COMPLIANCE CHECK BEFORE ROUTE ASSIGNMENT
# ============================================

async def check_route_assignment_compliance(
    db,
    worker_id: str,
    estimated_duration_minutes: int,
    scheduled_date: str,
    province: str = "ON"
) -> RouteComplianceResult:
    """
    Check if assigning a route to a worker is compliant with labor standards.
    
    Should be called before assigning a route to prevent violations.
    """
    # Get worker's current weekly hours
    week_start = datetime.strptime(scheduled_date, "%Y-%m-%d")
    days_since_monday = week_start.weekday()
    week_start = week_start - timedelta(days=days_since_monday)
    
    weekly_hours = await get_worker_hours_this_week(
        db, 
        worker_id, 
        datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc)
    )
    
    # Check for overtime agreement
    worker = await db.users.find_one({"user_id": worker_id}, {"_id": 0})
    has_overtime_agreement = worker.get("overtime_agreement_signed", False) if worker else False
    
    # Validate the route duration
    result = validate_route_duration(
        estimated_duration_minutes,
        province,
        weekly_hours["total_hours"],
        has_overtime_agreement
    )
    
    # Add weekly context to warnings
    if weekly_hours["max_hours_remaining"] < (estimated_duration_minutes / 60):
        result.warnings.append(
            f"Worker has only {weekly_hours['max_hours_remaining']:.1f}h remaining this week "
            f"before reaching the {get_labor_standards(province)['max_hours_week']}h limit."
        )
    
    return result
