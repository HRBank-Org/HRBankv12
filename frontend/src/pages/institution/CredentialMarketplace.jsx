import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';
import {
  Award, DollarSign, Users, Send, CheckCircle, Clock, AlertCircle,
  Building2, Loader2, Search, Filter, TrendingUp, Wallet
} from 'lucide-react';

const CredentialMarketplace = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [pricingTiers, setPricingTiers] = useState(null);
  const [issuedCredentials, setIssuedCredentials] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('issue');
  const [issueForm, setIssueForm] = useState({
    recipient_email: '',
    recipient_name: '',
    student_id: '',
    credential_type: 'certificate',
    credential_name: '',
    program_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: ''
  });
  const [issuing, setIssuing] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(null);
  const [issueError, setIssueError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tiersRes, issuedRes] = await Promise.all([
        api.get('/api/credential-payments/pricing-tiers'),
        api.get('/api/credential-payments/institution/issued')
      ]);
      
      if (tiersRes.data.success) {
        setPricingTiers(tiersRes.data.data);
      }
      
      if (issuedRes.data.success) {
        setIssuedCredentials(issuedRes.data.data.credentials);
        setSummary(issuedRes.data.data.summary);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCredential = async (e) => {
    e.preventDefault();
    setIssuing(true);
    setIssueError(null);
    setIssueSuccess(null);

    try {
      const response = await api.post('/api/credential-payments/issue-pending', issueForm);
      if (response.data.success) {
        setIssueSuccess(response.data);
        setIssueForm({
          recipient_email: '',
          recipient_name: '',
          student_id: '',
          credential_type: 'certificate',
          credential_name: '',
          program_name: '',
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: ''
        });
        loadData();
      }
    } catch (error) {
      setIssueError(error.response?.data?.detail || 'Failed to issue credential');
    } finally {
      setIssuing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Paid</span>;
      case 'pending_payment':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const filteredCredentials = issuedCredentials.filter(c => 
    filterStatus === 'all' || c.status === filterStatus
  );

  if (loading) {
    return (
      <InstitutionLayout title="Credential Marketplace">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </InstitutionLayout>
    );
  }

  return (
    <InstitutionLayout>
      <div data-testid="credential-marketplace-page">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-8 py-8 rounded-xl mb-6">
          <h1 className="text-3xl font-bold mb-2">Credential Marketplace</h1>
          <p className="text-indigo-100">Issue and sell blockchain-verified credentials</p>
        </div>
          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{summary.total_issued}</p>
                    <p className="text-sm text-gray-500">Total Issued</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{summary.total_paid}</p>
                    <p className="text-sm text-gray-500">Paid</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{summary.total_pending}</p>
                    <p className="text-sm text-gray-500">Pending Payment</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">${summary.total_revenue_cad.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Your Revenue</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('issue')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'issue' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Issue Credential
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'history' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Issued History
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'pricing' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Pricing Tiers
            </button>
          </div>

          {/* Issue Credential Form */}
          {activeTab === 'issue' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Issue New Credential</h2>
              
              {issueSuccess && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Credential issued successfully!</p>
                      <p className="text-sm text-green-700 mt-1">
                        {issueSuccess.data.recipient_has_account 
                          ? 'The recipient has been notified to complete payment.'
                          : 'The credential will be available when the recipient creates an account.'}
                      </p>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Price: <strong>${issueSuccess.data.price_cad} CAD</strong></p>
                        <p>Your payout: <strong>${issueSuccess.data.institution_payout_cad} CAD</strong></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {issueError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800">{issueError}</p>
                </div>
              )}

              <form onSubmit={handleIssueCredential} className="space-y-6">
                {/* Recipient Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email *</label>
                    <input
                      type="email"
                      value={issueForm.recipient_email}
                      onChange={(e) => setIssueForm({...issueForm, recipient_email: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="student@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name *</label>
                    <input
                      type="text"
                      value={issueForm.recipient_name}
                      onChange={(e) => setIssueForm({...issueForm, recipient_name: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                    <input
                      type="text"
                      value={issueForm.student_id}
                      onChange={(e) => setIssueForm({...issueForm, student_id: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="STU-2024-001"
                    />
                  </div>
                </div>

                {/* Credential Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credential Type *</label>
                    <select
                      value={issueForm.credential_type}
                      onChange={(e) => setIssueForm({...issueForm, credential_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {pricingTiers && Object.entries(pricingTiers.tiers).map(([key, tier]) => (
                        <option key={key} value={key}>
                          {tier.name} - ${tier.price_cad} CAD
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credential Name *</label>
                    <input
                      type="text"
                      value={issueForm.credential_name}
                      onChange={(e) => setIssueForm({...issueForm, credential_name: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Food Handler Certificate"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                    <input
                      type="text"
                      value={issueForm.program_name}
                      onChange={(e) => setIssueForm({...issueForm, program_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Culinary Management"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
                    <input
                      type="date"
                      value={issueForm.issue_date}
                      onChange={(e) => setIssueForm({...issueForm, issue_date: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={issueForm.expiry_date}
                      onChange={(e) => setIssueForm({...issueForm, expiry_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Pricing Preview */}
                {pricingTiers && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-indigo-700">Selected: <strong>{pricingTiers.tiers[issueForm.credential_type]?.name}</strong></p>
                        <p className="text-xs text-indigo-600 mt-1">{pricingTiers.tiers[issueForm.credential_type]?.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-900">${pricingTiers.tiers[issueForm.credential_type]?.price_cad}</p>
                        <p className="text-sm text-indigo-600">
                          Your share: ${(pricingTiers.tiers[issueForm.credential_type]?.price_cad * 0.5).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={issuing}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {issuing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Issuing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Issue Credential
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Issued Credentials</h3>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending_payment">Pending Payment</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              
              {filteredCredentials.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No credentials found
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredCredentials.map((cred) => (
                    <div key={cred.pending_credential_id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Award className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{cred.credential_name}</p>
                            <p className="text-sm text-gray-500">{cred.recipient_name} • {cred.recipient_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium text-gray-900">${cred.price_cad}</p>
                            <p className="text-xs text-gray-500">Your share: ${cred.institution_payout_cad}</p>
                          </div>
                          {getStatusBadge(cred.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && pricingTiers && (
            <div className="grid grid-cols-3 gap-6">
              {Object.entries(pricingTiers.tiers).map(([key, tier]) => (
                <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`p-4 ${key === 'diploma' ? 'bg-indigo-600' : 'bg-gray-800'} text-white`}>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                  </div>
                  <div className="p-6">
                    <div className="text-center mb-4">
                      <span className="text-4xl font-bold text-gray-900">${tier.price_cad}</span>
                      <span className="text-gray-500"> CAD</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{tier.description}</p>
                    <div className="bg-green-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-green-800">
                        <strong>Your revenue:</strong> ${(tier.price_cad * 0.5).toFixed(2)} CAD (50%)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Examples:</p>
                      {tier.examples.slice(0, 3).map((ex, i) => (
                        <p key={i} className="text-sm text-gray-600">• {ex}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CredentialMarketplace;
