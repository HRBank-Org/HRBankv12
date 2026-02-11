import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';

const VerificationRequests = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await api.get('/api/institution/verification-requests');
      setRequests(response.data.data.requests);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    setRejectionReason('');
    setMessage({ type: '', text: '' });
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  const handleVerify = async () => {
    if (!selectedRequest) return;
    
    setMessage({ type: '', text: '' });

    try {
      await api.post(`/api/institution/verification-requests/${selectedRequest.request_id}/verify`, {});
      setMessage({ type: 'success', text: 'Credential verified successfully!' });
      await loadRequests();
      closeModal();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to verify credential' });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!rejectionReason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a rejection reason' });
      return;
    }
    
    setMessage({ type: '', text: '' });

    try {
      await api.post(`/api/institution/verification-requests/${selectedRequest.request_id}/reject`, {
        reason: rejectionReason
      });
      setMessage({ type: 'success', text: 'Request rejected' });
      await loadRequests();
      closeModal();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to reject request' });
    }
  };

  if (loading) {
    return (
      <InstitutionLayout title="Verification Requests">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </InstitutionLayout>
    );
  }

  return (
    <InstitutionLayout title="Credential Verification Requests" subtitle="Review and verify credentials submitted by workforce">
      <div data-testid="verification-requests-page">
        {message.text && !showModal && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {requests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => (
              <div 
                key={request.request_id}
                onClick={() => openModal(request)}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{request.credential_name}</h3>
                    <span className="inline-block px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                      Pending Review
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Type:</span>
                    <span className="text-gray-900 font-medium">{request.credential_type}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Student:</span>
                    <span className="text-gray-900 font-medium">{request.workforce_name || 'Unknown'}</span>
                  </div>
                  {request.issue_date && (
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 w-24">Issued:</span>
                      <span className="text-gray-900">{new Date(request.issue_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {request.expiry_date && (
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 w-24">Expires:</span>
                      <span className="text-gray-900">{new Date(request.expiry_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Requested:</span>
                    <span className="text-gray-900">{new Date(request.created_date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    className="w-full px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Review Request
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Pending Requests</h3>
            <p className="text-gray-600">You're all caught up! No verification requests at the moment.</p>
          </div>
        )}

      {/* Review Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Review Credential</h2>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {message.text && (
                <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {message.text}
                </div>
              )}

              {/* Credential Details */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Credential Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Credential Name:</span>
                    <span className="font-medium text-gray-900">{selectedRequest.credential_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-gray-900">{selectedRequest.credential_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Student:</span>
                    <span className="font-medium text-gray-900">{selectedRequest.workforce_name || 'Unknown'}</span>
                  </div>
                  {selectedRequest.issue_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issue Date:</span>
                      <span className="font-medium text-gray-900">{new Date(selectedRequest.issue_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedRequest.expiry_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expiry Date:</span>
                      <span className="font-medium text-gray-900">{new Date(selectedRequest.expiry_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requested:</span>
                    <span className="font-medium text-gray-900">{new Date(selectedRequest.created_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Credential Image */}
              {selectedRequest.credential_image_url && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Credential Document</h3>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <img 
                      src={`${process.env.REACT_APP_BACKEND_URL}${selectedRequest.credential_image_url}`}
                      alt="Credential"
                      className="w-full rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Rejection Reason (shown only when rejecting) */}
              <div id="rejection-section" className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  placeholder="Please explain why this credential cannot be verified..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    const section = document.getElementById('rejection-section');
                    if (section.classList.contains('hidden')) {
                      section.classList.remove('hidden');
                    } else {
                      handleReject();
                    }
                  }}
                  className="flex-1 px-4 py-3 border-2 border-red-300 rounded-lg text-red-700 font-medium hover:bg-red-50 transition-all"
                >
                  Reject
                </button>
                <button
                  onClick={handleVerify}
                  className="flex-1 px-4 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all bg-green-600"
                >
                  ✓ Verify & Issue Credential
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  ℹ️ Verifying this credential will automatically issue a blockchain-verified digital credential to the student.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </InstitutionLayout>
  );
};

export default VerificationRequests;
