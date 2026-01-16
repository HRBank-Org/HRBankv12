"""
Support Ticket System API
Allows all user types to create and manage support tickets.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import Dict, Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from enum import Enum
import uuid

from auth.dependencies import require_role

router = APIRouter(prefix="/support", tags=["Support Tickets"])


def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


# Enums
class TicketCategory(str, Enum):
    ACCOUNT = "account"
    DOCUMENTS = "documents"
    VERIFICATION = "verification"
    PAYMENTS = "payments"
    TECHNICAL = "technical"
    SHIFTS = "shifts"
    CREDENTIALS = "credentials"
    FEATURE_REQUEST = "feature_request"
    GENERAL = "general"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_USER = "waiting_user"
    RESOLVED = "resolved"
    CLOSED = "closed"


# Request Models
class CreateTicketRequest(BaseModel):
    category: TicketCategory
    subject: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=20, max_length=5000)
    priority: TicketPriority = TicketPriority.MEDIUM


class TicketReplyRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)


# Category descriptions for users
CATEGORY_INFO = {
    TicketCategory.ACCOUNT: {
        "name": "Account Issues",
        "description": "Login problems, profile updates, password reset",
        "icon": "user"
    },
    TicketCategory.DOCUMENTS: {
        "name": "Document Verification",
        "description": "ID verification, document uploads, expiry issues",
        "icon": "file-text"
    },
    TicketCategory.VERIFICATION: {
        "name": "Credential Verification",
        "description": "Certificate verification, credential issues",
        "icon": "shield-check"
    },
    TicketCategory.PAYMENTS: {
        "name": "Payments & Billing",
        "description": "Payment issues, invoices, refunds",
        "icon": "credit-card"
    },
    TicketCategory.TECHNICAL: {
        "name": "Technical Problems",
        "description": "App errors, bugs, performance issues",
        "icon": "settings"
    },
    TicketCategory.SHIFTS: {
        "name": "Shifts & Scheduling",
        "description": "Shift issues, attendance, time tracking",
        "icon": "calendar"
    },
    TicketCategory.CREDENTIALS: {
        "name": "WorkPassport & Credentials",
        "description": "WorkPassport issues, credential display",
        "icon": "award"
    },
    TicketCategory.FEATURE_REQUEST: {
        "name": "Feature Request",
        "description": "Suggest new features or improvements",
        "icon": "lightbulb"
    },
    TicketCategory.GENERAL: {
        "name": "General Inquiry",
        "description": "Other questions or feedback",
        "icon": "message-circle"
    }
}


# Helper functions
def generate_ticket_id() -> str:
    """Generate a user-friendly ticket ID"""
    return f"TKT-{uuid.uuid4().hex[:8].upper()}"


async def get_user_profile_info(user_id: str, user_type: str, db) -> dict:
    """Get user profile information for ticket context"""
    if user_type == "workforce":
        profile = await db.workforce_profiles.find_one({"workforce_id": user_id})
        if profile:
            return {
                "full_name": profile.get("full_name"),
                "phone": profile.get("phone"),
                "city": profile.get("city"),
                "province": profile.get("province")
            }
    elif user_type == "employer":
        profile = await db.employer_profiles.find_one({"employer_id": user_id})
        if profile:
            return {
                "full_name": profile.get("full_name") or profile.get("contact_name"),
                "company_name": profile.get("company_name"),
                "phone": profile.get("phone")
            }
    elif user_type == "institution":
        profile = await db.institution_profiles.find_one({"institution_id": user_id})
        if profile:
            return {
                "full_name": profile.get("contact_name"),
                "institution_name": profile.get("institution_name"),
                "phone": profile.get("phone")
            }
    return {}


# ==================== USER ENDPOINTS ====================

@router.get("/categories")
async def get_ticket_categories():
    """Get available ticket categories with descriptions"""
    return {
        "success": True,
        "data": {
            "categories": [
                {
                    "value": cat.value,
                    **CATEGORY_INFO[cat]
                }
                for cat in TicketCategory
            ]
        }
    }


@router.post("/tickets")
async def create_ticket(
    ticket_data: CreateTicketRequest,
    current_user: dict = Depends(require_role("workforce", "employer", "institution")),
    db = Depends(get_db)
):
    """Create a new support ticket"""
    
    # Get user profile info
    profile_info = await get_user_profile_info(
        current_user["user_id"],
        current_user["user_type"],
        db
    )
    
    ticket_id = generate_ticket_id()
    now = datetime.now(timezone.utc).isoformat()
    
    ticket = {
        "ticket_id": ticket_id,
        "user_id": current_user["user_id"],
        "user_email": current_user["email"],
        "user_type": current_user["user_type"],
        "user_name": profile_info.get("full_name") or current_user["email"].split("@")[0],
        "user_profile": profile_info,
        
        "category": ticket_data.category.value,
        "subject": ticket_data.subject,
        "description": ticket_data.description,
        "priority": ticket_data.priority.value,
        "status": TicketStatus.OPEN.value,
        
        "messages": [
            {
                "message_id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": current_user["user_id"],
                "sender_type": "user",
                "sender_name": profile_info.get("full_name") or current_user["email"],
                "message": ticket_data.description,
                "timestamp": now,
                "is_internal": False
            }
        ],
        
        "assigned_admin_id": None,
        "assigned_admin_name": None,
        "assigned_date": None,
        
        "created_date": now,
        "updated_date": now,
        "resolved_date": None,
        "closed_date": None,
        
        "satisfaction_rating": None,
        "satisfaction_feedback": None
    }
    
    await db.support_tickets.insert_one(ticket)
    
    # Create notification for admins
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": "admin_broadcast",
        "type": "new_support_ticket",
        "title": f"New Support Ticket: {ticket_id}",
        "message": f"New {ticket_data.priority.value} priority ticket from {current_user['user_type']}: {ticket_data.subject[:50]}",
        "data": {"ticket_id": ticket_id},
        "read": False,
        "created_date": now
    })
    
    # Log to audit
    from services.audit_logger import audit_logger, AuditEventType
    await audit_logger.log(
        event_type=AuditEventType.DATA_CREATE,
        action="create_support_ticket",
        description=f"Created support ticket {ticket_id}",
        actor_id=current_user["user_id"],
        actor_email=current_user["email"],
        actor_type=current_user["user_type"],
        target_type="support_ticket",
        target_id=ticket_id,
        metadata={"category": ticket_data.category.value, "priority": ticket_data.priority.value}
    )
    
    return {
        "success": True,
        "data": {
            "ticket_id": ticket_id,
            "status": "open",
            "message": "Your support ticket has been submitted. We'll respond within 24-48 hours."
        }
    }


@router.get("/tickets")
async def get_my_tickets(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50),
    current_user: dict = Depends(require_role("workforce", "employer", "institution")),
    db = Depends(get_db)
):
    """Get user's support tickets"""
    
    query = {"user_id": current_user["user_id"]}
    if status:
        query["status"] = status
    
    total = await db.support_tickets.count_documents(query)
    
    tickets = await db.support_tickets.find(
        query,
        {"_id": 0, "messages": 0}  # Exclude full messages in list view
    ).sort("updated_date", -1).skip((page - 1) * limit).limit(limit).to_list(length=limit)
    
    # Add unread indicator
    for ticket in tickets:
        # Check if last message is from admin
        full_ticket = await db.support_tickets.find_one({"ticket_id": ticket["ticket_id"]})
        if full_ticket and full_ticket.get("messages"):
            last_msg = full_ticket["messages"][-1]
            ticket["has_new_response"] = last_msg.get("sender_type") == "admin"
            ticket["last_message_date"] = last_msg.get("timestamp")
    
    return {
        "success": True,
        "data": {
            "tickets": tickets,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if total > 0 else 1
            }
        }
    }


