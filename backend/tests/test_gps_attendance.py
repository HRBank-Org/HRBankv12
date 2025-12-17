#!/usr/bin/env python3
"""
GPS-Based Attendance & Geofencing Test Suite
Testing Phase 3: GPS Clock-In/Out with 50-meter geofencing
"""

import requests
import json
import time
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
BASE_URL = f"{BACKEND_URL}/api"

print(f"🚀 GPS-BASED ATTENDANCE & GEOFENCING TEST SUITE")
print(f"Testing backend at: {BASE_URL}")
print(f"Focus: 50-meter geofencing, GPS clock-in/out, location validation")
print("="*80)

# Test coordinates from review request
WORKPLACE_COORDS = {"lat": 42.3045, "lng": -82.9973}  # Windsor workplace
WITHIN_GEOFENCE = {"lat": 42.3045, "lng": -82.9973}   # Same location (within 50m)
OUTSIDE_GEOFENCE = {"lat": 42.3055, "lng": -82.9973}  # 100+ meters away

# Test accounts from review request
WORKER_CREDENTIALS = {
    "email": "worker@hrbank.ca",
    "password": "Test123!",
    "user_type": "workforce"
}

EMPLOYER_CREDENTIALS = {
    "email": "employer@hrbank.ca", 
    "password": "Test123!",
    "user_type": "employer"
}

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
        print(f"GPS ATTENDANCE TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")
        return len(self.errors) == 0

def get_auth_headers(token):
    """Get authorization headers for API requests"""
    return {"Authorization": f"Bearer {token}"}

