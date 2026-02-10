#!/usr/bin/env python3
"""
Demo Account Setup Script for HR Bank
Creates/fixes Alex Johnson (workforce) and Trios College (institution) accounts
Run this against your production MongoDB Atlas database
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
import random
import string
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MongoDB connection - uses environment variable or prompt
MONGO_URL = os.environ.get('MONGO_URL', None)
DB_NAME = os.environ.get('DB_NAME', 'hrbank_db')

def random_id(prefix, length=12):
    return f"{prefix}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=length))}"

async def setup_demo_accounts():
    global MONGO_URL
    
    if not MONGO_URL:
        print("Please set MONGO_URL environment variable or enter it below:")
        MONGO_URL = input("MongoDB Atlas URL: ").strip()
    
    print("=" * 60)
    print("HR Bank - Demo Account Setup")
    print("=" * 60)
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        await db.command("ping")
        print("Connected to MongoDB Atlas\n")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return

    # ========================================
    # 1. ALEX JOHNSON - WORKFORCE USER
    # ========================================
    print("\n" + "=" * 60)
    print("SETTING UP ALEX JOHNSON (Workforce Demo)")
    print("=" * 60)
    
    alex_user_id = "wf_alex_001"
    alex_email = "alex.johnson@email.com"
    alex_password = "Demo123!"
    alex_profile_code = "ALEX2024"
    
    # Delete existing data to start fresh
    await db.users.delete_one({"email": alex_email})
    await db.workforce_profiles.delete_one({"workforce_id": alex_user_id})
    await db.career_profile_settings.delete_one({"workforce_id": alex_user_id})
    await db.occupation_profiles.delete_many({"workforce_id": alex_user_id})
    await db.workforce_credentials.delete_many({"workforce_id": alex_user_id})
    await db.employment_relationships.delete_many({"workforce_id": alex_user_id})
    await db.education.delete_many({"workforce_id": alex_user_id})
    await db.ratings.delete_many({"workforce_id": alex_user_id})
    
    # Create user record
    alex_user = {
        "user_id": alex_user_id,
        "email": alex_email,
        "password_hash": pwd_context.hash(alex_password),
        "full_name": "Alex Johnson",
        "user_type": "workforce",
        "email_verified": True,
        "is_active": True,
        "profile_status": "active",
        "created_at": datetime.now(timezone.utc) - timedelta(days=365),
        "created_date": (datetime.now(timezone.utc) - timedelta(days=365)).isoformat(),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(alex_user)
    print("  [OK] User record created")
    
    # Create workforce profile
    alex_profile = {
        "workforce_id": alex_user_id,
        "full_name": "Alex Johnson",
        "first_name": "Alex",
        "last_name": "Johnson",
        "email": alex_email,
        "phone": "+1 (519) 555-0303",
        "preferred_language": "en",
        "onboarding_completed": True,
        "profile_code": alex_profile_code,
        "city": "Windsor",
        "province": "Ontario",
        "country": "Canada",
        "profile_photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
        "skills": ["Food Safety", "Customer Service", "Team Leadership", "Cash Handling", "Inventory Management"],
        "rating_avg": 4.8,
        "rating_count": 47,
        "profile_completeness": 100,
        "completed_jobs_count": 156,
        "total_hours_worked": 2340,
        "created_date": (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
    }
    await db.workforce_profiles.insert_one(alex_profile)
    print("  [OK] Workforce profile created")
    
    # Career profile settings (for public sharing)
    career_settings = {
        "workforce_id": alex_user_id,
        "profile_code": alex_profile_code,
        "is_public": True,
        "privacy": {
            "profile_visibility": "public",
            "show_full_name": True,
            "show_photo": True,
            "show_location": True,
            "show_occupation_profiles": True,
            "show_experience": True,
            "show_hours_worked": True,
            "show_ratings": True,
            "show_skills": True,
            "show_credentials": True,
            "show_employment_history": True,
            "show_education": True
        },
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.career_profile_settings.insert_one(career_settings)
    print("  [OK] Career profile settings created")
    
    # Occupation profiles
    occupations = [
        {
            "occupation_id": "occ_food_service_001",
            "workforce_id": alex_user_id,
            "occupation_title": "Food Service Worker",
            "occupation_category": "Food & Hospitality",
            "years_of_experience": 3,
            "total_hours_worked": 1560,
            "skill_rating_avg": 4.9,
            "skill_rating_count": 32,
            "skills": ["Food Preparation", "Customer Service", "Cash Handling", "Food Safety", "POS Systems"],
            "is_primary": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "occupation_id": "occ_retail_001",
            "workforce_id": alex_user_id,
            "occupation_title": "Retail Associate",
            "occupation_category": "Retail & Sales",
            "years_of_experience": 2,
            "total_hours_worked": 780,
            "skill_rating_avg": 4.7,
            "skill_rating_count": 15,
            "skills": ["Sales", "Inventory Management", "Customer Relations", "Visual Merchandising"],
            "is_primary": False,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    for occ in occupations:
        await db.occupation_profiles.insert_one(occ)
    print(f"  [OK] {len(occupations)} occupation profiles created")
    
    # Credentials (blockchain-verified)
    credentials = [
        {
            "credential_id": "cred_food_safety_001",
            "workforce_id": alex_user_id,
            "credential_name": "Food Handler Certificate",
            "credential_type": "certification",
            "institution_name": "Ontario Food Safety",
            "institution_id": "inst_ofs_001",
            "issue_date": (datetime.now(timezone.utc) - timedelta(days=180)).isoformat(),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=730)).isoformat(),
            "status": "verified",
            "verified_at": datetime.now(timezone.utc),
            "blockchain_verified": True,
            "blockchain_tx_hash": "0x" + "".join(random.choices("0123456789abcdef", k=64)),
            "ipfs_hash": "Qm" + "".join(random.choices(string.ascii_letters + string.digits, k=44)),
            "created_at": datetime.now(timezone.utc)
        },
        {
            "credential_id": "cred_smart_serve_001",
            "workforce_id": alex_user_id,
            "credential_name": "Smart Serve Certification",
            "credential_type": "certification",
            "institution_name": "Smart Serve Ontario",
            "institution_id": "inst_ss_001",
            "issue_date": (datetime.now(timezone.utc) - timedelta(days=365)).isoformat(),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=1460)).isoformat(),
            "status": "verified",
            "verified_at": datetime.now(timezone.utc),
            "blockchain_verified": True,
            "blockchain_tx_hash": "0x" + "".join(random.choices("0123456789abcdef", k=64)),
            "ipfs_hash": "Qm" + "".join(random.choices(string.ascii_letters + string.digits, k=44)),
            "created_at": datetime.now(timezone.utc)
        },
        {
            "credential_id": "cred_first_aid_001",
            "workforce_id": alex_user_id,
            "credential_name": "Standard First Aid & CPR",
            "credential_type": "certification",
            "institution_name": "Canadian Red Cross",
            "institution_id": "inst_crc_001",
            "issue_date": (datetime.now(timezone.utc) - timedelta(days=90)).isoformat(),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=1095)).isoformat(),
            "status": "verified",
            "verified_at": datetime.now(timezone.utc),
            "blockchain_verified": True,
            "blockchain_tx_hash": "0x" + "".join(random.choices("0123456789abcdef", k=64)),
            "ipfs_hash": "Qm" + "".join(random.choices(string.ascii_letters + string.digits, k=44)),
            "created_at": datetime.now(timezone.utc)
        },
        {
            "credential_id": "cred_trios_diploma_001",
            "workforce_id": alex_user_id,
            "credential_name": "Diploma in Business Administration",
            "credential_type": "diploma",
            "institution_name": "Trios College",
            "institution_id": "inst_trios_001",
            "issue_date": (datetime.now(timezone.utc) - timedelta(days=730)).isoformat(),
            "expiry_date": None,
            "status": "verified",
            "verified_at": datetime.now(timezone.utc),
            "blockchain_verified": True,
            "blockchain_tx_hash": "0x" + "".join(random.choices("0123456789abcdef", k=64)),
            "ipfs_hash": "Qm" + "".join(random.choices(string.ascii_letters + string.digits, k=44)),
            "created_at": datetime.now(timezone.utc)
        }
    ]
    for cred in credentials:
        await db.workforce_credentials.insert_one(cred)
    print(f"  [OK] {len(credentials)} verified credentials created")
    
    # Employment history
    employments = [
        {
            "relationship_id": random_id("rel"),
            "workforce_id": alex_user_id,
            "employer_id": "emp_d98ddf3160cf",
            "employer_name": "Swan Pizza",
            "job_title": "Shift Supervisor",
            "start_date": (datetime.now(timezone.utc) - timedelta(days=365)).isoformat(),
            "end_date": None,
            "is_current": True,
            "status": "active",
            "rating_given": 4.9,
            "total_hours": 1040,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "relationship_id": random_id("rel"),
            "workforce_id": alex_user_id,
            "employer_id": "emp_tim_001",
            "employer_name": "Tim Hortons",
            "job_title": "Team Member",
            "start_date": (datetime.now(timezone.utc) - timedelta(days=730)).isoformat(),
            "end_date": (datetime.now(timezone.utc) - timedelta(days=365)).isoformat(),
            "is_current": False,
            "status": "completed",
            "rating_given": 4.7,
            "total_hours": 780,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    for emp in employments:
        await db.employment_relationships.insert_one(emp)
    print(f"  [OK] {len(employments)} employment records created")
    
    # Education
    education = [
        {
            "education_id": random_id("edu"),
            "workforce_id": alex_user_id,
            "institution_name": "Trios College",
            "degree": "Diploma",
            "field_of_study": "Business Administration",
            "start_year": 2021,
            "end_year": 2023,
            "is_completed": True,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    for edu in education:
        await db.education.insert_one(edu)
    print(f"  [OK] {len(education)} education records created")
    
    # Ratings
    ratings = [
        {
            "rating_id": random_id("rat"),
            "workforce_id": alex_user_id,
            "employer_id": "emp_d98ddf3160cf",
            "employer_name": "Swan Pizza",
            "rating": 5,
            "review": "Alex is an exceptional team member. Always punctual, great with customers.",
            "created_at": datetime.now(timezone.utc) - timedelta(days=30)
        },
        {
            "rating_id": random_id("rat"),
            "workforce_id": alex_user_id,
            "employer_id": "emp_tim_001",
            "employer_name": "Tim Hortons",
            "rating": 5,
            "review": "Excellent work ethic and customer service skills!",
            "created_at": datetime.now(timezone.utc) - timedelta(days=180)
        }
    ]
    for rating in ratings:
        await db.ratings.insert_one(rating)
    print(f"  [OK] {len(ratings)} ratings created")
    
    print("\n  ALEX JOHNSON SETUP COMPLETE!")
    print(f"  Email: {alex_email}")
    print(f"  Password: {alex_password}")
    print(f"  Public Profile: https://hrbank.ca/passport/{alex_profile_code}")
    
    # ========================================
    # 2. TRIOS COLLEGE - INSTITUTION
    # ========================================
    print("\n" + "=" * 60)
    print("SETTING UP TRIOS COLLEGE (Institution Demo)")
    print("=" * 60)
    
    trios_inst_id = "inst_trios_001"
    trios_email = "admin@trioscollege.ca"
    trios_password = "Demo123!"
    
    # Delete existing data
    await db.users.delete_one({"email": trios_email})
    await db.institutions.delete_one({"institution_id": trios_inst_id})
    
    # Create user record for institution
    trios_user = {
        "user_id": trios_inst_id,
        "email": trios_email,
        "password_hash": pwd_context.hash(trios_password),
        "full_name": "Trios College Admin",
        "user_type": "institution",
        "email_verified": True,
        "is_active": True,
        "profile_status": "active",
        "created_at": datetime.now(timezone.utc) - timedelta(days=180),
        "created_date": (datetime.now(timezone.utc) - timedelta(days=180)).isoformat(),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(trios_user)
    print("  [OK] User record created")
    
    # Create institution record
    trios_institution = {
        "institution_id": trios_inst_id,
        "email": trios_email,
        "password_hash": pwd_context.hash(trios_password),
        "institution_name": "Trios College",
        "institution_type": "college",
        "contact_name": "Registrar Office",
        "phone": "+1 (519) 979-9955",
        "address": "100 Ouellette Ave",
        "city": "Windsor",
        "province": "Ontario",
        "country": "Canada",
        "postal_code": "N9A 6T3",
        "website": "https://www.trioscollege.ca",
        "logo_url": "https://www.trioscollege.ca/themes/custom/trios/logo.svg",
        "is_verified": True,
        "is_active": True,
        "onboarding_completed": True,
        "stripe_connected": False,
        "can_issue_credentials": True,
        "credential_types": ["diploma", "certificate", "badge"],
        "programs_offered": [
            "Business Administration",
            "Healthcare Administration", 
            "Information Technology",
            "Legal Administrative Assistant",
            "Medical Office Assistant"
        ],
        "total_credentials_issued": 1247,
        "active_students": 523,
        "created_at": datetime.now(timezone.utc) - timedelta(days=180),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.institutions.insert_one(trios_institution)
    print("  [OK] Institution record created")
    
    # Create some sample credentials issued by Trios
    sample_students = [
        {"name": "Sarah Miller", "program": "Business Administration", "year": 2023},
        {"name": "James Wilson", "program": "Healthcare Administration", "year": 2023},
        {"name": "Emily Chen", "program": "Information Technology", "year": 2024},
        {"name": "Michael Brown", "program": "Legal Administrative Assistant", "year": 2023},
    ]
    
    issued_credentials = []
    for student in sample_students:
        cred = {
            "credential_id": random_id("cred"),
            "institution_id": trios_inst_id,
            "institution_name": "Trios College",
            "recipient_name": student["name"],
            "credential_name": f"Diploma in {student['program']}",
            "credential_type": "diploma",
            "program": student["program"],
            "issue_date": datetime(student["year"], 6, 15, tzinfo=timezone.utc).isoformat(),
            "status": "issued",
            "blockchain_verified": True,
            "blockchain_tx_hash": "0x" + "".join(random.choices("0123456789abcdef", k=64)),
            "created_at": datetime.now(timezone.utc)
        }
        issued_credentials.append(cred)
    
    await db.issued_credentials.delete_many({"institution_id": trios_inst_id})
    for cred in issued_credentials:
        await db.issued_credentials.insert_one(cred)
    print(f"  [OK] {len(issued_credentials)} sample issued credentials created")
    
    print("\n  TRIOS COLLEGE SETUP COMPLETE!")
    print(f"  Email: {trios_email}")
    print(f"  Password: {trios_password}")
    
    # ========================================
    # CREATE INDEXES
    # ========================================
    print("\n" + "=" * 60)
    print("CREATING DATABASE INDEXES")
    print("=" * 60)
    
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.workforce_profiles.create_index("workforce_id", unique=True)
        await db.workforce_profiles.create_index("email", unique=True)
        await db.workforce_profiles.create_index("profile_code", unique=True, sparse=True)
        await db.career_profile_settings.create_index("profile_code", unique=True)
        await db.career_profile_settings.create_index("workforce_id", unique=True)
        await db.institutions.create_index("institution_id", unique=True)
        await db.institutions.create_index("email", unique=True)
        print("  [OK] Indexes created/verified")
    except Exception as e:
        print(f"  [WARN] Index creation: {e}")
    
    # ========================================
    # SUMMARY
    # ========================================
    print("\n" + "=" * 60)
    print("SETUP COMPLETE!")
    print("=" * 60)
    print("\nDemo Accounts Ready:")
    print("-" * 40)
    print(f"WORKFORCE (Alex Johnson):")
    print(f"  Login: https://hrbank.ca/login")
    print(f"  Email: {alex_email}")
    print(f"  Password: {alex_password}")
    print(f"  Public Profile: https://hrbank.ca/passport/{alex_profile_code}")
    print()
    print(f"INSTITUTION (Trios College):")
    print(f"  Login: https://hrbank.ca/login")
    print(f"  Email: {trios_email}")
    print(f"  Password: {trios_password}")
    print("-" * 40)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_demo_accounts())
