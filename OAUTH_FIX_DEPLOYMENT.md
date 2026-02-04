# HRBank Production OAuth Fix - Deployment Instructions

## Critical Issue
OAuth (Google/LinkedIn) redirects back to login page after authentication.

## Root Cause
1. Session state not persisting between OAuth `/login` and `/callback` requests (due to multiple containers/reverse proxy)
2. Frontend callback handlers had race conditions with `navigate()` + `window.location.reload()`

## Fixes Applied

### Backend Fixes (`/app/backend/routes/auth.py`)
1. **State Parameter**: Now stores `user_type` in database via `oauth_states` collection (not just session)
2. **Better Logging**: Added detailed logging for debugging OAuth flow
3. **User Type Preservation**: Existing users keep their original `user_type` when logging in via OAuth
4. **Status Fields**: Sets both `status` and `profile_status` to `active` for OAuth users

### Frontend Fixes
1. **GoogleCallback.jsx**: Removed race condition - uses `window.location.href` for clean redirect
2. **LinkedInCallback.jsx**: Same fix - clean redirect without navigate/reload conflict
3. **LoginModal.jsx**: Fixed admin check to accept both `admin` and `super_admin` user types

## Deployment Steps

### Step 1: Update Production Environment Variables

**CRITICAL**: In your production backend `.env`, ensure:
```env
FRONTEND_URL=https://hrbank.ca
BACKEND_URL=https://hrbank.ca
GOOGLE_OAUTH_REDIRECT_URI=https://hrbank.ca/api/auth/google/callback
LINKEDIN_REDIRECT_URI=https://hrbank.ca/api/auth/linkedin/callback
```

### Step 2: Update Google Cloud Console
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add authorized redirect URI: `https://hrbank.ca/api/auth/google/callback`
4. Save changes

### Step 3: Update LinkedIn Developer Portal
1. Go to LinkedIn Developer Portal → Your App → Auth
2. Add authorized redirect URL: `https://hrbank.ca/api/auth/linkedin/callback`
3. Save changes

### Step 4: Rebuild and Deploy

**Backend:**
```powershell
cd C:\codebase
docker build -f Dockerfile.backend -t qnizami/hrbank-backend:latest .
docker push qnizami/hrbank-backend:latest
```

**Frontend:**
```powershell
docker build -f Dockerfile.frontend --build-arg REACT_APP_BACKEND_URL=https://hrbank.ca -t qnizami/hrbank-frontend:latest .
docker push qnizami/hrbank-frontend:latest
```

### Step 5: Deploy to Lightsail
```powershell
# Deploy backend
aws lightsail create-container-service-deployment --service-name hrbank-backend --containers '{"hrbank-backend":{"image":"qnizami/hrbank-backend:latest","ports":{"8001":"HTTP"},"environment":{"FRONTEND_URL":"https://hrbank.ca","BACKEND_URL":"https://hrbank.ca"}}}' --public-endpoint '{"containerName":"hrbank-backend","containerPort":8001}'

# Deploy frontend
aws lightsail create-container-service-deployment --service-name hrbank-frontend --containers '{"hrbank-frontend":{"image":"qnizami/hrbank-frontend:latest","ports":{"80":"HTTP"}}}' --public-endpoint '{"containerName":"hrbank-frontend","containerPort":80}'
```

## Verification

### Test Google OAuth:
1. Go to https://hrbank.ca
2. Click "Sign In" → "Continue with Google"
3. Complete Google authentication
4. Should redirect to `/workforce/dashboard` (not back to login)

### Test LinkedIn OAuth:
1. Go to https://hrbank.ca/workpassport
2. Click "Connect with LinkedIn"
3. Complete LinkedIn authentication  
4. Should redirect to `/workpassport/dashboard`

### Test Admin Login:
1. Go to https://hrbank.ca/admin/login
2. Use: qnizami@hrbank.ca / Tabaghnak@389103
3. Should redirect to `/admin/super-dashboard`

## Troubleshooting

### OAuth still bounces to login:
1. Check backend logs: `aws lightsail get-container-log --service-name hrbank-backend`
2. Look for `[Google OAuth]` or `[LinkedIn OAuth]` log entries
3. Verify `FRONTEND_URL` and `BACKEND_URL` are set correctly

### "Invalid state" error:
- The `oauth_states` collection is used to persist state. Check MongoDB for entries.
- Ensure both `/login` and `/callback` endpoints use same `BACKEND_URL`

### Token not stored:
- Check browser console for errors in callback page
- Verify tokens are being stored in `localStorage`
