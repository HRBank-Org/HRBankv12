"""
Recruitment and Job Matching System
Two-flow matching: Internal workforce first, then external candidates
"""
from fastapi import APIRouter, HTTPException, status, Depends, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from utils.matching_engine import calculate_match_score
from utils.calculations import haversine_distance
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/api/recruitment", tags=["Recruitment"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


class RoleSearchRequest(BaseModel):
    """Request model for finding candidates for a role"""
    occupation_template_id: str
    workplace_id: str
    shift_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    required_skills: List[str] = []
    required_certifications: List[str] = []


@router.post("/find-candidates", response_model=Dict)
async def find_candidates_for_role(
    search_request: RoleSearchRequest = Body(...),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Find suitable candidates for a role
    FLOW 1: Search internal workforce first (already employed by this employer)
    FLOW 2: Search external candidates from entire platform
    """
    
    # Get occupation template details
    template = await db.occupation_templates.find_one(
        {"template_id": search_request.occupation_template_id, "is_active": True},
        {"_id": 0}
    )
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Occupation template not found"
        )
    
    # Get workplace details
    workplace = await db.workplaces.find_one(
        {"workplace_id": search_request.workplace_id},
        {"_id": 0}
    )
    
    if not workplace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workplace not found"
        )
    
    # Verify employer owns this workplace
    if workplace.get("employer_id") != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this workplace"
        )
    
    # --- PHASE 1: SEARCH INTERNAL WORKFORCE ---
    internal_candidates = await _find_internal_candidates(
        employer_id=current_user["user_id"],
        template=template,
        workplace=workplace,
        search_request=search_request,
        db=db
    )
    
    # --- PHASE 2: SEARCH EXTERNAL CANDIDATES ---
    external_candidates = await _find_external_candidates(
        employer_id=current_user["user_id"],
        template=template,
        workplace=workplace,
        search_request=search_request,
        db=db
    )
    
    return {
        "success": True,
        "data": {
            "internal_candidates": internal_candidates,
            "external_candidates": external_candidates,
            "template_info": {
                "occupation_title": template["occupation_title"],
                "occupation_category": template["occupation_category"],
                "required_skills": template.get("required_skills", []),
                "required_certifications": template.get("required_certifications", [])
            }
        }
    }


async def _find_internal_candidates(
    employer_id: str,
    template: dict,
    workplace: dict,
    search_request: RoleSearchRequest,
    db
) -> List[Dict]:
    """
    Find candidates from employer's existing workforce
    Returns workers who are already employed by this employer
    """
    
    # Get all active employment relationships for this employer
    employment_relationships = await db.employment_relationships.find(
        {
            "employer_id": employer_id,
            "status": "active"
        },
        {"_id": 0}
    ).to_list(1000)
    
    if not employment_relationships:
        return []
    
    internal_candidates = []
    
    # Get all workforce IDs
    workforce_ids = [rel["workforce_id"] for rel in employment_relationships]
    
    # Batch fetch workforce profiles
    workforce_profiles = await db.workforce_profiles.find(
        {"workforce_id": {"$in": workforce_ids}},
        {"_id": 0}
    ).to_list(1000)
    
    # Create a map for quick lookup
    profile_map = {profile["workforce_id"]: profile for profile in workforce_profiles}
    
    # Batch fetch occupation profiles for these workers
    occupation_profiles = await db.occupation_profiles.find(
        {
            "workforce_id": {"$in": workforce_ids},
            "active": True,
            "occupation_category": template["occupation_category"]
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Group occupation profiles by workforce_id
    occ_profiles_by_worker = {}
    for occ_profile in occupation_profiles:
        worker_id = occ_profile["workforce_id"]
        if worker_id not in occ_profiles_by_worker:
            occ_profiles_by_worker[worker_id] = []
        occ_profiles_by_worker[worker_id].append(occ_profile)
    
    # For each worker with matching occupation, calculate match score
    for workforce_id, occ_profiles in occ_profiles_by_worker.items():
        worker_profile = profile_map.get(workforce_id)
        
        if not worker_profile:
            continue
        
        # Check if worker's address is verified and locked (data integrity requirement)
        if not worker_profile.get("address_verified"):
            continue
        
        if not worker_profile.get("address_locked"):
            continue
        
        # For each matching occupation profile
        for occ_profile in occ_profiles:
            # Calculate match score
            # Create mock role data for matching
            mock_role = {
                "role_title": template["occupation_title"],
                "required_skills": search_request.required_skills or template.get("required_skills", []),
                "required_certifications": search_request.required_certifications or template.get("required_certifications", [])
            }
            
            mock_shift = {
                "shift_date": search_request.shift_date or datetime.now().isoformat(),
                "start_time": search_request.start_time or "09:00",
                "end_time": search_request.end_time or "17:00"
            }
            
            match_score = calculate_match_score(
                worker_data=worker_profile,
                occupation_data=occ_profile,
                role_data=mock_role,
                shift_data=mock_shift,
                workplace_data=workplace
            )
            
            # Only include if match score >= 50%
            if match_score >= 50.0:
                # Calculate distance
                distance = 0
                if worker_profile.get('lat') and worker_profile.get('long'):
                    distance = haversine_distance(
                        worker_profile['lat'], worker_profile['long'],
                        workplace['lat'], workplace['long']
                    )
                
                # Get employment relationship details
                employment_rel = next((rel for rel in employment_relationships if rel["workforce_id"] == workforce_id), None)
                
                candidate = {
                    "workforce_id": workforce_id,
                    "full_name": worker_profile.get("full_name", "Unknown"),
                    "email": worker_profile.get("email"),
                    "profile_picture": worker_profile.get("profile_picture"),
                    "phone": worker_profile.get("phone"),
                    
                    # Occupation details
                    "occupation_id": occ_profile["occupation_id"],
                    "occupation_title": occ_profile["occupation_title"],
                    "occupation_category": occ_profile["occupation_category"],
                    "skills": occ_profile.get("skills", []),
                    "hourly_rate_preference": occ_profile.get("hourly_rate_preference"),
                    
                    # Employment info
                    "current_position": employment_rel.get("position_title") if employment_rel else None,
                    "employment_start_date": employment_rel.get("start_date") if employment_rel else None,
                    "employment_type": employment_rel.get("employment_type") if employment_rel else None,
                    
                    # Matching info
                    "match_score": match_score,
                    "distance_km": round(distance, 1),
                    
                    # Ratings
                    "average_rating": worker_profile.get("average_rating", 0),
                    "total_reviews": worker_profile.get("total_reviews", 0),
                    
                    # Verification status
                    "address_verified": worker_profile.get("address_verified", False),
                    "address_locked": worker_profile.get("address_locked", False),
                    "email_verified": worker_profile.get("email_verified", False),
                    
                    # Flag as internal
                    "is_internal": True
                }
                
                internal_candidates.append(candidate)
    
    # Sort by match score descending
    internal_candidates.sort(key=lambda x: x["match_score"], reverse=True)
    
    return internal_candidates[:20]  # Top 20 internal matches


async def _find_external_candidates(
    employer_id: str,
    template: dict,
    workplace: dict,
    search_request: RoleSearchRequest,
    db
) -> List[Dict]:
    """
    Find candidates from the entire platform (excluding current employees)
    Uses the full match engine with occupation, skills, availability, location, ratings
    """
    
    # Get list of current employees to exclude
    current_employees = await db.employment_relationships.find(
        {"employer_id": employer_id, "status": "active"},
        {"_id": 0, "workforce_id": 1}
    ).to_list(1000)
    
    current_employee_ids = [emp["workforce_id"] for emp in current_employees]
    
    # Find all occupation profiles matching the category (excluding current employees)
    matching_occupation_profiles = await db.occupation_profiles.find(
        {
            "occupation_category": template["occupation_category"],
            "active": True,
            "workforce_id": {"$nin": current_employee_ids}  # Exclude current employees
        },
        {"_id": 0}
    ).to_list(1000)
    
    if not matching_occupation_profiles:
        return []
    
    external_candidates = []
    
    # Get unique workforce IDs
    workforce_ids = list(set(occ["workforce_id"] for occ in matching_occupation_profiles))
    
    # Batch fetch workforce profiles
    workforce_profiles = await db.workforce_profiles.find(
        {"workforce_id": {"$in": workforce_ids}},
        {"_id": 0}
    ).to_list(1000)
    
    # Create a map for quick lookup
    profile_map = {profile["workforce_id"]: profile for profile in workforce_profiles}
    
    # Calculate match scores
    for occ_profile in matching_occupation_profiles:
        worker_profile = profile_map.get(occ_profile["workforce_id"])
        
        if not worker_profile:
            continue
        
        # CRITICAL: Check if worker's address is verified and locked
        if not worker_profile.get("address_verified"):
            continue
        
        if not worker_profile.get("address_locked"):
            continue
        
        # Create mock role data for matching
        mock_role = {
            "role_title": template["occupation_title"],
            "required_skills": search_request.required_skills or template.get("required_skills", []),
            "required_certifications": search_request.required_certifications or template.get("required_certifications", [])
        }
        
        mock_shift = {
            "shift_date": search_request.shift_date or datetime.now().isoformat(),
            "start_time": search_request.start_time or "09:00",
            "end_time": search_request.end_time or "17:00"
        }
        
        match_score = calculate_match_score(
            worker_data=worker_profile,
            occupation_data=occ_profile,
            role_data=mock_role,
            shift_data=mock_shift,
            workplace_data=workplace
        )
        
        # Only include if match score >= 50%
        if match_score >= 50.0:
            # Calculate distance
            distance = 0
            if worker_profile.get('lat') and worker_profile.get('long'):
                distance = haversine_distance(
                    worker_profile['lat'], worker_profile['long'],
                    workplace['lat'], workplace['long']
                )
            
            candidate = {
                "workforce_id": occ_profile["workforce_id"],
                "full_name": worker_profile.get("full_name", "Unknown"),
                "email": worker_profile.get("email"),
                "profile_picture": worker_profile.get("profile_picture"),
                "phone": worker_profile.get("phone"),
                
                # Occupation details
                "occupation_id": occ_profile["occupation_id"],
                "occupation_title": occ_profile["occupation_title"],
                "occupation_category": occ_profile["occupation_category"],
                "skills": occ_profile.get("skills", []),
                "hourly_rate_preference": occ_profile.get("hourly_rate_preference"),
                
                # Matching info
                "match_score": match_score,
                "distance_km": round(distance, 1),
                
                # Ratings
                "average_rating": worker_profile.get("average_rating", 0),
                "total_reviews": worker_profile.get("total_reviews", 0),
                
                # Verification status
                "address_verified": worker_profile.get("address_verified", False),
                "address_locked": worker_profile.get("address_locked", False),
                "email_verified": worker_profile.get("email_verified", False),
                
                # Flag as external
                "is_internal": False
            }
            
            external_candidates.append(candidate)
    
    # Sort by match score descending
    external_candidates.sort(key=lambda x: x["match_score"], reverse=True)
    
    return external_candidates[:30]  # Top 30 external matches


@router.post("/invite-candidate", response_model=Dict)
async def invite_candidate_for_role(
    workforce_id: str = Body(..., embed=True),
    role_id: str = Body(..., embed=True),
    message: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Send invitation to a candidate for a specific role
    Creates an invitation record and sends notification
    """
    
    # Verify role exists and belongs to employer
    role = await db.roles.find_one({"role_id": role_id}, {"_id": 0})
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Get shift to verify employer ownership
    shift = await db.shifts.find_one({"shift_id": role["shift_id"]}, {"_id": 0})
    
    if not shift or shift.get("employer_id") != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Verify workforce exists
    worker = await db.workforce_profiles.find_one(
        {"workforce_id": workforce_id},
        {"_id": 0}
    )
    
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found"
        )
    
    # Create invitation
    from uuid import uuid4
    invitation_id = f"inv_{uuid4().hex[:12]}"
    
    invitation = {
        "invitation_id": invitation_id,
        "employer_id": current_user["user_id"],
        "workforce_id": workforce_id,
        "role_id": role_id,
        "shift_id": shift["shift_id"],
        "workplace_id": shift["workplace_id"],
        "message": message,
        "status": "pending",  # pending, accepted, declined
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": None  # TODO: Add expiration logic
    }
    
    await db.invitations.insert_one(invitation)
    
    # TODO: Send notification to worker (email/SMS/push)
    
    return {
        "success": True,
        "data": {
            "invitation_id": invitation_id
        },
        "message": "Invitation sent successfully"
    }
