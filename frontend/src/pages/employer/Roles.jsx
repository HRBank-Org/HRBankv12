import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import api from '../../utils/api';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiMapPin, FiDollarSign, FiAward, FiFilter, FiSearch, FiChevronRight } from 'react-icons/fi';

const Roles = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [roles, setRoles] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkplace, setSelectedWorkplace] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, [selectedWorkplace]);

  const loadData = async () => {
    try {
      const [rolesRes, workplacesRes] = await Promise.all([
        api.get(`/api/employer/workplace-roles/list${selectedWorkplace !== 'all' ? `?workplace_id=${selectedWorkplace}` : ''}`),
        api.get('/api/employer/workplaces')
      ]);

      setRoles(rolesRes.data.data.roles || []);
      setWorkplaces(workplacesRes.data.data.workplaces || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await api.delete(`/api/employer/workplace-roles/${roleId}`);
      await loadData();
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role. It may have active assignments.');
    }
  };

  const getStatusBadge = (role) => {
    const filled = role.positions_filled || 0;
    const needed = role.positions_available || 1;
    
    if (filled >= needed) {
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Filled</span>;
    } else if (filled > 0) {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">Partial ({filled}/{needed})</span>;
    } else {
      return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Unfilled</span>;
    }
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.role_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         role.occupation_template?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'filled' && role.positions_filled >= role.positions_available) ||
                         (filterStatus === 'unfilled' && role.positions_filled === 0) ||
                         (filterStatus === 'partial' && role.positions_filled > 0 && role.positions_filled < role.positions_available);
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalRoles: roles.length,
    filledRoles: roles.filter(r => r.positions_filled >= r.positions_available).length,
    unfilledRoles: roles.filter(r => r.positions_filled === 0).length,
    totalPositions: roles.reduce((sum, r) => sum + (r.positions_available || 1), 0),
    // Cap filled positions at available to handle data inconsistencies
    filledPositions: roles.reduce((sum, r) => {
      const filled = r.positions_filled || 0;
      const available = r.positions_available || 1;
      return sum + Math.min(filled, available);
    }, 0),
    // Track overfilled positions (data issue warning)
    overfilledRoles: roles.filter(r => (r.positions_filled || 0) > (r.positions_available || 1)).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GenericHeader />
        <ModernSidebar />
        <div className="ml-[70px] pt-[64px] flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <ModernSidebar />
      
      <div className="ml-[70px] pt-[64px]">
        {/* Page Header */}
        <div className="px-8 py-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Roles Management</h1>
              <p className="text-gray-600 mt-1">Manage workplace positions and requirements</p>
            </div>
            <button
              onClick={() => navigate('/employer/roles/create')}
              className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <FiPlus size={20} />
              Create Role
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Roles</p>
                  <h3 className="text-3xl font-bold text-gray-900">{stats.totalRoles}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FiUsers size={24} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Filled Roles</p>
                  <h3 className="text-3xl font-bold text-green-600">{stats.filledRoles}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FiUsers size={24} className="text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Unfilled Roles</p>
                  <h3 className="text-3xl font-bold text-red-600">{stats.unfilledRoles}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <FiUsers size={24} className="text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Positions</p>
                  <h3 className="text-3xl font-bold" style={{ color: theme.primaryColor }}>
                    {stats.filledPositions}/{stats.totalPositions}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${theme.primaryColor}20` }}>
                  <FiAward size={24} style={{ color: theme.primaryColor }} />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>

              {/* Workplace Filter */}
              <div className="relative">
                <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={selectedWorkplace}
                  onChange={(e) => setSelectedWorkplace(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none appearance-none"
                >
                  <option value="all">All Workplaces</option>
                  {workplaces.map(wp => (
                    <option key={wp.workplace_id} value={wp.workplace_id}>{wp.workplace_name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="filled">Filled</option>
                  <option value="partial">Partially Filled</option>
                  <option value="unfilled">Unfilled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Roles List */}
          {filteredRoles.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FiUsers size={64} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Roles Found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Create your first role to start building your team'}
              </p>
              <button
                onClick={() => navigate('/employer/roles/create')}
                className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <FiPlus className="inline mr-2" />
                Create First Role
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRoles.map((role) => (
                <div key={role.role_id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{role.role_name}</h3>
                        {getStatusBadge(role)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <FiMapPin size={16} />
                          <span className="text-sm">{role.workplace_name || 'General Role'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <FiUsers size={16} />
                          <span className="text-sm">{role.occupation_template}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <FiDollarSign size={16} />
                          <span className="text-sm font-medium">
                            ${role.hourly_rate ? role.hourly_rate.toFixed(2) : 'TBD'}/hr
                          </span>
                        </div>
                      </div>

                      {role.required_certifications && role.required_certifications.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <FiAward size={14} className="text-gray-500" />
                          <div className="flex flex-wrap gap-2">
                            {role.required_certifications.slice(0, 3).map((cert, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                {cert}
                              </span>
                            ))}
                            {role.required_certifications.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                +{role.required_certifications.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/employer/roles/${role.role_id}/edit`)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit Role"
                      >
                        <FiEdit2 size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.role_id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Role"
                      >
                        <FiTrash2 size={20} />
                      </button>
                      <button
                        onClick={() => navigate(`/employer/roles/${role.role_id}/detail`)}
                        className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        View Details
                        <FiChevronRight size={16} />
                      </button>
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

export default Roles;
