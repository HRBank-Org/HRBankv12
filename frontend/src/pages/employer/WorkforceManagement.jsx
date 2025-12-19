import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import WorkerInviteModal from '../../components/employer/WorkerInviteModal';
import { FiUserPlus, FiMail, FiClock, FiCheck, FiX, FiRefreshCw, FiTrendingUp, FiActivity } from 'react-icons/fi';

const WorkforceManagement = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [workers, setWorkers] = useState([]);
  const [workerKpis, setWorkerKpis] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showRehireModal, setShowRehireModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedWorkplace, setSelectedWorkplace] = useState(null);
  const [roles, setRoles] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'invitations') {
        // Load invitations
        const invRes = await api.get('/api/employer/invitations/list');
        setInvitations(invRes.data.data.invitations || []);
      } else if (activeTab === 'active') {
        // Load worker KPIs for active tab
        const kpisRes = await api.get('/api/employer/workforce-management/worker-kpis');
        setWorkerKpis(kpisRes.data.data.workers || []);
        setWorkers([]);
      } else {
        // Load inactive workers
        const response = await api.get('/api/employer/workforce-management/inactive');
        setWorkers(response.data.data.inactive_workers || []);
        setWorkerKpis([]);
      }
      
      // Load roles and workplaces for invite modal
      const [rolesRes, workplacesRes] = await Promise.all([
        api.get('/api/employer/workplace-roles/list'),
        api.get('/api/employer/workplaces')
      ]);
      setRoles(rolesRes.data.data.roles || []);
      setWorkplaces(workplacesRes.data.data.workplaces || []);
      
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendInvite = async (inviteId) => {
    try {
      await api.post(`/api/employer/invitations/${inviteId}/resend`);
      alert('Invitation resent successfully!');
      loadData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to resend invitation');
    }
  };
  
  const [cancellingInvite, setCancellingInvite] = useState(null);
  
  const handleCancelInvite = async (inviteId, inviteName) => {
    console.log('Cancel clicked for:', inviteId, inviteName);
    setCancellingInvite(inviteId);
    try {
      await api.delete(`/api/employer/invitations/${inviteId}/cancel`);
      console.log('Cancel successful');
      loadData();
    } catch (error) {
      console.error('Cancel failed:', error);
      alert(error.response?.data?.detail || 'Failed to cancel invitation');
    } finally {
      setCancellingInvite(null);
    }
  };
  
  const openInviteModal = (role = null, workplace = null) => {
    setSelectedRole(role);
    setSelectedWorkplace(workplace);
    setShowInviteModal(true);
  };

  const handleTerminate = (worker) => {
    setSelectedWorker(worker);
    setShowTerminateModal(true);
  };

  const handleRehire = (worker) => {
    setSelectedWorker(worker);
    setShowRehireModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <ModernSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Page Title */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">Manage your workforce and view worker details</p>
        </div>

        <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'active'
                  ? 'border-b-2 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ borderColor: activeTab === 'active' ? theme.primaryColor : 'transparent' }}
            >
              Active Workers
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'invitations'
                  ? 'border-b-2 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ borderColor: activeTab === 'invitations' ? theme.primaryColor : 'transparent' }}
            >
              <FiMail className="inline mr-2" />
              Invitations
            </button>
            <button
              onClick={() => setActiveTab('inactive')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'inactive'
                  ? 'border-b-2 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ borderColor: activeTab === 'inactive' ? theme.primaryColor : 'transparent' }}
            >
              Past Workers
            </button>
          </div>
          
          {/* Invite Button */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-5 py-2.5 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <FiUserPlus size={18} />
            Invite Workers
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
          </div>
        ) : activeTab === 'invitations' ? (
          /* Invitations Tab */
          invitations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FiMail size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Invitations Sent</h3>
              <p className="text-gray-500 mb-4">Start building your team by inviting workers</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <FiUserPlus className="inline mr-2" />
                Invite Your First Worker
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invite) => (
                    <tr key={invite.invite_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                            {invite.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{invite.full_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{invite.email}</p>
                        {invite.phone && <p className="text-xs text-gray-500">{invite.phone}</p>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{invite.role_name}</p>
                        <p className="text-xs text-gray-500">{invite.occupation_template}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          invite.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                          invite.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          invite.status === 'expired' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invite.status === 'sent' && <FiClock className="inline mr-1" size={12} />}
                          {invite.status === 'accepted' && <FiCheck className="inline mr-1" size={12} />}
                          {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invite.created_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {invite.status === 'sent' && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleResendInvite(invite.invite_id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Resend Invitation"
                            >
                              <FiRefreshCw size={16} />
                            </button>
                            <button
                              onClick={() => handleCancelInvite(invite.invite_id, invite.full_name)}
                              disabled={cancellingInvite === invite.invite_id}
                              className={`p-2 text-red-600 hover:bg-red-50 rounded-lg ${cancellingInvite === invite.invite_id ? 'opacity-50' : ''}`}
                              title="Cancel Invitation"
                            >
                              {cancellingInvite === invite.invite_id ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FiX size={16} />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'active' ? (
          /* Active Workers with KPIs */
          workerKpis.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FiActivity size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Workers</h3>
              <p className="text-gray-500 mb-4">Start building your team by inviting workers</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <FiUserPlus className="inline mr-2" />
                Invite Your First Worker
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {workerKpis.map((worker) => (
                <div key={worker.user_id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Worker Header */}
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center relative">
                          {worker.profile_picture ? (
                            <img src={worker.profile_picture} alt={worker.full_name} className="w-14 h-14 rounded-full object-cover" />
                          ) : (
                            <span className="text-xl font-bold text-gray-600">
                              {worker.full_name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                          {/* Status indicator */}
                          {worker.today_status?.is_clocked_in && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" title="Clocked In" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{worker.full_name}</h3>
                          <p className="text-sm text-gray-500">{worker.position_title || worker.employment_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {worker.today_status?.is_scheduled ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            worker.today_status.is_clocked_in 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {worker.today_status.is_clocked_in ? '🟢 On Duty' : '📅 Scheduled'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            Off Today
                          </span>
                        )}
                        {worker.average_rating && (
                          <div className="mt-1 text-sm text-gray-600">⭐ {worker.average_rating.toFixed(1)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* This Week KPIs */}
                  <div className="p-5 bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                      <FiTrendingUp className="text-blue-500" size={16} />
                      <span className="text-sm font-medium text-gray-700">This Week</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-blue-600">{worker.week_kpis?.total_hours || 0}</div>
                        <div className="text-xs text-gray-500">Hours</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-green-600">{worker.week_kpis?.shifts_completed || 0}</div>
                        <div className="text-xs text-gray-500">Shifts</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-orange-600">{worker.week_kpis?.tasks_completed || 0}</div>
                        <div className="text-xs text-gray-500">Tasks</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-purple-600">{worker.week_kpis?.attendance_rate || 100}%</div>
                        <div className="text-xs text-gray-500">Attendance</div>
                      </div>
                    </div>
                    
                    {/* Hours breakdown */}
                    {(worker.week_kpis?.shift_hours > 0 || worker.week_kpis?.task_hours > 0) && (
                      <div className="mt-3 flex gap-2 text-xs text-gray-500">
                        <span className="px-2 py-1 bg-blue-50 rounded">{worker.week_kpis?.shift_hours || 0}h shifts</span>
                        <span className="px-2 py-1 bg-orange-50 rounded">{worker.week_kpis?.task_hours || 0}h tasks</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Overall Stats & Actions */}
                  <div className="p-5 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{worker.total_shifts_completed || 0}</span> total shifts • 
                      <span className="font-medium text-gray-700 ml-1">{worker.total_hours_worked?.toFixed(0) || 0}h</span> total
                    </div>
                    <button
                      onClick={() => handleTerminate(worker)}
                      className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      End Employment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Inactive Workers Tab */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map((worker) => (
              <div key={worker.user_id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {worker.profile_picture ? (
                        <img src={worker.profile_picture} alt={worker.full_name} className="w-12 h-12 rounded-full" />
                      ) : (
                        <span className="text-xl font-bold text-gray-600">
                          {worker.full_name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{worker.full_name}</h3>
                      <p className="text-sm text-gray-500">{worker.position_title || worker.employment_type}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    worker.eligible_for_rehire 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {worker.eligible_for_rehire ? 'Eligible' : 'Not Eligible'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Shifts Completed:</span>
                    <span className="font-medium">{worker.total_shifts_completed || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Hours Worked:</span>
                    <span className="font-medium">{worker.total_hours_worked?.toFixed(1) || 0}h</span>
                  </div>
                  {worker.average_rating && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Rating:</span>
                      <span className="font-medium">⭐ {worker.average_rating.toFixed(1)}</span>
                    </div>
                  )}
                  
                  {worker.termination_reason && (
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        <strong>Reason:</strong> {worker.termination_reason.replace(/_/g, ' ')}
                      </p>
                      {worker.employment_end_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          <strong>Ended:</strong> {new Date(worker.employment_end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {worker.eligible_for_rehire && (
                  <button
                    onClick={() => handleRehire(worker)}
                    className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Rehire
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        </main>
      </div>

      {/* Terminate Modal */}
      {showTerminateModal && selectedWorker && (
        <TerminateModal
          worker={selectedWorker}
          onClose={() => {
            setShowTerminateModal(false);
            setSelectedWorker(null);
          }}
          onSuccess={() => {
            setShowTerminateModal(false);
            setSelectedWorker(null);
            loadData();
          }}
          theme={theme}
        />
      )}

      {/* Rehire Modal */}
      {showRehireModal && selectedWorker && (
        <RehireModal
          worker={selectedWorker}
          onClose={() => {
            setShowRehireModal(false);
            setSelectedWorker(null);
          }}
          onSuccess={() => {
            setShowRehireModal(false);
            setSelectedWorker(null);
            loadData();
          }}
          theme={theme}
        />
      )}
      
      {/* Worker Invite Modal */}
      {showInviteModal && (
        <InviteModalWrapper
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setSelectedRole(null);
            setSelectedWorkplace(null);
          }}
          onSuccess={() => {
            setShowInviteModal(false);
            setSelectedRole(null);
            setSelectedWorkplace(null);
            setActiveTab('invitations');
            loadData();
          }}
          roles={roles}
          workplaces={workplaces}
          selectedRole={selectedRole}
          selectedWorkplace={selectedWorkplace}
          theme={theme}
        />
      )}
    </div>
  );
};

// Invite Modal Wrapper - allows selecting role/workplace before inviting
const InviteModalWrapper = ({ isOpen, onClose, onSuccess, roles, workplaces, selectedRole, selectedWorkplace, theme }) => {
  const [step, setStep] = useState(selectedRole && selectedWorkplace ? 'invite' : 'select');
  const [chosenRole, setChosenRole] = useState(selectedRole);
  const [chosenWorkplace, setChosenWorkplace] = useState(selectedWorkplace);
  
  // Filter roles based on selected workplace
  const filteredRoles = chosenWorkplace 
    ? roles.filter(r => r.workplace_id === chosenWorkplace.workplace_id)
    : roles;
    
  if (!isOpen) return null;
  
  if (step === 'select') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: theme.primaryColor }}>
            <h2 className="text-xl font-bold text-white">Select Position to Fill</h2>
            <p className="text-white text-opacity-80 text-sm">Choose a workplace and role for new workers</p>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Workplace Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Workplace</label>
              <select
                value={chosenWorkplace?.workplace_id || ''}
                onChange={(e) => {
                  const wp = workplaces.find(w => w.workplace_id === e.target.value);
                  setChosenWorkplace(wp);
                  setChosenRole(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
              >
                <option value="">Select a workplace...</option>
                {workplaces.map(wp => (
                  <option key={wp.workplace_id} value={wp.workplace_id}>
                    {wp.name || wp.workplace_name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Role Selection */}
            {chosenWorkplace && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                {filteredRoles.length === 0 ? (
                  <p className="text-sm text-gray-500">No roles found for this workplace. Please create roles first.</p>
                ) : (
                  <select
                    value={chosenRole?.role_id || ''}
                    onChange={(e) => {
                      const role = filteredRoles.find(r => r.role_id === e.target.value);
                      setChosenRole(role);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  >
                    <option value="">Select a role...</option>
                    {filteredRoles.map(role => (
                      <option key={role.role_id} value={role.role_id}>
                        {role.role_name} - ${role.hourly_rate?.toFixed(2)}/hr
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex justify-between">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep('invite')}
              disabled={!chosenRole || !chosenWorkplace}
              className="px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show the actual invite modal
  return (
    <WorkerInviteModal
      isOpen={true}
      onClose={onClose}
      role={{ role_id: chosenRole.role_id, title: chosenRole.role_name }}
      workplace={{ workplace_id: chosenWorkplace.workplace_id, name: chosenWorkplace.name || chosenWorkplace.workplace_name }}
    />
  );
};

// Terminate Modal Component
const TerminateModal = ({ worker, onClose, onSuccess, theme }) => {
  const [formData, setFormData] = useState({
    termination_reason: 'contract_ended',
    termination_notes: '',
    last_working_day: new Date().toISOString().split('T')[0],
    eligible_for_rehire: true,
    cancel_future_shifts: true,
    notify_worker: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/api/employer/workforce-management/${worker.user_id}/terminate`, formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to terminate employment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">End Employment - {worker.full_name}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <select
              value={formData.termination_reason}
              onChange={(e) => setFormData({ ...formData, termination_reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{ focusRingColor: theme.primaryColor }}
            >
              <option value="contract_ended">Contract Ended</option>
              <option value="laid_off">Laid Off</option>
              <option value="terminated_cause">Terminated (Cause)</option>
              <option value="resigned">Resigned</option>
              <option value="mutual_agreement">Mutual Agreement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Day</label>
            <input
              type="date"
              value={formData.last_working_day}
              onChange={(e) => setFormData({ ...formData, last_working_day: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.termination_notes}
              onChange={(e) => setFormData({ ...formData, termination_notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="Additional details..."
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.cancel_future_shifts}
                onChange={(e) => setFormData({ ...formData, cancel_future_shifts: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Cancel all future shifts</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.eligible_for_rehire}
                onChange={(e) => setFormData({ ...formData, eligible_for_rehire: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Eligible for rehire</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.notify_worker}
                onChange={(e) => setFormData({ ...formData, notify_worker: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Notify worker</span>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'End Employment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Rehire Modal Component
const RehireModal = ({ worker, onClose, onSuccess, theme }) => {
  const [formData, setFormData] = useState({
    employment_type: 'contract',
    position_title: worker.position_title || '',
    rehire_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/api/employer/workforce-management/${worker.user_id}/rehire`, formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to rehire worker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Rehire - {worker.full_name}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
            <select
              value={formData.employment_type}
              onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            >
              <option value="contract">Contract</option>
              <option value="part_time">Part Time</option>
              <option value="full_time">Full Time</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position Title</label>
            <input
              type="text"
              value={formData.position_title}
              onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="e.g., Server, Chef, Manager"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.rehire_notes}
              onChange={(e) => setFormData({ ...formData, rehire_notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="Welcome back message or additional details..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {loading ? 'Processing...' : 'Rehire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkforceManagement;
