import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { FileText, Search, CheckCircle, XCircle, Eye, X, AlertTriangle } from 'lucide-react';

const DocumentReview = () => {
  const theme = useTheme();
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

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
      setDocuments(response.data.data?.pending_documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
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

  const handleReject = async () => {
    if (!selectedDoc || !rejectionReason) return;

    try {
      await api.post(`/api/documents/admin/documents/${selectedDoc.document_id}/reject`, {
        rejection_reason: rejectionReason
      });
      await loadDocuments();
      setShowRejectModal(false);
      setSelectedDoc(null);
      setRejectionReason('');
      alert('Document rejected');
    } catch (error) {
      console.error('Failed to reject document:', error);
      alert('Failed to reject document');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Document Review</h1>
                    <p className="text-gray-600">Review and approve user submitted documents</p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="flex flex-wrap gap-2">
                  {['all', 'workforce', 'employer', 'institution'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                        filter === f 
                          ? 'text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={filter === f ? { backgroundColor: theme.primaryColor } : {}}
                    >
                      {f === 'all' ? `All (${documents.length})` : f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Documents List */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: theme.primaryColor }}></div>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No pending documents to review</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Document</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">User</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Type</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Submitted</th>
                        <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {documents.map((doc) => (
                        <tr key={doc.document_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">{doc.document_type || 'Document'}</p>
                                <p className="text-xs text-gray-500">{doc.document_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900">{doc.user_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{doc.user_email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                              {doc.user_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {doc.submitted_at ? new Date(doc.submitted_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprove(doc.document_id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Approve"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => { setSelectedDoc(doc); setShowRejectModal(true); }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                              {doc.file_url && (
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="View"
                                >
                                  <Eye className="w-5 h-5" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Reject Document
              </h2>
              <button onClick={() => setShowRejectModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg h-32"
                placeholder="Please provide a reason for rejection..."
              />
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentReview;
