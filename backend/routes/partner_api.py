"""
CleanGrid Work Order API - Webhook-based integration for work order dispatch
Work orders flow: CleanGrid → FSA Bundling → Franchisee Dashboard → Worker Assignment → Shift
"""

from fastapi import APIRouter, HTTPException, Depends, Header, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from database import db
import uuid
import hashlib
import hmac
import httpx
import os

router = APIRouter(prefix="/partner", tags=["Partner Work Orders"])


# ============== Models ==============

class PartnerCreate(BaseModel):
    """Register a new partner (e.g., CleanGrid)"""
    partner_name: str
    contact_email: str
    webhook_url: str
    description: Optional[str] = None


class PartnerResponse(BaseModel):
    partner_id: str
    partner_name: str
    api_key: str
    webhook_secret: str
    message: str


class WorkOrderCreate(BaseModel):
    """Work order from CleanGrid"""
    external_order_id: str  # CleanGrid's order ID
    service_type: str  # residential_cleaning, commercial_cleaning, move_in_out, deep_clean
    customer_name: str
    service_address: str
    service_city: str
    service_province: str = "Ontario"
    service_postal_code: str  # FSA for routing (e.g., N9A, N8H)
    scheduled_date: str  # YYYY-MM-DD
    time_window_start: str  # HH:MM (e.g., "09:00")
    time_window_end: str  # HH:MM (e.g., "12:00")
    estimated_duration_hours: float = 2.0
    special_instructions: Optional[str] = None
    required_equipment: List[str] = []
    workers_needed: int = 1
    hourly_rate: float = 22.00
    customer_phone: Optional[str] = None
    access_instructions: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # weekly, biweekly, monthly
    priority: str = "normal"  # normal, high, urgent
    metadata: Optional[Dict] = None


class WorkOrderAssignment(BaseModel):
    """Assign work order to worker"""
    worker_id: str
    notes: Optional[str] = None


# ============== Helper Functions ==============

def generate_api_key() -> str:
    return f"hrb_pk_{uuid.uuid4().hex}{uuid.uuid4().hex[:8]}"


def generate_webhook_secret() -> str:
    return f"whsec_{uuid.uuid4().hex}"


def verify_api_key(api_key: str = Header(..., alias="X-API-Key")):
    return api_key


async def get_partner_by_api_key(api_key: str) -> Optional[dict]:
    partner = await db.partners.find_one({"api_key": api_key, "status": "active"})
    return partner


def extract_fsa(postal_code: str) -> str:
    """Extract FSA (Forward Sortation Area) from postal code - first 3 characters"""
    return postal_code.replace(" ", "").upper()[:3] if postal_code else ""


async def get_franchisee_for_fsa(fsa: str) -> Optional[dict]:
    """Find the franchisee employer assigned to this FSA territory"""
    # Check FSA territory assignments
    assignment = await db.fsa_territories.find_one({"fsa": fsa, "status": "active"})
    if assignment:
        employer = await db.employer_profiles.find_one({"user_id": assignment["employer_id"]})
        return employer
    return None


async def send_webhook(url: str, payload: dict, secret: str):
    """Send webhook notification to partner"""
    import json
    payload_str = json.dumps(payload)
    signature = hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-HRBank-Signature": signature,
                    "X-HRBank-Timestamp": datetime.now(timezone.utc).isoformat()
                },
                timeout=30.0
            )
            return {"success": response.status_code < 400, "status_code": response.status_code}
        except Exception as e:
            return {"success": False, "error": str(e)}


# ============== Admin Endpoints ==============

@router.post("/register", response_model=PartnerResponse)
async def register_partner(
    partner_data: PartnerCreate,
    admin_key: str = Header(..., alias="X-Admin-Key")
):
    """Register a new partner platform (Admin only)"""
    expected_admin_key = os.environ.get("PARTNER_ADMIN_KEY", "hrbank_admin_secret")
    if admin_key != expected_admin_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    existing = await db.partners.find_one({"contact_email": partner_data.contact_email})
    if existing:
        raise HTTPException(status_code=400, detail="Partner already exists")
    
    partner_id = f"partner_{uuid.uuid4().hex[:12]}"
    api_key = generate_api_key()
    webhook_secret = generate_webhook_secret()
    
    partner = {
        "partner_id": partner_id,
        "partner_name": partner_data.partner_name,
        "contact_email": partner_data.contact_email,
        "webhook_url": partner_data.webhook_url,
        "description": partner_data.description,
        "api_key": api_key,
        "webhook_secret": webhook_secret,
        "status": "active",
        "created_date": datetime.now(timezone.utc).isoformat(),
        "work_orders_received": 0,
        "work_orders_completed": 0
    }
    
    await db.partners.insert_one(partner)
    
    return PartnerResponse(
        partner_id=partner_id,
        partner_name=partner_data.partner_name,
        api_key=api_key,
        webhook_secret=webhook_secret,
        message="Partner registered. Store credentials securely."
    )


