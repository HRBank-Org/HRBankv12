#!/usr/bin/env python3
"""
Address Validation Feature Testing
Testing the address validation feature on the Workplace Setup page
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

print(f"🧪 ADDRESS VALIDATION FEATURE TESTING")
print(f"Testing backend at: {BASE_URL}")
print(f"Focus: /api/validation/validate-address endpoint for Workplace Setup page")
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

def test_address_validation_backend(results):
    """Test the backend address validation API as specified in review request"""
    print("\n🧪 BACKEND API TESTING - /api/validation/validate-address")
    
    # Test Case 1: Valid Canadian Address (from review request)
    print("\n   Test Case 1: Valid Canadian Address")
    valid_address_data = {
        "address": "123 Main St",
        "city": "Windsor", 
        "province": "ON",
        "postal_code": "N9A 1A1"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/validation/validate-address",
            json=valid_address_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("valid") == True:
                results.add_pass("Valid address - Windsor, ON N9A 1A1")
                print(f"      Response: {json.dumps(data, indent=2)}")
            else:
                results.add_fail("Valid address", f"Should be valid: {data}")
        else:
            results.add_fail("Valid address", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Valid address", f"Request failed: {str(e)}")
    
    # Test Case 2: Invalid Postal Code (from review request)
    print("\n   Test Case 2: Invalid Postal Code - INVALID123")
    invalid_postal_data = {
        "address": "123 Main St",
        "city": "Windsor",
        "province": "ON", 
        "postal_code": "INVALID123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/validation/validate-address",
            json=invalid_postal_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("valid") == False:
                results.add_pass("Invalid postal code - INVALID123 rejected")
                print(f"      Response: {json.dumps(data, indent=2)}")
            else:
                results.add_fail("Invalid postal code", f"Should be invalid: {data}")
        else:
            results.add_fail("Invalid postal code", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Invalid postal code", f"Request failed: {str(e)}")
    
    # Test Case 3: Invalid Province (from review request)
    print("\n   Test Case 3: Invalid Province - ZZ")
    invalid_province_data = {
        "address": "123 Main St",
        "city": "Windsor",
        "province": "ZZ",
        "postal_code": "N9A 1A1"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/validation/validate-address",
            json=invalid_province_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("valid") == False:
                results.add_pass("Invalid province - ZZ rejected")
                print(f"      Response: {json.dumps(data, indent=2)}")
            else:
                results.add_fail("Invalid province", f"Should be invalid: {data}")
        else:
            results.add_fail("Invalid province", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Invalid province", f"Request failed: {str(e)}")

def test_employer_login_for_frontend_testing(results):
    """Test employer login to prepare for frontend testing"""
    print("\n🧪 EMPLOYER LOGIN FOR FRONTEND TESTING")
    
    # Test employer login
    employer_credentials = {
        "email": "employer@hrbank.ca",
        "password": "password123",
        "user_type": "employer"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=employer_credentials, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                results.add_pass("Employer login successful")
                print(f"      ✅ Login successful for employer@hrbank.ca")
                print(f"      ✅ Ready for frontend testing at /employer/workplaces/setup")
                return data["data"]["access_token"]
            else:
                results.add_fail("Employer login", f"Invalid response: {data}")
        else:
            results.add_fail("Employer login", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Employer login", f"Request failed: {str(e)}")
    
    return None

def test_workplace_creation_integration(results, token):
    """Test the workplace creation endpoint that uses address validation"""
    print("\n🧪 WORKPLACE CREATION INTEGRATION TEST")
    
    if not token:
        results.add_fail("Workplace creation", "No auth token available")
        return
    
    # Test workplace creation with valid address
    workplace_data = {
        "workplace_name": "Test Validation Workplace",
        "address": "123 Main St, Windsor, ON",
        "postal_code": "N9A 1A1",
        "job_matching_radius_km": 20,
        "timezone": "America/Toronto"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(
            f"{BASE_URL}/employer/workplaces",
            json=workplace_data,
            headers=headers,
            timeout=15
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get("success"):
                results.add_pass("Workplace creation with valid address")
                print(f"      ✅ Workplace created successfully")
                print(f"      ✅ Workplace ID: {data.get('data', {}).get('workplace_id')}")
            else:
                results.add_fail("Workplace creation", f"Creation failed: {data}")
        else:
            results.add_fail("Workplace creation", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Workplace creation", f"Request failed: {str(e)}")

def main():
    """Run address validation feature tests"""
    results = TestResults()
    
    print("🚀 Starting Address Validation Feature Testing...")
    print("Focus: Backend API + Frontend Integration for Workplace Setup")
    print("="*80)
    
    # Test backend API
    test_address_validation_backend(results)
    
    # Test employer login for frontend testing
    token = test_employer_login_for_frontend_testing(results)
    
    # Test workplace creation integration
    test_workplace_creation_integration(results, token)
    
    # Print final summary
    print("\n" + "="*80)
    print("🏁 ADDRESS VALIDATION FEATURE TESTING COMPLETE")
    success = results.summary()
    
    if success:
        print("✅ ALL TESTS PASSED - ADDRESS VALIDATION FEATURE IS WORKING")
        print("\n📋 FRONTEND TESTING INSTRUCTIONS:")
        print("1. Navigate to: https://superadmin-hr.preview.emergentagent.com/login")
        print("2. Login as employer: employer@hrbank.ca / Test123!")
        print("3. Navigate to: /employer/workplaces/setup")
        print("4. Test Case 1: Enter invalid postal code 'INVALID123' - should show validation error")
        print("5. Test Case 2: Fix postal code to 'N9A 1A1' - error should clear")
        print("6. Test Case 3: Submit with valid data - workplace should be created")
    else:
        print("❌ SOME TESTS FAILED - REVIEW ISSUES BEFORE FRONTEND TESTING")
    
    return success

if __name__ == "__main__":
    main()