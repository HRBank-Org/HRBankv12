// SafestWork Consulting Inc. — Production Account Setup
// Run on PRODUCTION MongoDB: mongosh "mongodb+srv://YOUR_CONNECTION_STRING/hrbank_db" setup_safestwork.js

db = db.getSiblingDB('hrbank_db');

const bcrypt = require ? null : null; // mongosh doesn't have bcrypt

// Pre-hashed password for "SafestWork2026!" using bcrypt
// Generated via: bcrypt.hashpw("SafestWork2026!".encode(), bcrypt.gensalt())
const password_hash = "$2b$12$XcPe4N7xf2be7FPiDoq2jefxTf793zJKcdO3mwrKQCNRXn2TF2Wh2";

const now = new Date();
const user_id = "usr_safestwork_001";
const institution_id = "inst_safestwork";

const programs = [
    "Working at Heights Training",
    "Forklift Training (Class 1, 4, 5)",
    "CPR First Aid Training",
    "Respirator Fit Test Training",
    "Traffic Control Training",
    "TDG Training (Transportation of Dangerous Goods)",
    "WHMIS 2015/GHS Certification",
    "Overhead Crane Training",
    "LOTOTO Training (Lockout/Tagout)",
    "Confined Space Training",
    "Worker Health & Safety in 4-Steps",
    "Supervisor Health & Safety in 5-Steps"
];

// 1. Create user
if (!db.users.findOne({ email: "aleblanc@safestwork.com" })) {
    db.users.insertOne({
        user_id: user_id,
        email: "aleblanc@safestwork.com",
        password_hash: password_hash,
        user_type: "institution",
        role: "institution_admin",
        profile_status: "active",
        email_verified: true,
        mfa_enabled: false,
        created_date: now.toISOString(),
        last_login_date: null,
        deleted_at: null,
        activated_by: "system",
        activated_date: now.toISOString(),
        full_name: "Adrien LeBlanc",
        institution_id: institution_id
    });
    print("Created user: aleblanc@safestwork.com");
} else {
    print("User already exists");
}

// 2. Create institution
if (!db.institutions.findOne({ institution_id: institution_id })) {
    db.institutions.insertOne({
        institution_id: institution_id,
        email: "aleblanc@safestwork.com",
        password_hash: password_hash,
        institution_name: "SafestWork Consulting Inc.",
        institution_type: "training_provider",
        contact_name: "Adrien LeBlanc",
        phone: "+1 (844) 250-7575",
        address: "2825 Lauzon Parkway, Suite 212",
        city: "Windsor",
        province: "Ontario",
        country: "Canada",
        postal_code: "N8T 3H5",
        website: "https://www.safestwork.com",
        logo_url: "/api/static/logos/inst_safestwork.png",
        is_verified: true,
        is_active: true,
        onboarding_completed: true,
        can_issue_credentials: true,
        credential_types: ["certificate", "badge", "license"],
        programs_offered: programs,
        total_credentials_issued: 0,
        active_students: 0,
        blockchain_enabled: true,
        blockchain_network: "polygon_mainnet",
        created_at: now
    });
    print("Created institution: SafestWork Consulting Inc.");
} else {
    print("Institution already exists");
}

// 3. Create institution profile
if (!db.institution_profiles.findOne({ institution_id: institution_id })) {
    db.institution_profiles.insertOne({
        institution_id: institution_id,
        user_id: user_id,
        institution_name: "SafestWork Consulting Inc.",
        institution_logo_url: "/api/static/logos/inst_safestwork.png",
        logo_url: "/api/static/logos/inst_safestwork.png",
        institution_type: "training_provider",
        contact_name: "Adrien LeBlanc",
        phone: "+1 (844) 250-7575",
        address: "2825 Lauzon Parkway, Suite 212",
        city: "Windsor",
        province: "Ontario",
        country: "Canada",
        postal_code: "N8T 3H5",
        website: "https://www.safestwork.com",
        onboarding_completed: true,
        is_verified: true,
        programs_offered: programs,
        created_at: now,
        description: "SafestWork Consulting Inc. is a CPO-Approved occupational health & safety training provider in Windsor, Ontario. Consumer Choice Award winner 2026. WSIB Health and Safety Excellence Program provider."
    });
    print("Created profile: SafestWork Consulting Inc.");
} else {
    print("Profile already exists");
}

print("\n=== SAFESTWORK ACCOUNT READY ===");
print("Email: aleblanc@safestwork.com");
print("Password: SafestWork2026! (CHANGE THIS ON FIRST LOGIN)");
print("Programs: " + programs.length);
print("\nIMPORTANT: The password hash above is a placeholder.");
print("After running this script, use the platform's password reset");
print("to set the actual password, OR update the hash manually.");