@router.get("/list")
async def list_partners(admin_key: str = Header(..., alias="X-Admin-Key")):
    """List all registered partners (Admin only)"""
    expected_admin_key = os.environ.get("PARTNER_ADMIN_KEY", "hrbank_admin_secret")
    if admin_key != expected_admin_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    partners = await db.partners.find({}, {"_id": 0, "api_key": 0, "webhook_secret": 0}).to_list(100)
    return {"success": True, "data": {"partners": partners, "total": len(partners)}}


@router.post("/fsa-territory/assign")
async def assign_fsa_territory(
    data: dict,
    admin_key: str = Header(..., alias="X-Admin-Key")
):
    """Assign FSA territory to a franchisee employer (Admin only)"""
    expected_admin_key = os.environ.get("PARTNER_ADMIN_KEY", "hrbank_admin_secret")
    if admin_key != expected_admin_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    fsa = data.get("fsa", "").upper()[:3]
    employer_id = data.get("employer_id")
    
    if not fsa or not employer_id:
        raise HTTPException(status_code=400, detail="FSA and employer_id required")
    
    # Verify employer exists
    employer = await db.employer_profiles.find_one({"user_id": employer_id})
    if not employer:
        raise HTTPException(status_code=404, detail="Employer not found")
    
    # Upsert territory assignment
    await db.fsa_territories.update_one(
        {"fsa": fsa},
        {"$set": {
            "fsa": fsa,
            "employer_id": employer_id,
            "employer_name": employer.get("company_name", ""),
            "status": "active",
            "assigned_date": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": f"FSA {fsa} assigned to {employer.get('company_name')}"}


@router.get("/fsa-territories")
async def list_fsa_territories(admin_key: str = Header(..., alias="X-Admin-Key")):
    """List all FSA territory assignments (Admin only)"""
    expected_admin_key = os.environ.get("PARTNER_ADMIN_KEY", "hrbank_admin_secret")
    if admin_key != expected_admin_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    territories = await db.fsa_territories.find({"status": "active"}, {"_id": 0}).to_list(500)
    return {"success": True, "data": {"territories": territories, "total": len(territories)}}


# ============== Partner Webhook Endpoints ==============

@router.post("/work-orders")
async def receive_work_order(
    work_order: WorkOrderCreate,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """
    Receive work order from CleanGrid.
    Work order is routed to franchisee based on FSA.
    """
    partner = await get_partner_by_api_key(api_key)
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Check for duplicate
    existing = await db.work_orders.find_one({
        "partner_id": partner["partner_id"],
        "external_order_id": work_order.external_order_id
    })
    
    if existing:
        # Update existing order
        await db.work_orders.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                **work_order.dict(),
                "updated_date": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "success": True,
            "data": {
                "hrbank_order_id": existing["hrbank_order_id"],
                "action": "updated"
            }
        }
    
    # Extract FSA and find franchisee
    fsa = extract_fsa(work_order.service_postal_code)
    franchisee = await get_franchisee_for_fsa(fsa)
    
    hrbank_order_id = f"wo_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    order = {
        "hrbank_order_id": hrbank_order_id,
        "partner_id": partner["partner_id"],
        "partner_name": partner["partner_name"],
        "external_order_id": work_order.external_order_id,
        "fsa": fsa,
        "franchisee_id": franchisee["user_id"] if franchisee else None,
        "franchisee_name": franchisee.get("company_name") if franchisee else None,
        
        # Service details
        "service_type": work_order.service_type,
        "customer_name": work_order.customer_name,
        "service_address": work_order.service_address,
        "service_city": work_order.service_city,
        "service_province": work_order.service_province,
        "service_postal_code": work_order.service_postal_code,
        
        # Scheduling
        "scheduled_date": work_order.scheduled_date,
        "time_window_start": work_order.time_window_start,
        "time_window_end": work_order.time_window_end,
        "estimated_duration_hours": work_order.estimated_duration_hours,
        
        # Details
        "special_instructions": work_order.special_instructions,
        "required_equipment": work_order.required_equipment,
        "workers_needed": work_order.workers_needed,
        "hourly_rate": work_order.hourly_rate,
        "customer_phone": work_order.customer_phone,
        "access_instructions": work_order.access_instructions,
        "is_recurring": work_order.is_recurring,
        "recurrence_pattern": work_order.recurrence_pattern,
        "priority": work_order.priority,
        "metadata": work_order.metadata,
        
        # Status tracking
        "status": "pending" if franchisee else "unassigned",  # pending = awaiting franchisee action
        "assigned_workers": [],
        "shift_ids": [],
        
        "created_date": now,
        "updated_date": now
    }
    
    await db.work_orders.insert_one(order)
    
    # Update partner stats
    await db.partners.update_one(
        {"partner_id": partner["partner_id"]},
        {"$inc": {"work_orders_received": 1}}
    )
    
    # Notify franchisee (in background)
    if franchisee:
        background_tasks.add_task(
            notify_franchisee_new_order,
            franchisee["user_id"],
            hrbank_order_id,
            work_order.service_type,
            work_order.scheduled_date
        )
    
    return {
        "success": True,
        "data": {
            "hrbank_order_id": hrbank_order_id,
            "fsa": fsa,
            "franchisee_assigned": franchisee is not None,
            "franchisee_name": franchisee.get("company_name") if franchisee else None,
            "status": order["status"]
        }
    }


@router.get("/work-orders")
async def get_partner_work_orders(
    status: Optional[str] = None,
    api_key: str = Depends(verify_api_key)
):
    """Get work orders sent by this partner"""
    partner = await get_partner_by_api_key(api_key)
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    query = {"partner_id": partner["partner_id"]}
    if status:
        query["status"] = status
    
    orders = await db.work_orders.find(query, {"_id": 0}).to_list(500)
    return {"success": True, "data": {"work_orders": orders, "total": len(orders)}}


@router.get("/work-orders/{external_order_id}")
async def get_work_order_status(
    external_order_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get status of a specific work order"""
    partner = await get_partner_by_api_key(api_key)
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    order = await db.work_orders.find_one(
        {"partner_id": partner["partner_id"], "external_order_id": external_order_id},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    return {"success": True, "data": {"work_order": order}}


# ============== Franchisee (Employer) Endpoints ==============

@router.get("/employer/work-orders")
async def get_franchisee_work_orders(
    status: Optional[str] = None,
    fsa: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    employer_id: str = Header(..., alias="X-Employer-ID")
):
    """Get work orders for franchisee's territories"""
    # Build query for this employer's orders
    query = {"franchisee_id": employer_id}
    
    if status:
        query["status"] = status
    if fsa:
        query["fsa"] = fsa.upper()[:3]
    if date_from:
        query["scheduled_date"] = {"$gte": date_from}
    if date_to:
        if "scheduled_date" in query:
            query["scheduled_date"]["$lte"] = date_to
        else:
            query["scheduled_date"] = {"$lte": date_to}
    
    orders = await db.work_orders.find(query, {"_id": 0}).sort("scheduled_date", 1).skip(offset).limit(limit).to_list(limit)
    total = await db.work_orders.count_documents(query)
    
    # Get summary counts
    pending_count = await db.work_orders.count_documents({"franchisee_id": employer_id, "status": "pending"})
    accepted_count = await db.work_orders.count_documents({"franchisee_id": employer_id, "status": "accepted"})
    assigned_count = await db.work_orders.count_documents({"franchisee_id": employer_id, "status": "assigned"})
    completed_count = await db.work_orders.count_documents({"franchisee_id": employer_id, "status": "completed"})
    
    return {
        "success": True,
        "data": {
            "work_orders": orders,
            "total": total,
            "summary": {
                "pending": pending_count,
                "accepted": accepted_count,
                "assigned": assigned_count,
                "completed": completed_count
            }
        }
    }


@router.post("/employer/work-orders/{order_id}/accept")
async def accept_work_order(
    order_id: str,
    employer_id: str = Header(..., alias="X-Employer-ID")
):
    """Franchisee accepts a work order"""
    order = await db.work_orders.find_one({"hrbank_order_id": order_id, "franchisee_id": employer_id})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    if order["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot accept order in {order['status']} status")
    
    await db.work_orders.update_one(
        {"hrbank_order_id": order_id},
        {"$set": {
            "status": "accepted",
            "accepted_date": datetime.now(timezone.utc).isoformat(),
            "updated_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Work order accepted"}


@router.post("/employer/work-orders/{order_id}/decline")
async def decline_work_order(
    order_id: str,
    data: dict,
    background_tasks: BackgroundTasks,
    employer_id: str = Header(..., alias="X-Employer-ID")
):
    """Franchisee declines a work order"""
    order = await db.work_orders.find_one({"hrbank_order_id": order_id, "franchisee_id": employer_id})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    reason = data.get("reason", "")
    
    await db.work_orders.update_one(
        {"hrbank_order_id": order_id},
        {"$set": {
            "status": "declined",
            "decline_reason": reason,
            "declined_date": datetime.now(timezone.utc).isoformat(),
            "updated_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify partner via webhook
    partner = await db.partners.find_one({"partner_id": order["partner_id"]})
    if partner and partner.get("webhook_url"):
        background_tasks.add_task(
            send_webhook,
            partner["webhook_url"],
            {
                "event": "work_order.declined",
                "external_order_id": order["external_order_id"],
                "reason": reason,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            partner["webhook_secret"]
        )
    
    return {"success": True, "message": "Work order declined"}


@router.post("/employer/work-orders/{order_id}/assign")
async def assign_workers_to_order(
    order_id: str,
    data: dict,
    background_tasks: BackgroundTasks,
    employer_id: str = Header(..., alias="X-Employer-ID")
):
    """
    Assign workers to work order and create route-based shifts.
    This creates actual shifts in HR Bank's shift system.
    """
    order = await db.work_orders.find_one({"hrbank_order_id": order_id, "franchisee_id": employer_id})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    if order["status"] not in ["pending", "accepted"]:
        raise HTTPException(status_code=400, detail=f"Cannot assign workers to {order['status']} order")
    
    worker_ids = data.get("worker_ids", [])
    if not worker_ids:
        raise HTTPException(status_code=400, detail="At least one worker required")
    
    # Verify workers belong to this employer
    for worker_id in worker_ids:
        employment = await db.employment_records.find_one({
            "workforce_id": worker_id,
            "employer_id": employer_id,
            "status": "active"
        })
        if not employment:
            raise HTTPException(status_code=400, detail=f"Worker {worker_id} is not employed by you")
    
    # Get employer's workplace for this territory
    workplace = await db.workplaces.find_one({
        "employer_id": employer_id,
        "status": "active"
    })
    
    if not workplace:
        raise HTTPException(status_code=400, detail="No active workplace found. Create a workplace first.")
    
    # Create shifts for each worker
    shift_ids = []
    now = datetime.now(timezone.utc).isoformat()
    
    for worker_id in worker_ids:
        shift_id = f"shift_{uuid.uuid4().hex[:12]}"
        
        # Build start/end datetime
        start_datetime = f"{order['scheduled_date']}T{order['time_window_start']}:00"
        
        # Calculate end time based on duration
        start_hour, start_min = map(int, order['time_window_start'].split(':'))
        duration_hours = order['estimated_duration_hours']
        end_hour = start_hour + int(duration_hours)
        end_min = start_min + int((duration_hours % 1) * 60)
        if end_min >= 60:
            end_hour += 1
            end_min -= 60
        end_datetime = f"{order['scheduled_date']}T{end_hour:02d}:{end_min:02d}:00"
        
        shift = {
            "shift_id": shift_id,
            "employer_id": employer_id,
            "workplace_id": workplace["workplace_id"],
            "workforce_id": worker_id,
            "work_order_id": order_id,  # Link to work order
            "partner_id": order["partner_id"],
            
            # Shift details
            "title": f"{order['service_type'].replace('_', ' ').title()} - {order['customer_name']}",
            "description": order.get("special_instructions", ""),
            "shift_type": "route_based",  # This is key - route-based shift
            
            # Location (service address, not workplace)
            "service_address": order["service_address"],
            "service_city": order["service_city"],
            "service_postal_code": order["service_postal_code"],
            
            # Timing
            "shift_date": order["scheduled_date"],
            "start_time": start_datetime,
            "end_time": end_datetime,
            "duration_hours": duration_hours,
            
            # Pay
            "hourly_rate": order["hourly_rate"],
            "estimated_pay": round(duration_hours * order["hourly_rate"], 2),
            
            # Status
            "status": "scheduled",
            "created_date": now,
            "updated_date": now
        }
        
        await db.shifts.insert_one(shift)
        shift_ids.append(shift_id)
        
        # Notify worker
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:8]}",
            "user_id": worker_id,
            "type": "shift_assigned",
            "title": "New Shift Assigned",
            "message": f"You have been assigned a new shift: {shift['title']} on {order['scheduled_date']}",
            "data": {"shift_id": shift_id, "work_order_id": order_id},
            "read": False,
            "created_date": now
        })
    
    # Update work order
    await db.work_orders.update_one(
        {"hrbank_order_id": order_id},
        {"$set": {
            "status": "assigned",
            "assigned_workers": worker_ids,
            "shift_ids": shift_ids,
            "assigned_date": now,
            "updated_date": now
        }}
    )
    
    # Notify partner
    partner = await db.partners.find_one({"partner_id": order["partner_id"]})
    if partner and partner.get("webhook_url"):
        background_tasks.add_task(
            send_webhook,
            partner["webhook_url"],
            {
                "event": "work_order.assigned",
                "external_order_id": order["external_order_id"],
                "workers_assigned": len(worker_ids),
                "scheduled_date": order["scheduled_date"],
                "timestamp": now
            },
            partner["webhook_secret"]
        )
    
    return {
        "success": True,
        "data": {
            "shift_ids": shift_ids,
            "workers_assigned": len(worker_ids),
            "message": f"Created {len(shift_ids)} shifts for work order"
        }
    }


@router.get("/employer/available-workers")
async def get_available_workers_for_order(
    order_id: str,
    employer_id: str = Header(..., alias="X-Employer-ID")
):
    """Get available workers for a work order based on schedule and skills"""
    order = await db.work_orders.find_one({"hrbank_order_id": order_id, "franchisee_id": employer_id})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Get all active workers for this employer
    employments = await db.employment_records.find({
        "employer_id": employer_id,
        "status": "active"
    }).to_list(100)
    
    worker_ids = [e["workforce_id"] for e in employments]
    
    # Check availability for each worker
    available_workers = []
    
    for worker_id in worker_ids:
        # Get worker profile
        profile = await db.workforce_profiles.find_one({"user_id": worker_id})
        if not profile:
            continue
        
        # Check for conflicting shifts on that date
        conflicts = await db.shifts.find_one({
            "workforce_id": worker_id,
            "shift_date": order["scheduled_date"],
            "status": {"$in": ["scheduled", "active", "in_progress"]}
        })
        
        is_available = conflicts is None
        
        worker_info = {
            "worker_id": worker_id,
            "name": profile.get("full_name", "Unknown"),
            "email": profile.get("email", ""),
            "phone": profile.get("phone", ""),
            "is_available": is_available,
            "conflict_reason": "Already has shift on this date" if conflicts else None,
            "skills": profile.get("skills", []),
            "certifications": profile.get("certifications", []),
            "rating": profile.get("average_rating", 0)
        }
        
        available_workers.append(worker_info)
    
    # Sort by availability then rating
    available_workers.sort(key=lambda w: (not w["is_available"], -w["rating"]))
    
    return {
        "success": True,
        "data": {
            "workers": available_workers,
            "total": len(available_workers),
            "available_count": sum(1 for w in available_workers if w["is_available"])
        }
    }


# ============== Status Update Endpoints ==============

@router.post("/employer/work-orders/{order_id}/complete")
async def complete_work_order(
    order_id: str,
    data: dict,
    background_tasks: BackgroundTasks,
    employer_id: str = Header(..., alias="X-Employer-ID")
):
    """Mark work order as completed"""
    order = await db.work_orders.find_one({"hrbank_order_id": order_id, "franchisee_id": employer_id})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.work_orders.update_one(
        {"hrbank_order_id": order_id},
        {"$set": {
            "status": "completed",
            "completed_date": now,
            "completion_notes": data.get("notes", ""),
            "updated_date": now
        }}
    )
    
    # Update partner stats
    await db.partners.update_one(
        {"partner_id": order["partner_id"]},
        {"$inc": {"work_orders_completed": 1}}
    )
    
    # Notify partner
    partner = await db.partners.find_one({"partner_id": order["partner_id"]})
    if partner and partner.get("webhook_url"):
        background_tasks.add_task(
            send_webhook,
            partner["webhook_url"],
            {
                "event": "work_order.completed",
                "external_order_id": order["external_order_id"],
                "completed_at": now,
                "notes": data.get("notes", "")
            },
            partner["webhook_secret"]
        )
    
    return {"success": True, "message": "Work order marked as completed"}


# ============== Helper Background Tasks ==============

async def notify_franchisee_new_order(employer_id: str, order_id: str, service_type: str, scheduled_date: str):
    """Send notification to franchisee about new work order"""
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:8]}",
        "user_id": employer_id,
        "type": "new_work_order",
        "title": "New Work Order",
        "message": f"New {service_type.replace('_', ' ')} work order for {scheduled_date}",
        "data": {"work_order_id": order_id},
        "read": False,
        "created_date": datetime.now(timezone.utc).isoformat()
    })
