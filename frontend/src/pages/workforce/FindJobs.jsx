import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import api from '../../utils/api';
import { Link2, MapPin, Building2, DollarSign, Clock, CheckCircle, GraduationCap, Loader2 } from 'lucide-react';

const FindJobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('matched');
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [partnerJobs, setPartnerJobs] = useState([]);
  const [jobOffers, setJobOffers] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employmentStatus, setEmploymentStatus] = useState(null);
  const [quitting, setQuitting] = useState(false);
  const [applyingTo, setApplyingTo] = useState(null);

  useEffect(() => {
    loadJobs();
    loadEmploymentStatus();
    loadPartnerJobs();
  }, []);

  const loadEmploymentStatus = async () => {
    try {
      const response = await api.get('/api/jobs/employment/status');
      setEmploymentStatus(response.data.data);
    } catch (error) {
      console.error('Failed to load employment status:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const [matchedRes, offersRes, interviewsRes] = await Promise.all([
        api.get('/api/jobs/matched').catch(() => ({ data: { data: { jobs: [] } } })),
        api.get('/api/jobs/offers').catch(() => ({ data: { data: { job_offers: [] } } })),
        api.get('/api/jobs/interviews').catch(() => ({ data: { data: { interviews: [] } } }))
      ]);

      setMatchedJobs(matchedRes.data.data?.jobs || []);
      setJobOffers(offersRes.data.data?.job_offers || []);
      setInterviews(interviewsRes.data.data?.interviews || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerJobs = async () => {
    try {
      const res = await api.get('/api/partner/public/jobs?limit=50');
      if (res.data.success) {
        setPartnerJobs(res.data.data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to load partner jobs:', error);
    }
  };

  const applyToPartnerJob = async (jobId) => {
    try {
      setApplyingTo(jobId);
      const res = await api.post(`/api/partner/public/jobs/${jobId}/apply`);
      if (res.data.success) {
        alert('Application submitted successfully!');
        loadPartnerJobs(); // Refresh to update application count
      }
    } catch (error) {
      console.error('Failed to apply:', error);
      alert(error.response?.data?.detail || 'Failed to submit application');
    } finally {
      setApplyingTo(null);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Find Jobs</h1>
          <p className="text-gray-600">Discover job opportunities that match your skills and preferences</p>
        </div>

        <div className="p-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white rounded-xl p-2 shadow-sm">
            <button
              onClick={() => setActiveTab('matched')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'matched' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={{ backgroundColor: activeTab === 'matched' ? theme.primaryColor : 'transparent' }}
              data-testid="tab-matched"
            >
              Matched Jobs ({matchedJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('partner')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'partner' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={{ backgroundColor: activeTab === 'partner' ? theme.primaryColor : 'transparent' }}
              data-testid="tab-partner"
            >
              Partner Jobs ({partnerJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('offers')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'offers' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={{ backgroundColor: activeTab === 'offers' ? theme.primaryColor : 'transparent' }}
              data-testid="tab-offers"
            >
              Job Offers ({jobOffers.length})
            </button>
            <button
              onClick={() => setActiveTab('interviews')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'interviews' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={{ backgroundColor: activeTab === 'interviews' ? theme.primaryColor : 'transparent' }}
              data-testid="tab-interviews"
            >
              Interviews ({interviews.length})
            </button>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {activeTab === 'matched' && (
              <div>
                {matchedJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Matched Jobs Yet</h3>
                    <p className="text-gray-600">Complete your occupation profiles to see job recommendations</p>
                    <button
                      onClick={() => navigate('/workforce/occupations')}
                      className="mt-4 px-6 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      Create Profile
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matchedJobs.map((job) => (
                      <div key={job.job_id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all">
                        <h4 className="font-semibold text-gray-900">{job.role_title}</h4>
                        <p className="text-sm text-gray-600">{job.workplace_name}</p>
                        <p className="text-sm text-green-600 font-medium">${job.hourly_rate}/hr</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'partner' && (
              <div>
                {partnerJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🤝</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Partner Jobs Available</h3>
                    <p className="text-gray-600">Jobs from our partner platforms will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {partnerJobs.map((job) => (
                      <div key={job.hrbank_job_id} className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900 text-lg">{job.title}</h4>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                <Link2 className="w-3 h-3" />
                                {job.partner_name}
                              </span>
                              {job.is_coop_eligible && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  <GraduationCap className="w-3 h-3" />
                                  Co-op Eligible
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-gray-600 text-sm mb-2">
                              <Building2 className="w-4 h-4" />
                              <span>{job.company_name}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {job.location_city}, {job.location_province}
                              </span>
                              <span className="px-2 py-0.5 bg-gray-100 rounded capitalize">
                                {job.job_type?.replace('_', ' ')}
                              </span>
                              {(job.hourly_rate_min || job.hourly_rate_max) && (
                                <span className="flex items-center gap-1 text-green-600 font-medium">
                                  <DollarSign className="w-4 h-4" />
                                  {job.hourly_rate_min && job.hourly_rate_max 
                                    ? `$${job.hourly_rate_min} - $${job.hourly_rate_max}/hr`
                                    : `$${job.hourly_rate_min || job.hourly_rate_max}/hr`
                                  }
                                </span>
                              )}
                              {(job.salary_min || job.salary_max) && (
                                <span className="flex items-center gap-1 text-green-600 font-medium">
                                  <DollarSign className="w-4 h-4" />
                                  {job.salary_min && job.salary_max 
                                    ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}/yr`
                                    : `$${(job.salary_min || job.salary_max).toLocaleString()}/yr`
                                  }
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm line-clamp-2">{job.description}</p>
                            {job.required_skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {job.required_skills.slice(0, 5).map((skill, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                    {skill}
                                  </span>
                                ))}
                                {job.required_skills.length > 5 && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                    +{job.required_skills.length - 5} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => applyToPartnerJob(job.hrbank_job_id)}
                              disabled={applyingTo === job.hrbank_job_id}
                              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                              style={{ backgroundColor: theme.primaryColor }}
                              data-testid={`apply-btn-${job.hrbank_job_id}`}
                            >
                              {applyingTo === job.hrbank_job_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Apply Now
                            </button>
                            {job.external_apply_url && (
                              <a
                                href={job.external_apply_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View on partner site →
                              </a>
                            )}
                            <span className="text-xs text-gray-400">
                              {job.applications_count || 0} applications
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'offers' && (
              <div>
                {jobOffers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📧</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Job Offers</h3>
                    <p className="text-gray-600">Job offers from employers will appear here</p>
                  </div>
                ) : (
                  <div>Offers content</div>
                )}
              </div>
            )}

            {activeTab === 'interviews' && (
              <div>
                {interviews.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📅</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Interviews Scheduled</h3>
                    <p className="text-gray-600">Interview invitations will appear here</p>
                  </div>
                ) : (
                  <div>Interviews content</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindJobs;