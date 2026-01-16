"""
Security Controls Service for SOC2 Compliance
Implements rate limiting, account lockout, and suspicious activity detection.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from collections import defaultdict
import hashlib

logger = logging.getLogger(__name__)


class SecurityControls:
    """
    Security controls for authentication and access management.
    Implements SOC2 security requirements.
    """
    
    def __init__(self):
        self._db = None
        
        # Configuration
        self._max_failed_attempts = int(os.environ.get('MAX_FAILED_LOGIN_ATTEMPTS', 5))
        self._lockout_duration_minutes = int(os.environ.get('ACCOUNT_LOCKOUT_MINUTES', 30))
        self._rate_limit_window_seconds = int(os.environ.get('RATE_LIMIT_WINDOW_SECONDS', 60))
        self._rate_limit_max_requests = int(os.environ.get('RATE_LIMIT_MAX_REQUESTS', 100))
        
        # In-memory rate limiting (should use Redis in production)
        self._rate_limits: Dict[str, list] = defaultdict(list)
    
    @property
    def db(self):
        if self._db is None:
            from server import db
            self._db = db
        return self._db
    
    async def record_failed_login(
        self,
        email: str,
        ip_address: str = None,
        user_agent: str = None,
        reason: str = "invalid_credentials"
    ) -> Tuple[int, bool]:
        """
        Record a failed login attempt.
        
        Returns:
            Tuple of (attempt_count, is_locked)
        """
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=self._lockout_duration_minutes)
        
        # Record the attempt
        attempt = {
            "email": email.lower(),
            "ip_address": ip_address,
            "user_agent": user_agent,
            "reason": reason,
            "timestamp": now.isoformat()
        }
        await self.db.failed_login_attempts.insert_one(attempt)
        
        # Count recent attempts
        attempt_count = await self.db.failed_login_attempts.count_documents({
            "email": email.lower(),
            "timestamp": {"$gte": window_start.isoformat()}
        })
        
        # Check if account should be locked
        is_locked = attempt_count >= self._max_failed_attempts
        
        if is_locked:
            await self._lock_account(email, ip_address, attempt_count)
        
        # Log to audit
        from services.audit_logger import audit_logger
        await audit_logger.log_login_failed(
            email=email,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
            attempt_count=attempt_count
        )
        
        return attempt_count, is_locked
    
    async def _lock_account(self, email: str, ip_address: str, attempt_count: int):
        """Lock an account due to too many failed attempts"""
        now = datetime.now(timezone.utc)
        unlock_at = now + timedelta(minutes=self._lockout_duration_minutes)
        
        await self.db.account_lockouts.update_one(
            {"email": email.lower()},
            {
                "$set": {
                    "email": email.lower(),
                    "locked_at": now.isoformat(),
                    "unlock_at": unlock_at.isoformat(),
                    "reason": "too_many_failed_attempts",
                    "failed_attempts": attempt_count,
                    "trigger_ip": ip_address
                }
            },
            upsert=True
        )
        
        # Log security event
        from services.audit_logger import audit_logger, AuditEventType, AuditSeverity
        await audit_logger.log(
            event_type=AuditEventType.AUTH_ACCOUNT_LOCKED,
            action="account_locked",
            description=f"Account locked due to {attempt_count} failed login attempts",
            actor_email=email,
            actor_ip=ip_address,
            severity=AuditSeverity.WARNING,
            metadata={
                "failed_attempts": attempt_count,
                "lockout_duration_minutes": self._lockout_duration_minutes
            }
        )
    
    async def is_account_locked(self, email: str) -> Tuple[bool, Optional[datetime]]:
        """
        Check if an account is locked.
        
        Returns:
            Tuple of (is_locked, unlock_time)
        """
        lockout = await self.db.account_lockouts.find_one({"email": email.lower()})
        
        if not lockout:
            return False, None
        
        unlock_at = datetime.fromisoformat(lockout["unlock_at"].replace('Z', '+00:00'))
        
        if datetime.now(timezone.utc) >= unlock_at:
            # Lockout expired, remove it
            await self.db.account_lockouts.delete_one({"email": email.lower()})
            return False, None
        
        return True, unlock_at
    
    async def unlock_account(self, email: str, admin_id: str = None) -> bool:
        """Manually unlock an account"""
        result = await self.db.account_lockouts.delete_one({"email": email.lower()})
        
        if result.deleted_count > 0:
            # Clear failed attempts
            await self.db.failed_login_attempts.delete_many({"email": email.lower()})
            
            # Log the action
            from services.audit_logger import audit_logger, AuditEventType
            await audit_logger.log(
                event_type=AuditEventType.AUTH_ACCOUNT_UNLOCKED,
                action="account_unlocked",
                description=f"Account manually unlocked",
                actor_id=admin_id,
                actor_type="admin" if admin_id else "system",
                target_type="user",
                target_id=email
            )
            
            return True
        
        return False
    
    async def clear_failed_attempts(self, email: str):
        """Clear failed login attempts after successful login"""
        await self.db.failed_login_attempts.delete_many({"email": email.lower()})
    
    def check_rate_limit(self, identifier: str) -> Tuple[bool, int]:
        """
        Check if a request is within rate limits.
        
        Args:
            identifier: IP address or user ID
            
        Returns:
            Tuple of (is_allowed, remaining_requests)
        """
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(seconds=self._rate_limit_window_seconds)
        
        # Clean old requests
        self._rate_limits[identifier] = [
            ts for ts in self._rate_limits[identifier]
            if ts > window_start
        ]
        
        request_count = len(self._rate_limits[identifier])
        remaining = max(0, self._rate_limit_max_requests - request_count)
        
        if request_count >= self._rate_limit_max_requests:
            return False, 0
        
        # Record this request
        self._rate_limits[identifier].append(now)
        
        return True, remaining - 1
    
    async def detect_suspicious_activity(
        self,
        user_id: str,
        email: str,
        ip_address: str,
        activity_type: str,
        metadata: dict = None
    ) -> bool:
        """
        Detect and log suspicious activity patterns.
        
        Returns:
            True if activity is suspicious
        """
        is_suspicious = False
        reasons = []
        
        # Check for login from new location
        if activity_type == "login":
            known_ips = await self.db.active_sessions.distinct(
                "ip_address",
                {"user_id": user_id, "is_active": False}
            )
            
            if ip_address and known_ips and ip_address not in known_ips:
                reasons.append("new_location")
                is_suspicious = True
        
        # Check for rapid requests
        allowed, remaining = self.check_rate_limit(ip_address or user_id)
        if not allowed:
            reasons.append("rate_limit_exceeded")
            is_suspicious = True
        
        # Check for unusual time (optional - based on user's typical activity)
        current_hour = datetime.now(timezone.utc).hour
        if current_hour >= 2 and current_hour <= 5:  # 2 AM - 5 AM UTC
            reasons.append("unusual_time")
        
        if is_suspicious:
            from services.audit_logger import audit_logger
            await audit_logger.log_security_event(
                event_subtype=activity_type,
                description=f"Suspicious activity detected: {', '.join(reasons)}",
                actor_ip=ip_address,
                actor_id=user_id,
                metadata={
                    "reasons": reasons,
                    "activity_type": activity_type,
                    **(metadata or {})
                }
            )
        
        return is_suspicious
    
    async def validate_password_strength(self, password: str) -> Tuple[bool, list]:
        """
        Validate password meets security requirements.
        
        Returns:
            Tuple of (is_valid, list of issues)
        """
        issues = []
        
        if len(password) < 8:
            issues.append("Password must be at least 8 characters")
        
        if len(password) > 128:
            issues.append("Password must be less than 128 characters")
        
        if not any(c.isupper() for c in password):
            issues.append("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in password):
            issues.append("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in password):
            issues.append("Password must contain at least one number")
        
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password):
            issues.append("Password must contain at least one special character")
        
        # Check for common passwords (simplified)
        common_passwords = ['password', '123456', 'password123', 'admin', 'letmein']
        if password.lower() in common_passwords:
            issues.append("Password is too common")
        
        return len(issues) == 0, issues
    
    async def check_password_history(self, user_id: str, new_password_hash: str) -> bool:
        """
        Check if password was recently used.
        
        Returns:
            True if password is allowed (not in history)
        """
        # Get last 5 passwords
        history = await self.db.password_history.find(
            {"user_id": user_id}
        ).sort("changed_at", -1).limit(5).to_list(length=5)
        
        for entry in history:
            if entry.get("password_hash") == new_password_hash:
                return False
        
        return True
    
    async def record_password_change(self, user_id: str, password_hash: str):
        """Record a password change in history"""
        await self.db.password_history.insert_one({
            "user_id": user_id,
            "password_hash": password_hash,
            "changed_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Keep only last 10 passwords
        history = await self.db.password_history.find(
            {"user_id": user_id}
        ).sort("changed_at", -1).to_list(length=100)
        
        if len(history) > 10:
            old_ids = [h["_id"] for h in history[10:]]
            await self.db.password_history.delete_many({"_id": {"$in": old_ids}})


# Singleton instance
security_controls = SecurityControls()
