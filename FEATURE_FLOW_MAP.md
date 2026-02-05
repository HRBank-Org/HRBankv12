# HRBank - Feature Flow Mapping

## Overview
This document maps each admin function to its corresponding flows across all 4 account types:
- **Admin** (Super Admin)
- **Workforce** (Workers/Employees)
- **Employer** (Businesses/Companies)
- **Institution** (Schools/Certification Bodies)

---

## 1. ACCOUNT MANAGEMENT

### 1.1 Account Activations (Admin)
**Admin Page:** `PendingActivations.jsx`
**API:** `GET /api/super-admin/pending-activations`, `POST /api/super-admin/activate-user/{id}`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Reviews & activates accounts | 🔴 Needs Testing |
| Workforce | Signs up → submits docs → waits for activation | ⬜ To Test |
| Employer | Signs up → submits registration docs → waits for activation | ⬜ To Test |
| Institution | Signs up → submits registration docs → waits for activation | ⬜ To Test |

### 1.2 All Users (Admin)
**Admin Page:** `AllUsers.jsx`
**API:** `GET /api/super-admin/users`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Views/searches all users | ⬜ To Test |
| Workforce | N/A | - |
| Employer | N/A | - |
| Institution | N/A | - |

### 1.3 ID Document Review (Admin)
**Admin Page:** `DocumentReview.jsx`, `DocumentVerification.jsx`
**API:** `GET /api/admin/documents/pending`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Reviews submitted ID/registration documents | ⬜ To Test |
| Workforce | `Documents.jsx` - Uploads ID docs | ⬜ To Test |
| Employer | `Documents.jsx` - Uploads business registration | ⬜ To Test |
| Institution | `Documents.jsx` - Uploads accreditation docs | ⬜ To Test |

### 1.4 Document Expiry (Admin)
**Admin Page:** `DocumentExpiryDashboard.jsx`
**API:** `GET /api/admin/document-expiry/summary`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Monitors expiring docs, sends reminders | ⬜ To Test |
| Workforce | Receives notifications, uploads renewals | ⬜ To Test |
| Employer | Receives notifications for worker doc expiry | ⬜ To Test |
| Institution | N/A | - |

---

## 2. CREDENTIAL MANAGEMENT

### 2.1 Credential Flow (Institution → Workforce)
**Admin Page:** `CredentialReviews.jsx` (DEPRECATED - removed from sidebar)
**Institution Page:** `IssueCredential.jsx`, `ManageCredentials.jsx`, `VerificationQueue.jsx`
**Workforce Page:** `MyCredentials.jsx`, `PendingCredentials.jsx`
**API:** `POST /api/blockchain-credentials/issue-by-email`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | NO LONGER INVOLVED (Institution handles directly) | ✅ Removed |
| Workforce | Requests credential → Receives on WorkPassport | ⬜ To Test |
| Employer | Views worker credentials for hiring | ⬜ To Test |
| Institution | Issues credentials → Blockchain verification | ⬜ To Test |

### 2.2 Occupation Templates (Admin)
**Admin Page:** `ManageOccupations.jsx`
**API:** `GET/POST /api/admin/occupations`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Creates occupation categories & titles | ⬜ To Test |
| Workforce | `OccupationProfiles.jsx` - Selects occupation | ⬜ To Test |
| Employer | Selects occupation when posting jobs | ⬜ To Test |
| Institution | Links credentials to occupations | ⬜ To Test |

### 2.3 Occupation Certifications (Admin)
**Admin Page:** `ManageOccupationCertifications.jsx`
**API:** `GET/POST /api/admin/occupation-certifications`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Links certifications to occupations | ⬜ To Test |
| Workforce | Sees required certs for occupation | ⬜ To Test |
| Employer | Sees required certs when hiring | ⬜ To Test |
| Institution | Issues required certifications | ⬜ To Test |

### 2.4 Certification Management (Admin)
**Admin Page:** `ManageCertifications.jsx`
**API:** `GET/POST /api/admin/certifications`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Creates certification types | ⬜ To Test |
| Workforce | `AddCertification.jsx` - Adds to profile | ⬜ To Test |
| Employer | Views worker certifications | ⬜ To Test |
| Institution | Issues certifications | ⬜ To Test |

---

## 3. SHIFT & SCHEDULING

