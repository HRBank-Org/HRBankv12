# HR Bank - User Journey & Functionality Cascade Chart
## Product Scope Review for Employer & Workforce User Types

---

## 🎯 PRODUCT VISION

HR Bank is a comprehensive workforce management platform supporting three operational modes:
1. **On-Site Shifts** - Traditional single-location work (restaurants, offices, factories)
2. **Multi-Site Field Service** - Route-based work (cleaning, home care, deliveries)
3. **Continental Shifts** - 12-hour rotating patterns (security, healthcare, manufacturing)

All three modes converge into unified **Timesheets** → **Payroll** → **Payment**

---

## 📊 FUNCTIONALITY CASCADE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HR BANK SYSTEM                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           EMPLOYER USER JOURNEY                                       │  │
│  └──────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                             │
│  PHASE 1: SETUP                    PHASE 2: RECRUITING              PHASE 3: OPERATIONS    │
│  ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐     │
│  │ 1. Registration │──────────▶  │ 5. Post Jobs    │──────────▶  │ 8. Scheduling   │     │
│  │    & Login      │              │    (Optional)   │              │    (All 3 modes)│     │
│  └────────┬────────┘              └────────┬────────┘              └────────┬────────┘     │
│           │                                │                                │              │
│           ▼                                ▼                                ▼              │
│  ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐     │
│  │ 2. Onboarding   │              │ 6. Review       │              │ 9. Assign       │     │
│  │    & Compliance │              │    Candidates   │              │    Workers      │     │
│  └────────┬────────┘              └────────┬────────┘              └────────┬────────┘     │
│           │                                │                                │              │
│           ▼                                ▼                                ▼              │
│  ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐     │
│  │ 3. Create       │              │ 7. Invite/Hire  │              │10. Monitor      │     │
│  │    Workplaces   │              │    Workers      │              │   Attendance    │     │
│  └────────┬────────┘              └────────┬────────┘              └────────┬────────┘     │
│           │                                │                                │              │
│           ▼                                ▼                                ▼              │
│  ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐     │
│  │ 4. Define Roles │──────────▶  │    Onboard      │──────────▶  │11. Timesheets   │     │
│  │    & Rates      │              │    to Team      │              │   & Payroll     │     │
│  └─────────────────┘              └─────────────────┘              └────────┬────────┘     │
│                                                                             │              │
│                                                                             ▼              │
│                                                                    ┌─────────────────┐     │
│                                                                    │12. Export/Pay   │     │
│                                                                    │    Workers      │     │
│                                                                    └─────────────────┘     │
│                                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                          WORKFORCE USER JOURNEY                                       │  │
│  └──────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                             │
│  PHASE 1: SETUP                    PHASE 2: JOB SEARCH              PHASE 3: WORK          │
│  ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐     │
│  │ 1. Registration │──────────▶  │ 5. Browse Jobs  │──────────▶  │ 8. View Schedule│     │
│  │    & Login      │              │    (Optional)   │              │    (Unified)    │     │
│  └────────┬────────┘              └────────┬────────┘              └────────┬────────┘     │
│           │                                │                                │              │
│           ▼                                ▼                                ▼              │
│  ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐     │
│  │ 2. Profile      │              │ 6. Apply to     │              │ 9. GPS Check-In │     │
│  │    Setup        │              │    Positions    │              │    (Geofenced)  │     │
│  └────────┬────────┘              └────────┬────────┘              └────────┬────────┘     │
│           │                                │                                │              │
│           ▼                                ▼                                ▼              │
│  ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐     │
│  │ 3. Add          │              │ 7. Accept       │              │10. Complete     │     │
│  │    Occupations  │              │    Invite       │              │    Tasks/Work   │     │
│  └────────┬────────┘              └────────┬────────┘              └────────┬────────┘     │
│           │                                │                                │              │
│           ▼                                ▼                                ▼              │
│  ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐     │
│  │ 4. Add          │──────────▶  │    Compliance   │──────────▶  │11. Check-Out    │     │
│  │    Credentials  │              │    Documents    │              │    & Report     │     │
│  └─────────────────┘              └─────────────────┘              └────────┬────────┘     │
│                                                                             │              │
│                                                                             ▼              │
│                                                                    ┌─────────────────┐     │
│                                                                    │12. View         │     │
│                                                                    │    Timesheets   │     │
│                                                                    └────────┬────────┘     │
│                                                                             │              │
│                                                                             ▼              │
│                                                                    ┌─────────────────┐     │
│                                                                    │13. Get Paid     │     │
│                                                                    └─────────────────┘     │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏢 EMPLOYER FUNCTIONALITY STATUS

