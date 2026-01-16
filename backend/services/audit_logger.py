"""
SOC2 Compliant Audit Logging Service
Tracks all security-relevant events for compliance and forensics.
Supports PIPEDA (Canada) and SOC2 requirements.
"""

import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel
import hashlib
import os

logger = logging.getLogger(__name__)

class AuditEventType(str, Enum):
    # Authentication Events
    AUTH_LOGIN_SUCCESS = "auth.login.success"
    AUTH_LOGIN_FAILED = "auth.login.failed"
    AUTH_LOGOUT = "auth.logout"
    AUTH_PASSWORD_CHANGE = "auth.password.change"
    AUTH_PASSWORD_RESET_REQUEST = "auth.password.reset_request"
    AUTH_PASSWORD_RESET_COMPLETE = "auth.password.reset_complete"
    AUTH_MFA_ENABLED = "auth.mfa.enabled"
    AUTH_MFA_DISABLED = "auth.mfa.disabled"
    AUTH_SESSION_EXPIRED = "auth.session.expired"
    AUTH_SESSION_REVOKED = "auth.session.revoked"
    AUTH_ACCOUNT_LOCKED = "auth.account.locked"
    AUTH_ACCOUNT_UNLOCKED = "auth.account.unlocked"
    
    # User Management Events
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    USER_ACTIVATED = "user.activated"
    USER_DEACTIVATED = "user.deactivated"
    USER_ROLE_CHANGED = "user.role.changed"
    USER_PERMISSIONS_CHANGED = "user.permissions.changed"
    
    # Data Access Events
    DATA_READ = "data.read"
    DATA_CREATE = "data.create"
    DATA_UPDATE = "data.update"
    DATA_DELETE = "data.delete"
    DATA_EXPORT = "data.export"
    DATA_BULK_ACCESS = "data.bulk_access"
    
    # Sensitive Data Events (PII/PHI)
    SENSITIVE_DATA_ACCESS = "sensitive.data.access"
    SENSITIVE_DATA_MODIFIED = "sensitive.data.modified"
    SENSITIVE_DATA_EXPORTED = "sensitive.data.exported"
    
    # Admin Events
    ADMIN_ACTION = "admin.action"
    ADMIN_CONFIG_CHANGE = "admin.config.change"
    ADMIN_BULK_OPERATION = "admin.bulk_operation"
    
    # Security Events
    SECURITY_SUSPICIOUS_ACTIVITY = "security.suspicious_activity"
    SECURITY_RATE_LIMIT_EXCEEDED = "security.rate_limit.exceeded"
    SECURITY_INVALID_TOKEN = "security.invalid_token"
    SECURITY_PERMISSION_DENIED = "security.permission_denied"
    
    # Compliance Events
    COMPLIANCE_CONSENT_GIVEN = "compliance.consent.given"
    COMPLIANCE_CONSENT_WITHDRAWN = "compliance.consent.withdrawn"
    COMPLIANCE_DATA_RETENTION = "compliance.data.retention"
    COMPLIANCE_DATA_DELETION = "compliance.data.deletion"
    
    # System Events
    SYSTEM_ERROR = "system.error"
    SYSTEM_STARTUP = "system.startup"
    SYSTEM_SHUTDOWN = "system.shutdown"


class AuditSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditEvent(BaseModel):
    """Audit event record"""
    event_id: str
    timestamp: str
    event_type: AuditEventType
    severity: AuditSeverity
    
    # Actor information
    actor_id: Optional[str] = None
    actor_email: Optional[str] = None
    actor_type: Optional[str] = None  # user, admin, system, api_key
    actor_ip: Optional[str] = None
    actor_user_agent: Optional[str] = None
    
    # Target information
    target_type: Optional[str] = None  # user, document, credential, etc.
    target_id: Optional[str] = None
    
    # Event details
    action: str
    description: str
    metadata: Dict[str, Any] = {}
    
    # Request context
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    http_method: Optional[str] = None
    
    # Result
    success: bool = True
    error_message: Optional[str] = None
    
    # Compliance fields
    data_classification: Optional[str] = None  # public, internal, confidential, restricted
    contains_pii: bool = False
    retention_days: int = 2555  # 7 years default for SOC2


