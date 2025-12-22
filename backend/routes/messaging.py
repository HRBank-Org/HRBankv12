from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from models.messaging import ChatThread, Message
from typing import Dict, List
from datetime import datetime
from uuid import uuid4

router = APIRouter(prefix="/messages", tags=["Messaging"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


@router.post("/threads/create", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_direct_thread(
    thread_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Create a direct chat thread between employer and workforce member.
    Employer can start chat with any team member.
    Workforce can start chat with their employer.
    """
    user_id = current_user["user_id"]
    user_type = current_user["user_type"]
    target_user_id = thread_data.get("target_user_id")
    initial_message = thread_data.get("message", "")
    
    if not target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_user_id is required"
        )
    
    # Determine employer_id and workforce_id based on who is initiating
    if user_type == "employer":
        employer_id = user_id
        workforce_id = target_user_id
        
        # Verify workforce is part of employer's team
        team_member = await db.team_assignments.find_one({
            "employer_id": employer_id,
            "workforce_id": workforce_id,
            "status": "active"
        })
        if not team_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only message team members"
            )
    elif user_type == "workforce":
        workforce_id = user_id
        employer_id = target_user_id
        
        # Verify employer relationship exists
        team_member = await db.team_assignments.find_one({
            "employer_id": employer_id,
            "workforce_id": workforce_id,
            "status": "active"
        })
        if not team_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only message your employer"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user type for direct messaging"
        )
    
    # Check if thread already exists between these users
    existing_thread = await db.chat_threads.find_one({
        "employer_id": employer_id,
        "workforce_id": workforce_id
    })
    
    if existing_thread:
        # If there's an initial message, send it to existing thread
        if initial_message:
            to_user_id = workforce_id if user_type == "employer" else employer_id
            message = Message(
                thread_id=existing_thread["thread_id"],
                from_user_id=user_id,
                from_user_type=user_type,
                to_user_id=to_user_id,
                message_text=initial_message,
                delivered=True,
                delivered_at=datetime.utcnow()
            )
            await db.messages.insert_one(message.model_dump())
            
            # Update thread
            update_field = "workforce_unread_count" if user_type == "employer" else "employer_unread_count"
            await db.chat_threads.update_one(
                {"thread_id": existing_thread["thread_id"]},
                {
                    "$set": {
                        "last_message": initial_message[:100],
                        "last_message_at": datetime.utcnow().isoformat(),
                        "last_message_from": user_id
                    },
                    "$inc": {update_field: 1}
                }
            )
        
        return {
            "success": True,
            "data": {"thread_id": existing_thread["thread_id"]},
            "message": "Thread already exists"
        }
    
    # Get user names for the thread
    if user_type == "employer":
        employer_profile = await db.employer_profiles.find_one({"employer_id": employer_id})
        workforce_profile = await db.workforce_profiles.find_one({"workforce_id": workforce_id})
        employer_name = employer_profile.get("company_name") if employer_profile else "Employer"
        workforce_name = workforce_profile.get("full_name") if workforce_profile else "Worker"
    else:
        employer_profile = await db.employer_profiles.find_one({"employer_id": employer_id})
        workforce_profile = await db.workforce_profiles.find_one({"workforce_id": workforce_id})
        employer_name = employer_profile.get("company_name") if employer_profile else "Employer"
        workforce_name = workforce_profile.get("full_name") if workforce_profile else "Worker"
    
    # Create new thread
    thread_id = f"thread_{uuid4().hex[:12]}"
    new_thread = {
        "thread_id": thread_id,
        "employer_id": employer_id,
        "workforce_id": workforce_id,
        "employer_name": employer_name,
        "workforce_name": workforce_name,
        "other_user_name": workforce_name if user_type == "employer" else employer_name,
        "created_at": datetime.utcnow().isoformat(),
        "last_message": initial_message[:100] if initial_message else "",
        "last_message_at": datetime.utcnow().isoformat(),
        "last_message_from": user_id if initial_message else None,
        "employer_unread_count": 1 if user_type == "workforce" and initial_message else 0,
        "workforce_unread_count": 1 if user_type == "employer" and initial_message else 0
    }
    
    await db.chat_threads.insert_one(new_thread)
    
    # Send initial message if provided
    if initial_message:
        to_user_id = workforce_id if user_type == "employer" else employer_id
        message = Message(
            thread_id=thread_id,
            from_user_id=user_id,
            from_user_type=user_type,
            to_user_id=to_user_id,
            message_text=initial_message,
            delivered=True,
            delivered_at=datetime.utcnow()
        )
        await db.messages.insert_one(message.model_dump())
    
    return {
        "success": True,
        "data": {"thread_id": thread_id},
        "message": "Chat thread created"
    }


@router.get("/threads", response_model=Dict)
async def get_my_threads(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get all chat threads for current user (workforce or employer)
    """
    
    user_id = current_user["user_id"]
    user_type = current_user["user_type"]
    
    # Build query based on user type
    if user_type == "workforce":
        query = {"workforce_id": user_id}
    elif user_type == "employer":
        query = {"employer_id": user_id}
    elif user_type == "institution":
        query = {"institution_id": user_id}
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user type for messaging"
        )
    
    threads = await db.chat_threads.find(
        query,
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)
    
    return {
        "success": True,
        "data": {
            "threads": threads,
            "total_unread": sum(
                t.get("workforce_unread_count", 0) if user_type == "workforce" 
                else t.get("employer_unread_count", 0) 
                for t in threads
            )
        }
    }

@router.get("/threads/{thread_id}/messages", response_model=Dict)
async def get_thread_messages(
    thread_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get all messages in a thread
    """
    
    # Verify user has access to this thread
    thread = await db.chat_threads.find_one({"thread_id": thread_id})
    
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )
    
    user_id = current_user["user_id"]
    if user_id not in [thread["workforce_id"], thread["employer_id"]]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get messages
    messages = await db.messages.find(
        {"thread_id": thread_id, "deleted": False},
        {"_id": 0}
    ).sort("created_date", 1).to_list(1000)
    
    # Mark messages as read
    user_type = current_user["user_type"]
    await db.messages.update_many(
        {
            "thread_id": thread_id,
            "to_user_id": user_id,
            "read": False
        },
        {
            "$set": {
                "read": True,
                "read_at": datetime.utcnow().isoformat()
            }
        }
    )
    
    # Reset unread count
    if user_type == "workforce":
        await db.chat_threads.update_one(
            {"thread_id": thread_id},
            {"$set": {"workforce_unread_count": 0}}
        )
    else:
        await db.chat_threads.update_one(
            {"thread_id": thread_id},
            {"$set": {"employer_unread_count": 0}}
        )
    
    return {
        "success": True,
        "data": {
            "thread": thread,
            "messages": messages
        }
    }

@router.post("/threads/{thread_id}/send", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def send_message(
    thread_id: str,
    message_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Send a message in a thread
    """
    
    # Verify thread access
    thread = await db.chat_threads.find_one({"thread_id": thread_id})
    
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )
    
    user_id = current_user["user_id"]
    user_type = current_user["user_type"]
    
    if user_id not in [thread["workforce_id"], thread["employer_id"]]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Determine recipient
    to_user_id = thread["employer_id"] if user_type == "workforce" else thread["workforce_id"]
    
    # Create message
    message = Message(
        thread_id=thread_id,
        from_user_id=user_id,
        from_user_type=user_type,
        to_user_id=to_user_id,
        message_text=message_data.get("message_text"),
        delivered=True,
        delivered_at=datetime.utcnow()
    )
    
    await db.messages.insert_one(message.model_dump())
    
    # Update thread
    if user_type == "workforce":
        await db.chat_threads.update_one(
            {"thread_id": thread_id},
            {
                "$set": {
                    "last_message": message_data.get("message_text")[:100],
                    "last_message_at": datetime.utcnow().isoformat(),
                    "last_message_from": user_id
                },
                "$inc": {"employer_unread_count": 1}
            }
        )
    else:
        await db.chat_threads.update_one(
            {"thread_id": thread_id},
            {
                "$set": {
                    "last_message": message_data.get("message_text")[:100],
                    "last_message_at": datetime.utcnow().isoformat(),
                    "last_message_from": user_id
                },
                "$inc": {"workforce_unread_count": 1}
            }
        )
    
    # TODO: Send push notification to recipient
    
    return {
        "success": True,
        "data": {
            "message_id": message.message_id
        },
        "message": "Message sent"
    }

@router.post("/bookings/{booking_id}/create-thread", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_thread_for_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Create chat thread for a booking (auto-created when job accepted)
    """
    
    # Get booking
    booking = await db.bookings.find_one({"booking_id": booking_id})
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Verify user is part of this booking
    user_id = current_user["user_id"]
    
    # Get role and shift info
    role = await db.roles.find_one({"role_id": booking["role_id"]})
    shift = await db.shifts.find_one({"shift_id": role["shift_id"]})
    workplace = await db.workplaces.find_one({"workplace_id": shift["workplace_id"]})
    
    # Check if thread already exists
    existing = await db.chat_threads.find_one({"booking_id": booking_id})
    if existing:
        return {
            "success": True,
            "data": {"thread_id": existing["thread_id"]},
            "message": "Thread already exists"
        }
    
    # Create thread
    thread = ChatThread(
        booking_id=booking_id,
        workforce_id=booking["workforce_id"],
        employer_id=workplace["employer_id"],
        shift_id=role["shift_id"],
        role_title=role["role_title"]
    )
    
    await db.chat_threads.insert_one(thread.model_dump())
    
    return {
        "success": True,
        "data": {"thread_id": thread.thread_id},
        "message": "Chat thread created"
    }
