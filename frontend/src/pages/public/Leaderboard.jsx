import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { LOGOS } from '../../utils/logoUtils';
import {
  Trophy, Medal, Award, Building2, Users, FileCheck,
  MapPin, Filter, TrendingUp, ChevronDown, ExternalLink,
  Briefcase, Globe, Calendar, Star
} from 'lucide-react';

const Leaderboard = () => {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [provinceLeaderboard, setProvinceLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [activeTab, setActiveTab] = useState('institutions');

  useEffect(() => {
    loadData();
  }, [selectedProvince, selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (selectedProvince) params.append('province', selectedProvince);
      params.append('period', selectedPeriod);
      params.append('limit', '50');

      const [leaderboardRes, provinceRes, statsRes] = await Promise.all([
        api.get(`/api/leaderboard/institutions?${params}`),
        api.get(`/api/leaderboard/provinces?period=${selectedPeriod}`),
        api.get('/api/leaderboard/stats')
      ]);

      if (leaderboardRes.data.success) {
        setLeaderboard(leaderboardRes.data.data.leaderboard);
        setSummary(leaderboardRes.data.data.summary);
        setProvinces(leaderboardRes.data.data.filters.provinces);
      }

      if (provinceRes.data.success) {
        setProvinceLeaderboard(provinceRes.data.data.leaderboard);
      }

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">#{rank}</span>;
  };

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      default: return 'All Time';
    }
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
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
                </svg>
                <span className="text-sm font-medium">Back</span>
              </Link>
              <div className="w-px h-6 bg-white/20"></div>
              <Link to="/" className="hover:opacity-80 transition-opacity">
                <img src={LOGOS.master} alt="HR Bank" className="h-10 w-auto" />
              </Link>
            </div>
            <Link 
              to="/login" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-full text-yellow-300 text-sm mb-4">
              <Trophy className="w-4 h-4" />
              <span>Institution Leaderboard</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Leading the Way in
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> Verified Credentials</span>
            </h1>
            <p className="text-xl text-purple-200 max-w-2xl mx-auto">
              See which institutions are leading the digital credential revolution. 
              Blockchain-verified achievements recognized across Canada.
            </p>
          </div>

          {/* Platform Stats */}
          {stats && (
            <div className="grid grid-cols-5 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                <p className="text-3xl font-bold text-white">{stats.total_credentials_issued.toLocaleString()}</p>
                <p className="text-purple-300 text-sm">Credentials Issued</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                <p className="text-3xl font-bold text-white">{stats.total_institutions.toLocaleString()}</p>
                <p className="text-purple-300 text-sm">Institutions</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                <p className="text-3xl font-bold text-white">{stats.total_work_passports.toLocaleString()}</p>
                <p className="text-purple-300 text-sm">Work Passports</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                <p className="text-3xl font-bold text-white">{stats.total_workforce_users.toLocaleString()}</p>
                <p className="text-purple-300 text-sm">Workforce Users</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                <p className="text-3xl font-bold text-white">{stats.credentials_last_30_days.toLocaleString()}</p>
                <p className="text-purple-300 text-sm">Last 30 Days</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="bg-slate-800/50 border-y border-white/10 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('institutions')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'institutions' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4 inline mr-2" />
                Institutions
              </button>
              <button
                onClick={() => setActiveTab('provinces')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'provinces' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                By Province
              </button>
            </div>

            <div className="flex items-center gap-4">
              {activeTab === 'institutions' && (
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Provinces</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              )}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Time</option>
                <option value="year">This Year</option>
                <option value="month">This Month</option>
                <option value="week">This Week</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'institutions' ? (
          <>
            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="flex items-end justify-center gap-4 mb-12">
                {/* 2nd Place */}
                <div className="w-64 bg-gradient-to-b from-slate-700 to-slate-800 rounded-t-xl p-6 text-center border border-slate-600">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gray-400/20 rounded-full flex items-center justify-center">
                    {leaderboard[1].logo_url ? (
                      <img src={leaderboard[1].logo_url} alt="" className="w-12 h-12 rounded-full" />
                    ) : (
                      <Building2 className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-white font-bold truncate">{leaderboard[1].institution_name}</h3>
                  <p className="text-gray-400 text-sm">{leaderboard[1].province_name}</p>
                  <p className="text-2xl font-bold text-white mt-2">{leaderboard[1].credentials_issued}</p>
                  <p className="text-gray-400 text-xs">credentials</p>
                </div>

                {/* 1st Place */}
                <div className="w-72 bg-gradient-to-b from-yellow-600/30 to-slate-800 rounded-t-xl p-8 text-center border-2 border-yellow-500/50 relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-500 rounded-full text-yellow-900 text-xs font-bold">
                    CHAMPION
                  </div>
                  <div className="w-20 h-20 mx-auto mb-3 bg-yellow-500/20 rounded-full flex items-center justify-center ring-4 ring-yellow-500/30">
                    {leaderboard[0].logo_url ? (
                      <img src={leaderboard[0].logo_url} alt="" className="w-16 h-16 rounded-full" />
                    ) : (
                      <Building2 className="w-10 h-10 text-yellow-500" />
                    )}
                  </div>
                  <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <h3 className="text-white font-bold text-lg">{leaderboard[0].institution_name}</h3>
                  <p className="text-yellow-400 text-sm">{leaderboard[0].province_name}</p>
                  <p className="text-4xl font-bold text-yellow-500 mt-2">{leaderboard[0].credentials_issued}</p>
                  <p className="text-yellow-400 text-xs">credentials</p>
                </div>

                {/* 3rd Place */}
                <div className="w-64 bg-gradient-to-b from-amber-900/30 to-slate-800 rounded-t-xl p-6 text-center border border-amber-700/50">
                  <div className="w-16 h-16 mx-auto mb-3 bg-amber-600/20 rounded-full flex items-center justify-center">
                    {leaderboard[2].logo_url ? (
                      <img src={leaderboard[2].logo_url} alt="" className="w-12 h-12 rounded-full" />
                    ) : (
                      <Building2 className="w-8 h-8 text-amber-600" />
                    )}
                  </div>
                  <Medal className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <h3 className="text-white font-bold truncate">{leaderboard[2].institution_name}</h3>
                  <p className="text-gray-400 text-sm">{leaderboard[2].province_name}</p>
                  <p className="text-2xl font-bold text-white mt-2">{leaderboard[2].credentials_issued}</p>
                  <p className="text-gray-400 text-xs">credentials</p>
                </div>
              </div>
            )}

            {/* Full Leaderboard Table */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white">Full Rankings</h2>
                {summary && (
                  <p className="text-gray-400 text-sm">
                    {summary.total_credentials_issued.toLocaleString()} credentials from {leaderboard.length} institutions
                    {selectedProvince && ` in ${provinces.find(p => p.code === selectedProvince)?.name}`}
                  </p>
                )}
              </div>
              
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-400 text-sm font-medium">Rank</th>
                    <th className="text-left px-6 py-3 text-gray-400 text-sm font-medium">Institution</th>
                    <th className="text-left px-6 py-3 text-gray-400 text-sm font-medium">Province</th>
                    <th className="text-right px-6 py-3 text-gray-400 text-sm font-medium">Credentials</th>
                    <th className="text-right px-6 py-3 text-gray-400 text-sm font-medium">Students</th>
                    <th className="text-right px-6 py-3 text-gray-400 text-sm font-medium">Work Passports</th>
                    <th className="text-right px-6 py-3 text-gray-400 text-sm font-medium">Passport Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        No institutions found for the selected filters
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((inst) => (
                      <tr key={inst.institution_id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center">
                            {getRankBadge(inst.rank)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                              {inst.logo_url ? (
                                <img src={inst.logo_url} alt="" className="w-8 h-8 rounded" />
                              ) : (
                                <Building2 className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <span className="text-white font-medium">{inst.institution_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{inst.province_name}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-white font-bold">{inst.credentials_issued}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-400">{inst.unique_students}</td>
                        <td className="px-6 py-4 text-right text-purple-400">{inst.work_passports}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            inst.passport_rate >= 80 ? 'bg-green-500/20 text-green-400' :
                            inst.passport_rate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {inst.passport_rate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Province Leaderboard */
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white">Provincial Rankings</h2>
                <p className="text-gray-400 text-sm">Ranked by total credentials issued</p>
              </div>
              
              <div className="divide-y divide-slate-700">
                {provinceLeaderboard.map((prov) => (
                  <div key={prov.province_code} className="px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8">
                        {getRankBadge(prov.rank)}
                      </div>
                      <div>
                        <p className="text-white font-medium">{prov.province_name}</p>
                        <p className="text-gray-400 text-sm">
                          {prov.participating_institutions} institution{prov.participating_institutions !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{prov.credentials_issued.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm">{prov.unique_students} students</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Province Map Placeholder */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Regional Distribution</h3>
              <div className="grid grid-cols-3 gap-4">
                {provinceLeaderboard.slice(0, 6).map((prov) => (
                  <div 
                    key={prov.province_code} 
                    className="bg-slate-700/50 rounded-lg p-4 text-center"
                  >
                    <p className="text-2xl font-bold text-purple-400">{prov.credentials_issued}</p>
                    <p className="text-white font-medium text-sm">{prov.province_code}</p>
                    <p className="text-gray-400 text-xs">{prov.province_name}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <p className="text-purple-300 text-sm">
                  🎯 <strong>Challenge:</strong> Help your province climb the rankings! 
                  Encourage your institution to issue more verified credentials.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Join the Leaderboard?
          </h2>
          <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
            Whether you're an institution looking to issue verified credentials or a workforce 
            member wanting to build your Work Passport, join HR Bank today.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link 
              to="/signup"
              className="px-8 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-purple-50 transition-colors"
            >
              Get Started Free
            </Link>
            <Link 
              to="/"
              className="px-8 py-3 bg-purple-500/30 text-white rounded-lg font-medium hover:bg-purple-500/50 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 HR Bank. Blockchain-verified credentials on Polygon Mainnet.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Leaderboard;
