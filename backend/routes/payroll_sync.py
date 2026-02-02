"""
Payroll Sync API Routes
Direct API integration with payroll providers:
- Gusto (Phase 2)
- Ceridian Dayforce (Phase 3)
- ADP Workforce Now (Phase 4)

All integrations run in MOCK mode unless credentials are configured.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
from auth.dependencies import get_current_user, require_role
from database import get_database
from services.payroll_sync import (
    get_available_sync_providers,
    get_sync_provider,
    sync_to_provider,
    SyncResult
)
from services.payroll_export import PayrollEntry
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payroll-sync", tags=["Payroll Sync"])


class SyncRequest(BaseModel):
    """Request model for payroll sync"""
    provider_id: str
    start_date: str
    end_date: str


class ConnectionTestResponse(BaseModel):
    """Response model for connection test"""
    provider: str
    connected: bool
    mode: str
    api_version: str
    features: List[str]


@router.get("/providers")
async def list_sync_providers():
    """Get list of available payroll sync providers"""
    providers = get_available_sync_providers()
    
    return {
        "success": True,
        "data": {
            "providers": providers,
            "note": "All providers are in MOCK mode. Configure environment variables for live API access.",
            "configuration_docs": {
                "gusto": {
                    "required_env_vars": ["GUSTO_CLIENT_ID", "GUSTO_CLIENT_SECRET", "GUSTO_ACCESS_TOKEN"],
                    "docs_url": "https://docs.gusto.com/"
                },
                "dayforce": {
                    "required_env_vars": ["DAYFORCE_CLIENT_NAMESPACE", "DAYFORCE_USERNAME", "DAYFORCE_PASSWORD"],
                    "docs_url": "https://developers.dayforce.com/"
                },
                "adp": {
                    "required_env_vars": ["ADP_CLIENT_ID", "ADP_CLIENT_SECRET", "ADP_CERT_PATH", "ADP_KEY_PATH"],
                    "docs_url": "https://developers.adp.com/"
                }
            }
        }
    }


@router.get("/providers/{provider_id}/test")
async def test_provider_connection(
    provider_id: str,
    current_user: dict = Depends(require_role("employer"))
):
    """Test connection to a payroll provider"""
    provider = get_sync_provider(provider_id)
    
    if not provider:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider_id}")
    
    connection_info = await provider.validate_connection()
    
    return {
        "success": True,
        "data": connection_info
    }


@router.get("/providers/{provider_id}/employees")
async def get_provider_employees(
    provider_id: str,
    current_user: dict = Depends(require_role("employer"))
):
    """Get employees from a payroll provider (mock data in mock mode)"""
    provider = get_sync_provider(provider_id)
    
    if not provider:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider_id}")
    
    await provider.authenticate()
    employees = await provider.get_employees()
    
    return {
        "success": True,
        "data": {
            "provider": provider.provider_name,
            "mode": "mock" if provider.is_mock_mode else "live",
            "employees": employees,
            "count": len(employees)
        }
    }


@router.post("/sync")
async def sync_payroll(
    request: SyncRequest,
    current_user: dict = Depends(require_role("employer"))
):
    """
    Sync payroll data to a provider
    
    This endpoint:
    1. Fetches shift data for the specified date range
    2. Transforms it to the provider's format
    3. Syncs to the provider's API (mock mode by default)
    4. Logs the sync operation
    5. Returns the sync result
    """
    db = await get_database()
    employer_id = current_user["user_id"]
    
    # Validate provider
    provider = get_sync_provider(request.provider_id)
    if not provider:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider_id}")
    
    # Get payroll entries for the date range
    entries = await _get_payroll_entries(db, employer_id, request.start_date, request.end_date)
    
    if not entries:
        raise HTTPException(
            status_code=404,
            detail="No timesheet entries found for this period"
        )
    
    # Sync to provider
    result = await sync_to_provider(request.provider_id, entries)
    
    # Log the sync operation
    sync_log = {
        "employer_id": employer_id,
        "provider": result.provider,
        "mode": result.mode,
        "batch_id": result.batch_id,
        "period_start": request.start_date,
        "period_end": request.end_date,
        "records_synced": result.records_synced,
        "records_failed": result.records_failed,
        "success": result.success,
        "errors": result.errors,
        "synced_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payroll_syncs.insert_one(sync_log)
    
    return {
        "success": result.success,
        "data": {
            "provider": result.provider,
            "mode": result.mode,
            "batch_id": result.batch_id,
            "records_synced": result.records_synced,
            "records_failed": result.records_failed,
            "timestamp": result.timestamp,
            "details": result.details,
            "errors": result.errors,
            "note": "This is a MOCK sync. Configure provider credentials for live API sync." if result.mode == "mock" else None
        }
    }


@router.get("/history")
async def get_sync_history(
    provider_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_role("employer"))
):
    """Get history of payroll sync operations"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    query = {"employer_id": employer_id}
    if provider_id:
        query["provider"] = provider_id
    
    syncs = await db.payroll_syncs.find(
        query,
        {"_id": 0}
    ).sort("synced_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "data": {
            "syncs": syncs,
            "count": len(syncs)
        }
    }


@router.get("/batch/{batch_id}")
async def get_sync_batch_details(
    batch_id: str,
    current_user: dict = Depends(require_role("employer"))
):
    """Get details of a specific sync batch"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    sync = await db.payroll_syncs.find_one(
        {"employer_id": employer_id, "batch_id": batch_id},
        {"_id": 0}
    )
    
    if not sync:
        raise HTTPException(status_code=404, detail="Sync batch not found")
    
    return {
        "success": True,
        "data": sync
    }


@router.get("/status")
async def get_sync_status(
    current_user: dict = Depends(require_role("employer"))
):
    """Get overall sync status and configuration"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    # Get provider status
    providers = get_available_sync_providers()
    
    # Get recent sync summary
    recent_syncs = await db.payroll_syncs.find(
        {"employer_id": employer_id}
    ).sort("synced_at", -1).limit(10).to_list(10)
    
    # Calculate stats
    total_syncs = len(recent_syncs)
    successful_syncs = len([s for s in recent_syncs if s.get("success")])
    total_records_synced = sum(s.get("records_synced", 0) for s in recent_syncs)
    
    return {
        "success": True,
        "data": {
            "providers": providers,
            "sync_summary": {
                "total_syncs": total_syncs,
                "successful_syncs": successful_syncs,
                "success_rate": round(successful_syncs / total_syncs * 100, 1) if total_syncs > 0 else 0,
                "total_records_synced": total_records_synced
            },
            "last_sync": recent_syncs[0] if recent_syncs else None,
            "configuration_status": {
                "gusto": "mock",
                "dayforce": "mock",
                "adp": "mock"
            }
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
    
    # Support both 'shift_date' and 'date' fields for compatibility
    query = {
        "employer_id": employer_id,
        "$or": [
            {"shift_date": {"$gte": start_date, "$lte": end_date}},
            {"date": {"$gte": start_date, "$lte": end_date}}
        ],
        "status": {"$in": ["completed", "approved"]}
    }
    
    cursor = db.shifts.find(query, {"_id": 0}).sort([("shift_date", 1), ("date", 1)])
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
            fee_calc = shift.get("fee_calculation", {})
            hourly_rate = fee_calc.get("hourly_rate", 17.60)
        
        # Calculate pay
        regular_pay = regular_hours * hourly_rate
        overtime_pay = overtime_hours * hourly_rate * 1.5
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
            work_date=shift.get("shift_date", shift.get("date", "")),
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
