#!/usr/bin/env python3
"""
Focused Job Matching Engine Test
Test the External Job Matching Engine complete flow as requested
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
BASE_URL = f"{BACKEND_URL}/api"

print(f"🚀 EXTERNAL JOB MATCHING ENGINE COMPLETE FLOW TEST")
print(f"Testing backend at: {BASE_URL}")
print(f"Focus: Chef position matching with test workforce profiles")
print("="*80)

def get_auth_headers(token):
    """Get authorization headers for API requests"""
    return {"Authorization": f"Bearer {token}"}

def test_job_matching_endpoints():
    """Test the job matching endpoints to understand the routing"""
    
    # Step 1: Login as employer
    print("\n🔐 Step 1: Login as employer...")
    employer_credentials = {
        "email": "employer@hrbank.ca",
        "password": "password123",
        "user_type": "employer"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=employer_credentials, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                employer_token = data["data"]["access_token"]
                user_id = data["data"].get("user_id")
                print(f"✅ Employer login successful - User ID: {user_id}")
            else:
                print(f"❌ Login failed - Invalid response: {data}")
                return
        else:
            print(f"❌ Login failed - HTTP {response.status_code}: {response.text}")
            return
    except Exception as e:
        print(f"❌ Login failed - Request error: {str(e)}")
        return
    
    # Step 2: Test different job matching endpoint paths
    print("\n🔍 Step 2: Testing job matching endpoint paths...")
    
    endpoints_to_test = [
        # Job matching endpoints (correct prefix)
        ("GET", "/job-matching/posted", "Job matching - posted jobs"),
        ("GET", "/job-matching/matched", "Job matching - matched jobs (workforce only)"),
        ("GET", "/job-matching/offers", "Job matching - job offers (workforce only)"),
        ("GET", "/job-matching/interviews", "Job matching - interviews (workforce only)"),
        
        # Jobs endpoints (different router)
        ("GET", "/jobs/offers", "Jobs - offers (workforce only)"),
        ("GET", "/jobs/matched", "Jobs - matched (if exists)"),
        ("GET", "/jobs/posted", "Jobs - posted (if exists)"),
    ]
    
    for method, endpoint, description in endpoints_to_test:
        try:
            if method == "GET":
                response = requests.get(
                    f"{BASE_URL}{endpoint}",
                    headers=get_auth_headers(employer_token),
                    timeout=10
                )
            
            print(f"   {description}: HTTP {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"      ✅ Success: {data.get('success', 'N/A')}")
            elif response.status_code == 403:
                print(f"      🔒 Access denied (expected for role-specific endpoints)")
            elif response.status_code == 404:
                print(f"      ❌ Not found")
            else:
                print(f"      ⚠️  Response: {response.text[:100]}")
                
        except Exception as e:
            print(f"   {description}: ❌ Request failed - {str(e)}")
    
    # Step 3: Get employer workplaces
    print("\n🏢 Step 3: Get employer workplaces...")
    
    try:
        response = requests.get(
            f"{BASE_URL}/employer/workplaces",
            headers=get_auth_headers(employer_token),
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            workplaces = data.get("data", {}).get("workplaces", [])
            if workplaces:
                workplace_id = workplaces[0]["workplace_id"]
                workplace_name = workplaces[0].get("workplace_name", "Unknown")
                print(f"✅ Found workplace: {workplace_name} (ID: {workplace_id})")
            else:
                print("❌ No workplaces found for employer")
                return
        else:
            print(f"❌ Failed to get workplaces - HTTP {response.status_code}: {response.text}")
            return
    except Exception as e:
        print(f"❌ Failed to get workplaces - Request error: {str(e)}")
        return
    
    # Step 4: Test job posting with correct endpoint
    print("\n📝 Step 4: Test Chef job posting...")
    
    chef_job_data = {
        "workplace_id": workplace_id,
        "position_title": "Chef",
        "pay_per_hour": 25.00,
        "shift_duration": "8 hours",
        "employment_duration": "6 months",
        "key_tasks": "Food preparation, menu planning, kitchen management",
        "required_skills": ["Food Preparation", "Menu Planning", "Kitchen Management"],
        "required_certifications": ["Safe Food Handling Certificate"],
        "max_distance_km": 20.0,
        "positions_available": 3,
        "start_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    }
    
    # Try the correct job-matching endpoint
    try:
        response = requests.post(
            f"{BASE_URL}/job-matching/post",
            json=chef_job_data,
            headers=get_auth_headers(employer_token),
            timeout=15
        )
        
        print(f"   POST /job-matching/post: HTTP {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "job_id" in data.get("data", {}):
                job_id = data["data"]["job_id"]
                print(f"   ✅ Chef job posted successfully - Job ID: {job_id}")
                
                # Step 5: Test getting candidates
                print(f"\n👥 Step 5: Test getting candidates for job {job_id}...")
                
                try:
                    response = requests.get(
                        f"{BASE_URL}/job-matching/{job_id}/candidates",
                        headers=get_auth_headers(employer_token),
                        timeout=15
                    )
                    
                    print(f"   GET /job-matching/{job_id}/candidates: HTTP {response.status_code}")
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and "candidates" in data.get("data", {}):
                            candidates = data["data"]["candidates"]
                            total_matches = data["data"].get("total_matches", 0)
                            print(f"   ✅ Found {total_matches} matched candidates")
                            
                            if candidates:
                                first_candidate = candidates[0]
                                print(f"   📊 First candidate match score: {first_candidate.get('match_score', 0)}%")
                                print(f"   📍 Distance: {first_candidate.get('distance_km', 0)}km")
                                print(f"   👤 Name: {first_candidate.get('worker_name', 'Unknown')}")
                            else:
                                print("   ℹ️  No candidates matched (may need to seed workforce profiles)")
                        else:
                            print(f"   ❌ Invalid response structure: {data}")
                    else:
                        print(f"   ❌ Failed: {response.text}")
                except Exception as e:
                    print(f"   ❌ Request failed: {str(e)}")
                
                # Step 6: Test getting posted jobs
                print(f"\n📋 Step 6: Test getting posted jobs...")
                
                try:
                    response = requests.get(
                        f"{BASE_URL}/job-matching/posted",
                        headers=get_auth_headers(employer_token),
                        timeout=15
                    )
                    
                    print(f"   GET /job-matching/posted: HTTP {response.status_code}")
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and "jobs" in data.get("data", {}):
                            jobs = data["data"]["jobs"]
                            chef_job = next((job for job in jobs if job.get("job_id") == job_id), None)
                            
                            if chef_job:
                                print(f"   ✅ Chef job found in posted jobs list")
                                print(f"   📝 Position: {chef_job.get('position_title')}")
                                print(f"   💰 Pay: ${chef_job.get('pay_per_hour')}/hr")
                                print(f"   👥 Positions: {chef_job.get('positions_available')}")
                            else:
                                print(f"   ❌ Chef job not found in posted jobs list")
                        else:
                            print(f"   ❌ Invalid response structure: {data}")
                    else:
                        print(f"   ❌ Failed: {response.text}")
                except Exception as e:
                    print(f"   ❌ Request failed: {str(e)}")
                    
            else:
                print(f"   ❌ Invalid response: {data}")
        else:
            print(f"   ❌ Failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Request failed: {str(e)}")
    
    # Step 7: Check if workforce profiles exist
    print(f"\n👷 Step 7: Check workforce profiles (indirect verification)...")
    
    # We can't directly query workforce profiles, but we can check if the seed script exists
    try:
        import os
        seed_script_path = "/app/backend/scripts/seed_workforce_profiles.py"
        if os.path.exists(seed_script_path):
            print(f"   ✅ Seed script exists: {seed_script_path}")
            print(f"   ℹ️  Run 'python /app/backend/scripts/seed_workforce_profiles.py' to create 20 test profiles")
        else:
            print(f"   ❌ Seed script not found")
    except Exception as e:
        print(f"   ❌ Error checking seed script: {str(e)}")

if __name__ == "__main__":
    test_job_matching_endpoints()