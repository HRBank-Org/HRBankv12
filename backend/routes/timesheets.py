from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone
from auth.dependencies import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api/employer/timesheets", tags=["Timesheets"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

class TimesheetApproval(BaseModel):
    """Request model for approving/rejecting timesheet"""
    approved: bool
    rejection_reason: Optional[str] = None
    employer_notes: Optional[str] = None
    adjusted_hours: Optional[float] = None

@router.get("/pending", response_model=Dict)
async def get_pending_timesheets(
    date: str = Query(None, description="Filter by date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all timesheets pending approval
    Optionally filter by date
    """
    
    query = {
        "employer_id": current_user['user_id'],
        "status": "pending_approval"
    }
    
    if date:
        query["shift_date"] = date
    
    timesheets = await db.timesheets.find(
        query,
        {"_id": 0}
    ).sort("shift_date", -1).to_list(1000)
    
    # Enrich with worker details
    for timesheet in timesheets:
        worker = await db.users.find_one(
            {"user_id": timesheet['workforce_id']},
            {"_id": 0, "first_name": 1, "last_name": 1, "email": 1}
        )
        
        if worker:
            timesheet['worker_details'] = {
                'name': f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip(),
                'email': worker.get('email')
            }
        
        # Get occupation from occupation_profiles first, fallback to booking position
        occupation = await db.occupation_profiles.find_one(
            {"user_id": timesheet['workforce_id'], "active": True},
            {"_id": 0, "occupation_title": 1}
        )
        
        if occupation:
            timesheet['position'] = occupation.get('occupation_title')
        elif not timesheet.get('position'):
            # Try to get from the shift/booking
            shift = await db.bookings.find_one(
                {"shift_id": timesheet.get('shift_id')},
                {"_id": 0, "position": 1}
            )
            if shift:
                timesheet['position'] = shift.get('position')
        
        # Get workplace details
        if timesheet.get('workplace_id') and not timesheet.get('workplace_name'):
            workplace = await db.workplaces.find_one(
                {"workplace_id": timesheet['workplace_id']},
                {"_id": 0, "name": 1}
            )
            if workplace:
                timesheet['workplace_name'] = workplace.get('name')
    
    # Calculate totals
    total_hours = sum([ts.get('actual_hours', 0) for ts in timesheets])
    total_pay = sum([ts.get('actual_pay', 0) for ts in timesheets])
    
    return {
        "success": True,
        "data": {
            "timesheets": timesheets,
            "total_pending": len(timesheets),
            "total_hours": round(total_hours, 2),
            "total_pay": round(total_pay, 2)
        }
    }

@router.get("/approved", response_model=Dict)
async def get_approved_timesheets(
    start_date: str = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all approved timesheets
    Filter by date range
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
    
    # Calculate totals
    total_hours = sum([ts.get('actual_hours', 0) for ts in timesheets])
    total_pay = sum([ts.get('actual_pay', 0) for ts in timesheets])
    
    return {
        "success": True,
        "data": {
            "timesheets": timesheets,
            "total_approved": len(timesheets),
            "total_hours": round(total_hours, 2),
            "total_pay": round(total_pay, 2)
        }
    }

@router.get("/{timesheet_id}", response_model=Dict)
async def get_timesheet_details(
    timesheet_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get detailed information about a specific timesheet
    """
    
    timesheet = await db.timesheets.find_one({
        "timesheet_id": timesheet_id,
        "employer_id": current_user['user_id']
    }, {"_id": 0})
    
    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )
    
    # Get worker details
    worker = await db.users.find_one(
        {"user_id": timesheet['workforce_id']},
        {"_id": 0, "first_name": 1, "last_name": 1, "email": 1}
    )
    
    if worker:
        timesheet['worker_details'] = {
            'name': f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip(),
            'email': worker.get('email')
        }
    
    # Get workplace details
    if timesheet.get('workplace_id'):
        workplace = await db.workplaces.find_one(
            {"workplace_id": timesheet['workplace_id']},
            {"_id": 0, "workplace_name": 1, "address": 1}
        )
        
        if workplace:
            timesheet['workplace_details'] = workplace
    
    return {
        "success": True,
        "data": timesheet
    }

@router.post("/{timesheet_id}/approve", response_model=Dict)
async def approve_timesheet(
    timesheet_id: str,
    approval_data: TimesheetApproval,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Approve or reject a timesheet
    """
    
    # Get timesheet
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
            detail=f"Timesheet is already {timesheet['status']}"
        )
    
    # Prepare update
    update_data = {
        "approved_by": current_user['user_id'],
        "approved_date": datetime.now(timezone.utc).isoformat(),
        "updated_date": datetime.now(timezone.utc).isoformat()
    }
    
    if approval_data.approved:
        update_data["status"] = "approved"
        
        # If hours adjusted
        if approval_data.adjusted_hours is not None:
            update_data["adjusted_hours"] = approval_data.adjusted_hours
            update_data["adjusted_pay"] = round(
                approval_data.adjusted_hours * timesheet['hourly_rate'], 
                2
            )
            update_data["adjustment_reason"] = approval_data.employer_notes
        
        if approval_data.employer_notes:
            update_data["employer_notes"] = approval_data.employer_notes
        
        message = "Timesheet approved successfully"
    else:
        update_data["status"] = "rejected"
        update_data["rejection_reason"] = approval_data.rejection_reason or "Not approved"
        message = "Timesheet rejected"
    
    # Update timesheet
    await db.timesheets.update_one(
        {"timesheet_id": timesheet_id},
        {"$set": update_data}
    )
    
    # Send notification to worker
    notification = {
        "notification_id": f"notif_{timesheet_id}",
        "user_id": timesheet['workforce_id'],
        "notification_type": "timesheet_approved" if approval_data.approved else "timesheet_rejected",
        "title": "Timesheet " + ("Approved" if approval_data.approved else "Rejected"),
        "message": (
            f"Your timesheet for {timesheet['shift_date']} has been approved. Payment processing will begin."
            if approval_data.approved else
            f"Your timesheet for {timesheet['shift_date']} was rejected. Reason: {approval_data.rejection_reason}"
        ),
        "priority": "medium",
        "status": "pending",
        "created_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    
    return {
        "success": True,
        "message": message,
        "data": {
            "timesheet_id": timesheet_id,
            "status": update_data["status"]
        }
    }

@router.post("/bulk-approve", response_model=Dict)
async def bulk_approve_timesheets(
    timesheet_ids: List[str],
    approval_data: TimesheetApproval,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Approve multiple timesheets at once
    """
    
    approved_count = 0
    failed = []
    
    for timesheet_id in timesheet_ids:
        try:
            timesheet = await db.timesheets.find_one({
                "timesheet_id": timesheet_id,
                "employer_id": current_user['user_id'],
                "status": "pending_approval"
            })
            
            if not timesheet:
                failed.append({
                    "timesheet_id": timesheet_id,
                    "reason": "Not found or already processed"
                })
                continue
            
            # Update
            update_data = {
                "status": "approved" if approval_data.approved else "rejected",
                "approved_by": current_user['user_id'],
                "approved_date": datetime.now(timezone.utc).isoformat(),
                "updated_date": datetime.now(timezone.utc).isoformat()
            }
            
            if not approval_data.approved:
                update_data["rejection_reason"] = approval_data.rejection_reason
            
            await db.timesheets.update_one(
                {"timesheet_id": timesheet_id},
                {"$set": update_data}
            )
            
            approved_count += 1
            
        except Exception as e:
            failed.append({
                "timesheet_id": timesheet_id,
                "reason": str(e)
            })
    
    return {
        "success": True,
        "data": {
            "approved_count": approved_count,
            "failed_count": len(failed),
            "failed": failed
        },
        "message": f"Processed {approved_count} timesheets"
    }

@router.get("/summary/period", response_model=Dict)
async def get_timesheet_summary(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get timesheet summary for a period
    Used for payroll preparation
    """
    
    # Get all approved timesheets in period
    timesheets = await db.timesheets.find({
        "employer_id": current_user['user_id'],
        "status": "approved",
        "shift_date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    # Group by worker
    worker_summaries = {}
    
    for ts in timesheets:
        workforce_id = ts['workforce_id']
        
        if workforce_id not in worker_summaries:
            worker_summaries[workforce_id] = {
                'workforce_id': workforce_id,
                'worker_name': ts.get('worker_name'),
                'total_hours': 0,
                'total_pay': 0,
                'shift_count': 0,
                'timesheets': []
            }
        
        hours = ts.get('adjusted_hours') or ts.get('actual_hours', 0)
        pay = ts.get('adjusted_pay') or ts.get('actual_pay', 0)
        
        worker_summaries[workforce_id]['total_hours'] += hours
        worker_summaries[workforce_id]['total_pay'] += pay
        worker_summaries[workforce_id]['shift_count'] += 1
        worker_summaries[workforce_id]['timesheets'].append(ts['timesheet_id'])
    
    # Convert to list
    worker_list = list(worker_summaries.values())
    
    # Calculate totals
    grand_total_hours = sum([w['total_hours'] for w in worker_list])
    grand_total_pay = sum([w['total_pay'] for w in worker_list])
    
    return {
        "success": True,
        "data": {
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "workers": worker_list,
            "summary": {
                "total_workers": len(worker_list),
                "total_shifts": len(timesheets),
                "total_hours": round(grand_total_hours, 2),
                "total_payroll": round(grand_total_pay, 2)
            }
        }
    }
