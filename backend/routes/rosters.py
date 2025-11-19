from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timedelta, date
from database import get_database
from auth.dependencies import get_current_user
from models.roster import (
    Roster, Role, Shift,
    CreateRosterRequest, CreateRoleRequest, CreateShiftRequest,
    AssignWorkforceRequest, BulkAssignRequest
)
import uuid

router = APIRouter()

# Helper function to generate roster title
def generate_roster_title(week_start: date, workplace_name: str) -> str:
    week_start_str = week_start.strftime("%b %d")
    return f"Week of {week_start_str} @ {workplace_name}"

# Helper function to check if workforce is available for a shift
async def check_workforce_availability(workforce_id: str, shift_date: str, start_time: str, end_time: str, db) -> bool:
    """
    Check if workforce member has set availability for the given shift time
    Returns True if available, False otherwise
    """
    try:
        # Parse shift date
        try:
            shift_date_obj = datetime.fromisoformat(shift_date.replace('Z', '+00:00'))
        except:
            shift_date_obj = datetime.strptime(shift_date, "%Y-%m-%d")
        
        # Get all availability blocks for this workforce member
        availability_blocks = await db.availability_events.find(
            {"workforce_id": workforce_id, "type": "available"}
        ).to_list(1000)
        
        # Check if any availability block covers this shift
        for avail in availability_blocks:
            try:
                avail_start = datetime.fromisoformat(avail["start"].replace('Z', '+00:00'))
                avail_end = datetime.fromisoformat(avail["end"].replace('Z', '+00:00'))
                
                # Check if dates match (same day)
                if avail_start.date() == shift_date_obj.date():
                    # Extract time components
                    avail_start_time = avail_start.strftime("%H:%M")
                    avail_end_time = avail_end.strftime("%H:%M")
                    
                    # Check if availability window covers the shift time
                    if avail_start_time <= start_time and end_time <= avail_end_time:
                        return True
            except Exception as e:
                print(f"Error checking availability block: {e}")
                continue
        
        return False
    except Exception as e:
        print(f"Error in check_workforce_availability: {e}")
        return False


