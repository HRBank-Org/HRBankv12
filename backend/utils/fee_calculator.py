"""
Platform Fee Calculator
Handles pricing structure for the HR Bank platform
"""

from typing import Dict
from utils.occupation_categories import MINIMUM_WAGE, PLATFORM_FEE_PER_HOUR

def calculate_fees(hourly_rate: float, minimum_rate: float = None) -> Dict:
    """
    Calculate platform fees based on hourly rate
    
    Fee Structure:
    - Minimum wage jobs: $1/hour fee to employer only
    - Above minimum wage: $1/hour fee to BOTH worker and employer
    
    Args:
        hourly_rate: The gross hourly rate for the position
        minimum_rate: The minimum rate for this occupation (optional)
    
    Returns:
        Dictionary with fee breakdown
    """
    
    # Determine if this is a minimum wage job
    is_minimum_wage = hourly_rate <= (minimum_rate or MINIMUM_WAGE)
    
    if is_minimum_wage:
        # Minimum wage: Only employer pays platform fee
        worker_fee = 0.00
        employer_fee = PLATFORM_FEE_PER_HOUR
        worker_net = hourly_rate
        employer_cost = hourly_rate + employer_fee
        platform_revenue = employer_fee
    else:
        # Above minimum wage: Both parties pay platform fee
        worker_fee = PLATFORM_FEE_PER_HOUR
        employer_fee = PLATFORM_FEE_PER_HOUR
        worker_net = hourly_rate - worker_fee
        employer_cost = hourly_rate + employer_fee
        platform_revenue = worker_fee + employer_fee
    
    return {
        "hourly_rate": round(hourly_rate, 2),
        "is_minimum_wage": is_minimum_wage,
        "worker_gross": round(hourly_rate, 2),
        "worker_fee": round(worker_fee, 2),
        "worker_net": round(worker_net, 2),
        "employer_pays": round(employer_cost, 2),
        "employer_fee": round(employer_fee, 2),
        "platform_revenue_per_hour": round(platform_revenue, 2),
        "fee_structure": "employer_only" if is_minimum_wage else "both_parties"
    }

def calculate_shift_fees(hourly_rate: float, duration_hours: float, minimum_rate: float = None) -> Dict:
    """
    Calculate total fees for a complete shift
    
    Args:
        hourly_rate: The gross hourly rate
        duration_hours: Number of hours worked
        minimum_rate: The minimum rate for this occupation
    
    Returns:
        Dictionary with total fee breakdown
    """
    
    hourly_fees = calculate_fees(hourly_rate, minimum_rate)
    
    return {
        **hourly_fees,
        "duration_hours": round(duration_hours, 2),
        "worker_gross_total": round(hourly_rate * duration_hours, 2),
        "worker_fee_total": round(hourly_fees["worker_fee"] * duration_hours, 2),
        "worker_net_total": round(hourly_fees["worker_net"] * duration_hours, 2),
        "employer_cost_total": round(hourly_fees["employer_pays"] * duration_hours, 2),
        "platform_revenue_total": round(hourly_fees["platform_revenue_per_hour"] * duration_hours, 2)
    }

def get_minimum_rate_for_occupation(occupation_title: str) -> float:
    """
    Get the minimum hourly rate for a specific occupation
    
    Args:
        occupation_title: The occupation title
    
    Returns:
        Minimum hourly rate, or general minimum wage if not found
    """
    from utils.occupation_categories import OCCUPATION_CATEGORIES
    
    occupation_title_lower = occupation_title.lower()
    
    for category_data in OCCUPATION_CATEGORIES.values():
        for occ in category_data.get("occupations", []):
            if isinstance(occ, dict):
                occ_title = occ.get("title", "").lower()
                if occ_title == occupation_title_lower:
                    return occ.get("minimum_hourly_rate", MINIMUM_WAGE)
            elif isinstance(occ, str):
                if occ.lower() == occupation_title_lower:
                    return MINIMUM_WAGE
    
    return MINIMUM_WAGE

def validate_hourly_rate(hourly_rate: float, occupation_title: str) -> Dict:
    """
    Validate if the hourly rate meets the minimum for the occupation
    
    Args:
        hourly_rate: Proposed hourly rate
        occupation_title: The occupation title
    
    Returns:
        Dictionary with validation result
    """
    
    minimum_rate = get_minimum_rate_for_occupation(occupation_title)
    
    is_valid = hourly_rate >= minimum_rate
    
    return {
        "is_valid": is_valid,
        "hourly_rate": hourly_rate,
        "minimum_required": minimum_rate,
        "occupation": occupation_title,
        "error": None if is_valid else f"Hourly rate must be at least ${minimum_rate:.2f} for {occupation_title}"
    }
