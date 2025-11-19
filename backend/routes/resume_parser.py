"""
Resume Parser Routes - AI-powered resume parsing and profile auto-population
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Dict
from datetime import datetime
import os
import json
from dotenv import load_dotenv
import PyPDF2
import docx
import io

from auth.dependencies import get_current_user

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api/resume", tags=["Resume Parser"])


def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


async def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(e)}")


async def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc = docx.Document(io.BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read DOCX: {str(e)}")


async def parse_resume_with_ai(resume_text: str) -> Dict:
    """Use AI to parse resume text into structured data"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.getenv("EMERGENT_LLM_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Create a new chat session for parsing
        session_id = f"resume_parse_{datetime.utcnow().timestamp()}"
        
        system_message = """You are an expert resume parser. Extract structured information from resumes.

CRITICAL: Respond ONLY with valid JSON. No markdown, no code blocks, no explanations.

Output format (MUST be valid JSON):
{
  "personal_info": {
    "full_name": "string",
    "email": "string or null",
    "phone": "string or null",
    "location": "string or null"
  },
  "work_experience": [
    {
      "company_name": "string",
      "position_title": "string",
      "start_date": "YYYY-MM or YYYY",
      "end_date": "YYYY-MM or YYYY or Present",
      "responsibilities": ["string"],
      "is_current": boolean
    }
  ],
  "skills": ["string"],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "graduation_year": "YYYY or null"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date_obtained": "YYYY-MM or YYYY or null"
    }
  ]
}

Rules:
- Extract ALL information found
- If a field is not found, use null or empty array
- For dates, extract as much precision as available
- Skills should be individual items, not combined
- Be thorough and accurate"""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4.5-preview")
        
        user_message = UserMessage(
            text=f"Parse this resume and return ONLY valid JSON with no markdown:\n\n{resume_text}"
        )
        
        response = await chat.send_message(user_message)
        
        # Clean response - remove markdown code blocks if present
        response_clean = response.strip()
        if response_clean.startswith("```json"):
            response_clean = response_clean[7:]
        if response_clean.startswith("```"):
            response_clean = response_clean[3:]
        if response_clean.endswith("```"):
            response_clean = response_clean[:-3]
        response_clean = response_clean.strip()
        
        # Parse JSON
        try:
            parsed_data = json.loads(response_clean)
            return parsed_data
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {e}")
            print(f"Response: {response_clean[:500]}")
            raise HTTPException(
                status_code=500, 
                detail="AI returned invalid JSON. Please try again."
            )
        
    except Exception as e:
        print(f"AI Parsing Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")


