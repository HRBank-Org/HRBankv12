import React, { useState } from 'react';
import { FiX, FiStar } from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';

const RatingModal = ({ isOpen, onClose, shift, onSuccess }) => {
  const theme = useTheme();
  const [ratings, setRatings] = useState({
    technical_skills: 0,
    communication: 0,
    quality_of_work: 0,
    timeliness: 0,
    professionalism: 0,
    teamwork: 0
  });
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !shift) return null;

  const categories = [
    { key: 'technical_skills', label: 'Technical Skills', description: 'Job-specific skills and expertise' },
    { key: 'communication', label: 'Communication', description: 'Clear and effective communication' },
    { key: 'quality_of_work', label: 'Quality of Work', description: 'Attention to detail and accuracy' },
    { key: 'timeliness', label: 'Timeliness', description: 'Punctuality and meeting deadlines' },
    { key: 'professionalism', label: 'Professionalism', description: 'Professional behavior and attitude' },
    { key: 'teamwork', label: 'Teamwork', description: 'Collaboration and team spirit' }
  ];

  const handleRatingClick = (category, value) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const isComplete = Object.values(ratings).every(r => r > 0);

  const handleSubmit = async () => {
    if (!isComplete) {
      alert('Please rate all categories');
      return;
    }

    setSubmitting(true);
    try {
      await onSuccess({
        shift_id: shift.shift_id,
        worker_id: shift.worker_id,
        worker_ratings: ratings,
        worker_comments: comments || null
      });
      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = isComplete ? (Object.values(ratings).reduce((a, b) => a + b, 0) / 6).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">Rate Worker Performance</h2>
            <p className="text-sm text-gray-600 mt-1">
              {shift.worker_name} • {shift.position_title} • {new Date(shift.shift_date).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Overall Rating Display */}
          {isComplete && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="text-4xl font-bold" style={{ color: theme.primaryColor }}>
                {avgRating}
              </div>
              <div className="text-sm text-gray-600 mt-1">Average Rating</div>
            </div>
          )}

          {/* Rating Categories */}
          <div className="space-y-4 mb-6">
            {categories.map(category => (
              <div key={category.key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{category.label}</div>
                    <div className="text-xs text-gray-500">{category.description}</div>
                  </div>
                  {ratings[category.key] > 0 && (
                    <div className="px-2 py-1 rounded text-sm font-semibold"
                      style={{ backgroundColor: `${theme.primaryColor}20`, color: theme.primaryColor }}>
                      {ratings[category.key]}/5
                    </div>
                  )}
                </div>
                
                {/* Star Rating */}
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      onClick={() => handleRatingClick(category.key, value)}
                      className="p-2 hover:scale-110 transition-transform"
                    >
                      <FiStar
                        className={`w-8 h-8 ${
                          ratings[category.key] >= value
                            ? 'fill-current'
                            : 'fill-none'
                        }`}
                        style={{ 
                          color: ratings[category.key] >= value ? theme.primaryColor : '#D1D5DB',
                          stroke: ratings[category.key] >= value ? theme.primaryColor : '#9CA3AF'
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Comments */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share specific feedback or highlights from this shift..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent resize-none"
              style={{ focusRing: `${theme.primaryColor}40` }}
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isComplete || submitting}
              className="flex-1 px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
