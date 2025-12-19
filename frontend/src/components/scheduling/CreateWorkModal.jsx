import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FiX, FiClock, FiMapPin, FiUsers, FiDollarSign, FiRepeat, 
  FiTruck, FiBriefcase, FiSun, FiMoon, FiPlus, FiTrash2,
  FiUser, FiPhone, FiNavigation, FiCheck, FiCalendar
} from 'react-icons/fi';
import api from '../../utils/api';
import moment from 'moment';

// Work type definitions
const WORK_TYPES = {
  STANDARD: 'standard',
  FIELD_SERVICE: 'field_service',
  CONTINENTAL: 'continental'
};

// Continental shift patterns
const CONTINENTAL_PATTERNS = [
  { id: 'dupont', name: 'DuPont (2D-2N-4Off)', description: '2 day shifts, 2 night shifts, 4 days off' },
  { id: 'panama', name: 'Panama (2-2-3)', description: '2 on, 2 off, 3 on rotating' },
  { id: 'pitman', name: 'Pitman (2-3-2)', description: '2 on, 3 off, 2 on, alternating days/nights' },
];

const CreateWorkModal = ({ isOpen, onClose, onSuccess, workplaces, initialDate, initialTime }) => {
  // Work type state
  const [workType, setWorkType] = useState(WORK_TYPES.STANDARD);
  
  // Common form data
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
    is_recurring: false,
    recurrence_rule: 'weekly',
    recurrence_end_date: ''
  });

  // Field service specific
  const [clientData, setClientData] = useState({
    client_name: '',
    client_phone: '',
    street_address: '',
    city: '',
    province: 'ON',
    postal_code: '',
    access_notes: '',
    estimated_duration: 60
  });
  const [checklist, setChecklist] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Continental specific
  const [continentalData, setContinentalData] = useState({
    pattern: 'dupont',
    day_start: '06:00',
    day_end: '18:00',
    night_start: '18:00',
    night_end: '06:00',
    generate_weeks: 4,
    rotation_groups: 4
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workplaceRoles, setWorkplaceRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressInputRef = useRef(null);

  // Filter workplaces by work mode
  const filteredWorkplaces = workplaces.filter(wp => {
    if (workType === WORK_TYPES.FIELD_SERVICE) {
      return wp.work_mode === 'field_service' || wp.work_mode === 'field-service';
    }
    return wp.work_mode !== 'field_service' && wp.work_mode !== 'field-service';
  });

  useEffect(() => {
    if (filteredWorkplaces.length > 0 && !formData.workplace_id) {
      setFormData(prev => ({ ...prev, workplace_id: filteredWorkplaces[0].workplace_id }));
    }
  }, [filteredWorkplaces, workType]);

  // Load workplace roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesRes = await api.get('/api/employer/workplace-roles/list');
        setWorkplaceRoles(rolesRes.data.data.roles || []);
      } catch (err) {
        console.error('Failed to load roles:', err);
      }
    };
    if (isOpen) loadRoles();
  }, [isOpen]);

  // Handle role selection
  const handleRoleSelect = (roleId) => {
    if (!roleId) {
      setSelectedRole(null);
      return;
    }
    const role = workplaceRoles.find(r => r.role_id === roleId);
    if (role) {
      setSelectedRole(role);
      setFormData(prev => ({
        ...prev,
        workplace_id: role.workplace_id,
        role_id: role.role_id,
        position_title: role.role_name || role.title,
        hourly_rate: role.pay_rate || role.hourly_rate || '',
        start_time: role.shift_start_time || prev.start_time,
        end_time: role.shift_end_time || prev.end_time,
        positions_needed: role.positions_needed || 1,
      }));
    }
  };

  // Address autocomplete (Google Places)
  const handleAddressSearch = useCallback(async (query) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    try {
      const response = await api.get(`/api/employer/address/autocomplete?input=${encodeURIComponent(query)}`);
      if (response.data.success) {
        setAddressSuggestions(response.data.data.predictions || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Address search failed:', err);
    }
  }, []);

  const handleAddressSelect = async (placeId, description) => {
    setShowSuggestions(false);
    try {
      const response = await api.get(`/api/employer/address/details?place_id=${placeId}`);
      if (response.data.success) {
        const addr = response.data.data;
        setClientData(prev => ({
          ...prev,
          street_address: addr.street_address || description.split(',')[0],
          city: addr.city || '',
          province: addr.province || 'ON',
          postal_code: addr.postal_code || ''
        }));
      }
    } catch (err) {
      // Fallback to just using the description
      setClientData(prev => ({
        ...prev,
        street_address: description.split(',')[0]
      }));
    }
  };

  // Checklist management
  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklist(prev => [...prev, { 
        id: `item_${Date.now()}`, 
        name: newChecklistItem.trim(), 
        item_type: 'room' 
      }]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (id) => {
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  // Quick add common rooms
  const addCommonRooms = () => {
    const commonRooms = [
      { id: `item_${Date.now()}_1`, name: 'Living Room', item_type: 'room' },
      { id: `item_${Date.now()}_2`, name: 'Kitchen', item_type: 'room' },
      { id: `item_${Date.now()}_3`, name: 'Bathroom', item_type: 'room' },
      { id: `item_${Date.now()}_4`, name: 'Bedroom', item_type: 'room' },
    ];
    setChecklist(prev => [...prev, ...commonRooms]);
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (workType === WORK_TYPES.STANDARD) {
        // Standard shift creation
        const startDateTime = moment(`${formData.date} ${formData.start_time}`, 'YYYY-MM-DD HH:mm').toISOString();
        const endDateTime = moment(`${formData.date} ${formData.end_time}`, 'YYYY-MM-DD HH:mm').toISOString();

        await api.post('/api/calendar/shifts', {
          workplace_id: formData.workplace_id,
          position_title: formData.position_title,
          start_time: startDateTime,
          end_time: endDateTime,
          positions_needed: parseInt(formData.positions_needed),
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          notes: formData.notes,
          is_recurring: formData.is_recurring,
          recurrence_rule: formData.is_recurring ? formData.recurrence_rule : null,
          recurrence_end_date: formData.is_recurring && formData.recurrence_end_date 
            ? moment(formData.recurrence_end_date).toISOString() : null
        });

      } else if (workType === WORK_TYPES.FIELD_SERVICE) {
        // Field service task creation
        const fsa = clientData.postal_code ? clientData.postal_code.substring(0, 3).toUpperCase() : '';
        
        await api.post('/api/service-tasks', {
          workplace_id: formData.workplace_id,
          title: formData.position_title || `Service - ${clientData.client_name}`,
          description: formData.notes,
          scheduled_date: formData.date,
          scheduled_start_time: formData.start_time,
          scheduled_end_time: formData.end_time,
          estimated_duration_minutes: parseInt(clientData.estimated_duration),
          address: {
            street_address: clientData.street_address,
            city: clientData.city,
            province: clientData.province,
            postal_code: clientData.postal_code,
            fsa: fsa,
            client_name: clientData.client_name,
            client_phone: clientData.client_phone,
            access_notes: clientData.access_notes
          },
          checklist: checklist,
          status: 'pending'
        });

      } else if (workType === WORK_TYPES.CONTINENTAL) {
        // Continental shift pattern generation
        await api.post('/api/calendar/continental-pattern', {
          workplace_id: formData.workplace_id,
          position_title: formData.position_title,
          pattern: continentalData.pattern,
          day_shift: {
            start: continentalData.day_start,
            end: continentalData.day_end
          },
          night_shift: {
            start: continentalData.night_start,
            end: continentalData.night_end
          },
          start_date: formData.date,
          generate_weeks: parseInt(continentalData.generate_weeks),
          rotation_groups: parseInt(continentalData.rotation_groups),
          positions_per_shift: parseInt(formData.positions_needed),
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          notes: formData.notes
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create work schedule');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Create Work Schedule</h3>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Work Type Selector */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">Work Type</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setWorkType(WORK_TYPES.STANDARD)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  workType === WORK_TYPES.STANDARD 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FiBriefcase className="w-6 h-6 mx-auto mb-1" />
                <p className="text-sm font-medium">Standard Shift</p>
                <p className="text-xs text-gray-500">Single location</p>
              </button>
              
              <button
                type="button"
                onClick={() => setWorkType(WORK_TYPES.FIELD_SERVICE)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  workType === WORK_TYPES.FIELD_SERVICE 
                    ? 'border-orange-500 bg-orange-50 text-orange-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FiTruck className="w-6 h-6 mx-auto mb-1" />
                <p className="text-sm font-medium">Field Service</p>
                <p className="text-xs text-gray-500">Client location</p>
              </button>
              
              <button
                type="button"
                onClick={() => setWorkType(WORK_TYPES.CONTINENTAL)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  workType === WORK_TYPES.CONTINENTAL 
                    ? 'border-purple-500 bg-purple-50 text-purple-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-center gap-1 mb-1">
                  <FiSun className="w-5 h-5" />
                  <FiMoon className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium">Continental</p>
                <p className="text-xs text-gray-500">12h rotating</p>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Workplace Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMapPin className="inline w-4 h-4 mr-1" />
                  {workType === WORK_TYPES.FIELD_SERVICE ? 'Service Territory' : 'Workplace'} *
                </label>
                <select
                  value={formData.workplace_id}
                  onChange={(e) => setFormData({ ...formData, workplace_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select {workType === WORK_TYPES.FIELD_SERVICE ? 'territory' : 'workplace'}</option>
                  {filteredWorkplaces.map(wp => (
                    <option key={wp.workplace_id} value={wp.workplace_id}>
                      {wp.workplace_name}
                      {wp.service_fsas && ` (${wp.service_fsas.slice(0, 3).join(', ')}...)`}
                    </option>
                  ))}
                </select>
                {filteredWorkplaces.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No {workType === WORK_TYPES.FIELD_SERVICE ? 'field service territories' : 'workplaces'} found. 
                    Create one first in Workplaces settings.
                  </p>
                )}
              </div>

              {/* Role Selection (Standard & Continental) */}
              {workType !== WORK_TYPES.FIELD_SERVICE && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    🎯 Inherit from Role (Recommended)
                  </label>
                  <select
                    value={selectedRole?.role_id || ''}
                    onChange={(e) => handleRoleSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg bg-white"
                  >
                    <option value="">-- Select a role --</option>
                    {workplaceRoles
                      .filter(role => !formData.workplace_id || role.workplace_id === formData.workplace_id)
                      .map(role => (
                        <option key={role.role_id} value={role.role_id}>
                          {role.role_name} - ${role.pay_rate || role.hourly_rate}/hr
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Position/Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {workType === WORK_TYPES.FIELD_SERVICE ? 'Task Title' : 'Position Title'} *
                </label>
                <input
                  type="text"
                  value={formData.position_title}
                  onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                  required
                  placeholder={workType === WORK_TYPES.FIELD_SERVICE ? 'e.g., Regular Clean, Deep Clean' : 'e.g., Server, Security Guard'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* ============ FIELD SERVICE SPECIFIC ============ */}
              {workType === WORK_TYPES.FIELD_SERVICE && (
                <>
                  {/* Client Info */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-orange-900 flex items-center gap-2">
                      <FiUser /> Client Information
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                        <input
                          type="text"
                          value={clientData.client_name}
                          onChange={(e) => setClientData({ ...clientData, client_name: e.target.value })}
                          placeholder="John Smith"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={clientData.client_phone}
                          onChange={(e) => setClientData({ ...clientData, client_phone: e.target.value })}
                          placeholder="519-555-1234"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    {/* Address with Autocomplete */}
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <FiNavigation className="inline mr-1" /> Service Address *
                      </label>
                      <input
                        ref={addressInputRef}
                        type="text"
                        value={clientData.street_address}
                        onChange={(e) => {
                          setClientData({ ...clientData, street_address: e.target.value });
                          handleAddressSearch(e.target.value);
                        }}
                        onFocus={() => clientData.street_address.length > 2 && setShowSuggestions(true)}
                        placeholder="Start typing address..."
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {addressSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.place_id}
                              type="button"
                              onClick={() => handleAddressSelect(suggestion.place_id, suggestion.description)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 border-b last:border-b-0"
                            >
                              {suggestion.description}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                        <input
                          type="text"
                          value={clientData.city}
                          onChange={(e) => setClientData({ ...clientData, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Province</label>
                        <select
                          value={clientData.province}
                          onChange={(e) => setClientData({ ...clientData, province: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="ON">Ontario</option>
                          <option value="BC">British Columbia</option>
                          <option value="AB">Alberta</option>
                          <option value="QC">Quebec</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={clientData.postal_code}
                          onChange={(e) => setClientData({ ...clientData, postal_code: e.target.value.toUpperCase() })}
                          placeholder="N9A 1A1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Access Notes</label>
                      <input
                        type="text"
                        value={clientData.access_notes}
                        onChange={(e) => setClientData({ ...clientData, access_notes: e.target.value })}
                        placeholder="e.g., Building code: 1234, key under mat"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* Checklist Builder */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Task Checklist</label>
                      <button
                        type="button"
                        onClick={addCommonRooms}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        + Add common rooms
                      </button>
                    </div>
                    
                    {checklist.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {checklist.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <FiCheck className="text-gray-400" />
                            <span className="flex-1 text-sm">{item.name}</span>
                            <button
                              type="button"
                              onClick={() => removeChecklistItem(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                        placeholder="Add room or task..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={addChecklistItem}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        <FiPlus />
                      </button>
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={clientData.estimated_duration}
                      onChange={(e) => setClientData({ ...clientData, estimated_duration: e.target.value })}
                      min="15"
                      step="15"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              {/* ============ CONTINENTAL SPECIFIC ============ */}
              {workType === WORK_TYPES.CONTINENTAL && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-purple-900 flex items-center gap-2">
                    <FiCalendar /> Continental Shift Pattern
                  </h4>

                  {/* Pattern Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Rotation Pattern</label>
                    <div className="space-y-2">
                      {CONTINENTAL_PATTERNS.map((pattern) => (
                        <label
                          key={pattern.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            continentalData.pattern === pattern.id 
                              ? 'border-purple-500 bg-purple-100' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="continental_pattern"
                            value={pattern.id}
                            checked={continentalData.pattern === pattern.id}
                            onChange={(e) => setContinentalData({ ...continentalData, pattern: e.target.value })}
                            className="text-purple-600"
                          />
                          <div>
                            <p className="font-medium text-sm">{pattern.name}</p>
                            <p className="text-xs text-gray-500">{pattern.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Shift Times */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-xs font-medium text-yellow-800 mb-2 flex items-center gap-1">
                        <FiSun /> Day Shift (12h)
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={continentalData.day_start}
                          onChange={(e) => setContinentalData({ ...continentalData, day_start: e.target.value })}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                          type="time"
                          value={continentalData.day_end}
                          onChange={(e) => setContinentalData({ ...continentalData, day_end: e.target.value })}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <p className="text-xs font-medium text-indigo-800 mb-2 flex items-center gap-1">
                        <FiMoon /> Night Shift (12h)
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={continentalData.night_start}
                          onChange={(e) => setContinentalData({ ...continentalData, night_start: e.target.value })}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                          type="time"
                          value={continentalData.night_end}
                          onChange={(e) => setContinentalData({ ...continentalData, night_end: e.target.value })}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Generation Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Generate for (weeks)</label>
                      <select
                        value={continentalData.generate_weeks}
                        onChange={(e) => setContinentalData({ ...continentalData, generate_weeks: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="2">2 weeks</option>
                        <option value="4">4 weeks</option>
                        <option value="8">8 weeks</option>
                        <option value="12">12 weeks</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Rotation Groups</label>
                      <select
                        value={continentalData.rotation_groups}
                        onChange={(e) => setContinentalData({ ...continentalData, rotation_groups: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="2">2 groups (A, B)</option>
                        <option value="4">4 groups (A, B, C, D)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ============ COMMON FIELDS ============ */}
              {/* Date and Time (Standard & Field Service) */}
              {workType !== WORK_TYPES.CONTINENTAL && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiClock className="inline w-4 h-4 mr-1" /> Start *
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End *</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Start Date for Continental */}
              {workType === WORK_TYPES.CONTINENTAL && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pattern Start Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              {/* Workers Needed & Hourly Rate */}
              {workType !== WORK_TYPES.FIELD_SERVICE && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiUsers className="inline w-4 h-4 mr-1" /> Workers Needed
                    </label>
                    <input
                      type="number"
                      value={formData.positions_needed}
                      onChange={(e) => setFormData({ ...formData, positions_needed: e.target.value })}
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiDollarSign className="inline w-4 h-4 mr-1" /> Hourly Rate
                    </label>
                    <input
                      type="number"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      step="0.01"
                      placeholder="e.g., 18.50"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional instructions..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                />
              </div>

              {/* Recurring (Standard only) */}
              {workType === WORK_TYPES.STANDARD && (
                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      <FiRepeat className="inline w-4 h-4 mr-1" /> Recurring Shift
                    </span>
                  </label>

                  {formData.is_recurring && (
                    <div className="mt-3 grid grid-cols-2 gap-4 pl-6">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
                        <select
                          value={formData.recurrence_rule}
                          onChange={(e) => setFormData({ ...formData, recurrence_rule: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-weekly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Until</label>
                        <input
                          type="date"
                          value={formData.recurrence_end_date}
                          onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || filteredWorkplaces.length === 0}
                className={`px-6 py-2 text-white rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  workType === WORK_TYPES.FIELD_SERVICE 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : workType === WORK_TYPES.CONTINENTAL 
                      ? 'bg-purple-500 hover:bg-purple-600' 
                      : 'bg-blue-500 hover:bg-blue-600'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiCheck />
                    {workType === WORK_TYPES.CONTINENTAL ? 'Generate Pattern' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkModal;
