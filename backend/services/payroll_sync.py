"""
Payroll Sync Service - Direct API Integration
Phase 2: Gusto API
Phase 3: Ceridian Dayforce API
Phase 4: ADP Workforce Now API

All integrations run in MOCK mode by default.
Real API calls require credentials configured in environment variables.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
import json
import logging
import os
import httpx
import asyncio

from services.payroll_export import PayrollEntry

logger = logging.getLogger(__name__)


@dataclass
class SyncResult:
    """Result of a payroll sync operation"""
    success: bool
    provider: str
    mode: str  # "mock" or "live"
    records_synced: int
    records_failed: int
    batch_id: str
    timestamp: str
    details: Dict[str, Any]
    errors: List[str]


class PayrollSyncProvider(ABC):
    """Base class for payroll system API integrations"""
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def api_version(self) -> str:
        pass
    
    @abstractmethod
    async def authenticate(self) -> bool:
        """Authenticate with the provider"""
        pass
    
    @abstractmethod
    async def sync_timesheets(self, entries: List[PayrollEntry]) -> SyncResult:
        """Sync timesheet entries to the provider"""
        pass
    
    @abstractmethod
    async def get_employees(self) -> List[Dict]:
        """Get list of employees from the provider"""
        pass
    
    @abstractmethod
    async def validate_connection(self) -> Dict:
        """Validate the connection to the provider"""
        pass
    
    @property
    def is_mock_mode(self) -> bool:
        """Check if running in mock mode"""
        return True  # Default to mock mode


class GustoSyncProvider(PayrollSyncProvider):
    """
    Gusto API Integration (MOCK MODE)
    
    Real integration requires:
    - GUSTO_CLIENT_ID
    - GUSTO_CLIENT_SECRET
    - GUSTO_ACCESS_TOKEN (OAuth)
    
    API Docs: https://docs.gusto.com/
    """
    
    def __init__(self):
        self.client_id = os.environ.get("GUSTO_CLIENT_ID")
        self.client_secret = os.environ.get("GUSTO_CLIENT_SECRET")
        self.access_token = os.environ.get("GUSTO_ACCESS_TOKEN")
        self.base_url = "https://api.gusto.com/v1"
        self._mock_mode = not all([self.client_id, self.client_secret, self.access_token])
    
    @property
    def provider_name(self) -> str:
        return "Gusto"
    
    @property
    def api_version(self) -> str:
        return "v1"
    
    @property
    def is_mock_mode(self) -> bool:
        return self._mock_mode
    
    async def authenticate(self) -> bool:
        if self._mock_mode:
            logger.info("[MOCK] Gusto authentication successful")
            return True
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/me",
                    headers={"Authorization": f"Bearer {self.access_token}"}
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Gusto authentication failed: {e}")
            return False
    
    async def validate_connection(self) -> Dict:
        is_connected = await self.authenticate()
        return {
            "provider": self.provider_name,
            "connected": is_connected,
            "mode": "mock" if self._mock_mode else "live",
            "api_version": self.api_version,
            "features": [
                "timesheet_sync",
                "employee_import",
                "pay_period_management",
                "earning_types"
            ]
        }
    
    async def get_employees(self) -> List[Dict]:
        if self._mock_mode:
            return self._generate_mock_employees()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/companies/{{company_id}}/employees",
                    headers={"Authorization": f"Bearer {self.access_token}"}
                )
                if response.status_code == 200:
                    return response.json()
                return []
        except Exception as e:
            logger.error(f"Failed to get Gusto employees: {e}")
            return []
    
    async def sync_timesheets(self, entries: List[PayrollEntry]) -> SyncResult:
        batch_id = f"gusto_batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if self._mock_mode:
            return await self._mock_sync(entries, batch_id)
        
        # Real API implementation would go here
        return await self._mock_sync(entries, batch_id)
    
    async def _mock_sync(self, entries: List[PayrollEntry], batch_id: str) -> SyncResult:
        """Mock sync simulation"""
        await asyncio.sleep(0.5)  # Simulate API latency
        
        synced = []
        failed = []
        
        for entry in entries:
            # Simulate 95% success rate
            import random
            if random.random() < 0.95:
                synced.append({
                    "employee_uuid": entry.employee_id,
                    "gusto_timesheet_id": f"ts_{entry.shift_id[:8]}",
                    "hours": entry.total_hours,
                    "check_date": entry.work_date,
                    "status": "submitted"
                })
            else:
                failed.append({
                    "employee_id": entry.employee_id,
                    "error": "Employee not found in Gusto"
                })
        
        return SyncResult(
            success=len(failed) == 0,
            provider=self.provider_name,
            mode="mock",
            records_synced=len(synced),
            records_failed=len(failed),
            batch_id=batch_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            details={
                "synced_records": synced,
                "company_payroll_status": "processing",
                "next_pay_date": "2026-02-15"
            },
            errors=[f["error"] for f in failed]
        )
    
    def _generate_mock_employees(self) -> List[Dict]:
        return [
            {"uuid": "emp_001", "first_name": "John", "last_name": "Doe", "email": "john@example.com"},
            {"uuid": "emp_002", "first_name": "Jane", "last_name": "Smith", "email": "jane@example.com"},
            {"uuid": "emp_003", "first_name": "Bob", "last_name": "Wilson", "email": "bob@example.com"}
        ]


class CeridianDayforceSyncProvider(PayrollSyncProvider):
    """
    Ceridian Dayforce API Integration (MOCK MODE)
    
    Real integration requires:
    - DAYFORCE_CLIENT_NAMESPACE
    - DAYFORCE_USERNAME
    - DAYFORCE_PASSWORD
    - DAYFORCE_CLIENT_ID (OAuth)
    
    API Docs: https://developers.dayforce.com/
    """
    
    def __init__(self):
        self.namespace = os.environ.get("DAYFORCE_CLIENT_NAMESPACE")
        self.username = os.environ.get("DAYFORCE_USERNAME")
        self.password = os.environ.get("DAYFORCE_PASSWORD")
        self.base_url = f"https://dfin-{self.namespace or 'demo'}.dayforcehcm.com/Api"
        self._mock_mode = not all([self.namespace, self.username, self.password])
    
    @property
    def provider_name(self) -> str:
        return "Ceridian Dayforce"
    
    @property
    def api_version(self) -> str:
        return "v1"
    
    @property
    def is_mock_mode(self) -> bool:
        return self._mock_mode
    
    async def authenticate(self) -> bool:
        if self._mock_mode:
            logger.info("[MOCK] Dayforce authentication successful")
            return True
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{self.namespace}/V1/Employees",
                    auth=(self.username, self.password),
                    params={"pageSize": 1}
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Dayforce authentication failed: {e}")
            return False
    
    async def validate_connection(self) -> Dict:
        is_connected = await self.authenticate()
        return {
            "provider": self.provider_name,
            "connected": is_connected,
            "mode": "mock" if self._mock_mode else "live",
            "api_version": self.api_version,
            "namespace": self.namespace or "demo",
            "features": [
                "employee_punches",
                "time_management",
                "pay_codes",
                "labor_allocation",
                "schedule_import"
            ]
        }
    
    async def get_employees(self) -> List[Dict]:
        if self._mock_mode:
            return self._generate_mock_employees()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{self.namespace}/V1/Employees",
                    auth=(self.username, self.password)
                )
                if response.status_code == 200:
                    return response.json().get("Data", [])
                return []
        except Exception as e:
            logger.error(f"Failed to get Dayforce employees: {e}")
            return []
    
    async def sync_timesheets(self, entries: List[PayrollEntry]) -> SyncResult:
        batch_id = f"dayforce_batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if self._mock_mode:
            return await self._mock_sync(entries, batch_id)
        
        return await self._mock_sync(entries, batch_id)
    
    async def _mock_sync(self, entries: List[PayrollEntry], batch_id: str) -> SyncResult:
        """Mock sync simulation for Dayforce"""
        await asyncio.sleep(0.6)  # Simulate API latency
        
        synced = []
        failed = []
        
        for entry in entries:
            import random
            if random.random() < 0.93:  # 93% success rate
                synced.append({
                    "EmployeeXRefCode": entry.employee_id,
                    "DayforceImportId": f"df_{entry.shift_id[:8]}",
                    "PunchDate": entry.work_date,
                    "Hours": entry.total_hours,
                    "PayCode": "REG" if entry.overtime_hours == 0 else "OT",
                    "ImportStatus": "Pending Approval"
                })
            else:
                failed.append({
                    "employee_id": entry.employee_id,
                    "error": "Pay code not configured in Dayforce"
                })
        
        return SyncResult(
            success=len(failed) == 0,
            provider=self.provider_name,
            mode="mock",
            records_synced=len(synced),
            records_failed=len(failed),
            batch_id=batch_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            details={
                "synced_punches": synced,
                "import_status": "submitted",
                "approval_required": True,
                "pay_period": {
                    "start": entries[0].pay_period_start if entries else None,
                    "end": entries[0].pay_period_end if entries else None
                }
            },
            errors=[f["error"] for f in failed]
        )
    
    def _generate_mock_employees(self) -> List[Dict]:
        return [
            {"XRefCode": "EMP001", "DisplayName": "Alice Johnson", "Email": "alice@company.com"},
            {"XRefCode": "EMP002", "DisplayName": "Charlie Brown", "Email": "charlie@company.com"},
            {"XRefCode": "EMP003", "DisplayName": "Diana Ross", "Email": "diana@company.com"}
        ]


class ADPWorkforceNowSyncProvider(PayrollSyncProvider):
    """
    ADP Workforce Now API Integration (MOCK MODE)
    
    Real integration requires:
    - ADP_CLIENT_ID
    - ADP_CLIENT_SECRET
    - ADP_CERT_PATH (SSL certificate)
    - ADP_KEY_PATH (SSL private key)
    
    API Docs: https://developers.adp.com/
    """
    
    def __init__(self):
        self.client_id = os.environ.get("ADP_CLIENT_ID")
        self.client_secret = os.environ.get("ADP_CLIENT_SECRET")
        self.cert_path = os.environ.get("ADP_CERT_PATH")
        self.key_path = os.environ.get("ADP_KEY_PATH")
        self.base_url = "https://api.adp.com"
        self._mock_mode = not all([self.client_id, self.client_secret])
        self._access_token = None
    
    @property
    def provider_name(self) -> str:
        return "ADP Workforce Now"
    
    @property
    def api_version(self) -> str:
        return "v2"
    
    @property
    def is_mock_mode(self) -> bool:
        return self._mock_mode
    
    async def authenticate(self) -> bool:
        if self._mock_mode:
            logger.info("[MOCK] ADP authentication successful")
            self._access_token = "mock_token_12345"
            return True
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/auth/oauth/v2/token",
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret
                    }
                )
                if response.status_code == 200:
                    self._access_token = response.json().get("access_token")
                    return True
                return False
        except Exception as e:
            logger.error(f"ADP authentication failed: {e}")
            return False
    
    async def validate_connection(self) -> Dict:
        is_connected = await self.authenticate()
        return {
            "provider": self.provider_name,
            "connected": is_connected,
            "mode": "mock" if self._mock_mode else "live",
            "api_version": self.api_version,
            "features": [
                "time_cards",
                "worker_management",
                "pay_data",
                "hr_import",
                "benefits_sync"
            ],
            "marketplace_partner": True
        }
    
    async def get_employees(self) -> List[Dict]:
        if self._mock_mode:
            return self._generate_mock_employees()
        
        if not self._access_token:
            await self.authenticate()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/hr/v2/workers",
                    headers={"Authorization": f"Bearer {self._access_token}"}
                )
                if response.status_code == 200:
                    return response.json().get("workers", [])
                return []
        except Exception as e:
            logger.error(f"Failed to get ADP employees: {e}")
            return []
    
    async def sync_timesheets(self, entries: List[PayrollEntry]) -> SyncResult:
        batch_id = f"adp_batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if self._mock_mode:
            return await self._mock_sync(entries, batch_id)
        
        return await self._mock_sync(entries, batch_id)
    
    async def _mock_sync(self, entries: List[PayrollEntry], batch_id: str) -> SyncResult:
        """Mock sync simulation for ADP"""
        await asyncio.sleep(0.7)  # Simulate API latency
        
        synced = []
        failed = []
        
        for entry in entries:
            import random
            if random.random() < 0.97:  # 97% success rate
                synced.append({
                    "associateOID": entry.employee_id,
                    "adpTimeCardId": f"tc_{entry.shift_id[:8]}",
                    "timePeriod": {
                        "startDate": entry.pay_period_start,
                        "endDate": entry.pay_period_end
                    },
                    "dailyTotals": {
                        "entryDate": entry.work_date,
                        "hoursWorked": entry.regular_hours,
                        "overtimeHours": entry.overtime_hours
                    },
                    "importStatus": "accepted"
                })
            else:
                failed.append({
                    "employee_id": entry.employee_id,
                    "error": "Worker OID not found in ADP organization"
                })
        
        return SyncResult(
            success=len(failed) == 0,
            provider=self.provider_name,
            mode="mock",
            records_synced=len(synced),
            records_failed=len(failed),
            batch_id=batch_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            details={
                "time_cards_submitted": synced,
                "batch_status": "processing",
                "estimated_completion": "2-4 hours",
                "currency": "CAD",
                "organization_oid": "mock_org_123"
            },
            errors=[f["error"] for f in failed]
        )
    
    def _generate_mock_employees(self) -> List[Dict]:
        return [
            {"associateOID": "G1234567", "workerName": "Emily Davis", "email": "emily@company.com"},
            {"associateOID": "G2345678", "workerName": "Frank Miller", "email": "frank@company.com"},
            {"associateOID": "G3456789", "workerName": "Grace Lee", "email": "grace@company.com"}
        ]


# Provider Registry
PAYROLL_SYNC_PROVIDERS = {
    "gusto": GustoSyncProvider,
    "dayforce": CeridianDayforceSyncProvider,
    "adp": ADPWorkforceNowSyncProvider
}


def get_sync_provider(provider_id: str) -> Optional[PayrollSyncProvider]:
    """Get a payroll sync provider instance"""
    provider_class = PAYROLL_SYNC_PROVIDERS.get(provider_id.lower())
    if provider_class:
        return provider_class()
    return None


def get_available_sync_providers() -> List[Dict]:
    """Get list of available sync providers"""
    providers = []
    for key, provider_class in PAYROLL_SYNC_PROVIDERS.items():
        provider = provider_class()
        providers.append({
            "provider_id": key,
            "provider_name": provider.provider_name,
            "api_version": provider.api_version,
            "is_mock_mode": provider.is_mock_mode,
            "status": "mock" if provider.is_mock_mode else "configured"
        })
    return providers


async def sync_to_provider(
    provider_id: str,
    entries: List[PayrollEntry]
) -> SyncResult:
    """
    Sync payroll entries to a specific provider
    
    Args:
        provider_id: One of 'gusto', 'dayforce', 'adp'
        entries: List of PayrollEntry objects to sync
    
    Returns:
        SyncResult with status and details
    """
    provider = get_sync_provider(provider_id)
    if not provider:
        return SyncResult(
            success=False,
            provider=provider_id,
            mode="error",
            records_synced=0,
            records_failed=len(entries),
            batch_id="",
            timestamp=datetime.now(timezone.utc).isoformat(),
            details={},
            errors=[f"Unknown provider: {provider_id}"]
        )
    
    # Authenticate first
    auth_success = await provider.authenticate()
    if not auth_success:
        return SyncResult(
            success=False,
            provider=provider.provider_name,
            mode="mock" if provider.is_mock_mode else "live",
            records_synced=0,
            records_failed=len(entries),
            batch_id="",
            timestamp=datetime.now(timezone.utc).isoformat(),
            details={},
            errors=["Authentication failed"]
        )
    
    # Sync timesheets
    return await provider.sync_timesheets(entries)
