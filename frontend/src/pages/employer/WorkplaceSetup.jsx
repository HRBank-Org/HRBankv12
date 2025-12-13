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
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear validation error when user types
    if (e.target.name === 'postal_code') {
      setValidationError('');
    }
  };

  const validateAddress = async () => {
    if (!formData.address || !formData.postal_code) {
      return true; // Skip validation if fields are empty
    }

    setValidating(true);
    setValidationError('');

    try {
      // Extract city and province from address
      const addressParts = formData.address.split(',').map(s => s.trim());
      const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : '';
      const province = addressParts.length >= 3 ? addressParts[addressParts.length - 1] : 'ON';

      const response = await api.post('/api/validation/validate-address', {
        address: formData.address,
        city: city,
        province: province,
        postal_code: formData.postal_code
      });

      if (!response.data.valid) {
        setValidationError(response.data.errors?.join(', ') || 'Address validation failed');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Address validation error:', err);
      // Don't block submission if validation service fails
      return true;
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate address before submission
    const isAddressValid = await validateAddress();
    if (!isAddressValid) {
      setLoading(false);
      setError('Please correct the address validation errors before continuing.');
      return;
    }

    try {
      await api.post('/api/employer/workplaces', formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/employer/workplaces');
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
      <div className="min-h-screen bg-gray-50">
        <GenericHeader />
        <ModernSidebar />
        
        <div className="ml-[70px] pt-[64px] flex items-center justify-center h-96">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${theme.primaryColor}20` }}
              >
                <svg className="w-8 h-8" fill="none" stroke={theme.primaryColor} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Workplace Created! 🎉</h2>
              <p className="text-gray-600 mb-6">You can now manage shifts and assign workers.</p>
              <button
                onClick={() => navigate('/employer/workplaces')}
                className="px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: theme.primaryColor }}
              >
                View Workplaces
              </button>
            </div>
          </div>
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
              <h1 className="text-3xl font-bold text-gray-900">Add New Workplace</h1>
              <p className="text-gray-600 mt-1">Set up a new business location</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-8 py-8">
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none ${validationError ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="123 Main St, Windsor, ON"
              />
              <p className="text-xs text-gray-500 mt-1">📍 Full address including city and province (e.g., 123 Main St, Windsor, ON)</p>
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none ${validationError ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="N9A 1A1"
                maxLength={7}
              />
              {validationError && (
                <p className="text-xs text-red-600 mt-1">⚠️ {validationError}</p>
              )}
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
                onClick={() => navigate('/employer/workplaces')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || validating}
                className="flex-1 py-3 px-4 rounded-lg text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {validating ? 'Validating Address...' : loading ? 'Creating Workplace...' : 'Create Workplace'}
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
};

export default WorkplaceSetup;
