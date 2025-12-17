import React, { useState, useEffect } from 'react';
import { FiX, FiClock, FiMapPin, FiUsers, FiDollarSign, FiRepeat } from 'react-icons/fi';
import api from '../../utils/api';
import moment from 'moment';

const CreateShiftModal = ({ isOpen, onClose, onSuccess, workplaces, initialDate, initialTime }) => {
  const [formData, setFormData] = useState({
    workplace_id: '',
    role_id: '',
    position_title: '',
    date: initialDate || moment().format('YYYY-MM-DD'),
    start_time: initialTime || '09:00',
    end_time: '17:00',
    positions_needed: 1,
    hourly_rate: '',
    notes: '',
    required_skills: [],
    standard_tasks: [], // From role
    custom_tasks: [], // Shift-specific
    is_recurring: false,
    recurrence_rule: 'weekly',
    recurrence_end_date: ''
  });
  
  const [customTaskInput, setCustomTaskInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workplaceRoles, setWorkplaceRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    if (workplaces.length > 0 && !formData.workplace_id) {
      setFormData(prev => ({ ...prev, workplace_id: workplaces[0].workplace_id }));
    }
  }, [workplaces]);

  // Load workplace roles
  useEffect(() => {
    const loadData = async () => {
      try {
        const rolesRes = await api.get('/api/employer/workplace-roles/list');
        setWorkplaceRoles(rolesRes.data.data.roles || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Get workplace province and inherit operating hours
  useEffect(() => {
    if (formData.workplace_id && workplaces.length > 0) {
      const workplace = workplaces.find(w => w.workplace_id === formData.workplace_id);
      if (workplace) {
        if (workplace.province_code) {
          setWorkplaceProvince(workplace.province_code);
        }
        
        // Inherit operating hours from workplace based on selected date
        if (workplace.operating_hours && formData.date) {
          const dayOfWeek = moment(formData.date).format('dddd').toLowerCase();
          const dayHours = workplace.operating_hours[dayOfWeek];
          
          if (dayHours && dayHours.is_open) {
            // Only update times if they haven't been manually set or if role hasn't been selected
            if (!selectedRole) {
              setFormData(prev => ({
                ...prev,
                start_time: dayHours.open || prev.start_time,
                end_time: dayHours.close || prev.end_time
              }));
            }
          }
        }
      }
    }
  }, [formData.workplace_id, formData.date, workplaces, selectedRole]);

  // Handle workplace role selection - INHERIT ALL PROPERTIES including tasks
  const handleRoleSelect = (roleId) => {
    if (!roleId) {
      setSelectedRole(null);
      setSelectedTemplate(null);
      return;
    }

    const role = workplaceRoles.find(r => r.role_id === roleId);
    if (role) {
      setSelectedRole(role);
      setSelectedTemplate(null); // Clear template if role is selected
      
      // Inherit ALL properties from the role including generic tasks
      setFormData(prev => ({
        ...prev,
        workplace_id: role.workplace_id,
        position_title: role.role_name,
        occupation_template_id: role.occupation_template_id || '',
        hourly_rate: role.pay_rate || role.hourly_rate || '',
        start_time: role.shift_start_time || prev.start_time,
        end_time: role.shift_end_time || prev.end_time,
        positions_needed: role.positions_needed || 1,
        required_skills: role.required_skills || [],
        standard_tasks: (role.generic_tasks || []).map(t => typeof t === 'string' ? t : t.task_name) // Inherit generic tasks from role
      }));
    }
  };

  // Note: Template selection removed - shifts now inherit from roles only

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Combine date and time
      const startDateTime = moment(`${formData.date} ${formData.start_time}`, 'YYYY-MM-DD HH:mm').toISOString();
      const endDateTime = moment(`${formData.date} ${formData.end_time}`, 'YYYY-MM-DD HH:mm').toISOString();

      const payload = {
        workplace_id: formData.workplace_id,
        position_title: formData.position_title,
        start_time: startDateTime,
        end_time: endDateTime,
        positions_needed: parseInt(formData.positions_needed),
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        notes: formData.notes,
        required_skills: formData.required_skills,
        standard_tasks: formData.standard_tasks || [],
        custom_tasks: formData.custom_tasks || [],
        is_recurring: formData.is_recurring,
        recurrence_rule: formData.is_recurring ? formData.recurrence_rule : null,
        recurrence_end_date: formData.is_recurring && formData.recurrence_end_date 
          ? moment(formData.recurrence_end_date).toISOString() 
          : null
      };

      await api.post('/api/calendar/shifts', payload);
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create shift');
    } finally {
      setLoading(false);
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
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Create New Shift</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Workplace */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMapPin className="inline w-4 h-4 mr-1" />
                  Workplace *
                </label>
                <select
                  value={formData.workplace_id}
                  onChange={(e) => setFormData({ ...formData, workplace_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select workplace</option>
                  {workplaces.map(wp => (
                    <option key={wp.workplace_id} value={wp.workplace_id}>
                      {wp.workplace_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Inherit from Workplace Role */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  🎯 Inherit from Existing Role (Recommended)
                </label>
                <select
                  value={selectedRole?.role_id || ''}
                  onChange={(e) => handleRoleSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">-- Select a role to auto-fill all details --</option>
                  {workplaceRoles
                    .filter(role => !formData.workplace_id || role.workplace_id === formData.workplace_id)
                    .map(role => (
                      <option key={role.role_id} value={role.role_id}>
                        {role.role_name} - ${role.pay_rate || role.hourly_rate}/hr
                        {role.shift_start_time && ` (${role.shift_start_time}-${role.shift_end_time})`}
                      </option>
                    ))}
                </select>
                {selectedRole && (
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    ✓ Inherited: Role name, workplace, pay rate, shift times, positions needed
                  </p>
                )}
              </div>

              {/* Note: Occupation templates removed - shifts should inherit from roles */}
              {!selectedRole && !formData.role_id && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    💡 <strong>Tip:</strong> Select a role above to auto-fill position details, hourly rate, and required certifications from your compliance settings.
                  </p>
                </div>
              )}

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position Title *
                </label>
                <input
                  type="text"
                  value={formData.position_title}
                  onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                  required
                  placeholder="e.g., Server, Bartender, Line Cook"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {selectedRole && (
                  <p className="text-xs text-blue-600 mt-1">
                    From role: {selectedRole.role_name || selectedRole.title}
                  </p>
                )}
              </div>

              {/* Date and Time */}
              <div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiClock className="inline w-4 h-4 mr-1" />
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {/* Workplace Operating Hours Indicator */}
                {formData.workplace_id && formData.date && workplaces.length > 0 && (() => {
                  const workplace = workplaces.find(w => w.workplace_id === formData.workplace_id);
                  const dayOfWeek = moment(formData.date).format('dddd').toLowerCase();
                  const dayHours = workplace?.operating_hours?.[dayOfWeek];
                  
                  if (dayHours && dayHours.is_open && !selectedRole) {
                    return (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-700">
                          ⏰ <strong>Times inherited from workplace hours:</strong> {workplace.workplace_name} operates {dayHours.open} - {dayHours.close} on {moment(formData.date).format('dddd')}s
                        </p>
                      </div>
                    );
                  } else if (dayHours && !dayHours.is_open) {
                    return (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-700">
                          ⚠️ <strong>Note:</strong> {workplace.workplace_name} is typically closed on {moment(formData.date).format('dddd')}s
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Break Requirements Indicator */}
                {formData.start_time && formData.end_time && (() => {
                  const startTime = moment(`2000-01-01 ${formData.start_time}`);
                  const endTime = moment(`2000-01-01 ${formData.end_time}`);
                  const hours = endTime.diff(startTime, 'hours', true);
                  
                  if (hours >= 2) {
                    const breaks = [];
                    if (hours >= 2) breaks.push('10-min break after 2 hours');
                    if (hours >= 4) breaks.push('30-min meal break after 4 hours');
                    if (hours >= 6) breaks.push('Additional 10-min break');
                    
                    return (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700">
                          ☕ <strong>Break Requirements ({hours.toFixed(1)} hour shift):</strong>
                        </p>
                        <ul className="text-xs text-blue-600 ml-4 mt-1 list-disc">
                          {breaks.map((b, i) => <li key={i}>{b}</li>)}
                        </ul>
                        <p className="text-xs text-blue-500 mt-1">Workers will be notified automatically</p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Positions and Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiUsers className="inline w-4 h-4 mr-1" />
                    Positions Needed *
                  </label>
                  <input
                    type="number"
                    value={formData.positions_needed}
                    onChange={(e) => setFormData({ ...formData, positions_needed: e.target.value })}
                    required
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiDollarSign className="inline w-4 h-4 mr-1" />
                    Hourly Rate
                  </label>
                  <input
                    type="number"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    step="0.01"
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {selectedRole && selectedRole.hourly_rate && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✓ Rate from role: ${selectedRole.hourly_rate}/hr
                    </p>
                  )}
                </div>
              </div>

              {/* Tasks Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-3">📋 Shift Tasks</h3>
                
                {/* Standard Tasks from Role (Read-only) */}
                {formData.standard_tasks && formData.standard_tasks.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Standard Tasks (from role)
                    </label>
                    <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      {formData.standard_tasks.map((task, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-blue-900">
                          <span className="text-blue-400">☐</span>
                          <span>{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Custom Tasks for This Shift */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Tasks (one-time for this shift)
                  </label>
                  
                  {formData.custom_tasks.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {formData.custom_tasks.map((task, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                          <span className="text-gray-400">☐</span>
                          <span className="flex-1 text-sm text-gray-900">{task}</span>
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              custom_tasks: formData.custom_tasks.filter((_, i) => i !== idx)
                            })}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTaskInput}
                      onChange={(e) => setCustomTaskInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customTaskInput.trim()) {
                          e.preventDefault();
                          setFormData({
                            ...formData,
                            custom_tasks: [...formData.custom_tasks, customTaskInput.trim()]
                          });
                          setCustomTaskInput('');
                        }
                      }}
                      placeholder="e.g., Prepare for special event"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customTaskInput.trim()) {
                          setFormData({
                            ...formData,
                            custom_tasks: [...formData.custom_tasks, customTaskInput.trim()]
                          });
                          setCustomTaskInput('');
                        }
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="2"
                  placeholder="Any additional details..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Recurring Options */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <FiRepeat className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-700">Make this a recurring shift</span>
                </label>

                {formData.is_recurring && (
                  <div className="ml-6 space-y-3 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Repeat
                      </label>
                      <select
                        value={formData.recurrence_rule}
                        onChange={(e) => setFormData({ ...formData, recurrence_rule: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.recurrence_end_date}
                        onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                        min={formData.date}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to create shifts for 3 months
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Shift'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateShiftModal;
