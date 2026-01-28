"""
Institution Fundraiser Routes
Allows institutions to create fundraisers visible only to their graduates
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import uuid

from auth.dependencies import get_current_user, require_role
from database import db

router = APIRouter(prefix="/fundraisers", tags=["Fundraisers"])

# Platform fee configuration (HR Bank receives 5% of donations)
PLATFORM_FEE_PERCENTAGE = 0.05  # 5%

# ============================================
# Models
# ============================================
class FundraiserCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=20, max_length=5000)
    goal_amount: float = Field(..., gt=0)
    min_donation: float = Field(default=5.0, ge=1.0)
    media_url: Optional[str] = None  # Image or video URL
    media_type: Optional[str] = None  # 'image' or 'video'
    end_date: Optional[str] = None

class FundraiserUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    goal_amount: Optional[float] = None
    min_donation: Optional[float] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None

class DonationCreate(BaseModel):
    amount: float = Field(..., gt=0)
    message: Optional[str] = None
    anonymous: bool = False

# ============================================
# Institution Endpoints
# ============================================
@router.post("/create")
async def create_fundraiser(
    data: FundraiserCreate,
    current_user: dict = Depends(require_role("institution")),
):
    """Create a new fundraiser (institution only)"""
    institution_id = current_user["user_id"]
    
    # Get institution info
    institution = await db.institution_profiles.find_one(
        {"institution_id": institution_id},
        {"_id": 0, "institution_name": 1, "logo_url": 1}
    )
    
    if not institution:
        raise HTTPException(status_code=404, detail="Institution profile not found")
    
    fundraiser_id = f"FUND-{uuid.uuid4().hex[:12].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    
    fundraiser = {
        "fundraiser_id": fundraiser_id,
        "institution_id": institution_id,
        "institution_name": institution.get("institution_name", "Unknown"),
        "institution_logo": institution.get("logo_url"),
        "title": data.title,
        "description": data.description,
        "goal_amount": data.goal_amount,
        "min_donation": data.min_donation,
        "media_url": data.media_url,
        "media_type": data.media_type,
        "end_date": data.end_date,
        "raised_amount": 0.0,           # Net amount to institution
        "gross_raised_amount": 0.0,     # Total from donors
        "platform_fees_total": 0.0,     # Platform fees collected
        "donor_count": 0,
        "platform_fee_percentage": PLATFORM_FEE_PERCENTAGE * 100,  # Store as 5 (percent)
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.fundraisers.insert_one(fundraiser)
    
    return {
        "success": True,
        "data": {
            "fundraiser_id": fundraiser_id,
            "title": data.title,
            "goal_amount": data.goal_amount
        },
        "message": "Fundraiser created successfully"
    }

@router.get("/institution/list")
async def get_institution_fundraisers(
    current_user: dict = Depends(require_role("institution")),
):
    """Get all fundraisers for the current institution"""
    fundraisers = await db.fundraisers.find(
        {"institution_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "success": True,
        "data": {
            "fundraisers": fundraisers,
            "total": len(fundraisers)
        }
    }

@router.get("/institution/{fundraiser_id}")
async def get_fundraiser_details(
    fundraiser_id: str,
    current_user: dict = Depends(require_role("institution")),
):
    """Get detailed fundraiser info including donors (institution only)"""
    fundraiser = await db.fundraisers.find_one(
        {"fundraiser_id": fundraiser_id, "institution_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not fundraiser:
        raise HTTPException(status_code=404, detail="Fundraiser not found")
    
    # Get donations for this fundraiser
    donations = await db.fundraiser_donations.find(
        {"fundraiser_id": fundraiser_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "success": True,
        "data": {
            "fundraiser": fundraiser,
            "donations": donations,
            "donation_count": len(donations)
        }
    }

@router.put("/institution/{fundraiser_id}")
async def update_fundraiser(
    fundraiser_id: str,
    data: FundraiserUpdate,
    current_user: dict = Depends(require_role("institution")),
):
    """Update a fundraiser"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.fundraisers.update_one(
        {"fundraiser_id": fundraiser_id, "institution_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fundraiser not found")
    
    return {"success": True, "message": "Fundraiser updated"}

