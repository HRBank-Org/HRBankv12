import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import WorkerInviteModal from '../../components/employer/WorkerInviteModal';
import DragDropAssignment from '../../components/employer/DragDropAssignment';
import { 
  FiUserPlus, FiMail, FiClock, FiCheck, FiX, FiRefreshCw, FiTrendingUp, 
  FiActivity, FiGrid, FiList, FiAlertTriangle, FiFileText, FiDownload,
  FiUsers, FiBriefcase, FiPlus, FiTrash2, FiExternalLink, FiChevronRight,
  FiCalendar, FiVideo, FiMapPin, FiChevronDown
} from 'react-icons/fi';

// ESA Compliance Constants (Ontario)
const ESA_LIMITS = {
  DAILY_MAX: 8,        // Max hours per day without agreement
  WEEKLY_OVERTIME: 44, // Overtime threshold (1.5x pay)
  WEEKLY_MAX: 48,      // Absolute max without written agreement
};

// Get availability status based on hours worked
const getAvailabilityStatus = (weeklyHours, dailyHours = 0, hasExcessAgreement = false) => {
  const effectiveMax = hasExcessAgreement ? 60 : ESA_LIMITS.WEEKLY_MAX;
  
  if (weeklyHours >= effectiveMax) {
    return { status: 'unavailable', color: 'red', icon: '🚫', label: 'Unavailable', description: 'Weekly limit reached' };
  }
  if (weeklyHours >= ESA_LIMITS.WEEKLY_OVERTIME) {
    return { status: 'overtime', color: 'orange', icon: '🔶', label: 'Overtime', description: `${weeklyHours}h - 1.5x rate applies` };
  }
  if (weeklyHours >= 40) {
    return { status: 'approaching', color: 'amber', icon: '⚠️', label: 'Near Limit', description: `${weeklyHours}h - approaching overtime` };
  }
  if (dailyHours >= ESA_LIMITS.DAILY_MAX) {
    return { status: 'daily_limit', color: 'yellow', icon: '⏰', label: 'Daily Limit', description: 'Max daily hours reached' };
  }
  return { status: 'available', color: 'green', icon: '✅', label: 'Available', description: `${weeklyHours}h this week` };
};

