import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import "./App.css";

// Auth pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import GoogleCallback from './pages/auth/GoogleCallback';
import PendingApproval from './pages/auth/PendingApproval';

// Landing & Common
import LandingPage from './pages/LandingPage';
import PublicJobsPage from './pages/PublicJobsPage';
import SubdomainPortal from './pages/SubdomainPortal';
import ForgotPassword from './pages/ForgotPassword';
import { isSubdomainPortal } from './utils/subdomainDetector';

// Workforce pages
import WorkforceDashboard from './pages/workforce/Dashboard';
import WorkforceProfile from './pages/workforce/Profile';
import WorkforceOnboarding from './pages/workforce/Onboarding';
import ProfileWizard from './pages/workforce/ProfileWizard';
import OccupationProfiles from './pages/workforce/OccupationProfiles';
import CreateOccupation from './pages/workforce/CreateOccupation';
import OccupationDetail from './pages/workforce/OccupationDetail';
import AddCertification from './pages/workforce/AddCertification';
import Availability from './pages/workforce/Availability';
import AvailabilityCalendar from './pages/workforce/AvailabilityCalendar';
import ClockInOut from './pages/workforce/ClockInOut';
import ClockInOutNew from './pages/workforce/ClockInOutNew';
import ServiceTasks from './pages/workforce/ServiceTasks';
import UnifiedSchedule from './pages/workforce/UnifiedSchedule';
import MyTimesheets from './pages/workforce/MyTimesheets';
import ShiftCalendar from './pages/employer/ShiftCalendar';
import ShiftScheduler from './pages/employer/ShiftScheduler';
import CalendarScheduling from './pages/employer/CalendarScheduling';
import EmploymentHistory from './pages/workforce/EmploymentHistory';
import WorkforceSettings from './pages/workforce/Settings';
import WorkforceDocuments from './pages/workforce/Documents';
import EmployerSettings from './pages/employer/Settings';
import EmployerDocuments from './pages/employer/Documents';
import InstitutionDocuments from './pages/institution/Documents';
import InstitutionDashboard from './pages/institution/InstitutionDashboard';
import InstitutionSettings from './pages/institution/Settings';
import ClassTemplates from './pages/institution/ClassTemplates';
import ClassesManagement from './pages/institution/ClassesManagement';
import ClassDetails from './pages/institution/ClassDetails';
import VerificationRequests from './pages/institution/VerificationRequests';
import ManageCredentials from './pages/institution/ManageCredentials';
import AdminManageCredentials from './pages/admin/ManageCredentials';
import ManageOccupationCertifications from './pages/admin/ManageOccupationCertifications';
import IssueCredential from './pages/institution/IssueCredential';
import BulkInvite from './pages/institution/BulkInvite';
import TranscriptsManagement from './pages/institution/TranscriptsManagement';
import CredentialVerification from './pages/workforce/CredentialVerification';
import MyCredentials from './pages/workforce/MyCredentials';
import Messages from './pages/common/Messages';
import Notifications from './pages/common/Notifications';
import Settings from './pages/common/Settings';
import DocumentReview from './pages/admin/DocumentReview';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageAdmins from './pages/admin/ManageAdmins';
import MinimumWageManager from './pages/admin/MinimumWageManager';
import ManageZones from './pages/admin/ManageZones';
import WSIBVerification from './pages/admin/WSIBVerification';
// Super Admin Pages
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import PendingActivations from './pages/admin/PendingActivations';
import AdminManagement from './pages/admin/AdminManagement';
import FranchiseManagement from './pages/admin/FranchiseManagement';
import SupportTickets from './pages/admin/SupportTickets';
import RoleManagement from './pages/admin/RoleManagement';
import ZoneManagement from './pages/admin/ZoneManagement';
import RegionalDashboard from './pages/admin/RegionalDashboard';
import ActivityFeed from './pages/admin/ActivityFeed';
import AllUsers from './pages/admin/AllUsers';
import CredentialReviews from './pages/admin/CredentialReviews';
import DocumentVerification from './pages/admin/DocumentVerification';
import Permissions from './pages/admin/Permissions';
import EmployersList from './pages/admin/EmployersList';
import InstitutionsList from './pages/admin/InstitutionsList';
import ReportedIssues from './pages/admin/ReportedIssues';
import AuditLogs from './pages/admin/AuditLogs';
import NotificationSettings from './pages/admin/NotificationSettings';
import ComplianceOnboarding from './pages/employer/ComplianceOnboarding';
import WorkerComplianceOnboarding from './pages/workforce/WorkerComplianceOnboarding';
import Analytics from './pages/admin/Analytics';
import AdminSettings from './pages/admin/Settings';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import TermsOfService from './pages/legal/TermsOfService';
import VerifyCredential from './pages/public/VerifyCredential';
import VerifiedCareerProfile from './pages/public/VerifiedCareerProfile';
import WorkforceCalendar from './pages/workforce/WorkforceCalendar';
import MyShifts from './pages/workforce/MyShifts';
import MyTasks from './pages/workforce/MyTasks';
import CreateOccupationSimplified from './pages/workforce/CreateOccupationSimplified';
import FindJobs from './pages/workforce/FindJobs';
import Tasks from './pages/workforce/Tasks';
import Performance from './pages/workforce/Performance';
import Attendance from './pages/workforce/Attendance';
import Wallet from './pages/workforce/Wallet';
import WorkforceNotificationSettings from './pages/workforce/NotificationSettings';
import EmployerNotificationSettings from './pages/employer/NotificationSettings';
import LiveAttendance from './pages/employer/LiveAttendance';
import VideoInterview from './pages/VideoInterview';
import ManageOccupations from './pages/admin/ManageOccupations';
import ManageCertifications from './pages/admin/ManageCertifications';
import WorkforceTimeOff from './pages/workforce/TimeOff';
import EmployerTimeOffManagement from './pages/employer/TimeOffManagement';
import CareerProfileSettings from './pages/workforce/CareerProfileSettings';