@router.get("/tickets/{ticket_id}")
async def get_ticket_details(
    ticket_id: str,
    current_user: dict = Depends(require_role("workforce", "employer", "institution")),
    db = Depends(get_db)
):
    """Get ticket details including all messages"""
    
    ticket = await db.support_tickets.find_one(
        {"ticket_id": ticket_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Filter out internal admin notes
    if ticket.get("messages"):
        ticket["messages"] = [
            msg for msg in ticket["messages"]
            if not msg.get("is_internal", False)
        ]
    
    return {
        "success": True,
        "data": ticket
    }


@router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: str,
    reply_data: TicketReplyRequest,
    current_user: dict = Depends(require_role("workforce", "employer", "institution")),
    db = Depends(get_db)
):
    """Reply to a support ticket"""
    
    ticket = await db.support_tickets.find_one({
        "ticket_id": ticket_id,
        "user_id": current_user["user_id"]
    })
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket["status"] in [TicketStatus.CLOSED.value, TicketStatus.RESOLVED.value]:
        raise HTTPException(status_code=400, detail="Cannot reply to a closed ticket")
    
    # Get user profile
    profile_info = await get_user_profile_info(
        current_user["user_id"],
        current_user["user_type"],
        db
    )
    
    now = datetime.now(timezone.utc).isoformat()
    
    new_message = {
        "message_id": f"msg_{uuid.uuid4().hex[:8]}",
        "sender_id": current_user["user_id"],
        "sender_type": "user",
        "sender_name": profile_info.get("full_name") or current_user["email"],
        "message": reply_data.message,
        "timestamp": now,
        "is_internal": False
    }
    
    # Update ticket
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {
            "$push": {"messages": new_message},
            "$set": {
                "updated_date": now,
                "status": TicketStatus.OPEN.value if ticket["status"] == TicketStatus.WAITING_USER.value else ticket["status"]
            }
        }
    )
    
    # Notify assigned admin
    if ticket.get("assigned_admin_id"):
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": ticket["assigned_admin_id"],
            "type": "ticket_user_reply",
            "title": f"New Reply on Ticket {ticket_id}",
            "message": f"User replied to ticket: {ticket['subject'][:50]}",
            "data": {"ticket_id": ticket_id},
            "read": False,
            "created_date": now
        })
    
    return {
        "success": True,
        "message": "Reply sent successfully"
    }


