"""
Credential Monetization System
- Institutions sell credentials at fixed tier prices
- 50% revenue share with HR Bank
- Pending credentials for workforce without accounts
"""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/credential-payments", tags=["Credential Payments"])

def get_db():
    from server import db
    return db

# ============================================
# PRICING TIERS (Fixed by HR Bank)
# ============================================
CREDENTIAL_PRICING = {
    "certificate": {
        "name": "Certificate",
        "description": "Safety certificates, WHMIS, Food Handler, etc.",
        "price_cad": 50.00,
        "examples": ["Food Handler", "WHMIS", "Smart Serve", "First Aid", "CPR"]
    },
    "diploma": {
        "name": "Diploma/Certificate Program",
        "description": "College diplomas and certificate programs",
        "price_cad": 100.00,
        "examples": ["Culinary Arts Diploma", "Business Certificate", "IT Diploma"]
    },
    "degree": {
        "name": "Degree with Transcript",
        "description": "Undergraduate and graduate degrees with official transcript",
        "price_cad": 200.00,
        "examples": ["Bachelor's Degree", "Master's Degree", "PhD"]
    }
}

# HR Bank revenue share (50%)
PLATFORM_FEE_PERCENTAGE = 0.50

# ============================================
# Models
# ============================================
class PendingCredentialCreate(BaseModel):
    """Create a pending credential for someone (may not have account)"""
    recipient_email: str
    recipient_name: str
    student_id: str
    credential_type: str = Field(..., description="certificate, diploma, or degree")
    credential_name: str
    program_name: Optional[str] = None
    issue_date: str
    expiry_date: Optional[str] = None
    additional_details: Optional[Dict] = None

class PaymentInitiate(BaseModel):
    """Initiate payment for a pending credential"""
    pending_credential_id: str
    origin_url: str
    province: Optional[str] = "ON"  # Province for tax calculation

# ============================================
# Institution Endpoints
# ============================================
@router.get("/pricing-tiers")
async def get_pricing_tiers():
    """Get all credential pricing tiers"""
    return {
        "success": True,
        "data": {
            "tiers": CREDENTIAL_PRICING,
            "platform_fee_percentage": PLATFORM_FEE_PERCENTAGE * 100,
            "currency": "CAD"
        }
    }

