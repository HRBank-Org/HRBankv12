"""
External Bookings API for Neatify Integration

This API receives work orders from Neatify and creates service tasks in HR Bank.
Tasks are automatically routed to the correct franchisee based on FSA.

Authentication: API Key based (X-API-Key header)
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from typing import Dict, Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import secrets

from models.tasks import Task, TaskStatus, TaskType, TaskAddress

router = APIRouter(prefix="/external/bookings", tags=["external-bookings"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


# API Key validation
async def verify_api_key(
    x_api_key: str = Header(..., description="External API Key"),
    db = Depends(get_db)
):
    """Verify the external API key"""
    key_record = await db.external_api_keys.find_one(
        {"api_key": x_api_key, "is_active": True},
        {"_id": 0}
    )
    
    if not key_record:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    
    await db.external_api_keys.update_one(
        {"api_key": x_api_key},
        {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
    )
    
    return key_record


# ==================== Neatify Schema Models ====================

class NeatifyCustomer(BaseModel):
    """Customer info from Neatify users collection"""
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class NeatifyProperty(BaseModel):
    """Property details (optional, for access info)"""
    apartmentNumber: Optional[str] = None
    buzzNumber: Optional[str] = None
    notes: Optional[str] = None


class NeatifyBooking(BaseModel):
    """
    Neatify Work Order / Booking structure
    Matches the exact schema from Neatify's bookings collection
    """
    # Neatify IDs - use alias for _id since Pydantic doesn't allow leading underscores
    id: str = Field(..., alias="_id", description="Neatify booking ObjectId")
    serviceId: str
    customerId: str
    
    # Service details
    serviceType: str  # "residential" or "commercial"
    squareFeet: Optional[int] = None
    totalPrice: Optional[float] = None
    notes: Optional[str] = None  # "Service: standard | Est. 8.1h | Crew: 3 | Add-ons: None"
    
    # Location
    address: str  # Full address string
    postalCode: str  # "N8L1E6" format
    fsaCode: Optional[str] = None  # Should be first 3 chars of postal code
    
    # Scheduling
    scheduledDate: str  # ISO datetime "2025-12-24T06:34:09.665Z"
    isRecurring: bool = False
    recurringFrequency: Optional[str] = None  # "weekly", "biweekly", "monthly"
    
    # Assignment
    franchiseeId: Optional[str] = None
    
    # Status
    status: str = "pending"  # "pending", "assigned", "in-progress", "completed", "cancelled"
    escrowStatus: Optional[str] = None  # "held", "released", "refunded"
    
    # Customer info (populated from users collection before sending)
    customer: Optional[NeatifyCustomer] = None
    
    # Property details (optional, for access notes)
    property: Optional[NeatifyProperty] = None
    
    createdAt: Optional[str] = None


class NeatifyBookingResponse(BaseModel):
    """Response after processing Neatify booking"""
    success: bool
    neatify_booking_id: str
    hrbank_task_id: Optional[str] = None
    routed_to_workplace: Optional[str] = None
    routed_to_franchisee_id: Optional[str] = None
    fsa: str
    message: str


# ==================== API Endpoints ====================

@router.post("", response_model=NeatifyBookingResponse)
async def receive_neatify_booking(
    booking: NeatifyBooking,
    api_key_info: dict = Depends(verify_api_key),
    db = Depends(get_db)
):
    """
    Receive a work order from Neatify.
    
    The booking is automatically routed to the correct HR Bank franchisee based on FSA.
    If no franchisee serves the FSA, returns success=false with message.
    
    Neatify should call this endpoint when:
    1. A new booking is created
    2. A booking is updated (status change, reschedule)
    """
    # Extract FSA from postal code (first 3 characters)
    # Note: Neatify's fsaCode field seems buggy, so we extract it ourselves
    postal_code = booking.postalCode.replace(" ", "").upper()
    fsa = postal_code[:3] if len(postal_code) >= 3 else booking.fsaCode
    
    if not fsa or len(fsa) != 3:
        return NeatifyBookingResponse(
            success=False,
            neatify_booking_id=booking.id,
            fsa=fsa or "UNKNOWN",
            message=f"Invalid postal code format: {booking.postalCode}"
        )
    
    # Find HR Bank workplace (franchisee) that serves this FSA
    workplace = await db.workplaces.find_one(
        {
            "work_mode": "field_service",
            "service_fsas": fsa,
            "status": {"$ne": "inactive"}
        },
        {"_id": 0}
    )
    
    if not workplace:
        return NeatifyBookingResponse(
            success=False,
            neatify_booking_id=booking.id,
            fsa=fsa,
            message=f"No HR Bank franchisee serves FSA {fsa}. Area not covered."
        )
    
    # Parse scheduled date
    try:
        scheduled_dt = datetime.fromisoformat(booking.scheduledDate.replace('Z', '+00:00'))
        scheduled_date = scheduled_dt.strftime('%Y-%m-%d')
        scheduled_start_time = scheduled_dt.strftime('%H:%M')
        
        # Estimate end time from notes if available (e.g., "Est. 8.1h")
        estimated_hours = 2.0  # Default 2 hours
        if booking.notes and "Est." in booking.notes:
            try:
                est_part = booking.notes.split("Est.")[1].split("h")[0].strip()
                estimated_hours = float(est_part)
            except:
                pass
        
        estimated_minutes = int(estimated_hours * 60)
        end_hour = scheduled_dt.hour + int(estimated_hours)
        end_minute = scheduled_dt.minute + int((estimated_hours % 1) * 60)
        if end_minute >= 60:
            end_hour += 1
            end_minute -= 60
        scheduled_end_time = f"{min(end_hour, 23):02d}:{end_minute:02d}"
        
    except Exception as e:
        return NeatifyBookingResponse(
            success=False,
            neatify_booking_id=booking.id,
            fsa=fsa,
            message=f"Invalid date format: {booking.scheduledDate}. Error: {str(e)}"
        )
    
    # Parse address - extract city/province if possible
    address_parts = booking.address.split(",")
    street_address = address_parts[0].strip() if address_parts else booking.address
    city = address_parts[1].strip() if len(address_parts) > 1 else ""
    province = address_parts[2].strip() if len(address_parts) > 2 else "ON"
    
    # Build access notes from property info
    access_notes_parts = []
    if booking.property:
        if booking.property.apartmentNumber:
            access_notes_parts.append(f"Unit: {booking.property.apartmentNumber}")
        if booking.property.buzzNumber:
            access_notes_parts.append(f"Buzz: {booking.property.buzzNumber}")
        if booking.property.notes:
            access_notes_parts.append(booking.property.notes)
    access_notes = " | ".join(access_notes_parts) if access_notes_parts else None
    
    # Map service type to task type
    task_type = TaskType.CLEANING  # Default for Neatify
    
    # Create task address
    task_address = TaskAddress(
        street_address=street_address,
        unit_number=booking.property.apartmentNumber if booking.property else None,
        city=city,
        province=province,
        postal_code=postal_code,
        fsa=fsa,
        client_name=booking.customer.name if booking.customer else None,
        client_phone=booking.customer.phone if booking.customer else None,
        access_notes=access_notes
    )
    
    # Build task title
    service_label = "Deep Clean" if "deep" in (booking.notes or "").lower() else "Cleaning"
    property_type = "Commercial" if booking.serviceType == "commercial" else "Residential"
    title = f"{service_label} - {property_type}"
    if booking.squareFeet:
        title += f" ({booking.squareFeet} sqft)"
    
    # Check if this booking already exists (update vs create)
    existing_task = await db.service_tasks.find_one(
        {"external_ref": booking.id},
        {"_id": 0}
    )
    
    if existing_task:
        # Update existing task
        update_data = {
            "scheduled_date": scheduled_date,
            "scheduled_start_time": scheduled_start_time,
            "scheduled_end_time": scheduled_end_time,
            "estimated_duration_minutes": estimated_minutes,
            "billing_amount": booking.totalPrice,
            "description": booking.notes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Map Neatify status to HR Bank status
        status_map = {
            "pending": TaskStatus.PENDING.value,
            "assigned": TaskStatus.ASSIGNED.value,
            "in-progress": TaskStatus.IN_PROGRESS.value,
            "completed": TaskStatus.COMPLETED.value,
            "cancelled": TaskStatus.CANCELLED.value
        }
        if booking.status in status_map:
            update_data["status"] = status_map[booking.status]
        
        await db.service_tasks.update_one(
            {"external_ref": booking.id},
            {"$set": update_data}
        )
        
        return NeatifyBookingResponse(
            success=True,
            neatify_booking_id=booking.id,
            hrbank_task_id=existing_task.get("task_id"),
            routed_to_workplace=workplace.get("workplace_name"),
            routed_to_franchisee_id=workplace.get("employer_id"),
            fsa=fsa,
            message="Booking updated in HR Bank"
        )
    
    # Create new task
    task = Task(
        employer_id=workplace["employer_id"],
        workplace_id=workplace["workplace_id"],
        external_ref=booking.id,
        external_source="neatify",
        task_type=task_type,
        title=title,
        description=booking.notes,
        address=task_address,
        scheduled_date=scheduled_date,
        scheduled_start_time=scheduled_start_time,
        scheduled_end_time=scheduled_end_time,
        estimated_duration_minutes=estimated_minutes,
        priority=5,
        billing_amount=booking.totalPrice,
        status=TaskStatus.PENDING
    )
    
    await db.service_tasks.insert_one(task.model_dump())
    
    return NeatifyBookingResponse(
        success=True,
        neatify_booking_id=booking.id,
        hrbank_task_id=task.task_id,
        routed_to_workplace=workplace.get("workplace_name"),
        routed_to_franchisee_id=workplace.get("employer_id"),
        fsa=fsa,
        message=f"Booking routed to {workplace.get('workplace_name')}"
    )


@router.get("/check-coverage/{postal_code}", response_model=Dict)
async def check_fsa_coverage(
    postal_code: str,
    api_key_info: dict = Depends(verify_api_key),
    db = Depends(get_db)
):
    """
    Check if a postal code/FSA is served by any HR Bank franchisee.
    
    Call this before showing booking confirmation in Neatify to verify
    the area is covered.
    """
    postal_code = postal_code.replace(" ", "").upper()
    fsa = postal_code[:3]
    
    workplace = await db.workplaces.find_one(
        {
            "work_mode": "field_service",
            "service_fsas": fsa,
            "status": {"$ne": "inactive"}
        },
        {"_id": 0, "workplace_id": 1, "workplace_name": 1}
    )
    
    return {
        "success": True,
        "covered": workplace is not None,
        "fsa": fsa,
        "postal_code": postal_code,
        "franchisee": workplace.get("workplace_name") if workplace else None,
        "message": f"Service {'available' if workplace else 'not available'} in {fsa}"
    }


@router.get("/booking/{neatify_booking_id}", response_model=Dict)
async def get_booking_status(
    neatify_booking_id: str,
    api_key_info: dict = Depends(verify_api_key),
    db = Depends(get_db)
):
    """
    Get HR Bank task status for a Neatify booking.
    
    Returns current status, worker assignment, and completion info.
    """
    task = await db.service_tasks.find_one(
        {"external_ref": neatify_booking_id},
        {"_id": 0}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Booking not found in HR Bank")
    
    return {
        "success": True,
        "neatify_booking_id": neatify_booking_id,
        "hrbank_task_id": task.get("task_id"),
        "status": task.get("status"),
        "worker_assigned": task.get("worker_id") is not None,
        "worker_id": task.get("worker_id"),
        "scheduled_date": task.get("scheduled_date"),
        "scheduled_start_time": task.get("scheduled_start_time"),
        "actual_start_time": task.get("actual_start_time"),
        "actual_end_time": task.get("actual_end_time"),
        "actual_duration_minutes": task.get("actual_duration_minutes"),
        "completed": task.get("status") == "completed"
    }


@router.delete("/booking/{neatify_booking_id}", response_model=Dict)
async def cancel_booking(
    neatify_booking_id: str,
    reason: Optional[str] = Query(None),
    api_key_info: dict = Depends(verify_api_key),
    db = Depends(get_db)
):
    """
    Cancel a booking in HR Bank.
    
    Call this when a booking is cancelled in Neatify.
    Cannot cancel completed tasks.
    """
    task = await db.service_tasks.find_one(
        {"external_ref": neatify_booking_id},
        {"_id": 0}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Booking not found in HR Bank")
    
    if task.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed booking")
    
    await db.service_tasks.update_one(
        {"external_ref": neatify_booking_id},
        {"$set": {
            "status": TaskStatus.CANCELLED.value,
            "notes": f"{task.get('notes', '')} | Cancelled: {reason or 'No reason provided'}",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Booking cancelled in HR Bank"
    }


@router.get("/fsas", response_model=Dict)
async def list_covered_fsas(
    api_key_info: dict = Depends(verify_api_key),
    db = Depends(get_db)
):
    """
    List all FSAs currently served by HR Bank franchisees.
    
    Use this to populate Neatify's service area map or validate
    postal codes during booking.
    """
    workplaces = await db.workplaces.find(
        {
            "work_mode": "field_service",
            "service_fsas": {"$exists": True, "$ne": []},
            "status": {"$ne": "inactive"}
        },
        {"_id": 0, "workplace_name": 1, "service_fsas": 1, "city": 1, "province": 1}
    ).to_list(100)
    
    all_fsas = set()
    for wp in workplaces:
        all_fsas.update(wp.get("service_fsas", []))
    
    return {
        "success": True,
        "total_fsas": len(all_fsas),
        "fsas": sorted(list(all_fsas)),
        "franchisees": [
            {
                "name": wp.get("workplace_name"),
                "fsas": wp.get("service_fsas"),
                "city": wp.get("city")
            }
            for wp in workplaces
        ]
    }


# ==================== API Key Management ====================

@router.post("/api-keys/generate", response_model=Dict)
async def generate_api_key(
    name: str = Query(..., description="Name for this API key"),
    db = Depends(get_db)
):
    """
    Generate a new API key for Neatify integration.
    Store this key securely - it won't be shown again.
    """
    api_key = f"hrb_{secrets.token_urlsafe(32)}"
    
    await db.external_api_keys.insert_one({
        "api_key": api_key,
        "name": name,
        "source_system": "neatify",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used": None
    })
    
    return {
        "success": True,
        "api_key": api_key,
        "message": "Store this key in Neatify's environment variables"
    }
