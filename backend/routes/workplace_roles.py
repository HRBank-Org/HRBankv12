from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List
from datetime import datetime, timedelta, timezone
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
    
    # Get employer's province
    employer_profile = await db.employer_profiles.find_one(
        {"employer_id": current_user['user_id']},
        {"_id": 0, "province": 1}
    )
    
    employer_province = employer_profile.get('province', 'ON') if employer_profile else 'ON'
    
    # Get provincial minimum wage
    provincial_wage = await db.minimum_wages.find_one(
        {"province_code": employer_province},
        {"_id": 0, "minimum_wage": 1}
    )
    
    provincial_minimum = provincial_wage['minimum_wage'] if provincial_wage else 16.55
    
    # Get occupation minimum rate
    from utils.fee_calculator import get_minimum_rate_for_occupation
    occupation_minimum = get_minimum_rate_for_occupation(occupation_template)
    
    # Effective minimum is the HIGHER of the two
    effective_minimum = max(provincial_minimum, occupation_minimum)
    
    # Validate hourly rate if provided
    if role_data.hourly_rate:
        if role_data.hourly_rate < effective_minimum:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Hourly rate ${role_data.hourly_rate:.2f} is below the required minimum of ${effective_minimum:.2f}. "
                       f"Provincial minimum wage: ${provincial_minimum:.2f}, Occupation minimum: ${occupation_minimum:.2f}"
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
    
    # Validate work_type
    valid_work_types = ["on_site", "route_based", "continental"]
    work_type = role_data.work_type if role_data.work_type in valid_work_types else "on_site"
    
    # Create role
    role = WorkplaceRole(
        employer_id=current_user['user_id'],
        workplace_id=role_data.workplace_id,
        role_name=role_data.role_name,
        occupation_template=occupation_template,
        occupation_category=occupation_category,
        work_type=work_type,
        continental_config=role_data.continental_config if work_type == "continental" else None,
        route_config=role_data.route_config if work_type == "route_based" else None,
        coop_volunteer_eligible=role_data.coop_volunteer_eligible,
        required_skills=role_data.required_skills,
        required_certifications=all_required_certs,
        occupation_required_certifications=occupation_required_certs,
        generic_tasks=role_data.generic_tasks,
        hourly_rate=role_data.hourly_rate,
        description=role_data.description,
        positions_available=role_data.positions_available
    )
    
    # Add minimum rates and fee calculation to role
    role_dict = role.model_dump()
    role_dict['provincial_minimum_wage'] = provincial_minimum
    role_dict['occupation_minimum_rate'] = occupation_minimum
    role_dict['effective_minimum_rate'] = effective_minimum
    role_dict['province_code'] = employer_province
    
    # Calculate fees if rate is provided
    if role_data.hourly_rate:
        from utils.fee_calculator import calculate_fees
        fee_breakdown = calculate_fees(role_data.hourly_rate, occupation_minimum, provincial_minimum)
        role_dict['fee_breakdown'] = fee_breakdown
    
    await db.workplace_roles.insert_one(role_dict)
    
    return {
        "success": True,
        "data": {
            "role_id": role.role_id,
            "role_name": role.role_name,
            "occupation_template": role.occupation_template,
            "provincial_minimum_wage": provincial_minimum,
            "occupation_minimum_rate": occupation_minimum,
            "effective_minimum_rate": effective_minimum,
            "province": employer_province,
            "fee_breakdown": role_dict.get('fee_breakdown')
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
    
    roles = await db.workplace_roles.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with workplace and worker info
    for role in roles:
        # Calculate display status based on positions
        positions_filled = role.get('positions_filled', 0)
        positions_needed = role.get('positions_needed', 1)
        
        if positions_filled >= positions_needed:
            role['display_status'] = 'filled'
        else:
            role['display_status'] = 'open'
        
        # Add workplace information
        if role.get('workplace_id'):
            workplace = await db.workplaces.find_one(
                {"workplace_id": role['workplace_id']},
                {"_id": 0, "workplace_name": 1, "workplace_address": 1}
            )
            if workplace:
                role['workplace_name'] = workplace.get('workplace_name')
                role['workplace_address'] = workplace.get('workplace_address')
        else:
            # If no workplace_id, try to get first workplace for this employer
            workplace = await db.workplaces.find_one(
                {"employer_id": current_user['user_id']},
                {"_id": 0, "workplace_name": 1, "workplace_id": 1}
            )
            if workplace:
                role['workplace_name'] = workplace.get('workplace_name')
                # Optionally set the workplace_id for future reference
                role['default_workplace'] = True
        
        # Add filled worker info
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
            "unfilled": len([r for r in roles if r.get('display_status') == 'open']),
            "filled": len([r for r in roles if r.get('display_status') == 'filled'])
        }
    }


