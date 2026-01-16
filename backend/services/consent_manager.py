"""
Consent Management Service for PIPEDA Compliance
Tracks user consent for data processing activities.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from enum import Enum

logger = logging.getLogger(__name__)


class ConsentType(str, Enum):
    """Types of consent that can be tracked"""
    TERMS_OF_SERVICE = "terms_of_service"
    PRIVACY_POLICY = "privacy_policy"
    DATA_PROCESSING = "data_processing"
    MARKETING_EMAIL = "marketing_email"
    MARKETING_SMS = "marketing_sms"
    THIRD_PARTY_SHARING = "third_party_sharing"
    ANALYTICS = "analytics"
    CREDENTIAL_VERIFICATION = "credential_verification"
    BACKGROUND_CHECK = "background_check"
    LOCATION_TRACKING = "location_tracking"


class ConsentManager:
    """
    Manages user consent records for PIPEDA compliance.
    Tracks when consent was given, modified, or withdrawn.
    """
    
    # Required consents by user type
    REQUIRED_CONSENTS = {
        "workforce": [
            ConsentType.TERMS_OF_SERVICE,
            ConsentType.PRIVACY_POLICY,
            ConsentType.DATA_PROCESSING,
        ],
        "employer": [
            ConsentType.TERMS_OF_SERVICE,
            ConsentType.PRIVACY_POLICY,
            ConsentType.DATA_PROCESSING,
        ],
        "institution": [
            ConsentType.TERMS_OF_SERVICE,
            ConsentType.PRIVACY_POLICY,
            ConsentType.DATA_PROCESSING,
        ],
    }
    
    # Optional consents
    OPTIONAL_CONSENTS = [
        ConsentType.MARKETING_EMAIL,
        ConsentType.MARKETING_SMS,
        ConsentType.THIRD_PARTY_SHARING,
        ConsentType.ANALYTICS,
    ]
    
    def __init__(self):
        self._db = None
    
    @property
    def db(self):
        if self._db is None:
            from server import db
            self._db = db
        return self._db
    
    async def record_consent(
        self,
        user_id: str,
        user_email: str,
        consent_type: ConsentType,
        granted: bool,
        ip_address: str = None,
        user_agent: str = None,
        version: str = "1.0",
        metadata: dict = None
    ) -> dict:
        """
        Record a consent decision.
        
        Args:
            user_id: User giving/withdrawing consent
            user_email: User's email
            consent_type: Type of consent
            granted: True if consent given, False if withdrawn
            ip_address: IP address of the request
            user_agent: Browser/device info
            version: Version of the consent document
            metadata: Additional context
            
        Returns:
            Consent record
        """
        now = datetime.now(timezone.utc)
        
        consent_record = {
            "user_id": user_id,
            "user_email": user_email,
            "consent_type": consent_type.value if isinstance(consent_type, ConsentType) else consent_type,
            "granted": granted,
            "version": version,
            "recorded_at": now.isoformat(),
            "ip_address": ip_address,
            "user_agent": user_agent,
            "metadata": metadata or {}
        }
        
        # Store in consent_records collection
        await self.db.consent_records.insert_one(consent_record)
        
        # Update current consent status
        await self.db.user_consents.update_one(
            {"user_id": user_id, "consent_type": consent_record["consent_type"]},
            {
                "$set": {
                    "user_id": user_id,
                    "consent_type": consent_record["consent_type"],
                    "granted": granted,
                    "version": version,
                    "last_updated": now.isoformat()
                }
            },
            upsert=True
        )
        
        # Log to audit
        from services.audit_logger import audit_logger
        await audit_logger.log_consent(
            user_id=user_id,
            user_email=user_email,
            consent_type=consent_record["consent_type"],
            given=granted,
            ip_address=ip_address,
            metadata={"version": version}
        )
        
        return consent_record
    
    async def get_user_consents(self, user_id: str) -> Dict[str, dict]:
        """
        Get all current consent statuses for a user.
        
        Returns:
            Dict of consent_type -> consent details
        """
        consents = await self.db.user_consents.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(length=100)
        
        return {c["consent_type"]: c for c in consents}
    
    async def has_required_consents(self, user_id: str, user_type: str) -> tuple:
        """
        Check if user has all required consents.
        
        Returns:
            Tuple of (has_all_required, missing_consents)
        """
        required = self.REQUIRED_CONSENTS.get(user_type, [])
        current_consents = await self.get_user_consents(user_id)
        
        missing = []
        for consent_type in required:
            consent_key = consent_type.value if isinstance(consent_type, ConsentType) else consent_type
            consent = current_consents.get(consent_key)
            
            if not consent or not consent.get("granted"):
                missing.append(consent_key)
        
        return len(missing) == 0, missing
    
    async def get_consent_history(
        self,
        user_id: str,
        consent_type: ConsentType = None
    ) -> List[dict]:
        """
        Get consent history for a user.
        
        Args:
            user_id: User ID
            consent_type: Optional filter by consent type
            
        Returns:
            List of consent records
        """
        query = {"user_id": user_id}
        if consent_type:
            query["consent_type"] = consent_type.value if isinstance(consent_type, ConsentType) else consent_type
        
        records = await self.db.consent_records.find(
            query,
            {"_id": 0}
        ).sort("recorded_at", -1).to_list(length=1000)
        
        return records
    
    async def bulk_record_consents(
        self,
        user_id: str,
        user_email: str,
        consents: Dict[str, bool],
        ip_address: str = None,
        user_agent: str = None,
        version: str = "1.0"
    ) -> List[dict]:
        """
        Record multiple consent decisions at once.
        
        Args:
            user_id: User ID
            user_email: User email
            consents: Dict of consent_type -> granted (True/False)
            ip_address: IP address
            user_agent: Browser info
            version: Consent document version
            
        Returns:
            List of recorded consents
        """
        records = []
        
        for consent_type, granted in consents.items():
            record = await self.record_consent(
                user_id=user_id,
                user_email=user_email,
                consent_type=consent_type,
                granted=granted,
                ip_address=ip_address,
                user_agent=user_agent,
                version=version
            )
            records.append(record)
        
        return records
    
    async def withdraw_all_optional_consents(
        self,
        user_id: str,
        user_email: str,
        ip_address: str = None
    ) -> int:
        """
        Withdraw all optional consents for a user.
        
        Returns:
            Number of consents withdrawn
        """
        count = 0
        
        for consent_type in self.OPTIONAL_CONSENTS:
            current = await self.db.user_consents.find_one({
                "user_id": user_id,
                "consent_type": consent_type.value
            })
            
            if current and current.get("granted"):
                await self.record_consent(
                    user_id=user_id,
                    user_email=user_email,
                    consent_type=consent_type,
                    granted=False,
                    ip_address=ip_address,
                    metadata={"reason": "bulk_withdrawal"}
                )
                count += 1
        
        return count
    
    async def get_users_with_consent(
        self,
        consent_type: ConsentType,
        granted: bool = True
    ) -> List[str]:
        """
        Get list of user IDs with a specific consent status.
        
        Returns:
            List of user IDs
        """
        users = await self.db.user_consents.find(
            {
                "consent_type": consent_type.value if isinstance(consent_type, ConsentType) else consent_type,
                "granted": granted
            },
            {"user_id": 1}
        ).to_list(length=100000)
        
        return [u["user_id"] for u in users]


# Singleton instance
consent_manager = ConsentManager()
