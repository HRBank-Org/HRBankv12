"""
Session Management Service for SOC2 Compliance
Tracks active sessions, enables forced logout, and manages session security.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import hashlib
import uuid

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Centralized session management for security and compliance.
    Tracks all active sessions and enables administrative session control.
    """
    
    def __init__(self):
        self._db = None
        self._session_timeout_minutes = int(os.environ.get('SESSION_TIMEOUT_MINUTES', 480))  # 8 hours default
        self._max_concurrent_sessions = int(os.environ.get('MAX_CONCURRENT_SESSIONS', 5))
    
    @property
    def db(self):
        if self._db is None:
            from server import db
            self._db = db
        return self._db
    
    def _generate_session_id(self) -> str:
        """Generate unique session ID"""
        return f"sess_{uuid.uuid4().hex}"
    
    def _hash_token(self, token: str) -> str:
        """Hash a token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    async def create_session(
        self,
        user_id: str,
        user_email: str,
        user_type: str,
        token: str,
        ip_address: str = None,
        user_agent: str = None,
        device_info: dict = None
    ) -> dict:
        """
        Create a new session record.
        
        Returns:
            Session record
        """
        session_id = self._generate_session_id()
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=self._session_timeout_minutes)
        
        session = {
            "session_id": session_id,
            "user_id": user_id,
            "user_email": user_email,
            "user_type": user_type,
            "token_hash": self._hash_token(token),
            "ip_address": ip_address,
            "user_agent": user_agent,
            "device_info": device_info or {},
            "created_at": now.isoformat(),
            "last_activity": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "is_active": True,
            "terminated_at": None,
            "termination_reason": None
        }
        
        await self.db.active_sessions.insert_one(session)
        
        # Enforce max concurrent sessions
        await self._enforce_session_limit(user_id)
        
        # Log session creation
        from services.audit_logger import audit_logger, AuditEventType
        await audit_logger.log(
            event_type=AuditEventType.AUTH_LOGIN_SUCCESS,
            action="session_created",
            description=f"New session created for {user_email}",
            actor_id=user_id,
            actor_email=user_email,
            actor_type=user_type,
            actor_ip=ip_address,
            actor_user_agent=user_agent,
            target_type="session",
            target_id=session_id,
            metadata={"device_info": device_info}
        )
        
        return session
    
    async def _enforce_session_limit(self, user_id: str):
        """Terminate oldest sessions if user exceeds max concurrent sessions"""
        active_sessions = await self.db.active_sessions.find(
            {"user_id": user_id, "is_active": True}
        ).sort("created_at", 1).to_list(length=100)
        
        if len(active_sessions) > self._max_concurrent_sessions:
            # Terminate oldest sessions
            sessions_to_terminate = active_sessions[:-self._max_concurrent_sessions]
            for session in sessions_to_terminate:
                await self.terminate_session(
                    session["session_id"],
                    reason="max_sessions_exceeded"
                )
    
    async def validate_session(self, token: str) -> Optional[dict]:
        """
        Validate a session token.
        
        Returns:
            Session record if valid, None otherwise
        """
        token_hash = self._hash_token(token)
        
        session = await self.db.active_sessions.find_one({
            "token_hash": token_hash,
            "is_active": True
        })
        
        if not session:
            return None
        
        # Check expiration
        expires_at = datetime.fromisoformat(session["expires_at"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            await self.terminate_session(session["session_id"], reason="expired")
            return None
        
        # Update last activity
        await self.db.active_sessions.update_one(
            {"session_id": session["session_id"]},
            {"$set": {"last_activity": datetime.now(timezone.utc).isoformat()}}
        )
        
        return session
    
    async def terminate_session(
        self,
        session_id: str,
        reason: str = "user_logout"
    ) -> bool:
        """
        Terminate a specific session.
        
        Args:
            session_id: Session to terminate
            reason: Reason for termination (user_logout, admin_action, expired, etc.)
        """
        session = await self.db.active_sessions.find_one({"session_id": session_id})
        
        if not session:
            return False
        
        await self.db.active_sessions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "is_active": False,
                    "terminated_at": datetime.now(timezone.utc).isoformat(),
                    "termination_reason": reason
                }
            }
        )
        
        # Log session termination
        from services.audit_logger import audit_logger, AuditEventType
        
        event_type = AuditEventType.AUTH_LOGOUT if reason == "user_logout" else AuditEventType.AUTH_SESSION_REVOKED
        
        await audit_logger.log(
            event_type=event_type,
            action="session_terminated",
            description=f"Session terminated: {reason}",
            actor_id=session.get("user_id"),
            actor_email=session.get("user_email"),
            target_type="session",
            target_id=session_id,
            metadata={"termination_reason": reason}
        )
        
        return True
    
    async def terminate_all_user_sessions(
        self,
        user_id: str,
        reason: str = "admin_action",
        except_session_id: str = None
    ) -> int:
        """
        Terminate all sessions for a user.
        
        Args:
            user_id: User whose sessions to terminate
            reason: Reason for termination
            except_session_id: Optional session to keep active
            
        Returns:
            Number of sessions terminated
        """
        query = {"user_id": user_id, "is_active": True}
        if except_session_id:
            query["session_id"] = {"$ne": except_session_id}
        
        result = await self.db.active_sessions.update_many(
            query,
            {
                "$set": {
                    "is_active": False,
                    "terminated_at": datetime.now(timezone.utc).isoformat(),
                    "termination_reason": reason
                }
            }
        )
        
        return result.modified_count
    
    async def get_user_sessions(self, user_id: str, active_only: bool = True) -> List[dict]:
        """Get all sessions for a user"""
        query = {"user_id": user_id}
        if active_only:
            query["is_active"] = True
        
        sessions = await self.db.active_sessions.find(
            query,
            {"_id": 0, "token_hash": 0}  # Don't expose token hash
        ).sort("last_activity", -1).to_list(length=100)
        
        return sessions
    
    async def get_active_sessions_count(self) -> dict:
        """Get count of active sessions by user type"""
        pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$user_type", "count": {"$sum": 1}}}
        ]
        
        results = await self.db.active_sessions.aggregate(pipeline).to_list(length=10)
        
        counts = {r["_id"]: r["count"] for r in results}
        counts["total"] = sum(counts.values())
        
        return counts
    
    async def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired sessions (background job).
        
        Returns:
            Number of sessions cleaned up
        """
        now = datetime.now(timezone.utc).isoformat()
        
        result = await self.db.active_sessions.update_many(
            {
                "is_active": True,
                "expires_at": {"$lt": now}
            },
            {
                "$set": {
                    "is_active": False,
                    "terminated_at": now,
                    "termination_reason": "expired"
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"Cleaned up {result.modified_count} expired sessions")
        
        return result.modified_count


# Singleton instance
session_manager = SessionManager()
