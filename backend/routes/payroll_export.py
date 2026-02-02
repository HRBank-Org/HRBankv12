"""
Payroll Export API
Export timesheets and shifts to various payroll system formats:
- Generic CSV/JSON
- Gusto
- Ceridian Dayforce
- ADP Workforce Now
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from auth.dependencies import get_current_user, require_role
from database import get_database
from services.payroll_export import (
    PayrollEntry,
    get_available_formats,
    export_payroll,
    PAYROLL_ADAPTERS
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payroll-export", tags=["Payroll Export"])


@router.get("/formats")
async def list_export_formats():
    """Get list of available payroll export formats"""
    formats = get_available_formats()
    
    return {
        "success": True,
        "data": {
            "formats": formats,
            "categories": {
                "universal": ["generic_csv", "generic_json"],
                "us_canada": ["gusto", "adp", "adp_csv"],
                "canada_preferred": ["dayforce", "dayforce_csv"]
            },
            "recommendations": {
                "small_business_us": "gusto",
                "small_business_canada": "dayforce_csv",
                "mid_market": "adp_csv",
                "api_integration": "generic_json"
            }
        }
    }


@router.get("/preview")
async def preview_export(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    format_id: str = Query("generic_json", description="Export format"),
    limit: int = Query(10, description="Number of entries to preview"),
    current_user: dict = Depends(require_role("employer"))
):
    """Preview payroll export data before downloading"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    # Get entries
    entries = await _get_payroll_entries(db, employer_id, start_date, end_date, limit)
    
    if not entries:
        return {
            "success": True,
            "data": {
                "preview": [],
                "count": 0,
                "message": "No timesheet entries found for this period"
            }
        }
    
    # Get adapter info
    adapter = PAYROLL_ADAPTERS.get(format_id)
    if not adapter:
        raise HTTPException(status_code=400, detail=f"Unknown format: {format_id}")
    
    return {
        "success": True,
        "data": {
            "preview": [_entry_to_dict(e) for e in entries[:limit]],
            "total_entries": len(entries),
            "format": {
                "id": format_id,
                "provider": adapter.provider_name,
                "extension": adapter.file_extension
            },
            "period": {
                "start": start_date,
                "end": end_date
            }
        }
    }


@router.get("/download")
async def download_export(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    format_id: str = Query("generic_csv", description="Export format"),
    current_user: dict = Depends(require_role("employer"))
):
    """Download payroll export file"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    # Get all entries for period
    entries = await _get_payroll_entries(db, employer_id, start_date, end_date)
    
    if not entries:
        raise HTTPException(
            status_code=404,
            detail="No timesheet entries found for this period"
        )
    
    try:
        content, filename, content_type = export_payroll(entries, format_id)
        
        # Log export
        await db.payroll_exports.insert_one({
            "employer_id": employer_id,
            "format": format_id,
            "period_start": start_date,
            "period_end": end_date,
            "entry_count": len(entries),
            "filename": filename,
            "exported_at": datetime.now(timezone.utc).isoformat()
        })
        
        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history")
async def get_export_history(
    limit: int = Query(20, description="Number of records"),
    current_user: dict = Depends(require_role("employer"))
):
    """Get history of payroll exports"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    exports = await db.payroll_exports.find(
        {"employer_id": employer_id},
        {"_id": 0}
    ).sort("exported_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "data": {
            "exports": exports,
            "count": len(exports)
        }
    }


