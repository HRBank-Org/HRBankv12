#!/usr/bin/env python3
"""
HR Bank Authentication Backend API Tests
Tests all authentication endpoints thoroughly
"""

import requests
import json
import uuid
import time
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
BASE_URL = f"{BACKEND_URL}/api"

print(f"Testing backend at: {BASE_URL}")

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

def generate_test_user(user_type="workforce"):
    """Generate unique test user data"""
    unique_id = str(uuid.uuid4())[:8]
    return {
        "email": f"test_{user_type}_{unique_id}@hrbank.com",
        "full_name": f"Test {user_type.title()} User {unique_id}",
        "password": "TestPassword123!",
        "user_type": user_type
    }

def test_signup_api(results):
    """Test signup API for all user types"""
    print("\n🧪 Testing Signup API...")
    
    # Test successful signup for each user type
    user_types = ["workforce", "employer", "institution"]
    created_users = []
    
    for user_type in user_types:
        try:
            user_data = generate_test_user(user_type)
            created_users.append(user_data)
            
            response = requests.post(f"{BASE_URL}/auth/signup", json=user_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "user" in data and data["user"]["user_type"] == user_type:
                    # Verify password is not returned
                    if "password_hash" not in data["user"] and "password" not in data["user"]:
                        results.add_pass(f"Signup successful for {user_type}")
                    else:
                        results.add_fail(f"Signup for {user_type}", "Password returned in response")
                else:
                    results.add_fail(f"Signup for {user_type}", f"Invalid response structure: {data}")
            else:
                results.add_fail(f"Signup for {user_type}", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            results.add_fail(f"Signup for {user_type}", f"Request failed: {str(e)}")
    
    # Test duplicate email validation
    if created_users:
        try:
            duplicate_user = created_users[0].copy()
            response = requests.post(f"{BASE_URL}/auth/signup", json=duplicate_user, timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if "already registered" in data.get("detail", "").lower():
                    results.add_pass("Duplicate email validation")
                else:
                    results.add_fail("Duplicate email validation", f"Wrong error message: {data}")
            else:
                results.add_fail("Duplicate email validation", f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            results.add_fail("Duplicate email validation", f"Request failed: {str(e)}")
    
    # Test missing fields validation
    try:
        incomplete_user = {"email": "incomplete@test.com"}
        response = requests.post(f"{BASE_URL}/auth/signup", json=incomplete_user, timeout=10)
        
        if response.status_code == 422:  # FastAPI validation error
            results.add_pass("Missing fields validation")
        else:
            results.add_fail("Missing fields validation", f"Expected 422, got {response.status_code}")
            
    except Exception as e:
        results.add_fail("Missing fields validation", f"Request failed: {str(e)}")
    
    return created_users

def test_login_api(results, created_users):
    """Test login API for all user types"""
    print("\n🧪 Testing Login API...")
    
    # Test successful login for each user type
    for user_data in created_users:
        try:
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"],
                "user_type": user_data["user_type"]
            }
            
            response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "user" in data and data["user"]["user_type"] == user_data["user_type"]:
                    # Verify password is not returned
                    if "password_hash" not in data["user"] and "password" not in data["user"]:
                        results.add_pass(f"Login successful for {user_data['user_type']}")
                    else:
                        results.add_fail(f"Login for {user_data['user_type']}", "Password returned in response")
                else:
                    results.add_fail(f"Login for {user_data['user_type']}", f"Invalid response: {data}")
            else:
                results.add_fail(f"Login for {user_data['user_type']}", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            results.add_fail(f"Login for {user_data['user_type']}", f"Request failed: {str(e)}")
    
    # Test login with wrong password
    if created_users:
        try:
            user_data = created_users[0]
            wrong_login = {
                "email": user_data["email"],
                "password": "WrongPassword123!",
                "user_type": user_data["user_type"]
            }
            
            response = requests.post(f"{BASE_URL}/auth/login", json=wrong_login, timeout=10)
            
            if response.status_code == 401:
                results.add_pass("Wrong password validation")
            else:
                results.add_fail("Wrong password validation", f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            results.add_fail("Wrong password validation", f"Request failed: {str(e)}")
    
    # Test login with non-existent email
    try:
        nonexistent_login = {
            "email": "nonexistent@test.com",
            "password": "TestPassword123!",
            "user_type": "workforce"
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=nonexistent_login, timeout=10)
        
        if response.status_code == 401:
            results.add_pass("Non-existent email validation")
        else:
            results.add_fail("Non-existent email validation", f"Expected 401, got {response.status_code}")
            
    except Exception as e:
        results.add_fail("Non-existent email validation", f"Request failed: {str(e)}")
    
    # Test login with wrong user_type
    if created_users:
        try:
            user_data = created_users[0]  # workforce user
            wrong_type_login = {
                "email": user_data["email"],
                "password": user_data["password"],
                "user_type": "employer"  # wrong type
            }
            
            response = requests.post(f"{BASE_URL}/auth/login", json=wrong_type_login, timeout=10)
            
            if response.status_code == 401:
                results.add_pass("Wrong user_type validation")
            else:
                results.add_fail("Wrong user_type validation", f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            results.add_fail("Wrong user_type validation", f"Request failed: {str(e)}")

def test_database_integration(results):
    """Test database integration by checking if data persists"""
    print("\n🧪 Testing Database Integration...")
    
    try:
        # Create a user
        user_data = generate_test_user("workforce")
        signup_response = requests.post(f"{BASE_URL}/auth/signup", json=user_data, timeout=10)
        
        if signup_response.status_code == 200:
            # Try to login immediately (tests persistence)
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"],
                "user_type": user_data["user_type"]
            }
            
            login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
            
            if login_response.status_code == 200:
                login_data_response = login_response.json()
                user_info = login_data_response["user"]
                
                # Verify all fields are correctly stored
                if (user_info["email"] == user_data["email"] and 
                    user_info["full_name"] == user_data["full_name"] and
                    user_info["user_type"] == user_data["user_type"]):
                    results.add_pass("Database persistence verification")
                else:
                    results.add_fail("Database persistence verification", "User data mismatch after storage")
            else:
                results.add_fail("Database persistence verification", "Login failed after signup")
        else:
            results.add_fail("Database persistence verification", "Signup failed")
            
    except Exception as e:
        results.add_fail("Database persistence verification", f"Request failed: {str(e)}")

def test_password_hashing(results):
    """Test that passwords are properly hashed"""
    print("\n🧪 Testing Password Hashing...")
    
    try:
        # Create two users with same password
        user1_data = generate_test_user("workforce")
        user2_data = generate_test_user("employer")
        user2_data["password"] = user1_data["password"]  # Same password
        
        # Sign up both users
        response1 = requests.post(f"{BASE_URL}/auth/signup", json=user1_data, timeout=10)
        response2 = requests.post(f"{BASE_URL}/auth/signup", json=user2_data, timeout=10)
        
        if response1.status_code == 200 and response2.status_code == 200:
            # Both users should be able to login with the same password
            login1 = requests.post(f"{BASE_URL}/auth/login", json={
                "email": user1_data["email"],
                "password": user1_data["password"],
                "user_type": user1_data["user_type"]
            }, timeout=10)
            
            login2 = requests.post(f"{BASE_URL}/auth/login", json={
                "email": user2_data["email"],
                "password": user2_data["password"],
                "user_type": user2_data["user_type"]
            }, timeout=10)
            
            if login1.status_code == 200 and login2.status_code == 200:
                results.add_pass("Password hashing functionality")
            else:
                results.add_fail("Password hashing functionality", "Login failed with correct passwords")
        else:
            results.add_fail("Password hashing functionality", "User creation failed")
            
    except Exception as e:
        results.add_fail("Password hashing functionality", f"Request failed: {str(e)}")

def test_backend_connectivity(results):
    """Test basic backend connectivity"""
    print("\n🧪 Testing Backend Connectivity...")
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                results.add_pass("Backend connectivity")
            else:
                results.add_fail("Backend connectivity", f"Unexpected response: {data}")
        else:
            results.add_fail("Backend connectivity", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Backend connectivity", f"Connection failed: {str(e)}")

def main():
    """Run all authentication tests"""
    print("🚀 Starting HR Bank Authentication Backend Tests")
    print(f"Backend URL: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    results = TestResults()
    
    # Test backend connectivity first
    test_backend_connectivity(results)
    
    # Test signup API
    created_users = test_signup_api(results)
    
    # Test login API (only if we have created users)
    if created_users:
        test_login_api(results, created_users)
    
    # Test database integration
    test_database_integration(results)
    
    # Test password hashing
    test_password_hashing(results)
    
    # Print final results
    success = results.summary()
    
    if success:
        print("\n🎉 All authentication tests passed!")
        return 0
    else:
        print("\n💥 Some tests failed. Check the errors above.")
        return 1

if __name__ == "__main__":
    exit(main())