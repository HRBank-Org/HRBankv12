"""
LinkedIn OAuth Integration Routes
Handles LinkedIn login, profile import, and sharing
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Header
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from database import db
import httpx
import os
import uuid
import jwt
from passlib.context import CryptContext

router = APIRouter(prefix="/linkedin", tags=["LinkedIn Integration"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID = os.environ.get("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = os.environ.get("LINKEDIN_CLIENT_SECRET")
LINKEDIN_REDIRECT_URI = os.environ.get("LINKEDIN_REDIRECT_URI")
JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key")

# LinkedIn API endpoints
LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_PROFILE_URL = "https://api.linkedin.com/v2/me"
LINKEDIN_EMAIL_URL = "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))"


def gen_id(prefix=""):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def generate_passport_id():
    """Generate a unique WorkPassport ID like WP-XXXX-XXXX-XXXX"""
    parts = [uuid.uuid4().hex[:4].upper() for _ in range(3)]
    return f"WP-{'-'.join(parts)}"


def generate_share_token():
    """Generate a shareable profile token"""
    return uuid.uuid4().hex[:16]


class LinkedInImportRequest(BaseModel):
    """Request to import LinkedIn profile data"""
    import_work_experience: bool = True
    import_education: bool = True
    import_skills: bool = True
    import_certifications: bool = True


# ============== OAuth Flow ==============

@router.get("/authorize")
async def linkedin_authorize(
    redirect_after: str = Query(default="/workpassport/dashboard"),
    link_to_user: Optional[str] = Query(default=None)
):
    """
    Initiate LinkedIn OAuth flow.
    redirect_after: Where to redirect after successful auth
    link_to_user: If provided, link LinkedIn to existing user instead of creating new
    """
    if not LINKEDIN_CLIENT_ID:
        raise HTTPException(status_code=500, detail="LinkedIn not configured")
    
    # Generate state for CSRF protection
    state = uuid.uuid4().hex
    
    # Store state with metadata in database
    await db.oauth_states.insert_one({
        "state": state,
        "redirect_after": redirect_after,
        "link_to_user": link_to_user,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": datetime.now(timezone.utc).isoformat()
    })
    
    # LinkedIn OAuth scopes - use basic scopes available by default
    # For Sign In with LinkedIn using OpenID Connect (requires approval):
    # scopes = "openid profile email"
    # For basic OAuth (available by default):
    scopes = "r_liteprofile r_emailaddress"
    
    auth_url = (
        f"{LINKEDIN_AUTH_URL}?"
        f"response_type=code&"
        f"client_id={LINKEDIN_CLIENT_ID}&"
        f"redirect_uri={LINKEDIN_REDIRECT_URI}&"
        f"state={state}&"
        f"scope={scopes}"
    )
    
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def linkedin_callback(
    code: str = Query(...),
    state: str = Query(...)
):
    """
    Process LinkedIn OAuth callback.
    Exchange code for tokens and create/link user.
    """
    # Verify state
    stored_state = await db.oauth_states.find_one({"state": state})
    if not stored_state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    # Clean up used state
    await db.oauth_states.delete_one({"state": state})
    
    redirect_after = stored_state.get("redirect_after", "/workpassport/dashboard")
    link_to_user = stored_state.get("link_to_user")
    
    # Exchange authorization code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            LINKEDIN_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_CLIENT_SECRET,
                "redirect_uri": LINKEDIN_REDIRECT_URI
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
    
    if token_response.status_code != 200:
        print(f"LinkedIn token error: {token_response.text}")
        raise HTTPException(
            status_code=400, 
            detail=f"Failed to exchange code: {token_response.text}"
        )
    
    tokens = token_response.json()
    access_token = tokens.get("access_token")
    
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token received")
    
    # Fetch user profile from LinkedIn
    async with httpx.AsyncClient() as client:
        profile_response = await client.get(
            LINKEDIN_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )
    
    if profile_response.status_code != 200:
        print(f"LinkedIn profile error: {profile_response.text}")
        raise HTTPException(status_code=400, detail="Failed to fetch LinkedIn profile")
    
    linkedin_profile = profile_response.json()
    
    # Extract profile data
    linkedin_id = linkedin_profile.get("sub")  # LinkedIn user ID
    email = linkedin_profile.get("email")
    first_name = linkedin_profile.get("given_name", "")
    last_name = linkedin_profile.get("family_name", "")
    full_name = f"{first_name} {last_name}".strip()
    picture = linkedin_profile.get("picture")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by LinkedIn")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if user exists by LinkedIn ID or email
    existing_user = await db.users.find_one({
        "$or": [
            {"linkedin_id": linkedin_id},
            {"email": email.lower()}
        ]
    })
    
    if existing_user:
        # Update existing user with LinkedIn data
        await db.users.update_one(
            {"_id": existing_user["_id"]},
            {"$set": {
                "linkedin_id": linkedin_id,
                "linkedin_access_token": access_token,
                "linkedin_profile": linkedin_profile,
                "last_login": now,
                "last_login_date": now
            }}
        )
        user_id = existing_user["user_id"]
        user_type = existing_user["user_type"]
        
        # Update profile picture if not set
        if picture and existing_user.get("user_type") == "workpassport":
            await db.workpassport_profiles.update_one(
                {"user_id": user_id},
                {"$set": {"profile_picture": picture}}
            )
    else:
        # Create new WorkPassport user
        user_id = gen_id("wp")
        passport_id = generate_passport_id()
        share_token = generate_share_token()
        user_type = "workpassport"
        
        # Create user account
        user = {
            "user_id": user_id,
            "email": email.lower(),
            "user_type": "workpassport",
            "status": "active",
            "email_verified": True,  # LinkedIn verified email
            "linkedin_id": linkedin_id,
            "linkedin_access_token": access_token,
            "linkedin_profile": linkedin_profile,
            "created_date": now,
            "last_login": now,
            "last_login_date": now
        }
        await db.users.insert_one(user)
        
        # Create WorkPassport profile
        profile = {
            "user_id": user_id,
            "email": email.lower(),
            "passport_id": passport_id,
            "share_token": share_token,
            "full_name": full_name,
            "headline": linkedin_profile.get("headline"),
            "profile_picture": picture,
            "country": None,  # Will be set later
            "city": None,
            "skills": [],
            "languages": [],
            "profile_visibility": "public",
            "profile_views": 0,
            "linkedin_connected": True,
            "created_date": now,
            "updated_date": now
        }
        await db.workpassport_profiles.insert_one(profile)
    
    # Generate JWT token for the user
    token_payload = {
        "user_id": user_id,
        "email": email,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + 86400,  # 24 hours
        "iat": datetime.now(timezone.utc).timestamp()
    }
    
    jwt_token = jwt.encode(token_payload, JWT_SECRET, algorithm="HS256")
    
    # Store LinkedIn profile data for import
    await db.linkedin_imports.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "linkedin_id": linkedin_id,
            "access_token": access_token,
            "profile_data": linkedin_profile,
            "imported_at": now
        }},
        upsert=True
    )
    
    # Redirect to frontend with token
    frontend_url = os.environ.get("FRONTEND_URL", "https://skills-passport.preview.emergentagent.com")
    redirect_url = f"{frontend_url}/auth/linkedin/callback?token={jwt_token}&redirect={redirect_after}"
    
    return RedirectResponse(url=redirect_url)


# ============== Profile Import ==============

@router.get("/profile")
async def get_linkedin_profile(
    user_id: str = Header(..., alias="X-User-ID")
):
    """
    Get stored LinkedIn profile data for the user.
    """
    linkedin_data = await db.linkedin_imports.find_one(
        {"user_id": user_id},
        {"_id": 0, "access_token": 0}
    )
    
    if not linkedin_data:
        raise HTTPException(status_code=404, detail="LinkedIn profile not found")
    
    profile = linkedin_data.get("profile_data", {})
    
    return {
        "success": True,
        "data": {
            "connected": True,
            "linkedin_id": linkedin_data.get("linkedin_id"),
            "first_name": profile.get("given_name"),
            "last_name": profile.get("family_name"),
            "email": profile.get("email"),
            "picture": profile.get("picture"),
            "headline": profile.get("headline"),
            "imported_at": linkedin_data.get("imported_at")
        }
    }


@router.post("/import")
async def import_linkedin_profile(
    data: LinkedInImportRequest,
    user_id: str = Header(..., alias="X-User-ID")
):
    """
    Import LinkedIn profile data into WorkPassport.
    Creates occupation profiles from work experience.
    """
    linkedin_data = await db.linkedin_imports.find_one({"user_id": user_id})
    
    if not linkedin_data:
        raise HTTPException(status_code=404, detail="LinkedIn profile not found. Please connect LinkedIn first.")
    
    profile = linkedin_data.get("profile_data", {})
    access_token = linkedin_data.get("access_token")
    now = datetime.now(timezone.utc).isoformat()
    
    imported_items = {
        "work_experience": 0,
        "education": 0,
        "skills": 0,
        "certifications": 0
    }
    
    # For now, we have basic profile from userinfo endpoint
    # Full work history requires LinkedIn Marketing API access
    
    # Update WorkPassport profile with LinkedIn data
    update_data = {
        "linkedin_connected": True,
        "updated_date": now
    }
    
    if profile.get("given_name") and profile.get("family_name"):
        update_data["full_name"] = f"{profile['given_name']} {profile['family_name']}"
    
    if profile.get("picture"):
        update_data["profile_picture"] = profile["picture"]
    
    await db.workpassport_profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "data": {
            "imported": imported_items,
            "message": "Profile synced with LinkedIn successfully"
        }
    }


@router.delete("/disconnect")
async def disconnect_linkedin(
    user_id: str = Header(..., alias="X-User-ID")
):
    """
    Disconnect LinkedIn account from WorkPassport.
    """
    # Remove LinkedIn data from user
    await db.users.update_one(
        {"user_id": user_id},
        {"$unset": {
            "linkedin_id": "",
            "linkedin_access_token": "",
            "linkedin_profile": ""
        }}
    )
    
    # Update profile
    await db.workpassport_profiles.update_one(
        {"user_id": user_id},
        {"$set": {"linkedin_connected": False}}
    )
    
    # Remove stored import data
    await db.linkedin_imports.delete_one({"user_id": user_id})
    
    return {
        "success": True,
        "message": "LinkedIn account disconnected"
    }


# ============== Share to LinkedIn ==============

@router.post("/share")
async def share_to_linkedin(
    credential_id: str,
    user_id: str = Header(..., alias="X-User-ID")
):
    """
    Share a credential achievement to LinkedIn.
    Note: Requires LinkedIn Marketing API access for full functionality.
    """
    # Get user's LinkedIn access token
    user = await db.users.find_one({"user_id": user_id})
    if not user or not user.get("linkedin_access_token"):
        raise HTTPException(status_code=400, detail="LinkedIn not connected")
    
    # Get credential details
    credential = await db.workpassport_credentials.find_one({"credential_id": credential_id})
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    # For now, return share URL that user can manually post
    profile = await db.workpassport_profiles.find_one({"user_id": user_id})
    share_url = f"https://hrbank.ca/passport/{profile.get('share_token')}"
    
    share_text = (
        f"I just earned my {credential.get('credential_name')} credential! "
        f"Check out my verified WorkPassport profile: {share_url} #WorkPassport #Credentials"
    )
    
    # LinkedIn share URL
    linkedin_share_url = (
        f"https://www.linkedin.com/sharing/share-offsite/?"
        f"url={share_url}"
    )
    
    return {
        "success": True,
        "data": {
            "share_url": linkedin_share_url,
            "share_text": share_text,
            "message": "Click the share URL to post on LinkedIn"
        }
    }