// Employer pages
import EmployerDashboard from './pages/employer/DashboardNew';
import EmployerHome from './pages/employer/Home';
import EmployerRoster from './pages/employer/Roster';
import EmployerNotifications from './pages/employer/Notifications';
import EmployerMessages from './pages/employer/Messages';
import MessageThread from './pages/employer/MessageThread';
import EmployerProfile from './pages/employer/Profile';
import EmployerOnboarding from './pages/employer/Onboarding';
import JobPosting from './pages/employer/JobPosting';
// WorkplaceForm handles both create and edit
import WorkplacesNew from './pages/employer/WorkplacesNew';
import WorkplaceDetail from './pages/employer/WorkplaceDetail';
import WorkplaceForm from './pages/employer/WorkplaceForm';
import PostJob from './pages/employer/PostJob';
import JobsCandidates from './pages/employer/JobsCandidates';
import RoleCandidates from './pages/employer/RoleCandidates';
import Roles from './pages/employer/Roles';
import RoleForm from './pages/employer/RoleForm';
import FillPositions from './pages/employer/FillPositions';
import CreateShift from './pages/employer/CreateShift';
import ShiftDetail from './pages/employer/ShiftDetail';
import ShiftAttendance from './pages/employer/ShiftAttendance';
import Timesheets from './pages/employer/Timesheets';
import ManageTasks from './pages/employer/ManageTasks';
import WorkforceManagement from './pages/employer/WorkforceManagement';
import RosterManagement from './pages/employer/RosterManagement';
import RosterDetail from './pages/employer/RosterDetail';
import Payroll from './pages/employer/Payroll';

// Institution pages (old imports removed, using new system)

import { Toaster } from './components/ui/toaster';
import EULAModal from './components/common/EULAModal';
import EmmaChat from './components/emma/EmmaChat';

