import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  Globe,
  Award,
  Shield,
  CheckCircle,
  Calendar,
  ExternalLink,
  Linkedin,
  Link2,
  Loader2,
  AlertCircle,
  Building2,
  Copy
} from 'lucide-react';

const PublicProfile = () => {
  const { t } = useLanguage();
  const { shareToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [shareToken]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/workpassport/public/${shareToken}`);
      if (res.data.success) {
        setProfile(res.data.data.profile);
        setCredentials(res.data.data.credentials);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Profile not found');
    } finally {
      setLoading(false);
    }
  };

  const copyVerificationLink = (credentialId) => {
    const url = `${window.location.origin}/api/workpassport/verify/${profile.passport_id}/${credentialId}`;
    navigator.clipboard.writeText(url);
    setCopied(credentialId);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/" className="text-blue-600 hover:underline">Go to homepage</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <nav className="px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo192.png" alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <span className="font-bold text-xl text-white">WorkPassport™</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-sm">Powered by</span>
            <Link to="/" className="text-white hover:text-blue-400">HR Bank</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-4xl font-bold">
                {profile?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{profile?.full_name}</h1>
                {profile?.headline && (
                  <p className="text-white/80 text-lg mt-1">{profile.headline}</p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1 text-white/70">
                    <Globe className="w-4 h-4" />
                    {profile?.city ? `${profile.city}, ` : ''}{profile?.country}
                  </span>
                  <span className="text-white/50 font-mono text-sm">{profile?.passport_id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 border-b">
            <div className="p-6 text-center border-r">
              <p className="text-3xl font-bold text-blue-600">{credentials.length}</p>
              <p className="text-sm text-gray-500">Verified Credentials</p>
            </div>
            <div className="p-6 text-center border-r">
              <p className="text-3xl font-bold text-gray-900">{profile?.profile_views || 0}</p>
              <p className="text-sm text-gray-500">Profile Views</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-3xl font-bold text-green-600">{profile?.credential_verifications || 0}</p>
              <p className="text-sm text-gray-500">Verifications</p>
            </div>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
              <p className="text-gray-600">{profile.bio}</p>
            </div>
          )}

          {/* Skills */}
          {profile?.skills?.length > 0 && (
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verified Credentials */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Verified Credentials
            </h2>

            {credentials.length === 0 ? (
              <div className="text-center py-8">
                <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No verified credentials yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {credentials.map(cred => (
                  <div key={cred.credential_id} className="border rounded-xl p-4 hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{cred.credential_name}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {cred.institution_name}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Issued: {cred.issue_date}
                            </span>
                            {cred.expiry_date && (
                              <span>Expires: {cred.expiry_date}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          <Shield className="w-3 h-3" />
                          Verified
                        </span>
                        {cred.blockchain_hash && (
                          <span className="text-xs text-gray-400 font-mono">
                            {cred.blockchain_hash.slice(0, 12)}...
                          </span>
                        )}
                        <button
                          onClick={() => copyVerificationLink(cred.credential_id)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          {copied === cred.credential_id ? (
                            <>Copied!</>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy verification link
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          {(profile?.linkedin_url || profile?.portfolio_url) && (
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center gap-4">
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#0077b5] text-white rounded-lg text-sm hover:opacity-90"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
                {profile.portfolio_url && (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:opacity-90"
                  >
                    <Link2 className="w-4 h-4" />
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="mt-8 text-center">
          <p className="text-white/50 text-sm mb-3">
            Want your own verified credential passport?
          </p>
          <Link
            to="/workpassport/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Create Your WorkPassport
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
