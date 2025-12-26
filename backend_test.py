#!/usr/bin/env python3
"""
HR Bank Time-Off Management System Testing
Testing Enhanced Time-Off Management System for HR Bank
Focus: Policy management, balance tracking, request workflows, calendar integration
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

print(f"🚀 HR BANK TIME-OFF MANAGEMENT SYSTEM TESTING")
print(f"Testing backend at: {BASE_URL}")
print(f"Base URL: {BACKEND_URL}")
print(f"Focus: Policy management, balance tracking, request workflows, calendar integration")
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

def test_time_off_management_system(results):
    """Test the Time-Off Management System for HR Bank"""
    print("\n🧪 Testing Time-Off Management System for HR Bank (Priority: HIGH)...")
    print("   Testing endpoints: Policy Management, Balance Management, Time-Off Requests, Calendar & Summary")
    print("   Test credentials: Employer: demo@swanpizza.ca / Demo123!, Workforce: alex.johnson@email.com / Demo123!")
    print("   Base URL: https://superadmin-hr.preview.emergentagent.com")
    
    # Test credentials from review request
    employer_creds = {"email": "demo@swanpizza.ca", "password": "Demo123!", "user_type": "employer"}
    workforce_creds = {"email": "alex.johnson@email.com", "password": "Demo123!", "user_type": "workforce"}
    
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
    
    # Test 2: Workforce Authentication
    workforce_token = None
    print("\n   Test 2: Workforce Authentication - POST /api/auth/login")
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
    
    # Test 3: Policy Management - Get Policies (Employer)
    if employer_token:
        print("\n   Test 3: Policy Management - GET /api/time-off/policies")
        try:
            response = requests.get(
                f"{BASE_URL}/time-off/policies",
                headers={"Authorization": f"Bearer {employer_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    policies_data = data["data"]
                    policies = policies_data.get("policies", [])
                    
                    if len(policies) >= 1:
                        results.add_pass("GET /api/time-off/policies - Returns policies (default policy)")
                        print(f"      Total policies: {len(policies)}")
                        
                        # Check if default policy exists
                        default_policy = policies[0]
                        if "policy_name" in default_policy:
                            results.add_pass("Policy management - Default policy has policy_name")
                            print(f"      Default policy name: {default_policy.get('policy_name', 'N/A')}")
                        else:
                            results.add_fail("Policy management", "Default policy missing policy_name")
                    else:
                        results.add_fail("Policy management", "No policies returned")
                else:
                    results.add_fail("Policy management", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/time-off/policies", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/time-off/policies", f"Request failed: {str(e)}")
    
    # Test 4: Policy Management - Create Policy (Employer)
    policy_id = None
    if employer_token:
        print("\n   Test 4: Policy Management - POST /api/time-off/policies")
        try:
            policy_data = {
                "policy_name": "Test Policy",
                "vacation_days_per_year": 15.0,
                "sick_days_per_year": 5.0,
                "personal_days_per_year": 3.0,
                "is_default": False
            }
            
            response = requests.post(
                f"{BASE_URL}/time-off/policies",
                headers={"Authorization": f"Bearer {employer_token}"},
                json=policy_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    policy_id = data["data"].get("policy_id")
                    results.add_pass("POST /api/time-off/policies - Policy created successfully")
                    print(f"      Created policy ID: {policy_id}")
                else:
                    results.add_fail("Create policy", f"Invalid response structure: {data}")
            else:
                results.add_fail("POST /api/time-off/policies", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST /api/time-off/policies", f"Request failed: {str(e)}")
    
    # Test 5: Policy Management - Update Policy (Employer)
    if employer_token and policy_id:
        print("\n   Test 5: Policy Management - PUT /api/time-off/policies/{policy_id}")
        try:
            update_data = {
                "policy_name": "Updated Test Policy"
            }
            
            response = requests.put(
                f"{BASE_URL}/time-off/policies/{policy_id}",
                headers={"Authorization": f"Bearer {employer_token}"},
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results.add_pass("PUT /api/time-off/policies/{policy_id} - Policy updated successfully")
                    print(f"      Policy updated: {policy_id}")
                else:
                    results.add_fail("Update policy", f"Invalid response structure: {data}")
            else:
                results.add_fail("PUT /api/time-off/policies/{policy_id}", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("PUT /api/time-off/policies/{policy_id}", f"Request failed: {str(e)}")
    
    # Test 6: Balance Management - Get Worker Balance (Workforce)
    if workforce_token:
        print("\n   Test 6: Balance Management - GET /api/time-off/balance")
        try:
            response = requests.get(
                f"{BASE_URL}/time-off/balance",
                headers={"Authorization": f"Bearer {workforce_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    balances_data = data["data"]
                    balances = balances_data.get("balances", [])
                    
                    results.add_pass("GET /api/time-off/balance - Worker balance accessible")
                    print(f"      Total balances: {len(balances)}")
                    
                    if balances:
                        balance = balances[0]
                        print(f"      Vacation available: {balance.get('vacation_available', 0)}")
                        print(f"      Sick available: {balance.get('sick_available', 0)}")
                        print(f"      Personal available: {balance.get('personal_available', 0)}")
                else:
                    results.add_fail("Worker balance", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/time-off/balance", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/time-off/balance", f"Request failed: {str(e)}")
    
    # Test 7: Balance Management - Initialize Team Balances (Employer)
    if employer_token:
        print("\n   Test 7: Balance Management - POST /api/time-off/balance/initialize")
        try:
            response = requests.post(
                f"{BASE_URL}/time-off/balance/initialize",
                headers={"Authorization": f"Bearer {employer_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    initialized_count = data["data"].get("initialized_count", 0)
                    results.add_pass("POST /api/time-off/balance/initialize - Team balances initialized")
                    print(f"      Initialized count: {initialized_count}")
                else:
                    results.add_fail("Initialize team balances", f"Invalid response structure: {data}")
            else:
                results.add_fail("POST /api/time-off/balance/initialize", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST /api/time-off/balance/initialize", f"Request failed: {str(e)}")
    
    # Test 8: Time-Off Requests - Create Request (Workforce)
    request_id = None
    employer_id = None
    if workforce_token and employer_token:
        print("\n   Test 8: Time-Off Requests - POST /api/time-off/request")
        try:
            # Get employer ID from employer authentication data
            employer_response = requests.post(f"{BASE_URL}/auth/login", json=employer_creds, timeout=10)
            if employer_response.status_code == 200:
                employer_data = employer_response.json()
                employer_id = employer_data.get("data", {}).get("user_id")
                print(f"      Using employer ID: {employer_id}")
            
            if not employer_id:
                results.add_fail("Get employer ID", "Could not get employer ID for request creation")
                return
            
            # Create time-off request
            today = datetime.now().date()
            start_date = today + timedelta(days=7)  # Request for next week
            end_date = start_date + timedelta(days=2)  # 3-day vacation
            
            request_data = {
                "employer_id": employer_id,
                "type": "vacation",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "is_full_day": True,
                "business_days_only": True,
                "reason": "Family vacation",
                "notes": "Test vacation request"
            }
            
            response = requests.post(
                f"{BASE_URL}/time-off/request",
                headers={"Authorization": f"Bearer {workforce_token}"},
                json=request_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    request_id = data["data"].get("request_id")
                    total_days = data["data"].get("total_days", 0)
                    results.add_pass("POST /api/time-off/request - Time-off request created")
                    print(f"      Request ID: {request_id}")
                    print(f"      Total days: {total_days}")
                else:
                    results.add_fail("Create time-off request", f"Invalid response structure: {data}")
            else:
                results.add_fail("POST /api/time-off/request", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST /api/time-off/request", f"Request failed: {str(e)}")
    
    # Test 9: Time-Off Requests - List Requests (Both user types)
    if workforce_token:
        print("\n   Test 9: Time-Off Requests - GET /api/time-off/requests (Workforce)")
        try:
            response = requests.get(
                f"{BASE_URL}/time-off/requests",
                headers={"Authorization": f"Bearer {workforce_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    requests_data = data["data"]
                    requests_list = requests_data.get("requests", [])
                    total = requests_data.get("total", 0)
                    
                    results.add_pass("GET /api/time-off/requests (Workforce) - Requests list accessible")
                    print(f"      Total requests: {total}")
                    print(f"      Requests in response: {len(requests_list)}")
                else:
                    results.add_fail("List requests (Workforce)", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/time-off/requests (Workforce)", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/time-off/requests (Workforce)", f"Request failed: {str(e)}")
    
    if employer_token:
        print("\n   Test 10: Time-Off Requests - GET /api/time-off/requests (Employer)")
        try:
            response = requests.get(
                f"{BASE_URL}/time-off/requests",
                headers={"Authorization": f"Bearer {employer_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    requests_data = data["data"]
                    requests_list = requests_data.get("requests", [])
                    total = requests_data.get("total", 0)
                    
                    results.add_pass("GET /api/time-off/requests (Employer) - Requests list accessible")
                    print(f"      Total requests: {total}")
                    print(f"      Requests in response: {len(requests_list)}")
                    
                    # Check if requests have worker details for employer view
                    if requests_list:
                        first_request = requests_list[0]
                        if "worker_name" in first_request:
                            results.add_pass("Employer requests view - Worker details included")
                        else:
                            results.add_fail("Employer requests view", "Worker details missing")
                else:
                    results.add_fail("List requests (Employer)", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/time-off/requests (Employer)", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/time-off/requests (Employer)", f"Request failed: {str(e)}")
    
    # Test 11: Time-Off Requests - Approve Request (Employer)
    if employer_token and request_id:
        print("\n   Test 11: Time-Off Requests - PATCH /api/time-off/requests/{request_id}/approve")
        try:
            approval_data = {
                "notes": "Approved for test purposes"
            }
            
            response = requests.patch(
                f"{BASE_URL}/time-off/requests/{request_id}/approve",
                headers={"Authorization": f"Bearer {employer_token}"},
                json=approval_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results.add_pass("PATCH /api/time-off/requests/{request_id}/approve - Request approved")
                    print(f"      Approved request: {request_id}")
                else:
                    results.add_fail("Approve request", f"Invalid response structure: {data}")
            else:
                results.add_fail("PATCH /api/time-off/requests/{request_id}/approve", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("PATCH /api/time-off/requests/{request_id}/approve", f"Request failed: {str(e)}")
    
    # Test 11.5: Time-Off Requests - Create Another Request for Reject Test
    reject_request_id = None
    if workforce_token and employer_id:
        print("\n   Test 11.5: Create Another Request for Reject Test - POST /api/time-off/request")
        try:
            # Create time-off request for rejection
            today = datetime.now().date()
            start_date = today + timedelta(days=14)  # Request for 2 weeks from now
            end_date = start_date + timedelta(days=1)  # 2-day sick leave
            
            request_data = {
                "employer_id": employer_id,
                "type": "sick",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "is_full_day": True,
                "business_days_only": True,
                "reason": "Feeling unwell",
                "notes": "Test sick leave request for rejection"
            }
            
            response = requests.post(
                f"{BASE_URL}/time-off/request",
                headers={"Authorization": f"Bearer {workforce_token}"},
                json=request_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    reject_request_id = data["data"].get("request_id")
                    results.add_pass("Create request for reject test - Request created")
                    print(f"      Reject test request ID: {reject_request_id}")
                else:
                    results.add_fail("Create request for reject test", f"Invalid response structure: {data}")
            else:
                results.add_fail("Create request for reject test", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("Create request for reject test", f"Request failed: {str(e)}")
    
    # Test 11.6: Time-Off Requests - Reject Request (Employer)
    if employer_token and reject_request_id:
        print("\n   Test 11.6: Time-Off Requests - PATCH /api/time-off/requests/{request_id}/reject")
        try:
            rejection_data = {
                "reason": "Insufficient staffing during that period"
            }
            
            response = requests.patch(
                f"{BASE_URL}/time-off/requests/{reject_request_id}/reject",
                headers={"Authorization": f"Bearer {employer_token}"},
                json=rejection_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results.add_pass("PATCH /api/time-off/requests/{request_id}/reject - Request rejected")
                    print(f"      Rejected request: {reject_request_id}")
                else:
                    results.add_fail("Reject request", f"Invalid response structure: {data}")
            else:
                results.add_fail("PATCH /api/time-off/requests/{request_id}/reject", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("PATCH /api/time-off/requests/{request_id}/reject", f"Request failed: {str(e)}")
    
    # Test 11.7: Time-Off Requests - Cancel Request (Workforce)
    cancel_request_id = None
    if workforce_token and employer_token:
        print("\n   Test 11.7: Create Request for Cancel Test - POST /api/time-off/request")
        try:
            # Get employer ID from employer token
            employer_response = requests.get(
                f"{BASE_URL}/auth/me",
                headers={"Authorization": f"Bearer {employer_token}"},
                timeout=5
            )
            
            employer_id = None
            if employer_response.status_code == 200:
                employer_data = employer_response.json()
                employer_id = employer_data.get("data", {}).get("user_id")
            
            if not employer_id:
                # Use a default employer ID for testing
                employer_id = "emp_test_123"
            
            # Create time-off request for cancellation
            today = datetime.now().date()
            start_date = today + timedelta(days=21)  # Request for 3 weeks from now
            end_date = start_date  # 1-day personal leave
            
            request_data = {
                "employer_id": employer_id,
                "type": "personal",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "is_full_day": True,
                "business_days_only": True,
                "reason": "Personal appointment",
                "notes": "Test personal leave request for cancellation"
            }
            
            response = requests.post(
                f"{BASE_URL}/time-off/request",
                headers={"Authorization": f"Bearer {workforce_token}"},
                json=request_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    cancel_request_id = data["data"].get("request_id")
                    results.add_pass("Create request for cancel test - Request created")
                    print(f"      Cancel test request ID: {cancel_request_id}")
                else:
                    results.add_fail("Create request for cancel test", f"Invalid response structure: {data}")
            else:
                results.add_fail("Create request for cancel test", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("Create request for cancel test", f"Request failed: {str(e)}")
    
    # Test 11.8: Time-Off Requests - Cancel Request (Workforce)
    if workforce_token and cancel_request_id:
        print("\n   Test 11.8: Time-Off Requests - DELETE /api/time-off/requests/{request_id}")
        try:
            response = requests.delete(
                f"{BASE_URL}/time-off/requests/{cancel_request_id}",
                headers={"Authorization": f"Bearer {workforce_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results.add_pass("DELETE /api/time-off/requests/{request_id} - Request cancelled")
                    print(f"      Cancelled request: {cancel_request_id}")
                else:
                    results.add_fail("Cancel request", f"Invalid response structure: {data}")
            else:
                results.add_fail("DELETE /api/time-off/requests/{request_id}", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("DELETE /api/time-off/requests/{request_id}", f"Request failed: {str(e)}")
    
    # Test 12: Calendar View
    if employer_token:
        print("\n   Test 12: Calendar View - GET /api/time-off/calendar")
        try:
            current_date = datetime.now()
            response = requests.get(
                f"{BASE_URL}/time-off/calendar?month={current_date.month}&year={current_date.year}",
                headers={"Authorization": f"Bearer {employer_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    calendar_data = data["data"]
                    entries = calendar_data.get("entries", [])
                    month = calendar_data.get("month")
                    year = calendar_data.get("year")
                    
                    results.add_pass("GET /api/time-off/calendar - Calendar view accessible")
                    print(f"      Month: {month}, Year: {year}")
                    print(f"      Calendar entries: {len(entries)}")
                else:
                    results.add_fail("Calendar view", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/time-off/calendar", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/time-off/calendar", f"Request failed: {str(e)}")
    
    # Test 13: Summary Dashboard
    if workforce_token:
        print("\n   Test 13: Summary Dashboard - GET /api/time-off/summary (Workforce)")
        try:
            response = requests.get(
                f"{BASE_URL}/time-off/summary",
                headers={"Authorization": f"Bearer {workforce_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    summary_data = data["data"]
                    
                    # Check workforce summary fields
                    required_fields = ["pending_requests", "upcoming_time_off", "balances"]
                    missing_fields = [field for field in required_fields if field not in summary_data]
                    
                    if not missing_fields:
                        results.add_pass("GET /api/time-off/summary (Workforce) - All required fields present")
                        print(f"      Pending requests: {summary_data.get('pending_requests', 0)}")
                        print(f"      Upcoming time off: {len(summary_data.get('upcoming_time_off', []))}")
                        
                        balances = summary_data.get("balances", {})
                        print(f"      Vacation available: {balances.get('vacation_available', 0)}")
                        print(f"      Sick available: {balances.get('sick_available', 0)}")
                        print(f"      Personal available: {balances.get('personal_available', 0)}")
                    else:
                        results.add_fail("Summary dashboard (Workforce)", f"Missing fields: {missing_fields}")
                else:
                    results.add_fail("Summary dashboard (Workforce)", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/time-off/summary (Workforce)", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/time-off/summary (Workforce)", f"Request failed: {str(e)}")
    
    if employer_token:
        print("\n   Test 14: Summary Dashboard - GET /api/time-off/summary (Employer)")
        try:
            response = requests.get(
                f"{BASE_URL}/time-off/summary",
                headers={"Authorization": f"Bearer {employer_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    summary_data = data["data"]
                    
                    # Check employer summary fields
                    required_fields = ["pending_requests", "approved_this_month", "workers_off_today", "workers_off_this_week"]
                    missing_fields = [field for field in required_fields if field not in summary_data]
                    
                    if not missing_fields:
                        results.add_pass("GET /api/time-off/summary (Employer) - All required fields present")
                        print(f"      Pending requests: {summary_data.get('pending_requests', 0)}")
                        print(f"      Approved this month: {summary_data.get('approved_this_month', 0)}")
                        print(f"      Workers off today: {summary_data.get('workers_off_today', 0)}")
                        print(f"      Workers off this week: {summary_data.get('workers_off_this_week', 0)}")
                    else:
                        results.add_fail("Summary dashboard (Employer)", f"Missing fields: {missing_fields}")
                else:
                    results.add_fail("Summary dashboard (Employer)", f"Invalid response structure: {data}")
            else:
                results.add_fail("GET /api/time-off/summary (Employer)", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("GET /api/time-off/summary (Employer)", f"Request failed: {str(e)}")
    
    # Test 15: Authentication Enforcement
    print("\n   Test 15: Authentication Enforcement")
    
    # Test endpoints without authentication
    time_off_endpoints = [
        ("GET", "/time-off/policies"),
        ("GET", "/time-off/balance"),
        ("GET", "/time-off/requests"),
        ("GET", "/time-off/calendar?month=12&year=2025"),
        ("GET", "/time-off/summary")
    ]
    
    for method, endpoint in time_off_endpoints:
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
    
    print("\n🔍 STARTING TIME-OFF MANAGEMENT SYSTEM TESTS...")
    
    # Run Time-Off Management System Tests
    test_time_off_management_system(results)
    
    # Print final summary
    print("\n" + "="*80)
    success = results.summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Time-Off Management System is working correctly.")
    else:
        print(f"\n⚠️  {results.failed} TEST(S) FAILED. See details above.")
    
    return success

if __name__ == "__main__":
    main()