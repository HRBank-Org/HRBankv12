"""
Notification Preferences Model
Stores user preferences for different notification types
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class NotificationChannel(BaseModel):
    """Individual notification channel settings"""
    email: bool = True
    sms: bool = True
    push: bool = True


class WorkerNotificationPreferences(BaseModel):
    """Notification preferences for workforce users"""
    user_id: str
    
    # Shift notifications
    shift_assigned: NotificationChannel = NotificationChannel()
    shift_time_changed: NotificationChannel = NotificationChannel()
    shift_cancelled: NotificationChannel = NotificationChannel()
    shift_reminder: NotificationChannel = NotificationChannel(sms=True, email=False, push=True)  # Default: SMS + Push only
    
    # Attendance notifications
    clock_in_confirmation: NotificationChannel = NotificationChannel(email=False, sms=True, push=True)  # Default: SMS + Push
    clock_out_summary: NotificationChannel = NotificationChannel()
    late_clock_in_alert: NotificationChannel = NotificationChannel()
    
    # Geofencing
    geofence_alert: NotificationChannel = NotificationChannel(email=False, sms=True, push=True)  # Default: SMS + Push (urgent)
    
    # Employment
    employment_status_change: NotificationChannel = NotificationChannel()
    
    # Timesheet & Payments
    timesheet_approved: NotificationChannel = NotificationChannel()
    payment_processed: NotificationChannel = NotificationChannel()
    
    # General
    promotional_messages: NotificationChannel = NotificationChannel(email=True, sms=False, push=False)  # Default: Email only
    platform_updates: NotificationChannel = NotificationChannel(email=True, sms=False, push=True)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class EmployerNotificationPreferences(BaseModel):
    """Notification preferences for employer users"""
    user_id: str
    
    # Shift management
    worker_assigned: NotificationChannel = NotificationChannel(email=True, sms=False, push=True)  # Default: Email + Push
    shift_fully_staffed: NotificationChannel = NotificationChannel(email=True, sms=False, push=True)
    shift_unfilled_reminder: NotificationChannel = NotificationChannel()
    worker_cancelled_shift: NotificationChannel = NotificationChannel()
    
    # Attendance monitoring
    worker_clocked_in: NotificationChannel = NotificationChannel(email=False, sms=False, push=True)  # Default: Push only
    worker_clocked_out: NotificationChannel = NotificationChannel(email=False, sms=False, push=True)
    late_clock_in: NotificationChannel = NotificationChannel(email=True, sms=True, push=True)  # Important
    missed_clock_in: NotificationChannel = NotificationChannel()
    
    # Geofencing
    geofence_violation: NotificationChannel = NotificationChannel(email=True, sms=True, push=True)  # Important
    
    # Timesheet & Compliance
    timesheet_submitted: NotificationChannel = NotificationChannel(email=True, sms=False, push=True)
    compliance_alert: NotificationChannel = NotificationChannel()
    document_expiring: NotificationChannel = NotificationChannel()
    
    # General
    promotional_messages: NotificationChannel = NotificationChannel(email=True, sms=False, push=False)
    platform_updates: NotificationChannel = NotificationChannel(email=True, sms=False, push=True)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Notification type descriptions for UI
WORKER_NOTIFICATION_TYPES = {
    "shift_assigned": {
        "label": "Shift Assigned",
        "description": "When you're assigned to a new shift",
        "category": "Shifts"
    },
    "shift_time_changed": {
        "label": "Shift Time Changed",
        "description": "When a shift's time or date is modified",
        "category": "Shifts"
    },
    "shift_cancelled": {
        "label": "Shift Cancelled",
        "description": "When a shift is cancelled by employer",
        "category": "Shifts"
    },
    "shift_reminder": {
        "label": "Shift Reminders",
        "description": "Reminder before your shift starts",
        "category": "Shifts"
    },
    "clock_in_confirmation": {
        "label": "Clock-In Confirmation",
        "description": "Confirmation when you clock in",
        "category": "Attendance"
    },
    "clock_out_summary": {
        "label": "Clock-Out Summary",
        "description": "Shift summary with hours and earnings",
        "category": "Attendance"
    },
    "late_clock_in_alert": {
        "label": "Late Clock-In Alert",
        "description": "Alert when you clock in late",
        "category": "Attendance"
    },
    "geofence_alert": {
        "label": "Location Alerts",
        "description": "When you're detected away from workplace",
        "category": "Location"
    },
    "employment_status_change": {
        "label": "Employment Status",
        "description": "When you're hired or employment ends",
        "category": "Employment"
    },
    "timesheet_approved": {
        "label": "Timesheet Approved",
        "description": "When your timesheet is approved",
        "category": "Payments"
    },
    "payment_processed": {
        "label": "Payment Processed",
        "description": "When payment is processed",
        "category": "Payments"
    },
    "promotional_messages": {
        "label": "Promotions & Offers",
        "description": "Marketing and promotional content",
        "category": "General"
    },
    "platform_updates": {
        "label": "Platform Updates",
        "description": "Important platform announcements",
        "category": "General"
    }
}

EMPLOYER_NOTIFICATION_TYPES = {
    "worker_assigned": {
        "label": "Worker Assigned",
        "description": "When a worker is assigned to a shift",
        "category": "Shift Management"
    },
    "shift_fully_staffed": {
        "label": "Shift Fully Staffed",
        "description": "When a shift is fully staffed",
        "category": "Shift Management"
    },
    "shift_unfilled_reminder": {
        "label": "Unfilled Shift Reminder",
        "description": "Reminder for shifts that need workers",
        "category": "Shift Management"
    },
    "worker_cancelled_shift": {
        "label": "Worker Cancelled",
        "description": "When a worker cancels their shift",
        "category": "Shift Management"
    },
    "worker_clocked_in": {
        "label": "Worker Clocked In",
        "description": "When a worker clocks in to a shift",
        "category": "Attendance"
    },
    "worker_clocked_out": {
        "label": "Worker Clocked Out",
        "description": "When a worker clocks out",
        "category": "Attendance"
    },
    "late_clock_in": {
        "label": "Late Clock-In",
        "description": "When a worker clocks in late",
        "category": "Attendance"
    },
    "missed_clock_in": {
        "label": "Missed Clock-In",
        "description": "When a worker doesn't show up",
        "category": "Attendance"
    },
    "geofence_violation": {
        "label": "Location Violations",
        "description": "When worker is away from workplace",
        "category": "Location"
    },
    "timesheet_submitted": {
        "label": "Timesheet Submitted",
        "description": "When timesheet needs approval",
        "category": "Timesheets"
    },
    "compliance_alert": {
        "label": "Compliance Alerts",
        "description": "Important compliance notifications",
        "category": "Compliance"
    },
    "document_expiring": {
        "label": "Document Expiry",
        "description": "When documents are expiring",
        "category": "Compliance"
    },
    "promotional_messages": {
        "label": "Promotions & Offers",
        "description": "Marketing and promotional content",
        "category": "General"
    },
    "platform_updates": {
        "label": "Platform Updates",
        "description": "Important platform announcements",
        "category": "General"
    }
}
