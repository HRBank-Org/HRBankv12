"""
Jurisdiction Detection and Compliance Rules Engine

This module automatically determines the applicable labor jurisdiction 
based on the work location (role/workplace address). Compliance is 
determined by WHERE work is performed, not where the company is headquartered.

Example: A US company hiring in Ontario → Canadian ESA applies to that role
"""

from typing import Dict, Optional, List
import re

# ==================== JURISDICTION CODES ====================
# Format: COUNTRY-STATE/PROVINCE (ISO 3166-2)
# Examples: CA-ON (Canada-Ontario), US-TX (USA-Texas), IN-MH (India-Maharashtra)

# ==================== SUPPORTED JURISDICTIONS ====================

JURISDICTIONS = {
    # CANADA - Provinces & Territories
    "CA-AB": {"name": "Alberta", "country": "Canada", "country_code": "CA"},
    "CA-BC": {"name": "British Columbia", "country": "Canada", "country_code": "CA"},
    "CA-MB": {"name": "Manitoba", "country": "Canada", "country_code": "CA"},
    "CA-NB": {"name": "New Brunswick", "country": "Canada", "country_code": "CA"},
    "CA-NL": {"name": "Newfoundland and Labrador", "country": "Canada", "country_code": "CA"},
    "CA-NS": {"name": "Nova Scotia", "country": "Canada", "country_code": "CA"},
    "CA-NT": {"name": "Northwest Territories", "country": "Canada", "country_code": "CA"},
    "CA-NU": {"name": "Nunavut", "country": "Canada", "country_code": "CA"},
    "CA-ON": {"name": "Ontario", "country": "Canada", "country_code": "CA"},
    "CA-PE": {"name": "Prince Edward Island", "country": "Canada", "country_code": "CA"},
    "CA-QC": {"name": "Quebec", "country": "Canada", "country_code": "CA"},
    "CA-SK": {"name": "Saskatchewan", "country": "Canada", "country_code": "CA"},
    "CA-YT": {"name": "Yukon", "country": "Canada", "country_code": "CA"},
    
    # USA - States (major markets first)
    "US-CA": {"name": "California", "country": "United States", "country_code": "US"},
    "US-TX": {"name": "Texas", "country": "United States", "country_code": "US"},
    "US-NY": {"name": "New York", "country": "United States", "country_code": "US"},
    "US-FL": {"name": "Florida", "country": "United States", "country_code": "US"},
    "US-IL": {"name": "Illinois", "country": "United States", "country_code": "US"},
    "US-PA": {"name": "Pennsylvania", "country": "United States", "country_code": "US"},
    "US-OH": {"name": "Ohio", "country": "United States", "country_code": "US"},
    "US-GA": {"name": "Georgia", "country": "United States", "country_code": "US"},
    "US-NC": {"name": "North Carolina", "country": "United States", "country_code": "US"},
    "US-MI": {"name": "Michigan", "country": "United States", "country_code": "US"},
    "US-NJ": {"name": "New Jersey", "country": "United States", "country_code": "US"},
    "US-VA": {"name": "Virginia", "country": "United States", "country_code": "US"},
    "US-WA": {"name": "Washington", "country": "United States", "country_code": "US"},
    "US-AZ": {"name": "Arizona", "country": "United States", "country_code": "US"},
    "US-MA": {"name": "Massachusetts", "country": "United States", "country_code": "US"},
    "US-CO": {"name": "Colorado", "country": "United States", "country_code": "US"},
    # Add more US states as needed...
    
    # INDIA - States (major markets)
    "IN-MH": {"name": "Maharashtra", "country": "India", "country_code": "IN"},
    "IN-KA": {"name": "Karnataka", "country": "India", "country_code": "IN"},
    "IN-TN": {"name": "Tamil Nadu", "country": "India", "country_code": "IN"},
    "IN-DL": {"name": "Delhi", "country": "India", "country_code": "IN"},
    "IN-GJ": {"name": "Gujarat", "country": "India", "country_code": "IN"},
    "IN-HR": {"name": "Haryana", "country": "India", "country_code": "IN"},
    "IN-UP": {"name": "Uttar Pradesh", "country": "India", "country_code": "IN"},
    "IN-WB": {"name": "West Bengal", "country": "India", "country_code": "IN"},
    "IN-TG": {"name": "Telangana", "country": "India", "country_code": "IN"},
    # Add more Indian states as needed...
    
    # UK
    "GB-ENG": {"name": "England", "country": "United Kingdom", "country_code": "GB"},
    "GB-SCT": {"name": "Scotland", "country": "United Kingdom", "country_code": "GB"},
    "GB-WLS": {"name": "Wales", "country": "United Kingdom", "country_code": "GB"},
    "GB-NIR": {"name": "Northern Ireland", "country": "United Kingdom", "country_code": "GB"},
    
    # EU Countries (country-level compliance)
    "DE": {"name": "Germany", "country": "Germany", "country_code": "DE"},
    "FR": {"name": "France", "country": "France", "country_code": "FR"},
    "NL": {"name": "Netherlands", "country": "Netherlands", "country_code": "NL"},
    "IE": {"name": "Ireland", "country": "Ireland", "country_code": "IE"},
    
    # AUSTRALIA - States
    "AU-NSW": {"name": "New South Wales", "country": "Australia", "country_code": "AU"},
    "AU-VIC": {"name": "Victoria", "country": "Australia", "country_code": "AU"},
    "AU-QLD": {"name": "Queensland", "country": "Australia", "country_code": "AU"},
}


