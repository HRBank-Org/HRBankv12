# HR Bank Mobile Apps - Phase 1 Technical Specification

**Document Version:** 1.0  
**Created:** Phase 1 Analysis  
**Platform:** React Native (iOS + Android)  
**Target Apps:** Workforce Mobile App & Employer Mobile App

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Existing Web Features Analysis](#existing-web-features-analysis)
3. [Backend API Inventory](#backend-api-inventory)
4. [Authentication & Data Sync Strategy](#authentication--data-sync-strategy)
5. [Emma AI Mobile Integration](#emma-ai-mobile-integration)
6. [Real-Time Features & Attendance](#real-time-features--attendance)
7. [Current Mobile App Status](#current-mobile-app-status)
8. [Technical Architecture](#technical-architecture)
9. [Development Roadmap](#development-roadmap)
10. [Risk Assessment & Mitigation](#risk-assessment--mitigation)

---

## 1. Executive Summary

### Project Overview
Development of two full-featured React Native mobile applications for HR Bank's workforce management platform:
- **Workforce Mobile App**: For workers to browse jobs, manage shifts, clock in/out, and track earnings
- **Employer Mobile App**: For employers to post jobs, manage shifts, track workforce, and approve timesheets

### Key Requirements
✅ **Platform**: React Native with Expo (single codebase for iOS & Android)  
✅ **Authentication**: Shared credentials with web platform (JWT-based)  
✅ **Real-time Sync**: Required for attendance/clock-in functionality  
✅ **Feature Parity**: All web features must be available on mobile  
✅ **Emma AI**: AI assistant available on mobile apps  

### Current Status
- ⚠️ **Partial Implementation Found**: A `/workforce-mobile` directory exists with basic structure but appears incomplete
- ✅ **Backend APIs**: All required backend APIs are fully implemented and tested
- ✅ **Authentication System**: JWT-based auth ready for mobile integration
- ✅ **Real-time Infrastructure**: Attendance and clock-in/out APIs ready

---

## 2. Existing Web Features Analysis

### 2.1 Workforce Web Portal Features

#### 🏠 **Dashboard**
- **Quick Actions**: My Profiles, My Calendar, Find Work
- **Main Tabs**: Financial, My Shifts, Career Growth
- **Stats Display**: Earnings, hours worked, pending payments, upcoming shifts
- **Time-based Greeting**: Good morning/afternoon/evening with user name

#### 👤 **Profile Management**
- **Personal Info**: Full name, phone, email, address management
- **Profile Photo**: Upload and display profile picture
- **Skills Management**: Add/edit skills (inline editing with comma-separated values)
- **Occupation Profiles**: 
  - Multiple occupation profiles support
  - Resume-style cards with gradient headers
  - Years of experience, hours worked, rating display
  - Work experience section with employment history
  - Certifications with status badges (Pending/Verified/Rejected)
  - Employment history tracking

#### 📄 **Documents**
- **Document Types**: ID, Work Permit, SIN, Certifications, Resume
- **Upload Functionality**: Multi-file upload support
- **Document Status**: Pending, Verified, Rejected with color-coded badges
- **Document Management**: View, download, delete uploaded documents

#### 🤖 **Emma AI Assistant**
- **Floating Chat Widget**: Always accessible from bottom-right corner
- **Onboarding Guidance**: Step-by-step profile completion assistance
- **Resume Parsing**: AI-powered resume upload and data extraction
- **Progress Tracking**: Visual progress bar for profile completion
- **Chat History**: Persistent conversation history
- **File Upload**: PDF, Word, and image support for resume parsing

#### 💼 **Job Matching & Applications**
- **Browse Matched Jobs**: AI-powered job matching with score percentages
  - Match score breakdown: Distance (35%), Availability (35%), Certs (20%), Skills (10%)
  - Distance display in kilometers
  - Hourly rate and shift duration
  - Company name and position title
  - Key tasks and required skills
- **Job Offers**: 
  - View pending offers with expiration countdown
  - Accept/Reject functionality
  - Offer details: pay rate, start date, employment duration
- **Interview Invitations**:
  - View scheduled interviews
  - Date, time, and location details
  - Join video call button
- **Employment Status**: Current job display or available status banner
- **Quit Job**: Functionality to end current employment with reason

#### 📅 **Calendar & Availability**
- **Availability Calendar**: 
  - React Big Calendar integration (week view)
  - Click-and-drag to create availability blocks
  - Time-specific events (30-minute increments)
  - Recurring events: Daily, Weekly, Biweekly patterns
  - Color-coded: Green (Available), Red (Blackout)
  - Delete availability blocks
  - Conflict detection with accepted shifts
- **My Shifts**: 
  - View upcoming scheduled shifts
  - Shift details: workplace, date, time, position, pay rate
  - Shift status tracking
  - Confirmation functionality

#### ⏰ **Attendance & Time Tracking**
- **Clock In/Out**:
  - QR code scanning for shift attendance
  - Geolocation verification
  - Clock-in validation (15 minutes before shift start allowed)
  - Clock-out with worked hours calculation
  - Break time tracking
- **My Timesheets**:
  - View all timesheets (pending, approved, paid)
  - Timesheet details: date, hours worked, pay rate, total earnings
  - Status badges
  - Filter by date range

#### 💰 **Financial**
- **Earnings Dashboard**:
  - Total earnings to date
  - Current pay period earnings
  - Pending payments
  - Payment history
- **Charts & Analytics**:
  - Weekly/monthly earnings charts
  - Hours worked trends
  - Top-earning occupations

#### 🏆 **Career Growth**
- **Occupation Profiles**: Resume-style display
- **Skills Tracking**: Skills inventory with inline editing
- **Certifications**: Status tracking and verification
- **AI Recommendations**: Career advancement suggestions
- **Performance Metrics**: Rating display, completed shifts, total hours

#### 📨 **Messaging**
- **Thread Management**: View all conversation threads
- **Direct Messaging**: Chat with employers about shifts/bookings
- **Message Notifications**: Unread message badges

#### 🔔 **Notifications**
- **Real-time Notifications**: Job offers, interview invitations, shift updates
- **Notification Center**: View all notifications with read/unread status
- **Mark as Read**: Individual or bulk mark as read
- **Action Buttons**: Direct links to relevant pages

#### ⚙️ **Settings**
- **Profile Settings**: Update personal information
- **Notification Preferences**: Configure notification types
- **Privacy Settings**: Data sharing preferences
- **Account Management**: Change password, logout

#### 📋 **Compliance & Onboarding**
- **EULA Acceptance**: Full-screen modal with scroll-to-accept
- **Worker Compliance**: Casual employment acknowledgment, T4 classification
- **Document Collection**: ID, SIN, work permits
- **Profile Completion Tracking**: Progress percentage

---

### 2.2 Employer Web Portal Features

#### 🏠 **Dashboard**
- **Quick Actions**: Workplaces, Schedule, Find Workers, My Workers
- **Main Tabs**: Schedule, Workforce, Financial
- **Stats Display**: Active workers, total shifts, upcoming shifts, workplace count
- **Getting Started Guide**: Onboarding checklist for new employers
- **Employer Rating**: Display average rating from workers

#### 🏢 **Workplace Management**
- **Create Workplaces**:
  - Workplace name and address
  - Industry/business type
  - Operating hours
  - Contact information
- **Edit Workplaces**: Update workplace details
- **View Workplaces**: List all workplaces with quick stats
- **Workplace Detail**: 
  - Address and contact info
  - Active shifts count
  - Workers assigned
  - Shift history

#### 📅 **Shift Scheduling**
- **Shift Calendar**:
  - React Big Calendar integration (week view)
  - Click-and-drag to create shifts
  - Time-specific shifts (30-minute increments)
  - Recurring shifts: Daily, Weekly, Biweekly patterns
  - Workplace filter dropdown
  - Color-coded by workplace
  - Edit/Delete shifts (with booking validation)
- **Create Shift**:
  - Workplace selection
  - Position title
  - Date and time (start/end)
  - Number of positions needed
  - Shift description/tasks
  - Recurring shift options
- **Shift Detail**:
  - Shift information display
  - View assigned workers
  - Worker check-in status
  - Generate QR code for attendance
  - Invite workers to shift

#### 💼 **Job Posting & Matching**
- **Post New Job**:
  - Workplace selection dropdown
  - Position title
  - Pay per hour (minimum $17.60 CAD - Ontario minimum wage)
  - Shift duration
  - Employment duration
  - Start date
  - Key tasks (textarea)
  - Required skills (multi-select from standardized list)
  - Required certifications (multi-select from standardized list)
  - Max distance for matching (default 25km)
  - Positions available
- **Active Jobs**:
  - View all posted jobs
  - Job details with candidate counts
  - Edit/Close job postings
- **Ranked Candidates**:
  - AI-matched candidates with scores
  - Candidate profile display:
    - Photo/initials
    - Name and occupations
    - Distance from workplace
    - Rating and hours worked
    - Match score percentage
    - Skill/certification/distance breakdowns
    - Matched skills highlighted
  - Send interview invitation
  - Send direct job offer
  - Interview invitation form: date, time, notes
  - Offer form: pay rate, start date

#### 👥 **Workforce Management**
- **Active Workers Tab**:
  - Worker cards with performance metrics
  - Shifts completed, hours worked
  - Current position and employment date
  - Worker ratings
  - Contact information
  - Terminate employment button
- **Inactive Workers Tab**:
  - Past workers with employment history
  - Termination reason display
  - Rehire eligibility status
  - Rehire functionality
- **Terminate Employment Modal**:
  - Termination reason selection (laid off, contract ended, terminated, resigned)
  - Last working day
  - Notes field
  - Options: Cancel future shifts, Rehire eligibility, Notify worker
- **Rehire Modal**:
  - Employment type selection
  - Position title
  - Start date

#### ⏰ **Attendance & Timesheets**
- **Generate QR Codes**: For shift attendance tracking
- **Shift Attendance View**:
  - Real-time worker check-in status
  - Clock-in/clock-out times
  - Workers present/absent
  - Late arrivals tracking
- **Timesheet Management**:
  - View all worker timesheets
  - Filter by status (pending, approved, rejected)
  - Filter by date range
  - Filter by worker
  - Approve/Reject timesheets
  - Bulk approve functionality
  - Timesheet details: worker name, date, hours, breaks, total pay

#### 💰 **Financial & Payroll**
- **Payroll Overview**:
  - Current pay period summary
  - Total payroll amount
  - Number of workers to be paid
  - Payment status
- **Payment History**:
  - Past payments with date and amount
  - Filter by pay period
  - Download payment reports
- **Compliance Calculations**:
  - Vacation pay (4% in Ontario)
  - Overtime calculation (1.5x after 44 hours/week)
  - ESA compliance tracking

#### 📨 **Messaging & Communication**
- **Thread Management**: View all conversations with workers
- **Direct Messaging**: Chat with workers about shifts/bookings
- **Broadcast Messages**: Send announcements to all workers or workplace-specific
- **Message Notifications**: Unread message badges

#### 🔔 **Notifications**
- **Real-time Notifications**: Job applications, shift acceptances, clock-ins
- **Notification Center**: View all notifications
- **Action Buttons**: Direct links to relevant pages

#### 📄 **Documents & Compliance**
- **Document Upload**: Business registration, WSIB coverage
- **Document Verification Status**: Pending, Verified, Rejected
- **Compliance Status**: Ontario employment standards compliance tracking

#### ⭐ **Worker Ratings**
- **Rate Workers**: After shift completion
- **Rating Criteria**: Performance, reliability, professionalism
- **Rating History**: View past ratings given

#### 🔗 **Worker Invitations**
- **Invite to Shift**: Send email invitations to external workers
- **Invite to Job**: Invite workers to apply for posted jobs
- **Invitation Management**: Track sent invitations and acceptance status

#### 📊 **Reports & Analytics**
- **Schedule Analytics**: Shift coverage, vacancy rates
- **Workforce Analytics**: Worker performance, attendance rates, top performers
- **Financial Reports**: Payroll summaries, earnings by workplace

#### ⚙️ **Settings**
- **Company Profile**: Update company information
- **Notification Preferences**: Configure notification types
- **Account Management**: Change password, logout

#### 📋 **Employer Onboarding**
- **EULA Acceptance**: Full-screen modal with scroll-to-accept
- **Compliance Onboarding**: Worker classification, WSIB acknowledgment
- **Getting Started Guide**: Step-by-step setup wizard

---

## 3. Backend API Inventory

### 3.1 Authentication APIs
**Base Path**: `/api/auth`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| POST | `/signup` | Create new user account | Critical |
| POST | `/login` | Login with email/password | Critical |
| GET | `/verify-email` | Email verification callback | High |
| POST | `/logout` | Logout user | High |
| POST | `/change-password` | Change user password | Medium |
| GET | `/google/status` | Google OAuth status | Low |
| GET | `/google/login` | Google OAuth login | Low |
| GET | `/google/callback` | Google OAuth callback | Low |

### 3.2 User Profile APIs
**Base Path**: `/api/users`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/me` | Get current user profile | Critical |
| GET | `/{user_id}` | Get user by ID | Medium |

**Base Path**: `/api/workforce`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/me/profile` | Get workforce profile | Critical |
| PATCH | `/me/profile/personal-info` | Update personal info | High |
| PATCH | `/me/profile/skills` | Update skills | High |
| PATCH | `/me/profile/availability` | Update availability | High |
| GET | `/skills/common` | Get common skills list | Medium |

### 3.3 Emma AI APIs
**Base Path**: `/api/emma`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/conversation` | Get conversation history | Critical |
| POST | `/chat` | Send message to Emma | Critical |
| POST | `/parse-resume` | Upload and parse resume | High |
| POST | `/approve-resume-data` | Approve parsed data | High |
| GET | `/onboarding-status` | Get onboarding progress | Medium |

### 3.4 Job Matching APIs
**Base Path**: `/api/jobs`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| POST | `/post` | Post new job (Employer) | Critical |
| GET | `/posted` | Get posted jobs (Employer) | Critical |
| GET | `/{job_id}/candidates` | View ranked candidates (Employer) | Critical |
| GET | `/matched` | Browse matched jobs (Workforce) | Critical |
| POST | `/{job_id}/apply` | Apply to job (Workforce) | Critical |
| GET | `/offers` | View job offers (Workforce) | Critical |
| POST | `/offers/{offer_id}/accept` | Accept offer (Workforce) | Critical |
| POST | `/offers/{offer_id}/decline` | Decline offer (Workforce) | Critical |
| GET | `/interviews` | View interviews (Workforce) | High |
| POST | `/interviews/send` | Send interview invite (Employer) | High |
| POST | `/offers/send` | Send job offer (Employer) | High |
| POST | `/employment/quit` | Quit current job (Workforce) | High |
| GET | `/employment/status` | Check employment status (Workforce) | High |
| GET | `/my-shifts` | Get my shifts (Workforce) | Critical |

### 3.5 Attendance & Time Tracking APIs
**Base Path**: `/api/attendance`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| POST | `/shifts/{shift_id}/qr-code` | Generate QR code (Employer) | Critical |
| POST | `/clock-in` | Clock in to shift (Workforce) | Critical |
| POST | `/clock-out` | Clock out from shift (Workforce) | Critical |
| GET | `/booking/{booking_id}/status` | Get attendance status | Critical |
| GET | `/shift/{shift_id}/workers` | Get shift workers (Employer) | High |
| GET | `/my-timesheets` | Get worker timesheets (Workforce) | Critical |
| GET | `/employer/timesheets` | Get all timesheets (Employer) | Critical |
| POST | `/timesheets/{timesheet_id}/approve` | Approve timesheet (Employer) | High |

### 3.6 Calendar & Scheduling APIs
**Base Path**: `/api`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/workforce/availability/calendar` | Get availability events (Workforce) | Critical |
| POST | `/workforce/availability/calendar` | Create availability (Workforce) | Critical |
| DELETE | `/workforce/availability/calendar/{event_id}` | Delete availability (Workforce) | High |
| GET | `/employer/shifts/calendar` | Get shift calendar (Employer) | Critical |
| POST | `/employer/shifts/calendar` | Create shift (Employer) | Critical |
| PUT | `/employer/shifts/calendar/{shift_id}` | Update shift (Employer) | High |
| DELETE | `/employer/shifts/calendar/{shift_id}` | Delete shift (Employer) | High |

### 3.7 Occupation Profile APIs
**Base Path**: `/api/occupations`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/me` | Get my occupation profiles | Critical |
| POST | `` | Create occupation profile | High |
| PATCH | `/{occupation_id}` | Update occupation profile | High |
| DELETE | `/{occupation_id}` | Delete occupation profile | Medium |
| GET | `/categories` | Get occupation categories | Medium |

### 3.8 Credentials & Certifications APIs
**Base Path**: `/api/credentials`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/types` | Get credential types | High |
| POST | `` | Add credential | High |
| GET | `/me` | Get my credentials | High |
| GET | `/me/expiring` | Get expiring credentials | Medium |
| POST | `/documents/upload` | Upload credential document | High |

**Base Path**: `/api/admin/certifications`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/list` | Get certifications list | High |
| GET | `/flat-list` | Get flat certifications list | High |
| GET | `/search` | Search certifications | Medium |

### 3.9 Document Management APIs
**Base Path**: `/api/documents`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/types` | Get document types | High |
| GET | `/my-documents` | Get my documents | High |
| POST | `/upload` | Upload document | Critical |
| DELETE | `/{document_id}` | Delete document | Medium |

### 3.10 Workplace Management APIs (Employer)
**Base Path**: `/api/employer`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/workplaces` | Get all workplaces | Critical |
| POST | `/workplaces` | Create workplace | High |
| GET | `/workplaces/{workplace_id}` | Get workplace details | High |
| PUT | `/workplaces/{workplace_id}` | Update workplace | Medium |
| DELETE | `/workplaces/{workplace_id}` | Delete workplace | Low |

### 3.11 Workforce Management APIs (Employer)
**Base Path**: `/api/employer/workforce-management`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/active` | Get active workers | Critical |
| GET | `/inactive` | Get inactive workers | High |
| GET | `/{workforce_id}/details` | Get worker details | High |
| POST | `/{workforce_id}/terminate` | Terminate employment | High |
| POST | `/{workforce_id}/rehire` | Rehire worker | Medium |

**Base Path**: `/api/workforce/workforce-management`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/my-employment-history` | Get employment history (Workforce) | High |

### 3.12 Messaging APIs
**Base Path**: `/api/messaging`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/threads` | Get message threads | Critical |
| GET | `/threads/{thread_id}/messages` | Get thread messages | Critical |
| POST | `/threads/{thread_id}/send` | Send message | Critical |
| POST | `/bookings/{booking_id}/create-thread` | Create thread | High |

### 3.13 Notifications APIs
**Base Path**: `/api/notifications`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/my-notifications` | Get notifications | Critical |
| POST | `/notifications/{notification_id}/read` | Mark as read | High |
| POST | `/mark-all-read` | Mark all as read | Medium |

### 3.14 Ratings APIs
**Base Path**: `/api/ratings`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| POST | `/workforce/{booking_id}` | Rate workforce | High |
| POST | `/employer/{booking_id}` | Rate employer | High |
| GET | `/pending` | Get pending ratings | Medium |

### 3.15 Financial & Payment APIs
**Base Path**: `/api/payments`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/my-earnings` | Get earnings (Workforce) | Critical |
| POST | `/timesheets/{timesheet_id}/pay` | Process payment (Employer) | High |

**Base Path**: `/api/payroll`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| POST | `/periods/generate` | Generate pay period | Medium |
| GET | `/periods` | Get pay periods | High |
| GET | `/periods/{period_id}` | Get period details | Medium |
| GET | `/dashboard/stats` | Get payroll stats | Medium |

### 3.16 Compliance & EULA APIs
**Base Path**: `/api/eula`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/check` | Check EULA acceptance | Critical |
| POST | `/accept` | Accept EULA | Critical |
| GET | `/history` | Get acceptance history | Low |

**Base Path**: `/api/compliance`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| GET | `/worker/legal-texts` | Get worker legal texts | High |
| POST | `/worker/acknowledge-casual-employment` | Acknowledge employment | High |
| POST | `/worker/acknowledge-terms` | Acknowledge terms | High |
| GET | `/worker/status` | Get compliance status | Medium |
| GET | `/employer/legal-texts` | Get employer legal texts | High |
| POST | `/employer/confirm-classification` | Confirm classification | High |
| POST | `/employer/acknowledge-terms` | Acknowledge terms | High |
| GET | `/employer/status` | Get compliance status | Medium |

### 3.17 Invitations APIs
**Base Path**: `/api/invites`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| POST | `/employer/shifts/{shift_id}/invite` | Invite to shift | High |
| POST | `/employer/jobs/{job_id}/invite` | Invite to job | High |
| GET | `/{invite_token}/details` | Get invitation details | Medium |
| POST | `/{invite_token}/accept` | Accept invitation | Medium |

### 3.18 File Upload APIs
**Base Path**: `/api/file-upload`

| Method | Endpoint | Description | Mobile Priority |
|--------|----------|-------------|-----------------|
| POST | `/upload` | Generic file upload | High |

---

## 4. Authentication & Data Sync Strategy

### 4.1 Current Web Authentication System

#### JWT-Based Authentication
```
Login Flow:
1. User submits email + password
2. Backend validates credentials
3. Backend returns:
   - access_token (JWT)
   - refresh_token (JWT)
   - user data (user_id, email, user_type, profile_status)
4. Frontend stores tokens in localStorage/state
5. All API requests include: Authorization: Bearer {access_token}
```

#### User Types
- **workforce**: Workers/employees
- **employer**: Companies/employers
- **institution**: Educational/certification institutions
- **admin**: Platform administrators

#### Token Structure
```javascript
{
  "user_id": "usr_abc123",
  "email": "user@example.com",
  "user_type": "workforce",
  "exp": 1234567890  // Expiration timestamp
}
```

### 4.2 Mobile Authentication Implementation

#### AsyncStorage Token Management
```javascript
// After successful login
await AsyncStorage.multiSet([
  ['@auth_token', response.data.access_token],
  ['@refresh_token', response.data.refresh_token],
  ['@user_data', JSON.stringify(response.data.user)]
]);

// API interceptor
axios.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

#### Automatic Token Refresh
```javascript
// When API returns 401
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const refreshToken = await AsyncStorage.getItem('@refresh_token');
      // Attempt token refresh
      // If refresh fails, redirect to login
    }
    return Promise.reject(error);
  }
);
```

### 4.3 Real-Time Data Sync Strategy

#### Database Structure
- **MongoDB**: Primary database
- **Collections**: users, workforce_profiles, employer_profiles, shifts, bookings, attendance, timesheets

#### Real-Time Requirements
1. **Attendance Tracking**: Clock-in/out must sync immediately
2. **Shift Updates**: Real-time shift status changes
3. **Notifications**: Push notifications for job offers, shift changes
4. **Messaging**: Real-time message delivery

#### Sync Implementation Options

##### Option A: Polling (Current Approach - Simplest)
```javascript
// Poll for updates every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchAttendanceStatus();
    fetchNotifications();
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

**Pros**: 
- Simple to implement
- No additional infrastructure
- Works with current backend

**Cons**:
- Not truly real-time (30s delay)
- Battery drain from frequent API calls
- Network overhead

##### Option B: WebSocket (Recommended for Phase 2)
```javascript
// Real-time updates via WebSocket
const ws = new WebSocket('wss://hrbank.ca/ws');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Handle real-time update
};
```

**Pros**:
- True real-time updates
- Lower latency
- Better user experience

**Cons**:
- Requires backend WebSocket implementation
- More complex to implement
- Additional infrastructure

##### Option C: Push Notifications + Polling Hybrid (Recommended for Phase 1)
```javascript
// Expo Push Notifications for critical updates
// + Polling when app is active
```

**Pros**:
- Balance between real-time and simplicity
- Battery efficient
- Good user experience

**Cons**:
- Two systems to maintain

### 4.4 Offline Support Strategy

#### Critical Offline Features
1. **View Cached Data**: Shifts, timesheets, profile
2. **Queue Actions**: Clock-in/out, messages (sync when online)
3. **Offline Indicators**: Show user when offline

#### Implementation
```javascript
// NetInfo for connectivity detection
import NetInfo from '@react-native-community/netinfo';

// Queue mechanism for offline actions
const queueAction = async (action) => {
  const queue = await AsyncStorage.getItem('@action_queue');
  const actions = queue ? JSON.parse(queue) : [];
  actions.push(action);
  await AsyncStorage.setItem('@action_queue', JSON.stringify(actions));
};

// Process queue when online
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    processActionQueue();
  }
});
```

---

## 5. Emma AI Mobile Integration

### 5.1 Current Emma Implementation (Web)

#### Backend Integration
- **AI Provider**: emergentintegrations library
- **Model**: GPT-5-mini (via EMERGENT_LLM_KEY)
- **Features**:
  - Conversational onboarding assistance
  - Resume parsing with Gemini 2.0 Flash
  - Context-aware responses based on user type
  - Progress tracking
  - Document upload support

#### API Endpoints
```
GET  /api/emma/conversation      - Get chat history
POST /api/emma/chat              - Send message
POST /api/emma/parse-resume      - Upload resume for parsing
POST /api/emma/approve-resume-data - Approve extracted data
GET  /api/emma/onboarding-status - Get completion progress
```

### 5.2 Mobile Emma UI Design

#### Floating Chat Button
```javascript
// Bottom-right floating action button
<TouchableOpacity 
  style={styles.floatingButton}
  onPress={() => setShowChat(true)}
>
  <Image source={{ uri: EMMA_AVATAR }} />
  {incompleteOnboarding && <View style={styles.badge} />}
</TouchableOpacity>
```

#### Chat Modal
```javascript
<Modal visible={showChat} animationType="slide">
  <View style={styles.chatHeader}>
    <Image source={{ uri: EMMA_AVATAR }} />
    <Text>Emma - Your HR Bank Assistant</Text>
  </View>
  
  <FlatList
    data={messages}
    renderItem={({ item }) => <ChatMessage message={item} />}
  />
  
  <View style={styles.inputContainer}>
    <TextInput placeholder="Type your message..." />
    <TouchableOpacity onPress={handleSend}>
      <Icon name="send" />
    </TouchableOpacity>
  </View>
</Modal>
```

#### File Upload
```javascript
import * as DocumentPicker from 'expo-document-picker';

const handleFileUpload = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'application/msword', 'image/*']
  });
  
  if (result.type === 'success') {
    // Upload to /api/emma/parse-resume
  }
};
```

### 5.3 Mobile-Specific Emma Features

#### Voice Input (Optional Enhancement)
```javascript
import { Audio } from 'expo-av';

// Voice-to-text for Emma interaction
const handleVoiceInput = async () => {
  // Record audio
  // Convert to text (using speech recognition API)
  // Send to Emma
};
```

#### Rich Media Support
- Display images in chat
- Show progress bars
- Interactive buttons (Yes/No, Quick replies)
- Profile completion checklist

#### Push Notifications Integration
```javascript
// Notify user when Emma has important updates
if (profileIncomplete && daysSinceLastInteraction > 3) {
  sendPushNotification({
    title: "Emma here!",
    body: "Let's finish setting up your profile. It'll only take 5 minutes!"
  });
}
```

---

## 6. Real-Time Features & Attendance

### 6.1 Attendance System Overview

#### Clock-In/Out Flow
```
1. Employer generates QR code for shift
2. QR code contains: shift_id, workplace_id, security_token
3. Worker scans QR code at workplace
4. Mobile app extracts QR data
5. App captures GPS location (expo-location)
6. App sends clock-in request with:
   - qr_data
   - location (lat/long)
   - booking_id
7. Backend validates:
   - QR code authenticity
   - Worker booking for shift
   - Geolocation within workplace radius
   - Time window (15 mins before shift start)
8. Attendance record created
9. Worker can clock out (same QR code)
```

### 6.2 Mobile Implementation

#### QR Code Scanner
```javascript
import { BarCodeScanner } from 'expo-barcode-scanner';

const ClockInScreen = () => {
  const [hasPermission, setHasPermission] = useState(null);
  
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);
  
  const handleBarCodeScanned = async ({ data }) => {
    const qrData = JSON.parse(data);
    const location = await getCurrentLocation();
    
    await axios.post('/api/attendance/clock-in', {
      qr_data: data,
      location,
      booking_id: selectedBooking.booking_id
    });
  };
  
  return (
    <BarCodeScanner
      onBarCodeScanned={handleBarCodeScanned}
      style={StyleSheet.absoluteFillObject}
    />
  );
};
```

#### Geolocation
```javascript
import * as Location from 'expo-location';

