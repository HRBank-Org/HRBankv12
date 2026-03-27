import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';

import { useLanguage } from '../../contexts/LanguageContext';

const ManageCredentials = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [unassignedCredentials, setUnassignedCredentials] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadUnassignedCredentials();
  }, []);

  const loadUnassignedCredentials = async () => {
    try {
      const response = await api.get('/api/admin/credentials/unassigned');
      setUnassignedCredentials(response.data.data.unassigned_credentials || []);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchInstitutions = async (query) => {
    if (!query || query.length < 2) {
      setInstitutions([]);
      return;
    }

    try {
      const response = await api.get(`/api/admin/credentials/institutions/search?query=${encodeURIComponent(query)}`);
      setInstitutions(response.data.data.institutions || []);
    } catch (error) {
      console.error('Failed to search institutions:', error);
      setInstitutions([]);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchInstitutions(query);
  };

  const openAssignModal = (credential) => {
    setSelectedCredential(credential);
    setShowAssignModal(true);
    setSearchQuery('');
    setInstitutions([]);
    setMessage({ type: '', text: '' });
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedCredential(null);
    setSearchQuery('');
    setInstitutions([]);
  };

  const handleAssign = async (institutionId) => {
    if (!selectedCredential) return;

    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      await api.post('/api/admin/credentials/assign', {
        request_id: selectedCredential.request_id,
        institution_id: institutionId
      });

      setMessage({ type: 'success', text: 'Credential assigned successfully!' });
      await loadUnassignedCredentials();
      setTimeout(() => closeAssignModal(), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to assign credential' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!window.confirm('Auto-assign all unassigned credentials by matching institution names?\n\nThis will match credentials to institutions with exact name matches.')) {
      return;
    }

    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/api/admin/credentials/auto-assign-by-name');
      const data = response.data.data;
      
      setMessage({ 
        type: 'success', 
        text: `Successfully auto-assigned ${data.assigned_count} out of ${data.total_unassigned} credentials. Matched institutions: ${data.matched_institutions.join(', ') || 'None'}` 
      });
      
      await loadUnassignedCredentials();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to auto-assign credentials' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader 
        onBackClick={() => navigate('/admin/dashboard')}
        showBack={true}
        title="Manage Unassigned Credentials"
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {message.text && !showAssignModal && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Header Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Unassigned Credentials</h2>
              <p className="text-sm text-gray-600 mt-1">
                {unassignedCredentials.length} credentials waiting to be assigned to institutions
              </p>
            </div>
            <button
              onClick={handleAutoAssign}
              disabled={processing || unassignedCredentials.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : '⚡ Auto-Assign by Name'}
            </button>
          </div>
        </div>

        {/* Credentials List */}
        {unassignedCredentials.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Credentials Assigned</h3>
            <p className="text-gray-600">
              All pending credentials have been assigned to institutions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {unassignedCredentials.map((cred) => (
              <div key={cred.request_id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{cred.credential_type_name}</h3>
                    <p className="text-sm text-gray-600">Worker: {cred.workforce_name}</p>
                    <p className="text-sm font-medium text-blue-600 mt-1">
                      Issuing Institution: {cred.issuing_institution_name}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Unassigned
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-600">Credential ID:</p>
                    <p className="font-medium text-gray-900">{cred.credential_id_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Issue Date:</p>
                    <p className="font-medium text-gray-900">{new Date(cred.issue_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Expiration:</p>
                    <p className="font-medium text-gray-900">
                      {cred.expiration_date ? new Date(cred.expiration_date).toLocaleDateString() : 'No expiry'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Submitted:</p>
                    <p className="font-medium text-gray-900">{new Date(cred.submitted_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => window.open(cred.document_url, '_blank')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    📄 View Document
                  </button>
                  <button
                    onClick={() => openAssignModal(cred)}
                    className="flex-1 px-6 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700"
                  >
                    Assign to Institution
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Assign Modal */}
      {showAssignModal && selectedCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Assign Credential to Institution</h3>
              <button onClick={closeAssignModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {message.text && (
                <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {message.text}
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Credential Details</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                  <p><span className="font-medium">Type:</span> {selectedCredential.credential_type_name}</p>
                  <p><span className="font-medium">Worker:</span> {selectedCredential.workforce_name}</p>
                  <p><span className="font-medium">Issuing Institution:</span> {selectedCredential.issuing_institution_name}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for Institution
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Type institution name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Type at least 2 characters to search</p>
              </div>

              {/* Search Results */}
              {institutions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Select Institution:</p>
                  {institutions.map((inst) => (
                    <button
                      key={inst.institution_id}
                      onClick={() => handleAssign(inst.institution_id)}
                      disabled={processing}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <p className="font-medium text-gray-900">{inst.institution_name}</p>
                      <p className="text-sm text-gray-600">{inst.city}, {inst.province}</p>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && institutions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No institutions found matching "{searchQuery}"</p>
                  <p className="text-sm mt-2">The institution may not have registered yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCredentials;
