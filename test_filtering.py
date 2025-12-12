#!/usr/bin/env python3
"""
Test Job Matching Filtering Options
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

def test_filtering():
    """Test job matching filtering options"""
    
    # Login as employer
    employer_credentials = {
        "email": "employer@hrbank.ca",
        "password": "password123",
        "user_type": "employer"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=employer_credentials, timeout=15)
    employer_token = response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {employer_token}"}
    
    # Get workplace
    response = requests.get(f"{BASE_URL}/employer/workplaces", headers=headers, timeout=15)
    workplace_id = response.json()["data"]["workplaces"][0]["workplace_id"]
    
    # Create a job posting
    job_data = {
        "workplace_id": workplace_id,
        "position_title": "Server",
        "pay_per_hour": 20.00,
        "shift_duration": "8 hours",
        "employment_duration": "3 months",
        "key_tasks": "Customer service",
        "required_skills": ["Customer Service"],
        "required_certifications": ["Smart Serve"],
        "max_distance_km": 50.0,
        "positions_available": 1,
        "start_date": "2025-01-15"
    }
    
    response = requests.post(f"{BASE_URL}/job-matching/post", json=job_data, headers=headers, timeout=15)
    job_id = response.json()["data"]["job_id"]
    
    print(f"🎯 Testing Filtering Options for Job: {job_id}")
    
    # Test 1: No filters (default min_score=50)
    response = requests.get(f"{BASE_URL}/job-matching/{job_id}/candidates", headers=headers, timeout=15)
    data = response.json()
    default_count = data["data"]["total_matches"]
    print(f"✅ Default (min_score=50): {default_count} candidates")
    
    # Test 2: Lower minimum score
    response = requests.get(f"{BASE_URL}/job-matching/{job_id}/candidates?min_score=0", headers=headers, timeout=15)
    data = response.json()
    low_score_count = data["data"]["total_matches"]
    print(f"✅ Low score (min_score=0): {low_score_count} candidates")
    
    # Test 3: Higher minimum score
    response = requests.get(f"{BASE_URL}/job-matching/{job_id}/candidates?min_score=80", headers=headers, timeout=15)
    data = response.json()
    high_score_count = data["data"]["total_matches"]
    print(f"✅ High score (min_score=80): {high_score_count} candidates")
    
    # Show some candidate details if available
    if low_score_count > 0:
        candidates = data.get("data", {}).get("candidates", [])
        if candidates:
            print(f"\n📊 Sample candidate details:")
            candidate = candidates[0]
            print(f"   Name: {candidate.get('worker_name', 'Unknown')}")
            print(f"   Match Score: {candidate.get('match_score', 0)}%")
            print(f"   Distance: {candidate.get('distance_km', 0)}km")
            print(f"   Skills Match: {candidate.get('skill_match_score', 0)}%")
            print(f"   Cert Match: {candidate.get('certification_match_score', 0)}%")
            print(f"   Matched Skills: {candidate.get('matched_skills', [])}")
            print(f"   Missing Skills: {candidate.get('missing_skills', [])}")

if __name__ == "__main__":
    test_filtering()