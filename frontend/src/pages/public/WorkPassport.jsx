import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { 
  Shield, Award, Briefcase, MapPin, Clock, Star, 
  CheckCircle, ExternalLink, Download, QrCode,
  Building2, Calendar, GraduationCap, Users, Stamp
} from 'lucide-react';

const WorkPassport = () => {
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
      setError(err.response?.data?.detail || 'WorkPassport™ not found');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading WorkPassport™...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">WorkPassport™ Not Found</h2>
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
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .no-print { 
            display: none !important; 
          }
          
          .print-section { 
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Remove dark background for print */
          .print-bg-white {
            background: white !important;
          }
          
          /* Watermark styling */
          .print-watermark {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            opacity: 0.08 !important;
            width: 400px !important;
            height: 400px !important;
            z-index: 0 !important;
            pointer-events: none !important;
          }
          
          /* Content styling for print */
          .print-content {
            position: relative !important;
            z-index: 1 !important;
            background: white !important;
            color: #1f2937 !important;
            padding: 20px !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          
          .print-content h1, .print-content h2, .print-content h3 {
            color: #1f2937 !important;
          }
          
          .print-content p, .print-content span {
            color: #374151 !important;
          }
          
          /* Page sizing */
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          
          /* Prevent orphan content */
          .credential-item, .experience-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
        
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 print-bg-white" ref={printRef}>
        {/* Print Watermark - Only shows when printing */}
        <img 
          src="/work-passport-seal.png" 
          alt="" 
          className="hidden print-only print-watermark"
          aria-hidden="true"
        />
        
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 no-print">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/work-passport-seal.png" 
                alt="Work Passport Seal" 
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-white">WorkPassport™</h1>
                <p className="text-sm text-slate-400">Verified by HR Bank</p>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8 print-content">
          {/* Passport Card Design */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-2xl overflow-hidden mb-6 print-section border border-slate-700 print:bg-white print:border-gray-300 print:shadow-none">
            {/* Gold Stripe */}
            <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 print:bg-amber-500"></div>
            
            {/* Header with Official Seal */}
            <div className="px-8 py-6 border-b border-slate-700 flex items-center justify-between print:border-gray-300">
              <div className="flex items-center gap-4">
                <img 
                  src="/work-passport-seal.png" 
                  alt="WorkPassport Official Seal" 
                  className="w-20 h-20 object-contain drop-shadow-lg"
                />
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-wide print:text-gray-900">WORKPASSPORT™</h2>
                  <p className="text-amber-400 text-sm font-medium print:text-amber-600">BLOCKCHAIN VERIFIED • HR BANK</p>
                  <p className="text-slate-500 text-xs mt-1 print:text-gray-500">Secured on Polygon Network</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm print:text-gray-500">Passport No.</p>
                <p className="text-white font-mono text-lg font-bold print:text-gray-900">{profile.profile_code}</p>
                <p className="text-green-400 text-xs mt-1 flex items-center justify-end gap-1 print:text-green-600">
                  <CheckCircle className="w-3 h-3" /> Authentic
                </p>
              </div>
            </div>

            {/* Main Content */}
            <div className="p-8 print:bg-white">
              <div className="flex flex-col md:flex-row items-start gap-8">
                {/* Photo Section */}
                <div className="flex-shrink-0 print-section">
                  <div className="relative">
                    {profile.photo_url ? (
                      <img
                        src={profile.photo_url.startsWith('http') ? profile.photo_url : `${process.env.REACT_APP_BACKEND_URL}${profile.photo_url}`}
                        alt={profile.full_name}
                        className="w-40 h-48 rounded-lg border-4 border-amber-500/30 shadow-lg object-cover print:border-amber-400"
                      />
                    ) : (
                      <div className="w-40 h-48 rounded-lg border-4 border-amber-500/30 shadow-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white text-4xl font-bold print:bg-gray-200 print:text-gray-700">
                        {getInitials(profile.full_name)}
                      </div>
                    )}
                    {profile.summary?.is_blockchain_verified && (
                      <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center border-4 border-slate-800 shadow-lg print:border-white">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Section */}
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="col-span-2">
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Full Name</p>
                      <h3 className="text-3xl font-bold text-white">{profile.full_name}</h3>
                    </div>

                    {/* Location */}
                    {profile.location && (
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Location</p>
                        <p className="text-white font-medium flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-amber-400" />
                          {[profile.location.city, profile.location.province, profile.location.country]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Member Since */}
                    {profile.member_since && (
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Member Since</p>
                        <p className="text-white font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-400" />
                          {new Date(profile.member_since).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    )}

                    {/* Status */}
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Status</p>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                        <CheckCircle className="w-4 h-4" />
                        Verified
                      </span>
                    </div>

                    {/* Credentials Count */}
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Verified Credentials</p>
                      <p className="text-white font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-400" />
                        {profile.summary?.verified_credentials || 0} On Blockchain
                      </p>
                    </div>
                  </div>
                </div>

                {/* QR Code for Print */}
                <div className="hidden print:block text-center bg-white p-3 rounded-lg">
                  <QrCode className="w-24 h-24 text-slate-800" />
                  <p className="text-xs text-slate-600 mt-1">Scan to verify</p>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            {profile.summary && (
              <div className="px-8 py-4 bg-slate-900/50 border-t border-slate-700">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-400">{profile.summary.total_occupations}</p>
                    <p className="text-xs text-slate-400 uppercase">Occupations</p>
                  </div>
                  {profile.summary.years_of_experience !== null && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-400">{profile.summary.years_of_experience}</p>
                      <p className="text-xs text-slate-400 uppercase">Years Exp.</p>
                    </div>
                  )}
                  {profile.summary.total_hours_worked !== null && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-400">{profile.summary.total_hours_worked.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 uppercase">Hours Worked</p>
                    </div>
                  )}
                  {profile.summary.average_rating !== null && (
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-2xl font-bold text-amber-400">{profile.summary.average_rating}</p>
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      </div>
                      <p className="text-xs text-slate-400 uppercase">Avg Rating</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security Verifications */}
            {profile.security_verifications && profile.security_verifications.length > 0 && (
              <div className="px-8 py-4 bg-slate-800/50 border-t border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-green-400" />
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Security Clearances</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.security_verifications.map((verification, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {verification.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Occupation Profiles */}
          {profile.occupation_profiles?.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-400" />
                Career Entries
              </h3>
              
              {profile.occupation_profiles.map((occ, index) => (
                <div key={occ.occupation_id || index} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden print-section">
                  {/* Occupation Header */}
                  <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 border-b border-slate-600">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-white">{occ.occupation_title}</h4>
                        <p className="text-slate-400 text-sm">{occ.occupation_category}</p>
                      </div>
                      {occ.skill_rating_avg && (
                        <div className="flex items-center gap-1 bg-amber-500/20 px-3 py-1 rounded-full">
                          <span className="text-amber-400 font-bold">{occ.skill_rating_avg.toFixed(1)}</span>
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {occ.years_of_experience !== undefined && (
                        <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                          <p className="text-2xl font-bold text-white">{occ.years_of_experience}</p>
                          <p className="text-xs text-slate-400">Years Exp.</p>
                        </div>
                      )}
                      {occ.total_hours_worked !== undefined && (
                        <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                          <p className="text-2xl font-bold text-white">{occ.total_hours_worked.toLocaleString()}</p>
                          <p className="text-xs text-slate-400">Hours Worked</p>
                        </div>
                      )}
                      {occ.skill_rating_count !== undefined && (
                        <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                          <p className="text-2xl font-bold text-white">{occ.skill_rating_count}</p>
                          <p className="text-xs text-slate-400">Ratings</p>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {occ.skills?.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-sm font-semibold text-slate-300 mb-2">Skills</h5>
                        <div className="flex flex-wrap gap-2">
                          {occ.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-sm font-medium"
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
                        <h5 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Verified Certifications
                        </h5>
                        <div className="space-y-2">
                          {occ.credentials.map((cred, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                              <div>
                                <p className="font-medium text-white">{cred.credential_name}</p>
                                <p className="text-sm text-slate-400">{cred.institution_name}</p>
                              </div>
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Employment History */}
                    {occ.employment_history?.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Work Experience
                        </h5>
                        <div className="space-y-2">
                          {occ.employment_history.slice(0, 3).map((emp, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                              <div>
                                <p className="font-medium text-white">{emp.company_name}</p>
                                {emp.position_title && (
                                  <p className="text-sm text-slate-400">{emp.position_title}</p>
                                )}
                              </div>
                              <div className="text-right text-sm text-slate-400">
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
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-green-400" />
                Blockchain Verified Credentials
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {profile.blockchain_credentials.map((cred, index) => (
                  <div key={cred.credential_id || index} className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-sm rounded-xl p-5 border border-green-500/30">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                        <GraduationCap className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{cred.credential_name}</h4>
                        {cred.program_name && (
                          <p className="text-sm text-slate-300 truncate">{cred.program_name}</p>
                        )}
                        {cred.institution_name && (
                          <p className="text-sm text-slate-400 mt-1">{cred.institution_name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          {cred.on_chain && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium border border-green-500/30">
                              <CheckCircle className="w-3 h-3" />
                              On-Chain
                            </span>
                          )}
                          {cred.verification_url && (
                            <a
                              href={cred.verification_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline no-print"
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
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-center no-print">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Interested in hiring {profile.full_name?.split(' ')[0]}?</h3>
            <p className="text-slate-800 mb-6">Create an employer account on HR Bank to connect with verified workforce</p>
            <Link
              to="/signup?type=employer"
              className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
            >
              <Users className="w-5 h-5" />
              Create Employer Account
            </Link>
          </div>

          {/* Footer with Trust Seal */}
          <div className="text-center mt-8 pb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/work-passport-seal.png" 
                alt="Work Passport Official Seal" 
                className="w-16 h-16 object-contain opacity-60"
              />
            </div>
            <p className="text-sm text-slate-400 font-medium">WorkPassport™ ID: {profile.profile_code}</p>
            <p className="mt-1 text-xs text-slate-500">Verified by HR Bank's blockchain credential system</p>
            <p className="mt-1 text-xs text-slate-500">Secured on Polygon Network • Immutable & Tamper-Proof</p>
            <p className="mt-3 text-xs text-slate-600">© {new Date().getFullYear()} HR Bank. All rights reserved.</p>
          </div>
        </main>
      </div>
    </>
  );
};

export default WorkPassport;