@router.post("/tickets/{ticket_id}/close")
async def close_ticket(
    ticket_id: str,
    satisfaction_rating: Optional[int] = Query(None, ge=1, le=5),
    feedback: Optional[str] = Query(None),
    current_user: dict = Depends(require_role("workforce", "employer", "institution")),
    db = Depends(get_db)
):
    """Close a resolved ticket with optional satisfaction rating"""
    
    ticket = await db.support_tickets.find_one({
        "ticket_id": ticket_id,
        "user_id": current_user["user_id"]
    })
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket["status"] == TicketStatus.CLOSED.value:
        raise HTTPException(status_code=400, detail="Ticket is already closed")
    
    now = datetime.now(timezone.utc).isoformat()
    
    updates = {
        "status": TicketStatus.CLOSED.value,
        "closed_date": now,
        "updated_date": now
    }
    
    if satisfaction_rating:
        updates["satisfaction_rating"] = satisfaction_rating
    if feedback:
        updates["satisfaction_feedback"] = feedback
    
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": updates}
    )
    
    return {
        "success": True,
        "message": "Ticket closed successfully. Thank you for your feedback!"
    }


@router.post("/tickets/{ticket_id}/reopen")
async def reopen_ticket(
    ticket_id: str,
    reason: str = Query(..., min_length=10),
    current_user: dict = Depends(require_role("workforce", "employer", "institution")),
    db = Depends(get_db)
):
    """Reopen a closed/resolved ticket"""
    
    ticket = await db.support_tickets.find_one({
        "ticket_id": ticket_id,
        "user_id": current_user["user_id"]
    })
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket["status"] not in [TicketStatus.CLOSED.value, TicketStatus.RESOLVED.value]:
        raise HTTPException(status_code=400, detail="Only closed/resolved tickets can be reopened")
    
    # Get user profile
    profile_info = await get_user_profile_info(
        current_user["user_id"],
        current_user["user_type"],
        db
    )
    
    now = datetime.now(timezone.utc).isoformat()
    
    reopen_message = {
        "message_id": f"msg_{uuid.uuid4().hex[:8]}",
        "sender_id": current_user["user_id"],
        "sender_type": "user",
        "sender_name": profile_info.get("full_name") or current_user["email"],
        "message": f"[Ticket Reopened]\n\n{reason}",
        "timestamp": now,
        "is_internal": False
    }
    
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {
            "$push": {"messages": reopen_message},
            "$set": {
                "status": TicketStatus.OPEN.value,
                "updated_date": now,
                "closed_date": None,
                "resolved_date": None
            }
        }
    )
    
    return {
        "success": True,
        "message": "Ticket reopened successfully"
    }


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/tickets")
async def admin_list_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    user_type: Optional[str] = Query(None),
    assigned_to_me: bool = Query(False),
    unassigned_only: bool = Query(False),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(30, le=100),
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Admin: List all support tickets with filters"""
    
    query = {}
    
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if category:
        query["category"] = category
    if user_type:
        query["user_type"] = user_type
    if assigned_to_me:
        query["assigned_admin_id"] = current_user["user_id"]
    if unassigned_only:
        query["assigned_admin_id"] = None
    if search:
        query["$or"] = [
            {"ticket_id": {"$regex": search, "$options": "i"}},
            {"subject": {"$regex": search, "$options": "i"}},
            {"user_email": {"$regex": search, "$options": "i"}},
            {"user_name": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.support_tickets.count_documents(query)
    
    tickets = await db.support_tickets.find(
        query,
        {"_id": 0}
    ).sort([("priority_order", -1), ("updated_date", -1)]).skip((page - 1) * limit).limit(limit).to_list(length=limit)
    
    # Add message count
    for ticket in tickets:
        ticket["message_count"] = len(ticket.get("messages", []))
        # Don't send full messages in list view
        ticket.pop("messages", None)
    
    # Get stats
    stats = {
        "total": total,
        "open": await db.support_tickets.count_documents({"status": "open"}),
        "in_progress": await db.support_tickets.count_documents({"status": "in_progress"}),
        "waiting_user": await db.support_tickets.count_documents({"status": "waiting_user"}),
        "unassigned": await db.support_tickets.count_documents({"assigned_admin_id": None, "status": {"$nin": ["closed", "resolved"]}})
    }
    
    return {
        "success": True,
        "data": {
            "tickets": tickets,
            "stats": stats,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if total > 0 else 1
            }
        }
    }


@router.get("/admin/tickets/{ticket_id}")
async def admin_get_ticket(
    ticket_id: str,
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Admin: Get full ticket details"""
    
    ticket = await db.support_tickets.find_one(
        {"ticket_id": ticket_id},
        {"_id": 0}
    )
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {
        "success": True,
        "data": ticket
    }


