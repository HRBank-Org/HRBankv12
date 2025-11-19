from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List
from datetime import datetime, timedelta
from auth.dependencies import require_role
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

router = APIRouter(prefix="/api", tags=["calendar"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

# Workforce Calendar Endpoints
@router.get("/workforce/availability/calendar", response_model=Dict)
async def get_workforce_availability_calendar(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Get all availability events for calendar view
    Returns events in format compatible with react-big-calendar
    """
    events = await db.availability_events.find({
        "workforce_id": current_user["user_id"]
    }).to_list(1000)
    
    formatted_events = []
    for event in events:
        formatted_events.append({
            "id": event.get("id"),
            "title": event.get("title", "Available"),
            "start": event.get("start"),
            "end": event.get("end"),
            "type": event.get("type", "availability"),
            "recurring": event.get("recurring", False),
            "recurringPattern": event.get("recurringPattern"),
        })
    
    return {
        "success": True,
        "data": formatted_events
    }

@router.post("/workforce/availability/calendar", response_model=Dict)
async def create_workforce_availability_event(
    event_data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Create new availability event(s)
    Supports recurring events
    """
    title = event_data.get("title", "Available")
    start = event_data.get("start")
    end = event_data.get("end")
    event_type = event_data.get("type", "availability")
    recurring = event_data.get("recurring", False)
    recurring_pattern = event_data.get("recurringPattern")
    recurring_end_date = event_data.get("recurringEndDate")
    
    if not start or not end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start and end times are required"
        )
    
    # Parse dates
    try:
        start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    
    # Check for conflicts with accepted shifts if this is an availability block
    if event_type == "availability":
        conflicts = await check_availability_conflicts(
            db, 
            current_user["user_id"], 
            start_dt, 
            end_dt
        )
        if conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "Conflicts with accepted shifts",
                    "conflicts": conflicts
                }
            )
    
    created_events = []
    
    if recurring and recurring_pattern:
        # Create recurring events
        events_to_create = generate_recurring_events(
            start_dt, 
            end_dt, 
            recurring_pattern,
            recurring_end_date,
            title,
            event_type,
            current_user["user_id"]
        )
        
        if events_to_create:
            result = await db.availability_events.insert_many(events_to_create)
            # Fetch created events
            created_events = await db.availability_events.find({
                "_id": {"$in": result.inserted_ids}
            }).to_list(len(result.inserted_ids))
    else:
        # Create single event
        event = {
            "id": str(uuid.uuid4()),
            "workforce_id": current_user["user_id"],
            "title": title,
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat(),
            "type": event_type,
            "recurring": False,
            "created_date": datetime.utcnow().isoformat()
        }
        
        await db.availability_events.insert_one(event)
        created_events = [event]
    
    # Format response
    formatted_events = []
    for event in created_events:
        formatted_events.append({
            "id": event.get("id"),
            "title": event.get("title"),
            "start": event.get("start"),
            "end": event.get("end"),
            "type": event.get("type"),
        })
    
    return {
        "success": True,
        "data": formatted_events,
        "message": "Availability event(s) created"
    }

