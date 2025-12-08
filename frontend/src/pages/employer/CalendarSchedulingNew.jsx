import React from 'react';
import UserHeader from '../../components/common/UserHeader';
import CalendarView from '../../components/scheduling/CalendarView';

const CalendarScheduling = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <CalendarView embedded={false} />
    </div>
  );
};

export default CalendarScheduling;
