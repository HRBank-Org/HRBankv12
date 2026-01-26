import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { 
  FiCheck, 
  FiX, 
  FiRefreshCw, 
  FiBriefcase, 
  FiBook, 
  FiAward,
  FiUser
} from 'react-icons/fi';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Official LinkedIn Logo SVG
const LinkedInLogo = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill={color}
    className={className}
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const LinkedInProfileCard = ({ onImportComplete }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [linkedinData, setLinkedinData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    checkLinkedInConnection();
  }, []);

  const checkLinkedInConnection = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/linkedin/profile', {
        headers: { 'X-User-ID': user.user_id }
      });
      
      if (response.data.success) {
        setLinkedinData(response.data.data);
      }
    } catch (err) {
      // Not connected - that's okay
      setLinkedinData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const redirectAfter = window.location.pathname;
    window.location.href = `${API_URL}/api/linkedin/authorize?redirect_after=${encodeURIComponent(redirectAfter)}`;
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your LinkedIn account?')) return;
    
    try {
      await api.delete('/api/linkedin/disconnect', {
        headers: { 'X-User-ID': user.user_id }
      });
      setLinkedinData(null);
    } catch (err) {
      setError('Failed to disconnect LinkedIn');
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);
      
      const response = await api.post('/api/linkedin/import', {
        import_work_experience: true,
        import_education: true,
        import_skills: true,
        import_certifications: true
      }, {
        headers: { 'X-User-ID': user.user_id }
      });

      if (response.data.success) {
        setImportSuccess(true);
        if (onImportComplete) {
          onImportComplete(response.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to import profile');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-48 mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#0A66C2] p-4 text-white">
        <div className="flex items-center gap-3">
          <LinkedInLogo className="w-6 h-6" color="white" />
          <div>
            <h3 className="font-semibold">LinkedIn Integration</h3>
            <p className="text-sm text-white/80">Import your professional profile</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <FiX />
            {error}
          </div>
        )}

        {importSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <FiCheck />
            Profile imported successfully!
          </div>
        )}

        {linkedinData?.connected ? (
          /* Connected State */
          <div className="space-y-4">
            {/* Profile Preview */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              {linkedinData.picture ? (
                <img 
                  src={linkedinData.picture} 
                  alt="LinkedIn Profile"
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 bg-[#0A66C2] rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {linkedinData.first_name?.charAt(0) || 'L'}
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">
                  {linkedinData.first_name} {linkedinData.last_name}
                </h4>
                <p className="text-sm text-gray-600">{linkedinData.email}</p>
                {linkedinData.headline && (
                  <p className="text-xs text-gray-500 mt-1">{linkedinData.headline}</p>
                )}
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <FiCheck size={16} />
                Connected
              </div>
            </div>

            {/* Import Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">What gets imported:</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiUser className="text-[#0A66C2]" />
                  <span>Profile Info</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiBriefcase className="text-[#0A66C2]" />
                  <span>Work Experience</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiBook className="text-[#0A66C2]" />
                  <span>Education</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiAward className="text-[#0A66C2]" />
                  <span>Skills</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] transition-colors disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FiRefreshCw />
                    Sync Profile
                  </>
                )}
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Disconnect
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Last synced: {linkedinData.imported_at ? new Date(linkedinData.imported_at).toLocaleDateString() : 'Never'}
            </p>
          </div>
        ) : (
          /* Not Connected State */
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-[#0A66C2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <LinkedInLogo className="w-8 h-8" color="#0A66C2" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Connect Your LinkedIn</h4>
            <p className="text-sm text-gray-600 mb-4">
              Import your work history, education, and skills with one click.
            </p>
            <button
              onClick={handleConnect}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] transition-colors"
            >
              <LinkedInLogo className="w-5 h-5" color="white" />
              Connect LinkedIn
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkedInProfileCard;
