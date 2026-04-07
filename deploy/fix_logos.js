// HR Bank — Fix Partner Institution Logos
// Run on your PRODUCTION MongoDB Atlas database
//
// Usage: mongosh "mongodb+srv://YOUR_CONNECTION_STRING/hrbank_db" fix_logos.js
//
// This script updates logo URLs from external hotlinked URLs 
// to local self-hosted static files at /api/static/logos/

db = db.getSiblingDB('hrbank_db');

// Map institution_id to logo filename
const logoMap = {};
db.institutions.find(
    { logo_url: { $exists: true, $ne: "" } },
    { institution_id: 1, institution_name: 1, logo_url: 1 }
).forEach(inst => {
    const newUrl = `/api/static/logos/${inst.institution_id}.png`;
    logoMap[inst.institution_id] = { name: inst.institution_name, newUrl: newUrl };
    
    // Update institutions collection
    db.institutions.updateOne(
        { _id: inst._id },
        { $set: { logo_url: newUrl } }
    );
    
    // Update institution_profiles collection
    db.institution_profiles.updateMany(
        { institution_name: inst.institution_name },
        { $set: { institution_logo_url: newUrl, logo_url: newUrl } }
    );
    
    print(`Updated: ${inst.institution_name} -> ${newUrl}`);
});

print(`\nDone! Updated ${Object.keys(logoMap).length} institutions.`);
print('Make sure the logo files exist at /app/backend/static/logos/ in the Docker container.');
