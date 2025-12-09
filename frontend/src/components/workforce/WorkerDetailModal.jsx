import React, { useState, useEffect } from 'react';
import { FiX, FiStar, FiAward, FiClock, FiDollarSign, FiUser } from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const WorkerDetailModal = ({ isOpen, onClose, workerId }) => {
  const theme = useTheme();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && workerId) {
      loadWorkerDetails();
    }
  }, [isOpen, workerId]);

  const loadWorkerDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/employer/workforce-management/${workerId}/details`);
      setWorker(response.data.data);
    } catch (err) {
      console.error('Failed to load worker details:', err);
      setError('Failed to load worker details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Worker Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          )}

          {!loading && !error && worker && (
            <div className="space-y-6">
              {/* Profile Section */}
              <div className="flex items-start gap-6 pb-6 border-b border-gray-200">
                {/* Profile Picture */}
                <div className="flex-shrink-0">
                  {worker.photo_url ? (
                    <img
                      src={worker.photo_url}
                      alt={worker.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                    />
                  ) : (
                    <div
                      className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-4xl border-4 border-gray-200"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {worker.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{worker.name}</h3>
                  
                  {/* Occupation */}
                  <div className="flex items-center gap-2 mb-3">
                    <FiUser className="w-5 h-5 text-gray-500" />
                    <span className="text-lg text-gray-700 font-medium">
                      {worker.occupation || 'No occupation specified'}
                    </span>
                  </div>

                  {/* Experience */}
                  {worker.experience_years !== undefined && (
                    <div className="flex items-center gap-2 mb-3">
                      <FiClock className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-600">
                        {worker.experience_years} {worker.experience_years === 1 ? 'year' : 'years'} of experience
                      </span>
                    </div>
                  )}

                  {/* Pay Rate */}
                  {worker.hourly_rate && (
                    <div className="flex items-center gap-2 mb-3">
                      <FiDollarSign className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-600">
                        ${worker.hourly_rate}/hour
                      </span>
                    </div>
                  )}

                  {/* Hours Worked for You */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-sm text-blue-700 mb-1">Total Hours Worked</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {worker.total_hours_worked?.toFixed(1) || 0}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-sm text-green-700 mb-1">Shifts Completed</div>
                      <div className="text-2xl font-bold text-green-900">
                        {worker.total_shifts_completed || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ratings Section */}
              {worker.ratings && Object.keys(worker.ratings).length > 0 && (
                <div className="pb-6 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FiStar className="w-5 h-5" style={{ color: theme.primaryColor }} />
                    Performance Ratings
                  </h4>

                  {/* Overall Rating */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Overall Rating</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FiStar
                              key={star}
                              className={`w-5 h-5 ${
                                star <= (worker.average_rating || 0) ? 'fill-current' : ''
                              }`}
                              style={{
                                color: star <= (worker.average_rating || 0) ? theme.primaryColor : '#D1D5DB',
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xl font-bold" style={{ color: theme.primaryColor }}>
                          {worker.average_rating?.toFixed(1) || 'N/A'}
                        </span>
                        {worker.rating_count && (
                          <span className="text-sm text-gray-500">({worker.rating_count} ratings)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Individual Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(worker.ratings).map(([metric, value]) => (
                      <div key={metric} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <span className="text-gray-700 capitalize">
                          {metric.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FiStar
                                key={star}
                                className={`w-4 h-4 ${star <= value ? 'fill-current' : ''}`}
                                style={{
                                  color: star <= value ? '#FBBF24' : '#D1D5DB',
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{value.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Section */}
              {worker.skills && worker.skills.length > 0 && (
                <div className="pb-6 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {worker.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-2 rounded-lg text-sm font-medium"
                        style={{
                          backgroundColor: `${theme.primaryColor}20`,
                          color: theme.primaryColor,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications Section */}
              {worker.certifications && worker.certifications.length > 0 && (
                <div className="pb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FiAward className="w-5 h-5" style={{ color: theme.primaryColor }} />
                    Certifications
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {worker.certifications.map((cert, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <FiAward className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-green-900">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State if No Additional Info */}
              {(!worker.skills || worker.skills.length === 0) &&
                (!worker.certifications || worker.certifications.length === 0) &&
                (!worker.ratings || Object.keys(worker.ratings).length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <FiUser className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No additional information available for this worker.</p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-lg font-medium text-white hover:opacity-90 transition-all"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkerDetailModal;
