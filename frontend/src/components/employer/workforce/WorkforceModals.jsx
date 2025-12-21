import React, { useState } from 'react';
import api from '../../../utils/api';
import { FiX, FiAlertTriangle, FiCheckCircle, FiUserPlus } from 'react-icons/fi';
import WorkerInviteModal from '../WorkerInviteModal';

const InviteModalWrapper = ({ isOpen, onClose, onSuccess, roles, workplaces, selectedRole, selectedWorkplace, theme }) => {
  const [step, setStep] = useState(selectedRole && selectedWorkplace ? 'invite' : 'select');
  const [chosenRole, setChosenRole] = useState(selectedRole);
  const [chosenWorkplace, setChosenWorkplace] = useState(selectedWorkplace);
  
  // Filter roles based on selected workplace
  const filteredRoles = chosenWorkplace 
    ? roles.filter(r => r.workplace_id === chosenWorkplace.workplace_id)
    : roles;
    
  if (!isOpen) return null;
  
  if (step === 'select') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: theme.primaryColor }}>
            <h2 className="text-xl font-bold text-white">Select Position to Fill</h2>
            <p className="text-white text-opacity-80 text-sm">Choose a workplace and role for new workers</p>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Workplace Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Workplace</label>
              <select
                value={chosenWorkplace?.workplace_id || ''}
                onChange={(e) => {
                  const wp = workplaces.find(w => w.workplace_id === e.target.value);
                  setChosenWorkplace(wp);
                  setChosenRole(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
              >
                <option value="">Select a workplace...</option>
                {workplaces.map(wp => (
                  <option key={wp.workplace_id} value={wp.workplace_id}>
                    {wp.name || wp.workplace_name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Role Selection */}
            {chosenWorkplace && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                {filteredRoles.length === 0 ? (
                  <p className="text-sm text-gray-500">No roles found for this workplace. Please create roles first.</p>
                ) : (
                  <select
                    value={chosenRole?.role_id || ''}
                    onChange={(e) => {
                      const role = filteredRoles.find(r => r.role_id === e.target.value);
                      setChosenRole(role);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  >
                    <option value="">Select a role...</option>
                    {filteredRoles.map(role => (
                      <option key={role.role_id} value={role.role_id}>
                        {role.role_name} - ${role.hourly_rate?.toFixed(2)}/hr
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex justify-between">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep('invite')}
              disabled={!chosenRole || !chosenWorkplace}
              className="px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show the actual invite modal
  return (
    <WorkerInviteModal
      isOpen={true}
      onClose={onClose}
      role={{ role_id: chosenRole.role_id, title: chosenRole.role_name }}
      workplace={{ workplace_id: chosenWorkplace.workplace_id, name: chosenWorkplace.name || chosenWorkplace.workplace_name }}
    />
  );
};


const TerminateModal = ({ worker, onClose, onSuccess, theme }) => {
  const isLayoff = worker.actionType === 'layoff';
  
  const [formData, setFormData] = useState({
    termination_reason: isLayoff ? 'laid_off' : 'terminated_cause',
    termination_notes: '',
    last_working_day: new Date().toISOString().split('T')[0],
    eligible_for_rehire: isLayoff ? true : false,
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
      setError(err.response?.data?.detail || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className={`text-lg font-semibold mb-2 ${isLayoff ? 'text-amber-700' : 'text-red-700'}`}>
          {isLayoff ? '📋 Lay Off' : '⚠️ Terminate'} - {worker.full_name}
        </h3>
        
        {/* EI Eligibility Notice */}
        <div className={`p-3 rounded-lg mb-4 text-sm ${isLayoff ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
          {isLayoff ? (
            <div className="text-amber-800">
              <strong>Lay Off (No Fault)</strong>
              <p className="mt-1">Worker will be eligible for Employment Insurance (EI) benefits. ROE will show "Shortage of work" as separation reason.</p>
              <p className="mt-1 text-xs">Worker will be added to the match engine for new job opportunities.</p>
            </div>
          ) : (
            <div className="text-red-800">
              <strong>Termination for Cause</strong>
              <p className="mt-1">Worker may NOT be eligible for EI benefits. ROE will show "Dismissed" as separation reason. Service Canada may investigate.</p>
              <p className="mt-1 text-xs">Worker will be added to the match engine for new job opportunities.</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <select
              value={formData.termination_reason}
              onChange={(e) => setFormData({ ...formData, termination_reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{ focusRingColor: theme.primaryColor }}
            >
              {isLayoff ? (
                <>
                  <option value="laid_off">Laid Off - Shortage of Work</option>
                  <option value="contract_ended">Contract Ended</option>
                  <option value="business_closure">Business Closure</option>
                  <option value="seasonal_end">Seasonal Position Ended</option>
                </>
              ) : (
                <>
                  <option value="terminated_cause">Terminated - Misconduct</option>
                  <option value="terminated_performance">Terminated - Poor Performance</option>
                  <option value="policy_violation">Policy Violation</option>
                  <option value="no_show">Job Abandonment / No Show</option>
                </>
              )}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes {isLayoff ? '(Optional)' : '(Required for documentation)'}
            </label>
            <textarea
              value={formData.termination_notes}
              onChange={(e) => setFormData({ ...formData, termination_notes: e.target.value })}
              rows={3}
              required={!isLayoff}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder={isLayoff 
                ? "Optional: Reason for layoff..." 
                : "Document the reason for termination (required for ROE and potential disputes)..."
              }
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
              <span className="text-sm text-gray-700">Notify worker via email</span>
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
              className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                isLayoff 
                  ? 'bg-amber-600 hover:bg-amber-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Processing...' : (isLayoff ? 'Confirm Lay Off' : 'Confirm Termination')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


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


export { InviteModalWrapper, TerminateModal, RehireModal };
