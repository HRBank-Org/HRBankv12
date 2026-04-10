import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import WorkPassportHeader from '../../components/layout/WorkPassportHeader';
import WorkPassportSidebar from '../../components/layout/WorkPassportSidebar';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  FiGlobe, 
  FiEye, 
  FiCopy, 
  FiCheckCircle,
  FiExternalLink,
  FiUser,
  FiMail,
  FiMapPin,
  FiAward,
  FiBriefcase,
  FiEdit
} from 'react-icons/fi';

const ProfilePreview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [occupations, setOccupations] = useState([]);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [profileRes, credRes, occRes] = await Promise.all([
        api.get('/api/workpassport/profile', {
        }),
        api.get('/api/workpassport/credentials', {
        }),
        api.get('/api/workpassport/occupations', {
        })
      ]);

      if (profileRes.data.success) {
        const profileData = profileRes.data.data.profile;
        setProfile(profileData);
        setShareUrl(`${window.location.origin}/passport/${profileData.share_token}`);
      }
      
      const creds = credRes.data.data?.credentials || [];
      setCredentials(creds.filter(c => c.status === 'verified' || c.status === 'issued'));
      
      setOccupations(occRes.data.data?.occupations || []);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openPublicProfile = () => {
    if (profile?.share_token) {
      window.open(`/passport/${profile.share_token}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkPassportHeader />
      <WorkPassportSidebar />
      
      <div className="transition-all duration-300 pt-16" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Public Profile</h1>
              <p className="text-gray-600">
                Preview and share your professional profile with employers
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/workpassport/settings')}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiEdit size={18} />
                Edit Profile
              </button>
              <button
                onClick={openPublicProfile}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
              >
                <FiExternalLink size={18} />
                View Public Profile
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 max-w-4xl mx-auto">
          {/* Share URL Card */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Your Shareable Profile Link</h3>
                <p className="text-cyan-100 text-sm">Share this link with employers to showcase your verified credentials</p>
              </div>
              <FiGlobe size={40} className="opacity-50" />
            </div>
            <div className="mt-4 flex gap-3">
              <div className="flex-1 bg-white/10 rounded-lg px-4 py-3 font-mono text-sm truncate">
                {shareUrl}
              </div>
              <button
                onClick={copyShareLink}
                className="flex items-center gap-2 px-4 py-2 bg-white text-cyan-600 rounded-lg hover:bg-cyan-50 transition-colors font-medium"
              >
                {copied ? <FiCheckCircle size={18} /> : <FiCopy size={18} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Profile Preview Card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-cyan-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold mb-1">{profile?.full_name || 'Your Name'}</h2>
                  <p className="text-gray-300 mb-3">{profile?.headline || 'Professional headline not set'}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {profile?.city && (
                      <span className="flex items-center gap-1">
                        <FiMapPin size={14} />
                        {profile.city}, {profile.country}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FiEye size={14} />
                      {profile?.profile_views || 0} profile views
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-900">{credentials.length}</div>
                  <div className="text-sm text-gray-500">Verified Credentials</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-900">{occupations.length}</div>
                  <div className="text-sm text-gray-500">Occupations</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-900">{profile?.profile_views || 0}</div>
                  <div className="text-sm text-gray-500">Profile Views</div>
                </div>
              </div>

              {/* Credentials Preview */}
              {credentials.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FiAward className="text-green-500" />
                    Verified Credentials
                  </h3>
                  <div className="space-y-2">
                    {credentials.slice(0, 3).map((cred) => (
                      <div key={cred.credential_id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <FiCheckCircle className="text-green-500 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-gray-900">{cred.credential_name}</div>
                          <div className="text-sm text-gray-500">{cred.institution_name}</div>
                        </div>
                      </div>
                    ))}
                    {credentials.length > 3 && (
                      <div className="text-center text-sm text-gray-500 py-2">
                        +{credentials.length - 3} more credentials
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Occupations Preview */}
              {occupations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FiBriefcase className="text-blue-500" />
                    Occupations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {occupations.map((occ) => (
                      <span key={occ.occupation_id} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                        {occ.occupation_title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {credentials.length === 0 && occupations.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiUser className="text-gray-400" size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Your profile is empty</h3>
                  <p className="text-gray-500 mb-4">Add credentials and occupations to make your profile stand out</p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => navigate('/workpassport/credentials')}
                      className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                    >
                      Add Credentials
                    </button>
                    <button
                      onClick={() => navigate('/workpassport/occupations')}
                      className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Add Occupations
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 Tips to improve your profile</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Add a professional headline to describe what you do</li>
              <li>• Get your credentials verified by institutions for higher trust</li>
              <li>• Add multiple occupations to show your versatility</li>
              <li>• Share your profile link on LinkedIn for more visibility</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePreview;
