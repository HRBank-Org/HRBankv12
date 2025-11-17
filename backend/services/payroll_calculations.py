"""
Canadian Payroll Tax Calculations (2024 rates)
CPP, EI, Federal and Ontario Provincial Income Tax
"""
from datetime import datetime
from typing import Dict, Optional

# 2024 Canadian Payroll Tax Rates
# Source: CRA

# CPP (Canada Pension Plan) 2024
CPP_RATE = 0.0595  # 5.95% for both employee and employer
CPP_BASIC_EXEMPTION_ANNUAL = 3500.00
CPP_MAXIMUM_ANNUAL = 66600.00
CPP_MAXIMUM_CONTRIBUTION = (CPP_MAXIMUM_ANNUAL - CPP_BASIC_EXEMPTION_ANNUAL) * CPP_RATE  # $3754.45

# EI (Employment Insurance) 2024
EI_RATE = 0.0166  # 1.66% for employee (employer pays 1.4x this)
EI_MAXIMUM_ANNUAL = 63200.00
EI_MAXIMUM_CONTRIBUTION = EI_MAXIMUM_ANNUAL * EI_RATE  # $1049.12

# Federal Tax Brackets 2024 (Ontario)
FEDERAL_TAX_BRACKETS = [
    (55867, 0.15),      # 15% on first $55,867
    (111733, 0.205),    # 20.5% on next $55,866 ($55,868 to $111,733)
    (173205, 0.26),     # 26% on next $61,472 ($111,734 to $173,205)
    (246752, 0.29),     # 29% on next $73,547 ($173,206 to $246,752)
    (float('inf'), 0.33) # 33% on amount over $246,752
]

# Ontario Provincial Tax Brackets 2024
ONTARIO_TAX_BRACKETS = [
    (51446, 0.0505),    # 5.05% on first $51,446
    (102894, 0.0915),   # 9.15% on next $51,448 ($51,447 to $102,894)
    (150000, 0.1116),   # 11.16% on next $47,106 ($102,895 to $150,000)
    (220000, 0.1216),   # 12.16% on next $70,000 ($150,001 to $220,000)
    (float('inf'), 0.1316) # 13.16% on amount over $220,000
]

# Basic Personal Amount (BPA) 2024
FEDERAL_BPA = 15705.00
ONTARIO_BPA = 11865.00

# Ontario Minimum Wage 2024
ONTARIO_MINIMUM_WAGE = 16.55  # per hour as of Oct 2024


def calculate_cpp_deduction(gross_pay_ytd: float, current_gross: float) -> Dict[str, float]:
    """
    Calculate CPP deduction for current pay period
    
    Args:
        gross_pay_ytd: Year-to-date gross pay BEFORE this pay period
        current_gross: Gross pay for current pay period
    
    Returns:
        dict with employee_cpp, employer_cpp, pensionable_earnings
    """
    # Calculate annual exemption for this pay period (weekly = 52 periods)
    weekly_exemption = CPP_BASIC_EXEMPTION_ANNUAL / 52
    
    # Pensionable earnings for this period (after exemption)
    pensionable_this_period = max(0, current_gross - weekly_exemption)
    
    # Check if already at maximum contribution YTD
    new_ytd = gross_pay_ytd + current_gross
    if new_ytd > CPP_MAXIMUM_ANNUAL:
        # Already maxed out or will max out
        remaining_pensionable = max(0, CPP_MAXIMUM_ANNUAL - gross_pay_ytd)
        pensionable_this_period = min(pensionable_this_period, remaining_pensionable - (CPP_BASIC_EXEMPTION_ANNUAL / 52))
    
    employee_cpp = round(pensionable_this_period * CPP_RATE, 2)
    employer_cpp = employee_cpp  # Employer matches employee contribution
    
    return {
        "employee_cpp": employee_cpp,
        "employer_cpp": employer_cpp,
        "pensionable_earnings": round(pensionable_this_period, 2)
    }


