# HR Bank - Subdomain & PWA Setup Guide

## Overview
This guide explains how to set up branded subdomains and Progressive Web Apps (PWAs) for HR Bank.

---

## 1. DNS Configuration (You need to do this)

### Main Domain
- **hrbank.ca** → Points to current landing page deployment

### Subdomains to Create:
1. **employer.hrbank.ca** → Employer portal (Orange branding)
2. **workforce.hrbank.ca** → Worker portal (Blue branding)  
3. **institution.hrbank.ca** → Institution portal (Purple branding)
4. **admin.hrbank.ca** → Admin portal

### DNS Records (Add these in your domain registrar):
```
Type: CNAME
Name: employer
Value: hrbank-app.preview.emergentagent.com
TTL: 300

Type: CNAME
Name: workforce
Value: hrbank-app.preview.emergentagent.com
TTL: 300

Type: CNAME
Name: institution
Value: hrbank-app.preview.emergentagent.com
TTL: 300

Type: CNAME
Name: admin
Value: hrbank-app.preview.emergentagent.com
TTL: 300
```

---

## 2. Environment Variables

### Add to `/app/frontend/.env`:
```bash
REACT_APP_EMPLOYER_URL=https://employer.hrbank.ca
REACT_APP_WORKFORCE_URL=https://workforce.hrbank.ca
REACT_APP_INSTITUTION_URL=https://institution.hrbank.ca
REACT_APP_ADMIN_URL=https://admin.hrbank.ca
```

---

## 3. PWA Icons Required

You need to create branded icons for each user type. Place them in `/app/frontend/public/icons/`

### Icon Specifications:
- **Format**: PNG with transparency
- **Sizes needed**: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

