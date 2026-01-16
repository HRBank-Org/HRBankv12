"""
Data Retention Service for SOC2 and PIPEDA Compliance
Manages data lifecycle, archival, and deletion policies.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import json

logger = logging.getLogger(__name__)


class DataRetentionPolicy:
    """Defines retention policy for a data type"""
    
    def __init__(
        self,
        data_type: str,
        retention_days: int,
        archive_after_days: Optional[int] = None,
        requires_consent: bool = False,
        contains_pii: bool = False
    ):
        self.data_type = data_type
        self.retention_days = retention_days
        self.archive_after_days = archive_after_days
        self.requires_consent = requires_consent
        self.contains_pii = contains_pii


class DataRetentionService:
    """
    Manages data retention policies and automated cleanup.
    Implements PIPEDA and SOC2 data lifecycle requirements.
    """
    
    # Default retention policies (in days)
    DEFAULT_POLICIES = {
        # Audit logs - 7 years (SOC2 requirement)
        "audit_logs": DataRetentionPolicy(
            data_type="audit_logs",
            retention_days=2555,  # 7 years
            contains_pii=True
        ),
        
        # User accounts - retain until deletion request
        "users": DataRetentionPolicy(
            data_type="users",
            retention_days=36500,  # 100 years (effectively forever until requested)
            archive_after_days=365,  # Archive inactive accounts after 1 year
            requires_consent=True,
            contains_pii=True
        ),
        
        # Session data - 90 days
        "active_sessions": DataRetentionPolicy(
            data_type="active_sessions",
            retention_days=90,
            contains_pii=True
        ),
        
        # Failed login attempts - 90 days
        "failed_login_attempts": DataRetentionPolicy(
            data_type="failed_login_attempts",
            retention_days=90,
            contains_pii=True
        ),
        
        # OTP records - 1 day
        "signup_otps": DataRetentionPolicy(
            data_type="signup_otps",
            retention_days=1,
            contains_pii=True
        ),
        
        # Password history - 2 years
        "password_history": DataRetentionPolicy(
            data_type="password_history",
            retention_days=730,
            contains_pii=False  # Only hashes
        ),
        
        # Notifications - 1 year
        "notifications": DataRetentionPolicy(
            data_type="notifications",
            retention_days=365,
            contains_pii=False
        ),
        
        # Messages - 3 years
        "messages": DataRetentionPolicy(
            data_type="messages",
            retention_days=1095,
            contains_pii=True
        ),
        
        # Timesheets - 7 years (tax requirement)
        "timesheets": DataRetentionPolicy(
            data_type="timesheets",
            retention_days=2555,
            contains_pii=True
        ),
        
        # Payroll records - 7 years (tax requirement)
        "payroll_records": DataRetentionPolicy(
            data_type="payroll_records",
            retention_days=2555,
            contains_pii=True
        ),
        
        # Credentials/Certificates - 10 years
        "blockchain_credentials": DataRetentionPolicy(
            data_type="blockchain_credentials",
            retention_days=3650,
            contains_pii=True
        ),
        
        # Consent records - 7 years after withdrawal
        "consent_records": DataRetentionPolicy(
            data_type="consent_records",
            retention_days=2555,
            contains_pii=True
        ),
        
        # Data export requests - 3 years
        "data_export_requests": DataRetentionPolicy(
            data_type="data_export_requests",
            retention_days=1095,
            contains_pii=True
        ),
    }
    
    def __init__(self):
        self._db = None
        self._policies = self.DEFAULT_POLICIES.copy()
    
    @property
    def db(self):
        if self._db is None:
            from server import db
            self._db = db
        return self._db
    
    def get_policy(self, data_type: str) -> Optional[DataRetentionPolicy]:
        """Get retention policy for a data type"""
        return self._policies.get(data_type)
    
    async def apply_retention_policies(self) -> Dict[str, int]:
        """
        Apply all retention policies - delete expired data.
        Should be run as a scheduled job.
        
        Returns:
            Dict of collection name -> records deleted
        """
        results = {}
        now = datetime.now(timezone.utc)
        
        for data_type, policy in self._policies.items():
            try:
                cutoff_date = now - timedelta(days=policy.retention_days)
                
                # Get the collection
                collection = self.db[data_type]
                
                # Find date field (try common names)
                date_fields = ['created_at', 'timestamp', 'created_date', 'signup_date']
                
                deleted_count = 0
                for date_field in date_fields:
                    # Try ISO string format
                    result = await collection.delete_many({
                        date_field: {"$lt": cutoff_date.isoformat()}
                    })
                    deleted_count += result.deleted_count
                    
                    if result.deleted_count > 0:
                        break
                
                results[data_type] = deleted_count
                
                if deleted_count > 0:
                    logger.info(f"Retention policy: Deleted {deleted_count} records from {data_type}")
                    
                    # Log to audit
                    from services.audit_logger import audit_logger, AuditEventType
                    await audit_logger.log(
                        event_type=AuditEventType.COMPLIANCE_DATA_RETENTION,
                        action="data_retention_cleanup",
                        description=f"Deleted {deleted_count} expired records from {data_type}",
                        actor_type="system",
                        target_type=data_type,
                        metadata={
                            "records_deleted": deleted_count,
                            "retention_days": policy.retention_days,
                            "cutoff_date": cutoff_date.isoformat()
                        }
                    )
                    
            except Exception as e:
                logger.error(f"Error applying retention policy for {data_type}: {str(e)}")
                results[data_type] = -1
        
        return results
    
    async def archive_inactive_users(self) -> int:
        """
        Archive inactive user data.
        
        Returns:
            Number of users archived
        """
        policy = self._policies.get("users")
        if not policy or not policy.archive_after_days:
            return 0
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=policy.archive_after_days)
        
        # Find inactive users
        inactive_users = await self.db.users.find({
            "last_login": {"$lt": cutoff_date.isoformat()},
            "is_archived": {"$ne": True}
        }).to_list(length=1000)
        
        archived_count = 0
        for user in inactive_users:
            try:
                # Create archive record
                archive_record = {
                    "user_id": user.get("user_id"),
                    "email_hash": self._hash_email(user.get("email", "")),
                    "user_type": user.get("user_type"),
                    "archived_at": datetime.now(timezone.utc).isoformat(),
                    "original_created_at": user.get("created_at"),
                    "last_activity": user.get("last_login")
                }
                
                await self.db.archived_users.insert_one(archive_record)
                
                # Mark user as archived
                await self.db.users.update_one(
                    {"user_id": user.get("user_id")},
                    {"$set": {"is_archived": True, "archived_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                archived_count += 1
                
            except Exception as e:
                logger.error(f"Error archiving user {user.get('user_id')}: {str(e)}")
        
        if archived_count > 0:
            logger.info(f"Archived {archived_count} inactive users")
        
        return archived_count
    
    def _hash_email(self, email: str) -> str:
        """Hash email for archived records"""
        import hashlib
        salt = os.environ.get('HASH_SALT', 'hrbank-hash-salt-2026')
        return hashlib.sha256(f"{salt}:{email.lower()}".encode()).hexdigest()
    
    async def process_deletion_request(
        self,
        user_id: str,
        requested_by: str,
        reason: str = "user_request"
    ) -> Dict[str, Any]:
        """
        Process a data deletion request (PIPEDA right to erasure).
        
        Returns:
            Summary of deleted data
        """
        results = {
            "user_id": user_id,
            "requested_by": requested_by,
            "requested_at": datetime.now(timezone.utc).isoformat(),
            "collections_processed": {},
            "status": "completed"
        }
        
        # Collections to delete user data from
        user_data_collections = [
            ("users", "user_id"),
            ("workforce_profiles", "workforce_id"),
            ("employer_profiles", "employer_id"),
            ("institution_profiles", "institution_id"),
            ("notifications", "user_id"),
            ("messages", "sender_id"),
            ("messages", "recipient_id"),
            ("active_sessions", "user_id"),
            ("failed_login_attempts", "user_id"),
            ("consent_records", "user_id"),
        ]
        
        # Collections to anonymize (retain for legal/business reasons)
        anonymize_collections = [
            ("timesheets", "worker_id"),
            ("payroll_records", "worker_id"),
            ("blockchain_credentials", "holder_id"),
            ("audit_logs", "actor_id"),
        ]
        
        # Delete from deletable collections
        for collection_name, id_field in user_data_collections:
            try:
                result = await self.db[collection_name].delete_many({id_field: user_id})
                results["collections_processed"][collection_name] = {
                    "action": "deleted",
                    "count": result.deleted_count
                }
            except Exception as e:
                results["collections_processed"][collection_name] = {
                    "action": "error",
                    "error": str(e)
                }
        
        # Anonymize in retained collections
        for collection_name, id_field in anonymize_collections:
            try:
                result = await self.db[collection_name].update_many(
                    {id_field: user_id},
                    {
                        "$set": {
                            id_field: f"DELETED_{user_id[:8]}",
                            "anonymized_at": datetime.now(timezone.utc).isoformat(),
                            "anonymization_reason": reason
                        }
                    }
                )
                results["collections_processed"][collection_name] = {
                    "action": "anonymized",
                    "count": result.modified_count
                }
            except Exception as e:
                results["collections_processed"][collection_name] = {
                    "action": "error",
                    "error": str(e)
                }
        
        # Log the deletion request
        from services.audit_logger import audit_logger, AuditEventType
        await audit_logger.log(
            event_type=AuditEventType.COMPLIANCE_DATA_DELETION,
            action="data_deletion_request",
            description=f"Processed data deletion request for user {user_id}",
            actor_id=requested_by,
            target_type="user",
            target_id=user_id,
            metadata=results
        )
        
        # Record the deletion request
        await self.db.data_deletion_requests.insert_one({
            **results,
            "reason": reason
        })
        
        return results
    
    async def export_user_data(self, user_id: str) -> Dict[str, Any]:
        """
        Export all user data (PIPEDA data portability).
        
        Returns:
            All user data in a structured format
        """
        export_data = {
            "user_id": user_id,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "data": {}
        }
        
        # Collections to export
        collections_to_export = [
            ("users", "user_id", ["password_hash"]),  # Exclude password hash
            ("workforce_profiles", "workforce_id", []),
            ("employer_profiles", "employer_id", []),
            ("institution_profiles", "institution_id", []),
            ("occupation_profiles", "workforce_id", []),
            ("timesheets", "worker_id", []),
            ("blockchain_credentials", "holder_id", []),
            ("consent_records", "user_id", []),
            ("notifications", "user_id", []),
        ]
        
        for collection_name, id_field, exclude_fields in collections_to_export:
            try:
                projection = {"_id": 0}
                for field in exclude_fields:
                    projection[field] = 0
                
                records = await self.db[collection_name].find(
                    {id_field: user_id},
                    projection
                ).to_list(length=10000)
                
                if records:
                    export_data["data"][collection_name] = records
                    
            except Exception as e:
                logger.error(f"Error exporting {collection_name}: {str(e)}")
        
        # Log the export
        from services.audit_logger import audit_logger, AuditEventType
        await audit_logger.log(
            event_type=AuditEventType.DATA_EXPORT,
            action="user_data_export",
            description=f"Exported all data for user {user_id}",
            actor_id=user_id,
            target_type="user",
            target_id=user_id,
            contains_pii=True
        )
        
        # Record the export request
        await self.db.data_export_requests.insert_one({
            "user_id": user_id,
            "exported_at": export_data["exported_at"],
            "collections_exported": list(export_data["data"].keys()),
            "total_records": sum(len(v) for v in export_data["data"].values())
        })
        
        return export_data


# Singleton instance
data_retention_service = DataRetentionService()
