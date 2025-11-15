import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const STEPS = [
  { number: 1, title: 'Company Info', description: 'Tell us about your business' },
  { number: 2, title: 'First Workplace', description: 'Add your main location' },
  { number: 3, title: 'Create Shift', description: 'Schedule your first shift' },
  { number: 4, title: 'Add Roles', description: 'Define job positions' },
  { number: 5, title: 'Hire Workers', description: 'Invite or find workers' }
];

const EmployerOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState({
    // Step 1: Company Info
    company_name: '',
    industry: '',
    contact_person: '',
    company_address: '',
    company_postal_code: '',
    
    // Step 2: Workplace
    workplace_name: '',
    workplace_address: '',
    workplace_postal_code: '',
    job_matching_radius_km: 20,
    
    // Step 3: Shift
    shift_date: '',
    start_time: '09:00',
    end_time: '17:00',
    shift_type: 'regular',
    
    // Step 4: Roles
    roles: [{
      role_title: '',
      hourly_rate: '',
      required_skills: [],
      required_certifications: []
    }],
    
    // Step 5: Hiring method
    hiring_method: 'post_publicly' // or 'invite_existing'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = async () => {
    setError('');
    
    if (currentStep === 1) {
      // Validate company info
      if (!data.company_name || !data.industry) {
        setError('Please fill in all required fields');
        return;
      }
      
      // Save company profile
      setLoading(true);
      try {
        await api.patch('/api/employer/me/profile', {
          company_name: data.company_name,
          industry: data.industry,
          contact_person: data.contact_person,
          address: data.company_address,
          postal_code: data.company_postal_code
        });
        setCurrentStep(2);
      } catch (err) {
        setError('Failed to save company info');
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 2) {
      // Validate workplace
      if (!data.workplace_name || !data.workplace_address) {
        setError('Please fill in all required fields');
        return;
      }
      
      // Save workplace
      setLoading(true);
      try {
        const response = await api.post('/api/employer/workplaces', {
          workplace_name: data.workplace_name,
          address: data.workplace_address,
          postal_code: data.workplace_postal_code,
          job_matching_radius_km: data.job_matching_radius_km
        });
        setData({...data, workplace_id: response.data.data.workplace_id});
        setCurrentStep(3);
      } catch (err) {
        console.error('Workplace creation error:', err);
        setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to create workplace');
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 3) {
      // Validate shift times
      if (!data.shift_date) {
        setError('Please select a shift date');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Validate roles
      const hasValidRole = data.roles.some(r => r.role_title && r.hourly_rate);
      if (!hasValidRole) {
        setError('Please add at least one role with title and hourly rate');
        return;
      }
      setCurrentStep(5);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Create shift with roles
      await api.post('/api/employer/shifts', {
        workplace_id: data.workplace_id,
        shift_date: data.shift_date,
        start_time: data.start_time,
        end_time: data.end_time,
        shift_type: data.shift_type,
        roles: data.roles.map(r => ({
          role_title: r.role_title,
          hourly_rate: parseFloat(r.hourly_rate),
          required_skills: r.required_skills,
          required_certifications: r.required_certifications
        }))
      });
      
      // Mark onboarding as complete
      await api.patch('/api/employer/me/profile', {
        onboarding_completed: true
      });
      
      // Navigate to dashboard
      navigate('/employer/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const addRole = () => {
    setData({
      ...data,
      roles: [...data.roles, {
        role_title: '',
        hourly_rate: '',
        required_skills: [],
        required_certifications: []
      }]
    });
  };

  const updateRole = (index, field, value) => {
    const newRoles = [...data.roles];
    newRoles[index][field] = value;
    setData({...data, roles: newRoles});
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Header */}
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold">Welcome to HR Bank!</h1>
              <p className="text-sm opacity-90">Let's get your account set up</p>
            </div>
          </div>
          
          {/* Progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((step) => (
              <div key={step.number} className="flex-1">
                <div className={`h-2 rounded-full transition-all ${
                  step.number <= currentStep ? 'bg-white' : 'bg-white/30'
                }`}></div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-2 opacity-75">Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {/* Step 1: Company Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell Us About Your Business</h2>
                <p className="text-gray-600">This information helps us verify your account</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={data.company_name}
                  onChange={(e) => setData({...data, company_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="ABC Company Inc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry <span className="text-red-500">*</span>
                </label>
                <select
                  value={data.industry}
                  onChange={(e) => setData({...data, industry: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  required
                >
                  <option value="">Select industry</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Hospitality">Hospitality</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Food Processing">Food Processing</option>
                  <option value="Warehousing">Warehousing</option>
                  <option value="Construction">Construction</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={data.contact_person}
                  onChange={(e) => setData({...data, contact_person: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Address
                </label>
                <input
                  type="text"
                  value={data.company_address}
                  onChange={(e) => setData({...data, company_address: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="123 Main St, Windsor, ON"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <strong>Admin Verification:</strong> Our team will review and verify your company information before activating your account. You'll receive an email once approved (usually within 24 hours).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: First Workplace */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Workplace</h2>
                <p className="text-gray-600">Add your main business location</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workplace Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={data.workplace_name}
                  onChange={(e) => setData({...data, workplace_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="e.g., Main Office, Downtown Location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={data.workplace_address}
                  onChange={(e) => setData({...data, workplace_address: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="123 Main St, Windsor, ON"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={data.workplace_postal_code}
                  onChange={(e) => setData({...data, workplace_postal_code: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="N9A 1A1"
                  maxLength={7}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Matching Radius: {data.job_matching_radius_km} km
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={data.job_matching_radius_km}
                  onChange={(e) => setData({...data, job_matching_radius_km: parseInt(e.target.value)})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5 km (nearby)</span>
                  <span>50 km (wide area)</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  How far should we search for workers when you post jobs?
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Create Shift */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Shift</h2>
                <p className="text-gray-600">Schedule when you need workers</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setData({...data, shift_type: 'regular'})}
                    className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                      data.shift_type === 'regular' ? 'border-current text-white' : 'border-gray-300 text-gray-700'
                    }`}
                    style={{
                      backgroundColor: data.shift_type === 'regular' ? theme.primaryColor : 'white',
                      borderColor: data.shift_type === 'regular' ? theme.primaryColor : undefined
                    }}
                  >
                    Regular (Max 8 hours)
                  </button>
                  <button
                    type="button"
                    onClick={() => setData({...data, shift_type: 'overtime'})}
                    className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                      data.shift_type === 'overtime' ? 'border-current text-white' : 'border-gray-300 text-gray-700'
                    }`}
                    style={{
                      backgroundColor: data.shift_type === 'overtime' ? '#F59E0B' : 'white',
                      borderColor: data.shift_type === 'overtime' ? '#F59E0B' : undefined
                    }}
                  >
                    🔶 Overtime (Max 4 hours)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={data.shift_date}
                    onChange={(e) => setData({...data, shift_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={data.start_time}
                    onChange={(e) => setData({...data, start_time: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={data.end_time}
                    onChange={(e) => setData({...data, end_time: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Add Roles */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Define Job Roles</h2>
                  <p className="text-gray-600">What positions do you need to fill?</p>
                </div>
                <button
                  type="button"
                  onClick={addRole}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  + Add Role
                </button>
              </div>

              {data.roles.map((role, index) => (
                <div key={index} className="p-6 border-2 border-gray-200 rounded-lg space-y-4">
                  <h4 className="font-semibold text-gray-900">Role {index + 1}</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={role.role_title}
                        onChange={(e) => updateRole(index, 'role_title', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        placeholder="e.g., Personal Support Worker"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hourly Rate <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="15"
                          value={role.hourly_rate}
                          onChange={(e) => updateRole(index, 'hourly_rate', e.target.value)}
                          className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                          placeholder="20.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 5: Hiring Method */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">How Do You Want to Fill These Roles?</h2>
                <p className="text-gray-600">Choose your hiring method</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setData({...data, hiring_method: 'post_publicly'})}
                  className={`p-6 rounded-lg border-2 text-left transition-all ${
                    data.hiring_method === 'post_publicly' ? 'border-current' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{
                    borderColor: data.hiring_method === 'post_publicly' ? theme.primaryColor : undefined,
                    backgroundColor: data.hiring_method === 'post_publicly' ? `${theme.primaryColor}10` : 'white'
                  }}
                >
                  <div className="text-3xl mb-3">🌐</div>
                  <h4 className="font-semibold text-gray-900 mb-2">Post Publicly</h4>
                  <p className="text-sm text-gray-600">
                    Match with verified workers on the platform. Best for finding new talent.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setData({...data, hiring_method: 'invite_existing'})}
                  className={`p-6 rounded-lg border-2 text-left transition-all ${
                    data.hiring_method === 'invite_existing' ? 'border-current' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{
                    borderColor: data.hiring_method === 'invite_existing' ? theme.primaryColor : undefined,
                    backgroundColor: data.hiring_method === 'invite_existing' ? `${theme.primaryColor}10` : 'white'
                  }}
                >
                  <div className="text-3xl mb-3">👥</div>
                  <h4 className="font-semibold text-gray-900 mb-2">Invite Existing Staff</h4>
                  <p className="text-sm text-gray-600">
                    Assign to workers you already know. You can invite them later.
                  </p>
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Almost Done!</h4>
                    <p className="text-sm text-green-700">
                      You've created: {data.company_name} → {data.workplace_name} → {data.roles.length} role(s)
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      Click Complete to finish setup. Your account will be reviewed by our admin team.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-8 border-t border-gray-200 mt-8">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
            )}
            
            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 ml-auto"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {loading ? 'Saving...' : 'Next'}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 ml-auto"
                style={{ backgroundColor: theme.accentColor }}
              >
                {loading ? 'Completing...' : 'Complete Setup ✓'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployerOnboarding;
