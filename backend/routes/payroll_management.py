"""
Payroll Management Routes - Approved Timesheets Workflow
Handles the lifecycle: Timesheets → Payroll Tab → Processing
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, List, Optional
from datetime import datetime
from auth.dependencies import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api/employer/payroll-management", tags=["Payroll Management"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

class PayrollBatchCreate(BaseModel):
    """Request model for creating payroll batch"""
    timesheet_ids: List[str]
    batch_name: Optional[str] = None
    notes: Optional[str] = None

class TimesheetEdit(BaseModel):
    """Request model for editing timesheet hours"""
    adjusted_hours: float
    adjustment_reason: str

@router.get("/approved-timesheets", response_model=Dict)
async def get_approved_timesheets_for_payroll(
    start_date: str = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all approved timesheets ready for payroll processing
    These appear in the Payroll tab
    """
    
    query = {
        "employer_id": current_user['user_id'],
        "status": "approved"
    }
    
    if start_date and end_date:
        query["shift_date"] = {"$gte": start_date, "$lte": end_date}
    
    timesheets = await db.timesheets.find(
        query,
        {"_id": 0}
    ).sort("shift_date", -1).to_list(1000)
    
    # Enrich with worker and workplace details
    for timesheet in timesheets:
        # Worker details
        worker = await db.users.find_one(
            {"user_id": timesheet['workforce_id']},
            {"_id": 0, "first_name": 1, "last_name": 1, "email": 1}
        )
        
        if worker:
            timesheet['worker_details'] = {
                'name': f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip(),
                'email': worker.get('email')
            }
        
        # Position from booking
        if not timesheet.get('position'):
            shift = await db.bookings.find_one(
                {"shift_id": timesheet.get('shift_id')},
                {"_id": 0, "position": 1}
            )
            if shift:
                timesheet['position'] = shift.get('position')
        
        # Workplace details
        if timesheet.get('workplace_id') and not timesheet.get('workplace_name'):
            workplace = await db.workplaces.find_one(
                {"workplace_id": timesheet['workplace_id']},
                {"_id": 0, "name": 1}
            )
            if workplace:
                timesheet['workplace_name'] = workplace.get('name')
    
    # Calculate totals
    total_hours = sum([ts.get('adjusted_hours', ts.get('actual_hours', 0)) for ts in timesheets])
    total_pay = sum([ts.get('adjusted_pay', ts.get('actual_pay', 0)) for ts in timesheets])
    
    return {
        "success": True,
        "data": {
            "timesheets": timesheets,
            "total_ready": len(timesheets),
            "total_hours": round(total_hours, 2),
            "total_pay": round(total_pay, 2)
        }
    }

