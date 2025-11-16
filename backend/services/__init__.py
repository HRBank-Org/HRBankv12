"""
HR Bank Services Package
Contains background services and utilities
"""
from .email_service import (
    send_email,
    send_document_expiry_reminder,
    send_account_restricted_email,
    EmailDeliveryError
)
from .document_scheduler import (
    start_scheduler,
    stop_scheduler,
    run_manual_check
)

__all__ = [
    'send_email',
    'send_document_expiry_reminder',
    'send_account_restricted_email',
    'EmailDeliveryError',
    'start_scheduler',
    'stop_scheduler',
    'run_manual_check'
]
