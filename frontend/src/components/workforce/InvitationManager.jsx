import React, { useState, useEffect } from 'react';
import { FiPlus, FiUpload, FiMail, FiPhone, FiUser, FiX, FiCheck, FiClock, FiXCircle, FiRefreshCw, FiDownload } from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const InvitationManager = () => {
  const theme = useTheme();
  const [activeView, setActiveView] = useState('roles'); // roles, invite, invitations
  const [roleViewMode, setRoleViewMode] = useState('cards'); // cards or list
  const [roles, setRoles] = useState([]);
  const [occupationTemplates, setOccupationTemplates] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [filterWorkplace, setFilterWorkplace] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all, open, filled
  const [workplaces, setWorkplaces] = useState([]);
  
  // Role creation state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState({
    role_name: '',
    occupation_template: '',
    required_skills: [],
    additional_certifications: [],
    hourly_rate: '',
    description: '',
    positions_available: 1
  });
  
  // Manual invitation state
  const [manualInvites, setManualInvites] = useState([{
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role_id: ''
  }]);
  
  // CSV upload state
  const [csvFile, setCsvFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeView]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeView === 'roles') {
        const [rolesRes, templatesRes, statsRes] = await Promise.all([
          api.get('/api/employer/workplace-roles/list'),
          api.get('/api/employer/workplace-roles/templates/occupations'),
          api.get('/api/employer/dashboard/stats')
        ]);
        setRoles(rolesRes.data.data.roles || []);
        setOccupationTemplates(templatesRes.data.data.templates || []);
        setWorkplaces(statsRes.data.data.workplaces || []);
      } else if (activeView === 'invitations') {
        const invitesRes = await api.get('/api/employer/invitations/list');
        setInvitations(invitesRes.data.data.invitations || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      await api.post('/api/employer/workplace-roles/create', newRole);
      setShowRoleModal(false);
      setNewRole({
        role_name: '',
        occupation_template: '',
        required_skills: [],
        additional_certifications: [],
        hourly_rate: '',
        description: '',
        positions_available: 1
      });
      loadData();
      alert('Role created successfully!');
    } catch (error) {
      alert('Failed to create role: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSendManualInvites = async () => {
    try {
      const validInvites = manualInvites.filter(inv => 
        inv.first_name && inv.last_name && inv.email && inv.phone && inv.role_id
      );
      
      if (validInvites.length === 0) {
        alert('Please fill in all required fields for at least one invitation');
        return;
      }
      
      const response = await api.post('/api/employer/invitations/send-manual', {
        invites: validInvites
      });
      
      const result = response.data.data;
      alert(`Successfully sent ${result.total_sent} invitation(s)!\n${result.total_failed > 0 ? `Failed: ${result.total_failed}` : ''}`);
      
      setManualInvites([{
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role_id: ''
      }]);
      
      setActiveView('invitations');
    } catch (error) {
      alert('Failed to send invitations: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCSVUpload = async () => {
    if (!csvFile) {
      alert('Please select a CSV file');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      
      const response = await api.post('/api/employer/invitations/send-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setUploadResult(response.data.data);
      setCsvFile(null);
      alert(`CSV processed! Sent ${response.data.data.total_sent} invitation(s)`);
    } catch (error) {
      alert('Failed to upload CSV: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleResendInvite = async (inviteId) => {
    try {
      await api.post(`/api/employer/invitations/${inviteId}/resend`);
      await loadData();
      alert('Invitation resent successfully!');
    } catch (error) {
      alert('Failed to resend: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCancelInvite = async (inviteId) => {
    if (!window.confirm('Are you sure you want to cancel this invitation?')) return;
    
    try {
      await api.delete(`/api/employer/invitations/${inviteId}/cancel`);
      await loadData();
      alert('Invitation cancelled successfully!');
    } catch (error) {
      alert('Failed to cancel: ' + (error.response?.data?.detail || error.message));
    }
  };

  const downloadCSVTemplate = () => {
    const template = 'first_name,last_name,email,phone,role_name\nJohn,Doe,john@example.com,+1234567890,Chef\nJane,Smith,jane@example.com,+0987654321,Server';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'invitation_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };


  // RoleCard component with candidate badges
  const RoleCard = ({ role, theme, onViewCandidates }) => {
    const [candidateCounts, setCandidateCounts] = useState({ internal: 0, external: 0 });
    
    useEffect(() => {
      // Fetch candidate counts for this role
      const fetchCandidateCounts = async () => {
        try {
          const countsResponse = await api.get(`/api/employer/workplace-roles/${role.role_id}/candidate-count`);
          setCandidateCounts(countsResponse.data.data);
        } catch (error) {
          console.error('Failed to fetch candidate counts:', error);
        }
      };
      
      if (role.status !== 'filled') {
        fetchCandidateCounts();
      }
    }, [role.role_id, role.status]);
    
    return (
      <div 
        className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer hover:border-blue-300"
        onClick={() => onViewCandidates(role.role_id)}
      >
        {/* Header with Job Title and Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="text-lg font-bold text-gray-900 mb-1">{role.role_name}</h4>
            <p className="text-sm text-gray-600">{role.occupation_template}</p>
          </div>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full ${
              role.display_status === 'filled' || (role.positions_filled >= role.positions_needed) ? 'bg-green-100 text-green-800' :
              role.status === 'posted_to_match' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}
          >
            {(role.display_status === 'filled' || role.positions_filled >= role.positions_needed) ? '✓ Filled' : role.status === 'posted_to_match' ? '📢 Posted' : '⏳ Open'}
          </span>
        </div>
        
        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Branch/Workplace */}
          <div className="flex items-start gap-2">
            <span className="text-gray-400 text-sm">📍</span>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Branch</p>
              <p className="text-sm font-medium text-gray-900">
                {role.workplace_name || role.default_workplace ? role.workplace_name : 'No workplace assigned'}
              </p>
            </div>
          </div>
          
          {/* Pay Rate */}
          {role.pay_rate && (
            <div className="flex items-start gap-2">
              <span className="text-gray-400 text-sm">💰</span>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Pay Rate</p>
                <p className="text-sm font-bold text-gray-900">${role.pay_rate}/hr</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Shift Schedule */}
        {role.shift_start_time && role.shift_end_time && (
          <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <span className="text-blue-600 text-sm">🕐</span>
            <div className="flex-1">
              <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Shift Schedule</p>
              <p className="text-sm font-semibold text-blue-900">
                {role.shift_start_time} - {role.shift_end_time}
              </p>
              {role.days_of_week && role.days_of_week.length > 0 && (
                <p className="text-xs text-blue-700 mt-1">
                  {role.days_of_week.length === 7 ? 'Every day' : role.days_of_week.slice(0, 3).map(d => d.substring(0, 3)).join(', ') + (role.days_of_week.length > 3 ? '...' : '')}
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Positions Status */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
          <span className="text-gray-400 text-sm">👥</span>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Positions</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${((role.positions_filled || 0) / (role.positions_needed || 1)) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {role.positions_filled || 0}/{role.positions_needed || 0}
              </span>
            </div>
          </div>
        </div>
        
        {/* Candidate Badges */}
        {role.status !== 'filled' && (candidateCounts.internal > 0 || candidateCounts.external > 0) && (
          <div className="flex gap-2">
            {candidateCounts.internal > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-medium">
                <span className="text-green-700">👥 {candidateCounts.internal}</span>
                <span className="text-green-600">Internal</span>
              </div>
            )}
            {candidateCounts.external > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium">
                <span className="text-blue-700">🌐 {candidateCounts.external}</span>
                <span className="text-blue-600">External</span>
              </div>
            )}
          </div>
        )}
        
        {role.filled_by_worker_name && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">Filled by</p>
            <p className="text-sm font-medium text-gray-900">{role.filled_by_worker_name}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveView('roles')}
          className={`px-4 py-3 font-medium transition-all ${
            activeView === 'roles'
              ? 'border-b-2 text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          style={{ borderColor: activeView === 'roles' ? theme.primaryColor : 'transparent' }}
        >
          Roles ({roles.length})
        </button>
        <button
          onClick={() => setActiveView('invite')}
          className={`px-4 py-3 font-medium transition-all ${
            activeView === 'invite'
              ? 'border-b-2 text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          style={{ borderColor: activeView === 'invite' ? theme.primaryColor : 'transparent' }}
        >
          Send Invitations
        </button>
        <button
          onClick={() => setActiveView('invitations')}
          className={`px-4 py-3 font-medium transition-all ${
            activeView === 'invitations'
              ? 'border-b-2 text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          style={{ borderColor: activeView === 'invitations' ? theme.primaryColor : 'transparent' }}
        >
          Invitations ({invitations.length})
        </button>
      </div>

      {/* Roles View */}
      {activeView === 'roles' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Workplace Roles</h3>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setRoleViewMode('cards')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    roleViewMode === 'cards'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📇 Cards
                </button>
                <button
                  onClick={() => setRoleViewMode('list')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    roleViewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📋 List
                </button>
              </div>
              
              <button
                onClick={() => setShowRoleModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <FiPlus /> Create Role
              </button>
            </div>
          </div>
          
          {/* Filters */}
          {roles.length > 0 && (
            <div className="flex gap-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {/* Workplace Filter */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Branch</label>
                <select
                  value={filterWorkplace}
                  onChange={(e) => setFilterWorkplace(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Workplaces</option>
                  {workplaces.map(wp => (
                    <option key={wp.workplace_id} value={wp.workplace_id}>
                      {wp.workplace_name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Status Filter */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="open">Open Positions</option>
                  <option value="filled">Fully Staffed</option>
                </select>
              </div>
              
              {/* Results Count */}
              <div className="flex items-end">
                <div className="px-4 py-2 bg-white rounded-lg border border-gray-300">
                  <p className="text-xs text-gray-500">Showing</p>
                  <p className="text-lg font-bold text-gray-900">
                    {roles.filter(r => {
                      const wpMatch = filterWorkplace === 'all' || r.workplace_id === filterWorkplace;
                      const isFilled = (r.display_status === 'filled') || (r.positions_filled >= r.positions_needed);
                      const statusMatch = filterStatus === 'all' || 
                        (filterStatus === 'filled' && isFilled) ||
                        (filterStatus === 'open' && !isFilled);
                      return wpMatch && statusMatch;
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : roles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FiUser className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No roles created yet</p>
              <button
                onClick={() => setShowRoleModal(true)}
                className="px-6 py-3 rounded-lg text-white font-medium"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Create Your First Role
              </button>
            </div>
          ) : roleViewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles
                .filter(r => {
                  const wpMatch = filterWorkplace === 'all' || r.workplace_id === filterWorkplace;
                  const isFilled = (r.display_status === 'filled') || (r.positions_filled >= r.positions_needed);
                  const statusMatch = filterStatus === 'all' || 
                    (filterStatus === 'filled' && isFilled) ||
                    (filterStatus === 'open' && !isFilled);
                  return wpMatch && statusMatch;
                })
                .map(role => (
                  <RoleCard 
                    key={role.role_id} 
                    role={role} 
                    theme={theme}
                    onViewCandidates={(roleId) => window.location.href = `/employer/roles/${roleId}/candidates`}
                  />
                ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workplace</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shifts This Week</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidates</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles
                    .filter(r => {
                      const wpMatch = filterWorkplace === 'all' || r.workplace_id === filterWorkplace;
                      const isFilled = (r.display_status === 'filled') || (r.positions_filled >= r.positions_needed);
                      const statusMatch = filterStatus === 'all' || 
                        (filterStatus === 'filled' && isFilled) ||
                        (filterStatus === 'open' && !isFilled);
                      return wpMatch && statusMatch;
                    })
                    .map((role) => (
                    <tr 
                      key={role.role_id}
                      onClick={() => window.location.href = `/employer/roles/${role.role_id}/candidates`}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{role.role_name}</div>
                          <div className="text-xs text-gray-500">{role.occupation_template}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {role.workplace_name || 'Loading...'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">${role.hourly_rate}/hr</div>
                        {role.fee_breakdown && (
                          <div className="text-xs text-gray-500">Emp: ${role.fee_breakdown.employer_pays}/hr</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {role.shifts_this_week || 0} shifts
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          role.status === 'filled' ? 'bg-green-100 text-green-800' :
                          role.status === 'posted_to_match' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {role.positions_filled || 0}/{role.positions_needed} Filled
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          {role.internal_candidates > 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                              👥 {role.internal_candidates}
                            </span>
                          )}
                          {role.external_candidates > 0 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              🌐 {role.external_candidates}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invite View */}
      {activeView === 'invite' && (
        <div className="space-y-6">
          {/* Manual Invitations */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiMail /> Manual Invitations
            </h3>
            
            <div className="space-y-4">
              {manualInvites.map((invite, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={invite.first_name}
                    onChange={(e) => {
                      const updated = [...manualInvites];
                      updated[idx].first_name = e.target.value;
                      setManualInvites(updated);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={invite.last_name}
                    onChange={(e) => {
                      const updated = [...manualInvites];
                      updated[idx].last_name = e.target.value;
                      setManualInvites(updated);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={invite.email}
                    onChange={(e) => {
                      const updated = [...manualInvites];
                      updated[idx].email = e.target.value;
                      setManualInvites(updated);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={invite.phone}
                    onChange={(e) => {
                      const updated = [...manualInvites];
                      updated[idx].phone = e.target.value;
                      setManualInvites(updated);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={invite.role_id}
                    onChange={(e) => {
                      const updated = [...manualInvites];
                      updated[idx].role_id = e.target.value;
                      setManualInvites(updated);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Role</option>
                    {roles.filter(r => r.status === 'unfilled').map(role => (
                      <option key={role.role_id} value={role.role_id}>
                        {role.role_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const updated = manualInvites.filter((_, i) => i !== idx);
                      setManualInvites(updated.length ? updated : [{ first_name: '', last_name: '', email: '', phone: '', role_id: '' }]);
                    }}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setManualInvites([...manualInvites, { first_name: '', last_name: '', email: '', phone: '', role_id: '' }])}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg text-gray-600 hover:border-gray-400"
                style={{ borderColor: theme.primaryColor + '40' }}
              >
                <FiPlus /> Add Another
              </button>
              
              <button
                onClick={handleSendManualInvites}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <FiMail /> Send Invitations
              </button>
            </div>
          </div>

          {/* CSV Bulk Upload */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiUpload /> CSV Bulk Upload
            </h3>
            
            <div className="mb-4">
              <button
                onClick={downloadCSVTemplate}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <FiDownload /> Download CSV Template
              </button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">
                  {csvFile ? csvFile.name : 'Click to upload CSV file'}
                </p>
                <p className="text-xs text-gray-500">
                  CSV format: first_name, last_name, email, phone, role_name
                </p>
              </label>
            </div>
            
            {csvFile && (
              <button
                onClick={handleCSVUpload}
                className="mt-4 w-full px-6 py-3 rounded-lg text-white font-medium"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Upload & Send Invitations
              </button>
            )}
            
            {uploadResult && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-900">Upload Results:</p>
                <p className="text-sm text-blue-800">✅ Sent: {uploadResult.total_sent}</p>
                <p className="text-sm text-blue-800">❌ Failed: {uploadResult.total_failed}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invitations List View */}
      {activeView === 'invitations' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sent Invitations</h3>
          
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FiMail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No invitations sent yet</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invitations.map(invite => (
                    <tr key={invite.invite_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{invite.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{invite.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{invite.role_name || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                          invite.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          invite.status === 'expired' ? 'bg-red-100 text-red-800' :
                          invite.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invite.status === 'accepted' && <FiCheck />}
                          {invite.status === 'expired' && <FiXCircle />}
                          {invite.status === 'sent' && <FiClock />}
                          {invite.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {invite.status === 'sent' && (
                            <>
                              <button
                                onClick={() => handleResendInvite(invite.invite_id)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Resend"
                              >
                                <FiRefreshCw size={16} />
                              </button>
                              <button
                                onClick={() => handleCancelInvite(invite.invite_id)}
                                className="text-red-600 hover:text-red-800"
                                title="Cancel"
                              >
                                <FiX size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Create Workplace Role</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Platform Fee Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Platform Fee Structure</h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <p>• <strong>Minimum wage positions:</strong> Employer pays $1/hour platform fee</p>
                  <p>• <strong>Above minimum wage:</strong> Both worker and employer pay $1/hour platform fee</p>
                  <p className="text-blue-600 mt-2">Workers receive gross pay. Payroll deductions handled by processors (ADP/Rippling).</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
                <input
                  type="text"
                  value={newRole.role_name}
                  onChange={(e) => setNewRole({...newRole, role_name: e.target.value})}
                  placeholder="e.g., Head Chef, Night Security Guard"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occupation Template *</label>
                <select
                  value={newRole.occupation_template}
                  onChange={(e) => {
                    const selectedTemplate = occupationTemplates.find(t => t.title === e.target.value);
                    setNewRole({
                      ...newRole, 
                      occupation_template: e.target.value,
                      hourly_rate: selectedTemplate?.minimum_hourly_rate || ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select occupation</option>
                  {occupationTemplates.map(template => (
                    <option key={template.title} value={template.title}>
                      {template.icon} {template.title} - Min: ${template.minimum_hourly_rate}/hr
                    </option>
                  ))}
                </select>
                {newRole.occupation_template && (
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum rate: ${occupationTemplates.find(t => t.title === newRole.occupation_template)?.minimum_hourly_rate}/hour
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newRole.hourly_rate}
                  onChange={(e) => setNewRole({...newRole, hourly_rate: e.target.value})}
                  placeholder="Enter hourly rate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min={occupationTemplates.find(t => t.title === newRole.occupation_template)?.minimum_hourly_rate || 0}
                />
                {newRole.hourly_rate && newRole.occupation_template && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                    <p className="font-semibold text-blue-900 mb-1">💰 Fee Breakdown:</p>
                    {parseFloat(newRole.hourly_rate) <= (occupationTemplates.find(t => t.title === newRole.occupation_template)?.minimum_hourly_rate || 0) ? (
                      <>
                        <p className="text-blue-800">• Worker receives: <strong>${newRole.hourly_rate}/hr</strong> (gross)</p>
                        <p className="text-blue-800">• Employer pays: <strong>${(parseFloat(newRole.hourly_rate) + 1).toFixed(2)}/hr</strong> (includes $1 platform fee)</p>
                        <p className="text-green-700 mt-1">✓ Minimum wage - No fee for worker</p>
                      </>
                    ) : (
                      <>
                        <p className="text-blue-800">• Worker gross: <strong>${newRole.hourly_rate}/hr</strong></p>
                        <p className="text-blue-800">• Worker net: <strong>${(parseFloat(newRole.hourly_rate) - 1).toFixed(2)}/hr</strong> (after $1 platform fee)</p>
                        <p className="text-blue-800">• Employer pays: <strong>${(parseFloat(newRole.hourly_rate) + 1).toFixed(2)}/hr</strong> (includes $1 platform fee)</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Positions Available</label>
                <input
                  type="number"
                  value={newRole.positions_available}
                  onChange={(e) => setNewRole({...newRole, positions_available: parseInt(e.target.value)})}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                  placeholder="Role responsibilities and requirements..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                className="px-6 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationManager;
