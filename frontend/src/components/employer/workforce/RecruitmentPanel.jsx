import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { 
  FiUserPlus, FiMail, FiClock, FiCheck, FiX, FiRefreshCw, FiTrendingUp, 
  FiActivity, FiGrid, FiList, FiAlertTriangle, FiFileText, FiDownload,
  FiUsers, FiBriefcase, FiPlus, FiTrash2, FiExternalLink, FiChevronRight,
  FiCalendar, FiVideo, FiMapPin, FiChevronDown
} from 'react-icons/fi';

const RecruitmentPanel = ({ roles, workplaces, theme }) => {
  const [stats, setStats] = useState({
    active_postings: 0,
    total_candidates: 0,
    interviews_scheduled: 0,
    offers_pending: 0,
    recent_hires: 0,
    by_stage: {}
  });
  const [jobPostings, setJobPostings] = useState([]);
  const [candidates, setCandidates] = useState({ all: [], pipeline: {}, total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('pipeline'); // 'pipeline', 'postings', 'roles'
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [draggedCandidate, setDraggedCandidate] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [offerCandidate, setOfferCandidate] = useState(null);

  // Fetch recruitment data
  useEffect(() => {
    fetchRecruitmentData();
  }, []);

  const fetchRecruitmentData = async () => {
    setLoading(true);
    try {
      const [statsRes, postingsRes, candidatesRes, interviewsRes] = await Promise.all([
        api.get('/api/employer/workforce-management/recruitment-stats'),
        api.get('/api/employer/workforce-management/job-postings'),
        api.get('/api/employer/workforce-management/candidates/enriched'),
        api.get('/api/employer/workforce-management/interviews?upcoming_only=true')
      ]);
      
      setStats(statsRes.data.data);
      setJobPostings(postingsRes.data.data || []);
      setCandidates(candidatesRes.data.data || { all: [], pipeline: {}, total: 0 });
      setInterviews(interviewsRes.data.data || { all: [], by_date: {}, total: 0 });
    } catch (error) {
      console.error('Failed to fetch recruitment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInterview = async (candidate, interviewData) => {
    try {
      await api.post('/api/employer/workforce-management/interviews/schedule', {
        application_id: candidate.application_id,
        interview_type: interviewData.type,
        scheduled_date: interviewData.date,
        duration_minutes: interviewData.duration || 30,
        location: interviewData.location,
        notes: interviewData.notes
      });
      
      alert('Interview scheduled successfully!');
      setShowInterviewModal(false);
      setSelectedCandidate(null);
      fetchRecruitmentData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to schedule interview');
    }
  };

  const handlePostJob = async (roleId) => {
    const role = roles.find(r => r.role_id === roleId);
    if (!role) return;
    
    try {
      await api.post('/api/employer/workforce-management/job-postings', {
        role_id: roleId,
        title: role.role_name,
        hourly_rate: role.hourly_rate,
        positions_available: role.positions_available - (role.positions_filled || 0),
        work_type: role.work_type || role.shift_type || 'on_site',
        workplace_id: role.workplace_id
      });
      
      alert('Job posted successfully!');
      fetchRecruitmentData();
      setShowPostJobModal(false);
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to post job');
    }
  };

  const handleRemovePosting = async (postingId) => {
    if (!confirm('Remove this job posting from the board?')) return;
    
    try {
      await api.delete(`/api/employer/workforce-management/job-postings/${postingId}`);
      fetchRecruitmentData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to remove posting');
    }
  };

  const handleStageChange = async (applicationId, newStage) => {
    try {
      await api.put(`/api/employer/workforce-management/candidates/${applicationId}/stage`, {
        stage: newStage
      });
      fetchRecruitmentData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to update stage');
    }
  };

  // Offer Management Handlers
  const handleSendOffer = (candidate) => {
    setOfferCandidate(candidate);
    setShowOfferModal(true);
  };

  const handleGenerateContract = (candidate) => {
    setOfferCandidate(candidate);
    setShowContractModal(true);
  };

  const handleSendOfferSubmit = async (offerData) => {
    try {
      await api.post('/api/employer/workforce-management/offers/send', {
        application_id: offerCandidate.application_id,
        ...offerData
      });
      alert('Offer sent successfully!');
      setShowOfferModal(false);
      setOfferCandidate(null);
      fetchRecruitmentData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to send offer');
    }
  };

  const handleGenerateContractSubmit = async (contractData) => {
    try {
      const response = await api.post('/api/employer/workforce-management/contracts/generate', {
        application_id: offerCandidate.application_id,
        ...contractData
      });
      // Download the generated contract PDF
      const blob = new Blob([atob(response.data.data.pdf_base64)], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employment_contract_${offerCandidate.applicant_name?.replace(/\s+/g, '_') || 'candidate'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setShowContractModal(false);
      setOfferCandidate(null);
      alert('Contract generated and downloaded!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to generate contract');
    }
  };

  // Interview Scheduling Modal
  const InterviewModal = ({ candidate, onClose, onSchedule }) => {
    const [interviewType, setInterviewType] = useState('video');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('10:00');
    const [duration, setDuration] = useState(30);
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!date || !time) {
        alert('Please select date and time');
        return;
      }
      
      setIsSubmitting(true);
      const scheduledDate = new Date(`${date}T${time}`).toISOString();
      await onSchedule(candidate, {
        type: interviewType,
        date: scheduledDate,
        duration,
        location: interviewType === 'in_person' ? location : null,
        notes
      });
      setIsSubmitting(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: theme.primaryColor }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Schedule Interview</h2>
              <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
                <FiX size={20} />
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Candidate Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold">
                {candidate?.applicant_name?.charAt(0) || '?'}
              </div>
              <div>
                <div className="font-medium text-gray-900">{candidate?.applicant_name}</div>
                <div className="text-sm text-gray-500">{candidate?.position_title}</div>
              </div>
            </div>

            {/* Interview Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interview Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInterviewType('video')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    interviewType === 'video' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📹</span>
                    <div>
                      <div className="font-medium">Video Call</div>
                      <div className="text-xs text-gray-500">Google Meet</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewType('in_person')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    interviewType === 'in_person' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏢</span>
                    <div>
                      <div className="font-medium">In-Person</div>
                      <div className="text-xs text-gray-500">At location</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
              </select>
            </div>

            {/* Location (for in-person) */}
            {interviewType === 'in_person' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., 123 Main St, Toronto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information for the candidate..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {isSubmitting ? 'Scheduling...' : 'Schedule Interview'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Send Offer Modal
  const OfferModal = ({ candidate, onClose, onSend }) => {
    const [salary, setSalary] = useState(candidate?.hourly_rate || 18);
    const [salaryType, setSalaryType] = useState('hourly');
    const [startDate, setStartDate] = useState('');
    const [employmentType, setEmploymentType] = useState('full_time');
    const [benefits, setBenefits] = useState([]);
    const [customMessage, setCustomMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const benefitOptions = ['Health Insurance', 'Dental', 'Vision', 'RRSP Matching', 'Paid Time Off', 'Flexible Hours'];

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      await onSend({
        salary,
        salary_type: salaryType,
        start_date: startDate,
        employment_type: employmentType,
        benefits,
        custom_message: customMessage
      });
      setIsSubmitting(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 bg-amber-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Send Offer Letter</h2>
              <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
                <FiX size={20} />
              </button>
            </div>
            <p className="text-amber-100 text-sm mt-1">to {candidate?.applicant_name}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Position Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Position</p>
              <p className="font-semibold text-gray-900">{candidate?.position_title}</p>
            </div>

            {/* Compensation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Rate ($)</label>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={salaryType}
                  onChange={(e) => setSalaryType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="hourly">Per Hour</option>
                  <option value="annual">Per Year</option>
                </select>
              </div>
            </div>

            {/* Employment Type & Start Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="full_time">Full-Time</option>
                  <option value="part_time">Part-Time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            {/* Benefits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Benefits Offered</label>
              <div className="flex flex-wrap gap-2">
                {benefitOptions.map((benefit) => (
                  <label key={benefit} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={benefits.includes(benefit)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBenefits([...benefits, benefit]);
                        } else {
                          setBenefits(benefits.filter(b => b !== benefit));
                        }
                      }}
                      className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-gray-700">{benefit}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personal Message (Optional)</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message to the offer..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FiMail size={16} />
                {isSubmitting ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Generate Contract Modal
  const ContractModal = ({ candidate, onClose, onGenerate }) => {
    const [contractType, setContractType] = useState('standard');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [probationPeriod, setProbationPeriod] = useState('90');
    const [hourlyRate, setHourlyRate] = useState(candidate?.hourly_rate || 18);
    const [workSchedule, setWorkSchedule] = useState('');
    const [additionalTerms, setAdditionalTerms] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      await onGenerate({
        contract_type: contractType,
        start_date: startDate,
        end_date: contractType === 'fixed_term' ? endDate : null,
        probation_days: parseInt(probationPeriod),
        hourly_rate: parseFloat(hourlyRate),
        work_schedule: workSchedule,
        additional_terms: additionalTerms
      });
      setIsSubmitting(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-600">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Generate Employment Contract</h2>
              <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
                <FiX size={20} />
              </button>
            </div>
            <p className="text-blue-100 text-sm mt-1">for {candidate?.applicant_name}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Position Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Position</p>
              <p className="font-semibold text-gray-900">{candidate?.position_title}</p>
            </div>

            {/* Contract Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">Standard Employment</option>
                <option value="fixed_term">Fixed Term Contract</option>
                <option value="part_time">Part-Time Employment</option>
                <option value="casual">Casual Employment</option>
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {contractType === 'fixed_term' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
              {contractType !== 'fixed_term' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Probation Period</label>
                  <select
                    value={probationPeriod}
                    onChange={(e) => setProbationPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">No Probation</option>
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                </div>
              )}
            </div>

            {/* Compensation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Work Schedule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Schedule</label>
              <input
                type="text"
                value={workSchedule}
                onChange={(e) => setWorkSchedule(e.target.value)}
                placeholder="e.g., Monday-Friday, 9am-5pm"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Additional Terms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Terms (Optional)</label>
              <textarea
                value={additionalTerms}
                onChange={(e) => setAdditionalTerms(e.target.value)}
                placeholder="Any specific clauses or terms..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* ESA Compliance Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium">📋 Ontario ESA Compliant</p>
              <p className="text-blue-600 text-xs mt-1">This contract template adheres to Ontario Employment Standards Act requirements.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FiFileText size={16} />
                {isSubmitting ? 'Generating...' : 'Generate & Download'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Kanban stage configuration
  const stages = [
    { id: 'applied', label: 'Applied', color: 'bg-gray-100', textColor: 'text-gray-700', icon: '📥' },
    { id: 'screening', label: 'Screening', color: 'bg-blue-100', textColor: 'text-blue-700', icon: '🔍' },
    { id: 'interview', label: 'Interview', color: 'bg-purple-100', textColor: 'text-purple-700', icon: '🎤' },
    { id: 'offer', label: 'Offer', color: 'bg-amber-100', textColor: 'text-amber-700', icon: '📄' },
    { id: 'hired', label: 'Hired', color: 'bg-green-100', textColor: 'text-green-700', icon: '✅' }
  ];

  // Match Score Bar Component
  const MatchScoreBar = ({ score, percentage }) => {
    const getScoreColor = (pct) => {
      if (pct >= 80) return 'bg-green-500';
      if (pct >= 60) return 'bg-blue-500';
      if (pct >= 40) return 'bg-amber-500';
      return 'bg-red-400';
    };
    
    return (
      <div className="mt-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Match Score</span>
          <span className={`font-semibold ${percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-amber-600' : 'text-gray-600'}`}>
            {percentage}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getScoreColor(percentage)} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  // Qualification Badge Component
  const QualificationBadge = ({ isQualified, reasons }) => {
    if (isQualified) {
      return (
        <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
          <FiCheck size={10} />
          <span>Qualified</span>
        </div>
      );
    }
    return (
      <div className="group relative">
        <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full cursor-help">
          <FiAlertTriangle size={10} />
          <span>Missing Certs</span>
        </div>
        {reasons?.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
            {reasons.map((r, i) => (
              <div key={i}>{r}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Star Rating Component
  const StarRating = ({ rating, reviewCount }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-1">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <span 
              key={i} 
              className={`text-xs ${i < fullStars ? 'text-amber-400' : i === fullStars && hasHalfStar ? 'text-amber-300' : 'text-gray-300'}`}
            >
              ★
            </span>
          ))}
        </div>
        {rating > 0 && (
          <span className="text-xs text-gray-500">
            {rating.toFixed(1)} {reviewCount > 0 && `(${reviewCount})`}
          </span>
        )}
        {rating === 0 && <span className="text-xs text-gray-400">No ratings</span>}
      </div>
    );
  };

  // Enhanced Candidate Card Component
  const CandidateCard = ({ candidate, onStageChange, onSendOffer, onGenerateContract }) => (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('applicationId', candidate.application_id);
        setDraggedCandidate(candidate);
      }}
      onDragEnd={() => setDraggedCandidate(null)}
    >
      {/* Header: Name & Rating */}
      <div className="flex items-start gap-2">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
          candidate.match_score?.is_qualified === false ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'
        }`}>
          {candidate.applicant_name?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm truncate">{candidate.applicant_name || 'Unknown'}</span>
            {candidate.match_score && (
              <QualificationBadge 
                isQualified={candidate.match_score.is_qualified} 
                reasons={candidate.match_score.disqualification_reasons} 
              />
            )}
          </div>
          <StarRating rating={candidate.average_rating || 0} reviewCount={candidate.review_count || 0} />
        </div>
      </div>

      {/* Experience */}
      {candidate.experience_years > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
          <span>📅</span>
          <span>{candidate.experience_years} yr{candidate.experience_years !== 1 ? 's' : ''} experience</span>
        </div>
      )}

      {/* Match Score */}
      {candidate.match_score && (
        <MatchScoreBar 
          score={candidate.match_score.score} 
          percentage={candidate.match_score.percentage} 
        />
      )}

      {/* Skills */}
      {candidate.skills?.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1">
            {candidate.skills.slice(0, 4).map((skill, i) => (
              <span 
                key={i} 
                className={`px-1.5 py-0.5 text-xs rounded ${
                  candidate.match_score?.breakdown?.skills?.matched?.some(s => s.toLowerCase() === skill.toLowerCase())
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {skill}
              </span>
            ))}
            {candidate.skills.length > 4 && (
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                +{candidate.skills.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Certifications */}
      {candidate.certifications?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {candidate.certifications.slice(0, 3).map((cert, i) => (
            <span 
              key={i} 
              className={`px-1.5 py-0.5 text-xs rounded flex items-center gap-0.5 ${
                candidate.match_score?.breakdown?.certifications?.matched?.some(c => c.toLowerCase() === cert.toLowerCase())
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-50 text-purple-700'
              }`}
            >
              📜 {cert}
            </span>
          ))}
          {candidate.certifications.length > 3 && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
              +{candidate.certifications.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Date & Actions */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {candidate.applied_date ? new Date(candidate.applied_date).toLocaleDateString() : 'Recently'}
        </span>
        <div className="flex gap-1">
          {candidate.stage !== 'hired' && candidate.stage !== 'rejected' && (
            <>
              {/* Schedule Interview button - show for screening/applied stages */}
              {(candidate.stage === 'applied' || candidate.stage === 'screening') && (
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedCandidate(candidate);
                    setShowInterviewModal(true);
                  }}
                  className="p-1 text-purple-500 hover:bg-purple-50 rounded"
                  title="Schedule Interview"
                >
                  <FiCalendar size={14} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onStageChange(candidate.application_id, 'rejected'); }}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
                title="Reject"
              >
                <FiX size={14} />
              </button>
              {candidate.stage === 'offer' && (
                <>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onSendOffer && onSendOffer(candidate);
                    }}
                    className="p-1 text-amber-500 hover:bg-amber-50 rounded"
                    title="Send Offer Letter"
                  >
                    <FiMail size={14} />
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onGenerateContract && onGenerateContract(candidate);
                    }}
                    className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                    title="Generate Contract"
                  >
                    <FiFileText size={14} />
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onStageChange(candidate.application_id, 'hired');
                    }}
                    className="p-1 text-green-500 hover:bg-green-50 rounded"
                    title="Mark as Hired"
                  >
                    <FiCheck size={14} />
                  </button>
                </>
              )}
              {candidate.stage !== 'offer' && (
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const nextStage = stages[stages.findIndex(s => s.id === candidate.stage) + 1]?.id;
                    if (nextStage) onStageChange(candidate.application_id, nextStage);
                  }}
                  className="p-1 text-green-500 hover:bg-green-50 rounded"
                  title="Advance"
                >
                  <FiChevronRight size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Stage Column Component with Grouped Kanban by Role
  const StageColumn = ({ stage, candidates, onStageChange, onSendOffer, onGenerateContract }) => {
    const [isOver, setIsOver] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState({});
    
    // Group candidates by position/role
    const groupedCandidates = (candidates || []).reduce((groups, candidate) => {
      const role = candidate.position_title || 'Unknown Role';
      if (!groups[role]) {
        groups[role] = [];
      }
      groups[role].push(candidate);
      return groups;
    }, {});
    
    const toggleGroup = (role) => {
      setCollapsedGroups(prev => ({
        ...prev,
        [role]: !prev[role]
      }));
    };
    
    // Role icon mapping
    const getRoleIcon = (role) => {
      const roleLower = role.toLowerCase();
      if (roleLower.includes('server') || roleLower.includes('waiter')) return '🍽️';
      if (roleLower.includes('cook') || roleLower.includes('chef')) return '👨‍🍳';
      if (roleLower.includes('delivery') || roleLower.includes('driver')) return '🚗';
      if (roleLower.includes('security') || roleLower.includes('guard')) return '🛡️';
      if (roleLower.includes('manager')) return '👔';
      return '👤';
    };
    
    return (
      <div 
        className={`flex-1 min-w-[250px] max-w-[300px] rounded-xl p-3 transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-300' : stage.color
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          const applicationId = e.dataTransfer.getData('applicationId');
          if (applicationId && draggedCandidate?.stage !== stage.id) {
            onStageChange(applicationId, stage.id);
          }
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span>{stage.icon}</span>
            <span className={`font-semibold ${stage.textColor}`}>{stage.label}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${stage.color} ${stage.textColor}`}>
            {candidates?.length || 0}
          </span>
        </div>
        
        <div className="space-y-3 min-h-[200px]">
          {Object.keys(groupedCandidates).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {isOver ? 'Drop here' : 'No candidates'}
            </div>
          ) : (
            Object.entries(groupedCandidates).map(([role, roleCandidates]) => (
              <div key={role} className="bg-white/50 rounded-lg overflow-hidden">
                {/* Role Header - Collapsible */}
                <button
                  onClick={() => toggleGroup(role)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getRoleIcon(role)}</span>
                    <span className="font-medium text-gray-700 text-sm">{role}</span>
                    <span className="text-xs text-gray-500">({roleCandidates.length})</span>
                  </div>
                  <FiChevronDown 
                    size={16} 
                    className={`text-gray-400 transition-transform ${collapsedGroups[role] ? '-rotate-90' : ''}`}
                  />
                </button>
                
                {/* Candidates List - Collapsible */}
                {!collapsedGroups[role] && (
                  <div className="px-2 pb-2 space-y-2">
                    {roleCandidates.map((candidate) => (
                      <CandidateCard 
                        key={candidate.application_id} 
                        candidate={candidate}
                        onStageChange={onStageChange}
                        onSendOffer={onSendOffer}
                        onGenerateContract={onGenerateContract}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Post Job Modal
  const PostJobModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: theme.primaryColor }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Post Job to Board</h2>
            <button onClick={() => setShowPostJobModal(false)} className="text-white hover:bg-white/20 p-2 rounded-lg">
              <FiX size={20} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <p className="text-gray-600 mb-4">Select a role to post to the public job board:</p>
          <div className="space-y-2">
            {roles.filter(r => (r.positions_filled || 0) < r.positions_available).map((role) => (
              <div 
                key={role.role_id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                onClick={() => handlePostJob(role.role_id)}
              >
                <div>
                  <div className="font-medium text-gray-900">{role.role_name}</div>
                  <div className="text-sm text-gray-500">
                    {role.positions_available - (role.positions_filled || 0)} position(s) • ${role.hourly_rate}/hr
                  </div>
                </div>
                <FiExternalLink className="text-gray-400" />
              </div>
            ))}
            {roles.filter(r => (r.positions_filled || 0) < r.positions_available).length === 0 && (
              <p className="text-center py-8 text-gray-500">All roles are fully staffed</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>{stats.active_postings}</div>
          <div className="text-sm text-gray-500">Jobs Posted</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-700">{stats.total_candidates}</div>
          <div className="text-sm text-gray-500">Total Candidates</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{stats.interviews_scheduled}</div>
          <div className="text-sm text-gray-500">In Interviews</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-amber-600">{stats.offers_pending}</div>
          <div className="text-sm text-gray-500">Offers Pending</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{stats.recent_hires}</div>
          <div className="text-sm text-gray-500">Hired (30 days)</div>
        </div>
      </div>

      {/* View Toggle & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveView('pipeline')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'pipeline' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiUsers className="inline mr-2" />
            Candidate Pipeline
          </button>
          <button
            onClick={() => setActiveView('postings')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'postings' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiBriefcase className="inline mr-2" />
            Job Board ({jobPostings.length})
          </button>
          <button
            onClick={() => setActiveView('roles')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'roles' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiList className="inline mr-2" />
            All Roles
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowPostJobModal(true)}
            className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <FiPlus size={18} />
            Post Job
          </button>
          <button
            onClick={fetchRecruitmentData}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <FiRefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Pipeline View */}
      {activeView === 'pipeline' && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Candidate Pipeline</h3>
          {candidates.total === 0 && (
            <div className="text-center py-4 mb-4 bg-gray-50 rounded-lg">
              <p className="text-gray-500 font-medium">No candidates yet</p>
              <p className="text-sm text-gray-400 mt-1">Post jobs to the board to start receiving applications</p>
            </div>
          )}
          {/* Always show pipeline columns */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                candidates={candidates.pipeline?.[stage.id] || []}
                onStageChange={handleStageChange}
                onSendOffer={handleSendOffer}
                onGenerateContract={handleGenerateContract}
              />
            ))}
          </div>
        </div>
      )}

      {/* Job Postings View */}
      {activeView === 'postings' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Active Job Postings</h3>
          </div>
          {jobPostings.length === 0 ? (
            <div className="p-12 text-center">
              <FiBriefcase size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No jobs posted yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Post Job" to publish roles to the public job board</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {jobPostings.map((posting) => (
                <div key={posting.posting_id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        posting.work_type === 'continental' ? 'bg-indigo-100' :
                        posting.work_type === 'route_based' ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        <span className="text-xl">
                          {posting.work_type === 'continental' ? '🔄' :
                           posting.work_type === 'route_based' ? '🚗' : '🏢'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{posting.title}</div>
                        <div className="text-sm text-gray-500">
                          {posting.workplace_name || posting.company_name} • ${posting.hourly_rate}/hr
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Posted {new Date(posting.posted_date).toLocaleDateString()} • {posting.candidate_count || 0} applicants
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {posting.positions_filled || 0} / {posting.positions_available} filled
                        </div>
                        <div className="flex gap-1 mt-1">
                          {Object.entries(posting.stage_counts || {}).map(([stage, count]) => (
                            <span key={stage} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {stage}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemovePosting(posting.posting_id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Remove from board"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Roles View */}
      {activeView === 'roles' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">All Roles</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {roles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No roles created yet. Create roles to start recruiting.</p>
              </div>
            ) : (
              roles.map((role) => {
                const isPosted = jobPostings.some(p => p.role_id === role.role_id && p.status === 'active');
                const isFilled = (role.positions_filled || 0) >= role.positions_available;
                
                return (
                  <div key={role.role_id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        role.shift_type === 'continental' ? 'bg-indigo-100' :
                        role.shift_type === 'route_based' ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        <span className="text-lg">
                          {role.shift_type === 'continental' ? '🔄' :
                           role.shift_type === 'route_based' ? '🚗' : '🏢'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{role.role_name}</div>
                        <div className="text-sm text-gray-500">
                          {role.positions_filled || 0} / {role.positions_available} filled • ${role.hourly_rate}/hr
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPosted && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          On Job Board
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isFilled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isFilled ? 'Filled' : 'Hiring'}
                      </span>
                      {!isFilled && !isPosted && (
                        <button 
                          onClick={() => handlePostJob(role.role_id)}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 flex items-center gap-1"
                          style={{ color: theme.primaryColor }}
                        >
                          <FiExternalLink size={14} />
                          Post to Board
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Post Job Modal */}
      {showPostJobModal && <PostJobModal />}

      {/* Interview Scheduling Modal */}
      {showInterviewModal && selectedCandidate && (
        <InterviewModal
          candidate={selectedCandidate}
          onClose={() => { setShowInterviewModal(false); setSelectedCandidate(null); }}
          onSchedule={handleScheduleInterview}
        />
      )}

      {/* Send Offer Modal */}
      {showOfferModal && offerCandidate && (
        <OfferModal
          candidate={offerCandidate}
          onClose={() => { setShowOfferModal(false); setOfferCandidate(null); }}
          onSend={handleSendOfferSubmit}
        />
      )}

      {/* Generate Contract Modal */}
      {showContractModal && offerCandidate && (
        <ContractModal
          candidate={offerCandidate}
          onClose={() => { setShowContractModal(false); setOfferCandidate(null); }}
          onGenerate={handleGenerateContractSubmit}
        />
      )}
    </div>
  );
};

export default RecruitmentPanel;
