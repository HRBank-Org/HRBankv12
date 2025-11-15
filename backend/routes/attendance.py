from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from models.attendance import QRCode, Attendance, Timesheet
from typing import Dict
from datetime import datetime, timedelta
import qrcode
import io
import base64
import json

router = APIRouter(prefix="/attendance", tags=["Attendance"])

def get_db():
    from server import db
    return db

@router.post("/shifts/{shift_id}/qr-code", response_model=Dict)
async def generate_qr_code(
    shift_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Generate QR code for shift (employer only)"""
    
    shift = await db.shifts.find_one({"shift_id": shift_id})
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    
    workplace = await db.workplaces.find_one({"workplace_id": shift["workplace_id"]})
    
    if workplace["employer_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Check if exists
    existing = await db.qr_codes.find_one({"shift_id": shift_id})
    if existing:
        # Generate QR image for existing code
        qr_data = json.dumps({
            "qr_code_id": existing["qr_code_id"],
            "shift_id": shift_id,
            "token": existing["security_token"]
        })
        
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return {
            "success": True,
            "data": {
                "qr_code_id": existing["qr_code_id"],
                "qr_code_image": f"data:image/png;base64,{img_str}",
                "valid_until": existing["valid_until"]
            }
        }
    
    # Create new QR code
    qr_code_model = QRCode(
        shift_id=shift_id,
        workplace_id=shift["workplace_id"],
        valid_from=datetime.utcnow() - timedelta(minutes=15),
        valid_until=datetime.utcnow() + timedelta(hours=24)
    )
    
    await db.qr_codes.insert_one(qr_code_model.model_dump())
    
    # Generate QR image
    qr_data = json.dumps({
        "qr_code_id": qr_code_model.qr_code_id,
        "shift_id": shift_id,
        "token": qr_code_model.security_token
    })
    
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "success": True,
        "data": {
            "qr_code_id": qr_code_model.qr_code_id,
            "qr_code_image": f"data:image/png;base64,{img_str}",
            "valid_until": qr_code_model.valid_until.isoformat()
        }
    }

@router.post("/clock-in", response_model=Dict)
async def clock_in(
    clock_in_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Clock in to shift"""
    
    qr_data = clock_in_data.get("qr_data")
    location = clock_in_data.get("location")
    booking_id = clock_in_data.get("booking_id")
    
    # Parse QR data
    try:
        qr_info = json.loads(qr_data)
        qr_code_id = qr_info["qr_code_id"]
        security_token = qr_info["token"]
    except:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR code")
    
    # Verify QR
    qr_code = await db.qr_codes.find_one({"qr_code_id": qr_code_id})
    if not qr_code or qr_code["security_token"] != security_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid QR code")
    
    # Verify booking
    booking = await db.bookings.find_one({"booking_id": booking_id, "workforce_id": current_user["user_id"]})
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    
    # Get shift details to validate time
    shift = await db.shifts.find_one({"shift_id": qr_code["shift_id"]})
    
    # Check if clocking in within shift time window
    from datetime import time as dt_time
    current_time = datetime.utcnow().time()
    
    # Parse shift times
    shift_start = dt_time.fromisoformat(shift["start_time"])
    shift_end = dt_time.fromisoformat(shift["end_time"])
    
    # Allow clock-in 15 minutes before shift start
    early_allowed = (datetime.combine(datetime.today(), shift_start) - timedelta(minutes=15)).time()
    
    # Check if shift date is today
    shift_date = datetime.fromisoformat(shift["shift_date"]) if isinstance(shift["shift_date"], str) else shift["shift_date"]
    today = datetime.utcnow().date()
    
    if shift_date.date() != today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This shift is scheduled for {shift_date.date()}. You can only clock in on the shift date."
        )
    
    # Validate time window (15 min before start to shift end)
    if not (early_allowed <= current_time <= shift_end):
        # Outside shift time - send notifications
        # TODO: Notify both employer and worker
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Clock-in only allowed between {early_allowed.strftime('%H:%M')} and {shift_end.strftime('%H:%M')}. Current time: {current_time.strftime('%H:%M')}. Both parties have been notified."
        )
    
    # Check if already clocked in
    existing = await db.attendance.find_one({"booking_id": booking_id})
    if existing and existing.get("clock_in_time"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already clocked in")
    
    # Create attendance
    attendance = Attendance(
        booking_id=booking_id,
        shift_id=qr_code["shift_id"],
        workforce_id=current_user["user_id"],
        clock_in_time=datetime.utcnow(),
        qr_code_scanned=True,
        qr_code_id=qr_code_id,
        geofence_verified=True,
        worker_location_at_clock_in=location,
        status="clocked_in"
    )
    
    await db.attendance.insert_one(attendance.model_dump())
    
    await db.qr_codes.update_one({"qr_code_id": qr_code_id}, {"$inc": {"scan_count": 1}})
    
    return {
        "success": True,
        "data": {"attendance_id": attendance.attendance_id},
        "message": "Clocked in successfully"
    }

@router.post("/clock-out", response_model=Dict)
async def clock_out(
    clock_out_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Clock out from shift"""
    
    booking_id = clock_out_data.get("booking_id")
    location = clock_out_data.get("location")
    
    # Find attendance
    attendance = await db.attendance.find_one({
        "booking_id": booking_id,
        "workforce_id": current_user["user_id"],
        "status": "clocked_in"
    })
    
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active clock-in found")
    
    # Get shift to validate clock-out time
    booking = await db.bookings.find_one({"booking_id": booking_id})
    role = await db.roles.find_one({"role_id": booking["role_id"]})
    shift = await db.shifts.find_one({"shift_id": role["shift_id"]})
    
    # Validate clock-out time (can clock out up to 1 hour after shift end)
    from datetime import time as dt_time
    current_time = datetime.utcnow().time()
    
    shift_end = dt_time.fromisoformat(shift["end_time"])
    late_allowed = (datetime.combine(datetime.today(), shift_end) + timedelta(hours=1)).time()
    
    # Allow early clock-out after shift start
    shift_start = dt_time.fromisoformat(shift["start_time"])
    
    if current_time < shift_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot clock out before shift starts at {shift_start.strftime('%H:%M')}. Both parties have been notified."
        )
    
    if current_time > late_allowed:
        # Very late clock-out - notify both parties but allow
        # TODO: Send notification to employer about late clock-out
        pass  # Allow but flag for review
    
    # Calculate duration
    clock_in = datetime.fromisoformat(attendance["clock_in_time"]) if isinstance(attendance["clock_in_time"], str) else attendance["clock_in_time"]
    clock_out_time = datetime.utcnow()
    duration = (clock_out_time - clock_in).total_seconds() / 3600
    
    # Update attendance
    await db.attendance.update_one(
        {"attendance_id": attendance["attendance_id"]},
        {
            "$set": {
                "clock_out_time": clock_out_time.isoformat(),
                "worker_location_at_clock_out": location,
                "duration_hours": round(duration, 2),
                "status": "clocked_out"
            }
        }
    )
    
    # Update booking
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {"status": "completed"}}
    )
    
    # Generate timesheet
    from utils.calculations import calculate_overtime
    
    booking = await db.bookings.find_one({"booking_id": booking_id})
    role = await db.roles.find_one({"role_id": booking["role_id"]})
    shift = await db.shifts.find_one({"shift_id": role["shift_id"]})
    workplace = await db.workplaces.find_one({"workplace_id": shift["workplace_id"]})
    
    # Calculate overtime (Ontario rules: 44h/week threshold)
    overtime_calc = calculate_overtime(
        weekly_hours_before_shift=0,  # Simplified
        shift_duration_hours=duration,
        regular_rate=role["hourly_rate"]
    )
    
    # Create timesheet
    # Calculate week ending date (always the upcoming Sunday)
    from datetime import date, timedelta
    
    today = date.today()
    days_until_sunday = (6 - today.weekday()) % 7  # Days until next Sunday
    if days_until_sunday == 0 and datetime.utcnow().hour < 12:
        # If it's Sunday before noon, use today
        week_ending = today
    else:
        week_ending = today + timedelta(days=days_until_sunday)
    
    timesheet = Timesheet(
        booking_id=booking_id,
        workforce_id=booking["workforce_id"],
        employer_id=workplace["employer_id"],
        shift_id=shift["shift_id"],
        week_ending_date=week_ending.isoformat(),  # Always Sunday
        regular_hours=overtime_calc["regular_hours"],
        overtime_hours=overtime_calc["overtime_hours"],
        total_hours=duration,
        regular_rate=role["hourly_rate"],
        overtime_rate=overtime_calc["overtime_rate"],
        regular_pay=overtime_calc["regular_pay"],
        overtime_pay=overtime_calc["overtime_pay"],
        gross_pay=overtime_calc["total_pay"],
        platform_fee=round(overtime_calc["total_pay"] * 0.05, 2),
        net_pay=round(overtime_calc["total_pay"] * 0.95, 2),
        status="submitted"
    )
    
    await db.timesheets.insert_one(timesheet.model_dump())
    
    # Update occupation hours
    occupation_id = booking.get("occupation_id")
    if occupation_id:
        await db.occupation_profiles.update_one(
            {"occupation_id": occupation_id},
            {
                "$inc": {
                    "total_hours_worked": duration,
                    "total_shifts_completed": 1
                }
            }
        )
    
    # Update workforce total hours
    await db.workforce_profiles.update_one(
        {"workforce_id": booking["workforce_id"]},
        {
            "$inc": {
                "total_hours_worked": duration,
                "total_shifts_completed": 1
            }
        }
    )
    
    return timesheet.timesheet_id