# ==================== COMPLIANCE RULES BY JURISDICTION ====================

COMPLIANCE_RULES = {
    # CANADA
    "CA-ON": {
        "jurisdiction_code": "CA-ON",
        "jurisdiction_name": "Ontario, Canada",
        "primary_legislation": ["Employment Standards Act (ESA)", "Occupational Health and Safety Act (OHSA)"],
        "data_privacy": ["PIPEDA", "PHIPA (health sector)"],
        "minimum_wage": 16.55,  # As of Oct 2024
        "currency": "CAD",
        "overtime_threshold_hours": 44,  # Weekly
        "overtime_multiplier": 1.5,
        "vacation_days_minimum": 10,  # 2 weeks
        "statutory_holidays": 9,
        "notice_period_rules": "Based on length of service",
        "youth_employment_rules": {
            "minimum_age": 14,
            "restricted_hours": True,
            "work_permit_required": False
        },
        "compliance_badges": ["ESA", "OHSA", "PIPEDA"],
        "enabled": True
    },
    "CA-BC": {
        "jurisdiction_code": "CA-BC",
        "jurisdiction_name": "British Columbia, Canada",
        "primary_legislation": ["Employment Standards Act", "Workers Compensation Act"],
        "data_privacy": ["PIPEDA", "PIPA BC"],
        "minimum_wage": 17.40,
        "currency": "CAD",
        "overtime_threshold_hours": 8,  # Daily in BC
        "overtime_multiplier": 1.5,
        "vacation_days_minimum": 10,
        "statutory_holidays": 10,
        "compliance_badges": ["ESA-BC", "WorkSafeBC", "PIPEDA"],
        "enabled": True
    },
    "CA-AB": {
        "jurisdiction_code": "CA-AB",
        "jurisdiction_name": "Alberta, Canada",
        "primary_legislation": ["Employment Standards Code", "Occupational Health and Safety Act"],
        "data_privacy": ["PIPEDA", "PIPA"],
        "minimum_wage": 15.00,
        "currency": "CAD",
        "overtime_threshold_hours": 8,  # Daily
        "overtime_multiplier": 1.5,
        "vacation_days_minimum": 10,
        "statutory_holidays": 9,
        "compliance_badges": ["ESC-AB", "OHS-AB", "PIPEDA"],
        "enabled": True
    },
    "CA-QC": {
        "jurisdiction_code": "CA-QC",
        "jurisdiction_name": "Quebec, Canada",
        "primary_legislation": ["Act Respecting Labour Standards", "Act Respecting Occupational Health and Safety"],
        "data_privacy": ["Quebec Privacy Act (Law 25)", "PIPEDA"],
        "minimum_wage": 15.75,
        "currency": "CAD",
        "overtime_threshold_hours": 40,  # Weekly
        "overtime_multiplier": 1.5,
        "vacation_days_minimum": 10,
        "statutory_holidays": 8,
        "language_requirements": "French required for workplace communications",
        "compliance_badges": ["LSA-QC", "CNESST", "Law 25"],
        "enabled": True
    },
    
    # USA
    "US-CA": {
        "jurisdiction_code": "US-CA",
        "jurisdiction_name": "California, USA",
        "primary_legislation": ["California Labor Code", "OSHA", "FLSA"],
        "data_privacy": ["CCPA", "CPRA"],
        "minimum_wage": 16.00,  # State minimum, some cities higher
        "currency": "USD",
        "overtime_threshold_hours": 8,  # Daily (stricter than federal)
        "overtime_multiplier": 1.5,
        "double_time_threshold": 12,  # Hours per day
        "double_time_multiplier": 2.0,
        "vacation_days_minimum": 0,  # Not mandated but accrual required
        "meal_break_rules": "30 min for 5+ hour shifts",
        "rest_break_rules": "10 min per 4 hours",
        "compliance_badges": ["CA Labor Code", "CCPA", "Cal/OSHA"],
        "enabled": True
    },
    "US-TX": {
        "jurisdiction_code": "US-TX",
        "jurisdiction_name": "Texas, USA",
        "primary_legislation": ["Texas Labor Code", "FLSA"],
        "data_privacy": ["TDPSA (from 2024)"],
        "minimum_wage": 7.25,  # Federal minimum
        "currency": "USD",
        "overtime_threshold_hours": 40,  # Weekly (FLSA)
        "overtime_multiplier": 1.5,
        "vacation_days_minimum": 0,  # Not mandated
        "at_will_employment": True,
        "compliance_badges": ["FLSA", "TWC"],
        "enabled": True
    },
    "US-NY": {
        "jurisdiction_code": "US-NY",
        "jurisdiction_name": "New York, USA",
        "primary_legislation": ["NY Labor Law", "FLSA", "OSHA"],
        "data_privacy": ["SHIELD Act"],
        "minimum_wage": 16.00,  # NYC; varies by region
        "currency": "USD",
        "overtime_threshold_hours": 40,
        "overtime_multiplier": 1.5,
        "paid_family_leave": True,
        "compliance_badges": ["NY Labor Law", "SHIELD", "PFL"],
        "enabled": True
    },
    "US-FL": {
        "jurisdiction_code": "US-FL",
        "jurisdiction_name": "Florida, USA",
        "primary_legislation": ["Florida Minimum Wage Act", "FLSA"],
        "data_privacy": ["FIPA"],
        "minimum_wage": 13.00,  # Increasing annually
        "currency": "USD",
        "overtime_threshold_hours": 40,
        "overtime_multiplier": 1.5,
        "compliance_badges": ["FLSA", "FMWA"],
        "enabled": True
    },
    
    # INDIA
    "IN-MH": {
        "jurisdiction_code": "IN-MH",
        "jurisdiction_name": "Maharashtra, India",
        "primary_legislation": ["Labour Codes 2020", "Shops and Establishments Act"],
        "data_privacy": ["DPDP Act 2023"],
        "minimum_wage": 12500,  # INR per month (varies by skill)
        "currency": "INR",
        "overtime_threshold_hours": 9,  # Daily
        "overtime_multiplier": 2.0,
        "weekly_off": 1,  # Days
        "gratuity_rules": "15 days salary per year after 5 years",
        "pf_contribution": 12,  # Percentage
        "compliance_badges": ["Labour Codes", "DPDP", "ESIC"],
        "enabled": True
    },
    "IN-KA": {
        "jurisdiction_code": "IN-KA",
        "jurisdiction_name": "Karnataka, India",
        "primary_legislation": ["Labour Codes 2020", "Karnataka Shops and Establishments Act"],
        "data_privacy": ["DPDP Act 2023"],
        "minimum_wage": 13500,
        "currency": "INR",
        "overtime_threshold_hours": 9,
        "overtime_multiplier": 2.0,
        "compliance_badges": ["Labour Codes", "DPDP", "KSEA"],
        "enabled": True
    },
    
    # UK
    "GB-ENG": {
        "jurisdiction_code": "GB-ENG",
        "jurisdiction_name": "England, UK",
        "primary_legislation": ["Employment Rights Act 1996", "Working Time Regulations"],
        "data_privacy": ["UK GDPR", "Data Protection Act 2018"],
        "minimum_wage": 11.44,  # GBP (National Living Wage 21+)
        "currency": "GBP",
        "overtime_threshold_hours": 48,  # Weekly average
        "statutory_holidays": 8,
        "vacation_days_minimum": 28,  # Including bank holidays
        "notice_period_rules": "1 week per year of service (up to 12 weeks)",
        "compliance_badges": ["ERA", "WTR", "UK GDPR"],
        "enabled": True
    },
    
    # Default fallback for unknown jurisdictions
    "UNKNOWN": {
        "jurisdiction_code": "UNKNOWN",
        "jurisdiction_name": "Unknown Jurisdiction",
        "primary_legislation": ["Local labor laws apply"],
        "data_privacy": ["Local data protection laws apply"],
        "minimum_wage": None,
        "currency": None,
        "note": "Please verify local employment regulations",
        "compliance_badges": [],
        "enabled": False
    }
}


