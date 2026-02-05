import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { 
  FileText, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  X, 
  User,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Shield,
  AlertTriangle
} from 'lucide-react';

const IDVerification = () => {
  const theme = useTheme();
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [verifiedWorkers, setVerifiedWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, verifiedRes] = await Promise.all([
        api.get('/api/admin/id-verification/pending'),
        api.get('/api/admin/id-verification/verified')
      ]);
      setPendingVerifications(pendingRes.data.data?.pending_verifications || []);
      setVerifiedWorkers(verifiedRes.data.data?.verified_workers || []);
    } catch (error) {
      console.error('Failed to load verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId, approved, note = '') => {
    setProcessing(userId);
    try {
      await api.post(`/api/admin/id-verification/${userId}/verify`, {
        approved,
        note: note || (approved ? 'ID verified and address locked' : 'ID verification rejected')
      });
      await loadData();
      setSelectedWorker(null);
      setShowRejectModal(false);
      setRejectNote('');
    } catch (error) {
      console.error('Failed to verify worker:', error);
      alert(error.response?.data?.detail || 'Failed to process verification');
    } finally {
      setProcessing(null);
    }
  };

  const handleUnlock = async (userId) => {
    const reason = prompt('Enter reason for unlocking address:');
    if (!reason) return;

    setProcessing(userId);
    try {
      await api.post(`/api/admin/id-verification/${userId}/unlock-address?reason=${encodeURIComponent(reason)}`);
      await loadData();
    } catch (error) {
      console.error('Failed to unlock address:', error);
      alert(error.response?.data?.detail || 'Failed to unlock address');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">ID Document Verification</h1>
                    <p className="text-gray-600">Verify worker identity documents and lock addresses for match engine</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{pendingVerifications.length}</p>
                      <p className="text-sm text-gray-600">Pending Verification</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{verifiedWorkers.length}</p>
                      <p className="text-sm text-gray-600">Verified (Address Locked)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="flex border-b">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'pending'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Pending ({pendingVerifications.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('verified')}
                    className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'verified'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Verified ({verifiedWorkers.length})
                  </button>
                </div>

                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: theme.primaryColor }}></div>
                  </div>
                ) : activeTab === 'pending' ? (
                  <div className="divide-y">
                    {pendingVerifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                        <p>No pending verifications</p>
                      </div>
                    ) : (
                      pendingVerifications.map((worker) => (
                        <div key={worker.user_id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{worker.name || 'N/A'}</p>
                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {worker.email}
                                  </span>
                                  {worker.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {worker.phone}
                                    </span>
                                  )}
                                </div>
                                {(worker.city || worker.province) && (
                                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {[worker.address, worker.city, worker.province, worker.postal_code].filter(Boolean).join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {worker.id_document_url && (
                                <a
                                  href={worker.id_document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="View ID Document"
                                >
                                  <ExternalLink className="w-5 h-5" />
                                </a>
                              )}
                              <button
                                onClick={() => { setSelectedWorker(worker); setShowRejectModal(true); }}
                                disabled={processing === worker.user_id}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                              <button
                                onClick={() => handleVerify(worker.user_id, true)}
                                disabled={processing === worker.user_id}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                              >
                                {processing === worker.user_id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                Approve & Lock Address
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {verifiedWorkers.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No verified workers yet</p>
                      </div>
                    ) : (
                      verifiedWorkers.map((worker) => (
                        <div key={worker.workforce_id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{worker.full_name || 'N/A'}</p>
                                <p className="text-sm text-gray-500">{worker.email}</p>
                                {(worker.city || worker.province) && (
                                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {[worker.address, worker.city, worker.province, worker.postal_code].filter(Boolean).join(', ')}
                                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                      Address Locked
                                    </span>
                                  </div>
                                )}
                                {worker.id_verified_at && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Verified: {new Date(worker.id_verified_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnlock(worker.workforce_id)}
                              disabled={processing === worker.workforce_id}
                              className="px-3 py-2 text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                              {processing === worker.workforce_id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent" />
                              ) : (
                                'Unlock for Update'
                              )}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedWorker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Reject Verification</h2>
              <button
                onClick={() => { setShowRejectModal(false); setSelectedWorker(null); setRejectNote(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Rejecting verification for <strong>{selectedWorker.name || selectedWorker.email}</strong>
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full p-3 border rounded-lg mb-4 h-24 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setSelectedWorker(null); setRejectNote(''); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerify(selectedWorker.user_id, false, rejectNote)}
                disabled={processing === selectedWorker.user_id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing === selectedWorker.user_id ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IDVerification;
