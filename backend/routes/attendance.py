from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from models.attendance import QRCode, Attendance, Timesheet
from typing import Dict
from datetime import datetime, timedelta
from services.shift_notification_service import (
    notify_clock_in,
    notify_clock_out,
    notify_geofence_alert
)
from services.geofencing_service import check_single_worker_location
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
    background_tasks: BackgroundTasks,
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
    
    # Calculate lateness
    shift_start_dt = datetime.combine(datetime.today(), shift_start)
    clock_in_dt = attendance.clock_in_time
    is_late = clock_in_dt.time() > shift_start
    minutes_late = 0
    
    if is_late:
        minutes_late = int((datetime.combine(datetime.today(), clock_in_dt.time()) - shift_start_dt).total_seconds() / 60)
    
    # Get worker and workplace details for notification
    worker = await db.workforce_users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "email": 1, "phone_number": 1, "first_name": 1, "last_name": 1}
    )
    
    workplace = await db.workplaces.find_one(
        {"workplace_id": qr_code["workplace_id"]},
        {"_id": 0, "workplace_name": 1}
    )
    
    if worker:
        worker_name = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip() or "Worker"
        
        shift_details = {
            'position': shift.get('position_title', 'N/A'),
            'workplace': workplace.get('workplace_name', 'N/A') if workplace else 'N/A',
            'clock_in_time': attendance.clock_in_time.strftime('%I:%M %p'),
            'scheduled_end': shift_end.strftime('%I:%M %p')
        }
        
        # Send notification in background
        background_tasks.add_task(
            notify_clock_in,
            worker_email=worker.get('email'),
            worker_phone=worker.get('phone_number'),
            worker_name=worker_name,
            shift_details=shift_details,
            is_late=is_late,
            minutes_late=minutes_late
        )
    
    return {
        "success": True,
        "data": {
            "attendance_id": attendance.attendance_id,
            "is_late": is_late,
            "minutes_late": minutes_late if is_late else 0
        },
        "message": "Clocked in successfully" + (f" (⚠️ {minutes_late} minutes late)" if is_late else "")
    }

@router.post("/clock-out", response_model=Dict)
async def clock_out(
    clock_out_data: dict,
    background_tasks: BackgroundTasks,
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
    
    # Get worker details for notification
    worker = await db.workforce_users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "email": 1, "phone_number": 1, "first_name": 1, "last_name": 1}
    )
    
    if worker:
        worker_name = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip() or "Worker"
        
        shift_summary = {
            'position': shift.get('position_title', 'N/A'),
            'workplace': workplace.get('workplace_name', 'N/A'),
            'clock_in_time': clock_in.strftime('%I:%M %p'),
            'clock_out_time': clock_out_time.strftime('%I:%M %p'),
            'hours_worked': round(duration, 2),
            'hourly_rate': role.get('hourly_rate', 0),
            'total_earnings': round(overtime_calc["total_pay"], 2)
        }
        
        # Send notification in background
        background_tasks.add_task(
            notify_clock_out,
            worker_email=worker.get('email'),
            worker_phone=worker.get('phone_number'),
            worker_name=worker_name,
            shift_summary=shift_summary
        )
    
    return {
        "success": True,
        "data": {
            "timesheet_id": timesheet.timesheet_id,
            "hours_worked": round(duration, 2),
            "total_earnings": round(overtime_calc["total_pay"], 2)
        },
        "message": "Clocked out successfully"
    }


