"""
Trios College Programs Import Script
=====================================
Run this script in your production environment to populate programs.

Usage:
  1. Download the latest code from Emergent
  2. Copy this file to your production server
  3. Set MONGO_URL environment variable
  4. Run: python import_trios_programs.py

This will:
  - Connect to your MongoDB
  - Create Faculties (Healthcare, Business, Technology, Law, Art and Design, Supply Chain)
  - Create all 68 programs from Trios College's catalog
  - Skip duplicates if re-run
"""

import os
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'hrbank_db')

# Trios College Institution ID (from your production database)
TRIOS_INSTITUTION_ID = "inst_trios_001"  # Update this if different in production

# Faculty definitions with colors and icons
FACULTIES = [
    {"faculty_name": "Healthcare", "icon": "🏥", "color": "#10B981", "description": "Healthcare, nursing, and allied health programs"},
    {"faculty_name": "Business", "icon": "💼", "color": "#F59E0B", "description": "Business administration, accounting, and marketing programs"},
    {"faculty_name": "Technology", "icon": "💻", "color": "#3B82F6", "description": "IT, data science, cybersecurity, and software development programs"},
    {"faculty_name": "Law", "icon": "⚖️", "color": "#8B5CF6", "description": "Legal studies, paralegal, and police foundations programs"},
    {"faculty_name": "Art and Design", "icon": "🎨", "color": "#EC4899", "description": "Graphic design and creative arts programs"},
    {"faculty_name": "Supply Chain", "icon": "📦", "color": "#06B6D4", "description": "Supply chain management and logistics programs"},
]

