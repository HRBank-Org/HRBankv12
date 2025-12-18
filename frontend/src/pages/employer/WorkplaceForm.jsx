import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import AddressAutocomplete from '../../components/common/AddressAutocomplete';
import api from '../../utils/api';
import { FiMapPin, FiUsers, FiClock, FiSave, FiX, FiChevronRight, FiCalendar, FiTrash2, FiToggleLeft, FiToggleRight, FiAlertTriangle, FiNavigation, FiHome } from 'react-icons/fi';

const WorkplaceForm = () => {
  const { workplaceId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isEditMode = !!workplaceId;
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [assignedWorkers, setAssignedWorkers] = useState([]);
  const [mode, setMode] = useState(isEditMode ? 'view' : 'edit'); // 'view', 'edit'
  const [workplaceStatus, setWorkplaceStatus] = useState('active');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [dependencies, setDependencies] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    workplace_name: '',
    address: '',
    city: '',
    province: 'ON',
    postal_code: '',
    latitude: null,
    longitude: null,
    phone: '',
    email: '',
    job_matching_radius_km: 20,
    timezone: 'America/Toronto',
    // Work Mode Configuration
    work_mode: 'on_site', // 'on_site' | 'field_service'
    schedule_pattern: 'standard', // 'standard' | 'continental' | 'flexible'
    service_area_name: '', // For field_service mode
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
  const [addressValid, setAddressValid] = useState(false);

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
          latitude: wp.latitude || wp.lat || null,
          longitude: wp.longitude || wp.lng || null,
          phone: wp.phone || '',
          email: wp.email || '',
          job_matching_radius_km: wp.job_matching_radius_km || wp.geofence_radius || 20,
          timezone: wp.timezone || 'America/Toronto',
          operating_hours: wp.operating_hours || formData.operating_hours
        });
        setWorkplaceStatus(wp.status || 'active');
        setAddressValid(true); // Existing data is assumed valid
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
  
  // Load dependencies before delete/deactivate
  const loadDependencies = async () => {
    try {
      const res = await api.get(`/api/employer/workplaces/${workplaceId}/dependencies`);
      setDependencies(res.data.data);
      return res.data.data;
    } catch (error) {
      console.error('Failed to load dependencies:', error);
      return null;
    }
  };
  
  // Handle status toggle (activate/deactivate)
  const handleStatusToggle = async () => {
    const deps = await loadDependencies();
    if (deps && deps.has_dependencies && workplaceStatus === 'active') {
      setShowDeactivateModal(true);
    } else {
      confirmStatusToggle();
    }
  };
  
  const confirmStatusToggle = async () => {
    setActionLoading(true);
    try {
      const newStatus = workplaceStatus === 'active' ? 'inactive' : 'active';
      await api.patch(`/api/employer/workplaces/${workplaceId}/status`, { status: newStatus });
      setWorkplaceStatus(newStatus);
      setShowDeactivateModal(false);
      alert(`Workplace ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle delete
  const handleDelete = async () => {
    const deps = await loadDependencies();
    setShowDeleteModal(true);
  };
  
  const confirmDelete = async (force = false) => {
    setActionLoading(true);
    try {
      await api.delete(`/api/employer/workplaces/${workplaceId}?force=${force}`);
      setShowDeleteModal(false);
      alert('Workplace deleted successfully');
      navigate('/employer/workplaces');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete workplace');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle address autocomplete change
  const handleAddressChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      address: addressData.street_address || '',
      city: addressData.city || '',
      province: addressData.province || 'ON',
      postal_code: addressData.postal_code || '',
      latitude: addressData.latitude || null,
      longitude: addressData.longitude || null
    }));
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
    return formData.workplace_name && formData.address && formData.city && formData.province;
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

  // Render Dependency Modal (for both deactivate and delete)
  const renderDependencyModal = () => {
    if (!showDeactivateModal && !showDeleteModal) return null;
    
    const isDeactivate = showDeactivateModal;
    const title = isDeactivate ? 'Deactivate Workplace' : 'Delete Workplace';
    const actionText = isDeactivate ? 'Deactivate' : 'Delete';
    const actionColor = isDeactivate ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700';
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${isDeactivate ? 'bg-amber-100' : 'bg-red-100'}`}>
                <FiAlertTriangle size={24} className={isDeactivate ? 'text-amber-600' : 'text-red-600'} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-600">{formData.workplace_name}</p>
              </div>
            </div>
          </div>
          
          {/* Body */}
          <div className="p-6 space-y-4">
            {dependencies ? (
              <>
                {dependencies.has_dependencies && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800 font-medium mb-3">
                      This workplace has active dependencies:
                    </p>
                    <ul className="space-y-2 text-sm text-amber-700">
                      {dependencies.active_shifts_count > 0 && (
                        <li className="flex items-center gap-2">
                          <FiCalendar size={16} />
                          <span><strong>{dependencies.active_shifts_count}</strong> active/upcoming shift(s)</span>
                        </li>
                      )}
                      {dependencies.assigned_workers_count > 0 && (
                        <li className="flex items-center gap-2">
                          <FiUsers size={16} />
                          <span><strong>{dependencies.assigned_workers_count}</strong> assigned worker(s)</span>
                        </li>
                      )}
                      {dependencies.roles_count > 0 && (
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs">R</span>
                          <span><strong>{dependencies.roles_count}</strong> role(s) at this workplace</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                
                {isDeactivate ? (
                  <div className="text-gray-600 space-y-2">
                    <p><strong>Deactivating this workplace will:</strong></p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                      <li>Prevent new shifts from being created here</li>
                      <li>Keep existing shifts and assignments active</li>
                      <li>Deactivate all roles at this workplace</li>
                      <li>Move assigned workers to your general workforce inventory</li>
                    </ul>
                    <p className="text-sm mt-3 text-amber-700 font-medium">
                      ⚠️ Workers unassigned for more than 2 weeks will be automatically terminated from your workforce.
                    </p>
                  </div>
                ) : (
                  <div className="text-gray-600 space-y-2">
                    {dependencies?.can_delete ? (
                      <p className="text-sm">
                        This workplace has no active dependencies and can be safely deleted.
                      </p>
                    ) : (
                      <>
                        <p><strong>Deleting this workplace will:</strong></p>
                        <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                          <li>Cancel all active shifts at this location</li>
                          <li>Unassign all workers from this workplace</li>
                          <li>Delete all roles associated with this workplace</li>
                          <li>Move unassigned workers to your workforce inventory</li>
                        </ul>
                        <p className="text-sm mt-3 text-red-600 font-medium">
                          ⚠️ This action cannot be undone. Consider deactivating instead if you may need this workplace later.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowDeactivateModal(false);
                setShowDeleteModal(false);
                setDependencies(null);
              }}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              disabled={actionLoading}
            >
              Cancel
            </button>
            {isDeactivate ? (
              <button
                onClick={confirmStatusToggle}
                disabled={actionLoading || !dependencies}
                className={`px-5 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${actionColor}`}
              >
                {actionLoading ? 'Processing...' : 'Deactivate Workplace'}
              </button>
            ) : (
              <button
                onClick={() => confirmDelete(!dependencies?.can_delete)}
                disabled={actionLoading || !dependencies}
                className={`px-5 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${actionColor}`}
              >
                {actionLoading ? 'Deleting...' : (dependencies?.can_delete ? 'Delete Workplace' : 'Force Delete')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <ModernSidebar />
      
      {/* Dependency Modal */}
      {renderDependencyModal()}
      
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
                <div className="flex items-center gap-3">
                  {/* Status Badge */}
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    workplaceStatus === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {workplaceStatus === 'active' ? '● Active' : '○ Inactive'}
                  </span>
                  
                  {/* Status Toggle Button */}
                  <button
                    onClick={handleStatusToggle}
                    className={`p-2 rounded-lg transition-colors ${
                      workplaceStatus === 'active'
                        ? 'text-amber-600 hover:bg-amber-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={workplaceStatus === 'active' ? 'Deactivate Workplace' : 'Activate Workplace'}
                  >
                    {workplaceStatus === 'active' ? <FiToggleRight size={24} /> : <FiToggleLeft size={24} />}
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={handleDelete}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Workplace"
                  >
                    <FiTrash2 size={20} />
                  </button>
                  
                  {/* Edit Button */}
                  <button
                    onClick={() => setMode('edit')}
                    className="px-6 py-3 rounded-lg border-2 font-medium hover:bg-gray-50 transition-colors"
                    style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                  >
                    Edit Details
                  </button>
                </div>
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

                  {/* Address Section */}
                  {mode === 'edit' ? (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FiMapPin size={16} />
                        Location Address
                      </h3>
                      <AddressAutocomplete
                        value={{
                          street_address: formData.address,
                          city: formData.city,
                          province: formData.province,
                          postal_code: formData.postal_code,
                          latitude: formData.latitude,
                          longitude: formData.longitude
                        }}
                        onChange={handleAddressChange}
                        onValidationChange={setAddressValid}
                        required={true}
                        disabled={false}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <p className="text-gray-900">{formData.address}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                          <p className="text-gray-900">{formData.city}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
                          <p className="text-gray-900">{formData.province}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                        <p className="text-gray-900">{formData.postal_code}</p>
                      </div>
                      {formData.latitude && formData.longitude && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <FiMapPin size={12} />
                          Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                        </p>
                      )}
                    </div>
                  )}

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
                    Set your operating hours now to help workers know when you&apos;re open. You can always edit these later.
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
