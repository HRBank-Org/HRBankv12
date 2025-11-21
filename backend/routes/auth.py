from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.user import UserCreate, UserLogin, TokenResponse, User, UserInDB, EmailVerification
from auth.password import hash_password, verify_password
from auth.jwt_handler import create_access_token, create_refresh_token
from datetime import datetime, timedelta
from typing import Dict
import uuid
from starlette.requests import Request
from starlette.responses import RedirectResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.post("/signup", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    User signup endpoint
    Creates new user account and sends email verification
    """
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Check if phone already exists
    existing_phone = await db.users.find_one({"phone": user_data.phone})
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered"
        )
    
    # Create user
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": hashed_password,
        "user_type": user_data.user_type,
        "profile_status": "pending",  # All new users start as pending
        "email_verified": False,
        "mfa_enabled": False,
        "created_date": datetime.utcnow().isoformat(),
        "last_login_date": None,
        "deleted_at": None
    }
    
    await db.users.insert_one(user_doc)
    
    # Create corresponding profile based on user type
    profile_doc = {
        f"{user_data.user_type}_id": user_id,
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "created_date": datetime.utcnow().isoformat(),
        "onboarding_completed": False  # Track onboarding status
    }
    
    if user_data.user_type == "workforce":
        profile_doc.update({
            "skills": [],
            "certifications": [],
            "rating_avg": 0.0,
            "rating_count": 0,
            "profile_completeness": 20,  # 20% for basic info
            "completed_jobs_count": 0
        })
        await db.workforce_profiles.insert_one(profile_doc)
    elif user_data.user_type == "employer":
        profile_doc["company_name"] = user_data.full_name  # Will be updated in onboarding
        profile_doc["rating_avg"] = 0.0
        profile_doc["rating_count"] = 0
        profile_doc["address"] = ""
        profile_doc["postal_code"] = ""
        profile_doc["industry"] = ""
        await db.employer_profiles.insert_one(profile_doc)
    elif user_data.user_type == "institution":
        profile_doc["institution_name"] = user_data.full_name
        profile_doc["verified_status"] = "pending"
        await db.institution_profiles.insert_one(profile_doc)
    
    # Create email verification token
    verification_token = uuid.uuid4().hex
    verification_doc = {
        "user_id": user_id,
        "verification_token": verification_token,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "verified": False
    }
    await db.email_verifications.insert_one(verification_doc)
    
    # Send verification email via SendGrid
    from utils.email_service import email_service
    await email_service.send_verification_email(
        to_email=user_data.email,
        full_name=user_data.full_name,
        verification_token=verification_token
    )
    
    # Create admin notification for new signup
    from models.admin import Notification
    admin_users = await db.users.find({"user_type": "admin"}, {"user_id": 1}).to_list(10)
    
    for admin in admin_users:
        admin_notif = Notification(
            user_id=admin["user_id"],
            type="new_signup",
            title=f"New {user_data.user_type.title()} Signup",
            message=f"{user_data.full_name} ({user_data.email}) signed up as {user_data.user_type}. Phone: {user_data.phone}. Please review and approve.",
            data={
                "action_url": f"/admin/users/{user_id}",
                "action_button_text": "Review Account",
                "priority": "high",
                "user_type": user_data.user_type
            }
        )
        await db.notifications.insert_one(admin_notif.model_dump())
    
    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "email": user_data.email,
            "user_type": user_data.user_type,
            "email_verified": False,
            "profile_status": "pending",
            "verification_token_sent": True
        },
        "message": "Account created. Please verify your email."
    }

@router.post("/login", response_model=Dict)
async def login(credentials: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    User login endpoint
    Returns JWT access and refresh tokens
    """
    # Find user by email
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if email is verified (admins bypass this check)
    if user.get("user_type") != "admin" and not user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first"
        )
    
    # Check profile status and return appropriate redirect
    user_type = user.get("user_type")
    profile_status = user.get("profile_status", "active" if user_type == "admin" else "pending")
    needs_onboarding = False
    
    # Admin users bypass profile status checks
    if user_type != "admin":
        if profile_status == "pending":
            # User is pending admin approval
            pass  # Frontend will redirect to pending page
        elif profile_status == "active":
            # Check if onboarding is completed
            if user_type == "employer":
                profile = await db.employer_profiles.find_one({"employer_id": user["user_id"]})
                needs_onboarding = not profile.get("onboarding_completed", False)
            elif user_type == "workforce":
                profile = await db.workforce_profiles.find_one({"workforce_id": user["user_id"]})
                needs_onboarding = not profile.get("onboarding_completed", False)
        
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
        {"$set": {"last_login_date": datetime.utcnow().isoformat()}}
    )
    
    return {
        "success": True,
        "data": {
            "user_id": user["user_id"],
            "email": user["email"],
            "user_type": user["user_type"],
            "profile_status": profile_status,
            "needs_onboarding": needs_onboarding,
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
    # Find verification record
    verification = await db.email_verifications.find_one({
        "verification_token": token,
        "verified": False
    })
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Check if expired
    expires_at = datetime.fromisoformat(verification["expires_at"])
    if datetime.utcnow() > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token expired"
        )
    
    # Mark email as verified
    await db.users.update_one(
        {"user_id": verification["user_id"]},
        {"$set": {"email_verified": True, "profile_status": "active"}}
    )
    
    await db.email_verifications.update_one(
        {"verification_token": token},
        {"$set": {"verified": True}}
    )
    
    return {
        "success": True,
        "message": "Email verified successfully"
    }

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
                "password_updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Password changed successfully"
    }

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
async def google_login(request: Request, user_type: str = "workforce"):
    """
    Initiate Google OAuth login
    user_type: workforce, employer, or institution
    """
    import os
    
    # Check if Google OAuth is configured
    if not os.environ.get('GOOGLE_OAUTH_CLIENT_ID') or not os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET'):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Please use email/password login or contact support."
        )
    
    from auth.oauth_config import oauth
    
    # Store user_type in session for callback
    redirect_uri = f"{request.base_url}api/auth/google/callback?user_type={user_type}"
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(
    request: Request,
    user_type: str = "workforce",
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Google OAuth callback
    Creates user if doesn't exist, or logs in existing user
    """
    from auth.oauth_config import oauth
    
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
            # User exists - log them in
            user_id = existing_user["user_id"]
            
            # Update last login
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"last_login_date": datetime.utcnow().isoformat()}}
            )
        else:
            # Create new user
            user_id = f"usr_{uuid.uuid4().hex[:12]}"
            
            user_doc = {
                "user_id": user_id,
                "email": email,
                "password_hash": "",  # No password for OAuth users
                "user_type": user_type,
                "profile_status": "active",  # Auto-activate OAuth users
                "email_verified": True,  # Google verified the email
                "mfa_enabled": False,
                "google_id": google_id,
                "oauth_provider": "google",
                "created_date": datetime.utcnow().isoformat(),
                "last_login_date": datetime.utcnow().isoformat(),
                "deleted_at": None
            }
            
            await db.users.insert_one(user_doc)
            
            # Create profile based on user type
            profile_doc = {
                f"{user_type}_id": user_id,
                "full_name": full_name,
                "phone": "",  # Will be filled later
                "created_date": datetime.utcnow().isoformat()
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
        
        # Redirect to frontend with tokens in URL
        frontend_url = os.environ.get('FRONTEND_URL', 'https://mobile-hrbank.preview.emergentagent.com')
        callback_url = f"{frontend_url}/auth/google/callback?access_token={access_token}&refresh_token={refresh_token}&user_type={user_type}"
        
        return RedirectResponse(url=callback_url)
        
    except Exception as e:
        # Redirect to login with error
        frontend_url = os.environ.get('FRONTEND_URL', 'https://mobile-hrbank.preview.emergentagent.com')
        error_url = f"{frontend_url}/login?error=google_auth_failed"
        return RedirectResponse(url=error_url)