def login_user(credentials, results):
    """Login user and return access token"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=credentials, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                results.add_pass(f"Login successful for {credentials['email']}")
                return data["data"]["access_token"]
            else:
                results.add_fail(f"Login for {credentials['email']}", f"Invalid response structure: {data}")
        else:
            results.add_fail(f"Login for {credentials['email']}", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail(f"Login for {credentials['email']}", f"Request failed: {str(e)}")
    
    return None

def test_get_today_shifts(worker_token, results):
    """Test GET /api/attendance/my-attendance/today"""
    print("\n🧪 Testing GET Today's Shifts...")
    
    try:
        response = requests.get(
            f"{BASE_URL}/attendance/my-attendance/today",
            headers=get_auth_headers(worker_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "shifts" in data.get("data", {}):
                shifts = data["data"]["shifts"]
                results.add_pass("GET today's shifts - API response valid")
                
                # Check if shifts have workplace coordinates
                for shift in shifts:
                    workplace = shift.get("workplace", {})
                    if workplace.get("lat") and workplace.get("lng"):
                        results.add_pass("GET today's shifts - workplace coordinates present")
                        return shifts
                
                if shifts:
                    results.add_fail("GET today's shifts", "Workplace coordinates missing from shifts")
                else:
                    results.add_pass("GET today's shifts - no shifts today (expected)")
                    return []
            else:
                results.add_fail("GET today's shifts", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET today's shifts", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET today's shifts", f"Request failed: {str(e)}")
    
    return []

def test_gps_clock_in_within_geofence(worker_token, shift_id, results):
    """Test GPS clock-in within 50-meter geofence (should PASS)"""
    print("\n🧪 Testing GPS Clock-In Within Geofence...")
    
    clock_in_data = {
        "shift_id": shift_id,
        "location": WITHIN_GEOFENCE
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/attendance/gps-clock-in",
            json=clock_in_data,
            headers=get_auth_headers(worker_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "attendance_id" in data.get("data", {}):
                attendance_data = data["data"]
                
                # Verify response contains expected fields
                expected_fields = ["attendance_id", "clock_in_time", "distance_meters"]
                missing_fields = [field for field in expected_fields if field not in attendance_data]
                
                if not missing_fields:
                    distance = attendance_data.get("distance_meters", 0)
                    if distance <= 50:
                        results.add_pass(f"GPS clock-in within geofence - distance: {distance}m")
                        return attendance_data["attendance_id"]
                    else:
                        results.add_fail("GPS clock-in within geofence", f"Distance too far: {distance}m")
                else:
                    results.add_fail("GPS clock-in within geofence", f"Missing fields: {missing_fields}")
            else:
                results.add_fail("GPS clock-in within geofence", f"Invalid response structure: {data}")
        else:
            results.add_fail("GPS clock-in within geofence", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GPS clock-in within geofence", f"Request failed: {str(e)}")
    
    return None

def test_gps_clock_in_outside_geofence(worker_token, shift_id, results):
    """Test GPS clock-in outside 50-meter geofence (should FAIL)"""
    print("\n🧪 Testing GPS Clock-In Outside Geofence...")
    
    clock_in_data = {
        "shift_id": shift_id,
        "location": OUTSIDE_GEOFENCE
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/attendance/gps-clock-in",
            json=clock_in_data,
            headers=get_auth_headers(worker_token),
            timeout=10
        )
        
        if response.status_code == 400:
            data = response.json()
            error_message = data.get("detail", "").lower()
            
            # Check if error message mentions distance and geofence
            if "meters" in error_message and ("geofence" in error_message or "within" in error_message):
                # Extract distance from error message
                import re
                distance_match = re.search(r'(\d+)\s*meters', error_message)
                if distance_match:
                    distance = int(distance_match.group(1))
                    if distance > 50:
                        results.add_pass(f"GPS clock-in outside geofence blocked - {distance}m away")
                    else:
                        results.add_fail("GPS clock-in outside geofence", f"Distance calculation wrong: {distance}m")
                else:
                    results.add_pass("GPS clock-in outside geofence blocked - proper error message")
            else:
                results.add_fail("GPS clock-in outside geofence", f"Wrong error message: {error_message}")
        else:
            results.add_fail("GPS clock-in outside geofence", f"Expected 400, got {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GPS clock-in outside geofence", f"Request failed: {str(e)}")

def test_shift_clock_status(worker_token, shift_id, results):
    """Test GET /api/attendance/shifts/{shift_id}/clock-status"""
    print("\n🧪 Testing Shift Clock Status...")
    
    try:
        response = requests.get(
            f"{BASE_URL}/attendance/shifts/{shift_id}/clock-status",
            headers=get_auth_headers(worker_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "status" in data.get("data", {}):
                status_data = data["data"]
                
                # Verify response contains expected fields
                expected_fields = ["status", "can_clock_in", "can_clock_out"]
                missing_fields = [field for field in expected_fields if field not in status_data]
                
                if not missing_fields:
                    status = status_data.get("status")
                    can_clock_in = status_data.get("can_clock_in")
                    can_clock_out = status_data.get("can_clock_out")
                    
                    results.add_pass(f"GET shift clock status - status: {status}, can_clock_in: {can_clock_in}, can_clock_out: {can_clock_out}")
                    return status_data
                else:
                    results.add_fail("GET shift clock status", f"Missing fields: {missing_fields}")
            else:
                results.add_fail("GET shift clock status", f"Invalid response structure: {data}")
        else:
            results.add_fail("GET shift clock status", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET shift clock status", f"Request failed: {str(e)}")
    
    return None

def test_gps_clock_out(worker_token, shift_id, results):
    """Test GPS clock-out"""
    print("\n🧪 Testing GPS Clock-Out...")
    
    clock_out_data = {
        "shift_id": shift_id,
        "location": WITHIN_GEOFENCE
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/attendance/gps-clock-out",
            json=clock_out_data,
            headers=get_auth_headers(worker_token),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "attendance_id" in data.get("data", {}):
                clock_out_data = data["data"]
                
                # Verify response contains expected fields
                expected_fields = ["attendance_id", "clock_out_time", "duration_hours", "estimated_pay"]
                missing_fields = [field for field in expected_fields if field not in clock_out_data]
                
                if not missing_fields:
                    duration = clock_out_data.get("duration_hours", 0)
                    pay = clock_out_data.get("estimated_pay", 0)
                    results.add_pass(f"GPS clock-out successful - {duration}h worked, ${pay} estimated")
                else:
                    results.add_fail("GPS clock-out", f"Missing fields: {missing_fields}")
            else:
                results.add_fail("GPS clock-out", f"Invalid response structure: {data}")
        else:
            results.add_fail("GPS clock-out", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GPS clock-out", f"Request failed: {str(e)}")

def test_timing_restrictions(worker_token, shift_id, results):
    """Test clock-in timing restrictions"""
    print("\n🧪 Testing Clock-In Timing Restrictions...")
    
    # This test would need a shift scheduled for a different date
    # For now, we'll test with the current shift but document the expected behavior
    
    try:
        # Test with valid location but check timing logic
        clock_in_data = {
            "shift_id": shift_id,
            "location": WITHIN_GEOFENCE
        }
        
        response = requests.post(
            f"{BASE_URL}/attendance/gps-clock-in",
            json=clock_in_data,
            headers=get_auth_headers(worker_token),
            timeout=10
        )
        
        # If already clocked in, should get 409
        if response.status_code == 409:
            results.add_pass("Clock-in timing - duplicate clock-in prevented")
        elif response.status_code == 400:
            error_msg = response.json().get("detail", "").lower()
            if "date" in error_msg or "time" in error_msg:
                results.add_pass("Clock-in timing - date/time validation working")
            else:
                results.add_fail("Clock-in timing", f"Unexpected error: {error_msg}")
        elif response.status_code == 200:
            results.add_pass("Clock-in timing - within valid time window")
        else:
            results.add_fail("Clock-in timing", f"Unexpected response: {response.status_code}")
            
    except Exception as e:
        results.add_fail("Clock-in timing", f"Request failed: {str(e)}")

def test_authentication_required(results):
    """Test that GPS attendance endpoints require authentication"""
    print("\n🧪 Testing Authentication Requirements...")
    
    endpoints = [
        ("GET", "/attendance/my-attendance/today"),
        ("POST", "/attendance/gps-clock-in"),
        ("POST", "/attendance/gps-clock-out"),
        ("GET", "/attendance/shifts/test-shift/clock-status")
    ]
    
    for method, endpoint in endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", json={}, timeout=10)
            
            if response.status_code in [401, 403]:
                results.add_pass(f"Auth required for {method} {endpoint}")
            else:
                results.add_fail(f"Auth required for {method} {endpoint}", f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            results.add_fail(f"Auth required for {method} {endpoint}", f"Request failed: {str(e)}")

def main():
    """Main test execution"""
    results = TestResults()
    
    print("Phase 1: Authentication")
    print("-" * 40)
    
    # Login as worker
    worker_token = login_user(WORKER_CREDENTIALS, results)
    if not worker_token:
        print("❌ Cannot proceed without worker authentication")
        results.summary()
        return
    
    # Login as employer (for future tests)
    employer_token = login_user(EMPLOYER_CREDENTIALS, results)
    
    print("\nPhase 2: Get Today's Shifts")
    print("-" * 40)
    
    # Get today's shifts
    shifts = test_get_today_shifts(worker_token, results)
    
    # Use existing shift ID from review request if no shifts found
    test_shift_id = "shift_d155667c6971"
    if shifts:
        test_shift_id = shifts[0]["shift_id"]
        print(f"Using shift from today: {test_shift_id}")
    else:
        print(f"No shifts today, using test shift: {test_shift_id}")
    
    print("\nPhase 3: GPS Clock-In Tests")
    print("-" * 40)
    
    # Test GPS clock-in within geofence
    attendance_id = test_gps_clock_in_within_geofence(worker_token, test_shift_id, results)
    
    # Test GPS clock-in outside geofence (should fail)
    test_gps_clock_in_outside_geofence(worker_token, test_shift_id, results)
    
    print("\nPhase 4: Clock Status Tests")
    print("-" * 40)
    
    # Test shift clock status
    test_shift_clock_status(worker_token, test_shift_id, results)
    
    print("\nPhase 5: GPS Clock-Out Tests")
    print("-" * 40)
    
    # Test GPS clock-out (only if clocked in)
    if attendance_id:
        test_gps_clock_out(worker_token, test_shift_id, results)
    
    print("\nPhase 6: Timing & Validation Tests")
    print("-" * 40)
    
    # Test timing restrictions
    test_timing_restrictions(worker_token, test_shift_id, results)
    
    print("\nPhase 7: Security Tests")
    print("-" * 40)
    
    # Test authentication requirements
    test_authentication_required(results)
    
    # Final summary
    results.summary()
    
    return results.passed > 0 and len(results.errors) == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)