# ==================== PROVINCE/STATE CODE MAPPINGS ====================

# Canadian Province Codes
CANADA_PROVINCES = {
    "AB": "CA-AB", "ALBERTA": "CA-AB",
    "BC": "CA-BC", "BRITISH COLUMBIA": "CA-BC",
    "MB": "CA-MB", "MANITOBA": "CA-MB",
    "NB": "CA-NB", "NEW BRUNSWICK": "CA-NB",
    "NL": "CA-NL", "NEWFOUNDLAND": "CA-NL", "NEWFOUNDLAND AND LABRADOR": "CA-NL",
    "NS": "CA-NS", "NOVA SCOTIA": "CA-NS",
    "NT": "CA-NT", "NORTHWEST TERRITORIES": "CA-NT",
    "NU": "CA-NU", "NUNAVUT": "CA-NU",
    "ON": "CA-ON", "ONTARIO": "CA-ON",
    "PE": "CA-PE", "PEI": "CA-PE", "PRINCE EDWARD ISLAND": "CA-PE",
    "QC": "CA-QC", "QUEBEC": "CA-QC",
    "SK": "CA-SK", "SASKATCHEWAN": "CA-SK",
    "YT": "CA-YT", "YUKON": "CA-YT",
}

# US State Codes
US_STATES = {
    "AL": "US-AL", "ALABAMA": "US-AL",
    "AK": "US-AK", "ALASKA": "US-AK",
    "AZ": "US-AZ", "ARIZONA": "US-AZ",
    "AR": "US-AR", "ARKANSAS": "US-AR",
    "CA": "US-CA", "CALIFORNIA": "US-CA",
    "CO": "US-CO", "COLORADO": "US-CO",
    "CT": "US-CT", "CONNECTICUT": "US-CT",
    "DE": "US-DE", "DELAWARE": "US-DE",
    "FL": "US-FL", "FLORIDA": "US-FL",
    "GA": "US-GA", "GEORGIA": "US-GA",
    "HI": "US-HI", "HAWAII": "US-HI",
    "ID": "US-ID", "IDAHO": "US-ID",
    "IL": "US-IL", "ILLINOIS": "US-IL",
    "IN": "US-IN", "INDIANA": "US-IN",
    "IA": "US-IA", "IOWA": "US-IA",
    "KS": "US-KS", "KANSAS": "US-KS",
    "KY": "US-KY", "KENTUCKY": "US-KY",
    "LA": "US-LA", "LOUISIANA": "US-LA",
    "ME": "US-ME", "MAINE": "US-ME",
    "MD": "US-MD", "MARYLAND": "US-MD",
    "MA": "US-MA", "MASSACHUSETTS": "US-MA",
    "MI": "US-MI", "MICHIGAN": "US-MI",
    "MN": "US-MN", "MINNESOTA": "US-MN",
    "MS": "US-MS", "MISSISSIPPI": "US-MS",
    "MO": "US-MO", "MISSOURI": "US-MO",
    "MT": "US-MT", "MONTANA": "US-MT",
    "NE": "US-NE", "NEBRASKA": "US-NE",
    "NV": "US-NV", "NEVADA": "US-NV",
    "NH": "US-NH", "NEW HAMPSHIRE": "US-NH",
    "NJ": "US-NJ", "NEW JERSEY": "US-NJ",
    "NM": "US-NM", "NEW MEXICO": "US-NM",
    "NY": "US-NY", "NEW YORK": "US-NY",
    "NC": "US-NC", "NORTH CAROLINA": "US-NC",
    "ND": "US-ND", "NORTH DAKOTA": "US-ND",
    "OH": "US-OH", "OHIO": "US-OH",
    "OK": "US-OK", "OKLAHOMA": "US-OK",
    "OR": "US-OR", "OREGON": "US-OR",
    "PA": "US-PA", "PENNSYLVANIA": "US-PA",
    "RI": "US-RI", "RHODE ISLAND": "US-RI",
    "SC": "US-SC", "SOUTH CAROLINA": "US-SC",
    "SD": "US-SD", "SOUTH DAKOTA": "US-SD",
    "TN": "US-TN", "TENNESSEE": "US-TN",
    "TX": "US-TX", "TEXAS": "US-TX",
    "UT": "US-UT", "UTAH": "US-UT",
    "VT": "US-VT", "VERMONT": "US-VT",
    "VA": "US-VA", "VIRGINIA": "US-VA",
    "WA": "US-WA", "WASHINGTON": "US-WA",
    "WV": "US-WV", "WEST VIRGINIA": "US-WV",
    "WI": "US-WI", "WISCONSIN": "US-WI",
    "WY": "US-WY", "WYOMING": "US-WY",
    "DC": "US-DC", "DISTRICT OF COLUMBIA": "US-DC",
}

