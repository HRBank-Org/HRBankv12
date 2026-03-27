"""
Super Admin API Tests for HR Bank Platform
Tests all Super Admin endpoints for the admin audit
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://hr-dashboard-fix-8.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "qnizami@hrbank.ca"
ADMIN_PASSWORD = "Test123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin - shared across all tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert data.get("success") == True
    assert "access_token" in data.get("data", {})
    return data["data"]["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers - shared across all tests"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestAdminAuthentication:
    """Test admin login and authentication"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["user_type"] == "admin"
        assert data["data"]["email"] == ADMIN_EMAIL
    
    def test_admin_login_invalid_password(self):
        """Test admin login with invalid password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code in [401, 400]


class TestSuperAdminDashboard:
    """Test Super Admin Dashboard APIs"""
    
    def test_dashboard_endpoint(self, auth_headers):
        """Test super admin dashboard endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "admin" in data["data"]
        assert "action_items" in data["data"]
        assert "platform_stats" in data["data"]
    
    def test_roles_endpoint(self, auth_headers):
        """Test roles listing endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/roles",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "roles" in data["data"]
        assert len(data["data"]["roles"]) > 0


class TestPendingActivations:
    """Test Pending Activations APIs"""
    
    def test_pending_activations_list(self, auth_headers):
        """Test pending activations listing"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/pending-activations?page=1&limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "pending_users" in data["data"]
        assert "total" in data["data"]
    
    def test_pending_activations_filter_workforce(self, auth_headers):
        """Test pending activations with workforce filter"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/pending-activations?user_type=workforce&page=1&limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


class TestAdminManagement:
    """Test Admin Management APIs"""
    
    def test_admins_list(self, auth_headers):
        """Test admins listing"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/admins",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "admins" in data["data"]


class TestZoneManagement:
    """Test Zone Management APIs"""
    
    def test_provinces_list(self, auth_headers):
        """Test provinces listing"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/provinces",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "provinces" in data["data"]
        assert len(data["data"]["provinces"]) == 13  # All Canadian provinces/territories
    
    def test_zones_list(self, auth_headers):
        """Test zones listing"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/zones?limit=100",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "zones" in data["data"]


class TestRegionalStats:
    """Test Regional Stats APIs"""
    
    def test_regional_stats(self, auth_headers):
        """Test regional stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/regional-stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "regional_stats" in data["data"]


class TestInstitutionPayouts:
    """Test Institution Payouts APIs"""
    
    def test_institutions_stripe_status(self, auth_headers):
        """Test institutions stripe status endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/institutions-stripe-status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "institutions" in data["data"]
        assert "stats" in data["data"]


class TestSupportTickets:
    """Test Support Tickets APIs"""
    
    def test_support_tickets_list(self, auth_headers):
        """Test support tickets listing"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/support-tickets",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "tickets" in data["data"]


class TestFranchiseManagement:
    """Test Franchise Management APIs"""
    
    def test_franchises_list(self, auth_headers):
        """Test franchises listing"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/franchises",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "franchises" in data["data"]


class TestAnalytics:
    """Test Analytics APIs"""
    
    def test_platform_analytics(self, auth_headers):
        """Test platform analytics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/platform",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "overview" in data["data"]
        assert "users" in data["data"]


class TestCredentialReviews:
    """Test Credential Reviews APIs"""
    
    def test_credentials_pending_approval(self, auth_headers):
        """Test credentials pending approval endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/credentials/pending-approval",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "credentials" in data["data"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
