import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const DocumentReview = () => {
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    loadDocuments();
  }, [filter]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const userTypeFilter = filter !== 'all' ? filter : null;
      const response = await api.get('/api/documents/admin/pending-documents', {
        params: { user_type_filter: userTypeFilter }
      });
      setDocuments(response.data.data.pending_documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (documentId) => {
    if (!window.confirm('Are you sure you want to approve this document?')) return;

    try {
      await api.post(`/api/documents/admin/documents/${documentId}/approve`);
      await loadDocuments();
      alert('Document approved successfully');
    } catch (error) {
      console.error('Failed to approve document:', error);
      alert('Failed to approve document');
    }
  };

  const handleReject = async (rejectionReason) => {
    if (!selectedDoc) return;

    try {
      await api.post(`/api/documents/admin/documents/${selectedDoc.document_id}/reject`, {
        rejection_reason: rejectionReason
      });
      await loadDocuments();
      setShowRejectModal(false);
      setSelectedDoc(null);
      alert('Document rejected');
    } catch (error) {
      console.error('Failed to reject document:', error);
      alert('Failed to reject document');
    }
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
      {/* Header */}
      <header className="bg-blue-600 text-white px-4 py-4 shadow-md">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold">Document Review - Admin</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            All ({documents.length})
          </button>
          <button
            onClick={() => setFilter('workforce')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'workforce' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Workforce
          </button>
          <button
            onClick={() => setFilter('employer')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'employer' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Employers
          </button>
          <button
            onClick={() => setFilter('institution')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'institution' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Institutions
          </button>
        </div>

        {/* Documents List */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No pending documents to review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.document_id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        {doc.user_type}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {doc.document_name}
                      </h3>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>User:</strong> {doc.user_info?.full_name} ({doc.user_info?.email})</p>
                      <p><strong>Document Type:</strong> {doc.document_type}</p>
                      <p><strong>Uploaded:</strong> {new Date(doc.uploaded_date).toLocaleString()}</p>
                      {doc.issue_date && <p><strong>Issue Date:</strong> {new Date(doc.issue_date).toLocaleDateString()}</p>}
                      {doc.expiry_date && (
                        <p><strong>Expiry Date:</strong> {new Date(doc.expiry_date).toLocaleDateString()}</p>
                      )}
                      {doc.notes && <p><strong>Notes:</strong> {doc.notes}</p>}
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => handleApprove(doc.document_id)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDoc(doc);
                          setShowRejectModal(true);
                        }}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        ✗ Reject
                      </button>
                      {doc.file_url && (
                        <a
                          href={`${process.env.REACT_APP_BACKEND_URL}${doc.file_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          📄 View Document
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectModal
          document={selectedDoc}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedDoc(null);
          }}
          onSubmit={handleReject}
        />
      )}
    </div>
  );
};

// Reject Modal Component
const RejectModal = ({ document, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    onSubmit(reason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Reject Document</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Explain why this document is being rejected..."
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reject Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentReview;