// Sortable Table Header Component
// Multi-column sortable header - supports Shift+Click for secondary sorting
const SortableHeader = ({ label, sortKey, currentSort, onSort, align = 'left' }) => {
  // currentSort is now an array: [{ key, direction }, { key, direction }, ...]
  const sortArray = Array.isArray(currentSort) ? currentSort : [currentSort];
  const sortIndex = sortArray.findIndex(s => s.key === sortKey);
  const isActive = sortIndex !== -1;
  const direction = isActive ? sortArray[sortIndex].direction : null;
  const sortPriority = isActive ? sortIndex + 1 : null;
  
  return (
    <th 
      className={`px-4 py-3 text-xs font-medium uppercase cursor-pointer hover:bg-gray-100 select-none transition-colors ${
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
      } ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
      onClick={(e) => onSort(sortKey, e.shiftKey)}
      title={isActive ? `Sort priority: ${sortPriority}. Shift+Click to add secondary sort` : 'Click to sort, Shift+Click to add to sort'}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}>
        {label}
        <span className={isActive ? 'text-blue-500' : 'text-gray-400'}>
          {isActive ? (direction === 'asc' ? '↑' : '↓') : '↕'}
        </span>
        {sortPriority && sortArray.length > 1 && (
          <span className="ml-0.5 w-4 h-4 bg-blue-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {sortPriority}
          </span>
        )}
      </div>
    </th>
  );
};

// Records Table Component with Multi-Column Sortable Columns
const RecordsTable = ({ activeWorkers, pastWorkers, sortConfig, setSortConfig, onExport, onDownloadWorker, theme }) => {
  // Merge active and past workers
  const allRecords = [
    ...activeWorkers.map(w => ({ ...w, recordStatus: 'active' })),
    ...pastWorkers.map(w => ({ ...w, recordStatus: w.termination_reason?.includes('laid') ? 'laid_off' : 'terminated' }))
  ];

  // Ensure sortConfig is always an array for multi-column sorting
  const sortArray = Array.isArray(sortConfig) ? sortConfig : [sortConfig];

  // Multi-column sort function - Shift+Click adds secondary sort
  const handleSort = (key, isShiftKey) => {
    setSortConfig(prev => {
      const prevArray = Array.isArray(prev) ? prev : [prev];
      const existingIndex = prevArray.findIndex(s => s.key === key);
      
      if (isShiftKey) {
        // Shift+Click: Add to sort or toggle direction
        if (existingIndex !== -1) {
          // Toggle direction of existing sort
          const updated = [...prevArray];
          updated[existingIndex] = {
            key,
            direction: updated[existingIndex].direction === 'asc' ? 'desc' : 'asc'
          };
          return updated;
        } else {
          // Add new sort criteria (max 3 columns)
          if (prevArray.length >= 3) {
            return [...prevArray.slice(1), { key, direction: 'asc' }];
          }
          return [...prevArray, { key, direction: 'asc' }];
        }
      } else {
        // Normal click: Replace all sorts with this one
        if (existingIndex !== -1 && prevArray.length === 1) {
          // Toggle direction if already the only sort
          return [{ key, direction: prevArray[0].direction === 'asc' ? 'desc' : 'asc' }];
        }
        return [{ key, direction: 'asc' }];
      }
    });
  };

  // Clear all sorts
  const handleClearSort = () => {
    setSortConfig([{ key: 'full_name', direction: 'asc' }]);
  };

  // Get comparison value for a key
  const getCompareValue = (record, key) => {
    switch (key) {
      case 'full_name':
        return record.full_name || '';
      case 'position_title':
        return record.position_title || '';
      case 'employment_start_date':
        return new Date(record.employment_start_date || 0).getTime();
      case 'employment_end_date':
        return new Date(record.employment_end_date || 0).getTime();
      case 'total_shifts_completed':
        return record.total_shifts_completed || 0;
      case 'total_hours_worked':
        return record.total_hours_worked || 0;
      case 'total_pay':
        return (record.total_hours_worked || 0) * 18;
      case 'recordStatus':
        const statusOrder = { active: 0, laid_off: 1, terminated: 2 };
        return statusOrder[record.recordStatus] || 0;
      default:
        return 0;
    }
  };

  // Apply multi-column sorting
  const sortedRecords = [...allRecords].sort((a, b) => {
    for (const { key, direction } of sortArray) {
      const aVal = getCompareValue(a, key);
      const bVal = getCompareValue(b, key);
      
      let comparison = 0;
      if (typeof aVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else {
        comparison = aVal - bVal;
      }
      
      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header with Export and Sort Info */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Employment Records</h3>
          <p className="text-xs text-gray-500">
            {allRecords.length} total records • Click headers to sort • <span className="text-blue-600">Shift+Click</span> for multi-column sort
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {sortArray.length > 1 && (
            <button
              onClick={handleClearSort}
              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
              title="Clear multi-column sort"
            >
              <FiX size={12} /> Clear Sort
            </button>
          )}
          <button
            onClick={() => onExport('csv')}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1"
          >
            <FiDownload size={14} /> CSV
          </button>
          <button
            onClick={() => onExport('pdf')}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1"
          >
            <FiDownload size={14} /> PDF
          </button>
        </div>
      </div>
      
      {/* Table with fixed header */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <SortableHeader label="Worker" sortKey="full_name" currentSort={sortConfig} onSort={handleSort} />
              <SortableHeader label="Role" sortKey="position_title" currentSort={sortConfig} onSort={handleSort} />
              <SortableHeader label="Start Date" sortKey="employment_start_date" currentSort={sortConfig} onSort={handleSort} />
              <SortableHeader label="End Date" sortKey="employment_end_date" currentSort={sortConfig} onSort={handleSort} />
              <SortableHeader label="Shifts" sortKey="total_shifts_completed" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortableHeader label="Hours" sortKey="total_hours_worked" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortableHeader label="Total Pay" sortKey="total_pay" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortableHeader label="Status" sortKey="recordStatus" currentSort={sortConfig} onSort={handleSort} />
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRecords.map((record) => (
              <tr key={record.user_id} className={`hover:bg-gray-50 ${record.recordStatus !== 'active' ? 'bg-gray-50/50' : ''}`}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      record.recordStatus === 'active' ? 'bg-gray-200 text-gray-600' : 'bg-gray-300 text-gray-500'
                    }`}>
                      {record.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{record.full_name}</p>
                      <p className="text-xs text-gray-500">{record.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.position_title}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {record.employment_start_date ? new Date(record.employment_start_date).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {record.employment_end_date ? new Date(record.employment_end_date).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                  {record.total_shifts_completed || 0}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                  {record.total_hours_worked?.toFixed(1) || 0}h
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-center" style={{ color: theme.primaryColor }}>
                  ${((record.total_hours_worked || 0) * 18).toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    record.recordStatus === 'active' ? 'bg-green-100 text-green-800' :
                    record.recordStatus === 'laid_off' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {record.recordStatus === 'active' ? 'Active' : 
                     record.recordStatus === 'laid_off' ? 'Laid Off' : 'Terminated'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button
                    onClick={() => onDownloadWorker(record)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Download record"
                  >
                    <FiDownload size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {allRecords.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          <FiFileText size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No employment records yet</p>
        </div>
      )}
    </div>
  );
};

// Recruitment Panel Component with Candidate Pipeline
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
    </div>
  );
};

const WorkforceManagement = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [viewMode, setViewMode] = useState('list'); // 'cards' or 'list'
  const [sortBy, setSortBy] = useState('workplace'); // 'workplace', 'name', 'hours'
  const [workers, setWorkers] = useState([]);
  const [workerKpis, setWorkerKpis] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showRehireModal, setShowRehireModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedWorkplace, setSelectedWorkplace] = useState(null);
  const [roles, setRoles] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [cancellingInvite, setCancellingInvite] = useState(null);
  // Records Tab multi-column sorting state (array of { key, direction })
  const [recordsSortConfig, setRecordsSortConfig] = useState([{ key: 'full_name', direction: 'asc' }]);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'invitations') {
        // Load invitations
        const invRes = await api.get('/api/employer/invitations/list');
        setInvitations(invRes.data.data.invitations || []);
      } else if (activeTab === 'active' || activeTab === 'records') {
        // Load worker KPIs for active and records tabs
        const [kpisRes, inactiveRes] = await Promise.all([
          api.get('/api/employer/workforce-management/worker-kpis'),
          api.get('/api/employer/workforce-management/inactive').catch(() => ({ data: { data: { inactive_workers: [] } } }))
        ]);
        setWorkerKpis(kpisRes.data.data.workers || []);
        setWorkers(inactiveRes.data.data.inactive_workers || []);
      } else if (activeTab === 'assignments') {
        // Load workers, shifts, and tasks for drag-drop assignment
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const [kpisRes, shiftsRes, tasksRes] = await Promise.all([
          api.get('/api/employer/workforce-management/worker-kpis'),
          api.get(`/api/calendar/shifts?start_date=${today}&end_date=${nextWeek}`),
          api.get('/api/service-tasks')
        ]);
        
        setWorkerKpis(kpisRes.data.data.workers || []);
        setShifts(shiftsRes.data.data || shiftsRes.data || []);
        
        // Filter tasks that are pending or assigned (not completed)
        const allTasks = tasksRes.data.data?.tasks || [];
        setTasks(allTasks.filter(t => ['pending', 'assigned'].includes(t.status)));
        
        // Also load inactive workers for records tab
        try {
          const inactiveRes = await api.get('/api/employer/workforce-management/inactive');
          setWorkers(inactiveRes.data.data.inactive_workers || []);
        } catch (e) {
          setWorkers([]);
        }
      } else if (activeTab === 'records') {
        // Load both active and inactive workers for records
        const [kpisRes, inactiveRes] = await Promise.all([
          api.get('/api/employer/workforce-management/worker-kpis'),
          api.get('/api/employer/workforce-management/inactive')
        ]);
        setWorkerKpis(kpisRes.data.data.workers || []);
        setWorkers(inactiveRes.data.data.inactive_workers || []);
      } else {
        // Load inactive workers
        const response = await api.get('/api/employer/workforce-management/inactive');
        setWorkers(response.data.data.inactive_workers || []);
        setWorkerKpis([]);
      }
      
      // Load roles and workplaces for invite modal
      const [rolesRes, workplacesRes] = await Promise.all([
        api.get('/api/employer/workplace-roles/list'),
        api.get('/api/employer/workplaces')
      ]);
      setRoles(rolesRes.data.data.roles || []);
      setWorkplaces(workplacesRes.data.data.workplaces || []);
      
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendInvite = async (inviteId) => {
    try {
      await api.post(`/api/employer/invitations/${inviteId}/resend`);
      alert('Invitation resent successfully!');
      loadData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to resend invitation');
    }
  };
  
  const handleCancelInvite = async (inviteId, inviteName) => {
    console.log('Cancel clicked for:', inviteId, inviteName);
    setCancellingInvite(inviteId);
    try {
      await api.delete(`/api/employer/invitations/${inviteId}/cancel`);
      console.log('Cancel successful');
      loadData();
    } catch (error) {
      console.error('Cancel failed:', error);
      alert(error.response?.data?.detail || 'Failed to cancel invitation');
    } finally {
      setCancellingInvite(null);
    }
  };
  
  const openInviteModal = (role = null, workplace = null) => {
    setSelectedRole(role);
    setSelectedWorkplace(workplace);
    setShowInviteModal(true);
  };

  // Export Records Functions
  const handleExportRecords = (format) => {
    const allRecords = [
      ...workerKpis.map(w => ({
        name: w.full_name,
        email: w.email,
        position: w.position_title,
        start_date: w.employment_start_date ? new Date(w.employment_start_date).toLocaleDateString() : '',
        end_date: '',
        shifts: w.total_shifts_completed || 0,
        hours: w.total_hours_worked?.toFixed(1) || 0,
        total_pay: ((w.total_hours_worked || 0) * 18).toFixed(2),
        status: 'Active'
      })),
      ...workers.filter(w => w.status === 'terminated' || w.status === 'laid_off').map(w => ({
        name: w.full_name,
        email: w.email,
        position: w.position_title,
        start_date: w.employment_start_date ? new Date(w.employment_start_date).toLocaleDateString() : '',
        end_date: w.employment_end_date ? new Date(w.employment_end_date).toLocaleDateString() : '',
        shifts: w.total_shifts_completed || 0,
        hours: w.total_hours_worked?.toFixed(1) || 0,
        total_pay: ((w.total_hours_worked || 0) * 18).toFixed(2),
        status: w.termination_reason?.includes('laid') ? 'Laid Off' : 'Terminated'
      }))
    ];

    if (format === 'csv') {
      const headers = ['Name', 'Email', 'Position', 'Start Date', 'End Date', 'Shifts', 'Hours', 'Total Pay', 'Status'];
      const csvContent = [
        headers.join(','),
        ...allRecords.map(r => [r.name, r.email, r.position, r.start_date, r.end_date, r.shifts, r.hours, `$${r.total_pay}`, r.status].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employment_records_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // For PDF, we'll create a printable HTML view
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Employment Records</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .active { color: green; }
              .terminated { color: red; }
              .laid-off { color: orange; }
            </style>
          </head>
          <body>
            <h1>Employment Records</h1>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Shifts</th>
                  <th>Hours</th>
                  <th>Total Pay</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${allRecords.map(r => `
                  <tr>
                    <td>${r.name}</td>
                    <td>${r.position}</td>
                    <td>${r.start_date}</td>
                    <td>${r.end_date || '-'}</td>
                    <td>${r.shifts}</td>
                    <td>${r.hours}h</td>
                    <td>$${r.total_pay}</td>
                    <td class="${r.status.toLowerCase().replace(' ', '-')}">${r.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadWorkerRecord = (worker) => {
    const record = {
      name: worker.full_name,
      email: worker.email,
      position: worker.position_title,
      workplace: worker.workplace_name || 'All Locations',
      start_date: worker.employment_start_date ? new Date(worker.employment_start_date).toLocaleDateString() : '-',
      end_date: worker.employment_end_date ? new Date(worker.employment_end_date).toLocaleDateString() : '-',
      shifts: worker.total_shifts_completed || 0,
      hours: worker.total_hours_worked?.toFixed(1) || 0,
      total_pay: ((worker.total_hours_worked || 0) * 18).toFixed(2),
      status: worker.status === 'active' ? 'Active' : (worker.termination_reason?.includes('laid') ? 'Laid Off' : 'Terminated'),
      termination_reason: worker.termination_reason || '-'
    };

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Employment Record - ${record.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .section { margin: 20px 0; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .label { color: #666; }
            .value { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Employment Record</h1>
          <div class="section">
            <div class="row"><span class="label">Employee Name:</span><span class="value">${record.name}</span></div>
            <div class="row"><span class="label">Email:</span><span class="value">${record.email}</span></div>
            <div class="row"><span class="label">Position:</span><span class="value">${record.position}</span></div>
            <div class="row"><span class="label">Workplace:</span><span class="value">${record.workplace}</span></div>
          </div>
          <div class="section">
            <div class="row"><span class="label">Employment Start:</span><span class="value">${record.start_date}</span></div>
            <div class="row"><span class="label">Employment End:</span><span class="value">${record.end_date}</span></div>
            <div class="row"><span class="label">Status:</span><span class="value">${record.status}</span></div>
            ${record.termination_reason !== '-' ? `<div class="row"><span class="label">Reason:</span><span class="value">${record.termination_reason.replace(/_/g, ' ')}</span></div>` : ''}
          </div>
          <div class="section">
            <div class="row"><span class="label">Total Shifts:</span><span class="value">${record.shifts}</span></div>
            <div class="row"><span class="label">Total Hours:</span><span class="value">${record.hours}h</span></div>
            <div class="row"><span class="label">Total Pay:</span><span class="value">$${record.total_pay}</span></div>
          </div>
          <p style="margin-top: 40px; color: #999; font-size: 12px;">Generated: ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleTerminate = (worker) => {
    setSelectedWorker({...worker, actionType: 'terminate'});
    setShowTerminateModal(true);
  };

  const handleLayOff = (worker) => {
    setSelectedWorker({...worker, actionType: 'layoff'});
    setShowTerminateModal(true);
  };

  const handleRehire = (worker) => {
    setSelectedWorker(worker);
    setShowRehireModal(true);
  };

  // Drag & Drop Assignment Handlers
  const handleAssignWorker = async (worker, target) => {
    try {
      if (target.task_id) {
        // Assign to service task
        await api.post(`/api/service-tasks/${target.task_id}/assign`, {
          worker_id: worker.user_id
        });
      } else if (target.shift_id) {
        // Assign to shift
        await api.post(`/api/calendar/shifts/${target.shift_id}/assign`, {
          worker_id: worker.user_id,
          worker_name: worker.full_name
        });
      }
      // Reload data to reflect changes
      loadData();
    } catch (error) {
      console.error('Assignment failed:', error);
      alert(error.response?.data?.detail || 'Failed to assign worker');
    }
  };

  const handleUnassignWorker = async (target, worker) => {
    try {
      if (target.task_id) {
        // Unassign from service task
        await api.post(`/api/service-tasks/${target.task_id}/unassign`);
      } else if (target.shift_id) {
        // Unassign from shift
        const workerId = worker.worker_id || worker.user_id;
        await api.delete(`/api/employer/shifts/${target.shift_id}/unassign/${workerId}`);
      }
      // Reload data to reflect changes
      loadData();
    } catch (error) {
      console.error('Unassignment failed:', error);
      alert(error.response?.data?.detail || 'Failed to unassign worker');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <ModernSidebar />
      
      <div className="transition-all duration-300 pt-[64px] h-screen flex flex-col" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Sticky Header Section */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 sticky top-0 z-10">
          {/* Page Title */}
          <div className="px-8 py-4 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-sm text-gray-600">Manage your workforce and view worker details</p>
          </div>

          {/* Tabs */}
          <div className="px-8 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-5 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'active'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 border-transparent'
                }`}
                style={{ borderColor: activeTab === 'active' ? theme.primaryColor : 'transparent' }}
              >
                Workforce
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`px-5 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'invitations'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 border-transparent'
                }`}
                style={{ borderColor: activeTab === 'invitations' ? theme.primaryColor : 'transparent' }}
              >
                <FiMail className="inline mr-2" />
                Invitations
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`px-5 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'assignments'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 border-transparent'
                }`}
                style={{ borderColor: activeTab === 'assignments' ? theme.primaryColor : 'transparent' }}
              >
                <FiGrid className="inline mr-2" />
                Assignments
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={`px-5 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'records'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 border-transparent'
                }`}
                style={{ borderColor: activeTab === 'records' ? theme.primaryColor : 'transparent' }}
              >
                <FiFileText className="inline mr-2" />
                Records
              </button>
              <button
                onClick={() => setActiveTab('recruitment')}
                className={`px-5 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'recruitment'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 border-transparent'
                }`}
                style={{ borderColor: activeTab === 'recruitment' ? theme.primaryColor : 'transparent' }}
              >
                <FiUserPlus className="inline mr-2" />
                Recruitment
              </button>
              <button
                onClick={() => setActiveTab('inactive')}
                className={`px-5 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'inactive'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 border-transparent'
                }`}
                style={{ borderColor: activeTab === 'inactive' ? theme.primaryColor : 'transparent' }}
              >
                <FiClock className="inline mr-2" />
                Time-Off
              </button>
            </div>
            
            {/* Invite Button - Only show on Invitations tab */}
            {activeTab === 'invitations' && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <FiUserPlus size={16} />
                Invite Workers
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6">

        {/* View Controls for Workforce Tab */}
        {activeTab === 'active' && (
          <div className="flex items-center justify-between mb-4 bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-4">
              {/* Sort By */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2"
                  style={{ focusRingColor: theme.primaryColor }}
                >
                  <option value="workplace">Workplace / Department</option>
                  <option value="name">Name</option>
                  <option value="hours">Hours (High → Low)</option>
                  <option value="status">Availability Status</option>
                </select>
              </div>
              
              {/* ESA Limits Legend */}
              <div className="flex items-center gap-3 text-xs border-l border-gray-200 pl-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> &lt;40h</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 40-44h</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> 44-48h OT</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> ≥48h Max</span>
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="List View"
              >
                <FiList size={18} className={viewMode === 'list' ? 'text-gray-900' : 'text-gray-500'} />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="Card View"
              >
                <FiGrid size={18} className={viewMode === 'cards' ? 'text-gray-900' : 'text-gray-500'} />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
          </div>
        ) : activeTab === 'invitations' ? (
          /* Invitations Tab */
          invitations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FiMail size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Invitations Sent</h3>
              <p className="text-gray-500 mb-4">Start building your team by inviting workers</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <FiUserPlus className="inline mr-2" />
                Invite Your First Worker
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invite) => (
                    <tr key={invite.invite_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                            {invite.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{invite.full_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{invite.email}</p>
                        {invite.phone && <p className="text-xs text-gray-500">{invite.phone}</p>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{invite.role_name}</p>
                        <p className="text-xs text-gray-500">{invite.occupation_template}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          invite.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                          invite.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          invite.status === 'expired' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invite.status === 'sent' && <FiClock className="inline mr-1" size={12} />}
                          {invite.status === 'accepted' && <FiCheck className="inline mr-1" size={12} />}
                          {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invite.created_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {invite.status === 'sent' && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleResendInvite(invite.invite_id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Resend Invitation"
                            >
                              <FiRefreshCw size={16} />
                            </button>
                            <button
                              onClick={() => handleCancelInvite(invite.invite_id, invite.full_name)}
                              disabled={cancellingInvite === invite.invite_id}
                              className={`p-2 text-red-600 hover:bg-red-50 rounded-lg ${cancellingInvite === invite.invite_id ? 'opacity-50' : ''}`}
                              title="Cancel Invitation"
                            >
                              {cancellingInvite === invite.invite_id ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FiX size={16} />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'assignments' ? (
          /* Drag & Drop Assignments Tab */
          <DragDropAssignment
            workers={workerKpis}
            shifts={shifts}
            tasks={tasks}
            onAssign={handleAssignWorker}
            onUnassign={handleUnassignWorker}
            loading={loading}
          />
        ) : activeTab === 'active' ? (
          /* Workforce with KPIs */
          workerKpis.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FiActivity size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Workers</h3>
              <p className="text-gray-500 mb-4">Start building your team by inviting workers</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <FiUserPlus className="inline mr-2" />
                Invite Your First Worker
              </button>
            </div>
          ) : viewMode === 'list' ? (
            /* LIST VIEW */
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workplace</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">This Week</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Attendance</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...workerKpis]
                    .sort((a, b) => {
                      if (sortBy === 'workplace') return (a.workplace_name || '').localeCompare(b.workplace_name || '');
                      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
                      if (sortBy === 'hours') return (b.week_kpis?.total_hours || 0) - (a.week_kpis?.total_hours || 0);
                      if (sortBy === 'status') {
                        const statusOrder = { unavailable: 0, overtime: 1, approaching: 2, available: 3 };
                        const aStatus = getAvailabilityStatus(a.week_kpis?.total_hours || 0).status;
                        const bStatus = getAvailabilityStatus(b.week_kpis?.total_hours || 0).status;
                        return statusOrder[aStatus] - statusOrder[bStatus];
                      }
                      return 0;
                    })
                    .map((worker) => {
                      const weekHours = worker.week_kpis?.total_hours || 0;
                      const availability = getAvailabilityStatus(weekHours);
                      
                      return (
                        <tr key={worker.user_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                                {worker.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{worker.full_name}</p>
                                <p className="text-xs text-gray-500">{worker.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-700">{worker.workplace_name || 'All Locations'}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{worker.position_title}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                              availability.color === 'green' ? 'bg-green-100 text-green-800' :
                              availability.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                              availability.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {availability.icon} {availability.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="text-sm">
                              <span className={`font-semibold ${
                                weekHours >= ESA_LIMITS.WEEKLY_MAX ? 'text-red-600' :
                                weekHours >= ESA_LIMITS.WEEKLY_OVERTIME ? 'text-orange-600' :
                                weekHours >= 40 ? 'text-amber-600' : 'text-gray-900'
                              }`}>{weekHours}h</span>
                              <span className="text-gray-400"> / {ESA_LIMITS.WEEKLY_MAX}h</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className={`h-1.5 rounded-full ${
                                  weekHours >= ESA_LIMITS.WEEKLY_MAX ? 'bg-red-500' :
                                  weekHours >= ESA_LIMITS.WEEKLY_OVERTIME ? 'bg-orange-500' :
                                  weekHours >= 40 ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min((weekHours / ESA_LIMITS.WEEKLY_MAX) * 100, 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="text-sm font-medium text-gray-900">{worker.week_kpis?.attendance_rate || 100}%</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-600">
                              {worker.total_shifts_completed || 0} shifts
                              <br />
                              <span className="text-xs text-gray-400">{worker.total_hours_worked?.toFixed(0) || 0}h total</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleLayOff(worker)}
                                className="px-2 py-1 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                                title="Lay off - Worker eligible for EI"
                              >
                                Lay Off
                              </button>
                              <button
                                onClick={() => handleTerminate(worker)}
                                className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50"
                                title="Terminate for cause"
                              >
                                Terminate
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            /* CARD VIEW (existing) */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...workerKpis]
                .sort((a, b) => {
                  if (sortBy === 'workplace') return (a.workplace_name || '').localeCompare(b.workplace_name || '');
                  if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
                  if (sortBy === 'hours') return (b.week_kpis?.total_hours || 0) - (a.week_kpis?.total_hours || 0);
                  return 0;
                })
                .map((worker) => (
                <div key={worker.user_id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Worker Header */}
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center relative">
                          {worker.profile_picture ? (
                            <img src={worker.profile_picture} alt={worker.full_name} className="w-14 h-14 rounded-full object-cover" />
                          ) : (
                            <span className="text-xl font-bold text-gray-600">
                              {worker.full_name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                          {/* Status indicator */}
                          {worker.today_status?.is_clocked_in && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" title="Clocked In" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{worker.full_name}</h3>
                          <p className="text-sm text-gray-500">{worker.position_title || worker.employment_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {worker.today_status?.is_scheduled ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            worker.today_status.is_clocked_in 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {worker.today_status.is_clocked_in ? '🟢 On Duty' : '📅 Scheduled'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            Off Today
                          </span>
                        )}
                        {worker.average_rating && (
                          <div className="mt-1 text-sm text-gray-600">⭐ {worker.average_rating.toFixed(1)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* This Week KPIs */}
                  <div className="p-5 bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                      <FiTrendingUp className="text-blue-500" size={16} />
                      <span className="text-sm font-medium text-gray-700">This Week</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-blue-600">{worker.week_kpis?.total_hours || 0}</div>
                        <div className="text-xs text-gray-500">Hours</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-green-600">{worker.week_kpis?.shifts_completed || 0}</div>
                        <div className="text-xs text-gray-500">Shifts</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-orange-600">{worker.week_kpis?.tasks_completed || 0}</div>
                        <div className="text-xs text-gray-500">Tasks</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-purple-600">{worker.week_kpis?.attendance_rate || 100}%</div>
                        <div className="text-xs text-gray-500">Attendance</div>
                      </div>
                    </div>
                    
                    {/* Hours breakdown */}
                    {(worker.week_kpis?.shift_hours > 0 || worker.week_kpis?.task_hours > 0) && (
                      <div className="mt-3 flex gap-2 text-xs text-gray-500">
                        <span className="px-2 py-1 bg-blue-50 rounded">{worker.week_kpis?.shift_hours || 0}h shifts</span>
                        <span className="px-2 py-1 bg-orange-50 rounded">{worker.week_kpis?.task_hours || 0}h tasks</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Overall Stats & Actions */}
                  <div className="p-5 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{worker.total_shifts_completed || 0}</span> total shifts • 
                      <span className="font-medium text-gray-700 ml-1">{worker.total_hours_worked?.toFixed(0) || 0}h</span> total
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLayOff(worker)}
                        className="px-3 py-1.5 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                        title="Lay off - Worker eligible for EI benefits"
                      >
                        Lay Off
                      </button>
                      <button
                        onClick={() => handleTerminate(worker)}
                        className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                        title="Terminate for cause - May affect EI eligibility"
                      >
                        Terminate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'records' ? (
          /* Employment Records Tab - Sortable Table */
          <RecordsTable 
            activeWorkers={workerKpis}
            pastWorkers={workers.filter(w => w.status === 'terminated' || w.status === 'laid_off')}
            sortConfig={recordsSortConfig}
            setSortConfig={setRecordsSortConfig}
            onExport={handleExportRecords}
            onDownloadWorker={handleDownloadWorkerRecord}
            theme={theme}
          />
        ) : activeTab === 'recruitment' ? (
          /* Recruitment Tab */
          <RecruitmentPanel 
            roles={roles}
            workplaces={workplaces}
            theme={theme}
          />
        ) : (
          /* Time-Off Tab */
          workers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FiClock size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Time-Off Requests</h3>
              <p className="text-gray-500">Workers can request time-off from their dashboard</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map((worker) => (
              <div key={worker.user_id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {worker.profile_picture ? (
                        <img src={worker.profile_picture} alt={worker.full_name} className="w-12 h-12 rounded-full" />
                      ) : (
                        <span className="text-xl font-bold text-gray-600">
                          {worker.full_name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{worker.full_name}</h3>
                      <p className="text-sm text-gray-500">{worker.position_title || worker.employment_type}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    worker.eligible_for_rehire 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {worker.eligible_for_rehire ? 'Eligible' : 'Not Eligible'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Shifts Completed:</span>
                    <span className="font-medium">{worker.total_shifts_completed || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Hours Worked:</span>
                    <span className="font-medium">{worker.total_hours_worked?.toFixed(1) || 0}h</span>
                  </div>
                  {worker.average_rating && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Rating:</span>
                      <span className="font-medium">⭐ {worker.average_rating.toFixed(1)}</span>
                    </div>
                  )}
                  
                  {worker.termination_reason && (
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        <strong>Reason:</strong> {worker.termination_reason.replace(/_/g, ' ')}
                      </p>
                      {worker.employment_end_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          <strong>Ended:</strong> {new Date(worker.employment_end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {worker.eligible_for_rehire && (
                  <button
                    onClick={() => handleRehire(worker)}
                    className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Rehire
                  </button>
                )}
              </div>
            ))}
          </div>
          )
        )}
          </div>
        </main>
      </div>

      {/* Terminate Modal */}
      {showTerminateModal && selectedWorker && (
        <TerminateModal
          worker={selectedWorker}
          onClose={() => {
            setShowTerminateModal(false);
            setSelectedWorker(null);
          }}
          onSuccess={() => {
            setShowTerminateModal(false);
            setSelectedWorker(null);
            loadData();
          }}
          theme={theme}
        />
      )}

      {/* Rehire Modal */}
      {showRehireModal && selectedWorker && (
        <RehireModal
          worker={selectedWorker}
          onClose={() => {
            setShowRehireModal(false);
            setSelectedWorker(null);
          }}
          onSuccess={() => {
            setShowRehireModal(false);
            setSelectedWorker(null);
            loadData();
          }}
          theme={theme}
        />
      )}
      
      {/* Worker Invite Modal */}
      {showInviteModal && (
        <InviteModalWrapper
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setSelectedRole(null);
            setSelectedWorkplace(null);
          }}
          onSuccess={() => {
            setShowInviteModal(false);
            setSelectedRole(null);
            setSelectedWorkplace(null);
            setActiveTab('invitations');
            loadData();
          }}
          roles={roles}
          workplaces={workplaces}
          selectedRole={selectedRole}
          selectedWorkplace={selectedWorkplace}
          theme={theme}
        />
      )}
    </div>
  );
};

// Invite Modal Wrapper - allows selecting role/workplace before inviting
const InviteModalWrapper = ({ isOpen, onClose, onSuccess, roles, workplaces, selectedRole, selectedWorkplace, theme }) => {
  const [step, setStep] = useState(selectedRole && selectedWorkplace ? 'invite' : 'select');
  const [chosenRole, setChosenRole] = useState(selectedRole);
  const [chosenWorkplace, setChosenWorkplace] = useState(selectedWorkplace);
  
  // Filter roles based on selected workplace
  const filteredRoles = chosenWorkplace 
    ? roles.filter(r => r.workplace_id === chosenWorkplace.workplace_id)
    : roles;
    
  if (!isOpen) return null;
  
  if (step === 'select') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: theme.primaryColor }}>
            <h2 className="text-xl font-bold text-white">Select Position to Fill</h2>
            <p className="text-white text-opacity-80 text-sm">Choose a workplace and role for new workers</p>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Workplace Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Workplace</label>
              <select
                value={chosenWorkplace?.workplace_id || ''}
                onChange={(e) => {
                  const wp = workplaces.find(w => w.workplace_id === e.target.value);
                  setChosenWorkplace(wp);
                  setChosenRole(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
              >
                <option value="">Select a workplace...</option>
                {workplaces.map(wp => (
                  <option key={wp.workplace_id} value={wp.workplace_id}>
                    {wp.name || wp.workplace_name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Role Selection */}
            {chosenWorkplace && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                {filteredRoles.length === 0 ? (
                  <p className="text-sm text-gray-500">No roles found for this workplace. Please create roles first.</p>
                ) : (
                  <select
                    value={chosenRole?.role_id || ''}
                    onChange={(e) => {
                      const role = filteredRoles.find(r => r.role_id === e.target.value);
                      setChosenRole(role);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  >
                    <option value="">Select a role...</option>
                    {filteredRoles.map(role => (
                      <option key={role.role_id} value={role.role_id}>
                        {role.role_name} - ${role.hourly_rate?.toFixed(2)}/hr
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex justify-between">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep('invite')}
              disabled={!chosenRole || !chosenWorkplace}
              className="px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show the actual invite modal
  return (
    <WorkerInviteModal
      isOpen={true}
      onClose={onClose}
      role={{ role_id: chosenRole.role_id, title: chosenRole.role_name }}
      workplace={{ workplace_id: chosenWorkplace.workplace_id, name: chosenWorkplace.name || chosenWorkplace.workplace_name }}
    />
  );
};

// Terminate/Lay Off Modal Component
const TerminateModal = ({ worker, onClose, onSuccess, theme }) => {
  const isLayoff = worker.actionType === 'layoff';
  
  const [formData, setFormData] = useState({
    termination_reason: isLayoff ? 'laid_off' : 'terminated_cause',
    termination_notes: '',
    last_working_day: new Date().toISOString().split('T')[0],
    eligible_for_rehire: isLayoff ? true : false,
    cancel_future_shifts: true,
    notify_worker: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/api/employer/workforce-management/${worker.user_id}/terminate`, formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className={`text-lg font-semibold mb-2 ${isLayoff ? 'text-amber-700' : 'text-red-700'}`}>
          {isLayoff ? '📋 Lay Off' : '⚠️ Terminate'} - {worker.full_name}
        </h3>
        
        {/* EI Eligibility Notice */}
        <div className={`p-3 rounded-lg mb-4 text-sm ${isLayoff ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
          {isLayoff ? (
            <div className="text-amber-800">
              <strong>Lay Off (No Fault)</strong>
              <p className="mt-1">Worker will be eligible for Employment Insurance (EI) benefits. ROE will show "Shortage of work" as separation reason.</p>
              <p className="mt-1 text-xs">Worker will be added to the match engine for new job opportunities.</p>
            </div>
          ) : (
            <div className="text-red-800">
              <strong>Termination for Cause</strong>
              <p className="mt-1">Worker may NOT be eligible for EI benefits. ROE will show "Dismissed" as separation reason. Service Canada may investigate.</p>
              <p className="mt-1 text-xs">Worker will be added to the match engine for new job opportunities.</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <select
              value={formData.termination_reason}
              onChange={(e) => setFormData({ ...formData, termination_reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{ focusRingColor: theme.primaryColor }}
            >
              {isLayoff ? (
                <>
                  <option value="laid_off">Laid Off - Shortage of Work</option>
                  <option value="contract_ended">Contract Ended</option>
                  <option value="business_closure">Business Closure</option>
                  <option value="seasonal_end">Seasonal Position Ended</option>
                </>
              ) : (
                <>
                  <option value="terminated_cause">Terminated - Misconduct</option>
                  <option value="terminated_performance">Terminated - Poor Performance</option>
                  <option value="policy_violation">Policy Violation</option>
                  <option value="no_show">Job Abandonment / No Show</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Day</label>
            <input
              type="date"
              value={formData.last_working_day}
              onChange={(e) => setFormData({ ...formData, last_working_day: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes {isLayoff ? '(Optional)' : '(Required for documentation)'}
            </label>
            <textarea
              value={formData.termination_notes}
              onChange={(e) => setFormData({ ...formData, termination_notes: e.target.value })}
              rows={3}
              required={!isLayoff}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder={isLayoff 
                ? "Optional: Reason for layoff..." 
                : "Document the reason for termination (required for ROE and potential disputes)..."
              }
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.cancel_future_shifts}
                onChange={(e) => setFormData({ ...formData, cancel_future_shifts: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Cancel all future shifts</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.eligible_for_rehire}
                onChange={(e) => setFormData({ ...formData, eligible_for_rehire: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Eligible for rehire</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.notify_worker}
                onChange={(e) => setFormData({ ...formData, notify_worker: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Notify worker via email</span>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                isLayoff 
                  ? 'bg-amber-600 hover:bg-amber-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Processing...' : (isLayoff ? 'Confirm Lay Off' : 'Confirm Termination')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Rehire Modal Component
const RehireModal = ({ worker, onClose, onSuccess, theme }) => {
  const [formData, setFormData] = useState({
    employment_type: 'contract',
    position_title: worker.position_title || '',
    rehire_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/api/employer/workforce-management/${worker.user_id}/rehire`, formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to rehire worker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Rehire - {worker.full_name}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
            <select
              value={formData.employment_type}
              onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            >
              <option value="contract">Contract</option>
              <option value="part_time">Part Time</option>
              <option value="full_time">Full Time</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position Title</label>
            <input
              type="text"
              value={formData.position_title}
              onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="e.g., Server, Chef, Manager"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.rehire_notes}
              onChange={(e) => setFormData({ ...formData, rehire_notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="Welcome back message or additional details..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {loading ? 'Processing...' : 'Rehire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkforceManagement;