# India State Codes
INDIA_STATES = {
    "MH": "IN-MH", "MAHARASHTRA": "IN-MH",
    "KA": "IN-KA", "KARNATAKA": "IN-KA",
    "TN": "IN-TN", "TAMIL NADU": "IN-TN",
    "DL": "IN-DL", "DELHI": "IN-DL", "NEW DELHI": "IN-DL",
    "GJ": "IN-GJ", "GUJARAT": "IN-GJ",
    "HR": "IN-HR", "HARYANA": "IN-HR",
    "UP": "IN-UP", "UTTAR PRADESH": "IN-UP",
    "WB": "IN-WB", "WEST BENGAL": "IN-WB",
    "TG": "IN-TG", "TELANGANA": "IN-TG",
    "AP": "IN-AP", "ANDHRA PRADESH": "IN-AP",
    "KL": "IN-KL", "KERALA": "IN-KL",
    "PB": "IN-PB", "PUNJAB": "IN-PB",
    "RJ": "IN-RJ", "RAJASTHAN": "IN-RJ",
}

# UK Region Codes
UK_REGIONS = {
    "ENG": "GB-ENG", "ENGLAND": "GB-ENG",
    "SCT": "GB-SCT", "SCOTLAND": "GB-SCT",
    "WLS": "GB-WLS", "WALES": "GB-WLS",
    "NIR": "GB-NIR", "NORTHERN IRELAND": "GB-NIR",
}

