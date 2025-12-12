import React from 'react';

const SkillRating = ({ label, value }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-700">{label}</span>
    <div className="flex items-center gap-2">
      <div className="w-32 bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: `${(value / 5) * 100}%` }}
        ></div>
      </div>
      <span className="text-sm font-semibold text-gray-900 w-8">{value}</span>
    </div>
  </div>
);

export default SkillRating;