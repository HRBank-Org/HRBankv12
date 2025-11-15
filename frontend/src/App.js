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
import ClockInOut from './pages/workforce/ClockInOut';

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

// Institution pages
import InstitutionDashboard from './pages/institution/Dashboard';
import InstitutionSettings from './pages/InstitutionSettings';
import IssueCredential from './pages/institution/IssueCredential';
import ManageCredentials from './pages/institution/ManageCredentials';
import VerificationQueue from './pages/institution/VerificationQueue';
import BulkInvite from './pages/institution/BulkInvite';

import { Toaster } from './components/ui/toaster';

// Protected Route Component
const ProtectedRoute = ({ children, allowedUserTypes }) => {
  const { user, loading } = useAuth();

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
    return <Navigate to="/login" replace />;
  }

  if (allowedUserTypes && !allowedUserTypes.includes(user.user_type)) {
    return <Navigate to="/" replace />;
  }

  return children;
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
        
        {/* Workforce Routes */}
        <Route 
          path="/workforce/dashboard" 
          element={
            <ProtectedRoute allowedUserTypes={['workforce']}>
              <WorkforceDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Employer Routes */}
        <Route 
          path="/employer/dashboard" 
          element={
            <ProtectedRoute allowedUserTypes={['employer']}>
              <EmployerDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Institution Routes */}
        <Route 
          path="/institution/dashboard" 
          element={
            <ProtectedRoute allowedUserTypes={['institution']}>
              <InstitutionDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/institution/settings" 
          element={
            <ProtectedRoute allowedUserTypes={['institution']}>
              <InstitutionSettings />
            </ProtectedRoute>
          } 
        />
        
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
