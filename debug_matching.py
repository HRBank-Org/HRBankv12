#!/usr/bin/env python3
"""
Debug Job Matching Algorithm
Check why no candidates are being matched
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
BASE_URL = f"{BACKEND_URL}/api"

print(f"🔍 DEBUGGING JOB MATCHING ALGORITHM")
print(f"Testing backend at: {BASE_URL}")
print("="*60)

def debug_matching():
    """Debug why no candidates are being matched"""
    
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
            employer_token = data["data"]["access_token"]
            print(f"✅ Login successful")
        else:
            print(f"❌ Login failed")
            return
    except Exception as e:
        print(f"❌ Login failed: {str(e)}")
        return
    
    headers = {"Authorization": f"Bearer {employer_token}"}
    
    # Step 2: Get workplace details
    print("\n🏢 Step 2: Get workplace details...")
    
    try:
        response = requests.get(f"{BASE_URL}/employer/workplaces", headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            workplaces = data.get("data", {}).get("workplaces", [])
            if workplaces:
                workplace = workplaces[0]
                workplace_id = workplace["workplace_id"]
                print(f"✅ Workplace: {workplace.get('workplace_name')}")
                print(f"   Address: {workplace.get('address')}")
                print(f"   City: {workplace.get('city')}")
                print(f"   Coordinates: {workplace.get('coordinates')}")
            else:
                print("❌ No workplaces found")
                return
        else:
            print(f"❌ Failed to get workplaces")
            return
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return
    
    # Step 3: Create a simple job posting to test matching
    print("\n📝 Step 3: Create test job posting...")
    
    # Create a job with broader requirements to increase matches
    test_job_data = {
        "workplace_id": workplace_id,
        "position_title": "Server",  # More common position
        "pay_per_hour": 20.00,
        "shift_duration": "8 hours",
        "employment_duration": "3 months",
        "key_tasks": "Customer service, food handling",
        "required_skills": ["Customer Service"],  # Common skill
        "required_certifications": [],  # No required certs to increase matches
        "max_distance_km": 50.0,  # Larger radius
        "positions_available": 1,
        "start_date": "2025-01-15"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/job-matching/post",
            json=test_job_data,
            headers=headers,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            job_id = data["data"]["job_id"]
            print(f"✅ Test job posted - Job ID: {job_id}")
        else:
            print(f"❌ Failed to post job: {response.text}")
            return
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return
    
    # Step 4: Check for matches with lower threshold
    print(f"\n👥 Step 4: Check for matches (min_score=0)...")
    
    try:
        response = requests.get(
            f"{BASE_URL}/job-matching/{job_id}/candidates?min_score=0",
            headers=headers,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            candidates = data.get("data", {}).get("candidates", [])
            total_matches = data.get("data", {}).get("total_matches", 0)
            
            print(f"✅ Found {total_matches} candidates with min_score=0")
            
            if candidates:
                print(f"\n📊 Top 3 candidates:")
                for i, candidate in enumerate(candidates[:3]):
                    print(f"   {i+1}. {candidate.get('worker_name', 'Unknown')}")
                    print(f"      Match Score: {candidate.get('match_score', 0)}%")
                    print(f"      Distance: {candidate.get('distance_km', 0)}km")
                    print(f"      Skills: {candidate.get('matched_skills', [])}")
                    print(f"      Certifications: {candidate.get('matched_certifications', [])}")
                    print()
            else:
                print("❌ No candidates found even with min_score=0")
                print("   This suggests an issue with the matching algorithm or workforce data")
        else:
            print(f"❌ Failed to get candidates: {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    # Step 5: Try with even broader criteria
    print(f"\n🎯 Step 5: Create job with NO requirements...")
    
    minimal_job_data = {
        "workplace_id": workplace_id,
        "position_title": "General Worker",
        "pay_per_hour": 18.00,
        "shift_duration": "4 hours",
        "employment_duration": "1 month",
        "key_tasks": "General tasks",
        "required_skills": [],  # No skills required
        "required_certifications": [],  # No certs required
        "max_distance_km": 100.0,  # Very large radius
        "positions_available": 5,
        "start_date": "2025-01-15"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/job-matching/post",
            json=minimal_job_data,
            headers=headers,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            job_id2 = data["data"]["job_id"]
            print(f"✅ Minimal job posted - Job ID: {job_id2}")
            
            # Check matches for this job
            response = requests.get(
                f"{BASE_URL}/job-matching/{job_id2}/candidates?min_score=0",
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                candidates = data.get("data", {}).get("candidates", [])
                total_matches = data.get("data", {}).get("total_matches", 0)
                
                print(f"✅ Minimal job found {total_matches} candidates")
                
                if candidates:
                    print(f"   🎉 SUCCESS! Matching algorithm is working")
                    print(f"   First candidate: {candidates[0].get('worker_name')} ({candidates[0].get('match_score')}%)")
                else:
                    print(f"❌ Still no matches - there may be a fundamental issue")
            else:
                print(f"❌ Failed to get candidates for minimal job")
        else:
            print(f"❌ Failed to post minimal job: {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    debug_matching()