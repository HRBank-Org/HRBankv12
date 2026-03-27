import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceLayout from '../../components/layout/WorkforceLayout';
import api from '../../utils/api';

const MyCredentials = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState([]);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const response = await api.get('/api/workforce/credentials/my-credentials');
      setCredentials(response.data.data.credentials);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (credential) => {
    setSelectedCredential(credential);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCredential(null);
  };

  const copyBlockchainHash = (hash) => {
    navigator.clipboard.writeText(hash);
    alert('Blockchain hash copied to clipboard!');
  };

  const getStatusBadge = (credential) => {
    if (credential.is_expired || credential.status === 'expired') {
      return { text: 'Expired', color: 'bg-red-100 text-red-700', icon: '⚠' };
    }
    if (credential.status === 'revoked') {
      return { text: 'Revoked', color: 'bg-gray-100 text-gray-700', icon: '✗' };
    }
    return { text: 'Active', color: 'bg-green-100 text-green-700', icon: '✓' };
  };

  if (loading) {
    return (
      <WorkforceLayout title="My Verified Credentials">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </WorkforceLayout>
    );
  }

  return (
    <WorkforceLayout title="My Verified Credentials" subtitle="Blockchain-verified credentials from institutions">
      <div className="max-w-7xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-end mb-6">
          <button
            onClick={() => navigate('/workforce/credentials/verify')}
            className="px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
            style={{ backgroundColor: theme.primaryColor }}
          >
            + Request Verification
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">🔐 Blockchain Verified</h3>
          <p className="text-sm text-blue-800">
            All credentials shown here are verified by their issuing institutions and secured on the blockchain. 
            Each credential has a unique blockchain hash that can be used to verify its authenticity.
          </p>
        </div>

        {/* Credentials Grid */}
        {credentials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {credentials.map((credential) => {
              const badge = getStatusBadge(credential);
              return (
                <div 
                  key={credential.credential_id}
                  onClick={() => openModal(credential)}
                  className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{credential.credential_name}</h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full ${badge.color}`}>
                        <span>{badge.icon}</span>
                        <span>{badge.text}</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 w-24">Type:</span>
                      <span className="text-gray-900 font-medium">{credential.credential_type}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 w-24">Institution:</span>
                      <span className="text-gray-900">{credential.institution_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 w-24">Issued:</span>
                      <span className="text-gray-900">{new Date(credential.issue_date).toLocaleDateString()}</span>
                    </div>
                    {credential.expiry_date && (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-600 w-24">Expires:</span>
                        <span className={`${credential.is_expired ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {new Date(credential.expiry_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>🔐</span>
                      <span className="font-mono truncate">{credential.blockchain_hash}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="text-6xl mb-4">🎓</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Verified Credentials Yet</h3>
            <p className="text-gray-600 mb-6">Request verification for your credentials to get started</p>
            <button
              onClick={() => navigate('/workforce/credentials/verify')}
              className="px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
              style={{ backgroundColor: theme.primaryColor }}
            >
              + Request Verification
            </button>
          </div>
        )}

      {/* Credential Detail Modal */}
      {showModal && selectedCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Credential Details</h2>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-center">
                {(() => {
                  const badge = getStatusBadge(selectedCredential);
                  return (
                    <span className={`inline-flex items-center gap-2 px-6 py-3 text-lg rounded-full ${badge.color}`}>
                      <span className="text-2xl">{badge.icon}</span>
                      <span className="font-bold">{badge.text}</span>
                    </span>
                  );
                })()}
              </div>

              {/* Credential Info */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 text-center border border-blue-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedCredential.credential_name}</h3>
                <p className="text-gray-600 mb-4">{selectedCredential.credential_type}</p>
                <p className="text-sm text-gray-600">
                  Issued by <strong>{selectedCredential.institution_name || 'Unknown Institution'}</strong>
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Issue Date</p>
                  <p className="font-medium text-gray-900">{new Date(selectedCredential.issue_date).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Expiry Date</p>
                  <p className="font-medium text-gray-900">
                    {selectedCredential.expiry_date 
                      ? new Date(selectedCredential.expiry_date).toLocaleDateString()
                      : 'Lifetime'
                    }
                  </p>
                </div>
              </div>

              {/* Blockchain Section */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🔐</span>
                  <h3 className="text-lg font-bold text-gray-900">Blockchain Verification</h3>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Blockchain Hash:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded text-sm font-mono text-gray-900 border border-gray-200 break-all">
                      {selectedCredential.blockchain_hash}
                    </code>
                    <button
                      onClick={() => copyBlockchainHash(selectedCredential.blockchain_hash)}
                      className="px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-all"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  This credential is secured on the blockchain and can be independently verified using the hash above.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Mock share functionality
                    const text = `${selectedCredential.credential_name}\nIssued by: ${selectedCredential.institution_name}\nBlockchain Hash: ${selectedCredential.blockchain_hash}`;
                    if (navigator.share) {
                      navigator.share({ text });
                    } else {
                      navigator.clipboard.writeText(text);
                      alert('Credential details copied to clipboard!');
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Share Credential
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </WorkforceLayout>
  );
};

export default MyCredentials;
