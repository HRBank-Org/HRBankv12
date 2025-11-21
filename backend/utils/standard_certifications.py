"""
Standard Certifications for Canadian Workforce
Based on Government of Canada and Ontario provincial standards
Organized by category for easier management
"""

STANDARD_CERTIFICATIONS = {
    "Red Seal Trades": {
        "icon": "🔴",
        "description": "Nationally recognized skilled trades certifications",
        "certifications": [
            "Red Seal - Automotive Service Technician",
            "Red Seal - Carpenter",
            "Red Seal - Electrician (Construction)",
            "Red Seal - Electrician (Industrial)",
            "Red Seal - Plumber",
            "Red Seal - Welder",
            "Red Seal - Heavy Equipment Technician",
            "Red Seal - HVAC Technician",
            "Red Seal - Powerline Technician",
            "Red Seal - Industrial Mechanic (Millwright)",
            "Red Seal - Cook",
            "Red Seal - Baker",
            "Red Seal - Hairstylist"
        ]
    },
    "Food Safety & Handling": {
        "icon": "🍽️",
        "description": "Food service and safety certifications",
        "certifications": [
            "Food Handler Certificate",
            "Food Safety Level 1",
            "Food Safety Level 2",
            "ServSafe Food Handler",
            "ServSafe Manager",
            "Safe Food Handling Certificate",
            "Allergy Awareness Training"
        ]
    },
    "Alcohol Service": {
        "icon": "🍺",
        "description": "Responsible alcohol service certifications",
        "certifications": [
            "Smart Serve Ontario",
            "ProServe (BC)",
            "Serving It Right (BC)",
            "It's Good 2 Know (Manitoba)",
            "TIPS Certified"
        ]
    },
    "Health & Safety": {
        "icon": "⚕️",
        "description": "Workplace health and safety certifications",
        "certifications": [
            "Standard First Aid & CPR Level C",
            "Emergency First Aid",
            "Occupational First Aid Level 1",
            "Occupational First Aid Level 2",
            "CPR & AED",
            "WHMIS 2015 (GHS)",
            "Working at Heights Training",
            "Confined Space Entry",
            "Fall Protection",
            "Forklift Operator Certification",
            "Workplace Hazardous Materials Information System (WHMIS)"
        ]
    },
    "Transportation & Logistics": {
        "icon": "🚛",
        "description": "Transportation and driving certifications",
        "certifications": [
            "Class G Driver's License",
            "Class G2 Driver's License",
            "Class D Driver's License (Commercial)",
            "Class C Driver's License (Commercial)",
            "Class A Driver's License (Commercial)",
            "Forklift Operator License",
            "Transportation of Dangerous Goods (TDG)",
            "Air Brake Endorsement",
            "School Bus Driver Training"
        ]
    },
    "Security & Protection": {
        "icon": "🛡️",
        "description": "Security and protection services",
        "certifications": [
            "Security Guard License",
            "Private Investigator License",
            "Use of Force Training",
            "Crowd Control Certification",
            "Loss Prevention Certification"
        ]
    },
    "Early Childhood Education": {
        "icon": "👶",
        "description": "Childcare and education certifications",
        "certifications": [
            "Early Childhood Education (ECE) Certificate",
            "Early Childhood Education (ECE) Diploma",
            "Registered Early Childhood Educator (RECE)",
            "Child Development Associate (CDA)",
            "Infant & Toddler Specialist",
            "Special Needs Training"
        ]
    },
    "Healthcare & Personal Support": {
        "icon": "🏥",
        "description": "Healthcare and personal support worker certifications",
        "certifications": [
            "Personal Support Worker (PSW) Certificate",
            "Nursing Assistant Certificate",
            "CPR & First Aid for Healthcare Providers",
            "Medication Administration",
            "Dementia Care Certification",
            "Palliative Care Training",
            "Home Care Aide Certification"
        ]
    },
    "Technology & IT": {
        "icon": "💻",
        "description": "Information technology certifications",
        "certifications": [
            "CompTIA A+",
            "CompTIA Network+",
            "CompTIA Security+",
            "Cisco CCNA",
            "Microsoft Certified Solutions Expert (MCSE)",
            "AWS Certified Solutions Architect",
            "Google Analytics Certification",
            "Project Management Professional (PMP)"
        ]
    },
    "Customer Service & Sales": {
        "icon": "🤝",
        "description": "Customer service and sales certifications",
        "certifications": [
            "Customer Service Excellence Certificate",
            "Retail Sales Training",
            "Point of Sale (POS) System Training",
            "Conflict Resolution Training",
            "Cash Handling Certification"
        ]
    },
    "Construction & Building": {
        "icon": "🏗️",
        "description": "Construction and building trade certifications",
        "certifications": [
            "Construction Safety Training System (CSTS)",
            "Scaffold User Training",
            "Crane Operator Certification",
            "Boom Lift Certification",
            "Skid Steer Loader Certification",
            "Excavator Operator Certification"
        ]
    },
    "Language Proficiency": {
        "icon": "🌐",
        "description": "Language proficiency certifications",
        "certifications": [
            "English as a Second Language (ESL) Certificate",
            "French as a Second Language (FSL) Certificate",
            "IELTS Certification",
            "TOEFL Certification",
            "Canadian Language Benchmarks (CLB) Assessment"
        ]
    }
}

def get_all_certification_categories():
    """Return list of all certification category names"""
    return list(STANDARD_CERTIFICATIONS.keys())

def get_category_certifications(category):
    """Return certifications for a specific category"""
    return STANDARD_CERTIFICATIONS.get(category, {}).get("certifications", [])

def get_all_certifications():
    """Return flat list of all certifications"""
    all_certs = []
    for category_data in STANDARD_CERTIFICATIONS.values():
        all_certs.extend(category_data.get("certifications", []))
    return sorted(all_certs)

def search_certifications(query):
    """Search certifications by query string"""
    query_lower = query.lower()
    results = []
    for category, data in STANDARD_CERTIFICATIONS.items():
        for cert in data.get("certifications", []):
            if query_lower in cert.lower():
                results.append({
                    "certification": cert,
                    "category": category
                })
    return results