# All programs from your Excel file
PROGRAMS = [
    {"Name": "Acupuncture Practitioner", "MainFaculty": "Healthcare", "SubFaculty": "Traditional Chinese Medicine", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/acupuncture-practitioner.pdf", "Status": "Active", "DeliveryMode": "Hybrid", "MarketingName": "Acupuncture Practitioner"},
    {"Name": "Contemporary Acupuncture for Healthcare Professionals", "MainFaculty": "Healthcare", "SubFaculty": "Traditional Chinese Medicine", "Type": "Certificate", "OutlineLink": "https://www.trios.com/uploads/docs/acupuncture-practitioner-OA.pdf", "Status": "Active", "DeliveryMode": "Hybrid", "MarketingName": "Contemporary Acupuncture for Healthcare Professionals"},
    {"Name": "Acupuncture Practitioner for Healthcare Professionals", "MainFaculty": "Healthcare", "SubFaculty": "Traditional Chinese Medicine", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/acupuncture-practitioner-OA.pdf", "Status": "Active", "DeliveryMode": "Hybrid", "MarketingName": "Acupuncture Practitioner for Healthcare Professionals"},
    {"Name": "Addiction and Mental Health Worker", "MainFaculty": "Healthcare", "SubFaculty": "Addiction Worker", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/addiction-and-mental-health-worker.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Addiction and Mental Health Worker"},
    {"Name": "Addiction and Mental Health Worker + Internship", "MainFaculty": "Healthcare", "SubFaculty": "Addiction Worker", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/addiction-and-mental-health-worker-internship.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Addiction and Mental Health Worker"},
    {"Name": "Accounting and Payroll Online", "MainFaculty": "Business", "SubFaculty": "Accounting", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/accounting-and-payroll-online.pdf", "Status": "Active", "DeliveryMode": "Online", "MarketingName": "Accounting and Payroll"},
    {"Name": "Accounting and Payroll Administrator", "MainFaculty": "Business", "SubFaculty": "Accounting", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Accounting and Payroll Specialist"},
    {"Name": "Accounting Payroll Specialist", "MainFaculty": "Business", "SubFaculty": "Accounting", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/accounting-payroll-specialist.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Accounting Payroll Specialist"},
    {"Name": "Accounting Technician", "MainFaculty": "Business", "SubFaculty": "Accounting", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Accounting Technician"},
    {"Name": "Accounting Technician + Internship", "MainFaculty": "Business", "SubFaculty": "Accounting", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/accounting-technician.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Accounting Technician"},
    {"Name": "Addiction Worker", "MainFaculty": "Healthcare", "SubFaculty": "Addiction Worker", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/addiction-worker.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Addiction Worker"},
    {"Name": "Addiction Worker + Internship", "MainFaculty": "Healthcare", "SubFaculty": "Addiction Worker", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/addiction-worker-internship.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Addiction Worker"},
    {"Name": "Business Administration and Management", "MainFaculty": "Business", "SubFaculty": "Business Administration", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Business Administration and Management"},
    {"Name": "Business Administration and Management + Internship", "MainFaculty": "Business", "SubFaculty": "Business Administration", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/business-administration-management.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Business Administration and Management"},
    {"Name": "Business, Entrepreneurship, Administration, and Management", "MainFaculty": "Business", "SubFaculty": "Business Administration", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Business, Entrepreneurship, Administration, and Management"},
    {"Name": "Business, Entrepreneurship, Administration, and Management + Internship", "MainFaculty": "Business", "SubFaculty": "Business Administration", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/business-entrepreneurship-administration-management.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Business, Entrepreneurship, Administration, and Management"},
    {"Name": "Business, Entrepreneurship, and Management", "MainFaculty": "Business", "SubFaculty": "Business Administration", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Business, Entrepreneurship, and Management"},
    {"Name": "Business, Entrepreneurship, and Management + Internship", "MainFaculty": "Business", "SubFaculty": "Business Administration", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/business-entrepreneurship-management.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Business, Entrepreneurship, and Management"},
    {"Name": "Community Services Worker", "MainFaculty": "Healthcare", "SubFaculty": "Community Services Worker", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Community Services Worker"},
    {"Name": "Community Services Worker (+Internship)", "MainFaculty": "Healthcare", "SubFaculty": "Community Services Worker", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/community-services-worker.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Community Services Worker"},
    {"Name": "Data Analyst", "MainFaculty": "Technology", "SubFaculty": "Data Science", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/data-analyst.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Data Analyst"},
    {"Name": "Data Analyst + Internship", "MainFaculty": "Technology", "SubFaculty": "Data Science", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/data-analyst-internship.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Data Analyst"},
    {"Name": "Data Analysis and AI Specialist", "MainFaculty": "Technology", "SubFaculty": "Data Science", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/data-analysis-and-ai-specialist.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Data Analysis and AI Specialist"},
    {"Name": "Data Analysis and AI Specialist + Internship", "MainFaculty": "Technology", "SubFaculty": "Data Science", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/data-analysis-and-ai-specialist-internship.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Data Analysis and AI Specialist"},
    {"Name": "Digital Marketing and Graphic Design Using AI", "MainFaculty": "Business", "SubFaculty": "Marketing", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/digital-marketing-and-graphic-design-using-ai.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Digital Marketing and Graphic Design Using AI"},
    {"Name": "Digital Marketing and Graphic Design Using AI + Internship", "MainFaculty": "Business", "SubFaculty": "Marketing", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/digital-marketing-and-graphic-design-using-ai-internship.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Digital Marketing and Graphic Design Using AI"},
    {"Name": "Digital Marketing", "MainFaculty": "Business", "SubFaculty": "Marketing", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Digital Marketing"},
    {"Name": "Digital Marketing + Internship", "MainFaculty": "Business", "SubFaculty": "Marketing", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/digital-marketing.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Digital Marketing"},
    {"Name": "Digital Marketing Online", "MainFaculty": "Business", "SubFaculty": "Marketing", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/digital-marketing-online.pdf", "Status": "Active", "DeliveryMode": "Online", "MarketingName": "Digital Marketing"},
    {"Name": "Graphic Design", "MainFaculty": "Art and Design", "SubFaculty": "Graphic Design", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/graphic-design.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Graphic Design"},
    {"Name": "Health Information Management - 73 Weeks", "MainFaculty": "Healthcare", "SubFaculty": "Health Information Management", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/health-information-management.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Health Information Management"},
    {"Name": "Health Information Management Online - 73 Weeks", "MainFaculty": "Healthcare", "SubFaculty": "Health Information Management", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/health-information-management.pdf", "Status": "Active", "DeliveryMode": "Online", "MarketingName": "Health Information Management"},
    {"Name": "Information Technology Administrator (Cloud)", "MainFaculty": "Technology", "SubFaculty": "Information Technology", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Information Technology Administrator (Cloud)"},
    {"Name": "Information Technology Administrator (Cloud) + Internship", "MainFaculty": "Technology", "SubFaculty": "Information Technology", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/information-technology-administrator-cloud.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Information Technology Administrator (Cloud)"},
    {"Name": "Information Technology Administrator (Cybersecurity)", "MainFaculty": "Technology", "SubFaculty": "Information Technology", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Information Technology Administrator (Cybersecurity)"},
    {"Name": "Information Technology Administrator (Cybersecurity) + Internship", "MainFaculty": "Technology", "SubFaculty": "Information Technology", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/information-technology-administrator-cybersecurity.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Information Technology Administrator (Cybersecurity)"},
    {"Name": "Information Technology Professional (Infrastructure, Cloud & Cybersecurity)", "MainFaculty": "Technology", "SubFaculty": "Information Technology", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Information Technology Professional (Infrastructure, Cloud & Cybersecurity)"},
    {"Name": "Information Technology Professional (Infrastructure, Cloud & Cybersecurity) + Internship", "MainFaculty": "Technology", "SubFaculty": "Information Technology", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/information-technology-professional-icc.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Information Technology Professional (Infrastructure, Cloud & Cybersecurity)"},
    {"Name": "Legal Assistant", "MainFaculty": "Law", "SubFaculty": "Law Clerk", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/legal-assistant.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Legal Assistant"},
    {"Name": "Law Clerk Specialist", "MainFaculty": "Law", "SubFaculty": "Law Clerk", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/law-clerk-specialist.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Law Clerk Specialist"},
    {"Name": "Mobile Developer Using AI", "MainFaculty": "Technology", "SubFaculty": "Applications Development", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Mobile Developer Using AI"},
    {"Name": "Mobile Developer Using AI (+Internship)", "MainFaculty": "Technology", "SubFaculty": "Applications Development", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/mobile-developer.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Mobile Developer Using AI"},
    {"Name": "Medical Office Assistant", "MainFaculty": "Healthcare", "SubFaculty": "Medical Administration", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Medical Office Assistant"},
    {"Name": "Medical Office Assistant (+Internship)", "MainFaculty": "Healthcare", "SubFaculty": "Medical Administration", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/medical-office-assistant.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Medical Administration"},
    {"Name": "Medical Office Administration Online", "MainFaculty": "Healthcare", "SubFaculty": "MOA Online", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/medical-office-administration-online.pdf", "Status": "Active", "DeliveryMode": "Online", "MarketingName": "Medical Administration"},
    {"Name": "Mobile Web Developer Using AI", "MainFaculty": "Technology", "SubFaculty": "Applications Development", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Mobile Web Developer Using AI"},
    {"Name": "Mobile Web Developer Using AI (+Internship)", "MainFaculty": "Technology", "SubFaculty": "Applications Development", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/mobile-web-developer.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Mobile Web Developer Using AI"},
    {"Name": "Office Administrative Assistant", "MainFaculty": "Business", "SubFaculty": "Business Administration", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/office-administrative-assistant.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Office Administrative Assistant"},
    {"Name": "Police Foundations & Security", "MainFaculty": "Law", "SubFaculty": "Policing", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/police-foundations-and-security.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Police Foundations and Security"},
    {"Name": "Pharmacy Assistant", "MainFaculty": "Healthcare", "SubFaculty": "Pharmacy", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/pharmacy-assistant.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Pharmacy Assistant"},
    {"Name": "Paralegal", "MainFaculty": "Law", "SubFaculty": "Paralegal", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/paralegal.pdf", "Status": "Active", "DeliveryMode": "In-Class", "MarketingName": "Paralegal"},
    {"Name": "NACC Personal Support Worker", "MainFaculty": "Healthcare", "SubFaculty": "Personal Support Worker", "Type": "Certificate - Vocational", "OutlineLink": "https://www.trios.com/uploads/docs/NACC-personal-support-worker.pdf", "Status": "Active", "DeliveryMode": "In-Class", "MarketingName": "Personal Support Worker"},
    {"Name": "NACC Personal Support Worker DE", "MainFaculty": "Healthcare", "SubFaculty": "Personal Support Worker", "Type": "Certificate - Vocational", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Hybrid", "MarketingName": "Personal Support Worker"},
    {"Name": "Massage Therapy", "MainFaculty": "Healthcare", "SubFaculty": "Massage", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/massage-therapy.pdf", "Status": "Active", "DeliveryMode": "In-Class", "MarketingName": "Massage Therapy"},
    {"Name": "Massage Therapy - Pending Accreditation", "MainFaculty": "Healthcare", "SubFaculty": "Massage", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "In-Class", "MarketingName": "Massage Therapy"},
    {"Name": "System Administrator", "MainFaculty": "Technology", "SubFaculty": "Information Technology", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "System Administrator"},
    {"Name": "System Administrator + Internship", "MainFaculty": "Technology", "SubFaculty": "Information Technology", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/system-administrator.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "System Administrator"},
    {"Name": "Supply Chain Online", "MainFaculty": "Supply Chain", "SubFaculty": "Supply Chain", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/supply-chain-online.pdf", "Status": "Active", "DeliveryMode": "Online", "MarketingName": "Supply Chain"},
    {"Name": "Supply Chain & Logistics", "MainFaculty": "Supply Chain", "SubFaculty": "Supply Chain", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Supply Chain & Logistics"},
    {"Name": "Supply Chain & Logistics (+Internship)", "MainFaculty": "Supply Chain", "SubFaculty": "Supply Chain", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/supply-chain-and-logistics.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Supply Chain"},
    {"Name": "Supply Chain and Operations Management", "MainFaculty": "Supply Chain", "SubFaculty": "Supply Chain", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Supply Chain and Operations Management"},
    {"Name": "Supply Chain and Operations Management (+Internship)", "MainFaculty": "Supply Chain", "SubFaculty": "Supply Chain", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/supply-chain-and-operations-management.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Supply Chain and Operations Management"},
    {"Name": "Web Developer Using AI", "MainFaculty": "Technology", "SubFaculty": "Applications Development", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Web Developer Using AI"},
    {"Name": "Web Developer Using AI (+Internship)", "MainFaculty": "Technology", "SubFaculty": "Applications Development", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/web-developer.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Web Developer Using AI"},
    {"Name": "Web & Development Fundamentals", "MainFaculty": "Technology", "SubFaculty": "Applications Development", "Type": "Diploma", "OutlineLink": None, "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Web & Development Fundamentals"},
    {"Name": "Web & Development Fundamentals (+Internship)", "MainFaculty": "Technology", "SubFaculty": "Applications Development", "Type": "Diploma", "OutlineLink": "https://www.trios.com/uploads/docs/web-development-fundamentals.pdf", "Status": "Active", "DeliveryMode": "Remote", "MarketingName": "Web and Development Fundamentals"},
]


async def main():
    print("=" * 60)
    print("TRIOS COLLEGE PROGRAMS IMPORT")
    print("=" * 60)
    
    # Connect to MongoDB
    print(f"\nConnecting to MongoDB...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Verify Trios College exists
    institution = await db.users.find_one({"user_id": TRIOS_INSTITUTION_ID})
    if not institution:
        print(f"ERROR: Institution {TRIOS_INSTITUTION_ID} not found!")
        print("Please verify the institution_id in your production database.")
        return
    
    print(f"Found institution: {institution.get('email')}")
    
    # Step 1: Create Faculties
    print("\n" + "-" * 40)
    print("STEP 1: Creating Faculties")
    print("-" * 40)
    
    faculty_map = {}  # faculty_name -> faculty_id
    
    for i, faculty_data in enumerate(FACULTIES):
        # Check if faculty already exists
        existing = await db.institution_faculties.find_one({
            "institution_id": TRIOS_INSTITUTION_ID,
            "faculty_name": faculty_data["faculty_name"],
            "is_active": True
        })
        
        if existing:
            faculty_map[faculty_data["faculty_name"]] = existing["faculty_id"]
            print(f"  ✓ {faculty_data['icon']} {faculty_data['faculty_name']} (already exists)")
        else:
            faculty_id = f"fac_{uuid.uuid4().hex[:12]}"
            faculty_doc = {
                "faculty_id": faculty_id,
                "institution_id": TRIOS_INSTITUTION_ID,
                "faculty_name": faculty_data["faculty_name"],
                "description": faculty_data["description"],
                "icon": faculty_data["icon"],
                "color": faculty_data["color"],
                "display_order": i,
                "is_active": True,
                "programs_count": 0,
                "created_date": datetime.now(timezone.utc).isoformat(),
                "updated_date": None
            }
            await db.institution_faculties.insert_one(faculty_doc)
            faculty_map[faculty_data["faculty_name"]] = faculty_id
            print(f"  + {faculty_data['icon']} {faculty_data['faculty_name']} (created)")
    
    print(f"\nTotal faculties: {len(faculty_map)}")
    
    # Step 2: Create Programs
    print("\n" + "-" * 40)
    print("STEP 2: Creating Programs")
    print("-" * 40)
    
    created_count = 0
    skipped_count = 0
    error_count = 0
    
    for program in PROGRAMS:
        faculty_name = program["MainFaculty"]
        
        # Skip N.A. programs
        if faculty_name == "N.A.":
            print(f"  ⊘ Skipping: {program['Name']} (N.A. faculty)")
            skipped_count += 1
            continue
        
        faculty_id = faculty_map.get(faculty_name)
        if not faculty_id:
            print(f"  ✗ ERROR: Faculty '{faculty_name}' not found for: {program['Name']}")
            error_count += 1
            continue
        
        # Check if program already exists
        existing = await db.institution_programs.find_one({
            "institution_id": TRIOS_INSTITUTION_ID,
            "faculty_id": faculty_id,
            "program_name": program["Name"],
            "is_active": True
        })
        
        if existing:
            print(f"  ✓ {program['Name']} (already exists)")
            skipped_count += 1
            continue
        
        # Create program
        program_id = f"prg_{uuid.uuid4().hex[:12]}"
        program_doc = {
            "program_id": program_id,
            "institution_id": TRIOS_INSTITUTION_ID,
            "faculty_id": faculty_id,
            "program_name": program["Name"],
            "program_code": None,
            "sub_faculty": program.get("SubFaculty"),
            "description": None,
            "marketing_name": program.get("MarketingName") or program["Name"],
            "credential_type": program.get("Type", "Diploma"),
            "duration_weeks": None,
            "duration_display": None,
            "validity_period_months": None,
            "delivery_mode": program.get("DeliveryMode", "In-Class"),
            "outline_url": program.get("OutlineLink"),
            "status": "active" if program.get("Status") == "Active" else "inactive",
            "total_cohorts": 0,
            "total_students": 0,
            "total_credentials_issued": 0,
            "is_active": True,
            "display_order": 0,
            "created_date": datetime.now(timezone.utc).isoformat(),
            "updated_date": None
        }
        
        await db.institution_programs.insert_one(program_doc)
        
        # Update faculty programs count
        await db.institution_faculties.update_one(
            {"faculty_id": faculty_id},
            {"$inc": {"programs_count": 1}}
        )
        
        print(f"  + {program['Name']}")
        created_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("IMPORT COMPLETE")
    print("=" * 60)
    print(f"  Faculties: {len(faculty_map)}")
    print(f"  Programs created: {created_count}")
    print(f"  Programs skipped: {skipped_count}")
    print(f"  Errors: {error_count}")
    print(f"  Total programs: {created_count + skipped_count}")
    
    # Close connection
    client.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
