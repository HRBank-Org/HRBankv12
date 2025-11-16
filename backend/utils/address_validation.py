"""
Address validation utilities for Canadian addresses
"""
import re
from typing import Dict, Optional

# Canadian provinces
CANADIAN_PROVINCES = {
    'AB': 'Alberta',
    'BC': 'British Columbia',
    'MB': 'Manitoba',
    'NB': 'New Brunswick',
    'NL': 'Newfoundland and Labrador',
    'NS': 'Nova Scotia',
    'NT': 'Northwest Territories',
    'NU': 'Nunavut',
    'ON': 'Ontario',
    'PE': 'Prince Edward Island',
    'QC': 'Quebec',
    'SK': 'Saskatchewan',
    'YT': 'Yukon'
}

def validate_canadian_postal_code(postal_code: str) -> Dict[str, any]:
    """
    Validate Canadian postal code format
    Format: A1A 1A1 (with or without space)
    
    Returns dict with:
    - valid: bool
    - formatted: str (properly formatted postal code)
    - error: str (if invalid)
    """
    if not postal_code:
        return {"valid": False, "error": "Postal code is required"}
    
    # Remove spaces and convert to uppercase
    cleaned = postal_code.replace(" ", "").upper()
    
    # Canadian postal code regex: Letter-Digit-Letter Digit-Letter-Digit
    # First letter cannot be D, F, I, O, Q, U, W, Z
    pattern = r'^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$'
    
    if not re.match(pattern, cleaned):
        return {
            "valid": False,
            "error": "Invalid Canadian postal code format. Expected format: A1A 1A1"
        }
    
    # Format with space: A1A 1A1
    formatted = f"{cleaned[:3]} {cleaned[3:]}"
    
    return {
        "valid": True,
        "formatted": formatted,
        "error": None
    }

def validate_province(province: str) -> Dict[str, any]:
    """
    Validate Canadian province code
    
    Returns dict with:
    - valid: bool
    - code: str (2-letter code)
    - name: str (full province name)
    - error: str (if invalid)
    """
    if not province:
        return {"valid": False, "error": "Province is required"}
    
    # Convert to uppercase
    province_upper = province.upper()
    
    # Check if it's a valid province code
    if province_upper in CANADIAN_PROVINCES:
        return {
            "valid": True,
            "code": province_upper,
            "name": CANADIAN_PROVINCES[province_upper],
            "error": None
        }
    
    # Check if it's a full province name
    for code, name in CANADIAN_PROVINCES.items():
        if name.upper() == province_upper:
            return {
                "valid": True,
                "code": code,
                "name": name,
                "error": None
            }
    
    return {
        "valid": False,
        "error": f"Invalid province. Must be one of: {', '.join(CANADIAN_PROVINCES.keys())}"
    }

def validate_phone_number(phone: str) -> Dict[str, any]:
    """
    Validate and format Canadian/North American phone number
    
    Returns dict with:
    - valid: bool
    - formatted: str (E.164 format: +1XXXXXXXXXX)
    - display: str (formatted for display: (XXX) XXX-XXXX)
    - error: str (if invalid)
    """
    if not phone:
        return {"valid": False, "error": "Phone number is required"}
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # Handle different formats
    if len(digits) == 10:
        # 10 digits - add +1 country code
        formatted = f"+1{digits}"
        display = f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    elif len(digits) == 11 and digits[0] == '1':
        # 11 digits starting with 1
        formatted = f"+{digits}"
        display = f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    else:
        return {
            "valid": False,
            "error": "Invalid phone number. Expected 10 digits or +1 followed by 10 digits"
        }
    
    return {
        "valid": True,
        "formatted": formatted,
        "display": display,
        "error": None
    }

def validate_address(address: str, city: str, province: str, postal_code: str) -> Dict[str, any]:
    """
    Validate complete Canadian address
    
    Returns dict with:
    - valid: bool
    - errors: list of error messages
    - formatted: dict with formatted values
    """
    errors = []
    formatted = {}
    
    # Validate street address
    if not address or len(address.strip()) < 5:
        errors.append("Street address must be at least 5 characters")
    else:
        formatted['address'] = address.strip()
    
    # Validate city
    if not city or len(city.strip()) < 2:
        errors.append("City name must be at least 2 characters")
    else:
        formatted['city'] = city.strip().title()
    
    # Validate province
    province_result = validate_province(province)
    if not province_result['valid']:
        errors.append(province_result['error'])
    else:
        formatted['province'] = province_result['code']
        formatted['province_name'] = province_result['name']
    
    # Validate postal code
    postal_result = validate_canadian_postal_code(postal_code)
    if not postal_result['valid']:
        errors.append(postal_result['error'])
    else:
        formatted['postal_code'] = postal_result['formatted']
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "formatted": formatted if len(errors) == 0 else {}
    }
