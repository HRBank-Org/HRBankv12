"""
Credential Type Guardrails

This module defines which credential types each institution type is authorized to issue.
Prevents institutions from issuing credentials beyond their accreditation level.

Example: A forklift training school cannot issue a Bachelor's Degree.
"""

from typing import Dict, List, Optional
from fastapi import HTTPException, status

# Define credential type hierarchy (from lowest to highest)
CREDENTIAL_TYPE_LEVELS = {
    "badge": 1,              # Achievement badges, participation
    "micro_credential": 2,    # Short courses, workshops
    "certificate": 3,         # Vocational certificates, trade certifications
    "diploma": 4,             # College diplomas
    "associate_degree": 5,    # Associate degrees (2-year)
    "bachelor_degree": 6,     # Bachelor's degrees
    "graduate_certificate": 7,# Post-grad certificates
    "master_degree": 8,       # Master's degrees
    "doctoral_degree": 9,     # PhD, Doctoral degrees
    "professional_license": 10 # Professional licenses (medical, legal, engineering)
}

# Map credential types to their common names for display
CREDENTIAL_TYPE_NAMES = {
    "badge": "Badge",
    "micro_credential": "Micro-credential",
    "certificate": "Certificate",
    "diploma": "Diploma",
    "associate_degree": "Associate Degree",
    "bachelor_degree": "Bachelor's Degree",
    "graduate_certificate": "Graduate Certificate",
    "master_degree": "Master's Degree",
    "doctoral_degree": "Doctoral Degree",
    "professional_license": "Professional License"
}

# Define what each institution type is authorized to issue
# Max level indicates the highest credential type they can issue
INSTITUTION_TYPE_AUTHORIZATION = {
    "training_center": {
        "max_level": 3,  # Up to Certificate
        "allowed_types": ["badge", "micro_credential", "certificate"],
        "description": "Training centers and vocational schools"
    },
    "certification_body": {
        "max_level": 3,  # Up to Certificate
        "allowed_types": ["badge", "micro_credential", "certificate"],
        "description": "Professional certification bodies"
    },
    "technical_institute": {
        "max_level": 4,  # Up to Diploma
        "allowed_types": ["badge", "micro_credential", "certificate", "diploma"],
        "description": "Technical institutes and polytechnics"
    },
    "college": {
        "max_level": 5,  # Up to Associate Degree
        "allowed_types": ["badge", "micro_credential", "certificate", "diploma", "associate_degree"],
        "description": "Community colleges and colleges"
    },
    "university": {
        "max_level": 9,  # Up to Doctoral
        "allowed_types": ["badge", "micro_credential", "certificate", "diploma", "associate_degree", 
                         "bachelor_degree", "graduate_certificate", "master_degree", "doctoral_degree"],
        "description": "Accredited universities"
    },
    "government": {
        "max_level": 10,  # Can issue professional licenses
        "allowed_types": ["badge", "micro_credential", "certificate", "professional_license"],
        "description": "Government agencies and regulatory bodies"
    },
    "employer": {
        "max_level": 2,  # Up to Micro-credential only
        "allowed_types": ["badge", "micro_credential"],
        "description": "Employers issuing internal training credentials"
    },
    "other": {
        "max_level": 2,  # Up to Micro-credential only
        "allowed_types": ["badge", "micro_credential"],
        "description": "Other institution types"
    }
}