# Country to default jurisdiction (for countries without state-level rules)
COUNTRY_DEFAULTS = {
    "CANADA": "CA-ON",  # Default to Ontario
    "CA": "CA-ON",
    "UNITED STATES": "US-TX",  # Default to Texas (employer-friendly)
    "USA": "US-TX",
    "US": "US-TX",
    "INDIA": "IN-MH",  # Default to Maharashtra
    "IN": "IN-MH",
    "UNITED KINGDOM": "GB-ENG",  # Default to England
    "UK": "GB-ENG",
    "GB": "GB-ENG",
    "GERMANY": "DE",
    "DE": "DE",
    "FRANCE": "FR",
    "FR": "FR",
    "AUSTRALIA": "AU-NSW",
    "AU": "AU-NSW",
}


# ==================== CORE FUNCTIONS ====================

def get_jurisdiction_from_address(
    province: Optional[str] = None,
    state: Optional[str] = None,
    country: Optional[str] = None,
    postal_code: Optional[str] = None,
    city: Optional[str] = None,
    address: Optional[str] = None
) -> Dict:
    """
    Automatically determine jurisdiction from address components.
    
    Priority:
    1. Province/State + Country (most accurate)
    2. Postal code pattern detection
    3. Country default
    4. Unknown fallback
    
    Returns:
        Dict with jurisdiction_code, jurisdiction_name, country, and rules
    """
    
    # Normalize inputs
    province_state = (province or state or "").upper().strip()
    country_norm = (country or "").upper().strip()
    postal_norm = (postal_code or "").upper().strip().replace(" ", "")
    
    jurisdiction_code = None
    
    # Step 1: Try to detect country from postal code pattern
    detected_country = None
    if postal_norm:
        detected_country = detect_country_from_postal(postal_norm)
        if detected_country and not country_norm:
            country_norm = detected_country
    
    # Step 2: Determine jurisdiction from province/state + country
    if province_state:
        # Try Canadian provinces
        if country_norm in ["", "CA", "CANADA"] or detected_country == "CA":
            if province_state in CANADA_PROVINCES:
                jurisdiction_code = CANADA_PROVINCES[province_state]
        
        # Try US states
        if not jurisdiction_code and country_norm in ["", "US", "USA", "UNITED STATES"] or detected_country == "US":
            if province_state in US_STATES:
                jurisdiction_code = US_STATES[province_state]
        
        # Try Indian states
        if not jurisdiction_code and country_norm in ["", "IN", "INDIA"] or detected_country == "IN":
            if province_state in INDIA_STATES:
                jurisdiction_code = INDIA_STATES[province_state]
        
        # Try UK regions
        if not jurisdiction_code and country_norm in ["", "GB", "UK", "UNITED KINGDOM"]:
            if province_state in UK_REGIONS:
                jurisdiction_code = UK_REGIONS[province_state]
    
    # Step 3: Fall back to country default
    if not jurisdiction_code and country_norm:
        jurisdiction_code = COUNTRY_DEFAULTS.get(country_norm)
    
    # Step 4: Fall back to detected country default
    if not jurisdiction_code and detected_country:
        jurisdiction_code = COUNTRY_DEFAULTS.get(detected_country)
    
    # Step 5: Final fallback
    if not jurisdiction_code:
        jurisdiction_code = "UNKNOWN"
    
    # Get jurisdiction info
    jurisdiction_info = JURISDICTIONS.get(jurisdiction_code, JURISDICTIONS.get("UNKNOWN"))
    rules = COMPLIANCE_RULES.get(jurisdiction_code, COMPLIANCE_RULES.get("UNKNOWN"))
    
    return {
        "jurisdiction_code": jurisdiction_code,
        "jurisdiction_name": rules.get("jurisdiction_name", jurisdiction_info.get("name", "Unknown")),
        "country": jurisdiction_info.get("country", "Unknown"),
        "country_code": jurisdiction_info.get("country_code", ""),
        "rules": rules,
        "detected_from": {
            "province_state": province_state if province_state else None,
            "country": country_norm if country_norm else None,
            "postal_code": postal_norm if postal_norm else None,
            "detected_country": detected_country
        }
    }


