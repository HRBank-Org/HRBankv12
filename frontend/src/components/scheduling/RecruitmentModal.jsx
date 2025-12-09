import React, { useState, useEffect } from 'react';
import { FiX, FiUsers, FiSearch, FiMapPin, FiStar, FiCheckCircle, FiAlertCircle, FiUser } from 'react-icons/fi';
import api from '../../utils/api';

const RecruitmentModal = ({ isOpen, onClose, workplaces, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Setup, 2: View Candidates
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    workplace_id: '',
    occupation_template_id: '',
    shift_date: '',
    start_time: '09:00',
    end_time: '17:00',
    required_skills: [],
    required_certifications: []
  });
  
  // Candidates data
  const [internalCandidates, setInternalCandidates] = useState([]);
  const [externalCandidates, setExternalCandidates] = useState([]);
  const [templateInfo, setTemplateInfo] = useState(null);
  const [showExternal, setShowExternal] = useState(false);
  
  // Occupation templates
  const [occupationTemplates, setOccupationTemplates] = useState([]);

  useEffect(() => {
    if (workplaces.length > 0 && !formData.workplace_id) {
      setFormData(prev => ({ ...prev, workplace_id: workplaces[0].workplace_id }));
    }
  }, [workplaces]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await api.get('/api/occupation-templates/list');
        setOccupationTemplates(response.data.data.templates || []);
      } catch (err) {
        console.error('Failed to load occupation templates:', err);
      }
    };
    
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!formData.occupation_template_id) {
      setError('Please select an occupation template');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/recruitment/find-candidates', formData);
      
      setInternalCandidates(response.data.data.internal_candidates || []);
      setExternalCandidates(response.data.data.external_candidates || []);
      setTemplateInfo(response.data.data.template_info);
      setStep(2);
      setShowExternal(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to search candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCandidate = async (candidateId) => {
    try {
      await api.post('/api/recruitment/invite-candidate', {
        workforce_id: candidateId,
        role_id: 'temp_role_id', // TODO: Create role first
        message: 'We would like to invite you to join our team!'
      });
      
      alert('Invitation sent successfully!');
    } catch (err) {
      alert('Failed to send invitation: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const renderCandidate = (candidate) => {
    const isInternal = candidate.is_internal;
    
    return (
      <div 
        key={candidate.workforce_id}
        className={`bg-white border-2 rounded-lg p-4 hover:shadow-lg transition-shadow ${
          isInternal ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
        }`}
      >
        {/* Internal Badge */}
        {isInternal && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
              <FiUser className="w-3 h-3" />
              Current Employee
            </span>
          </div>
        )}
        
        <div className="flex items-start gap-4">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {candidate.profile_picture ? (
              <img 
                src={candidate.profile_picture} 
                alt={candidate.full_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xl border-2 border-gray-300">
                {candidate.full_name?.charAt(0) || '?'}
              </div>
            )}
          </div>

          {/* Candidate Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{candidate.full_name}</h4>
                <p className="text-sm text-gray-600">{candidate.occupation_title}</p>
                
                {/* Internal employment info */}
                {isInternal && candidate.current_position && (
                  <p className="text-xs text-blue-700 mt-1">
                    Current Position: {candidate.current_position}
                  </p>
                )}
              </div>

              {/* Match Score Badge */}
              <div className="flex flex-col items-end gap-1">
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                  candidate.match_score >= 80 ? 'bg-green-100 text-green-800' :
                  candidate.match_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {candidate.match_score}% Match
                </div>
                
                {/* Rating */}
                {candidate.average_rating > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <FiStar className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="font-semibold">{candidate.average_rating.toFixed(1)}</span>
                    <span>({candidate.total_reviews})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Skills */}
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {candidate.skills.slice(0, 6).map((skill, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {skill}
                    </span>
                  ))}
                  {candidate.skills.length > 6 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                      +{candidate.skills.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Location & Rate */}
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <FiMapPin className="w-4 h-4" />
                <span>{candidate.distance_km} km away</span>
              </div>
              
              {candidate.hourly_rate_preference && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">${candidate.hourly_rate_preference}/hr</span>
                  <span className="text-gray-500">preferred</span>
                </div>
              )}
            </div>

            {/* Verification Status */}
            <div className="mt-2 flex items-center gap-3 text-xs">
              {candidate.address_verified && candidate.address_locked && (
                <div className="flex items-center gap-1 text-green-600">
                  <FiCheckCircle className="w-3 h-3" />
                  <span>Verified Address</span>
                </div>
              )}
              {candidate.email_verified && (
                <div className="flex items-center gap-1 text-green-600">
                  <FiCheckCircle className="w-3 h-3" />
                  <span>Verified Email</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleInviteCandidate(candidate.workforce_id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {isInternal ? 'Assign to Role' : 'Send Invitation'}
              </button>
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                View Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" 
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiUsers className="w-6 h-6 text-white" />
              <div>
                <h3 className="text-xl font-bold text-white">Find Candidates for Role</h3>
                <p className="text-sm text-blue-100">
                  {step === 1 ? 'Step 1: Select Role Details' : 'Step 2: Review Candidates'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Setup */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>💡 How it works:</strong> We'll first search for suitable candidates from your current workforce, 
                    then show you external candidates from our platform if you need more options.
                  </p>
                </div>

                {/* Workplace */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiMapPin className="inline w-4 h-4 mr-1" />
                    Workplace *
                  </label>
                  <select
                    value={formData.workplace_id}
                    onChange={(e) => setFormData({ ...formData, workplace_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {workplaces.map(wp => (
                      <option key={wp.workplace_id} value={wp.workplace_id}>
                        {wp.workplace_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Occupation Template */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiUsers className="inline w-4 h-4 mr-1" />
                    Occupation / Position *
                  </label>
                  <select
                    value={formData.occupation_template_id}
                    onChange={(e) => setFormData({ ...formData, occupation_template_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Occupation --</option>
                    {occupationTemplates.map(template => (
                      <option key={template.template_id} value={template.template_id}>
                        {template.occupation_title} ({template.occupation_category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional: Shift Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shift Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.shift_date}
                      onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Search Button */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FiSearch className="w-4 h-4" />
                    {loading ? 'Searching...' : 'Find Candidates'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: View Candidates */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Template Info */}
                {templateInfo && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Searching for: {templateInfo.occupation_title}
                    </h4>
                    <div className="text-sm text-gray-600">
                      <p><strong>Category:</strong> {templateInfo.occupation_category}</p>
                      {templateInfo.required_skills && templateInfo.required_skills.length > 0 && (
                        <p><strong>Required Skills:</strong> {templateInfo.required_skills.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Internal Candidates Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <FiUser className="w-5 h-5 text-blue-600" />
                      Your Current Workforce ({internalCandidates.length})
                    </h4>
                  </div>

                  {internalCandidates.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-yellow-800">
                        No matching candidates found in your current workforce.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {internalCandidates.map(candidate => renderCandidate(candidate))}
                    </div>
                  )}
                </div>

                {/* Divider & Show External Button */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    {!showExternal ? (
                      <button
                        onClick={() => setShowExternal(true)}
                        className="px-6 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                      >
                        Show External Candidates ({externalCandidates.length})
                      </button>
                    ) : (
                      <span className="px-4 py-2 bg-white text-gray-600 text-sm font-medium">
                        External Platform Candidates
                      </span>
                    )}
                  </div>
                </div>

                {/* External Candidates Section */}
                {showExternal && (
                  <div>
                    <div className="mb-4">
                      <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FiUsers className="w-5 h-5 text-green-600" />
                        Platform Candidates ({externalCandidates.length})
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Verified candidates from our platform who match your requirements
                      </p>
                    </div>

                    {externalCandidates.length === 0 ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600">
                          No external candidates match your requirements at this time.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {externalCandidates.map(candidate => renderCandidate(candidate))}
                      </div>
                    )}
                  </div>
                )}

                {/* Back Button */}
                <div className="flex justify-start gap-3 pt-4 border-t">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    ← Back to Search
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruitmentModal;
