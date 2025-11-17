from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import Dict, List
from datetime import datetime, timedelta, date
from auth.dependencies import get_current_user, require_role, get_db
from models.payroll import PayrollPeriod, PayrollEntry, PayrollExport, WorkerTD1
from services.payroll_calculations import calculate_payroll_for_period, validate_minimum_wage
import csv
import io
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payroll", tags=["payroll"])


# ==================== PAYROLL PERIOD MANAGEMENT ====================

@router.post("/periods/generate")
async def generate_payroll_period(
    data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Generate a new payroll period for the specified week
    Automatically includes all completed shifts for that week
    """
    start_date_str = data.get("start_date")
    
    if not start_date_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date is required (YYYY-MM-DD)"
        )
    
    try:
        start_date = datetime.fromisoformat(start_date_str).date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    # Calculate end date (start + 6 days = 7 day week)
    end_date = start_date + timedelta(days=6)
    
    # Get week number
    week_number = start_date.isocalendar()[1]
    year = start_date.year
    
    # Check if period already exists
    existing = await db.payroll_periods.find_one({
        "employer_id": current_user["user_id"],
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat()
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payroll period already exists for this week"
        )
    
    # Create new period
    period = PayrollPeriod(
        employer_id=current_user["user_id"],
        start_date=start_date,
        end_date=end_date,
        week_number=week_number,
        year=year
    )
    
    await db.payroll_periods.insert_one(period.model_dump())
    
    # Generate payroll entries for all workers who worked this week
    await generate_payroll_entries(db, period, current_user["user_id"])
    
    return {
        "success": True,
        "message": "Payroll period created",
        "data": {"period_id": period.period_id}
    }


async def generate_payroll_entries(db, period: PayrollPeriod, employer_id: str):
    """
    Generate payroll entries for all workers in the period
    Calculates hours, pay, deductions automatically
    """
    # TODO: Query shifts collection for completed shifts in this week
    # For now, this is a placeholder that would integrate with your shifts system
    
    # Example structure (you'll need to adapt based on your shifts schema):
    # shifts = await db.shifts.find({
    #     "employer_id": employer_id,
    #     "shift_date": {"$gte": period.start_date.isoformat(), "$lte": period.end_date.isoformat()},
    #     "status": "completed"
    # }).to_list(1000)
    
    # Group by worker and calculate totals
    # For each worker, create a PayrollEntry
    pass


@router.get("/periods")
async def get_payroll_periods(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all payroll periods for employer"""
    periods = await db.payroll_periods.find(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("start_date", -1).to_list(100)
    
    return {
        "success": True,
        "data": {"periods": periods}
    }


@router.get("/periods/{period_id}")
async def get_payroll_period_detail(
    period_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get detailed payroll period with all entries"""
    period = await db.payroll_periods.find_one({
        "period_id": period_id,
        "employer_id": current_user["user_id"]
    }, {"_id": 0})
    
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payroll period not found"
        )
    
    # Get all entries for this period
    entries = await db.payroll_entries.find(
        {"period_id": period_id},
        {"_id": 0}
    ).to_list(1000)
    
    return {
        "success": True,
        "data": {
            "period": period,
            "entries": entries,
            "entry_count": len(entries)
        }
    }


# ==================== PAYROLL ENTRY MANAGEMENT ====================

@router.post("/entries/calculate")
async def calculate_payroll_entry(
    data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Calculate payroll for a single worker
    Manual entry for testing or corrections
    """
    worker_id = data.get("worker_id")
    period_id = data.get("period_id")
    regular_hours = float(data.get("regular_hours", 0))
    overtime_hours = float(data.get("overtime_hours", 0))
    hourly_rate = float(data.get("hourly_rate", 16.55))
    
    # Validate minimum wage
    total_hours = regular_hours + overtime_hours
    wage_check = validate_minimum_wage(hourly_rate, total_hours)
    if not wage_check["is_valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hourly rate below minimum wage. Required: ${wage_check['required_minimum']} for {total_hours} hours"
        )
    
    # Get worker info
    worker = await db.users.find_one({"user_id": worker_id})
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    
    worker_profile = await db.workforce_profiles.find_one({"worker_id": worker_id})
    
    # Get worker TD1 forms
    td1 = await db.worker_td1.find_one({"worker_id": worker_id})
    federal_claim = td1.get("federal_total_claim") if td1 else None
    provincial_claim = td1.get("provincial_total_claim") if td1 else None
    
    # Calculate pay components
    regular_pay = regular_hours * hourly_rate
    overtime_pay = overtime_hours * hourly_rate * 1.5
    gross_before_vacation = regular_pay + overtime_pay
    vacation_pay = gross_before_vacation * 0.04
    gross_pay = gross_before_vacation + vacation_pay
    
    # Get YTD totals (simplified - in production, sum all previous entries)
    gross_pay_ytd = 0  # TODO: Calculate from previous entries
    weeks_worked_ytd = 1  # TODO: Calculate from previous entries
    
    # Calculate deductions
    deduction_options = data.get("deductions", {})
    payroll_calc = calculate_payroll_for_period(
        gross_pay=gross_pay,
        gross_pay_ytd=gross_pay_ytd,
        weeks_worked_ytd=weeks_worked_ytd,
        federal_td1=federal_claim,
        provincial_td1=provincial_claim,
        include_cpp=deduction_options.get("include_cpp", True),
        include_ei=deduction_options.get("include_ei", True),
        include_federal_tax=deduction_options.get("include_federal_tax", True),
        include_provincial_tax=deduction_options.get("include_provincial_tax", True)
    )
    
    # Create entry
    entry = PayrollEntry(
        period_id=period_id,
        employer_id=current_user["user_id"],
        worker_id=worker_id,
        worker_name=worker.get("full_name", ""),
        worker_sin=worker_profile.get("sin") if worker_profile else None,
        worker_email=worker.get("email", ""),
        worker_phone=worker.get("phone", ""),
        regular_hours=regular_hours,
        overtime_hours=overtime_hours,
        total_hours=total_hours,
        hourly_rate=hourly_rate,
        regular_pay=regular_pay,
        overtime_pay=overtime_pay,
        vacation_pay=vacation_pay,
        gross_pay=gross_pay,
        gross_pay_ytd=gross_pay_ytd,
        weeks_worked_ytd=weeks_worked_ytd,
        employee_cpp=payroll_calc["employee_cpp"],
        employee_ei=payroll_calc["employee_ei"],
        federal_tax=payroll_calc["federal_tax"],
        provincial_tax=payroll_calc["provincial_tax"],
        total_deductions=payroll_calc["total_deductions"],
        net_pay=payroll_calc["net_pay"],
        employer_cpp=payroll_calc["employer_cpp"],
        employer_ei=payroll_calc["employer_ei"],
        employer_total_cost=gross_pay + payroll_calc["employer_total"],
        federal_td1_claim=federal_claim,
        provincial_td1_claim=provincial_claim,
        calculate_cpp=deduction_options.get("include_cpp", True),
        calculate_ei=deduction_options.get("include_ei", True),
        calculate_federal_tax=deduction_options.get("include_federal_tax", True),
        calculate_provincial_tax=deduction_options.get("include_provincial_tax", True)
    )
    
    # Save entry
    await db.payroll_entries.insert_one(entry.model_dump())
    
    return {
        "success": True,
        "message": "Payroll entry calculated and saved",
        "data": entry.model_dump()
    }


# ==================== PAYROLL EXPORT ====================

@router.get("/periods/{period_id}/export/csv")
async def export_payroll_csv(
    period_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Export payroll period to CSV format
    Compatible with most payroll providers
    """
    # Get period
    period = await db.payroll_periods.find_one({
        "period_id": period_id,
        "employer_id": current_user["user_id"]
    })
    
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Period not found")
    
    # Get entries
    entries = await db.payroll_entries.find({"period_id": period_id}, {"_id": 0}).to_list(1000)
    
    if not entries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No payroll entries found for this period"
        )
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow([
        "Worker Name",
        "SIN",
        "Email",
        "Phone",
        "Regular Hours",
        "Overtime Hours",
        "Total Hours",
        "Hourly Rate",
        "Regular Pay",
        "Overtime Pay",
        "Vacation Pay (4%)",
        "Gross Pay",
        "CPP Deduction",
        "EI Deduction",
        "Federal Tax",
        "Provincial Tax",
        "Total Deductions",
        "Net Pay",
        "Employer CPP",
        "Employer EI",
        "Total Employer Cost"
    ])
    
    # Data rows
    for entry in entries:
        writer.writerow([
            entry.get("worker_name", ""),
            entry.get("worker_sin", "***-***-***"),
            entry.get("worker_email", ""),
            entry.get("worker_phone", ""),
            f"{entry.get('regular_hours', 0):.2f}",
            f"{entry.get('overtime_hours', 0):.2f}",
            f"{entry.get('total_hours', 0):.2f}",
            f"${entry.get('hourly_rate', 0):.2f}",
            f"${entry.get('regular_pay', 0):.2f}",
            f"${entry.get('overtime_pay', 0):.2f}",
            f"${entry.get('vacation_pay', 0):.2f}",
            f"${entry.get('gross_pay', 0):.2f}",
            f"${entry.get('employee_cpp', 0):.2f}",
            f"${entry.get('employee_ei', 0):.2f}",
            f"${entry.get('federal_tax', 0):.2f}",
            f"${entry.get('provincial_tax', 0):.2f}",
            f"${entry.get('total_deductions', 0):.2f}",
            f"${entry.get('net_pay', 0):.2f}",
            f"${entry.get('employer_cpp', 0):.2f}",
            f"${entry.get('employer_ei', 0):.2f}",
            f"${entry.get('employer_total_cost', 0):.2f}"
        ])
    
    # Record export
    export_record = PayrollExport(
        employer_id=current_user["user_id"],
        period_id=period_id,
        export_format="csv",
        file_name=f"payroll_{period_id}.csv",
        total_entries=len(entries),
        total_gross_pay=sum(e.get("gross_pay", 0) for e in entries),
        total_net_pay=sum(e.get("net_pay", 0) for e in entries),
        total_deductions=sum(e.get("total_deductions", 0) for e in entries),
        exported_by=current_user["user_id"]
    )
    await db.payroll_exports.insert_one(export_record.model_dump())
    
    # Return CSV file
    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=payroll_{period['start_date']}_to_{period['end_date']}.csv"
        }
    )


# ==================== WORKER TD1 FORMS ====================

@router.get("/worker/td1")
async def get_worker_td1(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get worker's current TD1 form"""
    td1 = await db.worker_td1.find_one(
        {"worker_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not td1:
        # Return default TD1
        td1 = WorkerTD1(worker_id=current_user["user_id"]).model_dump()
    
    return {
        "success": True,
        "data": td1
    }


@router.post("/worker/td1")
async def update_worker_td1(
    data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Update worker's TD1 tax form"""
    federal_additional = float(data.get("federal_additional_claims", 0))
    provincial_additional = float(data.get("provincial_additional_claims", 0))
    additional_tax = float(data.get("additional_tax_per_pay", 0))
    
    td1 = WorkerTD1(
        worker_id=current_user["user_id"],
        federal_additional_claims=federal_additional,
        federal_total_claim=15705.00 + federal_additional,
        provincial_additional_claims=provincial_additional,
        provincial_total_claim=11865.00 + provincial_additional,
        additional_tax_per_pay=additional_tax
    )
    
    await db.worker_td1.update_one(
        {"worker_id": current_user["user_id"]},
        {"$set": td1.model_dump()},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "TD1 form updated successfully"
    }


# ==================== PAYROLL DASHBOARD STATS ====================

@router.get("/dashboard/stats")
async def get_payroll_dashboard_stats(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get payroll dashboard statistics"""
    # Get all periods
    periods = await db.payroll_periods.find(
        {"employer_id": current_user["user_id"]}
    ).to_list(1000)
    
    # Calculate totals
    total_gross_ytd = sum(p.get("total_gross_pay", 0) for p in periods)
    total_periods = len(periods)
    
    # Get recent periods
    recent_periods = sorted(periods, key=lambda x: x.get("start_date", ""), reverse=True)[:5]
    
    return {
        "success": True,
        "data": {
            "total_periods": total_periods,
            "total_gross_ytd": round(total_gross_ytd, 2),
            "recent_periods": recent_periods
        }
    }
