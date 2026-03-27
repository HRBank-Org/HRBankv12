#!/usr/bin/env python3
"""
Replace page-level headings and common patterns with t() calls.
Targets the main h1/h2/title patterns in each page section.
"""
import os
import re

def safe_replace(filepath, old_text, new_text, max_count=1):
    """Replace text in file."""
    with open(filepath, 'r') as f:
        content = f.read()
    if old_text not in content:
        return False
    content = content.replace(old_text, new_text, max_count)
    with open(filepath, 'w') as f:
        f.write(content)
    return True

BASE = '/app/frontend/src/pages'
count = 0

# ===== WORKFORCE PAGES =====
workforce_replacements = {
    'workforce/Schedule.jsx': [
        (">My Schedule<", ">{t('pages.workforce.scheduleTitle')}<"),
    ],
    'workforce/Availability.jsx': [
        (">Availability Settings<", ">{t('pages.workforce.availabilityTitle')}<"),
        (">Set Availability<", ">{t('pages.workforce.availabilityTitle')}<"),
    ],
    'workforce/Performance.jsx': [
        (">Performance Overview<", ">{t('pages.workforce.performanceTitle')}<"),
    ],
    'workforce/Attendance.jsx': [
        (">Attendance History<", ">{t('pages.workforce.attendanceTitle')}<"),
    ],
    'workforce/Wallet.jsx': [
        (">My Wallet<", ">{t('pages.workforce.walletTitle')}<"),
    ],
    'workforce/Timesheets.jsx': [
        (">My Timesheets<", ">{t('pages.workforce.timesheetsTitle')}<"),
    ],
    'workforce/Invoices.jsx': [
        (">My Invoices<", ">{t('pages.workforce.invoicesTitle')}<"),
    ],
    'workforce/TimeOff.jsx': [
        (">Time Off<", ">{t('pages.workforce.timeOffTitle')}<"),
        (">Request Time Off<", ">{t('pages.workforce.requestTimeOff')}<"),
    ],
    'workforce/OccupationProfiles.jsx': [
        (">Occupation Profiles<", ">{t('pages.workforce.profilesTitle')}<"),
        (">My Profiles<", ">{t('pages.workforce.profilesTitle')}<"),
    ],
    'workforce/FindJobs.jsx': [
        (">Find Jobs<", ">{t('pages.workforce.findJobsTitle')}<"),
    ],
    'workforce/Routes.jsx': [
        (">My Routes<", ">{t('pages.workforce.routesTitle')}<"),
    ],
    'workforce/Documents.jsx': [
        (">My Documents<", ">{t('pages.workforce.documentsTitle')}<"),
    ],
    'workforce/Settings.jsx': [
        (">Settings<", ">{t('pages.common.settingsTitle')}<"),
    ],
    'workforce/Credentials.jsx': [
        (">My Credentials<", ">{t('pages.workforce.credentialsTitle')}<"),
    ],
    'workforce/Tasks.jsx': [
        (">My Tasks<", ">{t('pages.workforce.tasksTitle')}<"),
    ],
    'workforce/ClockInOut.jsx': [
        (">Clock In/Out<", ">{t('pages.workforce.clockInOutTitle')}<"),
    ],
    'workforce/EmploymentHistory.jsx': [
        (">Employment History<", ">{t('pages.workforce.employmentHistoryTitle')}<"),
    ],
    'workforce/WorkPassportView.jsx': [
        (">WorkPassport<", ">{t('nav.workforce.workPassport')}<"),
    ],
}

# ===== EMPLOYER PAGES =====
employer_replacements = {
    'employer/Roster.jsx': [
        (">Roster Management<", ">{t('pages.employer.rosterTitle')}<"),
        (">Roster<", ">{t('nav.employer.roster')}<"),
    ],
    'employer/WorkOrders.jsx': [
        (">Work Orders<", ">{t('pages.employer.workOrdersTitle')}<"),
    ],
    'employer/Workplaces.jsx': [
        (">Workplaces<", ">{t('pages.employer.workplacesTitle')}<"),
    ],
    'employer/Roles.jsx': [
        (">Workplace Roles<", ">{t('pages.employer.rolesTitle')}<"),
    ],
    'employer/WorkforceManagement.jsx': [
        (">Team Management<", ">{t('pages.employer.teamTitle')}<"),
    ],
    'employer/LiveAttendance.jsx': [
        (">Live Attendance<", ">{t('pages.employer.liveAttendanceTitle')}<"),
    ],
    'employer/TimeOff.jsx': [
        (">Time Off Management<", ">{t('pages.employer.timeOffTitle')}<"),
        (">Time Off<", ">{t('nav.employer.timeOff')}<"),
    ],
    'employer/Timesheets.jsx': [
        (">Timesheets<", ">{t('pages.employer.timesheetsTitle')}<"),
    ],
    'employer/Payroll.jsx': [
        (">Payroll<", ">{t('pages.employer.payrollTitle')}<"),
    ],
    'employer/PayrollExport.jsx': [
        (">Payroll Export<", ">{t('pages.employer.payrollExportTitle')}<"),
    ],
    'employer/PayrollSync.jsx': [
        (">Payroll Sync<", ">{t('pages.employer.payrollSyncTitle')}<"),
    ],
    'employer/Invoices.jsx': [
        (">Invoices<", ">{t('pages.employer.invoicesTitle')}<"),
    ],
    'employer/Insurance.jsx': [
        (">Insurance Upload<", ">{t('pages.employer.insuranceTitle')}<"),
        (">Insurance<", ">{t('nav.employer.insurance')}<"),
    ],
    'employer/JurisdictionSettings.jsx': [
        (">Jurisdiction Settings<", ">{t('pages.employer.jurisdictionsTitle')}<"),
    ],
    'employer/Documents.jsx': [
        (">Documents<", ">{t('pages.employer.documentsTitle')}<"),
    ],
    'employer/Settings.jsx': [
        (">Settings<", ">{t('pages.common.settingsTitle')}<"),
    ],
    'employer/Profile.jsx': [
        (">Company Profile<", ">{t('pages.employer.profileTitle')}<"),
    ],
    'employer/Billing.jsx': [
        (">Billing<", ">{t('pages.employer.billingTitle')}<"),
    ],
    'employer/Messages.jsx': [
        (">Messages<", ">{t('pages.employer.messagesTitle')}<"),
    ],
    'employer/FieldService.jsx': [
        (">Field Service<", ">{t('pages.employer.fieldServiceTitle')}<"),
    ],
}

