from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
from datetime import datetime, timezone
import requests
import os
from typing import Dict

router = APIRouter(prefix="/api/calendar", tags=["Google Calendar"])

# Google OAuth credentials
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
FRONTEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').replace(':8001', ':3000')
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
REDIRECT_URI = f"{BACKEND_URL}/api/calendar/google/callback"

SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_db():
    from server import db
    return db

async def get_google_credentials(user_id: str, db) -> Credentials:
    """Get and refresh Google credentials for user"""
    user = await db.users.find_one({"user_id": user_id})
    
    if not user or 'google_tokens' not in user:
        return None
    
    tokens = user['google_tokens']
    creds = Credentials(
        token=tokens.get('access_token'),
        refresh_token=tokens.get('refresh_token'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=SCOPES
    )
    
    # Refresh if expired
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            # Update tokens in database
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "google_tokens.access_token": creds.token,
                    "google_tokens.expiry": creds.expiry.isoformat() if creds.expiry else None
                }}
            )
        except Exception as e:
            print(f"Failed to refresh token: {e}")
            return None
    
    return creds

@router.get("/google/connect")
async def connect_google_calendar(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Start Google Calendar OAuth flow"""
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Calendar integration not configured"
        )
    
    # Generate OAuth URL
    auth_url = (
        f"https://accounts.google.com/o/oauth2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"response_type=code&"
        f"scope={' '.join(SCOPES)}&"
        f"access_type=offline&"
        f"prompt=consent&"
        f"state={current_user['user_id']}"
    )
    
    return {
        "success": True,
        "data": {
            "authorization_url": auth_url
        }
    }

@router.get("/google/callback")
async def google_calendar_callback(
    code: str,
    state: str,
    db = Depends(get_db)
):
    """Handle Google OAuth callback"""
    
    try:
        # Exchange code for tokens
        token_resp = requests.post('https://oauth2.googleapis.com/token', data={
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri': REDIRECT_URI,
            'grant_type': 'authorization_code'
        })
        
        if token_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange code for tokens"
            )
        
        tokens = token_resp.json()
        
        # Get user email
        user_info = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {tokens["access_token"]}'}
        ).json()
        
        # Save tokens to user (using state as user_id)
        user_id = state
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "google_tokens": tokens,
                "google_calendar_connected": True,
                "google_calendar_email": user_info.get('email')
            }}
        )
        
        # Redirect back to frontend
        return RedirectResponse(f"{FRONTEND_URL}/settings?google_calendar=connected")
    
    except Exception as e:
        print(f"OAuth callback error: {e}")
        return RedirectResponse(f"{FRONTEND_URL}/settings?google_calendar=error")

@router.get("/google/status")
async def get_google_calendar_status(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Check if user has connected Google Calendar"""
    
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    connected = user.get('google_calendar_connected', False) if user else False
    
    return {
        "success": True,
        "data": {
            "connected": connected,
            "email": user.get('google_calendar_email') if connected else None
        }
    }

@router.post("/google/disconnect")
async def disconnect_google_calendar(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Disconnect Google Calendar"""
    
    # Revoke token
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    if user and 'google_tokens' in user:
        try:
            token = user['google_tokens'].get('access_token')
            requests.post(
                f'https://oauth2.googleapis.com/revoke?token={token}',
                headers={'content-type': 'application/x-www-form-urlencoded'}
            )
        except:
            pass
    
    # Remove tokens from database
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$unset": {
            "google_tokens": "",
            "google_calendar_connected": "",
            "google_calendar_email": ""
        }}
    )
    
    return {
        "success": True,
        "message": "Google Calendar disconnected"
    }

@router.post("/sync/availability/{event_id}")
async def sync_availability_to_google(
    event_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Sync a single availability event to Google Calendar"""
    
    # Get credentials
    creds = await get_google_credentials(current_user["user_id"], db)
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected"
        )
    
    # Get availability event
    event = await db.availability_events.find_one({"event_id": event_id})
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        
        # Create Google Calendar event
        google_event = {
            'summary': f"Available: {event.get('title', 'Work Availability')}",
            'description': f"HR Bank Availability - {event.get('type', 'available')}",
            'start': {
                'dateTime': event['start_time'],
                'timeZone': 'UTC'
            },
            'end': {
                'dateTime': event['end_time'],
                'timeZone': 'UTC'
            },
            'colorId': '2' if event.get('type') == 'available' else '11'  # Green for available, Red for blackout
        }
        
        # Check if already synced
        if event.get('google_event_id'):
            # Update existing
            result = service.events().update(
                calendarId='primary',
                eventId=event['google_event_id'],
                body=google_event
            ).execute()
        else:
            # Create new
            result = service.events().insert(
                calendarId='primary',
                body=google_event
            ).execute()
            
            # Save Google event ID
            await db.availability_events.update_one(
                {"event_id": event_id},
                {"$set": {"google_event_id": result['id']}}
            )
        
        return {
            "success": True,
            "message": "Event synced to Google Calendar",
            "data": {"google_event_id": result['id']}
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync to Google Calendar: {str(e)}"
        )

@router.delete("/sync/availability/{event_id}")
async def remove_availability_from_google(
    event_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Remove availability event from Google Calendar"""
    
    # Get credentials
    creds = await get_google_credentials(current_user["user_id"], db)
    if not creds:
        return {"success": True, "message": "Google Calendar not connected"}
    
    # Get availability event
    event = await db.availability_events.find_one({"event_id": event_id})
    if not event or not event.get('google_event_id'):
        return {"success": True, "message": "Event not synced to Google"}
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        service.events().delete(
            calendarId='primary',
            eventId=event['google_event_id']
        ).execute()
        
        return {
            "success": True,
            "message": "Event removed from Google Calendar"
        }
    except Exception as e:
        print(f"Failed to delete from Google Calendar: {e}")
        return {"success": True, "message": "Event removal attempted"}

@router.post("/sync/shift/{shift_id}")
async def sync_shift_to_google(
    shift_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Sync a shift to employer's Google Calendar"""
    
    # Get credentials
    creds = await get_google_credentials(current_user["user_id"], db)
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected"
        )
    
    # Get shift
    shift = await db.shifts.find_one({"shift_id": shift_id})
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    
    # Get workplace details
    workplace = await db.workplaces.find_one({"workplace_id": shift.get('workplace_id')})
    workplace_name = workplace.get('business_name', 'Workplace') if workplace else 'Workplace'
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        
        # Create Google Calendar event
        google_event = {
            'summary': f"Shift: {shift.get('title', 'Work Shift')}",
            'description': f"HR Bank Shift at {workplace_name}\n{shift.get('description', '')}",
            'location': workplace.get('address', '') if workplace else '',
            'start': {
                'dateTime': shift['start_time'],
                'timeZone': 'UTC'
            },
            'end': {
                'dateTime': shift['end_time'],
                'timeZone': 'UTC'
            },
            'colorId': '9'  # Blue for shifts
        }
        
        # Check if already synced
        if shift.get('google_event_id'):
            # Update existing
            result = service.events().update(
                calendarId='primary',
                eventId=shift['google_event_id'],
                body=google_event
            ).execute()
        else:
            # Create new
            result = service.events().insert(
                calendarId='primary',
                body=google_event
            ).execute()
            
            # Save Google event ID
            await db.shifts.update_one(
                {"shift_id": shift_id},
                {"$set": {"google_event_id": result['id']}}
            )
        
        return {
            "success": True,
            "message": "Shift synced to Google Calendar",
            "data": {"google_event_id": result['id']}
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync to Google Calendar: {str(e)}"
        )
