"""
Age Compliance Utility for Canadian Provincial Requirements

This module handles:
1. Age calculation from date of birth
2. Provincial minimum age requirements
3. Work restrictions for minors
4. Parental consent requirements
"""

from datetime import datetime, timezone, date
from typing import Dict, Optional, Tuple

# Canadian Provincial Minimum Working Ages
# Source: Employment Standards legislation for each province
PROVINCIAL_MINIMUM_AGES = {
    "AB": {
        "general": 13,
        "unrestricted": 18,
        "description": "Alberta - 13 with restrictions, 15 for most jobs, 18 unrestricted"
    },
    "BC": {
        "general": 15,
        "unrestricted": 19,
        "description": "British Columbia - 15 with restrictions, 19 unrestricted"
    },
    "MB": {
        "general": 13,
        "unrestricted": 18,
        "description": "Manitoba - 13 with restrictions, 18 unrestricted"
    },
    "NB": {
        "general": 14,
        "unrestricted": 19,
        "description": "New Brunswick - 14 for light work, 16 general, 19 unrestricted"
    },
    "NL": {
        "general": 14,
        "unrestricted": 19,
        "description": "Newfoundland - 14 with restrictions, 19 unrestricted"
    },
    "NS": {
        "general": 14,
        "unrestricted": 19,
        "description": "Nova Scotia - 14 with restrictions, 19 unrestricted"
    },
    "NT": {
        "general": 14,
        "unrestricted": 18,
        "description": "Northwest Territories - 14 with restrictions, 18 unrestricted"
    },
    "NU": {
        "general": 14,
        "unrestricted": 18,
        "description": "Nunavut - 14 with restrictions, 18 unrestricted"
    },
    "ON": {
        "general": 14,
        "unrestricted": 18,
        "description": "Ontario - 14 for most jobs, 15 for factories, 18 unrestricted"
    },
    "PE": {
        "general": 14,
        "unrestricted": 18,
        "description": "Prince Edward Island - 14 with restrictions, 18 unrestricted"
    },
    "QC": {
        "general": 14,
        "unrestricted": 18,
        "description": "Quebec - 14 with restrictions, 16 for most jobs, 18 unrestricted"
    },
    "SK": {
        "general": 14,
        "unrestricted": 18,
        "description": "Saskatchewan - 14 with restrictions, 16 for most jobs, 18 unrestricted"
    },
    "YT": {
        "general": 14,
        "unrestricted": 18,
        "description": "Yukon - 14 with restrictions, 18 unrestricted"
    }
}

# Work restrictions for minors (under 18)
MINOR_WORK_RESTRICTIONS = {
    "max_hours_per_day": 8,
    "max_hours_per_week": 40,
    "no_night_shifts": True,  # Typically no work between 11pm - 6am
    "night_shift_start": 23,  # 11 PM
    "night_shift_end": 6,     # 6 AM
    "restricted_industries": [
        "mining",
        "logging",
        "construction_heavy",
        "manufacturing_hazardous",
        "alcohol_service",
        "gambling"
    ],
    "requires_parental_consent": True
}

# Young worker restrictions (under 16)
YOUNG_WORKER_RESTRICTIONS = {
    "max_hours_per_day": 3,  # On school days
    "max_hours_per_week": 18,  # During school weeks
    "max_hours_non_school_day": 8,
    "no_work_during_school": True,
    "restricted_industries": [
        "food_service_kitchen",
        "retail_cash_handling",
        "delivery",
        "customer_facing_solo"
    ]
}


def calculate_age(date_of_birth: str) -> int:
    """
    Calculate age from date of birth string (YYYY-MM-DD format)
    
    Args:
        date_of_birth: Date string in YYYY-MM-DD format
        
    Returns:
        Age in years
    """
    if not date_of_birth:
        return 0
    
    try:
        if isinstance(date_of_birth, str):
            dob = datetime.strptime(date_of_birth, "%Y-%m-%d").date()
        elif isinstance(date_of_birth, datetime):
            dob = date_of_birth.date()
        elif isinstance(date_of_birth, date):
            dob = date_of_birth
        else:
            return 0
            
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age
    except (ValueError, TypeError):
        return 0


def get_minimum_age(province: str) -> int:
    """
    Get the minimum working age for a province
    
    Args:
        province: 2-letter province code (e.g., 'ON', 'BC')
        
    Returns:
        Minimum working age for the province
    """
    province_upper = province.upper() if province else "ON"
    province_data = PROVINCIAL_MINIMUM_AGES.get(province_upper, PROVINCIAL_MINIMUM_AGES["ON"])
    return province_data["general"]


def get_unrestricted_age(province: str) -> int:
    """
    Get the age for unrestricted work in a province
    
    Args:
        province: 2-letter province code
        
    Returns:
        Age for unrestricted work
    """
    province_upper = province.upper() if province else "ON"
    province_data = PROVINCIAL_MINIMUM_AGES.get(province_upper, PROVINCIAL_MINIMUM_AGES["ON"])
    return province_data["unrestricted"]


