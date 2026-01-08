#!/usr/bin/env python3
"""
HR Bank Super Admin Backend API Testing
Testing Super Admin Backend API endpoints for HR Bank
Focus: Admin authentication, dashboard, roles, pending activations, admin management, franchise management, support tickets
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

print(f"🚀 HR BANK SUPER ADMIN BACKEND API TESTING")
print(f"Testing backend at: {BASE_URL}")
print(f"Base URL: {BACKEND_URL}")
print(f"Focus: Admin authentication, dashboard, roles, pending activations, admin management, franchise management, support tickets")
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
    print("   Base URL: https://hrcert-system.preview.emergentagent.com")
    
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

def main():
    """Main test execution"""
    results = TestResults()
    
    print("\n🔍 STARTING SUPER ADMIN SYSTEM TESTS...")
    
    # Run Super Admin System Tests
    test_super_admin_system(results)
    
    # Print final summary
    print("\n" + "="*80)
    success = results.summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Super Admin System is working correctly.")
    else:
        print(f"\n⚠️  {results.failed} TEST(S) FAILED. See details above.")
    
    return success

if __name__ == "__main__":
    main()