### Phase 1: Setup & Configuration

| # | Feature | Status | Backend | Frontend | Notes |
|---|---------|--------|---------|----------|-------|
| 1 | Registration & Login | ✅ COMPLETE | `auth.py` | `Login.jsx`, `Signup.jsx` | Email/password + Google OAuth |
| 2 | Onboarding Flow | ✅ COMPLETE | `employer.py` | `Onboarding.jsx` | Company info, compliance |
| 3 | Create Workplaces | ✅ COMPLETE | `employer.py` | `WorkplaceForm.jsx` | Address validation, geofencing |
| 4 | Work Mode Selection | ✅ COMPLETE | `employer.py` | `WorkplaceForm.jsx` | on_site, field_service modes |
| 5 | Define Roles | ✅ COMPLETE | `workplace_roles.py` | `RoleForm.jsx`, `Roles.jsx` | Pay rates, skills, tasks |
| 6 | Service Territories (FSA) | ✅ COMPLETE | `employer.py` | `WorkplaceForm.jsx` | For field service mode |

### Phase 2: Recruiting & Team Building

| # | Feature | Status | Backend | Frontend | Notes |
|---|---------|--------|---------|----------|-------|
| 7 | Post Jobs | ✅ COMPLETE | `jobs.py` | `JobPosting.jsx` | Job listings |
| 8 | Review Candidates | ✅ COMPLETE | `job_matching.py` | `JobsCandidates.jsx` | AI-powered matching |
| 9 | Invite Workers | ✅ COMPLETE | `employer_invitations.py` | `WorkforceManagement.jsx` | Email/SMS invites |
| 10 | View Applications | ✅ COMPLETE | `job_matching.py` | `RoleCandidates.jsx` | Review & accept |
| 11 | Onboard to Team | ⚠️ PARTIAL | `workforce_management.py` | `WorkforceManagement.jsx` | Assignment works, employment docs TBD |

### Phase 3: Operations - Scheduling

| # | Feature | Status | Backend | Frontend | Notes |
|---|---------|--------|---------|----------|-------|
| 12 | **Standard Shifts** | ✅ COMPLETE | `calendar_scheduling.py` | `CalendarScheduling.jsx` | Single-location, calendar view |
| 13 | **Continental Shifts** | ✅ COMPLETE | `calendar_scheduling.py` | `CreateWorkModal.jsx` | DuPont/Panama/Pitman patterns |
| 14 | **Field Service Tasks** | ✅ COMPLETE | `service_tasks.py` | `ServiceTasksManagement.jsx` | Multi-stop routes |
| 15 | External Webhook (CleanGrid) | ✅ COMPLETE | `external_bookings.py` | N/A | Ingest external bookings |
| 16 | Manual Field Task Creation | ⚠️ PARTIAL | `service_tasks.py` | `CreateWorkModal.jsx` | UI exists, needs wiring |
| 17 | Assign Workers to Shifts | ✅ COMPLETE | `calendar_scheduling.py` | `CalendarScheduling.jsx` | Worker picker modal |
| 18 | Assign Workers to Tasks | ✅ COMPLETE | `service_tasks.py` | `ServiceTasksManagement.jsx` | Task assignment |
| 19 | Continental Group Assignment | 🔴 NOT STARTED | N/A | N/A | Assign workers to rotation groups |

### Phase 3: Operations - Monitoring

| # | Feature | Status | Backend | Frontend | Notes |
|---|---------|--------|---------|----------|-------|
| 20 | Live Attendance Monitor | ✅ COMPLETE | `live_attendance.py` | `LiveAttendance.jsx` | Real-time clock-in/out |
| 21 | Shift Attendance Details | ✅ COMPLETE | `attendance.py` | `ShiftAttendance.jsx` | Per-shift view |
| 22 | Dashboard KPIs | ⚠️ PARTIAL | `dashboard.py` | `DashboardNew.jsx` | Static placeholders exist |

