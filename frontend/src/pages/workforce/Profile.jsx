import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const WorkforceProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/api/workforce/me/profile');
      setProfile(response.data.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.primaryColor }}></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
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
            <h1 className="text-xl font-bold">My Profile</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/workforce/profile/setup')}
              className="text-sm hover:underline"
            >
              Edit Profile
            </button>
            <button onClick={logout} className="text-sm hover:underline">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold" style={{ backgroundColor: theme.primaryColor }}>
                {profile?.full_name?.charAt(0) || 'W'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-yellow-500">★★★★★</span>
                  <span className="text-sm text-gray-600">
                    {profile?.rating_avg || 'New'} ({profile?.rating_count || 0} reviews)
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Profile Completeness</div>
              <div className="text-3xl font-bold" style={{ color: theme.primaryColor }}>
                {profile?.profile_completeness || 20}%
              </div>
            </div>
          </div>

          {/* Profile Completeness Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="h-3 rounded-full transition-all" 
              style={{ 
                backgroundColor: theme.primaryColor,
                width: `${profile?.profile_completeness || 20}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="text-base font-medium text-gray-900">{profile?.phone || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Postal Code</p>
              <p className="text-base font-medium text-gray-900">{profile?.postal_code || 'Not set'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Address</p>
              <p className="text-base font-medium text-gray-900">{profile?.address || 'Not set'}</p>
            </div>
            {profile?.hourly_rate_preference && (
              <div>
                <p className="text-sm text-gray-600">Preferred Hourly Rate</p>
                <p className="text-base font-medium text-gray-900">${profile.hourly_rate_preference}/hour</p>
              </div>
            )}
          </div>
        </div>

        {/* Skills & Certifications */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills & Certifications</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Skills ({profile?.skills?.length || 0})</p>
            <div className="flex flex-wrap gap-2">
              {profile?.skills?.length > 0 ? (
                profile.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">No skills added yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Completed Jobs</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{profile?.completed_jobs_count || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Total Hours</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Total Earned</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">$0</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkforceProfile;
