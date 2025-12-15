import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMail, FiVideo, FiCheckCircle, FiClock, FiUsers, FiStar, FiMapPin } from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import BulkInviteModal from '../../components/employer/BulkInviteModal';

const FillPositions = () => {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  const [role, setRole] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [unassignedWorkers, setUnassignedWorkers] = useState([]);
  const [externalCandidates, setExternalCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [roleId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load role details
      const roleRes = await api.get(`/api/employer/workplace-roles/${roleId}`);
      const roleData = roleRes.data.data.role || roleRes.data.data;
      setRole(roleData);

      // Load pending invitations
      try {
        const invitesRes = await api.get(`/api/employer/invitations/pending?role_id=${roleId}`);
        setPendingInvites(invitesRes.data.data.invitations || []);
      } catch (err) {
        console.log('No pending invites endpoint or no invites');
        setPendingInvites([]);
      }

      // Load unassigned workers from company
      try {
        const unassignedRes = await api.get('/api/employer/workforce-management/unassigned');
        setUnassignedWorkers(unassignedRes.data.data.workers || []);
      } catch (err) {
        console.log('No unassigned workers');
        setUnassignedWorkers([]);
      }

      // Load external candidates via match engine
      try {
        const candidatesRes = await api.get(`/api/employer/workplace-roles/${roleId}/external-candidates?min_score=60`);
        setExternalCandidates(candidatesRes.data.data.candidates || []);
      } catch (err) {
        console.log('No external candidates found');
        setExternalCandidates([]);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignWorker = async (workerId) => {
    try {
      await api.post(`/api/employer/workplace-roles/${roleId}/assign`, {
        workforce_id: workerId,
        source: 'internal'
      });
      alert('Worker assigned successfully!');
      loadData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to assign worker');
    }
  };

  const handleSendInterview = async (candidate) => {
    try {
      await api.post('/api/employer/interviews/send', {
        role_id: roleId,
        workforce_id: candidate.workforce_id || candidate.user_id,
        interview_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        interview_location: role.workplace_name,
        message: `We'd like to invite you for a video interview for the ${role.role_name} position.`,
        source: 'external'
      });
      alert('Interview invitation sent!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to send invitation');
    }
  };

  const handleSendOffer = async (candidate) => {
    if (!confirm(`Send direct offer to ${candidate.name}?`)) return;
    
    try {
      await api.post(`/api/employer/workplace-roles/${roleId}/assign`, {
        workforce_id: candidate.workforce_id || candidate.user_id,
        source: 'external'
      });
      alert('Offer sent successfully!');
      loadData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to send offer');
    }
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GenericHeader />
        <ModernSidebar />
        <div className="transition-all duration-300 pt-[64px] flex items-center justify-center h-64" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GenericHeader />
        <ModernSidebar />
        <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Role not found</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentFilled = role.current_filled || role.assigned_workers?.length || 0;
  const totalPositions = role.positions_needed || 1;
  const availablePositions = Math.max(0, totalPositions - currentFilled - pendingInvites.length);

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <ModernSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Role Summary Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{role.role_name}</h2>
              <p className="text-gray-600 mt-1">{role.workplace_name}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-sm text-gray-600">
                  {currentFilled}/{totalPositions} Filled
                </span>
                {pendingInvites.length > 0 && (
                  <span className="text-sm text-blue-600">
                    {pendingInvites.length} Pending
                  </span>
                )}
                <span className="text-sm font-medium" style={{ color: availablePositions > 0 ? theme.primaryColor : '#10B981' }}>
                  {availablePositions} Available to Fill
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: theme.primaryColor }}>
                ${role.pay_rate || role.hourly_rate}/hr
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: Invite Your Team */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 text-white" style={{ backgroundColor: theme.primaryColor }}>
                  1
                </span>
                Invite Your Team
              </h3>
              <p className="text-sm text-gray-600 ml-11 mt-1">
                Onboard new workers directly to this role
              </p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              disabled={availablePositions === 0}
              className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <FiMail className="inline mr-2" />
              Invite Team
            </button>
          </div>

          {pendingInvites.length > 0 ? (
            <div className="ml-11 space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Pending Invitations ({pendingInvites.length}):
              </p>
              {pendingInvites.map((invite, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FiClock className="text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{invite.email}</p>
                      <p className="text-xs text-gray-500">
                        Sent {new Date(invite.sent_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">Pending</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ml-11 p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-500">No pending invitations</p>
            </div>
          )}

          {availablePositions === 0 && (
            <div className="ml-11 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ No positions available. All spots are filled or have pending invitations.
              </p>
            </div>
          )}
        </div>

        {/* STEP 2: Unassigned Workers */}
        {unassignedWorkers.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 text-white" style={{ backgroundColor: theme.primaryColor }}>
                  2
                </span>
                Assign Unassigned Workers
              </h3>
              <p className="text-sm text-gray-600 ml-11 mt-1">
                Workers from your team not currently assigned to any role
              </p>
            </div>

            <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4">
              {unassignedWorkers.map((worker) => (
                <div key={worker.worker_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <FiUsers className="text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{worker.name}</p>
                        <p className="text-sm text-gray-600">{worker.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Unassigned for {worker.days_unassigned || 0} days
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignWorker(worker.worker_id)}
                      disabled={availablePositions === 0}
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: External Candidates */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 text-white" style={{ backgroundColor: theme.primaryColor }}>
                {unassignedWorkers.length > 0 ? '3' : '2'}
              </span>
              External Candidates (Match Engine)
            </h3>
            <p className="text-sm text-gray-600 ml-11 mt-1">
              Platform-matched qualified candidates for this role
            </p>
          </div>

          {externalCandidates.length > 0 ? (
            <div className="ml-11 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {externalCandidates.map((candidate) => (
                <div key={candidate.workforce_id || candidate.user_id} className="border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {candidate.profile_photo_url ? (
                        <img src={candidate.profile_photo_url} alt={candidate.name} className="w-full h-full object-cover" />
                      ) : (
                        <FiUsers size={24} className="text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 text-lg">{candidate.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <FiMapPin size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-600">{candidate.distance_km || 0}km away</span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getMatchScoreColor(candidate.match_score || 0)}`}>
                          {candidate.match_score || 0}% Match
                        </div>
                      </div>
                      
                      {candidate.rating && (
                        <div className="flex items-center gap-1 mt-2">
                          <FiStar className="text-yellow-500" fill="#EAB308" size={16} />
                          <span className="text-sm font-medium text-gray-700">{candidate.rating.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">({candidate.total_reviews || 0} reviews)</span>
                        </div>
                      )}

                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {candidate.skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleSendInterview(candidate)}
                      className="flex-1 px-4 py-2 border-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                    >
                      <FiVideo />
                      Interview
                    </button>
                    <button
                      onClick={() => handleSendOffer(candidate)}
                      disabled={availablePositions === 0}
                      className="flex-1 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      <FiCheckCircle />
                      Send Offer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ml-11 p-8 bg-gray-50 rounded-lg text-center">
              <FiUsers size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No external candidates found</p>
              <p className="text-sm text-gray-500 mt-1">
                The match engine is still looking for qualified candidates
              </p>
            </div>
          )}
        </div>
        </main>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <BulkInviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          roleId={roleId}
          roleName={role.role_name}
          availablePositions={availablePositions}
          onSuccess={(data) => {
            alert(`Successfully sent ${data.data.total_sent} invitation(s)!`);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default FillPositions;
