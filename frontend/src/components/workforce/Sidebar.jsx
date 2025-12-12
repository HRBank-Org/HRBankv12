import React from 'react';
import { FiCheckCircle } from 'react-icons/fi';

const Sidebar = ({ profile, theme }) => {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const availability = profile?.availability || [];
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">⏰ Availability</h3>
      
      <div className="space-y-2">
        {daysOfWeek.map((day) => {
          const isAvailable = availability.includes(day);
          return (
            <div
              key={day}
              className={`flex items-center justify-between p-3 rounded-lg ${
                isAvailable 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <span className={`text-sm font-medium ${isAvailable ? 'text-green-900' : 'text-gray-500'}`}>
                {day}
              </span>
              {isAvailable ? (
                <FiCheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs text-blue-700 mb-1">Weekly Availability</div>
        <div className="text-2xl font-bold text-blue-900">{availability.length}/7</div>
        <div className="text-xs text-blue-600 mt-1">days available</div>
      </div>
    </div>
  );
};

export default Sidebar;