const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }
  
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High
  });
  
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy
  };
};
```

#### QR Code Generation (Employer)
```javascript
// Generate and display QR code
const generateQRCode = async (shiftId) => {
  const response = await axios.post(`/api/attendance/shifts/${shiftId}/qr-code`);
  const qrCodeImage = response.data.data.qr_code_image;
  
  return (
    <Image
      source={{ uri: qrCodeImage }}
      style={{ width: 300, height: 300 }}
    />
  );
};
```

### 6.3 Real-Time Attendance Tracking

#### Live Attendance Dashboard (Employer)
```javascript
// Poll for attendance updates
useEffect(() => {
  const fetchAttendance = async () => {
    const response = await axios.get(`/api/attendance/shift/${shiftId}/workers`);
    setAttendanceData(response.data.workers);
  };
  
  const interval = setInterval(fetchAttendance, 10000); // Every 10 seconds
  return () => clearInterval(interval);
}, [shiftId]);

// Display worker status
{attendanceData.map(worker => (
  <View key={worker.booking_id}>
    <Text>{worker.worker_name}</Text>
    <Badge color={worker.clocked_in ? 'green' : 'gray'}>
      {worker.clocked_in ? 'Present' : 'Not Checked In'}
    </Badge>
    {worker.clock_in_time && (
      <Text>Clocked in: {formatTime(worker.clock_in_time)}</Text>
    )}
  </View>
))}
```

### 6.4 Background Location Tracking (Optional)

#### For Geofencing Alerts
```javascript
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

