#!/usr/bin/env python3
"""
Script to create the first Super Admin account
Run this once to initialize the admin system
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_super_admin():
    """Create the first super admin account"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client['hr_bank']
    
    print("=" * 60)
    print("HR Bank - Super Admin Account Creation")
    print("=" * 60)
    
    # Check if super admin already exists
    existing_super_admin = await db.admins.find_one({"is_super_admin": True})
    if existing_super_admin:
        print("\n⚠️  A Super Admin already exists!")
        print(f"Email: {existing_super_admin.get('email')}")
        print("\nTo create another admin, login as Super Admin and use the admin portal.")
        return
    
    # Get admin details
    print("\nEnter Super Admin details:")
    full_name = input("Full Name: ").strip()
    email = input("Email: ").strip()
    password = input("Password (min 8 characters): ").strip()
    phone = input("Phone (optional): ").strip() or None
    
    if len(password) < 8:
        print("\n❌ Password must be at least 8 characters!")
        return
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        print(f"\n❌ Email {email} is already registered!")
        return
    
    # Create user account
    user_id = f"user_admin_{datetime.utcnow().timestamp()}"
    user = {
        "user_id": user_id,
        "email": email,
        "password_hash": pwd_context.hash(password),
        "full_name": full_name,
        "user_type": "admin",
        "phone": phone,
        "account_status": "active",
        "created_date": datetime.utcnow().isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Create admin profile
    admin_id = f"admin_{datetime.utcnow().timestamp()}"
    admin = {
        "admin_id": admin_id,
        "user_id": user_id,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "role": "super_admin",
        "is_super_admin": True,
        "assigned_zones": [],  # Empty = all zones
        "assigned_provinces": [],  # Empty = all provinces
        "can_approve_documents": True,
        "can_manage_users": True,
        "can_manage_admins": True,
        "can_view_analytics": True,
        "status": "active",
        "created_by": None,
        "created_date": datetime.utcnow().isoformat(),
        "last_login": None
    }
    
    await db.admins.insert_one(admin)
    
    print("\n" + "=" * 60)
    print("✅ Super Admin Account Created Successfully!")
    print("=" * 60)
    print(f"\n📧 Email: {email}")
    print(f"👤 Name: {full_name}")
    print(f"🔑 Role: Super Admin")
    print(f"\n🌐 Login at: http://localhost:3000/admin/login")
    print("\nAs Super Admin, you can now:")
    print("  • Create and manage other admin accounts")
    print("  • Initialize geographic zones")
    print("  • Approve/reject documents")
    print("  • Assign admins to specific zones")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(create_super_admin())
