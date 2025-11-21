import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import UserHeader from '../../components/common/UserHeader';

const FindJobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('matched'); // matched, offers, interviews
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
    setLoading(true);
    try {
      const [matchedRes, offersRes, interviewsRes] = await Promise.all([
        api.get('/api/jobs/matched').catch(() => ({ data: { data: { jobs: [] } } })),
        api.get('/api/jobs/offers').catch(() => ({ data: { data: { offers: [] } } })),
        api.get('/api/jobs/interviews').catch(() => ({ data: { data: { interviews: [] } } }))
      ]);

      setMatchedJobs(matchedRes.data.data.jobs || []);
      setJobOffers(offersRes.data.data.offers || []);
      setInterviews(interviewsRes.data.data.interviews || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToJob = async (jobId) => {
    try {
      await api.post(`/api/jobs/${jobId}/apply`);
      alert('Application submitted successfully!');
      loadJobs();
    } catch (error) {
      console.error('Failed to apply:', error);
      alert('Failed to submit application. Please try again.');
    }
  };

  const handleAcceptOffer = async (offerId) => {
    try {
      await api.post(`/api/jobs/offers/${offerId}/accept`);
      alert('Offer accepted! You will be notified with next steps.');
      loadJobs();
    } catch (error) {
      console.error('Failed to accept offer:', error);
      alert('Failed to accept offer. Please try again.');
    }
  };

  const handleRejectOffer = async (offerId) => {
    try {
      await api.post(`/api/jobs/offers/${offerId}/reject`);
      alert('Offer declined.');
      loadJobs();
    } catch (error) {
      console.error('Failed to reject offer:', error);
    }
  };

  const handleJoinInterview = (interviewId, videoLink) => {
    // Navigate to video call page
    navigate(`/workforce/interview/${interviewId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
        <UserHeader 
          onBackClick={() => navigate('/workforce/dashboard')}
          title="Find Work"
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader 
        onBackClick={() => navigate('/workforce/dashboard')}
        title="Find Work"
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('matched')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'matched' ? 'border-current' : 'border-transparent text-gray-500'
                }`}
                style={{ 
                  borderColor: activeTab === 'matched' ? theme.primaryColor : undefined,
                  color: activeTab === 'matched' ? theme.primaryColor : undefined 
                }}
              >
                🎯 Matched Jobs ({matchedJobs.length})
              </button>
              <button
                onClick={() => setActiveTab('offers')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'offers' ? 'border-current' : 'border-transparent text-gray-500'
                }`}
                style={{ 
                  borderColor: activeTab === 'offers' ? theme.primaryColor : undefined,
                  color: activeTab === 'offers' ? theme.primaryColor : undefined 
                }}
              >
                💼 Job Offers ({jobOffers.length})
              </button>
              <button
                onClick={() => setActiveTab('interviews')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'interviews' ? 'border-current' : 'border-transparent text-gray-500'
                }`}
                style={{ 
                  borderColor: activeTab === 'interviews' ? theme.primaryColor : undefined,
                  color: activeTab === 'interviews' ? theme.primaryColor : undefined 
                }}
              >
                📹 Interviews ({interviews.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* MATCHED JOBS TAB */}
            {activeTab === 'matched' && (
              <div>
                {matchedJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matched Jobs Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Complete your occupation profiles to get matched with relevant opportunities
                    </p>
                    <button
                      onClick={() => navigate('/workforce/occupations')}
                      className="px-6 py-2 text-white rounded-lg hover:opacity-90"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      Complete Your Profile
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {matchedJobs.map((job) => (
                      <div key={job.job_id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{job.position_title}</h3>
                            <p className="text-gray-600 mb-2">{job.company_name}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>📍 {job.distance} km away</span>
                              <span>⏱️ {job.employment_duration}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold mb-1" style={{ color: theme.primaryColor }}>
                              ${job.pay_per_hour}/hr
                            </div>
                            <div className="text-sm text-gray-500">Match: {job.match_score}%</div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Key Tasks:</p>
                          <p className="text-sm text-gray-600">{job.key_tasks}</p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="flex flex-wrap gap-2">
                            {job.required_skills?.slice(0, 3).map((skill, idx) => (
                              <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                                {skill}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => handleApplyToJob(job.job_id)}
                            className="px-6 py-2 text-white rounded-lg hover:opacity-90"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            Apply Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* JOB OFFERS TAB */}
            {activeTab === 'offers' && (
              <div>
                {jobOffers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Job Offers</h3>
                    <p className="text-gray-600">
                      Employers will send you direct offers based on your profile
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {jobOffers.map((offer) => (
                      <div key={offer.offer_id} className="border-2 rounded-lg p-6" style={{ borderColor: theme.primaryColor }}>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full mb-2">
                              DIRECT OFFER
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{offer.position_title}</h3>
                            <p className="text-gray-600">{offer.company_name}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-bold mb-1" style={{ color: theme.primaryColor }}>
                              ${offer.pay_per_hour}/hr
                            </div>
                            <div className="text-sm text-gray-500">
                              Expires in {offer.expires_in_hours}h
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Shift Duration</p>
                            <p className="font-semibold">{offer.shift_duration}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Distance</p>
                            <p className="font-semibold">{offer.distance} km</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Employment Duration</p>
                            <p className="font-semibold">{offer.employment_duration}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Start Date</p>
                            <p className="font-semibold">{offer.start_date}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Key Tasks:</p>
                          <p className="text-sm text-gray-600">{offer.key_tasks}</p>
                        </div>

                        <div className="flex gap-3 pt-4 border-t">
                          <button
                            onClick={() => handleAcceptOffer(offer.offer_id)}
                            className="flex-1 px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            ✓ Accept Offer
                          </button>
                          <button
                            onClick={() => handleRejectOffer(offer.offer_id)}
                            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
                          >
                            ✗ Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INTERVIEWS TAB */}
            {activeTab === 'interviews' && (
              <div>
                {interviews.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📹</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scheduled Interviews</h3>
                    <p className="text-gray-600">
                      Employers will invite you for video interviews
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {interviews.map((interview) => (
                      <div key={interview.interview_id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{interview.position_title}</h3>
                            <p className="text-gray-600 mb-2">{interview.company_name}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                📅 {new Date(interview.scheduled_date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                🕐 {interview.scheduled_time}
                              </span>
                            </div>
                          </div>
                          <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                            interview.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                            interview.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {interview.status.toUpperCase()}
                          </div>
                        </div>

                        {interview.notes && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">{interview.notes}</p>
                          </div>
                        )}

                        {interview.status === 'upcoming' && (
                          <button
                            onClick={() => handleJoinInterview(interview.interview_id, interview.video_link)}
                            className="w-full px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Join Video Interview
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FindJobs;