const GEOFENCE_TASK = 'geofence-task';

TaskManager.defineTask(GEOFENCE_TASK, ({ data: { eventType, region }, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  
  if (eventType === Location.GeofencingEventType.Enter) {
    // User entered workplace geofence
    sendPushNotification({
      title: "Ready to start?",
      body: "You're at the workplace. Don't forget to clock in!"
    });
  }
});

// Start geofencing
await Location.startGeofencingAsync(GEOFENCE_TASK, [
  {
    identifier: workplaceId,
    latitude: workplace.latitude,
    longitude: workplace.longitude,
    radius: 100, // meters
  }
]);
```

---

## 7. Current Mobile App Status

### 7.1 Existing Implementation

A `/app/workforce-mobile` directory exists with the following structure:

```
/workforce-mobile
├── App.js                          ✅ Root component exists
├── package.json                    ✅ Dependencies configured
├── app.json                        ✅ Expo config
├── babel.config.js                 ✅ Babel setup
├── src/
│   ├── screens/
│   │   └── auth/
│   │       ├── LoginScreen.js      ✅ Basic login screen
│   │       └── SignupScreen.js     ✅ Basic signup screen
│   ├── components/                 ⚠️ Empty
│   ├── navigation/
│   │   └── AppNavigator.js         ⚠️ Likely incomplete
│   ├── services/                   ⚠️ Likely incomplete
│   ├── context/
│   │   ├── AuthContext.js          ⚠️ Basic auth context
│   │   └── LocationContext.js      ⚠️ Basic location context
│   ├── utils/                      ⚠️ Empty/minimal
│   └── constants/
│       └── config.js               ⚠️ Likely basic config
```

### 7.2 Assessment

#### ✅ What Exists
- **Project Structure**: Basic React Native + Expo setup
- **Dependencies**: Core libraries installed (React Native, Expo, React Navigation, Axios)
- **Auth Screens**: Basic login/signup screens
- **Contexts**: AuthContext and LocationContext scaffolding
- **Libraries**: 
  - `@react-navigation/native`: Navigation
  - `axios`: API calls
  - `@react-native-async-storage/async-storage`: Local storage
  - `expo-location`: Geolocation
  - `expo-document-picker`: Document uploads
  - `expo-notifications`: Push notifications
  - `react-native-calendars`: Calendar component

#### ⚠️ What's Missing (Estimated)
- **All main feature screens**: Dashboard, Job Browsing, Shift Calendar, Attendance, etc.
- **API Service Layer**: Properly structured API calls to backend
- **Navigation**: Complete navigation structure with role-based routes
- **Components**: Reusable UI components (buttons, cards, modals, etc.)
- **Emma AI Integration**: Chat interface and file upload
- **Real Implementation**: Most files appear to be templates/scaffolding

#### 🔴 No Employer Mobile App
- No `/employer-mobile` directory exists
- Will need to create from scratch

### 7.3 Decision Point

#### Option A: Build on Existing Workforce Mobile
**Pros**:
- Some foundation already exists
- Dependencies already configured
- Basic auth structure in place

**Cons**:
- Uncertain quality of existing code
- May have outdated patterns
- Might be easier to start fresh with proven structure

#### Option B: Create Both Apps Fresh
**Pros**:
- Clean slate with best practices
- Consistent architecture across both apps
- Latest React Native/Expo patterns
- Can share components between apps via monorepo

**Cons**:
- Slightly more initial setup
- Lose any good work already done

#### **Recommendation**: Option B - Fresh Start with Shared Components
```
/mobile-apps
├── shared/                         # Shared components, services, utils
│   ├── components/
│   ├── services/
│   ├── utils/
│   └── constants/
├── workforce-mobile/               # Workforce app
│   ├── src/
│   │   ├── screens/
│   │   ├── navigation/
│   │   └── ...
│   └── package.json
└── employer-mobile/                # Employer app
    ├── src/
    │   ├── screens/
    │   ├── navigation/
    │   └── ...
    └── package.json
```

---

## 8. Technical Architecture

### 8.1 Technology Stack

#### Mobile Framework
- **React Native**: Cross-platform mobile development
- **Expo SDK 50**: Development toolchain and managed workflow
- **React 18.2**: Latest React features
- **React Native 0.73**: Latest stable RN version

#### Navigation
- **@react-navigation/native**: Navigation library
- **@react-navigation/bottom-tabs**: Tab navigation
- **@react-navigation/stack**: Stack navigation

#### State Management
- **React Context API**: Global state (auth, user data)
- **React Hooks**: Local state management
- **AsyncStorage**: Persistent local storage

#### Networking
- **Axios**: HTTP client with interceptors
- **Axios Retry**: Automatic retry for failed requests

#### Location & Maps
- **expo-location**: Geolocation services
- **react-native-maps**: Map display (if needed)

#### Media & Files
- **expo-image-picker**: Camera and photo library access
- **expo-document-picker**: Document selection
- **expo-camera**: QR code scanning (barcode scanner)

#### Push Notifications
- **expo-notifications**: Push notification handling
- **expo-constants**: Device info for notification tokens

#### UI Components
- **react-native-calendars**: Calendar view
- **react-native-gesture-handler**: Touch gestures
- **react-native-reanimated**: Smooth animations
- **@expo/vector-icons**: Icon library

#### Development Tools
- **Expo CLI**: Development server
- **Expo Go**: Testing on physical devices
- **EAS Build**: Production builds for app stores

### 8.2 Project Structure (Proposed)

```
/app
├── mobile-shared/                               # Shared code between apps
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Badge.tsx
│   │   ├── emma/
│   │   │   ├── EmmaChat.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   └── FileUpload.tsx
│   │   └── calendar/
│   │       └── CalendarView.tsx
│   ├── services/
│   │   ├── api.ts                               # Axios configuration
│   │   ├── auth.service.ts
│   │   ├── jobs.service.ts
│   │   ├── attendance.service.ts
│   │   └── emma.service.ts
│   ├── utils/
│   │   ├── storage.ts                           # AsyncStorage helpers
│   │   ├── location.ts                          # Location utilities
│   │   ├── date.ts                              # Date formatting
│   │   └── validation.ts
│   ├── constants/
│   │   ├── config.ts                            # API URLs, keys
│   │   ├── colors.ts                            # Theme colors
│   │   └── types.ts                             # TypeScript types
│   └── contexts/
│       ├── AuthContext.tsx
│       └── ThemeContext.tsx
│
├── workforce-mobile/
│   ├── App.tsx
│   ├── app.json
│   ├── package.json
│   ├── src/
│   │   ├── navigation/
│   │   │   ├── AppNavigator.tsx
│   │   │   ├── AuthNavigator.tsx
│   │   │   └── MainNavigator.tsx                # Bottom tabs
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── SignupScreen.tsx
│   │   │   │   └── EULAScreen.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardScreen.tsx
│   │   │   ├── profile/
│   │   │   │   ├── ProfileScreen.tsx
│   │   │   │   ├── EditProfileScreen.tsx
│   │   │   │   └── OccupationProfileScreen.tsx
│   │   │   ├── jobs/
│   │   │   │   ├── BrowseJobsScreen.tsx
│   │   │   │   ├── JobDetailScreen.tsx
│   │   │   │   ├── OffersScreen.tsx
│   │   │   │   └── InterviewsScreen.tsx
│   │   │   ├── calendar/
│   │   │   │   ├── CalendarScreen.tsx
│   │   │   │   └── AddAvailabilityScreen.tsx
│   │   │   ├── attendance/
│   │   │   │   ├── ClockInScreen.tsx
│   │   │   │   └── TimesheetsScreen.tsx
│   │   │   ├── financial/
│   │   │   │   └── EarningsScreen.tsx
│   │   │   ├── documents/
│   │   │   │   └── DocumentsScreen.tsx
│   │   │   ├── messaging/
│   │   │   │   ├── MessagesScreen.tsx
│   │   │   │   └── ChatScreen.tsx
│   │   │   └── settings/
│   │   │       └── SettingsScreen.tsx
│   │   └── components/
│   │       ├── JobCard.tsx
│   │       ├── ShiftCard.tsx
│   │       └── TimesheetCard.tsx
│   └── assets/
│
└── employer-mobile/
    ├── App.tsx
    ├── app.json
    ├── package.json
    ├── src/
    │   ├── navigation/
    │   │   ├── AppNavigator.tsx
    │   │   ├── AuthNavigator.tsx
    │   │   └── MainNavigator.tsx                # Bottom tabs
    │   ├── screens/
    │   │   ├── auth/
    │   │   │   ├── LoginScreen.tsx
    │   │   │   ├── SignupScreen.tsx
    │   │   │   └── EULAScreen.tsx
    │   │   ├── dashboard/
    │   │   │   └── DashboardScreen.tsx
    │   │   ├── workplaces/
    │   │   │   ├── WorkplacesScreen.tsx
    │   │   │   ├── WorkplaceDetailScreen.tsx
    │   │   │   └── AddWorkplaceScreen.tsx
    │   │   ├── shifts/
    │   │   │   ├── ShiftCalendarScreen.tsx
    │   │   │   ├── CreateShiftScreen.tsx
    │   │   │   └── ShiftDetailScreen.tsx
    │   │   ├── jobs/
    │   │   │   ├── PostJobScreen.tsx
    │   │   │   ├── ActiveJobsScreen.tsx
    │   │   │   └── CandidatesScreen.tsx
    │   │   ├── workforce/
    │   │   │   ├── WorkforceListScreen.tsx
    │   │   │   └── WorkerDetailScreen.tsx
    │   │   ├── attendance/
    │   │   │   ├── GenerateQRScreen.tsx
    │   │   │   ├── AttendanceTrackingScreen.tsx
    │   │   │   └── TimesheetsScreen.tsx
    │   │   ├── financial/
    │   │   │   └── PayrollScreen.tsx
    │   │   ├── messaging/
    │   │   │   ├── MessagesScreen.tsx
    │   │   │   └── ChatScreen.tsx
    │   │   └── settings/
    │   │       └── SettingsScreen.tsx
    │   └── components/
    │       ├── WorkplaceCard.tsx
    │       ├── ShiftCard.tsx
    │       ├── WorkerCard.tsx
    │       └── QRCodeGenerator.tsx
    └── assets/
```

### 8.3 Shared Component Strategy

#### Benefits of Shared Components
1. **Code Reuse**: Write once, use in both apps
2. **Consistency**: Same UI/UX across workforce and employer apps
3. **Maintainability**: Fix bugs in one place
4. **Faster Development**: Less duplication

#### What to Share
- **UI Components**: Buttons, Cards, Inputs, Modals
- **Business Logic**: API services, validation, formatting
- **Emma AI**: Complete chat interface
- **Calendar Components**: Shared calendar views
- **Utilities**: Date formatting, storage helpers

#### What NOT to Share
- **App-specific Screens**: Different UI for workforce vs employer
- **Navigation Structure**: Different tab structures
- **Business Rules**: Workforce can't post jobs, employers can't apply

### 8.4 API Service Layer

#### Centralized API Configuration
```typescript
// mobile-shared/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - try refresh
      // If refresh fails, logout user
    }
    return Promise.reject(error);
  }
);

