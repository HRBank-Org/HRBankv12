import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { QRCodeSVG } from 'qrcode.react';

import { 
  Shield, Award, Briefcase, MapPin, Clock, Star, 
  CheckCircle, ExternalLink, Download, 
  Building2, Calendar, GraduationCap, Users, Stamp
} from 'lucide-react';

const WorkPassport = () => {
  const { t } = useLanguage();
  const { profileCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const printRef = useRef();

  const passportUrl = `${window.location.origin}/passport/${profileCode}`;

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
      setError(err.response?.data?.detail || 'WorkPassport&trade; not found');
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
          <p className="text-gray-300">Loading WorkPassport&trade;...</p>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">WorkPassport&trade; Not Found</h2>
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
      {/* Print Styles — transforms into a professional resume */}
      <style>{`
        @media print {
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            font-family: 'Georgia', 'Times New Roman', serif !important;
            font-size: 11pt !important;
            line-height: 1.45 !important;
            color: #1a1a1a !important;
          }

          @page {
            size: A4 portrait;
            margin: 16mm 18mm 14mm 18mm;
          }

          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-only-flex { display: flex !important; }
          .print-only-grid { display: grid !important; }

          .screen-passport { display: none !important; }

          .print-resume {
            position: static !important;
            width: auto !important;
            height: auto !important;
            overflow: visible !important;
            clip: auto !important;
            white-space: normal !important;
            display: block !important;
            background: white !important;
            color: #1a1a1a !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-resume * {
            color: #1a1a1a !important;
          }

          .resume-name {
            font-size: 22pt !important;
            font-weight: 700 !important;
            letter-spacing: 0.5px !important;
            color: #111 !important;
            margin: 0 !important;
            font-family: 'Georgia', serif !important;
          }

          .resume-subtitle {
            font-size: 10pt !important;
            color: #555 !important;
            margin-top: 3px !important;
            letter-spacing: 1.5px !important;
            text-transform: uppercase !important;
          }

          .resume-meta {
            font-size: 9pt !important;
            color: #444 !important;
          }

          .resume-hr {
            border: none !important;
            border-top: 2px solid #222 !important;
            margin: 10px 0 !important;
          }

          .resume-hr-thin {
            border: none !important;
            border-top: 0.5px solid #bbb !important;
            margin: 6px 0 !important;
          }

          .resume-section-title {
            font-size: 11pt !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 1.5px !important;
            color: #222 !important;
            margin-bottom: 6px !important;
            padding-bottom: 3px !important;
            border-bottom: 1px solid #333 !important;
          }

          .resume-entry {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 10px !important;
          }

          .resume-entry-title {
            font-size: 11pt !important;
            font-weight: 700 !important;
            color: #111 !important;
          }

          .resume-entry-sub {
            font-size: 9.5pt !important;
            color: #444 !important;
          }

          .resume-entry-detail {
            font-size: 9.5pt !important;
            color: #333 !important;
          }

          .resume-skill-tag {
            display: inline-block !important;
            font-size: 9pt !important;
            color: #333 !important;
            border: 0.5px solid #999 !important;
            border-radius: 3px !important;
            padding: 1px 7px !important;
            margin: 2px 3px 2px 0 !important;
          }

          .resume-cred-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 4px 0 !important;
            border-bottom: 0.5px dotted #ccc !important;
          }

          .resume-footer {
            margin-top: 20px !important;
            padding-top: 10px !important;
            border-top: 1px solid #ccc !important;
            text-align: center !important;
            font-size: 8pt !important;
            color: #888 !important;
          }

          .resume-qr-block {
            text-align: center !important;
          }

          .resume-qr-block svg {
            width: 72px !important;
            height: 72px !important;
          }

          .resume-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 0 !important;
            text-align: center !important;
            border: 0.5px solid #ccc !important;
            border-radius: 4px !important;
            overflow: hidden !important;
            margin: 8px 0 12px 0 !important;
          }

          .resume-stat-cell {
            padding: 6px 4px !important;
            border-right: 0.5px solid #ccc !important;
          }

          .resume-stat-cell:last-child {
            border-right: none !important;
          }

          .resume-stat-val {
            font-size: 14pt !important;
            font-weight: 700 !important;
            color: #111 !important;
          }

          .resume-stat-label {
            font-size: 7pt !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            color: #666 !important;
          }
        }

        @media screen {
          .print-only, .print-only-flex, .print-only-grid { display: none !important; }
          .print-resume {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            overflow: hidden !important;
            clip: rect(0,0,0,0) !important;
            white-space: nowrap !important;
          }
        }
      `}</style>

      {/* ============ SCREEN VERSION — WorkPassport Card ============ */}
      <div className="screen-passport" ref={printRef}>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
          {/* Header */}
          <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 no-print">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/work-passport-seal.png" alt="Work Passport Seal" className="w-12 h-12 object-contain" />
                <div>
                  <h1 className="text-lg font-bold text-white">WorkPassport&trade;</h1>
                  <p className="text-sm text-slate-400">Verified by HR Bank</p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                data-testid="print-resume-btn"
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Print Resume / Save PDF</span>
              </button>
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-4 py-8">
            {/* Passport Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-2xl overflow-hidden mb-6 border border-slate-700">
              <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"></div>

              {/* Card Header */}
              <div className="px-8 py-6 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src="/work-passport-seal.png" alt="WorkPassport Official Seal" className="w-20 h-20 object-contain drop-shadow-lg" />
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-wide">WorkPassport&trade;</h2>
                    <p className="text-amber-400 text-sm font-medium">BLOCKCHAIN VERIFIED &bull; HR BANK</p>
                    <p className="text-slate-500 text-xs mt-1">Secured on Polygon Network</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-sm">Passport No.</p>
                  <p className="text-white font-mono text-lg font-bold">{profile.profile_code}</p>
                  <p className="text-green-400 text-xs mt-1 flex items-center justify-end gap-1">
                    <CheckCircle className="w-3 h-3" /> Authentic
                  </p>
                </div>
              </div>

              {/* Main Content */}
              <div className="p-8">
                <div className="flex flex-col md:flex-row items-start gap-8">
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    <div className="relative">
                      {profile.photo_url ? (
                        <img
                          src={profile.photo_url.startsWith('http') ? profile.photo_url : `${process.env.REACT_APP_BACKEND_URL}${profile.photo_url}`}
                          alt={profile.full_name}
                          className="w-40 h-48 rounded-lg border-4 border-amber-500/30 shadow-lg object-cover"
                        />
                      ) : (
                        <div className="w-40 h-48 rounded-lg border-4 border-amber-500/30 shadow-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white text-4xl font-bold">
                          {getInitials(profile.full_name)}
                        </div>
                      )}
                      {profile.summary?.is_blockchain_verified && (
                        <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center border-4 border-slate-800 shadow-lg">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2">
                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Full Name</p>
                        <h3 className="text-3xl font-bold text-white">{profile.full_name}</h3>
                      </div>
                      {profile.location && (
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Location</p>
                          <p className="text-white font-medium flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-amber-400" />
                            {[profile.location.city, profile.location.province, profile.location.country].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}
                      {profile.member_since && (
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Member Since</p>
                          <p className="text-white font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-400" />
                            {new Date(profile.member_since).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{t("pages.common.status")}</p>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                          <CheckCircle className="w-4 h-4" /> Verified
                        </span>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Verified Credentials</p>
                        <p className="text-white font-medium flex items-center gap-2">
                          <Shield className="w-4 h-4 text-amber-400" />
                          {profile.summary?.verified_credentials || 0} On Blockchain
                        </p>
                      </div>
                    </div>
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
                      <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
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
                  <div key={occ.occupation_id || index} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
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
                      {occ.skills?.length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-sm font-semibold text-slate-300 mb-2">Skills</h5>
                          <div className="flex flex-wrap gap-2">
                            {occ.skills.map((skill, idx) => (
                              <span key={idx} className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-sm font-medium">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {occ.credentials?.length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                            <Award className="w-4 h-4" /> Verified Certifications
                          </h5>
                          <div className="space-y-2">
                            {occ.credentials.map((cred, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                                <div className="flex items-center gap-3">
                                  <img src="/credential-verified-seal.png" alt="Verified" className="w-10 h-10 object-contain" />
                                  <div>
                                    <p className="font-medium text-white">{cred.credential_name}</p>
                                    <p className="text-sm text-slate-400">{cred.institution_name}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-green-400 font-medium">BLOCKCHAIN</span>
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {occ.employment_history?.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> Work Experience
                          </h5>
                          <div className="space-y-2">
                            {occ.employment_history.slice(0, 3).map((emp, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                <div>
                                  <p className="font-medium text-white">{emp.company_name}</p>
                                  {emp.position_title && <p className="text-sm text-slate-400">{emp.position_title}</p>}
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
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-green-400" />
                  Blockchain Verified Credentials
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {profile.blockchain_credentials.map((cred, index) => (
                    <div key={cred.credential_id || index} className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-sm rounded-xl p-5 border border-green-500/30">
                      <div className="flex items-start gap-4">
                        <img src="/credential-verified-seal.png" alt="Blockchain Verified" className="w-14 h-14 object-contain flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white truncate">{cred.credential_name}</h4>
                          {cred.program_name && <p className="text-sm text-slate-300 truncate">{cred.program_name}</p>}
                          {cred.institution_name && <p className="text-sm text-slate-400 mt-1">{cred.institution_name}</p>}
                          <div className="flex items-center gap-2 mt-3">
                            {cred.on_chain && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium border border-green-500/30">
                                <CheckCircle className="w-3 h-3" /> On-Chain
                              </span>
                            )}
                            {cred.verification_url && (
                              <a href={cred.verification_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline">
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
              <Link to="/signup?type=employer" className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors">
                <Users className="w-5 h-5" /> Create Employer Account
              </Link>
            </div>

            {/* Screen Footer */}
            <div className="text-center mt-8 pb-8">
              <div className="flex justify-center mb-4">
                <img src="/work-passport-seal.png" alt="WorkPassport Official Seal" className="w-16 h-16 object-contain opacity-60" />
              </div>
              <p className="text-sm text-slate-400 font-medium">WorkPassport&trade; ID: {profile.profile_code}</p>
              <p className="mt-1 text-xs text-slate-500">Verified by HR Bank's blockchain credential system</p>
              <p className="mt-1 text-xs text-slate-500">Secured on Polygon Network</p>
              <p className="mt-3 text-xs text-slate-600">&copy; {new Date().getFullYear()} HR Bank. All rights reserved.</p>
            </div>
          </main>
        </div>
      </div>

      {/* ============ PRINT VERSION — Professional Resume ============ */}
      <div className="print-resume" data-testid="print-resume">

        {/* Resume Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h1 className="resume-name">{profile.full_name}</h1>
            <p className="resume-subtitle">
              {profile.occupation_profiles?.length > 0
                ? profile.occupation_profiles.map(o => o.occupation_title).join(' | ')
                : 'Verified Professional'}
            </p>
            <div className="resume-meta" style={{ marginTop: '6px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {profile.location && (
                <span>{[profile.location.city, profile.location.province, profile.location.country].filter(Boolean).join(', ')}</span>
              )}
              {profile.member_since && (
                <span>Member since {new Date(profile.member_since).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}</span>
              )}
              <span>WorkPassport&trade; {profile.profile_code}</span>
            </div>
          </div>
          <div className="resume-qr-block" style={{ marginLeft: '20px', flexShrink: 0 }}>
            <QRCodeSVG value={passportUrl} size={72} level="M" />
            <p style={{ fontSize: '7pt', color: '#888', marginTop: '2px' }}>Scan to verify</p>
          </div>
        </div>

        <hr className="resume-hr" />

        {/* Summary Stats */}
        {profile.summary && (
          <div className="resume-stats-grid">
            <div className="resume-stat-cell">
              <div className="resume-stat-val">{profile.summary.total_occupations}</div>
              <div className="resume-stat-label">Occupations</div>
            </div>
            {profile.summary.years_of_experience !== null && (
              <div className="resume-stat-cell">
                <div className="resume-stat-val">{profile.summary.years_of_experience}</div>
                <div className="resume-stat-label">Years Experience</div>
              </div>
            )}
            {profile.summary.total_hours_worked !== null && (
              <div className="resume-stat-cell">
                <div className="resume-stat-val">{profile.summary.total_hours_worked?.toLocaleString()}</div>
                <div className="resume-stat-label">Hours Worked</div>
              </div>
            )}
            {profile.summary.average_rating !== null && (
              <div className="resume-stat-cell">
                <div className="resume-stat-val">{profile.summary.average_rating} / 5</div>
                <div className="resume-stat-label">Avg Rating</div>
              </div>
            )}
          </div>
        )}

        {/* Security Clearances */}
        {profile.security_verifications?.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div className="resume-section-title">Security Clearances</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.security_verifications.map((v, i) => (
                <span key={i} className="resume-skill-tag">{v.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* Career Entries (Occupations + Experience) */}
        {profile.occupation_profiles?.length > 0 && (
          <div>
            <div className="resume-section-title">Professional Experience</div>
            {profile.occupation_profiles.map((occ, index) => (
              <div key={occ.occupation_id || index} className="resume-entry">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="resume-entry-title">{occ.occupation_title}</span>
                  <span className="resume-entry-sub">
                    {[
                      occ.years_of_experience !== undefined && `${occ.years_of_experience} yrs`,
                      occ.total_hours_worked !== undefined && `${occ.total_hours_worked.toLocaleString()} hrs`,
                      occ.skill_rating_avg && `${occ.skill_rating_avg.toFixed(1)}/5 rating`
                    ].filter(Boolean).join(' \u00b7 ')}
                  </span>
                </div>
                {occ.occupation_category && (
                  <p className="resume-entry-sub" style={{ marginTop: '1px' }}>{occ.occupation_category}</p>
                )}

                {/* Skills inline */}
                {occ.skills?.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    {occ.skills.map((skill, idx) => (
                      <span key={idx} className="resume-skill-tag">{skill}</span>
                    ))}
                  </div>
                )}

                {/* Credentials under this occupation */}
                {occ.credentials?.length > 0 && (
                  <div style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid #ddd' }}>
                    {occ.credentials.map((cred, idx) => (
                      <div key={idx} className="resume-cred-row">
                        <span className="resume-entry-detail">{cred.credential_name}</span>
                        <span className="resume-entry-sub">{cred.institution_name} &mdash; Verified</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Employment history under this occupation */}
                {occ.employment_history?.length > 0 && (
                  <div style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid #ddd' }}>
                    {occ.employment_history.slice(0, 5).map((emp, idx) => (
                      <div key={idx} className="resume-cred-row">
                        <span className="resume-entry-detail">
                          {emp.company_name}{emp.position_title ? ` \u2014 ${emp.position_title}` : ''}
                        </span>
                        <span className="resume-entry-sub">
                          {emp.total_shifts} shifts &middot; {emp.total_hours} hrs
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {index < profile.occupation_profiles.length - 1 && <hr className="resume-hr-thin" />}
              </div>
            ))}
          </div>
        )}

        {/* Blockchain Credentials */}
        {profile.blockchain_credentials?.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div className="resume-section-title">Verified Credentials</div>
            {profile.blockchain_credentials.map((cred, index) => (
              <div key={cred.credential_id || index} className="resume-cred-row resume-entry">
                <div>
                  <span className="resume-entry-detail" style={{ fontWeight: 600 }}>{cred.credential_name}</span>
                  {cred.program_name && <span className="resume-entry-sub"> &mdash; {cred.program_name}</span>}
                </div>
                <span className="resume-entry-sub">
                  {cred.institution_name}{cred.on_chain ? ' \u00b7 Blockchain Verified' : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="resume-footer">
          <p>This resume was generated from a blockchain-verified WorkPassport&trade; by HR Bank</p>
          <p style={{ marginTop: '2px' }}>Verify at: {passportUrl}</p>
          <p style={{ marginTop: '2px' }}>&copy; {new Date().getFullYear()} HR Bank &mdash; hrbank.ca</p>
        </div>
      </div>
    </>
  );
};

export default WorkPassport;
