"""
Push Notification Service for HR Bank

Sends push notifications to users via Web Push API.
Integrates with the service worker on the frontend.
"""

import os
import json
import asyncio
from typing import Optional, Dict, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

# Web Push library
try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    print("WARNING: pywebpush not installed. Push notifications disabled.")

# VAPID configuration
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_CLAIMS_EMAIL = os.environ.get('VAPID_CLAIMS_EMAIL', 'notifications@hrbank.ca')

class PushNotificationService:
    """Service for sending push notifications to users."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.enabled = WEBPUSH_AVAILABLE and VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY
        
        if not self.enabled:
            print("Push notifications disabled - missing VAPID keys or pywebpush")
    
    async def send_to_user(
        self,
        user_id: str,
        title: str,
        body: str,
        url: Optional[str] = None,
        tag: Optional[str] = None,
        icon: Optional[str] = None,
        data: Optional[Dict] = None
    ) -> Dict:
        """
        Send a push notification to a specific user.
        
        Args:
            user_id: The user to notify
            title: Notification title
            body: Notification body text
            url: URL to open when notification is clicked
            tag: Notification tag (for grouping/replacing)
            icon: Icon URL
            data: Additional data to send
        """
        if not self.enabled:
            return {"success": False, "error": "Push notifications not configured"}
        
        # Get user's push subscription
        subscription = await self.db.push_subscriptions.find_one({"user_id": user_id})
        
        if not subscription or not subscription.get("subscription"):
            return {"success": False, "error": "User has no push subscription"}
        
        # Build notification payload
        payload = {
            "title": title,
            "body": body,
            "icon": icon or "/icons/icon-workforce-192x192.png",
            "badge": "/icons/icon-workforce-192x192.png",
            "tag": tag or f"hrbank-{datetime.now(timezone.utc).timestamp()}",
            "data": {
                "url": url or "/",
                **(data or {})
            }
        }
        
        try:
            webpush(
                subscription_info=subscription["subscription"],
                data=json.dumps(payload),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"}
            )
            
            # Log successful send
            await self.db.push_notification_logs.insert_one({
                "user_id": user_id,
                "title": title,
                "body": body,
                "status": "sent",
                "sent_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {"success": True}
            
        except WebPushException as e:
            error_msg = str(e)
            
            # If subscription is invalid, remove it
            if e.response and e.response.status_code in [404, 410]:
                await self.db.push_subscriptions.delete_one({"user_id": user_id})
                error_msg = "Subscription expired and was removed"
            
            # Log failed send
            await self.db.push_notification_logs.insert_one({
                "user_id": user_id,
                "title": title,
                "body": body,
                "status": "failed",
                "error": error_msg,
                "sent_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {"success": False, "error": error_msg}
        
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def send_to_users(
        self,
        user_ids: List[str],
        title: str,
        body: str,
        **kwargs
    ) -> Dict:
        """Send notification to multiple users."""
        results = {"sent": 0, "failed": 0, "errors": []}
        
        for user_id in user_ids:
            result = await self.send_to_user(user_id, title, body, **kwargs)
            if result.get("success"):
                results["sent"] += 1
            else:
                results["failed"] += 1
                results["errors"].append({"user_id": user_id, "error": result.get("error")})
        
        return results
    
    # ========================================
    # Pre-built notification templates
    # ========================================
    
    async def notify_credential_issued(
        self,
        user_id: str,
        credential_type: str,
        institution_name: str,
        credential_id: str
    ):
        """Notify worker when a credential is issued to them."""
        return await self.send_to_user(
            user_id=user_id,
            title="🎓 New Credential Issued!",
            body=f"Your {credential_type} from {institution_name} has been verified and added to your Work Passport™.",
            url=f"/workforce/credentials/{credential_id}",
            tag=f"credential-{credential_id}",
            data={"type": "credential_issued", "credential_id": credential_id}
        )
    
    async def notify_credential_verified(
        self,
        user_id: str,
        credential_type: str,
        verifier_name: str
    ):
        """Notify worker when an employer verifies their credential."""
        return await self.send_to_user(
            user_id=user_id,
            title="✅ Credential Verified",
            body=f"{verifier_name} has verified your {credential_type}.",
            url="/workforce/credentials",
            tag="credential-verified",
            data={"type": "credential_verified"}
        )
    
    async def notify_shift_assigned(
        self,
        user_id: str,
        shift_date: str,
        location_name: str,
        shift_id: str
    ):
        """Notify worker when they are assigned to a shift."""
        return await self.send_to_user(
            user_id=user_id,
            title="📅 New Shift Assigned",
            body=f"You've been assigned to work at {location_name} on {shift_date}.",
            url=f"/workforce/shifts/{shift_id}",
            tag=f"shift-{shift_id}",
            data={"type": "shift_assigned", "shift_id": shift_id}
        )
    
    async def notify_shift_reminder(
        self,
        user_id: str,
        shift_time: str,
        location_name: str,
        shift_id: str
    ):
        """Remind worker about upcoming shift."""
        return await self.send_to_user(
            user_id=user_id,
            title="⏰ Shift Reminder",
            body=f"Your shift at {location_name} starts at {shift_time}.",
            url=f"/workforce/shifts/{shift_id}",
            tag=f"shift-reminder-{shift_id}",
            data={"type": "shift_reminder", "shift_id": shift_id}
        )
    
    async def notify_shift_cancelled(
        self,
        user_id: str,
        shift_date: str,
        location_name: str,
        reason: Optional[str] = None
    ):
        """Notify worker when their shift is cancelled."""
        body = f"Your shift at {location_name} on {shift_date} has been cancelled."
        if reason:
            body += f" Reason: {reason}"
        
        return await self.send_to_user(
            user_id=user_id,
            title="❌ Shift Cancelled",
            body=body,
            url="/workforce/shifts",
            tag="shift-cancelled",
            data={"type": "shift_cancelled"}
        )
    
    async def notify_payment_received(
        self,
        user_id: str,
        amount: float,
        currency: str = "CAD"
    ):
        """Notify worker when payment is processed."""
        return await self.send_to_user(
            user_id=user_id,
            title="💰 Payment Received",
            body=f"${amount:.2f} {currency} has been deposited to your account.",
            url="/workforce/payments",
            tag="payment-received",
            data={"type": "payment_received", "amount": amount}
        )
    
    async def notify_new_message(
        self,
        user_id: str,
        sender_name: str,
        message_preview: str,
        conversation_id: str
    ):
        """Notify user of new message."""
        return await self.send_to_user(
            user_id=user_id,
            title=f"💬 Message from {sender_name}",
            body=message_preview[:100] + ("..." if len(message_preview) > 100 else ""),
            url=f"/messages/{conversation_id}",
            tag=f"message-{conversation_id}",
            data={"type": "new_message", "conversation_id": conversation_id}
        )
    
    async def notify_shift_available(
        self,
        user_id: str,
        location_name: str,
        shift_date: str,
        hourly_rate: float
    ):
        """Notify worker of available shift matching their profile."""
        return await self.send_to_user(
            user_id=user_id,
            title="🆕 New Shift Available",
            body=f"{location_name} has a shift on {shift_date} (${hourly_rate}/hr). Tap to apply!",
            url="/workforce/available-shifts",
            tag="shift-available",
            data={"type": "shift_available"}
        )
    
    async def notify_credential_expiring(
        self,
        user_id: str,
        credential_type: str,
        expiry_date: str,
        days_until_expiry: int
    ):
        """Notify worker when credential is about to expire."""
        return await self.send_to_user(
            user_id=user_id,
            title="⚠️ Credential Expiring Soon",
            body=f"Your {credential_type} expires on {expiry_date} ({days_until_expiry} days). Renew now to avoid disruption.",
            url="/workforce/credentials",
            tag=f"credential-expiring-{credential_type}",
            data={"type": "credential_expiring", "days_until_expiry": days_until_expiry}
        )
    
    # ========================================
    # Employer notifications
    # ========================================
    
    async def notify_worker_applied(
        self,
        employer_user_id: str,
        worker_name: str,
        shift_date: str,
        shift_id: str
    ):
        """Notify employer when worker applies for shift."""
        return await self.send_to_user(
            user_id=employer_user_id,
            title="👤 New Shift Application",
            body=f"{worker_name} has applied for your shift on {shift_date}.",
            url=f"/employer/shifts/{shift_id}/applications",
            tag=f"application-{shift_id}",
            data={"type": "worker_applied", "shift_id": shift_id}
        )
    
    async def notify_worker_checked_in(
        self,
        employer_user_id: str,
        worker_name: str,
        location_name: str
    ):
        """Notify employer when worker checks in."""
        return await self.send_to_user(
            user_id=employer_user_id,
            title="✅ Worker Checked In",
            body=f"{worker_name} has checked in at {location_name}.",
            url="/employer/dashboard",
            tag="worker-checkin",
            data={"type": "worker_checked_in"}
        )
    
    # ========================================
    # Institution notifications
    # ========================================
    
    async def notify_verification_request(
        self,
        institution_user_id: str,
        requester_name: str,
        credential_type: str,
        request_id: str
    ):
        """Notify institution of verification request."""
        return await self.send_to_user(
            user_id=institution_user_id,
            title="🔍 Verification Request",
            body=f"{requester_name} has requested verification of a {credential_type}.",
            url=f"/institution/verifications/{request_id}",
            tag=f"verification-{request_id}",
            data={"type": "verification_request", "request_id": request_id}
        )


# Singleton instance getter
_push_service_instance = None

def get_push_service(db: AsyncIOMotorDatabase) -> PushNotificationService:
    """Get or create the push notification service instance."""
    global _push_service_instance
    if _push_service_instance is None:
        _push_service_instance = PushNotificationService(db)
    return _push_service_instance
