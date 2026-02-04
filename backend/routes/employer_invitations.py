from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Dict, List
from datetime import datetime, timedelta, timezone
from auth.dependencies import require_role, get_current_user
from pydantic import BaseModel, EmailStr
from models.invites import InviteToken
import uuid
import csv
import io

router = APIRouter(prefix="/api/employer/invitations", tags=["Employer Invitations"])

# Create a separate router for the /api/employer/invite-workers endpoint
invite_workers_router = APIRouter(prefix="/api/employer", tags=["Employer Worker Invitations"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

class ManualInvite(BaseModel):
    """Single manual invitation"""
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    role_id: str

class ManualInviteBatch(BaseModel):
    """Multiple manual invitations"""
    invites: List[ManualInvite]

# Model for the WorkerInviteModal
class SingleInvite(BaseModel):
    """Single worker invitation from modal"""
    email: str = None
    phone: str = None
    first_name: str
    last_name: str

class WorkerInviteRequest(BaseModel):
    """Request body for /api/employer/invite-workers"""
    role_id: str
    workplace_id: str
    invites: List[SingleInvite]

@router.post("/send-manual", response_model=Dict)
async def send_manual_invitations(
    invite_batch: ManualInviteBatch,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Send manual invitations to one or more workers
    Employer fills form with worker details and role assignment
    """
    
    if len(invite_batch.invites) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one invitation is required"
        )
    
    if len(invite_batch.invites) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send more than 50 invitations at once"
        )
    
    # Get employer details for email
    employer = await db.employer_profiles.find_one(
        {"employer_id": current_user['user_id']},
        {"_id": 0, "company_name": 1}
    )
    employer_name = employer.get('company_name', 'Employer') if employer else 'Employer'
    
    # Group invites by role_id to check position limits
    role_invite_counts = {}
    for inv in invite_batch.invites:
        role_invite_counts[inv.role_id] = role_invite_counts.get(inv.role_id, 0) + 1
    
    # Validate position limits for each role
    for role_id, count in role_invite_counts.items():
        role = await db.workplace_roles.find_one({
            "role_id": role_id,
            "employer_id": current_user['user_id']
        }, {"_id": 0, "role_name": 1, "positions_needed": 1, "assigned_workers": 1})
        
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role {role_id} not found"
            )
        
        current_filled = len(role.get('assigned_workers', []))
        
        # Count pending invitations for this role
        pending_count = await db.invite_tokens.count_documents({
            "invited_by_user_id": current_user['user_id'],
            "role_id": role_id,
            "status": "sent"
        })
        
        total_positions = role.get('positions_needed', 1)
        available = total_positions - current_filled - pending_count
        
        if count > available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role '{role['role_name']}' only has {available} available position(s). Cannot invite {count} people."
            )
    
    successful_invites = []
    failed_invites = []
    
    for invite_data in invite_batch.invites:
        try:
            # Validate role exists and belongs to employer
            role = await db.workplace_roles.find_one({
                "role_id": invite_data.role_id,
                "employer_id": current_user['user_id']
            })
            
            if not role:
                failed_invites.append({
                    "email": invite_data.email,
                    "reason": "Role not found or doesn't belong to you"
                })
                continue
            
            # Check if user already exists
            existing_user = await db.users.find_one({"email": invite_data.email})
            
            if existing_user:
                # Check if already employed by this employer
                relationship = await db.employment_relationships.find_one({
                    "employer_id": current_user['user_id'],
                    "workforce_id": existing_user['user_id'],
                    "status": "active"
                })
                
                if relationship:
                    failed_invites.append({
                        "email": invite_data.email,
                        "reason": "Worker already employed by you"
                    })
                    continue
            
            # Check if invitation already sent
            existing_invite = await db.invite_tokens.find_one({
                "email": invite_data.email,
                "invited_by_user_id": current_user['user_id'],
                "role_id": invite_data.role_id,
                "status": "sent"
            })
            
            if existing_invite:
                failed_invites.append({
                    "email": invite_data.email,
                    "reason": "Invitation already sent for this role"
                })
                continue
            
            # Create invitation token (7-day expiry)
            full_name = f"{invite_data.first_name} {invite_data.last_name}"
            
            invite_token = InviteToken(
                invited_by_user_id=current_user['user_id'],
                invited_by_user_type='employer',
                email=invite_data.email,
                full_name=full_name,
                phone=invite_data.phone,
                role_id=invite_data.role_id,
                role_name=role['role_name'],
                occupation_template=role['occupation_template'],
                workplace_id=role.get('workplace_id'),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )
            
            await db.invite_tokens.insert_one(invite_token.model_dump())
            
            # Send email and SMS
            await send_invitation_notifications(
                invite_token=invite_token,
                employer_name=employer_name,
                db=db
            )
            
            successful_invites.append({
                "email": invite_data.email,
                "name": full_name,
                "role": role['role_name']
            })
            
        except Exception as e:
            failed_invites.append({
                "email": invite_data.email,
                "reason": str(e)
            })
    
    return {
        "success": True,
        "data": {
            "successful": successful_invites,
            "failed": failed_invites,
            "total_sent": len(successful_invites),
            "total_failed": len(failed_invites)
        },
        "message": f"Sent {len(successful_invites)} invitation(s)"
    }

@router.post("/send-csv", response_model=Dict)
async def send_csv_bulk_invitations(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Upload CSV file with bulk invitations
    CSV format: first_name, last_name, email, phone, role_name
    """
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed"
        )
    
    # Read CSV content
    content = await file.read()
    csv_text = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(csv_text))
    
    # Validate CSV headers
    required_headers = {'first_name', 'last_name', 'email', 'phone', 'role_name'}
    if not required_headers.issubset(set(csv_reader.fieldnames or [])):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV must contain headers: {', '.join(required_headers)}"
        )
    
    # Get employer details for email
    employer = await db.employer_profiles.find_one(
        {"employer_id": current_user['user_id']},
        {"_id": 0, "company_name": 1}
    )
    employer_name = employer.get('company_name', 'Employer') if employer else 'Employer'
    
    # Get all employer's roles for validation
    employer_roles = await db.workplace_roles.find(
        {"employer_id": current_user['user_id']},
        {"_id": 0, "role_name": 1, "role_id": 1, "occupation_template": 1, "workplace_id": 1}
    ).to_list(1000)
    
    role_lookup = {role['role_name'].lower(): role for role in employer_roles}
    
    successful_invites = []
    failed_invites = []
    row_number = 1
    
    for row in csv_reader:
        row_number += 1
        
        try:
            # Validate required fields
            if not all([row.get('first_name'), row.get('last_name'), row.get('email'), row.get('phone'), row.get('role_name')]):
                failed_invites.append({
                    "row": row_number,
                    "email": row.get('email', 'N/A'),
                    "reason": "Missing required fields"
                })
                continue
            
            # Find role
            role_name_lower = row['role_name'].strip().lower()
            role = role_lookup.get(role_name_lower)
            
            if not role:
                failed_invites.append({
                    "row": row_number,
                    "email": row['email'],
                    "reason": f"Role '{row['role_name']}' not found"
                })
                continue
            
            # Check if user already exists and is employed
            existing_user = await db.users.find_one({"email": row['email']})
            
            if existing_user:
                relationship = await db.employment_relationships.find_one({
                    "employer_id": current_user['user_id'],
                    "workforce_id": existing_user['user_id'],
                    "status": "active"
                })
                
                if relationship:
                    failed_invites.append({
                        "row": row_number,
                        "email": row['email'],
                        "reason": "Already employed"
                    })
                    continue
            
            # Check for existing pending invitation
            existing_invite = await db.invite_tokens.find_one({
                "email": row['email'],
                "invited_by_user_id": current_user['user_id'],
                "role_id": role['role_id'],
                "status": "sent"
            })
            
            if existing_invite:
                failed_invites.append({
                    "row": row_number,
                    "email": row['email'],
                    "reason": "Invitation already sent"
                })
                continue
            
            # Create invitation
            full_name = f"{row['first_name']} {row['last_name']}"
            
            invite_token = InviteToken(
                invited_by_user_id=current_user['user_id'],
                invited_by_user_type='employer',
                email=row['email'].strip(),
                full_name=full_name,
                phone=row['phone'].strip(),
                role_id=role['role_id'],
                role_name=role['role_name'],
                occupation_template=role['occupation_template'],
                workplace_id=role.get('workplace_id'),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )
            
            await db.invite_tokens.insert_one(invite_token.model_dump())
            
            # Send notifications
            await send_invitation_notifications(
                invite_token=invite_token,
                employer_name=employer_name,
                db=db
            )
            
            successful_invites.append({
                "row": row_number,
                "email": row['email'],
                "name": full_name,
                "role": role['role_name']
            })
            
        except Exception as e:
            failed_invites.append({
                "row": row_number,
                "email": row.get('email', 'N/A'),
                "reason": str(e)
            })
    
    # Create batch record
    batch_id = f"batch_{uuid.uuid4().hex[:12]}"
    batch_record = {
        "batch_id": batch_id,
        "uploaded_by_user_id": current_user['user_id'],
        "uploaded_by_user_type": "employer",
        "file_name": file.filename,
        "total_rows": row_number - 1,
        "successful_invites": len(successful_invites),
        "failed_invites": len(failed_invites),
        "created_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bulk_invite_batches.insert_one(batch_record)
    
    return {
        "success": True,
        "data": {
            "batch_id": batch_id,
            "successful": successful_invites,
            "failed": failed_invites,
            "total_sent": len(successful_invites),
            "total_failed": len(failed_invites)
        },
        "message": f"Processed {row_number - 1} rows. Sent {len(successful_invites)} invitation(s)."
    }

@router.get("/list", response_model=Dict)
async def list_invitations(
    status_filter: str = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all invitations sent by this employer
    Filter by status: sent, accepted, expired, cancelled
    """
    
    query = {"invited_by_user_id": current_user['user_id']}
    if status_filter:
        query["status"] = status_filter
    
    invitations = await db.invite_tokens.find(
        query,
        {"_id": 0}
    ).sort("created_date", -1).to_list(1000)
    
    # Mark expired invitations
    now = datetime.now(timezone.utc)
    for invite in invitations:
        if invite['status'] == 'sent' and invite.get('expires_at'):
            expires_at = invite['expires_at']
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            
            if expires_at < now:
                # Update status to expired
                await db.invite_tokens.update_one(
                    {"invite_id": invite['invite_id']},
                    {"$set": {"status": "expired"}}
                )
                invite['status'] = 'expired'
    
    return {
        "success": True,
        "data": {
            "invitations": invitations,
            "total": len(invitations),
            "sent": len([i for i in invitations if i['status'] == 'sent']),
            "accepted": len([i for i in invitations if i['status'] == 'accepted']),
            "expired": len([i for i in invitations if i['status'] == 'expired'])
        }
    }

@router.post("/{invite_id}/resend", response_model=Dict)
async def resend_invitation(
    invite_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Resend an invitation (extends expiry by 7 days)"""
    
    invite = await db.invite_tokens.find_one({
        "invite_id": invite_id,
        "invited_by_user_id": current_user['user_id']
    })
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if invite['status'] == 'accepted':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot resend an accepted invitation"
        )
    
    # Update expiry and reset status
    new_expiry = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.invite_tokens.update_one(
        {"invite_id": invite_id},
        {"$set": {
            "status": "sent",
            "expires_at": new_expiry,
            "updated_date": datetime.now(timezone.utc)
        }}
    )
    
    # Get employer details
    employer = await db.employer_profiles.find_one(
        {"employer_id": current_user['user_id']},
        {"_id": 0, "company_name": 1}
    )
    employer_name = employer.get('company_name', 'Employer') if employer else 'Employer'
    
    # Resend notifications
    invite['expires_at'] = new_expiry
    await send_invitation_notifications(
        invite_token=InviteToken(**invite),
        employer_name=employer_name,
        db=db
    )
    
    return {
        "success": True,
        "message": "Invitation resent successfully"
    }

@router.delete("/{invite_id}/cancel", response_model=Dict)
async def cancel_invitation(
    invite_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Cancel and delete a pending invitation - this also invalidates the token"""
    
    invite = await db.invite_tokens.find_one({
        "invite_id": invite_id,
        "invited_by_user_id": current_user['user_id']
    })
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if invite['status'] != 'sent':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending invitations"
        )
    
    # Completely delete the invitation record - this invalidates the token
    await db.invite_tokens.delete_one({"invite_id": invite_id})
    
    return {
        "success": True,
        "message": "Invitation cancelled and removed"
    }

async def send_invitation_notifications(invite_token: InviteToken, employer_name: str, db):
    """Send email and SMS invitation"""
    
    # Generate signup link
    frontend_url = "https://authflow-hrbank.preview.emergentagent.com"
    signup_link = f"{frontend_url}/signup?token={invite_token.invite_token}&type=employer_invite"
    
    # Email
    try:
        from services.email_service import send_email
        import logging
        logger = logging.getLogger(__name__)
        
        email_body = f"""
        <h2>You're Invited to Join {employer_name}!</h2>
        <p>Hello {invite_token.full_name},</p>
        <p>You have been invited to join <strong>{employer_name}</strong> as a <strong>{invite_token.role_name}</strong>.</p>
        <p><strong>Role:</strong> {invite_token.role_name}</p>
        <p><strong>Occupation:</strong> {invite_token.occupation_template}</p>
        <p>Click the link below to complete your registration:</p>
        <p><a href="{signup_link}">Accept Invitation</a></p>
        <p>This invitation expires in 7 days.</p>
        <p>If you have any questions, please contact {employer_name}.</p>
        """
        
        logger.info(f"Sending invitation email to {invite_token.email}")
        send_email(
            to=invite_token.email,
            subject=f"Invitation to Join {employer_name}",
            html_content=email_body
        )
        logger.info(f"Invitation email sent successfully to {invite_token.email}")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send invitation email to {invite_token.email}: {e}", exc_info=True)
    
    # SMS
    if invite_token.phone:
        try:
            from services.sms_service import send_sms
            import logging
            logger = logging.getLogger(__name__)
            
            sms_body = f"You're invited to join {employer_name} as {invite_token.role_name}! Sign up: {signup_link} (Expires in 7 days)"
            
            logger.info(f"Sending invitation SMS to {invite_token.phone}")
            result = await send_sms(
                to_phone=invite_token.phone,
                message=sms_body
            )
            if result.get('success'):
                logger.info(f"Invitation SMS sent successfully to {invite_token.phone}")
            else:
                logger.warning(f"SMS send failed for {invite_token.phone}: {result.get('error')}")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send invitation SMS to {invite_token.phone}: {e}", exc_info=True)


# ==================== NEW ENDPOINT FOR WorkerInviteModal ====================

@invite_workers_router.post("/invite-workers", response_model=Dict)
async def invite_workers(
    request: WorkerInviteRequest,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Send worker invitations from the WorkerInviteModal component.
    This endpoint accepts role_id, workplace_id, and an array of invites.
    Each invite can have email, phone, first_name, and last_name.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if len(request.invites) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one invitation is required"
        )
    
    if len(request.invites) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send more than 50 invitations at once"
        )
    
    # Get role details
    role = await db.workplace_roles.find_one({
        "role_id": request.role_id,
        "employer_id": current_user['user_id']
    }, {"_id": 0})
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found or doesn't belong to you"
        )
    
    # Get workplace details
    workplace = await db.workplaces.find_one({
        "workplace_id": request.workplace_id,
        "employer_id": current_user['user_id']
    }, {"_id": 0})
    
    if not workplace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workplace not found or doesn't belong to you"
        )
    
    # Get employer details
    employer = await db.employer_profiles.find_one(
        {"employer_id": current_user['user_id']},
        {"_id": 0, "company_name": 1}
    )
    employer_name = employer.get('company_name', 'Employer') if employer else 'Employer'
    
    successful_invites = []
    failed_invites = []
    
    for invite_data in request.invites:
        try:
            # Validate - need either email or phone
            if not invite_data.email and not invite_data.phone:
                failed_invites.append({
                    "name": f"{invite_data.first_name} {invite_data.last_name}",
                    "reason": "Email or phone number is required"
                })
                continue
            
            # Check if invitation already exists
            query_conditions = [
                {"invited_by_user_id": current_user['user_id']},
                {"role_id": request.role_id},
                {"status": "sent"}
            ]
            
            if invite_data.email:
                existing_invite = await db.invite_tokens.find_one({
                    "email": invite_data.email,
                    "invited_by_user_id": current_user['user_id'],
                    "role_id": request.role_id,
                    "status": "sent"
                })
                if existing_invite:
                    failed_invites.append({
                        "email": invite_data.email,
                        "name": f"{invite_data.first_name} {invite_data.last_name}",
                        "reason": "Invitation already sent to this email for this role"
                    })
                    continue
            
            # Check if user already exists and is employed
            if invite_data.email:
                existing_user = await db.users.find_one({"email": invite_data.email})
                if existing_user:
                    relationship = await db.employment_relationships.find_one({
                        "employer_id": current_user['user_id'],
                        "workforce_id": existing_user['user_id'],
                        "status": "active"
                    })
                    if relationship:
                        failed_invites.append({
                            "email": invite_data.email,
                            "name": f"{invite_data.first_name} {invite_data.last_name}",
                            "reason": "Worker already employed by you"
                        })
                        continue
            
            # Create invitation token
            full_name = f"{invite_data.first_name} {invite_data.last_name}"
            
            invite_token = InviteToken(
                invited_by_user_id=current_user['user_id'],
                invited_by_user_type='employer',
                email=invite_data.email,
                full_name=full_name,
                phone=invite_data.phone,
                role_id=request.role_id,
                role_name=role.get('role_name', role.get('title', 'Position')),
                occupation_template=role.get('occupation_template', ''),
                workplace_id=request.workplace_id,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )
            
            await db.invite_tokens.insert_one(invite_token.model_dump())
            
            # Send notifications
            await send_invitation_notifications(
                invite_token=invite_token,
                employer_name=employer_name,
                db=db
            )
            
            successful_invites.append({
                "email": invite_data.email,
                "phone": invite_data.phone,
                "name": full_name,
                "role": role.get('role_name', role.get('title', 'Position'))
            })
            
            logger.info(f"Invitation sent successfully to {full_name}")
            
        except Exception as e:
            logger.error(f"Failed to process invite: {e}", exc_info=True)
            failed_invites.append({
                "name": f"{invite_data.first_name} {invite_data.last_name}",
                "reason": str(e)
            })
    
    return {
        "success": True,
        "data": {
            "successful": successful_invites,
            "failed": failed_invites,
            "total_sent": len(successful_invites),
            "total_failed": len(failed_invites)
        },
        "message": f"Sent {len(successful_invites)} invitation(s)" + (f", {len(failed_invites)} failed" if failed_invites else "")
    }