// Protected Route Component
const ProtectedRoute = ({ children, allowedUserTypes }) => {
  const { user, loading } = useAuth();
  const [showEULA, setShowEULA] = React.useState(false);
  const [eulaAccepted, setEulaAccepted] = React.useState(false);

  React.useEffect(() => {
    if (user && !eulaAccepted) {
      setShowEULA(true);
    }
  }, [user, eulaAccepted]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to appropriate login page based on route
    const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    return <Navigate to={isAdminRoute ? "/admin/login" : "/login"} replace />;
  }

  if (allowedUserTypes && !allowedUserTypes.includes(user.user_type)) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {children}
      <EULAModal 
        isOpen={showEULA && !eulaAccepted} 
        onAccept={() => {
          setEulaAccepted(true);
          setShowEULA(false);
        }} 
      />
    </>
  );
};

// Main App Routes
function AppRoutes() {
  const { user } = useAuth();

  return (
    <ThemeProvider userType={user?.user_type || 'workforce'}>
      <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={isSubdomainPortal() ? <SubdomainPortal /> : <LandingPage />} />
        <Route path="/jobs" element={<PublicJobsPage />} />
        <Route path="/verify/:credentialId" element={<VerifyCredential />} />
        <Route path="/verify" element={<VerifyCredential />} />
        <Route path="/profile/:profileCode" element={<VerifiedCareerProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        
        {/* Legal Pages */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        
        {/* Workforce Routes */}
        <Route path="/workforce/onboarding" element={<ProtectedRoute allowedUserTypes={['workforce']}><WorkforceOnboarding /></ProtectedRoute>} />
        <Route path="/workforce/profile-wizard" element={<ProtectedRoute allowedUserTypes={['workforce']}><ProfileWizard /></ProtectedRoute>} />
        <Route path="/workforce/dashboard" element={<ProtectedRoute allowedUserTypes={['workforce']}><WorkforceDashboard /></ProtectedRoute>} />
        <Route path="/workforce/compliance" element={<ProtectedRoute allowedUserTypes={['workforce']}><WorkerComplianceOnboarding /></ProtectedRoute>} />
        <Route path="/workforce/profile" element={<ProtectedRoute allowedUserTypes={['workforce']}><WorkforceProfile /></ProtectedRoute>} />
        <Route path="/workforce/settings/notifications" element={<ProtectedRoute allowedUserTypes={['workforce']}><WorkforceNotificationSettings /></ProtectedRoute>} />
        <Route path="/workforce/my-shifts" element={<ProtectedRoute allowedUserTypes={['workforce']}><MyShifts /></ProtectedRoute>} />
        <Route path="/workforce/my-tasks" element={<ProtectedRoute allowedUserTypes={['workforce']}><MyTasks /></ProtectedRoute>} />
        <Route path="/workforce/occupations" element={<ProtectedRoute allowedUserTypes={['workforce']}><OccupationProfiles /></ProtectedRoute>} />
        <Route path="/workforce/occupations/create" element={<ProtectedRoute allowedUserTypes={['workforce']}><CreateOccupationSimplified /></ProtectedRoute>} />
        <Route path="/workforce/occupations/create-old" element={<ProtectedRoute allowedUserTypes={['workforce']}><CreateOccupation /></ProtectedRoute>} />
        <Route path="/workforce/occupations/:occupationId" element={<ProtectedRoute allowedUserTypes={['workforce']}><OccupationDetail /></ProtectedRoute>} />
        <Route path="/workforce/certifications/add" element={<ProtectedRoute allowedUserTypes={['workforce']}><AddCertification /></ProtectedRoute>} />
        <Route path="/workforce/occupations/:occupationId/add-certification" element={<ProtectedRoute allowedUserTypes={['workforce']}><AddCertification /></ProtectedRoute>} />
        <Route path="/workforce/availability" element={<ProtectedRoute allowedUserTypes={['workforce']}><Availability /></ProtectedRoute>} />
        <Route path="/workforce/availability-calendar" element={<ProtectedRoute allowedUserTypes={['workforce']}><AvailabilityCalendar /></ProtectedRoute>} />
        <Route path="/workforce/calendar" element={<ProtectedRoute allowedUserTypes={['workforce']}><MyShifts /></ProtectedRoute>} />
        <Route path="/workforce/find-jobs" element={<ProtectedRoute allowedUserTypes={['workforce']}><FindJobs /></ProtectedRoute>} />
        <Route path="/workforce/interview/:interviewId" element={<ProtectedRoute allowedUserTypes={['workforce', 'employer']}><VideoInterview /></ProtectedRoute>} />
        <Route path="/workforce/clock/:bookingId" element={<ProtectedRoute allowedUserTypes={['workforce']}><ClockInOut /></ProtectedRoute>} />
        <Route path="/workforce/clock-in" element={<ProtectedRoute allowedUserTypes={['workforce']}><ClockInOutNew /></ProtectedRoute>} />
        <Route path="/workforce/clock-in/:shiftId" element={<ProtectedRoute allowedUserTypes={['workforce']}><ClockInOutNew /></ProtectedRoute>} />
        <Route path="/workforce/service-tasks" element={<ProtectedRoute allowedUserTypes={['workforce']}><ServiceTasks /></ProtectedRoute>} />
        <Route path="/workforce/schedule" element={<ProtectedRoute allowedUserTypes={['workforce']}><UnifiedSchedule /></ProtectedRoute>} />
        <Route path="/workforce/tasks" element={<ProtectedRoute allowedUserTypes={['workforce']}><Tasks /></ProtectedRoute>} />
        <Route path="/workforce/performance" element={<ProtectedRoute allowedUserTypes={['workforce']}><Performance /></ProtectedRoute>} />
        <Route path="/workforce/attendance" element={<ProtectedRoute allowedUserTypes={['workforce']}><Attendance /></ProtectedRoute>} />
        <Route path="/workforce/wallet" element={<ProtectedRoute allowedUserTypes={['workforce']}><Wallet /></ProtectedRoute>} />
        <Route path="/workforce/timesheets" element={<ProtectedRoute allowedUserTypes={['workforce']}><MyTimesheets /></ProtectedRoute>} />
        <Route path="/workforce/employment-history" element={<ProtectedRoute allowedUserTypes={['workforce']}><EmploymentHistory /></ProtectedRoute>} />
        <Route path="/workforce/messages" element={<ProtectedRoute allowedUserTypes={['workforce']}><Messages /></ProtectedRoute>} />
        <Route path="/workforce/notifications" element={<ProtectedRoute allowedUserTypes={['workforce']}><Notifications /></ProtectedRoute>} />
        <Route path="/workforce/settings" element={<ProtectedRoute allowedUserTypes={['workforce']}><WorkforceSettings /></ProtectedRoute>} />
        <Route path="/workforce/documents" element={<ProtectedRoute allowedUserTypes={['workforce']}><WorkforceDocuments /></ProtectedRoute>} />
        <Route path="/workforce/credentials/verify" element={<ProtectedRoute allowedUserTypes={['workforce']}><CredentialVerification /></ProtectedRoute>} />
        <Route path="/workforce/credentials" element={<ProtectedRoute allowedUserTypes={['workforce']}><MyCredentials /></ProtectedRoute>} />
        <Route path="/workforce/time-off" element={<ProtectedRoute allowedUserTypes={['workforce']}><WorkforceTimeOff /></ProtectedRoute>} />
        <Route path="/workforce/career-profile" element={<ProtectedRoute allowedUserTypes={['workforce']}><CareerProfileSettings /></ProtectedRoute>} />
        
        {/* Employer Routes */}
        <Route path="/employer/home" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerHome /></ProtectedRoute>} />
        <Route path="/employer/roster" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerRoster /></ProtectedRoute>} />
        <Route path="/employer/payroll" element={<ProtectedRoute allowedUserTypes={['employer']}><Payroll /></ProtectedRoute>} />
        <Route path="/employer/onboarding" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerOnboarding /></ProtectedRoute>} />
        <Route path="/employer/dashboard" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerDashboard /></ProtectedRoute>} />
        <Route path="/employer/notifications" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerNotifications /></ProtectedRoute>} />
        <Route path="/employer/messages" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerMessages /></ProtectedRoute>} />
        <Route path="/employer/messages/:threadId" element={<ProtectedRoute allowedUserTypes={['employer']}><MessageThread /></ProtectedRoute>} />
        <Route path="/employer/jobs" element={<ProtectedRoute allowedUserTypes={['employer']}><JobPosting /></ProtectedRoute>} />
        <Route path="/employer/compliance" element={<ProtectedRoute allowedUserTypes={['employer']}><ComplianceOnboarding /></ProtectedRoute>} />
        <Route path="/employer/profile" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerProfile /></ProtectedRoute>} />
        <Route path="/employer/settings/notifications" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerNotificationSettings /></ProtectedRoute>} />
        <Route path="/employer/live-attendance" element={<ProtectedRoute allowedUserTypes={['employer']}><LiveAttendance /></ProtectedRoute>} />
        <Route path="/employer/workplace-setup" element={<ProtectedRoute allowedUserTypes={['employer']}><WorkplaceForm /></ProtectedRoute>} />
        <Route path="/employer/workplaces" element={<ProtectedRoute allowedUserTypes={['employer']}><WorkplacesNew /></ProtectedRoute>} />
        <Route path="/employer/workplaces/new" element={<ProtectedRoute allowedUserTypes={['employer']}><WorkplaceForm /></ProtectedRoute>} />
        <Route path="/employer/workplaces/:workplaceId" element={<ProtectedRoute allowedUserTypes={['employer']}><WorkplaceForm /></ProtectedRoute>} />
        <Route path="/employer/workplaces/:workplaceId/shifts" element={<ProtectedRoute allowedUserTypes={['employer']}><WorkplaceDetail /></ProtectedRoute>} />
        {/* Redirect old /edit route to new WorkplaceForm */}
        <Route path="/employer/workplaces/:workplaceId/edit" element={<ProtectedRoute allowedUserTypes={['employer']}><WorkplaceForm /></ProtectedRoute>} />
        <Route path="/employer/jobs/post" element={<ProtectedRoute allowedUserTypes={['employer']}><PostJob /></ProtectedRoute>} />
        <Route path="/employer/jobs" element={<ProtectedRoute allowedUserTypes={['employer']}><JobsCandidates /></ProtectedRoute>} />
        <Route path="/employer/roles" element={<ProtectedRoute allowedUserTypes={['employer']}><Roles /></ProtectedRoute>} />
        <Route path="/employer/roles/create" element={<ProtectedRoute allowedUserTypes={['employer']}><RoleForm /></ProtectedRoute>} />
        <Route path="/employer/roles/:roleId/edit" element={<ProtectedRoute allowedUserTypes={['employer']}><RoleForm /></ProtectedRoute>} />
        <Route path="/employer/roles/:roleId/fill" element={<ProtectedRoute allowedUserTypes={['employer']}><FillPositions /></ProtectedRoute>} />
        <Route path="/employer/roles/:roleId/candidates" element={<ProtectedRoute allowedUserTypes={['employer']}><RoleCandidates /></ProtectedRoute>} />
        <Route path="/employer/shifts/create" element={<ProtectedRoute allowedUserTypes={['employer']}><CreateShift /></ProtectedRoute>} />
        <Route path="/employer/shifts/:shiftId" element={<ProtectedRoute allowedUserTypes={['employer']}><ShiftDetail /></ProtectedRoute>} />
        <Route path="/employer/shifts/:shiftId/attendance" element={<ProtectedRoute allowedUserTypes={['employer']}><ShiftAttendance /></ProtectedRoute>} />
        <Route path="/employer/timesheets" element={<ProtectedRoute allowedUserTypes={['employer']}><Timesheets /></ProtectedRoute>} />
        <Route path="/employer/tasks" element={<ProtectedRoute allowedUserTypes={['employer']}><ManageTasks /></ProtectedRoute>} />
        <Route path="/employer/shift-calendar" element={<ProtectedRoute allowedUserTypes={['employer']}><ShiftCalendar /></ProtectedRoute>} />
        <Route path="/employer/shift-scheduler" element={<ProtectedRoute allowedUserTypes={['employer']}><ShiftScheduler /></ProtectedRoute>} />
        <Route path="/employer/calendar-scheduling" element={<ProtectedRoute allowedUserTypes={['employer']}><CalendarScheduling /></ProtectedRoute>} />
        <Route path="/employer/workforce-management" element={<ProtectedRoute allowedUserTypes={['employer']}><WorkforceManagement /></ProtectedRoute>} />
        <Route path="/employer/rosters" element={<ProtectedRoute allowedUserTypes={['employer']}><RosterManagement /></ProtectedRoute>} />
        <Route path="/employer/rosters/:rosterId" element={<ProtectedRoute allowedUserTypes={['employer']}><RosterDetail /></ProtectedRoute>} />
        <Route path="/employer/messages" element={<ProtectedRoute allowedUserTypes={['employer']}><Messages /></ProtectedRoute>} />
        <Route path="/employer/notifications" element={<ProtectedRoute allowedUserTypes={['employer']}><Notifications /></ProtectedRoute>} />
        <Route path="/employer/settings" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerSettings /></ProtectedRoute>} />
        <Route path="/employer/documents" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerDocuments /></ProtectedRoute>} />
        <Route path="/employer/time-off" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerTimeOffManagement /></ProtectedRoute>} />
        
        {/* Institution Routes */}
        <Route path="/institution/dashboard" element={<ProtectedRoute allowedUserTypes={['institution']}><InstitutionDashboard /></ProtectedRoute>} />
        <Route path="/institution/templates" element={<ProtectedRoute allowedUserTypes={['institution']}><ClassTemplates /></ProtectedRoute>} />
        <Route path="/institution/classes" element={<ProtectedRoute allowedUserTypes={['institution']}><ClassesManagement /></ProtectedRoute>} />
        <Route path="/institution/classes/create" element={<ProtectedRoute allowedUserTypes={['institution']}><ClassesManagement /></ProtectedRoute>} />
        <Route path="/institution/classes/:classId" element={<ProtectedRoute allowedUserTypes={['institution']}><ClassDetails /></ProtectedRoute>} />
        <Route path="/institution/verification-requests" element={<ProtectedRoute allowedUserTypes={['institution']}><VerificationRequests /></ProtectedRoute>} />
        <Route path="/institution/credentials" element={<ProtectedRoute allowedUserTypes={['institution']}><ManageCredentials /></ProtectedRoute>} />
        <Route path="/institution/credentials/issue" element={<ProtectedRoute allowedUserTypes={['institution']}><IssueCredential /></ProtectedRoute>} />
        <Route path="/institution/students/invite" element={<ProtectedRoute allowedUserTypes={['institution']}><BulkInvite /></ProtectedRoute>} />
        <Route path="/institution/transcripts" element={<ProtectedRoute allowedUserTypes={['institution']}><TranscriptsManagement /></ProtectedRoute>} />
        <Route path="/institution/messages" element={<ProtectedRoute allowedUserTypes={['institution']}><Messages /></ProtectedRoute>} />
        <Route path="/institution/notifications" element={<ProtectedRoute allowedUserTypes={['institution']}><Notifications /></ProtectedRoute>} />
        <Route path="/institution/settings" element={<ProtectedRoute allowedUserTypes={['institution']}><InstitutionSettings /></ProtectedRoute>} />
        <Route path="/institution/documents" element={<ProtectedRoute allowedUserTypes={['institution']}><InstitutionDocuments /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedUserTypes={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/minimum-wage" element={<ProtectedRoute allowedUserTypes={['admin']}><MinimumWageManager /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute allowedUserTypes={['admin']}><Analytics /></ProtectedRoute>} />
        <Route path="/admin/document-review" element={<ProtectedRoute allowedUserTypes={['admin']}><DocumentReview /></ProtectedRoute>} />
        <Route path="/admin/manage-admins" element={<ProtectedRoute allowedUserTypes={['admin']}><ManageAdmins /></ProtectedRoute>} />
        <Route path="/admin/manage-zones" element={<ProtectedRoute allowedUserTypes={['admin']}><ManageZones /></ProtectedRoute>} />
        <Route path="/admin/manage-credentials" element={<ProtectedRoute allowedUserTypes={['admin']}><AdminManageCredentials /></ProtectedRoute>} />
        <Route path="/admin/occupation-certifications" element={<ProtectedRoute allowedUserTypes={['admin']}><ManageOccupationCertifications /></ProtectedRoute>} />
        <Route path="/admin/wsib-verification" element={<ProtectedRoute allowedUserTypes={['admin']}><WSIBVerification /></ProtectedRoute>} />
        <Route path="/admin/manage-occupations" element={<ProtectedRoute allowedUserTypes={['admin']}><ManageOccupations /></ProtectedRoute>} />
        <Route path="/admin/manage-certifications" element={<ProtectedRoute allowedUserTypes={['admin']}><ManageCertifications /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute allowedUserTypes={['admin']}><AdminSettings /></ProtectedRoute>} />
        
        {/* Super Admin Routes */}
        <Route path="/admin/super-dashboard" element={<ProtectedRoute allowedUserTypes={['admin']}><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/activity" element={<ProtectedRoute allowedUserTypes={['admin']}><ActivityFeed /></ProtectedRoute>} />
        <Route path="/admin/pending-activations" element={<ProtectedRoute allowedUserTypes={['admin']}><PendingActivations /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedUserTypes={['admin']}><AllUsers /></ProtectedRoute>} />
        <Route path="/admin/credentials" element={<ProtectedRoute allowedUserTypes={['admin']}><CredentialReviews /></ProtectedRoute>} />
        <Route path="/admin/documents" element={<ProtectedRoute allowedUserTypes={['admin']}><DocumentVerification /></ProtectedRoute>} />
        <Route path="/admin/admins" element={<ProtectedRoute allowedUserTypes={['admin']}><AdminManagement /></ProtectedRoute>} />
        <Route path="/admin/roles" element={<ProtectedRoute allowedUserTypes={['admin']}><RoleManagement /></ProtectedRoute>} />
        <Route path="/admin/permissions" element={<ProtectedRoute allowedUserTypes={['admin']}><Permissions /></ProtectedRoute>} />
        <Route path="/admin/zones" element={<ProtectedRoute allowedUserTypes={['admin']}><ZoneManagement /></ProtectedRoute>} />
        <Route path="/admin/regional-stats" element={<ProtectedRoute allowedUserTypes={['admin']}><RegionalDashboard /></ProtectedRoute>} />
        <Route path="/admin/franchises" element={<ProtectedRoute allowedUserTypes={['admin']}><FranchiseManagement /></ProtectedRoute>} />
        <Route path="/admin/employers" element={<ProtectedRoute allowedUserTypes={['admin']}><EmployersList /></ProtectedRoute>} />
        <Route path="/admin/institutions" element={<ProtectedRoute allowedUserTypes={['admin']}><InstitutionsList /></ProtectedRoute>} />
        <Route path="/admin/support-tickets" element={<ProtectedRoute allowedUserTypes={['admin']}><SupportTickets /></ProtectedRoute>} />
        <Route path="/admin/reported-issues" element={<ProtectedRoute allowedUserTypes={['admin']}><ReportedIssues /></ProtectedRoute>} />
        <Route path="/admin/audit-logs" element={<ProtectedRoute allowedUserTypes={['admin']}><AuditLogs /></ProtectedRoute>} />
        <Route path="/admin/notification-settings" element={<ProtectedRoute allowedUserTypes={['admin']}><NotificationSettings /></ProtectedRoute>} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <EmmaChat />
      </>
    </ThemeProvider>
  );
}

// App wrapper with AuthProvider
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