export default api;
```

#### Feature-Specific Services
```typescript
// mobile-shared/services/jobs.service.ts
import api from './api';

export const jobsService = {
  // Workforce APIs
  getBrowseJobs: () => api.get('/api/jobs/matched'),
  applyToJob: (jobId: string) => api.post(`/api/jobs/${jobId}/apply`),
  getJobOffers: () => api.get('/api/jobs/offers'),
  acceptOffer: (offerId: string) => api.post(`/api/jobs/offers/${offerId}/accept`),
  
  // Employer APIs
  postJob: (jobData: JobPostData) => api.post('/api/jobs/post', jobData),
  getPostedJobs: () => api.get('/api/jobs/posted'),
  getCandidates: (jobId: string) => api.get(`/api/jobs/${jobId}/candidates`),
};
```

### 8.5 Navigation Structure

#### Workforce App Navigation
```
AuthStack (Not logged in)
├── Login
├── Signup
└── EULA

MainStack (Logged in)
├── BottomTabs
│   ├── Home (Dashboard)
│   ├── Jobs (Browse & Offers)
│   ├── Calendar (Availability & Shifts)
│   ├── More (Profile, Documents, Settings)
│   └── Emma (AI Chat - Floating)
└── Modal Screens
    ├── JobDetail
    ├── ShiftDetail
    ├── ClockIn (QR Scanner)
    ├── EditProfile
    └── Chat (with Employer)
