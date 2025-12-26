#!/usr/bin/env python3
"""
HR Bank Super Admin System Testing
Testing Super Admin System for HR Bank with role-based access control
Focus: Admin roles, dashboard, pending activations, admin list, franchise management
"""

import requests
import json
import uuid
import time
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
BASE_URL = f"{BACKEND_URL}/api"

print(f"🚀 HR BANK SUPER ADMIN SYSTEM TESTING")
print(f"Testing backend at: {BASE_URL}")
print(f"Base URL: {BACKEND_URL}")
print(f"Focus: Admin roles, dashboard, pending activations, admin list, franchise management")
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
    print("   Testing endpoints: /api/super-admin/roles, /api/super-admin/dashboard, /api/super-admin/pending-activations, /api/super-admin/admins, /api/super-admin/franchises")
    print("   Test credentials: qnizami@hrbank.ca / Test123!")
    print("   Base URL: https://credblock.preview.emergentagent.com")
    
    # Test credentials from review request
    admin_creds = {"email": "qnizami@hrbank.ca", "password": "Test123!", "user_type": "admin"}
    
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
    
    # Test 2: Admin Roles List
    if admin_token:
        print("\n   Test 2: Admin Roles List - GET /api/super-admin/roles")
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
                    
                    # Expected 7 role types
                    expected_roles = [
                        "super_admin", "regional_manager", "account_activator",
                        "credentials_reviewer", "customer_service", "compliance_officer", "franchise_manager"
                    ]
                    
                    found_roles = [role.get("role_type") for role in roles]
                    
                    if len(roles) == 7:
                        results.add_pass("GET /api/super-admin/roles - Returns 7 role types")
                        print(f"      Total roles: {len(roles)}")
                        
                        # Check if all expected roles are present
                        missing_roles = [role for role in expected_roles if role not in found_roles]
                        if not missing_roles:
                            results.add_pass("Admin roles - All 7 expected role types present")
                            print(f"      Found roles: {', '.join(found_roles)}")
                            
                            # Verify each role has permissions defined
                            roles_with_permissions = 0
                            for role in roles:
                                if "default_permissions" in role and role["default_permissions"]:
                                    roles_with_permissions += 1
                            
                            if roles_with_permissions == len(roles):
                                results.add_pass("Admin roles - All roles have permissions defined")
                            else:
                                results.add_fail("Admin roles", f"Only {roles_with_permissions}/{len(roles)} roles have permissions defined")
                        else:
                            results.add_fail("Admin roles", f"Missing expected roles: {missing_roles}")
                    else:
                        results.add_fail("Admin roles", f"Expected 7 roles, got {len(roles)}")
                else:
                    results.add_fail("Admin roles", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/roles", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/roles", f"Request failed: {str(e)}")
    
    # Test 3: Super Admin Dashboard
    if admin_token:
        print("\n   Test 3: Super Admin Dashboard - GET /api/super-admin/dashboard")
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
                    
                    # Verify admin info section
                    if "admin" in dashboard_data:
                        admin_info = dashboard_data["admin"]
                        required_admin_fields = ["role", "is_super_admin", "assigned_provinces"]
                        missing_admin_fields = [field for field in required_admin_fields if field not in admin_info]
                        
                        if not missing_admin_fields:
                            results.add_pass("Dashboard admin info - All required fields present")
                            print(f"      Admin role: {admin_info.get('role', 'N/A')}")
                            print(f"      Is super admin: {admin_info.get('is_super_admin', 'N/A')}")
                            print(f"      Assigned provinces: {admin_info.get('assigned_provinces', [])}")
                        else:
                            results.add_fail("Dashboard admin info", f"Missing fields: {missing_admin_fields}")
                    else:
                        results.add_fail("Dashboard admin info", "Admin info section missing")
                    
                    # Verify action items section
                    if "action_items" in dashboard_data:
                        action_items = dashboard_data["action_items"]
                        required_action_fields = ["pending_activations", "pending_credentials", "open_tickets"]
                        missing_action_fields = [field for field in required_action_fields if field not in action_items]
                        
                        if not missing_action_fields:
                            results.add_pass("Dashboard action items - All required fields present")
                            print(f"      Pending activations: {action_items.get('pending_activations', 0)}")
                            print(f"      Pending credentials: {action_items.get('pending_credentials', 0)}")
                            print(f"      Open tickets: {action_items.get('open_tickets', 0)}")
                        else:
                            results.add_fail("Dashboard action items", f"Missing fields: {missing_action_fields}")
                    else:
                        results.add_fail("Dashboard action items", "Action items section missing")
                    
                    # Verify platform stats section
                    if "platform_stats" in dashboard_data:
                        platform_stats = dashboard_data["platform_stats"]
                        required_stats_fields = ["total_workforce", "total_employers"]
                        missing_stats_fields = [field for field in required_stats_fields if field not in platform_stats]
                        
                        if not missing_stats_fields:
                            results.add_pass("Dashboard platform stats - Required fields present")
                            print(f"      Total workforce: {platform_stats.get('total_workforce', 0)}")
                            print(f"      Total employers: {platform_stats.get('total_employers', 0)}")
                            print(f"      Total institutions: {platform_stats.get('total_institutions', 0)}")
                            print(f"      Total admins: {platform_stats.get('total_admins', 0)}")
                            print(f"      Total franchises: {platform_stats.get('total_franchises', 0)}")
                        else:
                            results.add_fail("Dashboard platform stats", f"Missing fields: {missing_stats_fields}")
                    else:
                        results.add_fail("Dashboard platform stats", "Platform stats section missing")
                        
                    # Verify response includes success: true
                    if data.get("success") is True:
                        results.add_pass("Super admin dashboard - Returns success: true")
                    else:
                        results.add_fail("Super admin dashboard", "Response missing success: true")
                else:
                    results.add_fail("Super admin dashboard", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/dashboard", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/dashboard", f"Request failed: {str(e)}")
    
    # Test 4: Pending Activations
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
                    pending_data = data["data"]
                    
                    # Verify response structure
                    required_fields = ["pending_users", "total", "page"]
                    missing_fields = [field for field in required_fields if field not in pending_data]
                    
                    if not missing_fields:
                        results.add_pass("GET /api/super-admin/pending-activations - Proper response structure")
                        print(f"      Total pending users: {pending_data.get('total', 0)}")
                        print(f"      Current page: {pending_data.get('page', 1)}")
                        print(f"      Users in response: {len(pending_data.get('pending_users', []))}")
                        
                        # Test pagination by checking if pages field exists
                        if "pages" in pending_data:
                            results.add_pass("Pending activations - Pagination support present")
                        else:
                            results.add_fail("Pending activations", "Pagination support missing")
                    else:
                        results.add_fail("Pending activations", f"Missing fields: {missing_fields}")
                else:
                    results.add_fail("Pending activations", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/pending-activations", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/pending-activations", f"Request failed: {str(e)}")
    
    # Test 5: Admin List
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
                    
                    # Verify response structure
                    required_fields = ["admins", "total", "page", "limit"]
                    missing_fields = [field for field in required_fields if field not in admins_data]
                    
                    if not missing_fields:
                        results.add_pass("GET /api/super-admin/admins - Proper response structure")
                        admins_list = admins_data.get("admins", [])
                        print(f"      Total admins: {admins_data.get('total', 0)}")
                        print(f"      Admins in response: {len(admins_list)}")
                        
                        # Verify admin entries have roles
                        if admins_list:
                            admins_with_roles = 0
                            for admin in admins_list:
                                if "role" in admin:
                                    admins_with_roles += 1
                            
                            if admins_with_roles == len(admins_list):
                                results.add_pass("Admin list - All admin users have roles defined")
                            else:
                                results.add_fail("Admin list", f"Only {admins_with_roles}/{len(admins_list)} admins have roles")
                        else:
                            results.add_pass("Admin list - Endpoint accessible (empty list expected)")
                    else:
                        results.add_fail("Admin list", f"Missing fields: {missing_fields}")
                else:
                    results.add_fail("Admin list", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/admins", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/admins", f"Request failed: {str(e)}")
    
    # Test 6: Franchise Management
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
                if data.get("success") and "data" in data:
                    franchises_data = data["data"]
                    
                    # Verify response structure
                    required_fields = ["franchises", "total", "page"]
                    missing_fields = [field for field in required_fields if field not in franchises_data]
                    
                    if not missing_fields:
                        results.add_pass("GET /api/super-admin/franchises - Endpoint accessible")
                        print(f"      Total franchises: {franchises_data.get('total', 0)}")
                        print(f"      Franchises in response: {len(franchises_data.get('franchises', []))}")
                        
                        # Verify response includes success: true
                        if data.get("success") is True:
                            results.add_pass("Franchise management - Returns success: true")
                        else:
                            results.add_fail("Franchise management", "Response missing success: true")
                    else:
                        results.add_fail("Franchise management", f"Missing fields: {missing_fields}")
                else:
                    results.add_fail("Franchise management", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/super-admin/franchises", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/super-admin/franchises", f"Request failed: {str(e)}")
    
    # Test 7: Authentication Enforcement
    print("\n   Test 7: Authentication Enforcement")
    
    # Test endpoints without authentication
    super_admin_endpoints = [
        ("GET", "/super-admin/roles"),
        ("GET", "/super-admin/dashboard"),
        ("GET", "/super-admin/pending-activations"),
        ("GET", "/super-admin/admins"),
        ("GET", "/super-admin/franchises")
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
    
    # Test 8: Role-Based Access Control
    print("\n   Test 8: Role-Based Access Control Verification")
    
    # Verify that all endpoints return proper JSON responses with authentication
    if admin_token:
        authenticated_endpoints_working = 0
        for method, endpoint in super_admin_endpoints:
            try:
                if method == "GET":
                    response = requests.get(
                        f"{BASE_URL}{endpoint}",
                        headers={"Authorization": f"Bearer {admin_token}"},
                        timeout=5
                    )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        authenticated_endpoints_working += 1
            except Exception:
                pass
        
        if authenticated_endpoints_working == len(super_admin_endpoints):
            results.add_pass("Role-based access control - All endpoints return proper JSON with authentication")
        else:
            results.add_fail("Role-based access control", f"Only {authenticated_endpoints_working}/{len(super_admin_endpoints)} endpoints working with authentication")

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