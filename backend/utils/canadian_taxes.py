"""
Canadian Tax Calculator for Credential Sales
Province-specific GST/HST/PST rates
"""

# Canadian Tax Rates by Province (as of 2024)
CANADIAN_TAX_RATES = {
    "AB": {  # Alberta
        "name": "Alberta",
        "gst": 0.05,
        "pst": 0.0,
        "hst": None,
        "total": 0.05,
        "description": "5% GST"
    },
    "BC": {  # British Columbia
        "name": "British Columbia",
        "gst": 0.05,
        "pst": 0.07,
        "hst": None,
        "total": 0.12,
        "description": "5% GST + 7% PST"
    },
    "MB": {  # Manitoba
        "name": "Manitoba",
        "gst": 0.05,
        "pst": 0.07,
        "hst": None,
        "total": 0.12,
        "description": "5% GST + 7% PST"
    },
    "NB": {  # New Brunswick
        "name": "New Brunswick",
        "gst": None,
        "pst": None,
        "hst": 0.15,
        "total": 0.15,
        "description": "15% HST"
    },
    "NL": {  # Newfoundland and Labrador
        "name": "Newfoundland and Labrador",
        "gst": None,
        "pst": None,
        "hst": 0.15,
        "total": 0.15,
        "description": "15% HST"
    },
    "NT": {  # Northwest Territories
        "name": "Northwest Territories",
        "gst": 0.05,
        "pst": 0.0,
        "hst": None,
        "total": 0.05,
        "description": "5% GST"
    },
    "NS": {  # Nova Scotia
        "name": "Nova Scotia",
        "gst": None,
        "pst": None,
        "hst": 0.15,
        "total": 0.15,
        "description": "15% HST"
    },
    "NU": {  # Nunavut
        "name": "Nunavut",
        "gst": 0.05,
        "pst": 0.0,
        "hst": None,
        "total": 0.05,
        "description": "5% GST"
    },
    "ON": {  # Ontario
        "name": "Ontario",
        "gst": None,
        "pst": None,
        "hst": 0.13,
        "total": 0.13,
        "description": "13% HST"
    },
    "PE": {  # Prince Edward Island
        "name": "Prince Edward Island",
        "gst": None,
        "pst": None,
        "hst": 0.15,
        "total": 0.15,
        "description": "15% HST"
    },
    "QC": {  # Quebec
        "name": "Quebec",
        "gst": 0.05,
        "pst": 0.09975,  # QST
        "hst": None,
        "total": 0.14975,
        "description": "5% GST + 9.975% QST"
    },
    "SK": {  # Saskatchewan
        "name": "Saskatchewan",
        "gst": 0.05,
        "pst": 0.06,
        "hst": None,
        "total": 0.11,
        "description": "5% GST + 6% PST"
    },
    "YT": {  # Yukon
        "name": "Yukon",
        "gst": 0.05,
        "pst": 0.0,
        "hst": None,
        "total": 0.05,
        "description": "5% GST"
    }
}

# Default to Ontario if province not specified
DEFAULT_PROVINCE = "ON"


def get_tax_rate(province_code: str) -> dict:
    """Get tax information for a province"""
    province_code = province_code.upper() if province_code else DEFAULT_PROVINCE
    return CANADIAN_TAX_RATES.get(province_code, CANADIAN_TAX_RATES[DEFAULT_PROVINCE])


def calculate_tax(base_amount: float, province_code: str) -> dict:
    """
    Calculate tax for a given amount and province
    
    Returns:
        dict with subtotal, tax_amount, tax_rate, tax_description, total
    """
    tax_info = get_tax_rate(province_code)
    tax_rate = tax_info["total"]
    tax_amount = round(base_amount * tax_rate, 2)
    total = round(base_amount + tax_amount, 2)
    
    return {
        "subtotal": base_amount,
        "tax_rate": tax_rate,
        "tax_rate_percentage": round(tax_rate * 100, 2),
        "tax_amount": tax_amount,
        "tax_description": tax_info["description"],
        "province_name": tax_info["name"],
        "province_code": province_code.upper(),
        "total": total,
        "currency": "CAD"
    }


def calculate_credential_price_with_tax(credential_type: str, province_code: str) -> dict:
    """
    Calculate full price breakdown for a credential including tax
    """
    from routes.credential_payments import CREDENTIAL_PRICING, PLATFORM_FEE_PERCENTAGE
    
    if credential_type not in CREDENTIAL_PRICING:
        raise ValueError(f"Invalid credential type: {credential_type}")
    
    base_price = CREDENTIAL_PRICING[credential_type]["price_cad"]
    tax_breakdown = calculate_tax(base_price, province_code)
    
    # Calculate revenue split AFTER tax (tax goes to government, not split)
    platform_fee = round(base_price * PLATFORM_FEE_PERCENTAGE, 2)
    institution_payout = round(base_price * (1 - PLATFORM_FEE_PERCENTAGE), 2)
    
    return {
        "credential_type": credential_type,
        "base_price_cad": base_price,
        **tax_breakdown,
        "platform_fee_cad": platform_fee,
        "institution_payout_cad": institution_payout,
        "breakdown": {
            "credential_price": base_price,
            "tax": tax_breakdown["tax_amount"],
            "total_charged": tax_breakdown["total"],
            "platform_revenue": platform_fee,
            "institution_revenue": institution_payout,
            "tax_remitted_to_government": tax_breakdown["tax_amount"]
        }
    }


def get_all_provinces() -> list:
    """Get list of all provinces with tax info"""
    return [
        {
            "code": code,
            "name": info["name"],
            "tax_rate": info["total"],
            "tax_description": info["description"]
        }
        for code, info in CANADIAN_TAX_RATES.items()
    ]
