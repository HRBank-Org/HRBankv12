"""
Live Attendance Monitoring API
Real-time view of worker attendance status
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from auth.dependencies import get_current_user, require_role
from database import get_database
from models.time_off import LiveAttendanceRecord, AttendanceStatus
from services.shift_notification_service import notify_employer_shift_update
from datetime import datetime, timedelta
from typing import List

router = APIRouter(prefix="/api/live-attendance", tags=["Live Attendance"])


async def check_missed_clock_ins(db):
    """
    Background task to check for missed clock-ins
    Should be run every 15-30 minutes
    """
    current_time = datetime.utcnow()
    grace_period = timedelta(minutes=15)  # 15 minutes grace period
    
    # Find shifts that started more than 15 min ago and no clock-in
    cutoff_time = (current_time - grace_period).isoformat()
    
    # Find active shifts without attendance records
    active_shifts = await db.calendar_shifts.find({
        "start_time": {"$lte": cutoff_time},
        "end_time": {"$gte": current_time.isoformat()},
        "assigned_workers": {"$exists": True, "$ne": []}
    }).to_list(500)
    
    for shift in active_shifts:
        for worker_assignment in shift.get('assigned_workers', []):
            worker_id = worker_assignment['worker_id']
            
            # Check if attendance record exists
            attendance = await db.attendance.find_one({
                "shift_id": shift['shift_id'],
                "workforce_id": worker_id,
                "clock_in_time": {"$exists": True}
            })
            
            if not attendance:
                # Worker missed clock-in - create missed record
                missed_record = {
                    "attendance_id": f"missed_{shift['shift_id']}_{worker_id}",
                    "shift_id": shift['shift_id'],
                    "workforce_id": worker_id,
                    "status": "missed",
                    "scheduled_start": shift['start_time'],
                    "detected_at": current_time.isoformat(),
                    "notified": False
                }
                
                # Check if already marked as missed
                existing = await db.missed_clock_ins.find_one({
                    "shift_id": shift['shift_id'],
                    "workforce_id": worker_id
                })
                
                if not existing:
                    await db.missed_clock_ins.insert_one(missed_record)
                    
                    # Notify employer
                    employer = await db.employer_profiles.find_one(
                        {"employer_id": shift['employer_id']},
                        {"_id": 0, "email": 1, "phone_number": 1, "company_name": 1}
                    )
                    
                    worker = await db.workforce_users.find_one(
                        {"user_id": worker_id},
                        {"_id": 0, "first_name": 1, "last_name": 1}
                    )
                    
                    if employer:
                        # Send notification
                        await notify_employer_shift_update(
                            employer_email=employer.get('email'),
                            employer_phone=employer.get('phone_number'),
                            employer_name=employer.get('company_name', 'Employer'),
                            update_type="missed_clock_in",
                            shift_details={
                                'worker_name': f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip(),
                                'position': shift.get('position_title', 'Worker'),
                                'date': datetime.fromisoformat(shift['start_time'].replace('Z', '+00:00')).strftime('%B %d, %Y'),
                                'time': datetime.fromisoformat(shift['start_time'].replace('Z', '+00:00')).strftime('%I:%M %p')
                            }
                        )
                        
                        # Mark as notified
                        await db.missed_clock_ins.update_one(
                            {"attendance_id": missed_record['attendance_id']},
                            {"$set": {"notified": True}}
                        )


@router.get("/today")
async def get_todays_attendance(
    date: str = None,
    current_user: dict = Depends(require_role('employer'))
):
    """Get live attendance status for today's or specified date's shifts"""
    db = await get_database()
    
    # Allow specifying a date, default to today
    if date:
        try:
            target_date = datetime.fromisoformat(date)
        except:
            target_date = datetime.utcnow()
    else:
        target_date = datetime.utcnow()
    
    # Get date range for the target date (use date strings instead of datetime for better matching)
    today_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Query using date strings to avoid timezone issues
    today_start_str = today_start.date().isoformat()
    today_end_str = today_end.date().isoformat()
    
    # Get all shifts for the target date
    # Check if start_time contains the date (handles different formats)
    shifts = await db.calendar_shifts.find({
        "employer_id": current_user['user_id']
    }, {"_id": 0}).to_list(500)
    
    # Filter shifts by date in Python (more flexible for different datetime formats)
    filtered_shifts = []
    for shift in shifts:
        try:
            shift_start_str = shift['start_time']
            # Extract date from ISO string (handles both 2025-12-08 and 2025-12-08T06:00:00)
            shift_date = shift_start_str[:10]
            if shift_date == today_start_str:
                filtered_shifts.append(shift)
        except:
            continue
    
    shifts = filtered_shifts
    
    attendance_records = []
    current_time = datetime.utcnow().replace(tzinfo=None)  # Make naive for comparison
    
    for shift in shifts:
        # Parse and make naive (remove timezone info) for consistent comparison
        shift_start = datetime.fromisoformat(shift['start_time'].replace('Z', '+00:00').replace('.000+00:00', ''))
        if shift_start.tzinfo:
            shift_start = shift_start.replace(tzinfo=None)
        
        shift_end = datetime.fromisoformat(shift['end_time'].replace('Z', '+00:00').replace('.000+00:00', ''))
        if shift_end.tzinfo:
            shift_end = shift_end.replace(tzinfo=None)
        
        # Get workplace details
        workplace = await db.workplaces.find_one(
            {"workplace_id": shift['workplace_id']},
            {"_id": 0, "workplace_name": 1}
        )
        
        for worker_assignment in shift.get('assigned_workers', []):
            worker_id = worker_assignment['worker_id']
            
            # Check for time-off (convert date to string for MongoDB query)
            time_off = await db.time_off_requests.find_one({
                "worker_id": worker_id,
                "status": "approved",
                "start_date": {"$lte": today_start_str},
                "end_date": {"$gte": today_start_str}
            })
            
            if time_off:
                # Worker is on approved time off
                record = LiveAttendanceRecord(
                    shift_id=shift['shift_id'],
                    worker_id=worker_id,
                    worker_name=worker_assignment['worker_name'],
                    worker_photo=worker_assignment.get('worker_photo'),
                    position=shift['position_title'],
                    workplace_name=workplace.get('workplace_name', 'N/A') if workplace else 'N/A',
                    scheduled_start=shift_start,
                    scheduled_end=shift_end,
                    status=AttendanceStatus.ON_TIME_OFF,
                    time_off_request_id=time_off['request_id']
                )
                attendance_records.append(record.model_dump())
                continue
            
            # Check attendance record
            attendance = await db.attendance.find_one({
                "shift_id": shift['shift_id'],
                "workforce_id": worker_id
            })
            
            if attendance:
                # Has attendance record
                clock_in_time = attendance.get('clock_in_time')
                clock_out_time = attendance.get('clock_out_time')
                
                if clock_out_time:
                    status = AttendanceStatus.CLOCKED_OUT
                elif clock_in_time:
                    # Check if late
                    clock_in_dt = datetime.fromisoformat(clock_in_time.replace('Z', '+00:00')) if isinstance(clock_in_time, str) else clock_in_time
                    # Make naive for comparison
                    if clock_in_dt.tzinfo:
                        clock_in_dt = clock_in_dt.replace(tzinfo=None)
                    minutes_late = max(0, int((clock_in_dt - shift_start).total_seconds() / 60))
                    
                    status = AttendanceStatus.LATE if minutes_late > 5 else AttendanceStatus.CLOCKED_IN
                    
                    record = LiveAttendanceRecord(
                        shift_id=shift['shift_id'],
                        worker_id=worker_id,
                        worker_name=worker_assignment['worker_name'],
                        worker_photo=worker_assignment.get('worker_photo'),
                        position=shift['position_title'],
                        workplace_name=workplace.get('workplace_name', 'N/A') if workplace else 'N/A',
                        scheduled_start=shift_start,
                        scheduled_end=shift_end,
                        status=status,
                        clock_in_time=clock_in_dt,
                        clock_out_time=datetime.fromisoformat(clock_out_time.replace('Z', '+00:00')) if clock_out_time else None,
                        minutes_late=minutes_late
                    )
                    attendance_records.append(record.model_dump())
                    continue
            
            # No attendance record - check if shift has started
            if current_time > shift_start + timedelta(minutes=15):
                # Shift started >15 min ago, no clock-in = MISSED
                status = AttendanceStatus.MISSED
            elif current_time > shift_start:
                # Shift started <15 min ago, no clock-in = LATE (might still show up)
                status = AttendanceStatus.LATE
            else:
                # Shift hasn't started yet
                status = AttendanceStatus.SCHEDULED
            
            record = LiveAttendanceRecord(
                shift_id=shift['shift_id'],
                worker_id=worker_id,
                worker_name=worker_assignment['worker_name'],
                worker_photo=worker_assignment.get('worker_photo'),
                position=shift['position_title'],
                workplace_name=workplace.get('workplace_name', 'N/A') if workplace else 'N/A',
                scheduled_start=shift_start,
                scheduled_end=shift_end,
                status=status
            )
            attendance_records.append(record.model_dump())
    
    # Group by status for summary
    summary = {
        "scheduled": len([r for r in attendance_records if r['status'] == 'scheduled']),
        "clocked_in": len([r for r in attendance_records if r['status'] == 'clocked_in']),
        "clocked_out": len([r for r in attendance_records if r['status'] == 'clocked_out']),
        "late": len([r for r in attendance_records if r['status'] == 'late']),
        "missed": len([r for r in attendance_records if r['status'] == 'missed']),
        "on_time_off": len([r for r in attendance_records if r['status'] == 'on_time_off']),
        "total": len(attendance_records)
    }
    
    return {
        "success": True,
        "data": {
            "records": attendance_records,
            "summary": summary
        }
    }


@router.get("/shift/{shift_id}")
async def get_shift_attendance(
    shift_id: str,
    current_user: dict = Depends(require_role('employer'))
):
    """Get live attendance for a specific shift"""
    db = await get_database()
    
    shift = await db.calendar_shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user['user_id']
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Similar logic as above but for single shift
    # ... (implement if needed)
    
    return {
        "success": True,
        "data": {}
    }


@router.post("/check-missed")
async def manual_missed_check(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role('employer'))
):
    """Manually trigger missed clock-in check"""
    db = await get_database()
    
    # Run check in background
    background_tasks.add_task(check_missed_clock_ins, db)
    
    return {
        "success": True,
        "message": "Checking for missed clock-ins..."
    }
