import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const PersonalInfoStep = ({ data, onNext }) => {
  const [formData, setFormData] = useState({
    address: data.address || '',
    postal_code: data.postal_code || '',
    hourly_rate_preference: data.hourly_rate_preference || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.patch('/api/workforce/me/profile/personal-info', formData);
      onNext(formData);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
      <p className="text-gray-600 mb-6">Let's start with your basic details</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Address <span className="text-red-500">*</span>
          </label>
          <input
            id="address"
            type="text"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
            placeholder="123 Main St, Windsor, ON"
          />
          <p className="text-xs text-gray-500 mt-1">We'll use this to match you with nearby jobs</p>
        </div>

        <div>
          <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code <span className="text-red-500">*</span>
          </label>
          <input
            id="postal_code"
            type="text"
            required
            value={formData.postal_code}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value.toUpperCase() })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
            placeholder="N9A 1A1"
            maxLength={7}
          />
        </div>

        <div>
          <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Hourly Rate (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              id="hourly_rate"
              type="number"
              step="0.50"
              min="15"
              max="50"
              value={formData.hourly_rate_preference}
              onChange={(e) => setFormData({ ...formData, hourly_rate_preference: parseFloat(e.target.value) })}
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
              placeholder="20.00"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">This helps us match you with suitable jobs</p>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {loading ? 'Saving...' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonalInfoStep;
