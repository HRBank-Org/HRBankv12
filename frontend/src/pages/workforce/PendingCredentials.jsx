import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import api from '../../utils/api';
import {
  Shield, CreditCard, CheckCircle, Clock, AlertCircle,
  Award, Building2, DollarSign, ExternalLink, Loader2
} from 'lucide-react';

const PendingCredentials = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [pendingCredentials, setPendingCredentials] = useState([]);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadPendingCredentials();
    
    // Check if returning from payment
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, [searchParams]);

  const loadPendingCredentials = async () => {
    try {
      const response = await api.get('/api/credential-payments/my-pending');
      if (response.data.success) {
        setPendingCredentials(response.data.data.pending_credentials);
      }
    } catch (error) {
      console.error('Failed to load pending credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (sessionId) => {
    try {
      const response = await api.get(`/api/credential-payments/payment-status/${sessionId}`);
      if (response.data.success && response.data.data.payment_status === 'paid') {
        setSuccessMessage('Payment successful! Your credential has been added to your profile.');
        loadPendingCredentials();
      }
    } catch (error) {
      console.error('Failed to check payment status:', error);
    }
  };

  const initiatePayment = async (pendingCredentialId) => {
    setProcessingPayment(pendingCredentialId);
    try {
      const originUrl = window.location.origin;
      const response = await api.post('/api/credential-payments/initiate-payment', {
        pending_credential_id: pendingCredentialId,
        origin_url: originUrl
      });
      
      if (response.data.success && response.data.data.checkout_url) {
        window.location.href = response.data.data.checkout_url;
      }
    } catch (error) {
      console.error('Failed to initiate payment:', error);
      alert('Failed to initiate payment. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const getCredentialTypeColor = (type) => {
    switch (type) {
      case 'certificate': return 'bg-blue-100 text-blue-700';
      case 'diploma': return 'bg-purple-100 text-purple-700';
      case 'degree': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkforceHeader />
      <WorkforceSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Pending Credentials</h1>
          <p className="text-gray-600">Credentials waiting for your payment to be issued</p>
        </div>

        <div className="p-8 max-w-4xl">
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">{successMessage}</p>
                <button
                  onClick={() => navigate('/workforce/credentials')}
                  className="mt-2 text-sm text-green-700 underline hover:no-underline"
                >
                  View my credentials →
                </button>
              </div>
            </div>
          )}

          {pendingCredentials.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Credentials</h3>
              <p className="text-gray-600">
                When institutions issue credentials to you, they'll appear here for payment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-800">
                    You have <strong>{pendingCredentials.length}</strong> credential{pendingCredentials.length > 1 ? 's' : ''} waiting for payment
                  </span>
                </div>
                <span className="font-bold text-amber-900">
                  Total: ${pendingCredentials.reduce((sum, c) => sum + c.price_cad, 0).toFixed(2)} CAD
                </span>
              </div>

              {/* Credential Cards */}
              {pendingCredentials.map((credential) => (
                <div
                  key={credential.pending_credential_id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Award className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{credential.credential_name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getCredentialTypeColor(credential.credential_type)}`}>
                              {credential.credential_type}
                            </span>
                          </div>
                          {credential.program_name && (
                            <p className="text-gray-600 mb-1">{credential.program_name}</p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Building2 className="w-4 h-4" />
                            <span>{credential.institution_name}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Issued: {new Date(credential.issue_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">${credential.price_cad.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">CAD</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span>Blockchain verified upon payment</span>
                    </div>
                    <button
                      onClick={() => initiatePayment(credential.pending_credential_id)}
                      disabled={processingPayment === credential.pending_credential_id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {processingPayment === credential.pending_credential_id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Pay & Claim
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-2">How it works</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>Institutions issue credentials to your email address</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>You pay a one-time fee to claim the credential</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Your credential is permanently recorded on the blockchain</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>Share it on your Work Passport for employers to verify</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingCredentials;
