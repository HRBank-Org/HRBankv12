import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { 
  FiFileText, 
  FiCheckCircle, 
  FiClock,
  FiSearch,
  FiFilter,
  FiDownload,
  FiEye,
  FiUsers,
  FiPercent,
  FiArrowLeft,
  FiX,
  FiMail,
  FiCalendar,
  FiGlobe,
  FiAward,
  FiDollarSign
} from 'react-icons/fi';

const PartnershipAgreements = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'signed', 'pending'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [institutionDetails, setInstitutionDetails] = useState(null);

  const loadAgreements = useCallback(async () => {
    try {
      setLoading(true);
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const response = await api.get(`/api/admin/partnership-agreements${statusParam}`);
      setAgreements(response.data.data.agreements);
      setSummary(response.data.data.summary);
    } catch (error) {
      console.error('Failed to load agreements:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  const loadInstitutionDetails = async (institutionId) => {
    setDetailsLoading(true);
    setSelectedInstitution(institutionId);
    try {
      const response = await api.get(`/api/admin/partnership-agreements/${institutionId}`);
      setInstitutionDetails(response.data.data);
    } catch (error) {
      console.error('Failed to load institution details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedInstitution(null);
    setInstitutionDetails(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAgreements = agreements.filter(a => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      a.institution_name?.toLowerCase().includes(search) ||
      a.contact_email?.toLowerCase().includes(search) ||
      a.contact_name?.toLowerCase().includes(search) ||
      a.agreement?.signatory_name?.toLowerCase().includes(search)
    );
  });

  const exportToCSV = () => {
    const headers = ['Institution Name', 'Contact Email', 'Country', 'Status', 'Signatory Name', 'Signatory Title', 'Signed Date'];
    const rows = filteredAgreements.map(a => [
      a.institution_name,
      a.contact_email,
      a.country,
      a.status,
      a.agreement?.signatory_name || '',
      a.agreement?.signatory_title || '',
      a.agreement?.accepted_date ? formatDate(a.agreement.accepted_date) : ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partnership-agreements-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="back-btn"
              >
                <FiArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Partnership Agreements</h1>
                <p className="text-sm text-gray-500">Manage institution partnership agreements</p>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              data-testid="export-csv-btn"
            >
              <FiDownload size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" data-testid="total-institutions-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiUsers className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_institutions}</p>
                  <p className="text-xs text-gray-500">Total Institutions</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" data-testid="signed-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiCheckCircle className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{summary.signed}</p>
                  <p className="text-xs text-gray-500">Signed</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" data-testid="pending-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <FiClock className="text-amber-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" data-testid="signing-rate-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FiPercent className="text-indigo-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-600">{summary.signing_rate}%</p>
                  <p className="text-xs text-gray-500">Signing Rate</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by institution name, email, or signatory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                data-testid="search-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-400" size={18} />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                data-testid="status-filter"
              >
                <option value="all">All Status</option>
                <option value="signed">Signed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Agreements Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div 
                className="animate-spin rounded-full h-10 w-10 border-b-2"
                style={{ borderColor: theme.primaryColor }}
              ></div>
            </div>
          ) : filteredAgreements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FiFileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No agreements found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="agreements-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Institution</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Country</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Signatory</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Signed Date</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAgreements.map((agreement) => (
                    <tr 
                      key={agreement.institution_id} 
                      className="hover:bg-gray-50 transition-colors"
                      data-testid={`agreement-row-${agreement.institution_id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{agreement.institution_name}</div>
                        <div className="text-xs text-gray-500">{agreement.institution_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{agreement.contact_name || '-'}</div>
                        <div className="text-xs text-gray-500">{agreement.contact_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{agreement.country}</span>
                      </td>
                      <td className="px-4 py-3">
                        {agreement.status === 'signed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <FiCheckCircle size={12} />
                            Signed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            <FiClock size={12} />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {agreement.agreement ? (
                          <div>
                            <div className="text-sm text-gray-900">{agreement.agreement.signatory_name}</div>
                            <div className="text-xs text-gray-500">{agreement.agreement.signatory_title}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {agreement.agreement?.accepted_date ? formatDate(agreement.agreement.accepted_date) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => loadInstitutionDetails(agreement.institution_id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-indigo-600"
                          title="View Details"
                          data-testid={`view-details-btn-${agreement.institution_id}`}
                        >
                          <FiEye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedInstitution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" data-testid="details-modal">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Institution Details</h2>
              <button
                onClick={closeDetails}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="close-modal-btn"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
              {detailsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div 
                    className="animate-spin rounded-full h-10 w-10 border-b-2"
                    style={{ borderColor: theme.primaryColor }}
                  ></div>
                </div>
              ) : institutionDetails ? (
                <div className="space-y-6">
                  {/* Institution Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Institution Information</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <FiUsers className="text-gray-400" size={18} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{institutionDetails.institution.institution_name}</p>
                          <p className="text-xs text-gray-500">Institution Name</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <FiMail className="text-gray-400" size={18} />
                        <div>
                          <p className="text-sm text-gray-900">{institutionDetails.institution.email}</p>
                          <p className="text-xs text-gray-500">Email</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <FiGlobe className="text-gray-400" size={18} />
                        <div>
                          <p className="text-sm text-gray-900">{institutionDetails.institution.country}</p>
                          <p className="text-xs text-gray-500">Country</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <FiCalendar className="text-gray-400" size={18} />
                        <div>
                          <p className="text-sm text-gray-900">{formatDate(institutionDetails.institution.account_created)}</p>
                          <p className="text-xs text-gray-500">Account Created</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Partnership Agreement Status */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Partnership Agreement</h3>
                    <div className={`rounded-xl p-4 ${institutionDetails.partnership_agreement.status === 'signed' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        {institutionDetails.partnership_agreement.status === 'signed' ? (
                          <FiCheckCircle className="text-green-600" size={24} />
                        ) : (
                          <FiClock className="text-amber-600" size={24} />
                        )}
                        <span className={`font-semibold ${institutionDetails.partnership_agreement.status === 'signed' ? 'text-green-700' : 'text-amber-700'}`}>
                          {institutionDetails.partnership_agreement.status === 'signed' ? 'Agreement Signed' : 'Agreement Pending'}
                        </span>
                      </div>
                      {institutionDetails.partnership_agreement.details && (
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">Signatory:</span> <span className="font-medium">{institutionDetails.partnership_agreement.details.signatory_name}</span></p>
                          <p><span className="text-gray-500">Title:</span> {institutionDetails.partnership_agreement.details.signatory_title}</p>
                          <p><span className="text-gray-500">Email:</span> {institutionDetails.partnership_agreement.details.signatory_email}</p>
                          <p><span className="text-gray-500">Signed:</span> {formatDate(institutionDetails.partnership_agreement.details.accepted_date)}</p>
                          <p><span className="text-gray-500">Agreement ID:</span> <code className="bg-gray-200 px-1 rounded text-xs">{institutionDetails.partnership_agreement.details.agreement_id}</code></p>
                          <p><span className="text-gray-500">IP Address:</span> {institutionDetails.partnership_agreement.details.ip_address}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EULA Status */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">EULA Acceptance</h3>
                    <div className={`rounded-xl p-4 ${institutionDetails.eula_acceptance.status === 'accepted' ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <div className="flex items-center gap-2">
                        {institutionDetails.eula_acceptance.status === 'accepted' ? (
                          <>
                            <FiCheckCircle className="text-green-600" size={18} />
                            <span className="text-green-700 font-medium">EULA Accepted</span>
                            <span className="text-green-600 text-sm">• {formatDate(institutionDetails.eula_acceptance.accepted_date)}</span>
                          </>
                        ) : (
                          <>
                            <FiClock className="text-gray-500" size={18} />
                            <span className="text-gray-600">EULA Not Accepted</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Activity Stats */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Activity Statistics</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-indigo-50 rounded-xl p-4 text-center">
                        <FiAward className="mx-auto text-indigo-600 mb-2" size={24} />
                        <p className="text-2xl font-bold text-indigo-600">{institutionDetails.activity_stats.credentials_issued}</p>
                        <p className="text-xs text-indigo-600">Credentials Issued</p>
                      </div>
                      <div className="bg-pink-50 rounded-xl p-4 text-center">
                        <FiFileText className="mx-auto text-pink-600 mb-2" size={24} />
                        <p className="text-2xl font-bold text-pink-600">{institutionDetails.activity_stats.fundraisers_created}</p>
                        <p className="text-xs text-pink-600">Fundraisers</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 text-center">
                        <FiDollarSign className="mx-auto text-emerald-600 mb-2" size={24} />
                        <p className="text-2xl font-bold text-emerald-600">${institutionDetails.activity_stats.total_funds_raised.toLocaleString()}</p>
                        <p className="text-xs text-emerald-600">Funds Raised</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Failed to load details
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnershipAgreements;
