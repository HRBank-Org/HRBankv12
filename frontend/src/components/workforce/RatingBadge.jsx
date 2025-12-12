import React from 'react';

const RatingBadge = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-gray-600">{label}</span>
    <div className="flex items-center gap-1">
      <span className="text-sm font-semibold text-gray-900">{value.toFixed(1)}</span>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-xs ${star <= Math.round(value) ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default RatingBadge;