import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiMapPin, FiCheck, FiAlertCircle } from 'react-icons/fi';
import api from '../../utils/api';

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' }
];

/**
 * AddressAutocomplete Component
 * 
 * Provides Google Places Autocomplete for Canadian addresses
 * Breaks down address into: Street Address, City, Province, Postal Code
 * 
 * Props:
 * - value: { street_address, city, province, postal_code, latitude, longitude }
 * - onChange: (addressData) => void
 * - onValidationChange: (isValid) => void
 * - required: boolean
 * - disabled: boolean
 * - className: string
 */
const AddressAutocomplete = ({
  value = {},
  onChange,
  onValidationChange,
  required = false,
  disabled = false,
  className = ''
}) => {
  const [streetAddress, setStreetAddress] = useState(value.street_address || '');
  const [city, setCity] = useState(value.city || '');
  const [province, setProvince] = useState(value.province || 'ON');
  const [postalCode, setPostalCode] = useState(value.postal_code || '');
  const [latitude, setLatitude] = useState(value.latitude || null);
  const [longitude, setLongitude] = useState(value.longitude || null);
  
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimer = useRef(null);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  // Update parent when address changes
  useEffect(() => {
    const addressData = {
      street_address: streetAddress,
      city,
      province,
      postal_code: postalCode,
      latitude,
      longitude,
      formatted_address: `${streetAddress}, ${city}, ${province} ${postalCode}`.trim()
    };
    
    if (onChange) {
      onChange(addressData);
    }
    
    // Validate
    const isValid = streetAddress.length >= 3 && city.length >= 2 && province.length === 2;
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  }, [streetAddress, city, province, postalCode, latitude, longitude]);

  // Update state when value prop changes
  useEffect(() => {
    if (value) {
      if (value.street_address !== undefined) setStreetAddress(value.street_address);
      if (value.city !== undefined) setCity(value.city);
      if (value.province !== undefined) setProvince(value.province);
      if (value.postal_code !== undefined) setPostalCode(value.postal_code);
      if (value.latitude !== undefined) setLatitude(value.latitude);
      if (value.longitude !== undefined) setLongitude(value.longitude);
    }
  }, [value.street_address, value.city, value.province, value.postal_code]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (input) => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.get('/api/address/autocomplete', {
        params: { input }
      });
      
      if (response.data.success) {
        setSuggestions(response.data.data.suggestions);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle street address input change
  const handleStreetAddressChange = (e) => {
    const value = e.target.value;
    setStreetAddress(value);
    setIsVerified(false);
    setError('');
    
    // Debounce autocomplete
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion) => {
    setLoading(true);
    setShowSuggestions(false);
    
    try {
      const response = await api.get(`/api/address/details/${suggestion.place_id}`);
      
      if (response.data.success) {
        const details = response.data.data;
        setStreetAddress(details.street_address || '');
        setCity(details.city || '');
        setProvince(details.province || 'ON');
        setPostalCode(details.postal_code || '');
        setLatitude(details.latitude);
        setLongitude(details.longitude);
        setIsVerified(true);
        setError('');
      }
    } catch (err) {
      console.error('Place details error:', err);
      setError('Failed to get address details');
    } finally {
      setLoading(false);
    }
  };

  // Validate address manually
  const handleValidate = async () => {
    if (!streetAddress || !city || !province) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/api/address/validate', {
        street_address: streetAddress,
        city,
        province,
        postal_code: postalCode
      });
      
      if (response.data.success && response.data.data.valid) {
        const addr = response.data.data.address;
        setStreetAddress(addr.street_address);
        setCity(addr.city);
        setProvince(addr.province);
        setPostalCode(addr.postal_code || postalCode);
        setLatitude(addr.latitude);
        setLongitude(addr.longitude);
        setIsVerified(true);
        
        if (response.data.data.warning) {
          setError(response.data.data.warning);
        }
      } else {
        setError(response.data.data?.errors?.join(', ') || 'Invalid address');
      }
    } catch (err) {
      setError('Validation failed. Please check your address.');
    } finally {
      setLoading(false);
    }
  };

  // Format postal code on blur
  const handlePostalCodeBlur = () => {
    if (postalCode) {
      const clean = postalCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (clean.length === 6) {
        setPostalCode(`${clean.slice(0, 3)} ${clean.slice(3)}`);
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Street Address with Autocomplete */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Street Address {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            ref={inputRef}
            type="text"
            value={streetAddress}
            onChange={handleStreetAddressChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Start typing address..."
            disabled={disabled}
            className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors ${
              error ? 'border-red-300' : isVerified ? 'border-green-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100' : ''}`}
          />
          {isVerified && (
            <FiCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={18} />
          )}
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
            </div>
          )}
        </div>
        
        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.place_id || index}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-orange-50 flex items-start gap-3 border-b border-gray-100 last:border-0"
              >
                <FiMapPin className="text-orange-500 mt-0.5 flex-shrink-0" size={16} />
                <div>
                  <p className="font-medium text-gray-900">{suggestion.main_text}</p>
                  <p className="text-sm text-gray-500">{suggestion.secondary_text}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* City and Province */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => { setCity(e.target.value); setIsVerified(false); }}
            placeholder="City"
            disabled={disabled}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${
              disabled ? 'bg-gray-100' : ''
            } border-gray-300`}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Province {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={province}
            onChange={(e) => { setProvince(e.target.value); setIsVerified(false); }}
            disabled={disabled}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${
              disabled ? 'bg-gray-100' : ''
            } border-gray-300`}
          >
            {CANADIAN_PROVINCES.map(prov => (
              <option key={prov.code} value={prov.code}>{prov.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Postal Code and Validate Button */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Postal Code
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => { setPostalCode(e.target.value.toUpperCase()); setIsVerified(false); }}
            onBlur={handlePostalCodeBlur}
            placeholder="A1A 1A1"
            maxLength={7}
            disabled={disabled}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${
              disabled ? 'bg-gray-100' : ''
            } border-gray-300`}
          />
        </div>
        
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleValidate}
            disabled={disabled || loading || !streetAddress || !city}
            className="w-full px-4 py-2.5 bg-orange-100 text-orange-700 font-medium rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Validating...' : 'Validate Address'}
          </button>
        </div>
      </div>

      {/* Error/Status Message */}
      {error && (
        <div className={`flex items-center gap-2 text-sm ${error.includes('warning') ? 'text-amber-600' : 'text-red-600'}`}>
          <FiAlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      {isVerified && !error && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <FiCheck size={16} />
          <span>Address verified with Google Maps</span>
        </div>
      )}

      {/* Hidden fields for coordinates */}
      {latitude && longitude && (
        <p className="text-xs text-gray-500">
          📍 Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
};

export default AddressAutocomplete;
