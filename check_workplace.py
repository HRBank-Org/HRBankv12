#!/usr/bin/env python3
"""
Check workplace data structure
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

def check_workplace():
    """Check workplace data structure"""
    
    # Login as employer
    employer_credentials = {
        "email": "employer@hrbank.ca",
        "password": "password123",
        "user_type": "employer"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=employer_credentials, timeout=15)
    employer_token = response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {employer_token}"}
    
    # Get workplace details
    response = requests.get(f"{BASE_URL}/employer/workplaces", headers=headers, timeout=15)
    data = response.json()
    workplaces = data.get("data", {}).get("workplaces", [])
    
    if workplaces:
        workplace = workplaces[0]
        print("Workplace data structure:")
        print(json.dumps(workplace, indent=2))
    else:
        print("No workplaces found")

if __name__ == "__main__":
    check_workplace()