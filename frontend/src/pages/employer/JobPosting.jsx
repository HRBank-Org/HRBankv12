import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import UserHeader from '../../components/common/UserHeader';

import { useLanguage } from '../../contexts/LanguageContext';

const JobPosting = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('post'); // post, active, candidates
  const [workplaces, setWorkplaces] = useState([]);
  const [postedJobs, setPostedJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    workplace_id: '',
    position_title: '',
    pay_per_hour: '',
    shift_duration: '',
    employment_duration: '',
    start_date: '',
    key_tasks: '',
    required_skills: '',
    required_certifications: [],
    max_distance_km: '25',
    positions_available: '1'
  });
  
  const [allCertifications, setAllCertifications] = useState([]);
  const [certSearchQuery, setCertSearchQuery] = useState('');
  const [showCertDropdown, setShowCertDropdown] = useState(false);
  const [occupationSuggestedCerts, setOccupationSuggestedCerts] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    loadWorkplaces();
    loadPostedJobs();
    loadCertifications();
  }, []);

  const loadCertifications = async () => {
    try {
      const response = await api.get('/api/admin/certifications/flat-list');
      setAllCertifications(response.data.data.certifications || []);
    } catch (error) {
      console.error('Failed to load certifications:', error);
    }
  };

  const loadWorkplaces = async () => {
    try {
      const response = await api.get('/api/employer/workplaces');
      setWorkplaces(response.data.data.workplaces || []);
    } catch (error) {
      console.error('Failed to load workplaces:', error);
    }
  };

  const loadPostedJobs = async () => {
    try {
      const response = await api.get('/api/jobs/posted');
      setPostedJobs(response.data.data.jobs || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const loadCandidates = async (jobId) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/jobs/${jobId}/candidates`);
      setCandidates(response.data.data.candidates || []);
      setSelectedJob(response.data.data.job);
      setActiveTab('candidates');
    } catch (error) {
      console.error('Failed to load candidates:', error);
      alert('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const fetchOccupationCertifications = async (positionTitle) => {
    if (!positionTitle || positionTitle.trim().length === 0) {
      setOccupationSuggestedCerts([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await api.get(`/api/admin/occupations/occupation-certifications/${encodeURIComponent(positionTitle)}`);
      const suggestedCerts = response.data.data.required_certifications || [];
      
      // Auto-add suggested certifications that aren't already in the list
      if (suggestedCerts.length > 0) {
        const newCerts = suggestedCerts.filter(cert => !formData.required_certifications.includes(cert));
        if (newCerts.length > 0) {
          setFormData({
            ...formData,
            required_certifications: [...formData.required_certifications, ...newCerts]
          });
        }
      }
      
      setOccupationSuggestedCerts(suggestedCerts);
    } catch (error) {
      console.error('Failed to fetch occupation certifications:', error);
      setOccupationSuggestedCerts([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const jobData = {
        ...formData,
        pay_per_hour: parseFloat(formData.pay_per_hour),
        max_distance_km: parseFloat(formData.max_distance_km),
        positions_available: parseInt(formData.positions_available),
        required_skills: formData.required_skills.split(',').map(s => s.trim()).filter(s => s),
        required_certifications: formData.required_certifications,
        start_date: formData.start_date || null
      };

      await api.post('/api/jobs/post', jobData);
      alert('Job posted successfully! Matching candidates now...');
      
      // Reset form
      setFormData({
        workplace_id: '',
        position_title: '',
        pay_per_hour: '',
        shift_duration: '',
        employment_duration: '',
        start_date: '',
        key_tasks: '',
        required_skills: '',
        required_certifications: [],
        max_distance_km: '25',
        positions_available: '1'
      });
      
      loadPostedJobs();
      setActiveTab('active');
    } catch (error) {
      console.error('Failed to post job:', error);
      alert('Failed to post job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInterview = async (workforceId, jobId) => {
    const dateStr = window.prompt('Interview date (YYYY-MM-DD):');
    const timeStr = window.prompt('Interview time (HH:MM in 24hr format, e.g., 14:30):');
    const notes = window.prompt('Optional notes for the candidate:');

    if (!dateStr || !timeStr) {
      alert('Date and time are required');
      return;
    }

    try {
      await api.post('/api/jobs/interviews/send', {
        workforce_id: workforceId,
        job_id: jobId,
        scheduled_date: dateStr,
        scheduled_time: timeStr,
        duration_minutes: 30,
        notes: notes || null
      });
      alert('Interview invitation sent successfully!');
    } catch (error) {
      console.error('Failed to send interview:', error);
      alert('Failed to send interview invitation');
    }
  };

  const addCertificationToJob = (cert) => {
    if (!formData.required_certifications.includes(cert)) {
      setFormData({
        ...formData,
        required_certifications: [...formData.required_certifications, cert]
      });
    }
    setCertSearchQuery('');
    setShowCertDropdown(false);
  };

  const removeCertificationFromJob = (cert) => {
    setFormData({
      ...formData,
      required_certifications: formData.required_certifications.filter(c => c !== cert)
    });
  };

  const filteredCertifications = allCertifications.filter(cert =>
    cert.toLowerCase().includes(certSearchQuery.toLowerCase()) &&
    !formData.required_certifications.includes(cert)
  );

  const handleSendOffer = async (workforceId, jobId, suggestedRate) => {
    const payRate = window.prompt(`Hourly rate (suggested: $${suggestedRate}):`, suggestedRate);
    const startDate = window.prompt('Start date (YYYY-MM-DD):');
    
    if (!payRate || !startDate) {
      alert('Pay rate and start date are required');
      return;
    }

    const job = postedJobs.find(j => j.job_id === jobId) || selectedJob;

    try {
      await api.post('/api/jobs/offers/send', {
        workforce_id: workforceId,
        job_id: jobId,
        pay_per_hour: parseFloat(payRate),
        shift_duration: job.shift_duration,
        employment_duration: job.employment_duration,
        start_date: startDate,
        key_tasks: job.key_tasks,
        expires_in_hours: 48
      });
      alert('Job offer sent successfully!');
    } catch (error) {
      console.error('Failed to send offer:', error);
      alert('Failed to send job offer');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader 
        onBackClick={() => navigate('/employer/dashboard')}
        title="Job Matching"
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('post')}
                className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'post' ? 'border-current' : 'border-transparent text-gray-500'
                }`}
                style={{ 
                  borderColor: activeTab === 'post' ? theme.primaryColor : undefined,
                  color: activeTab === 'post' ? theme.primaryColor : undefined 
                }}
              >
                📝 Post New Job
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'active' ? 'border-current' : 'border-transparent text-gray-500'
                }`}
                style={{ 
                  borderColor: activeTab === 'active' ? theme.primaryColor : undefined,
                  color: activeTab === 'active' ? theme.primaryColor : undefined 
                }}
              >
                💼 Active Jobs ({postedJobs.length})
              </button>
              {selectedJob && (
                <button
                  onClick={() => setActiveTab('candidates')}
                  className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'candidates' ? 'border-current' : 'border-transparent text-gray-500'
                  }`}
                  style={{ 
                    borderColor: activeTab === 'candidates' ? theme.primaryColor : undefined,
                    color: activeTab === 'candidates' ? theme.primaryColor : undefined 
                  }}
                >
                  👥 Candidates ({candidates.length})
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {/* POST JOB TAB */}
            {activeTab === 'post' && (
              <form onSubmit={handlePostJob} className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Post Job to Matching Engine</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Workplace *
                    </label>
                    <select
                      value={formData.workplace_id}
                      onChange={(e) => setFormData({...formData, workplace_id: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2"
                      style={{ focusRingColor: theme.primaryColor }}
                      required
                    >
                      <option value="">Select workplace...</option>
                      {workplaces.map(wp => (
                        <option key={wp.workplace_id} value={wp.workplace_id}>
                          {wp.workplace_name} - {wp.city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position Title *
                      </label>
                      <input
                        type="text"
                        value={formData.position_title}
                        onChange={(e) => {
                          const newTitle = e.target.value;
                          setFormData({...formData, position_title: newTitle});
                        }}
                        onBlur={() => fetchOccupationCertifications(formData.position_title)}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="e.g., Line Cook, Server"
                        required
                      />
                      {loadingSuggestions && (
                        <p className="text-xs text-gray-500 mt-1">
                          🔍 Fetching certification suggestions...
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pay Per Hour * (CAD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="17.60"
                        value={formData.pay_per_hour}
                        onChange={(e) => setFormData({...formData, pay_per_hour: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="Min $17.60"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shift Duration *
                      </label>
                      <input
                        type="text"
                        value={formData.shift_duration}
                        onChange={(e) => setFormData({...formData, shift_duration: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="e.g., 8 hours"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employment Duration *
                      </label>
                      <input
                        type="text"
                        value={formData.employment_duration}
                        onChange={(e) => setFormData({...formData, employment_duration: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="e.g., 3 months"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Key Tasks * (Describe main responsibilities)
                    </label>
                    <textarea
                      value={formData.key_tasks}
                      onChange={(e) => setFormData({...formData, key_tasks: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      rows="3"
                      placeholder="e.g., Food preparation, maintaining cleanliness, customer service..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Required Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.required_skills}
                      onChange={(e) => setFormData({...formData, required_skills: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="e.g., Cooking, Food Safety, Customer Service"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Certifications
                    </label>
                    
                    {/* Selected Certifications */}
                    {formData.required_certifications.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {formData.required_certifications.map((cert, idx) => {
                          const isSuggested = occupationSuggestedCerts.includes(cert);
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                                isSuggested 
                                  ? 'bg-green-100 text-green-800 border border-green-300' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              <span>
                                {isSuggested ? '✓ ' : '🎓 '}
                                {cert}
                                {isSuggested && <span className="text-xs ml-1">(suggested)</span>}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeCertificationFromJob(cert)}
                                className={`${
                                  isSuggested ? 'text-green-600 hover:text-green-800' : 'text-blue-600 hover:text-blue-800'
                                } font-bold`}
                                title={isSuggested ? "Remove suggested certification" : "Remove certification"}
                              >
                                ✕
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Search and Add Certifications */}
                    <div className="relative">
                      <input
                        type="text"
                        value={certSearchQuery}
                        onChange={(e) => {
                          setCertSearchQuery(e.target.value);
                          setShowCertDropdown(true);
                        }}
                        onFocus={() => setShowCertDropdown(true)}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="Search government-approved certifications..."
                      />
                      
                      {/* Dropdown */}
                      {showCertDropdown && certSearchQuery && filteredCertifications.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredCertifications.slice(0, 10).map((cert, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => addCertificationToJob(cert)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                            >
                              {cert}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {occupationSuggestedCerts.length > 0 && (
                      <p className="text-xs text-green-700 mt-1 font-medium">
                        ✓ {occupationSuggestedCerts.length} certification(s) auto-suggested based on position. You can remove any as needed.
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Search and select from standardized Canadian certifications
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Distance (km)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={formData.max_distance_km}
                        onChange={(e) => setFormData({...formData, max_distance_km: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="25"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Positions Available
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.positions_available}
                        onChange={(e) => setFormData({...formData, positions_available: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="1"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {loading ? 'Posting Job...' : 'Post Job & Find Candidates'}
                </button>
              </form>
            )}

            {/* ACTIVE JOBS TAB */}
            {activeTab === 'active' && (
              <div>
                {postedJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-lg font-semibold mb-2">No Active Jobs</h3>
                    <p className="text-gray-600 mb-4">Post your first job to start finding candidates</p>
                    <button
                      onClick={() => setActiveTab('post')}
                      className="px-6 py-2 text-white rounded-lg"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      Post a Job
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {postedJobs.map(job => (
                      <div key={job.job_id} className="border rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-bold">{job.position_title}</h3>
                            <p className="text-gray-600">{job.workplace_address}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                              ${job.pay_per_hour}/hr
                            </div>
                            <div className="text-sm text-gray-500">{job.employment_duration}</div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">{job.key_tasks}</p>

                        <div className="flex justify-between items-center pt-4 border-t">
                          <div className="text-sm text-gray-500">
                            Posted: {new Date(job.posted_date).toLocaleDateString()}
                          </div>
                          <button
                            onClick={() => loadCandidates(job.job_id)}
                            className="px-4 py-2 text-white rounded-lg"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            View Candidates
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CANDIDATES TAB */}
            {activeTab === 'candidates' && selectedJob && (
              <div>
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">{selectedJob.position_title}</h3>
                  <p className="text-sm text-gray-600">
                    {candidates.length} matched candidates (minimum 50% match score)
                  </p>
                </div>

                {candidates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-semibold mb-2">No Matches Yet</h3>
                    <p className="text-gray-600">Candidates are being matched. Check back soon!</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {candidates.map(candidate => (
                      <div key={candidate.workforce_id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            {candidate.worker_photo ? (
                              <img src={candidate.worker_photo} alt={candidate.worker_name} className="w-16 h-16 rounded-full object-cover" />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-bold">
                                {candidate.worker_name?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <h4 className="font-bold text-lg">{candidate.worker_name}</h4>
                              <p className="text-sm text-gray-600">
                                {candidate.occupations.join(', ')}
                              </p>
                              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                <span>📍 {candidate.distance_km} km away</span>
                                <span>⭐ {candidate.worker_rating.toFixed(1)}</span>
                                <span>⏱️ {candidate.total_hours_worked}h worked</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-3xl font-bold mb-1" style={{ color: theme.primaryColor }}>
                              {candidate.match_score}%
                            </div>
                            <div className="text-xs text-gray-500">Match Score</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-500">Skills:</span>
                            <span className="ml-2 font-semibold">{candidate.skill_match_score}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Certs:</span>
                            <span className="ml-2 font-semibold">{candidate.certification_match_score}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Distance:</span>
                            <span className="ml-2 font-semibold">{candidate.distance_score}%</span>
                          </div>
                        </div>

                        {candidate.matched_skills.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-gray-500 mb-1">Matched Skills:</p>
                            <div className="flex flex-wrap gap-2">
                              {candidate.matched_skills.map((skill, idx) => (
                                <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                  ✓ {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t">
                          <button
                            onClick={() => handleSendInterview(candidate.workforce_id, selectedJob.job_id)}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            📹 Interview
                          </button>
                          <button
                            onClick={() => handleSendOffer(candidate.workforce_id, selectedJob.job_id, selectedJob.pay_per_hour)}
                            className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            💼 Send Offer
                          </button>
                        </div>
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

export default JobPosting;
