"""
Admin Messaging Routes
======================
Hierarchical chat system between admin accounts.
- Super Admin can chat with all admins
- Regional Managers can chat with admins in their region and one level up
- Other admins can chat with their supervisor and subordinates
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, List, Optional
from datetime import datetime, timezone
from auth.dependencies import get_current_user
import uuid

router = APIRouter(prefix="/admin-messaging", tags=["Admin Messaging"])

def get_db():
    from server import db
    return db

# Admin role hierarchy (higher number = higher level)
ROLE_HIERARCHY = {
    "super_admin": 100,
    "regional_manager": 80,
    "franchise_manager": 70,
    "compliance_officer": 60,
    "credentials_reviewer": 50,
    "account_activator": 40,
    "customer_service": 30
}


async def get_admin_info(user_id: str, db) -> Optional[dict]:
    """Get admin info including role and assigned regions"""
    admin = await db.admins.find_one({"user_id": user_id}, {"_id": 0})
    return admin


async def can_message(sender: dict, recipient: dict) -> bool:
    """
    Check if sender can message recipient based on hierarchy rules:
    - Super admin can message anyone
    - Others can message one level up (supervisor) and all levels below in their region
    """
    sender_level = ROLE_HIERARCHY.get(sender.get("role", "customer_service"), 30)
    recipient_level = ROLE_HIERARCHY.get(recipient.get("role", "customer_service"), 30)
    
    # Super admin can message anyone
    if sender.get("is_super_admin") or sender.get("role") == "super_admin":
        return True
    
    # Can always message one level up (supervisor)
    if recipient_level > sender_level:
        # Check if it's immediate supervisor or super admin
        if recipient.get("is_super_admin") or recipient.get("role") == "super_admin":
            return True
        # Check regional overlap for other supervisors
        sender_provinces = set(sender.get("assigned_provinces", []))
        recipient_provinces = set(recipient.get("assigned_provinces", []))
        if sender_provinces & recipient_provinces:  # Has overlap
            return True
    
    # Can message same level or below in same region
    if recipient_level <= sender_level:
        sender_provinces = set(sender.get("assigned_provinces", []))
        recipient_provinces = set(recipient.get("assigned_provinces", []))
        # Super admin has access to all
        if not sender_provinces:
            return True
        if sender_provinces & recipient_provinces:  # Has overlap
            return True
    
    return False


@router.get("/available-contacts", response_model=Dict)
async def get_available_contacts(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get list of admins current user can message"""
    
    if current_user.get("user_type") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    sender = await get_admin_info(current_user["user_id"], db)
    if not sender:
        raise HTTPException(status_code=404, detail="Admin profile not found")
    
    # Get all admins
    all_admins = await db.admins.find(
        {"user_id": {"$ne": current_user["user_id"]}},
        {"_id": 0}
    ).to_list(500)
    
    # Filter by messaging permissions
    contacts = []
    for admin in all_admins:
        if await can_message(sender, admin):
            contacts.append({
                "admin_id": admin.get("admin_id"),
                "user_id": admin.get("user_id"),
                "full_name": admin.get("full_name", "Unknown"),
                "email": admin.get("email"),
                "role": admin.get("role"),
                "profile_image": admin.get("profile_image"),
                "assigned_provinces": admin.get("assigned_provinces", []),
                "is_super_admin": admin.get("is_super_admin", False),
                "is_online": admin.get("is_online", False)
            })
    
    # Sort by role hierarchy (higher first), then by name
    contacts.sort(key=lambda x: (-ROLE_HIERARCHY.get(x.get("role", ""), 0), x.get("full_name", "")))
    
    return {
        "success": True,
        "data": {
            "contacts": contacts,
            "total": len(contacts)
        }
    }


