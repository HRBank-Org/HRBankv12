#!/usr/bin/env python3
"""
Debug Employer Authentication and Role
"""

import requests
import json
import jwt
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
BASE_URL = f"{BACKEND_URL}/api"

print(f"🔍 DEBUGGING EMPLOYER AUTHENTICATION AND ROLE")
print(f"Testing backend at: {BASE_URL}")
print("="*60)

def debug_employer():
    """Debug employer authentication and role"""
    
    # Step 1: Login as employer
    print("\n🔐 Step 1: Login as employer...")
    employer_credentials = {
        "email": "employer@hrbank.ca",
        "password": "password123",
        "user_type": "employer"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=employer_credentials, timeout=15)
        
        print(f"Login response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Login response: {json.dumps(data, indent=2)}")
            
            if data.get("success") and "access_token" in data.get("data", {}):
                employer_token = data["data"]["access_token"]
                user_id = data["data"].get("user_id")
                user_type = data["data"].get("user_type")
                
                print(f"✅ Login successful")
                print(f"   User ID: {user_id}")
                print(f"   User Type: {user_type}")
                
                # Decode the JWT token to see what's inside
                try:
                    decoded_token = jwt.decode(employer_token, options={"verify_signature": False})
                    print(f"\n🔍 JWT Token Contents:")
                    print(json.dumps(decoded_token, indent=2))
                except Exception as e:
                    print(f"❌ Failed to decode JWT: {str(e)}")
                
                # Test accessing a protected endpoint to verify role
                print(f"\n🔒 Step 2: Test protected endpoint access...")
                
                headers = {"Authorization": f"Bearer {employer_token}"}
                
                # Test employer-specific endpoint
                try:
                    response = requests.get(
                        f"{BASE_URL}/employer/workplaces",
                        headers=headers,
                        timeout=10
                    )
                    print(f"GET /employer/workplaces: HTTP {response.status_code}")
                    if response.status_code == 200:
                        print(f"   ✅ Employer endpoints accessible")
                    else:
                        print(f"   ❌ Response: {response.text}")
                except Exception as e:
                    print(f"   ❌ Request failed: {str(e)}")
                
                # Test job-matching endpoint with detailed error
                try:
                    test_job_data = {
                        "workplace_id": "test_workplace_id",
                        "position_title": "Test Position",
                        "pay_per_hour": 20.00,
                        "shift_duration": "8 hours",
                        "employment_duration": "3 months",
                        "key_tasks": "Test tasks",
                        "required_skills": ["Test Skill"],
                        "required_certifications": ["Test Cert"],
                        "max_distance_km": 20.0,
                        "positions_available": 1,
                        "start_date": "2025-01-15"
                    }
                    
                    response = requests.post(
                        f"{BASE_URL}/job-matching/post",
                        json=test_job_data,
                        headers=headers,
                        timeout=10
                    )
                    print(f"POST /job-matching/post: HTTP {response.status_code}")
                    print(f"   Response: {response.text}")
                    
                    if response.status_code == 403:
                        print(f"   🔒 Access denied - checking role requirements...")
                        
                        # Let's check what the require_role function expects
                        # by testing with different endpoints
                        
                except Exception as e:
                    print(f"   ❌ Request failed: {str(e)}")
                
                # Test getting user profile to see full user data
                try:
                    response = requests.get(
                        f"{BASE_URL}/users/me",
                        headers=headers,
                        timeout=10
                    )
                    print(f"\nGET /users/me: HTTP {response.status_code}")
                    if response.status_code == 200:
                        data = response.json()
                        print(f"User profile: {json.dumps(data, indent=2)}")
                    else:
                        print(f"   Response: {response.text}")
                except Exception as e:
                    print(f"   ❌ Request failed: {str(e)}")
                    
            else:
                print(f"❌ Login failed - Invalid response: {data}")
        else:
            print(f"❌ Login failed - HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Login failed - Request error: {str(e)}")

if __name__ == "__main__":
    debug_employer()