"""
Payroll Provider Integrations
Direct API integrations with major payroll providers:
- Gusto (US small business)
- Ceridian Dayforce (Canada market leader)
- ADP Workforce Now (North America enterprise)
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
import httpx
import os
import logging

logger = logging.getLogger(__name__)


@dataclass
class ProviderCredentials:
    """Stored credentials for a payroll provider connection"""
    provider: str
    employer_id: str
    access_token: str
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    company_id: Optional[str] = None  # Provider-specific company ID
    connected_at: datetime = None
    
    def is_token_expired(self) -> bool:
        if not self.token_expires_at:
            return True
        return datetime.now(timezone.utc) > self.token_expires_at


class PayrollProviderBase(ABC):
    """Base class for payroll provider integrations"""
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def oauth_authorize_url(self) -> str:
        pass
    
    @property
    @abstractmethod
    def oauth_token_url(self) -> str:
        pass
    
    @abstractmethod
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict:
        """Exchange authorization code for access token"""
        pass
    
    @abstractmethod
    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """Refresh an expired access token"""
        pass
    
    @abstractmethod
    async def sync_employees(self, credentials: ProviderCredentials) -> List[Dict]:
        """Sync employees from the provider"""
        pass
    
    @abstractmethod
    async def submit_timesheet(self, credentials: ProviderCredentials, timesheet_data: Dict) -> Dict:
        """Submit timesheet data to the provider"""
        pass


class GustoProvider(PayrollProviderBase):
    """Gusto API integration for US small business"""
    
    def __init__(self):
        self.client_id = os.getenv("GUSTO_CLIENT_ID", "")
        self.client_secret = os.getenv("GUSTO_CLIENT_SECRET", "")
        self.api_base = "https://api.gusto.com/v1"
    
    @property
    def provider_name(self) -> str:
        return "gusto"
    
    @property
    def oauth_authorize_url(self) -> str:
        return "https://api.gusto.com/oauth/authorize"
    
    @property
    def oauth_token_url(self) -> str:
        return "https://api.gusto.com/oauth/token"
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.oauth_token_url,
                data={
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Gusto token exchange failed: {response.text}")
            
            data = response.json()
            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token"),
                "expires_in": data.get("expires_in", 3600),
                "company_id": data.get("company_id")
            }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.oauth_token_url,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Gusto token refresh failed: {response.text}")
            
            data = response.json()
            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token", refresh_token),
                "expires_in": data.get("expires_in", 3600)
            }
    
    async def sync_employees(self, credentials: ProviderCredentials) -> List[Dict]:
        headers = {
            "Authorization": f"Bearer {credentials.access_token}",
            "X-Gusto-API-Version": "2024-04-01"
        }
        
        employees = []
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/companies/{credentials.company_id}/employees",
                headers=headers,
                params={"include": "all_compensations"},
                timeout=30.0
            )
            
            if response.status_code == 200:
                employees = response.json()
            elif response.status_code == 401:
                raise Exception("Gusto token expired")
            else:
                logger.error(f"Gusto employee sync failed: {response.text}")
        
        return [
            {
                "provider_employee_id": emp.get("uuid"),
                "first_name": emp.get("first_name"),
                "last_name": emp.get("last_name"),
                "email": emp.get("email"),
                "status": emp.get("employment_status")
            }
            for emp in employees
        ]
    
    async def submit_timesheet(self, credentials: ProviderCredentials, timesheet_data: Dict) -> Dict:
        headers = {
            "Authorization": f"Bearer {credentials.access_token}",
            "X-Gusto-API-Version": "2024-04-01",
            "Content-Type": "application/json"
        }
        
        payload = {
            "start_date": timesheet_data["start_date"],
            "end_date": timesheet_data["end_date"],
            "hours": [
                {
                    "date": timesheet_data["work_date"],
                    "pay_classification": self._map_work_type(timesheet_data.get("work_type")),
                    "hours": timesheet_data["total_hours"]
                }
            ]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base}/companies/{credentials.company_id}/time_tracking/time_sheets",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                return {
                    "success": True,
                    "provider_timesheet_id": data.get("uuid"),
                    "response": data
                }
            else:
                return {
                    "success": False,
                    "error": response.text
                }
    
    def _map_work_type(self, work_type: str) -> str:
        mapping = {
            "on_site": "Regular Hours",
            "continental": "Regular Hours",
            "route_based": "Regular Hours"
        }
        return mapping.get(work_type, "Regular Hours")


class DayforceProvider(PayrollProviderBase):
    """Ceridian Dayforce API integration for Canadian market"""
    
    def __init__(self):
        self.username = os.getenv("DAYFORCE_USERNAME", "")
        self.password = os.getenv("DAYFORCE_PASSWORD", "")
        self.subdomain = os.getenv("DAYFORCE_SUBDOMAIN", "")
        self.company_id = os.getenv("DAYFORCE_COMPANY_ID", "")
        self.api_base = f"https://{self.subdomain}.dayforcehcm.com/api"
        self._token_cache = {"token": None, "expires_at": None}
    
    @property
    def provider_name(self) -> str:
        return "dayforce"
    
    @property
    def oauth_authorize_url(self) -> str:
        return f"{self.api_base}/Authentication/Login"
    
    @property
    def oauth_token_url(self) -> str:
        return f"{self.api_base}/Authentication/Login"
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict:
        # Dayforce uses username/password auth, not OAuth code
        return await self._get_token()
    
    async def _get_token(self) -> Dict:
        """Get Dayforce token using username/password"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.oauth_token_url,
                auth=(self.username, self.password),
                json={},
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Dayforce auth failed: {response.text}")
            
            data = response.json()
            return {
                "access_token": data.get("access_token"),
                "expires_in": data.get("expires_in", 3600)
            }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict:
        # Dayforce doesn't use refresh tokens, re-authenticate
        return await self._get_token()
    
    async def sync_employees(self, credentials: ProviderCredentials) -> List[Dict]:
        headers = {
            "Authorization": f"Bearer {credentials.access_token}",
            "Content-Type": "application/json"
        }
        
        employees = []
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/{self.company_id}/V1/Employees",
                headers=headers,
                params={"EmploymentStatusXRefCode": "Active"},
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                employees = data.get("Data", [])
            else:
                logger.error(f"Dayforce employee sync failed: {response.text}")
        
        return [
            {
                "provider_employee_id": emp.get("XRefCode"),
                "employee_number": emp.get("EmployeeNumber"),
                "first_name": emp.get("FirstName"),
                "last_name": emp.get("LastName"),
                "email": emp.get("WorkEmail"),
                "status": emp.get("EmploymentStatus", {}).get("XRefCode")
            }
            for emp in employees
        ]
    
    async def submit_timesheet(self, credentials: ProviderCredentials, timesheet_data: Dict) -> Dict:
        headers = {
            "Authorization": f"Bearer {credentials.access_token}",
            "Content-Type": "application/json"
        }
        
        employee_xref = timesheet_data.get("provider_employee_id")
        
        payload = {
            "EmployeeXRefCode": employee_xref,
            "TimeStart": f"{timesheet_data['work_date']}T00:00:00",
            "TimeEnd": f"{timesheet_data['work_date']}T23:59:59",
            "Hours": timesheet_data["total_hours"]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base}/{self.company_id}/V1/Employees/{employee_xref}/EmployeePunches",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "response": response.json() if response.content else {}
                }
            else:
                return {
                    "success": False,
                    "error": response.text
                }


