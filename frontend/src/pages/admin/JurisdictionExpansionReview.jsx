import React, { useState, useEffect } from 'react';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import {
  Globe2,
  Building2,
  FileText,
  Check,
  X,
  Clock,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Shield,
  AlertCircle,
  Download,
  ExternalLink
} from 'lucide-react';

const JurisdictionExpansionReview = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [reviewForm, setReviewForm] = useState({ reason: '', notes: '' });

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? `?request_status=${statusFilter}` : '';
      const res = await api.get(`/api/jurisdiction/admin/expansion-requests${params}`);
      if (res.data.success) {
        setRequests(res.data.data.requests || []);
        setStatusCounts(res.data.data.status_counts || {});
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId, action) => {
    if (action === 'reject' && !reviewForm.reason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setReviewing(requestId);
      const res = await api.post(`/api/jurisdiction/admin/expansion-request/${requestId}/review`, {
        action,
        rejection_reason: action === 'reject' ? reviewForm.reason : null,
        admin_notes: reviewForm.notes || null
      });
      
      if (res.data.success) {
        alert(`Request ${action}d successfully`);
        setReviewForm({ reason: '', notes: '' });
        setExpandedId(null);
        loadRequests();
      }
    } catch (error) {
      alert(error.response?.data?.detail || `Failed to ${action} request`);
    } finally {
      setReviewing(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20">
          <div className="p-6">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                    <Globe2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Jurisdiction Expansion Requests</h1>
                    <p className="text-gray-600">Review employer requests to operate in new provinces/states</p>
                  </div>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-indigo-800">
                    <p className="font-medium mb-1">Jurisdiction Authorization Workflow:</p>
                    <ul className="list-disc list-inside space-y-1 text-indigo-700">
                      <li>Employers are locked to their registration jurisdiction upon account creation</li>
                      <li>To expand operations, they submit a request with business registration documents</li>
                      <li>Review documents and approve/reject based on compliance requirements</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex gap-2 mb-6 flex-wrap">
                {[
                  { key: 'pending', label: 'Pending', icon: Clock, color: 'amber' },
                  { key: 'approved', label: 'Approved', icon: Check, color: 'green' },
                  { key: 'rejected', label: 'Rejected', icon: X, color: 'red' },
                  { key: '', label: 'All', icon: Globe2, color: 'gray' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                      statusFilter === tab.key
                        ? `bg-${tab.color}-500 text-white shadow-md`
                        : 'bg-white border text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.key && statusCounts[tab.key] > 0 && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        statusFilter === tab.key ? 'bg-white/20' : 'bg-gray-100'
                      }`}>
                        {statusCounts[tab.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Requests List */}
              {loading ? (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-3">Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <Globe2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No {statusFilter || 'expansion'} requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div
                      key={request.request_id}
                      className="bg-white rounded-xl shadow-sm border overflow-hidden"
                    >
                      {/* Request Header */}
                      <div
                        className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedId(expandedId === request.request_id ? null : request.request_id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-2 rounded-lg bg-indigo-100">
                              <Building2 className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{request.company_name}</h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Expanding to: <strong>{request.target_jurisdiction_name}</strong></span>
                                <span className="text-gray-400">({request.target_jurisdiction})</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Submitted: {formatDate(request.submitted_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                              {request.status.toUpperCase()}
                            </span>
                            {expandedId === request.request_id ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedId === request.request_id && (
                        <div className="border-t bg-gray-50 p-5">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Left Column - Details */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Current Jurisdictions</h4>
                                <div className="flex flex-wrap gap-2">
                                  {(request.current_jurisdictions || []).map(j => (
                                    <span key={j} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                      {j}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Business Registration</h4>
                                <p className="text-sm text-gray-900 font-mono bg-white px-3 py-2 rounded border">
                                  {request.business_registration_number || 'Not provided'}
                                </p>
                              </div>

                              {request.tax_registration_number && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-500 mb-2">Tax Registration</h4>
                                  <p className="text-sm text-gray-900 font-mono bg-white px-3 py-2 rounded border">
                                    {request.tax_registration_number}
                                  </p>
                                </div>
                              )}

                              {request.employer_notes && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-500 mb-2">Employer Notes</h4>
                                  <p className="text-sm text-gray-700 bg-white px-3 py-2 rounded border">
                                    {request.employer_notes}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Right Column - Documents & Actions */}
                            <div className="space-y-4">
                              {/* Required Documents */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Required Documents</h4>
                                <div className="space-y-2">
                                  {(request.required_documents || []).map((doc, i) => {
                                    const submitted = (request.documents_submitted || []).find(
                                      d => d.document_type === doc.type
                                    );
                                    return (
                                      <div
                                        key={i}
                                        className={`flex items-center justify-between px-3 py-2 rounded border ${
                                          submitted ? 'bg-green-50 border-green-200' : 'bg-white'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <FileText className={`w-4 h-4 ${submitted ? 'text-green-600' : 'text-gray-400'}`} />
                                          <span className="text-sm">{doc.name}</span>
                                        </div>
                                        {submitted ? (
                                          <span className="text-xs text-green-600 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Uploaded
                                          </span>
                                        ) : (
                                          <span className="text-xs text-gray-400">Missing</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Review Actions (for pending) */}
                              {request.status === 'pending' && (
                                <div className="bg-white rounded-lg border p-4 space-y-3">
                                  <h4 className="text-sm font-medium text-gray-900">Review Decision</h4>
                                  
                                  <textarea
                                    placeholder="Admin notes (optional)"
                                    value={reviewForm.notes}
                                    onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                                    rows={2}
                                  />
                                  
                                  <textarea
                                    placeholder="Rejection reason (required if rejecting)"
                                    value={reviewForm.reason}
                                    onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none border-red-200 focus:ring-red-500"
                                    rows={2}
                                  />

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleReview(request.request_id, 'approve')}
                                      disabled={reviewing === request.request_id}
                                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                      {reviewing === request.request_id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Check className="w-4 h-4" />
                                      )}
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleReview(request.request_id, 'reject')}
                                      disabled={reviewing === request.request_id}
                                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                      {reviewing === request.request_id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <X className="w-4 h-4" />
                                      )}
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Review Result (for approved/rejected) */}
                              {(request.status === 'approved' || request.status === 'rejected') && (
                                <div className={`rounded-lg border p-4 ${
                                  request.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}>
                                  <h4 className="text-sm font-medium mb-2">
                                    {request.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                                  </h4>
                                  <p className="text-xs text-gray-600">
                                    Reviewed: {formatDate(request.reviewed_at)}
                                  </p>
                                  {request.rejection_reason && (
                                    <p className="text-sm text-red-700 mt-2">
                                      Reason: {request.rejection_reason}
                                    </p>
                                  )}
                                  {request.admin_notes && (
                                    <p className="text-sm text-gray-700 mt-2">
                                      Notes: {request.admin_notes}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default JurisdictionExpansionReview;
