"""
CleanGrid Work Order API - Webhook integration for work order dispatch
CleanGrid sends work orders with franchisee email → HR Bank routes to employer → Franchisee assigns workers
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


# CleanGrid webhook payload models
class FranchiseeInfo(BaseModel):
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None


class ServiceInfo(BaseModel):
    name: str
    type: str  # residential, commercial, etc.
    scheduledDate: str  # ISO datetime
    estimatedDuration: int  # minutes


class LocationInfo(BaseModel):
    address: str
    postalCode: str
    fsaCode: Optional[str] = None


class CustomerInfo(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class PaymentInfo(BaseModel):
    totalPrice: float
    escrowStatus: str  # held, released, etc.


class CleanGridWorkOrder(BaseModel):
    """Work order payload from CleanGrid"""
    cleangrid_booking_id: str
    franchisee: FranchiseeInfo
    service: ServiceInfo
    location: LocationInfo
    customer: CustomerInfo
    payment: PaymentInfo
    special_instructions: Optional[str] = None
    workers_needed: int = 1
    priority: str = "normal"  # normal, high, urgent


class WorkOrderAssignment(BaseModel):
    """Assign work order to worker"""
    worker_ids: List[str]
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


async def get_employer_by_email(email: str) -> Optional[dict]:
    """Find employer by email - checks users and employer_profiles"""
    # First try users collection
    user = await db.users.find_one({"email": email.lower(), "user_type": "employer"})
    if user:
        profile = await db.employer_profiles.find_one({"user_id": user["user_id"]})
        if profile:
            return {**profile, "user_id": user["user_id"], "email": email}
        return {"user_id": user["user_id"], "email": email, "company_name": user.get("company_name", "")}
    
    # Try employer_profiles directly
    profile = await db.employer_profiles.find_one({"email": email.lower()})
    return profile


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


# ============== CleanGrid Webhook Endpoint ==============

@router.post("/work-orders")
async def receive_work_order(
    work_order: CleanGridWorkOrder,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """
    Receive work order from CleanGrid.
    Routes to franchisee based on franchisee.email lookup.
    """
    partner = await get_partner_by_api_key(api_key)
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Check for duplicate
    existing = await db.work_orders.find_one({
        "partner_id": partner["partner_id"],
        "external_order_id": work_order.cleangrid_booking_id
    })
    
    if existing:
        # Update existing order
        await db.work_orders.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "service_type": work_order.service.type,
                "service_name": work_order.service.name,
                "scheduled_datetime": work_order.service.scheduledDate,
                "estimated_duration_minutes": work_order.service.estimatedDuration,
                "service_address": work_order.location.address,
                "service_postal_code": work_order.location.postalCode,
                "customer_name": work_order.customer.name,
                "customer_phone": work_order.customer.phone,
                "customer_email": work_order.customer.email,
                "total_price": work_order.payment.totalPrice,
                "escrow_status": work_order.payment.escrowStatus,
                "special_instructions": work_order.special_instructions,
                "workers_needed": work_order.workers_needed,
                "priority": work_order.priority,
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
    
    # Look up franchisee by email
    franchisee = await get_employer_by_email(work_order.franchisee.email)
    
    if not franchisee:
        # Log unroutable order but still accept it
        hrbank_order_id = f"wo_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        
        order = {
            "hrbank_order_id": hrbank_order_id,
            "partner_id": partner["partner_id"],
            "partner_name": partner["partner_name"],
            "external_order_id": work_order.cleangrid_booking_id,
            
            # Franchisee info (not found in HR Bank)
            "franchisee_email": work_order.franchisee.email,
            "franchisee_name": work_order.franchisee.name,
            "franchisee_phone": work_order.franchisee.phone,
            "franchisee_id": None,  # Not found
            
            # Service details
            "service_type": work_order.service.type,
            "service_name": work_order.service.name,
            "scheduled_datetime": work_order.service.scheduledDate,
            "estimated_duration_minutes": work_order.service.estimatedDuration,
            
            # Location
            "service_address": work_order.location.address,
            "service_postal_code": work_order.location.postalCode,
            "fsa": work_order.location.fsaCode or work_order.location.postalCode[:3].upper(),
            
            # Customer
            "customer_name": work_order.customer.name,
            "customer_phone": work_order.customer.phone,
            "customer_email": work_order.customer.email,
            
            # Payment
            "total_price": work_order.payment.totalPrice,
            "escrow_status": work_order.payment.escrowStatus,
            
            # Details
            "special_instructions": work_order.special_instructions,
            "workers_needed": work_order.workers_needed,
            "priority": work_order.priority,
            
            # Status
            "status": "unroutable",  # Franchisee not found in HR Bank
            "status_reason": f"Franchisee email {work_order.franchisee.email} not found in HR Bank",
            "assigned_workers": [],
            "shift_ids": [],
            
            "created_date": now,
            "updated_date": now
        }
        
        await db.work_orders.insert_one(order)
        await db.partners.update_one(
            {"partner_id": partner["partner_id"]},
            {"$inc": {"work_orders_received": 1}}
        )
        
        return {
            "success": True,
            "data": {
                "hrbank_order_id": hrbank_order_id,
                "status": "unroutable",
                "reason": f"Franchisee {work_order.franchisee.email} not registered in HR Bank. They need to create an employer account first."
            }
        }
    
    # Franchisee found - create work order
    hrbank_order_id = f"wo_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Parse scheduled datetime
    scheduled_date = work_order.service.scheduledDate[:10]  # YYYY-MM-DD
    scheduled_time = work_order.service.scheduledDate[11:16] if len(work_order.service.scheduledDate) > 10 else "09:00"
    
    # Calculate end time
    duration_hours = work_order.service.estimatedDuration / 60
    
    order = {
        "hrbank_order_id": hrbank_order_id,
        "partner_id": partner["partner_id"],
        "partner_name": partner["partner_name"],
        "external_order_id": work_order.cleangrid_booking_id,
        
        # Franchisee (matched)
        "franchisee_id": franchisee["user_id"],
        "franchisee_email": work_order.franchisee.email,
        "franchisee_name": work_order.franchisee.name or franchisee.get("company_name", ""),
        "franchisee_phone": work_order.franchisee.phone,
        
        # Service details
        "service_type": work_order.service.type,
        "service_name": work_order.service.name,
        "scheduled_datetime": work_order.service.scheduledDate,
        "scheduled_date": scheduled_date,
        "time_window_start": scheduled_time,
        "estimated_duration_minutes": work_order.service.estimatedDuration,
        "estimated_duration_hours": duration_hours,
        
        # Location
        "service_address": work_order.location.address,
        "service_postal_code": work_order.location.postalCode,
        "fsa": work_order.location.fsaCode or work_order.location.postalCode[:3].upper(),
        
        # Customer
        "customer_name": work_order.customer.name,
        "customer_phone": work_order.customer.phone,
        "customer_email": work_order.customer.email,
        
        # Payment
        "total_price": work_order.payment.totalPrice,
        "escrow_status": work_order.payment.escrowStatus,
        "hourly_rate": round(work_order.payment.totalPrice / duration_hours, 2) if duration_hours > 0 else 0,
        
        # Details
        "special_instructions": work_order.special_instructions,
        "workers_needed": work_order.workers_needed,
        "priority": work_order.priority,
        
        # Status
        "status": "pending",
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
    
    # Notify franchisee
    background_tasks.add_task(
        notify_franchisee_new_order,
        franchisee["user_id"],
        hrbank_order_id,
        work_order.service.name,
        scheduled_date
    )
    
    return {
        "success": True,
        "data": {
            "hrbank_order_id": hrbank_order_id,
            "franchisee_matched": True,
            "franchisee_name": franchisee.get("company_name", work_order.franchisee.name),
            "status": "pending"
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
    """Get status of a specific work order by CleanGrid booking ID"""
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
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    employer_id: str = Header(..., alias="X-Employer-ID")
):
    """Get work orders for this franchisee"""
    query = {"franchisee_id": employer_id}
    
    if status:
        query["status"] = status
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
    
    # Notify CleanGrid via webhook
    partner = await db.partners.find_one({"partner_id": order["partner_id"]})
    if partner and partner.get("webhook_url"):
        background_tasks.add_task(
            send_webhook,
            partner["webhook_url"],
            {
                "event": "work_order.declined",
                "cleangrid_booking_id": order["external_order_id"],
                "hrbank_order_id": order_id,
                "reason": reason,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            partner["webhook_secret"]
        )
    
    return {"success": True, "message": "Work order declined"}


@router.post("/employer/work-orders/{order_id}/assign")
async def assign_workers_to_order(
    order_id: str,
    data: WorkOrderAssignment,
    background_tasks: BackgroundTasks,
    employer_id: str = Header(..., alias="X-Employer-ID")
):
    """
    Assign workers to work order and create route-based shifts.
    """
    order = await db.work_orders.find_one({"hrbank_order_id": order_id, "franchisee_id": employer_id})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    if order["status"] not in ["pending", "accepted"]:
        raise HTTPException(status_code=400, detail=f"Cannot assign workers to {order['status']} order")
    
    worker_ids = data.worker_ids
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
    
    # Get employer's workplace
    workplace = await db.workplaces.find_one({
        "employer_id": employer_id,
        "status": "active"
    })
    
    if not workplace:
        raise HTTPException(status_code=400, detail="No active workplace found. Create a workplace first.")
    
    # Create shifts for each worker
    shift_ids = []
    now = datetime.now(timezone.utc).isoformat()
    duration_hours = order.get("estimated_duration_hours", order.get("estimated_duration_minutes", 120) / 60)
    
    for worker_id in worker_ids:
        shift_id = f"shift_{uuid.uuid4().hex[:12]}"
        
        # Parse scheduled time
        scheduled_date = order.get("scheduled_date", order.get("scheduled_datetime", "")[:10])
        start_time = order.get("time_window_start", "09:00")
        
        # Calculate end time
        start_hour, start_min = map(int, start_time.split(':'))
        end_hour = start_hour + int(duration_hours)
        end_min = start_min + int((duration_hours % 1) * 60)
        if end_min >= 60:
            end_hour += 1
            end_min -= 60
        
        start_datetime = f"{scheduled_date}T{start_time}:00"
        end_datetime = f"{scheduled_date}T{end_hour:02d}:{end_min:02d}:00"
        
        hourly_rate = order.get("hourly_rate", 22.00)
        
        shift = {
            "shift_id": shift_id,
            "employer_id": employer_id,
            "workplace_id": workplace["workplace_id"],
            "workforce_id": worker_id,
            "work_order_id": order_id,
            "partner_id": order["partner_id"],
            "cleangrid_booking_id": order["external_order_id"],
            
            # Shift details
            "title": f"{order.get('service_name', order.get('service_type', 'Cleaning'))} - {order['customer_name']}",
            "description": order.get("special_instructions", ""),
            "shift_type": "route_based",
            
            # Location (service address)
            "service_address": order["service_address"],
            "service_postal_code": order["service_postal_code"],
            
            # Timing
            "shift_date": scheduled_date,
            "start_time": start_datetime,
            "end_time": end_datetime,
            "duration_hours": duration_hours,
            
            # Pay
            "hourly_rate": hourly_rate,
            "estimated_pay": round(duration_hours * hourly_rate, 2),
            "total_price": order.get("total_price", 0),
            
            # Customer contact
            "customer_name": order["customer_name"],
            "customer_phone": order.get("customer_phone"),
            
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
            "title": "New Cleaning Job Assigned",
            "message": f"You have been assigned: {shift['title']} on {scheduled_date} at {start_time}",
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
    
    # Notify CleanGrid
    partner = await db.partners.find_one({"partner_id": order["partner_id"]})
    if partner and partner.get("webhook_url"):
        background_tasks.add_task(
            send_webhook,
            partner["webhook_url"],
            {
                "event": "work_order.assigned",
                "cleangrid_booking_id": order["external_order_id"],
                "hrbank_order_id": order_id,
                "workers_assigned": len(worker_ids),
                "scheduled_date": scheduled_date,
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
    """Get available workers for a work order"""
    order = await db.work_orders.find_one({"hrbank_order_id": order_id, "franchisee_id": employer_id})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Get all active workers for this employer
    employments = await db.employment_records.find({
        "employer_id": employer_id,
        "status": "active"
    }).to_list(100)
    
    worker_ids = [e["workforce_id"] for e in employments]
    scheduled_date = order.get("scheduled_date", order.get("scheduled_datetime", "")[:10])
    
    available_workers = []
    
    for worker_id in worker_ids:
        profile = await db.workforce_profiles.find_one({"user_id": worker_id})
        if not profile:
            # Try users collection
            user = await db.users.find_one({"user_id": worker_id})
            profile = user or {}
        
        # Check for conflicting shifts
        conflicts = await db.shifts.find_one({
            "workforce_id": worker_id,
            "shift_date": scheduled_date,
            "status": {"$in": ["scheduled", "active", "in_progress"]}
        })
        
        is_available = conflicts is None
        
        worker_info = {
            "worker_id": worker_id,
            "name": profile.get("full_name", profile.get("name", "Unknown")),
            "email": profile.get("email", ""),
            "phone": profile.get("phone", ""),
            "is_available": is_available,
            "conflict_reason": "Already has shift on this date" if conflicts else None,
            "skills": profile.get("skills", []),
            "rating": profile.get("average_rating", 0)
        }
        
        available_workers.append(worker_info)
    
    available_workers.sort(key=lambda w: (not w["is_available"], -w["rating"]))
    
    return {
        "success": True,
        "data": {
            "workers": available_workers,
            "total": len(available_workers),
            "available_count": sum(1 for w in available_workers if w["is_available"])
        }
    }


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
    
    # Notify CleanGrid
    partner = await db.partners.find_one({"partner_id": order["partner_id"]})
    if partner and partner.get("webhook_url"):
        background_tasks.add_task(
            send_webhook,
            partner["webhook_url"],
            {
                "event": "work_order.completed",
                "cleangrid_booking_id": order["external_order_id"],
                "hrbank_order_id": order_id,
                "completed_at": now,
                "notes": data.get("notes", "")
            },
            partner["webhook_secret"]
        )
    
    return {"success": True, "message": "Work order marked as completed"}


# ============== Background Tasks ==============

async def notify_franchisee_new_order(employer_id: str, order_id: str, service_name: str, scheduled_date: str):
    """Send notification to franchisee about new work order"""
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:8]}",
        "user_id": employer_id,
        "type": "new_work_order",
        "title": "New CleanGrid Work Order",
        "message": f"New booking: {service_name} on {scheduled_date}",
        "data": {"work_order_id": order_id},
        "read": False,
        "created_date": datetime.now(timezone.utc).isoformat()
    })
