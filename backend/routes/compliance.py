"""
Compliance API Routes for SOC2, PIPEDA, and Multi-Jurisdiction Support
Provides endpoints for audit logs, data export, consent management, security controls,
and automatic jurisdiction detection based on work location.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Dict, Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel

from auth.dependencies import require_role, get_current_user
from utils.jurisdiction import (
    get_jurisdiction_from_address,
    get_compliance_rules,
    get_all_supported_jurisdictions,
    validate_wage_compliance,
    enrich_with_jurisdiction,
    get_compliance_badges,
    get_minimum_wage,
    COMPLIANCE_RULES
)

router = APIRouter(prefix="/compliance", tags=["Compliance"])


def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


# Request/Response Models
class ConsentUpdate(BaseModel):
    consent_type: str
    granted: bool
    version: str = "1.0"


class BulkConsentUpdate(BaseModel):
    consents: Dict[str, bool]
    version: str = "1.0"


class DataDeletionRequest(BaseModel):
    reason: str = "user_request"
    confirm: bool = False


# Consent Management Endpoints

@router.get("/consents/me")
async def get_my_consents(
    current_user: dict = Depends(require_role(["workforce", "employer", "institution", "admin"])),
    db = Depends(get_db)
):
    """Get current user's consent status"""
    from services.consent_manager import consent_manager
    
    consents = await consent_manager.get_user_consents(current_user["user_id"])
    required_consents = consent_manager.REQUIRED_CONSENTS.get(current_user["user_type"], [])
    optional_consents = consent_manager.OPTIONAL_CONSENTS
    
    has_required, missing = await consent_manager.has_required_consents(
        current_user["user_id"],
        current_user["user_type"]
    )
    
    return {
        "success": True,
        "data": {
            "consents": consents,
            "has_required_consents": has_required,
            "missing_required": missing,
            "required_consent_types": [c.value for c in required_consents],
            "optional_consent_types": [c.value for c in optional_consents]
        }
    }


@router.post("/consents/me")
async def update_my_consent(
    consent_data: ConsentUpdate,
    request: Request,
    current_user: dict = Depends(require_role(["workforce", "employer", "institution", "admin"])),
    db = Depends(get_db)
):
    """Update a consent decision"""
    from services.consent_manager import consent_manager
    
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    record = await consent_manager.record_consent(
        user_id=current_user["user_id"],
        user_email=current_user["email"],
        consent_type=consent_data.consent_type,
        granted=consent_data.granted,
        ip_address=ip_address,
        user_agent=user_agent,
        version=consent_data.version
    )
    
    return {
        "success": True,
        "data": {
            "consent_type": consent_data.consent_type,
            "granted": consent_data.granted,
            "recorded_at": record["recorded_at"]
        }
    }


@router.post("/consents/me/bulk")
async def bulk_update_consents(
    consent_data: BulkConsentUpdate,
    request: Request,
    current_user: dict = Depends(require_role(["workforce", "employer", "institution", "admin"])),
    db = Depends(get_db)
):
    """Update multiple consents at once (e.g., during signup)"""
    from services.consent_manager import consent_manager
    
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    records = await consent_manager.bulk_record_consents(
        user_id=current_user["user_id"],
        user_email=current_user["email"],
        consents=consent_data.consents,
        ip_address=ip_address,
        user_agent=user_agent,
        version=consent_data.version
    )
    
    return {
        "success": True,
        "data": {
            "consents_updated": len(records)
        }
    }


@router.get("/consents/me/history")
async def get_my_consent_history(
    consent_type: Optional[str] = None,
    current_user: dict = Depends(require_role(["workforce", "employer", "institution", "admin"])),
    db = Depends(get_db)
):
    """Get consent change history"""
    from services.consent_manager import consent_manager
    
    history = await consent_manager.get_consent_history(
        current_user["user_id"],
        consent_type
    )
    
    return {
        "success": True,
        "data": {
            "history": history
        }
    }


# Data Export Endpoints (PIPEDA Right to Data Portability)

@router.post("/data/export")
async def request_data_export(
    current_user: dict = Depends(require_role(["workforce", "employer", "institution"])),
    db = Depends(get_db)
):
    """Request export of all user data (PIPEDA data portability)"""
    from services.data_retention import data_retention_service
    
    export_data = await data_retention_service.export_user_data(current_user["user_id"])
    
    return {
        "success": True,
        "data": export_data
    }


# Data Deletion Endpoints (PIPEDA Right to Erasure)

