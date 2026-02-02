from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from auth.dependencies import require_role
from datetime import datetime, timezone, timedelta
import qrcode
import io
import base64
import uuid
import hashlib

router = APIRouter(prefix="/api/attendance", tags=["QR Attendance"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.post("/generate-qr", response_model=Dict)
async def generate_workplace_qr(
    workplace_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Generate QR code for workplace attendance
    QR codes are valid for 24 hours and include workplace verification
    """
    employer_id = current_user["user_id"]
    
    # Verify workplace belongs to employer
    workplace = await db.workplaces.find_one({
        "workplace_id": workplace_id,
        "employer_id": employer_id
    }, {"_id": 0})
    
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")
    
    # Generate unique QR code token
    token_data = f"{workplace_id}:{employer_id}:{datetime.now(timezone.utc).isoformat()}"
    qr_token = hashlib.sha256(token_data.encode()).hexdigest()[:32]
    
    # Store QR code token in database
    qr_doc = {
        "qr_token": qr_token,
        "workplace_id": workplace_id,
        "employer_id": employer_id,
        "workplace_name": workplace.get("workplace_name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "is_active": True
    }
    
    await db.qr_attendance_tokens.update_one(
        {"workplace_id": workplace_id},
        {"$set": qr_doc},
        upsert=True
    )
    
    # Generate QR code image
    qr_data = {
        "token": qr_token,
        "workplace_id": workplace_id,
        "type": "attendance_checkin"
    }
    
    # Create QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(str(qr_data))
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "success": True,
        "data": {
            "qr_token": qr_token,
            "qr_image": f"data:image/png;base64,{img_str}",
            "workplace_name": workplace.get("workplace_name"),
            "expires_at": qr_doc["expires_at"]
        }
    }


@router.post("/checkin-qr", response_model=Dict)
async def checkin_with_qr(
    qr_token: str,
    shift_id: str,
    location: Dict = None,  # {lat, lng}
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Worker checks in using QR code
    Validates QR code and optionally verifies location (geofencing)
    """
    worker_id = current_user["user_id"]
    
    # Verify QR code
    qr_doc = await db.qr_attendance_tokens.find_one({
        "qr_token": qr_token,
        "is_active": True
    }, {"_id": 0})
    
    if not qr_doc:
        raise HTTPException(status_code=404, detail="Invalid or expired QR code")
    
    # Check if QR code is expired
    if datetime.fromisoformat(qr_doc["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="QR code has expired")
    
    # Verify shift exists and belongs to worker
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "assigned_workers.worker_id": worker_id
    }, {"_id": 0})
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found or not assigned to you")
    
    # Verify workplace matches
    if shift.get("workplace_id") != qr_doc.get("workplace_id"):
        raise HTTPException(status_code=400, detail="QR code does not match shift workplace")
    
    # Optional: Verify geofencing if location provided
    geofence_verified = False
    if location and location.get("lat") and location.get("lng"):
        workplace = await db.workplaces.find_one({
            "workplace_id": qr_doc["workplace_id"]
        }, {"_id": 0, "lat": 1, "long": 1, "attendance_geofence_radius_m": 1})
        
        if workplace and workplace.get("lat") and workplace.get("long"):
            from services.geofencing_service import is_within_geofence
            geofence_verified = is_within_geofence(
                location["lat"], 
                location["lng"],
                workplace["lat"],
                workplace["long"],
                workplace.get("attendance_geofence_radius_m", 100)
            )
    
    # Record attendance
    now = datetime.now(timezone.utc).isoformat()
    attendance_id = f"att_{uuid.uuid4().hex[:12]}"
    
    attendance_doc = {
        "attendance_id": attendance_id,
        "shift_id": shift_id,
        "worker_id": worker_id,
        "employer_id": shift.get("employer_id"),
        "workplace_id": qr_doc["workplace_id"],
        "clock_in_time": now,
        "clock_in_method": "qr_code",
        "qr_token_used": qr_token,
        "geofence_verified": geofence_verified,
        "location": location,
        "created_date": now
    }
    
    await db.attendance_records.insert_one(attendance_doc)
    
    return {
        "success": True,
        "data": {
            "attendance_id": attendance_id,
            "clock_in_time": now,
            "geofence_verified": geofence_verified,
            "workplace_name": qr_doc.get("workplace_name")
        }
    }


@router.get("/workplace-qr/{workplace_id}", response_model=Dict)
async def get_workplace_qr(
    workplace_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get existing QR code for workplace or generate new one
    """
    employer_id = current_user["user_id"]
    
    # Check if QR code exists and is valid
    qr_doc = await db.qr_attendance_tokens.find_one({
        "workplace_id": workplace_id,
        "employer_id": employer_id,
        "is_active": True
    }, {"_id": 0})
    
    if qr_doc and datetime.fromisoformat(qr_doc["expires_at"]) > datetime.now(timezone.utc):
        # Generate QR image from existing token
        qr_data = {
            "token": qr_doc["qr_token"],
            "workplace_id": workplace_id,
            "type": "attendance_checkin"
        }
        
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(str(qr_data))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return {
            "success": True,
            "data": {
                "qr_token": qr_doc["qr_token"],
                "qr_image": f"data:image/png;base64,{img_str}",
                "workplace_name": qr_doc.get("workplace_name"),
                "expires_at": qr_doc["expires_at"]
            }
        }
    
    # Generate new QR code
    return await generate_workplace_qr(workplace_id, current_user, db)
