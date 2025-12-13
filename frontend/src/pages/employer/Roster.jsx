import React from 'react';
import ModernSidebar from '../../components/layout/ModernSidebar';
import CalendarView from '../../components/scheduling/CalendarView';

const Roster = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      
      {/* Main Content */}
      <div className="ml-[70px] transition-all duration-300">
        {/* Header */}
        <div className="px-8 py-6 bg-white shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Roster & Schedule</h1>
          <p className="text-gray-600 mt-1">
            Manage your workforce schedule and shift assignments
          </p>
        </div>

        {/* Calendar Content */}
        <div className="p-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <CalendarView />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Roster;
