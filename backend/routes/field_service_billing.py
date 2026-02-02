"""
Field Service Billing API
Charges employers for completed field service routes using per-route pricing model
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from typing import Optional, Dict, List
from datetime import datetime, timezone
from auth.dependencies import get_current_user, require_role
from database import get_database
from pydantic import BaseModel, Field
import uuid
import os
import stripe
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/field-service/billing", tags=["Field Service Billing"])

# Initialize Stripe
stripe.api_key = os.environ.get("STRIPE_API_KEY")

# ============================================
# PRICING MODEL - Per Route
# ============================================
FIELD_SERVICE_PRICING = {
    "delivery": {
        "name": "Delivery Route",
        "base_price_cad": 25.00,
        "per_stop_price_cad": 3.50,
        "description": "Package delivery, courier services"
    },
    "security_patrol": {
        "name": "Security Patrol",
        "base_price_cad": 35.00,
        "per_stop_price_cad": 5.00,
        "description": "Security rounds, site checks"
    },
    "cleaning": {
        "name": "Cleaning Service",
        "base_price_cad": 30.00,
        "per_stop_price_cad": 8.00,
        "description": "Commercial cleaning routes"
    },
    "healthcare": {
        "name": "Healthcare Visit",
        "base_price_cad": 40.00,
        "per_stop_price_cad": 10.00,
        "description": "Home care, medical visits"
    },
    "field_sales": {
        "name": "Field Sales Route",
        "base_price_cad": 30.00,
        "per_stop_price_cad": 5.00,
        "description": "Sales visits, client meetings"
    },
    "maintenance": {
        "name": "Maintenance Route",
        "base_price_cad": 35.00,
        "per_stop_price_cad": 6.00,
        "description": "Equipment maintenance, repairs"
    },
    "custom": {
        "name": "Custom Route",
        "base_price_cad": 25.00,
        "per_stop_price_cad": 4.00,
        "description": "Custom field service"
    }
}

# Platform fee percentage (revenue for HR Bank)
PLATFORM_FEE_PERCENTAGE = 0.15  # 15% platform fee


# ============================================
# Models
# ============================================
class BillingSetupRequest(BaseModel):
    """Setup billing for employer"""
    return_url: str
    refresh_url: str


class PayRouteRequest(BaseModel):
    """Pay for a completed route"""
    route_id: str
    origin_url: str
    province: str = "ON"


# ============================================
# Pricing Endpoints
# ============================================
@router.get("/pricing")
async def get_field_service_pricing():
    """Get field service pricing tiers"""
    return {
        "success": True,
        "data": {
            "pricing_tiers": FIELD_SERVICE_PRICING,
            "platform_fee_percentage": PLATFORM_FEE_PERCENTAGE * 100,
            "currency": "CAD",
            "billing_model": "per_route",
            "description": "Employers are billed per completed route. Price = Base + (Per Stop × Number of Stops)"
        }
    }


@router.get("/calculate")
async def calculate_route_price(
    route_type: str,
    num_stops: int = Query(..., gt=0),
    province: str = "ON"
):
    """Calculate price for a route before creation"""
    from utils.canadian_taxes import calculate_tax
    
    if route_type not in FIELD_SERVICE_PRICING:
        raise HTTPException(status_code=400, detail=f"Invalid route type: {route_type}")
    
    pricing = FIELD_SERVICE_PRICING[route_type]
    base_price = pricing["base_price_cad"]
    per_stop = pricing["per_stop_price_cad"]
    
    subtotal = base_price + (per_stop * num_stops)
    platform_fee = round(subtotal * PLATFORM_FEE_PERCENTAGE, 2)
    
    # Calculate tax
    tax_breakdown = calculate_tax(subtotal, province)
    
    total = round(subtotal + tax_breakdown["tax_amount"], 2)
    
    return {
        "success": True,
        "data": {
            "route_type": route_type,
            "route_type_name": pricing["name"],
            "num_stops": num_stops,
            "pricing_breakdown": {
                "base_price_cad": base_price,
                "per_stop_price_cad": per_stop,
                "stops_total_cad": round(per_stop * num_stops, 2),
                "subtotal_cad": subtotal,
                "platform_fee_cad": platform_fee,
                "tax_amount_cad": tax_breakdown["tax_amount"],
                "tax_rate_percentage": tax_breakdown["tax_rate_percentage"],
                "tax_description": tax_breakdown["tax_description"],
                "total_cad": total
            },
            "province": province
        }
    }


# ============================================
# Employer Billing Status
# ============================================
@router.get("/status")
async def get_employer_billing_status(
    current_user: dict = Depends(require_role("employer"))
):
    """Get employer's billing status and outstanding balance"""
    db = await get_database()
    
    employer_id = current_user["user_id"]
    
    # Get employer billing profile
    billing_profile = await db.employer_billing.find_one(
        {"employer_id": employer_id},
        {"_id": 0}
    )
    
    # Get completed but unpaid routes
    unpaid_routes = await db.field_service_routes.find({
        "employer_id": employer_id,
        "status": "completed",
        "billing_status": {"$in": [None, "pending", "unpaid"]}
    }, {"_id": 0}).to_list(100)
    
    # Calculate outstanding balance
    outstanding_balance = 0.0
    for route in unpaid_routes:
        route_price = await _calculate_route_bill(route)
        outstanding_balance += route_price["total_cad"]
    
    # Get paid routes this month
    from datetime import datetime
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    
    paid_routes = await db.route_billing_transactions.find({
        "employer_id": employer_id,
        "status": "paid",
        "paid_at": {"$gte": start_of_month.isoformat()}
    }, {"_id": 0}).to_list(500)
    
    month_spend = sum(t.get("total_amount_cad", 0) for t in paid_routes)
    
    # Check if employer has Stripe customer ID
    has_payment_method = bool(billing_profile and billing_profile.get("stripe_customer_id"))
    
    return {
        "success": True,
        "data": {
            "employer_id": employer_id,
            "has_payment_method": has_payment_method,
            "stripe_customer_id": billing_profile.get("stripe_customer_id") if billing_profile else None,
            "outstanding_balance_cad": round(outstanding_balance, 2),
            "unpaid_routes_count": len(unpaid_routes),
            "month_spend_cad": round(month_spend, 2),
            "paid_routes_this_month": len(paid_routes),
            "billing_status": billing_profile.get("status", "not_setup") if billing_profile else "not_setup"
        }
    }


