import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import api from '../../utils/api';
import { FiMapPin, FiUsers, FiClock, FiSave, FiX, FiChevronRight, FiCalendar } from 'react-icons/fi';

const WorkplaceForm = () => {
  const { workplaceId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isEditMode = !!workplaceId;
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [assignedWorkers, setAssignedWorkers] = useState([]);
  const [mode, setMode] = useState(isEditMode ? 'view' : 'edit'); // 'view', 'edit'
  
  const [formData, setFormData] = useState({
    workplace_name: '',
    address: '',
    city: '',
    province: 'ON',
    postal_code: '',
    phone: '',
    email: '',
    job_matching_radius_km: 20,
    timezone: 'America/Toronto',
    operating_hours: {
      monday: { open: '09:00', close: '17:00', is_open: true },
      tuesday: { open: '09:00', close: '17:00', is_open: true },
      wednesday: { open: '09:00', close: '17:00', is_open: true },
      thursday: { open: '09:00', close: '17:00', is_open: true },
      friday: { open: '09:00', close: '17:00', is_open: true },
      saturday: { open: '10:00', close: '16:00', is_open: false },
      sunday: { open: '10:00', close: '16:00', is_open: false }
    }
  });

  useEffect(() => {
    if (isEditMode) {
      loadWorkplaceData();
    }
  }, [workplaceId]);

  const loadWorkplaceData = async () => {
    try {
      const [wpRes, workersRes] = await Promise.all([
        api.get('/api/employer/workplaces'),
        api.get('/api/employer/dashboard/workforce').catch(() => ({ data: { data: [] } }))
      ]);

      const wp = wpRes.data.data.workplaces.find(w => w.workplace_id === workplaceId);
      if (wp) {
        setFormData({
          workplace_name: wp.name || wp.workplace_name || '',
          address: wp.address || '',
          city: wp.city || '',
          province: wp.province || 'ON',
          postal_code: wp.postal_code || '',
          phone: wp.phone || '',
          email: wp.email || '',
          job_matching_radius_km: wp.job_matching_radius_km || wp.geofence_radius || 20,
          timezone: wp.timezone || 'America/Toronto',
          operating_hours: wp.operating_hours || formData.operating_hours
        });
      }

      const workers = workersRes.data.data || [];
      const workplaceWorkers = workers.filter(w => 
        w.workplaces?.includes(workplaceId) || w.workplace_id === workplaceId
      );
      setAssignedWorkers(workplaceWorkers);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleHoursChange = (day, field, value) => {
    setFormData({
      ...formData,
      operating_hours: {
        ...formData.operating_hours,
        [day]: {
          ...formData.operating_hours[day],
          [field]: value
        }
      }
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (isEditMode) {
        await api.patch(`/api/employer/workplaces/${workplaceId}`, formData);
        setMode('view');
      } else {
        await api.post('/api/employer/workplaces', formData);
        setTimeout(() => {
          navigate('/employer/workplaces');
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to save workplace:', error);
      alert(error.response?.data?.detail || 'Failed to save workplace. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getDayInitials = (day) => {
    const initials = {
      monday: 'M',
      tuesday: 'T',
      wednesday: 'W',
      thursday: 'Th',
      friday: 'F',
      saturday: 'S',
      sunday: 'Su'
    };
    return initials[day];
  };

  const isFormValid = () => {
    return formData.workplace_name && formData.address && formData.city && formData.postal_code;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GenericHeader />
        <ModernSidebar />
        <div className="ml-[70px] pt-[64px] flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <ModernSidebar />
      
      <div className="ml-[70px] pt-[64px]">
        {/* Page Header */}
        <div className="px-8 py-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/employer/workplaces')} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isEditMode ? formData.workplace_name || 'Workplace Details' : 'Add New Workplace'}
                </h1>
                {isEditMode && formData.address && (
                  <p className="text-gray-600 mt-1 flex items-center gap-2">
                    <FiMapPin size={16} />
                    {formData.address}, {formData.city}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {mode === 'view' ? (
                <button
                  onClick={() => setMode('edit')}
                  className="px-6 py-3 rounded-lg border-2 font-medium hover:bg-gray-50 transition-colors"
                  style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                >
                  Edit Details
                </button>
              ) : (
                <>
                  {isEditMode && (
                    <button
                      onClick={() => {
                        setMode('view');
                        loadWorkplaceData();
                      }}
                      className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <FiX size={18} />
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={saving || !isFormValid()}
                    className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <FiSave size={18} />
                    {saving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Workplace')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information Card */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Workplace Name <span className="text-red-500">*</span>
                    </label>
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        name="workplace_name"
                        value={formData.workplace_name}
                        onChange={handleInputChange}
                        placeholder="e.g., Downtown Restaurant"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        required
                      />
                    ) : (
                      <p className="text-gray-900 text-lg">{formData.workplace_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address <span className="text-red-500">*</span>
                    </label>
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="123 Main Street"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        required
                      />
                    ) : (
                      <p className="text-gray-900">{formData.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      {mode === 'edit' ? (
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Toronto"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                          required
                        />
                      ) : (
                        <p className="text-gray-900">{formData.city}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Province <span className="text-red-500">*</span>
                      </label>
                      {mode === 'edit' ? (
                        <select
                          name="province"
                          value={formData.province}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                          required
                        >
                          <option value="ON">Ontario</option>
                          <option value="QC">Quebec</option>
                          <option value="BC">British Columbia</option>
                          <option value="AB">Alberta</option>
                          <option value="MB">Manitoba</option>
                          <option value="SK">Saskatchewan</option>
                          <option value="NS">Nova Scotia</option>
                          <option value="NB">New Brunswick</option>
                          <option value="NL">Newfoundland and Labrador</option>
                          <option value="PE">Prince Edward Island</option>
                        </select>
                      ) : (
                        <p className="text-gray-900">{formData.province}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code <span className="text-red-500">*</span>
                    </label>
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                        placeholder="A1A 1A1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        required
                      />
                    ) : (
                      <p className="text-gray-900">{formData.postal_code}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      {mode === 'edit' ? (
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="(555) 555-5555"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.phone || 'Not set'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      {mode === 'edit' ? (
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="workplace@example.com"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.email || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Operating Hours Card */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FiClock size={24} />
                  Operating Hours
                </h2>
                
                <div className="space-y-3">
                  {Object.entries(formData.operating_hours).map(([day, hours]) => (
                    <div key={day} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                      <div className="w-32">
                        <span className="text-sm font-medium text-gray-900 capitalize">{day}</span>
                      </div>
                      
                      {mode === 'edit' ? (
                        <>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={hours.is_open}
                              onChange={(e) => handleHoursChange(day, 'is_open', e.target.checked)}
                              className="w-5 h-5 rounded"
                              style={{ accentColor: theme.primaryColor }}
                            />
                            <span className="text-sm text-gray-600">Open</span>
                          </label>
                          
                          {hours.is_open && (
                            <>
                              <input
                                type="time"
                                value={hours.open}
                                onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <span className="text-gray-500">to</span>
                              <input
                                type="time"
                                value={hours.close}
                                onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-3 flex-1">
                          {hours.is_open ? (
                            <>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                Open
                              </span>
                              <span className="text-gray-900 font-medium">{hours.open} - {hours.close}</span>
                            </>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                              Closed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Days Summary */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">Open Days:</span>
                    <div className="flex gap-2">
                      {Object.entries(formData.operating_hours).map(([day, hours]) => (
                        <div
                          key={day}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                            hours.is_open
                              ? 'text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                          style={hours.is_open ? { backgroundColor: theme.primaryColor } : {}}
                          title={day}
                        >
                          {getDayInitials(day)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {isEditMode && (
                <>
                  {/* Assigned Workforce Card */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FiUsers size={24} />
                        Assigned Workforce
                      </span>
                      <span className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                        {assignedWorkers.length}
                      </span>
                    </h2>
                    
                    {assignedWorkers.length > 0 ? (
                      <div className="space-y-3">
                        {assignedWorkers.slice(0, 5).map((worker, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                              style={{ backgroundColor: theme.primaryColor }}
                            >
                              {(worker.name || 'W')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {worker.name || 'Worker'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{worker.email}</p>
                            </div>
                          </div>
                        ))}
                        
                        {assignedWorkers.length > 5 && (
                          <button 
                            className="w-full py-2 text-sm font-medium text-center rounded-lg hover:bg-gray-50"
                            style={{ color: theme.primaryColor }}
                          >
                            View All {assignedWorkers.length} Workers
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FiUsers size={48} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 text-sm">No workers assigned yet</p>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions Card */}
                  {mode === 'view' && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                      
                      <div className="space-y-2">
                        <button
                          onClick={() => navigate(`/employer/roster?workplace=${workplaceId}`)}
                          className="w-full px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <FiCalendar size={20} className="text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">View Shifts</span>
                          </div>
                          <FiChevronRight size={18} className="text-gray-400 group-hover:text-gray-600" />
                        </button>

                        <button
                          className="w-full px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <FiUsers size={20} className="text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">Manage Roles</span>
                          </div>
                          <FiChevronRight size={18} className="text-gray-400 group-hover:text-gray-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!isEditMode && (
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Quick Tip</h3>
                  <p className="text-sm text-gray-600">
                    Set your operating hours now to help workers know when you're open. You can always edit these later.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkplaceForm;
