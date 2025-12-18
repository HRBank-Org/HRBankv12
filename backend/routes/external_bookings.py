"""
External Bookings API for CleanGrid/Neatify Integration

This API allows external booking systems to push service tasks into HR Bank.
Tasks are automatically routed to the correct franchisee based on FSA.

Authentication: API Key based (not JWT)
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from typing import Dict, Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import os
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
    # Check if key exists in database
    key_record = await db.external_api_keys.find_one(
        {"api_key": x_api_key, "is_active": True},
        {"_id": 0}
    )
    
    if not key_record:
        raise HTTPException(
            status_code=401,
            detail="Invalid or inactive API key"
        )
    
    # Update last used timestamp
    await db.external_api_keys.update_one(
        {"api_key": x_api_key},
        {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
    )
    
    return key_record


# Request/Response Models
class BookingAddress(BaseModel):
    """Address for the booking"""
    street_address: str
    unit_number: Optional[str] = None
    city: str
    province: str
    postal_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class BookingClient(BaseModel):
    """Client information"""
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    access_notes: Optional[str] = None


class CreateBookingRequest(BaseModel):
    """Request to create a booking from external system"""
    # External reference
    external_booking_id: str = Field(..., description="Booking ID from Neatify/CleanGrid")
    external_source: str = Field(default="neatify", description="Source system name")
    
    # Service details
    service_type: str = Field(default="cleaning", description="Type of service")
    title: str = Field(..., description="Booking title/description")
    description: Optional[str] = None
    
    # Location
    address: BookingAddress
    
    # Client
    client: BookingClient
    
    # Schedule
    scheduled_date: str = Field(..., description="YYYY-MM-DD")
    scheduled_start_time: str = Field(..., description="HH:MM")
    scheduled_end_time: str = Field(..., description="HH:MM")
    estimated_duration_minutes: int = 60
    
    # Pricing (optional)
    price: Optional[float] = None
    currency: str = "CAD"
    
    # Priority
    priority: int = Field(default=5, ge=1, le=10)


class BookingResponse(BaseModel):
    """Response after creating a booking"""
    success: bool
    task_id: Optional[str] = None
    workplace_id: Optional[str] = None
    workplace_name: Optional[str] = None
    franchisee_name: Optional[str] = None
    fsa: str
    message: str


class FSARoutingInfo(BaseModel):
    """Information about FSA routing"""
    fsa: str
    workplace_id: str
    workplace_name: str
    employer_id: str
    employer_name: Optional[str] = None


# ==================== API Endpoints ====================

@router.post("", response_model=BookingResponse)
async def create_booking(
    booking: CreateBookingRequest,
    api_key_info: dict = Depends(verify_api_key),
    db = Depends(get_db)
):
    """
    Create a booking from external system (Neatify/CleanGrid).
    
    The booking is automatically routed to the correct franchisee based on FSA.
    If no franchisee serves the FSA, returns an error.
    """
    # Extract FSA from postal code
    fsa = booking.address.postal_code[:3].upper()
    
    # Find workplace that serves this FSA
    workplace = await db.workplaces.find_one(
        {
            "work_mode": "field_service",
            "service_fsas": fsa,
            "status": {"$ne": "inactive"}
        },
        {"_id": 0}
    )
    
    if not workplace:
        # No franchisee serves this area
        return BookingResponse(
            success=False,
            fsa=fsa,
            message=f"No service provider found for FSA {fsa}. This area is not currently served."
        )
    
    # Get employer info
    employer = await db.users.find_one(
        {"user_id": workplace["employer_id"]},
        {"_id": 0, "first_name": 1, "last_name": 1, "company_name": 1}
    )
    
    employer_name = None
    if employer:
        employer_name = employer.get("company_name") or f"{employer.get('first_name', '')} {employer.get('last_name', '')}".strip()
    
    # Map service type to TaskType
    task_type_map = {
        "cleaning": TaskType.CLEANING,
        "home_care": TaskType.HOME_CARE,
        "field_service": TaskType.FIELD_SERVICE,
        "delivery": TaskType.DELIVERY,
        "inspection": TaskType.INSPECTION,
        "maintenance": TaskType.MAINTENANCE
    }
    task_type = task_type_map.get(booking.service_type.lower(), TaskType.OTHER)
    
    # Create task address
    task_address = TaskAddress(
        street_address=booking.address.street_address,
        unit_number=booking.address.unit_number,
        city=booking.address.city,
        province=booking.address.province,
        postal_code=booking.address.postal_code,
        fsa=fsa,
        latitude=booking.address.latitude,
        longitude=booking.address.longitude,
        client_name=booking.client.name,
        client_phone=booking.client.phone,
        access_notes=booking.client.access_notes
    )
    
    # Create the task
    task = Task(
        employer_id=workplace["employer_id"],
        workplace_id=workplace["workplace_id"],
        external_ref=booking.external_booking_id,
        external_source=booking.external_source,
        task_type=task_type,
        title=booking.title,
        description=booking.description,
        address=task_address,
        scheduled_date=booking.scheduled_date,
        scheduled_start_time=booking.scheduled_start_time,
        scheduled_end_time=booking.scheduled_end_time,
        estimated_duration_minutes=booking.estimated_duration_minutes,
        priority=booking.priority,
        billing_amount=booking.price,
        status=TaskStatus.PENDING
    )
    
    # Save to database
    await db.service_tasks.insert_one(task.model_dump())
    
    return BookingResponse(
        success=True,
        task_id=task.task_id,
        workplace_id=workplace["workplace_id"],
        workplace_name=workplace.get("workplace_name", ""),
        franchisee_name=employer_name,
        fsa=fsa,
        message=f"Booking routed to {workplace.get('workplace_name', 'franchisee')} successfully"
    )


@router.get("/check-coverage/{postal_code}", response_model=Dict)
async def check_coverage(
    postal_code: str,
    api_key_info: dict = Depends(verify_api_key),
    db = Depends(get_db)
):
    """
    Check if a postal code/FSA is covered by any franchisee.
    Useful for Neatify to show availability before booking.
    """
    fsa = postal_code[:3].upper()
    
    workplace = await db.workplaces.find_one(
        {
            "work_mode": "field_service",
            "service_fsas": fsa,
            "status": {"$ne": "inactive"}
        },
        {"_id": 0, "workplace_id": 1, "workplace_name": 1, "service_fsas": 1}
    )
    
    if workplace:
        return {
            "success": True,
            "covered": True,
            "fsa": fsa,
            "workplace_name": workplace.get("workplace_name"),
            "message": f"Service available in {fsa}"
        }
    else:
        return {
            "success": True,
            "covered": False,
            "fsa": fsa,
            "message": f"No service provider in {fsa} yet"
        }


@router.get("/booking/{external_booking_id}", response_model=Dict)
async def get_booking_status(
    external_booking_id: str,
    api_key_info: dict = Depends(verify_api_key),
    db = Depends(get_db)
):
    """
    Get status of a booking by external reference ID.
    Allows Neatify to check task status.
    """
    task = await db.service_tasks.find_one(
        {"external_ref": external_booking_id},
        {"_id": 0}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {
        "success": True,
        "data": {
            "external_booking_id": external_booking_id,
            "task_id": task.get("task_id"),
            "status": task.get("status"),
            "worker_assigned": task.get("worker_id") is not None,
            "scheduled_date": task.get("scheduled_date"),
            "scheduled_start_time": task.get("scheduled_start_time"),
            "actual_start_time": task.get("actual_start_time"),
            "actual_end_time": task.get("actual_end_time"),
            "actual_duration_minutes": task.get("actual_duration_minutes"),
            "completed": task.get("status") == "completed"
        }
    }


@router.delete("/booking/{external_booking_id}", response_model=Dict)
async def cancel_booking(
    external_booking_id: str,
    reason: Optional[str] = Query(None),
    api_key_info: dict = Depends(verify_api_key),
    db = Depends(get_db)
):
    """
    Cancel a booking by external reference ID.
    Only works if task is not yet completed.
    """
    task = await db.service_tasks.find_one(
        {"external_ref": external_booking_id},
        {"_id": 0}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if task.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed booking")
    
    await db.service_tasks.update_one(
        {"external_ref": external_booking_id},
        {"$set": {
            "status": TaskStatus.CANCELLED.value,
            "notes": f"Cancelled via external API. Reason: {reason or 'Not provided'}",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Booking cancelled successfully"
    }


@router.get("/fsas", response_model=Dict)
async def list_covered_fsas(
    api_key_info: dict = Depends(verify_api_key),
    db = Depends(get_db)
):
    """
    List all FSAs currently covered by franchisees.
    Useful for Neatify to show service area map.
    """
    workplaces = await db.workplaces.find(
        {
            "work_mode": "field_service",
            "service_fsas": {"$exists": True, "$ne": []},
            "status": {"$ne": "inactive"}
        },
        {"_id": 0, "workplace_name": 1, "service_fsas": 1, "city": 1, "province": 1}
    ).to_list(100)
    
    # Aggregate all FSAs
    all_fsas = set()
    fsa_details = []
    
    for wp in workplaces:
        for fsa in wp.get("service_fsas", []):
            if fsa not in all_fsas:
                all_fsas.add(fsa)
                fsa_details.append({
                    "fsa": fsa,
                    "workplace": wp.get("workplace_name"),
                    "city": wp.get("city"),
                    "province": wp.get("province")
                })
    
    return {
        "success": True,
        "data": {
            "total_fsas": len(all_fsas),
            "fsas": sorted(list(all_fsas)),
            "details": fsa_details
        }
    }


# ==================== API Key Management (Admin) ====================

@router.post("/api-keys/generate", response_model=Dict)
async def generate_api_key(
    name: str = Query(..., description="Name/description for this API key"),
    source_system: str = Query(default="neatify", description="Source system name"),
    db = Depends(get_db)
):
    """
    Generate a new API key for external system integration.
    This endpoint should be protected by admin auth in production.
    """
    # Generate secure API key
    api_key = f"hrb_{secrets.token_urlsafe(32)}"
    
    key_record = {
        "api_key": api_key,
        "name": name,
        "source_system": source_system,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used": None
    }
    
    await db.external_api_keys.insert_one(key_record)
    
    return {
        "success": True,
        "data": {
            "api_key": api_key,
            "name": name,
            "source_system": source_system
        },
        "message": "API key generated. Store this securely - it won't be shown again."
    }
