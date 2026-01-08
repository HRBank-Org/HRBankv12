import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { 
  Shield, Award, Briefcase, MapPin, Clock, Star, 
  CheckCircle, ExternalLink, Download, QrCode,
  Building2, Calendar, GraduationCap, Users
} from 'lucide-react';

const VerifiedCareerProfile = () => {
  const { profileCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    if (profileCode) {
      loadProfile();
    }
  }, [profileCode]);

  const loadProfile = async () => {
    try {
      const response = await api.get(`/api/career-profile/public/${profileCode}`);
      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err.response?.data?.detail || 'Profile not found');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getInitials = (name) => {
    if (!name) return 'HR';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to HR Bank
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          .print-section { break-inside: avoid; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" ref={printRef}>
        {/* Header */}
        <header className="bg-white shadow-sm no-print">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Verified Career Profile</h1>
                <p className="text-sm text-gray-500">Powered by HR Bank</p>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          {/* Profile Header Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6 print-section">
            {/* Gradient Banner */}
            <div className="h-32 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700"></div>
            
            <div className="px-8 pb-8 -mt-16">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
                {/* Avatar */}
                <div className="relative">
                  {profile.photo_url ? (
                    <img
                      src={profile.photo_url}
                      alt={profile.full_name}
                      className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                      {getInitials(profile.full_name)}
                    </div>
                  )}
                  {profile.summary?.is_blockchain_verified && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Name & Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-bold text-gray-900">{profile.full_name}</h2>
                    {profile.verified && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Verified
                      </span>
                    )}
                  </div>
                  
                  {profile.location && (
                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {[profile.location.city, profile.location.province, profile.location.country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}

                  {profile.member_since && (
                    <p className="text-sm text-gray-500">
                      HR Bank member since {new Date(profile.member_since).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* QR Code for Print */}
                <div className="hidden print:block text-center">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Scan to verify</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          {profile.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print-section">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{profile.summary.total_occupations}</p>
                    <p className="text-sm text-gray-500">Occupations</p>
                  </div>
                </div>
              </div>

              {profile.summary.years_of_experience !== null && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{profile.summary.years_of_experience}</p>
                      <p className="text-sm text-gray-500">Years Exp.</p>
                    </div>
                  </div>
                </div>
              )}

              {profile.summary.total_hours_worked !== null && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{profile.summary.total_hours_worked.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Hours Worked</p>
                    </div>
                  </div>
                </div>
              )}

              {profile.summary.average_rating !== null && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold text-gray-900">{profile.summary.average_rating}</p>
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      </div>
                      <p className="text-sm text-gray-500">Avg Rating</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Occupation Profiles */}
          {profile.occupation_profiles?.length > 0 && (
            <div className="space-y-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Career Profiles
              </h3>
              
              {profile.occupation_profiles.map((occ, index) => (
                <div key={occ.occupation_id || index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print-section">
                  {/* Occupation Header */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
                    <h4 className="text-xl font-bold text-white">{occ.occupation_title}</h4>
                    <p className="text-slate-300 text-sm">{occ.occupation_category}</p>
                  </div>

                  <div className="p-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {occ.years_of_experience !== undefined && (
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{occ.years_of_experience}</p>
                          <p className="text-xs text-gray-500">Years Exp.</p>
                        </div>
                      )}
                      {occ.total_hours_worked !== undefined && (
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{occ.total_hours_worked.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Hours Worked</p>
                        </div>
                      )}
                      {occ.skill_rating_avg && (
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-2xl font-bold text-gray-900">{occ.skill_rating_avg.toFixed(1)}</span>
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          </div>
                          <p className="text-xs text-gray-500">Rating ({occ.skill_rating_count || 0})</p>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {occ.skills?.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Skills</h5>
                        <div className="flex flex-wrap gap-2">
                          {occ.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Credentials */}
                    {occ.credentials?.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Verified Certifications
                        </h5>
                        <div className="space-y-2">
                          {occ.credentials.map((cred, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                              <div>
                                <p className="font-medium text-gray-900">{cred.credential_name}</p>
                                <p className="text-sm text-gray-600">{cred.institution_name}</p>
                              </div>
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Employment History */}
                    {occ.employment_history?.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Work Experience
                        </h5>
                        <div className="space-y-2">
                          {occ.employment_history.slice(0, 3).map((emp, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{emp.company_name}</p>
                                {emp.position_title && (
                                  <p className="text-sm text-gray-600">{emp.position_title}</p>
                                )}
                              </div>
                              <div className="text-right text-sm text-gray-500">
                                <p>{emp.total_shifts} shifts</p>
                                <p>{emp.total_hours} hours</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Blockchain Credentials */}
          {profile.blockchain_credentials?.length > 0 && (
            <div className="mb-6 print-section">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-green-600" />
                Blockchain Verified Credentials
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {profile.blockchain_credentials.map((cred, index) => (
                  <div key={cred.credential_id || index} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{cred.credential_name}</h4>
                        {cred.program_name && (
                          <p className="text-sm text-gray-600 truncate">{cred.program_name}</p>
                        )}
                        {cred.institution_name && (
                          <p className="text-sm text-gray-500 mt-1">{cred.institution_name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {cred.on_chain && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              On-Chain
                            </span>
                          )}
                          {cred.verification_url && (
                            <a
                              href={cred.verification_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline no-print"
                            >
                              Verify <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hire CTA */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-center text-white no-print">
            <h3 className="text-2xl font-bold mb-2">Interested in hiring {profile.full_name?.split(' ')[0]}?</h3>
            <p className="text-blue-100 mb-6">Create an employer account on HR Bank to connect with verified workforce</p>
            <Link
              to="/signup?type=employer"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              <Users className="w-5 h-5" />
              Create Employer Account
            </Link>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-gray-500">
            <p>Profile ID: {profile.profile_code}</p>
            <p className="mt-1">This profile is verified by HR Bank's blockchain credential system</p>
            <p className="mt-2">© {new Date().getFullYear()} HR Bank. All rights reserved.</p>
          </div>
        </main>
      </div>
    </>
  );
};

export default VerifiedCareerProfile;
