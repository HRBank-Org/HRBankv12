import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const CreateShift = () => {
  const { workplaceId } = useParams();
  const [workplace, setWorkplace] = useState(null);
  const [roles, setRoles] = useState([{
    role_title: '',
    required_skills: [],
    required_certifications: [],
    hourly_rate: ''
  }]);
  const [formData, setFormData] = useState({
    shift_date: '',
    start_time: '09:00',
    end_time: '17:00',
    shift_type: 'regular'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadWorkplace();
  }, [workplaceId]);

  // Calculate duration in real-time
  const calculateDuration = () => {
    const startHour = parseInt(formData.start_time.split(':')[0]);
    const startMin = parseInt(formData.start_time.split(':')[1]);
    const endHour = parseInt(formData.end_time.split(':')[0]);
    const endMin = parseInt(formData.end_time.split(':')[1]);
    
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    return durationMinutes / 60;
  };

  const duration = calculateDuration();
  const isValidDuration = formData.shift_type === 'regular' ? duration <= 8 : duration <= 4;


  const loadWorkplace = async () => {
    try {
      const response = await api.get('/api/employer/workplaces');
      const wp = response.data.data.workplaces.find(w => w.workplace_id === workplaceId);
      setWorkplace(wp);
    } catch (error) {
      console.error('Failed to load workplace:', error);
    }
  };

  const addRole = () => {
    setRoles([...roles, {
      role_title: '',
      required_skills: [],
      required_certifications: [],
      hourly_rate: ''
    }]);
  };

  const updateRole = (index, field, value) => {
    const newRoles = [...roles];
    newRoles[index][field] = value;
    setRoles(newRoles);
  };

  const removeRole = (index) => {
    if (roles.length > 1) {
      setRoles(roles.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate shift duration
    const startHour = parseInt(formData.start_time.split(':')[0]);
    const startMin = parseInt(formData.start_time.split(':')[1]);
    const endHour = parseInt(formData.end_time.split(':')[0]);
    const endMin = parseInt(formData.end_time.split(':')[1]);
    
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const durationHours = durationMinutes / 60;
    
    if (durationHours <= 0) {
      setError('End time must be after start time');
      return;
    }
    
    if (formData.shift_type === 'regular' && durationHours > 8) {
      setError('Regular shifts cannot exceed 8 hours. Please reduce duration or select overtime shift.');
      return;
    }
    
    if (formData.shift_type === 'overtime' && durationHours > 4) {
      setError('Overtime shifts cannot exceed 4 hours.');
      return;
    }

    setLoading(true);

    try {
      const shiftData = {
        workplace_id: workplaceId,
        ...formData,
        roles: roles.map(r => ({
          ...r,
          hourly_rate: parseFloat(r.hourly_rate)
        }))
      };

      await api.post('/api/employer/shifts', shiftData);
      navigate(`/employer/workplaces/${workplaceId}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.error?.detail || 'Failed to create shift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <header className="text-white px-6 py-4 shadow-md" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(`/employer/workplaces/${workplaceId}`)} className="hover:opacity-80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold">Create Shift</h1>
            <p className="text-sm opacity-90">{workplace?.workplace_name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shift Details</h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Shift Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">When?</h3>
              
              {/* Shift Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, shift_type: 'regular'})}
                    className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                      formData.shift_type === 'regular'
                        ? 'border-current text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                    style={{
                      backgroundColor: formData.shift_type === 'regular' ? theme.primaryColor : 'white',
                      borderColor: formData.shift_type === 'regular' ? theme.primaryColor : undefined
                    }}
                  >
                    Regular Shift (Max 8 hours)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, shift_type: 'overtime'})}
                    className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                      formData.shift_type === 'overtime'
                        ? 'border-current text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                    style={{
                      backgroundColor: formData.shift_type === 'overtime' ? '#F59E0B' : 'white',
                      borderColor: formData.shift_type === 'overtime' ? '#F59E0B' : undefined
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
                    name="shift_date"
                    type="date"
                    required
                    value={formData.shift_date}
                    onChange={(e) => setFormData({...formData, shift_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="start_time"
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="end_time"
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Duration Display */}
              <div className={`p-4 rounded-lg border-2 ${
                !isValidDuration ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'
              }`}>
                <div className="flex items-center gap-2">
                  {!isValidDuration ? (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className={`text-sm font-medium ${!isValidDuration ? 'text-red-800' : 'text-blue-800'}`}>
                    Duration: {duration.toFixed(1)} hours
                    {!isValidDuration && (
                      <span className="ml-2">
                        (Exceeds {formData.shift_type === 'regular' ? '8' : '4'} hour limit!)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Roles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Roles/Jobs in This Shift</h3>
                <button
                  type="button"
                  onClick={addRole}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  + Add Another Role
                </button>
              </div>

              {roles.map((role, index) => (
                <div key={index} className="p-6 border-2 border-gray-200 rounded-lg space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Role {index + 1}</h4>
                    {roles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRole(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={role.role_title}
                        onChange={(e) => updateRole(index, 'role_title', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        placeholder="e.g., PSW, Security Guard"
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
                          required
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

            {/* Action Buttons */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                After creating this shift, you can assign workers or post it publicly to find candidates.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate(`/employer/workplaces/${workplaceId}`)}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-lg text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {loading ? 'Creating Shift...' : 'Create Shift'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateShift;