@router.get("/all/kpis", response_model=Dict)
async def get_all_roles_kpis(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get summary KPIs for all roles - for the Roles page overview"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    
    employer_id = current_user["user_id"]
    
    # Get all roles
    roles = await db.workplace_roles.find(
        {"employer_id": employer_id},
        {"_id": 0}
    ).to_list(100)
    
    roles_summary = []
    total_hours_week = 0
    total_workers = 0
    
    for role in roles:
        shift_type = role.get("shift_type", "on_site")
        assigned_workers = role.get("assigned_workers", [])
        worker_count = len(assigned_workers)
        total_workers += worker_count
        
        role_hours = 0
        worker_ids = [w.get("workforce_id") if isinstance(w, dict) else w for w in assigned_workers]
        
        if worker_ids:
            if shift_type in ["on_site", "continental"]:
                pipeline = [
                    {"$match": {
                        "worker_id": {"$in": worker_ids},
                        "employer_id": employer_id,
                        "clock_in_time": {"$gte": week_start.isoformat()}
                    }},
                    {"$group": {"_id": None, "total_hours": {"$sum": "$hours_worked"}}}
                ]
                result = await db.attendance.aggregate(pipeline).to_list(1)
                if result:
                    role_hours = result[0].get("total_hours", 0)
            elif shift_type == "route_based":
                pipeline = [
                    {"$match": {
                        "worker_id": {"$in": worker_ids},
                        "employer_id": employer_id,
                        "status": "completed",
                        "scheduled_date": {"$gte": week_start.strftime("%Y-%m-%d")}
                    }},
                    {"$group": {"_id": None, "total_minutes": {"$sum": "$actual_duration_minutes"}}}
                ]
                result = await db.service_tasks.aggregate(pipeline).to_list(1)
                if result:
                    role_hours = (result[0].get("total_minutes", 0) or 0) / 60
        
        total_hours_week += role_hours
        
        roles_summary.append({
            "role_id": role.get("role_id"),
            "role_name": role.get("role_name"),
            "shift_type": shift_type,
            "workplace_id": role.get("workplace_id"),
            "positions_available": role.get("positions_available", 1),
            "positions_filled": worker_count,
            "hourly_rate": role.get("hourly_rate"),
            "hours_this_week": round(role_hours, 1),
            "status": role.get("status", "unfilled")
        })
    
    return {
        "success": True,
        "data": {
            "roles": roles_summary,
            "summary": {
                "total_roles": len(roles),
                "total_workers": total_workers,
                "total_hours_week": round(total_hours_week, 1),
                "by_type": {
                    "on_site": len([r for r in roles if r.get("shift_type") == "on_site"]),
                    "route_based": len([r for r in roles if r.get("shift_type") == "route_based"]),
                    "continental": len([r for r in roles if r.get("shift_type") == "continental"])
                }
            }
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
    update_dict = {"updated_date": datetime.now(timezone.utc)}
    
    if update_data.role_name:
        update_dict["role_name"] = update_data.role_name
    
    if update_data.work_type is not None:
        valid_work_types = ["on_site", "route_based", "continental"]
        if update_data.work_type in valid_work_types:
            update_dict["work_type"] = update_data.work_type
    
    if update_data.coop_volunteer_eligible is not None:
        update_dict["coop_volunteer_eligible"] = update_data.coop_volunteer_eligible
    
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
        "created_date": datetime.now(timezone.utc).isoformat(),
        "application_deadline": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    
    await db.jobs.insert_one(job_posting)
    
    # Update role status
    await db.workplace_roles.update_one(
        {"role_id": role_id},
        {"$set": {
            "status": "posted_to_match",
            "posted_as_job_id": job_posting['job_id'],
            "posted_date": datetime.now(timezone.utc),
            "updated_date": datetime.now(timezone.utc)
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
    from utils.fee_calculator import MINIMUM_WAGE, PLATFORM_FEE_PER_HOUR
    
    templates = []
    for category_name, category_data in OCCUPATION_CATEGORIES.items():
        for occ in category_data.get("occupations", []):
            if isinstance(occ, dict):
                min_rate = occ.get("minimum_hourly_rate", MINIMUM_WAGE)
                templates.append({
                    "title": occ.get("title"),
                    "category": category_name,
                    "required_certifications": occ.get("required_certifications", []),
                    "minimum_hourly_rate": min_rate,
                    "icon": category_data.get("icon", "📋")
                })
            else:
                templates.append({
                    "title": occ,
                    "category": category_name,
                    "required_certifications": [],
                    "minimum_hourly_rate": MINIMUM_WAGE,
                    "icon": category_data.get("icon", "📋")
                })
    
    return {
        "success": True,
        "data": {
            "templates": templates,
            "total": len(templates),
            "minimum_wage": MINIMUM_WAGE,
            "platform_fee_per_hour": PLATFORM_FEE_PER_HOUR,
            "fee_structure": {
                "minimum_wage_jobs": "Employer pays $1/hour platform fee",
                "above_minimum": "Both worker and employer pay $1/hour platform fee"
            }
        }
    }


@router.get("/{role_id}/candidate-count", response_model=Dict)
async def get_role_candidate_count(
    role_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get count of internal and external candidates for a role"""
    
    # Get role details
    role = await db.workplace_roles.find_one(
        {"role_id": role_id, "employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Count internal candidates (from employer's workforce)
    internal_count = await db.workforce_profiles.count_documents({
        "employer_id": current_user["user_id"],
        "occupation_titles": {"$regex": role["occupation_template"], "$options": "i"},
        "status": "active"
    })
    
    # Count external candidates from matching engine
    # Get workplace coordinates for distance calculation
    workplace = await db.workplaces.find_one(
        {"workplace_id": role.get("workplace_id")},
        {"_id": 0, "coordinates": 1, "workplace_address": 1}
    )
    
    external_count = 0
    if workplace and workplace.get("coordinates"):
        # Count external workforce with matching occupation
        external_count = await db.workforce_profiles.count_documents({
            "employer_id": {"$ne": current_user["user_id"]},
            "occupation_titles": {"$regex": role["occupation_template"], "$options": "i"},
            "status": "active",
            "coordinates": {"$exists": True}
        })
    
    return {
        "success": True,
        "data": {
            "internal": internal_count,
            "external": external_count
        }
    }


@router.get("/{role_id}/internal-candidates", response_model=Dict)
async def get_internal_candidates(
    role_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get internal candidates (from employer's own workforce) for a role"""
    
    role = await db.workplace_roles.find_one(
        {"role_id": role_id, "employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Find workers from employer's workforce that match the occupation
    candidates = await db.workforce_profiles.find(
        {
            "employer_id": current_user["user_id"],
            "occupation_titles": {"$regex": role["occupation_template"], "$options": "i"},
            "status": "active"
        },
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": {
            "candidates": candidates,
            "count": len(candidates)
        }
    }


@router.get("/{role_id}/external-candidates", response_model=Dict)
async def get_external_candidates(
    role_id: str,
    min_score: int = 50,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get external candidates (from platform) using matching engine"""
    
    role = await db.workplace_roles.find_one(
        {"role_id": role_id, "employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Get workplace details for matching
    workplace = await db.workplaces.find_one(
        {"workplace_id": role.get("workplace_id")},
        {"_id": 0}
    )
    
    if not workplace or not workplace.get("coordinates"):
        return {
            "success": True,
            "data": {
                "candidates": [],
                "message": "Workplace coordinates not available for proximity matching"
            }
        }
    
    # Use job matching logic
    from utils.matching_engine import calculate_match_score
    
    # Find external workforce with matching occupation
    external_workforce = await db.workforce_profiles.find(
        {
            "employer_id": {"$ne": current_user["user_id"]},
            "occupation_titles": {"$regex": role["occupation_template"], "$options": "i"},
            "status": "active",
            "coordinates": {"$exists": True}
        },
        {"_id": 0}
    ).to_list(100)
    
    # Calculate match scores
    candidates_with_scores = []
    for worker in external_workforce:
        match_data = calculate_match_score(
            worker,
            {
                "required_skills": role.get("required_skills", []),
                "required_certifications": role.get("required_certifications", []),
                "workplace_coordinates": workplace["coordinates"]
            }
        )
        
        if match_data["match_score"] >= min_score:
            candidates_with_scores.append({
                **worker,
                **match_data
            })
    
    # Sort by match score
    candidates_with_scores.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "success": True,
        "data": {
            "candidates": candidates_with_scores,
            "count": len(candidates_with_scores)
        }
    }


@router.post("/{role_id}/assign", response_model=Dict)
async def assign_worker_to_role(
    role_id: str,
    assignment_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Assign a worker to a role (hire them).
    
    This triggers AUTO-ASSIGNMENT: The worker will automatically be assigned
    to all open/unassigned shifts that match this role's criteria.
    """
    
    role = await db.workplace_roles.find_one(
        {"role_id": role_id, "employer_id": current_user["user_id"]}
    )
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    workforce_id = assignment_data.get("workforce_id")
    source = assignment_data.get("source", "internal")  # internal or external
    auto_assign_shifts = assignment_data.get("auto_assign_shifts", True)  # Default: auto-assign
    
    # Get worker details
    worker = await db.users.find_one(
        {"user_id": workforce_id},
        {"_id": 0, "first_name": 1, "last_name": 1, "full_name": 1}
    )
    worker_name = worker.get("full_name") or f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip() if worker else "Worker"
    
    # Update role with new assigned worker
    positions_filled = role.get("positions_filled", 0) + 1
    status = "filled" if positions_filled >= role.get("positions_available", 1) else "partially_filled"
    
    await db.workplace_roles.update_one(
        {"role_id": role_id},
        {
            "$set": {
                "positions_filled": positions_filled,
                "status": status,
                "updated_at": datetime.now(timezone.utc)
            },
            "$push": {
                "assigned_workers": {
                    "workforce_id": workforce_id,
                    "worker_name": worker_name,
                    "assigned_at": datetime.now(timezone.utc),
                    "source": source
                }
            }
        }
    )
    
    # If external hire, update workforce profile
    if source == "external":
        await db.workforce_profiles.update_one(
            {"workforce_id": workforce_id},
            {
                "$set": {
                    "employer_id": current_user["user_id"],
                    "status": "active",
                    "hired_at": datetime.now(timezone.utc)
                }
            }
        )
    
    # AUTO-ASSIGNMENT: Assign worker to matching open shifts
    shifts_assigned = 0
    if auto_assign_shifts:
        shifts_assigned = await auto_assign_worker_to_shifts(
            db=db,
            role=role,
            workforce_id=workforce_id,
            worker_name=worker_name,
            employer_id=current_user["user_id"]
        )
    
    return {
        "success": True,
        "message": f"Worker assigned to {role['role_name']} successfully",
        "data": {
            "role_id": role_id,
            "workforce_id": workforce_id,
            "shifts_auto_assigned": shifts_assigned
        }
    }


async def auto_assign_worker_to_shifts(
    db,
    role: dict,
    workforce_id: str,
    worker_name: str,
    employer_id: str,
    max_shifts: int = 50
) -> int:
    """
    Auto-assign a worker to all open shifts matching the role criteria.
    
    Matching criteria:
    - Same role_id (if shift has one)
    - OR same workplace_id AND shift_type
    - Shift must have open positions
    - Shift must be in the future
    
    Returns: Number of shifts assigned
    """
    from datetime import datetime
    
    now = datetime.now(timezone.utc)
    role_id = role.get("role_id")
    workplace_id = role.get("workplace_id")
    shift_type = role.get("shift_type", "on_site")
    position_title = role.get("role_name") or role.get("occupation_template")
    
    # Build query to find matching open shifts
    # Shifts can be in either 'shifts' or 'calendar_shifts' collection
    shift_query = {
        "employer_id": employer_id,
        "start_time": {"$gte": now.isoformat()},  # Future shifts only
        "$expr": {"$lt": [{"$size": {"$ifNull": ["$assigned_workers", []]}}, "$positions_needed"]}  # Has open positions
    }
    
    # Match by role_id if the shift has one, OR by workplace + shift characteristics
    if workplace_id:
        shift_query["$or"] = [
            {"role_id": role_id},  # Exact role match
            {
                "workplace_id": workplace_id,
                "position_title": {"$regex": position_title, "$options": "i"}
            }
        ]
    else:
        # General role (all workplaces)
        shift_query["$or"] = [
            {"role_id": role_id},
            {"position_title": {"$regex": position_title, "$options": "i"}}
        ]
    
    shifts_assigned = 0
    
    # Check both collections
    for collection_name in ["calendar_shifts", "shifts"]:
        collection = db[collection_name]
        
        # Find matching shifts
        matching_shifts = await collection.find(
            shift_query,
            {"_id": 0, "shift_id": 1, "assigned_workers": 1, "positions_needed": 1}
        ).limit(max_shifts).to_list(max_shifts)
        
        for shift in matching_shifts:
            shift_id = shift.get("shift_id")
            assigned_workers = shift.get("assigned_workers", [])
            positions_needed = shift.get("positions_needed", 1)
            
            # Check if already at capacity
            if len(assigned_workers) >= positions_needed:
                continue
            
            # Check if worker already assigned to this shift
            already_assigned = any(
                (w.get("worker_id") == workforce_id if isinstance(w, dict) else w == workforce_id)
                for w in assigned_workers
            )
            
            if already_assigned:
                continue
            
            # Assign the worker
            new_assignment = {
                "worker_id": workforce_id,
                "worker_name": worker_name,
                "status": "confirmed",
                "assigned_at": now.isoformat(),
                "auto_assigned": True,
                "from_role_id": role_id
            }
            
            await collection.update_one(
                {"shift_id": shift_id},
                {
                    "$push": {"assigned_workers": new_assignment},
                    "$inc": {"positions_filled": 1}
                }
            )
            
            shifts_assigned += 1
            
            if shifts_assigned >= max_shifts:
                break
        
        if shifts_assigned >= max_shifts:
            break
    
    return shifts_assigned



@router.post("/{role_id}/auto-assign-shifts", response_model=Dict)
async def trigger_auto_assignment(
    role_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Manually trigger auto-assignment for all workers currently assigned to this role.
    
    Use this to:
    - Assign workers to newly created shifts
    - Re-run auto-assignment after shift changes
    """
    
    role = await db.workplace_roles.find_one(
        {"role_id": role_id, "employer_id": current_user["user_id"]}
    )
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    assigned_workers = role.get("assigned_workers", [])
    
    if not assigned_workers:
        return {
            "success": True,
            "message": "No workers assigned to this role",
            "data": {"total_shifts_assigned": 0}
        }
    
    total_shifts_assigned = 0
    worker_results = []
    
    for worker in assigned_workers:
        workforce_id = worker.get("workforce_id") if isinstance(worker, dict) else worker
        worker_name = worker.get("worker_name", "Worker") if isinstance(worker, dict) else "Worker"
        
        # Get worker name if not available
        if worker_name == "Worker":
            user = await db.users.find_one(
                {"user_id": workforce_id},
                {"_id": 0, "first_name": 1, "last_name": 1, "full_name": 1}
            )
            if user:
                worker_name = user.get("full_name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        
        shifts_assigned = await auto_assign_worker_to_shifts(
            db=db,
            role=role,
            workforce_id=workforce_id,
            worker_name=worker_name,
            employer_id=current_user["user_id"]
        )
        
        total_shifts_assigned += shifts_assigned
        worker_results.append({
            "workforce_id": workforce_id,
            "worker_name": worker_name,
            "shifts_assigned": shifts_assigned
        })
    
    return {
        "success": True,
        "message": f"Auto-assigned {total_shifts_assigned} shifts to {len(assigned_workers)} workers",
        "data": {
            "total_shifts_assigned": total_shifts_assigned,
            "workers": worker_results
        }
    }


@router.get("/{role_id}/kpis", response_model=Dict)
async def get_role_kpis(
    role_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get KPIs for a specific role including:
    - Hours worked this week/month
    - Shifts/tasks completed
    - Performance metrics per assigned worker
    """
    
    # Verify role belongs to employer
    role = await db.workplace_roles.find_one({
        "role_id": role_id,
        "employer_id": current_user['user_id']
    }, {"_id": 0})
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    employer_id = current_user["user_id"]
    shift_type = role.get("shift_type", "on_site")
    
    # Get assigned workers for this role
    assigned_workers = role.get("assigned_workers", [])
    worker_ids = [w.get("workforce_id") if isinstance(w, dict) else w for w in assigned_workers]
    
    # Initialize KPIs
    role_kpis = {
        "role_id": role_id,
        "role_name": role.get("role_name"),
        "shift_type": shift_type,
        "positions_available": role.get("positions_available", 1),
        "positions_filled": len(worker_ids),
        "week": {"total_hours": 0, "shifts_completed": 0, "tasks_completed": 0},
        "month": {"total_hours": 0, "shifts_completed": 0, "tasks_completed": 0},
        "workers": []
    }
    
    if not worker_ids:
        return {"success": True, "data": role_kpis}
    
    # Get attendance/hours for each worker
    for worker_id in worker_ids:
        worker = await db.users.find_one(
            {"user_id": worker_id},
            {"_id": 0, "full_name": 1, "user_id": 1}
        )
        
        worker_kpi = {
            "worker_id": worker_id,
            "full_name": worker.get("full_name") if worker else "Unknown",
            "week": {"hours": 0, "shifts": 0, "tasks": 0, "attendance_rate": 100},
            "month": {"hours": 0, "shifts": 0, "tasks": 0}
        }
        
        if shift_type in ["on_site", "continental"]:
            # Get attendance records
            week_attendance = await db.attendance.find({
                "worker_id": worker_id,
                "employer_id": employer_id,
                "clock_in_time": {"$gte": week_start.isoformat()}
            }).to_list(100)
            
            month_attendance = await db.attendance.find({
                "worker_id": worker_id,
                "employer_id": employer_id,
                "clock_in_time": {"$gte": month_start.isoformat()}
            }).to_list(500)
            
            # Calculate hours
            for record in week_attendance:
                hours = record.get("hours_worked", 0)
                if hours:
                    worker_kpi["week"]["hours"] += hours
                    worker_kpi["week"]["shifts"] += 1
                    
            for record in month_attendance:
                hours = record.get("hours_worked", 0)
                if hours:
                    worker_kpi["month"]["hours"] += hours
                    worker_kpi["month"]["shifts"] += 1
                    
        elif shift_type == "route_based":
            # Get service tasks
            week_tasks = await db.service_tasks.find({
                "worker_id": worker_id,
                "employer_id": employer_id,
                "status": "completed",
                "scheduled_date": {"$gte": week_start.strftime("%Y-%m-%d")}
            }).to_list(100)
            
            month_tasks = await db.service_tasks.find({
                "worker_id": worker_id,
                "employer_id": employer_id,
                "status": "completed",
                "scheduled_date": {"$gte": month_start.strftime("%Y-%m-%d")}
            }).to_list(500)
            
            for task in week_tasks:
                if task.get("actual_duration_minutes"):
                    worker_kpi["week"]["hours"] += task["actual_duration_minutes"] / 60
                worker_kpi["week"]["tasks"] += 1
                
            for task in month_tasks:
                if task.get("actual_duration_minutes"):
                    worker_kpi["month"]["hours"] += task["actual_duration_minutes"] / 60
                worker_kpi["month"]["tasks"] += 1
        
        # Round hours
        worker_kpi["week"]["hours"] = round(worker_kpi["week"]["hours"], 1)
        worker_kpi["month"]["hours"] = round(worker_kpi["month"]["hours"], 1)
        
        # Add to totals
        role_kpis["week"]["total_hours"] += worker_kpi["week"]["hours"]
        role_kpis["week"]["shifts_completed"] += worker_kpi["week"]["shifts"]
        role_kpis["week"]["tasks_completed"] += worker_kpi["week"]["tasks"]
        role_kpis["month"]["total_hours"] += worker_kpi["month"]["hours"]
        role_kpis["month"]["shifts_completed"] += worker_kpi["month"]["shifts"]
        role_kpis["month"]["tasks_completed"] += worker_kpi["month"]["tasks"]
        
        role_kpis["workers"].append(worker_kpi)
    
    # Round totals
    role_kpis["week"]["total_hours"] = round(role_kpis["week"]["total_hours"], 1)
    role_kpis["month"]["total_hours"] = round(role_kpis["month"]["total_hours"], 1)
    
    return {"success": True, "data": role_kpis}
# End of file placeholder

