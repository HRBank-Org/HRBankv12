#!/usr/bin/env python3
"""
CEO Analytics Dashboard Backend Test
Tests the specific requirements from the review request
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

print(f"Testing CEO Analytics Dashboard at: {BASE_URL}")

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

def get_admin_token():
    """Login as admin and get access token"""
    admin_credentials = {
        "email": "qnizami@hrbank.ca",
        "password": "Tabaghnak@3891",
        "user_type": "admin"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=admin_credentials, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("data", {}).get("access_token")
        else:
            print(f"Admin login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Admin login error: {str(e)}")
        return None

def test_analytics_endpoint(results):
    """Test the analytics endpoint with admin credentials"""
    print("\n🧪 Testing Analytics Endpoint Access...")
    
    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        results.add_fail("Admin login", "Failed to get admin access token")
        return None
    
    results.add_pass("Admin login successful")
    
    # Test analytics endpoint
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/admin/analytics/platform", headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success") and data.get("data"):
                results.add_pass("Analytics endpoint access")
                return data["data"]
            else:
                results.add_fail("Analytics endpoint response", f"Invalid response structure: {data}")
                return None
        else:
            results.add_fail("Analytics endpoint access", f"HTTP {response.status_code}: {response.text}")
            return None
    except Exception as e:
        results.add_fail("Analytics endpoint access", f"Request failed: {str(e)}")
        return None

def test_response_structure(results, analytics_data):
    """Test that response contains all required sections"""
    print("\n🧪 Testing Response Structure...")
    
    if not analytics_data:
        results.add_fail("Response structure test", "No analytics data to test")
        return
    
    # Test required sections
    required_sections = {
        "overview": ["total_revenue", "total_hours_worked", "total_shifts_completed", "completion_rate"],
        "users": ["workforce", "employers", "institutions"],
        "shifts": ["total_created", "completed", "pending", "active", "avg_duration_hours"],
        "zones": [],  # Array of zone objects
        "top_zones": []  # Array of top 5 zones
    }
    
    for section, required_fields in required_sections.items():
        if section not in analytics_data:
            results.add_fail(f"Required section: {section}", "Section missing from response")
            continue
        
        results.add_pass(f"Required section: {section}")
        
        if section == "overview":
            overview = analytics_data[section]
            for field in required_fields:
                if field in overview:
                    results.add_pass(f"Overview field: {field}")
                else:
                    results.add_fail(f"Overview field: {field}", "Field missing")
        
        elif section == "users":
            users = analytics_data[section]
            for user_type in required_fields:
                if user_type in users:
                    user_data = users[user_type]
                    required_user_fields = ["total", "active"]
                    if user_type in ["workforce", "employers"]:
                        required_user_fields.append("new_last_30d")
                    
                    for field in required_user_fields:
                        if field in user_data:
                            results.add_pass(f"Users.{user_type}.{field}")
                        else:
                            results.add_fail(f"Users.{user_type}.{field}", "Field missing")
                else:
                    results.add_fail(f"Users section: {user_type}", "User type missing")
        
        elif section == "shifts":
            shifts = analytics_data[section]
            for field in required_fields:
                if field in shifts:
                    results.add_pass(f"Shifts field: {field}")
                else:
                    results.add_fail(f"Shifts field: {field}", "Field missing")
        
        elif section in ["zones", "top_zones"]:
            zone_data = analytics_data[section]
            if isinstance(zone_data, list):
                results.add_pass(f"{section} is array")
                
                if section == "top_zones" and len(zone_data) <= 5:
                    results.add_pass("Top zones limited to 5")
                elif section == "top_zones" and len(zone_data) > 5:
                    results.add_fail("Top zones limit", f"Expected max 5, got {len(zone_data)}")
                
                # Check zone structure if zones exist
                if zone_data:
                    sample_zone = zone_data[0]
                    required_zone_fields = ["zone_id", "zone_name", "provinces", "revenue", "hours_worked", "total_shifts", "workforce_count", "employer_count"]
                    
                    for field in required_zone_fields:
                        if field in sample_zone:
                            results.add_pass(f"Zone field: {field}")
                        else:
                            results.add_fail(f"Zone field: {field}", "Field missing from zone data")
            else:
                results.add_fail(f"{section} data type", f"Expected array, got {type(zone_data)}")

def test_revenue_calculation(results, analytics_data):
    """Test revenue calculation verification"""
    print("\n🧪 Testing Revenue Calculation...")
    
    if not analytics_data:
        results.add_fail("Revenue calculation test", "No analytics data to test")
        return
    
    overview = analytics_data.get("overview", {})
    total_hours = overview.get("total_hours_worked", 0)
    total_revenue = overview.get("total_revenue", 0)
    
    # Revenue should be hours_worked × 2 ($1 from workforce + $1 from employer)
    expected_revenue = total_hours * 2
    
    if abs(total_revenue - expected_revenue) < 0.01:  # Allow for floating point precision
        results.add_pass(f"Revenue calculation correct: {total_hours} hours × $2 = ${total_revenue}")
    else:
        results.add_fail("Revenue calculation", f"Expected ${expected_revenue} ({total_hours} × 2), got ${total_revenue}")

def test_data_validation(results, analytics_data):
    """Test data structure validation"""
    print("\n🧪 Testing Data Validation...")
    
    if not analytics_data:
        results.add_fail("Data validation test", "No analytics data to test")
        return
    
    # Check for NaN or null values in numeric fields
    def validate_numeric_data(obj, path=""):
        issues = []
        if isinstance(obj, dict):
            for key, value in obj.items():
                current_path = f"{path}.{key}" if path else key
                if isinstance(value, (int, float)):
                    if value != value:  # Check for NaN
                        issues.append(f"NaN value at {current_path}")
                    elif value is None:
                        issues.append(f"Null value at {current_path}")
                    elif value < 0 and key in ["total", "active", "revenue", "hours_worked", "total_shifts", "workforce_count", "employer_count"]:
                        issues.append(f"Negative value at {current_path}: {value}")
                elif isinstance(value, (dict, list)):
                    issues.extend(validate_numeric_data(value, current_path))
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                current_path = f"{path}[{i}]"
                issues.extend(validate_numeric_data(item, current_path))
        return issues
    
    validation_issues = validate_numeric_data(analytics_data)
    
    if validation_issues:
        for issue in validation_issues:
            results.add_fail("Data validation", issue)
    else:
        results.add_pass("Data validation - all numeric values are valid and non-negative")

def test_authorization(results):
    """Test authorization checks"""
    print("\n🧪 Testing Authorization...")
    
    # Test 1: Unauthenticated access
    try:
        response = requests.get(f"{BASE_URL}/admin/analytics/platform", timeout=10)
        
        if response.status_code in [401, 403]:
            results.add_pass("Unauthenticated access blocked")
        else:
            results.add_fail("Unauthenticated access", f"Expected 401/403, got {response.status_code}")
    except Exception as e:
        results.add_fail("Unauthenticated access test", f"Request failed: {str(e)}")
    
    # Test 2: Invalid token
    try:
        headers = {"Authorization": "Bearer invalid-token-12345"}
        response = requests.get(f"{BASE_URL}/admin/analytics/platform", headers=headers, timeout=10)
        
        if response.status_code in [401, 403]:
            results.add_pass("Invalid token access blocked")
        else:
            results.add_fail("Invalid token access", f"Expected 401/403, got {response.status_code}")
    except Exception as e:
        results.add_fail("Invalid token access test", f"Request failed: {str(e)}")

def main():
    """Run CEO Analytics Dashboard tests"""
    print("🚀 CEO Analytics Dashboard Backend Test")
    print("=" * 60)
    
    results = TestResults()
    
    # Test 1: Analytics Endpoint Access
    analytics_data = test_analytics_endpoint(results)
    
    # Test 2: Response Structure
    test_response_structure(results, analytics_data)
    
    # Test 3: Revenue Calculation
    test_revenue_calculation(results, analytics_data)
    
    # Test 4: Data Validation
    test_data_validation(results, analytics_data)
    
    # Test 5: Authorization
    test_authorization(results)
    
    # Print results
    success = results.summary()
    
    if success:
        print("\n🎉 All CEO Analytics Dashboard tests passed!")
        print("\n📊 Sample Analytics Data:")
        if analytics_data:
            print(f"  • Total Revenue: ${analytics_data.get('overview', {}).get('total_revenue', 0)}")
            print(f"  • Total Hours Worked: {analytics_data.get('overview', {}).get('total_hours_worked', 0)}")
            print(f"  • Total Shifts Completed: {analytics_data.get('overview', {}).get('total_shifts_completed', 0)}")
            print(f"  • Workforce Users: {analytics_data.get('users', {}).get('workforce', {}).get('total', 0)}")
            print(f"  • Employer Users: {analytics_data.get('users', {}).get('employers', {}).get('total', 0)}")
            print(f"  • Zones Configured: {len(analytics_data.get('zones', []))}")
        return 0
    else:
        print("\n💥 Some tests failed. Check the errors above.")
        return 1

if __name__ == "__main__":
    exit(main())