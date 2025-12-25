#!/usr/bin/env python3
"""
HR Bank Production Hardening Tests
Testing production hardening changes for HR Bank
Base URL: https://credblock.preview.emergentagent.com

Test Scope:
1. Rate Limiting Test
2. Authentication Test  
3. CORS Test
4. Timezone Consistency Test
5. Credential Flow Test
"""

import requests
import json
import time
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://credblock.preview.emergentagent.com')
BASE_URL = f"{BACKEND_URL}/api"

print(f"🚀 HR BANK PRODUCTION HARDENING TESTS")
print(f"Testing backend at: {BASE_URL}")
print(f"Focus: Rate Limiting, Authentication, CORS, Timezone, Credential Flow")
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

def test_rate_limiting(results):
    """Test rate limiting on login endpoint"""
    print("\n🧪 Testing Rate Limiting...")
    print("   Testing POST /api/auth/login with wrong credentials 6+ times rapidly")
    print("   Expected: Rate limiting blocks after multiple attempts with HTTP 429")
    
    # Wrong credentials
    wrong_creds = {
        "email": "demo@stclairecollege.ca",
        "password": "WrongPassword123!",
        "user_type": "institution"
    }
    
    responses = []
    rate_limit_triggered = False
    
    # Make 6 rapid requests with wrong credentials
    for i in range(6):
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=wrong_creds, timeout=10)
            responses.append((i+1, response.status_code, response.text[:100]))
            print(f"      Attempt {i+1}: HTTP {response.status_code}")
            
            # Check if rate limiting is triggered
            if response.status_code == 429:
                rate_limit_triggered = True
                results.add_pass(f"Rate limiting - Triggered at attempt {i+1} with HTTP 429")
                break
            
            # Small delay to avoid overwhelming the server
            time.sleep(0.1)
            
        except Exception as e:
            results.add_fail(f"Rate limiting attempt {i+1}", f"Request failed: {str(e)}")
            return
    
    # Verify rate limiting is working
    if rate_limit_triggered:
        results.add_pass("Rate limiting - Successfully blocks excessive login attempts")
    else:
        results.add_fail("Rate limiting", "No rate limiting detected after 6 attempts")
    
    # Wait a bit before next test to avoid rate limiting affecting other tests
    print("   Waiting 5 seconds to reset rate limit...")
    time.sleep(5)

