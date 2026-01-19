import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import api from '../../utils/api';
import { FiSave, FiX, FiUsers, FiDollarSign, FiAward, FiMapPin } from 'react-icons/fi';

const RoleForm = () => {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isEditMode = !!roleId;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [workplaces, setWorkplaces] = useState([]);
  const [occupations, setOccupations] = useState([]);
  
  const [formData, setFormData] = useState({
    workplace_id: '',
    role_name: '',
    occupation_template: '',
    work_type: 'on_site', // on_site, route_based, continental
    continental_config: null,
    route_config: null,
    required_skills: [],
    additional_certifications: [],
    generic_tasks: [],
    hourly_rate: '',
    description: '',
    positions_available: 1,
    coop_volunteer_eligible: false // For high school co-op/volunteer programs
  });

  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState('');
  const [minimumRate, setMinimumRate] = useState(null);
  const [rateError, setRateError] = useState('');
  const [requiredCertifications, setRequiredCertifications] = useState([]);
  const [selectedWorkplaceProvince, setSelectedWorkplaceProvince] = useState('ON');
  const [defaultWorkType, setDefaultWorkType] = useState(null); // Inherited from occupation template
  const [workTypeOverridden, setWorkTypeOverridden] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);
  
  // Fetch compliance data (minimum rate + required certifications + default work type) when occupation or workplace changes
  const fetchComplianceData = async (occupationTitle, provinceCode = 'ON') => {
    if (!occupationTitle) {
      setMinimumRate(null);
      setRequiredCertifications([]);
      setDefaultWorkType(null);
      return;
    }
    
    try {
      // Fetch minimum rate
      const rateResponse = await api.get(`/api/admin/occupations/minimum-rate/${encodeURIComponent(occupationTitle)}?province_code=${provinceCode}`);
      const rateData = rateResponse.data.data;
      setMinimumRate(rateData);
      
      // Auto-set hourly rate if not already set or if current rate is lower
      if (!formData.hourly_rate || parseFloat(formData.hourly_rate) < rateData.effective_minimum_rate) {
        setFormData(prev => ({
          ...prev,
          hourly_rate: rateData.effective_minimum_rate.toFixed(2)
        }));
      }
    } catch (error) {
      console.error('Failed to fetch minimum rate:', error);
    }
    
    try {
      // Fetch required certifications
      const certResponse = await api.get(`/api/admin/occupations/required-certifications/${encodeURIComponent(occupationTitle)}?province_code=${provinceCode}`);
      const certData = certResponse.data.data;
      setRequiredCertifications(certData.required_certifications || []);
      
      // Auto-add required certifications to the form
      const requiredCertNames = certData.required_certifications
        ?.filter(c => c.required)
        .map(c => c.name) || [];
      
      if (requiredCertNames.length > 0) {
        setFormData(prev => ({
          ...prev,
          additional_certifications: [
            ...new Set([...prev.additional_certifications, ...requiredCertNames])
          ]
        }));
      }
    } catch (error) {
      console.error('Failed to fetch required certifications:', error);
    }
    
    // Fetch default work type from occupation template
    try {
      const workTypeResponse = await api.get(`/api/admin/occupations/default-work-type/${encodeURIComponent(occupationTitle)}`);
      const workTypeData = workTypeResponse.data.data;
      setDefaultWorkType(workTypeData);
      
      // Auto-set work type if not overridden by user
      if (!workTypeOverridden && !isEditMode) {
        const newWorkType = workTypeData.default_work_type;
        setFormData(prev => ({
          ...prev,
          work_type: newWorkType,
          continental_config: newWorkType === 'continental' 
            ? { pattern: 'dupont', day_shift: { start: '06:00', end: '18:00' }, night_shift: { start: '18:00', end: '06:00' } }
            : null,
          route_config: newWorkType === 'route_based'
            ? { default_duration_hours: 8, allow_recurring_routes: true }
            : null
        }));
      }
    } catch (error) {
      console.error('Failed to fetch default work type:', error);
    }
  };
  
  // Get province from workplace
  const getWorkplaceProvince = (workplaceId) => {
    const workplace = workplaces.find(w => w.workplace_id === workplaceId);
    return workplace?.province || 'ON';
  };

  const loadInitialData = async () => {
    try {
      const [workplacesRes, occupationsRes] = await Promise.all([
        api.get('/api/employer/workplaces'),
        fetch('/occupations.json').then(r => r.json()).catch(() => ({ categories: [] }))
      ]);

      setWorkplaces(workplacesRes.data.data.workplaces || []);
      
      // Extract occupations from categories
      const allOccupations = [];
      if (occupationsRes.categories) {
        occupationsRes.categories.forEach(cat => {
          if (cat.occupations) {
            cat.occupations.forEach(occ => {
              if (typeof occ === 'string') {
                allOccupations.push(occ);
              } else if (occ.title) {
                allOccupations.push(occ.title);
              }
            });
          }
        });
      }
      setOccupations(allOccupations);

      // If edit mode, load role data
      if (isEditMode) {
        const roleRes = await api.get(`/api/employer/workplace-roles/${roleId}`);
        const role = roleRes.data.data; // Fixed: data contains the role directly
        
        setFormData({
          workplace_id: role.workplace_id || '',
          role_name: role.role_name || '',
          occupation_template: role.occupation_template || '',
          work_type: role.work_type || role.shift_type || 'on_site', // backward compat
          continental_config: role.continental_config || null,
          route_config: role.route_config || null,
          coop_volunteer_eligible: role.coop_volunteer_eligible || false,
          required_skills: role.required_skills || [],
          additional_certifications: role.required_certifications || [],
          generic_tasks: role.generic_tasks || [],
          hourly_rate: role.hourly_rate || '',
          description: role.description || '',
          positions_available: role.positions_available || 1
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // When workplace changes, update province and re-fetch compliance data
    if (name === 'workplace_id') {
      const province = getWorkplaceProvince(value);
      setSelectedWorkplaceProvince(province);
      if (formData.occupation_template) {
        fetchComplianceData(formData.occupation_template, province);
      }
    }
    
    // When occupation changes, fetch compliance data
    if (name === 'occupation_template') {
      fetchComplianceData(value, selectedWorkplaceProvince);
    }
    
    // Validate hourly rate against minimum
    if (name === 'hourly_rate' && minimumRate) {
      if (parseFloat(value) < minimumRate.effective_minimum_rate) {
        setRateError(`Rate must be at least $${minimumRate.effective_minimum_rate.toFixed(2)}/hr (provincial minimum + occupation requirement)`);
      } else {
        setRateError('');
      }
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.required_skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        required_skills: [...prev.required_skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(s => s !== skill)
    }));
  };

  const addCertification = () => {
    if (newCert.trim() && !formData.additional_certifications.includes(newCert.trim())) {
      setFormData(prev => ({
        ...prev,
        additional_certifications: [...prev.additional_certifications, newCert.trim()]
      }));
      setNewCert('');
    }
  };

  const removeCertification = (cert) => {
    setFormData(prev => ({
      ...prev,
      additional_certifications: prev.additional_certifications.filter(c => c !== cert)
    }));
  };

  // Task functions removed - now using simple textarea input

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        positions_available: parseInt(formData.positions_available) || 1
      };

      if (isEditMode) {
        await api.put(`/api/employer/workplace-roles/${roleId}/update`, payload);
      } else {
        await api.post('/api/employer/workplace-roles/create', payload);
      }

      navigate('/employer/roles');
    } catch (error) {
      console.error('Failed to save role:', error);
      alert(error.response?.data?.detail || 'Failed to save role. Please check all fields.');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    return formData.role_name && formData.occupation_template;
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
                onClick={() => navigate('/employer/roles')} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Role' : 'Create New Role'}
                </h1>
                <p className="text-gray-600 mt-1">Define position requirements and compensation</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/employer/roles')}
                className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <FiX size={18} />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !isFormValid()}
                className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <FiSave size={18} />
                {saving ? 'Saving...' : (isEditMode ? 'Update Role' : 'Create Role')}
              </button>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="max-w-4xl mx-auto px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workplace <span className="text-gray-400">(Optional - Leave blank for general role)</span>
                  </label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <select
                      name="workplace_id"
                      value={formData.workplace_id}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                    >
                      <option value="">General Role (All Workplaces)</option>
                      {workplaces.map(wp => (
                        <option key={wp.workplace_id} value={wp.workplace_id}>
                          {wp.name || wp.workplace_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="role_name"
                    value={formData.role_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Head Chef, Night Security Guard"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Occupation Template <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <select
                      name="occupation_template"
                      value={formData.occupation_template}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                      required
                    >
                      <option value="">Select occupation...</option>
                      {occupations.map(occ => (
                        <option key={occ} value={occ}>{occ}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This links to certification requirements and minimum wage
                  </p>
                </div>

                {/* Shift Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Type <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Default Work Type Indicator */}
                  {defaultWorkType && (
                    <div className={`mb-3 p-3 rounded-lg border ${
                      workTypeOverridden 
                        ? 'bg-amber-50 border-amber-200' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {defaultWorkType.default_work_type === 'on_site' ? '🏢' : 
                             defaultWorkType.default_work_type === 'route_based' ? '🚗' : '🔄'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {workTypeOverridden ? (
                                <>Overriding default: <span className="text-amber-700">{defaultWorkType.default_work_type.replace('_', '-')}</span></>
                              ) : (
                                <>Default for {formData.occupation_template}: <span className="text-green-700">{defaultWorkType.default_work_type.replace('_', '-')}</span></>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{defaultWorkType.work_type_description}</p>
                          </div>
                        </div>
                        {workTypeOverridden && (
                          <button
                            type="button"
                            onClick={() => {
                              setWorkTypeOverridden(false);
                              const newType = defaultWorkType.default_work_type;
                              setFormData(prev => ({
                                ...prev,
                                work_type: newType,
                                continental_config: newType === 'continental' 
                                  ? { pattern: 'dupont', day_shift: { start: '06:00', end: '18:00' }, night_shift: { start: '18:00', end: '06:00' } }
                                  : null,
                                route_config: newType === 'route_based'
                                  ? { default_duration_hours: 8, allow_recurring_routes: true }
                                  : null
                              }));
                            }}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Reset to default
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-3">
                    {/* On-Site */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, work_type: 'on_site', continental_config: null, route_config: null }));
                        if (defaultWorkType && defaultWorkType.default_work_type !== 'on_site') {
                          setWorkTypeOverridden(true);
                        } else {
                          setWorkTypeOverridden(false);
                        }
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                        formData.work_type === 'on_site'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {defaultWorkType?.default_work_type === 'on_site' && (
                        <span className="absolute top-2 right-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Default</span>
                      )}
                      <div className="text-2xl mb-2">🏢</div>
                      <h4 className="font-semibold text-gray-900">On-Site</h4>
                      <p className="text-xs text-gray-500 mt-1">Standard shifts at workplace location</p>
                      <p className="text-xs text-blue-600 mt-2">GPS clock-in at workplace</p>
                    </button>

                    {/* Route-Based */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ 
                          ...prev, 
                          work_type: 'route_based', 
                          continental_config: null,
                          route_config: { default_duration_hours: 8, allow_recurring_routes: true }
                        }));
                        if (defaultWorkType && defaultWorkType.default_work_type !== 'route_based') {
                          setWorkTypeOverridden(true);
                        } else {
                          setWorkTypeOverridden(false);
                        }
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                        formData.work_type === 'route_based'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {defaultWorkType?.default_work_type === 'route_based' && (
                        <span className="absolute top-2 right-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Default</span>
                      )}
                      <div className="text-2xl mb-2">🚗</div>
                      <h4 className="font-semibold text-gray-900">Route-Based</h4>
                      <p className="text-xs text-gray-500 mt-1">Multi-stop tasks at different locations</p>
                      <p className="text-xs text-orange-600 mt-2">GPS at each stop</p>
                    </button>

                    {/* Continental */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ 
                          ...prev, 
                          work_type: 'continental',
                          route_config: null,
                          continental_config: { pattern: 'dupont', day_shift: { start: '06:00', end: '18:00' }, night_shift: { start: '18:00', end: '06:00' } }
                        }));
                        if (defaultWorkType && defaultWorkType.default_work_type !== 'continental') {
                          setWorkTypeOverridden(true);
                        } else {
                          setWorkTypeOverridden(false);
                        }
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                        formData.work_type === 'continental'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {defaultWorkType?.default_work_type === 'continental' && (
                        <span className="absolute top-2 right-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Default</span>
                      )}
                      <div className="text-2xl mb-2">🔄</div>
                      <h4 className="font-semibold text-gray-900">Continental</h4>
                      <p className="text-xs text-gray-500 mt-1">12-hour rotating shift patterns</p>
                      <p className="text-xs text-indigo-600 mt-2">DuPont/Panama/Pitman</p>
                    </button>
                  </div>
                </div>

                {/* Continental Config (when continental is selected) */}
                {formData.work_type === 'continental' && (
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                    <h4 className="font-medium text-indigo-900 mb-3">Continental Shift Configuration</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-indigo-700 mb-1">Pattern</label>
                        <select
                          value={formData.continental_config?.pattern || 'dupont'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            continental_config: { ...prev.continental_config, pattern: e.target.value }
                          }))}
                          className="w-full px-3 py-2 text-sm border border-indigo-300 rounded-lg"
                        >
                          <option value="dupont">DuPont (2D-2N-4Off)</option>
                          <option value="panama">Panama (2-2-3)</option>
                          <option value="pitman">Pitman (2-3-2)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-indigo-700 mb-1">Day Shift</label>
                        <input
                          type="text"
                          value={formData.continental_config?.day_shift?.start || '06:00'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            continental_config: { 
                              ...prev.continental_config, 
                              day_shift: { ...prev.continental_config?.day_shift, start: e.target.value, end: '18:00' }
                            }
                          }))}
                          placeholder="06:00"
                          className="w-full px-3 py-2 text-sm border border-indigo-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-indigo-700 mb-1">Night Shift</label>
                        <input
                          type="text"
                          value={formData.continental_config?.night_shift?.start || '18:00'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            continental_config: { 
                              ...prev.continental_config, 
                              night_shift: { ...prev.continental_config?.night_shift, start: e.target.value, end: '06:00' }
                            }
                          }))}
                          placeholder="18:00"
                          className="w-full px-3 py-2 text-sm border border-indigo-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Route Config (when route_based is selected) */}
                {formData.work_type === 'route_based' && (
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <h4 className="font-medium text-orange-900 mb-3">Route Configuration</h4>
                    <p className="text-sm text-orange-700 mb-3">
                      Workers will complete tasks at multiple locations. You can create recurring routes or ad-hoc daily routes.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allow_recurring"
                        checked={formData.route_config?.allow_recurring_routes !== false}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          route_config: { ...prev.route_config, allow_recurring_routes: e.target.checked }
                        }))}
                        className="rounded border-orange-300"
                      />
                      <label htmlFor="allow_recurring" className="text-sm text-orange-800">
                        Allow recurring routes (same stops daily)
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generic Tasks (One per line)
                  </label>
                  <textarea
                    name="generic_tasks_text"
                    value={formData.generic_tasks.map(t => t.task_name).join('\n')}
                    onChange={(e) => {
                      const tasks = e.target.value.split('\n').filter(t => t.trim()).map(taskName => ({
                        task_name: taskName.trim(),
                        estimated_minutes: 15,
                        is_mandatory: true
                      }));
                      setFormData(prev => ({ ...prev, generic_tasks: tasks }));
                    }}
                    rows={6}
                    placeholder="Enter tasks that workers will complete during shifts (one per line)&#10;Example:&#10;Set up workstation&#10;Clean and organize area&#10;Complete daily checklist&#10;End-of-shift cleanup"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    These tasks will be inherited by all shifts for this role. Employers can add shift-specific tasks when creating shifts.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate *
                    </label>
                    <div className="relative">
                      <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        name="hourly_rate"
                        value={formData.hourly_rate}
                        onChange={handleInputChange}
                        step="0.01"
                        min={minimumRate?.effective_minimum_rate || 0}
                        placeholder={minimumRate ? minimumRate.effective_minimum_rate.toFixed(2) : "17.20"}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${rateError ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    </div>
                    {minimumRate && (
                      <p className="text-xs text-blue-600 mt-1">
                        💡 Minimum: ${minimumRate.effective_minimum_rate.toFixed(2)}/hr ({minimumRate.province_code} provincial + occupation)
                      </p>
                    )}
                    {rateError && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ {rateError}
                      </p>
                    )}
                    {!minimumRate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Select an occupation to see minimum rate
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Positions Available
                    </label>
                    <input
                      type="number"
                      name="positions_available"
                      value={formData.positions_available}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Co-op/Volunteer Program */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Student Programs</h2>
              <p className="text-gray-600 text-sm mb-4">
                Enable this role for high school co-op placements or volunteer opportunities
              </p>
              
              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all hover:border-purple-300"
                style={{ 
                  borderColor: formData.coop_volunteer_eligible ? '#9333ea' : '#e5e7eb',
                  backgroundColor: formData.coop_volunteer_eligible ? '#faf5ff' : 'white'
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.coop_volunteer_eligible}
                  onChange={(e) => setFormData(prev => ({ ...prev, coop_volunteer_eligible: e.target.checked }))}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  data-testid="coop-volunteer-checkbox"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎓</span>
                    <span className="font-semibold text-gray-900">Co-op / Volunteer Eligible</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Allow high school students to apply for co-op placements or volunteer hours in this role. 
                    Their hours will be tracked in their WorkPassport for credit purposes.
                  </p>
                  {formData.coop_volunteer_eligible && (
                    <div className="mt-3 p-3 bg-purple-100 rounded-lg">
                      <p className="text-sm text-purple-800">
                        <strong>When creating shifts for this role:</strong>
                        <br />• You can mark shifts as "Co-op" or "Volunteer" shifts
                        <br />• Students' hours will automatically be recorded in their WorkPassport
                        <br />• Schools and organizations can generate certificates from their end
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Required Skills */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Required Skills</h2>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Add a skill (e.g., Food Safety, Customer Service)"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Add
                  </button>
                </div>

                {formData.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.required_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg flex items-center gap-2"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="text-blue-700 hover:text-blue-900"
                        >
                          <FiX size={16} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Required Certifications (Provincial Compliance) */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FiAward size={24} />
                Certifications & Compliance
              </h2>
              
              {/* Provincial Requirements Notice */}
              {requiredCertifications.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    📋 Required for {selectedWorkplaceProvince} Compliance
                  </h3>
                  <p className="text-sm text-blue-700 mb-3">
                    These certifications are legally required for this occupation in {selectedWorkplaceProvince}. Workers must have these to be assigned to this role.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {requiredCertifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
                          cert.required 
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                        title={cert.description || ''}
                      >
                        {cert.required && <span className="text-red-500">*</span>}
                        {cert.name}
                        <span className="text-xs opacity-70">
                          ({cert.source === 'provincial' ? selectedWorkplaceProvince : 'occupation'})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {!formData.occupation_template && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    💡 Select an occupation and workplace to see provincial certification requirements
                  </p>
                </div>
              )}
              
              <p className="text-sm text-gray-600 mb-4">
                Add any additional certifications beyond the provincial requirements:
              </p>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCert}
                    onChange={(e) => setNewCert(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                    placeholder="Add extra certification"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCertification}
                    className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Add
                  </button>
                </div>

                {formData.additional_certifications.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Role certifications:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.additional_certifications.map((cert, idx) => {
                        const isRequired = requiredCertifications.some(rc => rc.name === cert && rc.required);
                        return (
                          <span
                            key={idx}
                            className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                              isRequired 
                                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {isRequired && <span className="text-xs">🔒</span>}
                            {cert}
                            {!isRequired && (
                              <button
                                type="button"
                                onClick={() => removeCertification(cert)}
                                className="text-green-700 hover:text-green-900"
                              >
                                <FiX size={16} />
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default RoleForm;
