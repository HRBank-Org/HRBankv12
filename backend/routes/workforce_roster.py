from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, date
from database import get_database
from auth.dependencies import get_current_user

router = APIRouter()

@router.get("/workforce/my-shifts")
async def get_my_shifts(
    status: str = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all shifts assigned to current workforce member"""
    if current_user["user_type"] != "workforce":
        raise HTTPException(status_code=403, detail="Only workforce can access this endpoint")
    
    # Get all rosters and extract shifts assigned to this workforce member
    rosters = await db.rosters.find(
        {"shifts.workforce_id": current_user["user_id"]}
    ).to_list(None)
    
    all_shifts = []
    for roster in rosters:
        for shift in roster.get("shifts", []):
            if shift.get("workforce_id") == current_user["user_id"]:
                # Get role details
                role = next(
                    (r for r in roster.get("roles", []) if r["role_id"] == shift["role_id"]),
                    None
                )
                
                shift_data = {
                    **shift,
                    "roster_id": roster["roster_id"],
                    "roster_title": roster["title"],
                    "workplace_name": roster["workplace_name"],
                    "role_name": role["role_name"] if role else "Unknown",
                    "hourly_rate": role.get("hourly_rate") if role else 17.60,
                }
                
                # Filter by status if provided
                if status and shift.get("status") != status:
                    continue
                    
                all_shifts.append(shift_data)
    
    # Sort by date
    all_shifts.sort(key=lambda x: x["shift_date"], reverse=False)
    
    return {"success": True, "data": all_shifts}

@router.get("/workforce/upcoming-shifts")
async def get_upcoming_shifts(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get upcoming shifts for workforce member"""
    if current_user["user_type"] != "workforce":
        raise HTTPException(status_code=403, detail="Only workforce can access this endpoint")
    
    today = date.today()
    
    # Get rosters with shifts assigned to this workforce member
    rosters = await db.rosters.find(
        {"shifts.workforce_id": current_user["user_id"]}
    ).to_list(None)
    
    upcoming_shifts = []
    for roster in rosters:
        for shift in roster.get("shifts", []):
            if shift.get("workforce_id") == current_user["user_id"]:
                shift_date = shift["shift_date"]
                if isinstance(shift_date, str):
                    shift_date = datetime.fromisoformat(shift_date).date()
                
                if shift_date >= today:
                    # Get role details
                    role = next(
                        (r for r in roster.get("roles", []) if r["role_id"] == shift["role_id"]),
                        None
                    )
                    
                    shift_data = {
                        **shift,
                        "roster_id": roster["roster_id"],
                        "workplace_name": roster["workplace_name"],
                        "role_name": role["role_name"] if role else "Unknown",
                        "hourly_rate": role.get("hourly_rate") if role else 17.60,
                    }
                    upcoming_shifts.append(shift_data)
    
    # Sort by date
    upcoming_shifts.sort(key=lambda x: x["shift_date"])
    
    return {"success": True, "data": upcoming_shifts[:10]}  # Return next 10 shifts

@router.post("/workforce/shifts/{shift_id}/confirm")
async def confirm_shift(
    shift_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Workforce member confirms they will attend the shift"""
    if current_user["user_type"] != "workforce":
        raise HTTPException(status_code=403, detail="Only workforce can confirm shifts")
    
    result = await db.rosters.update_one(
        {
            "shifts.shift_id": shift_id,
            "shifts.workforce_id": current_user["user_id"]
        },
        {"$set": {"shifts.$.status": "confirmed"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Shift not found or not assigned to you")
    
    return {"success": True, "message": "Shift confirmed"}
