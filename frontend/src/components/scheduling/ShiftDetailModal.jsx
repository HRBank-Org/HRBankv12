import React, { useState } from 'react';
import { FiX, FiClock, FiMapPin, FiUsers, FiDollarSign, FiTrash2, FiUserPlus, FiUserMinus, FiCopy, FiSave } from 'react-icons/fi';
import api from '../../utils/api';
import moment from 'moment';

const ShiftDetailModal = ({ isOpen, onClose, shift, onUpdate, onDelete, onAssignWorker, onCopyShift }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleDelete = async () => {
    console.log('🗑️ DELETE CLICKED - Shift ID:', shift.shift_id);
    
    if (!confirm('Are you sure you want to delete this shift? This action cannot be undone.')) {
      console.log('❌ Delete cancelled by user');
      return;
    }

    setLoading(true);
    setError('');
    
    const deleteUrl = `/api/employer/shifts/${shift.shift_id}`;
    console.log('🔄 Calling DELETE API:', deleteUrl);

    try {
      const response = await api.delete(deleteUrl);
      console.log('✅ DELETE SUCCESS:', response.data);
      setSuccessMessage('Shift deleted successfully!');
      setTimeout(() => {
        onDelete();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('❌ DELETE FAILED:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to delete shift');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignWorker = async (workerId) => {
    console.log('👤 UNASSIGN CLICKED - Worker ID:', workerId);
    
    if (!confirm('Remove this worker from the shift?')) {
      console.log('❌ Unassign cancelled by user');
      return;
    }

    setLoading(true);
    setError('');
    
    const unassignUrl = `/api/employer/shifts/${shift.shift_id}/unassign/${workerId}`;
    console.log('🔄 Calling UNASSIGN API:', unassignUrl);

    try {
      const response = await api.delete(unassignUrl);
      console.log('✅ UNASSIGN SUCCESS:', response.data);
      setSuccessMessage('Worker unassigned successfully!');
      setTimeout(() => {
        onUpdate();
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      console.error('❌ UNASSIGN FAILED:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to unassign worker');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShift = () => {
    // Close this modal and trigger the copy shift modal
    onClose();
    if (onCopyShift) {
      onCopyShift(shift);
    }
  };

  const handleSaveAsTemplate = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Save shift data to localStorage as a template
      const templates = JSON.parse(localStorage.getItem('shift_templates') || '[]');
      const template = {
        id: `template_${Date.now()}`,
        name: `${shift.position_title} - ${shift.workplace_name}`,
        workplace_id: shift.workplace_id,
        position_title: shift.position_title,
        duration_hours: moment(shift.end_time).diff(moment(shift.start_time), 'hours', true),
        start_time: moment(shift.start_time).format('HH:mm'),
        positions_needed: shift.positions_needed,
        hourly_rate: shift.hourly_rate,
        notes: shift.notes,
        created_at: new Date().toISOString()
      };
      
      templates.push(template);
      localStorage.setItem('shift_templates', JSON.stringify(templates));
      
      setSuccessMessage('Template saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const startTime = moment(shift.start_time);
  const endTime = moment(shift.end_time);
  const positionsFilled = shift.positions_filled || 0;
  const positionsNeeded = shift.positions_needed || 1;
  const positionsOpen = positionsNeeded - positionsFilled;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">{shift.position_title}</h3>
              <p className="text-blue-100 text-sm mt-1">{shift.workplace_name}</p>
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
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            {/* Shift Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-gray-700">
                <FiClock className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-medium">{startTime.format('dddd, MMMM DD, YYYY')}</div>
                  <div className="text-sm text-gray-600">
                    {startTime.format('h:mm A')} - {endTime.format('h:mm A')} ({shift.duration_hours}h)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <FiMapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-medium">{shift.workplace_name}</div>
                </div>
              </div>

              {shift.hourly_rate && (
                <div className="flex items-center gap-3 text-gray-700">
                  <FiDollarSign className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium">${shift.hourly_rate}/hour</div>
                  </div>
                </div>
              )}

              {shift.notes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">Notes</div>
                  <div className="text-sm text-gray-600">{shift.notes}</div>
                </div>
              )}
            </div>

            {/* Staffing Status */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FiUsers className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">Staffing</span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {positionsFilled}/{positionsNeeded} filled
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    positionsFilled === 0 ? 'bg-red-500' :
                    positionsFilled < positionsNeeded ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${(positionsFilled / positionsNeeded) * 100}%` }}
                ></div>
              </div>

              {positionsOpen > 0 && (
                <div className="mt-3">
                  <span className="text-sm text-gray-600">
                    {positionsOpen} position{positionsOpen > 1 ? 's' : ''} still needed
                  </span>
                </div>
              )}
            </div>

            {/* Assigned Workers */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Assigned Workers</h4>
                {positionsOpen > 0 && (
                  <button
                    onClick={onAssignWorker}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiUserPlus className="w-4 h-4" />
                    Assign Worker
                  </button>
                )}
              </div>

              {shift.assigned_workers && shift.assigned_workers.length > 0 ? (
                <div className="space-y-2">
                  {shift.assigned_workers.map((worker, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          {typeof worker === 'string' ? (idx + 1) : (worker.worker_name?.charAt(0) || 'W')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {typeof worker === 'string' ? `Worker ${idx + 1}` : (worker.worker_name || worker.name || 'Worker')}
                          </div>
                          <div className="text-sm text-gray-600">
                            {typeof worker === 'string' ? worker : (worker.position || 'Worker')}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnassignWorker(typeof worker === 'string' ? worker : (worker.worker_id || worker.workforce_id || worker.user_id))}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        disabled={loading}
                      >
                        <FiUserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiUsers className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No workers assigned yet</p>
                  <button
                    onClick={onAssignWorker}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Assign your first worker
                  </button>
                </div>
              )}
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t">
              {/* Primary Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyShift}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <FiCopy className="w-4 h-4" />
                  Copy Shift
                </button>
                <button
                  onClick={handleSaveAsTemplate}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <FiSave className="w-4 h-4" />
                  Save as Template
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Delete Shift
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftDetailModal;
