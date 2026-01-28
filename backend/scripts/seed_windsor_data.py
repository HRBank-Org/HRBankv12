"""
HR Bank - Production Seed Data
Real businesses and locations in Windsor-Essex-Leamington, Ontario

Creates:
- St. Clair College (Institution)
- Loose Goose Pub (Employer with 3 locations)
- 10 WorkPassport users (credential holders)
- 30 Workforce users (shift workers)
- 2 months of shifts
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import random
import uuid
import hashlib

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ============================================================================
# CONFIGURATION
# ============================================================================

# St. Clair College - Real Institution
ST_CLAIR_COLLEGE = {
    "institution_id": "inst_stclair_windsor",
    "email": "credentials@stclair.ca",
    "password": "StClair2026!",
    "institution_name": "St. Clair College",
    "institution_type": "college",
    "address": "2000 Talbot Road West",
    "city": "Windsor",
    "province": "Ontario",
    "postal_code": "N9A 6S4",
    "country": "Canada",
    "phone": "+1-519-972-2727",
    "website": "https://www.stclair.ca",
    "contact_name": "Dr. Patricia France",
    "contact_email": "credentials@stclair.ca",
    "contact_phone": "+1-519-972-2727",
    "latitude": 42.2734,
    "longitude": -83.0131,
    "logo_url": "https://www.stclair.ca/images/stclair-logo.png",
    "description": "St. Clair College is a leader in applied education, preparing students for careers in business, health sciences, community studies, skilled trades, engineering, and more.",
    "programs": [
        "Culinary Management",
        "Business Administration", 
        "Hospitality Management",
        "Police Foundations",
        "Nursing",
        "Computer Systems Technician",
        "Electrical Engineering Technology",
        "Early Childhood Education"
    ]
}

# Loose Goose Pub - Employer with multiple locations
LOOSE_GOOSE_EMPLOYER = {
    "employer_id": "emp_loosegoose",
    "email": "hr@loosegoose.ca",
    "password": "LooseGoose2026!",
    "company_name": "Loose Goose Hospitality Group",
    "business_type": "Restaurant & Pub",
    "head_office_address": "123 Ouellette Avenue",
    "city": "Windsor",
    "province": "Ontario",
    "postal_code": "N9A 1A1",
    "country": "Canada",
    "phone": "+1-519-555-4673",
    "website": "https://www.loosegoose.ca",
    "contact_name": "Marcus Thompson",
    "contact_email": "marcus@loosegoose.ca",
    "contact_phone": "+1-519-555-4673",
    "logo_url": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200",
    "description": "Loose Goose is Windsor-Essex's favorite pub chain, serving great food, craft beer, and good times since 2010."
}

# Loose Goose Locations
LOOSE_GOOSE_LOCATIONS = [
    {
        "location_id": "loc_lg_downtown",
        "name": "Loose Goose Downtown Windsor",
        "address": "123 Ouellette Avenue",
        "city": "Windsor",
        "province": "Ontario",
        "postal_code": "N9A 1A1",
        "latitude": 42.3149,
        "longitude": -83.0364,
        "phone": "+1-519-555-4673",
        "geofence_radius": 100,
        "operating_hours": {
            "monday": {"open": "11:00", "close": "02:00"},
            "tuesday": {"open": "11:00", "close": "02:00"},
            "wednesday": {"open": "11:00", "close": "02:00"},
            "thursday": {"open": "11:00", "close": "02:00"},
            "friday": {"open": "11:00", "close": "02:00"},
            "saturday": {"open": "10:00", "close": "02:00"},
            "sunday": {"open": "10:00", "close": "00:00"}
        }
    },
    {
        "location_id": "loc_lg_tecumseh",
        "name": "Loose Goose Tecumseh",
        "address": "13300 Tecumseh Road East",
        "city": "Tecumseh",
        "province": "Ontario",
        "postal_code": "N8N 4R8",
        "latitude": 42.3076,
        "longitude": -82.8856,
        "phone": "+1-519-555-4674",
        "geofence_radius": 100,
        "operating_hours": {
            "monday": {"open": "11:00", "close": "01:00"},
            "tuesday": {"open": "11:00", "close": "01:00"},
            "wednesday": {"open": "11:00", "close": "01:00"},
            "thursday": {"open": "11:00", "close": "02:00"},
            "friday": {"open": "11:00", "close": "02:00"},
            "saturday": {"open": "10:00", "close": "02:00"},
            "sunday": {"open": "10:00", "close": "23:00"}
        }
    },
    {
        "location_id": "loc_lg_leamington",
        "name": "Loose Goose Leamington",
        "address": "33 Erie Street South",
        "city": "Leamington",
        "province": "Ontario",
        "postal_code": "N8H 3B5",
        "latitude": 42.0534,
        "longitude": -82.5996,
        "phone": "+1-519-555-4675",
        "geofence_radius": 100,
        "operating_hours": {
            "monday": {"open": "11:00", "close": "00:00"},
            "tuesday": {"open": "11:00", "close": "00:00"},
            "wednesday": {"open": "11:00", "close": "00:00"},
            "thursday": {"open": "11:00", "close": "01:00"},
            "friday": {"open": "11:00", "close": "02:00"},
            "saturday": {"open": "10:00", "close": "02:00"},
            "sunday": {"open": "10:00", "close": "22:00"}
        }
    }
]

# WorkPassport Users (10) - Credential holders from St. Clair College
WORKPASSPORT_USERS = [
    {
        "user_id": "wp_sarah_chen",
        "email": "sarah.chen@gmail.com",
        "password": "SarahChen2026!",
        "first_name": "Sarah",
        "last_name": "Chen",
        "phone": "+1-519-555-1001",
        "address": "456 University Avenue West",
        "city": "Windsor",
        "province": "Ontario",
        "postal_code": "N9A 5P4",
        "date_of_birth": "1998-03-15",
        "program": "Culinary Management",
        "graduation_year": 2022,
        "student_id": "1234567",
        "gpa": "3.8",
        "photo_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200"
    },
    {
        "user_id": "wp_marcus_williams",
        "email": "marcus.williams@outlook.com",
        "password": "MarcusW2026!",
        "first_name": "Marcus",
        "last_name": "Williams",
        "phone": "+1-519-555-1002",
        "address": "789 Riverside Drive East",
        "city": "Windsor",
        "province": "Ontario",
        "postal_code": "N8S 1G5",
        "date_of_birth": "1999-07-22",
        "program": "Business Administration",
        "graduation_year": 2023,
        "student_id": "1234568",
        "gpa": "3.5",
        "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
    },
    {
        "user_id": "wp_emily_rodriguez",
        "email": "emily.rodriguez@yahoo.com",
        "password": "EmilyR2026!",
        "first_name": "Emily",
        "last_name": "Rodriguez",
        "phone": "+1-519-555-1003",
        "address": "321 Wyandotte Street West",
        "city": "Windsor",
        "province": "Ontario",
        "postal_code": "N9A 5X1",
        "date_of_birth": "2000-01-10",
        "program": "Hospitality Management",
        "graduation_year": 2024,
        "student_id": "1234569",
        "gpa": "3.9",
        "photo_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200"
    },
    {
        "user_id": "wp_james_patel",
        "email": "james.patel@gmail.com",
        "password": "JamesP2026!",
        "first_name": "James",
        "last_name": "Patel",
        "phone": "+1-519-555-1004",
        "address": "567 Dougall Avenue",
        "city": "Windsor",
        "province": "Ontario",
        "postal_code": "N9A 4J3",
        "date_of_birth": "1997-11-28",
        "program": "Police Foundations",
        "graduation_year": 2021,
        "student_id": "1234570",
        "gpa": "3.6",
        "photo_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200"
    },
    {
        "user_id": "wp_olivia_thompson",
        "email": "olivia.thompson@hotmail.com",
        "password": "OliviaT2026!",
        "first_name": "Olivia",
        "last_name": "Thompson",
        "phone": "+1-519-555-1005",
        "address": "890 Howard Avenue",
        "city": "Windsor",
        "province": "Ontario",
        "postal_code": "N8X 3Y4",
        "date_of_birth": "2001-05-03",
        "program": "Nursing",
        "graduation_year": 2025,
        "student_id": "1234571",
        "gpa": "3.7",
        "photo_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200"
    },
    {
        "user_id": "wp_david_nguyen",
        "email": "david.nguyen@gmail.com",
        "password": "DavidN2026!",
        "first_name": "David",
        "last_name": "Nguyen",
        "phone": "+1-519-555-1006",
        "address": "234 Tecumseh Road West",
        "city": "Windsor",
        "province": "Ontario",
        "postal_code": "N8X 1E8",
        "date_of_birth": "1998-09-17",
        "program": "Computer Systems Technician",
        "graduation_year": 2022,
        "student_id": "1234572",
        "gpa": "3.4",
        "photo_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200"
    },
    {
        "user_id": "wp_jessica_brown",
        "email": "jessica.brown@outlook.com",
        "password": "JessicaB2026!",
        "first_name": "Jessica",
        "last_name": "Brown",
        "phone": "+1-519-555-1007",
        "address": "678 Erie Street East",
        "city": "Leamington",
        "province": "Ontario",
        "postal_code": "N8H 1K5",
        "date_of_birth": "1999-12-05",
        "program": "Early Childhood Education",
        "graduation_year": 2023,
        "student_id": "1234573",
        "gpa": "3.8",
        "photo_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
    },
    {
        "user_id": "wp_michael_santos",
        "email": "michael.santos@yahoo.com",
        "password": "MichaelS2026!",
        "first_name": "Michael",
        "last_name": "Santos",
        "phone": "+1-519-555-1008",
        "address": "901 Lauzon Road",
        "city": "Windsor",
        "province": "Ontario",
        "postal_code": "N8S 3N2",
        "date_of_birth": "2000-06-20",
        "program": "Electrical Engineering Technology",
        "graduation_year": 2024,
        "student_id": "1234574",
        "gpa": "3.3",
        "photo_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200"
    },
    {
        "user_id": "wp_ashley_kim",
        "email": "ashley.kim@gmail.com",
        "password": "AshleyK2026!",
        "first_name": "Ashley",
        "last_name": "Kim",
        "phone": "+1-519-555-1009",
        "address": "543 Manning Road",
        "city": "Tecumseh",
        "province": "Ontario",
        "postal_code": "N8N 2L9",
        "date_of_birth": "1997-02-14",
        "program": "Culinary Management",
        "graduation_year": 2021,
        "student_id": "1234575",
        "gpa": "3.9",
        "photo_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200"
    },
    {
        "user_id": "wp_ryan_oconnor",
        "email": "ryan.oconnor@hotmail.com",
        "password": "RyanO2026!",
        "first_name": "Ryan",
        "last_name": "O'Connor",
        "phone": "+1-519-555-1010",
        "address": "876 Walker Road",
        "city": "Windsor",
        "province": "Ontario",
        "postal_code": "N8Y 2N6",
        "date_of_birth": "2001-08-30",
        "program": "Business Administration",
        "graduation_year": 2025,
        "student_id": "1234576",
        "gpa": "3.6",
        "photo_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200"
    }
]

# Workforce Users (30) - Shift workers at Loose Goose
WORKFORCE_USERS = [
    # Servers (10)
    {"user_id": "wf_001", "email": "amanda.foster@gmail.com", "first_name": "Amanda", "last_name": "Foster", "role": "Server", "location": "loc_lg_downtown", "phone": "+1-519-555-2001", "photo_url": "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200", "hourly_rate": 16.55},
    {"user_id": "wf_002", "email": "brandon.lee@outlook.com", "first_name": "Brandon", "last_name": "Lee", "role": "Server", "location": "loc_lg_downtown", "phone": "+1-519-555-2002", "photo_url": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200", "hourly_rate": 16.55},
    {"user_id": "wf_003", "email": "catherine.martin@yahoo.com", "first_name": "Catherine", "last_name": "Martin", "role": "Server", "location": "loc_lg_tecumseh", "phone": "+1-519-555-2003", "photo_url": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200", "hourly_rate": 16.55},
    {"user_id": "wf_004", "email": "derek.wong@gmail.com", "first_name": "Derek", "last_name": "Wong", "role": "Server", "location": "loc_lg_tecumseh", "phone": "+1-519-555-2004", "photo_url": "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200", "hourly_rate": 16.55},
    {"user_id": "wf_005", "email": "elena.garcia@hotmail.com", "first_name": "Elena", "last_name": "Garcia", "role": "Server", "location": "loc_lg_leamington", "phone": "+1-519-555-2005", "photo_url": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200", "hourly_rate": 16.55},
    {"user_id": "wf_006", "email": "frank.johnson@gmail.com", "first_name": "Frank", "last_name": "Johnson", "role": "Server", "location": "loc_lg_leamington", "phone": "+1-519-555-2006", "photo_url": "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200", "hourly_rate": 16.55},
    {"user_id": "wf_007", "email": "grace.taylor@outlook.com", "first_name": "Grace", "last_name": "Taylor", "role": "Server", "location": "loc_lg_downtown", "phone": "+1-519-555-2007", "photo_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200", "hourly_rate": 16.55},
    {"user_id": "wf_008", "email": "henry.anderson@yahoo.com", "first_name": "Henry", "last_name": "Anderson", "role": "Server", "location": "loc_lg_tecumseh", "phone": "+1-519-555-2008", "photo_url": "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=200", "hourly_rate": 16.55},
    {"user_id": "wf_009", "email": "isabella.davis@gmail.com", "first_name": "Isabella", "last_name": "Davis", "role": "Server", "location": "loc_lg_downtown", "phone": "+1-519-555-2009", "photo_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200", "hourly_rate": 16.55},
    {"user_id": "wf_010", "email": "jacob.miller@hotmail.com", "first_name": "Jacob", "last_name": "Miller", "role": "Server", "location": "loc_lg_leamington", "phone": "+1-519-555-2010", "photo_url": "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=200", "hourly_rate": 16.55},
    
    # Bartenders (6)
    {"user_id": "wf_011", "email": "kevin.white@gmail.com", "first_name": "Kevin", "last_name": "White", "role": "Bartender", "location": "loc_lg_downtown", "phone": "+1-519-555-2011", "photo_url": "https://images.unsplash.com/photo-1528892952291-009c663ce843?w=200", "hourly_rate": 18.00},
    {"user_id": "wf_012", "email": "laura.harris@outlook.com", "first_name": "Laura", "last_name": "Harris", "role": "Bartender", "location": "loc_lg_downtown", "phone": "+1-519-555-2012", "photo_url": "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=200", "hourly_rate": 18.00},
    {"user_id": "wf_013", "email": "matthew.clark@yahoo.com", "first_name": "Matthew", "last_name": "Clark", "role": "Bartender", "location": "loc_lg_tecumseh", "phone": "+1-519-555-2013", "photo_url": "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=200", "hourly_rate": 18.00},
    {"user_id": "wf_014", "email": "nicole.lewis@gmail.com", "first_name": "Nicole", "last_name": "Lewis", "role": "Bartender", "location": "loc_lg_tecumseh", "phone": "+1-519-555-2014", "photo_url": "https://images.unsplash.com/photo-1496440737103-cd596325d314?w=200", "hourly_rate": 18.00},
    {"user_id": "wf_015", "email": "oliver.walker@hotmail.com", "first_name": "Oliver", "last_name": "Walker", "role": "Bartender", "location": "loc_lg_leamington", "phone": "+1-519-555-2015", "photo_url": "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=200", "hourly_rate": 18.00},
    {"user_id": "wf_016", "email": "patricia.hall@outlook.com", "first_name": "Patricia", "last_name": "Hall", "role": "Bartender", "location": "loc_lg_leamington", "phone": "+1-519-555-2016", "photo_url": "https://images.unsplash.com/photo-1502767089025-6572583495b9?w=200", "hourly_rate": 18.00},
    
    # Cooks (8)
    {"user_id": "wf_017", "email": "quincy.young@gmail.com", "first_name": "Quincy", "last_name": "Young", "role": "Line Cook", "location": "loc_lg_downtown", "phone": "+1-519-555-2017", "photo_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200", "hourly_rate": 19.50},
    {"user_id": "wf_018", "email": "rachel.king@yahoo.com", "first_name": "Rachel", "last_name": "King", "role": "Line Cook", "location": "loc_lg_downtown", "phone": "+1-519-555-2018", "photo_url": "https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=200", "hourly_rate": 19.50},
    {"user_id": "wf_019", "email": "samuel.wright@outlook.com", "first_name": "Samuel", "last_name": "Wright", "role": "Line Cook", "location": "loc_lg_tecumseh", "phone": "+1-519-555-2019", "photo_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200", "hourly_rate": 19.50},
    {"user_id": "wf_020", "email": "tiffany.lopez@gmail.com", "first_name": "Tiffany", "last_name": "Lopez", "role": "Line Cook", "location": "loc_lg_tecumseh", "phone": "+1-519-555-2020", "photo_url": "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200", "hourly_rate": 19.50},
    {"user_id": "wf_021", "email": "ulysses.hill@hotmail.com", "first_name": "Ulysses", "last_name": "Hill", "role": "Line Cook", "location": "loc_lg_leamington", "phone": "+1-519-555-2021", "photo_url": "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200", "hourly_rate": 19.50},
    {"user_id": "wf_022", "email": "vanessa.scott@gmail.com", "first_name": "Vanessa", "last_name": "Scott", "role": "Prep Cook", "location": "loc_lg_downtown", "phone": "+1-519-555-2022", "photo_url": "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200", "hourly_rate": 17.50},
    {"user_id": "wf_023", "email": "william.green@outlook.com", "first_name": "William", "last_name": "Green", "role": "Prep Cook", "location": "loc_lg_tecumseh", "phone": "+1-519-555-2023", "photo_url": "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=200", "hourly_rate": 17.50},
    {"user_id": "wf_024", "email": "xena.adams@yahoo.com", "first_name": "Xena", "last_name": "Adams", "role": "Prep Cook", "location": "loc_lg_leamington", "phone": "+1-519-555-2024", "photo_url": "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200", "hourly_rate": 17.50},
    
    # Hosts (3)
    {"user_id": "wf_025", "email": "yasmine.baker@gmail.com", "first_name": "Yasmine", "last_name": "Baker", "role": "Host", "location": "loc_lg_downtown", "phone": "+1-519-555-2025", "photo_url": "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=200", "hourly_rate": 16.55},
    {"user_id": "wf_026", "email": "zachary.nelson@hotmail.com", "first_name": "Zachary", "last_name": "Nelson", "role": "Host", "location": "loc_lg_tecumseh", "phone": "+1-519-555-2026", "photo_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200", "hourly_rate": 16.55},
    {"user_id": "wf_027", "email": "abigail.carter@outlook.com", "first_name": "Abigail", "last_name": "Carter", "role": "Host", "location": "loc_lg_leamington", "phone": "+1-519-555-2027", "photo_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200", "hourly_rate": 16.55},
    
    # Managers (3)
    {"user_id": "wf_028", "email": "benjamin.mitchell@gmail.com", "first_name": "Benjamin", "last_name": "Mitchell", "role": "Shift Manager", "location": "loc_lg_downtown", "phone": "+1-519-555-2028", "photo_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200", "hourly_rate": 24.00},
    {"user_id": "wf_029", "email": "christina.perez@yahoo.com", "first_name": "Christina", "last_name": "Perez", "role": "Shift Manager", "location": "loc_lg_tecumseh", "phone": "+1-519-555-2029", "photo_url": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200", "hourly_rate": 24.00},
    {"user_id": "wf_030", "email": "daniel.roberts@hotmail.com", "first_name": "Daniel", "last_name": "Roberts", "role": "Shift Manager", "location": "loc_lg_leamington", "phone": "+1-519-555-2030", "photo_url": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200", "hourly_rate": 24.00},
]

# Shift templates for different roles
SHIFT_TEMPLATES = {
    "Server": [
        {"start": "11:00", "end": "17:00", "name": "Lunch"},
        {"start": "17:00", "end": "23:00", "name": "Dinner"},
        {"start": "17:00", "end": "02:00", "name": "Evening"},
    ],
    "Bartender": [
        {"start": "16:00", "end": "00:00", "name": "Evening"},
        {"start": "18:00", "end": "02:00", "name": "Night"},
    ],
    "Line Cook": [
        {"start": "10:00", "end": "18:00", "name": "Day"},
        {"start": "14:00", "end": "22:00", "name": "Swing"},
        {"start": "16:00", "end": "00:00", "name": "Evening"},
    ],
    "Prep Cook": [
        {"start": "08:00", "end": "14:00", "name": "Morning Prep"},
        {"start": "10:00", "end": "16:00", "name": "Day Prep"},
    ],
    "Host": [
        {"start": "11:00", "end": "17:00", "name": "Lunch"},
        {"start": "17:00", "end": "23:00", "name": "Dinner"},
    ],
    "Shift Manager": [
        {"start": "10:00", "end": "18:00", "name": "Day"},
        {"start": "16:00", "end": "00:00", "name": "Evening"},
    ],
}


async def seed_database():
    """Main seeding function"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'hrbank')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 60)
    print("HR BANK - PRODUCTION DATA SEEDER")
    print("Windsor-Essex-Leamington Region")
    print("=" * 60)
    print()
    
    # 1. Create St. Clair College Institution
    print("📚 Creating St. Clair College...")
    await create_institution(db, ST_CLAIR_COLLEGE)
    
    # 2. Create Loose Goose Employer
    print("🍺 Creating Loose Goose Hospitality Group...")
    await create_employer(db, LOOSE_GOOSE_EMPLOYER, LOOSE_GOOSE_LOCATIONS)
    
    # 3. Create WorkPassport Users
    print("🎓 Creating WorkPassport users (10)...")
    for user in WORKPASSPORT_USERS:
        await create_workpassport_user(db, user, ST_CLAIR_COLLEGE)
    
    # 4. Create Workforce Users
    print("👷 Creating Workforce users (30)...")
    for user in WORKFORCE_USERS:
        await create_workforce_user(db, user, LOOSE_GOOSE_EMPLOYER["employer_id"])
    
    # 5. Create 2 months of shifts
    print("📅 Creating shifts for 2 months...")
    await create_shifts(db, LOOSE_GOOSE_EMPLOYER["employer_id"], LOOSE_GOOSE_LOCATIONS, WORKFORCE_USERS)
    
    print()
    print("=" * 60)
    print("✅ SEEDING COMPLETE!")
    print("=" * 60)
    print()
    print("CREDENTIALS:")
    print("-" * 60)
    print(f"Institution (St. Clair College):")
    print(f"  Email: {ST_CLAIR_COLLEGE['email']}")
    print(f"  Password: {ST_CLAIR_COLLEGE['password']}")
    print()
    print(f"Employer (Loose Goose):")
    print(f"  Email: {LOOSE_GOOSE_EMPLOYER['email']}")
    print(f"  Password: {LOOSE_GOOSE_EMPLOYER['password']}")
    print()
    print("WorkPassport Users (10):")
    for user in WORKPASSPORT_USERS[:3]:
        print(f"  {user['first_name']} {user['last_name']}: {user['email']} / {user['password']}")
    print("  ... and 7 more")
    print()
    print("Workforce Users (30):")
    print("  All use password: Workforce2026!")
    for user in WORKFORCE_USERS[:3]:
        print(f"  {user['first_name']} {user['last_name']}: {user['email']}")
    print("  ... and 27 more")
    print("-" * 60)
    
    client.close()