def calculate_ei_deduction(gross_pay_ytd: float, current_gross: float) -> Dict[str, float]:
    """
    Calculate EI deduction for current pay period
    
    Args:
        gross_pay_ytd: Year-to-date gross pay BEFORE this pay period
        current_gross: Gross pay for current pay period
    
    Returns:
        dict with employee_ei, employer_ei, insurable_earnings
    """
    # Check if already at maximum insurable earnings
    new_ytd = gross_pay_ytd + current_gross
    if new_ytd > EI_MAXIMUM_ANNUAL:
        # Already maxed out or will max out
        insurable_this_period = max(0, EI_MAXIMUM_ANNUAL - gross_pay_ytd)
    else:
        insurable_this_period = current_gross
    
    employee_ei = round(insurable_this_period * EI_RATE, 2)
    employer_ei = round(employee_ei * 1.4, 2)  # Employer pays 1.4x employee rate
    
    return {
        "employee_ei": employee_ei,
        "employer_ei": employer_ei,
        "insurable_earnings": round(insurable_this_period, 2)
    }


def calculate_federal_tax(annual_income: float, claim_amount: float = None) -> float:
    """
    Calculate federal income tax using progressive brackets
    
    Args:
        annual_income: Annual taxable income
        claim_amount: Federal basic personal amount (default: standard BPA)
    
    Returns:
        Annual federal tax amount
    """
    if claim_amount is None:
        claim_amount = FEDERAL_BPA
    
    # Reduce taxable income by claim amount
    taxable_income = max(0, annual_income - claim_amount)
    
    if taxable_income == 0:
        return 0
    
    tax = 0
    previous_bracket = 0
    
    for bracket_limit, rate in FEDERAL_TAX_BRACKETS:
        if taxable_income <= bracket_limit:
            tax += (taxable_income - previous_bracket) * rate
            break
        else:
            tax += (bracket_limit - previous_bracket) * rate
            previous_bracket = bracket_limit
    
    return round(tax, 2)


def calculate_ontario_tax(annual_income: float, claim_amount: float = None) -> float:
    """
    Calculate Ontario provincial income tax using progressive brackets
    
    Args:
        annual_income: Annual taxable income
        claim_amount: Ontario basic personal amount (default: standard BPA)
    
    Returns:
        Annual provincial tax amount
    """
    if claim_amount is None:
        claim_amount = ONTARIO_BPA
    
    # Reduce taxable income by claim amount
    taxable_income = max(0, annual_income - claim_amount)
    
    if taxable_income == 0:
        return 0
    
    tax = 0
    previous_bracket = 0
    
    for bracket_limit, rate in ONTARIO_TAX_BRACKETS:
        if taxable_income <= bracket_limit:
            tax += (taxable_income - previous_bracket) * rate
            break
        else:
            tax += (bracket_limit - previous_bracket) * rate
            previous_bracket = bracket_limit
    
    return round(tax, 2)


def estimate_annual_income_from_weekly(weekly_gross: float, weeks_worked_ytd: int = 1) -> float:
    """
    Estimate annual income based on current weekly pay
    Used for tax calculations
    
    Args:
        weekly_gross: Gross pay for this week
        weeks_worked_ytd: Number of weeks worked year-to-date
    
    Returns:
        Estimated annual income
    """
    # Simple method: assume this week's pay continues for full year
    return weekly_gross * 52


def calculate_income_tax_deduction(
    current_gross: float,
    gross_pay_ytd: float,
    weeks_worked_ytd: int = 1,
    federal_claim: float = None,
    provincial_claim: float = None
) -> Dict[str, float]:
    """
    Calculate federal and provincial income tax deductions for current pay period
    
    Args:
        current_gross: Gross pay for current pay period (weekly)
        gross_pay_ytd: Year-to-date gross pay BEFORE this pay period
        weeks_worked_ytd: Number of weeks worked so far this year
        federal_claim: Federal TD1 claim amount
        provincial_claim: Provincial TD1 claim amount
    
    Returns:
        dict with federal_tax, provincial_tax, total_tax
    """
    # Estimate annual income
    new_ytd = gross_pay_ytd + current_gross
    estimated_annual = estimate_annual_income_from_weekly(current_gross, weeks_worked_ytd)
    
    # Use actual YTD if available and higher (more accurate)
    if weeks_worked_ytd > 0:
        ytd_annual_rate = new_ytd / weeks_worked_ytd * 52
        estimated_annual = max(estimated_annual, ytd_annual_rate)
    
    # Calculate annual tax amounts
    annual_federal_tax = calculate_federal_tax(estimated_annual, federal_claim)
    annual_provincial_tax = calculate_ontario_tax(estimated_annual, provincial_claim)
    
    # Convert to weekly deduction
    weekly_federal = round(annual_federal_tax / 52, 2)
    weekly_provincial = round(annual_provincial_tax / 52, 2)
    
    return {
        "federal_tax": weekly_federal,
        "provincial_tax": weekly_provincial,
        "total_tax": round(weekly_federal + weekly_provincial, 2),
        "estimated_annual_income": round(estimated_annual, 2)
    }


