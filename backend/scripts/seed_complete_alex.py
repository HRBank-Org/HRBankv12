import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import random
import string

# REPLACE WITH YOUR MONGODB ATLAS URL
MONGO_URL = "mongodb+srv://hrbank_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/hrbank_db?retryWrites=true&w=majority"
DB_NAME = "hrbank_db"

# Pre-generated hashes from the backend
HASH_TEST123 = "$2b$12$ws94zjlQQA7Jle1FVbxee.i/bbL2HxrGAVlMi8/7NLaozA5IT.z4O"
HASH_DEMO123 = "$2b$12$hmfwDUb3Rc1IZr3SaEPBn.U4z9S6sdF2QmLzw9lh9FxSNYPiQ7JBi"

def random_id(prefix, length=12):
    return f"{prefix}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=length))}"

async def seed_complete_data():
    print("=" * 60)
    print("HR Bank - Complete Database Seeding")
    print("=" * 60)
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        await db.command("ping")
        print("✅ Connected to MongoDB Atlas\n")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return
    
    workforce_id = "wf_alex_001"
    profile_code = "ALEX2024"
    
    # ========================================
    # 1. USER & PROFILE (already done, but ensure)
    # ========================================
    print("📌 1. Creating User & Workforce Profile...")
    
    await db.users.delete_one({"email": "alex.johnson@email.com"})
    workforce_user = {
        "user_id": workforce_id,
        "email": "alex.johnson@email.com",
        "password_hash": HASH_DEMO123,
        "full_name": "Alex Johnson",
        "user_type": "workforce",
        "email_verified": True,
        "is_active": True,
        "profile_status": "active",
        "created_at": datetime.now(timezone.utc) - timedelta(days=365),
        "created_date": (datetime.now(timezone.utc) - timedelta(days=365)).isoformat(),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(workforce_user)
    print("   ✅ User created")
    
    await db.workforce_profiles.delete_one({"workforce_id": workforce_id})
    workforce_profile = {
        "workforce_id": workforce_id,
        "full_name": "Alex Johnson",
        "first_name": "Alex",
        "last_name": "Johnson",
        "email": "alex.johnson@email.com",
        "phone": "+1 (519) 555-0303",
        "preferred_language": "en",
        "onboarding_completed": True,
        "profile_code": profile_code,
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
    await db.workforce_profiles.insert_one(workforce_profile)
    print("   ✅ Workforce profile created")
    
    # ========================================
    # 2. CAREER PROFILE SETTINGS (for public sharing)
    # ========================================
    print("\n📌 2. Creating Career Profile Settings...")
    
    await db.career_profile_settings.delete_one({"workforce_id": workforce_id})
    career_settings = {
        "workforce_id": workforce_id,
        "profile_code": profile_code,
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
    print("   ✅ Career profile settings created")
    
    # ========================================
    # 3. OCCUPATION PROFILES
    # ========================================
    print("\n📌 3. Creating Occupation Profiles...")
    
    await db.occupation_profiles.delete_many({"workforce_id": workforce_id})
    
    occupations = [
        {
            "occupation_id": "occ_food_service_001",
            "workforce_id": workforce_id,
            "occupation_title": "Food Service Worker",
            "occupation_category": "Food & Hospitality",
            "years_of_experience": 3,
            "total_hours_worked": 1560,
            "skill_rating_avg": 4.9,
            "skill_rating_count": 32,
            "skills": ["Food Preparation", "Customer Service", "Cash Handling", "Food Safety", "POS Systems"],
            "certifications": ["cred_food_safety_001", "cred_smart_serve_001"],
            "is_primary": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "occupation_id": "occ_retail_001",
            "workforce_id": workforce_id,
            "occupation_title": "Retail Associate",
            "occupation_category": "Retail & Sales",
            "years_of_experience": 2,
            "total_hours_worked": 780,
            "skill_rating_avg": 4.7,
            "skill_rating_count": 15,
            "skills": ["Sales", "Inventory Management", "Customer Relations", "Visual Merchandising"],
            "certifications": [],
            "is_primary": False,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    for occ in occupations:
        await db.occupation_profiles.insert_one(occ)
    print(f"   ✅ {len(occupations)} occupation profiles created")
    
    # ========================================
    # 4. CREDENTIALS (Verified certifications)
    # ========================================
    print("\n📌 4. Creating Verified Credentials...")
    
    await db.workforce_credentials.delete_many({"workforce_id": workforce_id})
    
    credentials = [
        {
            "credential_id": "cred_food_safety_001",
            "workforce_id": workforce_id,
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
            "workforce_id": workforce_id,
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
            "workforce_id": workforce_id,
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
            "credential_id": "cred_diploma_001",
            "workforce_id": workforce_id,
            "credential_name": "Diploma in Hospitality Management",
            "credential_type": "diploma",
            "institution_name": "St. Clair College",
            "institution_id": "inst_stclaire_001",
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
    print(f"   ✅ {len(credentials)} verified credentials created")
    
    # ========================================
    # 5. EMPLOYMENT HISTORY
    # ========================================
    print("\n📌 5. Creating Employment History...")
    
    await db.employment_relationships.delete_many({"workforce_id": workforce_id})
    
    employments = [
        {
            "relationship_id": random_id("rel"),
            "workforce_id": workforce_id,
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
            "workforce_id": workforce_id,
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
        },
        {
            "relationship_id": random_id("rel"),
            "workforce_id": workforce_id,
            "employer_id": "emp_walmart_001",
            "employer_name": "Walmart Canada",
            "job_title": "Sales Associate",
            "start_date": (datetime.now(timezone.utc) - timedelta(days=1095)).isoformat(),
            "end_date": (datetime.now(timezone.utc) - timedelta(days=730)).isoformat(),
            "is_current": False,
            "status": "completed",
            "rating_given": 4.5,
            "total_hours": 520,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    for emp in employments:
        await db.employment_relationships.insert_one(emp)
    print(f"   ✅ {len(employments)} employment records created")
    
    # ========================================
    # 6. EDUCATION
    # ========================================
    print("\n📌 6. Creating Education Records...")
    
    await db.education.delete_many({"workforce_id": workforce_id})
    
    education = [
        {
            "education_id": random_id("edu"),
            "workforce_id": workforce_id,
            "institution_name": "St. Clair College",
            "degree": "Diploma",
            "field_of_study": "Hospitality Management",
            "start_year": 2021,
            "end_year": 2023,
            "is_completed": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "education_id": random_id("edu"),
            "workforce_id": workforce_id,
            "institution_name": "Riverside Secondary School",
            "degree": "High School Diploma",
            "field_of_study": "General Studies",
            "start_year": 2017,
            "end_year": 2021,
            "is_completed": True,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    for edu in education:
        await db.education.insert_one(edu)
    print(f"   ✅ {len(education)} education records created")
    
    # ========================================
    # 7. RATINGS & REVIEWS
    # ========================================
    print("\n📌 7. Creating Ratings & Reviews...")
    
    await db.ratings.delete_many({"workforce_id": workforce_id})
    
    ratings = [
        {
            "rating_id": random_id("rat"),
            "workforce_id": workforce_id,
            "employer_id": "emp_d98ddf3160cf",
            "employer_name": "Swan Pizza",
            "rating": 5,
            "review": "Alex is an exceptional team member. Always punctual, great with customers, and a natural leader.",
            "created_at": datetime.now(timezone.utc) - timedelta(days=30)
        },
        {
            "rating_id": random_id("rat"),
            "workforce_id": workforce_id,
            "employer_id": "emp_tim_001",
            "employer_name": "Tim Hortons",
            "rating": 5,
            "review": "Excellent work ethic and customer service skills. Would hire again!",
            "created_at": datetime.now(timezone.utc) - timedelta(days=180)
        },
        {
            "rating_id": random_id("rat"),
            "workforce_id": workforce_id,
            "employer_id": "emp_walmart_001",
            "employer_name": "Walmart Canada",
            "rating": 4,
            "review": "Reliable and hardworking. Great asset to our team.",
            "created_at": datetime.now(timezone.utc) - timedelta(days=400)
        }
    ]
    
    for rating in ratings:
        await db.ratings.insert_one(rating)
    print(f"   ✅ {len(ratings)} ratings created")
    
    # ========================================
    # Create indexes
    # ========================================
    print("\n📌 Creating indexes...")
    await db.career_profile_settings.create_index("profile_code", unique=True)
    await db.career_profile_settings.create_index("workforce_id", unique=True)
    await db.occupation_profiles.create_index("workforce_id")
    await db.workforce_credentials.create_index("workforce_id")
    await db.workforce_credentials.create_index("credential_id", unique=True)
    await db.employment_relationships.create_index("workforce_id")
    await db.education.create_index("workforce_id")
    await db.ratings.create_index("workforce_id")
    print("   ✅ Indexes created")
    
    print("\n" + "=" * 60)
    print("✅ COMPLETE DATABASE SEEDING DONE!")
    print("=" * 60)
    print(f"\n🎯 Alex Johnson's Work Passport:")
    print(f"   URL: https://hrbank-frontend.db11xcgyyaxh4.ca-central-1.cs.amazonlightsail.com/passport/{profile_code}")
    print(f"   Profile Code: {profile_code}")
    print(f"\n📊 Data Created:")
    print(f"   - 2 Occupation Profiles")
    print(f"   - 4 Verified Credentials (blockchain)")
    print(f"   - 3 Employment Records")
    print(f"   - 2 Education Records")
    print(f"   - 3 Employer Ratings")
    print("-" * 40)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_complete_data())
