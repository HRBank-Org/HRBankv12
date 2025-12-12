import React from 'react';
import { FiCheckCircle, FiX } from 'react-icons/fi';

const Sidebar = ({ profile, theme, onClose }) => {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const availability = profile?.availability || [];
  
  return (
    <div className="h-full bg-white p-6 overflow-y-auto">
      {/* Header with Close Button */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">⏰ Availability</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <FiX className="w-6 h-6 text-gray-600" />
        </button>
      </div>
      
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
      
      {/* Action Buttons */}
      <div className="mt-6 space-y-3">
        <button
          className="w-full py-3 rounded-lg text-white font-medium"
          style={{ backgroundColor: theme.primaryColor }}
        >
          Update Availability
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-100 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Sidebar;