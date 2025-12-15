import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';

const WorkforceManagement = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showRehireModal, setShowRehireModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadWorkers();
  }, [activeTab]);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'active' 
        ? '/api/employer/workforce-management/active'
        : '/api/employer/workforce-management/inactive';
      
      const response = await api.get(endpoint);
      const workersList = activeTab === 'active' 
        ? response.data.data.active_workers 
        : response.data.data.inactive_workers;
      
      setWorkers(workersList);
    } catch (error) {
      console.error('Failed to load workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = (worker) => {
    setSelectedWorker(worker);
    setShowTerminateModal(true);
  };

  const handleRehire = (worker) => {
    setSelectedWorker(worker);
    setShowRehireModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <ModernSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Page Title */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">Manage your workforce and view worker details</p>
        </div>

        <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'active'
                ? 'border-b-2 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ borderColor: activeTab === 'active' ? theme.primaryColor : 'transparent' }}
          >
            Active Workers
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'inactive'
                ? 'border-b-2 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ borderColor: activeTab === 'inactive' ? theme.primaryColor : 'transparent' }}
          >
            Past Workers
          </button>
        </div>

        {/* Workers List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
          </div>
        ) : workers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">
              {activeTab === 'active' ? 'No active workers' : 'No past workers'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map((worker) => (
              <div key={worker.user_id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {worker.profile_picture ? (
                        <img src={worker.profile_picture} alt={worker.full_name} className="w-12 h-12 rounded-full" />
                      ) : (
                        <span className="text-xl font-bold text-gray-600">
                          {worker.full_name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{worker.full_name}</h3>
                      <p className="text-sm text-gray-500">{worker.position_title || worker.employment_type}</p>
                    </div>
                  </div>
                  {activeTab === 'inactive' && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      worker.eligible_for_rehire 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {worker.eligible_for_rehire ? 'Eligible' : 'Not Eligible'}
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Shifts Completed:</span>
                    <span className="font-medium">{worker.total_shifts_completed || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Hours Worked:</span>
                    <span className="font-medium">{worker.total_hours_worked?.toFixed(1) || 0}h</span>
                  </div>
                  {worker.average_rating && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Rating:</span>
                      <span className="font-medium">⭐ {worker.average_rating.toFixed(1)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Since:</span>
                    <span className="font-medium">
                      {new Date(worker.employment_start_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {activeTab === 'inactive' && worker.termination_reason && (
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        <strong>Reason:</strong> {worker.termination_reason.replace(/_/g, ' ')}
                      </p>
                      {worker.employment_end_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          <strong>Ended:</strong> {new Date(worker.employment_end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {activeTab === 'active' ? (
                  <button
                    onClick={() => handleTerminate(worker)}
                    className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    End Employment
                  </button>
                ) : (
                  worker.eligible_for_rehire && (
                    <button
                      onClick={() => handleRehire(worker)}
                      className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      Rehire
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Terminate Modal */}
      {showTerminateModal && selectedWorker && (
        <TerminateModal
          worker={selectedWorker}
          onClose={() => {
            setShowTerminateModal(false);
            setSelectedWorker(null);
          }}
          onSuccess={() => {
            setShowTerminateModal(false);
            setSelectedWorker(null);
            loadWorkers();
          }}
          theme={theme}
        />
      )}

      {/* Rehire Modal */}
      {showRehireModal && selectedWorker && (
        <RehireModal
          worker={selectedWorker}
          onClose={() => {
            setShowRehireModal(false);
            setSelectedWorker(null);
          }}
          onSuccess={() => {
            setShowRehireModal(false);
            setSelectedWorker(null);
            loadWorkers();
          }}
          theme={theme}
        />
      )}
    </div>
  );
};

// Terminate Modal Component
const TerminateModal = ({ worker, onClose, onSuccess, theme }) => {
  const [formData, setFormData] = useState({
    termination_reason: 'contract_ended',
    termination_notes: '',
    last_working_day: new Date().toISOString().split('T')[0],
    eligible_for_rehire: true,
    cancel_future_shifts: true,
    notify_worker: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/api/employer/workforce-management/${worker.user_id}/terminate`, formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to terminate employment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">End Employment - {worker.full_name}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <select
              value={formData.termination_reason}
              onChange={(e) => setFormData({ ...formData, termination_reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{ focusRingColor: theme.primaryColor }}
            >
              <option value="contract_ended">Contract Ended</option>
              <option value="laid_off">Laid Off</option>
              <option value="terminated_cause">Terminated (Cause)</option>
              <option value="resigned">Resigned</option>
              <option value="mutual_agreement">Mutual Agreement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Day</label>
            <input
              type="date"
              value={formData.last_working_day}
              onChange={(e) => setFormData({ ...formData, last_working_day: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.termination_notes}
              onChange={(e) => setFormData({ ...formData, termination_notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="Additional details..."
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.cancel_future_shifts}
                onChange={(e) => setFormData({ ...formData, cancel_future_shifts: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Cancel all future shifts</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.eligible_for_rehire}
                onChange={(e) => setFormData({ ...formData, eligible_for_rehire: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Eligible for rehire</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.notify_worker}
                onChange={(e) => setFormData({ ...formData, notify_worker: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Notify worker</span>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'End Employment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Rehire Modal Component
const RehireModal = ({ worker, onClose, onSuccess, theme }) => {
  const [formData, setFormData] = useState({
    employment_type: 'contract',
    position_title: worker.position_title || '',
    rehire_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/api/employer/workforce-management/${worker.user_id}/rehire`, formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to rehire worker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Rehire - {worker.full_name}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
            <select
              value={formData.employment_type}
              onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            >
              <option value="contract">Contract</option>
              <option value="part_time">Part Time</option>
              <option value="full_time">Full Time</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position Title</label>
            <input
              type="text"
              value={formData.position_title}
              onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="e.g., Server, Chef, Manager"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.rehire_notes}
              onChange={(e) => setFormData({ ...formData, rehire_notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="Welcome back message or additional details..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {loading ? 'Processing...' : 'Rehire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkforceManagement;
