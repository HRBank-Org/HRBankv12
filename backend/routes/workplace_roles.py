from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List
from datetime import datetime
from auth.dependencies import require_role, get_current_user
from models.workplace_roles import WorkplaceRole, WorkplaceRoleCreate, WorkplaceRoleUpdate
import uuid

router = APIRouter(prefix="/api/employer/workplace-roles", tags=["Workplace Roles"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.post("/create", response_model=Dict)
async def create_workplace_role(
    role_data: WorkplaceRoleCreate,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Create a new workplace role from occupation template
    Employer selects occupation template and can add additional requirements
    """
    
    # Get occupation template details to fetch required certifications
    from utils.occupation_categories import OCCUPATION_CATEGORIES
    
    occupation_template = role_data.occupation_template
    occupation_category = None
    occupation_required_certs = []
    
    # Find the occupation in categories
    for category_name, category_data in OCCUPATION_CATEGORIES.items():
        for occ in category_data.get("occupations", []):
            if isinstance(occ, dict):
                occ_title = occ.get("title", "")
                occ_certs = occ.get("required_certifications", [])
            else:
                occ_title = occ
                occ_certs = []
            
            if occ_title.lower() == occupation_template.lower():
                occupation_category = category_name
                occupation_required_certs = occ_certs
                break
        
        if occupation_category:
            break
    
    if not occupation_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Occupation template '{occupation_template}' not found"
        )
    
    # Combine occupation-required certs with employer's additional certs
    all_required_certs = list(set(occupation_required_certs + role_data.additional_certifications))
    
    # Verify workplace belongs to employer (if provided)
    if role_data.workplace_id:
        workplace = await db.workplaces.find_one({
            'workplace_id': role_data.workplace_id,
            'employer_id': current_user['user_id']
        })
        
        if not workplace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workplace not found or doesn't belong to you"
            )
    
    # Create role
    role = WorkplaceRole(
        employer_id=current_user['user_id'],
        workplace_id=role_data.workplace_id,
        role_name=role_data.role_name,
        occupation_template=occupation_template,
        occupation_category=occupation_category,
        required_skills=role_data.required_skills,
        required_certifications=all_required_certs,
        occupation_required_certifications=occupation_required_certs,
        hourly_rate=role_data.hourly_rate,
        description=role_data.description,
        positions_available=role_data.positions_available
    )
    
    await db.workplace_roles.insert_one(role.model_dump())
    
    return {
        "success": True,
        "data": {
            "role_id": role.role_id,
            "role_name": role.role_name,
            "occupation_template": role.occupation_template
        },
        "message": f"Role '{role.role_name}' created successfully"
    }

@router.get("/list", response_model=Dict)
async def list_workplace_roles(
    workplace_id: str = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all workplace roles for this employer
    Optionally filter by workplace_id
    """
    
    query = {"employer_id": current_user['user_id']}
    if workplace_id:
        query["workplace_id"] = workplace_id
    
    roles = await db.workplace_roles.find(query, {"_id": 0}).sort("created_date", -1).to_list(1000)
    
    # Enrich with filled worker info
    for role in roles:
        if role.get('filled_by_workforce_id'):
            worker = await db.users.find_one(
                {"user_id": role['filled_by_workforce_id']},
                {"_id": 0, "first_name": 1, "last_name": 1}
            )
            if worker:
                role['filled_by_worker_name'] = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip()
    
    return {
        "success": True,
        "data": {
            "roles": roles,
            "total": len(roles),
            "unfilled": len([r for r in roles if r.get('status') == 'unfilled']),
            "filled": len([r for r in roles if r.get('status') == 'filled'])
        }
    }

@router.get("/{role_id}", response_model=Dict)
async def get_role_details(
    role_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get detailed information about a specific role"""
    
    role = await db.workplace_roles.find_one({
        "role_id": role_id,
        "employer_id": current_user['user_id']
    }, {"_id": 0})
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Get workplace details if applicable
    if role.get('workplace_id'):
        workplace = await db.workplaces.find_one(
            {"workplace_id": role['workplace_id']},
            {"_id": 0, "workplace_name": 1, "address": 1}
        )
        if workplace:
            role['workplace_details'] = workplace
    
    return {
        "success": True,
        "data": role
    }

@router.put("/{role_id}/update", response_model=Dict)
async def update_workplace_role(
    role_id: str,
    update_data: WorkplaceRoleUpdate,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Update a workplace role"""
    
    # Verify role belongs to employer
    role = await db.workplace_roles.find_one({
        "role_id": role_id,
        "employer_id": current_user['user_id']
    })
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Build update dict
    update_dict = {"updated_date": datetime.utcnow()}
    
    if update_data.role_name:
        update_dict["role_name"] = update_data.role_name
    
    if update_data.required_skills is not None:
        update_dict["required_skills"] = update_data.required_skills
    
    if update_data.additional_certifications is not None:
        # Merge with occupation-required certs
        occupation_certs = role.get('occupation_required_certifications', [])
        all_certs = list(set(occupation_certs + update_data.additional_certifications))
        update_dict["required_certifications"] = all_certs
    
    if update_data.hourly_rate is not None:
        update_dict["hourly_rate"] = update_data.hourly_rate
    
    if update_data.description is not None:
        update_dict["description"] = update_data.description
    
    if update_data.positions_available is not None:
        update_dict["positions_available"] = update_data.positions_available
    
    await db.workplace_roles.update_one(
        {"role_id": role_id},
        {"$set": update_dict}
    )
    
    return {
        "success": True,
        "message": "Role updated successfully"
    }

@router.delete("/{role_id}/delete", response_model=Dict)
async def delete_workplace_role(
    role_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Delete a workplace role"""
    
    # Verify role belongs to employer
    role = await db.workplace_roles.find_one({
        "role_id": role_id,
        "employer_id": current_user['user_id']
    })
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Check if role is filled or has pending invitations
    if role.get('status') == 'filled':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a filled role. Please reassign the worker first."
        )
    
    # Check for pending invitations
    pending_invites = await db.invite_tokens.count_documents({
        "role_id": role_id,
        "status": "sent"
    })
    
    if pending_invites > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role with {pending_invites} pending invitation(s)"
        )
    
    await db.workplace_roles.delete_one({"role_id": role_id})
    
    return {
        "success": True,
        "message": "Role deleted successfully"
    }

@router.post("/{role_id}/post-to-match-engine", response_model=Dict)
async def post_role_to_match_engine(
    role_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Post an unfilled role to the match engine as a job posting
    The match engine will find qualified candidates
    """
    
    # Verify role belongs to employer and is unfilled
    role = await db.workplace_roles.find_one({
        "role_id": role_id,
        "employer_id": current_user['user_id']
    })
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    if role.get('status') != 'unfilled':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only post unfilled roles to match engine"
        )
    
    # Get employer details
    employer_profile = await db.employer_profiles.find_one(
        {"employer_id": current_user['user_id']},
        {"_id": 0}
    )
    
    # Get workplace details if applicable
    workplace = None
    if role.get('workplace_id'):
        workplace = await db.workplaces.find_one(
            {"workplace_id": role['workplace_id']},
            {"_id": 0}
        )
    
    # Create job posting from role
    job_posting = {
        "job_id": f"job_{uuid.uuid4().hex[:12]}",
        "employer_id": current_user['user_id'],
        "company_name": employer_profile.get('company_name', 'Company'),
        "workplace_id": role.get('workplace_id'),
        "workplace_name": workplace.get('workplace_name') if workplace else None,
        "workplace_address": workplace.get('address') if workplace else employer_profile.get('address'),
        "workplace_latitude": workplace.get('latitude') if workplace else None,
        "workplace_longitude": workplace.get('longitude') if workplace else None,
        
        # Job details from role
        "position_title": role['role_name'],
        "occupation_category": role['occupation_category'],
        "job_title": f"{role['role_name']} ({role['occupation_template']})",
        "job_description": role.get('description', f"We are looking for a qualified {role['occupation_template']} to join our team."),
        "employment_type": "full_time",
        
        # Requirements
        "required_skills": role.get('required_skills', []),
        "required_certifications": role.get('required_certifications', []),
        "occupation_required_certifications": role.get('occupation_required_certifications', []),
        
        # Compensation
        "hourly_rate_min": role.get('hourly_rate'),
        "hourly_rate_max": role.get('hourly_rate'),
        
        # Availability
        "positions_available": role.get('positions_available', 1),
        "max_distance_km": 50,  # Default 50km radius
        
        # Status
        "status": "active",
        "posted_from_role_id": role_id,
        
        # Metadata
        "created_date": datetime.utcnow().isoformat(),
        "application_deadline": (datetime.utcnow() + timedelta(days=30)).isoformat()
    }
    
    await db.jobs.insert_one(job_posting)
    
    # Update role status
    await db.workplace_roles.update_one(
        {"role_id": role_id},
        {"$set": {
            "status": "posted_to_match",
            "posted_as_job_id": job_posting['job_id'],
            "posted_date": datetime.utcnow(),
            "updated_date": datetime.utcnow()
        }}
    )
    
    return {
        "success": True,
        "data": {
            "job_id": job_posting['job_id'],
            "role_id": role_id
        },
        "message": f"Role '{role['role_name']}' posted to match engine successfully"
    }

@router.get("/{role_id}/matched-candidates", response_model=Dict)
async def get_matched_candidates(
    role_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get candidates matched to this role via the match engine
    """
    
    # Verify role belongs to employer
    role = await db.workplace_roles.find_one({
        "role_id": role_id,
        "employer_id": current_user['user_id']
    })
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    if role.get('status') != 'posted_to_match' or not role.get('posted_as_job_id'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role has not been posted to match engine"
        )
    
    job_id = role['posted_as_job_id']
    
    # Get matched candidates
    matches = await db.job_matches.find(
        {"job_id": job_id},
        {"_id": 0}
    ).sort("match_score", -1).to_list(100)
    
    # Enrich with worker details
    for match in matches:
        worker = await db.users.find_one(
            {"user_id": match['workforce_id']},
            {"_id": 0, "first_name": 1, "last_name": 1, "email": 1}
        )
        
        if worker:
            match['worker_name'] = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip()
            match['worker_email'] = worker.get('email')
        
        # Get application status if exists
        application = await db.job_applications.find_one(
            {"job_id": job_id, "workforce_id": match['workforce_id']},
            {"_id": 0, "status": 1}
        )
        
        if application:
            match['application_status'] = application.get('status')
    
    return {
        "success": True,
        "data": {
            "matches": matches,
            "total": len(matches)
        }
    }

@router.get("/templates/occupations", response_model=Dict)
async def get_occupation_templates(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all available occupation templates from super-admin
    For employers to select when creating roles
    """
    
    from utils.occupation_categories import OCCUPATION_CATEGORIES
    
    # Format for frontend consumption
    templates = []
    for category_name, category_data in OCCUPATION_CATEGORIES.items():
        for occ in category_data.get("occupations", []):
            if isinstance(occ, dict):
                templates.append({
                    "title": occ.get("title"),
                    "category": category_name,
                    "required_certifications": occ.get("required_certifications", []),
                    "icon": category_data.get("icon", "📋")
                })
            else:
                templates.append({
                    "title": occ,
                    "category": category_name,
                    "required_certifications": [],
                    "icon": category_data.get("icon", "📋")
                })
    
    return {
        "success": True,
        "data": {
            "templates": templates,
            "total": len(templates)
        }
    }
