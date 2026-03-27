#!/usr/bin/env python3
"""
Batch-add useLanguage import and t() function to all page files.
This adds the infrastructure for translation to each page without changing the UI logic.
"""
import os
import re

PAGES_DIR = '/app/frontend/src/pages'

# Map of page directories to their translation key prefix
SECTION_MAP = {
    'workforce': 'workforce',
    'employer': 'employer', 
    'institution': 'institution',
    'admin': 'admin',
    'auth': 'auth',
    'common': 'common',
    'landing': 'landing',
    'public': 'common',
    'workpassport': 'workpassport',
    'legal': 'common',
    'donation': 'common',
    'subdomains': 'common'
}

# Page title replacements - maps hardcoded title text to translation keys
TITLE_REPLACEMENTS = {
    # Workforce pages
    'Workforce Dashboard': "t('pages.workforce.dashboardTitle')",
    'My Schedule': "t('pages.workforce.scheduleTitle')",
    'Performance Overview': "t('pages.workforce.performanceTitle')",
    'Performance': "t('nav.workforce.performance')",
    'Attendance History': "t('pages.workforce.attendanceTitle')",
    'Attendance': "t('nav.workforce.attendance')",
    'My Wallet': "t('pages.workforce.walletTitle')",
    'My Timesheets': "t('pages.workforce.timesheetsTitle')",
    'My Invoices': "t('pages.workforce.invoicesTitle')",
    'Time Off': "t('pages.workforce.timeOffTitle')",
    'Occupation Profiles': "t('pages.workforce.profilesTitle')",
    'Find Jobs': "t('pages.workforce.findJobsTitle')",
    'My Routes': "t('pages.workforce.routesTitle')",
    'My Documents': "t('pages.workforce.documentsTitle')",
    'My Credentials': "t('pages.workforce.credentialsTitle')",
    'My Tasks': "t('pages.workforce.tasksTitle')",
    'Clock In/Out': "t('pages.workforce.clockInOutTitle')",
    'Employment History': "t('pages.workforce.employmentHistoryTitle')",
    
    # Employer pages  
    'Employer Dashboard': "t('pages.employer.homeTitle')",
    'Roster Management': "t('pages.employer.rosterTitle')",
    'Work Orders': "t('pages.employer.workOrdersTitle')",
    'Workplaces': "t('pages.employer.workplacesTitle')",
    'Team Management': "t('pages.employer.teamTitle')",
    'Live Attendance': "t('pages.employer.liveAttendanceTitle')",
    'Time Off Management': "t('pages.employer.timeOffTitle')",
    'Payroll': "t('pages.employer.payrollTitle')",
    'Payroll Export': "t('pages.employer.payrollExportTitle')",
    'Payroll Sync': "t('pages.employer.payrollSyncTitle')",
    'Insurance Upload': "t('pages.employer.insuranceTitle')",
    'Jurisdiction Settings': "t('pages.employer.jurisdictionsTitle')",
    'Company Profile': "t('pages.employer.profileTitle')",
    
    # Institution pages
    'Institution Dashboard': "t('pages.institution.dashboardTitle')",
    'Programs Management': "t('pages.institution.programsTitle')",
    'Issue Credential': "t('pages.institution.issueCredentialTitle')",
    'Manage Credentials': "t('pages.institution.manageCredentialsTitle')",
    'Verification Requests': "t('pages.institution.verificationTitle')",
    'Credentials Marketplace': "t('pages.institution.marketplaceTitle')",
    'Invite Students': "t('pages.institution.inviteStudentsTitle')",
    'Transcripts Management': "t('pages.institution.transcriptsTitle')",
    'Payouts Dashboard': "t('pages.institution.payoutsTitle')",
    'Financial Summary': "t('pages.institution.financialTitle')",
    'Institution Settings': "t('pages.institution.settingsTitle')",
    
    # Admin pages
    'Admin Dashboard': "t('pages.admin.dashboardTitle')",
    'Pending Activations': "t('pages.admin.activationsTitle')",
    'All Users': "t('pages.admin.allUsersTitle')",
    'ID Document Review': "t('pages.admin.idVerificationTitle')",
    'Insurance Review': "t('pages.admin.insuranceReviewTitle')",
    'Document Expiry': "t('pages.admin.documentExpiryTitle')",
    'Admin Users': "t('pages.admin.adminUsersTitle')",
    'Occupation Templates': "t('pages.admin.occupationsTitle')",
    'Minimum Wage': "t('pages.admin.minimumWageTitle')",
    'Franchise Management': "t('pages.admin.franchisesTitle')",
    'Platform Analytics': "t('pages.admin.analyticsTitle')",
    'Revenue Dashboard': "t('pages.admin.revenueTitle')",
    'SOC2 Compliance': "t('pages.admin.soc2Title')",
    'Audit Logs': "t('pages.admin.auditTitle')",
    'Platform Settings': "t('pages.admin.settingsTitle')",
    'Notification Settings': "t('pages.admin.notificationsTitle')",
    
    # Common pages
    'Settings': "t('pages.common.settingsTitle')",
    'Documents': "t('pages.common.documentsTitle')",
    'Messages': "t('pages.common.messagesTitle')",
    'Notifications': "t('pages.common.notificationsTitle')",
    'Help & Support': "t('pages.common.supportTitle')",
}

