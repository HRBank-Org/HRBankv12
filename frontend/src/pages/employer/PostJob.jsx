import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

import { useLanguage } from '../../contexts/LanguageContext';

const PostJob = () => {
  const [workplaces, setWorkplaces] = useState([]);
  const [credentialTypes, setCredentialTypes] = useState([]);
  const [formData, setFormData] = useState({
    workplace_id: '',
    shift_date: '',
    start_time: '09:00',
    end_time: '17:00',
    role_title: '',
    required_skills: [],
    required_certifications: [],
    hourly_rate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workplacesRes, credTypesRes] = await Promise.all([
        api.get('/api/employer/workplaces'),
        api.get('/api/credentials/types')
      ]);
      setWorkplaces(workplacesRes.data.data.workplaces);
      setCredentialTypes(credTypesRes.data.data.credential_types);
      
      if (workplacesRes.data.data.workplaces.length > 0) {
        setFormData(prev => ({ ...prev, workplace_id: workplacesRes.data.data.workplaces[0].workplace_id }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const shiftData = {
        ...formData,
        roles: [{
          role_title: formData.role_title,
          required_skills: formData.required_skills,
          required_certifications: formData.required_certifications,
          hourly_rate: parseFloat(formData.hourly_rate)
        }]
      };
      
      await api.post('/api/employer/shifts', shiftData);
      navigate('/employer/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  if (workplaces.length === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
        <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <h1 className="text-lg font-bold">Post a Job</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Workplaces Yet</h3>
            <p className="text-gray-600 mb-6">You need to create a workplace before posting jobs</p>
            <button
              onClick={() => navigate('/employer/workplace-setup')}
              className="px-6 py-3 rounded-lg text-white font-semibold"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Create Workplace
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/employer/dashboard')} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <h1 className="text-lg font-bold">Post a Job</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Shift & Role</h2>
          <p className="text-gray-600 mb-6">Post a job to find verified workers</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workplace <span className="text-red-500">*</span>
              </label>
              <select
                name="workplace_id"
                value={formData.workplace_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
              >
                {workplaces.map(wp => (
                  <option key={wp.workplace_id} value={wp.workplace_id}>
                    {wp.workplace_name} - {wp.address}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift Date <span className="text-red-500">*</span>
                </label>
                <input
                  name="shift_date"
                  type="date"
                  required
                  value={formData.shift_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="role_title"
                  type="text"
                  required
                  value={formData.role_title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
                  placeholder="e.g., Personal Support Worker"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  name="start_time"
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
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
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  name="hourly_rate"
                  type="number"
                  step="0.50"
                  min="15"
                  required
                  value={formData.hourly_rate}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
                  placeholder="20.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Competitive rates attract better candidates</p>
            </div>

            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/employer/dashboard')}
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
                {loading ? 'Posting Job...' : 'Post Job'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default PostJob;
