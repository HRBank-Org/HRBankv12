#!/usr/bin/env python3
"""
HR Bank Institution Withdrawal System Backend API Testing
Testing Institution Withdrawal System with Stripe Connect Express integration for HR Bank
Focus: Stripe Connect account management, payout balance, tax information, credential payment with tax
"""

import requests
import json
import uuid
import time
from datetime import datetime, timedelta, date
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
BASE_URL = f"{BACKEND_URL}/api"

print(f"🚀 HR BANK INSTITUTION WITHDRAWAL SYSTEM BACKEND API TESTING")
print(f"Testing backend at: {BASE_URL}")
print(f"Base URL: {BACKEND_URL}")
print(f"Focus: Stripe Connect account management, payout balance, tax information, credential payment with tax")
print("="*80)

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_pass(self, test_name):
        self.passed += 1
        print(f"✅ PASS: {test_name}")
    
    def add_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ FAIL: {test_name} - {error}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")
        return len(self.errors) == 0

def test_super_admin_system(results):
    """Test the Super Admin System for HR Bank"""
    print("\n🧪 Testing Super Admin System for HR Bank (Priority: HIGH)...")
    print("   Testing endpoints: Admin Authentication, Dashboard, Roles, Pending Activations, Admin List, Franchise Management, Support Tickets")
    print("   Test credentials: Super Admin: qnizami@hrbank.ca / Test123!")
    print("   Base URL: https://taxsmart-9.preview.emergentagent.com")
    
    # Test credentials from review request
    admin_creds = {"email": "qnizami@hrbank.ca", "password": "Test123!", "user_type": "admin"}
    
    # Test 1: Admin Authentication
    admin_token = None
    print("\n   Test 1: Admin Authentication - POST /api/auth/login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=admin_creds, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                admin_token = data["data"]["access_token"]
                user_data = data.get("data", {})
                
                # Verify user_type is "admin"
                if user_data.get("user_type") == "admin":
                    results.add_pass("Admin authentication - user_type is 'admin'")
                    print(f"      Admin ID: {user_data.get('user_id', 'N/A')}")
                    print(f"      User Type: {user_data.get('user_type', 'N/A')}")
                else:
                    results.add_fail("Admin authentication", f"Expected user_type 'admin', got '{user_data.get('user_type')}'")
            else:
                results.add_fail("Admin authentication", f"Invalid response: {data}")
        else:
            results.add_fail("Admin authentication", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Admin authentication", f"Request failed: {str(e)}")
    
    # Test 2: Super Admin Dashboard API
    if admin_token:
        print("\n   Test 2: Super Admin Dashboard - GET /api/super-admin/dashboard")
        try:
            response = requests.get(
                f"{BASE_URL}/super-admin/dashboard",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    dashboard_data = data["data"]
                    
                    # Check admin info section (actual field name is "admin")
                    admin_info = dashboard_data.get("admin", {})
                    if "role" in admin_info and "is_super_admin" in admin_info and "assigned_provinces" in admin_info:
                        results.add_pass("Dashboard admin_info - All required fields present")
                        print(f"      Admin role: {admin_info.get('role', 'N/A')}")
                        print(f"      Is super admin: {admin_info.get('is_super_admin', 'N/A')}")
                        print(f"      Assigned provinces: {admin_info.get('assigned_provinces', [])}")
                    else:
                        results.add_fail("Dashboard admin_info", "Missing required fields (role, is_super_admin, assigned_provinces)")
                    
                    # Check action items section
                    action_items = dashboard_data.get("action_items", {})
                    if "pending_activations" in action_items and "pending_credentials" in action_items and "open_tickets" in action_items:
                        results.add_pass("Dashboard action_items - All required fields present")
                        print(f"      Pending activations: {action_items.get('pending_activations', 0)}")
                        print(f"      Pending credentials: {action_items.get('pending_credentials', 0)}")
                        print(f"      Open tickets: {action_items.get('open_tickets', 0)}")
                    else:
                        results.add_fail("Dashboard action_items", "Missing required fields (pending_activations, pending_credentials, open_tickets)")
                    
                    # Check platform stats section
                    platform_stats = dashboard_data.get("platform_stats", {})
                    required_stats = ["total_workforce", "total_employers", "total_institutions", "total_admins", "total_franchises"]
                    missing_stats = [stat for stat in required_stats if stat not in platform_stats]
                    
                    if not missing_stats:
                        results.add_pass("Dashboard platform_stats - All required fields present")
                        print(f"      Total workforce: {platform_stats.get('total_workforce', 0)}")
                        print(f"      Total employers: {platform_stats.get('total_employers', 0)}")
                        print(f"      Total institutions: {platform_stats.get('total_institutions', 0)}")
                        print(f"      Total admins: {platform_stats.get('total_admins', 0)}")
                        print(f"      Total franchises: {platform_stats.get('total_franchises', 0)}")
                    else:
                        results.add_fail("Dashboard platform_stats", f"Missing required fields: {missing_stats}")
                else:
                    results.add_fail("Super Admin Dashboard", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/dashboard", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/dashboard", f"Request failed: {str(e)}")
    
    # Test 3: Admin Roles API
    if admin_token:
        print("\n   Test 3: Admin Roles - GET /api/super-admin/roles")
        try:
            response = requests.get(
                f"{BASE_URL}/super-admin/roles",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    roles_data = data["data"]
                    roles = roles_data.get("roles", [])
                    
                    # Check if all 7 expected roles are present
                    expected_roles = [
                        "super_admin", "regional_manager", "account_activator",
                        "credentials_reviewer", "customer_service", "compliance_officer", "franchise_manager"
                    ]
                    
                    role_types = [role.get("role_type") for role in roles]
                    missing_roles = [role for role in expected_roles if role not in role_types]
                    
                    if len(roles) == 7 and not missing_roles:
                        results.add_pass("Admin Roles - All 7 role types returned")
                        print(f"      Total roles: {len(roles)}")
                        
                        # Check if each role has permissions (field name is "default_permissions")
                        roles_with_permissions = [role for role in roles if "default_permissions" in role]
                        if len(roles_with_permissions) == len(roles):
                            results.add_pass("Admin Roles - All roles have permissions defined")
                            for role in roles:
                                permissions_count = len(role.get('default_permissions', {}))
                                print(f"      Role: {role.get('role_type', 'N/A')} - Permissions: {permissions_count}")
                        else:
                            results.add_fail("Admin Roles permissions", f"Some roles missing permissions: {len(roles_with_permissions)}/{len(roles)}")
                    else:
                        results.add_fail("Admin Roles", f"Expected 7 roles, got {len(roles)}. Missing: {missing_roles}")
                else:
                    results.add_fail("Admin Roles", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/roles", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/roles", f"Request failed: {str(e)}")
    
    # Test 4: Pending Activations API
    if admin_token:
        print("\n   Test 4: Pending Activations - GET /api/super-admin/pending-activations")
        try:
            response = requests.get(
                f"{BASE_URL}/super-admin/pending-activations",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    activations_data = data["data"]
                    users = activations_data.get("users", [])
                    total = activations_data.get("total", 0)
                    page = activations_data.get("page", 1)
                    
                    results.add_pass("Pending Activations - Endpoint accessible with pagination")
                    print(f"      Total pending users: {total}")
                    print(f"      Current page: {page}")
                    print(f"      Users in response: {len(users)}")
                    
                    # Test with filter
                    print("\n   Test 4.1: Pending Activations with filter - GET /api/super-admin/pending-activations?user_type=employer")
                    filter_response = requests.get(
                        f"{BASE_URL}/super-admin/pending-activations?user_type=employer",
                        headers={"Authorization": f"Bearer {admin_token}"},
                        timeout=10
                    )
                    
                    if filter_response.status_code == 200:
                        filter_data = filter_response.json()
                        if filter_data.get("success"):
                            results.add_pass("Pending Activations filter - Filter by user_type working")
                            filter_users = filter_data.get("data", {}).get("users", [])
                            print(f"      Filtered users (employer): {len(filter_users)}")
                        else:
                            results.add_fail("Pending Activations filter", f"Invalid filter response: {filter_data}")
                    else:
                        results.add_fail("Pending Activations filter", f"HTTP {filter_response.status_code}: {filter_response.text}")
                else:
                    results.add_fail("Pending Activations", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/pending-activations", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/pending-activations", f"Request failed: {str(e)}")
    
    # Test 5: Admin List API
    if admin_token:
        print("\n   Test 5: Admin List - GET /api/super-admin/admins")
        try:
            response = requests.get(
                f"{BASE_URL}/super-admin/admins",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    admins_data = data["data"]
                    admins = admins_data.get("admins", [])
                    total = admins_data.get("total", 0)
                    
                    results.add_pass("Admin List - Returns list of admin users with roles")
                    print(f"      Total admins: {total}")
                    print(f"      Admins in response: {len(admins)}")
                    
                    # Check if admins have roles defined
                    if admins:
                        admin_with_role = admins[0]
                        if "role" in admin_with_role or "admin_role" in admin_with_role:
                            results.add_pass("Admin List - Admin users have roles defined")
                        else:
                            results.add_fail("Admin List roles", "Admin users missing role information")
                else:
                    results.add_fail("Admin List", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/admins", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/admins", f"Request failed: {str(e)}")
    
    # Test 6: Franchise API
    if admin_token:
        print("\n   Test 6: Franchise Management - GET /api/super-admin/franchises")
        try:
            response = requests.get(
                f"{BASE_URL}/super-admin/franchises",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results.add_pass("Franchise API - Endpoint accessible and returns proper response structure")
                    franchises_data = data.get("data", {})
                    franchises = franchises_data.get("franchises", [])
                    total = franchises_data.get("total", 0)
                    print(f"      Total franchises: {total}")
                    print(f"      Franchises in response: {len(franchises)}")
                else:
                    results.add_fail("Franchise API", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/franchises", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/franchises", f"Request failed: {str(e)}")
    
    # Test 7: Support Tickets API
    if admin_token:
        print("\n   Test 7: Support Tickets - GET /api/super-admin/support-tickets")
        try:
            response = requests.get(
                f"{BASE_URL}/super-admin/support-tickets",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results.add_pass("Support Tickets API - Endpoint accessible and returns proper response structure")
                    tickets_data = data.get("data", {})
                    tickets = tickets_data.get("tickets", [])
                    total = tickets_data.get("total", 0)
                    print(f"      Total tickets: {total}")
                    print(f"      Tickets in response: {len(tickets)}")
                else:
                    results.add_fail("Support Tickets API", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/support-tickets", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/support-tickets", f"Request failed: {str(e)}")
    
    # Test 8: Authentication Enforcement
    print("\n   Test 8: Authentication Enforcement")
    
    # Test all super admin endpoints without authentication
    super_admin_endpoints = [
        ("GET", "/super-admin/dashboard"),
        ("GET", "/super-admin/roles"),
        ("GET", "/super-admin/pending-activations"),
        ("GET", "/super-admin/admins"),
        ("GET", "/super-admin/franchises"),
        ("GET", "/super-admin/support-tickets")
    ]
    
    for method, endpoint in super_admin_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            
            if response.status_code in [401, 403]:
                results.add_pass(f"Authentication required for {method} {endpoint}")
            else:
                results.add_fail(f"Authentication enforcement {method} {endpoint}", f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            results.add_fail(f"Authentication enforcement {method} {endpoint}", f"Request failed: {str(e)}")

def get_auth_headers(token):
    """Get authorization headers for API requests"""
    return {"Authorization": f"Bearer {token}"}

def test_career_profile_system(results):
    """Test the Career Profile System for workforce users"""
    print("\n🧪 Testing Career Profile System for Workforce Users (Priority: HIGH)...")
    print("   Testing endpoints: Career Profile Settings, Public Profile, Privacy Updates, Code Regeneration, Profile Stats")
    print("   Test credentials: Workforce: alex.johnson@email.com / Demo123!")
    print("   Base URL: https://taxsmart-9.preview.emergentagent.com")
    
    # Test credentials from review request
    workforce_creds = {"email": "alex.johnson@email.com", "password": "Demo123!", "user_type": "workforce"}
    
    # Test 1: Workforce Authentication
    workforce_token = None
    print("\n   Test 1: Workforce Authentication - POST /api/auth/login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=workforce_creds, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                workforce_token = data["data"]["access_token"]
                user_data = data.get("data", {})
                
                # Verify user_type is "workforce"
                if user_data.get("user_type") == "workforce":
                    results.add_pass("Workforce authentication - user_type is 'workforce'")
                    print(f"      Workforce ID: {user_data.get('user_id', 'N/A')}")
                    print(f"      User Type: {user_data.get('user_type', 'N/A')}")
                else:
                    results.add_fail("Workforce authentication", f"Expected user_type 'workforce', got '{user_data.get('user_type')}'")
            else:
                results.add_fail("Workforce authentication", f"Invalid response: {data}")
        else:
            results.add_fail("Workforce authentication", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Workforce authentication", f"Request failed: {str(e)}")
    
    # Test 2: Get Career Profile Settings
    profile_code = None
    if workforce_token:
        print("\n   Test 2: Get Career Profile Settings - GET /api/career-profile/my-settings")
        try:
            response = requests.get(
                f"{BASE_URL}/career-profile/my-settings",
                headers={"Authorization": f"Bearer {workforce_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    settings_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["workforce_id", "profile_code", "privacy", "profile_url", "qr_code"]
                    missing_fields = [field for field in required_fields if field not in settings_data]
                    
                    if not missing_fields:
                        results.add_pass("Career Profile Settings - All required fields present")
                        profile_code = settings_data.get("profile_code")
                        print(f"      Profile Code: {profile_code}")
                        print(f"      Profile URL: {settings_data.get('profile_url', 'N/A')}")
                        print(f"      QR Code: {'Present' if settings_data.get('qr_code') else 'Missing'}")
                        
                        # Verify QR code is base64 encoded PNG
                        qr_code = settings_data.get("qr_code", "")
                        if qr_code.startswith("data:image/png;base64,"):
                            results.add_pass("Career Profile Settings - QR code is base64 encoded PNG")
                        else:
                            results.add_fail("Career Profile Settings QR code", "QR code is not base64 encoded PNG")
                        
                        # Verify profile code is 8 characters uppercase
                        if profile_code and len(profile_code) == 8 and profile_code.isupper():
                            results.add_pass("Career Profile Settings - Profile code is 8 characters uppercase")
                        else:
                            results.add_fail("Career Profile Settings profile code", f"Profile code '{profile_code}' is not 8 characters uppercase")
                        
                        # Verify profile URL format
                        expected_url_pattern = f"https://taxsmart-9.preview.emergentagent.com/profile/{profile_code}"
                        if settings_data.get("profile_url") == expected_url_pattern:
                            results.add_pass("Career Profile Settings - Profile URL format correct")
                        else:
                            results.add_fail("Career Profile Settings URL", f"Expected URL pattern not matched")
                    else:
                        results.add_fail("Career Profile Settings", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Career Profile Settings", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/career-profile/my-settings", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/career-profile/my-settings", f"Request failed: {str(e)}")
    
    # Test 3: Get Public Profile (NO AUTH)
    if profile_code:
        print(f"\n   Test 3: Get Public Profile (NO AUTH) - GET /api/career-profile/public/{profile_code}")
        try:
            # Test with the known profile code from review request
            test_profile_code = "BDE43B74"
            response = requests.get(f"{BASE_URL}/career-profile/public/{test_profile_code}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    profile_data = data["data"]
                    
                    # Check required public profile fields
                    required_fields = ["profile_code", "verified", "full_name"]
                    missing_fields = [field for field in required_fields if field not in profile_data]
                    
                    if not missing_fields:
                        results.add_pass("Public Profile - Basic fields present (name, verified status)")
                        print(f"      Profile Code: {profile_data.get('profile_code', 'N/A')}")
                        print(f"      Full Name: {profile_data.get('full_name', 'N/A')}")
                        print(f"      Verified: {profile_data.get('verified', False)}")
                        
                        # Check location info
                        if "location" in profile_data:
                            location = profile_data["location"]
                            if "city" in location and "province" in location:
                                results.add_pass("Public Profile - Location info present (city, province)")
                                print(f"      Location: {location.get('city', '')}, {location.get('province', '')}")
                            else:
                                results.add_fail("Public Profile location", "Missing city or province in location")
                        
                        # Check occupation profiles
                        if "occupation_profiles" in profile_data:
                            occupations = profile_data["occupation_profiles"]
                            results.add_pass("Public Profile - Occupation profiles present")
                            print(f"      Occupations: {len(occupations)} found")
                        
                        # Check summary stats
                        if "summary" in profile_data:
                            summary = profile_data["summary"]
                            results.add_pass("Public Profile - Summary statistics present")
                            print(f"      Summary: {summary}")
                    else:
                        results.add_fail("Public Profile", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Public Profile", f"Invalid response structure: {data}")
            elif response.status_code == 404:
                # Try with the actual profile code from settings
                print(f"   Test 3.1: Trying with actual profile code - GET /api/career-profile/public/{profile_code}")
                response = requests.get(f"{BASE_URL}/career-profile/public/{profile_code}", timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        results.add_pass("Public Profile - Accessible with actual profile code")
                        profile_data = data["data"]
                        print(f"      Profile Code: {profile_data.get('profile_code', 'N/A')}")
                        print(f"      Full Name: {profile_data.get('full_name', 'N/A')}")
                    else:
                        results.add_fail("Public Profile", f"Invalid response: {data}")
                else:
                    results.add_fail("Public Profile", f"Profile not found with either test code or actual code")
            else:
                results.add_fail("GET /api/career-profile/public/{profile_code}", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/career-profile/public/{profile_code}", f"Request failed: {str(e)}")
    
    # Test 4: Update Privacy Settings
    if workforce_token:
        print("\n   Test 4: Update Privacy Settings - PATCH /api/career-profile/my-settings")
        try:
            # Test updating show_credentials to false
            privacy_update = {"show_credentials": False}
            response = requests.patch(
                f"{BASE_URL}/career-profile/my-settings",
                json=privacy_update,
                headers={"Authorization": f"Bearer {workforce_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    privacy_data = data["data"]["privacy"]
                    
                    if privacy_data.get("show_credentials") == False:
                        results.add_pass("Privacy Settings Update - show_credentials set to false")
                        print(f"      Updated privacy: show_credentials = {privacy_data.get('show_credentials')}")
                    else:
                        results.add_fail("Privacy Settings Update", f"show_credentials not updated correctly")
                else:
                    results.add_fail("Privacy Settings Update", f"Invalid response structure: {data}")
            else:
                results.add_fail("PATCH /api/career-profile/my-settings", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("PATCH /api/career-profile/my-settings", f"Request failed: {str(e)}")
    
    # Test 5: Verify Public Profile Hides Credentials
    if profile_code:
        print(f"\n   Test 5: Verify Public Profile Hides Credentials - GET /api/career-profile/public/{profile_code}")
        try:
            response = requests.get(f"{BASE_URL}/career-profile/public/{profile_code}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    profile_data = data["data"]
                    
                    # Check if credentials are hidden in occupation profiles
                    occupations = profile_data.get("occupation_profiles", [])
                    credentials_hidden = True
                    
                    for occ in occupations:
                        if "credentials" in occ and occ["credentials"]:
                            credentials_hidden = False
                            break
                    
                    # Check blockchain credentials
                    blockchain_creds = profile_data.get("blockchain_credentials", [])
                    if blockchain_creds:
                        credentials_hidden = False
                    
                    if credentials_hidden:
                        results.add_pass("Privacy Settings Effect - Credentials hidden in public profile")
                        print(f"      Credentials properly hidden from public view")
                    else:
                        results.add_fail("Privacy Settings Effect", "Credentials still visible despite privacy setting")
                else:
                    results.add_fail("Public Profile Verification", f"Invalid response structure: {data}")
            else:
                results.add_fail("Public Profile Verification", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("Public Profile Verification", f"Request failed: {str(e)}")
    
    # Test 6: Profile Stats
    if workforce_token:
        print("\n   Test 6: Profile Stats - GET /api/career-profile/stats")
        try:
            response = requests.get(
                f"{BASE_URL}/career-profile/stats",
                headers={"Authorization": f"Bearer {workforce_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    stats_data = data["data"]
                    
                    # Check required stats fields
                    required_fields = ["total_views", "views_this_month", "views_this_week"]
                    missing_fields = [field for field in required_fields if field not in stats_data]
                    
                    if not missing_fields:
                        results.add_pass("Profile Stats - All required fields present")
                        print(f"      Total Views: {stats_data.get('total_views', 0)}")
                        print(f"      Views This Month: {stats_data.get('views_this_month', 0)}")
                        print(f"      Views This Week: {stats_data.get('views_this_week', 0)}")
                    else:
                        results.add_fail("Profile Stats", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Profile Stats", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/career-profile/stats", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/career-profile/stats", f"Request failed: {str(e)}")
    
    # Test 7: Regenerate Profile Code
    if workforce_token:
        print("\n   Test 7: Regenerate Profile Code - POST /api/career-profile/regenerate-code")
        try:
            response = requests.post(
                f"{BASE_URL}/career-profile/regenerate-code",
                headers={"Authorization": f"Bearer {workforce_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    regen_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["profile_code", "profile_url", "qr_code"]
                    missing_fields = [field for field in required_fields if field not in regen_data]
                    
                    if not missing_fields:
                        new_code = regen_data.get("profile_code")
                        
                        # Verify new code is different from old code
                        if new_code != profile_code:
                            results.add_pass("Regenerate Profile Code - New code generated")
                            print(f"      Old Code: {profile_code}")
                            print(f"      New Code: {new_code}")
                            
                            # Verify new code is 8 characters uppercase
                            if len(new_code) == 8 and new_code.isupper():
                                results.add_pass("Regenerate Profile Code - New code format correct")
                            else:
                                results.add_fail("Regenerate Profile Code format", f"New code '{new_code}' is not 8 characters uppercase")
                        else:
                            results.add_fail("Regenerate Profile Code", "New code is same as old code")
                    else:
                        results.add_fail("Regenerate Profile Code", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Regenerate Profile Code", f"Invalid response structure: {data}")
            else:
                results.add_fail("POST /api/career-profile/regenerate-code", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST /api/career-profile/regenerate-code", f"Request failed: {str(e)}")
    
    # Test 8: Authentication Enforcement
    print("\n   Test 8: Authentication Enforcement")
    
    # Test career profile endpoints without authentication
    career_profile_endpoints = [
        ("GET", "/career-profile/my-settings"),
        ("PATCH", "/career-profile/my-settings"),
        ("POST", "/career-profile/regenerate-code"),
        ("GET", "/career-profile/stats")
    ]
    
    for method, endpoint in career_profile_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            elif method == "PATCH":
                response = requests.patch(f"{BASE_URL}{endpoint}", json={}, timeout=5)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", json={}, timeout=5)
            
            if response.status_code in [401, 403]:
                results.add_pass(f"Authentication required for {method} {endpoint}")
            else:
                results.add_fail(f"Authentication enforcement {method} {endpoint}", f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            results.add_fail(f"Authentication enforcement {method} {endpoint}", f"Request failed: {str(e)}")
    
    # Test 9: Public Endpoint (No Auth Required)
    print("\n   Test 9: Public Endpoint Access (No Auth Required)")
    try:
        # Test that public profile endpoint works without authentication
        test_code = "BDE43B74"
        response = requests.get(f"{BASE_URL}/career-profile/public/{test_code}", timeout=5)
        
        # Should work without auth (200) or return 404 if profile doesn't exist
        if response.status_code in [200, 404]:
            results.add_pass("Public Profile Endpoint - No authentication required")
            print(f"      Public endpoint returned HTTP {response.status_code} (expected)")
        else:
            results.add_fail("Public Profile Endpoint", f"Expected 200 or 404, got {response.status_code}")
    except Exception as e:
        results.add_fail("Public Profile Endpoint", f"Request failed: {str(e)}")

def test_credential_monetization_system(results):
    """Test the Credential Monetization System for HR Bank"""
    print("\n🧪 Testing Credential Monetization System for HR Bank (Priority: HIGH)...")
    print("   Testing endpoints: Pricing Tiers, Issue Pending, Institution Issued, My Pending, Initiate Payment")
    print("   Test credentials: Institution: demo@stclairecollege.ca / Demo123!, Workforce: alex.johnson@email.com / Demo123!")
    print("   Base URL: https://taxsmart-9.preview.emergentagent.com")
    
    # Test credentials from review request
    institution_creds = {"email": "demo@stclairecollege.ca", "password": "Demo123!", "user_type": "institution"}
    workforce_creds = {"email": "alex.johnson@email.com", "password": "Demo123!", "user_type": "workforce"}
    
    # Test 1: Get Pricing Tiers (No Auth Required)
    print("\n   Test 1: Get Pricing Tiers (No Auth) - GET /api/credential-payments/pricing-tiers")
    try:
        response = requests.get(f"{BASE_URL}/credential-payments/pricing-tiers", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "data" in data:
                pricing_data = data["data"]
                
                # Check required fields
                required_fields = ["tiers", "platform_fee_percentage", "currency"]
                missing_fields = [field for field in required_fields if field not in pricing_data]
                
                if not missing_fields:
                    results.add_pass("Pricing Tiers - All required fields present")
                    
                    # Check tiers
                    tiers = pricing_data.get("tiers", {})
                    expected_tiers = ["certificate", "diploma", "degree"]
                    missing_tiers = [tier for tier in expected_tiers if tier not in tiers]
                    
                    if not missing_tiers:
                        results.add_pass("Pricing Tiers - All 3 tiers present (certificate, diploma, degree)")
                        
                        # Check tier prices
                        cert_price = tiers.get("certificate", {}).get("price_cad", 0)
                        diploma_price = tiers.get("diploma", {}).get("price_cad", 0)
                        degree_price = tiers.get("degree", {}).get("price_cad", 0)
                        
                        if cert_price == 50.0 and diploma_price == 100.0 and degree_price == 200.0:
                            results.add_pass("Pricing Tiers - Correct prices ($50, $100, $200)")
                            print(f"      Certificate: ${cert_price} CAD")
                            print(f"      Diploma: ${diploma_price} CAD")
                            print(f"      Degree: ${degree_price} CAD")
                        else:
                            results.add_fail("Pricing Tiers prices", f"Incorrect prices: cert=${cert_price}, diploma=${diploma_price}, degree=${degree_price}")
                        
                        # Check platform fee
                        platform_fee = pricing_data.get("platform_fee_percentage", 0)
                        if platform_fee == 50.0:
                            results.add_pass("Pricing Tiers - Platform fee is 50%")
                            print(f"      Platform Fee: {platform_fee}%")
                        else:
                            results.add_fail("Pricing Tiers platform fee", f"Expected 50%, got {platform_fee}%")
                    else:
                        results.add_fail("Pricing Tiers", f"Missing tiers: {missing_tiers}")
                else:
                    results.add_fail("Pricing Tiers", f"Missing required fields: {missing_fields}")
            else:
                results.add_fail("Pricing Tiers", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET /api/credential-payments/pricing-tiers", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/credential-payments/pricing-tiers", f"Request failed: {str(e)}")
    
    # Test 2: Institution Authentication
    institution_token = None
    print("\n   Test 2: Institution Authentication - POST /api/auth/login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=institution_creds, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                institution_token = data["data"]["access_token"]
                user_data = data.get("data", {})
                
                # Verify user_type is "institution"
                if user_data.get("user_type") == "institution":
                    results.add_pass("Institution authentication - user_type is 'institution'")
                    print(f"      Institution ID: {user_data.get('user_id', 'N/A')}")
                    print(f"      User Type: {user_data.get('user_type', 'N/A')}")
                else:
                    results.add_fail("Institution authentication", f"Expected user_type 'institution', got '{user_data.get('user_type')}'")
            else:
                results.add_fail("Institution authentication", f"Invalid response: {data}")
        else:
            results.add_fail("Institution authentication", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Institution authentication", f"Request failed: {str(e)}")
    
    # Test 3: Workforce Authentication
    workforce_token = None
    print("\n   Test 3: Workforce Authentication - POST /api/auth/login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=workforce_creds, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                workforce_token = data["data"]["access_token"]
                user_data = data.get("data", {})
                
                # Verify user_type is "workforce"
                if user_data.get("user_type") == "workforce":
                    results.add_pass("Workforce authentication - user_type is 'workforce'")
                    print(f"      Workforce ID: {user_data.get('user_id', 'N/A')}")
                    print(f"      User Type: {user_data.get('user_type', 'N/A')}")
                else:
                    results.add_fail("Workforce authentication", f"Expected user_type 'workforce', got '{user_data.get('user_type')}'")
            else:
                results.add_fail("Workforce authentication", f"Invalid response: {data}")
        else:
            results.add_fail("Workforce authentication", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Workforce authentication", f"Request failed: {str(e)}")
    
    # Test 4: Issue Pending Credential to Existing User
    pending_credential_id = None
    if institution_token:
        print("\n   Test 4: Issue Pending Credential to Existing User - POST /api/credential-payments/issue-pending")
        try:
            credential_data = {
                "recipient_email": "alex.johnson@email.com",
                "recipient_name": "Alex Johnson",
                "student_id": "STU-2024-001",
                "credential_type": "certificate",
                "credential_name": "Food Handler Certificate",
                "program_name": "Food Safety Training",
                "issue_date": "2024-01-15",
                "expiry_date": "2026-01-15",
                "additional_details": {"course_hours": 8, "grade": "Pass"}
            }
            
            response = requests.post(
                f"{BASE_URL}/credential-payments/issue-pending",
                json=credential_data,
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    issue_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["pending_credential_id", "recipient_email", "recipient_has_account", "price_cad", "platform_fee_cad", "institution_payout_cad", "status"]
                    missing_fields = [field for field in required_fields if field not in issue_data]
                    
                    if not missing_fields:
                        results.add_pass("Issue Pending Credential - All required fields present")
                        pending_credential_id = issue_data.get("pending_credential_id")
                        
                        # Verify recipient has account
                        if issue_data.get("recipient_has_account") == True:
                            results.add_pass("Issue Pending Credential - Existing user detected")
                        else:
                            results.add_fail("Issue Pending Credential", "Existing user not detected")
                        
                        # Verify pricing
                        if issue_data.get("price_cad") == 50.0:
                            results.add_pass("Issue Pending Credential - Certificate price correct ($50)")
                        else:
                            results.add_fail("Issue Pending Credential price", f"Expected $50, got ${issue_data.get('price_cad')}")
                        
                        # Verify platform fee (50% of $50 = $25)
                        if issue_data.get("platform_fee_cad") == 25.0:
                            results.add_pass("Issue Pending Credential - Platform fee correct ($25)")
                        else:
                            results.add_fail("Issue Pending Credential platform fee", f"Expected $25, got ${issue_data.get('platform_fee_cad')}")
                        
                        # Verify institution payout (50% of $50 = $25)
                        if issue_data.get("institution_payout_cad") == 25.0:
                            results.add_pass("Issue Pending Credential - Institution payout correct ($25)")
                        else:
                            results.add_fail("Issue Pending Credential payout", f"Expected $25, got ${issue_data.get('institution_payout_cad')}")
                        
                        print(f"      Pending Credential ID: {pending_credential_id}")
                        print(f"      Price: ${issue_data.get('price_cad')} CAD")
                        print(f"      Platform Fee: ${issue_data.get('platform_fee_cad')} CAD")
                        print(f"      Institution Payout: ${issue_data.get('institution_payout_cad')} CAD")
                    else:
                        results.add_fail("Issue Pending Credential", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Issue Pending Credential", f"Invalid response structure: {data}")
            else:
                results.add_fail("POST /api/credential-payments/issue-pending", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST /api/credential-payments/issue-pending", f"Request failed: {str(e)}")
    
    # Test 5: Issue Pending Credential to Non-Existing User
    if institution_token:
        print("\n   Test 5: Issue Pending Credential to Non-Existing User - POST /api/credential-payments/issue-pending")
        try:
            credential_data = {
                "recipient_email": "test-new-user@example.com",
                "recipient_name": "Test New User",
                "student_id": "STU-2024-002",
                "credential_type": "diploma",
                "credential_name": "Business Administration Diploma",
                "program_name": "Business Studies",
                "issue_date": "2024-01-15",
                "expiry_date": None,
                "additional_details": {"gpa": 3.8}
            }
            
            response = requests.post(
                f"{BASE_URL}/credential-payments/issue-pending",
                json=credential_data,
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    issue_data = data["data"]
                    
                    # Verify recipient has no account
                    if issue_data.get("recipient_has_account") == False:
                        results.add_pass("Issue Pending Credential - Non-existing user detected")
                    else:
                        results.add_fail("Issue Pending Credential", "Non-existing user not detected correctly")
                    
                    # Verify diploma pricing
                    if issue_data.get("price_cad") == 100.0:
                        results.add_pass("Issue Pending Credential - Diploma price correct ($100)")
                    else:
                        results.add_fail("Issue Pending Credential diploma price", f"Expected $100, got ${issue_data.get('price_cad')}")
                    
                    print(f"      Non-existing user credential issued")
                    print(f"      Price: ${issue_data.get('price_cad')} CAD")
                else:
                    results.add_fail("Issue Pending Credential (non-existing)", f"Invalid response structure: {data}")
            else:
                results.add_fail("POST /api/credential-payments/issue-pending (non-existing)", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST /api/credential-payments/issue-pending (non-existing)", f"Request failed: {str(e)}")
    
    # Test 6: Get Institution's Issued Credentials
    if institution_token:
        print("\n   Test 6: Get Institution's Issued Credentials - GET /api/credential-payments/institution/issued")
        try:
            response = requests.get(
                f"{BASE_URL}/credential-payments/institution/issued",
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    issued_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["credentials", "summary"]
                    missing_fields = [field for field in required_fields if field not in issued_data]
                    
                    if not missing_fields:
                        results.add_pass("Institution Issued Credentials - All required fields present")
                        
                        # Check summary fields
                        summary = issued_data.get("summary", {})
                        summary_fields = ["total_issued", "total_paid", "total_pending", "total_revenue_cad", "currency"]
                        missing_summary = [field for field in summary_fields if field not in summary]
                        
                        if not missing_summary:
                            results.add_pass("Institution Issued Credentials - Summary stats present")
                            print(f"      Total Issued: {summary.get('total_issued', 0)}")
                            print(f"      Total Paid: {summary.get('total_paid', 0)}")
                            print(f"      Total Pending: {summary.get('total_pending', 0)}")
                            print(f"      Total Revenue: ${summary.get('total_revenue_cad', 0)} CAD")
                        else:
                            results.add_fail("Institution Issued Credentials summary", f"Missing summary fields: {missing_summary}")
                        
                        # Check credentials list
                        credentials = issued_data.get("credentials", [])
                        if len(credentials) >= 1:
                            results.add_pass("Institution Issued Credentials - Credentials list returned")
                            print(f"      Credentials in list: {len(credentials)}")
                        else:
                            results.add_fail("Institution Issued Credentials", "No credentials found in list")
                    else:
                        results.add_fail("Institution Issued Credentials", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Institution Issued Credentials", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/credential-payments/institution/issued", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/credential-payments/institution/issued", f"Request failed: {str(e)}")
    
    # Test 7: Get Workforce's Pending Credentials
    if workforce_token:
        print("\n   Test 7: Get Workforce's Pending Credentials - GET /api/credential-payments/my-pending")
        try:
            response = requests.get(
                f"{BASE_URL}/credential-payments/my-pending",
                headers={"Authorization": f"Bearer {workforce_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    pending_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["pending_credentials", "total_pending", "total_cost_cad"]
                    missing_fields = [field for field in required_fields if field not in pending_data]
                    
                    if not missing_fields:
                        results.add_pass("Workforce Pending Credentials - All required fields present")
                        
                        # Check if pending credential appears
                        pending_creds = pending_data.get("pending_credentials", [])
                        total_pending = pending_data.get("total_pending", 0)
                        total_cost = pending_data.get("total_cost_cad", 0)
                        
                        if total_pending >= 1:
                            results.add_pass("Workforce Pending Credentials - Pending credentials found")
                            print(f"      Total Pending: {total_pending}")
                            print(f"      Total Cost: ${total_cost} CAD")
                            
                            # Check if our issued credential is in the list
                            if pending_credential_id:
                                found_credential = any(
                                    cred.get("pending_credential_id") == pending_credential_id 
                                    for cred in pending_creds
                                )
                                if found_credential:
                                    results.add_pass("Workforce Pending Credentials - Issued credential appears in list")
                                else:
                                    results.add_fail("Workforce Pending Credentials", "Issued credential not found in pending list")
                        else:
                            results.add_fail("Workforce Pending Credentials", "No pending credentials found")
                    else:
                        results.add_fail("Workforce Pending Credentials", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Workforce Pending Credentials", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/credential-payments/my-pending", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/credential-payments/my-pending", f"Request failed: {str(e)}")
    
    # Test 8: Initiate Stripe Payment
    if workforce_token and pending_credential_id:
        print("\n   Test 8: Initiate Stripe Payment - POST /api/credential-payments/initiate-payment")
        try:
            payment_data = {
                "pending_credential_id": pending_credential_id,
                "origin_url": "https://taxsmart-9.preview.emergentagent.com"
            }
            
            response = requests.post(
                f"{BASE_URL}/credential-payments/initiate-payment",
                json=payment_data,
                headers={"Authorization": f"Bearer {workforce_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    payment_response = data["data"]
                    
                    # Check required fields
                    required_fields = ["checkout_url", "session_id", "amount_cad"]
                    missing_fields = [field for field in required_fields if field not in payment_response]
                    
                    if not missing_fields:
                        results.add_pass("Initiate Payment - All required fields present")
                        
                        # Verify checkout URL is valid
                        checkout_url = payment_response.get("checkout_url", "")
                        if checkout_url.startswith("https://checkout.stripe.com/"):
                            results.add_pass("Initiate Payment - Valid Stripe checkout URL returned")
                            print(f"      Checkout URL: {checkout_url[:50]}...")
                        else:
                            results.add_fail("Initiate Payment checkout URL", f"Invalid checkout URL: {checkout_url}")
                        
                        # Verify amount
                        if payment_response.get("amount_cad") == 50.0:
                            results.add_pass("Initiate Payment - Correct amount ($50)")
                        else:
                            results.add_fail("Initiate Payment amount", f"Expected $50, got ${payment_response.get('amount_cad')}")
                        
                        print(f"      Session ID: {payment_response.get('session_id', 'N/A')}")
                        print(f"      Amount: ${payment_response.get('amount_cad', 0)} CAD")
                    else:
                        results.add_fail("Initiate Payment", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Initiate Payment", f"Invalid response structure: {data}")
            else:
                results.add_fail("POST /api/credential-payments/initiate-payment", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST /api/credential-payments/initiate-payment", f"Request failed: {str(e)}")
    
    # Test 9: Authentication Enforcement
    print("\n   Test 9: Authentication Enforcement")
    
    # Test credential payment endpoints without authentication
    protected_endpoints = [
        ("POST", "/credential-payments/issue-pending"),
        ("GET", "/credential-payments/institution/issued"),
        ("GET", "/credential-payments/my-pending"),
        ("POST", "/credential-payments/initiate-payment")
    ]
    
    for method, endpoint in protected_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", json={}, timeout=5)
            
            if response.status_code in [401, 403]:
                results.add_pass(f"Authentication required for {method} {endpoint}")
            else:
                results.add_fail(f"Authentication enforcement {method} {endpoint}", f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            results.add_fail(f"Authentication enforcement {method} {endpoint}", f"Request failed: {str(e)}")

def test_institution_withdrawal_system(results):
    """Test the Institution Withdrawal System with Stripe Connect Express integration"""
    print("\n🧪 Testing Institution Withdrawal System with Stripe Connect Express (Priority: HIGH)...")
    print("   Testing endpoints: Stripe Connect Account Management, Payout Balance, Tax Information, Credential Payment with Tax")
    print("   Test credentials: Institution: demo@stclairecollege.ca / Demo123!")
    print("   Base URL: https://taxsmart-9.preview.emergentagent.com")
    
    # Test credentials from review request
    institution_creds = {"email": "demo@stclairecollege.ca", "password": "Demo123!", "user_type": "institution"}
    
    # Test 1: Institution Authentication
    institution_token = None
    print("\n   Test 1: Institution Authentication - POST /api/auth/login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=institution_creds, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                institution_token = data["data"]["access_token"]
                user_data = data.get("data", {})
                
                # Verify user_type is "institution"
                if user_data.get("user_type") == "institution":
                    results.add_pass("Institution authentication - user_type is 'institution'")
                    print(f"      Institution ID: {user_data.get('user_id', 'N/A')}")
                    print(f"      User Type: {user_data.get('user_type', 'N/A')}")
                else:
                    results.add_fail("Institution authentication", f"Expected user_type 'institution', got '{user_data.get('user_type')}'")
            else:
                results.add_fail("Institution authentication", f"Invalid response: {data}")
        else:
            results.add_fail("Institution authentication", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Institution authentication", f"Request failed: {str(e)}")
    
    # Test 2: Stripe Connect Account Status (Initial)
    if institution_token:
        print("\n   Test 2: Stripe Connect Account Status (Initial) - GET /api/stripe-connect/account-status")
        try:
            response = requests.get(
                f"{BASE_URL}/stripe-connect/account-status",
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    status_data = data["data"]
                    
                    # Check required fields (based on actual response)
                    required_fields = ["has_account", "onboarding_complete"]
                    missing_fields = [field for field in required_fields if field not in status_data]
                    
                    if not missing_fields:
                        results.add_pass("Account Status - Required fields present")
                        print(f"      Has Account: {status_data.get('has_account', False)}")
                        print(f"      Onboarding Complete: {status_data.get('onboarding_complete', False)}")
                        print(f"      Status: {status_data.get('status', 'None')}")
                        
                        # Initially should show has_account: false
                        if status_data.get("has_account") == False:
                            results.add_pass("Account Status - Initially shows no account (expected)")
                        else:
                            results.add_pass("Account Status - Shows account exists")
                    else:
                        results.add_fail("Account Status", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Account Status", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/stripe-connect/account-status", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/stripe-connect/account-status", f"Request failed: {str(e)}")
    
    # Test 3: Create Stripe Connect Account
    stripe_account_id = None
    if institution_token:
        print("\n   Test 3: Create Stripe Connect Account - POST /api/stripe-connect/create-account")
        try:
            response = requests.post(
                f"{BASE_URL}/stripe-connect/create-account",
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    account_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["account_id", "created"]
                    missing_fields = [field for field in required_fields if field not in account_data]
                    
                    if not missing_fields:
                        results.add_pass("Create Account - Stripe Express account created")
                        stripe_account_id = account_data.get("account_id")
                        print(f"      Account ID: {stripe_account_id}")
                        print(f"      Created: {account_data.get('created', False)}")
                    else:
                        results.add_fail("Create Account", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Create Account", f"Invalid response structure: {data}")
            elif response.status_code == 400:
                # Account might already exist
                data = response.json()
                if "already exists" in data.get("message", "").lower():
                    results.add_pass("Create Account - Account already exists (expected)")
                    print("      Account already exists for this institution")
                else:
                    results.add_fail("Create Account", f"HTTP 400: {data.get('message', response.text)}")
            else:
                results.add_fail("POST /api/stripe-connect/create-account", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST /api/stripe-connect/create-account", f"Request failed: {str(e)}")
    
    # Test 4: Get Onboarding Link
    if institution_token:
        print("\n   Test 4: Get Onboarding Link - POST /api/stripe-connect/onboarding-link")
        try:
            onboarding_data = {
                "refresh_url": "https://taxsmart-9.preview.emergentagent.com/institution/stripe-connect",
                "return_url": "https://taxsmart-9.preview.emergentagent.com/institution/stripe-connect/success"
            }
            
            response = requests.post(
                f"{BASE_URL}/stripe-connect/onboarding-link",
                json=onboarding_data,
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    link_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["onboarding_url", "expires_at"]
                    missing_fields = [field for field in required_fields if field not in link_data]
                    
                    if not missing_fields:
                        results.add_pass("Onboarding Link - URL generated successfully")
                        onboarding_url = link_data.get("onboarding_url", "")
                        if onboarding_url.startswith("https://connect.stripe.com/"):
                            results.add_pass("Onboarding Link - Valid Stripe Connect URL")
                            print(f"      Onboarding URL: {onboarding_url[:50]}...")
                        else:
                            results.add_fail("Onboarding Link URL", f"Invalid URL format: {onboarding_url}")
                        
                        print(f"      Expires At: {link_data.get('expires_at', 'N/A')}")
                    else:
                        results.add_fail("Onboarding Link", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Onboarding Link", f"Invalid response structure: {data}")
            else:
                results.add_fail("POST /api/stripe-connect/onboarding-link", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST /api/stripe-connect/onboarding-link", f"Request failed: {str(e)}")
    
    # Test 5: Get Dashboard Link
    if institution_token:
        print("\n   Test 5: Get Dashboard Link - GET /api/stripe-connect/dashboard-link")
        try:
            response = requests.get(
                f"{BASE_URL}/stripe-connect/dashboard-link",
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    dashboard_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["dashboard_url"]
                    missing_fields = [field for field in required_fields if field not in dashboard_data]
                    
                    if not missing_fields:
                        results.add_pass("Dashboard Link - URL generated successfully")
                        dashboard_url = dashboard_data.get("dashboard_url", "")
                        if dashboard_url.startswith("https://connect.stripe.com/"):
                            results.add_pass("Dashboard Link - Valid Stripe Connect URL")
                            print(f"      Dashboard URL: {dashboard_url[:50]}...")
                        else:
                            results.add_fail("Dashboard Link URL", f"Invalid URL format: {dashboard_url}")
                    else:
                        results.add_fail("Dashboard Link", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Dashboard Link", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/stripe-connect/dashboard-link", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/stripe-connect/dashboard-link", f"Request failed: {str(e)}")
    
    # Test 6: Get Payout Balance
    if institution_token:
        print("\n   Test 6: Get Payout Balance - GET /api/stripe-connect/balance")
        try:
            response = requests.get(
                f"{BASE_URL}/stripe-connect/balance",
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    balance_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["total_earned_cad", "available_balance_cad", "total_paid_out_cad", "paid_credentials_count", "recent_sales", "payouts", "province", "tax_info", "payout_schedule"]
                    missing_fields = [field for field in required_fields if field not in balance_data]
                    
                    if not missing_fields:
                        results.add_pass("Payout Balance - All required fields present")
                        print(f"      Total Earned: ${balance_data.get('total_earned_cad', 0)} CAD")
                        print(f"      Available Balance: ${balance_data.get('available_balance_cad', 0)} CAD")
                        print(f"      Total Paid Out: ${balance_data.get('total_paid_out_cad', 0)} CAD")
                        print(f"      Paid Credentials: {balance_data.get('paid_credentials_count', 0)}")
                        print(f"      Province: {balance_data.get('province', 'N/A')}")
                        
                        # Check tax_info structure
                        tax_info = balance_data.get("tax_info", {})
                        if "total" in tax_info and "description" in tax_info:
                            results.add_pass("Payout Balance - Tax info structure correct")
                            print(f"      Tax Rate: {tax_info.get('total', 0) * 100}%")
                            print(f"      Tax Description: {tax_info.get('description', 'N/A')}")
                        else:
                            results.add_fail("Payout Balance tax_info", "Missing total or description in tax_info")
                        
                        # Check recent_sales and payouts are arrays
                        if isinstance(balance_data.get("recent_sales"), list) and isinstance(balance_data.get("payouts"), list):
                            results.add_pass("Payout Balance - Recent sales and payouts are arrays")
                        else:
                            results.add_fail("Payout Balance arrays", "recent_sales or payouts not arrays")
                    else:
                        results.add_fail("Payout Balance", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Payout Balance", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/stripe-connect/balance", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/stripe-connect/balance", f"Request failed: {str(e)}")
    
    # Test 7: Get Tax Information
    if institution_token:
        print("\n   Test 7: Get Tax Information - GET /api/stripe-connect/tax-info")
        try:
            response = requests.get(
                f"{BASE_URL}/stripe-connect/tax-info",
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    tax_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["provinces"]
                    missing_fields = [field for field in required_fields if field not in tax_data]
                    
                    if not missing_fields:
                        provinces = tax_data.get("provinces", [])
                        
                        # Check if all Canadian provinces are present
                        expected_provinces = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]
                        province_codes = [prov.get("code") for prov in provinces]
                        missing_provinces = [prov for prov in expected_provinces if prov not in province_codes]
                        
                        if not missing_provinces:
                            results.add_pass("Tax Information - All 13 Canadian provinces present")
                            print(f"      Total Provinces: {len(provinces)}")
                            
                            # Check a few specific provinces for tax rates
                            on_province = next((p for p in provinces if p.get("code") == "ON"), None)
                            if on_province and on_province.get("tax_rate") == 0.13:
                                results.add_pass("Tax Information - Ontario tax rate correct (13%)")
                                print(f"      Ontario Tax Rate: {on_province.get('tax_rate') * 100}%")
                            else:
                                results.add_fail("Tax Information ON rate", f"Ontario tax rate incorrect or missing")
                            
                            bc_province = next((p for p in provinces if p.get("code") == "BC"), None)
                            if bc_province and bc_province.get("tax_rate") == 0.12:
                                results.add_pass("Tax Information - BC tax rate correct (12%)")
                                print(f"      BC Tax Rate: {bc_province.get('tax_rate') * 100}%")
                            else:
                                results.add_fail("Tax Information BC rate", f"BC tax rate incorrect or missing")
                        else:
                            results.add_fail("Tax Information", f"Missing provinces: {missing_provinces}")
                    else:
                        results.add_fail("Tax Information", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Tax Information", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/stripe-connect/tax-info", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/stripe-connect/tax-info", f"Request failed: {str(e)}")
    
    # Test 8: Update Province
    if institution_token:
        print("\n   Test 8: Update Province - PATCH /api/stripe-connect/update-province?province=BC")
        try:
            response = requests.patch(
                f"{BASE_URL}/stripe-connect/update-province?province=BC",
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "message" in data:
                    message = data.get("message", "")
                    
                    if "BC" in message:
                        results.add_pass("Update Province - Province updated to BC")
                        print(f"      Update Message: {message}")
                        
                        # Verify the province was actually updated by checking balance endpoint
                        balance_response = requests.get(
                            f"{BASE_URL}/stripe-connect/balance",
                            headers={"Authorization": f"Bearer {institution_token}"},
                            timeout=10
                        )
                        
                        if balance_response.status_code == 200:
                            balance_data = balance_response.json().get("data", {})
                            if balance_data.get("province") == "BC":
                                results.add_pass("Update Province - Province change verified in balance")
                                print(f"      Verified Province: {balance_data.get('province')}")
                            else:
                                results.add_fail("Update Province verification", f"Province not updated in balance: {balance_data.get('province')}")
                        else:
                            results.add_fail("Update Province verification", "Could not verify province update")
                    else:
                        results.add_fail("Update Province", f"Expected BC in message, got: {message}")
                else:
                    results.add_fail("Update Province", f"Invalid response structure: {data}")
            else:
                results.add_fail("PATCH /api/stripe-connect/update-province", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("PATCH /api/stripe-connect/update-province", f"Request failed: {str(e)}")
    
    # Test 9: Get Canadian Provinces for Credential Payments
    print("\n   Test 9: Get Canadian Provinces - GET /api/credential-payments/provinces")
    try:
        response = requests.get(f"{BASE_URL}/credential-payments/provinces", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "data" in data:
                provinces_data = data["data"]
                
                # Check required fields
                required_fields = ["provinces"]
                missing_fields = [field for field in required_fields if field not in provinces_data]
                
                if not missing_fields:
                    provinces = provinces_data.get("provinces", [])
                    
                    # Check if 13 provinces are returned
                    if len(provinces) == 13:
                        results.add_pass("Credential Payments Provinces - All 13 provinces returned")
                        print(f"      Total Provinces: {len(provinces)}")
                        
                        # Check if provinces have required fields
                        if provinces and "code" in provinces[0] and "name" in provinces[0]:
                            results.add_pass("Credential Payments Provinces - Province structure correct")
                        else:
                            results.add_fail("Credential Payments Provinces structure", "Missing code or name in province data")
                    else:
                        results.add_fail("Credential Payments Provinces", f"Expected 13 provinces, got {len(provinces)}")
                else:
                    results.add_fail("Credential Payments Provinces", f"Missing required fields: {missing_fields}")
            else:
                results.add_fail("Credential Payments Provinces", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET /api/credential-payments/provinces", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/credential-payments/provinces", f"Request failed: {str(e)}")
    
    # Test 10: Calculate Price with Tax
    print("\n   Test 10: Calculate Price with Tax - GET /api/credential-payments/calculate-price?credential_type=certificate&province=ON")
    try:
        response = requests.get(f"{BASE_URL}/credential-payments/calculate-price?credential_type=certificate&province=ON", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "data" in data:
                price_data = data["data"]
                
                # Check required fields
                required_fields = ["base_price_cad", "tax_rate", "tax_amount", "total"]
                missing_fields = [field for field in required_fields if field not in price_data]
                
                if not missing_fields:
                    base_price = price_data.get("base_price_cad", 0)
                    tax_rate = price_data.get("tax_rate", 0)
                    tax_amount = price_data.get("tax_amount", 0)
                    total = price_data.get("total", 0)
                    
                    # Verify certificate base price
                    if base_price == 50.0:
                        results.add_pass("Calculate Price - Certificate base price correct ($50)")
                    else:
                        results.add_fail("Calculate Price base price", f"Expected $50, got ${base_price}")
                    
                    # Verify Ontario tax rate (13% HST)
                    if tax_rate == 0.13:
                        results.add_pass("Calculate Price - Ontario tax rate correct (13%)")
                    else:
                        results.add_fail("Calculate Price tax rate", f"Expected 13%, got {tax_rate * 100}%")
                    
                    # Verify tax amount calculation (50 * 0.13 = 6.5)
                    if tax_amount == 6.5:
                        results.add_pass("Calculate Price - Tax amount correct ($6.50)")
                    else:
                        results.add_fail("Calculate Price tax amount", f"Expected $6.50, got ${tax_amount}")
                    
                    # Verify total calculation (50 + 6.5 = 56.5)
                    if total == 56.5:
                        results.add_pass("Calculate Price - Total amount correct ($56.50)")
                    else:
                        results.add_fail("Calculate Price total", f"Expected $56.50, got ${total}")
                    
                    print(f"      Base Price: ${base_price} CAD")
                    print(f"      Tax Rate: {tax_rate * 100}%")
                    print(f"      Tax Amount: ${tax_amount} CAD")
                    print(f"      Total: ${total} CAD")
                else:
                    results.add_fail("Calculate Price", f"Missing required fields: {missing_fields}")
            else:
                results.add_fail("Calculate Price", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET /api/credential-payments/calculate-price", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/credential-payments/calculate-price", f"Request failed: {str(e)}")
    
    # Test 11: Authentication Enforcement
    print("\n   Test 11: Authentication Enforcement")
    
    # Test stripe-connect endpoints without authentication
    stripe_connect_endpoints = [
        ("POST", "/stripe-connect/create-account"),
        ("POST", "/stripe-connect/onboarding-link"),
        ("GET", "/stripe-connect/account-status"),
        ("GET", "/stripe-connect/dashboard-link"),
        ("GET", "/stripe-connect/balance"),
        ("GET", "/stripe-connect/tax-info"),
        ("PATCH", "/stripe-connect/update-province")
    ]
    
    for method, endpoint in stripe_connect_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", json={}, timeout=5)
            elif method == "PATCH":
                response = requests.patch(f"{BASE_URL}{endpoint}", json={}, timeout=5)
            
            if response.status_code in [401, 403]:
                results.add_pass(f"Authentication required for {method} {endpoint}")
            else:
                results.add_fail(f"Authentication enforcement {method} {endpoint}", f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            results.add_fail(f"Authentication enforcement {method} {endpoint}", f"Request failed: {str(e)}")

def test_institution_withdrawal_enhancements(results):
    """Test the Institution Withdrawal System Enhancements for HR Bank"""
    print("\n🧪 Testing Institution Withdrawal System Enhancements for HR Bank (Priority: HIGH)...")
    print("   Testing endpoints: Super Admin Institution Payouts, Email on Credential Issuance, Stripe Connect Status")
    print("   Test credentials: Super Admin: qnizami@hrbank.ca / Test123!, Institution: demo@stclairecollege.ca / Demo123!")
    print("   Base URL: https://taxsmart-9.preview.emergentagent.com")
    
    # Test credentials from review request
    admin_creds = {"email": "qnizami@hrbank.ca", "password": "Test123!", "user_type": "admin"}
    institution_creds = {"email": "demo@stclairecollege.ca", "password": "Demo123!", "user_type": "institution"}
    
    # Test 1: Super Admin Authentication
    admin_token = None
    print("\n   Test 1: Super Admin Authentication - POST /api/auth/login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=admin_creds, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                admin_token = data["data"]["access_token"]
                user_data = data.get("data", {})
                
                # Verify user_type is "admin"
                if user_data.get("user_type") == "admin":
                    results.add_pass("Super Admin authentication - user_type is 'admin'")
                    print(f"      Admin ID: {user_data.get('user_id', 'N/A')}")
                    print(f"      User Type: {user_data.get('user_type', 'N/A')}")
                else:
                    results.add_fail("Super Admin authentication", f"Expected user_type 'admin', got '{user_data.get('user_type')}'")
            else:
                results.add_fail("Super Admin authentication", f"Invalid response: {data}")
        else:
            results.add_fail("Super Admin authentication", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Super Admin authentication", f"Request failed: {str(e)}")
    
    # Test 2: Super Admin Institution Payouts API
    if admin_token:
        print("\n   Test 2: Super Admin Institution Payouts - GET /api/super-admin/institutions-stripe-status")
        try:
            response = requests.get(
                f"{BASE_URL}/super-admin/institutions-stripe-status",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    payout_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["institutions", "stats"]
                    missing_fields = [field for field in required_fields if field not in payout_data]
                    
                    if not missing_fields:
                        results.add_pass("Super Admin Institution Payouts - All required fields present")
                        
                        # Check institutions array
                        institutions = payout_data.get("institutions", [])
                        if institutions:
                            results.add_pass("Super Admin Institution Payouts - Institutions array returned")
                            print(f"      Total institutions: {len(institutions)}")
                            
                            # Check institution fields
                            first_inst = institutions[0]
                            inst_required_fields = ["institution_id", "institution_name", "email", "stripe_status", "credentials_sold", "total_earned", "platform_fee"]
                            inst_missing_fields = [field for field in inst_required_fields if field not in first_inst]
                            
                            if not inst_missing_fields:
                                results.add_pass("Super Admin Institution Payouts - Institution fields complete")
                                print(f"      Sample institution: {first_inst.get('institution_name', 'N/A')}")
                                print(f"      Stripe status: {first_inst.get('stripe_status', 'N/A')}")
                                print(f"      Credentials sold: {first_inst.get('credentials_sold', 0)}")
                                print(f"      Total earned: ${first_inst.get('total_earned', 0)}")
                            else:
                                results.add_fail("Super Admin Institution Payouts institution fields", f"Missing fields: {inst_missing_fields}")
                        else:
                            results.add_fail("Super Admin Institution Payouts", "No institutions returned")
                        
                        # Check stats
                        stats = payout_data.get("stats", {})
                        stats_required_fields = ["total", "connected", "pending", "not_connected", "total_platform_earnings"]
                        stats_missing_fields = [field for field in stats_required_fields if field not in stats]
                        
                        if not stats_missing_fields:
                            results.add_pass("Super Admin Institution Payouts - Stats fields complete")
                            print(f"      Total institutions: {stats.get('total', 0)}")
                            print(f"      Connected: {stats.get('connected', 0)}")
                            print(f"      Pending: {stats.get('pending', 0)}")
                            print(f"      Not connected: {stats.get('not_connected', 0)}")
                            print(f"      Total platform earnings: ${stats.get('total_platform_earnings', 0)}")
                            
                            # Verify data consistency - demo@stclairecollege.ca should show as "pending"
                            demo_institution = next((inst for inst in institutions if inst.get("email") == "demo@stclairecollege.ca"), None)
                            if demo_institution:
                                if demo_institution.get("stripe_status") == "pending":
                                    results.add_pass("Data Consistency - demo@stclairecollege.ca shows as 'pending'")
                                else:
                                    results.add_fail("Data Consistency", f"demo@stclairecollege.ca shows as '{demo_institution.get('stripe_status')}', expected 'pending'")
                            else:
                                results.add_fail("Data Consistency", "demo@stclairecollege.ca not found in institutions list")
                        else:
                            results.add_fail("Super Admin Institution Payouts stats", f"Missing stats fields: {stats_missing_fields}")
                    else:
                        results.add_fail("Super Admin Institution Payouts", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Super Admin Institution Payouts", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/institutions-stripe-status", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/institutions-stripe-status", f"Request failed: {str(e)}")
    
    # Test 3: Institution Authentication
    institution_token = None
    print("\n   Test 3: Institution Authentication - POST /api/auth/login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=institution_creds, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                institution_token = data["data"]["access_token"]
                user_data = data.get("data", {})
                
                # Verify user_type is "institution"
                if user_data.get("user_type") == "institution":
                    results.add_pass("Institution authentication - user_type is 'institution'")
                    print(f"      Institution ID: {user_data.get('user_id', 'N/A')}")
                    print(f"      User Type: {user_data.get('user_type', 'N/A')}")
                else:
                    results.add_fail("Institution authentication", f"Expected user_type 'institution', got '{user_data.get('user_type')}'")
            else:
                results.add_fail("Institution authentication", f"Invalid response: {data}")
        else:
            results.add_fail("Institution authentication", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Institution authentication", f"Request failed: {str(e)}")
    
    # Test 4: Email on Credential Issuance
    if institution_token:
        print("\n   Test 4: Email on Credential Issuance - POST /api/credential-payments/issue-pending")
        try:
            credential_data = {
                "recipient_email": "test_worker@example.com",
                "recipient_name": "Test Worker",
                "credential_type": "certificate",
                "credential_name": "Food Handler Certificate",
                "issue_date": "2026-01-08",
                "student_id": "TEST123"
            }
            
            response = requests.post(
                f"{BASE_URL}/credential-payments/issue-pending",
                json=credential_data,
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    issue_data = data["data"]
                    
                    # Check if email_sent is true
                    if issue_data.get("email_sent") == True:
                        results.add_pass("Email on Credential Issuance - email_sent is true")
                        print(f"      Email sent to: {credential_data['recipient_email']}")
                        print(f"      Credential: {credential_data['credential_name']}")
                    else:
                        results.add_fail("Email on Credential Issuance", f"email_sent is {issue_data.get('email_sent')}, expected true")
                    
                    # Check other required fields
                    required_fields = ["pending_credential_id", "recipient_email", "recipient_has_account", "price_cad", "status"]
                    missing_fields = [field for field in required_fields if field not in issue_data]
                    
                    if not missing_fields:
                        results.add_pass("Email on Credential Issuance - All required fields present")
                        print(f"      Pending Credential ID: {issue_data.get('pending_credential_id')}")
                        print(f"      Price: ${issue_data.get('price_cad')} CAD")
                    else:
                        results.add_fail("Email on Credential Issuance fields", f"Missing fields: {missing_fields}")
                else:
                    results.add_fail("Email on Credential Issuance", f"Invalid response structure: {data}")
            else:
                results.add_fail("POST /api/credential-payments/issue-pending", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST /api/credential-payments/issue-pending", f"Request failed: {str(e)}")
    
    # Test 5: Stripe Connect Account Status (verify still working)
    if institution_token:
        print("\n   Test 5: Stripe Connect Account Status - GET /api/stripe-connect/account-status")
        try:
            response = requests.get(
                f"{BASE_URL}/stripe-connect/account-status",
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    status_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["has_account", "status", "onboarding_complete"]
                    missing_fields = [field for field in required_fields if field not in status_data]
                    
                    if not missing_fields:
                        results.add_pass("Stripe Connect Account Status - All required fields present")
                        print(f"      Has account: {status_data.get('has_account')}")
                        print(f"      Status: {status_data.get('status')}")
                        print(f"      Onboarding complete: {status_data.get('onboarding_complete')}")
                    else:
                        results.add_fail("Stripe Connect Account Status", f"Missing fields: {missing_fields}")
                else:
                    results.add_fail("Stripe Connect Account Status", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/stripe-connect/account-status", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/stripe-connect/account-status", f"Request failed: {str(e)}")
    
    # Test 6: Stripe Connect Balance (verify still working)
    if institution_token:
        print("\n   Test 6: Stripe Connect Balance - GET /api/stripe-connect/balance")
        try:
            response = requests.get(
                f"{BASE_URL}/stripe-connect/balance",
                headers={"Authorization": f"Bearer {institution_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    balance_data = data["data"]
                    
                    # Check required fields
                    required_fields = ["total_earned_cad", "available_balance_cad", "paid_credentials_count", "connect_status", "has_connect_account"]
                    missing_fields = [field for field in required_fields if field not in balance_data]
                    
                    if not missing_fields:
                        results.add_pass("Stripe Connect Balance - All required fields present")
                        print(f"      Total earned: ${balance_data.get('total_earned_cad', 0)} CAD")
                        print(f"      Available balance: ${balance_data.get('available_balance_cad', 0)} CAD")
                        print(f"      Connect status: {balance_data.get('connect_status')}")
                        print(f"      Has connect account: {balance_data.get('has_connect_account')}")
                    else:
                        results.add_fail("Stripe Connect Balance", f"Missing fields: {missing_fields}")
                else:
                    results.add_fail("Stripe Connect Balance", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/stripe-connect/balance", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/stripe-connect/balance", f"Request failed: {str(e)}")
    
    # Test 7: Authentication Enforcement
    print("\n   Test 7: Authentication Enforcement")
    
    # Test super admin endpoints without authentication
    protected_endpoints = [
        ("GET", "/super-admin/institutions-stripe-status"),
    ]
    
    for method, endpoint in protected_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            
            if response.status_code in [401, 403]:
                results.add_pass(f"Authentication required for {method} {endpoint}")
            else:
                results.add_fail(f"Authentication enforcement {method} {endpoint}", f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            results.add_fail(f"Authentication enforcement {method} {endpoint}", f"Request failed: {str(e)}")

def test_public_leaderboard_system(results):
    """Test the Public Leaderboard System for HR Bank"""
    print("\n🧪 Testing Public Leaderboard System for HR Bank (Priority: HIGH)...")
    print("   Testing endpoints: Platform Stats, Institution Leaderboard, Province Leaderboard")
    print("   Test URL: https://taxsmart-9.preview.emergentagent.com")
    print("   Note: These are public endpoints - no authentication required")
    
    # Test 1: Platform Stats API (No Auth Required)
    print("\n   Test 1: Platform Stats - GET /api/leaderboard/stats")
    try:
        response = requests.get(f"{BASE_URL}/leaderboard/stats", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "data" in data:
                stats_data = data["data"]
                
                # Check required fields
                required_fields = [
                    "total_institutions", "total_credentials_issued", "total_work_passports",
                    "total_workforce_users", "total_employers", "credentials_last_30_days",
                    "blockchain_network"
                ]
                missing_fields = [field for field in required_fields if field not in stats_data]
                
                if not missing_fields:
                    results.add_pass("Platform Stats - All required fields present")
                    
                    # Verify blockchain network
                    if stats_data.get("blockchain_network") == "Polygon Mainnet":
                        results.add_pass("Platform Stats - Blockchain network is 'Polygon Mainnet'")
                    else:
                        results.add_fail("Platform Stats blockchain", f"Expected 'Polygon Mainnet', got '{stats_data.get('blockchain_network')}'")
                    
                    # Print stats for verification
                    print(f"      Total Institutions: {stats_data.get('total_institutions', 0)}")
                    print(f"      Total Credentials Issued: {stats_data.get('total_credentials_issued', 0)}")
                    print(f"      Total Work Passports: {stats_data.get('total_work_passports', 0)}")
                    print(f"      Total Workforce Users: {stats_data.get('total_workforce_users', 0)}")
                    print(f"      Total Employers: {stats_data.get('total_employers', 0)}")
                    print(f"      Credentials Last 30 Days: {stats_data.get('credentials_last_30_days', 0)}")
                    print(f"      Blockchain Network: {stats_data.get('blockchain_network', 'N/A')}")
                    
                    # Verify numeric values are non-negative
                    numeric_fields = ["total_institutions", "total_credentials_issued", "total_work_passports", 
                                    "total_workforce_users", "total_employers", "credentials_last_30_days"]
                    all_valid = all(isinstance(stats_data.get(field, 0), (int, float)) and stats_data.get(field, 0) >= 0 
                                  for field in numeric_fields)
                    
                    if all_valid:
                        results.add_pass("Platform Stats - All numeric values are valid (non-negative)")
                    else:
                        results.add_fail("Platform Stats validation", "Some numeric values are invalid or negative")
                else:
                    results.add_fail("Platform Stats", f"Missing required fields: {missing_fields}")
            else:
                results.add_fail("Platform Stats", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET /api/leaderboard/stats", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/leaderboard/stats", f"Request failed: {str(e)}")
    
    # Test 2: Institution Leaderboard (No Auth Required)
    print("\n   Test 2: Institution Leaderboard - GET /api/leaderboard/institutions")
    try:
        response = requests.get(f"{BASE_URL}/leaderboard/institutions", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "data" in data:
                leaderboard_data = data["data"]
                
                # Check required top-level fields
                required_fields = ["leaderboard", "total_institutions", "summary", "filters"]
                missing_fields = [field for field in required_fields if field not in leaderboard_data]
                
                if not missing_fields:
                    results.add_pass("Institution Leaderboard - All required top-level fields present")
                    
                    # Check leaderboard array
                    leaderboard = leaderboard_data.get("leaderboard", [])
                    if isinstance(leaderboard, list):
                        results.add_pass("Institution Leaderboard - Leaderboard is array")
                        print(f"      Institutions in leaderboard: {len(leaderboard)}")
                        
                        # Check leaderboard entry structure (if any entries exist)
                        if leaderboard:
                            first_entry = leaderboard[0]
                            entry_fields = ["rank", "institution_name", "province", "credentials_issued", 
                                          "unique_students", "work_passports", "passport_rate"]
                            missing_entry_fields = [field for field in entry_fields if field not in first_entry]
                            
                            if not missing_entry_fields:
                                results.add_pass("Institution Leaderboard - Entry structure correct")
                                print(f"      Top institution: {first_entry.get('institution_name', 'N/A')}")
                                print(f"      Credentials issued: {first_entry.get('credentials_issued', 0)}")
                                
                                # Check for St. Claire College specifically
                                st_claire = next((inst for inst in leaderboard 
                                                if "St. Claire" in inst.get("institution_name", "") or 
                                                   "St Claire" in inst.get("institution_name", "")), None)
                                
                                if st_claire:
                                    results.add_pass("Institution Leaderboard - St. Claire College found in leaderboard")
                                    print(f"      St. Claire College credentials: {st_claire.get('credentials_issued', 0)}")
                                    
                                    # Check if it has 12 credentials as mentioned in review request
                                    if st_claire.get("credentials_issued") == 12:
                                        results.add_pass("Institution Leaderboard - St. Claire College has 12 credentials")
                                    else:
                                        print(f"      Note: St. Claire College has {st_claire.get('credentials_issued', 0)} credentials (expected 12)")
                                else:
                                    print("      Note: St. Claire College not found in current leaderboard")
                            else:
                                results.add_fail("Institution Leaderboard entry", f"Missing entry fields: {missing_entry_fields}")
                    else:
                        results.add_fail("Institution Leaderboard", "Leaderboard is not an array")
                    
                    # Check summary structure
                    summary = leaderboard_data.get("summary", {})
                    summary_fields = ["total_credentials_issued", "total_work_passports", "total_students", "period"]
                    missing_summary = [field for field in summary_fields if field not in summary]
                    
                    if not missing_summary:
                        results.add_pass("Institution Leaderboard - Summary structure correct")
                        print(f"      Summary - Total credentials: {summary.get('total_credentials_issued', 0)}")
                        print(f"      Summary - Total passports: {summary.get('total_work_passports', 0)}")
                        print(f"      Summary - Total students: {summary.get('total_students', 0)}")
                    else:
                        results.add_fail("Institution Leaderboard summary", f"Missing summary fields: {missing_summary}")
                    
                    # Check filters structure
                    filters = leaderboard_data.get("filters", {})
                    if "provinces" in filters:
                        provinces = filters["provinces"]
                        if isinstance(provinces, list) and len(provinces) == 13:
                            results.add_pass("Institution Leaderboard - All 13 Canadian provinces in filters")
                            print(f"      Provinces available: {len(provinces)}")
                            
                            # Check province structure
                            if provinces and "code" in provinces[0] and "name" in provinces[0]:
                                results.add_pass("Institution Leaderboard - Province filter structure correct")
                            else:
                                results.add_fail("Institution Leaderboard provinces", "Province entries missing code or name")
                        else:
                            results.add_fail("Institution Leaderboard provinces", f"Expected 13 provinces, got {len(provinces) if isinstance(provinces, list) else 'non-array'}")
                    else:
                        results.add_fail("Institution Leaderboard filters", "Missing provinces in filters")
                else:
                    results.add_fail("Institution Leaderboard", f"Missing required fields: {missing_fields}")
            else:
                results.add_fail("Institution Leaderboard", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET /api/leaderboard/institutions", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/leaderboard/institutions", f"Request failed: {str(e)}")
    
    # Test 3: Institution Leaderboard with Province Filter
    print("\n   Test 3: Institution Leaderboard with Province Filter - GET /api/leaderboard/institutions?province=ON")
    try:
        response = requests.get(f"{BASE_URL}/leaderboard/institutions?province=ON", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "data" in data:
                filtered_data = data["data"]
                
                # Check that province filter is applied
                summary = filtered_data.get("summary", {})
                if summary.get("province_filter") == "ON":
                    results.add_pass("Institution Leaderboard - Province filter applied (ON)")
                    print(f"      Filtered results for Ontario")
                else:
                    results.add_fail("Institution Leaderboard province filter", f"Province filter not applied correctly")
                
                # Check that all entries are from Ontario (if any)
                leaderboard = filtered_data.get("leaderboard", [])
                if leaderboard:
                    all_ontario = all(entry.get("province") == "ON" for entry in leaderboard)
                    if all_ontario:
                        results.add_pass("Institution Leaderboard - All filtered results are from Ontario")
                        print(f"      Ontario institutions: {len(leaderboard)}")
                    else:
                        results.add_fail("Institution Leaderboard filter", "Some results are not from Ontario")
                else:
                    print("      No institutions found in Ontario filter")
            else:
                results.add_fail("Institution Leaderboard (province filter)", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET /api/leaderboard/institutions?province=ON", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/leaderboard/institutions?province=ON", f"Request failed: {str(e)}")
    
    # Test 4: Institution Leaderboard with Period Filter
    print("\n   Test 4: Institution Leaderboard with Period Filter - GET /api/leaderboard/institutions?period=month")
    try:
        response = requests.get(f"{BASE_URL}/leaderboard/institutions?period=month", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "data" in data:
                period_data = data["data"]
                
                # Check that period filter is applied
                summary = period_data.get("summary", {})
                if summary.get("period") == "month":
                    results.add_pass("Institution Leaderboard - Period filter applied (month)")
                    print(f"      Filtered results for last month")
                else:
                    results.add_fail("Institution Leaderboard period filter", f"Period filter not applied correctly")
            else:
                results.add_fail("Institution Leaderboard (period filter)", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET /api/leaderboard/institutions?period=month", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/leaderboard/institutions?period=month", f"Request failed: {str(e)}")
    
    # Test 5: Province Leaderboard (No Auth Required)
    print("\n   Test 5: Province Leaderboard - GET /api/leaderboard/provinces")
    try:
        response = requests.get(f"{BASE_URL}/leaderboard/provinces", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "data" in data:
                province_data = data["data"]
                
                # Check required fields
                required_fields = ["leaderboard", "period"]
                missing_fields = [field for field in required_fields if field not in province_data]
                
                if not missing_fields:
                    results.add_pass("Province Leaderboard - All required fields present")
                    
                    # Check leaderboard structure
                    leaderboard = province_data.get("leaderboard", [])
                    if isinstance(leaderboard, list):
                        results.add_pass("Province Leaderboard - Leaderboard is array")
                        print(f"      Provinces in leaderboard: {len(leaderboard)}")
                        
                        # Check entry structure (if any entries exist)
                        if leaderboard:
                            first_entry = leaderboard[0]
                            entry_fields = ["rank", "province_name", "credentials_issued", 
                                          "unique_students", "participating_institutions"]
                            missing_entry_fields = [field for field in entry_fields if field not in first_entry]
                            
                            if not missing_entry_fields:
                                results.add_pass("Province Leaderboard - Entry structure correct")
                                print(f"      Top province: {first_entry.get('province_name', 'N/A')}")
                                print(f"      Credentials issued: {first_entry.get('credentials_issued', 0)}")
                                print(f"      Participating institutions: {first_entry.get('participating_institutions', 0)}")
                            else:
                                results.add_fail("Province Leaderboard entry", f"Missing entry fields: {missing_entry_fields}")
                    else:
                        results.add_fail("Province Leaderboard", "Leaderboard is not an array")
                else:
                    results.add_fail("Province Leaderboard", f"Missing required fields: {missing_fields}")
            else:
                results.add_fail("Province Leaderboard", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET /api/leaderboard/provinces", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/leaderboard/provinces", f"Request failed: {str(e)}")
    
    # Test 6: Province Leaderboard with Period Filter
    print("\n   Test 6: Province Leaderboard with Period Filter - GET /api/leaderboard/provinces?period=year")
    try:
        response = requests.get(f"{BASE_URL}/leaderboard/provinces?period=year", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "data" in data:
                year_data = data["data"]
                
                # Check that period filter is applied
                if year_data.get("period") == "year":
                    results.add_pass("Province Leaderboard - Period filter applied (year)")
                    print(f"      Filtered results for last year")
                else:
                    results.add_fail("Province Leaderboard period filter", f"Period filter not applied correctly")
            else:
                results.add_fail("Province Leaderboard (period filter)", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET /api/leaderboard/provinces?period=year", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/leaderboard/provinces?period=year", f"Request failed: {str(e)}")
    
    # Test 7: Response Format Validation
    print("\n   Test 7: Response Format Validation")
    
    # Test all endpoints return success: true
    endpoints_to_test = [
        "/leaderboard/stats",
        "/leaderboard/institutions", 
        "/leaderboard/provinces"
    ]
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") == True:
                    results.add_pass(f"Response format - {endpoint} returns success: true")
                else:
                    results.add_fail(f"Response format {endpoint}", f"success field is not true: {data.get('success')}")
            else:
                results.add_fail(f"Response format {endpoint}", f"HTTP {response.status_code}")
        except Exception as e:
            results.add_fail(f"Response format {endpoint}", f"Request failed: {str(e)}")
    
    # Test 8: Public Access Verification
    print("\n   Test 8: Public Access Verification (No Authentication Required)")
    
    # Verify all leaderboard endpoints work without any authentication
    public_endpoints = [
        ("GET", "/leaderboard/stats"),
        ("GET", "/leaderboard/institutions"),
        ("GET", "/leaderboard/provinces")
    ]
    
    for method, endpoint in public_endpoints:
        try:
            # Make request without any authorization headers
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            
            # Should return 200 (not 401/403) since these are public endpoints
            if response.status_code == 200:
                results.add_pass(f"Public access - {endpoint} accessible without authentication")
            else:
                results.add_fail(f"Public access {endpoint}", f"Expected 200, got {response.status_code}")
        except Exception as e:
            results.add_fail(f"Public access {endpoint}", f"Request failed: {str(e)}")

def main():
    """Main test execution"""
    results = TestResults()
    
    print("\n🔍 STARTING PUBLIC LEADERBOARD SYSTEM TESTS...")
    
    # Run Public Leaderboard System Tests
    test_public_leaderboard_system(results)
    
    # Print final summary
    print("\n" + "="*80)
    success = results.summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Public Leaderboard System is working correctly.")
    else:
        print(f"\n⚠️  {results.failed} TEST(S) FAILED. See details above.")
    
    return success

if __name__ == "__main__":
    main()