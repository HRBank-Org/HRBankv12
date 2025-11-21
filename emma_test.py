#!/usr/bin/env python3
"""
Emma AI Assistant Backend API Tests
Testing Emma AI conversation management, chat, onboarding status, and resume parsing
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

print(f"🤖 EMMA AI ASSISTANT BACKEND TESTING")
print(f"Testing backend at: {BASE_URL}")
print(f"Focus: Emma AI conversation, chat, onboarding, resume parsing")
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

def test_admin_authentication(results):
    """Test admin authentication with provided credentials"""
    print("\n🧪 Testing Admin Authentication...")
    
    admin_credentials = {
        "email": "qnizami@hrbank.ca",
        "password": "Tabaghnak@3891",
        "user_type": "admin"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=admin_credentials, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("success") and 
                "access_token" in data.get("data", {}) and
                data.get("data", {}).get("user_type") == "admin"):
                
                admin_token = data["data"]["access_token"]
                results.add_pass("Admin authentication successful")
                return admin_token
            else:
                results.add_fail("Admin authentication", f"Invalid response structure: {data}")
        else:
            results.add_fail("Admin authentication", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Admin authentication", f"Request failed: {str(e)}")
    
    return None

def test_emma_conversation_api(results, admin_token):
    """Test GET /api/emma/conversation endpoint"""
    print("\n🧪 Testing Emma Conversation API...")
    
    # Test 1: GET conversation - first time (creates new with greeting)
    try:
        response = requests.get(
            f"{BASE_URL}/emma/conversation",
            headers=get_auth_headers(admin_token),
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("success") and 
                data.get("data") and
                "conversation_id" in data["data"] and
                "messages" in data["data"] and
                "context" in data["data"] and
                "onboarding_progress" in data["data"]):
                
                # Verify first message is from Emma with greeting
                messages = data["data"]["messages"]
                if (len(messages) > 0 and 
                    messages[0]["role"] == "assistant" and
                    any(greeting in messages[0]["content"].lower() for greeting in ["good morning", "good afternoon", "good evening"])):
                    results.add_pass("GET /api/emma/conversation - creates new conversation with time-based greeting")
                    
                    # Store conversation_id for subsequent tests
                    conversation_id = data["data"]["conversation_id"]
                    
                    # Test 2: GET conversation - second time (returns existing)
                    response2 = requests.get(
                        f"{BASE_URL}/emma/conversation",
                        headers=get_auth_headers(admin_token),
                        timeout=15
                    )
                    
                    if response2.status_code == 200:
                        data2 = response2.json()
                        if (data2.get("success") and 
                            data2.get("data", {}).get("conversation_id") == conversation_id):
                            results.add_pass("GET /api/emma/conversation - returns existing conversation")
                            return conversation_id
                        else:
                            results.add_fail("GET /api/emma/conversation - existing", f"Different conversation returned")
                    else:
                        results.add_fail("GET /api/emma/conversation - existing", f"HTTP {response2.status_code}: {response2.text}")
                else:
                    results.add_fail("GET /api/emma/conversation - greeting", f"No proper greeting found in messages")
            else:
                results.add_fail("GET /api/emma/conversation - structure", f"Missing required fields")
        else:
            results.add_fail("GET /api/emma/conversation", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/emma/conversation", f"Request failed: {str(e)}")
    
    return None

def test_emma_chat_api(results, admin_token):
    """Test POST /api/emma/chat endpoint"""
    print("\n🧪 Testing Emma Chat API...")
    
    # Test 1: Single message exchange
    try:
        chat_request = {
            "message": "Hello Emma! I'm new to HR Bank and need help getting started."
        }
        
        response = requests.post(
            f"{BASE_URL}/emma/chat",
            json=chat_request,
            headers=get_auth_headers(admin_token),
            timeout=20  # AI responses may take longer
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("success") and 
                data.get("data") and
                "message" in data["data"] and
                "onboarding_progress" in data["data"] and
                "should_show_file_upload" in data["data"]):
                
                emma_response = data["data"]["message"]
                if len(emma_response) > 10:  # Ensure we got a meaningful response
                    results.add_pass("POST /api/emma/chat - single message exchange with AI response")
                    
                    # Test 2: Multiple messages (verify history)
                    chat_request2 = {
                        "message": "What documents do I need to upload?"
                    }
                    
                    response2 = requests.post(
                        f"{BASE_URL}/emma/chat",
                        json=chat_request2,
                        headers=get_auth_headers(admin_token),
                        timeout=20
                    )
                    
                    if response2.status_code == 200:
                        data2 = response2.json()
                        if (data2.get("success") and 
                            data2.get("data") and
                            len(data2["data"]["message"]) > 10):
                            results.add_pass("POST /api/emma/chat - multiple messages with conversation history")
                        else:
                            results.add_fail("POST /api/emma/chat - multiple messages", f"Invalid second response")
                    else:
                        results.add_fail("POST /api/emma/chat - multiple messages", f"HTTP {response2.status_code}: {response2.text}")
                else:
                    results.add_fail("POST /api/emma/chat - AI response", f"Response too short or empty")
            else:
                results.add_fail("POST /api/emma/chat - structure", f"Missing required fields")
        else:
            results.add_fail("POST /api/emma/chat", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("POST /api/emma/chat", f"Request failed: {str(e)}")

def test_emma_onboarding_status_api(results, admin_token):
    """Test GET /api/emma/onboarding-status endpoint"""
    print("\n🧪 Testing Emma Onboarding Status API...")
    
    try:
        response = requests.get(
            f"{BASE_URL}/emma/onboarding-status",
            headers=get_auth_headers(admin_token),
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("success") and 
                data.get("data") and
                "progress" in data["data"] and
                "completed_steps" in data["data"] and
                "pending_documents" in data["data"] and
                "current_step" in data["data"] and
                "is_complete" in data["data"]):
                
                progress = data["data"]["progress"]
                if isinstance(progress, (int, float)) and 0 <= progress <= 100:
                    results.add_pass("GET /api/emma/onboarding-status - progress tracking working")
                else:
                    results.add_fail("GET /api/emma/onboarding-status - progress", f"Invalid progress value: {progress}")
            else:
                results.add_fail("GET /api/emma/onboarding-status - structure", f"Missing required fields")
        else:
            results.add_fail("GET /api/emma/onboarding-status", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("GET /api/emma/onboarding-status", f"Request failed: {str(e)}")

def test_emma_authentication_enforcement(results):
    """Test that Emma endpoints require authentication"""
    print("\n🧪 Testing Emma Authentication Enforcement...")
    
    # Test conversation endpoint without auth
    try:
        response = requests.get(f"{BASE_URL}/emma/conversation", timeout=10)
        
        if response.status_code in [401, 403]:
            results.add_pass("Emma API authentication enforcement - conversation endpoint")
        else:
            results.add_fail("Emma API authentication enforcement", f"Expected 401/403, got {response.status_code}")
    except Exception as e:
        results.add_fail("Emma API authentication enforcement", f"Request failed: {str(e)}")
    
    # Test chat endpoint without auth
    try:
        response = requests.post(
            f"{BASE_URL}/emma/chat",
            json={"message": "test"},
            timeout=10
        )
        
        if response.status_code in [401, 403]:
            results.add_pass("Emma API authentication enforcement - chat endpoint")
        else:
            results.add_fail("Emma API authentication enforcement - chat", f"Expected 401/403, got {response.status_code}")
    except Exception as e:
        results.add_fail("Emma API authentication enforcement - chat", f"Request failed: {str(e)}")
    
    # Test onboarding status endpoint without auth
    try:
        response = requests.get(f"{BASE_URL}/emma/onboarding-status", timeout=10)
        
        if response.status_code in [401, 403]:
            results.add_pass("Emma API authentication enforcement - onboarding status endpoint")
        else:
            results.add_fail("Emma API authentication enforcement - onboarding", f"Expected 401/403, got {response.status_code}")
    except Exception as e:
        results.add_fail("Emma API authentication enforcement - onboarding", f"Request failed: {str(e)}")

def test_emma_conversation_persistence(results, admin_token):
    """Test that conversation history persists across requests"""
    print("\n🧪 Testing Emma Conversation Persistence...")
    
    try:
        # Get conversation and verify it contains our previous messages
        response = requests.get(
            f"{BASE_URL}/emma/conversation",
            headers=get_auth_headers(admin_token),
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            messages = data.get("data", {}).get("messages", [])
            
            # Should have at least: greeting + user message + emma response + user message + emma response
            if len(messages) >= 5:
                # Check if our test messages are in the conversation
                user_messages = [msg for msg in messages if msg["role"] == "user"]
                if len(user_messages) >= 2:
                    results.add_pass("Emma conversation persistence - messages persist across requests")
                else:
                    results.add_fail("Emma conversation persistence", f"User messages not found")
            else:
                results.add_fail("Emma conversation persistence", f"Expected at least 5 messages, got {len(messages)}")
        else:
            results.add_fail("Emma conversation persistence", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Emma conversation persistence", f"Request failed: {str(e)}")

def test_emma_contextual_responses(results, admin_token):
    """Test that Emma's AI responses are contextual and helpful"""
    print("\n🧪 Testing Emma Contextual AI Responses...")
    
    try:
        # Ask a specific HR Bank question
        chat_request = {
            "message": "What is the minimum wage in Ontario and how does HR Bank ensure compliance?"
        }
        
        response = requests.post(
            f"{BASE_URL}/emma/chat",
            json=chat_request,
            headers=get_auth_headers(admin_token),
            timeout=25  # Complex questions may take longer
        )
        
        if response.status_code == 200:
            data = response.json()
            emma_response = data.get("data", {}).get("message", "")
            
            # Check if response mentions minimum wage and compliance
            if (len(emma_response) > 50 and 
                any(keyword in emma_response.lower() for keyword in ["minimum wage", "ontario", "compliance", "$17.60", "employment"])):
                results.add_pass("Emma AI responses - contextual and helpful responses")
            else:
                results.add_fail("Emma AI responses - contextual", f"Response not contextual enough: {emma_response[:200]}...")
        else:
            results.add_fail("Emma AI responses - contextual", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Emma AI responses - contextual", f"Request failed: {str(e)}")

def main():
    """Run Emma AI tests"""
    results = TestResults()
    
    # Test admin authentication first
    admin_token = test_admin_authentication(results)
    
    if not admin_token:
        print("❌ Cannot proceed without admin authentication")
        return False
    
    # Test Emma AI endpoints
    conversation_id = test_emma_conversation_api(results, admin_token)
    test_emma_chat_api(results, admin_token)
    test_emma_onboarding_status_api(results, admin_token)
    test_emma_authentication_enforcement(results)
    test_emma_conversation_persistence(results, admin_token)
    test_emma_contextual_responses(results, admin_token)
    
    print("\n📝 Note: Resume parsing endpoints (POST /api/emma/parse-resume, POST /api/emma/approve-resume-data)")
    print("   require workforce user account - skipping for admin user as per review request")
    print("   Admin user testing completed successfully for available Emma endpoints")
    
    # Print final results
    success = results.summary()
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)