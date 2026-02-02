"""
Employer Billing API
Unified billing system showing work hours with weekly breakdowns by shift type.
Follows the unified fee model: $1/hour + $0.25/verified stop (route-based only)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from auth.dependencies import get_current_user, require_role
from database import get_database
from utils.occupation_categories import PLATFORM_FEE_PER_HOUR, PLATFORM_FEE_PER_STOP
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/employer/billing", tags=["Employer Billing"])


# ============================================
# BILLING SUMMARY
# ============================================

@router.get("/summary")
async def get_billing_summary(
    period: str = Query("current_month", description="current_month, last_month, current_week, custom"),
    start_date: Optional[str] = Query(None, description="Start date for custom period (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date for custom period (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role("employer"))
):
    """
    Get billing summary for employer showing:
    - Total work hours
    - Breakdown by shift type (on_site, continental, route_based)
    - Platform fees calculation
    """
    db = await get_database()
    employer_id = current_user["user_id"]
    
    # Determine date range
    now = datetime.now(timezone.utc)
    if period == "current_month":
        date_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            date_end = now.replace(year=now.year + 1, month=1, day=1) - timedelta(seconds=1)
        else:
            date_end = now.replace(month=now.month + 1, day=1) - timedelta(seconds=1)
    elif period == "last_month":
        first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        date_end = first_of_this_month - timedelta(seconds=1)
        date_start = date_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "current_week":
        days_since_monday = now.weekday()
        date_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date_start + timedelta(days=7) - timedelta(seconds=1)
    elif period == "custom" and start_date and end_date:
        date_start = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
        date_end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    else:
        raise HTTPException(status_code=400, detail="Invalid period or missing dates for custom period")
    
    # Query shifts
    shifts = await db.shifts.find({
        "employer_id": employer_id,
        "shift_date": {
            "$gte": date_start.strftime("%Y-%m-%d"),
            "$lte": date_end.strftime("%Y-%m-%d")
        },
        "status": {"$in": ["completed", "approved"]}
    }, {"_id": 0}).to_list(1000)
    
    # Calculate breakdown by shift type
    breakdown = {
        "on_site": {"hours": 0, "shifts": 0, "hourly_fees": 0},
        "continental": {"hours": 0, "shifts": 0, "hourly_fees": 0},
        "route_based": {"hours": 0, "shifts": 0, "hourly_fees": 0, "stops": 0, "stop_fees": 0}
    }
    
    total_hours = 0
    total_stops = 0
    total_hourly_fees = 0
    total_stop_fees = 0
    
    for shift in shifts:
        hours = shift.get("billable_hours", shift.get("hours_worked", 0))
        work_type = shift.get("work_type", shift.get("shift_type", "on_site"))
        
        # Normalize work_type
        if work_type not in breakdown:
            work_type = "on_site"
        
        breakdown[work_type]["hours"] += hours
        breakdown[work_type]["shifts"] += 1
        
        # Hourly fees (employer pays $1/hr regardless of wage level)
        hourly_fee = hours * PLATFORM_FEE_PER_HOUR
        breakdown[work_type]["hourly_fees"] += hourly_fee
        total_hourly_fees += hourly_fee
        total_hours += hours
        
        # Stop fees (route_based only)
        if work_type == "route_based":
            stops = shift.get("stops_completed", 0)
            stop_fee = stops * PLATFORM_FEE_PER_STOP
            breakdown["route_based"]["stops"] += stops
            breakdown["route_based"]["stop_fees"] += stop_fee
            total_stops += stops
            total_stop_fees += stop_fee
    
    # Round all values
    for wt in breakdown:
        breakdown[wt]["hours"] = round(breakdown[wt]["hours"], 2)
        breakdown[wt]["hourly_fees"] = round(breakdown[wt]["hourly_fees"], 2)
        if wt == "route_based":
            breakdown[wt]["stop_fees"] = round(breakdown[wt]["stop_fees"], 2)
    
    total_platform_fees = round(total_hourly_fees + total_stop_fees, 2)
    
    return {
        "success": True,
        "data": {
            "period": {
                "type": period,
                "start": date_start.strftime("%Y-%m-%d"),
                "end": date_end.strftime("%Y-%m-%d")
            },
            "summary": {
                "total_shifts": len(shifts),
                "total_hours": round(total_hours, 2),
                "total_stops": total_stops,
                "total_hourly_fees": round(total_hourly_fees, 2),
                "total_stop_fees": round(total_stop_fees, 2),
                "total_platform_fees": total_platform_fees
            },
            "breakdown_by_type": breakdown,
            "fee_structure": {
                "hourly_rate": PLATFORM_FEE_PER_HOUR,
                "per_stop_rate": PLATFORM_FEE_PER_STOP,
                "note": "Hourly fee applies to all shift types. Per-stop fee applies to route_based only."
            }
        }
    }


@router.get("/weekly-breakdown")
async def get_weekly_breakdown(
    weeks: int = Query(4, description="Number of weeks to include"),
    current_user: dict = Depends(require_role("employer"))
):
    """
    Get weekly breakdown of hours and fees for the last N weeks.
    Used for invoicing and trend analysis.
    """
    db = await get_database()
    employer_id = current_user["user_id"]
    
    now = datetime.now(timezone.utc)
    # Find most recent Monday
    days_since_monday = now.weekday()
    current_week_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    weekly_data = []
    
    for week_offset in range(weeks):
        week_start = current_week_start - timedelta(weeks=week_offset)
        week_end = week_start + timedelta(days=7) - timedelta(seconds=1)
        
        # Query shifts for this week
        shifts = await db.shifts.find({
            "employer_id": employer_id,
            "shift_date": {
                "$gte": week_start.strftime("%Y-%m-%d"),
                "$lt": (week_start + timedelta(days=7)).strftime("%Y-%m-%d")
            },
            "status": {"$in": ["completed", "approved"]}
        }, {"_id": 0}).to_list(500)
        
        week_hours = {"on_site": 0, "continental": 0, "route_based": 0}
        week_stops = 0
        week_shifts = {"on_site": 0, "continental": 0, "route_based": 0}
        
        for shift in shifts:
            hours = shift.get("billable_hours", shift.get("hours_worked", 0))
            work_type = shift.get("work_type", shift.get("shift_type", "on_site"))
            if work_type not in week_hours:
                work_type = "on_site"
            
            week_hours[work_type] += hours
            week_shifts[work_type] += 1
            
            if work_type == "route_based":
                week_stops += shift.get("stops_completed", 0)
        
        total_hours = sum(week_hours.values())
        hourly_fees = total_hours * PLATFORM_FEE_PER_HOUR
        stop_fees = week_stops * PLATFORM_FEE_PER_STOP
        
        weekly_data.append({
            "week_start": week_start.strftime("%Y-%m-%d"),
            "week_end": week_end.strftime("%Y-%m-%d"),
            "week_number": week_start.isocalendar()[1],
            "hours_by_type": {k: round(v, 2) for k, v in week_hours.items()},
            "shifts_by_type": week_shifts,
            "total_hours": round(total_hours, 2),
            "total_shifts": sum(week_shifts.values()),
            "route_stops": week_stops,
            "fees": {
                "hourly_fees": round(hourly_fees, 2),
                "stop_fees": round(stop_fees, 2),
                "total_fees": round(hourly_fees + stop_fees, 2)
            }
        })
    
    # Calculate totals
    grand_total_hours = sum(w["total_hours"] for w in weekly_data)
    grand_total_fees = sum(w["fees"]["total_fees"] for w in weekly_data)
    
    return {
        "success": True,
        "data": {
            "weeks": weekly_data,
            "totals": {
                "total_hours": round(grand_total_hours, 2),
                "total_fees": round(grand_total_fees, 2),
                "weeks_covered": weeks
            }
        }
    }


@router.get("/invoice-preview")
async def get_invoice_preview(
    period: str = Query("last_month", description="Period for invoice"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role("employer"))
):
    """
    Generate invoice preview with detailed breakdown.
    """
    db = await get_database()
    employer_id = current_user["user_id"]
    
    # Get employer profile
    employer_profile = await db.employer_profiles.find_one(
        {"employer_id": employer_id},
        {"_id": 0, "company_name": 1, "address": 1, "postal_code": 1}
    )
    
    # Get billing summary
    summary_response = await get_billing_summary(
        period=period,
        start_date=start_date,
        end_date=end_date,
        current_user=current_user
    )
    
    billing_data = summary_response["data"]
    
    # Build invoice line items
    line_items = []
    
    # On-site shifts
    if billing_data["breakdown_by_type"]["on_site"]["shifts"] > 0:
        on_site = billing_data["breakdown_by_type"]["on_site"]
        line_items.append({
            "description": f"On-Site Shifts ({on_site['shifts']} shifts, {on_site['hours']} hours)",
            "quantity": on_site["hours"],
            "unit_price": PLATFORM_FEE_PER_HOUR,
            "amount": on_site["hourly_fees"]
        })
    
    # Continental shifts
    if billing_data["breakdown_by_type"]["continental"]["shifts"] > 0:
        continental = billing_data["breakdown_by_type"]["continental"]
        line_items.append({
            "description": f"Continental Shifts ({continental['shifts']} shifts, {continental['hours']} hours)",
            "quantity": continental["hours"],
            "unit_price": PLATFORM_FEE_PER_HOUR,
            "amount": continental["hourly_fees"]
        })
    
    # Route-based shifts - hours
    if billing_data["breakdown_by_type"]["route_based"]["shifts"] > 0:
        route = billing_data["breakdown_by_type"]["route_based"]
        line_items.append({
            "description": f"Route-Based Shifts ({route['shifts']} routes, {route['hours']} hours)",
            "quantity": route["hours"],
            "unit_price": PLATFORM_FEE_PER_HOUR,
            "amount": route["hourly_fees"]
        })
        
        # Route-based shifts - stops
        if route["stops"] > 0:
            line_items.append({
                "description": f"Route Stop Verification ({route['stops']} verified stops)",
                "quantity": route["stops"],
                "unit_price": PLATFORM_FEE_PER_STOP,
                "amount": route["stop_fees"]
            })
    
    subtotal = billing_data["summary"]["total_platform_fees"]
    
    # Tax calculation (Canadian HST for Ontario)
    tax_rate = 0.13
    tax_amount = round(subtotal * tax_rate, 2)
    total = round(subtotal + tax_amount, 2)
    
    return {
        "success": True,
        "data": {
            "invoice_preview": {
                "employer": {
                    "employer_id": employer_id,
                    "company_name": employer_profile.get("company_name") if employer_profile else "Unknown",
                    "address": employer_profile.get("address") if employer_profile else "",
                    "postal_code": employer_profile.get("postal_code") if employer_profile else ""
                },
                "period": billing_data["period"],
                "line_items": line_items,
                "subtotal": subtotal,
                "tax_description": "HST (13%)",
                "tax_amount": tax_amount,
                "total": total,
                "currency": "CAD",
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    }


@router.get("/shifts")
async def get_shifts_for_billing(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    work_type: Optional[str] = Query(None, description="Filter by work_type"),
    worker_id: Optional[str] = Query(None, description="Filter by worker"),
    current_user: dict = Depends(require_role("employer"))
):
    """
    Get detailed shift records for billing period.
    """
    db = await get_database()
    employer_id = current_user["user_id"]
    
    query = {
        "employer_id": employer_id,
        "shift_date": {
            "$gte": start_date,
            "$lte": end_date
        },
        "status": {"$in": ["completed", "approved"]}
    }
    
    if work_type:
        query["$or"] = [
            {"work_type": work_type},
            {"shift_type": work_type}
        ]
    
    if worker_id:
        query["worker_id"] = worker_id
    
    shifts = await db.shifts.find(query, {"_id": 0}).sort("shift_date", -1).to_list(500)
    
    # Enrich with calculated fees
    for shift in shifts:
        hours = shift.get("billable_hours", shift.get("hours_worked", 0))
        wt = shift.get("work_type", shift.get("shift_type", "on_site"))
        stops = shift.get("stops_completed", 0) if wt == "route_based" else 0
        
        shift["calculated_fees"] = {
            "hourly_fee": round(hours * PLATFORM_FEE_PER_HOUR, 2),
            "stop_fee": round(stops * PLATFORM_FEE_PER_STOP, 2),
            "total_fee": round((hours * PLATFORM_FEE_PER_HOUR) + (stops * PLATFORM_FEE_PER_STOP), 2)
        }
    
    return {
        "success": True,
        "data": {
            "shifts": shifts,
            "count": len(shifts),
            "period": {
                "start": start_date,
                "end": end_date
            }
        }
    }