@router.post("/upload", response_model=Dict)
async def upload_and_parse_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Upload resume file (PDF or DOCX) and parse it with AI
    Returns structured data for user confirmation
    """
    try:
        # Validate user type
        if current_user["user_type"] != "workforce":
            raise HTTPException(
                status_code=403, 
                detail="Resume upload is only available for workforce users"
            )
        
        # Validate file type
        filename = file.filename.lower()
        if not (filename.endswith('.pdf') or filename.endswith('.docx')):
            raise HTTPException(
                status_code=400,
                detail="Only PDF and DOCX files are supported"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Validate file size (max 10MB)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File size must be less than 10MB"
            )
        
        # Extract text based on file type
        if filename.endswith('.pdf'):
            resume_text = await extract_text_from_pdf(file_content)
        else:
            resume_text = await extract_text_from_docx(file_content)
        
        if not resume_text or len(resume_text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract sufficient text from resume. Please check file format."
            )
        
        # Parse with AI
        parsed_data = await parse_resume_with_ai(resume_text)
        
        # Store parsed data temporarily for confirmation
        parse_id = f"parse_{current_user['user_id']}_{int(datetime.utcnow().timestamp())}"
        
        await db.resume_parses.insert_one({
            "parse_id": parse_id,
            "user_id": current_user["user_id"],
            "parsed_data": parsed_data,
            "raw_text": resume_text[:5000],  # Store first 5000 chars
            "created_date": datetime.utcnow().isoformat(),
            "status": "pending_confirmation"
        })
        
        return {
            "success": True,
            "data": {
                "parse_id": parse_id,
                "parsed_data": parsed_data,
                "message": "Resume parsed successfully! Please review and confirm."
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Resume Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")


@router.post("/apply/{parse_id}", response_model=Dict)
async def apply_parsed_resume(
    parse_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Apply parsed resume data to user profile and create occupation profiles
    """
    try:
        # Get parsed data
        parse_doc = await db.resume_parses.find_one({
            "parse_id": parse_id,
            "user_id": current_user["user_id"],
            "status": "pending_confirmation"
        })
        
        if not parse_doc:
            raise HTTPException(status_code=404, detail="Parsed resume not found or already applied")
        
        parsed_data = parse_doc["parsed_data"]
        user_id = current_user["user_id"]
        
        # Update workforce profile
        profile_updates = {}
        personal_info = parsed_data.get("personal_info", {})
        
        if personal_info.get("full_name"):
            profile_updates["full_name"] = personal_info["full_name"]
        if personal_info.get("phone"):
            profile_updates["phone"] = personal_info["phone"]
        
        if profile_updates:
            await db.workforce_profiles.update_one(
                {"user_id": user_id},
                {"$set": profile_updates}
            )
        
        # Create occupation profiles from work experience
        work_experience = parsed_data.get("work_experience", [])
        created_occupations = []
        
        for exp in work_experience:
            # Extract occupation category and title from position
            position_title = exp.get("position_title", "")
            
            # Create occupation profile
            occupation_id = f"occ_{user_id}_{int(datetime.utcnow().timestamp())}_{len(created_occupations)}"
            
            occupation_doc = {
                "occupation_id": occupation_id,
                "user_id": user_id,
                "occupation_title": position_title,
                "occupation_category": "General",  # User can update later
                "years_of_experience": 0,  # Calculate from dates if needed
                "skills": parsed_data.get("skills", []),
                "active": True,
                "created_date": datetime.utcnow().isoformat(),
                "updated_date": datetime.utcnow().isoformat(),
                "from_resume": True
            }
            
            await db.occupation_profiles.insert_one(occupation_doc)
            created_occupations.append(occupation_id)
            
            # Create employment history record
            employment_id = f"emp_{user_id}_{int(datetime.utcnow().timestamp())}_{len(created_occupations)}"
            
            employment_doc = {
                "employment_id": employment_id,
                "workforce_id": user_id,
                "occupation_id": occupation_id,
                "company_name": exp.get("company_name", ""),
                "position_title": position_title,
                "employment_type": "full_time" if exp.get("is_current") else "past",
                "start_date": exp.get("start_date", ""),
                "end_date": exp.get("end_date", "") if not exp.get("is_current") else None,
                "status": "active" if exp.get("is_current") else "terminated",
                "responsibilities": exp.get("responsibilities", []),
                "created_date": datetime.utcnow().isoformat(),
                "from_resume": True
            }
            
            await db.employment_history.insert_one(employment_doc)
        
        # Store certifications
        certifications = parsed_data.get("certifications", [])
        for cert in certifications:
            cert_id = f"cert_{user_id}_{int(datetime.utcnow().timestamp())}"
            
            cert_doc = {
                "credential_id": cert_id,
                "user_id": user_id,
                "credential_name": cert.get("name", ""),
                "credential_type": "certification",
                "institution_name": cert.get("issuer", ""),
                "issue_date": cert.get("date_obtained", ""),
                "status": "pending",  # User needs to upload verification
                "created_date": datetime.utcnow().isoformat(),
                "from_resume": True
            }
            
            await db.credentials.insert_one(cert_doc)
        
        # Mark parse as applied
        await db.resume_parses.update_one(
            {"parse_id": parse_id},
            {"$set": {
                "status": "applied",
                "applied_date": datetime.utcnow().isoformat()
            }}
        )
        
        return {
            "success": True,
            "data": {
                "profile_updated": len(profile_updates) > 0,
                "occupations_created": len(created_occupations),
                "certifications_added": len(certifications),
                "message": "Resume data successfully applied to your profile!"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Apply Resume Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to apply resume data: {str(e)}")