### Phase 3: Operations - Payroll & Timesheets

| # | Feature | Status | Backend | Frontend | Notes |
|---|---------|--------|---------|----------|-------|
| 23 | **Unified Timesheets** | ✅ COMPLETE | `payroll.py` | `Timesheets.jsx` | All 3 work types aggregated |
| 24 | Payroll Period Generation | ✅ COMPLETE | `payroll.py` | `Payroll.jsx` | Weekly periods |
| 25 | Payroll Entries | ✅ COMPLETE | `payroll.py` | `Payroll.jsx` | Per-worker calculations |
| 26 | Tax Calculations (Canada) | ✅ COMPLETE | `payroll_calculations.py` | N/A | CPP, EI, Federal, Ontario |
| 27 | Payroll CSV Export | ✅ COMPLETE | `payroll.py` | `Payroll.jsx` | Download for ADP, etc. |
| 28 | Direct Payment Integration | 🔴 NOT STARTED | N/A | N/A | Stripe/Interac e-Transfer |

---

## 👷 WORKFORCE FUNCTIONALITY STATUS

### Phase 1: Setup & Profile

| # | Feature | Status | Backend | Frontend | Notes |
|---|---------|--------|---------|----------|-------|
| 1 | Registration & Login | ✅ COMPLETE | `auth.py` | `Login.jsx`, `Signup.jsx` | Email/password + Google OAuth |
| 2 | Profile Setup | ✅ COMPLETE | `workforce.py` | `Profile.jsx` | Basic info, photo |
| 3 | Onboarding Flow | ✅ COMPLETE | `workforce.py` | `Onboarding.jsx` | Profile wizard |
| 4 | Add Occupations | ✅ COMPLETE | `occupations.py` | `OccupationProfiles.jsx` | Multiple occupation profiles |
| 5 | Add Credentials/Certs | ✅ COMPLETE | `credentials.py` | `AddCertification.jsx` | Document upload |
| 6 | Set Availability | ✅ COMPLETE | `calendar.py` | `AvailabilityCalendar.jsx` | Weekly availability |

### Phase 2: Job Search & Hiring

| # | Feature | Status | Backend | Frontend | Notes |
|---|---------|--------|---------|----------|-------|
| 7 | Browse Jobs | ✅ COMPLETE | `job_matching.py` | `FindJobs.jsx` | AI-matched listings |
| 8 | Apply to Positions | ✅ COMPLETE | `job_matching.py` | `FindJobs.jsx` | One-click apply |
| 9 | Accept Invitations | ✅ COMPLETE | `invites.py` | `Dashboard.jsx` | Accept employer invites |
| 10 | Compliance Documents | ⚠️ PARTIAL | `documents.py` | `Documents.jsx` | Upload TD1, SIN, etc. |

### Phase 3: Work Execution - On-Site Shifts

| # | Feature | Status | Backend | Frontend | Notes |
|---|---------|--------|---------|----------|-------|
| 11 | View My Shifts | ✅ COMPLETE | `workforce.py` | `UnifiedSchedule.jsx` | Calendar + list view |
| 12 | GPS Clock-In (50m geofence) | ✅ COMPLETE | `attendance.py` | `ClockInOutNew.jsx` | Location verified |
| 13 | GPS Clock-Out | ✅ COMPLETE | `attendance.py` | `ClockInOutNew.jsx` | Hours calculated |
| 14 | QR Code Attendance | ✅ COMPLETE | `qr_attendance.py` | `ClockInOutNew.jsx` | Alternative method |
| 15 | View Shift Details | ✅ COMPLETE | `workforce.py` | `UnifiedSchedule.jsx` | Tasks, location, time |

### Phase 3: Work Execution - Field Service