def detect_country_from_postal(postal_code: str) -> Optional[str]:
    """
    Detect country from postal code format.
    
    Patterns:
    - Canada: A1A 1A1 (letter-digit-letter digit-letter-digit)
    - USA: 12345 or 12345-6789 (5 digits or 5+4)
    - UK: Various formats like SW1A 1AA
    - India: 6 digits
    """
    postal = postal_code.upper().replace(" ", "").replace("-", "")
    
    # Canadian postal code: A1A1A1
    if re.match(r'^[A-Z]\d[A-Z]\d[A-Z]\d$', postal):
        return "CA"
    
    # US ZIP code: 5 digits or 5+4
    if re.match(r'^\d{5}(\d{4})?$', postal):
        return "US"
    
    # UK postal code patterns
    if re.match(r'^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$', postal):
        return "GB"
    
    # Indian PIN code: 6 digits
    if re.match(r'^\d{6}$', postal):
        return "IN"
    
    # German postal: 5 digits
    if re.match(r'^\d{5}$', postal) and len(postal) == 5:
        # Could be US or DE - need more context
        pass
    
    return None


def get_compliance_rules(jurisdiction_code: str) -> Dict:
    """
    Get full compliance rules for a jurisdiction.
    """
    return COMPLIANCE_RULES.get(jurisdiction_code, COMPLIANCE_RULES.get("UNKNOWN"))