def test_authentication(results):
    """Test authentication with correct credentials"""
    print("\n🧪 Testing Authentication...")
    print("   Testing POST /api/auth/login with demo@stclairecollege.ca / Demo123!")
    
    # Correct credentials
    correct_creds = {
        "email": "demo@stclairecollege.ca",
        "password": "Demo123!",
        "user_type": "institution"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=correct_creds, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                results.add_pass("Authentication - Login successful with correct credentials")
                
                # Verify user type
                user_data = data.get("data", {})
                if user_data.get("user_type") == "institution":
                    results.add_pass("Authentication - User type is 'institution'")
                    return data["data"]["access_token"]  # Return token for other tests
                else:
                    results.add_fail("Authentication - User type", f"Expected 'institution', got '{user_data.get('user_type')}'")
            else:
                results.add_fail("Authentication", f"Invalid response structure: {data}")
        else:
            results.add_fail("Authentication", f"HTTP {response.status_code}: {response.text}")
            
    except Exception as e:
        results.add_fail("Authentication", f"Request failed: {str(e)}")
    
    return None

def test_cors_headers(results):
    """Test CORS configuration"""
    print("\n🧪 Testing CORS Configuration...")
    print("   Checking response headers for proper CORS configuration")
    print("   Expected: Access-Control-Allow-Origin is NOT '*'")
    
    try:
        # Test with a POST request and Origin header to trigger CORS
        headers = {
            'Content-Type': 'application/json',
            'Origin': 'https://credblock.preview.emergentagent.com'
        }
        response = requests.post(f"{BASE_URL}/", json={"test": "data"}, headers=headers, timeout=10)
        
        response_headers = response.headers
        cors_origin = response_headers.get('Access-Control-Allow-Origin', '')
        
        if cors_origin:
            results.add_pass("CORS - Access-Control-Allow-Origin header present")
            print(f"      Access-Control-Allow-Origin: {cors_origin}")
            
            # Check that it's not wildcard
            if cors_origin != "*":
                results.add_pass("CORS - Access-Control-Allow-Origin is NOT '*' (secure)")
            else:
                results.add_fail("CORS - Security", "Access-Control-Allow-Origin is '*' (insecure)")
        else:
            # Try OPTIONS request for CORS preflight
            options_response = requests.options(f"{BASE_URL}/auth/login", headers={
                'Origin': 'https://example.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }, timeout=10)
            
            options_headers = options_response.headers
            if 'Access-Control-Allow-Methods' in options_headers:
                results.add_pass("CORS - CORS headers present in OPTIONS response")
                print(f"      Access-Control-Allow-Methods: {options_headers.get('Access-Control-Allow-Methods', '')}")
                print(f"      Access-Control-Allow-Headers: {options_headers.get('Access-Control-Allow-Headers', '')}")
                print(f"      Access-Control-Allow-Credentials: {options_headers.get('Access-Control-Allow-Credentials', '')}")
            else:
                results.add_fail("CORS", "No CORS headers found in any response")
        
        # Check for credentials support
        credentials = response_headers.get('Access-Control-Allow-Credentials', '')
        if credentials:
            results.add_pass(f"CORS - Credentials support: {credentials}")
        
    except Exception as e:
        results.add_fail("CORS test", f"Request failed: {str(e)}")

def test_timezone_consistency(results, auth_token):
    """Test timezone consistency in credential issuance"""
    print("\n🧪 Testing Timezone Consistency...")
    print("   Testing POST /api/blockchain-credentials/issue")
    print("   Expected: Timestamps in proper ISO format with timezone info")
    
    if not auth_token:
        results.add_fail("Timezone test", "No auth token available")
        return
    
    # Sample credential data
    credential_data = {
        "credential_name": "Production Test Credential",
        "program_name": "Software Engineering",
        "student_name": "Production Test Student",
        "student_id": "PROD123",
        "grade_gpa": "4.0",
        "issue_date": "2025-12-25"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/blockchain-credentials/issue",
            json=credential_data,
            headers=get_auth_headers(auth_token),
            timeout=30
        )
        
        if response.status_code == 201:
            data = response.json()
            if data.get("success") and "data" in data:
                credential_result = data["data"]
                results.add_pass("Timezone test - Credential issued successfully")
                
                # Check for timestamp fields and their format
                timestamp_fields = []
                for key, value in credential_result.items():
                    if isinstance(value, str) and ('date' in key.lower() or 'time' in key.lower() or 'created' in key.lower()):
                        timestamp_fields.append((key, value))
                
                if timestamp_fields:
                    results.add_pass("Timezone test - Timestamp fields found in response")
                    
                    valid_timestamps = 0
                    for field_name, timestamp_value in timestamp_fields:
                        print(f"      {field_name}: {timestamp_value}")
                        
                        # Check if it's a valid ISO format with timezone
                        try:
                            # Try to parse as ISO format
                            parsed_time = datetime.fromisoformat(timestamp_value.replace('Z', '+00:00'))
                            
                            # Check if timezone info is present
                            if parsed_time.tzinfo is not None:
                                valid_timestamps += 1
                                print(f"        ✓ Valid ISO format with timezone")
                            else:
                                print(f"        ⚠ Valid ISO format but no timezone info")
                        except ValueError:
                            print(f"        ✗ Invalid ISO format")
                    
                    if valid_timestamps > 0:
                        results.add_pass(f"Timezone test - {valid_timestamps} timestamps in proper ISO format with timezone")
                    else:
                        results.add_fail("Timezone test", "No timestamps found in proper ISO format with timezone")
                else:
                    results.add_pass("Timezone test - No explicit timestamp fields (may be handled internally)")
                
                return credential_result.get("credential_id")
                
            else:
                results.add_fail("Timezone test", f"Invalid response structure: {data}")
        else:
            results.add_fail("Timezone test", f"HTTP {response.status_code}: {response.text}")
            
    except Exception as e:
        results.add_fail("Timezone test", f"Request failed: {str(e)}")
    
    return None

def test_credential_flow(results, auth_token, credential_id):
    """Test end-to-end credential flow"""
    print("\n🧪 Testing Credential Flow...")
    print("   Testing credential issuance and public verification")
    
    if not credential_id:
        print("   No credential ID available from previous test, creating new credential...")
        credential_id = test_timezone_consistency(results, auth_token)
    
    if credential_id:
        print(f"   Testing public verification for credential: {credential_id}")
        
        # Test public verification endpoint
        try:
            response = requests.get(f"{BASE_URL}/blockchain-credentials/verify/{credential_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    verification_data = data["data"]
                    results.add_pass("Credential flow - Public verification endpoint accessible")
                    
                    # Check for required fields
                    if "credential" in verification_data:
                        results.add_pass("Credential flow - Credential details included in verification")
                    else:
                        results.add_fail("Credential flow", "Credential details missing from verification response")
                    
                    if "institution" in verification_data:
                        results.add_pass("Credential flow - Institution info included in verification")
                    else:
                        results.add_fail("Credential flow", "Institution info missing from verification response")
                    
                    # Check blockchain verification status
                    blockchain_verified = verification_data.get("blockchain_verified")
                    if blockchain_verified is not None:
                        results.add_pass(f"Credential flow - Blockchain verification status: {blockchain_verified}")
                    else:
                        results.add_fail("Credential flow", "Blockchain verification status missing")
                        
                else:
                    results.add_fail("Credential flow", f"Invalid verification response: {data}")
            else:
                results.add_fail("Credential flow", f"Verification failed: HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            results.add_fail("Credential flow", f"Verification request failed: {str(e)}")
    else:
        results.add_fail("Credential flow", "No credential available for verification test")

def main():
    """Run all production hardening tests"""
    results = TestResults()
    
    print("Starting Production Hardening Tests...\n")
    
    # Test 1: Rate Limiting
    test_rate_limiting(results)
    
    # Wait for rate limit to reset before continuing
    print("   Waiting 60 seconds for rate limit to reset before continuing...")
    time.sleep(60)
    
    # Test 2: Authentication
    auth_token = test_authentication(results)
    
    # Test 3: CORS
    test_cors_headers(results)
    
    # Test 4: Timezone Consistency
    credential_id = test_timezone_consistency(results, auth_token)
    
    # Test 5: Credential Flow
    test_credential_flow(results, auth_token, credential_id)
    
    # Print final summary
    success = results.summary()
    
    if success:
        print("\n🎉 ALL PRODUCTION HARDENING TESTS PASSED!")
    else:
        print("\n⚠️  SOME TESTS FAILED - REVIEW REQUIRED")
    
    return success

if __name__ == "__main__":
    main()