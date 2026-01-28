import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkPassportHeader from '../../components/layout/WorkPassportHeader';
import WorkPassportSidebar from '../../components/layout/WorkPassportSidebar';
import api from '../../utils/api';
import { 
  FiAward, 
  FiPlus, 
  FiCheckCircle, 
  FiClock, 
  FiAlertCircle,
  FiExternalLink,
  FiCalendar,
  FiSearch,
  FiFilter,
  FiX,
  FiUpload,
  FiFileText
} from 'react-icons/fi';

// LinkedIn Logo SVG Component
const LinkedInLogo = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const WorkPassportCredentials = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState([]);
  const [summary, setSummary] = useState({ total: 0, verified: 0, pending: 0 });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingCredential, setAddingCredential] = useState(false);
  const [newCredential, setNewCredential] = useState({
    credential_name: '',
    credential_type: 'certificate',
    institution_name: '',
    description: '',
    issue_date: '',
    expiry_date: ''
  });

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const response = await api.get('/api/workpassport/credentials');
      const data = response.data.data;
      setCredentials(data.credentials || []);
      setSummary(data.summary || { total: 0, verified: 0, pending: 0 });
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToLinkedIn = (credential) => {
    // Build LinkedIn Add to Profile URL
    const params = new URLSearchParams();
    params.set('startTask', 'CERTIFICATION_NAME');
    params.set('name', credential.credential_name);
    
    if (credential.institution_name) {
      params.set('organizationName', credential.institution_name);
    }
    
    if (credential.issue_date) {
      const issueDate = new Date(credential.issue_date);
      params.set('issueYear', issueDate.getFullYear().toString());
      params.set('issueMonth', (issueDate.getMonth() + 1).toString());
    }
    
    if (credential.expiry_date) {
      const expiryDate = new Date(credential.expiry_date);
      params.set('expirationYear', expiryDate.getFullYear().toString());
      params.set('expirationMonth', (expiryDate.getMonth() + 1).toString());
    }
    
    // Verification URL - this creates the backlink to WorkPassport
    const verifyUrl = `${window.location.origin}/verify/${credential.credential_id}`;
    params.set('certUrl', verifyUrl);
    params.set('certId', credential.credential_id);
    
    window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, '_blank');
  };

  const handleAddCredential = async (e) => {
    e.preventDefault();
    if (!newCredential.credential_name.trim()) return;
    
    setAddingCredential(true);
    try {
      await api.post('/api/workpassport/credentials/add-self', newCredential);
      await loadCredentials();
      setShowAddModal(false);
      setNewCredential({
        credential_name: '',
        credential_type: 'certificate',
        institution_name: '',
        description: '',
        issue_date: '',
        expiry_date: ''
      });
    } catch (error) {
      console.error('Failed to add credential:', error);
    } finally {
      setAddingCredential(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'verified':
        return { 
          label: 'Verified', 
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: FiCheckCircle,
          canAddToLinkedIn: true
        };
      case 'pending':
        return { 
          label: 'Pending Review', 
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          icon: FiClock,
          canAddToLinkedIn: false
        };
      case 'self_reported':
        return { 
          label: 'Self-Reported', 
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: FiFileText,
          canAddToLinkedIn: true // Allow adding self-reported too
        };
      case 'rejected':
        return { 
          label: 'Rejected', 
          color: 'bg-red-100 text-red-700 border-red-200',
          icon: FiAlertCircle,
          canAddToLinkedIn: false
        };
      default:
        return { 
          label: status || 'Unknown', 
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: FiAward,
          canAddToLinkedIn: false
        };
    }
  };

  const filteredCredentials = credentials.filter(cred => {
    const matchesFilter = filter === 'all' || cred.status === filter;
    const matchesSearch = !searchTerm || 
      cred.credential_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.institution_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkPassportHeader />
      <WorkPassportSidebar />
      
      <div className="transition-all duration-300 pt-16" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">My Credentials</h1>
              <p className="text-gray-600">
                Manage your verified certifications and qualifications
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
              data-testid="add-credential-btn"
            >
              <FiPlus size={18} />
              Add Credential
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <FiAward className="text-cyan-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Credentials</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <FiCheckCircle className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Verified</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.verified}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <FiClock className="text-yellow-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.pending}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search credentials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                data-testid="credential-search"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'verified', 'pending', 'self_reported'].map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    filter === filterOption
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                  data-testid={`filter-${filterOption}`}
                >
                  {filterOption === 'all' ? 'All' : 
                   filterOption === 'self_reported' ? 'Self-Reported' :
                   filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Credentials List */}
          {filteredCredentials.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAward className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No credentials found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start building your credential portfolio'}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
              >
                <FiPlus size={18} />
                Add Your First Credential
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCredentials.map((credential) => {
                const statusConfig = getStatusConfig(credential.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div 
                    key={credential.credential_id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                    data-testid={`credential-card-${credential.credential_id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FiAward className="text-white" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {credential.credential_name}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                              <StatusIcon size={12} />
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">
                            {credential.institution_name || 'Self-Reported'}
                          </p>
                          {credential.description && (
                            <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                              {credential.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <FiCalendar size={14} />
                              Issued: {formatDate(credential.issue_date)}
                            </span>
                            {credential.expiry_date && (
                              <span className="flex items-center gap-1">
                                <FiClock size={14} />
                                Expires: {formatDate(credential.expiry_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        {statusConfig.canAddToLinkedIn && (
                          <button
                            onClick={() => addToLinkedIn(credential)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] transition-colors text-sm font-medium"
                            title="Add to LinkedIn Profile"
                            data-testid={`add-linkedin-${credential.credential_id}`}
                          >
                            <LinkedInLogo className="w-4 h-4" />
                            Add to LinkedIn
                          </button>
                        )}
                        {credential.status === 'verified' && (
                          <button
                            onClick={() => window.open(`/verify/${credential.credential_id}`, '_blank')}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            title="View verification page"
                          >
                            <FiExternalLink size={16} />
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LinkedIn Info Banner */}
          <div className="mt-8 bg-gradient-to-r from-[#0A66C2] to-[#004182] rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <LinkedInLogo className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Boost Your Professional Profile</h3>
                <p className="text-blue-100 text-sm">
                  Add your verified credentials to LinkedIn with one click. Employers searching LinkedIn will see your certifications with verification links back to WorkPassport.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Credential Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add Credential</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Add a self-reported credential. You can request verification later.
              </p>
            </div>
            
            <form onSubmit={handleAddCredential} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credential Name *
                </label>
                <input
                  type="text"
                  value={newCredential.credential_name}
                  onChange={(e) => setNewCredential(prev => ({ ...prev, credential_name: e.target.value }))}
                  placeholder="e.g., Food Safety Certificate"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                  data-testid="credential-name-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={newCredential.credential_type}
                  onChange={(e) => setNewCredential(prev => ({ ...prev, credential_type: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="certificate">Certificate</option>
                  <option value="license">License</option>
                  <option value="degree">Degree</option>
                  <option value="diploma">Diploma</option>
                  <option value="course">Course Completion</option>
                  <option value="badge">Digital Badge</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issuing Institution
                </label>
                <input
                  type="text"
                  value={newCredential.institution_name}
                  onChange={(e) => setNewCredential(prev => ({ ...prev, institution_name: e.target.value }))}
                  placeholder="e.g., National Food Safety Institute"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCredential.description}
                  onChange={(e) => setNewCredential(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the credential..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={newCredential.issue_date}
                    onChange={(e) => setNewCredential(prev => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newCredential.expiry_date}
                    onChange={(e) => setNewCredential(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCredential || !newCredential.credential_name.trim()}
                  className="flex-1 px-4 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="submit-credential-btn"
                >
                  {addingCredential ? 'Adding...' : 'Add Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkPassportCredentials;
