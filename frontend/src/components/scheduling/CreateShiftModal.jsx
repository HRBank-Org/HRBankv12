import React, { useState, useEffect } from 'react';
import { FiX, FiClock, FiMapPin, FiUsers, FiDollarSign, FiRepeat } from 'react-icons/fi';
import api from '../../utils/api';
import moment from 'moment';

const CreateShiftModal = ({ isOpen, onClose, onSuccess, workplaces, initialDate, initialTime }) => {
  const [formData, setFormData] = useState({
    workplace_id: '',
    occupation_template_id: '',
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
  const [occupationTemplates, setOccupationTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [workplaceProvince, setWorkplaceProvince] = useState(null);
  const [workplaceRoles, setWorkplaceRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    if (workplaces.length > 0 && !formData.workplace_id) {
      setFormData(prev => ({ ...prev, workplace_id: workplaces[0].workplace_id }));
    }
  }, [workplaces]);

  // Load occupation templates and workplace roles
  useEffect(() => {
    const loadData = async () => {
      try {
        const [templatesRes, rolesRes] = await Promise.all([
          api.get('/api/occupation-templates/list'),
          api.get('/api/employer/workplace-roles/list')
        ]);
        setOccupationTemplates(templatesRes.data.data.templates || []);
        setWorkplaceRoles(rolesRes.data.data.roles || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Get workplace province
  useEffect(() => {
    if (formData.workplace_id && workplaces.length > 0) {
      const workplace = workplaces.find(w => w.workplace_id === formData.workplace_id);
      if (workplace && workplace.province_code) {
        setWorkplaceProvince(workplace.province_code);
      }
    }
  }, [formData.workplace_id, workplaces]);

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
      
      // Inherit ALL properties from the role including standard tasks
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
        standard_tasks: role.standard_tasks || [] // Inherit role tasks
      }));
    }
  };

  // Handle template selection
  const handleTemplateSelect = async (templateId) => {
    if (!templateId) {
      setSelectedTemplate(null);
      setFormData(prev => ({
        ...prev,
        occupation_template_id: '',
        position_title: '',
        hourly_rate: '',
        required_skills: []
      }));
      return;
    }

    try {
      const response = await api.get(`/api/occupation-templates/${templateId}?province=${workplaceProvince || 'ON'}`);
      const template = response.data.data;
      setSelectedTemplate(template);
      setSelectedRole(null); // Clear role if template is selected

      // Auto-populate fields from template (certifications stay at role level)
      setFormData(prev => ({
        ...prev,
        occupation_template_id: templateId,
        position_title: template.occupation_title,
        hourly_rate: template.suggested_rate_for_province || template.suggested_rates?.ON || '',
        required_skills: template.required_skills || []
      }));
    } catch (err) {
      console.error('Failed to load template details:', err);
    }
  };

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

              {/* Occupation Template - Alternative to Role */}
              {!selectedRole && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiUsers className="inline w-4 h-4 mr-1" />
                    Or use Occupation Template
                  </label>
                  <select
                    value={formData.occupation_template_id}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select from template or enter manually --</option>
                    {occupationTemplates.map(template => (
                      <option key={template.template_id} value={template.template_id}>
                        {template.occupation_title} ({template.occupation_category})
                        {template.suggested_rates?.[workplaceProvince] ? 
                          ` - Suggested: $${template.suggested_rates[workplaceProvince]}/hr` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="text-xs text-gray-500 mt-1">
                      ✓ Auto-filled: Position, Rate, Skills
                    </p>
                  )}
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
                {selectedTemplate && (
                  <p className="text-xs text-blue-600 mt-1">
                    From template: {selectedTemplate.occupation_title}
                  </p>
                )}
              </div>

              {/* Date and Time */}
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
                  {selectedTemplate && selectedTemplate.suggested_rate_for_province && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✓ Suggested rate for {workplaceProvince}: ${selectedTemplate.suggested_rate_for_province}/hr
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
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
