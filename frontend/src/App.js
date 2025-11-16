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
import ForgotPassword from './pages/ForgotPassword';

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
import ShiftCalendar from './pages/employer/ShiftCalendar';
import EmploymentHistory from './pages/workforce/EmploymentHistory';
import Messages from './pages/common/Messages';
import Notifications from './pages/common/Notifications';
import Settings from './pages/common/Settings';
import DocumentReview from './pages/admin/DocumentReview';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageAdmins from './pages/admin/ManageAdmins';
import ManageZones from './pages/admin/ManageZones';
import Analytics from './pages/admin/Analytics';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import TermsOfService from './pages/legal/TermsOfService';
import WorkforceCalendar from './pages/workforce/WorkforceCalendar';

// Employer pages
import EmployerDashboard from './pages/employer/Dashboard';
import EmployerProfile from './pages/employer/Profile';
import EmployerOnboarding from './pages/employer/Onboarding';
import WorkplaceSetup from './pages/employer/WorkplaceSetup';
import Workplaces from './pages/employer/Workplaces';
import WorkplaceDetail from './pages/employer/WorkplaceDetail';
import EditWorkplace from './pages/employer/EditWorkplace';
import PostJob from './pages/employer/PostJob';
import CreateShift from './pages/employer/CreateShift';
import ShiftDetail from './pages/employer/ShiftDetail';
import ShiftAttendance from './pages/employer/ShiftAttendance';
import Timesheets from './pages/employer/Timesheets';
import ManageTasks from './pages/employer/ManageTasks';
import WorkforceManagement from './pages/employer/WorkforceManagement';

// Institution pages
import InstitutionDashboard from './pages/institution/Dashboard';
import InstitutionSettings from './pages/InstitutionSettings';
import IssueCredential from './pages/institution/IssueCredential';
import ManageCredentials from './pages/institution/ManageCredentials';
import VerificationQueue from './pages/institution/VerificationQueue';
import BulkInvite from './pages/institution/BulkInvite';

