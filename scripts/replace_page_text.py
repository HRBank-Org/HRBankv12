#!/usr/bin/env python3
"""
Replace hardcoded page titles and headings with t() translation calls.
Only replaces strings in JSX text content and heading attributes.
"""
import os
import re

PAGES_DIR = '/app/frontend/src/pages'

# Define replacements per section with regex patterns
# Format: (file_glob, search_pattern, replacement)
replacements = []

def safe_replace_in_file(filepath, old_text, new_text, max_replacements=1):
    """Replace text in file, return True if replacement was made."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    if old_text in content:
        content = content.replace(old_text, new_text, max_replacements)
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

count = 0

# ============================================
# AUTH PAGES
# ============================================

# Login page - translate labels
for filepath, replacements_list in [
    ('auth/Login.jsx', [
        ("'WorkPassport™'", "t('landing.forWorkers')"),
        ("'Employer'", "t('employer.title')"),
        ("'Institution'", "t('institution.title')"),
        (">Sign in to your account<", ">{t('auth.login')}<"),
        (">Don't have an account?<", ">{t('auth.noAccount')}<"),
        (">Sign Up<", ">{t('auth.signup')}<"),
        (">Email<", ">{t('auth.email')}<"),
        (">Password<", ">{t('auth.password')}<"),
        (">Forgot password?<", ">{t('auth.forgotPassword')}<"),
        (">Sign In<", ">{t('auth.login')}<"),
        (">Or continue with<", ">{t('auth.orContinueWith')}<"),
    ]),
    ('auth/Signup.jsx', [
        (">Create Account<", ">{t('auth.createAccount')}<"),
        (">Already have an account?<", ">{t('auth.hasAccount')}<"),
        (">Sign In<", ">{t('auth.login')}<"),
        (">Email<", ">{t('auth.email')}<"),
        (">Password<", ">{t('auth.password')}<"),
        (">Confirm Password<", ">{t('auth.confirmPassword')}<"),
    ]),
    ('auth/ForgotPassword.jsx', [
        (">Forgot Password<", ">{t('auth.forgotPassword')}<"),
        (">Reset Password<", ">{t('auth.resetPassword')}<"),
        (">Back to Login<", ">{t('common.back')}<"),
        (">Email<", ">{t('auth.email')}<"),
    ]),
    ('auth/ResetPassword.jsx', [
        (">Reset Password<", ">{t('auth.resetPassword')}<"),
        (">New Password<", ">{t('auth.password')}<"),
        (">Confirm Password<", ">{t('auth.confirmPassword')}<"),
    ]),
    ('auth/VerifyOTP.jsx', [
        (">Verify Code<", ">{t('auth.enterOtp')}<"),
        (">Resend Code<", ">{t('auth.resendOtp')}<"),
    ]),
]:
    full_path = os.path.join(PAGES_DIR, filepath)
    if os.path.exists(full_path):
        for old, new in replacements_list:
            if safe_replace_in_file(full_path, old, new):
                count += 1

# ============================================
# COMMON BUTTON/LABEL REPLACEMENTS ACROSS ALL FILES
# ============================================

# Replace common buttons and labels across all page files
common_replacements = [
    # Buttons
    ('>Save Changes<', '>{t("common.save")}<'),
    ('>Save</', '>{t("common.save")}</'),
    ('>Cancel</', '>{t("common.cancel")}</'),
    ('>Delete</', '>{t("common.delete")}</'),
    ('>Submit</', '>{t("common.submit")}</'),
    ('>Confirm</', '>{t("common.confirm")}</'),
    ('>Back</', '>{t("common.back")}</'),
    ('>Close</', '>{t("common.close")}</'),
    ('>Edit</', '>{t("common.edit")}</'),
    ('>Export</', '>{t("pages.common.export")}</'),
    ('>Download</', '>{t("pages.common.download")}</'),
    ('>Upload</', '>{t("pages.common.upload")}</'),
    ('>Refresh</', '>{t("pages.common.refresh")}</'),
    
    # Status labels
    ('>Pending</', '>{t("pages.common.pending")}</'),
    ('>Approved</', '>{t("pages.common.approved")}</'),
    ('>Rejected</', '>{t("pages.common.rejected")}</'),
    ('>Completed</', '>{t("pages.common.completed")}</'),
    ('>In Progress</', '>{t("pages.common.inProgress")}</'),
    ('>Cancelled</', '>{t("pages.common.cancelled")}</'),
    ('>Active</', '>{t("pages.common.active")}</'),
    ('>Inactive</', '>{t("pages.common.inactive")}</'),
    ('>Verified</', '>{t("pages.common.verified")}</'),
    
    # Table headers
    ('>Status</', '>{t("pages.common.status")}</'),
    ('>Actions</', '>{t("pages.common.actions")}</'),
    ('>Name</', '>{t("pages.common.name")}</'),
    ('>Email</', '>{t("pages.common.email")}</'),
    ('>Date</', '>{t("pages.common.date")}</'),
    ('>Type</', '>{t("pages.common.type")}</'),
    ('>Amount</', '>{t("pages.common.amount")}</'),
    ('>Description</', '>{t("pages.common.description")}</'),
    
    # Common labels
    ('>No results found<', '>{t("common.noResults")}<'),
    ('>No data available<', '>{t("pages.common.noData")}<'),
    ("'No results found'", "t('common.noResults')"),
]

for root, dirs, files in os.walk(PAGES_DIR):
    for fname in sorted(files):
        if not fname.endswith('.jsx'):
            continue
        filepath = os.path.join(root, fname)
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        if 'useLanguage' not in content:
            continue
            
        original = content
        for old, new in common_replacements:
            content = content.replace(old, new)
        
        if content != original:
            with open(filepath, 'w') as f:
                f.write(content)
            rel = os.path.relpath(filepath, PAGES_DIR)
            count += 1

print(f"\nTotal replacements made across {count} operations")
