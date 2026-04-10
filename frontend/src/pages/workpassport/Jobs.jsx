import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import WorkPassportSidebar from '../../components/layout/WorkPassportSidebar';
import WorkPassportHeader from '../../components/layout/WorkPassportHeader';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  FiBriefcase, 
  FiMapPin, 
  FiClock, 
  FiDollarSign,
  FiSearch,
  FiFilter,
  FiLock,
  FiArrowRight,
  FiTrendingUp
} from 'react-icons/fi';

const WorkPassportJobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [upgradeInfo, setUpgradeInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadJobs();
  }, [page, locationFilter]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (locationFilter) {
        params.append('location', locationFilter);
      }
      if (searchTerm) {
        params.append('occupation', searchTerm);
      }

      const response = await api.get(`/api/workpassport/jobs?${params}`, {
      });

      if (response.data.success) {
        setJobs(response.data.data.jobs);
        setTotalPages(response.data.data.pages);
        setUpgradeInfo(response.data.data.upgrade_info);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadJobs();
  };

  const isCanadian = user?.profile?.country === 'CA';

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkPassportHeader />
      <WorkPassportSidebar />
      
      <div className="transition-all duration-300 pt-16" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Job Opportunities</h1>
          <p className="text-gray-600">Explore job openings in Canada</p>
        </div>

        <div className="p-8">
          {/* Upgrade Banner */}
          {upgradeInfo && (
            <div className={`mb-6 p-6 rounded-2xl ${
              isCanadian 
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white'
            }`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  {isCanadian ? <FiTrendingUp size={24} /> : <FiLock size={24} />}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    {isCanadian ? 'Ready to Apply?' : 'Job Marketplace Coming Soon'}
                  </h3>
                  <p className="text-white/80 mb-4">
                    {upgradeInfo.message}
                  </p>
                  {isCanadian && (
                    <button
                      onClick={() => navigate('/workpassport/upgrade')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors"
                    >
                      Upgrade to Workforce
                      <FiArrowRight />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by job title or occupation..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="pl-12 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">All Locations</option>
                  <option value="Toronto">Toronto, ON</option>
                  <option value="Vancouver">Vancouver, BC</option>
                  <option value="Calgary">Calgary, AB</option>
                  <option value="Montreal">Montreal, QC</option>
                  <option value="Ottawa">Ottawa, ON</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Job Listings */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <FiBriefcase size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Jobs Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || locationFilter 
                  ? 'Try adjusting your search filters'
                  : 'Check back soon for new job postings'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div 
                  key={job.job_id}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/workpassport/jobs/${job.job_id}`)}
                >
                  <div className="flex items-start gap-4">
                    {/* Company Logo */}
                    <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {job.company_logo ? (
                        <img src={job.company_logo} alt="" className="w-10 h-10 object-contain" />
                      ) : (
                        <FiBriefcase size={24} className="text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{job.position_title}</h3>
                          <p className="text-gray-600">{job.company_name || 'Company'}</p>
                        </div>
                        
                        {/* Upgrade Required Badge */}
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1 flex-shrink-0">
                          <FiLock size={12} />
                          Upgrade to Apply
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiMapPin size={14} />
                          {job.city}, {job.province}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiClock size={14} />
                          {job.job_type || 'Full-time'}
                        </span>
                        {job.hourly_rate && (
                          <span className="flex items-center gap-1">
                            <FiDollarSign size={14} />
                            ${job.hourly_rate}/hr
                          </span>
                        )}
                      </div>
                      
                      {job.description && (
                        <p className="mt-3 text-gray-600 text-sm line-clamp-2">
                          {job.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkPassportJobs;