import { Toaster } from './components/ui/toaster';
import EULAModal from './components/common/EULAModal';

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
    const isAdminRoute = window.location.pathname.startsWith('/admin');
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
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
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
        <Route path="/workforce/profile" element={<ProtectedRoute allowedUserTypes={['workforce']}><WorkforceProfile /></ProtectedRoute>} />
        <Route path="/workforce/occupations" element={<ProtectedRoute allowedUserTypes={['workforce']}><OccupationProfiles /></ProtectedRoute>} />
        <Route path="/workforce/occupations/create" element={<ProtectedRoute allowedUserTypes={['workforce']}><CreateOccupation /></ProtectedRoute>} />
        <Route path="/workforce/occupations/:occupationId" element={<ProtectedRoute allowedUserTypes={['workforce']}><OccupationDetail /></ProtectedRoute>} />
        <Route path="/workforce/certifications/add" element={<ProtectedRoute allowedUserTypes={['workforce']}><AddCertification /></ProtectedRoute>} />
        <Route path="/workforce/availability" element={<ProtectedRoute allowedUserTypes={['workforce']}><Availability /></ProtectedRoute>} />
        <Route path="/workforce/availability-calendar" element={<ProtectedRoute allowedUserTypes={['workforce']}><AvailabilityCalendar /></ProtectedRoute>} />
        <Route path="/workforce/clock" element={<ProtectedRoute allowedUserTypes={['workforce']}><ClockInOut /></ProtectedRoute>} />
        <Route path="/workforce/employment-history" element={<ProtectedRoute allowedUserTypes={['workforce']}><EmploymentHistory /></ProtectedRoute>} />
        <Route path="/workforce/messages" element={<ProtectedRoute allowedUserTypes={['workforce']}><Messages /></ProtectedRoute>} />
        <Route path="/workforce/notifications" element={<ProtectedRoute allowedUserTypes={['workforce']}><Notifications /></ProtectedRoute>} />
        <Route path="/workforce/settings" element={<ProtectedRoute allowedUserTypes={['workforce']}><Settings /></ProtectedRoute>} />
        
        {/* Employer Routes */}
        <Route path="/employer/onboarding" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerOnboarding /></ProtectedRoute>} />
        <Route path="/employer/dashboard" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerDashboard /></ProtectedRoute>} />
        <Route path="/employer/profile" element={<ProtectedRoute allowedUserTypes={['employer']}><EmployerProfile /></ProtectedRoute>} />
        <Route path="/employer/workplace-setup" element={<ProtectedRoute allowedUserTypes={['employer']}><WorkplaceSetup /></ProtectedRoute>} />
        <Route path="/employer/workplaces" element={<ProtectedRoute allowedUserTypes={['employer']}><Workplaces /></ProtectedRoute>} />
        <Route path="/employer/workplaces/:workplaceId" element={<ProtectedRoute allowedUserTypes={['employer']}><WorkplaceDetail /></ProtectedRoute>} />
        <Route path="/employer/workplaces/:workplaceId/edit" element={<ProtectedRoute allowedUserTypes={['employer']}><EditWorkplace /></ProtectedRoute>} />
        <Route path="/employer/jobs/post" element={<ProtectedRoute allowedUserTypes={['employer']}><PostJob /></ProtectedRoute>} />
        <Route path="/employer/shifts/create" element={<ProtectedRoute allowedUserTypes={['employer']}><CreateShift /></ProtectedRoute>} />
        <Route path="/employer/shifts/:shiftId" element={<ProtectedRoute allowedUserTypes={['employer']}><ShiftDetail /></ProtectedRoute>} />
        <Route path="/employer/shifts/:shiftId/attendance" element={<ProtectedRoute allowedUserTypes={['employer']}><ShiftAttendance /></ProtectedRoute>} />
        <Route path="/employer/timesheets" element={<ProtectedRoute allowedUserTypes={['employer']}><Timesheets /></ProtectedRoute>} />
        <Route path="/employer/tasks" element={<ProtectedRoute allowedUserTypes={['employer']}><ManageTasks /></ProtectedRoute>} />
        <Route path="/employer/shift-calendar" element={<ProtectedRoute allowedUserTypes={['employer']}><ShiftCalendar /></ProtectedRoute>} />
        <Route path="/employer/workforce-management" element={<ProtectedRoute allowedUserTypes={['employer']}><WorkforceManagement /></ProtectedRoute>} />
        <Route path="/employer/messages" element={<ProtectedRoute allowedUserTypes={['employer']}><Messages /></ProtectedRoute>} />
        <Route path="/employer/notifications" element={<ProtectedRoute allowedUserTypes={['employer']}><Notifications /></ProtectedRoute>} />
        <Route path="/employer/settings" element={<ProtectedRoute allowedUserTypes={['employer']}><Settings /></ProtectedRoute>} />
        
        {/* Institution Routes */}
        <Route path="/institution/dashboard" element={<ProtectedRoute allowedUserTypes={['institution']}><InstitutionDashboard /></ProtectedRoute>} />
        <Route path="/institution/messages" element={<ProtectedRoute allowedUserTypes={['institution']}><Messages /></ProtectedRoute>} />
        <Route path="/institution/notifications" element={<ProtectedRoute allowedUserTypes={['institution']}><Notifications /></ProtectedRoute>} />
        <Route path="/institution/settings" element={<ProtectedRoute allowedUserTypes={['institution']}><Settings /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedUserTypes={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute allowedUserTypes={['admin']}><Analytics /></ProtectedRoute>} />
        <Route path="/admin/document-review" element={<ProtectedRoute allowedUserTypes={['admin']}><DocumentReview /></ProtectedRoute>} />
        <Route path="/admin/manage-admins" element={<ProtectedRoute allowedUserTypes={['admin']}><ManageAdmins /></ProtectedRoute>} />
        <Route path="/admin/manage-zones" element={<ProtectedRoute allowedUserTypes={['admin']}><ManageZones /></ProtectedRoute>} />
        <Route path="/institution/settings" element={<ProtectedRoute allowedUserTypes={['institution']}><InstitutionSettings /></ProtectedRoute>} />
        <Route path="/institution/credentials/issue" element={<ProtectedRoute allowedUserTypes={['institution']}><IssueCredential /></ProtectedRoute>} />
        <Route path="/institution/credentials/manage" element={<ProtectedRoute allowedUserTypes={['institution']}><ManageCredentials /></ProtectedRoute>} />
        <Route path="/institution/verification-queue" element={<ProtectedRoute allowedUserTypes={['institution']}><VerificationQueue /></ProtectedRoute>} />
        <Route path="/institution/bulk-invite" element={<ProtectedRoute allowedUserTypes={['institution']}><BulkInvite /></ProtectedRoute>} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