class ADPProvider(PayrollProviderBase):
    """ADP Workforce Now API integration for North America enterprise"""
    
    def __init__(self):
        self.client_id = os.getenv("ADP_CLIENT_ID", "")
        self.client_secret = os.getenv("ADP_CLIENT_SECRET", "")
        self.api_base = "https://api.adp.com"
    
    @property
    def provider_name(self) -> str:
        return "adp"
    
    @property
    def oauth_authorize_url(self) -> str:
        return "https://accounts.adp.com/auth/oauth/v2/authorize"
    
    @property
    def oauth_token_url(self) -> str:
        return "https://accounts.adp.com/auth/oauth/v2/token"
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.oauth_token_url,
                data={
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"ADP token exchange failed: {response.text}")
            
            data = response.json()
            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token"),
                "expires_in": data.get("expires_in", 3600)
            }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.oauth_token_url,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"ADP token refresh failed: {response.text}")
            
            data = response.json()
            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token", refresh_token),
                "expires_in": data.get("expires_in", 3600)
            }
    
    async def sync_employees(self, credentials: ProviderCredentials) -> List[Dict]:
        headers = {
            "Authorization": f"Bearer {credentials.access_token}",
            "Content-Type": "application/json"
        }
        
        employees = []
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/hr/v2/workers",
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                employees = data.get("workers", [])
            else:
                logger.error(f"ADP employee sync failed: {response.text}")
        
        return [
            {
                "provider_employee_id": emp.get("associateOID"),
                "first_name": emp.get("legalName", {}).get("givenName"),
                "last_name": emp.get("legalName", {}).get("familyName"),
                "email": emp.get("businessCommunication", {}).get("emails", [{}])[0].get("emailUri"),
                "status": emp.get("workerStatus", {}).get("statusCode", {}).get("codeValue")
            }
            for emp in employees
        ]
    
    async def submit_timesheet(self, credentials: ProviderCredentials, timesheet_data: Dict) -> Dict:
        headers = {
            "Authorization": f"Bearer {credentials.access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "events": [{
                "data": {
                    "eventContext": {
                        "worker": {
                            "associateOID": timesheet_data.get("provider_employee_id")
                        }
                    },
                    "transform": {
                        "timeCardDocument": {
                            "timeCardEntry": [{
                                "entryDate": timesheet_data["work_date"],
                                "quantity": timesheet_data["total_hours"],
                                "timeTypeCode": {
                                    "codeValue": self._map_work_type(timesheet_data.get("work_type"))
                                }
                            }]
                        }
                    }
                }
            }]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base}/events/time/v1/time-cards.create",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                return {
                    "success": True,
                    "provider_timesheet_id": data.get("events", [{}])[0].get("data", {}).get("eventID"),
                    "response": data
                }
            else:
                return {
                    "success": False,
                    "error": response.text
                }
    
    def _map_work_type(self, work_type: str) -> str:
        mapping = {
            "on_site": "HRS",
            "continental": "SHIFT",
            "route_based": "FIELD"
        }
        return mapping.get(work_type, "HRS")


# Provider Registry
PAYROLL_PROVIDERS = {
    "gusto": GustoProvider(),
    "dayforce": DayforceProvider(),
    "adp": ADPProvider(),
}


def get_provider(provider_name: str) -> PayrollProviderBase:
    """Get a payroll provider by name"""
    provider = PAYROLL_PROVIDERS.get(provider_name.lower())
    if not provider:
        raise ValueError(f"Unknown provider: {provider_name}")
    return provider


def get_all_providers() -> List[Dict]:
    """Get list of all available providers"""
    return [
        {
            "id": "gusto",
            "name": "Gusto",
            "description": "US small business payroll",
            "oauth_supported": True,
            "regions": ["US"]
        },
        {
            "id": "dayforce",
            "name": "Ceridian Dayforce",
            "description": "Canadian market leader for hourly workforce",
            "oauth_supported": False,  # Uses username/password
            "regions": ["CA", "US"]
        },
        {
            "id": "adp",
            "name": "ADP Workforce Now",
            "description": "Enterprise payroll for North America",
            "oauth_supported": True,
            "regions": ["US", "CA"]
        }
    ]