@router.delete("/workforce/availability/calendar/{event_id}", response_model=Dict)
async def delete_workforce_availability_event(
    event_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Delete an availability event"""
    result = await db.availability_events.delete_one({
        "id": event_id,
        "workforce_id": current_user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    return {
        "success": True,
        "message": "Event deleted"
    }

# Employer Calendar Endpoints
@router.get("/employer/shifts/calendar", response_model=Dict)
async def get_employer_shifts_calendar(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all shifts for calendar view
    Returns events in format compatible with react-big-calendar
    """
    shifts = await db.shifts.find({
        "employer_id": current_user["user_id"]
    }).to_list(1000)
    
    formatted_events = []
    for shift in shifts:
        formatted_events.append({
            "id": shift.get("shift_id"),
            "title": shift.get("shift_name", "Shift"),
            "start": shift.get("start_time"),
            "end": shift.get("end_time"),
            "workplace_id": shift.get("workplace_id"),
            "workplace_name": shift.get("workplace_name"),
            "positions_needed": shift.get("positions_needed", 1),
            "positions_filled": shift.get("positions_filled", 0),
            "description": shift.get("description", ""),
            "type": "shift"
        })
    
    return {
        "success": True,
        "data": formatted_events
    }

@router.post("/employer/shifts/calendar", response_model=Dict)
async def create_employer_shift_event(
    event_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Create new shift event(s)
    Supports recurring shifts
    """
    title = event_data.get("title")
    workplace_id = event_data.get("workplace_id")
    start = event_data.get("start")
    end = event_data.get("end")
    positions_needed = event_data.get("positions_needed", 1)
    description = event_data.get("description", "")
    recurring = event_data.get("recurring", False)
    recurring_pattern = event_data.get("recurringPattern")
    recurring_end_date = event_data.get("recurringEndDate")
    
    if not all([title, workplace_id, start, end]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title, workplace, start and end times are required"
        )
    
    # Verify workplace belongs to employer
    workplace = await db.workplaces.find_one({
        "workplace_id": workplace_id,
        "employer_id": current_user["user_id"]
    })
    
    if not workplace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workplace not found"
        )
    
    # Parse dates
    try:
        start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    
    created_shifts = []
    
    if recurring and recurring_pattern:
        # Create recurring shifts
        shifts_to_create = generate_recurring_shifts(
            start_dt,
            end_dt,
            recurring_pattern,
            recurring_end_date,
            title,
            workplace_id,
            workplace.get("workplace_name"),
            positions_needed,
            description,
            current_user["user_id"]
        )
        
        if shifts_to_create:
            result = await db.shifts.insert_many(shifts_to_create)
            # Fetch created shifts
            created_shifts = await db.shifts.find({
                "_id": {"$in": result.inserted_ids}
            }).to_list(len(result.inserted_ids))
    else:
        # Create single shift
        shift = {
            "shift_id": str(uuid.uuid4()),
            "employer_id": current_user["user_id"],
            "workplace_id": workplace_id,
            "workplace_name": workplace.get("workplace_name"),
            "shift_name": title,
            "start_time": start_dt.isoformat(),
            "end_time": end_dt.isoformat(),
            "positions_needed": positions_needed,
            "positions_filled": 0,
            "description": description,
            "status": "open",
            "created_date": datetime.utcnow().isoformat()
        }
        
        await db.shifts.insert_one(shift)
        created_shifts = [shift]
    
    # Format response
    formatted_shifts = []
    for shift in created_shifts:
        formatted_shifts.append({
            "id": shift.get("shift_id"),
            "title": shift.get("shift_name"),
            "start": shift.get("start_time"),
            "end": shift.get("end_time"),
            "workplace_id": shift.get("workplace_id"),
            "workplace_name": shift.get("workplace_name"),
            "positions_needed": shift.get("positions_needed"),
            "positions_filled": shift.get("positions_filled", 0),
            "description": shift.get("description"),
            "type": "shift"
        })
    
    return {
        "success": True,
        "data": formatted_shifts,
        "message": "Shift(s) created"
    }

@router.put("/employer/shifts/calendar/{shift_id}", response_model=Dict)
async def update_employer_shift_event(
    shift_id: str,
    event_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Update an existing shift"""
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    
    # Parse dates if provided
    update_data = {}
    if event_data.get("title"):
        update_data["shift_name"] = event_data["title"]
    if event_data.get("start"):
        try:
            start_dt = datetime.fromisoformat(event_data["start"].replace('Z', '+00:00'))
            update_data["start_time"] = start_dt.isoformat()
        except:
            pass
    if event_data.get("end"):
        try:
            end_dt = datetime.fromisoformat(event_data["end"].replace('Z', '+00:00'))
            update_data["end_time"] = end_dt.isoformat()
        except:
            pass
    if event_data.get("positions_needed"):
        update_data["positions_needed"] = int(event_data["positions_needed"])
    if event_data.get("description") is not None:
        update_data["description"] = event_data["description"]
    if event_data.get("workplace_id"):
        # Verify new workplace belongs to employer
        workplace = await db.workplaces.find_one({
            "workplace_id": event_data["workplace_id"],
            "employer_id": current_user["user_id"]
        })
        if workplace:
            update_data["workplace_id"] = event_data["workplace_id"]
            update_data["workplace_name"] = workplace.get("workplace_name")
    
    update_data["updated_date"] = datetime.utcnow().isoformat()
    
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {"$set": update_data}
    )
    
    # Get updated shift
    updated_shift = await db.shifts.find_one({"shift_id": shift_id})
    
    return {
        "success": True,
        "data": {
            "id": updated_shift.get("shift_id"),
            "title": updated_shift.get("shift_name"),
            "start": updated_shift.get("start_time"),
            "end": updated_shift.get("end_time"),
            "workplace_id": updated_shift.get("workplace_id"),
            "workplace_name": updated_shift.get("workplace_name"),
            "positions_needed": updated_shift.get("positions_needed"),
            "positions_filled": updated_shift.get("positions_filled", 0),
            "description": updated_shift.get("description"),
            "type": "shift"
        },
        "message": "Shift updated"
    }

@router.delete("/employer/shifts/calendar/{shift_id}", response_model=Dict)
async def delete_employer_shift_event(
    shift_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Delete a shift"""
    # Check if shift has bookings
    bookings = await db.bookings.find_one({
        "shift_id": shift_id,
        "status": {"$in": ["accepted", "confirmed", "in_progress"]}
    })
    
    if bookings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete shift with active bookings"
        )
    
    result = await db.shifts.delete_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    
    return {
        "success": True,
        "message": "Shift deleted"
    }

# Helper Functions
async def check_availability_conflicts(db, workforce_id: str, start_dt: datetime, end_dt: datetime) -> List:
    """Check if availability time conflicts with accepted shifts"""
    conflicts = []
    
    # Find bookings that overlap with the availability time
    bookings = await db.bookings.find({
        "workforce_id": workforce_id,
        "status": {"$in": ["accepted", "confirmed", "in_progress"]}
    }).to_list(1000)
    
    for booking in bookings:
        try:
            shift_date = booking.get("shift_date")
            shift_start = booking.get("start_time")
            shift_end = booking.get("end_time")
            
            if shift_date and shift_start and shift_end:
                # Parse shift datetime
                shift_dt = datetime.fromisoformat(shift_date.replace('Z', '+00:00'))
                shift_start_parts = shift_start.split(':')
                shift_end_parts = shift_end.split(':')
                
                shift_start_dt = shift_dt.replace(
                    hour=int(shift_start_parts[0]), 
                    minute=int(shift_start_parts[1])
                )
                shift_end_dt = shift_dt.replace(
                    hour=int(shift_end_parts[0]), 
                    minute=int(shift_end_parts[1])
                )
                
                # Check for overlap
                if not (end_dt <= shift_start_dt or start_dt >= shift_end_dt):
                    conflicts.append({
                        "booking_id": booking.get("booking_id"),
                        "shift_date": shift_date,
                        "shift_time": f"{shift_start} - {shift_end}",
                        "workplace": booking.get("workplace_name", "Unknown")
                    })
        except Exception as e:
            print(f"Error checking conflict: {e}")
            continue
    
    return conflicts

def generate_recurring_events(
    start_dt: datetime, 
    end_dt: datetime, 
    pattern: str,
    end_date: str,
    title: str,
    event_type: str,
    workforce_id: str
) -> List[dict]:
    """Generate recurring availability events"""
    events = []
    
    if not end_date:
        # Default to 3 months if no end date specified
        end_date = (start_dt + timedelta(days=90)).isoformat()
    
    try:
        end_date_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    except:
        end_date_dt = start_dt + timedelta(days=90)
    
    duration = end_dt - start_dt
    current_date = start_dt
    
    # Determine increment based on pattern
    if pattern == "daily":
        increment = timedelta(days=1)
    elif pattern == "weekly":
        increment = timedelta(weeks=1)
    elif pattern == "biweekly":
        increment = timedelta(weeks=2)
    else:
        increment = timedelta(weeks=1)
    
    # Generate events
    while current_date <= end_date_dt:
        event_end = current_date + duration
        
        events.append({
            "id": str(uuid.uuid4()),
            "workforce_id": workforce_id,
            "title": title,
            "start": current_date.isoformat(),
            "end": event_end.isoformat(),
            "type": event_type,
            "recurring": True,
            "recurringPattern": pattern,
            "created_date": datetime.utcnow().isoformat()
        })
        
        current_date += increment
    
    return events

def generate_recurring_shifts(
    start_dt: datetime,
    end_dt: datetime,
    pattern: str,
    end_date: str,
    title: str,
    workplace_id: str,
    workplace_name: str,
    positions_needed: int,
    description: str,
    employer_id: str
) -> List[dict]:
    """Generate recurring shifts"""
    shifts = []
    
    if not end_date:
        # Default to 3 months if no end date specified
        end_date = (start_dt + timedelta(days=90)).isoformat()
    
    try:
        end_date_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    except:
        end_date_dt = start_dt + timedelta(days=90)
    
    duration = end_dt - start_dt
    current_date = start_dt
    
    # Determine increment based on pattern
    if pattern == "daily":
        increment = timedelta(days=1)
    elif pattern == "weekly":
        increment = timedelta(weeks=1)
    elif pattern == "biweekly":
        increment = timedelta(weeks=2)
    else:
        increment = timedelta(weeks=1)
    
    # Generate shifts
    while current_date <= end_date_dt:
        shift_end = current_date + duration
        
        shifts.append({
            "shift_id": str(uuid.uuid4()),
            "employer_id": employer_id,
            "workplace_id": workplace_id,
            "workplace_name": workplace_name,
            "shift_name": title,
            "start_time": current_date.isoformat(),
            "end_time": shift_end.isoformat(),
            "positions_needed": positions_needed,
            "positions_filled": 0,
            "description": description,
            "status": "open",
            "recurring": True,
            "recurringPattern": pattern,
            "created_date": datetime.utcnow().isoformat()
        })
        
        current_date += increment
    
    return shifts


# New endpoints for shift conflict checking and day-off requests

@router.get("/workforce/availability/conflicts", response_model=Dict)
async def check_availability_conflicts(
    start_date: str,
    end_date: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Check if workforce member has confirmed shifts in the given date range
    Returns list of confirmed shifts that would conflict
    """
    try:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    # Get all rosters with shifts assigned to this user
    rosters = await db.rosters.find({
        "shifts.workforce_id": current_user["user_id"],
        "shifts.status": {"$in": ["assigned", "confirmed"]}
    }).to_list(None)
    
    conflicts = []
    for roster in rosters:
        for shift in roster.get("shifts", []):
            if shift.get("workforce_id") == current_user["user_id"]:
                if shift.get("status") in ["assigned", "confirmed"]:
                    # Check if shift overlaps with requested availability period
                    shift_date = datetime.fromisoformat(shift["shift_date"])
                    if start_dt.date() <= shift_date.date() <= end_dt.date():
                        role = next(
                            (r for r in roster.get("roles", []) if r["role_id"] == shift["role_id"]),
                            None
                        )
                        conflicts.append({
                            "shift_id": shift["shift_id"],
                            "shift_date": shift["shift_date"],
                            "start_time": shift["start_time"],
                            "end_time": shift["end_time"],
                            "status": shift["status"],
                            "role_name": role["role_name"] if role else "Unknown",
                            "workplace_name": roster["workplace_name"],
                            "employer_id": roster["employer_id"]
                        })
    
    return {
        "success": True,
        "data": {
            "has_conflicts": len(conflicts) > 0,
            "conflicts": conflicts
        }
    }


@router.post("/workforce/request-day-off", response_model=Dict)
async def request_day_off(
    request_data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Request a day off for a confirmed shift
    Must be at least 48 hours before the shift
    Notifies employer and suggests replacement workforce
    """
    shift_id = request_data.get("shift_id")
    reason = request_data.get("reason", "Personal")
    
    if not shift_id:
        raise HTTPException(status_code=400, detail="shift_id required")
    
    # Find the roster containing this shift
    roster = await db.rosters.find_one({
        "shifts.shift_id": shift_id,
        "shifts.workforce_id": current_user["user_id"]
    })
    
    if not roster:
        raise HTTPException(status_code=404, detail="Shift not found or not assigned to you")
    
    # Get the specific shift
    shift = next((s for s in roster.get("shifts", []) if s["shift_id"] == shift_id), None)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Check if shift is confirmed
    if shift.get("status") not in ["assigned", "confirmed"]:
        raise HTTPException(status_code=400, detail="Can only request day off for confirmed shifts")
    
    # Check 48-hour rule
    shift_datetime = datetime.fromisoformat(shift["shift_date"])
    shift_start_time = shift["start_time"]
    shift_start_dt = datetime.combine(shift_datetime.date(), datetime.strptime(shift_start_time, "%H:%M").time())
    
    hours_until_shift = (shift_start_dt - datetime.now()).total_seconds() / 3600
    if hours_until_shift < 48:
        raise HTTPException(
            status_code=400, 
            detail=f"Must request day off at least 48 hours in advance. Shift is in {hours_until_shift:.1f} hours"
        )
    
    # Get role details
    role = next((r for r in roster.get("roles", []) if r["role_id"] == shift["role_id"]), None)
    
    # Find replacement workforce members
    # 1. Same role/occupation
    # 2. Available during shift time
    # 3. Within reasonable distance of workplace
    
    replacements = []
    # Get workforce profiles with matching occupation
    if role:
        matching_profiles = await db.occupation_profiles.find({
            "occupation_title": role["role_name"],
            "active": True
        }).to_list(10)
        
        for profile in matching_profiles:
            workforce_id = profile.get("workforce_id")
            if workforce_id == current_user["user_id"]:
                continue  # Skip the user requesting day off
            
            # Check if they're available (simple check - could be enhanced)
            # Check if they don't have a conflicting shift
            conflict_roster = await db.rosters.find_one({
                "shifts.workforce_id": workforce_id,
                "shifts.shift_date": shift["shift_date"],
                "shifts.status": {"$in": ["assigned", "confirmed"]}
            })
            
            if not conflict_roster:
                # Get workforce user details
                workforce_user = await db.workforce_profiles.find_one({"workforce_id": workforce_id})
                if workforce_user:
                    replacements.append({
                        "workforce_id": workforce_id,
                        "full_name": workforce_user.get("full_name", "Unknown"),
                        "occupation_title": profile.get("occupation_title"),
                        "years_of_experience": profile.get("years_of_experience", 0),
                        "skill_rating_avg": profile.get("skill_rating_avg", 0)
                    })
    
    # Create day-off request
    day_off_request = {
        "request_id": str(uuid.uuid4()),
        "workforce_id": current_user["user_id"],
        "shift_id": shift_id,
        "roster_id": roster["roster_id"],
        "employer_id": roster["employer_id"],
        "shift_date": shift["shift_date"],
        "start_time": shift["start_time"],
        "end_time": shift["end_time"],
        "reason": reason,
        "status": "pending",  # pending, approved, rejected
        "suggested_replacements": replacements[:5],  # Top 5 suggestions
        "created_date": datetime.utcnow().isoformat(),
        "shift_details": {
            "role_name": role["role_name"] if role else "Unknown",
            "workplace_name": roster["workplace_name"],
            "hourly_rate": role.get("hourly_rate") if role else 17.60
        }
    }
    
    await db.day_off_requests.insert_one(day_off_request)
    
    # Create notification for employer
    notification = {
        "notification_id": str(uuid.uuid4()),
        "user_id": roster["employer_id"],
        "user_type": "employer",
        "type": "day_off_request",
        "title": "Day Off Request",
        "message": f"Workforce member has requested day off for shift on {shift['shift_date']} at {shift['start_time']}. {len(replacements)} replacement suggestions available.",
        "data": {
            "request_id": day_off_request["request_id"],
            "shift_id": shift_id,
            "workforce_id": current_user["user_id"],
            "shift_date": shift["shift_date"]
        },
        "read": False,
        "created_date": datetime.utcnow().isoformat()
    }
    
    await db.notifications.insert_one(notification)
    
    return {
        "success": True,
        "data": {
            "request_id": day_off_request["request_id"],
            "status": "pending",
            "suggested_replacements_count": len(replacements),
            "message": f"Day off request submitted. {len(replacements)} replacement workers suggested to employer."
        }
    }


@router.get("/workforce/day-off-requests", response_model=Dict)
async def get_my_day_off_requests(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get all day-off requests for current workforce member"""
    requests = await db.day_off_requests.find({
        "workforce_id": current_user["user_id"]
    }).sort("created_date", -1).to_list(100)
    
    return {
        "success": True,
        "data": requests
    }


@router.get("/employer/day-off-requests", response_model=Dict)
async def get_employer_day_off_requests(
    status: str = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all day-off requests for employer's shifts"""
    query = {"employer_id": current_user["user_id"]}
    if status:
        query["status"] = status
    
    requests = await db.day_off_requests.find(query).sort("created_date", -1).to_list(100)
    
    # Enrich with workforce details
    for request in requests:
        workforce = await db.workforce_profiles.find_one({"workforce_id": request["workforce_id"]})
        if workforce:
            request["workforce_name"] = workforce.get("full_name", "Unknown")
    
    return {
        "success": True,
        "data": requests
    }


@router.post("/employer/day-off-requests/{request_id}/respond", response_model=Dict)
async def respond_to_day_off_request(
    request_id: str,
    response_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Employer responds to day-off request
    Can approve (with optional replacement) or reject
    """
    action = response_data.get("action")  # approve or reject
    replacement_workforce_id = response_data.get("replacement_workforce_id")
    
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    
    request = await db.day_off_requests.find_one({
        "request_id": request_id,
        "employer_id": current_user["user_id"]
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Day-off request not found")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Update request status
    update_data = {
        "status": "approved" if action == "approve" else "rejected",
        "response_date": datetime.utcnow().isoformat(),
        "replacement_workforce_id": replacement_workforce_id if action == "approve" else None
    }
    
    await db.day_off_requests.update_one(
        {"request_id": request_id},
        {"$set": update_data}
    )
    
    # If approved, update the shift assignment
    if action == "approve":
        roster = await db.rosters.find_one({"roster_id": request["roster_id"]})
        if roster:
            # Update shift to remove original workforce or assign replacement
            shifts = roster.get("shifts", [])
            for shift in shifts:
                if shift["shift_id"] == request["shift_id"]:
                    if replacement_workforce_id:
                        shift["workforce_id"] = replacement_workforce_id
                        shift["status"] = "assigned"
                    else:
                        shift["workforce_id"] = None
                        shift["status"] = "open"
            
            await db.rosters.update_one(
                {"roster_id": request["roster_id"]},
                {"$set": {"shifts": shifts}}
            )
    
    # Notify workforce member
    notification = {
        "notification_id": str(uuid.uuid4()),
        "user_id": request["workforce_id"],
        "user_type": "workforce",
        "type": "day_off_response",
        "title": f"Day Off Request {action.capitalize()}d",
        "message": f"Your day off request for {request['shift_date']} has been {action}d.",
        "data": {
            "request_id": request_id,
            "shift_id": request["shift_id"],
            "action": action
        },
        "read": False,
        "created_date": datetime.utcnow().isoformat()
    }
    
    await db.notifications.insert_one(notification)
    
    return {
        "success": True,
        "data": {
            "request_id": request_id,
            "status": update_data["status"],
            "message": f"Day off request {action}d successfully"
        }
    }

