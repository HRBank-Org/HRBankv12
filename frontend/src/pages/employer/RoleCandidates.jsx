import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { FiUsers, FiMapPin, FiStar, FiCheckCircle, FiXCircle, FiCalendar, FiArrowLeft } from 'react-icons/fi';
import UserHeader from '../../components/common/UserHeader';

const RoleCandidates = () => {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [role, setRole] = useState(null);
  const [activeTab, setActiveTab] = useState('internal'); // internal, external, interviews
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
      
      // Load role details
      const roleRes = await api.get(`/api/employer/workplace-roles/${roleId}`);
      setRole(roleRes.data.data.role);
      
      // Load internal candidates (from own workforce)
      const internalRes = await api.get(`/api/employer/workplace-roles/${roleId}/internal-candidates`);
      setInternalCandidates(internalRes.data.data.candidates || []);
      
      // Load external candidates (from matching engine)
      const externalRes = await api.get(`/api/employer/workplace-roles/${roleId}/external-candidates?min_score=50`);
      setExternalCandidates(externalRes.data.data.candidates || []);
      
      // Load scheduled interviews
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
      loadRoleData(); // Refresh to show updated interview list
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
      navigate('/employer/dashboard');
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
          {/* Profile Photo */}
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {candidate.profile_photo_url ? (
              <img src={candidate.profile_photo_url} alt={candidate.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-gray-500">
                {candidate.full_name?.charAt(0) || candidate.name?.charAt(0) || 'W'}
              </span>
            )}
          </div>

          {/* Candidate Info */}
          <div>
            <h3 className="text-lg font-bold text-gray-900">{candidate.full_name || candidate.name}</h3>
            <p className="text-sm text-gray-600 mb-2">
              {candidate.occupation_title || candidate.occupation || 'Workforce Member'}
            </p>
            {candidate.behavior_rating > 0 && (
              <div className="flex items-center gap-1">
                <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium text-gray-700">
                  {candidate.behavior_rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500">
                  ({candidate.rating_count || 0} reviews)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Match Score (for external only) */}
        {!isInternal && candidate.match_score && (
          <div className={`px-4 py-2 rounded-lg border-2 ${getMatchScoreColor(candidate.match_score)}`}>
            <div className="text-2xl font-bold text-center">{Math.round(candidate.match_score)}%</div>
            <div className="text-xs text-center">Match</div>
          </div>
        )}
        
        {/* Internal Badge */}
        {isInternal && (
          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            ✓ Your Team
          </div>
        )}
      </div>

      {/* Match Details (external only) */}
      {!isInternal && candidate.distance_km !== undefined && (
        <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-gray-600 mb-1">Distance</div>
            <div className="flex items-center gap-1">
              <FiMapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">{candidate.distance_km.toFixed(1)} km</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Availability</div>
            <div className="text-sm font-medium">{Math.round(candidate.availability_score || 0)}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Skills</div>
            <div className="text-sm font-medium">
              {candidate.skills_matched || 0}/{candidate.total_skills_required || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Certs</div>
            <div className="text-sm font-medium">
              {candidate.certifications_matched || 0}/{candidate.total_certifications_required || 0}
            </div>
          </div>
        </div>
      )}

      {/* Skills */}
      {candidate.skills && candidate.skills.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Skills:</h4>
          <div className="flex flex-wrap gap-1">
            {candidate.skills.slice(0, 6).map((skill, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                {skill}
              </span>
            ))}
            {candidate.skills.length > 6 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                +{candidate.skills.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onInterview(candidate)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <FiCalendar className="inline mr-1" />
          Schedule Interview
        </button>
        <button
          onClick={() => onHire(candidate)}
          className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          style={{ backgroundColor: theme.primaryColor }}
        >
          <FiCheckCircle className="inline mr-1" />
          Hire Now
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
        <UserHeader showBack={true} onBackClick={() => navigate('/employer/dashboard')} />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-600">Role not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader 
        showBack={true}
        onBackClick={() => navigate('/employer/dashboard')}
        title="Role Candidates"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{role.role_name}</h1>
              <p className="text-gray-600 mb-4">{role.occupation_template}</p>
              
              <div className="flex items-center gap-6 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Rate:</span> ${role.hourly_rate}/hr
                </div>
                <div>
                  <span className="font-medium">Positions:</span> {role.positions_filled}/{role.positions_available}
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    role.status === 'filled' ? 'bg-green-100 text-green-800' :
                    role.status === 'posted_to_match' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {role.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('internal')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'internal'
                ? 'bg-white shadow-md text-gray-900'
                : 'bg-white/50 text-gray-600 hover:bg-white/80'
            }`}
          >
            👥 Your Team ({internalCandidates.length})
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'external'
                ? 'bg-white shadow-md text-gray-900'
                : 'bg-white/50 text-gray-600 hover:bg-white/80'
            }`}
          >
            🌐 External Candidates ({externalCandidates.length})
          </button>
          <button
            onClick={() => setActiveTab('interviews')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'interviews'
                ? 'bg-white shadow-md text-gray-900'
                : 'bg-white/50 text-gray-600 hover:bg-white/80'
            }`}
          >
            📅 Interviews ({interviews.length})
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === 'internal' && (
            <>
              {internalCandidates.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Internal Candidates</h3>
                  <p className="text-gray-600 mb-4">None of your current workers match this role</p>
                  <button
                    onClick={() => setActiveTab('external')}
                    className="px-6 py-3 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    View External Candidates
                  </button>
                </div>
              ) : (
                internalCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.user_id || candidate.workforce_id}
                    candidate={candidate}
                    isInternal={true}
                    onInterview={(c) => sendInterviewInvitation(c, true)}
                    onHire={(c) => assignToRole(c, true)}
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'external' && (
            <>
              {externalCandidates.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No External Candidates Found</h3>
                  <p className="text-gray-600">Try adjusting role requirements or search radius</p>
                </div>
              ) : (
                externalCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.workforce_id}
                    candidate={candidate}
                    isInternal={false}
                    onInterview={(c) => sendInterviewInvitation(c, false)}
                    onHire={(c) => assignToRole(c, false)}
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'interviews' && (
            <>
              {interviews.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <FiCalendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Scheduled Interviews</h3>
                  <p className="text-gray-600">Schedule interviews from the candidates tabs</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {interviews.map((interview) => (
                        <tr key={interview.interview_id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{interview.candidate_name}</div>
                            <div className="text-sm text-gray-500">{interview.source === 'internal' ? '👥 Internal' : '🌐 External'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {new Date(interview.interview_date).toLocaleDateString()} at {new Date(interview.interview_date).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{interview.interview_location}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              interview.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              interview.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {interview.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                            <button className="text-red-600 hover:text-red-800">Cancel</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default RoleCandidates;
