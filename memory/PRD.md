# HR Bank - Product Requirements Document

## Original Problem Statement
Full-stack HR compliance and management application with specialized dashboards for Admin, Employer, Workforce, and Institution users. Features WorkPassport credentials, multi-language support, and compliance management.

## Core Architecture
- **Frontend**: React + TailwindCSS + Vite (Port 3000)
- **Backend**: FastAPI + MongoDB Motor Async (Port 8001)
- **Deployment**: Docker (two containers in one Lightsail Container Service)
- **Database**: MongoDB Atlas (`hrbank_db`)
- **Docker Images**: `qaisijoe/hrbank-frontend:v28`, `qaisijoe/hrbank-backend:v28`
- **DNS**: `hrbank.ca` → `hrbank-backend` Container Service
- **Email**: SendGrid integration

## What's Been Implemented

### P0: Notification System (Apr 2026)
- **Cohort End-Date Scheduler**: Background task runs daily, checks cohorts ending within 7 days or overdue. Creates in-app notifications + emails to institution admins.
- **Workforce Notifications on Credential Receipt**: In-app notification + email when credentials issued.
- **Workforce Notifications on Enrollment**: In-app notification when enrolled via class invite or bulk invite.
- Service: `backend/services/cohort_notification_service.py`

### P1: Browser Locale Auto-Detect Language (Apr 2026)
- Frontend language support expanded from 7 to 19 languages (Punjabi, Tagalog, Urdu, Persian, Tamil, Korean, Vietnamese, Gujarati, Russian, Ukrainian, Bengali, Polish).
- Language preference synced to backend profile on login via `PUT /api/users/preferred-language`.

### UX Improvements (Apr 2026) — 6 Fixes
1. **Empty Dashboard "Getting Started" Checklist**: When stats are zero, flat-line charts replaced with 4-step guided checklist (Complete profile → Add occupation → Get verified → Find jobs). Green checkmarks for completed steps.
2. **WorkPassport/Workforce Merge**: Deferred to lighter approach — noted for future.
3. **Share Profile Hero Card**: Elevated share link to a prominent hero card on WorkPassport dashboard with LinkedIn, WhatsApp, and Email quick-share buttons.
4. **Dynamic OG Meta Tags**: Public WorkPassport pages now include `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card` for proper social previews. Backend fallback at `/api/og/passport/{share_token}` for JS-less crawlers.
5. **Richer Credential Cards**: Public WorkPassport shows credential type badge, issue date, and expiry status (green Valid / amber Expiring / red Expired).
6. **Notification Bell Dropdown**: Bell click now opens an inline dropdown with recent notifications, unread dots, timestamps, and "View all" link (replaces full-page redirect).

### Previous Session Work
- WorkPassport Two-Column Print Resume
- AWS Lightsail Container Service Deployment
- Partner Logos Hotlinking Fix
- SafestWork Institution Demo Setup
- Sidebar Navigation Fixes
- Student Invite Email Logic Fix

## Key New Files
- `/app/frontend/src/components/common/NotificationDropdown.jsx`
- `/app/backend/services/cohort_notification_service.py`

## Prioritized Backlog

### P2 (Deploy)
- Rebuild & push Docker images v29 with all UX fixes

### P2 (Medium)
- WorkPassport/Workforce sidebar unification (Fix 2 — deferred)
- Re-enable Leaderboard when institutions onboard

### P3 (Low/Future)
- Full deep translation of form labels/table columns
- CI/CD pipeline

## Testing History
| Iter | Scope | Result |
|------|-------|--------|
| 34 | UX Improvements (6 fixes) | 100% frontend, 93% backend (1 skipped auth) |
| 33 | P0 Notifications + P1 Language | 100% (13/13 backend, 9/9 frontend) |
| 32 | WorkPassport print | 100% (21/21) |

## Test Credentials
- Institution: `aleblanc@safestwork.com` / `SafestWork2026!`
- Student: `emily.chen@email.com` / `Test123!`

---
*Last Updated: April 2026*
