import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { Calendar, AlertCircle, CheckCircle, Info } from 'lucide-react';

const PROVINCES = [
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'QC', name: 'Quebec' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'YT', name: 'Yukon' },
  { code: 'NU', name: 'Nunavut' }
];

const PersonalInfoStep = ({ data, onNext }) => {
  const [formData, setFormData] = useState({
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    date_of_birth: data.date_of_birth || '',
    address: data.address || '',
    city: data.city || '',
    province: data.province || 'ON',
    postal_code: data.postal_code || '',
    hourly_rate_preference: data.hourly_rate_preference || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ageCompliance, setAgeCompliance] = useState(null);
  const [checkingAge, setCheckingAge] = useState(false);
  const theme = useTheme();

  // Calculate age and check compliance when DOB or province changes
  useEffect(() => {
    const checkAgeCompliance = async () => {
      if (formData.date_of_birth && formData.province) {
        setCheckingAge(true);
        try {
          const response = await api.post('/api/workforce/age-compliance/verify', {
            date_of_birth: formData.date_of_birth,
            province: formData.province
          });
          setAgeCompliance(response.data.data);
          setError('');
        } catch (err) {
          setAgeCompliance(null);
          if (err.response?.data?.detail) {
            setError(err.response.data.detail);
          }
        } finally {
          setCheckingAge(false);
        }
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkAgeCompliance, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.date_of_birth, formData.province]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate age compliance
    if (!ageCompliance?.is_compliant) {
      setError('Please ensure you meet the minimum age requirements for your province');
      return;
    }

    setLoading(true);

    try {
      // Combine address parts
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.province} ${formData.postal_code}`;
      
      await api.patch('/api/workforce/me/profile/personal-info', {
        ...formData,
        address: fullAddress,
        full_name: `${formData.first_name} ${formData.last_name}`
      });
      onNext(formData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Calculate max date (must be at least 13 years old)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Calculate min date (reasonable - 100 years ago)
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
      <p className="text-gray-600 mb-6">Let's start with your basic details</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="first_name"
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
              placeholder="John"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="last_name"
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="date_of_birth"
              type="date"
              required
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              min={minDateStr}
              max={maxDateStr}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Required for age compliance verification</p>
        </div>

        {/* Age Compliance Status */}
        {checkingAge && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
            <span className="text-sm text-gray-600">Verifying age compliance...</span>
          </div>
        )}

        {ageCompliance && !checkingAge && (
          <div className={`border rounded-lg p-4 ${
            ageCompliance.is_compliant 
              ? ageCompliance.has_restrictions 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {ageCompliance.is_compliant ? (
                ageCompliance.has_restrictions ? (
                  <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                )
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${
                  ageCompliance.is_compliant 
                    ? ageCompliance.has_restrictions ? 'text-yellow-800' : 'text-green-800'
                    : 'text-red-800'
                }`}>
                  Age: {ageCompliance.age} years old
                </p>
                <p className={`text-sm mt-1 ${
                  ageCompliance.is_compliant 
                    ? ageCompliance.has_restrictions ? 'text-yellow-700' : 'text-green-700'
                    : 'text-red-700'
                }`}>
                  {ageCompliance.message}
                </p>
                
                {ageCompliance.restrictions && ageCompliance.restrictions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-yellow-800">Work Restrictions:</p>
                    <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                      {ageCompliance.restrictions.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {ageCompliance.requires_parental_consent && (
                  <div className="mt-3 p-2 bg-yellow-100 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Parental/guardian consent will be required before starting work.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            id="address"
            type="text"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
            placeholder="123 Main Street"
          />
        </div>

        {/* City and Province */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
              City <span className="text-red-500">*</span>
            </label>
            <input
              id="city"
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
              placeholder="Windsor"
            />
          </div>
          <div>
            <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-2">
              Province <span className="text-red-500">*</span>
            </label>
            <select
              id="province"
              required
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
            >
              {PROVINCES.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Postal Code */}
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

        {/* Hourly Rate */}
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
            disabled={loading || !ageCompliance?.is_compliant}
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