```

#### Employer App Navigation
```
AuthStack (Not logged in)
├── Login
├── Signup
└── EULA

MainStack (Logged in)
├── BottomTabs
│   ├── Home (Dashboard)
│   ├── Shifts (Calendar & Management)
│   ├── Workforce (Workers & Hiring)
│   ├── More (Workplaces, Financial, Settings)
│   └── Emma (AI Chat - Floating)
└── Modal Screens
    ├── CreateShift
    ├── PostJob
    ├── WorkerDetail
    ├── GenerateQR
    └── Chat (with Worker)
```

### 8.6 Styling & Theming

#### Color Scheme
```typescript
// mobile-shared/constants/colors.ts
export const colors = {
  // Workforce theme (Blue)
  workforce: {
    primary: '#30496d',
    secondary: '#4a6fa5',
    accent: '#5c7cad',
    background: '#f5f7fa',
    card: '#ffffff',
    text: '#2c3e50',
    textLight: '#7f8c8d',
  },
  
  // Employer theme (Orange)
  employer: {
    primary: '#ff5f00',
    secondary: '#ff7f3f',
    accent: '#ff9966',
    background: '#fff5f0',
    card: '#ffffff',
    text: '#2c3e50',
    textLight: '#7f8c8d',
  },
  
  // Common colors
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // Status badges
  pending: '#fbbf24',
  verified: '#10b981',
  rejected: '#ef4444',
};
```

#### Responsive Design
```typescript
// mobile-shared/utils/responsive.ts
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const responsive = {
  width,
  height,
  isSmallDevice: width < 375,
  isMediumDevice: width >= 375 && width < 768,
  isLargeDevice: width >= 768,
  
  // Responsive sizing
  scale: (size: number) => (width / 375) * size,
};
```

---

## 9. Development Roadmap

### Phase 1: Foundation & Core Features (Weeks 1-4)

#### Week 1: Setup & Authentication
**Workforce Mobile**
- [x] Project initialization with Expo
- [ ] Shared components library setup
- [ ] API service layer implementation
- [ ] AuthContext and storage utilities
- [ ] Login screen with JWT integration
- [ ] Signup screen with validation
- [ ] EULA acceptance flow
- [ ] AsyncStorage token management
- [ ] Auto-login on app restart

**Employer Mobile**
- [ ] Project initialization with Expo
- [ ] Shared components integration
- [ ] Login/Signup screens
- [ ] EULA acceptance flow

**Testing**
- [ ] Login with valid credentials
- [ ] Signup new accounts
- [ ] Token persistence across app restarts
- [ ] Logout functionality

---

#### Week 2: Core Workforce Features
**Workforce Mobile**
- [ ] Dashboard screen with stats
- [ ] Navigation structure (bottom tabs)
- [ ] Profile screen (view/edit)
- [ ] Occupation profiles display
- [ ] Document upload screen
- [ ] Basic Emma AI chat integration

**Testing**
- [ ] Navigation flow
- [ ] Profile data loading
- [ ] Document upload
- [ ] Emma chat basic functionality

---

#### Week 3: Job Browsing & Applications (Workforce)
**Workforce Mobile**
- [ ] Browse matched jobs screen
- [ ] Job detail modal
- [ ] Job application functionality
- [ ] Job offers screen
- [ ] Accept/reject offers
- [ ] Interview invitations screen
- [ ] Employment status display
- [ ] Quit job functionality

**Testing**
- [ ] Job listing loads correctly
- [ ] Match scores display
- [ ] Application submission
- [ ] Offer acceptance/rejection
- [ ] Employment status updates

---

#### Week 4: Calendar & Availability (Workforce)
**Workforce Mobile**
- [ ] Calendar view (react-native-calendars)
- [ ] Add availability screen
- [ ] View shifts on calendar
- [ ] Recurring availability support
- [ ] Edit/delete availability
- [ ] Shift detail view
- [ ] Upcoming shifts list

**Testing**
- [ ] Calendar displays correctly
- [ ] Add single availability
- [ ] Add recurring availability
- [ ] View shifts on calendar
- [ ] Edit/delete functionality

---

### Phase 2: Attendance & Real-Time Features (Weeks 5-6)

#### Week 5: Clock-In/Out (Workforce)
**Workforce Mobile**
- [ ] QR code scanner implementation
- [ ] Geolocation capture
- [ ] Clock-in screen with validation
- [ ] Clock-out functionality
- [ ] Attendance status display
- [ ] My timesheets screen
- [ ] Timesheet detail view
- [ ] Filter timesheets by status/date

**Testing**
- [ ] QR code scanning
- [ ] Geolocation accuracy
- [ ] Clock-in validation (time window)
- [ ] Clock-out calculation
- [ ] Timesheet data accuracy

---

#### Week 6: Financial & Notifications (Workforce)
**Workforce Mobile**
- [ ] Earnings dashboard
- [ ] Payment history
- [ ] Earnings charts (optional)
- [ ] Push notification setup
- [ ] Notification center
- [ ] Mark notifications as read
- [ ] Notification action handling
- [ ] Background notification handling

**Testing**
- [ ] Earnings data display
- [ ] Payment history accuracy
- [ ] Push notifications received
- [ ] Notification actions work
- [ ] Badge counts update

---

### Phase 3: Employer Mobile App (Weeks 7-10)

#### Week 7: Employer Core Features
**Employer Mobile**
- [ ] Dashboard with quick actions
- [ ] Workplace management screens
- [ ] Add/edit workplace
- [ ] Workplace detail view
- [ ] Profile management
- [ ] Settings screen

**Testing**
- [ ] Dashboard loads
- [ ] Workplace CRUD operations
- [ ] Profile editing

---

#### Week 8: Shift Management (Employer)
**Employer Mobile**
- [ ] Shift calendar view
- [ ] Create shift screen
- [ ] Recurring shift support
- [ ] Edit/delete shifts
- [ ] Shift detail view
- [ ] Generate QR code for shift
- [ ] QR code display and sharing
- [ ] Invite workers to shift

**Testing**
- [ ] Calendar displays shifts
- [ ] Create single/recurring shifts
- [ ] QR code generation
- [ ] Worker invitation

---

#### Week 9: Job Posting & Hiring (Employer)
**Employer Mobile**
- [ ] Post job screen
- [ ] Skills/certifications multi-select
- [ ] Active jobs list
- [ ] Job detail view
- [ ] Candidates screen
- [ ] Candidate ranking display
- [ ] Send interview invitation
- [ ] Send job offer
- [ ] Invitation/offer forms

**Testing**
- [ ] Job posting submission
- [ ] Candidates display with scores
- [ ] Interview invitation
- [ ] Offer sending

---

#### Week 10: Workforce & Attendance (Employer)
**Employer Mobile**
- [ ] Active workers list
- [ ] Worker detail screen
- [ ] Terminate employment modal
- [ ] Rehire functionality
- [ ] Timesheet approval screen
- [ ] Bulk approve timesheets
- [ ] Shift attendance tracking
- [ ] Real-time attendance updates
- [ ] Filter timesheets

**Testing**
- [ ] Worker list displays
- [ ] Termination flow
- [ ] Timesheet approval
- [ ] Attendance tracking accuracy

---

### Phase 4: Enhanced Features & Polish (Weeks 11-12)

#### Week 11: Messaging & Emma AI
**Both Apps**
- [ ] Message threads list
- [ ] Chat screen
- [ ] Send/receive messages
- [ ] Real-time message updates
- [ ] Enhanced Emma AI chat
- [ ] Emma file upload
- [ ] Emma resume parsing
- [ ] Progress tracking in Emma
- [ ] Voice input for Emma (optional)

**Testing**
- [ ] Messaging functionality
- [ ] Message notifications
- [ ] Emma responses
- [ ] File upload to Emma

---

#### Week 12: Testing & Optimization
**Both Apps**
- [ ] Comprehensive E2E testing
- [ ] Performance optimization
- [ ] Memory leak fixes
- [ ] Battery usage optimization
- [ ] Offline support implementation
- [ ] Error handling improvements
- [ ] Loading states polish
- [ ] UI/UX refinements
- [ ] Icon and splash screen
- [ ] App store assets preparation

**Testing**
- [ ] Full user flows (workforce & employer)
- [ ] Offline scenarios
- [ ] Network failures handling
- [ ] Performance benchmarks

---

### Phase 5: Deployment (Week 13)

#### App Store Submission
- [ ] iOS build with EAS Build
- [ ] Android build with EAS Build
- [ ] App Store listing (iOS)
- [ ] Google Play Store listing (Android)
- [ ] Screenshots and descriptions
- [ ] Privacy policy integration
- [ ] Terms of service integration
- [ ] Beta testing via TestFlight (iOS)
- [ ] Beta testing via Google Play Console (Android)
- [ ] Final production release

---

## 10. Risk Assessment & Mitigation

### 10.1 Technical Risks

#### Risk 1: Real-Time Sync Complexity
**Impact**: High  
**Probability**: Medium  
**Description**: Attendance tracking requires near real-time updates. Current polling approach may not be sufficient.

**Mitigation**:
- Phase 1: Use polling (30s intervals) for MVP
- Phase 2: Implement WebSocket for true real-time
- Use push notifications for critical updates
- Implement optimistic UI updates

---

#### Risk 2: Geolocation Accuracy
**Impact**: High  
**Probability**: Medium  
**Description**: GPS accuracy varies (5-50m). May allow check-ins from outside workplace.

**Mitigation**:
- Require high accuracy GPS (expo-location)
- Validate against workplace geofence (radius check)
- Log GPS accuracy with clock-in
- Allow manual override by employer (with flag)
- Indoor location may be problematic (warn users)

---

#### Risk 3: Offline Support Challenges
**Impact**: Medium  
**Probability**: High  
**Description**: Workers may have poor connectivity at workplaces.

**Mitigation**:
- Cache critical data (shifts, profile)
- Queue offline actions (clock-in/out)
- Sync when connection restored
- Clear offline indicators
- Validate queue actions before processing

---

#### Risk 4: QR Code Security
**Impact**: High  
**Probability**: Low  
**Description**: QR codes could be shared/screenshot, allowing remote check-ins.

**Mitigation**:
- Include security token in QR code
- Time-based expiration (24 hours)
- Geolocation validation required
- Rotate QR codes periodically
- Employer can see check-in locations

---

#### Risk 5: Battery Drain
**Impact**: Medium  
**Probability**: Medium  
**Description**: Location tracking and polling can drain battery.

**Mitigation**:
- Use foreground location only (not background)
- Reduce polling frequency when inactive
- Use push notifications instead of polling where possible
- Implement battery optimization best practices

---

### 10.2 Development Risks

#### Risk 1: Feature Parity with Web
**Impact**: High  
**Probability**: Medium  
**Description**: Web platform has extensive features. Mobile must match.

**Mitigation**:
- Prioritize core features first (Phases 1-3)
- Progressive enhancement for advanced features
- Use web as reference implementation
- Regular demos to user for feedback

---

#### Risk 2: Timeline Slippage
**Impact**: Medium  
**Probability**: High  
**Description**: 13-week timeline is aggressive for 2 full apps.

**Mitigation**:
- Focus on Workforce app first (Weeks 1-6)
- Leverage shared components extensively
- Cut non-critical features if needed
- Have clear MVP definition
- Buffer time in Week 12 for overruns

---

#### Risk 3: API Changes
**Impact**: Low  
**Probability**: Low  
**Description**: Backend APIs may change during mobile development.

**Mitigation**:
- Backend APIs are already tested and stable
- Version API endpoints if changes needed
- Maintain backward compatibility
- Coordinate with backend team on changes

---

#### Risk 4: Different Mobile OS Behaviors
**Impact**: Medium  
**Probability**: Medium  
**Description**: iOS and Android handle permissions, notifications differently.

**Mitigation**:
- Use Expo managed APIs (handles platform differences)
- Test on both platforms regularly
- Platform-specific code where needed
- Follow platform design guidelines

---

### 10.3 User Experience Risks

#### Risk 1: Complex Navigation
**Impact**: Medium  
**Probability**: Medium  
**Description**: Many features may overwhelm users on smaller screens.

**Mitigation**:
- Simplified navigation structure
- Bottom tabs for main sections
- Progressive disclosure of features
- Onboarding tutorial for first-time users
- Emma AI to guide users

---

#### Risk 2: Emma AI Mobile UX
**Impact**: Medium  
**Probability**: Medium  
**Description**: Chat interface may not translate well to mobile.

**Mitigation**:
- Use proven mobile chat patterns
- Floating action button for Emma
- Full-screen modal for chat
- Quick reply buttons
- Voice input support (optional)

---

#### Risk 3: Data Entry on Mobile
**Impact**: Medium  
**Probability**: High  
**Description**: Forms with many fields (job posting, profile) are tedious on mobile.

**Mitigation**:
- Multi-step forms with progress indicators
- Smart defaults where possible
- Auto-fill from profile data
- Camera/scanner for document upload
- Voice-to-text for long fields

---

### 10.4 Business Risks

#### Risk 1: App Store Approval
**Impact**: High  
**Probability**: Low  
**Description**: Apps may be rejected by Apple/Google.

**Mitigation**:
- Follow app store guidelines strictly
- Prepare detailed privacy policy
- Clear data usage explanations
- No prohibited content
- Professional app listing

---

#### Risk 2: User Adoption
**Impact**: High  
**Probability**: Low  
**Description**: Users may prefer web app.

**Mitigation**:
- Mobile-specific features (QR scanning, GPS)
- Better on-the-go experience
- Push notifications
- Faster access to critical functions
- In-app tutorials and Emma guidance

---

## 11. Appendices

### Appendix A: Environment Configuration

```bash
# .env.example
API_BASE_URL=https://hrbank.ca/api
EXPO_PUBLIC_API_URL=https://hrbank.ca/api
EMERGENT_LLM_KEY=your_emergent_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
SENTRY_DSN=your_sentry_dsn_here
```

### Appendix B: Key Dependencies

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/stack": "^6.3.20",
    "axios": "^1.6.2",
    "@react-native-async-storage/async-storage": "1.21.0",
    "expo-location": "~16.5.0",
    "expo-document-picker": "~11.10.0",
    "expo-image-picker": "~14.7.0",
    "expo-camera": "~14.0.0",
    "expo-notifications": "~0.27.0",
    "react-native-calendars": "^1.1302.0",
    "react-native-gesture-handler": "~2.14.0",
    "react-native-reanimated": "~3.6.1",
    "@expo/vector-icons": "^14.0.0",
    "date-fns": "^2.30.0"
  }
}
```