@router.get("/booking/{booking_id}/status", response_model=Dict)
async def get_attendance_status(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get attendance status for a booking"""
    
    # Verify booking belongs to user
    booking = await db.bookings.find_one({"booking_id": booking_id, "workforce_id": current_user["user_id"]})
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    
    # Get attendance record
    attendance = await db.attendance.find_one({"booking_id": booking_id}, {"_id": 0})
    
    return {
        "success": True,
        "data": {
            "has_attendance": attendance is not None,
            "attendance": attendance,
            "status": attendance.get("status") if attendance else "not_started"
        }
    }


@router.get("/shift/{shift_id}/workers", response_model=Dict)
async def get_shift_attendance(
    shift_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get all workers and their attendance for a shift (employer only)"""
    
    # Verify shift belongs to employer
    shift = await db.shifts.find_one({"shift_id": shift_id})
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    
    workplace = await db.workplaces.find_one({"workplace_id": shift["workplace_id"]})
    if workplace["employer_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Get all bookings for this shift
    bookings = await db.bookings.find({"shift_id": shift_id}).to_list(100)
    
    # Get attendance for each booking
    workers_attendance = []
    for booking in bookings:
        # Get worker info
        worker = await db.users.find_one({"user_id": booking["workforce_id"]})
        
        # Get attendance
        attendance = await db.attendance.find_one({"booking_id": booking["booking_id"]})
        
        workers_attendance.append({
            "booking_id": booking["booking_id"],
            "worker_id": booking["workforce_id"],
            "worker_name": worker.get("full_name") if worker else "Unknown",
            "worker_email": worker.get("email") if worker else "",
            "booking_status": booking.get("status"),
            "attendance_status": attendance.get("status") if attendance else "not_started",
            "clock_in_time": attendance.get("clock_in_time") if attendance else None,
            "clock_out_time": attendance.get("clock_out_time") if attendance else None,
            "duration_hours": attendance.get("duration_hours") if attendance else None
        })
    
    return {
        "success": True,
        "data": {
            "shift_id": shift_id,
            "workers": workers_attendance,
            "total_workers": len(workers_attendance),
            "clocked_in": len([w for w in workers_attendance if w["attendance_status"] == "clocked_in"]),
            "clocked_out": len([w for w in workers_attendance if w["attendance_status"] == "clocked_out"])
        }
    }


@router.get("/my-timesheets", response_model=Dict)
async def get_my_timesheets(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get worker's timesheets"""
    
    timesheets = await db.timesheets.find(
        {"workforce_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("week_ending_date", -1).to_list(100)
    
    # Enrich with shift info
    for ts in timesheets:
        shift = await db.shifts.find_one({"shift_id": ts["shift_id"]})
        if shift:
            ts["shift_date"] = shift.get("shift_date")
            workplace = await db.workplaces.find_one({"workplace_id": shift.get("workplace_id")})
            if workplace:
                ts["workplace_name"] = workplace.get("workplace_name")
                employer = await db.users.find_one({"user_id": workplace.get("employer_id")})
                if employer:
                    ts["employer_name"] = employer.get("full_name")
    
    return {
        "success": True,
        "data": {
            "timesheets": timesheets,
            "total_timesheets": len(timesheets),
            "total_hours": sum(ts.get("total_hours", 0) for ts in timesheets),
            "total_earnings": sum(ts.get("net_pay", 0) for ts in timesheets)
        }
    }


@router.get("/employer/timesheets", response_model=Dict)
async def get_employer_timesheets(
    status: str = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get employer's timesheets"""
    
    query = {"employer_id": current_user["user_id"]}
    if status:
        query["status"] = status
    
    timesheets = await db.timesheets.find(query, {"_id": 0}).sort("week_start", -1).to_list(100)
    
    # Enrich with worker info
    for ts in timesheets:
        worker = await db.users.find_one({"user_id": ts.get("workforce_id")})
        if worker:
            ts["worker_name"] = ts.get("worker_name") or worker.get("full_name")
            ts["worker_email"] = worker.get("email")
        
        # Get shift info if shift_id exists
        if ts.get("shift_id"):
            shift = await db.shifts.find_one({"shift_id": ts["shift_id"]})
            if shift:
                ts["shift_date"] = shift.get("shift_date")
        
        # Set week_ending_date from week_end if not present
        if not ts.get("week_ending_date") and ts.get("week_end"):
            ts["week_ending_date"] = ts["week_end"]
    
    return {
        "success": True,
        "data": {
            "timesheets": timesheets,
            "total_timesheets": len(timesheets),
            "total_hours": sum(ts.get("total_hours", 0) for ts in timesheets),
            "total_cost": sum(ts.get("gross_pay", 0) for ts in timesheets),
            "pending_approval": len([ts for ts in timesheets if ts.get("status") in ["submitted", "pending"]])
        }
    }


@router.post("/timesheets/{timesheet_id}/approve", response_model=Dict)
async def approve_timesheet(
    timesheet_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Approve timesheet (employer only)"""
    
    timesheet = await db.timesheets.find_one({"timesheet_id": timesheet_id})
    if not timesheet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet not found")
    
    # Verify employer owns this timesheet
    if timesheet["employer_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Update timesheet
    await db.timesheets.update_one(
        {"timesheet_id": timesheet_id},
        {
            "$set": {
                "status": "approved",
                "approved_by": current_user["user_id"],
                "approved_date": datetime.utcnow(),
                "updated_date": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Timesheet approved successfully"
    }


@router.get("/history", response_model=Dict)
async def get_attendance_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get attendance history for workforce user"""
    
    # Get recent attendance records
    attendance_records = await db.attendance.find({
        "workforce_id": current_user["user_id"],
        "status": "clocked_out"
    }).sort("clock_out_time", -1).limit(limit).to_list(length=limit)
    
    # Enrich with shift and company details
    enriched_records = []
    for record in attendance_records:
        # Get booking to find shift details
        booking = await db.bookings.find_one({"booking_id": record.get("booking_id")})
        if not booking:
            continue
            
        # Get shift details
        shift = await db.shifts.find_one({"shift_id": record.get("shift_id")})
        if not shift:
            continue
            
        # Get workplace details
        workplace = await db.workplaces.find_one({"workplace_id": shift.get("workplace_id")})
        if not workplace:
            continue
            
        # Get employer details
        employer = await db.employer_profiles.find_one({"employer_id": workplace.get("employer_id")})
        
        enriched_records.append({
            "attendance_id": record.get("attendance_id"),
            "clock_in_time": record.get("clock_in_time"),
            "clock_out_time": record.get("clock_out_time"),
            "duration_hours": record.get("duration_hours"),
            "company_name": employer.get("company_name") if employer else "Unknown",
            "workplace_name": workplace.get("workplace_name"),
            "shift_date": shift.get("shift_date"),
            "geofence_verified": record.get("geofence_verified", False),
            "qr_code_scanned": record.get("qr_code_scanned", False)
        })
    
    return {
        "success": True,
        "data": enriched_records
    }


@router.get("/current", response_model=Dict)
async def get_current_attendance(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get current active attendance (if clocked in)"""
    
    # Find active attendance
    attendance = await db.attendance.find_one({
        "workforce_id": current_user["user_id"],
        "status": "clocked_in"
    })
    
    if not attendance:
        return {
            "success": True,
            "data": None
        }
    
    # Get booking and shift details
    booking = await db.bookings.find_one({"booking_id": attendance.get("booking_id")})
    if not booking:
        return {"success": True, "data": None}
    
    shift = await db.shifts.find_one({"shift_id": attendance.get("shift_id")})
    if not shift:
        return {"success": True, "data": None}
    
    workplace = await db.workplaces.find_one({"workplace_id": shift.get("workplace_id")})
    if not workplace:
        return {"success": True, "data": None}
    
    employer = await db.employer_profiles.find_one({"employer_id": workplace.get("employer_id")})
    
    return {
        "success": True,
        "data": {
            "attendance_id": attendance.get("attendance_id"),
            "booking_id": attendance.get("booking_id"),
            "clock_in_time": attendance.get("clock_in_time"),
            "company_name": employer.get("company_name") if employer else "Unknown",
            "workplace_name": workplace.get("workplace_name"),
            "shift_date": shift.get("shift_date"),
            "start_time": shift.get("start_time"),
            "end_time": shift.get("end_time"),
            "geofence_verified": attendance.get("geofence_verified", False),
            "qr_code_scanned": attendance.get("qr_code_scanned", False)
        }
    }


@router.get("/upcoming-shifts", response_model=Dict)
async def get_upcoming_shifts(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get upcoming shifts that user can clock into"""
    
    from datetime import date
    today = date.today()
    
    # Find accepted bookings for today and future
    bookings = await db.bookings.find({
        "workforce_id": current_user["user_id"],
        "status": {"$in": ["accepted", "confirmed"]}
    }).to_list(length=50)
    
    upcoming = []
    for booking in bookings:
        # Get role details
        role = await db.roles.find_one({"role_id": booking.get("role_id")})
        if not role:
            continue
            
        # Get shift details
        shift = await db.shifts.find_one({"shift_id": role.get("shift_id")})
        if not shift:
            continue
        
        # Parse shift date
        shift_date = shift.get("shift_date")
        if isinstance(shift_date, str):
            shift_date = datetime.fromisoformat(shift_date).date()
        elif hasattr(shift_date, 'date'):
            shift_date = shift_date.date()
        
        # Only include today and future shifts
        if shift_date < today:
            continue
        
        # Get workplace details
        workplace = await db.workplaces.find_one({"workplace_id": shift.get("workplace_id")})
        if not workplace:
            continue
        
        # Get employer details
        employer = await db.employer_profiles.find_one({"employer_id": workplace.get("employer_id")})
        
        upcoming.append({
            "booking_id": booking.get("booking_id"),
            "shift_id": shift.get("shift_id"),
            "company_name": employer.get("company_name") if employer else "Unknown",
            "position_title": role.get("position_title", "Position"),
            "workplace_name": workplace.get("workplace_name"),
            "shift_date": shift_date.isoformat(),
            "start_time": shift.get("start_time"),
            "end_time": shift.get("end_time"),
            "hourly_rate": role.get("hourly_rate")
        })
    
    # Sort by date
    upcoming.sort(key=lambda x: x["shift_date"])
    
    return {
        "success": True,
        "data": upcoming
    }


@router.post("/update-location", response_model=Dict)
async def update_worker_location(
    location_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Worker updates their current location for geofencing check
    Called periodically by mobile app
    """
    location = location_data.get("location")  # {latitude, longitude}
    
    if not location or not location.get('latitude') or not location.get('longitude'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid location (latitude, longitude) required"
        )
    
    # Check geofencing
    result = await check_single_worker_location(
        db=db,
        worker_id=current_user["user_id"],
        current_location=location
    )
    
    if not result["success"]:
        return {
            "success": True,
            "data": {
                "location_updated": True,
                "geofence_check": "not_applicable",
                "message": result.get("message", "No active shift")
            }
        }
    
    # Update attendance record with latest location
    if result.get("attendance_id"):
        await db.attendance.update_one(
            {"attendance_id": result["attendance_id"]},
            {
                "$set": {
                    "last_location_update": datetime.utcnow().isoformat(),
                    "last_known_location": location
                }
            }
        )
    
    return {
        "success": True,
        "data": {
            "location_updated": True,
            "within_geofence": result.get("within_geofence", True),
            "geofence_check": "passed" if result.get("within_geofence") else "failed",
            "message": "Location updated successfully" + (
                "" if result.get("within_geofence") 
                else " - You appear to be away from your workplace"
            )
        }
    }



# ==================== GPS-BASED CLOCK IN/OUT (NO QR REQUIRED) ====================

GEOFENCE_RADIUS_METERS = 50  # 50 meters for clock-in

@router.post("/gps-clock-in", response_model=Dict)
async def gps_clock_in(
    clock_in_data: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Clock in to shift using GPS location only (no QR code required).
    Worker must be within 50 meters of workplace.
    """
    from utils.google_geofencing import check_geofence, get_timezone, reverse_geocode
    
    shift_id = clock_in_data.get("shift_id")
    location = clock_in_data.get("location")  # {lat, lng} or {latitude, longitude}
    
    if not shift_id:
        raise HTTPException(status_code=400, detail="shift_id is required")
    
    if not location:
        raise HTTPException(status_code=400, detail="GPS location is required")
    
    # Normalize location format
    worker_lat = location.get("lat") or location.get("latitude")
    worker_lng = location.get("lng") or location.get("longitude") or location.get("long")
    
    if not worker_lat or not worker_lng:
        raise HTTPException(status_code=400, detail="Invalid location format. Provide lat/lng or latitude/longitude")
    
    worker_lat = float(worker_lat)
    worker_lng = float(worker_lng)
    
    # Get shift details
    shift = await db.shifts.find_one({"shift_id": shift_id}, {"_id": 0})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Check if worker is assigned to this shift
    assigned_workers = shift.get("assigned_workers", [])
    worker_assigned = False
    for w in assigned_workers:
        if isinstance(w, dict):
            if w.get("workforce_id") == current_user["user_id"] or w.get("user_id") == current_user["user_id"]:
                worker_assigned = True
                break
        elif w == current_user["user_id"]:
            worker_assigned = True
            break
    
    if not worker_assigned:
        raise HTTPException(status_code=403, detail="You are not assigned to this shift")
    
    # Get workplace
    workplace = await db.workplaces.find_one(
        {"workplace_id": shift.get("workplace_id")},
        {"_id": 0}
    )
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")
    
    # Get workplace coordinates
    workplace_lat = workplace.get("lat") or workplace.get("latitude")
    workplace_lng = workplace.get("long") or workplace.get("longitude")
    
    if not workplace_lat or not workplace_lng:
        # Try to geocode
        from utils.google_geofencing import geocode_address
        address = f"{workplace.get('address')}, {workplace.get('city')}, {workplace.get('province', 'Ontario')}, Canada"
        coords = await geocode_address(address)
        if coords:
            workplace_lat, workplace_lng = coords
            await db.workplaces.update_one(
                {"workplace_id": workplace.get("workplace_id")},
                {"$set": {"lat": workplace_lat, "long": workplace_lng}}
            )
        else:
            raise HTTPException(status_code=500, detail="Could not determine workplace location")
    
    workplace_lat = float(workplace_lat)
    workplace_lng = float(workplace_lng)
    
    # Check geofence (50 meters)
    geofence_result = await check_geofence(
        worker_lat, worker_lng,
        workplace_lat, workplace_lng,
        radius_meters=GEOFENCE_RADIUS_METERS
    )
    
    if not geofence_result["is_within_geofence"]:
        distance = geofence_result["distance_meters"]
        raise HTTPException(
            status_code=400,
            detail=f"You are {distance:.0f} meters from the workplace. Please move within {GEOFENCE_RADIUS_METERS} meters to clock in."
        )
    
    # Check shift timing
    from datetime import time as dt_time
    current_time = datetime.utcnow()
    
    # Parse shift date and times
    shift_date_str = shift.get("date") or shift.get("shift_date")
    if isinstance(shift_date_str, str):
        shift_date = datetime.fromisoformat(shift_date_str.replace('Z', '+00:00')).date()
    else:
        shift_date = shift_date_str.date() if hasattr(shift_date_str, 'date') else shift_date_str
    
    today = current_time.date()
    
    if shift_date != today:
        raise HTTPException(
            status_code=400,
            detail=f"This shift is scheduled for {shift_date}. You can only clock in on the shift date."
        )
    
    shift_start = dt_time.fromisoformat(shift.get("start_time"))
    shift_end = dt_time.fromisoformat(shift.get("end_time"))
    
    # Allow clock-in 15 minutes before shift
    early_allowed = (datetime.combine(today, shift_start) - timedelta(minutes=15)).time()
    current_time_only = current_time.time()
    
    if current_time_only < early_allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Too early to clock in. You can clock in starting at {early_allowed.strftime('%I:%M %p')}"
        )
    
    if current_time_only > shift_end:
        raise HTTPException(
            status_code=400,
            detail=f"Shift has already ended at {shift_end.strftime('%I:%M %p')}"
        )
    
    # Check if already clocked in
    existing = await db.attendance.find_one({
        "shift_id": shift_id,
        "workforce_id": current_user["user_id"],
        "status": {"$in": ["clocked_in", "clocked_out"]}
    })
    
    if existing:
        if existing.get("status") == "clocked_in":
            raise HTTPException(status_code=409, detail="Already clocked in to this shift")
        else:
            raise HTTPException(status_code=409, detail="Already completed this shift")
    
    # Get timezone for workplace
    tz_info = await get_timezone(workplace_lat, workplace_lng)
    
    # Get address from coordinates for record
    worker_address = await reverse_geocode(worker_lat, worker_lng)
    
    # Create attendance record
    attendance_id = f"att_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{current_user['user_id'][:8]}"
    
    # Calculate if late
    is_late = current_time_only > shift_start
    minutes_late = 0
    if is_late:
        late_delta = datetime.combine(today, current_time_only) - datetime.combine(today, shift_start)
        minutes_late = int(late_delta.total_seconds() / 60)
    
    attendance_record = {
        "attendance_id": attendance_id,
        "shift_id": shift_id,
        "workforce_id": current_user["user_id"],
        "workplace_id": workplace.get("workplace_id"),
        "employer_id": workplace.get("employer_id"),
        "clock_in_time": current_time.isoformat(),
        "clock_in_method": "gps",
        "clock_in_location": {
            "latitude": worker_lat,
            "longitude": worker_lng,
            "accuracy": location.get("accuracy"),
            "address": worker_address
        },
        "workplace_location": {
            "latitude": workplace_lat,
            "longitude": workplace_lng
        },
        "distance_from_workplace_meters": geofence_result["distance_meters"],
        "geofence_verified": True,
        "geofence_radius_meters": GEOFENCE_RADIUS_METERS,
        "timezone": tz_info,
        "is_late": is_late,
        "minutes_late": minutes_late,
        "status": "clocked_in",
        "created_at": current_time.isoformat()
    }
    
    await db.attendance.insert_one(attendance_record)
    
    # Update shift status
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {"$set": {"status": "in_progress"}}
    )
    
    # Get worker details for notification
    worker = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "email": 1, "first_name": 1, "last_name": 1}
    )
    
    worker_name = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip() if worker else "Worker"
    
    # Send notification in background
    background_tasks.add_task(
        notify_clock_in,
        worker_email=worker.get('email') if worker else None,
        worker_phone=None,
        worker_name=worker_name,
        shift_details={
            'position': shift.get('position_title') or shift.get('role_title', 'N/A'),
            'workplace': workplace.get('workplace_name') or workplace.get('name', 'N/A'),
            'clock_in_time': current_time.strftime('%I:%M %p'),
            'scheduled_end': shift_end.strftime('%I:%M %p')
        },
        is_late=is_late,
        minutes_late=minutes_late
    )
    
    return {
        "success": True,
        "data": {
            "attendance_id": attendance_id,
            "clock_in_time": current_time.isoformat(),
            "workplace_name": workplace.get('workplace_name') or workplace.get('name'),
            "distance_meters": round(geofence_result["distance_meters"], 1),
            "is_late": is_late,
            "minutes_late": minutes_late,
            "timezone": tz_info.get("timezone_name") if tz_info else None
        },
        "message": "Clocked in successfully!" + (f" (⚠️ {minutes_late} min late)" if is_late else "")
    }


@router.post("/gps-clock-out", response_model=Dict)
async def gps_clock_out(
    clock_out_data: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Clock out from shift using GPS location.
    Can clock out from anywhere (location is recorded for audit).
    """
    from utils.google_geofencing import reverse_geocode, check_geofence
    
    shift_id = clock_out_data.get("shift_id")
    attendance_id = clock_out_data.get("attendance_id")
    location = clock_out_data.get("location")
    
    if not shift_id and not attendance_id:
        raise HTTPException(status_code=400, detail="shift_id or attendance_id is required")
    
    # Find active attendance
    query = {"workforce_id": current_user["user_id"], "status": "clocked_in"}
    if attendance_id:
        query["attendance_id"] = attendance_id
    if shift_id:
        query["shift_id"] = shift_id
    
    attendance = await db.attendance.find_one(query, {"_id": 0})
    
    if not attendance:
        raise HTTPException(status_code=404, detail="No active clock-in found for this shift")
    
    # Parse location
    worker_lat = None
    worker_lng = None
    if location:
        worker_lat = location.get("lat") or location.get("latitude")
        worker_lng = location.get("lng") or location.get("longitude") or location.get("long")
    
    # Calculate duration
    clock_in_time = attendance.get("clock_in_time")
    if isinstance(clock_in_time, str):
        clock_in_dt = datetime.fromisoformat(clock_in_time.replace('Z', '+00:00'))
    else:
        clock_in_dt = clock_in_time
    
    clock_out_dt = datetime.utcnow()
    duration_seconds = (clock_out_dt - clock_in_dt).total_seconds()
    duration_hours = duration_seconds / 3600
    
    # Get worker address
    worker_address = None
    distance_from_workplace = None
    
    if worker_lat and worker_lng:
        worker_lat = float(worker_lat)
        worker_lng = float(worker_lng)
        worker_address = await reverse_geocode(worker_lat, worker_lng)
        
        # Calculate distance from workplace
        workplace_loc = attendance.get("workplace_location", {})
        if workplace_loc.get("latitude") and workplace_loc.get("longitude"):
            geofence_result = await check_geofence(
                worker_lat, worker_lng,
                float(workplace_loc["latitude"]), float(workplace_loc["longitude"]),
                radius_meters=GEOFENCE_RADIUS_METERS
            )
            distance_from_workplace = geofence_result["distance_meters"]
    
    # Update attendance record
    update_data = {
        "clock_out_time": clock_out_dt.isoformat(),
        "clock_out_method": "gps",
        "clock_out_location": {
            "latitude": worker_lat,
            "longitude": worker_lng,
            "accuracy": location.get("accuracy") if location else None,
            "address": worker_address
        } if location else None,
        "distance_from_workplace_at_clock_out": distance_from_workplace,
        "duration_seconds": int(duration_seconds),
        "duration_hours": round(duration_hours, 2),
        "status": "clocked_out",
        "updated_at": clock_out_dt.isoformat()
    }
    
    await db.attendance.update_one(
        {"attendance_id": attendance["attendance_id"]},
        {"$set": update_data}
    )
    
    # Get shift and workplace for timesheet
    shift = await db.shifts.find_one({"shift_id": attendance["shift_id"]}, {"_id": 0})
    workplace = await db.workplaces.find_one({"workplace_id": attendance["workplace_id"]}, {"_id": 0})
    
    # Calculate pay (simplified)
    hourly_rate = shift.get("hourly_rate") or shift.get("rate") or 17.20  # Ontario min wage fallback
    regular_pay = round(duration_hours * hourly_rate, 2)
    
    # Create/update timesheet
    from datetime import date
    today = date.today()
    days_until_sunday = (6 - today.weekday()) % 7
    week_ending = today + timedelta(days=days_until_sunday) if days_until_sunday > 0 else today
    
    timesheet_data = {
        "timesheet_id": f"ts_{attendance['attendance_id']}",
        "attendance_id": attendance["attendance_id"],
        "shift_id": attendance["shift_id"],
        "workforce_id": current_user["user_id"],
        "employer_id": attendance.get("employer_id"),
        "workplace_id": attendance.get("workplace_id"),
        "week_ending_date": week_ending.isoformat(),
        "shift_date": shift.get("date") or shift.get("shift_date"),
        "clock_in_time": attendance["clock_in_time"],
        "clock_out_time": clock_out_dt.isoformat(),
        "regular_hours": round(duration_hours, 2),
        "overtime_hours": 0,
        "total_hours": round(duration_hours, 2),
        "hourly_rate": hourly_rate,
        "regular_pay": regular_pay,
        "overtime_pay": 0,
        "gross_pay": regular_pay,
        "status": "pending_approval",
        "created_at": clock_out_dt.isoformat()
    }
    
    await db.timesheets.update_one(
        {"attendance_id": attendance["attendance_id"]},
        {"$set": timesheet_data},
        upsert=True
    )
    
    # Update shift status if all workers clocked out
    await db.shifts.update_one(
        {"shift_id": attendance["shift_id"]},
        {"$set": {"status": "completed"}}
    )
    
    # Send notification
    worker = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "email": 1, "first_name": 1, "last_name": 1}
    )
    
    worker_name = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip() if worker else "Worker"
    
    background_tasks.add_task(
        notify_clock_out,
        worker_email=worker.get('email') if worker else None,
        worker_phone=None,
        worker_name=worker_name,
        shift_summary={
            'position': shift.get('position_title') or shift.get('role_title', 'N/A'),
            'workplace': workplace.get('workplace_name') or workplace.get('name', 'N/A') if workplace else 'N/A',
            'clock_in_time': clock_in_dt.strftime('%I:%M %p'),
            'clock_out_time': clock_out_dt.strftime('%I:%M %p'),
            'hours_worked': round(duration_hours, 2),
            'estimated_pay': regular_pay
        }
    )
    
    return {
        "success": True,
        "data": {
            "attendance_id": attendance["attendance_id"],
            "clock_in_time": attendance["clock_in_time"],
            "clock_out_time": clock_out_dt.isoformat(),
            "duration_hours": round(duration_hours, 2),
            "estimated_pay": regular_pay,
            "timesheet_status": "pending_approval"
        },
        "message": f"Clocked out successfully! You worked {duration_hours:.1f} hours."
    }


@router.get("/shifts/{shift_id}/clock-status", response_model=Dict)
async def get_shift_clock_status(
    shift_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get clock-in status for a specific shift"""
    
    attendance = await db.attendance.find_one({
        "shift_id": shift_id,
        "workforce_id": current_user["user_id"]
    }, {"_id": 0})
    
    if not attendance:
        return {
            "success": True,
            "data": {
                "status": "not_started",
                "can_clock_in": True,
                "can_clock_out": False
            }
        }
    
    status = attendance.get("status", "unknown")
    
    return {
        "success": True,
        "data": {
            "attendance_id": attendance.get("attendance_id"),
            "status": status,
            "clock_in_time": attendance.get("clock_in_time"),
            "clock_out_time": attendance.get("clock_out_time"),
            "duration_hours": attendance.get("duration_hours"),
            "is_late": attendance.get("is_late", False),
            "minutes_late": attendance.get("minutes_late", 0),
            "can_clock_in": status == "not_started",
            "can_clock_out": status == "clocked_in"
        }
    }


@router.get("/my-attendance/today", response_model=Dict)
async def get_my_attendance_today(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get worker's attendance records for today"""
    
    today = datetime.utcnow().date().isoformat()
    
    # Find today's shifts for this worker
    shifts = await db.shifts.find({
        "date": {"$regex": f"^{today}"},
        "assigned_workers": {"$elemMatch": {"workforce_id": current_user["user_id"]}}
    }, {"_id": 0}).to_list(10)
    
    # Also check alternative format
    if not shifts:
        shifts = await db.shifts.find({
            "shift_date": {"$regex": f"^{today}"},
            "$or": [
                {"assigned_workers": {"$elemMatch": {"workforce_id": current_user["user_id"]}}},
                {"assigned_workers": {"$elemMatch": {"user_id": current_user["user_id"]}}},
                {"assigned_workers": current_user["user_id"]}
            ]
        }, {"_id": 0}).to_list(10)
    
    result = []
    for shift in shifts:
        attendance = await db.attendance.find_one({
            "shift_id": shift["shift_id"],
            "workforce_id": current_user["user_id"]
        }, {"_id": 0})
        
        workplace = await db.workplaces.find_one(
            {"workplace_id": shift.get("workplace_id")},
            {"_id": 0, "workplace_name": 1, "name": 1, "address": 1, "lat": 1, "long": 1}
        )
        
        result.append({
            "shift_id": shift["shift_id"],
            "shift_date": shift.get("date") or shift.get("shift_date"),
            "start_time": shift.get("start_time"),
            "end_time": shift.get("end_time"),
            "role_title": shift.get("position_title") or shift.get("role_title"),
            "workplace": {
                "name": workplace.get("workplace_name") or workplace.get("name") if workplace else "Unknown",
                "address": workplace.get("address") if workplace else None,
                "lat": workplace.get("lat") if workplace else None,
                "lng": workplace.get("long") if workplace else None
            },
            "attendance": {
                "status": attendance.get("status") if attendance else "not_started",
                "clock_in_time": attendance.get("clock_in_time") if attendance else None,
                "clock_out_time": attendance.get("clock_out_time") if attendance else None,
                "duration_hours": attendance.get("duration_hours") if attendance else None,
                "is_late": attendance.get("is_late", False) if attendance else False,
                "minutes_late": attendance.get("minutes_late", 0) if attendance else 0
            } if attendance else None
        })
    
    return {
        "success": True,
        "data": {
            "date": today,
            "shifts": result,
            "total_shifts": len(result)
        }
    }