def get_minimum_wage(jurisdiction_code: str) -> Optional[float]:
    """
    Get minimum wage for a jurisdiction.
    """
    rules = get_compliance_rules(jurisdiction_code)
    return rules.get("minimum_wage")


def get_overtime_rules(jurisdiction_code: str) -> Dict:
    """
    Get overtime calculation rules for a jurisdiction.
    """
    rules = get_compliance_rules(jurisdiction_code)
    return {
        "threshold_hours": rules.get("overtime_threshold_hours"),
        "threshold_type": "daily" if rules.get("overtime_threshold_hours", 40) <= 12 else "weekly",
        "multiplier": rules.get("overtime_multiplier", 1.5),
        "double_time_threshold": rules.get("double_time_threshold"),
        "double_time_multiplier": rules.get("double_time_multiplier")
    }


def get_compliance_badges(jurisdiction_code: str) -> List[str]:
    """
    Get list of compliance badges/certifications for a jurisdiction.
    """
    rules = get_compliance_rules(jurisdiction_code)
    return rules.get("compliance_badges", [])


def validate_wage_compliance(hourly_rate: float, jurisdiction_code: str) -> Dict:
    """
    Validate if an hourly rate meets jurisdiction's minimum wage requirements.
    """
    rules = get_compliance_rules(jurisdiction_code)
    min_wage = rules.get("minimum_wage")
    
    if min_wage is None:
        return {
            "compliant": True,
            "note": "Minimum wage not defined for this jurisdiction. Please verify locally.",
            "minimum_wage": None,
            "currency": rules.get("currency")
        }
    
    return {
        "compliant": hourly_rate >= min_wage,
        "minimum_wage": min_wage,
        "provided_rate": hourly_rate,
        "currency": rules.get("currency"),
        "shortfall": max(0, min_wage - hourly_rate) if hourly_rate < min_wage else 0,
        "jurisdiction": rules.get("jurisdiction_name")
    }


def get_all_supported_jurisdictions() -> List[Dict]:
    """
    Get list of all supported jurisdictions with basic info.
    """
    result = []
    for code, info in JURISDICTIONS.items():
        rules = COMPLIANCE_RULES.get(code, {})
        result.append({
            "code": code,
            "name": info.get("name"),
            "country": info.get("country"),
            "country_code": info.get("country_code"),
            "minimum_wage": rules.get("minimum_wage"),
            "currency": rules.get("currency"),
            "enabled": rules.get("enabled", False)
        })
    return result


# ==================== HELPER FOR ROLE/WORKPLACE ====================

def enrich_with_jurisdiction(
    workplace_data: Dict = None,
    role_data: Dict = None
) -> Dict:
    """
    Enrich workplace or role data with jurisdiction information.
    
    Use case: When displaying role/workplace info, automatically show
    applicable compliance rules based on work location.
    """
    # Extract address components from either source
    province = None
    country = None
    postal_code = None
    city = None
    
    if workplace_data:
        province = workplace_data.get("province") or workplace_data.get("state")
        country = workplace_data.get("country")
        postal_code = workplace_data.get("postal_code")
        city = workplace_data.get("city")
    
    if role_data:
        # Role might override workplace location for remote work
        province = role_data.get("work_province") or province
        country = role_data.get("work_country") or country
        postal_code = role_data.get("work_postal_code") or postal_code
    
    # Get jurisdiction
    jurisdiction = get_jurisdiction_from_address(
        province=province,
        country=country,
        postal_code=postal_code,
        city=city
    )
    
    return {
        "jurisdiction_code": jurisdiction["jurisdiction_code"],
        "jurisdiction_name": jurisdiction["jurisdiction_name"],
        "country": jurisdiction["country"],
        "compliance_badges": get_compliance_badges(jurisdiction["jurisdiction_code"]),
        "minimum_wage": get_minimum_wage(jurisdiction["jurisdiction_code"]),
        "currency": jurisdiction["rules"].get("currency"),
        "overtime_rules": get_overtime_rules(jurisdiction["jurisdiction_code"])
    }