@router.post("/rosters")
async def create_roster(
    request: CreateRosterRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create a new weekly roster for a workplace"""
    if current_user["user_type"] != "employer":
        raise HTTPException(status_code=403, detail="Only employers can create rosters")
    
    # Get workplace details
    workplace = await db.workplaces.find_one(
        {"workplace_id": request.workplace_id, "employer_id": current_user["user_id"]}
    )
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")
    
    # Calculate week end date (6 days after start)
    week_end = request.week_start_date + timedelta(days=6)
    
    # Generate title
    title = generate_roster_title(request.week_start_date, workplace["name"])
    
    # Create roster
    roster = Roster(
        roster_id=str(uuid.uuid4()),
        employer_id=current_user["user_id"],
        workplace_id=request.workplace_id,
        workplace_name=workplace["name"],
        week_start_date=request.week_start_date,
        week_end_date=week_end,
        title=title,
        notes=request.notes
    )
    
    await db.rosters.insert_one(roster.dict())
    
    return {"success": True, "data": roster}

@router.get("/rosters")
async def get_rosters(
    workplace_id: str = None,
    status: str = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all rosters for employer"""
    if current_user["user_type"] != "employer":
        raise HTTPException(status_code=403, detail="Only employers can view rosters")
    
    query = {"employer_id": current_user["user_id"]}
    if workplace_id:
        query["workplace_id"] = workplace_id
    if status:
        query["status"] = status
    
    rosters = await db.rosters.find(query).sort("week_start_date", -1).to_list(100)
    
    return {"success": True, "data": rosters}

@router.get("/rosters/{roster_id}")
async def get_roster_details(
    roster_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get detailed roster with roles and shifts"""
    roster = await db.rosters.find_one({"roster_id": roster_id})
    
    if not roster:
        raise HTTPException(status_code=404, detail="Roster not found")
    
    if roster["employer_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {"success": True, "data": roster}

@router.post("/rosters/{roster_id}/roles")
async def add_role_to_roster(
    roster_id: str,
    request: CreateRoleRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Add a role/position to a roster"""
    roster = await db.rosters.find_one({"roster_id": roster_id})
    
    if not roster or roster["employer_id"] != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Roster not found")
    
    # Create role
    role = Role(
        role_id=str(uuid.uuid4()),
        role_name=request.role_name,
        description=request.description,
        positions_needed=request.positions_needed,
        hourly_rate=request.hourly_rate,
        requirements=request.requirements or []
    )
    
    # Add role to roster
    await db.rosters.update_one(
        {"roster_id": roster_id},
        {
            "$push": {"roles": role.dict()},
            "$inc": {"total_positions": request.positions_needed},
            "$set": {"updated_date": datetime.utcnow()}
        }
    )
    
    return {"success": True, "data": role}

@router.post("/rosters/{roster_id}/shifts")
async def create_shifts(
    roster_id: str,
    request: CreateShiftRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create shift(s) for a role - supports recurring shifts"""
    roster = await db.rosters.find_one({"roster_id": roster_id})
    
    if not roster or roster["employer_id"] != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Roster not found")
    
    # Verify role exists in roster
    role_exists = any(r["role_id"] == request.role_id for r in roster.get("roles", []))
    if not role_exists:
        raise HTTPException(status_code=404, detail="Role not found in roster")
    
    shifts_to_create = []
    
    if request.recurring and request.recurring_days:
        # Create recurring shifts
        current_date = request.shift_date
        end_date = request.recurring_end_date or roster["week_end_date"]
        
        while current_date <= end_date:
            # Check if current day is in recurring_days (0=Monday, 6=Sunday)
            if current_date.weekday() in request.recurring_days:
                shift = Shift(
                    shift_id=str(uuid.uuid4()),
                    role_id=request.role_id,
                    shift_date=current_date,
                    start_time=request.start_time,
                    end_time=request.end_time,
                    color=request.color or "#3B82F6"
                )
                shifts_to_create.append(shift.dict())
            
            current_date += timedelta(days=1)
    else:
        # Create single shift
        shift = Shift(
            shift_id=str(uuid.uuid4()),
            role_id=request.role_id,
            shift_date=request.shift_date,
            start_time=request.start_time,
            end_time=request.end_time,
            color=request.color or "#3B82F6"
        )
        shifts_to_create.append(shift.dict())
    
    # Add shifts to roster
    if shifts_to_create:
        await db.rosters.update_one(
            {"roster_id": roster_id},
            {
                "$push": {"shifts": {"$each": shifts_to_create}},
                "$set": {"updated_date": datetime.utcnow()}
            }
        )
    
    return {"success": True, "data": {"shifts_created": len(shifts_to_create), "shifts": shifts_to_create}}

@router.post("/rosters/{roster_id}/shifts/{shift_id}/assign")
async def assign_workforce_to_shift(
    roster_id: str,
    shift_id: str,
    request: AssignWorkforceRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Assign a workforce member to a shift"""
    roster = await db.rosters.find_one({"roster_id": roster_id})
    
    if not roster or roster["employer_id"] != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Roster not found")
    
    # Get workforce details
    workforce = await db.users.find_one({"user_id": request.workforce_id, "user_type": "workforce"})
    if not workforce:
        raise HTTPException(status_code=404, detail="Workforce member not found")
    
    # Get workforce profile for photo
    workforce_profile = await db.workforce_profiles.find_one({"user_id": request.workforce_id})
    photo_url = workforce_profile.get("profile_picture") if workforce_profile else None
    
    # Update shift with workforce assignment
    result = await db.rosters.update_one(
        {"roster_id": roster_id, "shifts.shift_id": shift_id},
        {
            "$set": {
                "shifts.$.workforce_id": request.workforce_id,
                "shifts.$.workforce_name": workforce.get("full_name", "Unknown"),
                "shifts.$.workforce_photo": photo_url,
                "shifts.$.status": "assigned",
                "updated_date": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Update role filled count
    shift = next((s for s in roster["shifts"] if s["shift_id"] == shift_id), None)
    if shift:
        await db.rosters.update_one(
            {"roster_id": roster_id, "roles.role_id": shift["role_id"]},
            {"$inc": {"roles.$.positions_filled": 1, "total_filled": 1}}
        )
    
    return {"success": True, "message": "Workforce assigned successfully"}

@router.post("/rosters/shifts/bulk-assign")
async def bulk_assign_workforce(
    request: BulkAssignRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Assign workforce to multiple shifts at once"""
    if current_user["user_type"] != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get workforce details
    workforce = await db.users.find_one({"user_id": request.workforce_id})
    if not workforce:
        raise HTTPException(status_code=404, detail="Workforce member not found")
    
    workforce_profile = await db.workforce_profiles.find_one({"user_id": request.workforce_id})
    photo_url = workforce_profile.get("profile_picture") if workforce_profile else None
    
    updated_count = 0
    
    for shift_id in request.shift_ids:
        result = await db.rosters.update_one(
            {"shifts.shift_id": shift_id, "employer_id": current_user["user_id"]},
            {
                "$set": {
                    "shifts.$.workforce_id": request.workforce_id,
                    "shifts.$.workforce_name": workforce.get("full_name", "Unknown"),
                    "shifts.$.workforce_photo": photo_url,
                    "shifts.$.status": "assigned"
                }
            }
        )
        if result.modified_count > 0:
            updated_count += 1
    
    return {"success": True, "data": {"shifts_assigned": updated_count}}

@router.delete("/rosters/{roster_id}/shifts/{shift_id}/unassign")
async def unassign_workforce(
    roster_id: str,
    shift_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Remove workforce assignment from a shift"""
    roster = await db.rosters.find_one({"roster_id": roster_id})
    
    if not roster or roster["employer_id"] != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Roster not found")
    
    # Update shift to remove assignment
    result = await db.rosters.update_one(
        {"roster_id": roster_id, "shifts.shift_id": shift_id},
        {
            "$set": {
                "shifts.$.workforce_id": None,
                "shifts.$.workforce_name": None,
                "shifts.$.workforce_photo": None,
                "shifts.$.status": "open"
            }
        }
    )
    
    if result.modified_count > 0:
        # Decrease role filled count
        shift = next((s for s in roster["shifts"] if s["shift_id"] == shift_id), None)
        if shift and shift.get("role_id"):
            await db.rosters.update_one(
                {"roster_id": roster_id, "roles.role_id": shift["role_id"]},
                {"$inc": {"roles.$.positions_filled": -1, "total_filled": -1}}
            )
    
    return {"success": True, "message": "Workforce unassigned successfully"}

@router.get("/rosters/{roster_id}/calendar")
async def get_roster_calendar_events(
    roster_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get calendar events for a roster (for employer dashboard calendar)"""
    roster = await db.rosters.find_one({"roster_id": roster_id})
    
    if not roster:
        raise HTTPException(status_code=404, detail="Roster not found")
    
    if roster["employer_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Format shifts as calendar events
    events = []
    for shift in roster.get("shifts", []):
        # Get role details
        role = next((r for r in roster.get("roles", []) if r["role_id"] == shift["role_id"]), None)
        
        # Create datetime objects
        shift_date_str = shift["shift_date"]
        if isinstance(shift_date_str, date):
            shift_date_str = shift_date_str.isoformat()
        
        start_datetime = f"{shift_date_str}T{shift['start_time']}:00"
        end_datetime = f"{shift_date_str}T{shift['end_time']}:00"
        
        event = {
            "id": shift["shift_id"],
            "title": f"{role['role_name'] if role else 'Shift'} - {shift.get('workforce_name', 'Unassigned')}",
            "start": start_datetime,
            "end": end_datetime,
            "backgroundColor": shift.get("color", "#3B82F6"),
            "workforce_id": shift.get("workforce_id"),
            "workforce_name": shift.get("workforce_name"),
            "workforce_photo": shift.get("workforce_photo"),
            "role_name": role["role_name"] if role else "Unknown",
            "status": shift.get("status", "open")
        }
        events.append(event)
    
    return {"success": True, "data": events}