@router.post("/admin/tickets/{ticket_id}/reply")
async def admin_reply_to_ticket(
    ticket_id: str,
    reply_data: TicketReplyRequest,
    is_internal: bool = Query(False, description="Internal note (not visible to user)"),
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Admin: Reply to a support ticket"""
    
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Get admin name
    admin_profile = await db.users.find_one({"user_id": current_user["user_id"]})
    admin_name = admin_profile.get("full_name") if admin_profile else "Support Team"
    
    new_message = {
        "message_id": f"msg_{uuid.uuid4().hex[:8]}",
        "sender_id": current_user["user_id"],
        "sender_type": "admin",
        "sender_name": admin_name,
        "message": reply_data.message,
        "timestamp": now,
        "is_internal": is_internal
    }
    
    updates = {
        "updated_date": now
    }
    
    # Auto-assign if not assigned
    if not ticket.get("assigned_admin_id"):
        updates["assigned_admin_id"] = current_user["user_id"]
        updates["assigned_admin_name"] = admin_name
        updates["assigned_date"] = now
    
    # Update status to in_progress if was open
    if ticket["status"] == TicketStatus.OPEN.value and not is_internal:
        updates["status"] = TicketStatus.IN_PROGRESS.value
    
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {
            "$push": {"messages": new_message},
            "$set": updates
        }
    )
    
    # Notify user (if not internal note)
    if not is_internal:
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": ticket["user_id"],
            "type": "ticket_response",
            "title": f"Response to Ticket #{ticket_id}",
            "message": f"You have a new response to your support ticket: {ticket['subject'][:50]}",
            "data": {"ticket_id": ticket_id},
            "read": False,
            "created_date": now
        })
        
        # Send email notification
        try:
            from utils.email_service import email_service
            await email_service.send_ticket_response_email(
                to_email=ticket["user_email"],
                user_name=ticket.get("user_name", "User"),
                ticket_id=ticket_id,
                subject=ticket["subject"],
                response_preview=reply_data.message[:200]
            )
        except Exception as e:
            print(f"Failed to send ticket response email: {e}")
    
    return {
        "success": True,
        "message": "Reply sent successfully"
    }


@router.patch("/admin/tickets/{ticket_id}")
async def admin_update_ticket(
    ticket_id: str,
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assign_to: Optional[str] = Query(None),
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Admin: Update ticket status, priority, or assignment"""
    
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_date": now}
    
    if status:
        updates["status"] = status
        if status == TicketStatus.RESOLVED.value:
            updates["resolved_date"] = now
        elif status == TicketStatus.CLOSED.value:
            updates["closed_date"] = now
    
    if priority:
        updates["priority"] = priority
        # Set priority order for sorting
        priority_order = {"urgent": 4, "high": 3, "medium": 2, "low": 1}
        updates["priority_order"] = priority_order.get(priority, 2)
    
    if assign_to:
        admin = await db.users.find_one({"user_id": assign_to, "user_type": "admin"})
        if admin:
            updates["assigned_admin_id"] = assign_to
            updates["assigned_admin_name"] = admin.get("full_name", "Admin")
            updates["assigned_date"] = now
    
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": updates}
    )
    
    # Notify user of status change (if resolved/closed)
    if status in [TicketStatus.RESOLVED.value, TicketStatus.CLOSED.value]:
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": ticket["user_id"],
            "type": "ticket_status_change",
            "title": f"Ticket #{ticket_id} {status.replace('_', ' ').title()}",
            "message": f"Your support ticket has been marked as {status.replace('_', ' ')}",
            "data": {"ticket_id": ticket_id, "status": status},
            "read": False,
            "created_date": now
        })
    
    # Log admin action
    from services.audit_logger import audit_logger, AuditEventType
    await audit_logger.log(
        event_type=AuditEventType.ADMIN_ACTION,
        action="update_support_ticket",
        description=f"Updated ticket {ticket_id}",
        actor_id=current_user["user_id"],
        actor_email=current_user["email"],
        actor_type="admin",
        target_type="support_ticket",
        target_id=ticket_id,
        metadata={"updates": updates}
    )
    
    return {
        "success": True,
        "message": "Ticket updated successfully"
    }


