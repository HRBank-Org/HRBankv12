import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { 
  FiCheck, FiX, FiAlertTriangle, FiShield, FiAward, 
  FiCalendar, FiUser, FiBook, FiLoader, FiExternalLink 
} from 'react-icons/fi';

const VerifyCredential = () => {
  const { credentialId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [credential, setCredential] = useState(null);
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState(null);
  const [manualId, setManualId] = useState('');

  // Check if credential ID is provided via URL or query param
  const idToVerify = credentialId || searchParams.get('id');

  useEffect(() => {
    if (idToVerify) {
      verifyCredential(idToVerify);
    } else {
      setLoading(false);
    }
  }, [idToVerify]);

  const verifyCredential = async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/credentials/verify/${id}`);
      setCredential(response.data);
      setVerification(response.data.verification);
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.response?.data?.detail || 'Failed to verify credential');
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = (e) => {
    e.preventDefault();
    if (manualId.trim()) {
      verifyCredential(manualId.trim());
    }
  };

  const getStatusColor = () => {
    if (!verification) return 'gray';
    if (verification.is_expired) return 'orange';
    if (verification.is_revoked) return 'red';
    if (verification.is_valid) return 'green';
    return 'gray';
  };

  const getStatusIcon = () => {
    if (!verification) return FiAlertTriangle;
    if (verification.is_expired || verification.is_revoked) return FiX;
    if (verification.is_valid) return FiCheck;
    return FiAlertTriangle;
  };

  const StatusIcon = getStatusIcon();
  const statusColor = getStatusColor();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <FiShield className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">HR Bank Credential Verification</h1>
              <p className="text-sm text-gray-600">Blockchain-verified credentials</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Manual Entry Form */}
        {!idToVerify && !loading && !credential && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="text-center mb-6">
              <FiAward className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Verify a Credential</h2>
              <p className="text-gray-600 mt-2">Enter a credential ID to verify its authenticity</p>
            </div>
            
            <form onSubmit={handleManualVerify} className="max-w-md mx-auto">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="Enter Credential ID (e.g., cred_abc123...)"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 text-lg"
                />
                <button
                  type="submit"
                  disabled={!manualId.trim()}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <FiLoader className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Verifying credential on blockchain...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiX className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-red-600 mb-6">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setCredential(null);
                  setManualId('');
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Verification Result */}
        {credential && !loading && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className={`bg-white rounded-2xl shadow-lg overflow-hidden border-t-4 border-${statusColor}-500`}>
              <div className={`bg-${statusColor}-50 p-6`}>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 bg-${statusColor}-100 rounded-full flex items-center justify-center`}>
                    <StatusIcon className={`w-8 h-8 text-${statusColor}-600`} />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold text-${statusColor}-700`}>
                      {verification?.is_valid && !verification?.is_expired && !verification?.is_revoked
                        ? 'Credential Verified ✓'
                        : verification?.is_expired
                        ? 'Credential Expired'
                        : verification?.is_revoked
                        ? 'Credential Revoked'
                        : 'Verification Pending'}
                    </h2>
                    <p className="text-gray-600">
                      {verification?.verification_method === 'blockchain' 
                        ? 'Verified on blockchain'
                        : verification?.verification_method === 'demo'
                        ? 'Demo verification (blockchain simulated)'
                        : 'Database verification'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Credential Details */}
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <FiAward className="w-4 h-4" /> Credential Type
                      </p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {verification?.credential_type || 'Academic Credential'}
                      </p>
                    </div>
                    
                    {credential.issuer && (
                      <div>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <FiBook className="w-4 h-4" /> Issued By
                        </p>
                        <p className="font-semibold text-gray-900">
                          {credential.issuer.institution_name || 'Unknown Institution'}
                        </p>
                        {credential.issuer.city && credential.issuer.province && (
                          <p className="text-sm text-gray-500">
                            {credential.issuer.city}, {credential.issuer.province}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <FiCalendar className="w-4 h-4" /> Issued On
                      </p>
                      <p className="font-semibold text-gray-900">
                        {verification?.issued_at 
                          ? new Date(verification.issued_at).toLocaleDateString('en-CA', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {credential.credential_data?.student?.name && (
                      <div>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <FiUser className="w-4 h-4" /> Recipient
                        </p>
                        <p className="font-semibold text-gray-900">
                          {credential.credential_data.student.name}
                        </p>
                      </div>
                    )}

                    {credential.credential_data?.program?.name && (
                      <div>
                        <p className="text-sm text-gray-500">Program</p>
                        <p className="font-semibold text-gray-900">
                          {credential.credential_data.program.name}
                        </p>
                      </div>
                    )}

                    {credential.credential_data?.academic_record?.cumulative_gpa && (
                      <div>
                        <p className="text-sm text-gray-500">GPA</p>
                        <p className="font-semibold text-gray-900">
                          {credential.credential_data.academic_record.cumulative_gpa.toFixed(2)}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-500">Valid Until</p>
                      <p className="font-semibold text-gray-900">
                        {verification?.valid_until
                          ? new Date(verification.valid_until).toLocaleDateString('en-CA', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'No Expiration'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Blockchain Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiShield className="w-5 h-5 text-indigo-600" />
                Blockchain Verification Details
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-500">Credential ID</span>
                  <span className="font-mono text-gray-900">{verification?.credential_id}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-500">Network</span>
                  <span className="text-gray-900 capitalize">{verification?.network?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-500">Verification Method</span>
                  <span className="text-gray-900 capitalize">{verification?.verification_method}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-500">Registered on Chain</span>
                  <span className={verification?.is_registered ? 'text-green-600' : 'text-gray-400'}>
                    {verification?.is_registered ? '✓ Yes' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500">Verified At</span>
                  <span className="text-gray-900">
                    {verification?.timestamp 
                      ? new Date(verification.timestamp).toLocaleString()
                      : 'Just now'}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code */}
            {credential.qr_code && (
              <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification QR Code</h3>
                <img 
                  src={credential.qr_code} 
                  alt="Verification QR Code"
                  className="mx-auto w-48 h-48"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Scan to verify this credential
                </p>
              </div>
            )}

            {/* Action Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  setCredential(null);
                  setVerification(null);
                  setManualId('');
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Verify Another Credential
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Powered by HR Bank Blockchain Credential System</p>
          <p className="mt-1">© {new Date().getFullYear()} HR Bank. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
};

export default VerifyCredential;
