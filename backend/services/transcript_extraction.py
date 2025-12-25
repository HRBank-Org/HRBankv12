"""
Transcript Extraction Service
=============================
Uses Gemini AI to extract structured data from PDF academic transcripts.
Extracts: courses, grades, GPA, program, graduation date, institution name.
"""

import os
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class TranscriptExtractor:
    """
    AI-powered transcript data extraction service.
    Uses Gemini for PDF processing with file attachments.
    """
    
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
    
    async def extract_from_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """
        Extract structured transcript data from a PDF file.
        
        Args:
            pdf_path: Path to the PDF transcript file
            
        Returns:
            Dictionary containing extracted transcript data
        """
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        # Initialize chat with Gemini (required for file attachments)
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"transcript_extraction_{datetime.now().timestamp()}",
            system_message="""You are an expert academic transcript analyzer. 
Your job is to extract structured data from academic transcripts accurately.
Always respond with valid JSON only, no other text.
Be precise with grades, course codes, and GPA calculations."""
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Create file attachment
        pdf_file = FileContentWithMimeType(
            file_path=pdf_path,
            mime_type="application/pdf"
        )
        
        # Create extraction prompt
        extraction_prompt = """Analyze this academic transcript and extract the following information in JSON format:

{
    "institution": {
        "name": "Full institution name",
        "address": "Institution address if visible",
        "accreditation": "Any accreditation info if visible"
    },
    "student": {
        "name": "Student full name",
        "student_id": "Student ID number if visible",
        "date_of_birth": "DOB if visible (YYYY-MM-DD format)"
    },
    "program": {
        "name": "Degree/Program name (e.g., Bachelor of Science in Computer Science)",
        "degree_type": "Bachelor/Master/Associate/Certificate/Diploma",
        "major": "Major field of study",
        "minor": "Minor if any",
        "concentration": "Concentration/Specialization if any"
    },
    "academic_record": {
        "enrollment_date": "Start date (YYYY-MM-DD)",
        "graduation_date": "Graduation date (YYYY-MM-DD) or null if not graduated",
        "status": "Graduated/In Progress/Withdrawn",
        "cumulative_gpa": 0.0,
        "gpa_scale": 4.0,
        "total_credits_earned": 0,
        "total_credits_attempted": 0
    },
    "courses": [
        {
            "term": "Fall 2023",
            "course_code": "CS101",
            "course_name": "Introduction to Computer Science",
            "credits": 3,
            "grade": "A",
            "grade_points": 4.0,
            "status": "Completed"
        }
    ],
    "honors_awards": [
        {
            "name": "Dean's List",
            "term": "Fall 2023",
            "description": "Description if any"
        }
    ],
    "transfer_credits": [
        {
            "institution": "Source institution",
            "course_code": "MATH101",
            "course_name": "Calculus I",
            "credits": 3,
            "grade": "B+"
        }
    ],
    "extraction_confidence": 0.95,
    "extraction_notes": "Any notes about unclear or missing data"
}

Extract ALL courses visible on the transcript.
If a field is not visible, use null or empty array.
Calculate cumulative_gpa if not shown but individual grades are available.
Respond ONLY with the JSON object, no other text."""

        # Send message with PDF attachment
        user_message = UserMessage(
            text=extraction_prompt,
            file_contents=[pdf_file]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            # Clean response - remove markdown code blocks if present
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            
            extracted_data = json.loads(cleaned_response.strip())
            extracted_data["extraction_timestamp"] = datetime.utcnow().isoformat()
            extracted_data["source_file"] = os.path.basename(pdf_path)
            
            return {
                "success": True,
                "data": extracted_data
            }
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Failed to parse AI response as JSON: {str(e)}",
                "raw_response": response
            }
    
    async def extract_from_text(self, transcript_text: str) -> Dict[str, Any]:
        """
        Extract structured transcript data from text content.
        Useful when PDF text has already been extracted.
        
        Args:
            transcript_text: Plain text content of transcript
            
        Returns:
            Dictionary containing extracted transcript data
        """
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"transcript_text_{datetime.now().timestamp()}",
            system_message="You are an expert academic transcript analyzer. Extract structured data accurately. Respond only with valid JSON."
        ).with_model("openai", "gpt-5.1")
        
        extraction_prompt = f"""Analyze this academic transcript text and extract structured data in JSON format.

TRANSCRIPT TEXT:
{transcript_text}

Extract into this JSON structure:
{{
    "institution": {{"name": "", "address": ""}},
    "student": {{"name": "", "student_id": ""}},
    "program": {{"name": "", "degree_type": "", "major": ""}},
    "academic_record": {{"cumulative_gpa": 0.0, "total_credits_earned": 0, "graduation_date": null}},
    "courses": [{{"term": "", "course_code": "", "course_name": "", "credits": 0, "grade": "", "grade_points": 0.0}}],
    "extraction_confidence": 0.0
}}

Respond ONLY with the JSON object."""

        user_message = UserMessage(text=extraction_prompt)
        response = await chat.send_message(user_message)
        
        try:
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("```")[1]
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
            
            extracted_data = json.loads(cleaned.strip())
            extracted_data["extraction_timestamp"] = datetime.utcnow().isoformat()
            
            return {"success": True, "data": extracted_data}
        except json.JSONDecodeError as e:
            return {"success": False, "error": str(e), "raw_response": response}


# Utility functions for transcript verification
def calculate_gpa(courses: List[Dict]) -> float:
    """Calculate GPA from course list."""
    total_points = 0
    total_credits = 0
    
    for course in courses:
        credits = course.get("credits", 0)
        grade_points = course.get("grade_points", 0)
        if credits > 0 and grade_points is not None:
            total_points += credits * grade_points
            total_credits += credits
    
    return round(total_points / total_credits, 2) if total_credits > 0 else 0.0


def validate_transcript_data(data: Dict) -> Dict[str, Any]:
    """Validate extracted transcript data for completeness."""
    required_fields = ["institution", "student", "program", "academic_record", "courses"]
    missing_fields = []
    warnings = []
    
    for field in required_fields:
        if field not in data or not data[field]:
            missing_fields.append(field)
    
    # Check institution
    if data.get("institution") and not data["institution"].get("name"):
        warnings.append("Institution name is missing")
    
    # Check student
    if data.get("student") and not data["student"].get("name"):
        warnings.append("Student name is missing")
    
    # Check courses
    if data.get("courses") and len(data["courses"]) == 0:
        warnings.append("No courses found in transcript")
    
    # Verify GPA calculation
    if data.get("courses") and data.get("academic_record"):
        calculated_gpa = calculate_gpa(data["courses"])
        reported_gpa = data["academic_record"].get("cumulative_gpa", 0)
        if abs(calculated_gpa - reported_gpa) > 0.1:
            warnings.append(f"GPA mismatch: calculated {calculated_gpa}, reported {reported_gpa}")
    
    return {
        "is_valid": len(missing_fields) == 0,
        "missing_fields": missing_fields,
        "warnings": warnings,
        "completeness_score": (len(required_fields) - len(missing_fields)) / len(required_fields)
    }
