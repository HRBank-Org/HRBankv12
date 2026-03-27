import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLanguage } from '../../contexts/LanguageContext';

/**
 * ShiftCalendar - Redirect to New Calendar Scheduling System
 * 
 * This page now redirects to the new CalendarScheduling page.
 * The new system has all the features plus improved UI and functionality.
 */
const ShiftCalendar = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // Automatically redirect to new calendar scheduling page
  useEffect(() => {
    navigate('/employer/calendar-scheduling', { replace: true });
  }, [navigate]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-700 font-medium">Loading Calendar...</p>
        <p className="text-sm text-gray-500 mt-2">Redirecting to new scheduling system</p>
      </div>
    </div>
  );
};

export default ShiftCalendar;
