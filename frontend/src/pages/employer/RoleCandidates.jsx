import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { FiUsers, FiMapPin, FiStar, FiCheckCircle, FiXCircle, FiCalendar, FiArrowLeft, FiClock } from 'react-icons/fi';
import UserHeader from '../../components/common/UserHeader';

const RoleCandidates = () => {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [role, setRole] = useState(null);
  const [activeTab, setActiveTab] = useState('internal');
  const [viewMode, setViewMode] = useState('cards');
  const [internalCandidates, setInternalCandidates] = useState([]);
  const [externalCandidates, setExternalCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    loadRoleData();
  }, [roleId]);

  const loadRoleData = async () => {
    try {
      setLoading(true);
      
      const roleRes = await api.get(`/api/employer/workplace-roles/${roleId}`);
      const roleData = roleRes.data.data.role || roleRes.data.data;
      setRole(roleData);
      
      const internalRes = await api.get(`/api/employer/workplace-roles/${roleId}/internal-candidates`);
      setInternalCandidates(internalRes.data.data.candidates || []);
      
      const externalRes = await api.get(`/api/employer/workplace-roles/${roleId}/external-candidates?min_score=50`);
      setExternalCandidates(externalRes.data.data.candidates || []);
      
      const interviewsRes = await api.get(`/api/employer/interviews/list?role_id=${roleId}`);
      setInterviews(interviewsRes.data.data.interviews || []);
      
    } catch (error) {
      console.error('Failed to load role data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInterviewInvitation = async (candidate, isInternal) => {
    try {
      await api.post('/api/employer/interviews/send', {
        role_id: roleId,
        workforce_id: candidate.workforce_id || candidate.user_id,
        interview_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        interview_location: role.workplace_address || role.workplace_name,
        message: `We'd like to invite you for an interview for the ${role.role_name} position.`,
        source: isInternal ? 'internal' : 'external'
      });
      
      alert('Interview invitation sent successfully!');
      loadRoleData();
    } catch (error) {
      console.error('Failed to send invitation:', error);
      alert('Failed to send interview invitation. Please try again.');
    }
  };

  const assignToRole = async (candidate, isInternal) => {
    try {
      await api.post(`/api/employer/workplace-roles/${roleId}/assign`, {
        workforce_id: candidate.workforce_id || candidate.user_id,
        source: isInternal ? 'internal' : 'external'
      });
      
      alert('Worker assigned to role successfully!');
      navigate('/employer/home');
    } catch (error) {
      console.error('Failed to assign worker:', error);
      alert('Failed to assign worker. Please try again.');
    }
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const CandidateCard = ({ candidate, isInternal, onInterview, onHire }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {candidate.profile_photo_url ? (
              <img src={candidate.profile_photo_url} alt={candidate.name} className="w-full h-full object-cover" />
            ) : (
              <FiUsers size={24} className="text-gray-500" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{candidate.name || candidate.full_name}</h3>
            <p className="text-sm text-gray-600">{candidate.occupation_title || candidate.primary_occupation}</p>
            {candidate.location && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <FiMapPin size={12} />
                <span>{candidate.location}</span>
              </div>
            )}
          </div>
        </div>
        
        {candidate.match_score && (
          <div className={`px-3 py-1 rounded-lg border text-sm font-semibold ${getMatchScoreColor(candidate.match_score)}`}>
            {candidate.match_score}% Match
          </div>
        )}
      </div>
      
      {candidate.rating && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center">
            <FiStar className="text-yellow-400 fill-yellow-400" size={16} />
            <span className="ml-1 text-sm font-semibold">{candidate.rating.toFixed(1)}</span>
          </div>
          <span className="text-xs text-gray-500">({candidate.rating_count || 0} reviews)</span>
        </div>
      )}
      
      {candidate.skills && candidate.skills.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Skills:</p>
          <div className="flex flex-wrap gap-2">
            {candidate.skills.slice(0, 5).map((skill, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => onInterview(candidate, isInternal)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          📅 Interview
        </button>
        <button
          onClick={() => onHire(candidate, isInternal)}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: theme.primaryColor }}
        >
          ✓ Hire
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
        <UserHeader />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
        <UserHeader />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-center text-gray-600">Role not found</p>
        </div>
      </div>
    );
  }

  // Calculate display status
  const isFilled = (role.positions_filled || 0) >= (role.positions_needed || 1);
  const displayStatus = isFilled ? 'filled' : 'open';

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/employer/workforce-management')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <FiArrowLeft />
          <span>Back to Roles</span>
        </button>

        {/* Role Header Card - Redesigned */}
        <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
          {/* Top Section - Title & Status */}
          <div className="p-8 border-b border-gray-200" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}15 0%, ${theme.primaryColor}05 100%)` }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{role.role_name}</h1>
                <p className="text-lg text-gray-600">{role.occupation_type || role.occupation_template}</p>
              </div>
              <span className={`px-5 py-2.5 rounded-full text-sm font-bold shadow-sm ${
                displayStatus === 'filled' ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
              }`}>
                {displayStatus === 'filled' ? '✓ Fully Staffed' : '⏳ Open Positions'}
              </span>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Workplace */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    📍
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Branch</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{role.workplace_name || 'Main Location'}</p>
              </div>

              {/* Pay Rate */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                    💰
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Pay Rate</p>
                </div>
                <p className="text-lg font-bold text-gray-900">${role.pay_rate || role.hourly_rate}/hr</p>
              </div>

              {/* Positions */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                    👥
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Positions</p>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {role.positions_filled || 0}/{role.positions_needed || 0}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${((role.positions_filled || 0) / (role.positions_needed || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Shift Schedule */}
              {role.shift_start_time && role.shift_end_time && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                      🕐
                    </div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Schedule</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {role.shift_start_time} - {role.shift_end_time}
                  </p>
                  {role.days_of_week && role.days_of_week.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      {role.days_of_week.length === 7 ? 'Every day' : role.days_of_week.map(d => d.substring(0, 3)).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description Section */}
          {role.description && (
            <div className="p-6 bg-gray-50">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Role Description</h4>
              <p className="text-gray-700">{role.description}</p>
            </div>
          )}
        </div>

        {/* Tabs & Content */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('internal')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
                  activeTab === 'internal'
                    ? 'border-b-2 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={{ borderColor: activeTab === 'internal' ? theme.primaryColor : 'transparent' }}
              >
                👥 Internal Candidates ({internalCandidates.length})
              </button>
              <button
                onClick={() => setActiveTab('external')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
                  activeTab === 'external'
                    ? 'border-b-2 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={{ borderColor: activeTab === 'external' ? theme.primaryColor : 'transparent' }}
              >
                🌐 External Candidates ({externalCandidates.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'internal' && (
              <div>
                {internalCandidates.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-2">No internal candidates found</p>
                    <p className="text-sm text-gray-400">Try viewing external candidates</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {internalCandidates.map(candidate => (
                      <CandidateCard
                        key={candidate.workforce_id || candidate.user_id}
                        candidate={candidate}
                        isInternal={true}
                        onInterview={sendInterviewInvitation}
                        onHire={assignToRole}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'external' && (
              <div>
                {externalCandidates.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-2">No external candidates found</p>
                    <p className="text-sm text-gray-400">The matching engine found no suitable candidates</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {externalCandidates.map(candidate => (
                      <CandidateCard
                        key={candidate.workforce_id || candidate.user_id}
                        candidate={candidate}
                        isInternal={false}
                        onInterview={sendInterviewInvitation}
                        onHire={assignToRole}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleCandidates;