"""
Address validation utilities for global addresses
Supports Canadian, US, Indian, UK, and other international formats
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

# US States
US_STATES = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
}

# Indian States
INDIAN_STATES = {
    'AP': 'Andhra Pradesh', 'AR': 'Arunachal Pradesh', 'AS': 'Assam',
    'BR': 'Bihar', 'CT': 'Chhattisgarh', 'GA': 'Goa', 'GJ': 'Gujarat',
    'HR': 'Haryana', 'HP': 'Himachal Pradesh', 'JK': 'Jammu and Kashmir',
    'JH': 'Jharkhand', 'KA': 'Karnataka', 'KL': 'Kerala', 'MP': 'Madhya Pradesh',
    'MH': 'Maharashtra', 'MN': 'Manipur', 'ML': 'Meghalaya', 'MZ': 'Mizoram',
    'NL': 'Nagaland', 'OR': 'Odisha', 'PB': 'Punjab', 'RJ': 'Rajasthan',
    'SK': 'Sikkim', 'TN': 'Tamil Nadu', 'TG': 'Telangana', 'TR': 'Tripura',
    'UP': 'Uttar Pradesh', 'UK': 'Uttarakhand', 'WB': 'West Bengal',
    'DL': 'Delhi'
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
        "country": "CA",
        "error": None
    }


def validate_us_zip_code(zip_code: str) -> Dict[str, any]:
    """
    Validate US ZIP code format
    Format: 12345 or 12345-6789
    """
    if not zip_code:
        return {"valid": False, "error": "ZIP code is required"}
    
    cleaned = zip_code.replace(" ", "").replace("-", "")
    
    if re.match(r'^\d{5}$', cleaned):
        return {"valid": True, "formatted": cleaned, "country": "US", "error": None}
    elif re.match(r'^\d{9}$', cleaned):
        return {"valid": True, "formatted": f"{cleaned[:5]}-{cleaned[5:]}", "country": "US", "error": None}
    
    return {"valid": False, "error": "Invalid US ZIP code. Expected format: 12345 or 12345-6789"}


def validate_indian_pin_code(pin_code: str) -> Dict[str, any]:
    """
    Validate Indian PIN code format
    Format: 6 digits
    """
    if not pin_code:
        return {"valid": False, "error": "PIN code is required"}
    
    cleaned = pin_code.replace(" ", "")
    
    if re.match(r'^\d{6}$', cleaned):
        return {"valid": True, "formatted": cleaned, "country": "IN", "error": None}
    
    return {"valid": False, "error": "Invalid Indian PIN code. Expected 6 digits"}


def validate_uk_postcode(postcode: str) -> Dict[str, any]:
    """
    Validate UK postcode format
    Various formats like SW1A 1AA, M1 1AE, etc.
    """
    if not postcode:
        return {"valid": False, "error": "Postcode is required"}
    
    cleaned = postcode.upper().replace(" ", "")
    
    # UK postcode pattern (simplified)
    pattern = r'^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$'
    
    if re.match(pattern, cleaned):
        # Format with space
        formatted = f"{cleaned[:-3]} {cleaned[-3:]}"
        return {"valid": True, "formatted": formatted, "country": "GB", "error": None}
    
    return {"valid": False, "error": "Invalid UK postcode format"}


def validate_postal_code_global(postal_code: str, country: str = None) -> Dict[str, any]:
    """
    Validate postal code based on detected or specified country.
    Auto-detects country from postal code format if not specified.
    """
    if not postal_code:
        return {"valid": False, "error": "Postal code is required", "country": None}
    
    # If country specified, validate accordingly
    if country:
        country_upper = country.upper()
        if country_upper in ["CA", "CANADA"]:
            return validate_canadian_postal_code(postal_code)
        elif country_upper in ["US", "USA", "UNITED STATES"]:
            return validate_us_zip_code(postal_code)
        elif country_upper in ["IN", "INDIA"]:
            return validate_indian_pin_code(postal_code)
        elif country_upper in ["GB", "UK", "UNITED KINGDOM"]:
            return validate_uk_postcode(postal_code)
    
    # Auto-detect from format
    cleaned = postal_code.replace(" ", "").replace("-", "").upper()
    
    # Canadian: A1A1A1
    if re.match(r'^[A-Z]\d[A-Z]\d[A-Z]\d$', cleaned):
        return validate_canadian_postal_code(postal_code)
    
    # US: 5 or 9 digits
    if re.match(r'^\d{5}(\d{4})?$', cleaned):
        return validate_us_zip_code(postal_code)
    
    # Indian: 6 digits
    if re.match(r'^\d{6}$', cleaned):
        return validate_indian_pin_code(postal_code)
    
    # UK pattern
    if re.match(r'^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$', cleaned):
        return validate_uk_postcode(postal_code)
    
    # Accept but mark as unvalidated
    return {
        "valid": True,
        "formatted": postal_code,
        "country": None,
        "note": "Postal code format not recognized. Please verify.",
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
            "country": "CA",
            "error": None
        }
    
    # Check if it's a full province name
    for code, name in CANADIAN_PROVINCES.items():
        if name.upper() == province_upper:
            return {
                "valid": True,
                "code": code,
                "name": name,
                "country": "CA",
                "error": None
            }
    
    return {
        "valid": False,
        "error": f"Invalid province. Must be one of: {', '.join(CANADIAN_PROVINCES.keys())}"
    }


def validate_state_province_global(state_province: str, country: str = None) -> Dict[str, any]:
    """
    Validate state/province for any supported country.
    Auto-detects country if not specified.
    """
    if not state_province:
        return {"valid": False, "error": "State/Province is required", "country": None}
    
    sp_upper = state_province.upper().strip()
    country_upper = (country or "").upper().strip()
    
    # Check Canadian provinces
    if not country_upper or country_upper in ["CA", "CANADA"]:
        if sp_upper in CANADIAN_PROVINCES:
            return {"valid": True, "code": sp_upper, "name": CANADIAN_PROVINCES[sp_upper], "country": "CA", "error": None}
        for code, name in CANADIAN_PROVINCES.items():
            if name.upper() == sp_upper:
                return {"valid": True, "code": code, "name": name, "country": "CA", "error": None}
    
    # Check US states
    if not country_upper or country_upper in ["US", "USA", "UNITED STATES"]:
        if sp_upper in US_STATES:
            return {"valid": True, "code": sp_upper, "name": US_STATES[sp_upper], "country": "US", "error": None}
        for code, name in US_STATES.items():
            if name.upper() == sp_upper:
                return {"valid": True, "code": code, "name": name, "country": "US", "error": None}
    
    # Check Indian states
    if not country_upper or country_upper in ["IN", "INDIA"]:
        if sp_upper in INDIAN_STATES:
            return {"valid": True, "code": sp_upper, "name": INDIAN_STATES[sp_upper], "country": "IN", "error": None}
        for code, name in INDIAN_STATES.items():
            if name.upper() == sp_upper:
                return {"valid": True, "code": code, "name": name, "country": "IN", "error": None}
    
    # Accept but mark as unvalidated for other countries
    return {
        "valid": True,
        "code": sp_upper[:2] if len(sp_upper) >= 2 else sp_upper,
        "name": state_province,
        "country": country_upper or None,
        "note": "State/Province not in validation list. Please verify.",
        "error": None
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


# ==================== GOOGLE PLACES INTEGRATION ====================

import os
import httpx
import logging

logger = logging.getLogger(__name__)

GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '')
GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY', GOOGLE_MAPS_API_KEY)


async def geocode_address(
    street_address: str,
    city: str,
    province: str,
    postal_code: str = "",
    country: str = "Canada"
) -> Optional[Dict]:
    """
    Geocode a structured address using Google Geocoding API.
    Returns coordinates and formatted address.
    """
    if not GOOGLE_MAPS_API_KEY:
        logger.warning("Google Maps API key not configured")
        return None
    
    # Build address string
    address_parts = [street_address, city, province]
    if postal_code:
        address_parts.append(postal_code)
    address_parts.append(country)
    
    full_address = ", ".join(filter(None, address_parts))
    
    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "address": full_address,
            "key": GOOGLE_MAPS_API_KEY,
            "components": "country:CA"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            data = response.json()
        
        if data.get("status") == "OK" and data.get("results"):
            result = data["results"][0]
            location = result["geometry"]["location"]
            
            components = {}
            for comp in result.get("address_components", []):
                types = comp.get("types", [])
                if "street_number" in types:
                    components["street_number"] = comp["long_name"]
                elif "route" in types:
                    components["street_name"] = comp["long_name"]
                elif "locality" in types:
                    components["city"] = comp["long_name"]
                elif "administrative_area_level_1" in types:
                    components["province"] = comp["short_name"]
                elif "postal_code" in types:
                    components["postal_code"] = comp["long_name"]
            
            return {
                "latitude": location["lat"],
                "longitude": location["lng"],
                "formatted_address": result.get("formatted_address"),
                "place_id": result.get("place_id"),
                "components": components,
                "valid": True
            }
        
        return {"valid": False, "error": data.get("status")}
        
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        return {"valid": False, "error": str(e)}


async def get_place_autocomplete(input_text: str, session_token: str = None) -> list:
    """
    Get address suggestions from Google Places Autocomplete.
    """
    if not GOOGLE_PLACES_API_KEY or len(input_text) < 3:
        return []
    
    try:
        url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
        params = {
            "input": input_text,
            "key": GOOGLE_PLACES_API_KEY,
            "components": "country:ca",
            "types": "address"
        }
        
        if session_token:
            params["sessiontoken"] = session_token
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            data = response.json()
        
        if data.get("status") == "OK":
            return [
                {
                    "description": pred["description"],
                    "place_id": pred["place_id"],
                    "main_text": pred.get("structured_formatting", {}).get("main_text", ""),
                    "secondary_text": pred.get("structured_formatting", {}).get("secondary_text", "")
                }
                for pred in data.get("predictions", [])
            ]
        
        return []
        
    except Exception as e:
        logger.error(f"Places autocomplete error: {e}")
        return []


async def get_place_details(place_id: str) -> Optional[Dict]:
    """
    Get detailed address components from a place_id.
    """
    if not GOOGLE_PLACES_API_KEY:
        return None
    
    try:
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        params = {
            "place_id": place_id,
            "key": GOOGLE_PLACES_API_KEY,
            "fields": "address_component,formatted_address,geometry"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            data = response.json()
        
        if data.get("status") == "OK" and data.get("result"):
            result = data["result"]
            
            components = {
                "street_number": "",
                "street_name": "",
                "city": "",
                "province": "",
                "postal_code": "",
                "country": ""
            }
            
            for comp in result.get("address_components", []):
                types = comp.get("types", [])
                if "street_number" in types:
                    components["street_number"] = comp["long_name"]
                elif "route" in types:
                    components["street_name"] = comp["long_name"]
                elif "locality" in types:
                    components["city"] = comp["long_name"]
                elif "administrative_area_level_1" in types:
                    components["province"] = comp["short_name"]
                elif "postal_code" in types:
                    components["postal_code"] = comp["long_name"]
                elif "country" in types:
                    components["country"] = comp["short_name"]
            
            street_address = f"{components['street_number']} {components['street_name']}".strip()
            location = result.get("geometry", {}).get("location", {})
            
            # Format postal code
            postal = components["postal_code"]
            if postal and len(postal.replace(" ", "")) == 6:
                postal = f"{postal[:3]} {postal[3:]}" if " " not in postal else postal
            
            return {
                "street_address": street_address,
                "city": components["city"],
                "province": components["province"],
                "postal_code": postal.upper(),
                "country": components["country"],
                "latitude": location.get("lat"),
                "longitude": location.get("lng"),
                "formatted_address": result.get("formatted_address"),
                "place_id": place_id
            }
        
        return None
        
    except Exception as e:
        logger.error(f"Place details error: {e}")
        return None


def parse_address_string(address_string: str) -> Dict:
    """
    Parse a combined address string into components.
    Example: "123 Main St, Windsor, ON N9A 1A1" -> {street, city, province, postal}
    """
    result = {
        "street_address": "",
        "city": "",
        "province": "",
        "postal_code": "",
        "raw": address_string
    }
    
    if not address_string:
        return result
    
    # Canadian postal code regex
    postal_pattern = r'[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d'
    postal_match = re.search(postal_pattern, address_string)
    if postal_match:
        postal = postal_match.group().upper().replace("-", " ")
        if " " not in postal and len(postal) == 6:
            postal = f"{postal[:3]} {postal[3:]}"
        result["postal_code"] = postal
        address_string = address_string[:postal_match.start()] + address_string[postal_match.end():]
    
    # Split by comma
    parts = [p.strip() for p in address_string.split(',')]
    
    if len(parts) >= 3:
        result["street_address"] = parts[0]
        result["city"] = parts[1]
        province_part = parts[2].split()[0] if parts[2] else ""
        prov_result = validate_province(province_part)
        if prov_result['valid']:
            result["province"] = prov_result['code']
    elif len(parts) == 2:
        result["street_address"] = parts[0]
        city_province = parts[1].split()
        if city_province:
            result["city"] = city_province[0]
            if len(city_province) > 1:
                prov_result = validate_province(city_province[1])
                if prov_result['valid']:
                    result["province"] = prov_result['code']
    elif len(parts) == 1:
        result["street_address"] = parts[0]
    
    return result

