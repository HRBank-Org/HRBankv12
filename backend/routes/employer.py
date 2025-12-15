from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from utils.google_maps import google_maps_service
from models.employer import Workplace, Shift, Role
from typing import Dict, List
from datetime import datetime, time, date
import uuid

router = APIRouter(prefix="/employer", tags=["Employer"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.post("/workplaces", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_workplace(
    workplace_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Create a new workplace"""
    
    # Geocode address (optional - won't fail if geocoding unavailable)
    address = workplace_data.get("address")
    if address:
        try:
            coordinates = google_maps_service.geocode_address(address)
            if coordinates:
                workplace_data["lat"] = coordinates[0]
                workplace_data["long"] = coordinates[1]
        except Exception as e:
            # Geocoding failed, but continue without coordinates
            print(f"Geocoding failed: {e}")
            # Set default coordinates or leave as None
            workplace_data["lat"] = None
            workplace_data["long"] = None
    
    # Create workplace
    workplace = Workplace(
        employer_id=current_user["user_id"],
        **workplace_data
    )
    
    await db.workplaces.insert_one(workplace.model_dump())
    
    return {
        "success": True,
        "data": {"workplace_id": workplace.workplace_id},
        "message": "Workplace created successfully"
    }

@router.get("/workplaces", response_model=Dict)
async def get_my_workplaces(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all workplaces for current employer"""
    workplaces = await db.workplaces.find(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": {"workplaces": workplaces}
    }

@router.post("/shifts", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_shift(
    shift_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Create a new shift with roles"""
    
    # Verify workplace belongs to employer
    workplace = await db.workplaces.find_one({
        "workplace_id": shift_data.get("workplace_id"),
        "employer_id": current_user["user_id"]
    })
    
    if not workplace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workplace not found"
        )
    
    # Validate shift duration
    from datetime import datetime as dt
    start_time = dt.strptime(shift_data.get("start_time"), "%H:%M")
    end_time = dt.strptime(shift_data.get("end_time"), "%H:%M")
    duration_hours = (end_time - start_time).total_seconds() / 3600
    
    shift_type = shift_data.get("shift_type", "regular")
    
    if shift_type == "regular" and duration_hours > 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Regular shifts cannot exceed 8 hours. Please reduce shift duration or create as overtime shift."
        )
    
    if shift_type == "overtime" and duration_hours > 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Overtime shifts cannot exceed 4 hours."
        )
    
    if duration_hours <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time"
        )
    
    # Create shift
    shift_id = f"sh_{uuid.uuid4().hex[:12]}"
    shift_doc = {
        "shift_id": shift_id,
        "workplace_id": shift_data.get("workplace_id"),
        "shift_date": shift_data.get("shift_date"),
        "start_time": shift_data.get("start_time"),
        "end_time": shift_data.get("end_time"),
        "shift_type": shift_type,
        "status": "open",
        "created_date": datetime.utcnow().isoformat()
    }
    
    await db.shifts.insert_one(shift_doc)
    
    # Create roles for this shift
    roles_data = shift_data.get("roles", [])
    for role_data in roles_data:
        role_id = f"role_{uuid.uuid4().hex[:12]}"
        role_doc = {
            "role_id": role_id,
            "shift_id": shift_id,
            "role_title": role_data.get("role_title"),
            "required_skills": role_data.get("required_skills", []),
            "required_certifications": role_data.get("required_certifications", []),
            "hourly_rate": role_data.get("hourly_rate"),
            "status": "open",
            "created_date": datetime.utcnow().isoformat()
        }
        await db.roles.insert_one(role_doc)
    
    return {
        "success": True,
        "data": {"shift_id": shift_id},
        "message": "Shift created successfully"
    }

@router.get("/shifts", response_model=Dict)
async def get_my_shifts(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all shifts for employer's workplaces"""
    
    # Get employer's workplaces
    workplaces = await db.workplaces.find(
        {"employer_id": current_user["user_id"]},
        {"workplace_id": 1}
    ).to_list(100)
    
    workplace_ids = [w["workplace_id"] for w in workplaces]
    
    # Get shifts for these workplaces
    shifts = await db.shifts.find(
        {"workplace_id": {"$in": workplace_ids}},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": {"shifts": shifts}
    }

@router.get("/me/profile", response_model=Dict)
async def get_my_profile(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get employer profile (creates empty if doesn't exist)"""
    profile = await db.employer_profiles.find_one(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not profile:
        # Return default empty profile
        profile = {
            "employer_id": current_user["user_id"],
            "user_id": current_user["user_id"],
            "first_name": "",
            "last_name": "",
            "contact_name": "",
            "company_name": "",
            "company_logo_url": "",
            "phone": "",
            "address": "",
            "city": "",
            "province": "",
            "postal_code": "",
            "phone_verified": False,
            "email_verified": False
        }
    
    return {
        "success": True,
        "data": profile
    }

@router.patch("/me/profile", response_model=Dict)
async def update_employer_profile(
    profile_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Update employer profile (creates if doesn't exist)"""
    
    profile_data["employer_id"] = current_user["user_id"]
    profile_data["user_id"] = current_user["user_id"]
    profile_data["updated_date"] = datetime.utcnow().isoformat()
    
    # Check if profile exists
    existing_profile = await db.employer_profiles.find_one({"employer_id": current_user["user_id"]})
    
    if existing_profile:
        # Update existing profile
        await db.employer_profiles.update_one(
            {"employer_id": current_user["user_id"]},
            {"$set": profile_data}
        )
        message = "Profile updated successfully"
    else:
        # Create new profile
        profile_data["created_date"] = datetime.utcnow().isoformat()
        await db.employer_profiles.insert_one(profile_data)
        message = "Profile created successfully"
    
    return {
        "success": True,
        "message": message
    }

@router.delete("/workplaces/{workplace_id}", response_model=Dict)
async def delete_workplace(
    workplace_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Delete a workplace (only if no active shifts)"""
    
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
    
    # Check for active shifts
    active_shifts = await db.shifts.count_documents({
        "workplace_id": workplace_id,
        "status": {"$in": ["open", "filled"]}
    })
    
    if active_shifts > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete workplace with {active_shifts} active shift(s). Please complete or cancel shifts first."
        )
    
    # Delete workplace
    await db.workplaces.delete_one({"workplace_id": workplace_id})
    
    # Delete all completed shifts for this workplace
    await db.shifts.delete_many({"workplace_id": workplace_id})
    
    return {
        "success": True,
        "message": "Workplace deleted successfully"
    }

@router.patch("/workplaces/{workplace_id}", response_model=Dict)
async def update_workplace(
    workplace_id: str,
    workplace_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Update workplace details"""
    
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
    
    # If address changed, re-geocode
    if "address" in workplace_data:
        coordinates = google_maps_service.geocode_address(workplace_data["address"])
        if coordinates:
            workplace_data["lat"] = coordinates[0]
            workplace_data["long"] = coordinates[1]
    
    workplace_data["updated_date"] = datetime.utcnow().isoformat()
    
    await db.workplaces.update_one(
        {"workplace_id": workplace_id},
        {"$set": workplace_data}
    )
    
    return {
        "success": True,
        "message": "Workplace updated successfully"
    }

@router.post("/shift-templates", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_shift_template(
    template_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Create reusable shift template"""
    from models.employer import ShiftTemplate
    
    template = ShiftTemplate(
        employer_id=current_user["user_id"],
        **template_data
    )
    
    await db.shift_templates.insert_one(template.model_dump())
    
    return {
        "success": True,
        "data": {"template_id": template.template_id},
        "message": "Shift template created"
    }

@router.get("/shift-templates", response_model=Dict)
async def get_shift_templates(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all shift templates for employer"""
    templates = await db.shift_templates.find(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": {"templates": templates}
    }

@router.post("/shifts/{shift_id}/duplicate", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def duplicate_shift(
    shift_id: str,
    new_dates: List[str],
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Duplicate shift to multiple new dates"""
    
    # Get original shift
    shift = await db.shifts.find_one({"shift_id": shift_id})
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    
    # Get roles for this shift
    roles = await db.roles.find({"shift_id": shift_id}, {"_id": 0}).to_list(100)
    
    created_shifts = []
    
    for new_date in new_dates:
        # Create new shift
        new_shift_id = f"sh_{uuid.uuid4().hex[:12]}"
        new_shift = {
            **shift,
            "shift_id": new_shift_id,
            "shift_date": new_date,
            "status": "open",
            "created_date": datetime.utcnow().isoformat()
        }
        del new_shift["_id"]
        
        await db.shifts.insert_one(new_shift)
        
        # Duplicate roles
        for role in roles:
            new_role_id = f"role_{uuid.uuid4().hex[:12]}"
            new_role = {
                **role,
                "role_id": new_role_id,
                "shift_id": new_shift_id,
                "status": "open",
                "created_date": datetime.utcnow().isoformat()
            }
            if "_id" in new_role:
                del new_role["_id"]
            
            await db.roles.insert_one(new_role)
        
        created_shifts.append(new_shift_id)
    
    return {
        "success": True,
        "data": {"shift_ids": created_shifts},
        "message": f"Created {len(created_shifts)} shifts from template"
    }



@router.delete("/shifts/{shift_id}", response_model=Dict)
async def delete_shift(
    shift_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Delete a shift (only if no workers assigned)"""
    
    # Find shift
    shift = await db.shifts.find_one({"shift_id": shift_id})
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Verify employer owns the workplace
    workplace = await db.workplaces.find_one({
        "workplace_id": shift.get("workplace_id"),
        "employer_id": current_user["user_id"]
    })
    
    if not workplace:
        raise HTTPException(status_code=403, detail="Not authorized to delete this shift")
    
    # Check if shift has assigned workers
    assigned_workers = shift.get("assigned_workers", [])
    if len(assigned_workers) > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete shift with assigned workers. Please unassign workers first."
        )
    
    # Delete shift
    await db.shifts.delete_one({"shift_id": shift_id})
    
    return {
        "success": True,
        "message": "Shift deleted successfully"
    }

@router.delete("/shifts/{shift_id}/unassign/{workforce_id}", response_model=Dict)
async def unassign_worker_from_shift(
    shift_id: str,
    workforce_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Remove a worker from a shift"""
    
    # Find shift
    shift = await db.shifts.find_one({"shift_id": shift_id})
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Verify employer owns the workplace
    workplace = await db.workplaces.find_one({
        "workplace_id": shift.get("workplace_id"),
        "employer_id": current_user["user_id"]
    })
    
    if not workplace:
        raise HTTPException(status_code=403, detail="Not authorized to modify this shift")
    
    # Remove worker from assigned list
    assigned_workers = shift.get("assigned_workers", [])
    
    # Handle both list of strings and list of dicts
    if assigned_workers and isinstance(assigned_workers[0], str):
        assigned_workers = [w for w in assigned_workers if w != workforce_id]
    else:
        assigned_workers = [w for w in assigned_workers if w.get("workforce_id") != workforce_id]
    
    # Update shift
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {"$set": {
            "assigned_workers": assigned_workers,
            "assigned_worker_count": len(assigned_workers),
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Worker unassigned successfully"
    }

# ==================== INVITATION ENDPOINTS ====================

@router.post("/shifts/{shift_id}/invite", response_model=Dict)
async def invite_to_shift(
    shift_id: str,
    invite_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Invite workforce member(s) to a specific shift
    Sends email invitation with link to signup and auto-apply to shift
    """
    from models.invites import InviteToken
    from datetime import timedelta
    import os
    
    # Verify shift belongs to employer
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    
    # Get employer profile for company name
    employer = await db.employer_profiles.find_one(
        {"employer_id": current_user["user_id"]},
        {"_id": 0, "company_name": 1}
    )
    company_name = employer.get("company_name", "Company") if employer else "Company"
    
    # Process invitations (can be single email or list)
    emails = invite_data.get("emails", [])
    if isinstance(emails, str):
        emails = [emails]
    
    if not emails:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one email address is required"
        )
    
    successful_invites = []
    failed_invites = []
    
    for email in emails:
        email = email.strip()
        
        # Validate email
        if not email or "@" not in email:
            failed_invites.append({"email": email, "reason": "Invalid email format"})
            continue
        
        # Check if user already exists
        existing = await db.users.find_one({"email": email})
        if existing:
            failed_invites.append({"email": email, "reason": "User already registered"})
            continue
        
        # Create invite token
        invite = InviteToken(
            invited_by_user_id=current_user["user_id"],
            invited_by_user_type="employer",
            email=email,
            full_name="",
            shift_id=shift_id,
            workplace_id=shift.get("workplace_id"),
            expires_at=datetime.utcnow() + timedelta(days=14)
        )
        
        await db.invite_tokens.insert_one(invite.model_dump())
        
        # Send invitation email
        try:
            from utils.email_service import email_service
            
            invite_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/signup?invite={invite.invite_token}"
            
            shift_date = shift.get("shift_date", "")
            shift_time = f"{shift.get('start_time', '')} - {shift.get('end_time', '')}"
            workplace_name = shift.get("workplace_name", "")
            
            subject = f"Shift Invitation from {company_name}"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #ff5f00; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">HR Bank</h1>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                    <h2 style="color: #333;">You're Invited to Work a Shift!</h2>
                    
                    <p style="color: #666; line-height: 1.6;">
                        <strong>{company_name}</strong> has invited you to work a shift on HR Bank.
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #ff5f00; margin-top: 0;">Shift Details</h3>
                        <p style="margin: 10px 0;"><strong>Location:</strong> {workplace_name}</p>
                        <p style="margin: 10px 0;"><strong>Date:</strong> {shift_date}</p>
                        <p style="margin: 10px 0;"><strong>Time:</strong> {shift_time}</p>
                    </div>
                    
                    <p style="color: #666; line-height: 1.6;">
                        To accept this invitation, create your HR Bank account and you'll be automatically connected to this shift.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invite_link}" 
                           style="background: #ff5f00; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Create Account & View Shift
                        </a>
                    </div>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        This invitation expires in 14 days. If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                    © 2024 HR Bank. All rights reserved.
                </div>
            </div>
            """
            
            await email_service.send_email(
                to_email=email,
                subject=subject,
                html_content=html_content
            )
            
            successful_invites.append(email)
            
        except Exception as e:
            print(f"Failed to send email to {email}: {e}")
            failed_invites.append({"email": email, "reason": f"Email send failed: {str(e)}"})
    
    return {
        "success": True,
        "data": {
            "successful_invites": len(successful_invites),
            "failed_invites": len(failed_invites),
            "successes": successful_invites,
            "failures": failed_invites
        },
        "message": f"Sent {len(successful_invites)} shift invitation(s)"
    }


@router.post("/jobs/{job_id}/invite", response_model=Dict)
async def invite_to_job(
    job_id: str,
    invite_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Invite workforce member(s) to a specific job posting
    Sends email invitation with link to signup and view job
    """
    from models.invites import InviteToken
    from datetime import timedelta
    import os
    
    # Verify job belongs to employer
    job = await db.jobs.find_one({
        "job_id": job_id,
        "employer_id": current_user["user_id"]
    })
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get employer profile for company name
    employer = await db.employer_profiles.find_one(
        {"employer_id": current_user["user_id"]},
        {"_id": 0, "company_name": 1}
    )
    company_name = employer.get("company_name", "Company") if employer else "Company"
    
    # Process invitations
    emails = invite_data.get("emails", [])
    if isinstance(emails, str):
        emails = [emails]
    
    if not emails:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one email address is required"
        )
    
    successful_invites = []
    failed_invites = []
    
    for email in emails:
        email = email.strip()
        
        # Validate email
        if not email or "@" not in email:
            failed_invites.append({"email": email, "reason": "Invalid email format"})
            continue
        
        # Check if user already exists
        existing = await db.users.find_one({"email": email})
        if existing:
            failed_invites.append({"email": email, "reason": "User already registered"})
            continue
        
        # Create invite token
        invite = InviteToken(
            invited_by_user_id=current_user["user_id"],
            invited_by_user_type="employer",
            email=email,
            full_name="",
            job_id=job_id,
            workplace_id=job.get("workplace_id"),
            suggested_occupation=job.get("job_title"),
            expires_at=datetime.utcnow() + timedelta(days=30)
        )
        
        await db.invite_tokens.insert_one(invite.model_dump())
        
        # Send invitation email
        try:
            from utils.email_service import email_service
            
            invite_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/signup?invite={invite.invite_token}"
            
            job_title = job.get("job_title", "Position")
            workplace_name = job.get("workplace_name", "")
            job_description = job.get("job_description", "")[:200]
            
            subject = f"Job Opportunity from {company_name}"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #ff5f00; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">HR Bank</h1>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                    <h2 style="color: #333;">You're Invited to Apply!</h2>
                    
                    <p style="color: #666; line-height: 1.6;">
                        <strong>{company_name}</strong> thinks you'd be a great fit for an open position on HR Bank.
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #ff5f00; margin-top: 0;">{job_title}</h3>
                        <p style="margin: 10px 0;"><strong>Location:</strong> {workplace_name}</p>
                        <p style="margin: 10px 0; color: #666;">{job_description}...</p>
                    </div>
                    
                    <p style="color: #666; line-height: 1.6;">
                        Create your HR Bank account to view the full job details and apply directly.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invite_link}" 
                           style="background: #ff5f00; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Create Account & View Job
                        </a>
                    </div>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        This invitation expires in 30 days. If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                    © 2024 HR Bank. All rights reserved.
                </div>
            </div>
            """
            
            await email_service.send_email(
                to_email=email,
                subject=subject,
                html_content=html_content
            )
            
            successful_invites.append(email)
            
        except Exception as e:
            print(f"Failed to send email to {email}: {e}")
            failed_invites.append({"email": email, "reason": f"Email send failed: {str(e)}"})
    
    return {
        "success": True,
        "data": {
            "successful_invites": len(successful_invites),
            "failed_invites": len(failed_invites),
            "successes": successful_invites,
            "failures": failed_invites
        },
        "message": f"Sent {len(successful_invites)} job invitation(s)"
    }

