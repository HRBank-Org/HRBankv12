from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from twilio.rest import Client
from datetime import datetime, timedelta
import random
import os
from typing import Dict
from auth.dependencies import get_db, get_current_user

router = APIRouter()

# Twilio client
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "+1234567890")  # Fallback for testing

# Initialize Twilio client if credentials are available
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as e:
        print(f"Failed to initialize Twilio client: {e}")

class SendOTPRequest(BaseModel):
    contact: str  # phone or email
    type: str  # "phone" or "email"

class VerifyOTPRequest(BaseModel):
    contact: str
    type: str
    code: str


def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))


@router.post("/send-otp", response_model=Dict)
async def send_otp(
    request: SendOTPRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Send OTP to phone or email"""
    
    # Generate OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store OTP in database
    otp_record = {
        "user_id": current_user["user_id"],
        "contact": request.contact,
        "type": request.type,
        "code": otp_code,
        "expires_at": expires_at,
        "verified": False,
        "attempts": 0,
        "created_at": datetime.utcnow()
    }
    
    await db.otp_verifications.insert_one(otp_record)
    
    # Send OTP based on type
    if request.type == "phone":
        # For now, always use test mode (display OTP in console and response)
        # To enable real SMS, configure a valid Twilio phone number
        print(f"\n{'='*50}")
        print(f"📱 PHONE OTP for {request.contact}")
        print(f"🔐 CODE: {otp_code}")
        print(f"⏰ Valid for 10 minutes")
        print(f"{'='*50}\n")
        
        if twilio_client and TWILIO_PHONE_NUMBER and TWILIO_PHONE_NUMBER != "+12345678900":
            try:
                # Format phone number (ensure it has country code)
                phone = request.contact
                if not phone.startswith('+'):
                    phone = f"+1{phone}"  # Assume North America if no country code
                
                # Send SMS via Twilio
                message = twilio_client.messages.create(
                    body=f"Your HR Bank verification code is: {otp_code}. Valid for 10 minutes.",
                    from_=TWILIO_PHONE_NUMBER,
                    to=phone
                )
                
                return {
                    "success": True,
                    "message": f"OTP sent to {request.contact}",
                    "sid": message.sid
                }
            except Exception as e:
                print(f"Twilio error: {e}")
                # Fall back to test mode if SMS fails
                return {
                    "success": True,
                    "message": f"OTP sent to {request.contact} (Test Mode)",
                    "test_mode": True,
                    "otp": otp_code
                }
        
        # Test mode - return OTP in response
        return {
            "success": True,
            "message": f"OTP sent to {request.contact} (Test Mode - Check console)",
            "test_mode": True,
            "otp": otp_code
        }
    
    elif request.type == "email":
        # Email OTP - displayed in console for testing
        print(f"\n{'='*50}")
        print(f"📧 EMAIL OTP for {request.contact}")
        print(f"🔐 CODE: {otp_code}")
        print(f"⏰ Valid for 10 minutes")
        print(f"{'='*50}\n")
        
        return {
            "success": True,
            "message": f"OTP sent to {request.contact} (Test Mode - Check console)",
            "test_mode": True,
            "otp": otp_code
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid type. Must be 'phone' or 'email'")


@router.post("/verify-otp", response_model=Dict)
async def verify_otp(
    request: VerifyOTPRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Verify OTP code"""
    
    # Find the most recent OTP for this contact
    otp_record = await db.otp_verifications.find_one(
        {
            "user_id": current_user["user_id"],
            "contact": request.contact,
            "type": request.type,
            "verified": False
        },
        sort=[("created_at", -1)]
    )
    
    if not otp_record:
        raise HTTPException(status_code=404, detail="No OTP request found for this contact")
    
    # Check if OTP has expired
    if datetime.utcnow() > otp_record["expires_at"]:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Check attempts
    if otp_record.get("attempts", 0) >= 3:
        raise HTTPException(status_code=400, detail="Too many failed attempts. Please request a new OTP.")
    
    # Verify code
    if otp_record["code"] != request.code:
        # Increment attempts
        await db.otp_verifications.update_one(
            {"_id": otp_record["_id"]},
            {"$inc": {"attempts": 1}}
        )
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    # Mark OTP as verified
    await db.otp_verifications.update_one(
        {"_id": otp_record["_id"]},
        {
            "$set": {
                "verified": True,
                "verified_at": datetime.utcnow()
            }
        }
    )
    
    # Update user profile verification status
    user_type = current_user["user_type"]
    collection_name = f"{user_type}_profiles"
    
    update_field = {}
    if request.type == "phone":
        update_field = {"phone_verified": True, "phone_verified_at": datetime.utcnow()}
    elif request.type == "email":
        update_field = {"email_verified": True, "email_verified_at": datetime.utcnow()}
    
    await db[collection_name].update_one(
        {f"{user_type}_id": current_user["user_id"]},
        {"$set": update_field}
    )
    
    return {
        "success": True,
        "message": f"{request.type.capitalize()} verified successfully",
        "verified": True
    }


@router.get("/verification-status", response_model=Dict)
async def get_verification_status(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get verification status for phone and email"""
    
    user_type = current_user["user_type"]
    collection_name = f"{user_type}_profiles"
    
    profile = await db[collection_name].find_one(
        {f"{user_type}_id": current_user["user_id"]},
        {"phone_verified": 1, "email_verified": 1, "_id": 0}
    )
    
    if not profile:
        return {
            "phone_verified": False,
            "email_verified": False
        }
    
    return {
        "phone_verified": profile.get("phone_verified", False),
        "email_verified": profile.get("email_verified", False)
    }
