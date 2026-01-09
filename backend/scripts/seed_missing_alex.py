import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import random
import string

# REPLACE WITH YOUR MONGODB ATLAS URL
MONGO_URL = "mongodb+srv://hrbank_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/hrbank_db?retryWrites=true&w=majority"
DB_NAME = "hrbank_db"

def random_id(prefix, length=12):
    return f"{prefix}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=length))}"

async def seed_missing_data():
    print("=" * 60)
    print("HR Bank - Adding Missing Data (Credentials, Security, Shifts)")
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
    
    # ========================================
    # 1. BLOCKCHAIN CREDENTIALS (for Work Passport display)
    # ========================================
    print("📌 1. Creating Blockchain Credentials...")
    
    await db.blockchain_credentials.delete_many({"worker_id": workforce_id})
    
    blockchain_creds = [
        {
            "credential_id": "bc_food_safety_001",
            "worker_id": workforce_id,
            "credential_name": "Food Handler Certificate",
            "program_name": "Food Safety Certification Program",
            "institution_id": "inst_stclaire_001",
            "issue_date": (datetime.now(timezone.utc) - timedelta(days=180)).isoformat(),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=730)).isoformat(),
            "status": "issued",
            "on_chain": True,
            "blockchain_status": "confirmed",
            "tx_hash": "0x" + "".join(random.choices("0123456789abcdef", k=64)),
            "ipfs_hash": "Qm" + "".join(random.choices(string.ascii_letters + string.digits, k=44)),
            "verification_url": f"https://polygonscan.com/tx/0x{''.join(random.choices('0123456789abcdef', k=64))}",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "credential_id": "bc_smart_serve_001",
            "worker_id": workforce_id,
            "credential_name": "Smart Serve Certification",
            "program_name": "Ontario Smart Serve Program",
            "institution_id": "inst_stclaire_001",
            "issue_date": (datetime.now(timezone.utc) - timedelta(days=365)).isoformat(),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=1460)).isoformat(),
            "status": "issued",
            "on_chain": True,
            "blockchain_status": "confirmed",
            "tx_hash": "0x" + "".join(random.choices("0123456789abcdef", k=64)),
            "ipfs_hash": "Qm" + "".join(random.choices(string.ascii_letters + string.digits, k=44)),
            "verification_url": f"https://polygonscan.com/tx/0x{''.join(random.choices('0123456789abcdef', k=64))}",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "credential_id": "bc_first_aid_001",
            "worker_id": workforce_id,
            "credential_name": "Standard First Aid & CPR",
            "program_name": "Canadian Red Cross First Aid",
            "institution_id": "inst_stclaire_001",
            "issue_date": (datetime.now(timezone.utc) - timedelta(days=90)).isoformat(),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=1095)).isoformat(),
            "status": "issued",
            "on_chain": True,
            "blockchain_status": "confirmed",
            "tx_hash": "0x" + "".join(random.choices("0123456789abcdef", k=64)),
            "ipfs_hash": "Qm" + "".join(random.choices(string.ascii_letters + string.digits, k=44)),
            "verification_url": f"https://polygonscan.com/tx/0x{''.join(random.choices('0123456789abcdef', k=64))}",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "credential_id": "bc_diploma_001",
            "worker_id": workforce_id,
            "credential_name": "Diploma in Hospitality Management",
            "program_name": "Hospitality Management Program",
            "institution_id": "inst_stclaire_001",
            "issue_date": (datetime.now(timezone.utc) - timedelta(days=730)).isoformat(),
            "expiry_date": None,
            "status": "issued",
            "on_chain": True,
            "blockchain_status": "confirmed",
            "tx_hash": "0x" + "".join(random.choices("0123456789abcdef", k=64)),
            "ipfs_hash": "Qm" + "".join(random.choices(string.ascii_letters + string.digits, k=44)),
            "verification_url": f"https://polygonscan.com/tx/0x{''.join(random.choices('0123456789abcdef', k=64))}",
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    for cred in blockchain_creds:
        await db.blockchain_credentials.insert_one(cred)
    print(f"   ✅ {len(blockchain_creds)} blockchain credentials created")
    
    # ========================================
    # 2. UPDATE WORKFORCE PROFILE (ID Verification)
    # ========================================
    print("\n📌 2. Updating Workforce Profile (ID Verification)...")
    
    await db.workforce_profiles.update_one(
        {"workforce_id": workforce_id},
        {"$set": {
            "id_verification_status": "approved",
            "id_verified_at": datetime.now(timezone.utc),
            "background_check_status": "approved",
            "sin_verified": True
        }}
    )
    print("   ✅ ID verification status updated")
    
    # ========================================
    # 3. WORKFORCE DOCUMENTS (Security Clearances)
    # ========================================
    print("\n📌 3. Creating Workforce Documents (Security Clearances)...")
    
    await db.workforce_documents.delete_many({"user_id": workforce_id})
    
    documents = [
        {
            "document_id": random_id("doc"),
            "user_id": workforce_id,
            "document_type": "background_check",
            "document_name": "Police Background Check",
            "verification_status": "verified",
            "verified_at": datetime.now(timezone.utc) - timedelta(days=60),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            "created_at": datetime.now(timezone.utc)
        },
        {
            "document_id": random_id("doc"),
            "user_id": workforce_id,
            "document_type": "work_permit",
            "document_name": "Canadian Work Authorization",
            "verification_status": "verified",
            "verified_at": datetime.now(timezone.utc) - timedelta(days=180),
            "expiry_date": None,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "document_id": random_id("doc"),
            "user_id": workforce_id,
            "document_type": "drivers_license",
            "document_name": "Ontario Driver's License - Class G",
            "verification_status": "verified",
            "verified_at": datetime.now(timezone.utc) - timedelta(days=90),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=1460)).isoformat(),
            "created_at": datetime.now(timezone.utc)
        },
        {
            "document_id": random_id("doc"),
            "user_id": workforce_id,
            "document_type": "sin_card",
            "document_name": "Social Insurance Number",
            "verification_status": "verified",
            "verified_at": datetime.now(timezone.utc) - timedelta(days=200),
            "expiry_date": None,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    for doc in documents:
        await db.workforce_documents.insert_one(doc)
    print(f"   ✅ {len(documents)} security documents created")
    
    # ========================================
    # 4. INSTITUTION PROFILE (for credential display)
    # ========================================
    print("\n📌 4. Creating Institution Profile...")
    
    await db.institution_profiles.delete_one({"institution_id": "inst_stclaire_001"})
    institution = {
        "institution_id": "inst_stclaire_001",
        "institution_name": "St. Clair College",
        "full_name": "Admin User",
        "email": "admin@stclairecollege.ca",
        "phone": "+1 (519) 972-2727",
        "city": "Windsor",
        "province": "Ontario",
        "country": "Canada",
        "institution_type": "college",
        "is_verified": True,
        "onboarding_completed": True,
        "created_date": datetime.now(timezone.utc).isoformat()
    }
    await db.institution_profiles.insert_one(institution)
    print("   ✅ Institution profile created")
    
    # ========================================
    # 5. EMPLOYER PROFILE (for work experience display)
    # ========================================
    print("\n📌 5. Creating Employer Profiles...")
    
    employers = [
        {
            "employer_id": "emp_d98ddf3160cf",
            "company_name": "Swan Pizza",
            "full_name": "John Swan",
            "email": "demo@swanpizza.ca",
            "phone": "+1 (519) 555-0101",
            "city": "Windsor",
            "province": "Ontario",
            "is_verified": True,
            "onboarding_completed": True,
            "created_date": datetime.now(timezone.utc).isoformat()
        },
        {
            "employer_id": "emp_tim_001",
            "company_name": "Tim Hortons",
            "full_name": "Manager",
            "email": "manager@timhortons.ca",
            "city": "Windsor",
            "province": "Ontario",
            "is_verified": True,
            "onboarding_completed": True,
            "created_date": datetime.now(timezone.utc).isoformat()
        },
        {
            "employer_id": "emp_walmart_001",
            "company_name": "Walmart Canada",
            "full_name": "Store Manager",
            "email": "manager@walmart.ca",
            "city": "Windsor",
            "province": "Ontario",
            "is_verified": True,
            "onboarding_completed": True,
            "created_date": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for emp in employers:
        await db.employer_profiles.update_one(
            {"employer_id": emp["employer_id"]},
            {"$set": emp},
            upsert=True
        )
    print(f"   ✅ {len(employers)} employer profiles created")
    
    # ========================================
    # 6. COMPLETED SHIFTS (Work Experience)
    # ========================================
    print("\n📌 6. Creating Completed Shifts...")
    
    await db.shifts.delete_many({"workforce_id": workforce_id})
    
    shifts = []
    # Create 50 completed shifts over the past year
    for i in range(50):
        days_ago = random.randint(1, 365)
        shift_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
        start_hour = random.choice([6, 7, 8, 9, 10, 14, 15, 16])
        duration = random.choice([4, 5, 6, 7, 8])
        
        employer = random.choice(["emp_d98ddf3160cf", "emp_tim_001", "emp_walmart_001"])
        employer_names = {
            "emp_d98ddf3160cf": "Swan Pizza",
            "emp_tim_001": "Tim Hortons",
            "emp_walmart_001": "Walmart Canada"
        }
        
        shift = {
            "shift_id": random_id("shift"),
            "workforce_id": workforce_id,
            "employer_id": employer,
            "employer_name": employer_names[employer],
            "job_title": random.choice(["Team Member", "Shift Lead", "Cashier", "Food Prep"]),
            "shift_date": shift_date.isoformat(),
            "start_time": f"{start_hour:02d}:00",
            "end_time": f"{(start_hour + duration):02d}:00",
            "hours_worked": duration,
            "hourly_rate": random.choice([15.50, 16.00, 17.50, 18.00]),
            "status": "completed",
            "clock_in_time": shift_date.replace(hour=start_hour, minute=0).isoformat(),
            "clock_out_time": shift_date.replace(hour=start_hour + duration, minute=0).isoformat(),
            "rating_from_employer": random.choice([4, 4, 5, 5, 5]),
            "created_at": shift_date
        }
        shifts.append(shift)
    
    for shift in shifts:
        await db.shifts.insert_one(shift)
    print(f"   ✅ {len(shifts)} completed shifts created")
    
    # Calculate total hours
    total_hours = sum(s["hours_worked"] for s in shifts)
    print(f"   📊 Total hours worked: {total_hours}")
    
    # Update employment relationships with shift counts
    print("\n📌 7. Updating Employment Relationships...")
    
    await db.employment_relationships.update_many(
        {"workforce_id": workforce_id},
        {"$set": {"total_shifts": 0, "total_hours": 0}}
    )
    
    # Count by employer
    for emp_id, emp_name in [("emp_d98ddf3160cf", "Swan Pizza"), ("emp_tim_001", "Tim Hortons"), ("emp_walmart_001", "Walmart Canada")]:
        emp_shifts = [s for s in shifts if s["employer_id"] == emp_id]
        emp_hours = sum(s["hours_worked"] for s in emp_shifts)
        
        await db.employment_relationships.update_one(
            {"workforce_id": workforce_id, "employer_id": emp_id},
            {"$set": {
                "total_shifts": len(emp_shifts),
                "total_hours": emp_hours,
                "employer_name": emp_name
            }}
        )
        print(f"   ✅ {emp_name}: {len(emp_shifts)} shifts, {emp_hours} hours")
    
    # ========================================
    # Create indexes
    # ========================================
    print("\n📌 Creating indexes...")
    await db.blockchain_credentials.create_index("worker_id")
    await db.blockchain_credentials.create_index("credential_id", unique=True)
    await db.workforce_documents.create_index("user_id")
    await db.shifts.create_index("workforce_id")
    await db.shifts.create_index("employer_id")
    print("   ✅ Indexes created")
    
    print("\n" + "=" * 60)
    print("✅ MISSING DATA ADDED!")
    print("=" * 60)
    print("\n📊 Data Added:")
    print("   - 4 Blockchain Credentials (on-chain verified)")
    print("   - 4 Security Documents (Background Check, Work Permit, etc.)")
    print("   - ID Verification Status: Approved")
    print("   - 3 Employer Profiles")
    print(f"   - {len(shifts)} Completed Shifts ({total_hours} total hours)")
    print("-" * 40)
    print("\n🔄 Refresh the Work Passport page to see the updates!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_missing_data())
