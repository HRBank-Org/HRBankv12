# HRBank Deployment Instructions

## Summary of Fixes Ready for Deployment

### 1. Super Admin Login Fix (Frontend)
- **File:** `frontend/src/components/auth/LoginModal.jsx` (line 108)
- **Fix:** Now accepts both `'admin'` and `'super_admin'` user types

### 2. OAuth Fixes (Backend)
- **File:** `backend/routes/auth.py` 
  - Google OAuth uses `BACKEND_URL` env var for redirect
  - Uses session to pass `user_type` instead of query params
  - Sets `profile_status: active` for OAuth users
  
- **File:** `backend/routes/linkedin.py`
  - Sets `profile_status: active` and `email_verified: true` for LinkedIn users

### 3. Signup/Login Flow Fixes (Backend)
- **File:** `backend/routes/auth.py`
  - Password reset now sets `email_verified: true`
  - Proper profile_status flow for WorkPassport vs Workforce users

---

## Step-by-Step Deployment

### STEP 1: Update Your Local Files

Copy the following files from this environment to your local `C:\codebase` directory:

#### File 1: `frontend/src/components/auth/LoginModal.jsx`
Replace line 108 (the admin check) with:
```javascript
      // Admin access check - allow both 'admin' and 'super_admin' user types
      if (userType === 'admin' && user_type !== 'admin' && user_type !== 'super_admin') {
        setError('Access denied. Admin credentials required.');
        setLoading(false);
        return;
      }
```

#### File 2: `backend/routes/auth.py` 
Copy the entire file from this environment.

#### File 3: `backend/routes/linkedin.py`
Copy the entire file from this environment.

---

### STEP 2: Update Production Environment Variables

In your production `backend/.env` file, ensure these are set for `hrbank.ca`:

```env
FRONTEND_URL=https://hrbank.ca
BACKEND_URL=https://hrbank.ca
GOOGLE_OAUTH_REDIRECT_URI=https://hrbank.ca/api/auth/google/callback
LINKEDIN_REDIRECT_URI=https://hrbank.ca/api/auth/linkedin/callback
```

---

### STEP 3: Rebuild and Deploy Backend

Open PowerShell in your `C:\codebase` directory:

```powershell
# Navigate to project root
cd C:\codebase

# Build backend image
docker build -f Dockerfile.backend -t qnizami/hrbank-backend:latest .

# Push to Docker Hub
docker push qnizami/hrbank-backend:latest

# Deploy to Lightsail (run from AWS CLI or Lightsail console)
aws lightsail create-container-service-deployment `
  --service-name hrbank-backend `
  --containers '{\"hrbank-backend\":{\"image\":\"qnizami/hrbank-backend:latest\",\"ports\":{\"8001\":\"HTTP\"}}}' `
  --public-endpoint '{\"containerName\":\"hrbank-backend\",\"containerPort\":8001}'
```

---

### STEP 4: Rebuild and Deploy Frontend

```powershell
# Build frontend image with production URL
docker build -f Dockerfile.frontend --build-arg REACT_APP_BACKEND_URL=https://hrbank.ca -t qnizami/hrbank-frontend:latest .

# Push to Docker Hub
docker push qnizami/hrbank-frontend:latest

# Deploy to Lightsail
aws lightsail create-container-service-deployment `
  --service-name hrbank-frontend `
  --containers '{\"hrbank-frontend\":{\"image\":\"qnizami/hrbank-frontend:latest\",\"ports\":{\"80\":\"HTTP\"}}}' `
  --public-endpoint '{\"containerName\":\"hrbank-frontend\",\"containerPort\":80}'
```

---

### STEP 5: Verify Deployment

1. **Check Backend Health:**
   ```
   curl https://hrbank.ca/api/health
   ```

2. **Test Super Admin Login:**
   - Go to: https://hrbank.ca/admin/login
   - Email: qnizami@hrbank.ca
   - Password: Tabaghnak@389103

3. **Test Google OAuth:**
   - Go to: https://hrbank.ca
   - Click "Sign In" then "Continue with Google"
   - Should redirect to dashboard after Google auth

4. **Test LinkedIn OAuth:**
   - Go to: https://hrbank.ca/workpassport
   - Click "Connect with LinkedIn"
   - Should redirect to WorkPassport dashboard after LinkedIn auth

---

## Troubleshooting

### OAuth Redirect Issues
If Google/LinkedIn auth redirects to wrong URL:
1. Check `FRONTEND_URL` and `BACKEND_URL` in backend `.env`
2. Verify Google OAuth redirect URI in Google Cloud Console matches `https://hrbank.ca/api/auth/google/callback`
3. Verify LinkedIn redirect URI matches `https://hrbank.ca/api/auth/linkedin/callback`

### Admin Login "Access Denied"
- Ensure `LoginModal.jsx` has the fix for `super_admin` user type
- Verify the super admin user in MongoDB has `user_type: "super_admin"`

### Container Won't Start
Check logs:
```powershell
aws lightsail get-container-log --service-name hrbank-backend --container-name hrbank-backend
```
