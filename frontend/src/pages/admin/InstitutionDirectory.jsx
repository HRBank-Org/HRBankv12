import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
  Building2, Users, Mail, Phone, Globe, MapPin,
  Search, Filter, ChevronDown, ExternalLink, TrendingUp,
  CheckCircle, Clock, AlertCircle, Download, RefreshCw
} from 'lucide-react';

const InstitutionDirectory = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    province: '',
    type: '',
    sortBy: 'requests' // requests, name, province
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 50 });
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [requestDetails, setRequestDetails] = useState([]);

  useEffect(() => {
    loadStats();
    loadInstitutions();
  }, [filters, pagination.page]);

  const loadStats = async () => {
    try {
      const res = await api.get('/api/institution-directory/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadInstitutions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.province) params.append('province', filters.province);
      if (filters.type) params.append('institution_type', filters.type);
      if (filters.search) params.append('search', filters.search);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      params.append('include_partners', 'true');

      const res = await api.get(`/api/institution-directory/all?${params}`);
      if (res.data.success) {
        let sorted = [...res.data.data.institutions];
        
        // Sort by invite requests (non-partners first, by request count)
        if (filters.sortBy === 'requests') {
          sorted.sort((a, b) => {
            if (a.is_partner === b.is_partner) {
              return (b.invite_requests || 0) - (a.invite_requests || 0);
            }
            return a.is_partner ? 1 : -1;
          });
        } else if (filters.sortBy === 'name') {
          sorted.sort((a, b) => a.institution_name.localeCompare(b.institution_name));
        }
        
        setInstitutions(sorted);
      }
    } catch (error) {
      console.error('Failed to load institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequestDetails = async (institutionId) => {
    try {
      const res = await api.get(`/api/institution-directory/invite-requests/${institutionId}`);
      if (res.data.success) {
        setRequestDetails(res.data.data.requests);
      }
    } catch (error) {
      console.error('Failed to load request details:', error);
    }
  };

  const exportToCSV = () => {
    // Export institutions with high demand for outreach
    const highDemand = institutions.filter(i => !i.is_partner && (i.invite_requests || 0) > 0);
    
    const csv = [
      ['Institution Name', 'Province', 'City', 'Phone', 'Website', 'Request Count'].join(','),
      ...highDemand.map(i => [
        `"${i.institution_name}"`,
        i.province,
        i.city || '',
        i.phone || '',
        i.website || '',
        i.invite_requests || 0
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `institution-outreach-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const provinces = [
    { code: 'ON', name: 'Ontario' },
    { code: 'QC', name: 'Quebec' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'AB', name: 'Alberta' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland' },
    { code: 'PE', name: 'Prince Edward Island' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Institution Directory</h1>
          <p className="text-gray-600">Manage and track institution partnerships</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadInstitutions}
            className="px-4 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Outreach List
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_in_directory?.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Institutions</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_partners}</p>
                <p className="text-sm text-gray-500">Active Partners</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_invite_requests}</p>
                <p className="text-sm text-gray-500">Join Requests</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.coverage_rate}%</p>
                <p className="text-sm text-gray-500">Coverage Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Most Requested Section */}
      {stats?.most_requested?.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Most Requested Institutions (Priority Outreach)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.most_requested.map((inst, idx) => (
              <div 
                key={inst.institution_id}
                className="bg-white rounded-lg p-4 border border-purple-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{inst.institution_name}</p>
                    <p className="text-xs text-gray-500">{inst.province}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">{inst.request_count}</p>
                  <p className="text-xs text-gray-500">requests</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search institutions..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={filters.province}
            onChange={(e) => setFilters({ ...filters, province: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Provinces</option>
            {provinces.map(p => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Types</option>
            <option value="university">University</option>
            <option value="college">College</option>
            <option value="training_provider">Training Provider</option>
            <option value="high_school">High School</option>
          </select>
          
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="requests">Sort by Requests</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Institution List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institution</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading institutions...
                  </td>
                </tr>
              ) : institutions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No institutions found matching your criteria.
                  </td>
                </tr>
              ) : (
                institutions.map((inst) => (
                  <tr 
                    key={inst.institution_id} 
                    className={`hover:bg-gray-50 ${!inst.is_partner && (inst.invite_requests || 0) > 0 ? 'bg-purple-50/50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          inst.is_partner ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {inst.logo_url ? (
                            <img src={inst.logo_url} alt="" className="w-8 h-8 rounded" />
                          ) : (
                            <Building2 className={`w-5 h-5 ${inst.is_partner ? 'text-green-600' : 'text-gray-400'}`} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{inst.institution_name}</p>
                          {inst.website && (
                            <a 
                              href={inst.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Globe className="w-3 h-3" />
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {inst.city ? `${inst.city}, ` : ''}{inst.province}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded capitalize">
                        {inst.institution_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {inst.phone && (
                          <a href={`tel:${inst.phone}`} className="text-sm text-gray-600 flex items-center gap-1 hover:text-blue-600">
                            <Phone className="w-3 h-3" />
                            {inst.phone}
                          </a>
                        )}
                        {inst.email && (
                          <a href={`mailto:${inst.email}`} className="text-sm text-gray-600 flex items-center gap-1 hover:text-blue-600">
                            <Mail className="w-3 h-3" />
                            {inst.email}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {inst.is_partner ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Partner
                        </span>
                      ) : (inst.invite_requests || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          <Clock className="w-3 h-3" />
                          Requested
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          Not Contacted
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inst.is_partner ? (
                        <span className="text-sm text-green-600 font-medium">
                          {inst.credentials_issued || 0} credentials
                        </span>
                      ) : (
                        <span className={`text-lg font-bold ${
                          (inst.invite_requests || 0) > 5 ? 'text-purple-600' :
                          (inst.invite_requests || 0) > 0 ? 'text-purple-400' : 'text-gray-300'
                        }`}>
                          {inst.invite_requests || 0}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {institutions.length} institutions
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
              disabled={pagination.page === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">Page {pagination.page}</span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={institutions.length < pagination.limit}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionDirectory;
