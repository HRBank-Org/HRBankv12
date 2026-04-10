from fastapi import APIRouter, HTTPException, status, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.user import UserCreate, UserLogin, TokenResponse, User, UserInDB, EmailVerification
from auth.password import hash_password, verify_password
from auth.jwt_handler import create_access_token, create_refresh_token
from utils.jurisdiction import get_jurisdiction_from_address
from datetime import datetime, timedelta, timezone
from typing import Dict
from pydantic import BaseModel
import uuid
import os
import random
import logging
from starlette.responses import RedirectResponse
from utils.rate_limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# OTP Models
class VerifyOTPRequest(BaseModel):
    user_id: str
    email_otp: str
    phone_otp: str

class ResendOTPRequest(BaseModel):
    user_id: str
    otp_type: str  # "email", "phone", or "both"

def generate_otp():
    """Generate a cryptographically secure 6-digit OTP"""
    import secrets
    return str(secrets.randbelow(900000) + 100000)

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.post("/signup", response_model=Dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")  # Rate limit: 3 signups per minute per IP
async def signup(request: Request, user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    User signup endpoint
    Creates new user account and sends email + phone OTPs for verification
    """
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Check if phone already exists (only if phone provided)
    if user_data.phone:
        existing_phone = await db.users.find_one({"phone": user_data.phone})
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number already registered"
            )
    
    # Create user
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user_data.password)
    
    # Detect jurisdiction from user's location (province/postal_code/country)
    jurisdiction = get_jurisdiction_from_address(
        province=user_data.province,
        country=user_data.country or "CA",
        postal_code=user_data.postal_code,
        city=user_data.city
    )
    jurisdiction_code = jurisdiction.get("jurisdiction_code", "CA-ON")  # Default to Ontario
    
    # Set initial status based on user type
    # - workpassport: pending email verification, then active
    # - workforce: pending email verification, then pending document verification (admin approval)
    if user_data.user_type == "workpassport":
        initial_status = "pending_email_verification"
    else:
        initial_status = "pending_email_verification"  # Same initial state, different next state after verification
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "phone": user_data.phone,
        "password_hash": hashed_password,
        "user_type": user_data.user_type,
        "profile_status": initial_status,
        "email_verified": False,
        "phone_verified": False,
        "mfa_enabled": False,
        "created_date": datetime.now(timezone.utc).isoformat(),
        "last_login_date": None,
        "deleted_at": None,
        # Jurisdiction info - determines applicable labor laws
        "country": user_data.country or "CA",
        "province": user_data.province,
        "city": user_data.city,
        "postal_code": user_data.postal_code,
        "jurisdiction_code": jurisdiction_code,
        "authorized_jurisdictions": [jurisdiction_code]  # Start with home jurisdiction
    }
    
    await db.users.insert_one(user_doc)
    
    # Create corresponding profile based on user type
    profile_doc = {
        f"{user_data.user_type}_id": user_id,
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "created_date": datetime.now(timezone.utc).isoformat(),
        "onboarding_completed": False,
        # Location & Jurisdiction
        "country": user_data.country or "CA",
        "province": user_data.province,
        "city": user_data.city,
        "postal_code": user_data.postal_code,
        "jurisdiction_code": jurisdiction_code,
        "authorized_jurisdictions": [jurisdiction_code]
    }
    
    if user_data.user_type == "workforce":
        profile_doc.update({
            "skills": [],
            "certifications": [],
            "rating_avg": 0.0,
            "rating_count": 0,
            "profile_completeness": 20,
            "completed_jobs_count": 0
        })
        await db.workforce_profiles.insert_one(profile_doc)
    elif user_data.user_type == "employer":
        profile_doc["company_name"] = user_data.full_name
        profile_doc["rating_avg"] = 0.0
        profile_doc["rating_count"] = 0
        profile_doc["address"] = ""
        # Employers start with only their registration jurisdiction
        # They must request expansion to hire in other provinces/states
        await db.employer_profiles.insert_one(profile_doc)
    elif user_data.user_type == "institution":
        profile_doc["institution_name"] = user_data.full_name
        profile_doc["verified_status"] = "pending"
        await db.institution_profiles.insert_one(profile_doc)
    
    # Generate OTPs for both email and phone
    email_otp = generate_otp()
    phone_otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTPs in database
    otp_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "phone": user_data.phone,
        "email_otp": email_otp,
        "phone_otp": phone_otp,
        "email_verified": False,
        "phone_verified": False,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "attempts": 0
    }
    await db.signup_otps.insert_one(otp_doc)
    
    # Send Email OTP via SendGrid (don't fail signup if email fails)
    try:
        from utils.email_service import email_service
        email_sent = await email_service.send_otp_email(
            to_email=user_data.email,
            full_name=user_data.full_name,
            otp_code=email_otp
        )
        if not email_sent:
            logger.warning(f"Failed to send email OTP to {user_data.email}")
            # Log OTP to console for testing
            print(f"\n{'='*50}")
            print(f"📧 EMAIL OTP for {user_data.email}: {email_otp}")
            print(f"{'='*50}\n")
    except Exception as e:
        logger.error(f"Error sending email OTP: {str(e)}")
        print(f"\n{'='*50}")
        print(f"📧 EMAIL OTP for {user_data.email}: {email_otp}")
        print(f"{'='*50}\n")
    
    # Send Phone OTP via Twilio (don't fail signup if SMS fails)
    # Note: Phone is optional for institutions
    phone_otp_sent = False
    if user_data.phone:
        try:
            from services.sms_service import send_sms, format_phone_e164
            formatted_phone = format_phone_e164(user_data.phone)
            if formatted_phone:
                sms_result = await send_sms(
                    formatted_phone,
                    f"Your HR Bank verification code is: {phone_otp}. Valid for 10 minutes."
                )
                if sms_result.get("success"):
                    phone_otp_sent = True
                else:
                    logger.warning(f"Failed to send SMS OTP to {user_data.phone}: {sms_result.get('error')}")
                    print(f"\n{'='*50}")
                    print(f"📱 PHONE OTP for {user_data.phone}: {phone_otp}")
                    print(f"{'='*50}\n")
            else:
                print(f"\n{'='*50}")
                print(f"📱 PHONE OTP for {user_data.phone}: {phone_otp}")
                print(f"{'='*50}\n")
        except Exception as e:
            logger.error(f"Error sending SMS OTP: {str(e)}")
            print(f"\n{'='*50}")
            print(f"📱 PHONE OTP for {user_data.phone}: {phone_otp}")
            print(f"{'='*50}\n")
    else:
        # No phone provided (institution without phone)
        # Mark phone as pre-verified since it's not required
        if user_data.user_type == "institution":
            await db.signup_otps.update_one(
                {"user_id": user_id},
                {"$set": {"phone_verified": True}}
            )
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"phone_verified": True}}
            )
    
    # Determine verification message
    if user_data.phone:
        verification_msg = "Please verify your email and phone with the OTPs sent."
    else:
        verification_msg = "Please verify your email with the OTP sent."
    
    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "email": user_data.email,
            "phone": user_data.phone,
            "user_type": user_data.user_type,
            "requires_verification": True,
            "requires_phone_verification": bool(user_data.phone),
            "message": verification_msg
        },
        "message": f"Account created. {verification_msg}"
    }


@router.post("/verify-signup-otp", response_model=Dict)
@limiter.limit("10/minute")
async def verify_signup_otp(request: Request, otp_data: VerifyOTPRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Verify both email and phone OTPs during signup
    After verification, account moves to 'pending' status for admin approval
    """
    # Find the OTP record
    otp_record = await db.signup_otps.find_one({
        "user_id": otp_data.user_id
    }, sort=[("created_at", -1)])
    
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verification request found. Please sign up again."
        )
    
    # Check if OTP has expired
    expires_at = datetime.fromisoformat(otp_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request new codes."
        )
    
    # Check attempts
    if otp_record.get("attempts", 0) >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts. Please request new codes."
        )
    
    # Verify both OTPs
    email_valid = otp_record["email_otp"] == otp_data.email_otp
    phone_valid = otp_record["phone_otp"] == otp_data.phone_otp
    
    if not email_valid or not phone_valid:
        # Increment attempts
        await db.signup_otps.update_one(
            {"_id": otp_record["_id"]},
            {"$inc": {"attempts": 1}}
        )
        
        errors = []
        if not email_valid:
            errors.append("Invalid email OTP")
        if not phone_valid:
            errors.append("Invalid phone OTP")
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=". ".join(errors)
        )
    
    # Mark OTPs as verified
    await db.signup_otps.update_one(
        {"_id": otp_record["_id"]},
        {
            "$set": {
                "email_verified": True,
                "phone_verified": True,
                "verified_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update user verification status
    await db.users.update_one(
        {"user_id": otp_data.user_id},
        {
            "$set": {
                "email_verified": True,
                "phone_verified": True,
                "profile_status": "pending"  # Move to pending for admin approval
            }
        }
    )
    
    # Create admin notification for new verified signup
    from models.admin import Notification
    
    user = await db.users.find_one({"user_id": otp_data.user_id}, {"_id": 0})
    user_type = user.get("user_type", "unknown")
    
    # Get profile info
    profile = None
    if user_type == "workforce":
        profile = await db.workforce_profiles.find_one({"workforce_id": otp_data.user_id}, {"_id": 0})
    elif user_type == "employer":
        profile = await db.employer_profiles.find_one({"employer_id": otp_data.user_id}, {"_id": 0})
    elif user_type == "institution":
        profile = await db.institution_profiles.find_one({"institution_id": otp_data.user_id}, {"_id": 0})
    
    full_name = profile.get("full_name", "Unknown") if profile else "Unknown"
    
    admin_users = await db.users.find({"user_type": "admin"}, {"user_id": 1}).to_list(10)
    
    for admin in admin_users:
        admin_notif = Notification(
            user_id=admin["user_id"],
            type="new_verified_signup",
            title=f"New Verified {user_type.title()} Account",
            message=f"{full_name} ({user['email']}) has verified their email and phone. Account is ready for approval.",
            data={
                "action_url": f"/admin/users/{otp_data.user_id}",
                "action_button_text": "Review & Approve",
                "priority": "high",
                "user_type": user_type,
                "verified": True
            }
        )
        await db.notifications.insert_one(admin_notif.model_dump())
    
    return {
        "success": True,
        "data": {
            "email_verified": True,
            "phone_verified": True,
            "profile_status": "pending",
            "message": "Your account has been verified and is pending admin approval."
        },
        "message": "Verification successful! Your account is pending admin approval."
    }


async def claim_pending_credentials(user_id: str, email: str, db):
    """
    Claim any pending credentials issued to this email address.
    Issues them on blockchain and links to user account.
    """
    from utils.blockchain_service import blockchain_service
    
    # Find pending credentials for this email
    pending_creds = await db.pending_credentials.find({
        "recipient_email": email.lower(),
        "status": "pending_signup"
    }).to_list(None)
    
    claimed_count = 0
    for pending in pending_creds:
        try:
            # Create the actual blockchain credential
            from models.blockchain_credentials import BlockchainCredential
            
            credential = BlockchainCredential(
                worker_id=user_id,
                institution_id=pending["institution_id"],
                credential_template_id=pending.get("credential_template_id", ""),
                credential_name=pending.get("credential_name"),
                program_name=pending.get("program_name"),
                issue_date=pending.get("issue_date"),
                expiry_date=pending.get("expiry_date"),
                student_name=pending.get("student_name"),
                student_id=pending.get("student_id"),
                grade_gpa=pending.get("grade_gpa"),
                additional_details=pending.get("additional_details", {})
            )
            
            credential.credential_hash = credential.generate_credential_hash()
            credential.verification_url = blockchain_service.generate_verification_url(credential.credential_id)
            
            # Upload to IPFS
            metadata = {
                "credential_id": credential.credential_id,
                "credential_name": credential.credential_name,
                "program_name": credential.program_name,
                "student_name": credential.student_name,
                "issue_date": credential.issue_date,
                "institution_id": credential.institution_id
            }
            
            ipfs_url = await blockchain_service.upload_to_ipfs(metadata)
            credential.ipfs_url = ipfs_url
            
            # Mint on blockchain
            blockchain_result = await blockchain_service.mint_credential({
                "credential_id": credential.credential_id,
                "credential_hash": credential.credential_hash,
                "ipfs_url": ipfs_url,
                "worker_id": user_id,
                "institution_id": credential.institution_id
            })
            
            credential.blockchain_transaction_hash = blockchain_result["transaction_hash"]
            credential.blockchain_token_id = blockchain_result["token_id"]
            credential.status = "issued"
            credential.issued_at = datetime.now(timezone.utc)
            
            # Generate QR code
            import qrcode
            import io
            import base64
            
            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            qr.add_data(credential.verification_url)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            credential.qr_code_url = f"data:image/png;base64,{img_str}"
            
            # Save to database
            credential_doc = credential.model_dump()
            credential_doc["on_chain"] = blockchain_result.get("on_chain", False)
            credential_doc["blockchain_status"] = blockchain_result.get("status", "simulated")
            credential_doc["claimed_from_pending"] = pending["pending_credential_id"]
            
            await db.blockchain_credentials.insert_one(credential_doc)
            
            # Update pending credential status
            await db.pending_credentials.update_one(
                {"pending_credential_id": pending["pending_credential_id"]},
                {"$set": {
                    "status": "claimed",
                    "claimed_by_user_id": user_id,
                    "claimed_at": datetime.now(timezone.utc).isoformat(),
                    "issued_credential_id": credential.credential_id
                }}
            )
            
            claimed_count += 1
            
        except Exception as e:
            print(f"Error claiming pending credential {pending['pending_credential_id']}: {e}")
            continue
    
    return claimed_count


@router.post("/resend-signup-otp", response_model=Dict)
@limiter.limit("3/minute")
async def resend_signup_otp(request: Request, resend_data: ResendOTPRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Resend OTP(s) for signup verification
    """
    # Find the user
    user = await db.users.find_one({"user_id": resend_data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.get("profile_status") != "pending_verification":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already verified or has a different status"
        )
    
    # Get profile for full name
    profile = None
    user_type = user.get("user_type")
    if user_type == "workforce":
        profile = await db.workforce_profiles.find_one({"workforce_id": resend_data.user_id}, {"_id": 0})
    elif user_type == "employer":
        profile = await db.employer_profiles.find_one({"employer_id": resend_data.user_id}, {"_id": 0})
    elif user_type == "institution":
        profile = await db.institution_profiles.find_one({"institution_id": resend_data.user_id}, {"_id": 0})
    
    full_name = profile.get("full_name", "User") if profile else "User"
    
    # Generate new OTPs
    email_otp = generate_otp() if resend_data.otp_type in ["email", "both"] else None
    phone_otp = generate_otp() if resend_data.otp_type in ["phone", "both"] else None
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Get existing OTP record or create new one
    existing_otp = await db.signup_otps.find_one(
        {"user_id": resend_data.user_id},
        sort=[("created_at", -1)]
    )
    
    update_fields = {
        "expires_at": expires_at.isoformat(),
        "attempts": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if email_otp:
        update_fields["email_otp"] = email_otp
        update_fields["email_verified"] = False
    if phone_otp:
        update_fields["phone_otp"] = phone_otp
        update_fields["phone_verified"] = False
    
    if existing_otp:
        await db.signup_otps.update_one(
            {"_id": existing_otp["_id"]},
            {"$set": update_fields}
        )
        # Keep old OTPs if not regenerating
        if not email_otp:
            email_otp = existing_otp.get("email_otp")
        if not phone_otp:
            phone_otp = existing_otp.get("phone_otp")
    else:
        # Create new OTP record
        otp_doc = {
            "user_id": resend_data.user_id,
            "email": user["email"],
            "phone": user["phone"],
            "email_otp": email_otp or generate_otp(),
            "phone_otp": phone_otp or generate_otp(),
            "email_verified": False,
            "phone_verified": False,
            **update_fields
        }
        await db.signup_otps.insert_one(otp_doc)
    
    # Send OTPs
    messages_sent = []
    
    if resend_data.otp_type in ["email", "both"] and email_otp:
        try:
            from utils.email_service import email_service
            email_sent = await email_service.send_otp_email(
                to_email=user["email"],
                full_name=full_name,
                otp_code=email_otp
            )
            if email_sent:
                messages_sent.append("email")
            else:
                print(f"\n{'='*50}")
                print(f"📧 EMAIL OTP for {user['email']}: {email_otp}")
                print(f"{'='*50}\n")
                messages_sent.append("email (console)")
        except Exception as e:
            logger.error(f"Error sending email OTP: {str(e)}")
            print(f"\n{'='*50}")
            print(f"📧 EMAIL OTP for {user['email']}: {email_otp}")
            print(f"{'='*50}\n")
            messages_sent.append("email (console)")
    
    if resend_data.otp_type in ["phone", "both"] and phone_otp:
        try:
            from services.sms_service import send_sms, format_phone_e164
            formatted_phone = format_phone_e164(user["phone"])
            if formatted_phone:
                sms_result = await send_sms(
                    formatted_phone,
                    f"Your HR Bank verification code is: {phone_otp}. Valid for 10 minutes."
                )
                if sms_result.get("success"):
                    messages_sent.append("phone")
                else:
                    print(f"\n{'='*50}")
                    print(f"📱 PHONE OTP for {user['phone']}: {phone_otp}")
                    print(f"{'='*50}\n")
                    messages_sent.append("phone (console)")
            else:
                print(f"\n{'='*50}")
                print(f"📱 PHONE OTP for {user['phone']}: {phone_otp}")
                print(f"{'='*50}\n")
                messages_sent.append("phone (console)")
        except Exception as e:
            logger.error(f"Error sending SMS OTP: {str(e)}")
            print(f"\n{'='*50}")
            print(f"📱 PHONE OTP for {user['phone']}: {phone_otp}")
            print(f"{'='*50}\n")
            messages_sent.append("phone (console)")
    
    return {
        "success": True,
        "data": {
            "otp_sent_to": messages_sent,
            "expires_in_minutes": 10
        },
        "message": f"OTP(s) resent successfully to {', '.join(messages_sent)}"
    }


@router.post("/resend-verification", response_model=Dict)
async def resend_verification_email(
    data: dict,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Resend verification email to a user (admin action)
    """
    email = data.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate new verification token
    verification_token = str(uuid.uuid4())
    
    await db.users.update_one(
        {"email": email},
        {
            "$set": {
                "verification_token": verification_token,
                "verification_token_expires": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
            }
        }
    )
    
    # Send verification email
    try:
        from utils.email_service import send_verification_email
        frontend_url = os.environ.get("FRONTEND_URL", "https://hrbank.ca")
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"
        
        await send_verification_email(
            to_email=email,
            user_name=user.get("full_name", "User"),
            verification_link=verification_link
        )
        
        return {
            "success": True,
            "message": f"Verification email sent to {email}"
        }
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
        return {
            "success": True,
            "message": f"Verification email queued for {email}"
        }


@router.get("/signup-verification-status/{user_id}", response_model=Dict)
async def get_signup_verification_status(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Get the current verification status for a signup
    """
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    otp_record = await db.signup_otps.find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )
    
    return {
        "success": True,
        "data": {
            "profile_status": user.get("profile_status"),
            "email_verified": user.get("email_verified", False),
            "phone_verified": user.get("phone_verified", False),
            "otp_expires_at": otp_record.get("expires_at") if otp_record else None,
            "email": user.get("email"),
            "phone": user.get("phone")
        }
    }

@router.post("/login", response_model=Dict)
@limiter.limit("5/minute")  # Rate limit: 5 login attempts per minute per IP
async def login(request: Request, credentials: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    User login endpoint
    Returns JWT access and refresh tokens
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Find user by email
    user = await db.users.find_one({"email": credentials.email})
    logger.info(f"Login attempt for {credentials.email}, user found: {user is not None}")
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password
    password_valid = verify_password(credentials.password, user["password_hash"])
    logger.info(f"Password verification for {credentials.email}: {password_valid}")
    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if email is verified (admins and super_admins bypass this check)
    if user.get("user_type") not in ["admin", "super_admin"] and not user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first"
        )
    
    # Check profile status and return appropriate redirect
    user_type = user.get("user_type")
    
    # Handle profile_status - workpassport users use 'status' instead of 'profile_status'
    if user_type == "workpassport":
        profile_status = user.get("status", "active")  # workpassport users use 'status' field
    elif user_type in ["admin", "super_admin"]:
        profile_status = user.get("profile_status", "active")
    else:
        profile_status = user.get("profile_status", "pending")
    
    needs_onboarding = False
    needs_documents = False
    
    # Admin and super_admin users bypass profile status checks
    if user_type not in ["admin", "super_admin"]:
        if profile_status == "pending_documents":
            # Workforce user needs to submit documents for verification
            needs_documents = True
        elif profile_status == "pending":
            # User is pending admin approval (documents submitted, awaiting review)
            pass  # Frontend will redirect to pending page
        elif profile_status == "active":
            # Check if onboarding is completed
            if user_type == "employer":
                profile = await db.employer_profiles.find_one({"employer_id": user["user_id"]})
                needs_onboarding = not profile.get("onboarding_completed", False) if profile else True
            elif user_type == "workforce":
                profile = await db.workforce_profiles.find_one({"workforce_id": user["user_id"]})
                needs_onboarding = not profile.get("onboarding_completed", False) if profile else True
        
        # Check if account is suspended
        if profile_status == "suspended":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account suspended. Contact support for assistance."
            )
    
    # Create tokens
    token_data = {
        "user_id": user["user_id"],
        "email": user["email"],
        "user_type": user["user_type"]
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Update last login
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"last_login_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "data": {
            "user_id": user["user_id"],
            "email": user["email"],
            "user_type": user["user_type"],
            "profile_status": profile_status,
            "needs_onboarding": needs_onboarding,
            "needs_documents": needs_documents,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": 86400,
            "mfa_required": False
        },
        "message": "Login successful"
    }

@router.get("/verify-email")
async def verify_email(token: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Verify email with token from email link
    """
    import os
    frontend_url = os.environ.get('FRONTEND_URL')
    if not frontend_url:
        raise HTTPException(status_code=500, detail="FRONTEND_URL not configured")
    
    # Find verification record
    verification = await db.email_verifications.find_one({
        "verification_token": token,
        "verified": False
    })
    
    if not verification:
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"{frontend_url}/login?error=invalid_token",
            status_code=302
        )
    
    # Check if expired
    expires_at = datetime.fromisoformat(verification["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        return RedirectResponse(
            url=f"{frontend_url}/login?error=token_expired",
            status_code=302
        )
    
    # Mark email as verified
    await db.users.update_one(
        {"user_id": verification["user_id"]},
        {"$set": {"email_verified": True}}
    )
    
    # Check user type to determine profile_status after email verification
    user = await db.users.find_one({"user_id": verification["user_id"]})
    if user:
        user_type = user.get("user_type")
        user_email = user.get("email")
        
        if user_type == "workpassport":
            # WorkPassport users are ACTIVE immediately after email verification
            await db.users.update_one(
                {"user_id": verification["user_id"]},
                {"$set": {"status": "active", "profile_status": "active"}}
            )
            
            # Claim any pending credentials issued to this email
            claimed_count = await claim_pending_credentials(verification["user_id"], user_email, db)
            if claimed_count > 0:
                print(f"Claimed {claimed_count} pending credential(s) for {user_email}")
                
        elif user_type == "workforce":
            # Workforce users need document verification next (admin approval)
            await db.users.update_one(
                {"user_id": verification["user_id"]},
                {"$set": {"profile_status": "pending_documents"}}
            )
            
            # Also claim pending credentials for workforce users
            claimed_count = await claim_pending_credentials(verification["user_id"], user_email, db)
            if claimed_count > 0:
                print(f"Claimed {claimed_count} pending credential(s) for {user_email}")
        else:
            # Other user types (employer, institution) - active after email verification
            await db.users.update_one(
                {"user_id": verification["user_id"]},
                {"$set": {"status": "active", "profile_status": "active"}}
            )
    
    await db.email_verifications.update_one(
        {"verification_token": token},
        {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Redirect to login with success message
    return RedirectResponse(
        url=f"{frontend_url}/login?verified=true",
        status_code=302
    )

@router.post("/logout")
async def logout():
    """
    Logout endpoint (client-side token removal)
    """
    return {
        "success": True,
        "message": "Logged out successfully"
    }

@router.post("/change-password")
async def change_password(
    request: Dict,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Change user password
    Requires current password for security
    """
    from auth.dependencies import get_current_user
    from fastapi import Depends
    
    # Get current user from token
    current_password = request.get("current_password")
    new_password = request.get("new_password")
    user_id = request.get("user_id")
    
    if not current_password or not new_password or not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password, new password, and user_id are required"
        )
    
    # Validate new password strength
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )
    
    # Get user from database
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify current password
    if not verify_password(current_password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Hash new password
    new_password_hash = hash_password(new_password)
    
    # Update password in database
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "password_hash": new_password_hash,
                "password_updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {
        "success": True,
        "message": "Password changed successfully"
    }

# ============================================
# Password Reset Flow
# ============================================

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Initiate password reset - sends email with reset link
    """
    import os
    
    # Find user by email
    user = await db.users.find_one({"email": data.email.lower()})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"success": True, "message": "If an account exists with this email, you will receive a password reset link."}
    
    # Generate reset token
    reset_token = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "user_id": user["user_id"],
                "email": data.email.lower(),
                "token": reset_token,
                "expires_at": expires_at.isoformat(),
                "used": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Get user's name
    profile = None
    user_type = user.get("user_type")
    if user_type == "workforce":
        profile = await db.workforce_profiles.find_one({"workforce_id": user["user_id"]})
    elif user_type == "employer":
        profile = await db.employer_profiles.find_one({"employer_id": user["user_id"]})
    elif user_type == "institution":
        profile = await db.institution_profiles.find_one({"institution_id": user["user_id"]})
    elif user_type == "workpassport":
        profile = await db.workpassport_profiles.find_one({"user_id": user["user_id"]})
    
    full_name = profile.get("full_name", "User") if profile else "User"
    
    # Send reset email
    try:
        from utils.email_service import EmailService
        email_service = EmailService()
        
        frontend_url = os.environ.get('FRONTEND_URL')
        if not frontend_url:
            raise HTTPException(status_code=500, detail="FRONTEND_URL not configured")
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        await email_service.send_password_reset_email(
            to_email=data.email.lower(),
            full_name=full_name,
            reset_link=reset_link
        )
        logger.info(f"Password reset email sent to {data.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        # Still return success to prevent enumeration
    
    return {"success": True, "message": "If an account exists with this email, you will receive a password reset link."}

@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, data: ResetPasswordRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Reset password using token from email
    """
    # Find reset token
    reset_record = await db.password_resets.find_one({
        "token": data.token,
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link"
        )
    
    # Check if expired
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link has expired. Please request a new one."
        )
    
    # Validate new password
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Update password and verify email (password reset proves email ownership)
    new_password_hash = hash_password(data.new_password)
    
    await db.users.update_one(
        {"user_id": reset_record["user_id"]},
        {
            "$set": {
                "password_hash": new_password_hash,
                "password_updated_at": datetime.now(timezone.utc).isoformat(),
                "email_verified": True,  # Password reset proves email ownership
                "status": "active",
                "profile_status": "active"
            }
        }
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Log the password reset
    logger.info(f"Password reset completed for user {reset_record['user_id']}")
    
    return {"success": True, "message": "Password reset successfully. You can now log in with your new password."}

@router.get("/google/status")
async def google_oauth_status():
    """Check if Google OAuth is configured"""
    import os
    
    configured = bool(
        os.environ.get('GOOGLE_OAUTH_CLIENT_ID') and 
        os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET')
    )
    
    return {
        "success": True,
        "data": {
            "available": configured,
            "message": "Google OAuth is ready" if configured else "Google OAuth not configured"
        }
    }

@router.get("/google/login")
async def google_login(request: Request, user_type: str = "workforce", db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Initiate Google OAuth login
    user_type: workforce, employer, or institution
    """
    import os
    import secrets
    
    # Check if Google OAuth is configured
    if not os.environ.get('GOOGLE_OAUTH_CLIENT_ID') or not os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET'):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Please use email/password login or contact support."
        )
    
    from auth.oauth_config import oauth
    
    # Use BACKEND_URL environment variable for redirect URI
    # This ensures correct URL when behind a reverse proxy
    backend_url = os.environ.get('BACKEND_URL', '').rstrip('/')
    if not backend_url:
        # Fallback to request base_url if BACKEND_URL not set
        backend_url = str(request.base_url).rstrip('/')
        if 'hrbank.ca' in backend_url or 'preview.emergentagent.com' in backend_url:
            backend_url = backend_url.replace('http://', 'https://')
    
    redirect_uri = f"{backend_url}/api/auth/google/callback"
    
    # Generate a unique state token and store user_type in database
    # This is more reliable than session across containers/proxies
    state_token = secrets.token_urlsafe(32)
    await db.oauth_states.insert_one({
        "state": state_token,
        "user_type": user_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    # Also store in session as backup
    request.session['oauth_user_type'] = user_type
    request.session['oauth_state'] = state_token
    
    logger.info(f"[Google OAuth] Initiating login for user_type={user_type}, redirect_uri={redirect_uri}")
    
    return await oauth.google.authorize_redirect(request, redirect_uri, state=state_token)

@router.get("/google/callback")
async def google_callback(
    request: Request,
    state: str = None,
    user_type: str = "workforce",
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Google OAuth callback
    Creates user if doesn't exist, or logs in existing user
    """
    from auth.oauth_config import oauth
    
    # Retrieve user_type from stored state (most reliable), session, or query param
    if state:
        stored_state = await db.oauth_states.find_one({"state": state})
        if stored_state:
            user_type = stored_state.get("user_type", user_type)
            # Clean up used state
            await db.oauth_states.delete_one({"state": state})
            logger.info(f"[Google OAuth] Retrieved user_type={user_type} from stored state")
        else:
            logger.warning(f"[Google OAuth] State not found in DB, using session/query param")
    
    # Fallback to session
    session_user_type = request.session.pop('oauth_user_type', None)
    if session_user_type:
        user_type = session_user_type
        logger.info(f"[Google OAuth] Retrieved user_type={user_type} from session")
    
    logger.info(f"[Google OAuth] Processing callback for user_type={user_type}")
    
    try:
        # Get token from Google
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )
        
        email = user_info.get('email')
        full_name = user_info.get('name')
        google_id = user_info.get('sub')
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email})
        
        if existing_user:
            # User exists - log them in with their ORIGINAL user_type
            user_id = existing_user["user_id"]
            user_type = existing_user["user_type"]  # Use existing user's type, not the OAuth request type
            
            # Update last login and activate account
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "last_login_date": datetime.now(timezone.utc).isoformat(),
                    "email_verified": True,
                    "status": "active",
                    "profile_status": "active"
                }}
            )
            logger.info(f"[Google OAuth] Existing user logged in: {email} (type={user_type})")
        else:
            # Create new user
            user_id = f"usr_{uuid.uuid4().hex[:12]}"
            
            user_doc = {
                "user_id": user_id,
                "email": email,
                "password_hash": "",  # No password for OAuth users
                "user_type": user_type,
                "status": "active",  # For workpassport users
                "profile_status": "active",  # Auto-activate OAuth users
                "email_verified": True,  # Google verified the email
                "mfa_enabled": False,
                "google_id": google_id,
                "oauth_provider": "google",
                "created_date": datetime.now(timezone.utc).isoformat(),
                "last_login_date": datetime.now(timezone.utc).isoformat(),
                "deleted_at": None
            }
            
            await db.users.insert_one(user_doc)
            logger.info(f"[Google OAuth] New user created: {email} (type={user_type})")
            
            # Create profile based on user type
            profile_doc = {
                f"{user_type}_id": user_id,
                "full_name": full_name,
                "phone": "",  # Will be filled later
                "created_date": datetime.now(timezone.utc).isoformat()
            }
            
            if user_type == "workforce":
                profile_doc.update({
                    "skills": [],
                    "certifications": [],
                    "rating_avg": 0.0,
                    "rating_count": 0,
                    "profile_completeness": 20,
                    "completed_jobs_count": 0
                })
                await db.workforce_profiles.insert_one(profile_doc)
            elif user_type == "employer":
                profile_doc["company_name"] = full_name
                profile_doc["rating_avg"] = 0.0
                profile_doc["rating_count"] = 0
                await db.employer_profiles.insert_one(profile_doc)
            elif user_type == "institution":
                profile_doc["institution_name"] = full_name
                profile_doc["verified_status"] = "pending"
                await db.institution_profiles.insert_one(profile_doc)
        
        # Create JWT tokens
        token_data = {
            "user_id": user_id,
            "email": email,
            "user_type": user_type
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        # Redirect to frontend with tokens in URL - use FRONTEND_URL env var
        frontend_url = os.environ.get('FRONTEND_URL', '').rstrip('/')
        if not frontend_url:
            frontend_url = str(request.base_url).rstrip('/')
        callback_url = f"{frontend_url}/auth/google/callback?access_token={access_token}&refresh_token={refresh_token}&user_type={user_type}"
        
        logger.info(f"[Google OAuth] Success for {email}, redirecting to: {callback_url[:80]}...")
        return RedirectResponse(url=callback_url)
        
    except Exception as e:
        # Log the actual error for debugging
        logger.error(f"[Google OAuth] Error during callback: {str(e)}", exc_info=True)
        
        # Redirect to login with error - use FRONTEND_URL env var
        frontend_url = os.environ.get('FRONTEND_URL', '').rstrip('/')
        if not frontend_url:
            frontend_url = str(request.base_url).rstrip('/')
        error_url = f"{frontend_url}/login?error=google_auth_failed"
        return RedirectResponse(url=error_url)
