"""
Stripe Connect Service for Institution Payouts
Handles connected account creation, onboarding, and automatic payouts
"""
import os
import stripe
from typing import Optional, Dict
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# Initialize Stripe
stripe.api_key = os.environ.get("STRIPE_API_KEY")

class StripeConnectService:
    """Service for managing Stripe Connect accounts for institutions"""
    
    def __init__(self):
        self.api_key = os.environ.get("STRIPE_API_KEY")
        stripe.api_key = self.api_key
    
    async def create_connected_account(
        self,
        institution_id: str,
        institution_name: str,
        email: str,
        country: str = "CA"
    ) -> Dict:
        """
        Create a Stripe Connect Express account for an institution
        """
        try:
            account = stripe.Account.create(
                type="express",
                country=country,
                email=email,
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
                business_type="company",
                company={
                    "name": institution_name,
                },
                metadata={
                    "institution_id": institution_id,
                    "platform": "hrbank"
                }
            )
            
            return {
                "success": True,
                "stripe_account_id": account.id,
                "account_status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def create_onboarding_link(
        self,
        stripe_account_id: str,
        return_url: str,
        refresh_url: str
    ) -> Dict:
        """
        Create an account link for institution to complete Stripe onboarding
        """
        try:
            account_link = stripe.AccountLink.create(
                account=stripe_account_id,
                refresh_url=refresh_url,
                return_url=return_url,
                type="account_onboarding",
            )
            
            return {
                "success": True,
                "onboarding_url": account_link.url,
                "expires_at": account_link.expires_at
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_account_status(self, stripe_account_id: str) -> Dict:
        """
        Check the status of a connected account
        """
        try:
            account = stripe.Account.retrieve(stripe_account_id)
            
            # Check if account is fully set up
            charges_enabled = account.charges_enabled
            payouts_enabled = account.payouts_enabled
            details_submitted = account.details_submitted
            
            if charges_enabled and payouts_enabled and details_submitted:
                status = "active"
            elif details_submitted:
                status = "pending_verification"
            else:
                status = "incomplete"
            
            return {
                "success": True,
                "stripe_account_id": stripe_account_id,
                "status": status,
                "charges_enabled": charges_enabled,
                "payouts_enabled": payouts_enabled,
                "details_submitted": details_submitted,
                "country": account.country,
                "default_currency": account.default_currency
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_payment_with_split(
        self,
        amount_cad: float,
        tax_amount_cad: float,
        platform_fee_cad: float,
        institution_payout_cad: float,
        stripe_account_id: str,
        metadata: Dict,
        success_url: str,
        cancel_url: str
    ) -> Dict:
        """
        Create a Checkout Session with automatic split to connected account
        
        The flow:
        1. Customer pays total (base + tax)
        2. Tax is held by platform (to remit to government)
        3. Remaining is split 50/50 between platform and institution
        """
        try:
            # Total amount customer pays (in cents)
            total_amount_cents = int((amount_cad + tax_amount_cad) * 100)
            
            # Amount to transfer to institution (in cents)
            institution_amount_cents = int(institution_payout_cad * 100)
            
            # Create checkout session with transfer
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "cad",
                        "unit_amount": total_amount_cents,
                        "product_data": {
                            "name": metadata.get("credential_name", "Credential"),
                            "description": f"Blockchain-verified credential from {metadata.get('institution_name', 'Institution')}",
                        },
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=success_url,
                cancel_url=cancel_url,
                payment_intent_data={
                    "transfer_data": {
                        "destination": stripe_account_id,
                        "amount": institution_amount_cents,  # Amount going to institution
                    },
                    "metadata": metadata
                },
                metadata=metadata
            )
            
            return {
                "success": True,
                "checkout_url": session.url,
                "session_id": session.id,
                "total_amount_cad": amount_cad + tax_amount_cad,
                "institution_payout_cad": institution_payout_cad,
                "platform_revenue_cad": platform_fee_cad,
                "tax_amount_cad": tax_amount_cad
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_login_link(self, stripe_account_id: str) -> Dict:
        """
        Create a login link for institution to access their Stripe Express dashboard
        """
        try:
            login_link = stripe.Account.create_login_link(stripe_account_id)
            
            return {
                "success": True,
                "login_url": login_link.url
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_balance(self, stripe_account_id: str) -> Dict:
        """
        Get the balance for a connected account
        """
        try:
            balance = stripe.Balance.retrieve(
                stripe_account=stripe_account_id
            )
            
            available = sum(b.amount for b in balance.available) / 100
            pending = sum(b.amount for b in balance.pending) / 100
            
            return {
                "success": True,
                "available_cad": available,
                "pending_cad": pending,
                "currency": "CAD"
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_payouts(self, stripe_account_id: str, limit: int = 10) -> Dict:
        """
        Get recent payouts for a connected account
        """
        try:
            payouts = stripe.Payout.list(
                stripe_account=stripe_account_id,
                limit=limit
            )
            
            payout_list = []
            for payout in payouts.data:
                payout_list.append({
                    "payout_id": payout.id,
                    "amount_cad": payout.amount / 100,
                    "status": payout.status,
                    "arrival_date": datetime.fromtimestamp(payout.arrival_date).isoformat() if payout.arrival_date else None,
                    "created": datetime.fromtimestamp(payout.created).isoformat()
                })
            
            return {
                "success": True,
                "payouts": payout_list
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
stripe_connect_service = StripeConnectService()