@router.get("/admin/stats")
async def admin_ticket_stats(
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Admin: Get ticket statistics"""
    
    # Overall stats
    total = await db.support_tickets.count_documents({})
    
    # By status
    status_stats = {}
    for status in TicketStatus:
        status_stats[status.value] = await db.support_tickets.count_documents({"status": status.value})
    
    # By priority (open tickets only)
    priority_stats = {}
    for priority in TicketPriority:
        priority_stats[priority.value] = await db.support_tickets.count_documents({
            "priority": priority.value,
            "status": {"$nin": ["closed", "resolved"]}
        })
    
    # By category
    category_stats = {}
    for category in TicketCategory:
        category_stats[category.value] = await db.support_tickets.count_documents({"category": category.value})
    
    # By user type
    user_type_stats = {}
    for user_type in ["workforce", "employer", "institution"]:
        user_type_stats[user_type] = await db.support_tickets.count_documents({"user_type": user_type})
    
    # Avg satisfaction
    rated_tickets = await db.support_tickets.find(
        {"satisfaction_rating": {"$exists": True, "$ne": None}},
        {"satisfaction_rating": 1}
    ).to_list(length=10000)
    
    avg_satisfaction = 0
    if rated_tickets:
        avg_satisfaction = sum(t["satisfaction_rating"] for t in rated_tickets) / len(rated_tickets)
    
    # Unassigned count
    unassigned = await db.support_tickets.count_documents({
        "assigned_admin_id": None,
        "status": {"$nin": ["closed", "resolved"]}
    })
    
    return {
        "success": True,
        "data": {
            "total": total,
            "by_status": status_stats,
            "by_priority": priority_stats,
            "by_category": category_stats,
            "by_user_type": user_type_stats,
            "unassigned": unassigned,
            "average_satisfaction": round(avg_satisfaction, 2),
            "rated_count": len(rated_tickets)
        }
    }