@router.get("/summary")
async def get_export_summary(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role("employer"))
):
    """Get summary of data to be exported"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    entries = await _get_payroll_entries(db, employer_id, start_date, end_date)
    
    if not entries:
        return {
            "success": True,
            "data": {
                "summary": {
                    "total_entries": 0,
                    "total_employees": 0,
                    "total_hours": 0,
                    "total_regular_hours": 0,
                    "total_overtime_hours": 0,
                    "total_gross_pay": 0
                },
                "by_work_type": {},
                "by_employee": []
            }
        }
    
    # Calculate summary
    employees = {}
    by_work_type = {"on_site": 0, "continental": 0, "route_based": 0}
    total_regular = 0
    total_overtime = 0
    total_gross = 0
    
    for entry in entries:
        # By employee
        if entry.employee_id not in employees:
            employees[entry.employee_id] = {
                "employee_id": entry.employee_id,
                "employee_name": entry.employee_name,
                "total_hours": 0,
                "total_pay": 0,
                "shifts": 0
            }
        employees[entry.employee_id]["total_hours"] += entry.total_hours
        employees[entry.employee_id]["total_pay"] += entry.gross_pay
        employees[entry.employee_id]["shifts"] += 1
        
        # By work type
        if entry.work_type in by_work_type:
            by_work_type[entry.work_type] += entry.total_hours
        
        total_regular += entry.regular_hours
        total_overtime += entry.overtime_hours
        total_gross += entry.gross_pay
    
    return {
        "success": True,
        "data": {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "summary": {
                "total_entries": len(entries),
                "total_employees": len(employees),
                "total_hours": round(total_regular + total_overtime, 2),
                "total_regular_hours": round(total_regular, 2),
                "total_overtime_hours": round(total_overtime, 2),
                "total_gross_pay": round(total_gross, 2)
            },
            "by_work_type": {k: round(v, 2) for k, v in by_work_type.items()},
            "by_employee": sorted(
                employees.values(), 
                key=lambda x: x["total_hours"], 
                reverse=True
            )
        }
    }


async def _get_payroll_entries(
    db,
    employer_id: str,
    start_date: str,
    end_date: str,
    limit: Optional[int] = None
) -> List[PayrollEntry]:
    """Fetch and transform shifts to payroll entries"""
    
    query = {
        "employer_id": employer_id,
        "shift_date": {
            "$gte": start_date,
            "$lte": end_date
        },
        "status": {"$in": ["completed", "approved"]}
    }
    
    cursor = db.shifts.find(query, {"_id": 0}).sort("shift_date", 1)
    if limit:
        cursor = cursor.limit(limit)
    
    shifts = await cursor.to_list(1000 if not limit else limit)
    
    # Get worker details
    worker_ids = list(set(s.get("worker_id") for s in shifts if s.get("worker_id")))
    workers = {}
    if worker_ids:
        worker_docs = await db.users.find(
            {"user_id": {"$in": worker_ids}},
            {"_id": 0, "user_id": 1, "email": 1, "first_name": 1, "last_name": 1}
        ).to_list(len(worker_ids))
        workers = {w["user_id"]: w for w in worker_docs}
    
    # Get workplace details
    workplace_ids = list(set(s.get("workplace_id") for s in shifts if s.get("workplace_id")))
    workplaces = {}
    if workplace_ids:
        workplace_docs = await db.workplaces.find(
            {"workplace_id": {"$in": workplace_ids}},
            {"_id": 0, "workplace_id": 1, "workplace_name": 1, "province": 1}
        ).to_list(len(workplace_ids))
        workplaces = {w["workplace_id"]: w for w in workplace_docs}
    
    # Transform to payroll entries
    entries = []
    for shift in shifts:
        worker = workers.get(shift.get("worker_id"), {})
        workplace = workplaces.get(shift.get("workplace_id"), {})
        
        # Calculate hours
        regular_hours = shift.get("billable_hours", shift.get("hours_worked", 0))
        overtime_hours = shift.get("overtime_hours", 0)
        if overtime_hours > 0:
            regular_hours = regular_hours - overtime_hours
        
        total_hours = regular_hours + overtime_hours
        
        # Get hourly rate
        hourly_rate = shift.get("hourly_rate", 0)
        if not hourly_rate:
            # Try to get from fee calculation
            fee_calc = shift.get("fee_calculation", {})
            hourly_rate = fee_calc.get("hourly_rate", 17.60)  # Default to min wage
        
        # Calculate pay
        regular_pay = regular_hours * hourly_rate
        overtime_pay = overtime_hours * hourly_rate * 1.5  # OT at 1.5x
        gross_pay = regular_pay + overtime_pay
        
        # Determine work type
        work_type = shift.get("work_type", shift.get("shift_type", "on_site"))
        if shift.get("source_type") == "route":
            work_type = "route_based"
        
        entry = PayrollEntry(
            employee_id=shift.get("worker_id", ""),
            employee_name=shift.get("worker_name", f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip()),
            employee_email=worker.get("email", ""),
            pay_period_start=start_date,
            pay_period_end=end_date,
            work_date=shift.get("shift_date", ""),
            regular_hours=round(regular_hours, 2),
            overtime_hours=round(overtime_hours, 2),
            total_hours=round(total_hours, 2),
            hourly_rate=round(hourly_rate, 2),
            regular_pay=round(regular_pay, 2),
            overtime_pay=round(overtime_pay, 2),
            gross_pay=round(gross_pay, 2),
            work_type=work_type,
            department=shift.get("department", "General"),
            job_title=shift.get("role_title", shift.get("job_title", "Worker")),
            stops_completed=shift.get("stops_completed", 0),
            route_name=shift.get("route_name", ""),
            shift_id=shift.get("shift_id", ""),
            workplace_name=workplace.get("workplace_name", shift.get("workplace_name", "")),
            province=workplace.get("province", shift.get("province", "ON"))
        )
        entries.append(entry)
    
    return entries


def _entry_to_dict(entry: PayrollEntry) -> dict:
    """Convert PayrollEntry to dict for JSON response"""
    return {
        "employee_id": entry.employee_id,
        "employee_name": entry.employee_name,
        "work_date": entry.work_date,
        "total_hours": entry.total_hours,
        "regular_hours": entry.regular_hours,
        "overtime_hours": entry.overtime_hours,
        "hourly_rate": entry.hourly_rate,
        "gross_pay": entry.gross_pay,
        "work_type": entry.work_type,
        "workplace": entry.workplace_name
    }
