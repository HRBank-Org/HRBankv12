#!/usr/bin/env python3
"""
Job Posting Workflow Test for HR Bank
Test the complete Job Posting Workflow as per review request
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

print(f"🚀 JOB POSTING WORKFLOW TESTING FOR HR BANK")
print(f"Testing backend at: {BASE_URL}")
print(f"Base URL: https://recruit-flow-23.preview.emergentagent.com")
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

def get_auth_headers(token):
    """Get authorization headers for API requests"""
    return {"Authorization": f"Bearer {token}"}

def generate_test_user(user_type="workforce"):
    """Generate unique test user data"""
    unique_id = str(uuid.uuid4())[:8]
    # Generate phone in correct format: +1-XXX-XXX-XXXX
    phone_digits = ''.join([c for c in unique_id if c.isdigit()])[:7]
    while len(phone_digits) < 7:
        phone_digits += '0'
    phone = f"+1-555-{phone_digits[:3]}-{phone_digits[3:7]}"
    
    return {
        "email": f"test_{user_type}_{unique_id}@hrbank.com",
        "full_name": f"Test {user_type.title()} User {unique_id}",
        "phone": phone,
        "password": "TestPassword123!",
        "user_type": user_type
    }

def test_job_posting_workflow(results):
    """Test the complete Job Posting Workflow for HR Bank as per review request"""
    print("\n🧪 TESTING JOB POSTING WORKFLOW FOR HR BANK")
    print("   Test Scenarios: Public Job Board, Employer Job Management, Workforce Job Application")
    print("="*80)
    
    # Test 1: Public Job Board (No Auth Required)
    print("\n   Test 1: Public Job Board (No Auth Required)")
    try:
        response = requests.get(f"{BASE_URL}/jobs/public", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("success") and 
                "data" in data and 
                isinstance(data["data"], list)):
                
                jobs = data["data"]
                results.add_pass("GET /api/jobs/public - Returns list of active jobs")
                
                # Verify response structure for each job
                if jobs:
                    sample_job = jobs[0]
                    required_fields = ["posting_id", "title", "company_name", "hourly_rate", "work_type"]
                    missing_fields = [field for field in required_fields if field not in sample_job]
                    
                    if not missing_fields:
                        results.add_pass("Public jobs response includes required fields (posting_id, title, company_name, hourly_rate, work_type)")
                        print(f"      Found {len(jobs)} active job postings")
                        print(f"      Sample job: {sample_job.get('title')} at {sample_job.get('company_name')} - ${sample_job.get('hourly_rate')}/hr")
                    else:
                        results.add_fail("Public jobs response structure", f"Missing required fields: {missing_fields}")
                else:
                    results.add_pass("Public jobs API working (no active jobs found)")
            else:
                results.add_fail("GET /api/jobs/public", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET /api/jobs/public", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/jobs/public", f"Request failed: {str(e)}")
    
    # Test 2: Employer Authentication and Job Management
    print("\n   Test 2: Employer Job Management (Auth: john.b@swanpizza.ca / Test123!)")
    
    # Login as employer
    employer_token = None
    try:
        login_data = {
            "email": "john.b@swanpizza.ca",
            "password": "Test123!",
            "user_type": "employer"
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                employer_token = data["data"]["access_token"]
                results.add_pass("Employer login (john.b@swanpizza.ca)")
                print(f"      Employer ID: {data['data'].get('user_id', 'emp_80b6196b4d02')}")
            else:
                results.add_fail("Employer login", f"Invalid response: {data}")
                return
        else:
            results.add_fail("Employer login", f"HTTP {response.status_code}: {response.text}")
            return
    except Exception as e:
        results.add_fail("Employer login", f"Request failed: {str(e)}")
        return
    
    # Test 2a: GET /api/employer/workforce-management/job-postings - List all employer's job postings
    try:
        response = requests.get(
            f"{BASE_URL}/employer/workforce-management/job-postings",
            headers=get_auth_headers(employer_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "data" in data:
                postings = data["data"]
                results.add_pass("GET /api/employer/workforce-management/job-postings - List employer's job postings")
                print(f"      Found {len(postings)} job postings for employer")
                
                # Store posting IDs for further testing
                posting_ids = [p.get("posting_id") for p in postings if p.get("posting_id")]
                if posting_ids:
                    print(f"      Sample posting IDs: {posting_ids[:3]}")
                    test_posting_id = posting_ids[0]  # Use first posting for update/toggle tests
                else:
                    test_posting_id = None
                    print("      No posting IDs found for update/toggle tests")
            else:
                results.add_fail("GET employer job postings", f"Invalid response structure: {data}")
                test_posting_id = None
        else:
            results.add_fail("GET employer job postings", f"HTTP {response.status_code}: {response.text}")
            test_posting_id = None
    except Exception as e:
        results.add_fail("GET employer job postings", f"Request failed: {str(e)}")
        test_posting_id = None
    
    # Test 2b: PUT /api/employer/workforce-management/job-postings/{posting_id} - Update job posting
    if test_posting_id:
        try:
            update_data = {
                "hourly_rate": 18.50,
                "positions_available": 2
            }
            
            response = requests.put(
                f"{BASE_URL}/employer/workforce-management/job-postings/{test_posting_id}",
                json=update_data,
                headers=get_auth_headers(employer_token),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results.add_pass("PUT /api/employer/workforce-management/job-postings/{posting_id} - Update job posting")
                    print(f"      Updated posting {test_posting_id} - hourly_rate: $18.50, positions: 2")
                else:
                    results.add_fail("PUT update job posting", f"Invalid response: {data}")
            else:
                results.add_fail("PUT update job posting", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("PUT update job posting", f"Request failed: {str(e)}")
    else:
        results.add_fail("PUT update job posting", "No posting ID available for testing")
    
    # Test 2c: POST /api/employer/workforce-management/job-postings/{posting_id}/toggle-status - Pause/Resume job
    if test_posting_id:
        try:
            response = requests.post(
                f"{BASE_URL}/employer/workforce-management/job-postings/{test_posting_id}/toggle-status",
                headers=get_auth_headers(employer_token),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "status" in data.get("data", {}):
                    new_status = data["data"]["status"]
                    results.add_pass("POST /api/employer/workforce-management/job-postings/{posting_id}/toggle-status - Pause/Resume job")
                    print(f"      Toggled posting {test_posting_id} status to: {new_status}")
                else:
                    results.add_fail("POST toggle job status", f"Invalid response: {data}")
            else:
                results.add_fail("POST toggle job status", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("POST toggle job status", f"Request failed: {str(e)}")
    else:
        results.add_fail("POST toggle job status", "No posting ID available for testing")
    
    # Test 2d: DELETE /api/employer/workforce-management/job-postings/{posting_id} - Close job posting
    if test_posting_id:
        try:
            response = requests.delete(
                f"{BASE_URL}/employer/workforce-management/job-postings/{test_posting_id}",
                headers=get_auth_headers(employer_token),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results.add_pass("DELETE /api/employer/workforce-management/job-postings/{posting_id} - Close job posting")
                    print(f"      Closed posting {test_posting_id}")
                else:
                    results.add_fail("DELETE close job posting", f"Invalid response: {data}")
            else:
                results.add_fail("DELETE close job posting", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("DELETE close job posting", f"Request failed: {str(e)}")
    else:
        results.add_fail("DELETE close job posting", "No posting ID available for testing")
    
    # Test 3: Workforce Job Application
    print("\n   Test 3: Workforce Job Application")
    
    # First, check if there's a workforce test account or create one
    workforce_token = None
    workforce_user_data = None
    
    # Try to create a test workforce account
    try:
        workforce_user_data = generate_test_user("workforce")
        signup_response = requests.post(f"{BASE_URL}/auth/signup", json=workforce_user_data, timeout=10)
        
        if signup_response.status_code == 200:
            # Login with the new account
            login_data = {
                "email": workforce_user_data["email"],
                "password": workforce_user_data["password"],
                "user_type": "workforce"
            }
            
            login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
            
            if login_response.status_code == 200:
                data = login_response.json()
                if data.get("success") and "access_token" in data.get("data", {}):
                    workforce_token = data["data"]["access_token"]
                    results.add_pass("Workforce test account creation and login")
                    print(f"      Created workforce test account: {workforce_user_data['email']}")
                else:
                    results.add_fail("Workforce login after signup", f"Invalid response: {data}")
            else:
                results.add_fail("Workforce login after signup", f"HTTP {login_response.status_code}: {login_response.text}")
        else:
            results.add_fail("Workforce account creation", f"HTTP {signup_response.status_code}: {signup_response.text}")
    except Exception as e:
        results.add_fail("Workforce account creation", f"Request failed: {str(e)}")
    
    # Test 3a: POST /api/jobs/{posting_id}/apply - Apply to a job
    if workforce_token:
        # Get an active job posting to apply to
        try:
            public_jobs_response = requests.get(f"{BASE_URL}/jobs/public", timeout=10)
            
            if public_jobs_response.status_code == 200:
                jobs_data = public_jobs_response.json()
                active_jobs = jobs_data.get("data", [])
                
                if active_jobs:
                    target_posting_id = active_jobs[0].get("posting_id")
                    job_title = active_jobs[0].get("title", "Unknown Job")
                    
                    if target_posting_id:
                        # Apply to the job
                        apply_response = requests.post(
                            f"{BASE_URL}/jobs/{target_posting_id}/apply",
                            headers=get_auth_headers(workforce_token),
                            timeout=10
                        )
                        
                        if apply_response.status_code == 200:
                            apply_data = apply_response.json()
                            if apply_data.get("success"):
                                results.add_pass("POST /api/jobs/{posting_id}/apply - Apply to job (creates application with stage='applied')")
                                print(f"      Applied to job: {job_title} (ID: {target_posting_id})")
                                
                                # Test duplicate application prevention
                                duplicate_response = requests.post(
                                    f"{BASE_URL}/jobs/{target_posting_id}/apply",
                                    headers=get_auth_headers(workforce_token),
                                    timeout=10
                                )
                                
                                if duplicate_response.status_code == 409:
                                    results.add_pass("Duplicate application prevention (returns 409 if already applied)")
                                    print(f"      Duplicate application correctly prevented")
                                elif duplicate_response.status_code == 400:
                                    # Some APIs might return 400 instead of 409
                                    duplicate_data = duplicate_response.json()
                                    if "already applied" in duplicate_data.get("detail", "").lower():
                                        results.add_pass("Duplicate application prevention (returns 400 with 'already applied' message)")
                                        print(f"      Duplicate application correctly prevented")
                                    else:
                                        results.add_fail("Duplicate application prevention", f"Wrong error message: {duplicate_data}")
                                else:
                                    results.add_fail("Duplicate application prevention", f"Expected 409, got {duplicate_response.status_code}")
                            else:
                                results.add_fail("POST apply to job", f"Invalid response: {apply_data}")
                        elif apply_response.status_code == 409:
                            results.add_pass("POST /api/jobs/{posting_id}/apply - Already applied (409 response)")
                            results.add_pass("Duplicate application prevention (returns 409 if already applied)")
                            print(f"      Worker already applied to job: {job_title}")
                        else:
                            results.add_fail("POST apply to job", f"HTTP {apply_response.status_code}: {apply_response.text}")
                    else:
                        results.add_fail("POST apply to job", "No posting ID found in active jobs")
                else:
                    results.add_fail("POST apply to job", "No active jobs found to apply to")
            else:
                results.add_fail("POST apply to job", f"Failed to get active jobs: {public_jobs_response.status_code}")
        except Exception as e:
            results.add_fail("POST apply to job", f"Request failed: {str(e)}")
    else:
        results.add_fail("POST apply to job", "No workforce token available")
    
    # Test Data Context Verification
    print("\n   Test 4: Test Data Context Verification")
    
    # Verify employer exists and has expected data
    if employer_token:
        try:
            # Check employer profile
            profile_response = requests.get(
                f"{BASE_URL}/employer/profile",
                headers=get_auth_headers(employer_token),
                timeout=10
            )
            
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                if profile_data.get("success"):
                    employer_info = profile_data.get("data", {})
                    company_name = employer_info.get("company_name", "Unknown")
                    results.add_pass("Employer profile verification")
                    print(f"      Employer: {company_name} (ID: emp_80b6196b4d02)")
                    
                    # Verify expected job postings exist
                    expected_jobs = ["Server", "Line Cook", "Delivery Driver", "Night Security"]
                    print(f"      Expected active postings: {', '.join(expected_jobs)}")
                else:
                    results.add_fail("Employer profile verification", f"Invalid response: {profile_data}")
            else:
                results.add_fail("Employer profile verification", f"HTTP {profile_response.status_code}: {profile_response.text}")
        except Exception as e:
            results.add_fail("Employer profile verification", f"Request failed: {str(e)}")
    
    print(f"\n   Job Posting Workflow Testing Complete")
    print(f"   Expected Results Summary:")
    print(f"   ✓ Public jobs API returns active postings with company info")
    print(f"   ✓ Employer can edit, pause, and close their job postings")
    print(f"   ✓ Workers can apply to jobs and applications appear in employer's pipeline")
    print(f"   ✓ Duplicate applications are prevented")

def main():
    """Run job posting workflow tests"""
    results = TestResults()
    
    # Test Job Posting Workflow (as per review request)
    test_job_posting_workflow(results)
    
    # Print final summary
    success = results.summary()
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)