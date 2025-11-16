import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const OccupationDetail = () => {
  const { occupationId } = useParams();
  const [occupation, setOccupation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingSkills, setEditingSkills] = useState(false);
  const [tempSkills, setTempSkills] = useState('');
  const [savingSkills, setSavingSkills] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

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
    } catch (error) {
      console.error('Failed to load occupation:', error);
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
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/workforce/occupations')} className="hover:opacity-80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold">{occupation.occupation_title}</h1>
            <p className="text-sm opacity-90">{occupation.occupation_category}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Experience</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{occupation.total_hours_worked || 0}h</p>
            <p className="text-xs text-gray-500 mt-1">{occupation.total_shifts_completed || 0} shifts</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Skill Rating</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-3xl font-bold text-gray-900">{occupation.skill_rating_avg || 'New'}</span>
              <span className="text-yellow-500 text-2xl">★</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">({occupation.skill_rating_count || 0} reviews)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Certifications</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{occupation.certifications?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Approved</p>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {occupation.skills?.map((skill, idx) => (
              <span key={idx} className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{ backgroundColor: theme.primaryColor }}>
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
            <button
              onClick={() => navigate(`/workforce/occupations/${occupationId}/add-certification`)}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: theme.primaryColor }}
            >
              + Add Certification
            </button>
          </div>
          {occupation.certifications?.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No certifications yet. Add certifications to increase your job matches.
            </p>
          ) : (
            <div className="text-sm text-gray-500">Certifications list coming soon...</div>
          )}
        </div>

        {/* Hourly Rate */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferred Rate</h3>
          <p className="text-3xl font-bold text-gray-900">
            {occupation.hourly_rate_preference ? `$${occupation.hourly_rate_preference}/hour` : 'Not set'}
          </p>
        </div>
      </main>
    </div>
  );
};

export default OccupationDetail;
