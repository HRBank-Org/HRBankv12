import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';

const WSIBVerification = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState(''); // approve or reject
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadPendingVerifications();
  }, []);

  const loadPendingVerifications = async () => {
    try {
      const response = await api.get('/api/compliance/admin/wsib/pending');
      setPendingDocs(response.data.data.pending_verifications || []);
    } catch (error) {
      console.error('Failed to load pending verifications:', error);
      setMessage({ type: 'error', text: 'Failed to load pending verifications' });
    } finally {
      setLoading(false);
    }
  };

  const openVerificationModal = (doc, actionType) => {
    setSelectedDoc(doc);
    setAction(actionType);
    setRejectionReason('');
    setNotes('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDoc(null);
    setAction('');
    setRejectionReason('');
    setNotes('');
  };

  const handleVerify = async () => {
    if (action === 'reject' && !rejectionReason) {
      setMessage({ type: 'error', text: 'Please provide a rejection reason' });
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/api/compliance/admin/wsib/verify/${selectedDoc.wsib_doc_id}`, {
        action,
        rejection_reason: rejectionReason,
        notes
      });

      setMessage({ 
        type: 'success', 
        text: `WSIB certificate ${action === 'approve' ? 'approved' : 'rejected'} successfully!` 
      });
      
      closeModal();
      loadPendingVerifications();
      
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || `Failed to ${action} certificate` 
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader 
        title="WSIB Certificate Verification"
        onBackClick={() => navigate('/admin/dashboard')}
        showBack={true}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {message.text && (
          <div className={`rounded-lg p-4 mb-6 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="text-sm text-gray-600 mb-1">Pending Verification</div>
            <div className="text-3xl font-bold text-gray-900">{pendingDocs.length}</div>
          </div>
        </div>

        {/* Pending List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Pending WSIB Certificates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review and verify employer WSIB certificates
            </p>
          </div>

          {pendingDocs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">✓</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-600">No pending WSIB verifications at this time.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingDocs.map((doc) => (
                <div key={doc.wsib_doc_id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {doc.employer_name || doc.employer_email}
                        </h3>
                        <span className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          Pending Review
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">WSIB Account:</span>
                          <span className="ml-2 font-medium text-gray-900">{doc.wsib_account_number}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Industry:</span>
                          <span className="ml-2 font-medium text-gray-900">{doc.industry_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Issue Date:</span>
                          <span className="ml-2 font-medium text-gray-900">{formatDate(doc.issue_date)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Expiry Date:</span>
                          <span className="ml-2 font-medium text-gray-900">{formatDate(doc.expiry_date)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Days Until Expiry:</span>
                          <span className={`ml-2 font-medium ${
                            doc.days_until_expiry < 30 ? 'text-red-600' : 
                            doc.days_until_expiry < 90 ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {doc.days_until_expiry} days
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Uploaded:</span>
                          <span className="ml-2 font-medium text-gray-900">{formatDate(doc.uploaded_date)}</span>
                        </div>
                      </div>

                      {/* View Certificate */}
                      <a
                        href={`${process.env.REACT_APP_BACKEND_URL}${doc.certificate_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Certificate
                      </a>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => openVerificationModal(doc, 'approve')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-all"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => openVerificationModal(doc, 'reject')}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-all"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Verification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {action === 'approve' ? 'Approve' : 'Reject'} WSIB Certificate
            </h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Employer:</div>
              <div className="font-medium text-gray-900">{selectedDoc?.employer_name || selectedDoc?.employer_email}</div>
              <div className="text-sm text-gray-600 mt-2">WSIB Account:</div>
              <div className="font-medium text-gray-900">{selectedDoc?.wsib_account_number}</div>
            </div>

            {action === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select reason...</option>
                  <option value="Certificate expired">Certificate expired</option>
                  <option value="Account number mismatch">Account number mismatch</option>
                  <option value="Invalid certificate">Invalid certificate</option>
                  <option value="Poor image quality">Poor image quality - unable to verify</option>
                  <option value="Missing information">Missing information</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any additional notes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={processing || (action === 'reject' && !rejectionReason)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all ${
                  action === 'approve' 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-red-500 hover:bg-red-600'
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
              >
                {processing ? 'Processing...' : `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WSIBVerification;