### Appendix C: Critical API Endpoints Summary

**Authentication**: `/api/auth/login`, `/api/auth/signup`  
**Profile**: `/api/users/me`, `/api/workforce/me/profile`  
**Jobs**: `/api/jobs/matched`, `/api/jobs/post`  
**Attendance**: `/api/attendance/clock-in`, `/api/attendance/clock-out`  
**Calendar**: `/api/workforce/availability/calendar`, `/api/employer/shifts/calendar`  
**Emma**: `/api/emma/chat`, `/api/emma/parse-resume`  
**Notifications**: `/api/notifications/my-notifications`

### Appendix D: Testing Checklist

#### Workforce App
- [ ] Authentication flow
- [ ] Profile management
- [ ] Job browsing and application
- [ ] Calendar and availability
- [ ] QR code scanning
- [ ] Clock-in/out
- [ ] Timesheets viewing
- [ ] Earnings display
- [ ] Emma AI interaction
- [ ] Messaging
- [ ] Push notifications
- [ ] Offline functionality

#### Employer App
- [ ] Authentication flow
- [ ] Workplace management
- [ ] Shift creation and calendar
- [ ] Job posting
- [ ] Candidate viewing
- [ ] QR code generation
- [ ] Attendance tracking
- [ ] Timesheet approval
- [ ] Worker management
- [ ] Messaging
- [ ] Push notifications

---

## Next Steps

### Immediate Actions Required:

1. **Review & Approval**: User to review this specification and approve plan
2. **Confirm Technology Choices**: React Native + Expo confirmed
3. **Decide on Existing Code**: Keep or discard `/workforce-mobile` directory
4. **Resource Allocation**: Confirm development timeline (13 weeks feasible?)
5. **API Testing**: Verify all required APIs are accessible from mobile
6. **Third-Party Keys**: Obtain any needed API keys (Google Maps, etc.)

### Phase 2 Begins After Approval:

Once this specification is approved, Phase 2 (Implementation) will commence following the 13-week development roadmap outlined above.

---

**Document End**
