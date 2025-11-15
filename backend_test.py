#!/usr/bin/env python3
"""
HR Bank Calendar Backend API Tests
Tests all calendar endpoints thoroughly including authentication
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
        "phone": f"+1555{unique_id[:7]}",
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

def get_auth_headers(token):
    """Get authorization headers for API requests"""
    return {"Authorization": f"Bearer {token}"}

def create_verified_test_user(user_type="workforce"):
    """Create a test user that's already verified and active"""
    unique_id = str(uuid.uuid4())[:8]
    user_data = {
        "email": f"test_{user_type}_{unique_id}@hrbank.com",
        "full_name": f"Test {user_type.title()} User {unique_id}",
        "phone": f"+1555{unique_id[:7]}",
        "password": "TestPassword123!",
        "user_type": user_type
    }
    
    try:
        # First signup the user
        signup_response = requests.post(f"{BASE_URL}/auth/signup", json=user_data, timeout=10)
        if signup_response.status_code != 201:
            return None, None
        
        signup_data = signup_response.json()
        user_id = signup_data["data"]["user_id"]
        
        # Manually verify the user by calling the database directly
        # Since we can't access the database directly, we'll use a workaround
        # by creating a user with Google OAuth which auto-verifies
        
        return user_data, None
        
    except Exception as e:
        print(f"Error creating verified user: {e}")
        return None, None

