#!/usr/bin/env python3
"""
HR Bank Auto-Dispatch Feature Testing
Testing Auto-Dispatch feature for Grid Services in HR Bank
Focus: Auto-dispatch stats, configuration, bulk dispatch, API documentation
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

print(f"🚀 HR BANK AUTO-DISPATCH FEATURE TESTING")
print(f"Testing backend at: {BASE_URL}")
print(f"Base URL: {BACKEND_URL}")
print(f"Focus: Auto-dispatch stats, configuration, bulk dispatch, API documentation")
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

def test_auto_dispatch_feature(results):
    """Test the Auto-Dispatch feature for Grid Services"""
    print("\n🧪 Testing Auto-Dispatch Feature for Grid Services (Priority: HIGH)...")
    print("   Testing endpoints: /api/auto-dispatch/stats, /api/auto-dispatch/config, /api/auto-dispatch/bulk")
    print("   Test credentials: demo@swanpizza.ca / Demo123!")
    print("   Base URL: https://credblock.preview.emergentagent.com")
    
    # Test credentials from review request
    employer_creds = {"email": "demo@swanpizza.ca", "password": "Demo123!", "user_type": "employer"}
    
    # Test 1: Employer Authentication
    employer_token = None
    print("\n   Test 1: Employer Authentication - POST /api/auth/login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=employer_creds, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                employer_token = data["data"]["access_token"]
                user_data = data.get("data", {})
                
                # Verify user_type is "employer"
                if user_data.get("user_type") == "employer":
                    results.add_pass("Employer authentication - user_type is 'employer'")
                    print(f"      Employer ID: {user_data.get('user_id', 'N/A')}")
                    print(f"      User Type: {user_data.get('user_type', 'N/A')}")
                else:
                    results.add_fail("Employer authentication", f"Expected user_type 'employer', got '{user_data.get('user_type')}'")
            else:
                results.add_fail("Employer authentication", f"Invalid response: {data}")
        else:
            results.add_fail("Employer authentication", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Employer authentication", f"Request failed: {str(e)}")
    
    # Test 2: Auto-Dispatch Stats Endpoint
    if employer_token:
        print("\n   Test 2: Auto-Dispatch Stats - GET /api/auto-dispatch/stats")
        try:
            response = requests.get(
                f"{BASE_URL}/auto-dispatch/stats",
                headers={"Authorization": f"Bearer {employer_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    stats = data["data"]
                    
                    # Verify required fields are present
                    required_fields = ["total_tasks", "auto_dispatched", "pending", "completion_rate"]
                    missing_fields = [field for field in required_fields if field not in stats]
                    
                    if not missing_fields:
                        results.add_pass("GET /api/auto-dispatch/stats - All required fields present")
                        print(f"      Total tasks: {stats.get('total_tasks', 0)}")
                        print(f"      Auto dispatched: {stats.get('auto_dispatched', 0)}")
                        print(f"      Pending: {stats.get('pending', 0)}")
                        print(f"      Completion rate: {stats.get('completion_rate', 0)}%")
                        
                        # Verify response includes success: true
                        if data.get("success") is True:
                            results.add_pass("Auto-dispatch stats - Returns success: true")
                        else:
                            results.add_fail("Auto-dispatch stats", "Response missing success: true")
                    else:
                        results.add_fail("Auto-dispatch stats", f"Missing required fields: {missing_fields}")
                else:
                    results.add_fail("Auto-dispatch stats", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/auto-dispatch/stats", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/auto-dispatch/stats", f"Request failed: {str(e)}")
    
    # Test 3: Auto-Dispatch Configuration
    if employer_token:
        print("\n   Test 3: Auto-Dispatch Configuration - PUT /api/auto-dispatch/config")
        
        # Configuration from review request
        config_data = {
            "max_distance_km": 30,
            "max_daily_tasks": 6
        }
        
        try:
            response = requests.put(
                f"{BASE_URL}/auto-dispatch/config",
                json=config_data,
                headers={"Authorization": f"Bearer {employer_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    saved_config = data["data"]
                    results.add_pass("PUT /api/auto-dispatch/config - Configuration saved successfully")
                    print(f"      Max distance: {saved_config.get('max_distance_km', 'N/A')} km")
                    print(f"      Max daily tasks: {saved_config.get('max_daily_tasks', 'N/A')}")
                    
                    # Verify configuration values match what was sent
                    if (saved_config.get("max_distance_km") == 30 and 
                        saved_config.get("max_daily_tasks") == 6):
                        results.add_pass("Auto-dispatch config - Values saved correctly")
                    else:
                        results.add_fail("Auto-dispatch config", "Configuration values not saved correctly")
                        
                    # Verify response includes success: true
                    if data.get("success") is True:
                        results.add_pass("Auto-dispatch config - Returns success: true")
                    else:
                        results.add_fail("Auto-dispatch config", "Response missing success: true")
                else:
                    results.add_fail("Auto-dispatch config", f"Invalid response structure: {data}")
            else:
                results.add_fail("PUT /api/auto-dispatch/config", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("PUT /api/auto-dispatch/config", f"Request failed: {str(e)}")
    
    # Test 4: Bulk Dispatch (Dry Run)
    if employer_token:
        print("\n   Test 4: Bulk Dispatch Dry Run - POST /api/auto-dispatch/bulk?dry_run=true")
        try:
            response = requests.post(
                f"{BASE_URL}/auto-dispatch/bulk?dry_run=true",
                headers={"Authorization": f"Bearer {employer_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results.add_pass("POST /api/auto-dispatch/bulk?dry_run=true - Endpoint returns successfully")
                    
                    # Verify response structure
                    if "data" in data:
                        bulk_data = data["data"]
                        print(f"      Dispatched tasks: {bulk_data.get('dispatched', 0)}")
                        print(f"      Message: {data.get('message', 'N/A')}")
                        
                        # Verify response includes success: true
                        if data.get("success") is True:
                            results.add_pass("Bulk dispatch dry run - Returns success: true")
                        else:
                            results.add_fail("Bulk dispatch dry run", "Response missing success: true")
                    else:
                        results.add_fail("Bulk dispatch dry run", "Response missing data field")
                else:
                    results.add_fail("Bulk dispatch dry run", f"Response indicates failure: {data}")
            else:
                results.add_fail("POST /api/auto-dispatch/bulk?dry_run=true", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST /api/auto-dispatch/bulk?dry_run=true", f"Request failed: {str(e)}")
    
    # Test 5: API Documentation - Verify routes are registered
    print("\n   Test 5: API Documentation - Verify auto-dispatch routes are registered")
    
    # Test that endpoints return proper JSON responses (not 404)
    auto_dispatch_endpoints = [
        ("GET", "/auto-dispatch/stats"),
        ("PUT", "/auto-dispatch/config"),
        ("POST", "/auto-dispatch/bulk")
    ]
    
    registered_endpoints = 0
    for method, endpoint in auto_dispatch_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            elif method == "PUT":
                response = requests.put(f"{BASE_URL}{endpoint}", json={}, timeout=5)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", timeout=5)
            
            # Check if endpoint is registered (not 404)
            if response.status_code != 404:
                registered_endpoints += 1
                print(f"      {method} {endpoint}: Registered (HTTP {response.status_code})")
            else:
                print(f"      {method} {endpoint}: Not found (HTTP 404)")
        except Exception as e:
            print(f"      {method} {endpoint}: Error - {str(e)}")
    
    if registered_endpoints == len(auto_dispatch_endpoints):
        results.add_pass("API Documentation - All auto-dispatch routes registered correctly")
    else:
        results.add_fail("API Documentation", f"Only {registered_endpoints}/{len(auto_dispatch_endpoints)} routes registered")
    
    # Test 6: Authentication Enforcement
    print("\n   Test 6: Authentication Enforcement")
    
    # Test endpoints without authentication
    for method, endpoint in auto_dispatch_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            elif method == "PUT":
                response = requests.put(f"{BASE_URL}{endpoint}", json={}, timeout=5)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", timeout=5)
            
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
    
    print("\n🔍 STARTING AUTO-DISPATCH FEATURE TESTS...")
    
    # Run Auto-Dispatch Feature Tests
    test_auto_dispatch_feature(results)
    
    # Print final summary
    print("\n" + "="*80)
    success = results.summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Auto-Dispatch feature is working correctly.")
    else:
        print(f"\n⚠️  {results.failed} TEST(S) FAILED. See details above.")
    
    return success

if __name__ == "__main__":
    main()