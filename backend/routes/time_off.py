"""
Enhanced Time-Off Request Management API
========================================
Comprehensive time-off management including:
- Balance tracking and accrual
- Policy management
- Calendar integration
- Approval workflows
- Team availability views
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from auth.dependencies import get_current_user, require_role
from models.time_off import (
    TimeOffRequest, TimeOffType, TimeOffStatus,
    TimeOffPolicy, TimeOffBalance, TimeOffCalendarEntry, TimeOffSummary
)
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List, Dict
import uuid

router = APIRouter(prefix="/api/time-off", tags=["Time-Off Management"])


def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


def calculate_business_days(start_date: date, end_date: date) -> int:
    """Calculate number of business days between two dates"""
    if end_date < start_date:
        return 0
    
    days = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:  # Monday = 0, Friday = 4
            days += 1
        current += timedelta(days=1)
    return days


def parse_date(date_str: str) -> date:
    """Parse date string to date object"""
    if isinstance(date_str, date):
        return date_str
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
    except (ValueError, AttributeError):
        return datetime.strptime(date_str[:10], "%Y-%m-%d").date()


# ==================== POLICY MANAGEMENT ====================

@router.get("/policies", response_model=Dict)
async def get_time_off_policies(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get employer's time-off policies"""
    
    policies = await db.time_off_policies.find(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(20)
    
    # If no policies exist, return default policy template
    if not policies:
        default_policy = TimeOffPolicy(
            employer_id=current_user["user_id"],
            policy_name="Default Policy"
        )
        policies = [default_policy.model_dump()]
    
    return {
        "success": True,
        "data": {
            "policies": policies,
            "total": len(policies)
        }
    }


@router.post("/policies", response_model=Dict)
async def create_time_off_policy(
    policy_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Create a new time-off policy"""
    
    policy = TimeOffPolicy(
        employer_id=current_user["user_id"],
        policy_name=policy_data.get("policy_name", "Custom Policy"),
        vacation_days_per_year=policy_data.get("vacation_days_per_year", 10.0),
        sick_days_per_year=policy_data.get("sick_days_per_year", 3.0),
        personal_days_per_year=policy_data.get("personal_days_per_year", 2.0),
        accrual_period=policy_data.get("accrual_period", "annual"),
        allow_carryover=policy_data.get("allow_carryover", True),
        max_carryover_days=policy_data.get("max_carryover_days", 5.0),
        min_advance_notice_days=policy_data.get("min_advance_notice_days", 7),
        max_consecutive_days=policy_data.get("max_consecutive_days", 15),
        probation_period_days=policy_data.get("probation_period_days", 90),
        blackout_periods=policy_data.get("blackout_periods", []),
        is_default=policy_data.get("is_default", False)
    )
    
    # If setting as default, unset other defaults
    if policy.is_default:
        await db.time_off_policies.update_many(
            {"employer_id": current_user["user_id"]},
            {"$set": {"is_default": False}}
        )
    
    await db.time_off_policies.insert_one(policy.model_dump())
    
    return {
        "success": True,
        "data": {"policy_id": policy.policy_id},
        "message": "Time-off policy created successfully"
    }


@router.put("/policies/{policy_id}", response_model=Dict)
async def update_time_off_policy(
    policy_id: str,
    policy_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Update a time-off policy"""
    
    policy = await db.time_off_policies.find_one({
        "policy_id": policy_id,
        "employer_id": current_user["user_id"]
    })
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    # Build update
    allowed_fields = [
        "policy_name", "vacation_days_per_year", "sick_days_per_year",
        "personal_days_per_year", "accrual_period", "allow_carryover",
        "max_carryover_days", "min_advance_notice_days", "max_consecutive_days",
        "probation_period_days", "blackout_periods", "auto_approve_sick_days",
        "require_doctor_note_after_days", "is_default", "active"
    ]
    
    updates = {k: v for k, v in policy_data.items() if k in allowed_fields}
    updates["updated_date"] = datetime.now(timezone.utc).isoformat()
    
    # If setting as default, unset other defaults
    if updates.get("is_default"):
        await db.time_off_policies.update_many(
            {"employer_id": current_user["user_id"], "policy_id": {"$ne": policy_id}},
            {"$set": {"is_default": False}}
        )
    
    await db.time_off_policies.update_one(
        {"policy_id": policy_id},
        {"$set": updates}
    )
    
    return {
        "success": True,
        "message": "Policy updated successfully"
    }


# ==================== BALANCE MANAGEMENT ====================

@router.get("/balance", response_model=Dict)
async def get_my_time_off_balance(
    employer_id: Optional[str] = Query(None, description="Filter by employer"),
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get worker's time-off balance"""
    
    query = {"worker_id": current_user["user_id"]}
    if employer_id:
        query["employer_id"] = employer_id
    
    balances = await db.time_off_balances.find(query, {"_id": 0}).to_list(10)
    
    # Get employer names
    employer_ids = list(set([b["employer_id"] for b in balances]))
    employers = await db.employer_profiles.find(
        {"user_id": {"$in": employer_ids}},
        {"_id": 0, "user_id": 1, "company_name": 1}
    ).to_list(20)
    employer_map = {e["user_id"]: e.get("company_name", "Unknown") for e in employers}
    
    for balance in balances:
        balance["employer_name"] = employer_map.get(balance["employer_id"], "Unknown")
    
    return {
        "success": True,
        "data": {
            "balances": balances,
            "total": len(balances)
        }
    }


@router.get("/balance/worker/{worker_id}", response_model=Dict)
async def get_worker_time_off_balance(
    worker_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Employer views worker's time-off balance"""
    
    # Verify employment relationship
    relationship = await db.employment_relationships.find_one({
        "employer_id": current_user["user_id"],
        "workforce_id": worker_id,
        "status": "active"
    })
    
    if not relationship:
        raise HTTPException(status_code=403, detail="Worker not employed by you")
    
    balance = await db.time_off_balances.find_one({
        "worker_id": worker_id,
        "employer_id": current_user["user_id"]
    }, {"_id": 0})
    
    if not balance:
        # Create default balance
        balance = await initialize_worker_balance(db, worker_id, current_user["user_id"])
    
    # Get request history
    requests = await db.time_off_requests.find({
        "worker_id": worker_id,
        "employer_id": current_user["user_id"],
        "status": "approved"
    }, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "success": True,
        "data": {
            "balance": balance,
            "recent_requests": requests
        }
    }


@router.post("/balance/initialize", response_model=Dict)
async def initialize_team_balances(
    policy_id: Optional[str] = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Initialize time-off balances for all workers"""
    
    # Get active workers
    relationships = await db.employment_relationships.find({
        "employer_id": current_user["user_id"],
        "status": "active"
    }, {"_id": 0, "workforce_id": 1, "start_date": 1}).to_list(500)
    
    # Get policy
    policy = None
    if policy_id:
        policy = await db.time_off_policies.find_one({
            "policy_id": policy_id,
            "employer_id": current_user["user_id"]
        })
    else:
        policy = await db.time_off_policies.find_one({
            "employer_id": current_user["user_id"],
            "is_default": True
        })
    
    if not policy:
        policy = TimeOffPolicy(employer_id=current_user["user_id"]).model_dump()
    
    initialized = 0
    for rel in relationships:
        worker_id = rel["workforce_id"]
        
        # Check if balance exists
        existing = await db.time_off_balances.find_one({
            "worker_id": worker_id,
            "employer_id": current_user["user_id"],
            "year": datetime.now(timezone.utc).year
        })
        
        if not existing:
            balance = TimeOffBalance(
                worker_id=worker_id,
                employer_id=current_user["user_id"],
                policy_id=policy.get("policy_id"),
                vacation_entitled=policy.get("vacation_days_per_year", 10.0),
                vacation_available=policy.get("vacation_days_per_year", 10.0),
                sick_entitled=policy.get("sick_days_per_year", 3.0),
                sick_available=policy.get("sick_days_per_year", 3.0),
                personal_entitled=policy.get("personal_days_per_year", 2.0),
                personal_available=policy.get("personal_days_per_year", 2.0),
                hire_date=rel.get("start_date")
            )
            await db.time_off_balances.insert_one(balance.model_dump())
            initialized += 1
    
    return {
        "success": True,
        "data": {"initialized_count": initialized},
        "message": f"Initialized balances for {initialized} workers"
    }


async def initialize_worker_balance(db, worker_id: str, employer_id: str) -> dict:
    """Initialize balance for a single worker"""
    
    # Get default policy
    policy = await db.time_off_policies.find_one({
        "employer_id": employer_id,
        "is_default": True
    })
    
    if not policy:
        policy = TimeOffPolicy(employer_id=employer_id).model_dump()
    
    # Get hire date
    relationship = await db.employment_relationships.find_one({
        "employer_id": employer_id,
        "workforce_id": worker_id
    })
    
    balance = TimeOffBalance(
        worker_id=worker_id,
        employer_id=employer_id,
        policy_id=policy.get("policy_id"),
        vacation_entitled=policy.get("vacation_days_per_year", 10.0),
        vacation_available=policy.get("vacation_days_per_year", 10.0),
        sick_entitled=policy.get("sick_days_per_year", 3.0),
        sick_available=policy.get("sick_days_per_year", 3.0),
        personal_entitled=policy.get("personal_days_per_year", 2.0),
        personal_available=policy.get("personal_days_per_year", 2.0),
        hire_date=relationship.get("start_date") if relationship else None
    )
    
    await db.time_off_balances.insert_one(balance.model_dump())
    return balance.model_dump()


# ==================== TIME-OFF REQUESTS ====================

@router.post("/request", response_model=Dict)
async def create_time_off_request(
    request_data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Worker creates time-off request"""
    
    # Parse dates
    start_date = parse_date(request_data["start_date"])
    end_date = parse_date(request_data["end_date"])
    
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    employer_id = request_data["employer_id"]
    leave_type = TimeOffType(request_data.get("type", "vacation"))
    
    # Calculate days
    if request_data.get("business_days_only", True):
        total_days = calculate_business_days(start_date, end_date)
    else:
        total_days = (end_date - start_date).days + 1
    
    # Handle partial days
    if not request_data.get("is_full_day", True):
        total_days = request_data.get("partial_day_amount", 0.5)
    
    # Check balance
    balance = await db.time_off_balances.find_one({
        "worker_id": current_user["user_id"],
        "employer_id": employer_id
    }, {"_id": 0})
    
    if not balance:
        balance = await initialize_worker_balance(db, current_user["user_id"], employer_id)
    
    # Validate balance for paid leave types
    balance_check = None
    if leave_type == TimeOffType.VACATION:
        if balance["vacation_available"] < total_days:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient vacation balance. Available: {balance['vacation_available']}, Requested: {total_days}"
            )
        balance_check = {"type": "vacation", "available": balance["vacation_available"]}
    elif leave_type == TimeOffType.SICK:
        if balance["sick_available"] < total_days:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient sick leave balance. Available: {balance['sick_available']}, Requested: {total_days}"
            )
        balance_check = {"type": "sick", "available": balance["sick_available"]}
    elif leave_type == TimeOffType.PERSONAL:
        if balance["personal_available"] < total_days:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient personal day balance. Available: {balance['personal_available']}, Requested: {total_days}"
            )
        balance_check = {"type": "personal", "available": balance["personal_available"]}
    
    # Find affected shifts
    affected_shifts = await db.shifts.find({
        "employer_id": employer_id,
        "$or": [
            {"assigned_worker_id": current_user["user_id"]},
            {"assigned_workers.worker_id": current_user["user_id"]}
        ],
        "shift_date": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }, {"_id": 0, "shift_id": 1}).to_list(100)
    
    affected_shift_ids = [s["shift_id"] for s in affected_shifts]
    
    # Check for doctor note requirement
    policy = await db.time_off_policies.find_one({
        "employer_id": employer_id,
        "is_default": True
    })
    
    doctor_note_required = False
    if policy and leave_type == TimeOffType.SICK:
        if total_days > policy.get("require_doctor_note_after_days", 3):
            doctor_note_required = True
    
    # Create request
    time_off_request = TimeOffRequest(
        worker_id=current_user["user_id"],
        employer_id=employer_id,
        workplace_id=request_data.get("workplace_id"),
        type=leave_type,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        is_full_day=request_data.get("is_full_day", True),
        start_time=request_data.get("start_time"),
        end_time=request_data.get("end_time"),
        total_days=total_days,
        business_days_only=request_data.get("business_days_only", True),
        reason=request_data.get("reason"),
        notes=request_data.get("notes"),
        doctor_note_required=doctor_note_required,
        affected_shifts=affected_shift_ids,
        requires_coverage=len(affected_shift_ids) > 0,
        balance_at_request=balance_check
    )
    
    await db.time_off_requests.insert_one(time_off_request.model_dump())
    
    # Update pending balance
    if leave_type == TimeOffType.VACATION:
        await db.time_off_balances.update_one(
            {"worker_id": current_user["user_id"], "employer_id": employer_id},
            {
                "$inc": {"vacation_pending": total_days},
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            }
        )
    elif leave_type == TimeOffType.SICK:
        await db.time_off_balances.update_one(
            {"worker_id": current_user["user_id"], "employer_id": employer_id},
            {
                "$inc": {"sick_pending": total_days},
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            }
        )
    elif leave_type == TimeOffType.PERSONAL:
        await db.time_off_balances.update_one(
            {"worker_id": current_user["user_id"], "employer_id": employer_id},
            {
                "$inc": {"personal_pending": total_days},
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            }
        )
    
    # Create notification for employer
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": employer_id,
        "type": "time_off_request",
        "title": "New Time-Off Request",
        "message": f"A worker has requested {total_days} day(s) of {leave_type.value} from {start_date} to {end_date}",
        "data": {"request_id": time_off_request.request_id},
        "read": False,
        "created_date": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "data": {
            "request_id": time_off_request.request_id,
            "total_days": total_days,
            "affected_shifts_count": len(affected_shift_ids),
            "doctor_note_required": doctor_note_required
        },
        "message": f"Time-off request submitted for {total_days} day(s)"
    }


@router.get("/requests", response_model=Dict)
async def get_time_off_requests(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get time-off requests (filtered by user role)"""
    
    query = {}
    
    if current_user["user_type"] == "workforce":
        query["worker_id"] = current_user["user_id"]
    elif current_user["user_type"] == "employer":
        query["employer_id"] = current_user["user_id"]
    
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    if date_from:
        query["start_date"] = {"$gte": date_from}
    if date_to:
        if "start_date" in query:
            query["start_date"]["$lte"] = date_to
        else:
            query["end_date"] = {"$lte": date_to}
    
    skip = (page - 1) * limit
    
    requests = await db.time_off_requests.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.time_off_requests.count_documents(query)
    
    # Enrich with worker details for employers
    if current_user["user_type"] == "employer":
        worker_ids = list(set([r["worker_id"] for r in requests]))
        workers = await db.workforce_profiles.find(
            {"user_id": {"$in": worker_ids}},
            {"_id": 0, "user_id": 1, "first_name": 1, "last_name": 1, "email": 1, "profile_picture": 1}
        ).to_list(100)
        worker_map = {w["user_id"]: w for w in workers}
        
        for req in requests:
            worker = worker_map.get(req["worker_id"], {})
            req["worker_name"] = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip() or "Unknown"
            req["worker_email"] = worker.get("email")
            req["worker_photo"] = worker.get("profile_picture")
    
    return {
        "success": True,
        "data": {
            "requests": requests,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    }


@router.get("/requests/{request_id}", response_model=Dict)
async def get_time_off_request_detail(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get detailed time-off request"""
    
    query = {"request_id": request_id}
    
    if current_user["user_type"] == "workforce":
        query["worker_id"] = current_user["user_id"]
    elif current_user["user_type"] == "employer":
        query["employer_id"] = current_user["user_id"]
    
    request = await db.time_off_requests.find_one(query, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Get worker profile if employer
    if current_user["user_type"] == "employer":
        worker = await db.workforce_profiles.find_one(
            {"user_id": request["worker_id"]},
            {"_id": 0, "first_name": 1, "last_name": 1, "email": 1, "phone": 1, "profile_picture": 1}
        )
        request["worker"] = worker
    
    # Get affected shift details
    if request.get("affected_shifts"):
        shifts = await db.shifts.find(
            {"shift_id": {"$in": request["affected_shifts"]}},
            {"_id": 0, "shift_id": 1, "shift_date": 1, "start_time": 1, "end_time": 1, "workplace_name": 1}
        ).to_list(50)
        request["affected_shifts_details"] = shifts
    
    return {
        "success": True,
        "data": request
    }


@router.patch("/requests/{request_id}/approve", response_model=Dict)
async def approve_time_off_request(
    request_id: str,
    approval_data: Optional[dict] = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Employer approves time-off request"""
    
    request = await db.time_off_requests.find_one({
        "request_id": request_id,
        "employer_id": current_user["user_id"]
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve request with status: {request['status']}")
    
    # Update request status
    updates = {
        "status": "approved",
        "reviewed_by": current_user["user_id"],
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if approval_data:
        updates["approval_notes"] = approval_data.get("notes")
    
    await db.time_off_requests.update_one(
        {"request_id": request_id},
        {"$set": updates}
    )
    
    # Update balance: move from pending to used
    leave_type = request["type"]
    total_days = request["total_days"]
    worker_id = request["worker_id"]
    
    if leave_type == "vacation":
        await db.time_off_balances.update_one(
            {"worker_id": worker_id, "employer_id": current_user["user_id"]},
            {
                "$inc": {
                    "vacation_pending": -total_days,
                    "vacation_used": total_days,
                    "vacation_available": -total_days
                },
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            }
        )
    elif leave_type == "sick":
        await db.time_off_balances.update_one(
            {"worker_id": worker_id, "employer_id": current_user["user_id"]},
            {
                "$inc": {
                    "sick_pending": -total_days,
                    "sick_used": total_days,
                    "sick_available": -total_days
                },
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            }
        )
    elif leave_type == "personal":
        await db.time_off_balances.update_one(
            {"worker_id": worker_id, "employer_id": current_user["user_id"]},
            {
                "$inc": {
                    "personal_pending": -total_days,
                    "personal_used": total_days,
                    "personal_available": -total_days
                },
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            }
        )
    elif leave_type == "unpaid":
        await db.time_off_balances.update_one(
            {"worker_id": worker_id, "employer_id": current_user["user_id"]},
            {
                "$inc": {"unpaid_days_taken": total_days},
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            }
        )
    
    # Mark affected shifts as on_time_off
    if request.get("affected_shifts"):
        await db.shifts.update_many(
            {"shift_id": {"$in": request["affected_shifts"]}},
            {
                "$set": {
                    "status": "on_time_off",
                    "time_off_request_id": request_id
                }
            }
        )
    
    # Notify worker
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": worker_id,
        "type": "time_off_approved",
        "title": "Time-Off Approved ✓",
        "message": f"Your {leave_type} request for {total_days} day(s) has been approved.",
        "data": {"request_id": request_id},
        "read": False,
        "created_date": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Time-off approved. {len(request.get('affected_shifts', []))} shifts affected."
    }


@router.patch("/requests/{request_id}/reject", response_model=Dict)
async def reject_time_off_request(
    request_id: str,
    rejection_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Employer rejects time-off request"""
    
    request = await db.time_off_requests.find_one({
        "request_id": request_id,
        "employer_id": current_user["user_id"]
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject request with status: {request['status']}")
    
    # Update request
    await db.time_off_requests.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "rejected",
                "reviewed_by": current_user["user_id"],
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "rejection_reason": rejection_data.get("reason", ""),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Return pending balance
    leave_type = request["type"]
    total_days = request["total_days"]
    worker_id = request["worker_id"]
    
    if leave_type == "vacation":
        await db.time_off_balances.update_one(
            {"worker_id": worker_id, "employer_id": current_user["user_id"]},
            {"$inc": {"vacation_pending": -total_days}}
        )
    elif leave_type == "sick":
        await db.time_off_balances.update_one(
            {"worker_id": worker_id, "employer_id": current_user["user_id"]},
            {"$inc": {"sick_pending": -total_days}}
        )
    elif leave_type == "personal":
        await db.time_off_balances.update_one(
            {"worker_id": worker_id, "employer_id": current_user["user_id"]},
            {"$inc": {"personal_pending": -total_days}}
        )
    
    # Notify worker
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": worker_id,
        "type": "time_off_rejected",
        "title": "Time-Off Request Declined",
        "message": f"Your {leave_type} request has been declined. Reason: {rejection_data.get('reason', 'Not specified')}",
        "data": {"request_id": request_id},
        "read": False,
        "created_date": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": "Time-off request rejected"
    }


@router.delete("/requests/{request_id}", response_model=Dict)
async def cancel_time_off_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Cancel a time-off request"""
    
    query = {"request_id": request_id}
    
    if current_user["user_type"] == "workforce":
        query["worker_id"] = current_user["user_id"]
    elif current_user["user_type"] == "employer":
        query["employer_id"] = current_user["user_id"]
    
    request = await db.time_off_requests.find_one(query)
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request["status"] not in ["pending", "approved"]:
        raise HTTPException(status_code=400, detail="Cannot cancel this request")
    
    # Update request
    await db.time_off_requests.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "cancelled",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Return balance
    leave_type = request["type"]
    total_days = request["total_days"]
    worker_id = request["worker_id"]
    employer_id = request["employer_id"]
    
    if request["status"] == "pending":
        # Return pending
        if leave_type == "vacation":
            await db.time_off_balances.update_one(
                {"worker_id": worker_id, "employer_id": employer_id},
                {"$inc": {"vacation_pending": -total_days}}
            )
        elif leave_type == "sick":
            await db.time_off_balances.update_one(
                {"worker_id": worker_id, "employer_id": employer_id},
                {"$inc": {"sick_pending": -total_days}}
            )
        elif leave_type == "personal":
            await db.time_off_balances.update_one(
                {"worker_id": worker_id, "employer_id": employer_id},
                {"$inc": {"personal_pending": -total_days}}
            )
    elif request["status"] == "approved":
        # Return used to available
        if leave_type == "vacation":
            await db.time_off_balances.update_one(
                {"worker_id": worker_id, "employer_id": employer_id},
                {"$inc": {"vacation_used": -total_days, "vacation_available": total_days}}
            )
        elif leave_type == "sick":
            await db.time_off_balances.update_one(
                {"worker_id": worker_id, "employer_id": employer_id},
                {"$inc": {"sick_used": -total_days, "sick_available": total_days}}
            )
        elif leave_type == "personal":
            await db.time_off_balances.update_one(
                {"worker_id": worker_id, "employer_id": employer_id},
                {"$inc": {"personal_used": -total_days, "personal_available": total_days}}
            )
        
        # Restore affected shifts
        if request.get("affected_shifts"):
            await db.shifts.update_many(
                {"shift_id": {"$in": request["affected_shifts"]}},
                {
                    "$set": {"status": "published"},
                    "$unset": {"time_off_request_id": ""}
                }
            )
    
    return {
        "success": True,
        "message": "Time-off request cancelled"
    }


# ==================== CALENDAR VIEW ====================

@router.get("/calendar", response_model=Dict)
async def get_time_off_calendar(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    workplace_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get calendar view of approved time-off"""
    
    # Calculate date range
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    query = {
        "status": "approved",
        "start_date": {"$lte": end_date.isoformat()},
        "end_date": {"$gte": start_date.isoformat()}
    }
    
    if current_user["user_type"] == "workforce":
        query["worker_id"] = current_user["user_id"]
    elif current_user["user_type"] == "employer":
        query["employer_id"] = current_user["user_id"]
        if workplace_id:
            query["workplace_id"] = workplace_id
    
    requests = await db.time_off_requests.find(query, {"_id": 0}).to_list(200)
    
    # Build calendar entries
    calendar_entries = []
    
    # Get worker info for employer view
    worker_map = {}
    if current_user["user_type"] == "employer":
        worker_ids = list(set([r["worker_id"] for r in requests]))
        workers = await db.workforce_profiles.find(
            {"user_id": {"$in": worker_ids}},
            {"_id": 0, "user_id": 1, "first_name": 1, "last_name": 1, "profile_picture": 1}
        ).to_list(100)
        worker_map = {w["user_id"]: w for w in workers}
    
    for req in requests:
        req_start = parse_date(req["start_date"])
        req_end = parse_date(req["end_date"])
        
        worker = worker_map.get(req["worker_id"], {})
        worker_name = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip() or "Worker"
        
        # Create entry for each day in the request
        current = max(req_start, start_date)
        while current <= min(req_end, end_date):
            entry = {
                "entry_id": f"{req['request_id']}_{current.isoformat()}",
                "request_id": req["request_id"],
                "date": current.isoformat(),
                "type": req["type"],
                "worker_id": req["worker_id"],
                "worker_name": worker_name,
                "worker_photo": worker.get("profile_picture"),
                "is_full_day": req.get("is_full_day", True),
                "start_time": req.get("start_time"),
                "end_time": req.get("end_time")
            }
            calendar_entries.append(entry)
            current += timedelta(days=1)
    
    return {
        "success": True,
        "data": {
            "month": month,
            "year": year,
            "entries": calendar_entries,
            "total_requests": len(requests)
        }
    }


# ==================== DASHBOARD & STATS ====================

@router.get("/summary", response_model=Dict)
async def get_time_off_summary(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get time-off summary dashboard"""
    
    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1)
    week_end = today + timedelta(days=(6 - today.weekday()))
    
    if current_user["user_type"] == "workforce":
        # Worker summary
        base_query = {"worker_id": current_user["user_id"]}
        
        pending = await db.time_off_requests.count_documents({**base_query, "status": "pending"})
        
        upcoming = await db.time_off_requests.find({
            **base_query,
            "status": "approved",
            "start_date": {"$gte": today.isoformat()}
        }, {"_id": 0}).sort("start_date", 1).limit(5).to_list(5)
        
        # Get balances
        balances = await db.time_off_balances.find(
            {"worker_id": current_user["user_id"]},
            {"_id": 0}
        ).to_list(10)
        
        total_vacation = sum(b.get("vacation_available", 0) for b in balances)
        total_sick = sum(b.get("sick_available", 0) for b in balances)
        total_personal = sum(b.get("personal_available", 0) for b in balances)
        
        return {
            "success": True,
            "data": {
                "pending_requests": pending,
                "upcoming_time_off": upcoming,
                "balances": {
                    "vacation_available": total_vacation,
                    "sick_available": total_sick,
                    "personal_available": total_personal
                }
            }
        }
    
    else:  # Employer
        base_query = {"employer_id": current_user["user_id"]}
        
        pending = await db.time_off_requests.count_documents({**base_query, "status": "pending"})
        
        approved_this_month = await db.time_off_requests.count_documents({
            **base_query,
            "status": "approved",
            "reviewed_at": {"$gte": month_start.isoformat()}
        })
        
        # Workers off today
        workers_off_today = await db.time_off_requests.count_documents({
            **base_query,
            "status": "approved",
            "start_date": {"$lte": today.isoformat()},
            "end_date": {"$gte": today.isoformat()}
        })
        
        # Workers off this week
        workers_off_week = await db.time_off_requests.count_documents({
            **base_query,
            "status": "approved",
            "start_date": {"$lte": week_end.isoformat()},
            "end_date": {"$gte": today.isoformat()}
        })
        
        # Upcoming requests
        upcoming = await db.time_off_requests.find({
            **base_query,
            "status": "approved",
            "start_date": {"$gte": today.isoformat()}
        }, {"_id": 0}).sort("start_date", 1).limit(10).to_list(10)
        
        # Enrich with worker names
        if upcoming:
            worker_ids = list(set([r["worker_id"] for r in upcoming]))
            workers = await db.workforce_profiles.find(
                {"user_id": {"$in": worker_ids}},
                {"_id": 0, "user_id": 1, "first_name": 1, "last_name": 1}
            ).to_list(50)
            worker_map = {w["user_id"]: w for w in workers}
            
            for req in upcoming:
                worker = worker_map.get(req["worker_id"], {})
                req["worker_name"] = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip()
        
        return {
            "success": True,
            "data": {
                "pending_requests": pending,
                "approved_this_month": approved_this_month,
                "workers_off_today": workers_off_today,
                "workers_off_this_week": workers_off_week,
                "upcoming_time_off": upcoming
            }
        }