# ===== INSTITUTION PAGES =====
institution_replacements = {
    'institution/InstitutionDashboard.jsx': [
        (">Institution Dashboard<", ">{t('pages.institution.dashboardTitle')}<"),
    ],
    'institution/ProgramsManagement.jsx': [
        (">Programs Management<", ">{t('pages.institution.programsTitle')}<"),
        (">Programs<", ">{t('nav.institution.programs')}<"),
    ],
    'institution/ClassesManagement.jsx': [
        (">Cohorts<", ">{t('nav.institution.cohorts')}<"),
    ],
    'institution/IssueCredential.jsx': [
        (">Issue Credential<", ">{t('pages.institution.issueCredentialTitle')}<"),
    ],
    'institution/CredentialsManagement.jsx': [
        (">Manage Credentials<", ">{t('pages.institution.manageCredentialsTitle')}<"),
    ],
    'institution/VerificationRequests.jsx': [
        (">Verification Requests<", ">{t('pages.institution.verificationTitle')}<"),
    ],
    'institution/Marketplace.jsx': [
        (">Credentials Marketplace<", ">{t('pages.institution.marketplaceTitle')}<"),
        (">Marketplace<", ">{t('nav.institution.marketplace')}<"),
    ],
    'institution/InviteStudents.jsx': [
        (">Invite Students<", ">{t('pages.institution.inviteStudentsTitle')}<"),
    ],
    'institution/TranscriptsManagement.jsx': [
        (">Transcripts<", ">{t('nav.institution.transcripts')}<"),
    ],
    'institution/Payouts.jsx': [
        (">Payouts<", ">{t('nav.institution.payouts')}<"),
    ],
    'institution/Financials.jsx': [
        (">Financial Summary<", ">{t('pages.institution.financialTitle')}<"),
    ],
    'institution/Fundraisers.jsx': [
        (">Fundraisers<", ">{t('pages.institution.fundraisersTitle')}<"),
    ],
}

# ===== ADMIN PAGES =====
admin_replacements = {
    'admin/SuperDashboard.jsx': [
        (">Admin Dashboard<", ">{t('pages.admin.dashboardTitle')}<"),
    ],
    'admin/PendingActivations.jsx': [
        (">Pending Activations<", ">{t('pages.admin.activationsTitle')}<"),
        (">Account Activations<", ">{t('pages.admin.activationsTitle')}<"),
    ],
    'admin/AdminUsers.jsx': [
        (">All Users<", ">{t('pages.admin.allUsersTitle')}<"),
    ],
    'admin/IDDocuments.jsx': [
        (">ID Document Review<", ">{t('pages.admin.idVerificationTitle')}<"),
    ],
    'admin/InsuranceReview.jsx': [
        (">Insurance Review<", ">{t('pages.admin.insuranceReviewTitle')}<"),
    ],
    'admin/DocumentExpiry.jsx': [
        (">Document Expiry<", ">{t('pages.admin.documentExpiryTitle')}<"),
    ],
    'admin/AdminManagement.jsx': [
        (">Admin Users<", ">{t('pages.admin.adminUsersTitle')}<"),
    ],
    'admin/ManageOccupations.jsx': [
        (">Occupation Templates<", ">{t('pages.admin.occupationsTitle')}<"),
    ],
    'admin/MinimumWage.jsx': [
        (">Minimum Wage<", ">{t('pages.admin.minimumWageTitle')}<"),
    ],
    'admin/Franchises.jsx': [
        (">Franchise Management<", ">{t('pages.admin.franchisesTitle')}<"),
    ],
    'admin/Employers.jsx': [
        (">Employers<", ">{t('pages.admin.employersTitle')}<"),
    ],
    'admin/Analytics.jsx': [
        (">Platform Analytics<", ">{t('pages.admin.analyticsTitle')}<"),
    ],
    'admin/Revenue.jsx': [
        (">Revenue Dashboard<", ">{t('pages.admin.revenueTitle')}<"),
    ],
    'admin/AuditLogs.jsx': [
        (">Audit Logs<", ">{t('pages.admin.auditTitle')}<"),
    ],
    'admin/PlatformSettings.jsx': [
        (">Platform Settings<", ">{t('pages.admin.settingsTitle')}<"),
    ],
    'admin/NotificationSettings.jsx': [
        (">Notification Settings<", ">{t('pages.admin.notificationsTitle')}<"),
    ],
    'admin/SOC2.jsx': [
        (">SOC2 Compliance<", ">{t('pages.admin.soc2Title')}<"),
    ],
}

# Process all replacements
all_replacements = {}
all_replacements.update(workforce_replacements)
all_replacements.update(employer_replacements)
all_replacements.update(institution_replacements)
all_replacements.update(admin_replacements)

for rel_path, replacement_list in all_replacements.items():
    filepath = os.path.join(BASE, rel_path)
    if not os.path.exists(filepath):
        continue
    for old, new in replacement_list:
        if safe_replace(filepath, old, new):
            count += 1

print(f"Total heading replacements: {count}")
