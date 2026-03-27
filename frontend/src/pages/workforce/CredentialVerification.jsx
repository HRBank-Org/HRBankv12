import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';

import { useLanguage } from '../../contexts/LanguageContext';

const CredentialVerification = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();
  const [credentialTypes, setCredentialTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploading, setUploading] = useState(false);
  const [institutionSuggestions, setInstitutionSuggestions] = useState([]);
  const [showInstitutionDropdown, setShowInstitutionDropdown] = useState(false);
  const [searchingInstitutions, setSearchingInstitutions] = useState(false);
  const [formData, setFormData] = useState({
    credential_name: '',
    credential_type: '',
    institution_name: '',
    registrar_email: '',
    issue_date: '',
    expiry_date: '',
    file: null,
    fileName: '',
    filePreview: null
  });

  useEffect(() => {
    loadMetadata();
    loadMyRequests();
  }, []);

  const loadMetadata = async () => {
    try {
      const response = await api.get('/api/credentials/types');
      setCredentialTypes(response.data.data.credential_types || []);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  };

  const loadMyRequests = async () => {
    try {
      const response = await api.get('/api/workforce/credentials/verification-requests');
      setRequests(response.data.data.requests);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  // Institution search with debounce
  const searchInstitutions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setInstitutionSuggestions([]);
      setShowInstitutionDropdown(false);
      return;
    }
    
    setSearchingInstitutions(true);
    try {
      const response = await api.get(`/api/institution-directory/search?q=${encodeURIComponent(query)}&limit=10`);
      if (response.data.success) {
        setInstitutionSuggestions(response.data.data.institutions || []);
        setShowInstitutionDropdown(true);
      }
    } catch (error) {
      console.error('Failed to search institutions:', error);
      setInstitutionSuggestions([]);
    } finally {
      setSearchingInstitutions(false);
    }
  }, []);

  // Debounced institution search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.institution_name) {
        searchInstitutions(formData.institution_name);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [formData.institution_name, searchInstitutions]);

  const selectInstitution = (institution) => {
    setFormData(prev => ({
      ...prev,
      institution_name: institution.institution_name,
      registrar_email: institution.email || prev.registrar_email
    }));
    setShowInstitutionDropdown(false);
    setInstitutionSuggestions([]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 10MB' });
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only PDF, JPG, and PNG files are allowed' });
      return;
    }

    setFormData(prev => ({
      ...prev,
      file,
      fileName: file.name,
      filePreview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(formData.file);
      
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1];
          const fileExtension = formData.fileName.split('.').pop().toLowerCase();

          const payload = {
            credential_name: formData.credential_name,
            credential_type: formData.credential_type,
            institution_name: formData.institution_name,
            registrar_email: formData.registrar_email,
            issue_date: formData.issue_date || null,
            expiry_date: formData.expiry_date || null,
            file_data: base64Data,
            file_type: fileExtension
          };

          const response = await api.post('/api/workforce/credentials/request-verification', payload);

          setMessage({ 
            type: 'success', 
            text: response.data.data.institution_exists 
              ? 'Verification request submitted successfully!' 
              : 'Invitation sent to institution. They will review once they join.'
          });
          
          setShowModal(false);
          setFormData({
            credential_name: '',
            credential_type: '',
            institution_name: '',
            registrar_email: '',
            issue_date: '',
            expiry_date: '',
            file: null,
            fileName: '',
            filePreview: null
          });
          await loadMyRequests();
        } catch (error) {
          setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to submit request' });
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setMessage({ type: 'error', text: 'Failed to read file' });
        setUploading(false);
      };
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process file' });
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending Review', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
      institution_invited: { text: 'Institution Invited', color: 'bg-blue-100 text-blue-700', icon: '📧' },
      verified: { text: 'Verified', color: 'bg-green-100 text-green-700', icon: '✓' },
      rejected: { text: 'Rejected', color: 'bg-red-100 text-red-700', icon: '✗' }
    };
    return badges[status] || badges.pending;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader 
        onBackClick={() => navigate('/workforce/dashboard')}
        showBack={true}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {message.text && !showModal && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Request Credential Verification</h1>
            <p className="text-gray-600">Get your credentials verified by issuing institutions</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
            style={{ backgroundColor: theme.primaryColor }}
          >
            + Request Verification
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 How It Works</h3>
          <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
            <li>Upload an image of your credential (certificate, diploma, license, etc.)</li>
            <li>Provide the institution name and registrar's email</li>
            <li>We'll send a verification request to the institution</li>
            <li>Once verified, you'll receive a blockchain-verified digital credential</li>
            <li>Share your verified credentials with employers</li>
          </ol>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">My Verification Requests</h2>
          
          {requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request) => {
                const badge = getStatusBadge(request.status);
                return (
                  <div 
                    key={request.request_id}
                    className="flex items-start justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{request.credential_name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${badge.color}`}>
                          <span>{badge.icon}</span>
                          <span>{badge.text}</span>
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Type: {request.credential_type}</p>
                        <p>Institution: {request.institution_name}</p>
                        <p>Registrar: {request.registrar_email}</p>
                        <p>Requested: {new Date(request.created_date).toLocaleDateString()}</p>
                        {request.rejection_reason && (
                          <p className="text-red-600 mt-2">
                            <strong>Reason:</strong> {request.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    {request.credential_image_url && (
                      <a
                        href={`${process.env.REACT_APP_BACKEND_URL}${request.credential_image_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
                      >
                        View Document
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No verification requests yet</p>
              <button 
                onClick={() => setShowModal(true)}
                className="text-sm font-medium hover:underline"
                style={{ color: theme.primaryColor }}
              >
                Submit your first request
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Request Credential Verification</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {message.text && showModal && (
                <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {message.text}
                </div>
              )}

              {/* Credential Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credential Name *
                </label>
                <input
                  type="text"
                  value={formData.credential_name}
                  onChange={(e) => setFormData({...formData, credential_name: e.target.value})}
                  required
                  placeholder="e.g., Food Safety Certificate Level 1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>

              {/* Credential Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credential Type *
                </label>
                <select
                  value={formData.credential_type}
                  onChange={(e) => setFormData({...formData, credential_type: e.target.value})}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                >
                  <option value="">Select type...</option>
                  {credentialTypes.map(type => (
                    <option key={type.credential_type_id || type.credential_name || type} value={type.credential_name || type}>
                      {type.credential_name || type}{type.category ? ` (${type.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Institution Info */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution Name *
                </label>
                <input
                  type="text"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({...formData, institution_name: e.target.value})}
                  onFocus={() => formData.institution_name.length >= 2 && setShowInstitutionDropdown(true)}
                  onBlur={() => setTimeout(() => setShowInstitutionDropdown(false), 200)}
                  required
                  placeholder="Start typing to search 1,750+ Canadian institutions..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
                {searchingInstitutions && (
                  <div className="absolute right-3 top-10 text-gray-400">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  </div>
                )}
                {showInstitutionDropdown && institutionSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {institutionSuggestions.map((inst, idx) => (
                      <button
                        key={inst.directory_id || idx}
                        type="button"
                        onClick={() => selectInstitution(inst)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{inst.institution_name}</div>
                        <div className="text-sm text-gray-500">
                          {inst.city && inst.province ? `${inst.city}, ${inst.province}` : ''} 
                          {inst.institution_type ? ` • ${inst.institution_type}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registrar Email *
                </label>
                <input
                  type="email"
                  value={formData.registrar_email}
                  onChange={(e) => setFormData({...formData, registrar_email: e.target.value})}
                  required
                  placeholder="registrar@institution.edu"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll send verification request to this email
                </p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  />
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credential Document *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  required
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold hover:file:bg-gray-100"
                  style={{ 
                    'file:backgroundColor': theme.primaryColor, 
                    'file:color': 'white' 
                  }}
                />
                {formData.fileName && (
                  <p className="mt-2 text-sm text-gray-600">Selected: {formData.fileName}</p>
                )}
                {formData.filePreview && (
                  <img src={formData.filePreview} alt="Preview" className="mt-3 max-h-40 rounded-lg" />
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !formData.file}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all disabled:opacity-50"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {uploading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialVerification;