| # | Feature | Status | Backend | Frontend | Notes |
|---|---------|--------|---------|----------|-------|
| 16 | View Daily Route | ✅ COMPLETE | `service_tasks.py` | `UnifiedSchedule.jsx` | Multi-stop timeline |
| 17 | Navigate to Job | ✅ COMPLETE | N/A | `UnifiedSchedule.jsx` | Google Maps link |
| 18 | GPS Task Check-In | ✅ COMPLETE | `service_tasks.py` | `UnifiedSchedule.jsx` | Location verified |
| 19 | Complete Checklist | ✅ COMPLETE | `service_tasks.py` | `UnifiedSchedule.jsx` | Timestamped items |
| 20 | Report Issues (Photo) | ✅ COMPLETE | `service_tasks.py` | `UnifiedSchedule.jsx` | Exception photos |
| 21 | Client Signature | ✅ COMPLETE | `service_tasks.py` | `SignaturePad.jsx` | Optional capture |
| 22 | GPS Task Check-Out | ✅ COMPLETE | `service_tasks.py` | `UnifiedSchedule.jsx` | Task completion |
| 23 | Worker Billing Privacy | ✅ COMPLETE | `service_tasks.py` | N/A | Workers can't see rates |

### Phase 3: Work Execution - Continental Shifts

| # | Feature | Status | Backend | Frontend | Notes |
|---|---------|--------|---------|----------|-------|
| 24 | View Continental Schedule | ⚠️ PARTIAL | `calendar_scheduling.py` | `UnifiedSchedule.jsx` | Shows as regular shifts |
| 25 | Day/Night Shift Indication | ⚠️ PARTIAL | ✅ Backend | 🔴 Frontend | Badge needed |
| 26 | Rotation Group Display | 🔴 NOT STARTED | ✅ Backend | 🔴 Frontend | Show "Group A", etc. |

### Phase 3: Timesheets & Payment

| # | Feature | Status | Backend | Frontend | Notes |
|---|---------|--------|---------|----------|-------|
| 27 | View My Timesheets | ⚠️ PARTIAL | `timesheets.py` | `MyTimesheets.jsx` | Weekly summary exists |
| 28 | View Unified Hours | ⚠️ PARTIAL | `payroll.py` | `MyTimesheets.jsx` | Shift + Task hours |
| 29 | View Pay Stub | 🔴 NOT STARTED | N/A | N/A | Per-period breakdown |
| 30 | Wallet/Earnings | ⚠️ PARTIAL | N/A | `Wallet.jsx` | Static UI exists |

---

## 🔗 INTERDEPENDENCY MAP

```
                    ┌────────────────────────────────────────┐
                    │         EMPLOYER CREATES               │
                    └────────────────────────────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
    ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
    │  WORKPLACE  │           │    ROLES    │           │ INVITATIONS │
    │  (Location) │           │  (Pay Rate) │           │  (Workers)  │
    └──────┬──────┘           └──────┬──────┘           └──────┬──────┘
           │                         │                         │
           │    DEPENDS ON ◄─────────┘                         │
           │                                                   │
           └────────────────────────┬──────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌───────────┐   ┌───────────┐   ┌───────────┐
             │ STANDARD  │   │ FIELD     │   │CONTINENTAL│
             │  SHIFTS   │   │ SERVICE   │   │  SHIFTS   │
             │           │   │  TASKS    │   │           │
             └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
                   │               │               │
                   │   WORKER      │   WORKER      │   WORKER
                   │   ASSIGNED    │   ASSIGNED    │   ASSIGNED
                   │               │               │
                   ▼               ▼               ▼
             ┌───────────┐   ┌───────────┐   ┌───────────┐
             │ATTENDANCE │   │  CHECK-IN │   │ATTENDANCE │
             │GPS CLOCK  │   │  CHECK-OUT│   │GPS CLOCK  │
             │ IN / OUT  │   │ + CHECKLIST│  │ IN / OUT  │
             └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
                   │               │               │
                   └───────────────┼───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │    UNIFIED TIMESHEET         │
                    │  ┌────────────────────────┐  │
                    │  │ shift_hours (on-site)  │  │
                    │  │ shift_hours (conti.)   │  │
                    │  │ task_hours (field)     │  │
                    │  └────────────────────────┘  │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │       PAYROLL PERIOD         │
                    │  ┌────────────────────────┐  │
                    │  │ Regular Hours          │  │
                    │  │ Overtime Hours (>44h)  │  │
                    │  │ Gross Pay              │  │
                    │  │ - CPP, EI, Tax         │  │
                    │  │ = Net Pay              │  │
                    │  └────────────────────────┘  │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │          PAYMENT             │
                    │   (Export CSV / Direct Pay)  │
                    └──────────────────────────────┘
```

