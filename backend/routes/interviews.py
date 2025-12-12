from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import require_role

router = APIRouter()

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.get("/list", response_model=Dict)
async def list_interviews(
    role_id: str = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all scheduled interviews for this employer"""
    
    query = {"employer_id": current_user['user_id']}
    if role_id:
        query["role_id"] = role_id
    
    interviews = await db.interviews.find(query, {"_id": 0}).sort("interview_date", 1).to_list(1000)
    
    return {
        "success": True,
        "data": {
            "interviews": interviews,
            "count": len(interviews)
        }
    }

@router.post("/send", response_model=Dict)
async def send_interview_invitation(
    interview_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Send an interview invitation to a candidate"""
    
    from uuid import uuid4
    
    interview = {
        "interview_id": f"int_{uuid4().hex[:12]}",
        "employer_id": current_user['user_id'],
        "role_id": interview_data.get('role_id'),
        "workforce_id": interview_data.get('workforce_id'),
        "interview_date": interview_data.get('interview_date'),
        "interview_location": interview_data.get('interview_location'),
        "message": interview_data.get('message', ''),
        "source": interview_data.get('source', 'external'),  # internal or external
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    # Get candidate name
    candidate = await db.workforce_profiles.find_one(
        {"workforce_id": interview_data.get('workforce_id')},
        {"_id": 0, "first_name": 1, "last_name": 1}
    )
    if candidate:
        interview['candidate_name'] = f"{candidate.get('first_name', '')} {candidate.get('last_name', '')}".strip()
    
    await db.interviews.insert_one(interview)
    
    # TODO: Send email/SMS notification to candidate
    
    return {
        "success": True,
        "data": {
            "interview_id": interview['interview_id']
        },
        "message": "Interview invitation sent successfully"
    }