def verify_age_compliance(
    date_of_birth: str,
    province: str
) -> Dict:
    """
    Verify if a worker meets age compliance requirements
    
    Args:
        date_of_birth: Date of birth in YYYY-MM-DD format
        province: 2-letter province code
        
    Returns:
        Dict with compliance status and details
    """
    age = calculate_age(date_of_birth)
    min_age = get_minimum_age(province)
    unrestricted_age = get_unrestricted_age(province)
    
    result = {
        "age": age,
        "date_of_birth": date_of_birth,
        "province": province,
        "minimum_age": min_age,
        "unrestricted_age": unrestricted_age,
        "is_compliant": False,
        "is_minor": age < 18,
        "is_young_worker": age < 16,
        "requires_parental_consent": False,
        "has_restrictions": False,
        "restrictions": [],
        "message": ""
    }
    
    # Check if meets minimum age
    if age < min_age:
        result["is_compliant"] = False
        result["message"] = f"Must be at least {min_age} years old to work in {province}. Current age: {age}"
        return result
    
    # Compliant but may have restrictions
    result["is_compliant"] = True
    
    if age < unrestricted_age:
        result["has_restrictions"] = True
        result["requires_parental_consent"] = True
        
        if age < 16:
            # Young worker restrictions
            result["restrictions"] = [
                f"Maximum {YOUNG_WORKER_RESTRICTIONS['max_hours_per_day']} hours on school days",
                f"Maximum {YOUNG_WORKER_RESTRICTIONS['max_hours_per_week']} hours per week during school",
                "Cannot work during school hours",
                "Limited to age-appropriate job types"
            ]
            result["message"] = f"Age {age}: Young worker restrictions apply. Parental consent required."
        else:
            # Minor restrictions (16-17)
            result["restrictions"] = [
                f"Maximum {MINOR_WORK_RESTRICTIONS['max_hours_per_day']} hours per day",
                f"Maximum {MINOR_WORK_RESTRICTIONS['max_hours_per_week']} hours per week",
                "No work between 11 PM and 6 AM",
                "Restricted from hazardous industries"
            ]
            result["message"] = f"Age {age}: Minor worker restrictions apply. Parental consent required."
    else:
        result["message"] = f"Age {age}: No work restrictions apply."
    
    return result


def validate_dob_format(date_of_birth: str) -> Tuple[bool, str]:
    """
    Validate date of birth format and reasonableness
    
    Args:
        date_of_birth: Date string to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not date_of_birth:
        return False, "Date of birth is required"
    
    try:
        dob = datetime.strptime(date_of_birth, "%Y-%m-%d").date()
    except ValueError:
        return False, "Invalid date format. Please use YYYY-MM-DD"
    
    today = date.today()
    
    # Check if date is in the future
    if dob > today:
        return False, "Date of birth cannot be in the future"
    
    # Check if age is reasonable (13-100 years old)
    age = calculate_age(date_of_birth)
    
    if age < 13:
        return False, "You must be at least 13 years old to register"
    
    if age > 100:
        return False, "Please enter a valid date of birth"
    
    return True, ""


def get_work_restrictions_for_age(age: int) -> Dict:
    """
    Get detailed work restrictions based on age
    
    Args:
        age: Worker's age
        
    Returns:
        Dict with applicable restrictions
    """
    if age >= 18:
        return {
            "category": "adult",
            "max_hours_per_day": None,  # No limit
            "max_hours_per_week": None,  # No limit
            "night_shift_allowed": True,
            "requires_parental_consent": False,
            "restricted_industries": [],
            "description": "No work restrictions"
        }
    elif age >= 16:
        return {
            "category": "minor",
            "max_hours_per_day": MINOR_WORK_RESTRICTIONS["max_hours_per_day"],
            "max_hours_per_week": MINOR_WORK_RESTRICTIONS["max_hours_per_week"],
            "night_shift_allowed": False,
            "requires_parental_consent": True,
            "restricted_industries": MINOR_WORK_RESTRICTIONS["restricted_industries"],
            "description": "Minor worker restrictions apply"
        }
    else:
        return {
            "category": "young_worker",
            "max_hours_per_day": YOUNG_WORKER_RESTRICTIONS["max_hours_per_day"],
            "max_hours_per_week": YOUNG_WORKER_RESTRICTIONS["max_hours_per_week"],
            "night_shift_allowed": False,
            "requires_parental_consent": True,
            "restricted_industries": MINOR_WORK_RESTRICTIONS["restricted_industries"] + YOUNG_WORKER_RESTRICTIONS["restricted_industries"],
            "description": "Young worker restrictions apply - limited hours and job types"
        }
