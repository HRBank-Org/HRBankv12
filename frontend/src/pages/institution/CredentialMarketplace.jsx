import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';
import {
  Award, DollarSign, Users, CheckCircle, Clock, AlertCircle,
  Loader2, Search, TrendingUp, GraduationCap
} from 'lucide-react';

const CredentialMarketplace = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [pricingTiers, setPricingTiers] = useState(null);
  const [issuedCredentials, setIssuedCredentials] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('issue');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [issueForm, setIssueForm] = useState({
    program_id: '',
    recipient_email: '',
    recipient_name: '',
    student_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    graduation_year: new Date().getFullYear().toString()
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
      const [programsRes, tiersRes, issuedRes] = await Promise.all([
        api.get('/api/institution/programs'),
        api.get('/api/credential-payments/pricing-tiers'),
        api.get('/api/credential-payments/institution/issued')
      ]);
      
      if (programsRes.data.success) {
        setPrograms(programsRes.data.data?.programs || []);
      }
      
      if (tiersRes.data.success) {
        setPricingTiers(tiersRes.data.data);
      }
      
      if (issuedRes.data.success) {
        setIssuedCredentials(issuedRes.data.data.credentials || []);
        setSummary(issuedRes.data.data.summary);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProgramSelect = (e) => {
    const programId = e.target.value;
    setIssueForm({ ...issueForm, program_id: programId });
    const program = programs.find(p => p.program_id === programId);
    setSelectedProgram(program || null);
  };

  const handleIssueCredential = async (e) => {
    e.preventDefault();
    setIssuing(true);
    setIssueError(null);
    setIssueSuccess(null);

    if (!selectedProgram) {
      setIssueError('Please select a program');
      setIssuing(false);
      return;
    }

    try {
      // Calculate expiry date based on program validity
      let expiryDate = null;
      if (selectedProgram.validity_period_months) {
        const issueDate = new Date(issueForm.issue_date);
        expiryDate = new Date(issueDate);
        expiryDate.setMonth(expiryDate.getMonth() + selectedProgram.validity_period_months);
      }

      const payload = {
        recipient_email: issueForm.recipient_email,
        recipient_name: issueForm.recipient_name,
        student_id: issueForm.student_id,
        credential_type: selectedProgram.credential_type,
        credential_name: selectedProgram.program_name,
        program_name: selectedProgram.program_name,
        program_id: selectedProgram.program_id,
        issue_date: issueForm.issue_date,
        expiry_date: expiryDate ? expiryDate.toISOString().split('T')[0] : null,
        graduation_year: issueForm.graduation_year
      };

      const response = await api.post('/api/credential-payments/issue', payload);
      
      if (response.data.success) {
        setIssueSuccess(response.data);
        setIssueForm({
          program_id: '',
          recipient_email: '',
          recipient_name: '',
          student_id: '',
          issue_date: new Date().toISOString().split('T')[0],
          graduation_year: new Date().getFullYear().toString()
        });
        setSelectedProgram(null);
        loadData();
      }
    } catch (error) {
      setIssueError(error.response?.data?.detail || 'Failed to issue credential');
    } finally {
      setIssuing(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      revoked: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || colors.pending;
  };

  const filteredCredentials = filterStatus === 'all' 
    ? issuedCredentials 
    : issuedCredentials.filter(c => c.payment_status === filterStatus);

  if (loading) {
    return (
      <InstitutionLayout title="Issue Credentials">
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
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Issue Credentials</h1>
          </div>
          <p className="text-indigo-100">Issue blockchain-verified credentials to students and alumni</p>
        </div>

        {/* Stats */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Award className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_issued || 0}</p>
                  <p className="text-sm text-gray-500">Total Issued</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.paid_count || 0}</p>
                  <p className="text-sm text-gray-500">Paid</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.pending_count || 0}</p>
                  <p className="text-sm text-gray-500">Pending Payment</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">${summary.total_revenue?.toFixed(2) || '0.00'}</p>
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
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Issue Credential
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'history' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Issued History
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pricing' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
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
                      {issueSuccess.data?.recipient_has_account 
                        ? 'The recipient has been notified.'
                        : 'The credential will be available when the recipient creates an account.'}
                    </p>
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
              {/* Program Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Program *
                </label>
                <select
                  value={issueForm.program_id}
                  onChange={handleProgramSelect}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  data-testid="program-select"
                >
                  <option value="">Choose a program...</option>
                  {programs.map(program => (
                    <option key={program.program_id} value={program.program_id}>
                      {program.program_name} ({program.credential_type})
                    </option>
                  ))}
                </select>
                {programs.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No programs found. <a href="/institution/programs" className="underline">Create a program first</a>.
                  </p>
                )}
              </div>

              {/* Selected Program Info */}
              {selectedProgram && (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                  <h4 className="font-medium text-indigo-900 mb-2">Program Details</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm text-indigo-700">
                    <div>
                      <span className="text-indigo-500">Credential:</span>
                      <p className="font-medium">{selectedProgram.credential_type}</p>
                    </div>
                    <div>
                      <span className="text-indigo-500">Validity:</span>
                      <p className="font-medium">{selectedProgram.validity_period_months ? `${selectedProgram.validity_period_months} months` : 'Lifetime'}</p>
                    </div>
                    <div>
                      <span className="text-indigo-500">Price:</span>
                      <p className="font-medium">
                        ${pricingTiers?.tiers?.[selectedProgram.credential_type]?.price_cad || '50'} CAD
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                    data-testid="recipient-email"
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
                    data-testid="recipient-name"
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
                    data-testid="student-id"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
                  <input
                    type="date"
                    value={issueForm.issue_date}
                    onChange={(e) => setIssueForm({...issueForm, issue_date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    data-testid="issue-date"
                  />
                  <p className="text-xs text-gray-500 mt-1">Can be a past date for alumni</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                  <input
                    type="number"
                    value={issueForm.graduation_year}
                    onChange={(e) => setIssueForm({...issueForm, graduation_year: e.target.value})}
                    min="1950"
                    max="2100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="2024"
                    data-testid="graduation-year"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={issuing || !selectedProgram}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  data-testid="issue-credential-btn"
                >
                  {issuing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Issuing...
                    </>
                  ) : (
                    <>
                      <Award className="w-5 h-5" />
                      Issue Credential
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Issued History */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Issued Credentials</h2>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {filteredCredentials.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credential</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCredentials.map((cred, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{cred.recipient_name}</p>
                          <p className="text-sm text-gray-500">{cred.recipient_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{cred.credential_name}</p>
                          <p className="text-sm text-gray-500">{cred.credential_type}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(cred.issue_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(cred.payment_status)}`}>
                            {cred.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ${cred.price_cad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No credentials issued yet</p>
              </div>
            )}
          </div>
        )}

        {/* Pricing Tiers */}
        {activeTab === 'pricing' && pricingTiers && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Credential Pricing</h2>
            <div className="grid grid-cols-3 gap-6">
              {Object.entries(pricingTiers.tiers).map(([key, tier]) => (
                <div key={key} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
                    <span className="text-2xl font-bold text-indigo-600">${tier.price_cad}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{tier.description}</p>
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">Your payout: <span className="font-medium text-green-600">${tier.institution_payout_cad}</span></p>
                    <p className="text-xs text-gray-400 mt-1">Platform fee: ${tier.platform_fee_cad}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </InstitutionLayout>
  );
};

export default CredentialMarketplace;
