import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { FiBriefcase, FiUsers, FiMapPin, FiDollarSign, FiClock, FiStar, FiCheckCircle, FiXCircle, FiSearch } from 'react-icons/fi';
import UserHeader from '../../components/common/UserHeader';

import { useLanguage } from '../../contexts/LanguageContext';

const JobsCandidates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();
  
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [minScore, setMinScore] = useState(50);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/job-matching/posted');
      setJobs(response.data.data.jobs || []);
      
      // Auto-select first job if available
      if (response.data.data.jobs && response.data.data.jobs.length > 0) {
        selectJob(response.data.data.jobs[0]);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectJob = async (job) => {
    setSelectedJob(job);
    setCandidatesLoading(true);
    
    try {
      const response = await api.get(`/api/job-matching/candidates/${job.job_id}?min_score=${minScore}`);
      setCandidates(response.data.data.candidates || []);
    } catch (error) {
      console.error('Failed to load candidates:', error);
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const sendInterviewInvitation = async (candidate) => {
    try {
      await api.post('/api/job-matching/interviews/send', {
        job_id: selectedJob.job_id,
        workforce_id: candidate.workforce_id,
        interview_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        interview_location: selectedJob.workplace_address,
        message: `We'd like to invite you for an interview for the ${selectedJob.position_title} position at ${selectedJob.company_name}.`
      });
      
      alert('Interview invitation sent successfully!');
    } catch (error) {
      console.error('Failed to send invitation:', error);
      alert('Failed to send interview invitation. Please try again.');
    }
  };

  const sendJobOffer = async (candidate) => {
    try {
      await api.post('/api/job-matching/offers/send', {
        job_id: selectedJob.job_id,
        workforce_id: candidate.workforce_id,
        hourly_rate: selectedJob.hourly_rate,
        start_date: selectedJob.start_date,
        message: `We are pleased to offer you the ${selectedJob.position_title} position at ${selectedJob.company_name}.`
      });
      
      alert('Job offer sent successfully!');
    } catch (error) {
      console.error('Failed to send offer:', error);
      alert('Failed to send job offer. Please try again.');
    }
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getDistanceText = (km) => {
    if (km < 5) return `${km} km - Very Close`;
    if (km < 10) return `${km} km - Close`;
    if (km < 20) return `${km} km - Nearby`;
    return `${km} km - Far`;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader 
        showBack={true}
        onBackClick={() => navigate('/employer/dashboard')}
        title="Jobs & Candidates"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Posted Jobs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Posted Jobs</h2>
                <button
                  onClick={() => navigate('/employer/jobs/post')}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  + Post Job
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: theme.primaryColor }}></div>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8">
                  <FiBriefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm mb-4">No jobs posted yet</p>
                  <button
                    onClick={() => navigate('/employer/jobs/post')}
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Post Your First Job
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <button
                      key={job.job_id}
                      onClick={() => selectJob(job)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedJob?.job_id === job.job_id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900 mb-1">{job.position_title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{job.workplace_city}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiDollarSign className="w-3 h-3" />
                          ${job.hourly_rate}/hr
                        </span>
                        <span className="flex items-center gap-1">
                          <FiUsers className="w-3 h-3" />
                          {job.positions_available} positions
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Matched Candidates */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="space-y-6">
                {/* Job Details Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedJob.position_title}</h2>
                      <p className="text-gray-600">{selectedJob.company_name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedJob.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedJob.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <FiMapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{selectedJob.workplace_city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <FiDollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">${selectedJob.hourly_rate}/hr</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <FiUsers className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{selectedJob.positions_available} positions</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <FiClock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{new Date(selectedJob.start_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {selectedJob.description && (
                    <p className="text-gray-600 text-sm mb-4">{selectedJob.description}</p>
                  )}

                  {selectedJob.required_certifications && selectedJob.required_certifications.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Required Certifications:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.required_certifications.map((cert, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedJob.required_skills && selectedJob.required_skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Required Skills:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.required_skills.map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Candidates Filter */}
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Matched Candidates</h3>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Min Score:</label>
                      <select
                        value={minScore}
                        onChange={(e) => {
                          setMinScore(Number(e.target.value));
                          selectJob(selectedJob);
                        }}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="0">All (0%)</option>
                        <option value="50">Good (50%+)</option>
                        <option value="60">Great (60%+)</option>
                        <option value="70">Excellent (70%+)</option>
                        <option value="80">Perfect (80%+)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Candidates List */}
                {candidatesLoading ? (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.primaryColor }}></div>
                    <p className="text-gray-600">Loading candidates...</p>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <FiSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Candidates Found</h3>
                    <p className="text-gray-600 mb-4">Try adjusting your filters or requirements</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {candidates.map((candidate) => (
                      <div key={candidate.workforce_id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4">
                            {/* Profile Photo */}
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              {candidate.profile_photo_url ? (
                                <img src={candidate.profile_photo_url} alt={candidate.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-2xl font-bold text-gray-500">
                                  {candidate.full_name?.charAt(0) || 'W'}
                                </span>
                              )}
                            </div>

                            {/* Candidate Info */}
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">{candidate.full_name || 'Worker'}</h3>
                              <p className="text-sm text-gray-600 mb-2">
                                {candidate.occupations && candidate.occupations.length > 0 
                                  ? candidate.occupations[0].occupation_title 
                                  : 'Workforce Member'}
                              </p>
                              <div className="flex items-center gap-2">
                                {candidate.behavior_rating > 0 && (
                                  <div className="flex items-center gap-1">
                                    <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                                    <span className="text-sm font-medium text-gray-700">
                                      {candidate.behavior_rating.toFixed(1)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ({candidate.behavior_rating_count} reviews)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Match Score */}
                          <div className={`px-4 py-2 rounded-lg border-2 ${getMatchScoreColor(candidate.match_score)}`}>
                            <div className="text-2xl font-bold text-center">{Math.round(candidate.match_score)}%</div>
                            <div className="text-xs text-center">Match</div>
                          </div>
                        </div>

                        {/* Match Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Distance</div>
                            <div className="flex items-center gap-1">
                              <FiMapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium">{getDistanceText(candidate.distance_km)}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Availability</div>
                            <div className="text-sm font-medium">
                              {Math.round(candidate.availability_score)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Skills Match</div>
                            <div className="text-sm font-medium">
                              {candidate.skills_matched}/{candidate.total_skills_required}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Certifications</div>
                            <div className="text-sm font-medium">
                              {candidate.certifications_matched}/{candidate.total_certifications_required}
                            </div>
                          </div>
                        </div>

                        {/* Skills & Certs Details */}
                        {candidate.occupations && candidate.occupations.length > 0 && (
                          <div className="mb-4">
                            {candidate.occupations[0].skills && candidate.occupations[0].skills.length > 0 && (
                              <div className="mb-2">
                                <h4 className="text-xs font-semibold text-gray-700 mb-1">Skills:</h4>
                                <div className="flex flex-wrap gap-1">
                                  {candidate.occupations[0].skills.slice(0, 5).map((skill, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                      {skill}
                                    </span>
                                  ))}
                                  {candidate.occupations[0].skills.length > 5 && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                      +{candidate.occupations[0].skills.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => sendInterviewInvitation(candidate)}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Invite to Interview
                          </button>
                          <button
                            onClick={() => sendJobOffer(candidate)}
                            className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            Send Job Offer
                          </button>
                          <button
                            onClick={() => setSelectedCandidate(candidate)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <FiBriefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Job Selected</h3>
                <p className="text-gray-600">Select a job from the left to view matched candidates</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default JobsCandidates;