### File Naming:
**Employer (Orange #ff5f00):**
- employer-icon-72x72.png
- employer-icon-96x96.png
- employer-icon-128x128.png
- employer-icon-144x144.png
- employer-icon-152x152.png
- employer-icon-192x192.png
- employer-icon-384x384.png
- employer-icon-512x512.png

**Workforce (Blue #2563eb):**
- workforce-icon-72x72.png
- workforce-icon-96x96.png
- workforce-icon-128x128.png
- workforce-icon-144x144.png
- workforce-icon-152x152.png
- workforce-icon-192x192.png
- workforce-icon-384x384.png
- workforce-icon-512x512.png

**Institution (Purple #7c3aed):**
- institution-icon-72x72.png
- institution-icon-96x96.png
- institution-icon-128x128.png
- institution-icon-144x144.png
- institution-icon-152x152.png
- institution-icon-192x192.png
- institution-icon-384x384.png
- institution-icon-512x512.png

### How to Create Icons:
**Option 1: Hire Designer** (Recommended)
- Fiverr, Upwork, or 99designs
- Cost: $20-50
- Provide brand colors above

**Option 2: Use Icon Generator**
- https://www.pwabuilder.com/imageGenerator
- Upload a 512x512 base icon
- Generates all sizes automatically

**Option 3: Simple Colored Squares** (Quick solution)
- Create solid colored squares with your logo/text
- Use Canva or Photoshop
- Export in all required sizes

---

## 4. PWA Installation Guide for Users

### iPhone (Safari):
1. Open https://employer.hrbank.ca (or workforce/institution)
2. Tap Share button (bottom center)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in top right
5. Icon appears on home screen

### Android (Chrome):
1. Open https://employer.hrbank.ca (or workforce/institution)
2. Tap the menu button (three dots)
3. Tap "Add to Home screen"
4. Tap "Add"
5. Icon appears on home screen

### Desktop (Chrome/Edge):
1. Open https://employer.hrbank.ca
2. Click install icon in address bar (or menu > Install)
3. App opens in standalone window

---

## 5. User Type Locking

### How It Works:
- **employer.hrbank.ca** → Only allows employer login
- **workforce.hrbank.ca** → Only allows workforce login
- **institution.hrbank.ca** → Only allows institution login
- **admin.hrbank.ca** → Only allows admin login

### Implementation:
When user lands on subdomain:
1. Check hostname (employer.hrbank.ca)
2. Lock login form to that user type
3. Redirect to appropriate dashboard after login
4. If wrong user type tries to access, show error

---

## 6. Deployment Steps

### Step 1: Add Environment Variables
```bash
# In your deployment platform (Vercel, Netlify, etc.)
REACT_APP_EMPLOYER_URL=https://employer.hrbank.ca
REACT_APP_WORKFORCE_URL=https://workforce.hrbank.ca
REACT_APP_INSTITUTION_URL=https://institution.hrbank.ca
REACT_APP_ADMIN_URL=https://admin.hrbank.ca
```

### Step 2: Upload PWA Icons
Place all icons in `/app/frontend/public/icons/` folder

### Step 3: Register Service Worker
Already done - service-worker.js created

### Step 4: Add Manifest Link to HTML
The manifests are:
- `/manifest-employer.json`
- `/manifest-workforce.json`
- `/manifest-institution.json`

These will be dynamically loaded based on subdomain.

### Step 5: Deploy
```bash
cd /app/frontend
yarn build
# Deploy build folder to your hosting
```

### Step 6: Test PWA
1. Visit employer.hrbank.ca on mobile
2. Check browser prompts for "Add to Home Screen"
3. Install and test standalone mode
4. Verify branding (orange theme, correct icon)

---

## 7. Marketing Copy for Each Portal

### Employer Portal (employer.hrbank.ca)
**Tagline**: "Hire Verified Workers Instantly"
**Description**: "Post shifts, hire qualified workers, manage compliance - all in one platform"
**CTA**: "Post Your First Shift"

### Worker Portal (workforce.hrbank.ca)
**Tagline**: "Find Shifts, Get Paid Fast"
**Description**: "Browse shifts, track hours, earn money - casual employment made easy"
**CTA**: "Browse Available Shifts"

### Institution Portal (institution.hrbank.ca)
**Tagline**: "Connect Students with Careers"
**Description**: "Issue blockchain credentials, track graduates, partner with employers"
**CTA**: "Issue Your First Credential"

---

## 8. SEO & Meta Tags

Each subdomain should have unique meta tags:

### Employer:
```html
<title>HR Bank for Employers - Hire Verified Workers</title>
<meta name="description" content="Post shifts and hire qualified workers instantly. Compliance tools, verified credentials, and easy management.">
<meta name="theme-color" content="#ff5f00">
```

### Workforce:
```html
<title>HR Bank for Workers - Find Shifts, Get Paid</title>
<meta name="description" content="Find flexible shifts, track your hours, and get paid fast. Casual employment made simple.">
<meta name="theme-color" content="#2563eb">
```

### Institution:
```html
<title>HR Bank for Institutions - Connect Students with Careers</title>
<meta name="description" content="Issue blockchain credentials, track graduate success, partner with employers.">
<meta name="theme-color" content="#7c3aed">
```

---

## 9. Testing Checklist

- [ ] Main domain (hrbank.ca) loads landing page
- [ ] employer.hrbank.ca redirects to employer login
- [ ] workforce.hrbank.ca redirects to workforce login
- [ ] institution.hrbank.ca redirects to institution login
- [ ] admin.hrbank.ca redirects to admin login
- [ ] PWA install prompt appears on mobile
- [ ] Icons display correctly after installation
- [ ] App launches in standalone mode (no browser UI)
- [ ] Theme colors match (orange for employer, blue for workforce)
- [ ] User type is locked per subdomain
- [ ] Offline mode works (cached pages load)

---

## 10. Troubleshooting

### Icons not showing:
- Check file paths: `/app/frontend/public/icons/employer-icon-192x192.png`
- Clear browser cache
- Verify manifest.json is loading

### PWA install not prompting:
- Must be HTTPS
- Must have valid manifest
- Must have service worker registered
- Try clearing site data and reload

### Wrong subdomain redirects:
- Check DNS propagation (can take 24-48 hours)
- Verify CNAME records are correct
- Test with `nslookup employer.hrbank.ca`

---

## Next Steps

1. ✅ PWA manifests created
2. ✅ Service worker created
3. ✅ Landing page links updated
4. ⏳ You add DNS records
5. ⏳ You create/upload PWA icons
6. ⏳ Deploy with environment variables
7. ⏳ Test on mobile devices

**Questions? Issues? Let me know!**
