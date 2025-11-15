import stripe
from config.settings import settings
import os

# Initialize Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

class StripeService:
    def __init__(self):
        self.api_key = stripe.api_key
    
    async def create_payment_intent(self, amount: float, currency: str = 'cad', metadata: dict = None):
        """
        Create payment intent for employer payment
        Amount in dollars (will convert to cents)
        """
        try:
            payment_intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to cents
                currency=currency,
                metadata=metadata or {},
                automatic_payment_methods={'enabled': True}
            )
            
            return {
                'client_secret': payment_intent.client_secret,
                'payment_intent_id': payment_intent.id,
                'amount': amount
            }
        except Exception as e:
            raise Exception(f"Stripe payment intent failed: {str(e)}")
    
    async def create_payout(self, worker_id: str, amount: float, description: str):
        """
        Create payout to worker
        In production, would use Stripe Connect
        """
        try:
            # For MVP, we'll just mark as paid
            # In production: Use Stripe Connect to transfer to worker's account
            
            return {
                'payout_id': f"payout_{worker_id}_{int(amount * 100)}",
                'amount': amount,
                'status': 'pending',
                'description': description
            }
        except Exception as e:
            raise Exception(f"Payout creation failed: {str(e)}")
    
    async def retrieve_payment_intent(self, payment_intent_id: str):
        """
        Get payment intent status
        """
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            return {
                'id': payment_intent.id,
                'status': payment_intent.status,
                'amount': payment_intent.amount / 100,  # Convert back to dollars
                'currency': payment_intent.currency
            }
        except Exception as e:
            raise Exception(f"Failed to retrieve payment: {str(e)}")

# Singleton instance
stripe_service = StripeService()
