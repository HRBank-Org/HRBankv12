import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const OccupationProfiles = () => {
  const [occupations, setOccupations] = useState([]);
  const [canAddMore, setCanAddMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editingSkills, setEditingSkills] = useState(null); // occupation_id currently being edited
  const [tempSkills, setTempSkills] = useState(''); // temporary skills input
  const [savingSkills, setSavingSkills] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadOccupations();
  }, []);

  const loadOccupations = async () => {
    try {
      const response = await api.get('/api/occupations/me');
      setOccupations(response.data.data.occupations);
      setCanAddMore(response.data.data.can_add_more);
    } catch (error) {
      console.error('Failed to load occupations:', error);
    } finally {
      setLoading(false);
    }
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
      {/* Header */}
      <header className="text-white px-4 py-4 shadow-md" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workforce/dashboard')} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold">My Occupation Profiles</h1>
          </div>
          <button onClick={logout} className="text-sm hover:underline">Logout</button>
        </div>
      </header>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {occupations.map((occ) => (
              <div key={occ.occupation_id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Occupation Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{occ.occupation_title}</h3>
                      <p className="text-sm text-gray-500">{occ.occupation_category}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/workforce/occupations/${occ.occupation_id}`)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Edit occupation"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Experience:</span>
                      <span className="font-semibold text-gray-900">{occ.total_hours_worked || 0} hours</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Skill Rating:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="font-semibold text-gray-900">
                          {occ.skill_rating_avg || 'New'} ({occ.skill_rating_count || 0})
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Certifications:</span>
                      <span className="font-semibold text-gray-900">{occ.certifications?.length || 0} approved</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completeness:</span>
                      <div className="flex-1 ml-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              backgroundColor: theme.primaryColor,
                              width: `${occ.profile_completeness || 40}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      <span className="font-semibold ml-2" style={{ color: theme.primaryColor }}>
                        {occ.profile_completeness || 40}%
                      </span>
                    </div>
                  </div>

                  {/* Skills Tags */}
                  {occ.skills?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {occ.skills.slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs rounded-full text-white" style={{ backgroundColor: theme.primaryColor }}>
                            {skill}
                          </span>
                        ))}
                        {occ.skills.length > 3 && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">
                            +{occ.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-200 flex gap-2">
                    <button
                      onClick={() => navigate(`/workforce/occupations/${occ.occupation_id}`)}
                      className="flex-1 px-4 py-2 rounded-lg font-medium text-white"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => navigate(`/workforce/occupations/${occ.occupation_id}/add-certification`)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                    >
                      + Cert
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
