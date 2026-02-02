"""
Payroll Export Service
Unified export system supporting multiple payroll providers:
- Generic CSV/JSON (universal)
- Gusto format
- Ceridian Dayforce format  
- ADP Workforce Now format

Architecture: Adapter pattern for easy provider additions
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, asdict
import csv
import io
import json


@dataclass
class PayrollEntry:
    """Unified payroll entry format"""
    employee_id: str
    employee_name: str
    employee_email: str
    
    # Time period
    pay_period_start: str
    pay_period_end: str
    work_date: str
    
    # Hours
    regular_hours: float
    overtime_hours: float
    total_hours: float
    
    # Pay
    hourly_rate: float
    regular_pay: float
    overtime_pay: float
    gross_pay: float
    
    # Classification
    work_type: str  # on_site, continental, route_based
    department: str
    job_title: str
    
    # Route-specific (optional)
    stops_completed: int = 0
    route_name: str = ""
    
    # Metadata
    shift_id: str = ""
    workplace_name: str = ""
    province: str = ""


class PayrollAdapter(ABC):
    """Base adapter for payroll system exports"""
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def file_extension(self) -> str:
        pass
    
    @abstractmethod
    def transform(self, entries: List[PayrollEntry]) -> str:
        """Transform unified entries to provider-specific format"""
        pass
    
    @abstractmethod
    def get_headers(self) -> List[str]:
        """Get column headers for CSV export"""
        pass


class GenericCSVAdapter(PayrollAdapter):
    """Universal CSV format compatible with most payroll systems"""
    
    @property
    def provider_name(self) -> str:
        return "Generic CSV"
    
    @property
    def file_extension(self) -> str:
        return "csv"
    
    def get_headers(self) -> List[str]:
        return [
            "Employee ID", "Employee Name", "Email",
            "Pay Period Start", "Pay Period End", "Work Date",
            "Regular Hours", "Overtime Hours", "Total Hours",
            "Hourly Rate", "Regular Pay", "Overtime Pay", "Gross Pay",
            "Work Type", "Department", "Job Title",
            "Workplace", "Province"
        ]
    
    def transform(self, entries: List[PayrollEntry]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(self.get_headers())
        
        for entry in entries:
            writer.writerow([
                entry.employee_id,
                entry.employee_name,
                entry.employee_email,
                entry.pay_period_start,
                entry.pay_period_end,
                entry.work_date,
                f"{entry.regular_hours:.2f}",
                f"{entry.overtime_hours:.2f}",
                f"{entry.total_hours:.2f}",
                f"{entry.hourly_rate:.2f}",
                f"{entry.regular_pay:.2f}",
                f"{entry.overtime_pay:.2f}",
                f"{entry.gross_pay:.2f}",
                entry.work_type,
                entry.department,
                entry.job_title,
                entry.workplace_name,
                entry.province
            ])
        
        return output.getvalue()


class GenericJSONAdapter(PayrollAdapter):
    """Universal JSON format for API integrations"""
    
    @property
    def provider_name(self) -> str:
        return "Generic JSON"
    
    @property
    def file_extension(self) -> str:
        return "json"
    
    def get_headers(self) -> List[str]:
        return []  # JSON doesn't use headers
    
    def transform(self, entries: List[PayrollEntry]) -> str:
        data = {
            "export_date": datetime.now(timezone.utc).isoformat(),
            "entry_count": len(entries),
            "entries": [asdict(e) for e in entries]
        }
        return json.dumps(data, indent=2)


class GustoAdapter(PayrollAdapter):
    """
    Gusto-compatible export format
    API: docs.gusto.com
    Format matches Gusto Time Tracking API structure
    """
    
    @property
    def provider_name(self) -> str:
        return "Gusto"
    
    @property
    def file_extension(self) -> str:
        return "json"
    
    def get_headers(self) -> List[str]:
        return []
    
    def transform(self, entries: List[PayrollEntry]) -> str:
        """Transform to Gusto timesheet format"""
        timesheets = []
        
        for entry in entries:
            timesheet = {
                "employee_uuid": entry.employee_id,
                "check_date": entry.work_date,
                "hours": entry.total_hours,
                "earning_type": self._map_work_type(entry.work_type),
                "rate": entry.hourly_rate,
                "description": f"{entry.job_title} - {entry.workplace_name}",
                "metadata": {
                    "source": "hr_bank",
                    "shift_id": entry.shift_id,
                    "regular_hours": entry.regular_hours,
                    "overtime_hours": entry.overtime_hours
                }
            }
            timesheets.append(timesheet)
        
        return json.dumps({
            "time_sheets": timesheets,
            "exported_at": datetime.now(timezone.utc).isoformat()
        }, indent=2)
    
    def _map_work_type(self, work_type: str) -> str:
        mapping = {
            "on_site": "regular",
            "continental": "regular",
            "route_based": "regular"
        }
        return mapping.get(work_type, "regular")


class CeridianDayforceAdapter(PayrollAdapter):
    """
    Ceridian Dayforce-compatible export format
    API: help.dayforce.com
    Format matches Dayforce Employee Punches structure
    """
    
    @property
    def provider_name(self) -> str:
        return "Ceridian Dayforce"
    
    @property
    def file_extension(self) -> str:
        return "json"
    
    def get_headers(self) -> List[str]:
        return []
    
    def transform(self, entries: List[PayrollEntry]) -> str:
        """Transform to Dayforce punch format"""
        punches = []
        
        for entry in entries:
            # Dayforce expects punch in/out records
            punch = {
                "EmployeeXRefCode": entry.employee_id,
                "PunchDate": entry.work_date,
                "Hours": entry.total_hours,
                "PayCode": self._map_pay_code(entry.work_type, entry.overtime_hours > 0),
                "PayRate": entry.hourly_rate,
                "Department": entry.department,
                "Position": entry.job_title,
                "Location": entry.workplace_name,
                "Province": entry.province,
                "OvertimeHours": entry.overtime_hours,
                "RegularHours": entry.regular_hours,
                "Comments": f"Imported from HR Bank - Shift: {entry.shift_id}"
            }
            punches.append(punch)
        
        return json.dumps({
            "EmployeePunches": punches,
            "ExportTimestamp": datetime.now(timezone.utc).isoformat()
        }, indent=2)
    
    def _map_pay_code(self, work_type: str, has_overtime: bool) -> str:
        if has_overtime:
            return "OT"
        mapping = {
            "on_site": "REG",
            "continental": "CONT",
            "route_based": "FIELD"
        }
        return mapping.get(work_type, "REG")


class ADPAdapter(PayrollAdapter):
    """
    ADP Workforce Now-compatible export format
    API: developers.adp.com
    Format matches ADP Time Cards structure
    """
    
    @property
    def provider_name(self) -> str:
        return "ADP Workforce Now"
    
    @property
    def file_extension(self) -> str:
        return "json"
    
    def get_headers(self) -> List[str]:
        return []
    
    def transform(self, entries: List[PayrollEntry]) -> str:
        """Transform to ADP time card format"""
        time_cards = []
        
        for entry in entries:
            time_card = {
                "associateOID": entry.employee_id,
                "timePeriod": {
                    "startDate": entry.pay_period_start,
                    "endDate": entry.pay_period_end
                },
                "dailyTotals": [{
                    "entryDate": entry.work_date,
                    "hoursWorked": {
                        "hoursQuantity": entry.regular_hours,
                        "unitCode": "Hour"
                    },
                    "overtimeHours": {
                        "hoursQuantity": entry.overtime_hours,
                        "unitCode": "Hour"
                    },
                    "payRate": {
                        "amountValue": entry.hourly_rate,
                        "currencyCode": "CAD"
                    },
                    "earningCode": self._map_earning_code(entry.work_type)
                }],
                "workerInfo": {
                    "workerName": entry.employee_name,
                    "emailAddress": entry.employee_email,
                    "jobTitle": entry.job_title,
                    "department": entry.department,
                    "workLocation": entry.workplace_name
                },
                "_metadata": {
                    "source": "hr_bank",
                    "shiftId": entry.shift_id,
                    "exportedAt": datetime.now(timezone.utc).isoformat()
                }
            }
            time_cards.append(time_card)
        
        return json.dumps({
            "timeCards": time_cards,
            "_modificationTypeCode": "Append"
        }, indent=2)
    
    def _map_earning_code(self, work_type: str) -> str:
        mapping = {
            "on_site": "REG",
            "continental": "SHIFT",
            "route_based": "FIELD"
        }
        return mapping.get(work_type, "REG")


class ADPCSVAdapter(PayrollAdapter):
    """ADP CSV import format for manual upload"""
    
    @property
    def provider_name(self) -> str:
        return "ADP CSV Import"
    
    @property
    def file_extension(self) -> str:
        return "csv"
    
    def get_headers(self) -> List[str]:
        return [
            "File Number", "Employee Name", "Temp Dept",
            "Temp Rate", "Reg Hours", "O/T Hours",
            "Hours 3 Code", "Hours 3 Amount",
            "Earnings 3 Code", "Earnings 3 Amount"
        ]
    
    def transform(self, entries: List[PayrollEntry]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(self.get_headers())
        
        for entry in entries:
            writer.writerow([
                entry.employee_id,
                entry.employee_name,
                entry.department,
                f"{entry.hourly_rate:.2f}",
                f"{entry.regular_hours:.2f}",
                f"{entry.overtime_hours:.2f}",
                "",  # Hours 3 Code
                "",  # Hours 3 Amount
                "",  # Earnings 3 Code
                ""   # Earnings 3 Amount
            ])
        
        return output.getvalue()


class DayforceCSVAdapter(PayrollAdapter):
    """Ceridian Dayforce CSV import format"""
    
    @property
    def provider_name(self) -> str:
        return "Dayforce CSV Import"
    
    @property
    def file_extension(self) -> str:
        return "csv"
    
    def get_headers(self) -> List[str]:
        return [
            "Employee Number", "Employee Name", "Date",
            "Pay Code", "Hours", "Rate",
            "Department", "Position", "Location"
        ]
    
    def transform(self, entries: List[PayrollEntry]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(self.get_headers())
        
        for entry in entries:
            # Regular hours entry
            if entry.regular_hours > 0:
                writer.writerow([
                    entry.employee_id,
                    entry.employee_name,
                    entry.work_date,
                    "REG",
                    f"{entry.regular_hours:.2f}",
                    f"{entry.hourly_rate:.2f}",
                    entry.department,
                    entry.job_title,
                    entry.workplace_name
                ])
            
            # Overtime hours entry (separate line)
            if entry.overtime_hours > 0:
                writer.writerow([
                    entry.employee_id,
                    entry.employee_name,
                    entry.work_date,
                    "OT",
                    f"{entry.overtime_hours:.2f}",
                    f"{entry.hourly_rate * 1.5:.2f}",  # OT rate
                    entry.department,
                    entry.job_title,
                    entry.workplace_name
                ])
        
        return output.getvalue()


# Adapter Registry
PAYROLL_ADAPTERS = {
    "generic_csv": GenericCSVAdapter(),
    "generic_json": GenericJSONAdapter(),
    "gusto": GustoAdapter(),
    "gusto_json": GustoAdapter(),
    "dayforce": CeridianDayforceAdapter(),
    "dayforce_json": CeridianDayforceAdapter(),
    "dayforce_csv": DayforceCSVAdapter(),
    "adp": ADPAdapter(),
    "adp_json": ADPAdapter(),
    "adp_csv": ADPCSVAdapter(),
}


def get_available_formats() -> List[Dict]:
    """Get list of available export formats"""
    formats = []
    seen = set()
    
    for key, adapter in PAYROLL_ADAPTERS.items():
        if adapter.provider_name not in seen:
            formats.append({
                "format_id": key,
                "provider_name": adapter.provider_name,
                "file_extension": adapter.file_extension,
                "description": f"Export for {adapter.provider_name}"
            })
            seen.add(adapter.provider_name)
    
    return formats


def export_payroll(entries: List[PayrollEntry], format_id: str) -> tuple:
    """
    Export payroll entries in specified format
    
    Returns:
        tuple: (content: str, filename: str, content_type: str)
    """
    adapter = PAYROLL_ADAPTERS.get(format_id)
    if not adapter:
        raise ValueError(f"Unknown format: {format_id}")
    
    content = adapter.transform(entries)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"payroll_export_{format_id}_{timestamp}.{adapter.file_extension}"
    
    content_type = "text/csv" if adapter.file_extension == "csv" else "application/json"
    
    return content, filename, content_type
