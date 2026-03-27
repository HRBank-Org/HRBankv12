import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

import { useLanguage } from '../../contexts/LanguageContext';

const VerificationQueue = () => {
  const [credentials, setCredentials] = useState([]);
  const [filter, setFilter] = useState('pending'); // pending, verified, all
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    loadCredentials();
  }, [filter]);

  const loadCredentials = async () => {
    try {
      const response = await api.get('/api/institutions/me/verification-queue', {
        params: { status: filter }
      });
      setCredentials(response.data.data.verification_requests || []);
    } catch (error) {
      console.error('Failed to load credentials:', error);
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (credentialId, approved, reason = '') => {
    try {
      if (approved) {
        await api.post(`/api/institutions/me/verifications/${credentialId}/approve`, {
          notes: 'Verified against institutional records'
        });
        alert('Credential verified! Sent to HR Bank admin for final approval.');
      } else {
        await api.post(`/api/institutions/me/verifications/${credentialId}/reject`, {
          rejection_reason: reason,
          notes: reason
        });
        alert('Credential rejected.');
      }
      
      setSelectedCredential(null);
      loadCredentials();
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to process verification');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/institution/dashboard')} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold">Credential Verification Queue</h1>
          </div>
          <button onClick={logout} className="text-sm hover:underline">Logout</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200 px-6 py-3">
            <nav className="flex gap-6">
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  filter === 'pending' ? 'border-current' : 'border-transparent text-gray-500'
                }`}
                style={{ borderColor: filter === 'pending' ? theme.primaryColor : undefined, color: filter === 'pending' ? theme.primaryColor : undefined }}
              >
                Pending ({credentials.filter(c => c.institution_verification_status === 'pending').length})
              </button>
              <button
                onClick={() => setFilter('verified')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  filter === 'verified' ? 'border-current' : 'border-transparent text-gray-500'
                }`}
                style={{ borderColor: filter === 'verified' ? theme.primaryColor : undefined, color: filter === 'verified' ? theme.primaryColor : undefined }}
              >
                Verified ({credentials.filter(c => c.institution_verification_status === 'verified').length})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  filter === 'all' ? 'border-current' : 'border-transparent text-gray-500'
                }`}
                style={{ borderColor: filter === 'all' ? theme.primaryColor : undefined, color: filter === 'all' ? theme.primaryColor : undefined }}
              >
                All Requests
              </button>
            </nav>
          </div>
        </div>

        {/* Credentials List */}
        {credentials.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Credentials to Review</h3>
            <p className="text-gray-600">
              Pending verification requests will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {credentials.map((cred) => (
              <div key={cred.credential_id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{cred.credential_type_name}</h3>
                    <p className="text-sm text-gray-600">Worker: {cred.worker_name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Submitted: {new Date(cred.submitted_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    cred.institution_verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    cred.institution_verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {cred.institution_verification_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-600">Issuing Institution:</p>
                    <p className="font-medium text-gray-900">{cred.issuing_institution_name}</p>
                  </div>
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
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => window.open(cred.document_url, '_blank')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    📄 View Document
                  </button>

                  {cred.institution_verification_status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleVerify(cred.credential_id, true)}
                        className="flex-1 px-6 py-2 rounded-lg text-white font-medium"
                        style={{ backgroundColor: theme.accentColor }}
                      >
                        ✓ Verify
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Rejection reason:');
                          if (reason) handleVerify(cred.credential_id, false, reason);
                        }}
                        className="px-6 py-2 border-2 border-red-300 rounded-lg text-red-600 font-medium hover:bg-red-50"
                      >
                        ✗ Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Document Viewer Modal */}
      {selectedCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Document Review</h3>
              <button onClick={() => setSelectedCredential(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <iframe
                src={selectedCredential.document_url}
                className="w-full h-[600px] border border-gray-300 rounded"
                title="Credential Document"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationQueue;