@router.post("/{timesheet_id}/move-back-to-pending", response_model=Dict)
async def move_timesheet_back_for_edit(
    timesheet_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Move an approved timesheet back to Timesheets tab for editing
    Status changes: approved → pending_approval
    """
    
    timesheet = await db.timesheets.find_one({
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
    await db.timesheets.update_one(
        {"timesheet_id": timesheet_id},
        {"$set": {
            "status": "pending_approval",
            "returned_for_edit": True,
            "returned_at": datetime.utcnow().isoformat(),
            "returned_by": current_user['user_id']
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

@router.put("/{timesheet_id}/adjust-hours", response_model=Dict)
async def adjust_timesheet_hours(
    timesheet_id: str,
    edit_data: TimesheetEdit,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Adjust hours for a timesheet in pending status
    Used when employer needs to correct hours before re-approval
    """
    
    timesheet = await db.timesheets.find_one({
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
            detail="Can only adjust timesheets in pending status"
        )
    
    # Calculate new pay
    new_pay = round(edit_data.adjusted_hours * timesheet['hourly_rate'], 2)
    
    # Update timesheet
    await db.timesheets.update_one(
        {"timesheet_id": timesheet_id},
        {"$set": {
            "adjusted_hours": edit_data.adjusted_hours,
            "adjusted_pay": new_pay,
            "adjustment_reason": edit_data.adjustment_reason,
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
            "original_hours": timesheet.get('actual_hours'),
            "adjusted_hours": edit_data.adjusted_hours,
            "original_pay": timesheet.get('actual_pay'),
            "adjusted_pay": new_pay
        }
    }

@router.post("/process-batch", response_model=Dict)
async def process_payroll_batch(
    batch_data: PayrollBatchCreate,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Process a batch of approved timesheets for payroll
    Bundles worker SIN, employer info, and timesheet data for payment processor
    """
    
    if not batch_data.timesheet_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No timesheets selected"
        )
    
    # Get timesheets
    timesheets = await db.timesheets.find({
        "timesheet_id": {"$in": batch_data.timesheet_ids},
        "employer_id": current_user['user_id'],
        "status": "approved"
    }, {"_id": 0}).to_list(1000)
    
    if len(timesheets) != len(batch_data.timesheet_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some timesheets not found or not approved"
        )
    
    # Get employer profile
    employer_profile = await db.employer_profiles.find_one(
        {"employer_id": current_user['user_id']},
        {"_id": 0, "company_name": 1, "address": 1, "city": 1, "province": 1, 
         "postal_code": 1, "payroll_account_number": 1}
    )
    
    if not employer_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employer profile not found"
        )
    
    if not employer_profile.get('payroll_account_number'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payroll account number not configured. Please update your profile in settings."
        )
    
    # Build payroll items with worker data
    payroll_items = []
    total_amount = 0
    workers_missing_sin = []
    
    for ts in timesheets:
        # Get workforce profile with SIN
        workforce_profile = await db.workforce_profiles.find_one(
            {"workforce_id": ts['workforce_id']},
            {"_id": 0, "sin_encrypted": 1, "first_name": 1, "last_name": 1, 
             "email": 1, "address": 1, "city": 1, "province": 1, "postal_code": 1}
        )
        
        if not workforce_profile:
            continue
        
        if not workforce_profile.get('sin_encrypted'):
            workers_missing_sin.append({
                "workforce_id": ts['workforce_id'],
                "name": f"{workforce_profile.get('first_name', '')} {workforce_profile.get('last_name', '')}".strip()
            })
            continue
        
        hours = ts.get('adjusted_hours') or ts.get('actual_hours')
        pay = ts.get('adjusted_pay') or ts.get('actual_pay')
        
        payroll_item = {
            "timesheet_id": ts['timesheet_id'],
            "workforce_id": ts['workforce_id'],
            "worker_sin_encrypted": workforce_profile['sin_encrypted'],
            "worker_name": f"{workforce_profile.get('first_name', '')} {workforce_profile.get('last_name', '')}".strip(),
            "worker_email": workforce_profile.get('email'),
            "worker_address": {
                "address": workforce_profile.get('address'),
                "city": workforce_profile.get('city'),
                "province": workforce_profile.get('province'),
                "postal_code": workforce_profile.get('postal_code')
            },
            "shift_date": ts['shift_date'],
            "hours_worked": hours,
            "hourly_rate": ts['hourly_rate'],
            "gross_pay": pay,
            "position": ts.get('position'),
            "workplace_name": ts.get('workplace_name')
        }
        
        payroll_items.append(payroll_item)
        total_amount += pay
    
    if not payroll_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid workers with SIN found in selected timesheets"
        )
    
    # Create batch ID
    batch_id = f"batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{current_user['user_id'][:8]}"
    
    # Create batch document
    batch = {
        "batch_id": batch_id,
        "employer_id": current_user['user_id'],
        "employer_info": {
            "company_name": employer_profile.get('company_name'),
            "payroll_account_number": employer_profile.get('payroll_account_number'),
            "address": employer_profile.get('address'),
            "city": employer_profile.get('city'),
            "province": employer_profile.get('province'),
            "postal_code": employer_profile.get('postal_code')
        },
        "timesheet_ids": batch_data.timesheet_ids,
        "payroll_items": payroll_items,
        "batch_name": batch_data.batch_name or f"Payroll {datetime.utcnow().strftime('%Y-%m-%d')}",
        "total_workers": len(payroll_items),
        "total_amount": round(total_amount, 2),
        "status": "ready_to_process",
        "notes": batch_data.notes,
        "workers_missing_sin": workers_missing_sin,
        "created_at": datetime.utcnow().isoformat(),
        "created_by": current_user['user_id']
    }
    
    # Save batch
    await db.payroll_batches.insert_one(batch)
    
    # Update timesheets to 'processed' status
    await db.timesheets.update_many(
        {"timesheet_id": {"$in": batch_data.timesheet_ids}},
        {"$set": {
            "payroll_batch_id": batch_id,
            "status": "processed",
            "processed_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    
    # TODO: Send batch to Rippling/ADP API
    # This would decrypt SINs and submit to payment processor
    
    return {
        "success": True,
        "data": {
            "batch_id": batch_id,
            "total_workers": len(payroll_items),
            "total_amount": round(total_amount, 2),
            "workers_missing_sin": len(workers_missing_sin),
            "missing_sin_details": workers_missing_sin
        },
        "message": f"Payroll batch created successfully with {len(payroll_items)} workers. Ready for processing to payment processor."
    }
