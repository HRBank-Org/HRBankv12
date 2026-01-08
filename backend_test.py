#!/usr/bin/env python3
"""
HR Bank Career Profile Backend API Testing
Testing Career Profile Backend API endpoints for HR Bank
Focus: Workforce authentication, career profile settings, public profile access, privacy controls, profile stats
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

print(f"🚀 HR BANK CAREER PROFILE BACKEND API TESTING")
print(f"Testing backend at: {BASE_URL}")
print(f"Base URL: {BACKEND_URL}")
print(f"Focus: Workforce authentication, career profile settings, public profile access, privacy controls, profile stats")
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
    print("   Base URL: https://blockverify-4.preview.emergentagent.com")
    
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
    print("   Base URL: https://blockverify-4.preview.emergentagent.com")
    
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
                        expected_url_pattern = f"https://blockverify-4.preview.emergentagent.com/profile/{profile_code}"
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
    print("   Base URL: https://blockverify-4.preview.emergentagent.com")
    
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
                "origin_url": "https://blockverify-4.preview.emergentagent.com"
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

def main():
    """Main test execution"""
    results = TestResults()
    
    print("\n🔍 STARTING CREDENTIAL MONETIZATION SYSTEM TESTS...")
    
    # Run Credential Monetization System Tests
    test_credential_monetization_system(results)
    
    # Print final summary
    print("\n" + "="*80)
    success = results.summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Credential Monetization System is working correctly.")
    else:
        print(f"\n⚠️  {results.failed} TEST(S) FAILED. See details above.")
    
    return success

if __name__ == "__main__":
    main()