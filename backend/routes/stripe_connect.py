"""
Stripe Connect Integration for Institution Payouts
- Express account onboarding
- Automatic weekly payouts
- Province-specific Canadian taxes
"""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
import os
import uuid
import stripe
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/stripe-connect", tags=["Stripe Connect"])

def get_db():
    from server import db
    return db

# Initialize Stripe
stripe.api_key = os.environ.get("STRIPE_API_KEY")

# ============================================
# Models
# ============================================
class ConnectOnboardingRequest(BaseModel):
    """Request to start Stripe Connect onboarding"""
    return_url: str
    refresh_url: str

class WithdrawalRequest(BaseModel):
    """Request a manual withdrawal"""
    amount_cad: float = Field(..., gt=0)

# ============================================
# Stripe Connect Account Management
# ============================================
@router.post("/create-account")
async def create_connect_account(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Create a Stripe Connect Express account for the institution
    """
    # Check if institution already has a connected account
    institution = await db.institution_profiles.find_one(
        {"institution_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found"
        )
    
    # If already has a connect account, return it
    if institution.get("stripe_connect_account_id"):
        return {
            "success": True,
            "data": {
                "account_id": institution["stripe_connect_account_id"],
                "status": institution.get("stripe_connect_status", "pending"),
                "already_exists": True
            },
            "message": "Stripe Connect account already exists"
        }
    
    try:
        # Create Express account
        account = stripe.Account.create(
            type="express",
            country="CA",
            email=current_user.get("email"),
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_type="company",
            business_profile={
                "name": institution.get("institution_name", "Institution"),
                "mcc": "8299",  # Educational Services
                "url": institution.get("website_url") or None,
            },
            settings={
                "payouts": {
                    "schedule": {
                        "interval": "weekly",
                        "weekly_anchor": "friday"
                    }
                }
            },
            metadata={
                "institution_id": current_user["user_id"],
                "platform": "hr_bank"
            }
        )
        
        # Store in database
        await db.institution_profiles.update_one(
            {"institution_id": current_user["user_id"]},
            {"$set": {
                "stripe_connect_account_id": account.id,
                "stripe_connect_status": "pending",
                "stripe_connect_created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "data": {
                "account_id": account.id,
                "status": "pending"
            },
            "message": "Stripe Connect account created. Complete onboarding to start receiving payouts."
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create Stripe account: {str(e)}"
        )

@router.post("/onboarding-link")
async def create_onboarding_link(
    request: ConnectOnboardingRequest,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Create an account link for Stripe Connect onboarding
    """
    institution = await db.institution_profiles.find_one(
        {"institution_id": current_user["user_id"]},
        {"_id": 0, "stripe_connect_account_id": 1}
    )
    
    if not institution or not institution.get("stripe_connect_account_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe Connect account found. Create one first."
        )
    
    try:
        account_link = stripe.AccountLink.create(
            account=institution["stripe_connect_account_id"],
            refresh_url=request.refresh_url,
            return_url=request.return_url,
            type="account_onboarding",
        )
        
        return {
            "success": True,
            "data": {
                "url": account_link.url,
                "expires_at": account_link.expires_at
            }
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create onboarding link: {str(e)}"
        )

@router.get("/account-status")
async def get_account_status(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Get the status of the institution's Stripe Connect account
    """
    institution = await db.institution_profiles.find_one(
        {"institution_id": current_user["user_id"]},
        {"_id": 0, "stripe_connect_account_id": 1, "stripe_connect_status": 1, "province": 1}
    )
    
    if not institution:
        return {
            "success": True,
            "data": {
                "has_account": False,
                "status": None,
                "onboarding_complete": False
            }
        }
    
    if not institution.get("stripe_connect_account_id"):
        return {
            "success": True,
            "data": {
                "has_account": False,
                "status": None,
                "onboarding_complete": False
            }
        }
    
    try:
        # Get account details from Stripe
        account = stripe.Account.retrieve(institution["stripe_connect_account_id"])
        
        # Determine status
        is_complete = account.charges_enabled and account.payouts_enabled
        status_text = "active" if is_complete else "pending"
        
        # Update status in database if changed
        if status_text != institution.get("stripe_connect_status"):
            await db.institution_profiles.update_one(
                {"institution_id": current_user["user_id"]},
                {"$set": {
                    "stripe_connect_status": status_text,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {
            "success": True,
            "data": {
                "has_account": True,
                "account_id": account.id,
                "status": status_text,
                "onboarding_complete": is_complete,
                "charges_enabled": account.charges_enabled,
                "payouts_enabled": account.payouts_enabled,
                "details_submitted": account.details_submitted,
                "payout_schedule": {
                    "interval": "weekly",
                    "anchor": "friday"
                }
            }
        }
        
    except stripe.error.StripeError as e:
        return {
            "success": True,
            "data": {
                "has_account": True,
                "account_id": institution.get("stripe_connect_account_id"),
                "status": institution.get("stripe_connect_status", "unknown"),
                "error": str(e)
            }
        }

@router.get("/dashboard-link")
async def get_dashboard_link(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Get a link to the Stripe Express dashboard for the institution
    """
    institution = await db.institution_profiles.find_one(
        {"institution_id": current_user["user_id"]},
        {"_id": 0, "stripe_connect_account_id": 1}
    )
    
    if not institution or not institution.get("stripe_connect_account_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe Connect account found"
        )
    
    try:
        login_link = stripe.Account.create_login_link(
            institution["stripe_connect_account_id"]
        )
        
        return {
            "success": True,
            "data": {
                "url": login_link.url
            }
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create dashboard link: {str(e)}"
        )

# ============================================
# Payout Management
# ============================================
@router.get("/balance")
async def get_payout_balance(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Get the institution's payout balance and history
    """
    from utils.canadian_taxes import get_tax_rate, get_all_provinces
    
    institution = await db.institution_profiles.find_one(
        {"institution_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found"
        )
    
    # Get all paid credentials for this institution
    paid_credentials = await db.pending_credentials.find(
        {"institution_id": current_user["user_id"], "status": "paid"},
        {"_id": 0}
    ).sort("paid_at", -1).to_list(length=500)
    
    # Calculate totals
    total_earned = sum(c.get("institution_payout_cad", 0) for c in paid_credentials)
    
    # Get payout records
    payouts = await db.institution_payouts.find(
        {"institution_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    
    total_paid_out = sum(p.get("amount_cad", 0) for p in payouts if p.get("status") == "completed")
    pending_payout = round(total_earned - total_paid_out, 2)
    
    # Get province tax info
    province = institution.get("province", "ON")
    tax_info = get_tax_rate(province)
    
    # Try to get Stripe balance if connected
    stripe_balance = None
    if institution.get("stripe_connect_account_id"):
        try:
            balance = stripe.Balance.retrieve(
                stripe_account=institution["stripe_connect_account_id"]
            )
            stripe_balance = {
                "available": sum(b.amount for b in balance.available) / 100,
                "pending": sum(b.amount for b in balance.pending) / 100,
                "currency": "CAD"
            }
        except:
            pass
    
    return {
        "success": True,
        "data": {
            "total_earned_cad": round(total_earned, 2),
            "total_paid_out_cad": round(total_paid_out, 2),
            "available_balance_cad": pending_payout,
            "stripe_balance": stripe_balance,
            "paid_credentials_count": len(paid_credentials),
            "payouts": payouts[:20],
            "recent_sales": paid_credentials[:10],
            "connect_status": institution.get("stripe_connect_status"),
            "has_connect_account": bool(institution.get("stripe_connect_account_id")),
            "province": province,
            "tax_info": tax_info,
            "payout_schedule": "Weekly (Fridays)"
        }
    }

@router.get("/payout-history")
async def get_payout_history(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Get detailed payout history from Stripe
    """
    institution = await db.institution_profiles.find_one(
        {"institution_id": current_user["user_id"]},
        {"_id": 0, "stripe_connect_account_id": 1}
    )
    
    if not institution or not institution.get("stripe_connect_account_id"):
        return {
            "success": True,
            "data": {
                "payouts": [],
                "message": "No Stripe Connect account found"
            }
        }
    
    try:
        # Get payouts from Stripe
        payouts = stripe.Payout.list(
            limit=50,
            stripe_account=institution["stripe_connect_account_id"]
        )
        
        payout_list = []
        for payout in payouts.data:
            payout_list.append({
                "payout_id": payout.id,
                "amount_cad": payout.amount / 100,
                "status": payout.status,
                "arrival_date": datetime.fromtimestamp(payout.arrival_date).isoformat() if payout.arrival_date else None,
                "created_at": datetime.fromtimestamp(payout.created).isoformat(),
                "method": payout.method,
                "type": payout.type
            })
        
        return {
            "success": True,
            "data": {
                "payouts": payout_list
            }
        }
        
    except stripe.error.StripeError as e:
        return {
            "success": True,
            "data": {
                "payouts": [],
                "error": str(e)
            }
        }

# ============================================
# Tax Information
# ============================================
@router.get("/tax-info")
async def get_tax_info(
    province: Optional[str] = None,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Get tax information for a province
    """
    from utils.canadian_taxes import get_tax_rate, get_all_provinces
    
    if province:
        tax_info = get_tax_rate(province)
        return {
            "success": True,
            "data": tax_info
        }
    
    # Return all provinces
    return {
        "success": True,
        "data": {
            "provinces": get_all_provinces()
        }
    }

@router.patch("/update-province")
async def update_institution_province(
    province: str,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Update the institution's province for tax purposes
    """
    from utils.canadian_taxes import CANADIAN_TAX_RATES
    
    province = province.upper()
    if province not in CANADIAN_TAX_RATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid province code: {province}"
        )
    
    await db.institution_profiles.update_one(
        {"institution_id": current_user["user_id"]},
        {"$set": {
            "province": province,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Province updated to {province}"
    }
