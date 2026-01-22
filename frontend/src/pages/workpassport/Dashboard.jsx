import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import {
  Globe,
  Award,
  Shield,
  Share2,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Copy,
  Settings,
  LogOut,
  FileText,
  Building2,
  Calendar,
  Eye,
  Loader2,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';

const WorkPassportDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [credentialSummary, setCredentialSummary] = useState({});
  const [copied, setCopied] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileRes, credentialsRes] = await Promise.all([
        api.get('/api/workpassport/profile', {
          headers: { 'X-User-ID': user.user_id }
        }),
        api.get('/api/workpassport/credentials', {
          headers: { 'X-User-ID': user.user_id }
        })
      ]);

      if (profileRes.data.success) {
        setProfile(profileRes.data.data.profile);
      }
      if (credentialsRes.data.success) {
        setCredentials(credentialsRes.data.data.credentials);
        setCredentialSummary(credentialsRes.data.data.summary);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (profile?.share_token) {
      const url = `${window.location.origin}/passport/${profile.share_token}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      verified: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      self_reported: { bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText }
    };
    return styles[status] || styles.self_reported;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <nav className="bg-slate-900/50 backdrop-blur-sm border-b border-white/10 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo192.png" alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <span className="font-bold text-xl text-white">WorkPassport™</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={copyShareLink}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Share Profile'}
            </button>
            <button
              onClick={() => navigate('/workpassport/settings')}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold">
                {profile?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{profile?.full_name}</h1>
                <p className="text-white/60">{profile?.headline || 'Add a headline to your profile'}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-sm text-white/50">
                    <Globe className="w-4 h-4" />
                    {profile?.city ? `${profile.city}, ` : ''}{profile?.country}
                  </span>
                  <span className="text-sm text-blue-400 font-mono">{profile?.passport_id}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold text-white">{credentialSummary.verified || 0}</p>
                <p className="text-xs text-white/50">Verified</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{credentialSummary.pending || 0}</p>
                <p className="text-xs text-white/50">Pending</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold text-white/60">{profile?.profile_views || 0}</p>
                <p className="text-xs text-white/50">Views</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-white hover:from-blue-700 hover:to-cyan-700 transition-all"
            data-testid="add-credential-btn"
          >
            <Plus className="w-6 h-6" />
            <div className="text-left">
              <p className="font-semibold">Add Credential</p>
              <p className="text-sm text-white/70">Certificate, license, or skill</p>
            </div>
          </button>
          
          <Link
            to="/institutions"
            className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all border border-white/10"
          >
            <Building2 className="w-6 h-6" />
            <div className="text-left">
              <p className="font-semibold">Find Institutions</p>
              <p className="text-sm text-white/50">Request verification</p>
            </div>
          </Link>
          
          {profile?.country === 'CA' && !profile?.upgraded_to_workforce && (
            <button
              onClick={() => navigate('/workpassport/upgrade')}
              className="flex items-center gap-3 p-4 bg-purple-600/20 hover:bg-purple-600/30 rounded-xl text-white transition-all border border-purple-500/30"
            >
              <Sparkles className="w-6 h-6 text-purple-400" />
              <div className="text-left">
                <p className="font-semibold">Upgrade to Workforce</p>
                <p className="text-sm text-purple-300">Access job marketplace</p>
              </div>
            </button>
          )}
        </div>

        {/* Credentials */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Your Credentials</h2>
            <span className="text-sm text-gray-500">{credentialSummary.total || 0} total</span>
          </div>

          {credentials.length === 0 ? (
            <div className="p-12 text-center">
              <Award className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Credentials Yet</h3>
              <p className="text-gray-500 mb-6">Start building your verified credential portfolio</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                Add Your First Credential
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {credentials.map(cred => {
                const statusStyle = getStatusBadge(cred.status);
                const StatusIcon = statusStyle.icon;
                return (
                  <div key={cred.credential_id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          cred.status === 'verified' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {cred.status === 'verified' ? (
                            <Shield className="w-6 h-6 text-green-600" />
                          ) : (
                            <FileText className="w-6 h-6 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{cred.credential_name}</h4>
                          <p className="text-sm text-gray-600">{cred.institution_name}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              <StatusIcon className="w-3 h-3" />
                              {cred.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-gray-400">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              Issued: {cred.issue_date}
                            </span>
                            {cred.verification_count > 0 && (
                              <span className="text-xs text-gray-400">
                                <Eye className="w-3 h-3 inline mr-1" />
                                {cred.verification_count} verifications
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cred.status === 'verified' && cred.blockchain_hash && (
                          <span className="text-xs text-green-600 font-mono bg-green-50 px-2 py-1 rounded">
                            Blockchain ✓
                          </span>
                        )}
                        {cred.status === 'self_reported' && (
                          <button className="text-sm text-blue-600 hover:underline">
                            Request Verification
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upgrade Banner (for non-CA users) */}
        {profile?.country !== 'CA' && (
          <div className="mt-8 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Job Marketplace Coming Soon</h3>
                <p className="text-white/70 text-sm mb-3">
                  Full workforce features with job matching are currently available in Canada. 
                  We're expanding to more countries soon. Until then, continue building your credential portfolio!
                </p>
                <div className="flex items-center gap-2 text-sm text-purple-300">
                  <span>Coming soon:</span>
                  <span className="px-2 py-0.5 bg-white/10 rounded">🇬🇧 UK</span>
                  <span className="px-2 py-0.5 bg-white/10 rounded">🇦🇺 Australia</span>
                  <span className="px-2 py-0.5 bg-white/10 rounded">🇦🇪 UAE</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Credential Modal */}
      {showAddModal && (
        <AddCredentialModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); loadData(); }} userId={user.user_id} />
      )}
    </div>
  );
};

const AddCredentialModal = ({ onClose, onSuccess, userId }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    credential_name: '',
    credential_type: 'certificate',
    institution_name: '',
    issue_date: '',
    expiry_date: '',
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/api/workpassport/credentials/add-self', formData, {
        headers: { 'X-User-ID': userId }
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add credential:', error);
      alert(error.response?.data?.detail || 'Failed to add credential');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Add Credential</h2>
          <p className="text-sm text-gray-500">Add now, verify later with an institution</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credential Name *</label>
            <input
              type="text"
              value={formData.credential_name}
              onChange={(e) => setFormData(prev => ({ ...prev, credential_name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., WHMIS Certificate"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.credential_type}
              onChange={(e) => setFormData(prev => ({ ...prev, credential_type: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="certificate">Certificate</option>
              <option value="diploma">Diploma</option>
              <option value="degree">Degree</option>
              <option value="license">License</option>
              <option value="skill_badge">Skill Badge</option>
              <option value="course">Course Completion</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Institution</label>
            <input
              type="text"
              value={formData.institution_name}
              onChange={(e) => setFormData(prev => ({ ...prev, institution_name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., St. Clair College"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Credential
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkPassportDashboard;