### 3.1 Shift Management
**Admin Page:** Analytics (views shift data)
**Employer Page:** `CreateShift.jsx`, `ShiftScheduler.jsx`, `ShiftCalendar.jsx`
**Workforce Page:** `MyShifts.jsx`, `FindJobs.jsx`, `UnifiedSchedule.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Views shift analytics | ⬜ To Test |
| Workforce | Finds shifts → Applies → Works → Gets paid | ⬜ To Test |
| Employer | Creates shifts → Assigns workers → Tracks attendance | ⬜ To Test |
| Institution | N/A | - |

### 3.2 Attendance & Time Tracking
**Employer Page:** `LiveAttendance.jsx`, `Timesheets.jsx`, `ShiftAttendance.jsx`
**Workforce Page:** `ClockInOut.jsx`, `Attendance.jsx`, `MyTimesheets.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Views attendance analytics | ⬜ To Test |
| Workforce | Clocks in/out → Views timesheets | ⬜ To Test |
| Employer | Monitors live attendance → Approves timesheets | ⬜ To Test |
| Institution | N/A | - |

---

## 4. FIELD SERVICE

### 4.1 Route Management
**Employer Page:** `FieldServiceRoutes.jsx`, `CreateFieldServiceRoute.jsx`, `LiveRouteTracking.jsx`
**Workforce Page:** `WorkerRoutes.jsx`, `WorkerRouteExecution.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Views route analytics | ⬜ To Test |
| Workforce | Receives route → Executes stops → Completes tasks | ⬜ To Test |
| Employer | Creates routes → Assigns workers → Tracks live GPS | ⬜ To Test |
| Institution | N/A | - |

### 4.2 Service Tasks
**Employer Page:** `ServiceTasksManagement.jsx`, `ManageTasks.jsx`, `WorkOrders.jsx`
**Workforce Page:** `ServiceTasks.jsx`, `MyTasks.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Views task analytics | ⬜ To Test |
| Workforce | Receives tasks → Completes → Reports | ⬜ To Test |
| Employer | Creates tasks → Assigns → Tracks completion | ⬜ To Test |
| Institution | N/A | - |

---

## 5. PAYMENTS & BILLING

### 5.1 Invoices (Admin)
**Admin Page:** `AdminInvoices.jsx`, `Invoices.jsx`
**API:** `GET /api/admin/invoices`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Views all invoices, revenue | ⬜ To Test |
| Workforce | `Wallet.jsx` - Views earnings | ⬜ To Test |
| Employer | `EmployerBilling.jsx` - Pays invoices | ⬜ To Test |
| Institution | `FinancialSummary.jsx`, `PayoutsDashboard.jsx` | ⬜ To Test |

### 5.2 Institution Payouts (Admin)
**Admin Page:** `InstitutionPayouts.jsx`
**API:** `GET /api/admin/institution-payouts`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Processes payouts to institutions | ⬜ To Test |
| Workforce | N/A | - |
| Employer | N/A | - |
| Institution | Receives payouts for credentials issued | ⬜ To Test |

### 5.3 Payroll (Employer)
**Employer Page:** `Payroll.jsx`, `PayrollExport.jsx`, `PayrollSync.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Views payroll analytics | ⬜ To Test |
| Workforce | Views pay stubs | ⬜ To Test |
| Employer | Runs payroll → Exports to providers | ⬜ To Test |
| Institution | N/A | - |

---

## 6. PLATFORM CONFIG

### 6.1 Minimum Wage (Admin)
**Admin Page:** `MinimumWageManager.jsx`
**API:** `GET/POST /api/admin/minimum-wage`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Sets min wage by province | ⬜ To Test |
| Workforce | Sees min wage for their province | ⬜ To Test |
| Employer | Min wage enforced when setting pay rates | ⬜ To Test |
| Institution | N/A | - |

### 6.2 Zones & Regions (Admin)
**Admin Page:** `ZoneManagement.jsx`, `ManageZones.jsx`
**API:** `GET/POST /api/admin/zones`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Creates zones, assigns regional admins | ⬜ To Test |
| Workforce | Assigned to zone | ⬜ To Test |
| Employer | Operates in zone | ⬜ To Test |
| Institution | N/A | - |

---

## 7. SUPPORT & COMPLIANCE

### 7.1 Support Tickets (Admin)
**Admin Page:** `SupportTickets.jsx`
**API:** `GET /api/support/tickets`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Responds to tickets | ⬜ To Test |
| Workforce | Creates tickets | ⬜ To Test |
| Employer | Creates tickets | ⬜ To Test |
| Institution | Creates tickets | ⬜ To Test |

### 7.2 SOC2 Compliance (Admin)
**Admin Page:** `SOC2Dashboard.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Views compliance status | ⬜ To Test |
| Others | N/A | - |