def calculate_payroll_for_period(
    gross_pay: float,
    gross_pay_ytd: float = 0,
    weeks_worked_ytd: int = 1,
    federal_td1: float = None,
    provincial_td1: float = None,
    include_cpp: bool = True,
    include_ei: bool = True,
    include_federal_tax: bool = True,
    include_provincial_tax: bool = True
) -> Dict[str, float]:
    """
    Complete payroll calculation for a pay period
    
    Args:
        gross_pay: Gross pay for this period
        gross_pay_ytd: Year-to-date gross pay BEFORE this period
        weeks_worked_ytd: Weeks worked year-to-date
        federal_td1: Federal TD1 claim amount
        provincial_td1: Provincial TD1 claim amount
        include_cpp: Calculate CPP deduction
        include_ei: Calculate EI deduction
        include_federal_tax: Calculate federal tax
        include_provincial_tax: Calculate provincial tax
    
    Returns:
        Complete payroll calculation breakdown
    """
    results = {
        "gross_pay": round(gross_pay, 2),
        "employee_cpp": 0,
        "employee_ei": 0,
        "federal_tax": 0,
        "provincial_tax": 0,
        "total_deductions": 0,
        "net_pay": 0,
        "employer_cpp": 0,
        "employer_ei": 0,
        "employer_total": 0
    }
    
    # CPP Calculation
    if include_cpp:
        cpp = calculate_cpp_deduction(gross_pay_ytd, gross_pay)
        results["employee_cpp"] = cpp["employee_cpp"]
        results["employer_cpp"] = cpp["employer_cpp"]
    
    # EI Calculation
    if include_ei:
        ei = calculate_ei_deduction(gross_pay_ytd, gross_pay)
        results["employee_ei"] = ei["employee_ei"]
        results["employer_ei"] = ei["employer_ei"]
    
    # Income Tax Calculation
    if include_federal_tax or include_provincial_tax:
        tax = calculate_income_tax_deduction(
            gross_pay, 
            gross_pay_ytd, 
            weeks_worked_ytd,
            federal_td1,
            provincial_td1
        )
        if include_federal_tax:
            results["federal_tax"] = tax["federal_tax"]
        if include_provincial_tax:
            results["provincial_tax"] = tax["provincial_tax"]
    
    # Calculate totals
    results["total_deductions"] = round(
        results["employee_cpp"] + 
        results["employee_ei"] + 
        results["federal_tax"] + 
        results["provincial_tax"], 
        2
    )
    results["net_pay"] = round(gross_pay - results["total_deductions"], 2)
    results["employer_total"] = round(results["employer_cpp"] + results["employer_ei"], 2)
    
    return results


def validate_minimum_wage(hourly_rate: float, hours: float) -> Dict[str, any]:
    """
    Validate that pay meets Ontario minimum wage
    
    Returns:
        dict with is_valid, required_minimum, shortfall
    """
    minimum_gross = hours * ONTARIO_MINIMUM_WAGE
    actual_gross = hours * hourly_rate
    
    return {
        "is_valid": actual_gross >= minimum_gross,
        "required_minimum": round(minimum_gross, 2),
        "actual_gross": round(actual_gross, 2),
        "shortfall": round(max(0, minimum_gross - actual_gross), 2),
        "minimum_wage": ONTARIO_MINIMUM_WAGE
    }
