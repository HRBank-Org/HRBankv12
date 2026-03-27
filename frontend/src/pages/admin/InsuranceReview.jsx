import React, { useState, useEffect } from 'react';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  FileCheck,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Download,
  Loader2,
  ChevronDown,
  X,
  FileText,
  Calendar,
  MapPin,
  Settings
} from 'lucide-react';

const InsuranceReview = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState('pending');
  const [countryFilter, setCountryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [insuranceRequirements, setInsuranceRequirements] = useState({});
  const [editingRequirement, setEditingRequirement] = useState(null);

  useEffect(() => {
    loadSubmissions();
    loadInsuranceRequirements();
  }, [statusFilter, countryFilter]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (countryFilter) params.append('country_code', countryFilter);
      
      const res = await api.get(`/api/admin/geo-access/insurance-submissions?${params}`);
      if (res.data.success) {
        setSubmissions(res.data.data.submissions || []);
        setStatusCounts(res.data.data.status_counts || {});
      }
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInsuranceRequirements = async () => {
    try {
      const res = await api.get('/api/admin/geo-access/insurance-requirements');
      if (res.data.success) {
        setInsuranceRequirements(res.data.data.requirements || {});
      }
    } catch (error) {
      console.error('Failed to load requirements:', error);
    }
  };

  const openReviewModal = (submission, action) => {
    setSelectedSubmission(submission);
    setReviewAction(action);
    setRejectionReason('');
    setAdminNotes('');
    setShowReviewModal(true);
  };

  const handleReview = async () => {
    if (reviewAction === 'reject' && !rejectionReason) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/api/admin/geo-access/insurance-submissions/${selectedSubmission.doc_id}/review`, {
        action: reviewAction,
        rejection_reason: rejectionReason,
        notes: adminNotes
      });
      
      setShowReviewModal(false);
      loadSubmissions();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to process review');
    } finally {
      setProcessing(false);
    }
  };

  const updateRequirement = async (countryCode, data) => {
    try {
      await api.put(`/api/admin/geo-access/insurance-requirements/${countryCode}`, data);
      loadInsuranceRequirements();
      setEditingRequirement(null);
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to update requirement');
    }
  };

  const viewDocument = (submission) => {
    if (submission.file_data) {
      const blob = new Blob(
        [Uint8Array.from(atob(submission.file_data), c => c.charCodeAt(0))],
        { type: submission.file_type }
      );
      window.open(URL.createObjectURL(blob), '_blank');
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

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || styles.pending;
  };

  const filteredSubmissions = submissions.filter(sub =>
    !searchQuery ||
    sub.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.employer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.document_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                    <FileCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Employer Insurance Review</h1>
                    <p className="text-gray-600">Review workers' insurance documents by country</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRequirementsModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Manage Requirements
                </button>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { key: 'pending', label: 'Pending Review', color: 'yellow', icon: Clock },
                  { key: 'approved', label: 'Approved', color: 'green', icon: CheckCircle },
                  { key: 'rejected', label: 'Rejected', color: 'red', icon: XCircle },
                  { key: 'expired', label: 'Expired', color: 'gray', icon: AlertCircle }
                ].map(({ key, label, color, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`p-4 rounded-xl border transition-all ${
                      statusFilter === key 
                        ? `bg-${color}-50 border-${color}-300 ring-2 ring-${color}-200` 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${color}-100`}>
                        <Icon className={`w-5 h-5 text-${color}-600`} />
                      </div>
                      <div className="text-left">
                        <p className="text-2xl font-bold text-gray-900">{statusCounts[key] || 0}</p>
                        <p className="text-sm text-gray-600">{label}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by company or document..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Countries</option>
                    {Object.entries(insuranceRequirements).map(([code, req]) => (
                      <option key={code} value={code}>
                        {req.country_flag} {req.country_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submissions Table */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-3">Loading submissions...</p>
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No submissions found</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Document</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Expiry</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{t("pages.common.status")}</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{t("pages.common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredSubmissions.map((sub) => {
                        const countryReq = insuranceRequirements[sub.country_code];
                        return (
                          <tr key={sub.doc_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{sub.company_name}</p>
                                  <p className="text-sm text-gray-500">{sub.employer_email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="flex items-center gap-2">
                                <span className="text-lg">{countryReq?.country_flag || '🌍'}</span>
                                <span className="text-gray-700">{countryReq?.country_name || sub.country_code}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">{sub.document_name}</p>
                              {sub.certificate_number && (
                                <p className="text-sm text-gray-500">#{sub.certificate_number}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {formatDate(sub.submitted_at)}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {formatDate(sub.expiry_date)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(sub.status)}`}>
                                {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => viewDocument(sub)}
                                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Document"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {sub.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => openReviewModal(sub, 'approve')}
                                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Approve"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => openReviewModal(sub, 'reject')}
                                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Reject"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {reviewAction === 'approve' ? 'Approve' : 'Reject'} Insurance Document
                </h3>
                <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Company</p>
                <p className="font-medium">{selectedSubmission.company_name}</p>
                <p className="text-sm text-gray-500 mt-2">Document</p>
                <p className="font-medium">{selectedSubmission.document_name}</p>
              </div>
              
              {reviewAction === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    rows={3}
                    placeholder="Explain why this document is being rejected..."
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Notes (optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Internal notes..."
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={processing}
                className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 ${
                  reviewAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                {reviewAction === 'approve' ? 'Approve Document' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requirements Management Modal */}
      {showRequirementsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Insurance Requirements by Country
                </h3>
                <button onClick={() => setShowRequirementsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {Object.keys(insuranceRequirements).length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No employment countries enabled. Enable countries in Geo-Access settings first.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(insuranceRequirements).map(([code, req]) => (
                    <div key={code} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{req.country_flag}</span>
                          <div>
                            <h4 className="font-medium text-gray-900">{req.country_name}</h4>
                            <p className="text-sm text-gray-500">{req.name}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setEditingRequirement(editingRequirement === code ? null : code)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          {editingRequirement === code ? 'Cancel' : 'Edit'}
                        </button>
                      </div>
                      
                      {editingRequirement === code ? (
                        <div className="mt-4 space-y-3 border-t pt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                            <input
                              type="text"
                              defaultValue={req.name}
                              id={`name-${code}`}
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                              type="text"
                              defaultValue={req.full_name}
                              id={`full_name-${code}`}
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t("pages.common.description")}</label>
                            <textarea
                              defaultValue={req.description}
                              id={`description-${code}`}
                              className="w-full px-3 py-2 border rounded-lg"
                              rows={2}
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                defaultChecked={req.required}
                                id={`required-${code}`}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">Required</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                defaultChecked={req.expiry_required}
                                id={`expiry-${code}`}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">Expiry Date Required</span>
                            </label>
                          </div>
                          <button
                            onClick={() => updateRequirement(code, {
                              name: document.getElementById(`name-${code}`).value,
                              full_name: document.getElementById(`full_name-${code}`).value,
                              description: document.getElementById(`description-${code}`).value,
                              required: document.getElementById(`required-${code}`).checked,
                              expiry_required: document.getElementById(`expiry-${code}`).checked
                            })}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Save Changes
                          </button>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-600">{req.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceReview;