async def create_institution(db, inst_data):
    """Create or update institution"""
    
    # Check if exists
    existing = await db.users.find_one({"email": inst_data["email"]})
    
    if existing:
        print(f"  ✓ Institution already exists: {inst_data['institution_name']}")
        return existing["user_id"]
    
    user_id = inst_data["institution_id"]
    now = datetime.now(timezone.utc)
    
    # Create user record
    user_doc = {
        "user_id": user_id,
        "email": inst_data["email"],
        "password_hash": pwd_context.hash(inst_data["password"]),
        "user_type": "institution",
        "profile_status": "active",
        "email_verified": True,
        "phone_verified": True,
        "created_at": now,
        "created_date": now,
        "last_login": now,
        "deleted_at": None
    }
    await db.users.insert_one(user_doc)
    
    # Create institution profile
    profile_doc = {
        "institution_id": user_id,
        "institution_name": inst_data["institution_name"],
        "institution_type": inst_data["institution_type"],
        "address": inst_data["address"],
        "city": inst_data["city"],
        "province": inst_data["province"],
        "postal_code": inst_data["postal_code"],
        "country": inst_data["country"],
        "phone": inst_data["phone"],
        "website": inst_data["website"],
        "contact_name": inst_data["contact_name"],
        "contact_email": inst_data["contact_email"],
        "contact_phone": inst_data["contact_phone"],
        "latitude": inst_data["latitude"],
        "longitude": inst_data["longitude"],
        "logo_url": inst_data["logo_url"],
        "description": inst_data["description"],
        "programs": inst_data["programs"],
        "verification_status": "verified",
        "created_at": now,
        "updated_at": now
    }
    await db.institution_profiles.insert_one(profile_doc)
    
    # Accept EULA
    eula_doc = {
        "user_id": user_id,
        "eula_type": "institution",
        "version": "1.0",
        "accepted_date": now,
        "ip_address": "127.0.0.1"
    }
    await db.eula_acceptances.insert_one(eula_doc)
    
    print(f"  ✓ Created: {inst_data['institution_name']}")
    return user_id