@router.get("/unpaid-routes")
async def get_unpaid_routes(
    current_user: dict = Depends(require_role("employer"))
):
    """Get all unpaid completed routes for employer"""
    db = await get_database()
    
    # Get completed but unpaid routes
    unpaid_routes = await db.field_service_routes.find({
        "employer_id": current_user["user_id"],
        "status": "completed",
        "billing_status": {"$in": [None, "pending", "unpaid"]}
    }, {"_id": 0}).sort("actual_end_time", -1).to_list(100)
    
    # Calculate billing for each route
    routes_with_billing = []
    total_outstanding = 0.0
    
    for route in unpaid_routes:
        billing = await _calculate_route_bill(route)
        routes_with_billing.append({
            "route_id": route["route_id"],
            "route_name": route.get("route_name"),
            "route_type": route.get("route_type"),
            "worker_name": route.get("worker_name"),
            "completed_at": route.get("actual_end_time"),
            "num_stops": len(route.get("stops", [])),
            "billing": billing
        })
        total_outstanding += billing["total_cad"]
    
    return {
        "success": True,
        "data": {
            "unpaid_routes": routes_with_billing,
            "count": len(routes_with_billing),
            "total_outstanding_cad": round(total_outstanding, 2)
        }
    }


# ============================================
# Payment Endpoints
# ============================================
@router.post("/setup-payment")
async def setup_payment_method(
    request: BillingSetupRequest,
    current_user: dict = Depends(require_role("employer"))
):
    """Create/update Stripe customer and setup payment method"""
    db = await get_database()
    
    employer_id = current_user["user_id"]
    
    # Get or create billing profile
    billing_profile = await db.employer_billing.find_one(
        {"employer_id": employer_id}
    )
    
    try:
        if billing_profile and billing_profile.get("stripe_customer_id"):
            # Customer exists, create setup session
            customer_id = billing_profile["stripe_customer_id"]
        else:
            # Create new Stripe customer
            user = await db.users.find_one({"user_id": employer_id}, {"_id": 0})
            employer_profile = await db.employer_profiles.find_one(
                {"employer_id": employer_id}, {"_id": 0}
            )
            
            customer = stripe.Customer.create(
                email=user.get("email"),
                name=employer_profile.get("company_name", user.get("first_name", "")),
                metadata={
                    "employer_id": employer_id,
                    "platform": "hr_bank"
                }
            )
            customer_id = customer.id
            
            # Save billing profile
            await db.employer_billing.update_one(
                {"employer_id": employer_id},
                {"$set": {
                    "employer_id": employer_id,
                    "stripe_customer_id": customer_id,
                    "status": "pending_setup",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
        
        # Create Checkout Session for setup
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="setup",
            payment_method_types=["card"],
            success_url=request.return_url + "?setup=success",
            cancel_url=request.refresh_url + "?setup=cancelled",
            metadata={
                "employer_id": employer_id,
                "type": "payment_setup"
            }
        )
        
        return {
            "success": True,
            "data": {
                "checkout_url": session.url,
                "session_id": session.id
            },
            "message": "Redirect to Stripe to setup payment method"
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")


@router.post("/pay-route")
async def pay_for_route(
    request: Request,
    payment_data: PayRouteRequest,
    current_user: dict = Depends(require_role("employer"))
):
    """Pay for a single completed route"""
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest
    )
    
    db = await get_database()
    
    # Get the route
    route = await db.field_service_routes.find_one({
        "route_id": payment_data.route_id,
        "employer_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if route["status"] != "completed":
        raise HTTPException(status_code=400, detail="Route is not completed")
    
    if route.get("billing_status") == "paid":
        raise HTTPException(status_code=400, detail="Route already paid")
    
    # Calculate billing
    billing = await _calculate_route_bill(route, payment_data.province)
    
    # Create checkout session
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/field-service-billing"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    origin_url = payment_data.origin_url.rstrip("/")
    success_url = f"{origin_url}/employer/field-service/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/employer/field-service/billing"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(billing["total_cad"]),
        currency="cad",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "route_id": route["route_id"],
            "employer_id": current_user["user_id"],
            "route_name": route.get("route_name", ""),
            "payment_type": "field_service_route",
            "province": payment_data.province,
            "base_amount": str(billing["subtotal_cad"]),
            "tax_amount": str(billing["tax_amount_cad"]),
            "platform_fee": str(billing["platform_fee_cad"])
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create transaction record
    transaction = {
        "transaction_id": f"fs_txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "route_id": route["route_id"],
        "employer_id": current_user["user_id"],
        "route_name": route.get("route_name"),
        "route_type": route.get("route_type"),
        "num_stops": len(route.get("stops", [])),
        "subtotal_cad": billing["subtotal_cad"],
        "platform_fee_cad": billing["platform_fee_cad"],
        "tax_amount_cad": billing["tax_amount_cad"],
        "tax_rate": billing["tax_rate_percentage"],
        "tax_description": billing["tax_description"],
        "total_amount_cad": billing["total_cad"],
        "province": payment_data.province,
        "currency": "CAD",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.route_billing_transactions.insert_one(transaction)
    
    # Update route billing status
    await db.field_service_routes.update_one(
        {"route_id": route["route_id"]},
        {"$set": {
            "billing_status": "pending",
            "billing_transaction_id": transaction["transaction_id"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "data": {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "billing": billing
        }
    }


@router.post("/pay-all-outstanding")
async def pay_all_outstanding(
    request: Request,
    origin_url: str,
    province: str = "ON",
    current_user: dict = Depends(require_role("employer"))
):
    """Pay for all outstanding routes in one transaction"""
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest
    )
    
    db = await get_database()
    
    # Get all unpaid routes
    unpaid_routes = await db.field_service_routes.find({
        "employer_id": current_user["user_id"],
        "status": "completed",
        "billing_status": {"$in": [None, "pending", "unpaid"]}
    }, {"_id": 0}).to_list(100)
    
    if not unpaid_routes:
        return {
            "success": True,
            "data": {"message": "No outstanding routes to pay"},
            "total_cad": 0
        }
    
    # Calculate total billing
    total_subtotal = 0.0
    total_tax = 0.0
    total_platform_fee = 0.0
    route_ids = []
    
    for route in unpaid_routes:
        billing = await _calculate_route_bill(route, province)
        total_subtotal += billing["subtotal_cad"]
        total_tax += billing["tax_amount_cad"]
        total_platform_fee += billing["platform_fee_cad"]
        route_ids.append(route["route_id"])
    
    total_amount = round(total_subtotal + total_tax, 2)
    
    # Create checkout session
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/field-service-billing"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    origin_url = origin_url.rstrip("/")
    success_url = f"{origin_url}/employer/field-service/billing/success?session_id={{CHECKOUT_SESSION_ID}}&bulk=true"
    cancel_url = f"{origin_url}/employer/field-service/billing"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(total_amount),
        currency="cad",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "route_ids": ",".join(route_ids),
            "employer_id": current_user["user_id"],
            "payment_type": "field_service_bulk",
            "routes_count": str(len(route_ids)),
            "province": province
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create bulk transaction record
    transaction = {
        "transaction_id": f"fs_bulk_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "route_ids": route_ids,
        "employer_id": current_user["user_id"],
        "routes_count": len(route_ids),
        "subtotal_cad": round(total_subtotal, 2),
        "platform_fee_cad": round(total_platform_fee, 2),
        "tax_amount_cad": round(total_tax, 2),
        "total_amount_cad": total_amount,
        "province": province,
        "currency": "CAD",
        "status": "pending",
        "is_bulk": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.route_billing_transactions.insert_one(transaction)
    
    return {
        "success": True,
        "data": {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "routes_count": len(route_ids),
            "total_cad": total_amount
        }
    }


@router.get("/payment-status/{session_id}")
async def get_payment_status(
    request: Request,
    session_id: str,
    current_user: dict = Depends(require_role("employer"))
):
    """Check payment status and process if successful"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    db = await get_database()
    
    # Get transaction
    transaction = await db.route_billing_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.get("status") == "paid":
        return {
            "success": True,
            "data": {
                "status": "paid",
                "message": "Payment already processed"
            }
        }
    
    # Check with Stripe
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/field-service-billing"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    if checkout_status.payment_status == "paid":
        # Process the payment
        await _process_successful_payment(db, transaction)
        
        return {
            "success": True,
            "data": {
                "status": "paid",
                "message": "Payment successful! Routes have been marked as paid."
            }
        }
    
    return {
        "success": True,
        "data": {
            "status": checkout_status.payment_status,
            "stripe_status": checkout_status.status
        }
    }


# ============================================
# Billing History
# ============================================
@router.get("/history")
async def get_billing_history(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_role("employer"))
):
    """Get employer's billing history"""
    db = await get_database()
    
    transactions = await db.route_billing_transactions.find(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Calculate totals
    all_paid = await db.route_billing_transactions.find(
        {"employer_id": current_user["user_id"], "status": "paid"},
        {"_id": 0, "total_amount_cad": 1}
    ).to_list(1000)
    
    total_spent = sum(t.get("total_amount_cad", 0) for t in all_paid)
    
    return {
        "success": True,
        "data": {
            "transactions": transactions,
            "total_spent_cad": round(total_spent, 2),
            "total_transactions": len(all_paid)
        }
    }


# ============================================
# Helper Functions
# ============================================
async def _calculate_route_bill(route: dict, province: str = "ON") -> dict:
    """Calculate billing for a route"""
    from utils.canadian_taxes import calculate_tax
    
    route_type = route.get("route_type", "custom")
    num_stops = len(route.get("stops", []))
    
    pricing = FIELD_SERVICE_PRICING.get(route_type, FIELD_SERVICE_PRICING["custom"])
    
    base_price = pricing["base_price_cad"]
    per_stop = pricing["per_stop_price_cad"]
    
    subtotal = base_price + (per_stop * num_stops)
    platform_fee = round(subtotal * PLATFORM_FEE_PERCENTAGE, 2)
    
    # Calculate tax
    tax_breakdown = calculate_tax(subtotal, province)
    
    total = round(subtotal + tax_breakdown["tax_amount"], 2)
    
    return {
        "base_price_cad": base_price,
        "per_stop_price_cad": per_stop,
        "num_stops": num_stops,
        "stops_total_cad": round(per_stop * num_stops, 2),
        "subtotal_cad": round(subtotal, 2),
        "platform_fee_cad": platform_fee,
        "tax_amount_cad": tax_breakdown["tax_amount"],
        "tax_rate_percentage": tax_breakdown["tax_rate_percentage"],
        "tax_description": tax_breakdown["tax_description"],
        "total_cad": total
    }


async def _process_successful_payment(db, transaction: dict):
    """Process a successful payment"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Update transaction
    await db.route_billing_transactions.update_one(
        {"transaction_id": transaction["transaction_id"]},
        {"$set": {
            "status": "paid",
            "paid_at": now,
            "updated_at": now
        }}
    )
    
    # Update route(s) billing status
    if transaction.get("is_bulk"):
        route_ids = transaction.get("route_ids", [])
        for route_id in route_ids:
            await db.field_service_routes.update_one(
                {"route_id": route_id},
                {"$set": {
                    "billing_status": "paid",
                    "billing_paid_at": now,
                    "billing_transaction_id": transaction["transaction_id"],
                    "updated_at": now
                }}
            )
    else:
        await db.field_service_routes.update_one(
            {"route_id": transaction["route_id"]},
            {"$set": {
                "billing_status": "paid",
                "billing_paid_at": now,
                "updated_at": now
            }}
        )
    
    # Create invoice
    try:
        from routes.invoices import create_field_service_invoice
        await create_field_service_invoice(
            employer_id=transaction["employer_id"],
            transaction=transaction
        )
    except Exception as e:
        logger.error(f"Failed to create field service invoice: {e}")


# ============================================
# Webhook Handler
# ============================================
@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook for field service billing"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    db = await get_database()
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/field-service-billing"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            # Get transaction by session_id
            transaction = await db.route_billing_transactions.find_one(
                {"session_id": webhook_response.session_id},
                {"_id": 0}
            )
            
            if transaction and transaction.get("status") != "paid":
                await _process_successful_payment(db, transaction)
        
        return {"success": True, "received": True}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"success": False, "error": str(e)}