@router.get("/calculate-price")
async def calculate_credential_price(
    credential_type: str,
    province: str = "ON"
):
    """Calculate total price including tax for a credential"""
    from utils.canadian_taxes import calculate_credential_price_with_tax
    
    try:
        price_breakdown = calculate_credential_price_with_tax(credential_type, province)
        return {
            "success": True,
            "data": price_breakdown
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/provinces")
async def get_canadian_provinces():
    """Get list of Canadian provinces with tax rates"""
    from utils.canadian_taxes import get_all_provinces
    return {
        "success": True,
        "data": {
            "provinces": get_all_provinces()
        }
    }

@router.post("/issue-pending")
async def issue_pending_credential(
    credential: PendingCredentialCreate,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Institution issues a credential to someone.
    If recipient doesn't have an account, it's held as 'pending_payment'.
    """
    # Validate credential type
    if credential.credential_type not in CREDENTIAL_PRICING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid credential type. Must be one of: {list(CREDENTIAL_PRICING.keys())}"
        )
    
    tier = CREDENTIAL_PRICING[credential.credential_type]
    price = tier["price_cad"]
    
    # Get institution info
    institution = await db.institution_profiles.find_one(
        {"institution_id": current_user["user_id"]},
        {"_id": 0, "institution_name": 1, "logo_url": 1}
    )
    
    # Check if recipient has an account
    recipient = await db.users.find_one(
        {"email": credential.recipient_email.lower()},
        {"_id": 0, "user_id": 1, "user_type": 1}
    )
    
    # Create pending credential
    pending_id = f"PEND-{uuid.uuid4().hex[:12].upper()}"
    pending_credential = {
        "pending_credential_id": pending_id,
        "institution_id": current_user["user_id"],
        "institution_name": institution.get("institution_name", "Unknown Institution") if institution else "Unknown Institution",
        "institution_logo": institution.get("logo_url") if institution else None,
        "recipient_email": credential.recipient_email.lower(),
        "recipient_name": credential.recipient_name,
        "student_id": credential.student_id,
        "credential_type": credential.credential_type,
        "credential_name": credential.credential_name,
        "program_name": credential.program_name,
        "issue_date": credential.issue_date,
        "expiry_date": credential.expiry_date,
        "additional_details": credential.additional_details,
        "price_cad": price,
        "platform_fee_cad": round(price * PLATFORM_FEE_PERCENTAGE, 2),
        "institution_payout_cad": round(price * (1 - PLATFORM_FEE_PERCENTAGE), 2),
        "status": "pending_payment",
        "recipient_user_id": recipient.get("user_id") if recipient else None,
        "has_account": recipient is not None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pending_credentials.insert_one(pending_credential)
    
    # Send email notification to the recipient
    try:
        from services.credential_email_service import send_credential_issued_email
        send_credential_issued_email(
            recipient_email=credential.recipient_email,
            recipient_name=credential.recipient_name,
            credential_name=credential.credential_name,
            credential_type=credential.credential_type,
            institution_name=institution.get("institution_name", "Unknown Institution") if institution else "Unknown Institution",
            price_cad=price,
            issue_date=credential.issue_date
        )
    except Exception as e:
        print(f"Failed to send credential email: {e}")
    
    # If recipient has account, send them an in-app notification
    if recipient:
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": recipient["user_id"],
            "type": "credential_available",
            "title": "New Credential Available!",
            "message": f"{institution.get('institution_name', 'An institution')} has issued you a {credential.credential_name}. Pay ${price:.2f} CAD to claim it.",
            "data": {"pending_credential_id": pending_id},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {
        "success": True,
        "data": {
            "pending_credential_id": pending_id,
            "recipient_email": credential.recipient_email,
            "recipient_has_account": recipient is not None,
            "price_cad": price,
            "platform_fee_cad": pending_credential["platform_fee_cad"],
            "institution_payout_cad": pending_credential["institution_payout_cad"],
            "status": "pending_payment",
            "email_sent": True
        },
        "message": f"Credential issued and email sent to {credential.recipient_email}. {'Recipient also notified in-app.' if recipient else 'Recipient will see it when they create an account.'}"
    }

@router.get("/institution/issued")
async def get_institution_issued_credentials(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get all credentials issued by institution with payment status"""
    pending = await db.pending_credentials.find(
        {"institution_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=500)
    
    # Calculate totals
    total_issued = len(pending)
    total_paid = len([p for p in pending if p.get("status") == "paid"])
    total_pending = len([p for p in pending if p.get("status") == "pending_payment"])
    total_revenue = sum(p.get("institution_payout_cad", 0) for p in pending if p.get("status") == "paid")
    
    return {
        "success": True,
        "data": {
            "credentials": pending,
            "summary": {
                "total_issued": total_issued,
                "total_paid": total_paid,
                "total_pending": total_pending,
                "total_revenue_cad": round(total_revenue, 2),
                "currency": "CAD"
            }
        }
    }

@router.get("/institution/payouts")
async def get_institution_payouts(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get institution's payout history"""
    # Get paid credentials
    paid_credentials = await db.pending_credentials.find(
        {"institution_id": current_user["user_id"], "status": "paid"},
        {"_id": 0}
    ).sort("paid_at", -1).to_list(length=500)
    
    # Calculate earnings
    total_earned = sum(c.get("institution_payout_cad", 0) for c in paid_credentials)
    
    # Get payout records
    payouts = await db.institution_payouts.find(
        {"institution_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    
    total_paid_out = sum(p.get("amount_cad", 0) for p in payouts if p.get("status") == "completed")
    pending_payout = total_earned - total_paid_out
    
    return {
        "success": True,
        "data": {
            "total_earned_cad": round(total_earned, 2),
            "total_paid_out_cad": round(total_paid_out, 2),
            "pending_payout_cad": round(pending_payout, 2),
            "paid_credentials_count": len(paid_credentials),
            "payouts": payouts,
            "recent_sales": paid_credentials[:10]
        }
    }

# ============================================
# Workforce Endpoints
# ============================================
@router.get("/my-pending")
async def get_my_pending_credentials(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get all pending credentials waiting for payment"""
    user = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "email": 1}
    )
    
    if not user:
        return {"success": True, "data": {"pending_credentials": []}}
    
    # Find by email or user_id
    pending = await db.pending_credentials.find(
        {
            "$or": [
                {"recipient_email": user["email"]},
                {"recipient_user_id": current_user["user_id"]}
            ],
            "status": "pending_payment"
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    
    # Update any that don't have user_id linked
    for p in pending:
        if not p.get("recipient_user_id"):
            await db.pending_credentials.update_one(
                {"pending_credential_id": p["pending_credential_id"]},
                {"$set": {
                    "recipient_user_id": current_user["user_id"],
                    "has_account": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    return {
        "success": True,
        "data": {
            "pending_credentials": pending,
            "total_pending": len(pending),
            "total_cost_cad": sum(p.get("price_cad", 0) for p in pending)
        }
    }

@router.get("/my-purchased")
async def get_my_purchased_credentials(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get all credentials purchased by workforce"""
    user = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "email": 1}
    )
    
    purchased = await db.pending_credentials.find(
        {
            "$or": [
                {"recipient_email": user["email"]},
                {"recipient_user_id": current_user["user_id"]}
            ],
            "status": "paid"
        },
        {"_id": 0}
    ).sort("paid_at", -1).to_list(length=500)
    
    return {
        "success": True,
        "data": {
            "purchased_credentials": purchased,
            "total_purchased": len(purchased),
            "total_spent_cad": sum(p.get("price_cad", 0) for p in purchased)
        }
    }

# ============================================
# Payment Endpoints (Stripe)
# ============================================
@router.post("/initiate-payment")
async def initiate_credential_payment(
    request: Request,
    payment_data: PaymentInitiate,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Initiate Stripe payment for a pending credential with tax"""
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest
    )
    from utils.canadian_taxes import calculate_tax
    
    # Get the pending credential
    pending = await db.pending_credentials.find_one(
        {"pending_credential_id": payment_data.pending_credential_id},
        {"_id": 0}
    )
    
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending credential not found"
        )
    
    if pending.get("status") != "pending_payment":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Credential is not pending payment. Status: {pending.get('status')}"
        )
    
    # Verify user is the recipient
    user = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "email": 1}
    )
    
    if user["email"].lower() != pending["recipient_email"].lower() and pending.get("recipient_user_id") != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to pay for this credential"
        )
    
    # Calculate tax based on province
    province = payment_data.province or "ON"
    tax_breakdown = calculate_tax(pending["price_cad"], province)
    total_amount = tax_breakdown["total"]
    
    # Initialize Stripe
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Create checkout session
    origin_url = payment_data.origin_url.rstrip("/")
    success_url = f"{origin_url}/workforce/credentials/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/workforce/credentials/pending"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(total_amount),
        currency="cad",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "pending_credential_id": pending["pending_credential_id"],
            "user_id": current_user["user_id"],
            "institution_id": pending["institution_id"],
            "credential_name": pending["credential_name"],
            "payment_type": "credential_purchase",
            "province": province,
            "base_amount": str(pending["price_cad"]),
            "tax_amount": str(tax_breakdown["tax_amount"]),
            "tax_rate": str(tax_breakdown["tax_rate_percentage"])
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "pending_credential_id": pending["pending_credential_id"],
        "user_id": current_user["user_id"],
        "institution_id": pending["institution_id"],
        "base_amount_cad": pending["price_cad"],
        "tax_amount_cad": tax_breakdown["tax_amount"],
        "tax_rate": tax_breakdown["tax_rate"],
        "tax_description": tax_breakdown["tax_description"],
        "province": province,
        "total_amount_cad": total_amount,
        "platform_fee_cad": pending["platform_fee_cad"],
        "institution_payout_cad": pending["institution_payout_cad"],
        "currency": "CAD",
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(transaction)
    
    return {
        "success": True,
        "data": {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "pricing": {
                "subtotal_cad": pending["price_cad"],
                "tax_amount_cad": tax_breakdown["tax_amount"],
                "tax_rate_percentage": tax_breakdown["tax_rate_percentage"],
                "tax_description": tax_breakdown["tax_description"],
                "total_cad": total_amount
            }
        }
    }

@router.get("/payment-status/{session_id}")
async def get_payment_status(
    request: Request,
    session_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Check payment status and process if successful"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    # Get transaction
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Check if already processed
    if transaction.get("payment_status") == "paid":
        return {
            "success": True,
            "data": {
                "payment_status": "paid",
                "credential_id": transaction.get("credential_id"),
                "message": "Payment already processed"
            }
        }
    
    # Check with Stripe
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    if checkout_status.payment_status == "paid":
        # Process the payment
        await process_successful_payment(
            db, 
            transaction["pending_credential_id"],
            transaction["user_id"],
            session_id
        )
        
        # Get updated transaction
        updated_txn = await db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        return {
            "success": True,
            "data": {
                "payment_status": "paid",
                "credential_id": updated_txn.get("credential_id"),
                "message": "Payment successful! Credential has been added to your profile."
            }
        }
    
    # Update status
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": checkout_status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "data": {
            "payment_status": checkout_status.payment_status,
            "status": checkout_status.status
        }
    }

async def process_successful_payment(db, pending_credential_id: str, user_id: str, session_id: str):
    """Process a successful payment - create the blockchain credential"""
    from utils.blockchain_service import blockchain_service
    
    # Get pending credential
    pending = await db.pending_credentials.find_one(
        {"pending_credential_id": pending_credential_id},
        {"_id": 0}
    )
    
    if not pending or pending.get("status") == "paid":
        return  # Already processed
    
    # Create the blockchain credential
    credential_id = f"HRBANK-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
    
    # Upload to IPFS
    ipfs_result = await blockchain_service.upload_to_ipfs({
        "credential_id": credential_id,
        "credential_name": pending["credential_name"],
        "program_name": pending.get("program_name"),
        "recipient_name": pending["recipient_name"],
        "student_id": pending["student_id"],
        "institution_id": pending["institution_id"],
        "institution_name": pending["institution_name"],
        "issue_date": pending["issue_date"],
        "expiry_date": pending.get("expiry_date"),
        "credential_type": pending["credential_type"],
        "issued_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Mint on blockchain
    blockchain_result = await blockchain_service.mint_credential({
        "credential_id": credential_id,
        "credential_hash": ipfs_result.get("ipfs_hash", ""),
        "worker_id": user_id,
        "institution_id": pending["institution_id"]
    })
    
    # Create blockchain credential record
    blockchain_credential = {
        "credential_id": credential_id,
        "worker_id": user_id,
        "institution_id": pending["institution_id"],
        "credential_name": pending["credential_name"],
        "program_name": pending.get("program_name"),
        "student_name": pending["recipient_name"],
        "student_id": pending["student_id"],
        "issue_date": pending["issue_date"],
        "expiry_date": pending.get("expiry_date"),
        "credential_type": pending["credential_type"],
        "status": "issued",
        "ipfs_url": ipfs_result.get("ipfs_url"),
        "ipfs_gateway_url": ipfs_result.get("gateway_url"),
        "blockchain_transaction_hash": blockchain_result.get("transaction_hash"),
        "blockchain_token_id": blockchain_result.get("token_id"),
        "on_chain": blockchain_result.get("on_chain", False),
        "blockchain_status": blockchain_result.get("status"),
        "verification_url": f"https://blockwork-1.preview.emergentagent.com/verify/{credential_id}",
        "payment_info": {
            "amount_cad": pending["price_cad"],
            "transaction_id": session_id,
            "paid_at": datetime.now(timezone.utc).isoformat()
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.blockchain_credentials.insert_one(blockchain_credential)
    
    # Update pending credential
    await db.pending_credentials.update_one(
        {"pending_credential_id": pending_credential_id},
        {"$set": {
            "status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "credential_id": credential_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update payment transaction
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": "paid",
            "credential_id": credential_id,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send notification
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "credential_issued",
        "title": "Credential Issued!",
        "message": f"Your {pending['credential_name']} has been issued and verified on the blockchain.",
        "data": {"credential_id": credential_id},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Send payment receipt email
    try:
        from services.credential_email_service import send_payment_receipt_email
        
        # Get user email
        user = await db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "email": 1}
        )
        
        # Get transaction details for tax info
        transaction = await db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        if user and transaction:
            send_payment_receipt_email(
                recipient_email=user["email"],
                recipient_name=pending["recipient_name"],
                credential_name=pending["credential_name"],
                credential_type=pending["credential_type"],
                institution_name=pending["institution_name"],
                transaction_id=session_id,
                subtotal_cad=pending["price_cad"],
                tax_amount_cad=transaction.get("tax_amount_cad", 0),
                tax_description=transaction.get("tax_description", "Tax"),
                total_cad=transaction.get("total_amount_cad", pending["price_cad"]),
                credential_id=credential_id,
                verification_url=f"https://blockwork-1.preview.emergentagent.com/verify/{credential_id}",
                paid_at=datetime.now(timezone.utc).isoformat()
            )
    except Exception as e:
        print(f"Failed to send payment receipt email: {e}")
    
    # Update institution stats
    await db.institution_profiles.update_one(
        {"institution_id": pending["institution_id"]},
        {"$inc": {
            "total_credentials_issued": 1,
            "total_revenue_cad": pending["institution_payout_cad"]
        }}
    )

# ============================================
# Webhook Endpoint
# ============================================
@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    db = Depends(get_db)
):
    """Handle Stripe webhook events"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            # Get transaction by session_id
            transaction = await db.payment_transactions.find_one(
                {"session_id": webhook_response.session_id},
                {"_id": 0}
            )
            
            if transaction and transaction.get("payment_status") != "paid":
                await process_successful_payment(
                    db,
                    transaction["pending_credential_id"],
                    transaction["user_id"],
                    webhook_response.session_id
                )
        
        return {"success": True, "received": True}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"success": False, "error": str(e)}

# ============================================
# Admin Endpoints
# ============================================
@router.get("/admin/revenue-report")
async def get_admin_revenue_report(
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Get platform revenue report (admin only)"""
    # Get all paid credentials
    paid = await db.pending_credentials.find(
        {"status": "paid"},
        {"_id": 0}
    ).to_list(length=10000)
    
    total_revenue = sum(p.get("price_cad", 0) for p in paid)
    platform_revenue = sum(p.get("platform_fee_cad", 0) for p in paid)
    institution_payouts = sum(p.get("institution_payout_cad", 0) for p in paid)
    
    # Group by institution
    institution_breakdown = {}
    for p in paid:
        inst_id = p.get("institution_id")
        if inst_id not in institution_breakdown:
            institution_breakdown[inst_id] = {
                "institution_name": p.get("institution_name"),
                "credentials_sold": 0,
                "total_revenue_cad": 0,
                "institution_payout_cad": 0,
                "platform_fee_cad": 0
            }
        institution_breakdown[inst_id]["credentials_sold"] += 1
        institution_breakdown[inst_id]["total_revenue_cad"] += p.get("price_cad", 0)
        institution_breakdown[inst_id]["institution_payout_cad"] += p.get("institution_payout_cad", 0)
        institution_breakdown[inst_id]["platform_fee_cad"] += p.get("platform_fee_cad", 0)
    
    return {
        "success": True,
        "data": {
            "summary": {
                "total_credentials_sold": len(paid),
                "total_revenue_cad": round(total_revenue, 2),
                "platform_revenue_cad": round(platform_revenue, 2),
                "institution_payouts_cad": round(institution_payouts, 2),
                "platform_fee_percentage": PLATFORM_FEE_PERCENTAGE * 100
            },
            "pricing_tiers": CREDENTIAL_PRICING,
            "institution_breakdown": list(institution_breakdown.values())
        }
    }