### 7.3 WSIB Verification (Admin)
**Admin Page:** `WSIBVerification.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Verifies WSIB coverage | ⬜ To Test |
| Workforce | `WorkerComplianceOnboarding.jsx` - Submits WSIB info | ⬜ To Test |
| Employer | Verifies worker WSIB status | ⬜ To Test |
| Institution | N/A | - |

---

## 8. PARTNERSHIPS

### 8.1 Partnership Agreements (Admin)
**Admin Page:** `PartnershipAgreements.jsx`
**Institution Page:** `PartnershipAgreement.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Manages partnership agreements | ⬜ To Test |
| Workforce | N/A | - |
| Employer | N/A | - |
| Institution | Views/signs partnership agreements | ⬜ To Test |

### 8.2 API Partners (Admin)
**Admin Page:** `PartnerManagement.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Manages API integrations | ⬜ To Test |
| Others | N/A | - |

---

## 9. BUSINESS MANAGEMENT

### 9.1 Employers List (Admin)
**Admin Page:** `EmployersList.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Views/manages all employers | ⬜ To Test |
| Employer | `Profile.jsx` - Manages their profile | ⬜ To Test |

### 9.2 Institutions List (Admin)
**Admin Page:** `InstitutionsList.jsx`, `InstitutionDirectory.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Views/manages all institutions | ⬜ To Test |
| Institution | `Settings.jsx` - Manages their profile | ⬜ To Test |

### 9.3 Franchises (Admin)
**Admin Page:** `FranchiseManagement.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Manages franchise locations | ⬜ To Test |
| Employer | Operates as franchise | ⬜ To Test |

---

## 10. MESSAGING & NOTIFICATIONS

### 10.1 Messages
**Employer Page:** `Messages.jsx`, `MessageThread.jsx`

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | N/A (uses support tickets) | - |
| Workforce | Messages employers | ⬜ To Test |
| Employer | Messages workforce | ⬜ To Test |
| Institution | N/A | - |

### 10.2 Notifications
**Admin Page:** `NotificationSettings.jsx`
**All Users:** `NotificationSettings.jsx` in each folder

| Account Type | Page/Flow | Status |
|--------------|-----------|--------|
| Admin | Configures system notifications | ⬜ To Test |
| Workforce | Receives job/shift notifications | ⬜ To Test |
| Employer | Receives application notifications | ⬜ To Test |
| Institution | Receives verification requests | ⬜ To Test |

---

## POTENTIALLY ORPHANED/REDUNDANT CODE

### Admin Pages to Review:
- `AdminDashboard.jsx` - Older version, `SuperAdminDashboard.jsx` is used
- `ManageAdmins.jsx` - Overlaps with `AdminManagement.jsx`
- `RoleManagement.jsx` - Removed from sidebar, may be orphaned
- `Permissions.jsx` - Static page, removed from sidebar
- `CredentialReviews.jsx` - Deprecated, credentials handled by institutions now
- `ManageCredentials.jsx` - May overlap with certification management

### Workforce Pages to Review:
- `Dashboard_Old_Backup.jsx` - Obvious backup
- `FindJobs_Old.jsx` - Old version

### Employer Pages to Review:
- `DashboardNew.jsx` - Check which dashboard is active
- `WorkplacesNew.jsx` - Check which is active

---

## TESTING PRIORITY ORDER

### Phase 1: Account Activation (Current)
1. ✅ Admin Login
2. 🔴 Account Activations page
3. ⬜ Workforce signup → activation flow
4. ⬜ Employer signup → activation flow
5. ⬜ Institution signup → activation flow

### Phase 2: Credential Flow
1. ⬜ Institution issues credential
2. ⬜ Workforce receives credential
3. ⬜ Employer views worker credentials

### Phase 3: Shift Management
1. ⬜ Employer creates shift
2. ⬜ Workforce finds and applies
3. ⬜ Clock in/out
4. ⬜ Timesheet approval

### Phase 4: Field Service
1. ⬜ Create route
2. ⬜ Execute route
3. ⬜ Live tracking

### Phase 5: Payments
1. ⬜ Invoicing
2. ⬜ Payroll
3. ⬜ Institution payouts

---

## Legend
- ✅ Working/Tested
- 🔴 Needs Fix
- ⬜ Not Yet Tested
- ❌ Broken
- 🗑️ Deprecated/Remove
