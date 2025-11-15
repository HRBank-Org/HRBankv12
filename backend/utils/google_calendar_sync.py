"""
Utility functions for Google Calendar sync
Automatically syncs events when created/updated/deleted
"""
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
import os

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
SCOPES = ['https://www.googleapis.com/auth/calendar']

async def get_google_service(user_id: str, db):
    """Get Google Calendar service for user if connected"""
    try:
        user = await db.users.find_one({"user_id": user_id})
        
        if not user or 'google_tokens' not in user or not user.get('google_calendar_connected'):
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
            creds.refresh(GoogleRequest())
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"google_tokens.access_token": creds.token}}
            )
        
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        print(f"Google Calendar service error: {e}")
        return None

async def sync_availability_to_google(event_id: str, user_id: str, db):
    """Automatically sync availability event to Google Calendar"""
    try:
        service = await get_google_service(user_id, db)
        if not service:
            return  # User hasn't connected Google Calendar
        
        event = await db.availability_events.find_one({"event_id": event_id})
        if not event:
            return
        
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
            'colorId': '2' if event.get('type') == 'available' else '11'
        }
        
        if event.get('google_event_id'):
            # Update
            service.events().update(
                calendarId='primary',
                eventId=event['google_event_id'],
                body=google_event
            ).execute()
        else:
            # Create
            result = service.events().insert(
                calendarId='primary',
                body=google_event
            ).execute()
            
            await db.availability_events.update_one(
                {"event_id": event_id},
                {"$set": {"google_event_id": result['id']}}
            )
    except Exception as e:
        print(f"Failed to sync availability to Google: {e}")

async def sync_shift_to_google(shift_id: str, user_id: str, db):
    """Automatically sync shift to Google Calendar"""
    try:
        service = await get_google_service(user_id, db)
        if not service:
            return
        
        shift = await db.shifts.find_one({"shift_id": shift_id})
        if not shift:
            return
        
        workplace = await db.workplaces.find_one({"workplace_id": shift.get('workplace_id')})
        workplace_name = workplace.get('business_name', 'Workplace') if workplace else 'Workplace'
        
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
            'colorId': '9'
        }
        
        if shift.get('google_event_id'):
            service.events().update(
                calendarId='primary',
                eventId=shift['google_event_id'],
                body=google_event
            ).execute()
        else:
            result = service.events().insert(
                calendarId='primary',
                body=google_event
            ).execute()
            
            await db.shifts.update_one(
                {"shift_id": shift_id},
                {"$set": {"google_event_id": result['id']}}
            )
    except Exception as e:
        print(f"Failed to sync shift to Google: {e}")

async def delete_from_google(google_event_id: str, user_id: str, db):
    """Delete event from Google Calendar"""
    try:
        service = await get_google_service(user_id, db)
        if not service or not google_event_id:
            return
        
        service.events().delete(
            calendarId='primary',
            eventId=google_event_id
        ).execute()
    except Exception as e:
        print(f"Failed to delete from Google Calendar: {e}")
