"""
Enhanced Document Expiry Service
Multi-interval reminders via Email and SMS
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

# Reminder intervals in days
REMINDER_INTERVALS = [30, 14, 7, 3, 1, 0]  # 0 = expiry day

# Document types that REQUIRE expiry dates
DOCUMENTS_REQUIRING_EXPIRY = {
    # Government IDs
    "drivers_license": {"name": "Driver's License", "typical_validity_years": 5},
    "passport": {"name": "Passport", "typical_validity_years": 10},
    "provincial_id": {"name": "Provincial ID Card", "typical_validity_years": 5},
    "work_permit": {"name": "Work Permit", "typical_validity_years": 2},
    "study_permit": {"name": "Study Permit", "typical_validity_years": 1},
    "pr_card": {"name": "Permanent Resident Card", "typical_validity_years": 5},
    
    # Professional Certifications
    "food_handler": {"name": "Food Handler Certificate", "typical_validity_years": 5},
    "first_aid_cpr": {"name": "First Aid/CPR Certificate", "typical_validity_years": 3},
    "whmis": {"name": "WHMIS Certificate", "typical_validity_years": 3},
    "smart_serve": {"name": "Smart Serve Certificate", "typical_validity_years": 5},
    "forklift_license": {"name": "Forklift Operator License", "typical_validity_years": 3},
    "working_at_heights": {"name": "Working at Heights Certificate", "typical_validity_years": 3},
    "security_license": {"name": "Security Guard License", "typical_validity_years": 2},
    
    # Health & Safety
    "health_card": {"name": "Health Card", "typical_validity_years": 5},
    "immunization_record": {"name": "Immunization Record", "typical_validity_years": 1},
    "tb_test": {"name": "TB Test Results", "typical_validity_years": 1},
    "medical_clearance": {"name": "Medical Clearance", "typical_validity_years": 1},
    
    # Background Checks
    "police_check": {"name": "Police Background Check", "typical_validity_years": 1},
    "vulnerable_sector_check": {"name": "Vulnerable Sector Check", "typical_validity_years": 1},
    
    # Professional Licenses
    "nursing_license": {"name": "Nursing License", "typical_validity_years": 1},
    "trades_certificate": {"name": "Trades Certificate", "typical_validity_years": 3},
    "professional_license": {"name": "Professional License", "typical_validity_years": 1},
}

# Documents that DO NOT expire
DOCUMENTS_NO_EXPIRY = [
    "sin_card",  # SIN cards don't expire
    "birth_certificate",
    "citizenship_certificate",
    "degree_diploma",
    "transcript",
    "reference_letter",
    "resume",
    "void_cheque",  # For direct deposit setup
]


class DocumentExpiryService:
    """
    Enhanced document expiry tracking and notification service.
    Supports multiple reminder intervals and both email/SMS notifications.
    """
    
    def __init__(self):
        self._db = None
    
    @property
    def db(self):
        if self._db is None:
            from server import db
            self._db = db
        return self._db
    
    def requires_expiry_date(self, document_type: str) -> bool:
        """Check if a document type requires an expiry date"""
        return document_type.lower() in DOCUMENTS_REQUIRING_EXPIRY
    
    def get_typical_validity(self, document_type: str) -> Optional[int]:
        """Get typical validity period in years for a document type"""
        doc_info = DOCUMENTS_REQUIRING_EXPIRY.get(document_type.lower())
        return doc_info.get("typical_validity_years") if doc_info else None
    
    def calculate_suggested_expiry(self, document_type: str, issue_date: str) -> Optional[str]:
        """Calculate suggested expiry date based on document type and issue date"""
        validity_years = self.get_typical_validity(document_type)
        if not validity_years or not issue_date:
            return None
        
        try:
            issue = datetime.fromisoformat(issue_date.replace('Z', '+00:00'))
            expiry = issue + timedelta(days=validity_years * 365)
            return expiry.isoformat()
        except:
            return None
    
    async def get_expiring_documents(
        self,
        days_ahead: int = 30,
        user_type: str = None,
        document_type: str = None
    ) -> List[Dict]:
        """
        Get all documents expiring within specified days.
        
        Args:
            days_ahead: Number of days to look ahead
            user_type: Filter by user type (workforce, employer, institution)
            document_type: Filter by specific document type
            
        Returns:
            List of expiring documents with user info
        """
        now = datetime.now(timezone.utc)
        cutoff_date = now + timedelta(days=days_ahead)
        
        # Build query
        query = {
            "expiry_date": {
                "$ne": None,
                "$lte": cutoff_date.isoformat(),
                "$gte": now.isoformat()
            },
            "verification_status": {"$in": ["verified", "pending"]}
        }
        
        if document_type:
            query["document_type"] = document_type
        
        documents = await self.db.documents.find(query).to_list(10000)
        
        # Enrich with user info
        enriched_docs = []
        for doc in documents:
            user = await self.db.users.find_one({"user_id": doc["user_id"]})
            if not user:
                continue
            
            if user_type and user.get("user_type") != user_type:
                continue
            
            # Calculate days until expiry
            expiry_date = datetime.fromisoformat(doc["expiry_date"].replace('Z', '+00:00'))
            days_until = (expiry_date - now).days
            
            # Get user profile
            profile = await self._get_user_profile(doc["user_id"], user.get("user_type"))
            full_name = profile.get("full_name") or profile.get("contact_name") or user.get("email", "Unknown")
            phone = profile.get("phone") or user.get("phone")
            
            enriched_docs.append({
                "document_id": doc.get("document_id"),
                "document_type": doc.get("document_type"),
                "document_name": doc.get("document_name") or DOCUMENTS_REQUIRING_EXPIRY.get(doc.get("document_type"), {}).get("name", doc.get("document_type")),
                "expiry_date": doc.get("expiry_date"),
                "days_until_expiry": days_until,
                "user_id": doc.get("user_id"),
                "user_email": user.get("email"),
                "user_phone": phone,
                "user_name": full_name,
                "user_type": user.get("user_type"),
                "verification_status": doc.get("verification_status"),
                "last_reminder_sent": doc.get("last_reminder_sent"),
                "reminders_sent": doc.get("reminders_sent", [])
            })
        
        # Sort by days until expiry
        enriched_docs.sort(key=lambda x: x["days_until_expiry"])
        
        return enriched_docs
    
    async def get_expired_documents(self, user_type: str = None) -> List[Dict]:
        """Get all currently expired documents"""
        now = datetime.now(timezone.utc)
        
        query = {
            "expiry_date": {"$lt": now.isoformat()},
            "verification_status": {"$ne": "expired"}
        }
        
        documents = await self.db.documents.find(query).to_list(10000)
        
        enriched_docs = []
        for doc in documents:
            user = await self.db.users.find_one({"user_id": doc["user_id"]})
            if not user:
                continue
            
            if user_type and user.get("user_type") != user_type:
                continue
            
            expiry_date = datetime.fromisoformat(doc["expiry_date"].replace('Z', '+00:00'))
            days_expired = (now - expiry_date).days
            
            profile = await self._get_user_profile(doc["user_id"], user.get("user_type"))
            full_name = profile.get("full_name") or profile.get("contact_name") or user.get("email", "Unknown")
            
            enriched_docs.append({
                "document_id": doc.get("document_id"),
                "document_type": doc.get("document_type"),
                "document_name": doc.get("document_name"),
                "expiry_date": doc.get("expiry_date"),
                "days_expired": days_expired,
                "user_id": doc.get("user_id"),
                "user_email": user.get("email"),
                "user_name": full_name,
                "user_type": user.get("user_type")
            })
        
        return enriched_docs
    
    async def _get_user_profile(self, user_id: str, user_type: str) -> Dict:
        """Get user profile based on user type"""
        if user_type == "workforce":
            profile = await self.db.workforce_profiles.find_one({"workforce_id": user_id})
        elif user_type == "employer":
            profile = await self.db.employer_profiles.find_one({"employer_id": user_id})
        elif user_type == "institution":
            profile = await self.db.institution_profiles.find_one({"institution_id": user_id})
        else:
            profile = None
        
        return profile or {}
    
    async def send_expiry_reminder(
        self,
        document: Dict,
        user: Dict,
        profile: Dict,
        days_until: int,
        send_sms: bool = True
    ) -> Dict:
        """
        Send expiry reminder via email and optionally SMS.
        
        Returns:
            Dict with email_sent and sms_sent status
        """
        from services.email_service import send_document_expiry_reminder
        from services.sms_service import send_sms as send_sms_message
        
        result = {"email_sent": False, "sms_sent": False}
        
        full_name = profile.get("full_name") or profile.get("contact_name") or "Valued User"
        email = user.get("email")
        phone = profile.get("phone") or user.get("phone")
        
        document_name = document.get("document_name") or DOCUMENTS_REQUIRING_EXPIRY.get(
            document.get("document_type"), {}
        ).get("name", document.get("document_type"))
        
        # Send email reminder
        try:
            email_success = send_document_expiry_reminder(
                recipient_email=email,
                recipient_name=full_name,
                document_name=document_name,
                document_type=document.get("document_type", ""),
                expiry_date=document.get("expiry_date"),
                days_until_expiry=days_until
            )
            result["email_sent"] = email_success
        except Exception as e:
            logger.error(f"Failed to send email reminder: {str(e)}")
        
        # Send SMS reminder if phone available and enabled
        if send_sms and phone:
            try:
                if days_until == 0:
                    sms_message = f"HR Bank Alert: Your {document_name} expires TODAY. Please upload a renewed document to avoid account restrictions."
                elif days_until == 1:
                    sms_message = f"HR Bank Alert: Your {document_name} expires TOMORROW. Please renew it soon."
                elif days_until <= 7:
                    sms_message = f"HR Bank Reminder: Your {document_name} expires in {days_until} days. Please renew it to maintain your account status."
                else:
                    sms_message = f"HR Bank Notice: Your {document_name} will expire in {days_until} days ({document.get('expiry_date', '')[:10]}). Plan to renew it soon."
                
                sms_result = await send_sms_message(phone, sms_message)
                result["sms_sent"] = sms_result.get("success", False)
            except Exception as e:
                logger.error(f"Failed to send SMS reminder: {str(e)}")
        
        # Record reminder sent
        if result["email_sent"] or result["sms_sent"]:
            reminder_record = {
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "days_until_expiry": days_until,
                "email_sent": result["email_sent"],
                "sms_sent": result["sms_sent"]
            }
            
            await self.db.documents.update_one(
                {"document_id": document["document_id"]},
                {
                    "$set": {"last_reminder_sent": datetime.now(timezone.utc).isoformat()},
                    "$push": {"reminders_sent": reminder_record}
                }
            )
            
            # Log to audit
            from services.audit_logger import audit_logger, AuditEventType
            await audit_logger.log(
                event_type=AuditEventType.SYSTEM_ERROR,  # Using as system notification
                action="expiry_reminder_sent",
                description=f"Document expiry reminder sent for {document_name}",
                actor_type="system",
                target_type="document",
                target_id=document["document_id"],
                metadata={
                    "user_id": document["user_id"],
                    "days_until_expiry": days_until,
                    "email_sent": result["email_sent"],
                    "sms_sent": result["sms_sent"]
                }
            )
        
        return result
    
    async def process_all_reminders(self, send_sms: bool = True) -> Dict:
        """
        Process all documents and send reminders at appropriate intervals.
        Should be called daily.
        
        Returns:
            Summary of reminders sent
        """
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        results = {
            "total_processed": 0,
            "reminders_sent": 0,
            "emails_sent": 0,
            "sms_sent": 0,
            "by_interval": {},
            "errors": []
        }
        
        # Get all documents with expiry dates
        documents = await self.db.documents.find({
            "expiry_date": {"$ne": None},
            "verification_status": {"$in": ["verified", "pending"]}
        }).to_list(10000)
        
        for doc in documents:
            results["total_processed"] += 1
            
            try:
                expiry_date = datetime.fromisoformat(doc["expiry_date"].replace('Z', '+00:00'))
                days_until = (expiry_date - now).days
                
                # Check if this interval should trigger a reminder
                should_send = False
                for interval in REMINDER_INTERVALS:
                    if days_until == interval:
                        # Check if reminder already sent for this interval today
                        reminders_sent = doc.get("reminders_sent", [])
                        already_sent = any(
                            r.get("days_until_expiry") == interval and
                            r.get("sent_at", "")[:10] == today_start.isoformat()[:10]
                            for r in reminders_sent
                        )
                        
                        if not already_sent:
                            should_send = True
                            break
                
                if should_send:
                    # Get user and profile
                    user = await self.db.users.find_one({"user_id": doc["user_id"]})
                    if not user:
                        continue
                    
                    profile = await self._get_user_profile(doc["user_id"], user.get("user_type"))
                    
                    # Send reminder
                    send_result = await self.send_expiry_reminder(
                        document=doc,
                        user=user,
                        profile=profile,
                        days_until=days_until,
                        send_sms=send_sms
                    )
                    
                    if send_result["email_sent"] or send_result["sms_sent"]:
                        results["reminders_sent"] += 1
                        results["emails_sent"] += 1 if send_result["email_sent"] else 0
                        results["sms_sent"] += 1 if send_result["sms_sent"] else 0
                        
                        interval_key = f"{days_until}_days"
                        results["by_interval"][interval_key] = results["by_interval"].get(interval_key, 0) + 1
                        
                        logger.info(f"Sent reminder for document {doc['document_id']} ({days_until} days)")
                
            except Exception as e:
                results["errors"].append({
                    "document_id": doc.get("document_id"),
                    "error": str(e)
                })
                logger.error(f"Error processing document {doc.get('document_id')}: {str(e)}")
        
        logger.info(f"Expiry reminder processing complete: {results['reminders_sent']} reminders sent")
        return results
    
    async def get_expiry_summary(self) -> Dict:
        """Get summary of document expiry status across the platform"""
        now = datetime.now(timezone.utc)
        
        summary = {
            "expired": 0,
            "expiring_today": 0,
            "expiring_7_days": 0,
            "expiring_14_days": 0,
            "expiring_30_days": 0,
            "by_document_type": {},
            "by_user_type": {"workforce": 0, "employer": 0, "institution": 0}
        }
        
        # Get all documents with expiry dates
        documents = await self.db.documents.find({
            "expiry_date": {"$ne": None}
        }).to_list(50000)
        
        for doc in documents:
            try:
                expiry_date = datetime.fromisoformat(doc["expiry_date"].replace('Z', '+00:00'))
                days_until = (expiry_date - now).days
                
                doc_type = doc.get("document_type", "unknown")
                
                if days_until < 0:
                    summary["expired"] += 1
                elif days_until == 0:
                    summary["expiring_today"] += 1
                elif days_until <= 7:
                    summary["expiring_7_days"] += 1
                elif days_until <= 14:
                    summary["expiring_14_days"] += 1
                elif days_until <= 30:
                    summary["expiring_30_days"] += 1
                
                # Only count expiring/expired in type breakdown
                if days_until <= 30:
                    summary["by_document_type"][doc_type] = summary["by_document_type"].get(doc_type, 0) + 1
                    
                    # Get user type
                    user = await self.db.users.find_one({"user_id": doc["user_id"]})
                    if user:
                        user_type = user.get("user_type", "unknown")
                        if user_type in summary["by_user_type"]:
                            summary["by_user_type"][user_type] += 1
                            
            except Exception as e:
                logger.error(f"Error processing document for summary: {str(e)}")
        
        return summary


# Singleton instance
document_expiry_service = DocumentExpiryService()
