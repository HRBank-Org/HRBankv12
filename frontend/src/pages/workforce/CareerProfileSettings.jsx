import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import api from '../../utils/api';
import {
  Shield, Eye, EyeOff, QrCode, Link2, Copy, Check,
  RefreshCw, ExternalLink, Download, Share2, Lock,
  User, MapPin, Briefcase, Clock, Star, Award, Building2
} from 'lucide-react';

const CareerProfileSettings = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/api/career-profile/my-settings');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/api/career-profile/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const updatePrivacy = async (key, value) => {
    setSaving(true);
    try {
      const response = await api.patch('/api/career-profile/my-settings', {
        [key]: value
      });
      if (response.data.success) {
        setSettings(prev => ({
          ...prev,
          privacy: {
            ...prev.privacy,
            [key]: value
          }
        }));
      }
    } catch (error) {
      console.error('Failed to update privacy:', error);
    } finally {
      setSaving(false);
    }
  };

  const regenerateCode = async () => {
    if (!window.confirm('This will invalidate all existing links. Are you sure?')) {
      return;
    }
    setRegenerating(true);
    try {
      const response = await api.post('/api/career-profile/regenerate-code');
      if (response.data.success) {
        setSettings(prev => ({
          ...prev,
          profile_code: response.data.data.profile_code,
          profile_url: response.data.data.profile_url,
          qr_code: response.data.data.qr_code
        }));
      }
    } catch (error) {
      console.error('Failed to regenerate code:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(settings.profile_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Verified Career Profile',
          text: 'Check out my verified career profile on HR Bank',
          url: settings.profile_url
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      copyLink();
    }
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.download = 'career-profile-qr.png';
    link.href = settings.qr_code;
    link.click();
  };

  const privacyOptions = [
    { key: 'show_full_name', label: 'Full Name', description: 'Show your complete name', icon: User },
    { key: 'show_photo', label: 'Profile Photo', description: 'Display your profile picture', icon: User },
    { key: 'show_location', label: 'Location', description: 'City, Province, Country only', icon: MapPin },
    { key: 'show_occupation_profiles', label: 'Career Profiles', description: 'Your occupation profiles', icon: Briefcase },
    { key: 'show_experience', label: 'Years of Experience', description: 'Experience duration', icon: Clock },
    { key: 'show_hours_worked', label: 'Hours Worked', description: 'Total hours tracked', icon: Clock },
    { key: 'show_ratings', label: 'Skill Ratings', description: 'Performance ratings', icon: Star },
    { key: 'show_skills', label: 'Skills', description: 'Listed skills', icon: Award },
    { key: 'show_credentials', label: 'Credentials', description: 'Verified certifications', icon: Shield },
    { key: 'show_employment_history', label: 'Work History', description: 'Employment records', icon: Building2 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkforceHeader />
      <WorkforceSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Verified Career Profile</h1>
          <p className="text-gray-600">Share your professional profile with employers outside HR Bank</p>
        </div>

        <div className="p-8 max-w-6xl">
          {/* Share Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              {/* QR Code */}
              <div className="flex-shrink-0">
                <div className="bg-white p-3 rounded-xl shadow-lg">
                  {settings?.qr_code && (
                    <img src={settings.qr_code} alt="Profile QR Code" className="w-40 h-40" />
                  )}
                </div>
                <button
                  onClick={downloadQR}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download QR
                </button>
              </div>

              {/* Share Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">Share Your Profile</h2>
                <p className="text-blue-100 mb-4">
                  External employers can view your verified career profile by scanning the QR code or visiting the link below.
                </p>

                {/* URL Display */}
                <div className="bg-white/10 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-200 mb-1">Profile URL</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-white font-mono text-sm break-all">
                      {settings?.profile_url}
                    </code>
                    <button
                      onClick={copyLink}
                      className="flex-shrink-0 p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                      title="Copy link"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <a
                    href={settings?.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Preview Profile
                  </a>
                  <button
                    onClick={shareProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg font-medium hover:bg-white/30 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={regenerateCode}
                    disabled={regenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                    New Code
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_views}</p>
                    <p className="text-sm text-gray-500">Total Views</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.views_this_month}</p>
                    <p className="text-sm text-gray-500">This Month</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.views_this_week}</p>
                    <p className="text-sm text-gray-500">This Week</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">Choose what information to display on your public profile</p>
            </div>

            <div className="p-6">
              {/* Profile Visibility */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Profile Visibility</h4>
                <div className="flex gap-3">
                  {['public', 'link_only', 'private'].map((visibility) => (
                    <button
                      key={visibility}
                      onClick={() => updatePrivacy('profile_visibility', visibility)}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        settings?.privacy?.profile_visibility === visibility
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {visibility === 'public' && <Eye className="w-5 h-5" />}
                        {visibility === 'link_only' && <Link2 className="w-5 h-5" />}
                        {visibility === 'private' && <EyeOff className="w-5 h-5" />}
                      </div>
                      <p className="font-medium capitalize">{visibility.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {visibility === 'public' && 'Anyone can view'}
                        {visibility === 'link_only' && 'Only via link/QR'}
                        {visibility === 'private' && 'Hidden from all'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Toggles */}
              <h4 className="font-medium text-gray-900 mb-4">Section Visibility</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {privacyOptions.map((option) => {
                  const Icon = option.icon;
                  const isEnabled = settings?.privacy?.[option.key] !== false;
                  
                  return (
                    <div
                      key={option.key}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                        isEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isEnabled ? 'bg-green-100' : 'bg-gray-200'
                        }`}>
                          <Icon className={`w-5 h-5 ${isEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{option.label}</p>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updatePrivacy(option.key, !isEnabled)}
                        disabled={saving}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          isEnabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            isEnabled ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Privacy Protected:</strong> Your email, phone number, and full address are NEVER shared on your public profile. 
                External employers can only see your city, province, and country. They must create an HR Bank employer account to connect with you.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerProfileSettings;
