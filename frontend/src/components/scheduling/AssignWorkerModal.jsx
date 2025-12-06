import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiUser, FiStar, FiMapPin, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import api from '../../utils/api';

const AssignWorkerModal = ({ isOpen, onClose, shift, onSuccess }) => {
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAvailableWorkers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = workers.filter(worker =>
        worker.worker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.positions.some(pos => pos.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredWorkers(filtered);
    } else {
      setFilteredWorkers(workers);
    }
  }, [searchQuery, workers]);

  const loadAvailableWorkers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/calendar/shifts/${shift.shift_id}/available-workers`);
      const workersData = response.data.data || [];
      setWorkers(workersData);
      setFilteredWorkers(workersData);
    } catch (err) {
      setError('Failed to load available workers');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignWorker = async (worker) => {
    setSubmitting(true);
    setError('');

    try {
      await api.post(`/api/calendar/shifts/${shift.shift_id}/assign`, {
        worker_id: worker.worker_id,
        worker_name: worker.worker_name,
        worker_photo: worker.worker_photo
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign worker');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Assign Worker</h3>
              <p className="text-blue-100 text-sm mt-1">
                {shift.position_title} - {shift.workplace_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search workers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Workers List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="text-center py-12">
                <FiUser className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">No available workers found</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredWorkers.map((worker) => (
                  <div
                    key={worker.worker_id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                    onClick={() => handleAssignWorker(worker)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {worker.worker_name.charAt(0)}
                        </div>

                        {/* Worker Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{worker.worker_name}</h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              worker.match_score >= 80 ? 'bg-green-100 text-green-700' :
                              worker.match_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {worker.match_score}% Match
                            </span>
                          </div>

                          {/* Positions */}
                          {worker.positions && worker.positions.length > 0 && (
                            <div className="text-sm text-gray-600 mb-2">
                              {worker.positions.slice(0, 2).join(', ')}
                            </div>
                          )}

                          {/* Skills */}
                          {worker.skills && worker.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {worker.skills.slice(0, 4).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                >
                                  {skill}
                                </span>
                              ))}
                              {worker.skills.length > 4 && (
                                <span className="px-2 py-1 text-xs text-gray-500">
                                  +{worker.skills.length - 4} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Certifications */}
                          {worker.certifications && worker.certifications.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <FiCheckCircle className="w-3 h-3" />
                              <span>{worker.certifications.length} certification{worker.certifications.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Assign Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignWorker(worker);
                        }}
                        disabled={submitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex-shrink-0"
                      >
                        {submitting ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex items-center justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignWorkerModal;
