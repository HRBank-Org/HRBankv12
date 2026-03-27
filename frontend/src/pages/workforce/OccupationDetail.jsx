import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import UserHeader from '../../components/common/UserHeader';

import { useLanguage } from '../../contexts/LanguageContext';

const OccupationDetail = () => {
  const { occupationId } = useParams();
  const [occupation, setOccupation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingSkills, setEditingSkills] = useState(false);
  const [tempSkills, setTempSkills] = useState('');
  const [savingSkills, setSavingSkills] = useState(false);
  const [occupationRequiredCerts, setOccupationRequiredCerts] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending', bg: 'bg-yellow-100', text_color: 'text-yellow-800', icon: '⏳' },
      verified: { text: 'Verified', bg: 'bg-green-100', text_color: 'text-green-800', icon: '✓' },
      rejected: { text: 'Rejected', bg: 'bg-red-100', text_color: 'text-red-800', icon: '✗' }
    };
    return badges[status] || badges.pending;
  };

  useEffect(() => {
    loadOccupation();
  }, [occupationId]);

  const loadOccupation = async () => {
    try {
      const response = await api.get('/api/occupations/me');
      const occ = response.data.data.occupations.find(o => o.occupation_id === occupationId);
      setOccupation(occ);
      
      // Fetch occupation-linked required certifications
      if (occ && occ.occupation_title) {
        try {
          const certsResponse = await api.get(`/api/admin/occupations/occupation-certifications/${encodeURIComponent(occ.occupation_title)}`);
          setOccupationRequiredCerts(certsResponse.data.data.required_certifications || []);
        } catch (certsError) {
          console.error('Failed to fetch occupation requirements:', certsError);
          setOccupationRequiredCerts([]);
        }
      }
    } catch (error) {
      console.error('Failed to load occupation:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditingSkills = () => {
    setEditingSkills(true);
    setTempSkills(occupation.skills?.join(', ') || '');
  };

  const cancelEditingSkills = () => {
    setEditingSkills(false);
    setTempSkills('');
  };

  const saveSkills = async () => {
    setSavingSkills(true);
    try {
      const skillsArray = tempSkills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await api.patch(`/api/occupations/${occupationId}`, {
        skills: skillsArray
      });

      await loadOccupation();
      setEditingSkills(false);
      setTempSkills('');
    } catch (error) {
      console.error('Failed to update skills:', error);
      alert('Failed to update skills. Please try again.');
    } finally {
      setSavingSkills(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  if (!occupation) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="text-center">
          <p className="text-gray-600">Occupation not found</p>
          <button onClick={() => navigate('/workforce/occupations')} className="mt-4 text-blue-600 hover:underline">
            Back to Occupations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Header with User Info and Occupation Title */}
      <UserHeader 
        onBackClick={() => navigate('/workforce/occupations')}
        showBack={true}
        title={
          <div>
            <p className="text-lg font-bold">{occupation.occupation_title}</p>
            <p className="text-xs opacity-90">{occupation.occupation_category}</p>
          </div>
        }
      />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Professional Stats Overview - 4 columns now */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-2">Years of Experience</p>
            <p className="text-4xl font-bold mt-2" style={{ color: theme.primaryColor }}>
              {occupation.years_of_experience || 0}
            </p>
            <p className="text-xs text-gray-500 mt-2">Years</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-2">Hours Worked</p>
            <p className="text-4xl font-bold mt-2" style={{ color: theme.primaryColor }}>
              {Math.round(occupation.total_hours_worked || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">{occupation.total_shifts_completed || 0} shifts</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-2">Skill Rating</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-4xl font-bold text-gray-900">{occupation.skill_rating_avg || 'New'}</span>
              <span className="text-yellow-500 text-3xl">★</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">({occupation.skill_rating_count || 0} reviews)</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-2">Certifications</p>
            <p className="text-4xl font-bold mt-2" style={{ color: theme.primaryColor }}>
              {occupation.credential_details?.filter(c => c.status === 'verified').length || 0}
            </p>
            <p className="text-xs text-gray-500 mt-2">{t("pages.common.verified")}</p>
          </div>
        </div>

        {/* Employment History */}
        {occupation.employment_history && occupation.employment_history.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900">Work Experience</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {occupation.employment_history.map((emp, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{emp.company_name}</p>
                      {emp.position_title && (
                        <p className="text-sm text-gray-600">{emp.position_title}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {emp.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {emp.total_shifts || 0} shifts
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {Math.round(emp.total_hours || 0)} hours
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills with Inline Editing */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900">Skills</h3>
            </div>
            {!editingSkills && (
              <button
                onClick={startEditingSkills}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 border border-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Skills
              </button>
            )}
          </div>
          
          {editingSkills ? (
            <div className="space-y-3">
              <textarea
                value={tempSkills}
                onChange={(e) => setTempSkills(e.target.value)}
                placeholder="Enter skills separated by commas (e.g., Customer Service, Mixology, Smart Serve)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                style={{ focusRing: theme.primaryColor }}
                rows={4}
              />
              <div className="flex gap-3">
                <button
                  onClick={saveSkills}
                  disabled={savingSkills}
                  className="flex-1 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {savingSkills ? 'Saving...' : 'Save Skills'}
                </button>
                <button
                  onClick={cancelEditingSkills}
                  disabled={savingSkills}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {occupation.skills && occupation.skills.length > 0 ? (
                occupation.skills.map((skill, idx) => (
                  <span 
                    key={idx} 
                    className="px-4 py-2 rounded-full text-sm font-medium text-white shadow-sm"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-gray-500 italic">No skills added yet. Click Edit Skills to add your skills.</p>
              )}
            </div>
          )}
        </div>

        {/* Certifications with Status Badges */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900">Certifications</h3>
              <span className="ml-2 text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: `${theme.primaryColor}20`, color: theme.primaryColor }}>
                {occupation.credential_details?.filter(c => c.status === 'verified').length || 0} verified
              </span>
            </div>
            <button
              onClick={() => navigate(`/workforce/occupations/${occupationId}/add-certification`)}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm shadow-sm hover:shadow transition-all"
              style={{ backgroundColor: theme.primaryColor }}
            >
              + Add Certification
            </button>
          </div>

          {/* Show required certifications for this occupation */}
          {occupationRequiredCerts.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">Required Certifications for {occupation.occupation_title}</h4>
                  <p className="text-xs text-blue-700 mb-2">Having these certifications improves your job matching score</p>
                  <div className="flex flex-wrap gap-2">
                    {occupationRequiredCerts.map((reqCert, idx) => {
                      const hasThisCert = occupation.credential_details?.some(
                        c => c.credential_name.toLowerCase() === reqCert.toLowerCase() && c.status === 'verified'
                      );
                      return (
                        <span 
                          key={idx}
                          className={`text-xs px-3 py-1 rounded-full font-medium ${
                            hasThisCert 
                              ? 'bg-green-100 text-green-800 border border-green-300' 
                              : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}
                        >
                          {hasThisCert ? '✓ ' : '⚠ '}
                          {reqCert}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {occupation.credential_details && occupation.credential_details.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {occupation.credential_details.map((cert) => {
                const badge = getStatusBadge(cert.status);
                return (
                  <div key={cert.credential_id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{cert.credential_name}</p>
                        <p className="text-sm text-gray-600 mt-1">{cert.institution_name}</p>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${badge.bg} ${badge.text_color} text-xs font-semibold whitespace-nowrap`}>
                        <span>{badge.icon}</span>
                        <span>{badge.text}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                      {cert.credential_type && (
                        <span className="px-2 py-1 bg-gray-200 rounded text-gray-700">{cert.credential_type}</span>
                      )}
                      {cert.issue_date && (
                        <span>Issued: {cert.issue_date}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-gray-600 mb-3">No certifications yet</p>
              <p className="text-sm text-gray-500 mb-4">Add certifications to increase your job matching score</p>
              <button
                onClick={() => navigate(`/workforce/occupations/${occupationId}/add-certification`)}
                className="px-5 py-2 rounded-lg text-white font-medium text-sm"
                style={{ backgroundColor: theme.primaryColor }}
              >
                + Add Your First Certification
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OccupationDetail;
