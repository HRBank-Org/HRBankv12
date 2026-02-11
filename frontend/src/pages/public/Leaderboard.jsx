import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  Trophy, Medal, Building2, Users, FileCheck,
  MapPin, TrendingUp, Search, Mail, CheckCircle,
  Globe, Star, ArrowRight, Sparkles, Zap, Target
} from 'lucide-react';
import { LOGOS } from '../../utils/logoUtils';
import LanguageSelector from '../../components/common/LanguageSelector';
import LoginModal from '../../components/auth/LoginModal';

const Leaderboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [allInstitutions, setAllInstitutions] = useState([]);
  const [provinceLeaderboard, setProvinceLeaderboard] = useState([]);
  const [regionData, setRegionData] = useState(null);
  const [selectedRegionProvince, setSelectedRegionProvince] = useState('ON');
  const [stats, setStats] = useState(null);
  const [directoryStats, setDirectoryStats] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [activeTab, setActiveTab] = useState('institutions');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDirectory, setShowDirectory] = useState(false);
  const [inviteModal, setInviteModal] = useState(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedProvince, selectedPeriod]);

  useEffect(() => {
    if (showDirectory || searchQuery) {
      loadDirectoryData();
    }
  }, [showDirectory, searchQuery, selectedProvince]);

  useEffect(() => {
    if (activeTab === 'regions') {
      loadRegionData();
    }
  }, [activeTab, selectedRegionProvince]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (selectedProvince) params.append('province', selectedProvince);
      params.append('period', selectedPeriod);
      params.append('limit', '50');

      const [leaderboardRes, provinceRes, statsRes, dirStatsRes] = await Promise.all([
        api.get(`/api/leaderboard/institutions?${params}`),
        api.get(`/api/leaderboard/provinces?period=${selectedPeriod}`),
        api.get('/api/leaderboard/stats'),
        api.get('/api/institution-directory/stats').catch(() => ({ data: { success: false } }))
      ]);

      if (leaderboardRes.data.success) {
        setLeaderboard(leaderboardRes.data.data.leaderboard);
        setProvinces(leaderboardRes.data.data.filters.provinces);
      }

      if (provinceRes.data.success) {
        setProvinceLeaderboard(provinceRes.data.data.leaderboard);
      }

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      if (dirStatsRes.data.success) {
        setDirectoryStats(dirStatsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegionData = async () => {
    try {
      const res = await api.get(`/api/leaderboard/regions?province=${selectedRegionProvince}`);
      if (res.data.success) {
        setRegionData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load region data:', error);
    }
  };

  const loadDirectoryData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProvince) params.append('province', selectedProvince);
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '200');
      params.append('include_partners', 'true');

      const res = await api.get(`/api/institution-directory/all?${params}`);
      if (res.data.success) {
        // Sort: non-partners with requests first, then non-partners, then partners
        const sorted = [...res.data.data.institutions].sort((a, b) => {
          // Partners go to the end
          if (a.is_partner !== b.is_partner) {
            return a.is_partner ? 1 : -1;
          }
          // Among non-partners, sort by invite requests
          if (!a.is_partner && !b.is_partner) {
            return (b.invite_requests || 0) - (a.invite_requests || 0);
          }
          // Among partners, sort by credentials issued
          return (b.credentials_issued || 0) - (a.credentials_issued || 0);
        });
        setAllInstitutions(sorted);
      }
    } catch (error) {
      console.error('Failed to load directory:', error);
    }
  };

  const handleInviteRequest = async () => {
    if (!inviteModal) return;
    
    setInviteSubmitting(true);
    try {
      const res = await api.post('/api/institution-directory/invite-request', {
        institution_id: inviteModal.institution_id,
        message: inviteMessage
      });
      
      if (res.data.success) {
        setInviteSuccess(res.data.message);
        setTimeout(() => {
          setInviteModal(null);
          setInviteMessage('');
          setInviteSuccess(null);
          loadDirectoryData(); // Refresh counts
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit invite request:', error);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Fixed Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img 
                src={LOGOS.master} 
                alt="HR Bank"
                className="h-10 w-auto"
              />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-white/70 hover:text-white font-medium">
                WorkPassport™
              </Link>
              <Link to="/institutions" className="text-white/70 hover:text-white font-medium">
                Institutions
              </Link>
              <Link to="/leaderboard" className="text-white font-semibold">
                Leaderboard
              </Link>
              <Link to="/employers" className="text-white/70 hover:text-white font-medium">
                Employers <span className="text-orange-400 text-xs">(Beta)</span>
              </Link>
              <Link to="/jobs" className="text-white/70 hover:text-white font-medium">
                Jobs
              </Link>
            </div>
            <Link 
              to="/" 
              className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <div className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-full text-yellow-300 text-sm mb-4">
              <Trophy className="w-4 h-4" />
              <span>Institution Leaderboard</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Leading the Way in
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> Verified Credentials</span>
            </h1>
            <p className="text-lg text-purple-200 max-w-2xl mx-auto">
              See which institutions are leading the digital credential revolution. 
              Blockchain-verified achievements recognized across Canada.
            </p>
          </div>

          {/* Platform Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl md:text-3xl font-bold text-white">{stats?.total_credentials_issued?.toLocaleString() || 0}</p>
              <p className="text-purple-300 text-xs md:text-sm">Credentials Issued</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl md:text-3xl font-bold text-white">{stats?.total_institutions?.toLocaleString() || 0}</p>
              <p className="text-purple-300 text-xs md:text-sm">Active Partners</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl md:text-3xl font-bold text-white">{directoryStats?.total_in_directory?.toLocaleString() || '1,800+'}</p>
              <p className="text-purple-300 text-xs md:text-sm">Institutions Listed</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl md:text-3xl font-bold text-white">{stats?.total_work_passports?.toLocaleString() || 0}</p>
              <p className="text-purple-300 text-xs md:text-sm">WorkPassport™s</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10 col-span-2 md:col-span-1">
              <p className="text-2xl md:text-3xl font-bold text-white">{stats?.credentials_last_30_days?.toLocaleString() || 0}</p>
              <p className="text-purple-300 text-xs md:text-sm">Last 30 Days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-800/50 border-y border-white/10 sticky top-16 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search your school..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) setShowDirectory(true);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setActiveTab('institutions'); setShowDirectory(false); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'institutions' && !showDirectory
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="tab-top-ranked"
              >
                <Trophy className="w-4 h-4 inline mr-1" />
                Top Ranked
              </button>
              <button
                onClick={() => setShowDirectory(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  showDirectory
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="tab-all-institutions"
              >
                <Building2 className="w-4 h-4 inline mr-1" />
                All Institutions
              </button>
              <button
                onClick={() => { setActiveTab('regions'); setShowDirectory(false); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'regions' && !showDirectory
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="tab-regions"
              >
                <Target className="w-4 h-4 inline mr-1" />
                Regions
              </button>
              <button
                onClick={() => { setActiveTab('provinces'); setShowDirectory(false); }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'provinces' && !showDirectory
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="tab-provinces"
              >
                <MapPin className="w-4 h-4 inline mr-1" />
                By Province
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              {activeTab === 'regions' ? (
                <select
                  value={selectedRegionProvince}
                  onChange={(e) => setSelectedRegionProvince(e.target.value)}
                  className="px-3 py-2 bg-slate-700 text-white text-sm rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500"
                  data-testid="region-province-select"
                >
                  <option value="ON">Ontario</option>
                  <option value="BC">British Columbia</option>
                  <option value="AB">Alberta</option>
                  <option value="QC">Quebec</option>
                </select>
              ) : (
                <>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    className="px-3 py-2 bg-slate-700 text-white text-sm rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Provinces</option>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                  {!showDirectory && activeTab !== 'regions' && (
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="px-3 py-2 bg-slate-700 text-white text-sm rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Time</option>
                      <option value="year">This Year</option>
                      <option value="month">This Month</option>
                      <option value="week">This Week</option>
                    </select>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {showDirectory || searchQuery ? (
          /* Directory View - All Institutions */
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'All Canadian Institutions'}
              </h2>
              <p className="text-gray-400 text-sm">
                {allInstitutions.length} institutions found
              </p>
            </div>

            <div className="grid gap-4">
              {allInstitutions.map((inst, idx) => (
                <div 
                  key={inst.institution_id || idx}
                  className={`bg-slate-800/50 rounded-xl p-4 border ${
                    inst.is_partner ? 'border-green-500/30' : 'border-slate-700'
                  } hover:border-purple-500/50 transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        inst.is_partner ? 'bg-green-500/20' : 'bg-slate-700'
                      }`}>
                        {inst.logo_url ? (
                          <img src={inst.logo_url} alt="" className="w-10 h-10 rounded" />
                        ) : (
                          <Building2 className={`w-6 h-6 ${inst.is_partner ? 'text-green-400' : 'text-gray-500'}`} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold">{inst.institution_name}</h3>
                          {inst.is_partner && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Verified Partner
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {inst.city ? `${inst.city}, ` : ''}{inst.province_name || inst.province}
                          </span>
                          <span className="capitalize">{inst.institution_type?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {inst.is_partner ? (
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">{inst.credentials_issued}</p>
                          <p className="text-xs text-gray-400">credentials issued</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {inst.invite_requests > 0 && (
                            <div className="text-right">
                              <p className="text-lg font-bold text-purple-400">{inst.invite_requests}</p>
                              <p className="text-xs text-gray-400">requests</p>
                            </div>
                          )}
                          <button
                            onClick={() => setInviteModal(inst)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Mail className="w-4 h-4" />
                            Request to Join
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {allInstitutions.length === 0 && (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No institutions found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'institutions' ? (
          /* Institution Leaderboard */
          <>
            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="flex items-end justify-center gap-4 mb-12">
                {/* 2nd Place */}
                <div className="w-48 md:w-64 bg-gradient-to-b from-slate-700 to-slate-800 rounded-t-xl p-4 md:p-6 text-center border border-slate-600">
                  <div className="w-14 h-14 mx-auto mb-3 bg-gray-400/20 rounded-full flex items-center justify-center">
                    {leaderboard[1].logo_url ? (
                      <img src={leaderboard[1].logo_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <Building2 className="w-7 h-7 text-gray-400" />
                    )}
                  </div>
                  <Medal className="w-7 h-7 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-white font-bold text-sm truncate">{leaderboard[1].institution_name}</h3>
                  <p className="text-gray-400 text-xs">{leaderboard[1].province_name}</p>
                  <p className="text-xl font-bold text-white mt-2">{leaderboard[1].credentials_issued}</p>
                  <p className="text-gray-400 text-xs">credentials</p>
                </div>

                {/* 1st Place */}
                <div className="w-56 md:w-72 bg-gradient-to-b from-yellow-600/30 to-slate-800 rounded-t-xl p-6 md:p-8 text-center border-2 border-yellow-500/50 relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-500 rounded-full text-yellow-900 text-xs font-bold">
                    CHAMPION
                  </div>
                  <div className="w-16 h-16 mx-auto mb-3 bg-yellow-500/20 rounded-full flex items-center justify-center ring-4 ring-yellow-500/30">
                    {leaderboard[0].logo_url ? (
                      <img src={leaderboard[0].logo_url} alt="" className="w-12 h-12 rounded-full" />
                    ) : (
                      <Building2 className="w-8 h-8 text-yellow-500" />
                    )}
                  </div>
                  <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <h3 className="text-white font-bold truncate">{leaderboard[0].institution_name}</h3>
                  <p className="text-gray-400 text-sm">{leaderboard[0].province_name}</p>
                  <p className="text-3xl font-bold text-white mt-2">{leaderboard[0].credentials_issued}</p>
                  <p className="text-gray-400 text-xs">credentials</p>
                </div>

                {/* 3rd Place */}
                <div className="w-48 md:w-64 bg-gradient-to-b from-slate-700 to-slate-800 rounded-t-xl p-4 md:p-6 text-center border border-slate-600">
                  <div className="w-14 h-14 mx-auto mb-3 bg-amber-600/20 rounded-full flex items-center justify-center">
                    {leaderboard[2].logo_url ? (
                      <img src={leaderboard[2].logo_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <Building2 className="w-7 h-7 text-amber-600" />
                    )}
                  </div>
                  <Medal className="w-7 h-7 text-amber-600 mx-auto mb-2" />
                  <h3 className="text-white font-bold text-sm truncate">{leaderboard[2].institution_name}</h3>
                  <p className="text-gray-400 text-xs">{leaderboard[2].province_name}</p>
                  <p className="text-xl font-bold text-white mt-2">{leaderboard[2].credentials_issued}</p>
                  <p className="text-gray-400 text-xs">credentials</p>
                </div>
              </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 bg-slate-800 text-gray-400 text-sm font-medium border-b border-slate-700">
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Institution</div>
                <div className="col-span-2 text-center">Credentials</div>
                <div className="col-span-2 text-center">Students</div>
                <div className="col-span-2 text-center">Passports</div>
              </div>

              {leaderboard.map((inst) => (
                <div 
                  key={inst.institution_id}
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
                >
                  <div className="col-span-1 flex justify-center">
                    {getRankBadge(inst.rank)}
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                      {inst.logo_url ? (
                        <img src={inst.logo_url} alt="" className="w-8 h-8 rounded" />
                      ) : (
                        <Building2 className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{inst.institution_name}</p>
                      <p className="text-gray-400 text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {inst.city ? `${inst.city}, ` : ''}{inst.province_name}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-xl font-bold text-white">{inst.credentials_issued}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-lg text-gray-300">{inst.unique_students}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-lg text-gray-300">{inst.work_passports}</p>
                    <p className="text-xs text-gray-500">{inst.passport_rate}% rate</p>
                  </div>
                </div>
              ))}

              {leaderboard.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No institutions have issued credentials yet.</p>
                  <p className="text-gray-500 text-sm mt-2">Be the first to join!</p>
                </div>
              )}
            </div>

            {/* Can't find your school? */}
            <div className="mt-8 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-6 border border-purple-500/30 text-center">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white mb-2">Can&apos;t find your school?</h3>
              <p className="text-gray-300 mb-4">
                Search our directory of 1,800+ Canadian institutions and request them to join HR Bank.
              </p>
              <button
                onClick={() => setShowDirectory(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                Search All Institutions
              </button>
            </div>
          </>
        ) : activeTab === 'regions' ? (
          /* Regional Workforce Density */
          <div data-testid="regions-content">
            {/* Region Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {regionData?.province_name || 'Regional'} Workforce Density
                  </h2>
                  <p className="text-gray-400">
                    Track how close each region is to enabling job-matching features
                  </p>
                </div>
              </div>
            </div>

            {/* Region Summary Stats */}
            {regionData?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-3xl font-bold text-white">{regionData.summary.total_regions}</p>
                  <p className="text-gray-400 text-sm">Total Regions</p>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-4 border border-green-500/30">
                  <p className="text-3xl font-bold text-green-400">{regionData.summary.regions_active}</p>
                  <p className="text-green-300 text-sm">Job Matching Active</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl p-4 border border-amber-500/30">
                  <p className="text-3xl font-bold text-amber-400">{regionData.summary.regions_almost_ready}</p>
                  <p className="text-amber-300 text-sm">Almost Ready</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-3xl font-bold text-white">{regionData.summary.total_workers}</p>
                  <p className="text-gray-400 text-sm">Total Workers</p>
                </div>
              </div>
            )}

            {/* How It Works */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 mb-8 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold mb-1">How Job Matching Works</h3>
                  <p className="text-gray-300 text-sm">
                    When a region reaches its workforce threshold, employers in that area can instantly match with verified workers.
                    Help your region unlock this feature by getting your WorkPassport™ and inviting colleagues!
                  </p>
                </div>
              </div>
            </div>

            {/* Region Cards */}
            <div className="grid gap-4">
              {regionData?.regions?.map((region) => (
                <div 
                  key={region.region_key}
                  className={`bg-slate-800/50 rounded-xl p-5 border transition-all hover:border-purple-500/50 ${
                    region.status === 'active' ? 'border-green-500/50' :
                    region.status === 'almost_ready' ? 'border-amber-500/50' :
                    'border-slate-700'
                  }`}
                  data-testid={`region-card-${region.region_key}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Region Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{region.region_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          region.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          region.status === 'almost_ready' ? 'bg-amber-500/20 text-amber-400' :
                          region.status === 'growing' ? 'bg-blue-500/20 text-blue-400' :
                          region.status === 'emerging' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-slate-700 text-gray-400'
                        }`}>
                          {region.status === 'active' && <Zap className="w-3 h-3 inline mr-1" />}
                          {region.status_label}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{region.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        {region.cities.slice(0, 5).map((city, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-700/50 rounded">{city}</span>
                        ))}
                        {region.cities.length > 5 && (
                          <span className="px-2 py-1 bg-slate-700/50 rounded">+{region.cities.length - 5} more</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Section */}
                    <div className="md:w-64">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Workforce Progress</span>
                        <span className={`text-lg font-bold ${
                          region.density_percent >= 100 ? 'text-green-400' :
                          region.density_percent >= 75 ? 'text-amber-400' :
                          'text-white'
                        }`}>
                          {region.density_percent}%
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            region.density_percent >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                            region.density_percent >= 75 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                            region.density_percent >= 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' :
                            'bg-gradient-to-r from-purple-500 to-pink-400'
                          }`}
                          style={{ width: `${Math.min(region.density_percent, 100)}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{region.workers_count} workers</span>
                        <span>Goal: {region.threshold}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 md:border-l md:border-slate-700 md:pl-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{region.workers_count}</p>
                        <p className="text-xs text-gray-400">Workers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-400">{region.passports_count}</p>
                        <p className="text-xs text-gray-400">Passports</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-400">{region.institutions_count}</p>
                        <p className="text-xs text-gray-400">Institutions</p>
                      </div>
                    </div>
                  </div>

                  {/* Partner Institutions */}
                  {region.partner_institutions?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <p className="text-xs text-gray-500 mb-2">Partner Institutions in this region:</p>
                      <div className="flex flex-wrap gap-2">
                        {region.partner_institutions.map((inst, i) => (
                          <span key={i} className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-lg flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {inst}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Call to Action */}
                  {region.status !== 'active' && (
                    <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                      <p className="text-sm text-gray-400">
                        <span className="text-white font-semibold">{region.workers_needed}</span> more workers needed to activate job matching
                      </p>
                      <Link
                        to="/signup?type=workforce"
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Get Your Passport
                      </Link>
                    </div>
                  )}
                </div>
              ))}

              {(!regionData?.regions || regionData.regions.length === 0) && (
                <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
                  <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Loading regional data...</p>
                </div>
              )}
            </div>

            {/* No detailed regions message */}
            {regionData?.has_detailed_regions === false && (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
                <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-white font-semibold mb-2">Regional data coming soon</p>
                <p className="text-gray-400">{regionData.message}</p>
              </div>
            )}
          </div>
        ) : (
          /* Province Leaderboard */
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 bg-slate-800 text-gray-400 text-sm font-medium border-b border-slate-700">
              <div className="col-span-1">Rank</div>
              <div className="col-span-5">Province</div>
              <div className="col-span-2 text-center">Credentials</div>
              <div className="col-span-2 text-center">Students</div>
              <div className="col-span-2 text-center">Institutions</div>
            </div>

            {provinceLeaderboard.map((prov) => (
              <div 
                key={prov.province_code}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
              >
                <div className="col-span-1 flex justify-center">
                  {getRankBadge(prov.rank)}
                </div>
                <div className="col-span-5">
                  <p className="text-white font-medium">{prov.province_name}</p>
                  <p className="text-gray-400 text-sm">{prov.province_code}</p>
                </div>
                <div className="col-span-2 text-center">
                  <p className="text-xl font-bold text-white">{prov.credentials_issued}</p>
                </div>
                <div className="col-span-2 text-center">
                  <p className="text-lg text-gray-300">{prov.unique_students}</p>
                </div>
                <div className="col-span-2 text-center">
                  <p className="text-lg text-gray-300">{prov.participating_institutions}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-900 to-slate-900 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Issue Verified Credentials?
          </h2>
          <p className="text-lg text-purple-200 mb-8 max-w-2xl mx-auto">
            Join leading Canadian institutions on the blockchain-verified credential platform.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link 
              to="/signup?type=institution"
              className="px-8 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-purple-50 transition-colors flex items-center gap-2"
            >
              Partner With Us <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/signup?type=workforce"
              className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Get WorkPassport™
            </Link>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-lg w-full p-6 border border-slate-700">
            {inviteSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Request Submitted!</h3>
                <p className="text-gray-400">{inviteSuccess}</p>
                <div className="mt-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-green-300 text-sm">
                    Every request helps build a verified workforce in your region. 
                    Share this with others from your institution!
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Request Institution to Join</h3>
                  <button 
                    onClick={() => setInviteModal(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Social Responsibility Message */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 mb-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white text-sm font-medium mb-1">Why This Matters</p>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        When institutions join HR Bank, they help build a <span className="text-blue-400">blockchain-verified workforce</span> in 
                        your region. More verified workers means better job matching and reduced unemployment. 
                        Your request helps drive this digital transformation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-600 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{inviteModal.institution_name}</p>
                      <p className="text-gray-400 text-sm">{inviteModal.city}, {inviteModal.province_name || inviteModal.province}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-300 text-sm mb-2">
                    Share why they should join (Optional)
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="I'm an alumni/student and would like to have my credentials verified on the blockchain..."
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setInviteModal(null)}
                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteRequest}
                    disabled={inviteSubmitting}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {inviteSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>

                {inviteModal.invite_requests > 0 && (
                  <p className="text-center text-gray-400 text-sm mt-4">
                    <Users className="w-4 h-4 inline mr-1" />
                    {inviteModal.invite_requests} other{inviteModal.invite_requests > 1 ? 's' : ''} have also requested this institution
                  </p>
                )}

                {/* Regional Impact Note */}
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-gray-500 text-xs text-center">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    Help your region reach its workforce threshold for automated job matching
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
