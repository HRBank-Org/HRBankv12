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

def main():
    """Main test execution"""
    results = TestResults()
    
    print("\n🔍 STARTING CAREER PROFILE SYSTEM TESTS...")
    
    # Run Career Profile System Tests
    test_career_profile_system(results)
    
    # Print final summary
    print("\n" + "="*80)
    success = results.summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Career Profile System is working correctly.")
    else:
        print(f"\n⚠️  {results.failed} TEST(S) FAILED. See details above.")
    
    return success

if __name__ == "__main__":
    main()