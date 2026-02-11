import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';

const ManageCredentials = () => {
  const [credentials, setCredentials] = useState([]);
  const [filter, setFilter] = useState('all'); // all, active, revoked, expired
  const [revokeModal, setRevokeModal] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const response = await api.get('/api/blockchain-credentials/my-credentials');
      setCredentials(response.data.data.credentials);
    } catch (error) {
      console.error('Failed to load credentials:', error);
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (credentialId) => {
    if (!revokeReason) {
      alert('Please select a revocation reason');
      return;
    }

    try {
      await api.post(`/api/blockchain-credentials/${credentialId}/revoke`, {
        reason: revokeReason
      });
      alert('Credential revoked on blockchain');
      setRevokeModal(null);
      setRevokeReason('');
      loadCredentials();
    } catch (error) {
      alert('Failed to revoke credential');
    }
  };

  const filteredCredentials = credentials.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'active') return c.status === 'issued';
    if (filter === 'revoked') return c.status === 'revoked';
    if (filter === 'expired') {
      return c.expiry_date && new Date(c.expiry_date) < new Date();
    }
    return true;
  });

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
            <h1 className="text-xl font-bold">Manage Blockchain Credentials</h1>
          </div>
          <button
            onClick={() => navigate('/institution/issue-credential')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm"
          >
            + Issue New
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Total Issued</p>
            <p className="text-3xl font-bold text-gray-900">{credentials.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-3xl font-bold text-green-600">
              {credentials.filter(c => c.status === 'issued').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Revoked</p>
            <p className="text-3xl font-bold text-red-600">
              {credentials.filter(c => c.status === 'revoked').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Total Verifications</p>
            <p className="text-3xl font-bold text-gray-900">
              {credentials.reduce((sum, c) => sum + (c.verification_count || 0), 0)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200 px-6 py-3">
            <nav className="flex gap-6">
              {['all', 'active', 'revoked', 'expired'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${
                    filter === f ? 'border-current' : 'border-transparent text-gray-500'
                  }`}
                  style={{ borderColor: filter === f ? theme.primaryColor : undefined, color: filter === f ? theme.primaryColor : undefined }}
                >
                  {f} ({filteredCredentials.length})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Credentials List */}
        {filteredCredentials.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Credentials Found</h3>
            <p className="text-gray-600 mb-6">Start issuing blockchain credentials to your students</p>
            <button
              onClick={() => navigate('/institution/issue-credential')}
              className="px-6 py-3 rounded-lg text-white font-semibold"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Issue First Credential
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCredentials.map((cred) => (
              <div key={cred.credential_id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{cred.student_name}</h3>
                    <p className="text-sm text-gray-600">{cred.credential_name}</p>
                    <p className="text-xs text-gray-500 mt-1">ID: {cred.credential_id}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    cred.status === 'issued' ? 'bg-green-100 text-green-800' :
                    cred.status === 'revoked' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {cred.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-600">Issued:</p>
                    <p className="font-medium text-gray-900">
                      {cred.issue_date ? new Date(cred.issue_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Verifications:</p>
                    <p className="font-medium text-gray-900">{cred.verification_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Blockchain TX:</p>
                    <p className="font-mono text-xs text-blue-600 truncate">
                      {cred.blockchain_transaction_hash?.substring(0, 20)}...
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => window.open(cred.verification_url, '_blank')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 text-sm"
                  >
                    🔗 View Public Page
                  </button>
                  {cred.status === 'issued' && (
                    <button
                      onClick={() => setRevokeModal(cred)}
                      className="px-4 py-2 border-2 border-red-300 rounded-lg text-red-600 font-medium hover:bg-red-50 text-sm"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Revoke Modal */}
      {revokeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">⚠️ Revoke Blockchain Credential</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-900 mb-2">
                <strong>Student:</strong> {revokeModal.student_name}
              </p>
              <p className="text-sm text-yellow-900 mb-2">
                <strong>Credential:</strong> {revokeModal.credential_name}
              </p>
              <p className="text-xs text-yellow-800 mt-3">
                This action will be recorded on the blockchain and cannot be undone.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Revocation <span className="text-red-500">*</span>
              </label>
              <select
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                required
              >
                <option value="">Select reason...</option>
                <option value="Academic misconduct">Academic misconduct</option>
                <option value="Fraudulent application">Fraudulent application</option>
                <option value="Issued in error">Issued in error</option>
                <option value="Code of conduct violation">Code of conduct violation</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRevokeModal(null);
                  setRevokeReason('');
                }}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(revokeModal.credential_id)}
                disabled={!revokeReason}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Revoke Credential
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCredentials;
