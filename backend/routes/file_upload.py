from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from auth.dependencies import get_db, get_current_user
import os
import uuid
from pathlib import Path
from typing import Dict
import shutil
import magic

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("/app/backend/uploads/profile_photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed image extensions and MIME types
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return Path(filename).suffix.lower()

def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return get_file_extension(filename) in ALLOWED_EXTENSIONS

def validate_mime_type(file_bytes: bytes) -> bool:
    """Validate actual file content MIME type (not just extension)"""
    try:
        mime = magic.from_buffer(file_bytes[:2048], mime=True)
        return mime in ALLOWED_MIME_TYPES
    except Exception:
        return False

@router.post("/upload-profile-photo", response_model=Dict)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Upload and save profile photo
    Returns the URL to access the photo
    """
    
    # Validate file extension
    if not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size: 5MB"
        )
    
    # Validate actual MIME type (prevents extension spoofing)
    if not validate_mime_type(contents):
        raise HTTPException(
            status_code=400,
            detail="File content does not match an allowed image type. Upload a real image file."
        )
    
    # Reset file pointer
    await file.seek(0)
    
    # Generate unique filename
    file_ext = get_file_extension(file.filename)
    unique_filename = f"{current_user['user_id']}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Generate URL (this will be served by the backend)
        photo_url = f"/api/uploads/profile_photos/{unique_filename}"
        
        # Update user profile with photo URL
        user_type = current_user["user_type"]
        collection_name = f"{user_type}_profiles"
        
        await db[collection_name].update_one(
            {f"{user_type}_id": current_user["user_id"]},
            {"$set": {"profile_photo_url": photo_url}}
        )
        
        return {
            "success": True,
            "message": "Photo uploaded successfully",
            "photo_url": photo_url
        }
    
    except Exception as e:
        # Clean up file if something went wrong
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload photo: {str(e)}"
        )

@router.post("/files/upload", response_model=Dict)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Generic file upload endpoint for logos, documents, etc.
    Returns the URL to access the file
    """
    
    # Validate file type
    if not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size: 5MB"
        )
    
    # Reset file pointer
    await file.seek(0)
    
    # Generate unique filename
    file_ext = get_file_extension(file.filename)
    unique_filename = f"{current_user['user_id']}_{uuid.uuid4().hex[:8]}{file_ext}"
    
    # Create logos directory if needed
    logos_dir = Path("/app/backend/uploads/logos")
    logos_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = logos_dir / unique_filename
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Generate URL (this will be served by the backend)
        file_url = f"/api/uploads/logos/{unique_filename}"
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "data": {
                "file_url": file_url
            }
        }
    
    except Exception as e:
        # Clean up file if something went wrong
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )

@router.delete("/delete-profile-photo", response_model=Dict)
async def delete_profile_photo(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Delete current profile photo
    """
    user_type = current_user["user_type"]
    collection_name = f"{user_type}_profiles"
    
    # Get current profile
    profile = await db[collection_name].find_one(
        {f"{user_type}_id": current_user["user_id"]}
    )
    
    if not profile or not profile.get("profile_photo_url"):
        raise HTTPException(
            status_code=404,
            detail="No profile photo to delete"
        )
    
    # Extract filename from URL
    photo_url = profile["profile_photo_url"]
    if photo_url.startswith("/api/uploads/profile_photos/"):
        filename = photo_url.split("/")[-1]
        file_path = UPLOAD_DIR / filename
        
        # Delete file if it exists
        if file_path.exists():
            file_path.unlink()
    
    # Remove photo URL from database
    await db[collection_name].update_one(
        {f"{user_type}_id": current_user["user_id"]},
        {"$set": {"profile_photo_url": None}}
    )
    
    return {
        "success": True,
        "message": "Photo deleted successfully"
    }