def normalize_credential_type(credential_type: str) -> str:
    """
    Normalize credential type string to match our internal format.
    Handles various input formats like "Bachelor's Degree", "Bachelors", "degree", etc.
    """
    if not credential_type:
        return "certificate"
    
    ct = credential_type.lower().strip()
    
    # Handle common variations
    if "doctoral" in ct or "phd" in ct or "doctorate" in ct:
        return "doctoral_degree"
    if "master" in ct or "msc" in ct or "mba" in ct or "ma " in ct:
        return "master_degree"
    if "bachelor" in ct or "bsc" in ct or "ba " in ct or "b.sc" in ct:
        return "bachelor_degree"
    if "associate" in ct or "2-year" in ct or "two-year" in ct:
        return "associate_degree"
    if "graduate cert" in ct or "post-grad" in ct or "postgrad" in ct:
        return "graduate_certificate"
    if "diploma" in ct:
        return "diploma"
    if "certificate" in ct or "cert" in ct:
        return "certificate"
    if "micro" in ct or "short course" in ct or "workshop" in ct:
        return "micro_credential"
    if "badge" in ct or "achievement" in ct:
        return "badge"
    if "license" in ct or "licence" in ct or "professional" in ct:
        return "professional_license"
    if "degree" in ct:
        return "bachelor_degree"  # Default degree to bachelor's if unspecified
    
    return "certificate"  # Default fallback

def get_institution_allowed_credentials(institution_type: str) -> Dict:
    """
    Get the list of credential types an institution is authorized to issue.
    
    Returns:
        Dict containing allowed_types list and max_level
    """
    normalized_type = institution_type.lower().strip() if institution_type else "other"
    
    # Handle common variations
    if "train" in normalized_type or "school" in normalized_type or "academy" in normalized_type:
        normalized_type = "training_center"
    elif "certif" in normalized_type:
        normalized_type = "certification_body"
    elif "tech" in normalized_type or "polytech" in normalized_type or "institute" in normalized_type:
        normalized_type = "technical_institute"
    elif "college" in normalized_type and "university" not in normalized_type:
        normalized_type = "college"
    elif "university" in normalized_type or "universite" in normalized_type:
        normalized_type = "university"
    elif "government" in normalized_type or "ministry" in normalized_type:
        normalized_type = "government"
    elif "employer" in normalized_type or "company" in normalized_type:
        normalized_type = "employer"
    
    return INSTITUTION_TYPE_AUTHORIZATION.get(normalized_type, INSTITUTION_TYPE_AUTHORIZATION["other"])

def validate_credential_issuance(
    institution_type: str, 
    credential_type: str,
    institution_name: Optional[str] = None
) -> Dict:
    """
    Validate if an institution is authorized to issue a specific credential type.
    
    Args:
        institution_type: Type of institution (college, university, training_center, etc.)
        credential_type: Type of credential being issued
        institution_name: Optional name for error messages
        
    Returns:
        Dict with 'authorized' boolean and details
        
    Raises:
        HTTPException if not authorized
    """
    normalized_cred_type = normalize_credential_type(credential_type)
    auth_config = get_institution_allowed_credentials(institution_type)
    
    is_authorized = normalized_cred_type in auth_config["allowed_types"]
    
    if not is_authorized:
        # Build helpful error message
        allowed_names = [CREDENTIAL_TYPE_NAMES.get(t, t) for t in auth_config["allowed_types"]]
        requested_name = CREDENTIAL_TYPE_NAMES.get(normalized_cred_type, credential_type)
        
        detail = (
            f"Your institution type ({institution_type}) is not authorized to issue '{requested_name}'. "
            f"Authorized credential types for your institution: {', '.join(allowed_names)}. "
            f"To issue higher-level credentials, your institution's accreditation must be upgraded."
        )
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )
    
    return {
        "authorized": True,
        "credential_type": normalized_cred_type,
        "credential_name": CREDENTIAL_TYPE_NAMES.get(normalized_cred_type, credential_type),
        "institution_type": institution_type,
        "max_allowed_level": auth_config["max_level"]
    }

def get_credential_types_for_institution(institution_type: str) -> List[Dict]:
    """
    Get list of credential types available for an institution type.
    Used for dropdown menus in the frontend.
    
    Returns:
        List of credential type options with id, name, and level
    """
    auth_config = get_institution_allowed_credentials(institution_type)
    
    return [
        {
            "id": cred_type,
            "name": CREDENTIAL_TYPE_NAMES.get(cred_type, cred_type),
            "level": CREDENTIAL_TYPE_LEVELS.get(cred_type, 0)
        }
        for cred_type in auth_config["allowed_types"]
    ]
