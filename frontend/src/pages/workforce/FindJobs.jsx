import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import api from '../../utils/api';

import { useLanguage } from '../../contexts/LanguageContext';

const FindJobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('matched');
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [jobOffers, setJobOffers] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employmentStatus, setEmploymentStatus] = useState(null);
  const [quitting, setQuitting] = useState(false);

  useEffect(() => {
    loadJobs();
    loadEmploymentStatus();
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
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{t('pages.workforce.findJobsTitle')}</h1>
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