# Common button/label replacements
COMMON_REPLACEMENTS = {
    '>Loading...</': ">{'...' || t('common.loading')}</",  # Skip loading - too fragile
    '>Save<': ">{t('common.save')}<",
    '>Cancel<': ">{t('common.cancel')}<",
    '>Delete<': ">{t('common.delete')}<",
    '>Edit<': ">{t('common.edit')}<",
    '>Submit<': ">{t('common.submit')}<",
    '>Search<': ">{t('common.search')}<",
    '>Back<': ">{t('common.back')}<",
    '>Confirm<': ">{t('common.confirm')}<",
    '>Yes<': ">{t('common.yes')}<",
    '>No<': ">{t('common.no')}<",
}

def get_relative_import_path(filepath):
    """Calculate the relative path to contexts/LanguageContext from the file."""
    rel = os.path.relpath('/app/frontend/src/contexts/LanguageContext', os.path.dirname(filepath))
    if not rel.startswith('.'):
        rel = './' + rel
    return rel

def add_translation_to_file(filepath):
    """Add useLanguage import and t function to a page file."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Skip if already has useLanguage
    if 'useLanguage' in content:
        return False, "Already has useLanguage"
    
    # Skip non-component files
    if 'export' not in content:
        return False, "Not a component"
    
    original = content
    import_path = get_relative_import_path(filepath)
    import_line = f"import {{ useLanguage }} from '{import_path}';\n"
    
    # Add import after the last existing import
    last_import_idx = -1
    for m in re.finditer(r'^import\s+.*?;\s*$', content, re.MULTILINE):
        last_import_idx = m.end()
    
    if last_import_idx == -1:
        return False, "No imports found"
    
    content = content[:last_import_idx] + '\n' + import_line + content[last_import_idx:]
    
    # Find the component function and add { t } = useLanguage() after the first line
    # Look for patterns like: const ComponentName = () => { or function ComponentName() {
    # Also look for useState/useEffect/useAuth/useTheme patterns
    
    # Find existing hook calls to insert after them
    hook_patterns = [
        r'const\s+\{[^}]*\}\s*=\s*useAuth\(\)',
        r'const\s+\{[^}]*\}\s*=\s*useTheme\(\)',
        r'const\s+theme\s*=\s*useTheme\(\)',
        r'const\s+\{[^}]*\}\s*=\s*useNavigate\(\)',
        r'const\s+navigate\s*=\s*useNavigate\(\)',
    ]
    
    insert_pos = -1
    for pattern in hook_patterns:
        m = re.search(pattern, content)
        if m:
            # Find end of this line
            line_end = content.index('\n', m.end()) if '\n' in content[m.end():] else m.end()
            if line_end > insert_pos:
                insert_pos = line_end
    
    if insert_pos > 0:
        t_line = "\n  const { t } = useLanguage();"
        content = content[:insert_pos] + t_line + content[insert_pos:]
    else:
        # Try to find the component function body start
        func_pattern = re.search(r'(?:const\s+\w+\s*=\s*(?:\([^)]*\))?\s*=>\s*\{|function\s+\w+\s*\([^)]*\)\s*\{)', content)
        if func_pattern:
            brace_pos = content.index('{', func_pattern.start())
            next_line = content.index('\n', brace_pos)
            t_line = "\n  const { t } = useLanguage();"
            content = content[:next_line] + t_line + content[next_line:]
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True, "Added useLanguage"
    
    return False, "No changes needed"

# Process all page files
results = {'modified': 0, 'skipped': 0, 'errors': 0}
for root, dirs, files in os.walk(PAGES_DIR):
    for fname in sorted(files):
        if not fname.endswith('.jsx'):
            continue
        filepath = os.path.join(root, fname)
        try:
            modified, reason = add_translation_to_file(filepath)
            if modified:
                results['modified'] += 1
                print(f"  + {os.path.relpath(filepath, PAGES_DIR)}")
            else:
                results['skipped'] += 1
        except Exception as e:
            results['errors'] += 1
            print(f"  ! {os.path.relpath(filepath, PAGES_DIR)}: {e}")

print(f"\nResults: {results['modified']} modified, {results['skipped']} skipped, {results['errors']} errors")
