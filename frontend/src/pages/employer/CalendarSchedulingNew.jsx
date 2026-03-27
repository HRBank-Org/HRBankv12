import React from 'react';
import UserHeader from '../../components/common/UserHeader';
import CalendarView from '../../components/scheduling/CalendarView';

import { useLanguage } from '../../contexts/LanguageContext';

const CalendarScheduling = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <CalendarView embedded={false} />
    </div>
  );
};

export default CalendarScheduling;