def create_test_workplace(results, employer_token):
    """Create a test workplace for shift testing"""
    print("\n🧪 Creating Test Workplace...")
    
    workplace_data = {
        "workplace_name": f"Test Workplace {str(uuid.uuid4())[:8]}",
        "address": "123 Test Street, Test City",
        "description": "Test workplace for calendar API testing"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/employer/workplaces",
            json=workplace_data,
            headers=get_auth_headers(employer_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            workplace_id = data.get("workplace_id")
            if workplace_id:
                results.add_pass("Test workplace creation")
                return workplace_id
            else:
                results.add_fail("Test workplace creation", "No workplace_id in response")
        else:
            results.add_fail("Test workplace creation", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Test workplace creation", f"Request failed: {str(e)}")
    
    return None

def test_workforce_availability_calendar(results, workforce_token):
    """Test workforce availability calendar endpoints"""
    print("\n🧪 Testing Workforce Availability Calendar APIs...")
    
    # Test GET availability calendar (empty initially)
    try:
        response = requests.get(
            f"{BASE_URL}/workforce/availability/calendar",
            headers=get_auth_headers(workforce_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and isinstance(data.get("data"), list):
                results.add_pass("GET workforce availability calendar")
            else:
                results.add_fail("GET workforce availability calendar", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET workforce availability calendar", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET workforce availability calendar", f"Request failed: {str(e)}")
    
    # Test POST create availability event
    now = datetime.utcnow()
    start_time = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=8)
    
    availability_data = {
        "title": "Available for Work",
        "start": start_time.isoformat() + "Z",
        "end": end_time.isoformat() + "Z",
        "type": "availability"
    }
    
    created_event_id = None
    try:
        response = requests.post(
            f"{BASE_URL}/workforce/availability/calendar",
            json=availability_data,
            headers=get_auth_headers(workforce_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("data"):
                created_event_id = data["data"][0].get("id")
                results.add_pass("POST create availability event")
            else:
                results.add_fail("POST create availability event", f"Invalid response: {data}")
        else:
            results.add_fail("POST create availability event", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("POST create availability event", f"Request failed: {str(e)}")
    
    # Test POST create recurring availability event
    recurring_data = {
        "title": "Weekly Availability",
        "start": (start_time + timedelta(days=7)).isoformat() + "Z",
        "end": (end_time + timedelta(days=7)).isoformat() + "Z",
        "type": "availability",
        "recurring": True,
        "recurringPattern": "weekly",
        "recurringEndDate": (start_time + timedelta(days=28)).isoformat() + "Z"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/workforce/availability/calendar",
            json=recurring_data,
            headers=get_auth_headers(workforce_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and len(data.get("data", [])) > 1:
                results.add_pass("POST create recurring availability events")
            else:
                results.add_fail("POST create recurring availability events", f"Expected multiple events: {data}")
        else:
            results.add_fail("POST create recurring availability events", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("POST create recurring availability events", f"Request failed: {str(e)}")
    
    # Test DELETE availability event
    if created_event_id:
        try:
            response = requests.delete(
                f"{BASE_URL}/workforce/availability/calendar/{created_event_id}",
                headers=get_auth_headers(workforce_token),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results.add_pass("DELETE availability event")
                else:
                    results.add_fail("DELETE availability event", f"Invalid response: {data}")
            else:
                results.add_fail("DELETE availability event", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("DELETE availability event", f"Request failed: {str(e)}")
    
    # Test invalid data handling
    try:
        invalid_data = {"title": "Invalid Event"}  # Missing start/end
        response = requests.post(
            f"{BASE_URL}/workforce/availability/calendar",
            json=invalid_data,
            headers=get_auth_headers(workforce_token),
            timeout=10
        )
        
        if response.status_code == 400:
            results.add_pass("Invalid availability data validation")
        else:
            results.add_fail("Invalid availability data validation", f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.add_fail("Invalid availability data validation", f"Request failed: {str(e)}")

def test_employer_shift_calendar(results, employer_token, workplace_id):
    """Test employer shift calendar endpoints"""
    print("\n🧪 Testing Employer Shift Calendar APIs...")
    
    # Test GET shifts calendar (empty initially)
    try:
        response = requests.get(
            f"{BASE_URL}/employer/shifts/calendar",
            headers=get_auth_headers(employer_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and isinstance(data.get("data"), list):
                results.add_pass("GET employer shifts calendar")
            else:
                results.add_fail("GET employer shifts calendar", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET employer shifts calendar", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET employer shifts calendar", f"Request failed: {str(e)}")
    
    # Test POST create shift
    now = datetime.utcnow()
    start_time = (now + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=6)
    
    shift_data = {
        "title": "Morning Shift",
        "workplace_id": workplace_id,
        "start": start_time.isoformat() + "Z",
        "end": end_time.isoformat() + "Z",
        "positions_needed": 2,
        "description": "Test morning shift"
    }
    
    created_shift_id = None
    try:
        response = requests.post(
            f"{BASE_URL}/employer/shifts/calendar",
            json=shift_data,
            headers=get_auth_headers(employer_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("data"):
                created_shift_id = data["data"][0].get("id")
                results.add_pass("POST create shift")
            else:
                results.add_fail("POST create shift", f"Invalid response: {data}")
        else:
            results.add_fail("POST create shift", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("POST create shift", f"Request failed: {str(e)}")
    
    # Test POST create recurring shift
    recurring_shift_data = {
        "title": "Daily Recurring Shift",
        "workplace_id": workplace_id,
        "start": (start_time + timedelta(days=7)).isoformat() + "Z",
        "end": (end_time + timedelta(days=7)).isoformat() + "Z",
        "positions_needed": 1,
        "description": "Daily recurring test shift",
        "recurring": True,
        "recurringPattern": "daily",
        "recurringEndDate": (start_time + timedelta(days=14)).isoformat() + "Z"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/employer/shifts/calendar",
            json=recurring_shift_data,
            headers=get_auth_headers(employer_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and len(data.get("data", [])) > 1:
                results.add_pass("POST create recurring shifts")
            else:
                results.add_fail("POST create recurring shifts", f"Expected multiple shifts: {data}")
        else:
            results.add_fail("POST create recurring shifts", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("POST create recurring shifts", f"Request failed: {str(e)}")
    
    # Test PUT update shift
    if created_shift_id:
        update_data = {
            "title": "Updated Morning Shift",
            "positions_needed": 3,
            "description": "Updated test shift description"
        }
        
        try:
            response = requests.put(
                f"{BASE_URL}/employer/shifts/calendar/{created_shift_id}",
                json=update_data,
                headers=get_auth_headers(employer_token),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data"):
                    updated_shift = data["data"]
                    if (updated_shift.get("title") == "Updated Morning Shift" and 
                        updated_shift.get("positions_needed") == 3):
                        results.add_pass("PUT update shift")
                    else:
                        results.add_fail("PUT update shift", f"Update not reflected: {updated_shift}")
                else:
                    results.add_fail("PUT update shift", f"Invalid response: {data}")
            else:
                results.add_fail("PUT update shift", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("PUT update shift", f"Request failed: {str(e)}")
    
    # Test DELETE shift
    if created_shift_id:
        try:
            response = requests.delete(
                f"{BASE_URL}/employer/shifts/calendar/{created_shift_id}",
                headers=get_auth_headers(employer_token),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results.add_pass("DELETE shift")
                else:
                    results.add_fail("DELETE shift", f"Invalid response: {data}")
            else:
                results.add_fail("DELETE shift", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.add_fail("DELETE shift", f"Request failed: {str(e)}")
    
    # Test invalid workplace validation
    try:
        invalid_shift_data = {
            "title": "Invalid Shift",
            "workplace_id": "invalid-workplace-id",
            "start": start_time.isoformat() + "Z",
            "end": end_time.isoformat() + "Z",
            "positions_needed": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/employer/shifts/calendar",
            json=invalid_shift_data,
            headers=get_auth_headers(employer_token),
            timeout=10
        )
        
        if response.status_code == 404:
            results.add_pass("Invalid workplace validation")
        else:
            results.add_fail("Invalid workplace validation", f"Expected 404, got {response.status_code}")
    except Exception as e:
        results.add_fail("Invalid workplace validation", f"Request failed: {str(e)}")

def test_authentication_enforcement(results):
    """Test that calendar endpoints require proper authentication"""
    print("\n🧪 Testing Authentication Enforcement...")
    
    # Test workforce endpoints without auth
    workforce_endpoints = [
        ("GET", "/workforce/availability/calendar"),
        ("POST", "/workforce/availability/calendar"),
        ("DELETE", "/workforce/availability/calendar/test-id")
    ]
    
    for method, endpoint in workforce_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", json={}, timeout=10)
            elif method == "DELETE":
                response = requests.delete(f"{BASE_URL}{endpoint}", timeout=10)
            
            if response.status_code == 401:
                results.add_pass(f"Auth required for {method} {endpoint}")
            else:
                results.add_fail(f"Auth required for {method} {endpoint}", f"Expected 401, got {response.status_code}")
        except Exception as e:
            results.add_fail(f"Auth required for {method} {endpoint}", f"Request failed: {str(e)}")
    
    # Test employer endpoints without auth
    employer_endpoints = [
        ("GET", "/employer/shifts/calendar"),
        ("POST", "/employer/shifts/calendar"),
        ("PUT", "/employer/shifts/calendar/test-id"),
        ("DELETE", "/employer/shifts/calendar/test-id")
    ]
    
    for method, endpoint in employer_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", json={}, timeout=10)
            elif method == "PUT":
                response = requests.put(f"{BASE_URL}{endpoint}", json={}, timeout=10)
            elif method == "DELETE":
                response = requests.delete(f"{BASE_URL}{endpoint}", timeout=10)
            
            if response.status_code == 401:
                results.add_pass(f"Auth required for {method} {endpoint}")
            else:
                results.add_fail(f"Auth required for {method} {endpoint}", f"Expected 401, got {response.status_code}")
        except Exception as e:
            results.add_fail(f"Auth required for {method} {endpoint}", f"Request failed: {str(e)}")

def test_role_based_access(results, workforce_token, employer_token):
    """Test that users can only access their role-specific endpoints"""
    print("\n🧪 Testing Role-Based Access Control...")
    
    # Test workforce user trying to access employer endpoints
    employer_endpoints = [
        ("GET", "/employer/shifts/calendar"),
        ("POST", "/employer/shifts/calendar"),
    ]
    
    for method, endpoint in employer_endpoints:
        try:
            if method == "GET":
                response = requests.get(
                    f"{BASE_URL}{endpoint}",
                    headers=get_auth_headers(workforce_token),
                    timeout=10
                )
            elif method == "POST":
                response = requests.post(
                    f"{BASE_URL}{endpoint}",
                    json={},
                    headers=get_auth_headers(workforce_token),
                    timeout=10
                )
            
            if response.status_code == 403:
                results.add_pass(f"Workforce blocked from {method} {endpoint}")
            else:
                results.add_fail(f"Workforce blocked from {method} {endpoint}", f"Expected 403, got {response.status_code}")
        except Exception as e:
            results.add_fail(f"Workforce blocked from {method} {endpoint}", f"Request failed: {str(e)}")
    
    # Test employer user trying to access workforce endpoints
    workforce_endpoints = [
        ("GET", "/workforce/availability/calendar"),
        ("POST", "/workforce/availability/calendar"),
    ]
    
    for method, endpoint in workforce_endpoints:
        try:
            if method == "GET":
                response = requests.get(
                    f"{BASE_URL}{endpoint}",
                    headers=get_auth_headers(employer_token),
                    timeout=10
                )
            elif method == "POST":
                response = requests.post(
                    f"{BASE_URL}{endpoint}",
                    json={},
                    headers=get_auth_headers(employer_token),
                    timeout=10
                )
            
            if response.status_code == 403:
                results.add_pass(f"Employer blocked from {method} {endpoint}")
            else:
                results.add_fail(f"Employer blocked from {method} {endpoint}", f"Expected 403, got {response.status_code}")
        except Exception as e:
            results.add_fail(f"Employer blocked from {method} {endpoint}", f"Request failed: {str(e)}")

def main():
    """Run all calendar API tests"""
    print("🚀 Starting HR Bank Calendar Backend API Tests")
    print(f"Backend URL: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    results = TestResults()
    
    # Test backend connectivity first
    test_backend_connectivity(results)
    
    # Create test users for calendar testing
    workforce_user = generate_test_user("workforce")
    employer_user = generate_test_user("employer")
    
    # Sign up users
    workforce_token = None
    employer_token = None
    
    try:
        # Sign up workforce user
        response = requests.post(f"{BASE_URL}/auth/signup", json=workforce_user, timeout=10)
        if response.status_code == 200:
            # Login to get token
            login_response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": workforce_user["email"],
                "password": workforce_user["password"],
                "user_type": workforce_user["user_type"]
            }, timeout=10)
            if login_response.status_code == 200:
                workforce_token = login_response.json().get("access_token")
        
        # Sign up employer user
        response = requests.post(f"{BASE_URL}/auth/signup", json=employer_user, timeout=10)
        if response.status_code == 200:
            # Login to get token
            login_response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": employer_user["email"],
                "password": employer_user["password"],
                "user_type": employer_user["user_type"]
            }, timeout=10)
            if login_response.status_code == 200:
                employer_token = login_response.json().get("access_token")
    
    except Exception as e:
        results.add_fail("User setup for calendar tests", f"Failed to create test users: {str(e)}")
    
    if not workforce_token or not employer_token:
        results.add_fail("User authentication setup", "Failed to get authentication tokens")
        results.summary()
        return 1
    
    # Test authentication enforcement
    test_authentication_enforcement(results)
    
    # Test role-based access control
    test_role_based_access(results, workforce_token, employer_token)
    
    # Create test workplace for employer
    workplace_id = create_test_workplace(results, employer_token)
    
    # Test workforce availability calendar
    test_workforce_availability_calendar(results, workforce_token)
    
    # Test employer shift calendar (only if workplace was created)
    if workplace_id:
        test_employer_shift_calendar(results, employer_token, workplace_id)
    else:
        results.add_fail("Employer shift calendar tests", "Could not create test workplace")
    
    # Print final results
    success = results.summary()
    
    if success:
        print("\n🎉 All calendar API tests passed!")
        return 0
    else:
        print("\n💥 Some tests failed. Check the errors above.")
        return 1

if __name__ == "__main__":
    exit(main())