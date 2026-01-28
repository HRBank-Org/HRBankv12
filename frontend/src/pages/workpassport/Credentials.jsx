import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkPassportHeader from '../../components/layout/WorkPassportHeader';
import WorkPassportSidebar from '../../components/layout/WorkPassportSidebar';
import api from '../../utils/api';
import { 
  FiAward, 
  FiCheckCircle, 
  FiClock, 
  FiAlertCircle,
  FiExternalLink,
  FiCalendar,
  FiSearch,
  FiFilter,
  FiShield,
  FiDollarSign,
  FiArrowRight,
  FiLink
} from 'react-icons/fi';

// LinkedIn Logo SVG Component
const LinkedInLogo = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

// Blockchain Icon
const BlockchainIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" />
  </svg>
);

const WorkPassportCredentials = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState([]);
  const [pendingCredentials, setPendingCredentials] = useState([]);
  const [summary, setSummary] = useState({ total: 0, verified: 0, pending_payment: 0 });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      // Load verified blockchain credentials
      const [verifiedRes, pendingRes] = await Promise.all([
        api.get('/api/workpassport/credentials').catch(() => ({ data: { data: { credentials: [] } } })),
        api.get('/api/credential-payments/my-pending').catch(() => ({ data: { data: { pending_credentials: [] } } }))
      ]);
      
      const verified = verifiedRes.data.data?.credentials?.filter(c => c.status === 'verified') || [];
      const pending = pendingRes.data.data?.pending_credentials || [];
      
      setCredentials(verified);
      setPendingCredentials(pending);
      setSummary({
        total: verified.length + pending.length,
        verified: verified.length,
        pending_payment: pending.length
      });
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToLinkedIn = (credential) => {
    // Only allow verified credentials to be added to LinkedIn
    if (credential.status !== 'verified' && credential.status !== 'issued') {
      return;
    }

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
    
    // Verification URL - blockchain verified link
    const verifyUrl = credential.verification_url || `${window.location.origin}/verify/${credential.credential_id}`;
    params.set('certUrl', verifyUrl);
    params.set('certId', credential.credential_id);
    
    window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, '_blank');
  };

  const initiatePayment = async (pendingCredential) => {
    try {
      const response = await api.post('/api/credential-payments/initiate-payment', {
        pending_credential_id: pendingCredential.pending_credential_id,
        origin_url: window.location.origin,
        province: 'ON' // Could be dynamic based on user profile
      });
      
      if (response.data.success && response.data.data.checkout_url) {
        window.location.href = response.data.data.checkout_url;
      }
    } catch (error) {
      console.error('Failed to initiate payment:', error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  const filteredCredentials = credentials.filter(cred => {
    const matchesSearch = !searchTerm || 
      cred.credential_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.institution_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredPending = pendingCredentials.filter(cred => {
    const matchesSearch = !searchTerm || 
      cred.credential_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.institution_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
                Blockchain-verified credentials from trusted institutions
              </p>
            </div>
            <button
              onClick={() => navigate('/institutions')}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
              data-testid="find-institutions-btn"
            >
              <FiSearch size={18} />
              Find Institutions
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <FiCheckCircle className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Verified Credentials</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.verified}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <FiDollarSign className="text-orange-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Awaiting Payment</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.pending_payment}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <BlockchainIcon className="text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Credentials</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
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
          </div>

          {/* Pending Payment Section */}
          {filteredPending.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiDollarSign className="text-orange-500" />
                Credentials Awaiting Payment
              </h2>
              <div className="grid gap-4">
                {filteredPending.map((credential) => (
                  <div 
                    key={credential.pending_credential_id}
                    className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border-2 border-orange-200"
                    data-testid={`pending-credential-${credential.pending_credential_id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FiClock className="text-orange-600" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {credential.credential_name}
                            </h3>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                              <FiDollarSign size={12} />
                              Payment Required
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">
                            Issued by <span className="font-medium">{credential.institution_name}</span>
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <FiCalendar size={14} />
                              Issued: {formatDate(credential.issue_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{formatPrice(credential.price_cad)}</p>
                          <p className="text-xs text-gray-500">+ applicable taxes</p>
                        </div>
                        <button
                          onClick={() => initiatePayment(credential)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                          data-testid={`pay-credential-${credential.pending_credential_id}`}
                        >
                          Claim Credential
                          <FiArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified Credentials Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiShield className="text-green-500" />
              Verified Credentials
            </h2>
            
            {filteredCredentials.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiAward className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No verified credentials yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Get your credentials verified by trusted institutions. Once verified, they're secured on the blockchain and can be shared on LinkedIn.
                </p>
                <button
                  onClick={() => navigate('/institutions')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
                >
                  <FiSearch size={18} />
                  Browse Institutions
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredCredentials.map((credential) => (
                  <div 
                    key={credential.credential_id}
                    className="rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all overflow-hidden"
                    data-testid={`credential-card-${credential.credential_id}`}
                  >
                    {/* Certificate Preview with Background */}
                    {credential.credential_background_url ? (
                      <div 
                        className="relative h-48 bg-cover bg-center"
                        style={{ backgroundImage: `url(${credential.credential_background_url})` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <div className="flex items-center gap-2 mb-1">
                            <FiCheckCircle size={16} className="text-green-400" />
                            <span className="text-xs font-medium bg-green-500/80 px-2 py-0.5 rounded">Blockchain Verified</span>
                          </div>
                          <h3 className="text-xl font-bold">{credential.credential_name}</h3>
                          <p className="text-sm text-gray-200">{credential.institution_name}</p>
                        </div>
                        {credential.institution_logo && (
                          <img 
                            src={credential.institution_logo} 
                            alt="" 
                            className="absolute top-4 right-4 w-16 h-16 object-contain bg-white rounded-lg p-2"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <FiCheckCircle size={16} className="text-green-400" />
                              <span className="text-xs font-medium text-green-400 bg-green-500/20 px-2 py-0.5 rounded">Blockchain Verified</span>
                            </div>
                            <h3 className="text-xl font-bold text-white">{credential.credential_name}</h3>
                            <p className="text-gray-300">{credential.institution_name}</p>
                          </div>
                          {credential.institution_logo ? (
                            <img 
                              src={credential.institution_logo} 
                              alt="" 
                              className="w-16 h-16 object-contain bg-white rounded-lg p-2"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                              <FiShield className="text-white" size={24} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Credential Details */}
                    <div className="bg-white p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {credential.program_name && (
                            <p className="text-gray-600 text-sm mb-2">
                              Program: {credential.program_name}
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
                          {credential.blockchain_transaction_hash && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                              <BlockchainIcon className="w-3 h-3" />
                              <span className="font-mono truncate max-w-xs">
                                {credential.blockchain_transaction_hash}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => addToLinkedIn(credential)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] transition-colors text-sm font-medium"
                            title="Add to LinkedIn Profile"
                            data-testid={`add-linkedin-${credential.credential_id}`}
                          >
                            <LinkedInLogo className="w-4 h-4" />
                            Add to LinkedIn
                          </button>
                          <button
                            onClick={() => window.open(credential.verification_url || `/verify/${credential.credential_id}`, '_blank')}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            title="View verification page"
                          >
                            <FiExternalLink size={16} />
                            Verify
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How It Works Banner */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
            <h3 className="text-xl font-bold mb-4">How Credential Verification Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                <div>
                  <p className="font-medium mb-1">Institution Issues</p>
                  <p className="text-sm text-gray-400">Your school or training provider issues your credential</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                <div>
                  <p className="font-medium mb-1">You Pay & Claim</p>
                  <p className="text-sm text-gray-400">Pay the verification fee to claim your credential</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                <div>
                  <p className="font-medium mb-1">Blockchain Secured</p>
                  <p className="text-sm text-gray-400">Your credential is permanently recorded on the blockchain</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">4</div>
                <div>
                  <p className="font-medium mb-1">Share Anywhere</p>
                  <p className="text-sm text-gray-400">Add to LinkedIn, share with employers worldwide</p>
                </div>
              </div>
            </div>
          </div>

          {/* LinkedIn Info Banner */}
          <div className="mt-8 bg-gradient-to-r from-[#0A66C2] to-[#004182] rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <LinkedInLogo className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Stand Out on LinkedIn</h3>
                <p className="text-blue-100 text-sm">
                  Unlike self-reported credentials, your blockchain-verified credentials include a verification link. 
                  Employers can instantly confirm your qualifications are real.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkPassportCredentials;