---

## 🚧 GAPS TO CLOSE THE LOOP

### HIGH PRIORITY (Core Flow Blockers)

| # | Gap | Impact | Effort | Dependency |
|---|-----|--------|--------|------------|
| 1 | **Worker Timesheet View** needs unified hours display | Workers can't see total earnings from all work types | Medium | Unified payroll exists |
| 2 | **Continental rotation group assignment UI** | Can't assign workers to A/B/C/D groups | Medium | Backend ready |
| 3 | **Dashboard KPIs** are static placeholders | Employer has no operational visibility | Medium | Data exists |
| 4 | **Shift unassign bug** (infinite loop) | Employer can't remove workers from shifts | Low | Frontend bug |

### MEDIUM PRIORITY (Feature Completeness)

| # | Gap | Impact | Effort | Dependency |
|---|-----|--------|--------|------------|
| 5 | **Manual Field Task Creation** (not from webhook) | Employers can't create own routes | Low | CreateWorkModal partial |
| 6 | **Day/Night shift badges** in worker UI | Continental workers confused about shift type | Low | Backend has data |
| 7 | **Pay stub view** for workers | Workers can't see deduction breakdown | Medium | PayrollEntry exists |
| 8 | **Compliance document workflow** | Employment docs not tracked properly | High | Foundation exists |

### LOWER PRIORITY (Enhancement)

| # | Gap | Impact | Effort | Dependency |
|---|-----|--------|--------|------------|
| 9 | **Two-way rating system** | No feedback loop | High | After shifts work |
| 10 | **Direct payment (Stripe/Interac)** | Manual payment exports | High | Payroll complete |
| 11 | **Attendance dashboard visualization** | No aggregated view | Medium | Data exists |
| 12 | **Push notifications** | Workers miss schedule updates | Medium | FCM integration |

---

## ✅ RECOMMENDED SEQUENCE TO CLOSE THE LOOP

### Sprint 1: Fix Critical Bugs & Complete UI
1. Fix shift unassignment bug (P2)
2. Implement Dashboard KPIs with real data
3. Add Day/Night badges to worker schedule

### Sprint 2: Continental Shifts Full Flow
1. Continental rotation group assignment UI
2. Worker rotation group display
3. Continental shift notifications

### Sprint 3: Worker Experience Completion
1. Unified timesheet view (all work types)
2. Pay stub detail view
3. Earnings summary in Wallet

### Sprint 4: Employer Manual Operations
1. Manual field task creation (complete wiring)
2. Compliance document tracking
3. Attendance visualization dashboard

### Sprint 5: Platform Polish
1. Two-way rating system
2. Push notifications
3. Direct payment integration

---

## 📱 SCREENS SUMMARY

### Employer Screens (38 total)
- ✅ 32 Complete/Functional
- ⚠️ 4 Partial (need data/wiring)
- 🔴 2 Not Started

### Workforce Screens (33 total)
- ✅ 27 Complete/Functional
- ⚠️ 5 Partial (need enhancements)
- 🔴 1 Not Started

---

## 🎯 DEFINITION OF "LOOP CLOSED"

The employer-workforce loop is **closed** when:

1. ✅ Employer can create any type of work (standard/field/continental)
2. ✅ Workers can be assigned to any work type
3. ✅ Workers can complete work with verified attendance
4. ✅ All work hours flow into unified timesheet
5. ⚠️ Workers can view their complete earnings (PARTIAL)
6. ✅ Employer can generate payroll from all work types
7. ✅ Employer can export payroll
8. 🔴 Workers can receive payment (NOT STARTED - needs integration)

**Current Status: ~85% Complete**

The core operational loop works. What's missing is primarily:
- Worker-facing earnings visibility
- Continental shift assignment UX
- Dashboard analytics
- Payment execution
