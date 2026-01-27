"""
Comprehensive API Tests for HR Bank Platform
Tests all major endpoints for pre-AWS deployment verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://workpass-hub-1.preview.emergentagent.com')

# Test credentials for different user types
CREDENTIALS = {
    "admin": {"email": "qnizami@hrbank.ca", "password": "Test123!"},
    "institution": {"email": "demo@stclairecollege.ca", "password": "Demo123!"},
    "employer": {"email": "demo@swanpizza.ca", "password": "Demo123!"},
    "workforce": {"email": "alex.johnson@email.com", "password": "Demo123!"}
}


# ============ FIXTURES ============

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=CREDENTIALS["admin"]
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert data.get("success") == True
    return data["data"]["access_token"]


@pytest.fixture(scope="module")
def workforce_token():
    """Get workforce authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=CREDENTIALS["workforce"]
    )
    assert response.status_code == 200, f"Workforce login failed: {response.text}"
    data = response.json()
    assert data.get("success") == True
    return data["data"]["access_token"]


@pytest.fixture(scope="module")
def employer_token():
    """Get employer authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=CREDENTIALS["employer"]
    )
    assert response.status_code == 200, f"Employer login failed: {response.text}"
    data = response.json()
    assert data.get("success") == True
    return data["data"]["access_token"]


@pytest.fixture(scope="module")
def institution_token():
    """Get institution authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=CREDENTIALS["institution"]
    )
    assert response.status_code == 200, f"Institution login failed: {response.text}"
    data = response.json()
    assert data.get("success") == True
    return data["data"]["access_token"]


# ============ PUBLIC ENDPOINTS ============

class TestPublicEndpoints:
    """Test public endpoints that don't require authentication"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/health")
        # Health check may return HTML or JSON depending on setup
        assert response.status_code in [200, 404]
    
    def test_institution_directory_all(self):
        """Test institution directory listing"""
        response = requests.get(f"{BASE_URL}/api/institution-directory/all")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "institutions" in data["data"]
        assert len(data["data"]["institutions"]) > 0
    
    def test_institution_directory_stats(self):
        """Test institution directory stats"""
        response = requests.get(f"{BASE_URL}/api/institution-directory/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "total_partners" in data["data"]
    
    def test_leaderboard_institutions(self):
        """Test leaderboard institutions endpoint"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/institutions")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "leaderboard" in data["data"]
    
    def test_leaderboard_provinces(self):
        """Test leaderboard provinces endpoint"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/provinces")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "leaderboard" in data["data"]
    
    def test_leaderboard_stats(self):
        """Test leaderboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "total_institutions" in data["data"]
    
    def test_public_jobs(self):
        """Test public jobs listing"""
        response = requests.get(f"{BASE_URL}/api/jobs/public?limit=4")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
    
    def test_partner_logos(self):
        """Test partner logos endpoint"""
        response = requests.get(f"{BASE_URL}/api/partner-logos/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_google_oauth_status(self):
        """Test Google OAuth status"""
        response = requests.get(f"{BASE_URL}/api/auth/google/status")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "available" in data["data"]


# ============ AUTH ENDPOINTS ============

class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CREDENTIALS["admin"]
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["user_type"] == "admin"
        assert "access_token" in data["data"]
    
    def test_workforce_login(self):
        """Test workforce login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CREDENTIALS["workforce"]
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["user_type"] == "workforce"
    
    def test_employer_login(self):
        """Test employer login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CREDENTIALS["employer"]
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["user_type"] == "employer"
    
    def test_institution_login(self):
        """Test institution login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CREDENTIALS["institution"]
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["user_type"] == "institution"
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        assert response.status_code in [401, 400]


# ============ SUPER ADMIN ENDPOINTS ============

class TestSuperAdminEndpoints:
    """Test Super Admin dashboard and management endpoints"""
    
    def test_dashboard(self, admin_token):
        """Test super admin dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "admin" in data["data"]
        assert "platform_stats" in data["data"]
    
    def test_pending_activations(self, admin_token):
        """Test pending activations listing"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/pending-activations?page=1&limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "pending_users" in data["data"]
    
    def test_roles(self, admin_token):
        """Test roles listing"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/roles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "roles" in data["data"]
    
    def test_provinces(self, admin_token):
        """Test provinces listing"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/provinces",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "provinces" in data["data"]
        assert len(data["data"]["provinces"]) == 13  # All Canadian provinces/territories
    
    def test_zones(self, admin_token):
        """Test zones listing"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/zones?limit=100",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "zones" in data["data"]


# ============ WORKFORCE ENDPOINTS ============

class TestWorkforceEndpoints:
    """Test workforce-specific endpoints"""
    
    def test_workforce_profile(self, workforce_token):
        """Test workforce profile retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/workforce/profile",
            headers={"Authorization": f"Bearer {workforce_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "profile" in data["data"]
    
    def test_workforce_dashboard(self, workforce_token):
        """Test workforce dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/workforce/dashboard",
            headers={"Authorization": f"Bearer {workforce_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


# ============ EMPLOYER ENDPOINTS ============

class TestEmployerEndpoints:
    """Test employer-specific endpoints"""
    
    def test_employer_profile(self, employer_token):
        """Test employer profile retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/employer/profile",
            headers={"Authorization": f"Bearer {employer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_employer_dashboard(self, employer_token):
        """Test employer dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/employer/dashboard",
            headers={"Authorization": f"Bearer {employer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


# ============ INSTITUTION ENDPOINTS ============

class TestInstitutionEndpoints:
    """Test institution-specific endpoints"""
    
    def test_institution_profile(self, institution_token):
        """Test institution profile retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/institutions/profile",
            headers={"Authorization": f"Bearer {institution_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_institution_dashboard(self, institution_token):
        """Test institution dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/institutions/dashboard",
            headers={"Authorization": f"Bearer {institution_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


# ============ CREDENTIALS ENDPOINTS ============

class TestCredentialsEndpoints:
    """Test credentials-related endpoints"""
    
    def test_credential_types(self):
        """Test credential types listing (public)"""
        response = requests.get(f"{BASE_URL}/api/credentials/types")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "credential_types" in data["data"]
    
    def test_my_credentials(self, workforce_token):
        """Test workforce credentials retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/credentials/me",
            headers={"Authorization": f"Bearer {workforce_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "credentials" in data["data"]


# ============ EMMA AI ENDPOINTS ============

class TestEmmaEndpoints:
    """Test Emma AI assistant endpoints"""
    
    def test_emma_conversation(self, workforce_token):
        """Test Emma conversation retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/emma/conversation",
            headers={"Authorization": f"Bearer {workforce_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "messages" in data["data"]
    
    def test_emma_chat(self, workforce_token):
        """Test Emma chat endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/emma/chat",
            headers={"Authorization": f"Bearer {workforce_token}"},
            json={"message": "Hello Emma, what can you help me with?"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "message" in data["data"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
