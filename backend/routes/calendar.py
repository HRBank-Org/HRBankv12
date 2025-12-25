from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List
from datetime import datetime, timedelta, timezone
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
            "created_date": datetime.now(timezone.utc).isoformat()
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
            "created_date": datetime.now(timezone.utc).isoformat()
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
    
    update_data["updated_date"] = datetime.now(timezone.utc).isoformat()
    
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
            "created_date": datetime.now(timezone.utc).isoformat()
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
            "created_date": datetime.now(timezone.utc).isoformat()
        })
        
        current_date += increment
    
    return shifts