@router.delete("/institution/{fundraiser_id}")
async def delete_fundraiser(
    fundraiser_id: str,
    current_user: dict = Depends(require_role("institution")),
):
    """Delete a fundraiser"""
    result = await db.fundraisers.delete_one(
        {"fundraiser_id": fundraiser_id, "institution_id": current_user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fundraiser not found")
    
    return {"success": True, "message": "Fundraiser deleted"}

# ============================================
# Graduate/User Endpoints
# ============================================
@router.get("/my-institutions")
async def get_my_institution_fundraisers(
    current_user: dict = Depends(require_role("workforce", "workpassport")),
):
    """Get active fundraisers from institutions where user has credentials"""
    user_id = current_user["user_id"]
    
    # Find all institutions where user has verified credentials
    user_credentials = await db.blockchain_credentials.find(
        {"worker_id": user_id, "status": {"$in": ["issued", "verified"]}},
        {"institution_id": 1, "_id": 0}
    ).to_list(100)
    
    institution_ids = list(set(c["institution_id"] for c in user_credentials if c.get("institution_id")))
    
    if not institution_ids:
        return {
            "success": True,
            "data": {
                "fundraisers": [],
                "total": 0
            },
            "message": "No credentials from institutions yet"
        }
    
    # Get active fundraisers from those institutions
    fundraisers = await db.fundraisers.find(
        {
            "institution_id": {"$in": institution_ids},
            "is_active": True,
            "$or": [
                {"end_date": None},
                {"end_date": {"$gte": datetime.now(timezone.utc).isoformat()}}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Check which ones user has already donated to
    user_donations = await db.fundraiser_donations.find(
        {"donor_id": user_id},
        {"fundraiser_id": 1, "amount": 1, "_id": 0}
    ).to_list(100)
    
    donation_map = {d["fundraiser_id"]: d["amount"] for d in user_donations}
    
    for f in fundraisers:
        f["user_donated"] = f["fundraiser_id"] in donation_map
        f["user_donation_amount"] = donation_map.get(f["fundraiser_id"], 0)
    
    return {
        "success": True,
        "data": {
            "fundraisers": fundraisers,
            "total": len(fundraisers)
        }
    }

@router.get("/public/{fundraiser_id}")
async def get_public_fundraiser(
    fundraiser_id: str,
    current_user: dict = Depends(require_role("workforce", "workpassport")),
):
    """Get a single fundraiser (must have credential from that institution)"""
    user_id = current_user["user_id"]
    
    fundraiser = await db.fundraisers.find_one(
        {"fundraiser_id": fundraiser_id, "is_active": True},
        {"_id": 0}
    )
    
    if not fundraiser:
        raise HTTPException(status_code=404, detail="Fundraiser not found")
    
    # Verify user has credential from this institution
    has_credential = await db.blockchain_credentials.find_one({
        "worker_id": user_id,
        "institution_id": fundraiser["institution_id"],
        "status": {"$in": ["issued", "verified"]}
    })
    
    if not has_credential:
        raise HTTPException(
            status_code=403, 
            detail="You need a verified credential from this institution to view this fundraiser"
        )
    
    # Get recent donors (non-anonymous)
    recent_donors = await db.fundraiser_donations.find(
        {"fundraiser_id": fundraiser_id, "anonymous": False},
        {"_id": 0, "donor_name": 1, "amount": 1, "message": 1, "created_at": 1}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "success": True,
        "data": {
            "fundraiser": fundraiser,
            "recent_donors": recent_donors
        }
    }

# ============================================
# Donation/Payment Endpoints
# ============================================
@router.post("/donate/{fundraiser_id}")
async def donate_to_fundraiser(
    fundraiser_id: str,
    data: DonationCreate,
    current_user: dict = Depends(require_role("workforce", "workpassport")),
):
    """Make a donation to a fundraiser using Stripe"""
    import stripe
    import os
    
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    user_id = current_user["user_id"]
    
    # Get fundraiser
    fundraiser = await db.fundraisers.find_one(
        {"fundraiser_id": fundraiser_id, "is_active": True},
        {"_id": 0}
    )
    
    if not fundraiser:
        raise HTTPException(status_code=404, detail="Fundraiser not found or inactive")
    
    # Verify minimum donation
    if data.amount < fundraiser.get("min_donation", 5):
        raise HTTPException(
            status_code=400, 
            detail=f"Minimum donation is ${fundraiser.get('min_donation', 5)}"
        )
    
    # Verify user has credential from this institution
    has_credential = await db.blockchain_credentials.find_one({
        "worker_id": user_id,
        "institution_id": fundraiser["institution_id"],
        "status": {"$in": ["issued", "verified"]}
    })
    
    if not has_credential:
        raise HTTPException(
            status_code=403, 
            detail="You need a verified credential from this institution to donate"
        )
    
    # Get user info for donor name
    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "profile": 1, "email": 1}
    )
    
    donor_name = user.get("profile", {}).get("full_name", "Anonymous")
    
    # Create Stripe checkout session
    try:
        origin_url = os.environ.get("FRONTEND_URL", "https://credvault-14.preview.emergentagent.com")
        
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "cad",
                    "unit_amount": int(data.amount * 100),  # Stripe uses cents
                    "product_data": {
                        "name": f"Donation: {fundraiser['title']}",
                        "description": f"Donation to {fundraiser['institution_name']}",
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{origin_url}/donation/success?session_id={{CHECKOUT_SESSION_ID}}&fundraiser_id={fundraiser_id}",
            cancel_url=f"{origin_url}/donation/cancelled?fundraiser_id={fundraiser_id}",
            metadata={
                "fundraiser_id": fundraiser_id,
                "donor_id": user_id,
                "donor_name": donor_name if not data.anonymous else "Anonymous",
                "anonymous": str(data.anonymous),
                "message": data.message or "",
                "type": "fundraiser_donation"
            }
        )
        
        return {
            "success": True,
            "data": {
                "checkout_url": session.url,
                "session_id": session.id
            }
        }
        
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment processing error: {str(e)}")

@router.post("/webhook/donation-complete")
async def handle_donation_webhook(
    session_id: str,
):
    """Process completed donation (called after Stripe webhook or success redirect)"""
    import stripe
    import os
    
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status != "paid":
            return {"success": False, "message": "Payment not completed"}
        
        metadata = session.metadata
        fundraiser_id = metadata.get("fundraiser_id")
        
        # Check if donation already recorded
        existing = await db.fundraiser_donations.find_one({
            "stripe_session_id": session_id
        })
        
        if existing:
            return {"success": True, "message": "Donation already recorded"}
        
        # Record donation with platform fee calculation
        donation_id = f"DON-{uuid.uuid4().hex[:12].upper()}"
        now = datetime.now(timezone.utc).isoformat()
        gross_amount = session.amount_total / 100  # Convert from cents
        
        # Calculate platform fee (5%)
        platform_fee = round(gross_amount * PLATFORM_FEE_PERCENTAGE, 2)
        net_amount = round(gross_amount - platform_fee, 2)
        
        donation = {
            "donation_id": donation_id,
            "fundraiser_id": fundraiser_id,
            "donor_id": metadata.get("donor_id"),
            "donor_name": metadata.get("donor_name", "Anonymous"),
            "gross_amount": gross_amount,  # Total paid by donor
            "platform_fee": platform_fee,  # 5% to HR Bank
            "net_amount": net_amount,       # 95% to institution
            "amount": net_amount,           # For backward compatibility
            "message": metadata.get("message"),
            "anonymous": metadata.get("anonymous") == "True",
            "stripe_session_id": session_id,
            "stripe_payment_intent": session.payment_intent,
            "created_at": now
        }
        
        await db.fundraiser_donations.insert_one(donation)
        
        # Update fundraiser totals (use net_amount for institution's view)
        await db.fundraisers.update_one(
            {"fundraiser_id": fundraiser_id},
            {
                "$inc": {
                    "raised_amount": net_amount,  # Net amount for institution
                    "gross_raised_amount": gross_amount,  # Total paid by donors
                    "platform_fees_total": platform_fee,  # Platform revenue
                    "donor_count": 1
                },
                "$set": {"updated_at": now}
            }
        )
        
        # Notify institution
        fundraiser = await db.fundraisers.find_one({"fundraiser_id": fundraiser_id})
        if fundraiser:
            await db.notifications.insert_one({
                "notification_id": f"notif-{uuid.uuid4().hex[:8]}",
                "user_id": fundraiser["institution_id"],
                "type": "donation_received",
                "title": "New Donation Received!",
                "message": f"${gross_amount:.2f} donated to '{fundraiser['title']}' (${net_amount:.2f} after platform fee)",
                "data": {
                    "fundraiser_id": fundraiser_id, 
                    "gross_amount": gross_amount,
                    "net_amount": net_amount,
                    "platform_fee": platform_fee
                },
                "read": False,
                "created_at": now
            })
            
            # Send email notification to institution
            try:
                # Get institution user and profile
                institution_user = await db.users.find_one({"user_id": fundraiser["institution_id"]})
                if institution_user and institution_user.get("email"):
                    from utils.email_service import EmailService
                    email_service = EmailService()
                    
                    await email_service.send_donation_notification_email(
                        to_email=institution_user["email"],
                        institution_name=fundraiser.get("institution_name", "Your Institution"),
                        donor_name=metadata.get("donor_name", "Anonymous"),
                        amount=gross_amount,
                        net_amount=net_amount,
                        fundraiser_title=fundraiser["title"],
                        message=metadata.get("message")
                    )
                    logger.info(f"Donation notification email sent to {institution_user['email']}")
            except Exception as email_error:
                logger.error(f"Failed to send donation notification email: {email_error}")
                # Don't fail the webhook if email fails
        
        return {
            "success": True,
            "data": {
                "donation_id": donation_id,
                "gross_amount": gross_amount,
                "platform_fee": platform_fee,
                "net_amount": net_amount
            },
            "message": "Donation recorded successfully"
        }
        
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification error: {str(e)}")