@router.post("/data/deletion-request")
async def request_data_deletion(
    request_data: DataDeletionRequest,
    current_user: dict = Depends(require_role(["workforce", "employer", "institution"])),
    db = Depends(get_db)
):
    """Request deletion of all user data (PIPEDA right to erasure)"""
    if not request_data.confirm:
        raise HTTPException(
            status_code=400,
            detail="You must confirm the deletion request by setting confirm=true"
        )
    
    from services.data_retention import data_retention_service
    
    result = await data_retention_service.process_deletion_request(
        user_id=current_user["user_id"],
        requested_by=current_user["user_id"],
        reason=request_data.reason
    )
    
    return {
        "success": True,
        "data": result,
        "message": "Your data deletion request has been processed. Some data may be retained for legal requirements."
    }


# Session Management Endpoints

@router.get("/sessions/me")
async def get_my_sessions(
    current_user: dict = Depends(require_role(["workforce", "employer", "institution", "admin"])),
    db = Depends(get_db)
):
    """Get all active sessions for current user"""
    from services.session_manager import session_manager
    
    sessions = await session_manager.get_user_sessions(current_user["user_id"])
    
    return {
        "success": True,
        "data": {
            "sessions": sessions,
            "count": len(sessions)
        }
    }


@router.delete("/sessions/{session_id}")
async def terminate_session(
    session_id: str,
    current_user: dict = Depends(require_role(["workforce", "employer", "institution", "admin"])),
    db = Depends(get_db)
):
    """Terminate a specific session"""
    from services.session_manager import session_manager
    
    # Verify session belongs to user
    session = await db.active_sessions.find_one({
        "session_id": session_id,
        "user_id": current_user["user_id"]
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await session_manager.terminate_session(session_id, reason="user_action")
    
    return {
        "success": True,
        "message": "Session terminated"
    }


@router.delete("/sessions/me/all")
async def terminate_all_sessions(
    except_current: bool = True,
    request: Request = None,
    current_user: dict = Depends(require_role(["workforce", "employer", "institution", "admin"])),
    db = Depends(get_db)
):
    """Terminate all sessions (logout everywhere)"""
    from services.session_manager import session_manager
    
    # Get current session ID from token if we want to keep it
    current_session_id = None
    if except_current and request:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            current_session = await session_manager.validate_session(token)
            if current_session:
                current_session_id = current_session["session_id"]
    
    count = await session_manager.terminate_all_user_sessions(
        current_user["user_id"],
        reason="user_logout_all",
        except_session_id=current_session_id
    )
    
    return {
        "success": True,
        "data": {
            "sessions_terminated": count
        }
    }


# Audit Log Endpoints (Admin Only)

@router.get("/audit-logs")
async def get_audit_logs(
    event_type: Optional[str] = None,
    actor_id: Optional[str] = None,
    target_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    severity: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get audit logs (admin only)"""
    query = {}
    
    if event_type:
        query["event_type"] = event_type
    if actor_id:
        query["actor_id"] = actor_id
    if target_type:
        query["target_type"] = target_type
    if severity:
        query["severity"] = severity
    
    if start_date:
        query["timestamp"] = {"$gte": start_date}
    if end_date:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = end_date
        else:
            query["timestamp"] = {"$lte": end_date}
    
    # Get logs
    logs = await db.audit_logs.find(
        query,
        {"_id": 0, "checksum": 0}  # Don't expose checksum
    ).sort("timestamp", -1).skip((page - 1) * limit).limit(limit).to_list(length=limit)
    
    total = await db.audit_logs.count_documents(query)
    
    # Log this access
    from services.audit_logger import audit_logger, AuditEventType
    await audit_logger.log(
        event_type=AuditEventType.DATA_READ,
        action="view_audit_logs",
        description=f"Admin viewed audit logs (page {page})",
        actor_id=current_user["user_id"],
        actor_email=current_user["email"],
        actor_type="admin",
        metadata={"query": query, "results_count": len(logs)}
    )
    
    return {
        "success": True,
        "data": {
            "logs": logs,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
    }


@router.get("/audit-logs/event-types")
async def get_audit_event_types(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get list of audit event types"""
    from services.audit_logger import AuditEventType
    
    return {
        "success": True,
        "data": {
            "event_types": [e.value for e in AuditEventType]
        }
    }


@router.get("/audit-logs/summary")
async def get_audit_summary(
    days: int = Query(7, ge=1, le=90),
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get audit log summary statistics"""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Count by event type
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_date}}},
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    by_type = await db.audit_logs.aggregate(pipeline).to_list(length=100)
    
    # Count by severity
    severity_pipeline = [
        {"$match": {"timestamp": {"$gte": start_date}}},
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
    ]
    
    by_severity = await db.audit_logs.aggregate(severity_pipeline).to_list(length=10)
    
    # Recent critical events
    critical_events = await db.audit_logs.find(
        {"timestamp": {"$gte": start_date}, "severity": {"$in": ["error", "critical"]}},
        {"_id": 0, "checksum": 0}
    ).sort("timestamp", -1).limit(10).to_list(length=10)
    
    return {
        "success": True,
        "data": {
            "period_days": days,
            "by_event_type": {r["_id"]: r["count"] for r in by_type},
            "by_severity": {r["_id"]: r["count"] for r in by_severity},
            "recent_critical_events": critical_events,
            "total_events": sum(r["count"] for r in by_type)
        }
    }


# Security Status Endpoints

@router.get("/security/status")
async def get_security_status(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get overall security status"""
    from services.session_manager import session_manager
    from services.encryption_service import encryption_service
    
    # Get active sessions count
    session_counts = await session_manager.get_active_sessions_count()
    
    # Get locked accounts count
    locked_accounts = await db.account_lockouts.count_documents({})
    
    # Get recent failed logins
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent_failed_logins = await db.failed_login_attempts.count_documents({
        "timestamp": {"$gte": one_hour_ago}
    })
    
    # Get recent security events
    recent_security = await db.audit_logs.count_documents({
        "timestamp": {"$gte": one_hour_ago},
        "event_type": {"$regex": "^security\\."}
    })
    
    return {
        "success": True,
        "data": {
            "active_sessions": session_counts,
            "locked_accounts": locked_accounts,
            "failed_logins_last_hour": recent_failed_logins,
            "security_events_last_hour": recent_security,
            "encryption_type": encryption_service.encryption_type,
            "status": "healthy" if recent_security < 10 else "attention_needed"
        }
    }


# Admin Account Management

@router.post("/admin/unlock-account/{email}")
async def admin_unlock_account(
    email: str,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Manually unlock a locked account"""
    from services.security_controls import security_controls
    
    success = await security_controls.unlock_account(email, current_user["user_id"])
    
    if not success:
        raise HTTPException(status_code=404, detail="Account not locked or not found")
    
    return {
        "success": True,
        "message": f"Account {email} has been unlocked"
    }


@router.post("/admin/terminate-user-sessions/{user_id}")
async def admin_terminate_user_sessions(
    user_id: str,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Force logout a user from all sessions"""
    from services.session_manager import session_manager
    from services.audit_logger import audit_logger, AuditEventType
    
    count = await session_manager.terminate_all_user_sessions(
        user_id,
        reason="admin_forced_logout"
    )
    
    await audit_logger.log(
        event_type=AuditEventType.ADMIN_ACTION,
        action="force_logout",
        description=f"Admin forced logout of user {user_id}",
        actor_id=current_user["user_id"],
        actor_email=current_user["email"],
        actor_type="admin",
        target_type="user",
        target_id=user_id,
        metadata={"sessions_terminated": count}
    )
    
    return {
        "success": True,
        "data": {
            "sessions_terminated": count
        }
    }


# ==================== JURISDICTION & GLOBAL COMPLIANCE ====================

@router.get("/jurisdictions")
async def list_supported_jurisdictions():
    """
    Get all supported jurisdictions with basic compliance info.
    Public endpoint - no auth required.
    
    Jurisdictions are automatically determined by the workplace/role address.
    """
    jurisdictions = get_all_supported_jurisdictions()
    
    # Group by country
    by_country = {}
    for j in jurisdictions:
        country = j.get("country", "Other")
        if country not in by_country:
            by_country[country] = []
        by_country[country].append(j)
    
    return {
        "success": True,
        "data": {
            "jurisdictions": jurisdictions,
            "by_country": by_country,
            "total": len(jurisdictions),
            "enabled_count": len([j for j in jurisdictions if j.get("enabled")])
        }
    }


@router.get("/detect-jurisdiction")
async def detect_jurisdiction(
    province: Optional[str] = Query(None, description="Province or state code (e.g., ON, CA, TX)"),
    state: Optional[str] = Query(None, description="State code (alias for province)"),
    country: Optional[str] = Query(None, description="Country code or name (e.g., CA, US, Canada)"),
    postal_code: Optional[str] = Query(None, description="Postal/ZIP code"),
    city: Optional[str] = Query(None, description="City name")
):
    """
    Detect jurisdiction from address components.
    Public endpoint - useful for forms and previews.
    
    Jurisdiction determines which labor laws, minimum wage, overtime rules,
    and data privacy regulations apply to workers at that location.
    """
    jurisdiction = get_jurisdiction_from_address(
        province=province,
        state=state,
        country=country,
        postal_code=postal_code,
        city=city
    )
    
    return {
        "success": True,
        "data": jurisdiction
    }


@router.get("/rules/{jurisdiction_code}")
async def get_jurisdiction_rules(jurisdiction_code: str):
    """
    Get detailed compliance rules for a specific jurisdiction.
    
    Includes: minimum wage, overtime rules, data privacy laws, 
    required compliance badges, and more.
    """
    rules = get_compliance_rules(jurisdiction_code.upper())
    
    if rules.get("jurisdiction_code") == "UNKNOWN":
        raise HTTPException(
            status_code=404,
            detail=f"Jurisdiction '{jurisdiction_code}' not found or not supported"
        )
    
    return {
        "success": True,
        "data": rules
    }


@router.get("/validate-wage")
async def validate_wage(
    hourly_rate: float = Query(..., description="Proposed hourly rate"),
    jurisdiction_code: str = Query(..., description="Jurisdiction code (e.g., CA-ON, US-TX)")
):
    """
    Validate if a proposed wage meets jurisdiction's minimum wage requirements.
    """
    validation = validate_wage_compliance(hourly_rate, jurisdiction_code.upper())
    
    return {
        "success": True,
        "data": validation
    }


@router.get("/workplace/{workplace_id}/jurisdiction")
async def get_workplace_jurisdiction(
    workplace_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get jurisdiction and compliance info for a specific workplace.
    Automatically detects jurisdiction from workplace address.
    """
    workplace = await db.workplaces.find_one(
        {"workplace_id": workplace_id},
        {"_id": 0}
    )
    
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")
    
    # Enrich with jurisdiction info
    jurisdiction_info = enrich_with_jurisdiction(workplace_data=workplace)
    
    return {
        "success": True,
        "data": {
            "workplace_id": workplace_id,
            "workplace_name": workplace.get("workplace_name"),
            "address": {
                "city": workplace.get("city"),
                "province": workplace.get("province"),
                "postal_code": workplace.get("postal_code"),
                "country": workplace.get("country", "Canada")
            },
            "jurisdiction": jurisdiction_info
        }
    }


@router.get("/role/{role_id}/jurisdiction")
async def get_role_jurisdiction(
    role_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get jurisdiction and compliance info for a specific role.
    Jurisdiction is determined by the workplace where the role is performed.
    """
    role = await db.workplace_roles.find_one(
        {"role_id": role_id},
        {"_id": 0}
    )
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Get workplace if role has one
    workplace = None
    if role.get("workplace_id"):
        workplace = await db.workplaces.find_one(
            {"workplace_id": role["workplace_id"]},
            {"_id": 0}
        )
    
    # If no workplace, try employer's default location
    if not workplace:
        employer_profile = await db.employer_profiles.find_one(
            {"employer_id": role.get("employer_id")},
            {"_id": 0, "province": 1, "city": 1, "postal_code": 1, "country": 1}
        )
        if employer_profile:
            workplace = employer_profile
    
    # Enrich with jurisdiction info
    jurisdiction_info = enrich_with_jurisdiction(
        workplace_data=workplace,
        role_data=role
    )
    
    # Validate current wage if set
    wage_validation = None
    if role.get("hourly_rate") and jurisdiction_info.get("minimum_wage"):
        wage_validation = validate_wage_compliance(
            role["hourly_rate"],
            jurisdiction_info["jurisdiction_code"]
        )
    
    return {
        "success": True,
        "data": {
            "role_id": role_id,
            "role_name": role.get("role_name"),
            "hourly_rate": role.get("hourly_rate"),
            "jurisdiction": jurisdiction_info,
            "wage_compliance": wage_validation
        }
    }


@router.get("/employer/jurisdictions")
async def get_employer_jurisdictions(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all jurisdictions where this employer has workplaces.
    Useful for understanding compliance obligations across locations.
    """
    employer_id = current_user["user_id"]
    
    # Get all workplaces
    workplaces = await db.workplaces.find(
        {"employer_id": employer_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get unique jurisdictions
    jurisdictions_map = {}
    for wp in workplaces:
        jurisdiction_info = enrich_with_jurisdiction(workplace_data=wp)
        code = jurisdiction_info["jurisdiction_code"]
        
        if code not in jurisdictions_map:
            jurisdictions_map[code] = {
                **jurisdiction_info,
                "workplaces": [],
                "roles_count": 0
            }
        
        jurisdictions_map[code]["workplaces"].append({
            "workplace_id": wp.get("workplace_id"),
            "workplace_name": wp.get("workplace_name"),
            "city": wp.get("city")
        })
    
    # Get role counts per jurisdiction
    for code in jurisdictions_map:
        workplace_ids = [w["workplace_id"] for w in jurisdictions_map[code]["workplaces"]]
        roles_count = await db.workplace_roles.count_documents({
            "employer_id": employer_id,
            "workplace_id": {"$in": workplace_ids}
        })
        jurisdictions_map[code]["roles_count"] = roles_count
    
    return {
        "success": True,
        "data": {
            "jurisdictions": list(jurisdictions_map.values()),
            "total_jurisdictions": len(jurisdictions_map),
            "total_workplaces": len(workplaces)
        }
    }


@router.get("/global-summary")
async def get_global_compliance_summary(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get a global compliance summary based on user type.
    
    For employers: Summary of compliance across all workplaces & jurisdictions
    For workforce: Compliance info and worker rights for their work locations
    """
    user_type = current_user.get("user_type")
    user_id = current_user["user_id"]
    
    if user_type == "employer":
        # Get employer's workplaces and roles
        workplaces = await db.workplaces.find(
            {"employer_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        roles = await db.workplace_roles.find(
            {"employer_id": user_id},
            {"_id": 0, "role_id": 1, "role_name": 1, "hourly_rate": 1, "workplace_id": 1}
        ).to_list(500)
        
        # Build compliance summary
        issues = []
        jurisdictions_used = set()
        
        for role in roles:
            wp = next((w for w in workplaces if w.get("workplace_id") == role.get("workplace_id")), None)
            jurisdiction_info = enrich_with_jurisdiction(workplace_data=wp, role_data=role)
            jurisdictions_used.add(jurisdiction_info["jurisdiction_code"])
            
            # Check wage compliance
            if role.get("hourly_rate") and jurisdiction_info.get("minimum_wage"):
                validation = validate_wage_compliance(
                    role["hourly_rate"],
                    jurisdiction_info["jurisdiction_code"]
                )
                if not validation["compliant"]:
                    issues.append({
                        "type": "wage_below_minimum",
                        "role_id": role["role_id"],
                        "role_name": role["role_name"],
                        "current_rate": role["hourly_rate"],
                        "minimum_required": validation["minimum_wage"],
                        "jurisdiction": jurisdiction_info["jurisdiction_name"]
                    })
        
        return {
            "success": True,
            "data": {
                "compliant": len(issues) == 0,
                "issues": issues,
                "jurisdictions_count": len(jurisdictions_used),
                "jurisdictions": list(jurisdictions_used),
                "workplaces_count": len(workplaces),
                "roles_count": len(roles)
            }
        }
    
    elif user_type == "workforce":
        # Get workforce's occupation profiles and employment
        profile = await db.workforce_profiles.find_one(
            {"workforce_id": user_id},
            {"_id": 0}
        )
        
        # Get current employment jurisdiction
        if profile and profile.get("current_employer_id"):
            # Get employer's workplace
            workplace = await db.workplaces.find_one(
                {"employer_id": profile["current_employer_id"]},
                {"_id": 0}
            )
            
            jurisdiction_info = enrich_with_jurisdiction(workplace_data=workplace)
            
            return {
                "success": True,
                "data": {
                    "current_jurisdiction": jurisdiction_info,
                    "rights_summary": {
                        "minimum_wage": jurisdiction_info.get("minimum_wage"),
                        "currency": jurisdiction_info.get("currency"),
                        "overtime_rules": jurisdiction_info.get("overtime_rules"),
                        "compliance_badges": jurisdiction_info.get("compliance_badges")
                    }
                }
            }
        
        return {
            "success": True,
            "data": {
                "current_jurisdiction": None,
                "message": "No current employment found"
            }
        }
    
    return {
        "success": True,
        "data": {
            "message": "Compliance summary not available for this user type"
        }
    }
