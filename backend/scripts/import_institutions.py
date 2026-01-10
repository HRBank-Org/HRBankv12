"""
Script to import institutions from Excel file into the database.
Fixes French character encoding issues and handles program categories.

Usage:
    python scripts/import_institutions.py /path/to/institutions.xlsx
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'hrbank_db')

# Encoding fixes for French characters (Mojibake)
ENCODING_FIXES = [
    ('Ã£Â‰', 'É'), ('Ã£Âˆ', 'È'), ('Ã£Â©', 'é'), ('Ã£Â¨', 'è'),
    ('Ã£Â ', 'à'), ('Ã£Â¢', 'â'), ('Ã£Â§', 'ç'), ('Ã£Â´', 'ô'),
    ('Ã£Â»', 'û'), ('Ã£Â¹', 'ù'), ('Ã£Âª', 'ê'), ('Ã£Â®', 'î'),
    ('ÃƒÂ©', 'é'), ('ÃƒÂ¨', 'è'), ('ÃƒÂª', 'ê'), ('ÃƒÂ«', 'ë'),
    ('ÃƒÂ ', 'à'), ('ÃƒÂ¢', 'â'), ('ÃƒÂ®', 'î'), ('ÃƒÂ¯', 'ï'),
    ('ÃƒÂ´', 'ô'), ('ÃƒÂ¹', 'ù'), ('ÃƒÂ»', 'û'), ('ÃƒÂ¼', 'ü'),
    ('ÃƒÂ§', 'ç'), ('ÃƒÂ‰', 'É'), ('ÃƒÂˆ', 'È'), ('ÃƒÂŠ', 'Ê'),
    ('ÃƒÂ€', 'À'), ('ÃƒÂ‚', 'Â'), ('ÃƒÂŽ', 'Î'), ('ÃƒÂ"', 'Ô'),
    ('ÃƒÂ™', 'Ù'), ('ÃƒÂ›', 'Û'), ('ÃƒÂ‡', 'Ç'),
    ('Ã©', 'é'), ('Ã¨', 'è'), ('Ãª', 'ê'), ('Ã«', 'ë'),
    ('Ã ', 'à'), ('Ã¢', 'â'), ('Ã®', 'î'), ('Ã¯', 'ï'),
    ('Ã´', 'ô'), ('Ã¹', 'ù'), ('Ã»', 'û'), ('Ã¼', 'ü'),
    ('Ã§', 'ç'), ('Ã‰', 'É'), ('Ãˆ', 'È'), ('ÃŠ', 'Ê'),
    ('Ã€', 'À'), ('Ã‚', 'Â'), ('ÃŽ', 'Î'), ('Ã"', 'Ô'),
    ('Ã™', 'Ù'), ('Ã›', 'Û'), ('Ã‡', 'Ç'),
]

def fix_encoding(text):
    """Fix double-encoded UTF-8 French characters."""
    if pd.isna(text):
        return text
    text = str(text)
    for bad, good in ENCODING_FIXES:
        text = text.replace(bad, good)
    return text

def determine_institution_type(name, categories):
    """Determine institution type from name and categories."""
    name_lower = (name or '').lower()
    cat_str = str(categories or '').lower()
    
    if 'university' in name_lower or 'université' in name_lower:
        return 'university'
    elif 'college' in name_lower or 'collège' in name_lower or 'cégep' in name_lower:
        return 'college'
    elif 'high school' in name_lower or 'secondary' in name_lower or 'école secondaire' in name_lower:
        return 'high_school'
    elif any(x in cat_str for x in ['trades', 'driving', 'beauty', 'culinary', 'security']):
        return 'training_provider'
    else:
        return 'training_provider'

def parse_categories(categories_str):
    """Parse program categories from string representation of list."""
    if pd.isna(categories_str):
        return []
    try:
        # It's stored as a string like "['Education', 'Healthcare']"
        import ast
        return ast.literal_eval(categories_str)
    except:
        return []

async def import_institutions(file_path: str, dry_run: bool = False):
    """Import institutions from Excel file."""
    
    print(f"📂 Reading file: {file_path}")
    df = pd.read_excel(file_path)
    print(f"📊 Found {len(df)} rows")
    
    # Fix encoding in text columns
    for col in ['Institution', 'Street', 'City', 'Clean_Programs']:
        if col in df.columns:
            df[col] = df[col].apply(fix_encoding)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    results = {
        'total_processed': 0,
        'successfully_imported': 0,
        'duplicates_skipped': 0,
        'errors': []
    }
    
    batch = []
    
    for idx, row in df.iterrows():
        results['total_processed'] += 1
        
        try:
            institution_name = str(row.get('Institution', '')).strip()
            if not institution_name or institution_name == 'nan':
                continue
            
            province = str(row.get('Province', '')).strip().upper()
            if not province or province == 'NAN':
                continue
            
            city = str(row.get('City', '')).strip()
            if city == 'nan':
                city = ''
            
            # Check for existing entry
            existing = await db.institution_directory.find_one({
                'institution_name': {'$regex': f'^{institution_name}$', '$options': 'i'},
                'province': province
            })
            
            if existing:
                results['duplicates_skipped'] += 1
                continue
            
            # Check if already a partner
            existing_partner = await db.institution_profiles.find_one({
                'institution_name': {'$regex': f'^{institution_name}$', '$options': 'i'}
            })
            
            if existing_partner:
                results['duplicates_skipped'] += 1
                continue
            
            # Parse data
            categories = parse_categories(row.get('Program_Categories'))
            inst_type = determine_institution_type(institution_name, row.get('Program_Categories'))
            
            phone = str(row.get('Phone', '')).strip()
            if phone == 'nan':
                phone = None
            
            email = str(row.get('Email', '')).strip()
            if email == 'nan' or not email:
                email = None
            
            website = str(row.get('Website', '')).strip()
            if website == 'nan':
                website = None
            
            street = str(row.get('Street', '')).strip()
            if street == 'nan':
                street = ''
            
            postal = str(row.get('Postal', '')).strip()
            if postal == 'nan':
                postal = ''
            
            entry = {
                'directory_id': str(uuid.uuid4()),
                'institution_name': institution_name,
                'province': province,
                'city': city,
                'street': street,
                'postal_code': postal,
                'phone': phone,
                'email': email,
                'website': website,
                'institution_type': inst_type,
                'program_categories': categories,
                'is_public': True,
                'invite_request_count': 0,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'source': 'excel_import'
            }
            
            if not dry_run:
                batch.append(entry)
                
                # Insert in batches of 100
                if len(batch) >= 100:
                    await db.institution_directory.insert_many(batch)
                    results['successfully_imported'] += len(batch)
                    print(f"  ✓ Imported batch: {results['successfully_imported']} total")
                    batch = []
            else:
                results['successfully_imported'] += 1
                
        except Exception as e:
            results['errors'].append(f"Row {idx}: {str(e)}")
    
    # Insert remaining batch
    if batch and not dry_run:
        await db.institution_directory.insert_many(batch)
        results['successfully_imported'] += len(batch)
    
    client.close()
    
    return results

async def main():
    if len(sys.argv) < 2:
        print("Usage: python import_institutions.py <excel_file> [--dry-run]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    dry_run = '--dry-run' in sys.argv
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)
    
    if dry_run:
        print("🔍 DRY RUN - No data will be imported")
    
    results = await import_institutions(file_path, dry_run)
    
    print("\n" + "="*50)
    print("📊 IMPORT RESULTS")
    print("="*50)
    print(f"Total processed: {results['total_processed']}")
    print(f"Successfully imported: {results['successfully_imported']}")
    print(f"Duplicates skipped: {results['duplicates_skipped']}")
    print(f"Errors: {len(results['errors'])}")
    
    if results['errors'][:5]:
        print("\nFirst 5 errors:")
        for err in results['errors'][:5]:
            print(f"  - {err}")

if __name__ == '__main__':
    asyncio.run(main())
