import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const RateEmployer = ({ booking, onComplete, onCancel }) => {
  const [ratings, setRatings] = useState({
    communication: 5,
    management_support: 5,
    work_environment: 5,
    respect_and_inclusivity: 5,
    pay_and_benefits: 5,
    workplace_safety: 5,
    comments: ''
  });
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const categories = [
    { key: 'communication', label: 'Communication' },
    { key: 'management_support', label: 'Management Support' },
    { key: 'work_environment', label: 'Work Environment' },
    { key: 'respect_and_inclusivity', label: 'Respect & Inclusivity' },
    { key: 'pay_and_benefits', label: 'Pay & Benefits' },
    { key: 'workplace_safety', label: 'Workplace Safety' }
  ];

  const overall = Object.values(ratings).slice(0, 6).reduce((sum, val) => sum + val, 0) / 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post(`/api/ratings/employer/${booking.booking_id}`, ratings);
      onComplete();
    } catch (error) {
      alert(error.response?.data?.error?.detail || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Rate Your Experience</h2>
          <p className="text-sm text-gray-600 mt-1">
            {booking.role_title} • {new Date(booking.shift_date).toLocaleDateString()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Rating Categories */}
          {categories.map((cat) => (
            <div key={cat.key}>
              <label className="block text-sm font-medium text-gray-700 mb-3">{cat.label}</label>
              <div className="flex items-center gap-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatings({...ratings, [cat.key]: star})}
                    className="text-3xl transition-all hover:scale-110"
                  >
                    {star <= ratings[cat.key] ? '⭐' : '☆'}
                  </button>
                ))}
                <span className="text-sm font-medium text-gray-600 ml-2">
                  {ratings[cat.key]}/5
                </span>
              </div>
            </div>
          ))}

          {/* Overall Rating Display */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Overall Rating:</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                  {overall.toFixed(2)}
                </span>
                <span className="text-yellow-500 text-2xl">⭐</span>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments (Optional)
            </label>
            <textarea
              value={ratings.comments}
              onChange={(e) => setRatings({...ratings, comments: e.target.value})}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
              placeholder="Share your experience working with this employer..."
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{ratings.comments.length}/500 characters</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RateEmployer;
