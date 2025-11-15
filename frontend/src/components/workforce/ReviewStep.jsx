import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ReviewStep = ({ data, onBack, onComplete }) => {
  const theme = useTheme();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Profile</h2>
      <p className="text-gray-600 mb-6">Make sure everything looks good before completing</p>

      {/* Profile Summary */}
      <div className="space-y-6 mb-8">
        {/* Personal Info */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Personal Information</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Address:</span>
              <span className="text-sm font-medium text-gray-900">{data.address || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Postal Code:</span>
              <span className="text-sm font-medium text-gray-900">{data.postal_code || 'Not set'}</span>
            </div>
            {data.hourly_rate_preference && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Preferred Rate:</span>
                <span className="text-sm font-medium text-gray-900">${data.hourly_rate_preference}/hour</span>
              </div>
            )}
          </div>
        </div>

        {/* Skills */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Skills ({data.skills?.length || 0})</h3>
          <div className="flex flex-wrap gap-2">
            {data.skills?.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {skill}
              </span>
            )) || <span className="text-sm text-gray-500">No skills added</span>}
          </div>
        </div>

        {/* Availability */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Availability</h3>
          <div className="space-y-1">
            {DAYS.map(day => {
              const daySlots = data.availability_hours?.[day.toLowerCase()] || [];
              return (
                <div key={day} className="flex justify-between text-sm">
                  <span className="text-gray-600 w-24">{day}:</span>
                  <span className="text-gray-900 flex-1">
                    {daySlots.length > 0 ? daySlots.join(', ') : 'Not available'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Documents */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Documents ({data.documents?.length || 0})</h3>
          {data.documents?.length > 0 ? (
            <div className="space-y-2">
              {data.documents.map((doc, index) => (
                <div key={index} className="text-sm text-gray-600">
                  📄 {doc.name}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No documents uploaded</p>
          )}
        </div>
      </div>

      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-green-900">Profile Ready!</h4>
            <p className="text-sm text-green-700 mt-1">
              You can now start browsing jobs and applying for shifts. You can always update your profile later.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          className="px-8 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: theme.accentColor }}
        >
          Complete Profile ✓
        </button>
      </div>
    </div>
  );
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default ReviewStep;