class AuditLogger:
    """
    Centralized audit logging service for SOC2 compliance.
    Stores audit logs in MongoDB with tamper-evident checksums.
    """
    
    def __init__(self):
        self._db = None
        self._integrity_key = os.environ.get('AUDIT_INTEGRITY_KEY', 'hrbank-audit-2026')
    
    @property
    def db(self):
        if self._db is None:
            from server import db
            self._db = db
        return self._db
    
    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        import uuid
        return f"evt_{uuid.uuid4().hex[:16]}"
    
    def _calculate_checksum(self, event: dict) -> str:
        """Calculate tamper-evident checksum for audit record"""
        # Create deterministic string from event data
        data_str = json.dumps(event, sort_keys=True, default=str)
        checksum_input = f"{self._integrity_key}:{data_str}"
        return hashlib.sha256(checksum_input.encode()).hexdigest()
    
    def _mask_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Mask sensitive fields in metadata for logging"""
        sensitive_fields = [
            'password', 'token', 'secret', 'api_key', 'ssn', 'sin',
            'credit_card', 'bank_account', 'routing_number'
        ]
        
        masked = {}
        for key, value in data.items():
            key_lower = key.lower()
            if any(sf in key_lower for sf in sensitive_fields):
                if isinstance(value, str) and len(value) > 4:
                    masked[key] = f"***{value[-4:]}"
                else:
                    masked[key] = "***REDACTED***"
            elif isinstance(value, dict):
                masked[key] = self._mask_sensitive_data(value)
            else:
                masked[key] = value
        
        return masked
    
    async def log(
        self,
        event_type: AuditEventType,
        action: str,
        description: str,
        actor_id: Optional[str] = None,
        actor_email: Optional[str] = None,
        actor_type: str = "user",
        actor_ip: Optional[str] = None,
        actor_user_agent: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        metadata: Dict[str, Any] = None,
        request_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        http_method: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        data_classification: str = "internal",
        contains_pii: bool = False
    ) -> str:
        """
        Log an audit event.
        
        Returns:
            str: The event_id of the logged event
        """
        event_id = self._generate_event_id()
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Mask sensitive data in metadata
        safe_metadata = self._mask_sensitive_data(metadata or {})
        
        event_data = {
            "event_id": event_id,
            "timestamp": timestamp,
            "event_type": event_type.value,
            "severity": severity.value,
            "actor_id": actor_id,
            "actor_email": actor_email,
            "actor_type": actor_type,
            "actor_ip": actor_ip,
            "actor_user_agent": actor_user_agent,
            "target_type": target_type,
            "target_id": target_id,
            "action": action,
            "description": description,
            "metadata": safe_metadata,
            "request_id": request_id,
            "endpoint": endpoint,
            "http_method": http_method,
            "success": success,
            "error_message": error_message,
            "data_classification": data_classification,
            "contains_pii": contains_pii,
            "retention_days": 2555,  # 7 years
            "expires_at": None  # Set by retention policy
        }
        
        # Add tamper-evident checksum
        event_data["checksum"] = self._calculate_checksum(event_data)
        
        try:
            await self.db.audit_logs.insert_one(event_data)
            
            # Log critical events to application logger as well
            if severity in [AuditSeverity.ERROR, AuditSeverity.CRITICAL]:
                logger.warning(f"AUDIT [{severity.value}]: {event_type.value} - {description}")
            
        except Exception as e:
            logger.error(f"Failed to write audit log: {str(e)}")
            # Fallback to file-based logging
            self._fallback_log(event_data)
        
        return event_id
    
    def _fallback_log(self, event_data: dict):
        """Fallback to file logging if database is unavailable"""
        try:
            log_line = json.dumps(event_data, default=str)
            with open('/var/log/hrbank_audit.log', 'a') as f:
                f.write(log_line + '\n')
        except Exception as e:
            logger.critical(f"Audit logging completely failed: {str(e)}")
    
    # Convenience methods for common events
    
    async def log_login_success(
        self,
        user_id: str,
        email: str,
        user_type: str,
        ip_address: str = None,
        user_agent: str = None,
        metadata: dict = None
    ):
        """Log successful login"""
        await self.log(
            event_type=AuditEventType.AUTH_LOGIN_SUCCESS,
            action="login",
            description=f"User {email} logged in successfully",
            actor_id=user_id,
            actor_email=email,
            actor_type=user_type,
            actor_ip=ip_address,
            actor_user_agent=user_agent,
            target_type="session",
            metadata=metadata or {},
            contains_pii=True
        )
    
    async def log_login_failed(
        self,
        email: str,
        reason: str,
        ip_address: str = None,
        user_agent: str = None,
        attempt_count: int = 1
    ):
        """Log failed login attempt"""
        severity = AuditSeverity.WARNING if attempt_count < 5 else AuditSeverity.ERROR
        
        await self.log(
            event_type=AuditEventType.AUTH_LOGIN_FAILED,
            action="login_failed",
            description=f"Failed login attempt for {email}: {reason}",
            actor_email=email,
            actor_type="unknown",
            actor_ip=ip_address,
            actor_user_agent=user_agent,
            success=False,
            error_message=reason,
            severity=severity,
            metadata={"attempt_count": attempt_count},
            contains_pii=True
        )
    
    async def log_data_access(
        self,
        user_id: str,
        user_email: str,
        target_type: str,
        target_id: str,
        action: str = "read",
        description: str = None,
        contains_pii: bool = False,
        ip_address: str = None
    ):
        """Log data access event"""
        await self.log(
            event_type=AuditEventType.DATA_READ if action == "read" else AuditEventType.DATA_UPDATE,
            action=action,
            description=description or f"User accessed {target_type} {target_id}",
            actor_id=user_id,
            actor_email=user_email,
            target_type=target_type,
            target_id=target_id,
            actor_ip=ip_address,
            contains_pii=contains_pii,
            data_classification="confidential" if contains_pii else "internal"
        )
    
    async def log_admin_action(
        self,
        admin_id: str,
        admin_email: str,
        action: str,
        target_type: str,
        target_id: str,
        description: str,
        metadata: dict = None,
        ip_address: str = None
    ):
        """Log admin action"""
        await self.log(
            event_type=AuditEventType.ADMIN_ACTION,
            action=action,
            description=description,
            actor_id=admin_id,
            actor_email=admin_email,
            actor_type="admin",
            target_type=target_type,
            target_id=target_id,
            actor_ip=ip_address,
            metadata=metadata or {},
            severity=AuditSeverity.WARNING,
            data_classification="confidential"
        )
    
    async def log_sensitive_data_access(
        self,
        user_id: str,
        user_email: str,
        data_type: str,
        target_id: str,
        reason: str,
        ip_address: str = None
    ):
        """Log access to sensitive/PII data"""
        await self.log(
            event_type=AuditEventType.SENSITIVE_DATA_ACCESS,
            action="sensitive_access",
            description=f"Accessed sensitive data ({data_type}) for {target_id}: {reason}",
            actor_id=user_id,
            actor_email=user_email,
            target_type=data_type,
            target_id=target_id,
            actor_ip=ip_address,
            contains_pii=True,
            data_classification="restricted",
            severity=AuditSeverity.WARNING
        )
    
    async def log_security_event(
        self,
        event_subtype: str,
        description: str,
        actor_ip: str = None,
        actor_id: str = None,
        metadata: dict = None
    ):
        """Log security-related event"""
        await self.log(
            event_type=AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY,
            action=event_subtype,
            description=description,
            actor_id=actor_id,
            actor_ip=actor_ip,
            metadata=metadata or {},
            severity=AuditSeverity.ERROR,
            data_classification="restricted"
        )
    
    async def log_consent(
        self,
        user_id: str,
        user_email: str,
        consent_type: str,
        given: bool,
        ip_address: str = None,
        metadata: dict = None
    ):
        """Log consent given/withdrawn (PIPEDA compliance)"""
        event_type = AuditEventType.COMPLIANCE_CONSENT_GIVEN if given else AuditEventType.COMPLIANCE_CONSENT_WITHDRAWN
        
        await self.log(
            event_type=event_type,
            action="consent_update",
            description=f"User {'gave' if given else 'withdrew'} consent for {consent_type}",
            actor_id=user_id,
            actor_email=user_email,
            target_type="consent",
            target_id=consent_type,
            actor_ip=ip_address,
            metadata=metadata or {},
            contains_pii=True,
            data_classification="confidential"
        )


# Singleton instance
audit_logger = AuditLogger()
