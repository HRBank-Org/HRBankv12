from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from models.invites import InviteToken, BulkInviteBatch
from typing import Dict, List
from datetime import datetime, timedelta
import csv
import io

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
                expires_at=datetime.utcnow() + timedelta(days=30)
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
