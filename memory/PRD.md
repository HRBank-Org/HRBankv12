# HR Bank - Product Requirements Document

## Original Problem Statement
Full-stack HR compliance and management application with specialized dashboards for Admin, Employer, Workforce, and Institution users. Features WorkPassport credentials, multi-language support, and compliance management.

## Core Architecture
- **Frontend**: React + TailwindCSS + Vite (Port 3000)
- **Backend**: FastAPI + MongoDB Motor Async (Port 8001)
- **Deployment**: Docker (two containers in one Lightsail Container Service)
- **Database**: MongoDB Atlas (`hrbank_db`)
- **Docker Images**: `qaisijoe/hrbank-frontend:v27+`, `qaisijoe/hrbank-backend:v27+`
- **DNS**: `hrbank.ca` → `hrbank-backend` Container Service
- **Email**: SendGrid integration

## What's Been Implemented

### P0: Notification System (Apr 2026)
- **Cohort End-Date Scheduler**: Background task runs daily, checks `institution_classes` for cohorts ending within 7 days or overdue. Creates in-app notifications + sends emails to institution admins prompting them to issue credentials. Thresholds: 7 days, 3 days, today, overdue.
  - Service: `backend/services/cohort_notification_service.py`
  - Deduplication via `cohort_notification_log` collection
  - Manual trigger: `POST /api/admin/trigger-cohort-notifications`
- **Workforce Notifications on Credential Receipt**: When credentials are issued via `/api/institution/credentials/issue`, each student receives an in-app notification (type: `credential_received`) + email.
- **Workforce Notifications on Enrollment**: When existing users are invited via `/api/institution/students/invite`, they receive an in-app notification (type: `enrollment`).
- **Bulk Invite Notifications**: When existing users are bulk-invited via `/api/invites/bulk-upload`, they receive an in-app notification (type: `invitation`).
- Fixed institution profile lookup in `institution_classes.py` to use `$or` query (user_id OR institution_id) for credential type authorization.

### P1: Browser Locale Auto-Detect Language (Apr 2026)
- Expanded frontend language support from 7 to 19 languages (added: Punjabi, Tagalog, Urdu, Persian, Tamil, Korean, Vietnamese, Gujarati, Russian, Ukrainian, Bengali, Polish).
- Improved browser locale detection to handle regional codes (e.g., zh-CN → zh).
- Language preference synced to backend profile on login via `PUT /api/users/preferred-language`.
- Backend notifications already support AI translation for all 21 languages.

### Previous Session Work
- WorkPassport Two-Column Print Resume (TESTED: Iteration 32 — 100%)
- AWS Lightsail Container Service Deployment config
- Partner Logos Hotlinking Fix
- SafestWork Institution Demo Setup
- Sidebar Navigation Fixes (InstitutionLayout wrappers)
- Student Invite Email Logic Fix
- WalletStatusWidget Fix

## Prioritized Backlog

### P2 (Deploy)
- Rebuild & push Docker images with all notification + language fixes

### P2 (Medium)
- Re-enable Leaderboard when institutions onboard
- Notification system for document expiry cohort integration

### P3 (Low/Future)
- Full deep translation of form labels/table columns
- CI/CD pipeline
- Make IssueCredential templates dynamic per institution

## Testing History
| Iter | Scope | Result |
|------|-------|--------|
| 33 | P0 Notifications + P1 Language | 100% (13/13 backend, 9/9 frontend) |
| 32 | WorkPassport print | 100% (21/21) |
| - | Invite emails | Verified via SendGrid 202 |
| - | Sidebar persistence | Verified via screenshot |

## Key Collections Added
- `cohort_notification_log`: Deduplication for daily cohort reminders (`class_id`, `reminder_type`, `sent_date`)
- `notifications`: Extended with types: `credential_received`, `enrollment`, `invitation`, `cohort_ending_7days`, `cohort_ending_3days`, `cohort_ended_today`, `cohort_credentials_overdue`

## Test Credentials
- Institution: `aleblanc@safestwork.com` / `SafestWork2026!`
- Student: `emily.chen@email.com` / `Test123!`

---
*Last Updated: April 2026*