@router.get("/threads", response_model=Dict)
async def get_admin_chat_threads(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get all chat threads for current admin"""
    
    if current_user.get("user_type") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    threads = await db.admin_chat_threads.find(
        {"participants": current_user["user_id"]},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)
    
    # Enrich with participant info
    for thread in threads:
        other_user_id = [p for p in thread.get("participants", []) if p != current_user["user_id"]]
        if other_user_id:
            other_admin = await db.admins.find_one(
                {"user_id": other_user_id[0]},
                {"_id": 0, "full_name": 1, "email": 1, "role": 1, "profile_image": 1}
            )
            thread["other_participant"] = other_admin or {}
        
        # Get unread count for current user
        thread["unread_count"] = thread.get(f"unread_{current_user['user_id']}", 0)
    
    total_unread = sum(t.get("unread_count", 0) for t in threads)
    
    return {
        "success": True,
        "data": {
            "threads": threads,
            "total_unread": total_unread
        }
    }


@router.post("/threads/create", response_model=Dict)
async def create_admin_chat_thread(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a new chat thread with another admin"""
    
    if current_user.get("user_type") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    recipient_user_id = data.get("recipient_user_id")
    if not recipient_user_id:
        raise HTTPException(status_code=400, detail="recipient_user_id required")
    
    # Check if sender can message recipient
    sender = await get_admin_info(current_user["user_id"], db)
    recipient = await get_admin_info(recipient_user_id, db)
    
    if not sender or not recipient:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    if not await can_message(sender, recipient):
        raise HTTPException(status_code=403, detail="Not authorized to message this admin")
    
    # Check for existing thread
    existing = await db.admin_chat_threads.find_one({
        "participants": {"$all": [current_user["user_id"], recipient_user_id]}
    })
    
    if existing:
        return {
            "success": True,
            "data": {"thread_id": existing.get("thread_id")},
            "message": "Thread already exists"
        }
    
    # Create new thread
    thread_id = f"adm_thread_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    thread = {
        "thread_id": thread_id,
        "participants": [current_user["user_id"], recipient_user_id],
        "created_by": current_user["user_id"],
        "created_at": now,
        "last_message_at": now,
        "last_message_preview": "",
        f"unread_{current_user['user_id']}": 0,
        f"unread_{recipient_user_id}": 0
    }
    
    await db.admin_chat_threads.insert_one(thread)
    
    return {
        "success": True,
        "data": {"thread_id": thread_id},
        "message": "Thread created"
    }


@router.get("/threads/{thread_id}/messages", response_model=Dict)
async def get_thread_messages(
    thread_id: str,
    limit: int = Query(50, le=100),
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get messages in a thread"""
    
    if current_user.get("user_type") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify user is participant
    thread = await db.admin_chat_threads.find_one({
        "thread_id": thread_id,
        "participants": current_user["user_id"]
    })
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    query = {"thread_id": thread_id}
    if before:
        query["sent_at"] = {"$lt": before}
    
    messages = await db.admin_chat_messages.find(
        query,
        {"_id": 0}
    ).sort("sent_at", -1).limit(limit).to_list(limit)
    
    # Mark as read
    await db.admin_chat_threads.update_one(
        {"thread_id": thread_id},
        {"$set": {f"unread_{current_user['user_id']}": 0}}
    )
    
    return {
        "success": True,
        "data": {
            "messages": list(reversed(messages)),
            "thread_id": thread_id
        }
    }


@router.post("/threads/{thread_id}/messages", response_model=Dict)
async def send_admin_message(
    thread_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Send a message in a thread"""
    
    if current_user.get("user_type") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    message_text = data.get("message", "").strip()
    if not message_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Verify user is participant
    thread = await db.admin_chat_threads.find_one({
        "thread_id": thread_id,
        "participants": current_user["user_id"]
    })
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Get sender info
    sender = await get_admin_info(current_user["user_id"], db)
    
    now = datetime.now(timezone.utc).isoformat()
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    
    message = {
        "message_id": message_id,
        "thread_id": thread_id,
        "sender_id": current_user["user_id"],
        "sender_name": sender.get("full_name", "Admin") if sender else "Admin",
        "message": message_text,
        "sent_at": now,
        "read_by": [current_user["user_id"]]
    }
    
    await db.admin_chat_messages.insert_one(message)
    
    # Update thread
    other_participants = [p for p in thread["participants"] if p != current_user["user_id"]]
    update = {
        "last_message_at": now,
        "last_message_preview": message_text[:100]
    }
    
    # Increment unread for other participants
    inc_update = {}
    for participant in other_participants:
        inc_update[f"unread_{participant}"] = 1
    
    await db.admin_chat_threads.update_one(
        {"thread_id": thread_id},
        {"$set": update, "$inc": inc_update}
    )
    
    # Create notification for recipient
    for recipient_id in other_participants:
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": recipient_id,
            "type": "admin_message",
            "title": f"New message from {sender.get('full_name', 'Admin')}",
            "message": message_text[:100],
            "data": {"thread_id": thread_id},
            "read": False,
            "created_date": now
        })
    
    return {
        "success": True,
        "data": {
            "message_id": message_id,
            "sent_at": now
        }
    }


@router.put("/threads/{thread_id}/read", response_model=Dict)
async def mark_thread_read(
    thread_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Mark all messages in thread as read"""
    
    if current_user.get("user_type") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify user is participant
    thread = await db.admin_chat_threads.find_one({
        "thread_id": thread_id,
        "participants": current_user["user_id"]
    })
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Reset unread count
    await db.admin_chat_threads.update_one(
        {"thread_id": thread_id},
        {"$set": {f"unread_{current_user['user_id']}": 0}}
    )
    
    # Mark messages as read
    await db.admin_chat_messages.update_many(
        {
            "thread_id": thread_id,
            "read_by": {"$ne": current_user["user_id"]}
        },
        {"$addToSet": {"read_by": current_user["user_id"]}}
    )
    
    return {
        "success": True,
        "message": "Thread marked as read"
    }
