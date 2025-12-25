from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from models.invites import InviteToken, BulkInviteBatch
from typing import Dict, List
from datetime import datetime, timedelta, timezone
import csv
import io
import uuid

router = APIRouter(prefix="/invites", tags=["Invites"])

def get_db():
    from server import db
    return db

@router.post("/bulk-upload", response_model=Dict)
async def bulk_upload_invites(
    csv_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Upload CSV file with bulk invites
    For institutions: name, email, phone, program, graduation_year
    For employers: name, email, phone, position
    """
    
    # Parse CSV data (in production, this would handle actual file upload)
    # For now, accept JSON array
    invites_data = csv_data.get("invites", [])
    
    if not invites_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No invite data provided"
        )
    
    # Create batch record
    batch = BulkInviteBatch(
        uploaded_by_user_id=current_user["user_id"],
        uploaded_by_user_type=current_user["user_type"],
        file_name=csv_data.get("file_name", "invites.csv"),
        total_rows=len(invites_data),
        successful_invites=0,
        failed_rows=0
    )
    
    successful_invites = []
    failed_rows = []
    
    # Process each invite
    for idx, invite_data in enumerate(invites_data):
        try:
            # Validate email
            email = invite_data.get("email", "").strip()
            if not email or "@" not in email:
                failed_rows.append({"row": idx + 1, "reason": "Invalid email"})
                continue
            
            # Check if user already exists
            existing = await db.users.find_one({"email": email})
            if existing:
                failed_rows.append({"row": idx + 1, "reason": "Email already registered"})
                continue
            
            # Create invite token
            invite = InviteToken(
                invited_by_user_id=current_user["user_id"],
                invited_by_user_type=current_user["user_type"],
                email=email,
                full_name=invite_data.get("full_name", ""),
                phone=invite_data.get("phone"),
                suggested_occupation=invite_data.get("program") if current_user["user_type"] == "institution" else None,
                program=invite_data.get("program"),
                graduation_year=invite_data.get("graduation_year"),
                expires_at=datetime.now(timezone.utc) + timedelta(days=30)
            )
            
            await db.invite_tokens.insert_one(invite.model_dump())
            successful_invites.append(invite.invite_id)
            
            # Send invitation email
            from utils.email_service import email_service
            
            invite_link = f"{os.environ.get('FRONTEND_URL', 'https://vault.hrbank.ca')}/signup?invite={invite.invite_token}"
            
            if current_user["user_type"] == "institution":
                # Get institution name
                institution = await db.institution_profiles.find_one(
                    {"institution_id": current_user["user_id"]},
                    {"_id": 0, "institution_name": 1}
                )
                institution_name = institution.get("institution_name", "Institution") if institution else "Institution"
                
                # Institution invite email
                await send_institution_invite_email(
                    email=email,
                    full_name=invite_data.get("full_name", ""),
                    institution_name=institution_name,
                    program=invite_data.get("program", ""),
                    invite_link=invite_link
                )
            else:
                # Employer invite email
                employer = await db.employer_profiles.find_one(
                    {"employer_id": current_user["user_id"]},
                    {"_id": 0, "company_name": 1}
                )
                company_name = employer.get("company_name", "Company") if employer else "Company"
                
                await send_employer_invite_email(
                    email=email,
                    full_name=invite_data.get("full_name", ""),
                    company_name=company_name,
                    invite_link=invite_link
                )
            
        except Exception as e:
            failed_rows.append({"row": idx + 1, "reason": str(e)})
    
    # Update batch
    batch.successful_invites = len(successful_invites)
    batch.failed_rows = len(failed_rows)
    batch.invite_ids = successful_invites
    batch.status = "completed"
    
    await db.bulk_invite_batches.insert_one(batch.model_dump())
    
    return {
        "success": True,
        "data": {
            "batch_id": batch.batch_id,
            "total_rows": batch.total_rows,
            "successful_invites": batch.successful_invites,
            "failed_rows": batch.failed_rows,
            "failures": failed_rows
        },
        "message": f"Sent {batch.successful_invites} invitations successfully"
    }

async def send_institution_invite_email(email: str, full_name: str, institution_name: str, program: str, invite_link: str):
    """Send institution invitation email"""
    from utils.email_service import email_service
    
    subject = f"Join HR Bank - Invitation from {institution_name}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3B5998; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">HR Bank</h1>
        </div>
        <div style="padding: 40px 20px;">
            <h2 style="color: #333;">Hi {full_name}! 👋</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                <strong>{institution_name}</strong> has invited you to join HR Bank, 
                the workforce marketplace connecting verified workers with employers.
            </p>
            
            {f'<p style="color: #666;">As a <strong>{program}</strong> graduate, you can find work opportunities matching your skills and build your career.</p>' if program else ''}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{invite_link}" 
                   style="background: #3B5998; color: white; padding: 15px 40px; 
                          text-decoration: none; border-radius: 8px; display: inline-block;
                          font-weight: bold;">
                    Accept Invitation
                </a>
            </div>
            
            <p style="color: #999; font-size: 14px;">
                This invitation expires in 30 days.
            </p>
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #999; font-size: 12px;">
            <p>HR Bank - Connecting Workers with Employers</p>
        </div>
    </div>
    """
    
    await email_service.send_email(email, subject, html_content)

async def send_employer_invite_email(email: str, full_name: str, company_name: str, invite_link: str):
    """Send employer invitation email"""
    from utils.email_service import email_service
    
    subject = f"Join Our Team at {company_name}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #FF6B35; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">HR Bank</h1>
        </div>
        <div style="padding: 40px 20px;">
            <h2 style="color: #333;">Hi {full_name}! 👋</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
                <strong>{company_name}</strong> has invited you to join their team through HR Bank.
            </p>
            
            <p style="color: #666;">
                Create your profile to access shifts, manage your schedule, and get paid seamlessly.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{invite_link}" 
                   style="background: #FF6B35; color: white; padding: 15px 40px; 
                          text-decoration: none; border-radius: 8px; display: inline-block;
                          font-weight: bold;">
                    Accept Invitation
                </a>
            </div>
            
            <p style="color: #999; font-size: 14px;">
                This invitation expires in 30 days.
            </p>
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #999; font-size: 12px;">
            <p>HR Bank - vault.hrbank.ca</p>
        </div>
    </div>
    """
    
    await email_service.send_email(email, subject, html_content)

@router.get("/my-invites", response_model=Dict)
async def get_my_invites(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get all invitations sent by current user
    """
    
    invites = await db.invite_tokens.find(
        {"invited_by_user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_date", -1).to_list(100)
    
    # Get batches
    batches = await db.bulk_invite_batches.find(
        {"uploaded_by_user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_date", -1).to_list(50)
    
    return {
        "success": True,
        "data": {
            "invites": invites,
            "batches": batches,
            "total_sent": len(invites),
            "total_accepted": len([i for i in invites if i.get("status") == "accepted"])
        }
    }


@router.get("/{invite_token}/details", response_model=Dict)
async def get_invite_details(
    invite_token: str,
    db = Depends(get_db)
):
    """
    Get invitation details (public endpoint for signup flow)
    Returns job/shift details if applicable
    """
    invite = await db.invite_tokens.find_one(
        {"invite_token": invite_token},
        {"_id": 0}
    )
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Check if expired
    expires_at = invite["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Invitation has expired"
        )
    
    # Check if already accepted
    if invite.get("status") == "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has already been accepted"
        )
    
    response_data = {
        "invite_id": invite.get("invite_id"),
        "email": invite.get("email"),
        "invited_by": invite.get("invited_by_user_type"),
        "full_name": invite.get("full_name"),
        "suggested_occupation": invite.get("suggested_occupation"),
        "workplace_id": invite.get("workplace_id"),
        "job_id": invite.get("job_id"),
        "shift_id": invite.get("shift_id")
    }
    
    # Fetch job details if job_id exists
    if invite.get("job_id"):
        job = await db.jobs.find_one(
            {"job_id": invite["job_id"]},
            {"_id": 0, "job_title": 1, "job_description": 1, "workplace_name": 1, 
             "hourly_rate_min": 1, "hourly_rate_max": 1}
        )
        if job:
            response_data["job_details"] = job
    
    # Fetch shift details if shift_id exists
    if invite.get("shift_id"):
        shift = await db.shifts.find_one(
            {"shift_id": invite["shift_id"]},
            {"_id": 0, "shift_name": 1, "shift_date": 1, "start_time": 1, 
             "end_time": 1, "workplace_name": 1, "hourly_rate": 1}
        )
        if shift:
            response_data["shift_details"] = shift
    
    # Fetch inviter details
    if invite.get("invited_by_user_type") == "employer":
        employer = await db.employer_profiles.find_one(
            {"employer_id": invite["invited_by_user_id"]},
            {"_id": 0, "company_name": 1, "company_logo": 1}
        )
        if employer:
            response_data["company_name"] = employer.get("company_name")
            response_data["company_logo"] = employer.get("company_logo")
    elif invite.get("invited_by_user_type") == "institution":
        institution = await db.institution_profiles.find_one(
            {"institution_id": invite["invited_by_user_id"]},
            {"_id": 0, "institution_name": 1, "institution_logo": 1}
        )
        if institution:
            response_data["institution_name"] = institution.get("institution_name")
            response_data["institution_logo"] = institution.get("institution_logo")
    
    return {
        "success": True,
        "data": response_data
    }

@router.post("/{invite_token}/accept", response_model=Dict)
async def accept_invitation(
    invite_token: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Accept invitation after user signs up
    Auto-applies to job or shift if applicable
    """
    invite = await db.invite_tokens.find_one({"invite_token": invite_token})
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Verify email matches
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    if user.get("email") != invite.get("email"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation is for a different email address"
        )
    
    # Check if already accepted
    if invite.get("status") == "accepted":
        return {
            "success": True,
            "message": "Invitation already accepted"
        }
    
    # Mark invitation as accepted
    await db.invite_tokens.update_one(
        {"invite_token": invite_token},
        {"$set": {
            "status": "accepted",
            "accepted_date": datetime.now(timezone.utc).isoformat(),
            "created_user_id": current_user["user_id"]
        }}
    )
    
    response_message = "Invitation accepted"
    
    # NEW: Create employment relationship for role-based invitations
    if invite.get("role_id") and invite.get("invited_by_user_type") == "employer":
        # Create employment relationship
        relationship = {
            "relationship_id": f"rel_{uuid.uuid4().hex[:12]}",
            "employer_id": invite["invited_by_user_id"],
            "workforce_id": current_user["user_id"],
            "workplace_id": invite.get("workplace_id"),
            "employment_type": "full_time",
            "position_title": invite.get("role_name"),
            "occupation": invite.get("occupation_template"),
            "status": "active",
            "employment_start_date": datetime.now(timezone.utc).isoformat(),
            "created_date": datetime.now(timezone.utc).isoformat(),
            "updated_date": datetime.now(timezone.utc).isoformat(),
            "last_shift_date": None,
            "days_without_shift": 0
        }
        
        await db.employment_relationships.insert_one(relationship)
        
        # Update role status to filled
        await db.workplace_roles.update_one(
            {"role_id": invite["role_id"]},
            {"$set": {
                "status": "filled",
                "filled_by_workforce_id": current_user["user_id"],
                "filled_date": datetime.now(timezone.utc),
                "positions_filled": 1,
                "updated_date": datetime.now(timezone.utc)
            }}
        )
        
        response_message = f"Welcome! You've been added to the team as {invite.get('role_name')}"
        
        # Check profile completeness - schedule Emma notification if incomplete
        workforce_profile = await db.workforce_profiles.find_one({"user_id": current_user["user_id"]})
        
        if not workforce_profile or workforce_profile.get("profile_completeness", 0) < 100:
            # Schedule Emma reminder
            emma_notification = {
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": current_user["user_id"],
                "notification_type": "profile_incomplete",
                "title": "Complete Your Profile",
                "message": "Please complete your profile and upload required documents within 7 days to continue working.",
                "priority": "high",
                "status": "pending",
                "scheduled_date": datetime.now(timezone.utc) + timedelta(days=1),
                "expiry_date": datetime.now(timezone.utc) + timedelta(days=7),
                "created_date": datetime.now(timezone.utc).isoformat()
            }
            
            await db.notifications.insert_one(emma_notification)
    
    # Auto-apply to shift if shift_id exists
    elif invite.get("shift_id"):
        shift = await db.shifts.find_one({"shift_id": invite["shift_id"]})
        if shift and shift.get("status") == "open":
            # Create booking/application
            booking = {
                "booking_id": f"book_{uuid.uuid4().hex[:12]}",
                "shift_id": invite["shift_id"],
                "employer_id": shift.get("employer_id"),
                "workforce_id": current_user["user_id"],
                "workplace_id": shift.get("workplace_id"),
                "workplace_name": shift.get("workplace_name"),
                "shift_date": shift.get("shift_date"),
                "start_time": shift.get("start_time"),
                "end_time": shift.get("end_time"),
                "hourly_rate": shift.get("hourly_rate"),
                "status": "pending",
                "invited": True,
                "created_date": datetime.now(timezone.utc).isoformat()
            }
            
            await db.bookings.insert_one(booking)
            response_message = "Invitation accepted and applied to shift"
    
    # Store job_id reference if job_id exists (for easier application later)
    elif invite.get("job_id"):
        response_message = "Invitation accepted. You can now view and apply to the job."
    
    return {
        "success": True,
        "data": {
            "job_id": invite.get("job_id"),
            "shift_id": invite.get("shift_id"),
            "workplace_id": invite.get("workplace_id")
        },
        "message": response_message
    }

