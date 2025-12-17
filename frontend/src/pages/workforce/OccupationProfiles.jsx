import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import api from '../../utils/api';

const OccupationProfiles = () => {
  const [occupations, setOccupations] = useState([]);
  const [canAddMore, setCanAddMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editingSkills, setEditingSkills] = useState(null); // occupation_id currently being edited
  const [tempSkills, setTempSkills] = useState(''); // temporary skills input
  const [savingSkills, setSavingSkills] = useState(false);
  const [occupationRequirements, setOccupationRequirements] = useState({}); // Map of occupation_id -> required_certs
  const { logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadOccupations();
  }, []);

  const loadOccupations = async () => {
    try {
      const response = await api.get('/api/occupations/me');
      const occs = response.data.data.occupations;
      setOccupations(occs);
      setCanAddMore(response.data.data.can_add_more);
      
      // Fetch required certifications for each occupation
      const requirementsMap = {};
      for (const occ of occs) {
        try {
          const certsResponse = await api.get(`/api/admin/occupations/occupation-certifications/${encodeURIComponent(occ.occupation_title)}`);
          requirementsMap[occ.occupation_id] = certsResponse.data.data.required_certifications || [];
        } catch (error) {
          console.error(`Failed to fetch requirements for ${occ.occupation_title}:`, error);
          requirementsMap[occ.occupation_id] = [];
        }
      }
      setOccupationRequirements(requirementsMap);
    } catch (error) {
      console.error('Failed to load occupations:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditingSkills = (occupation) => {
    setEditingSkills(occupation.occupation_id);
    setTempSkills(occupation.skills?.join(', ') || '');
  };

  const cancelEditingSkills = () => {
    setEditingSkills(null);
    setTempSkills('');
  };

  const saveSkills = async (occupationId) => {
    setSavingSkills(true);
    try {
      // Parse comma-separated skills and trim whitespace
      const skillsArray = tempSkills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await api.patch(`/api/occupations/${occupationId}`, {
        skills: skillsArray
      });

      // Reload occupations to get updated data
      await loadOccupations();
      setEditingSkills(null);
      setTempSkills('');
    } catch (error) {
      console.error('Failed to update skills:', error);
      alert('Failed to update skills. Please try again.');
    } finally {
      setSavingSkills(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending', bg: 'bg-yellow-100', text_color: 'text-yellow-800', icon: '⏳' },
      verified: { text: 'Verified', bg: 'bg-green-100', text_color: 'text-green-800', icon: '✓' },
      rejected: { text: 'Rejected', bg: 'bg-red-100', text_color: 'text-red-800', icon: '✗' }
    };
    return badges[status] || badges.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Header with User Info */}
      <UserHeader 
        onBackClick={() => navigate('/workforce/dashboard')}
        showBack={true}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Career Profiles</h2>
          <p className="text-gray-600 mt-1">
            You have {occupations.length} of 3 occupation profiles. Each profile works like a separate resume.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <strong>How it works:</strong> Create up to 3 occupation profiles for different careers. 
              Each profile tracks its own skills, certifications, experience hours, and skill ratings independently.
              <br /><br />
              <strong>Privacy:</strong> Your email, phone, and address are NEVER shared with employers. 
              They only see your occupation profiles and can contact you through the app.
              <br /><br />
              <strong>Certifications:</strong> All certifications must be verified by an institution 
              AND approved by HR Bank admin before appearing on your profile and being recognized by the job matching system.
            </div>
          </div>
        </div>

        {/* Occupation Cards */}
        {occupations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Occupation Profiles Yet</h3>
            <p className="text-gray-600 mb-6">Create your first occupation profile to start receiving job offers</p>
            <button
              onClick={() => navigate('/workforce/occupations/create')}
              className="px-6 py-3 rounded-lg text-white font-semibold"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Create First Profile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {occupations.map((occ) => (
              <div key={occ.occupation_id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
                {/* Resume Header - Professional Banner */}
                <div className="relative px-8 pt-8 pb-6" style={{ background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.primaryColor}dd 100%)` }}>
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => navigate(`/workforce/occupations/${occ.occupation_id}`)}
                      className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
                      title="View full profile"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{occ.occupation_title}</h2>
                  <p className="text-white text-opacity-90 text-sm font-medium">{occ.occupation_category}</p>
                </div>

                <div className="p-8 space-y-6">
                  {/* Professional Summary Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                        {occ.years_of_experience || 0}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Years Exp.</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                        {Math.round(occ.total_hours_worked || 0)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Hours Worked</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-yellow-500 text-xl">★</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {occ.skill_rating_avg ? occ.skill_rating_avg.toFixed(1) : 'New'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Rating ({occ.skill_rating_count || 0})</div>
                    </div>
                  </div>

                  {/* Employment History Section */}
                  {occ.employment_history && occ.employment_history.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <h3 className="font-semibold text-gray-900">Work Experience</h3>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {occ.employment_history.slice(0, 3).map((emp, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{emp.company_name}</p>
                                {emp.position_title && (
                                  <p className="text-xs text-gray-600">{emp.position_title}</p>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {emp.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>{emp.total_shifts || 0} shifts</span>
                              <span>{Math.round(emp.total_hours || 0)} hours</span>
                            </div>
                          </div>
                        ))}
                        {occ.employment_history.length > 3 && (
                          <p className="text-xs text-center text-gray-500 pt-1">+{occ.employment_history.length - 3} more companies</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills Section with Inline Editing */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <h3 className="font-semibold text-gray-900">Skills</h3>
                      </div>
                      {editingSkills !== occ.occupation_id && (
                        <button
                          onClick={() => startEditingSkills(occ)}
                          className="text-sm flex items-center gap-1 hover:opacity-70"
                          style={{ color: theme.primaryColor }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      )}
                    </div>
                    
                    {editingSkills === occ.occupation_id ? (
                      <div className="space-y-2">
                        <textarea
                          value={tempSkills}
                          onChange={(e) => setTempSkills(e.target.value)}
                          placeholder="Enter skills separated by commas (e.g., First Aid, CPR, Crisis Management)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-opacity-50"
                          style={{ focusRing: theme.primaryColor }}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveSkills(occ.occupation_id)}
                            disabled={savingSkills}
                            className="flex-1 px-3 py-2 rounded-lg text-white text-sm font-medium"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            {savingSkills ? 'Saving...' : 'Save Skills'}
                          </button>
                          <button
                            onClick={cancelEditingSkills}
                            disabled={savingSkills}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {occ.skills && occ.skills.length > 0 ? (
                          occ.skills.map((skill, idx) => (
                            <span 
                              key={idx} 
                              className="px-3 py-1.5 text-sm rounded-full text-white font-medium"
                              style={{ backgroundColor: theme.primaryColor }}
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">No skills added yet. Click Edit to add skills.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Certifications Section with Status Badges */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <h3 className="font-semibold text-gray-900">Certifications</h3>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${theme.primaryColor}20`, color: theme.primaryColor }}>
                        {occ.credential_details?.filter(c => c.status === 'verified').length || 0} verified
                      </span>
                    </div>
                    
                    {/* Show required certifications alert if missing any */}
                    {(() => {
                      const requiredCerts = occupationRequirements[occ.occupation_id] || [];
                      if (requiredCerts.length > 0) {
                        const verifiedCertNames = (occ.credential_details || [])
                          .filter(c => c.status === 'verified')
                          .map(c => c.credential_name.toLowerCase());
                        const missingRequired = requiredCerts.filter(
                          rc => !verifiedCertNames.includes(rc.toLowerCase())
                        );
                        
                        if (missingRequired.length > 0) {
                          return (
                            <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                              <p className="text-yellow-800 font-medium">
                                ⚠ {missingRequired.length} required certification{missingRequired.length !== 1 ? 's' : ''} missing
                              </p>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                    {occ.credential_details && occ.credential_details.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {occ.credential_details.map((cert) => {
                          const badge = getStatusBadge(cert.status);
                          return (
                            <div key={cert.credential_id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 text-sm truncate">{cert.credential_name}</p>
                                  <p className="text-xs text-gray-600 truncate">{cert.institution_name}</p>
                                  {cert.credential_type && (
                                    <p className="text-xs text-gray-500 mt-1">{cert.credential_type}</p>
                                  )}
                                </div>
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${badge.bg} ${badge.text_color} text-xs font-medium whitespace-nowrap`}>
                                  <span>{badge.icon}</span>
                                  <span>{badge.text}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300 text-center">
                        <p className="text-sm text-gray-600 mb-2">No certifications added yet</p>
                        <button
                          onClick={() => navigate(`/workforce/occupations/${occ.occupation_id}/add-certification`)}
                          className="text-sm font-medium"
                          style={{ color: theme.primaryColor }}
                        >
                          + Add Certification
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-200 flex gap-3">
                    <button
                      onClick={() => navigate(`/workforce/occupations/${occ.occupation_id}`)}
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white shadow-sm hover:shadow transition-all"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      View Full Profile
                    </button>
                    <button
                      onClick={() => navigate(`/workforce/occupations/${occ.occupation_id}/add-certification`)}
                      className="px-4 py-2.5 border-2 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-all"
                      style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                    >
                      + Certification
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Occupation Card */}
            {canAddMore && (
              <div 
                onClick={() => navigate('/workforce/occupations/create')}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border-2 border-dashed border-gray-300 hover:border-gray-400"
              >
                <div className="p-6 h-full flex flex-col items-center justify-center text-center min-h-[300px]">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primaryColor}20` }}>
                    <svg className="w-8 h-8" fill="none" stroke={theme.primaryColor} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Add New Occupation</h3>
                  <p className="text-sm text-gray-600">Create another career profile</p>
                  <p className="text-xs text-gray-500 mt-2">{3 - occupations.length} slot{3 - occupations.length !== 1 ? 's' : ''} remaining</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!canAddMore && occupations.length >= 3 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center mt-6">
            <p className="text-sm text-gray-700">
              You've reached the maximum of 3 occupation profiles. 
              To add a new one, please delete an existing profile first.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default OccupationProfiles;
