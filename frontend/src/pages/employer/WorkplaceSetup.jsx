import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const WorkplaceSetup = () => {
  const [formData, setFormData] = useState({
    workplace_name: '',
    address: '',
    postal_code: '',
    job_matching_radius_km: 20,
    timezone: 'America/Toronto'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

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
      await api.post('/api/employer/workplaces', formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/employer/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Workplace creation error:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to create workplace');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${theme.accentColor}20` }}>
              <svg className="w-8 h-8" fill="none" stroke={theme.accentColor} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Workplace Created! 🎉</h2>
            <p className="text-gray-600 mb-6">You can now start posting jobs and hiring workers.</p>
            <button
              onClick={() => navigate('/employer/dashboard')}
              className="px-6 py-3 rounded-lg text-white font-semibold"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Header */}
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold">Create Your First Workplace</h1>
              <p className="text-sm opacity-90">Add your business location</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Workplace Information</h2>
          <p className="text-gray-600 mb-6">Tell us about your workplace location</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="workplace_name" className="block text-sm font-medium text-gray-700 mb-2">
                Workplace Name <span className="text-red-500">*</span>
              </label>
              <input
                id="workplace_name"
                name="workplace_name"
                type="text"
                required
                value={formData.workplace_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
                placeholder="e.g., Main Location, Warehouse A"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                id="address"
                name="address"
                type="text"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
                placeholder="123 Main St, Windsor, ON"
              />
              <p className="text-xs text-gray-500 mt-1">📍 We'll use Google Maps to verify this address</p>
            </div>

            <div>
              <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                id="postal_code"
                name="postal_code"
                type="text"
                required
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
                placeholder="N9A 1A1"
                maxLength={7}
              />
            </div>

            <div>
              <label htmlFor="job_matching_radius_km" className="block text-sm font-medium text-gray-700 mb-2">
                Job Matching Radius: {formData.job_matching_radius_km} km
              </label>
              <input
                id="job_matching_radius_km"
                name="job_matching_radius_km"
                type="range"
                min="5"
                max="50"
                value={formData.job_matching_radius_km}
                onChange={handleChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 km (nearby)</span>
                <span>50 km (wide area)</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 This determines how far we'll search for workers when you post jobs
              </p>
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
                {loading ? 'Creating Workplace...' : 'Create Workplace'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default WorkplaceSetup;