async def create_employer(db, emp_data, locations):
    """Create or update employer with locations"""
    
    existing = await db.users.find_one({"email": emp_data["email"]})
    
    if existing:
        print(f"  ✓ Employer already exists: {emp_data['company_name']}")
        return existing["user_id"]
    
    user_id = emp_data["employer_id"]
    now = datetime.now(timezone.utc)
    
    # Create user record
    user_doc = {
        "user_id": user_id,
        "email": emp_data["email"],
        "password_hash": pwd_context.hash(emp_data["password"]),
        "user_type": "employer",
        "profile_status": "active",
        "email_verified": True,
        "phone_verified": True,
        "created_at": now,
        "created_date": now,
        "last_login": now,
        "deleted_at": None
    }
    await db.users.insert_one(user_doc)
    
    # Create employer profile
    profile_doc = {
        "employer_id": user_id,
        "company_name": emp_data["company_name"],
        "business_type": emp_data["business_type"],
        "address": emp_data["head_office_address"],
        "city": emp_data["city"],
        "province": emp_data["province"],
        "postal_code": emp_data["postal_code"],
        "country": emp_data["country"],
        "phone": emp_data["phone"],
        "website": emp_data["website"],
        "contact_name": emp_data["contact_name"],
        "contact_email": emp_data["contact_email"],
        "contact_phone": emp_data["contact_phone"],
        "logo_url": emp_data["logo_url"],
        "description": emp_data["description"],
        "verification_status": "verified",
        "subscription_tier": "premium",
        "created_at": now,
        "updated_at": now
    }
    await db.employer_profiles.insert_one(profile_doc)
    
    # Create locations
    for loc in locations:
        loc_doc = {
            "location_id": loc["location_id"],
            "employer_id": user_id,
            "name": loc["name"],
            "address": loc["address"],
            "city": loc["city"],
            "province": loc["province"],
            "postal_code": loc["postal_code"],
            "country": "Canada",
            "latitude": loc["latitude"],
            "longitude": loc["longitude"],
            "phone": loc["phone"],
            "geofence_radius": loc["geofence_radius"],
            "operating_hours": loc["operating_hours"],
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        await db.employer_locations.update_one(
            {"location_id": loc["location_id"]},
            {"$set": loc_doc},
            upsert=True
        )
        print(f"    ✓ Location: {loc['name']}")
    
    # Accept EULA
    eula_doc = {
        "user_id": user_id,
        "eula_type": "employer",
        "version": "1.0",
        "accepted_date": now,
        "ip_address": "127.0.0.1"
    }
    await db.eula_acceptances.insert_one(eula_doc)
    
    print(f"  ✓ Created: {emp_data['company_name']} with {len(locations)} locations")
    return user_id


async def create_workpassport_user(db, user_data, institution):
    """Create WorkPassport user with credential from institution"""
    
    existing = await db.users.find_one({"email": user_data["email"]})
    
    if existing:
        print(f"    ✓ User already exists: {user_data['first_name']} {user_data['last_name']}")
        return existing["user_id"]
    
    user_id = user_data["user_id"]
    now = datetime.now(timezone.utc)
    
    # Create user record
    user_doc = {
        "user_id": user_id,
        "email": user_data["email"],
        "password_hash": pwd_context.hash(user_data["password"]),
        "user_type": "workpassport",
        "profile_status": "active",
        "email_verified": True,
        "phone_verified": True,
        "created_at": now,
        "created_date": now,
        "last_login": now,
        "deleted_at": None
    }
    await db.users.insert_one(user_doc)
    
    # Create profile
    profile_doc = {
        "user_id": user_id,
        "first_name": user_data["first_name"],
        "last_name": user_data["last_name"],
        "email": user_data["email"],
        "phone": user_data["phone"],
        "address": user_data["address"],
        "city": user_data["city"],
        "province": user_data["province"],
        "postal_code": user_data["postal_code"],
        "country": "Canada",
        "date_of_birth": user_data["date_of_birth"],
        "profile_photo": user_data["photo_url"],
        "bio": f"Graduate of {institution['institution_name']}, {user_data['program']} program.",
        "skills": [user_data["program"], "Customer Service", "Team Work"],
        "profile_completion": 90,
        "created_at": now,
        "updated_at": now
    }
    await db.workpassport_profiles.insert_one(profile_doc)
    
    # Create credential from St. Clair College
    credential_id = f"HRBANK-{user_data['graduation_year']}-{hashlib.md5(user_id.encode()).hexdigest()[:6].upper()}"
    credential_doc = {
        "credential_id": credential_id,
        "recipient_id": user_id,
        "recipient_email": user_data["email"],
        "recipient_name": f"{user_data['first_name']} {user_data['last_name']}",
        "issuer_id": institution["institution_id"],
        "issuer_name": institution["institution_name"],
        "credential_type": "diploma",
        "credential_name": f"{user_data['program']} Diploma",
        "program_name": user_data["program"],
        "student_id": user_data["student_id"],
        "grade_gpa": user_data["gpa"],
        "issue_date": f"{user_data['graduation_year']}-06-15",
        "expiry_date": None,
        "status": "active",
        "verification_status": "verified",
        "blockchain_status": "confirmed",
        "ipfs_url": f"ipfs://bafkrei{hashlib.md5(credential_id.encode()).hexdigest()[:40]}",
        "created_at": now,
        "updated_at": now
    }
    await db.credentials.insert_one(credential_doc)
    
    # Link user to institution
    link_doc = {
        "user_id": user_id,
        "institution_id": institution["institution_id"],
        "relationship": "alumni",
        "created_at": now
    }
    await db.user_institution_links.update_one(
        {"user_id": user_id, "institution_id": institution["institution_id"]},
        {"$set": link_doc},
        upsert=True
    )
    
    # Accept EULA
    eula_doc = {
        "user_id": user_id,
        "eula_type": "workpassport",
        "version": "1.0",
        "accepted_date": now,
        "ip_address": "127.0.0.1"
    }
    await db.eula_acceptances.insert_one(eula_doc)
    
    print(f"    ✓ Created: {user_data['first_name']} {user_data['last_name']} ({user_data['program']})")
    return user_id


async def create_workforce_user(db, user_data, employer_id):
    """Create Workforce user linked to employer"""
    
    existing = await db.users.find_one({"email": user_data["email"]})
    
    if existing:
        return existing["user_id"]
    
    user_id = user_data["user_id"]
    now = datetime.now(timezone.utc)
    
    # Create user record
    user_doc = {
        "user_id": user_id,
        "email": user_data["email"],
        "password_hash": pwd_context.hash("Workforce2026!"),
        "user_type": "workforce",
        "profile_status": "active",
        "email_verified": True,
        "phone_verified": True,
        "created_at": now,
        "created_date": now,
        "last_login": now,
        "deleted_at": None
    }
    await db.users.insert_one(user_doc)
    
    # Create profile
    profile_doc = {
        "user_id": user_id,
        "employer_id": employer_id,
        "first_name": user_data["first_name"],
        "last_name": user_data["last_name"],
        "email": user_data["email"],
        "phone": user_data["phone"],
        "role": user_data["role"],
        "department": "Operations",
        "location_id": user_data["location"],
        "profile_photo": user_data["photo_url"],
        "hourly_rate": user_data["hourly_rate"],
        "employment_status": "active",
        "start_date": (now - timedelta(days=random.randint(30, 365))).isoformat(),
        "created_at": now,
        "updated_at": now
    }
    await db.workforce_profiles.insert_one(profile_doc)
    
    # Accept EULA
    eula_doc = {
        "user_id": user_id,
        "eula_type": "workforce",
        "version": "1.0",
        "accepted_date": now,
        "ip_address": "127.0.0.1"
    }
    await db.eula_acceptances.insert_one(eula_doc)
    
    return user_id


async def create_shifts(db, employer_id, locations, workforce_users):
    """Create 2 months of shifts"""
    
    start_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = start_date + timedelta(days=60)
    
    # Group workers by location and role
    workers_by_location = {}
    for user in workforce_users:
        loc = user["location"]
        if loc not in workers_by_location:
            workers_by_location[loc] = {}
        role = user["role"]
        if role not in workers_by_location[loc]:
            workers_by_location[loc][role] = []
        workers_by_location[loc][role].append(user)
    
    shifts_created = 0
    current_date = start_date
    
    while current_date < end_date:
        day_of_week = current_date.strftime("%A").lower()
        
        for location in locations:
            loc_id = location["location_id"]
            
            if loc_id not in workers_by_location:
                continue
            
            # Get operating hours for this day
            hours = location["operating_hours"].get(day_of_week[:3] if day_of_week == "thursday" else day_of_week)
            if not hours:
                continue
            
            # Create shifts for each role
            for role, templates in SHIFT_TEMPLATES.items():
                if role not in workers_by_location[loc_id]:
                    continue
                
                workers = workers_by_location[loc_id][role]
                
                for template in templates:
                    # Randomly assign 1-2 workers per shift
                    num_workers = min(len(workers), random.randint(1, 2))
                    assigned_workers = random.sample(workers, num_workers)
                    
                    for worker in assigned_workers:
                        # Parse shift times
                        start_hour, start_min = map(int, template["start"].split(":"))
                        end_hour, end_min = map(int, template["end"].split(":"))
                        
                        shift_start = current_date.replace(hour=start_hour, minute=start_min)
                        
                        # Handle overnight shifts
                        if end_hour < start_hour:
                            shift_end = (current_date + timedelta(days=1)).replace(hour=end_hour, minute=end_min)
                        else:
                            shift_end = current_date.replace(hour=end_hour, minute=end_min)
                        
                        # Skip some shifts randomly (not everyone works every day)
                        if random.random() < 0.4:  # 40% chance to skip
                            continue
                        
                        shift_id = f"shift_{uuid.uuid4().hex[:12]}"
                        
                        shift_doc = {
                            "shift_id": shift_id,
                            "employer_id": employer_id,
                            "location_id": loc_id,
                            "worker_id": worker["user_id"],
                            "worker_name": f"{worker['first_name']} {worker['last_name']}",
                            "role": role,
                            "shift_name": template["name"],
                            "start_time": shift_start,
                            "end_time": shift_end,
                            "status": "scheduled" if shift_start > datetime.now(timezone.utc) else "completed",
                            "hourly_rate": worker["hourly_rate"],
                            "break_duration": 30 if (shift_end - shift_start).seconds > 21600 else 0,  # 30 min break for 6+ hour shifts
                            "notes": "",
                            "created_at": datetime.now(timezone.utc),
                            "updated_at": datetime.now(timezone.utc)
                        }
                        
                        await db.shifts.insert_one(shift_doc)
                        shifts_created += 1
        
        current_date += timedelta(days=1)
    
    print(f"  ✓ Created {shifts_created} shifts across all locations")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(seed_database())
