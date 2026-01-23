import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import WorkPassportSidebar from '../../components/layout/WorkPassportSidebar';
import WorkPassportHeader from '../../components/layout/WorkPassportHeader';
import api from '../../utils/api';
import { 
  FiArrowLeft, 
  FiCheck, 
  FiUpload, 
  FiFileText, 
  FiShield, 
  FiBriefcase,
  FiDollarSign,
  FiCalendar,
  FiMapPin,
  FiAlertCircle
} from 'react-icons/fi';

const UpgradeToWorkforce = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [documents, setDocuments] = useState({
    work_permit: null,
    sin_card: null,
    government_id: null
  });
  
  const [formData, setFormData] = useState({
    sin_last_three: '',
    work_eligibility_type: '', // citizen, pr, work_permit, student_visa
    preferred_regions: [],
    agreed_to_terms: false
  });

  const workEligibilityOptions = [
    { value: 'citizen', label: 'Canadian Citizen', icon: '🇨🇦' },
    { value: 'pr', label: 'Permanent Resident', icon: '🏠' },
    { value: 'work_permit', label: 'Work Permit Holder', icon: '📄' },
    { value: 'student_visa', label: 'Student Visa (with work rights)', icon: '🎓' }
  ];

  const canadianProvinces = [
    'ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'
  ];

  const benefits = [
    { icon: FiBriefcase, title: 'Job Matching', desc: 'Get matched with verified Canadian employers' },
    { icon: FiCalendar, title: 'Shift Management', desc: 'Accept shifts and manage your schedule' },
    { icon: FiDollarSign, title: 'Easy Payments', desc: 'Get paid through our secure payroll system' },
    { icon: FiShield, title: 'Worker Protection', desc: 'Access to worker rights and support' }
  ];

  const handleFileUpload = (type) => {
    fileInputRef.current.dataset.docType = type;
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const docType = e.target.dataset.docType;
    
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      setDocuments(prev => ({
        ...prev,
        [docType]: file
      }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      if (!formData.work_eligibility_type) {
        setError('Please select your work eligibility status');
        return;
      }
      setStep(2);
      setError('');
      return;
    }
    
    if (step === 2) {
      // For citizens/PR, SIN verification is required
      if (['citizen', 'pr'].includes(formData.work_eligibility_type)) {
        if (!documents.government_id) {
          setError('Please upload a government ID');
          return;
        }
      } else {
        // Work permit/student visa requires permit document
        if (!documents.work_permit) {
          setError('Please upload your work permit or study permit');
          return;
        }
      }
      setStep(3);
      setError('');
      return;
    }

    if (!formData.agreed_to_terms) {
      setError('Please agree to the terms to continue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create form data for file upload
      const submitData = new FormData();
      submitData.append('work_eligibility_type', formData.work_eligibility_type);
      submitData.append('sin_last_three', formData.sin_last_three);
      submitData.append('preferred_regions', JSON.stringify(formData.preferred_regions));
      
      if (documents.government_id) {
        submitData.append('government_id', documents.government_id);
      }
      if (documents.work_permit) {
        submitData.append('work_permit', documents.work_permit);
      }

      const response = await api.post('/api/workpassport/upgrade-to-workforce', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setStep(4); // Success step
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Upgrade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkPassportHeader />
      <WorkPassportSidebar />
      
      <div className="transition-all duration-300 pt-16" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-8 text-white">
          <button
            onClick={() => step > 1 && step < 4 ? setStep(step - 1) : navigate('/workpassport/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <FiArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-3xl font-bold mb-2">Upgrade to Workforce</h1>
          <p className="text-purple-100">
            Unlock job matching and start working with Canadian employers
          </p>
        </div>

        <div className="max-w-4xl mx-auto p-8">
          {/* Progress Steps */}
          {step < 4 && (
            <div className="flex items-center justify-center gap-4 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s ? <FiCheck /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-16 h-1 rounded ${
                      step > s ? 'bg-purple-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Work Eligibility */}
          {step === 1 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Work Eligibility in Canada</h2>
              <p className="text-gray-600 mb-6">Select your current work authorization status</p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <FiAlertCircle />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {workEligibilityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, work_eligibility_type: option.value }))}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.work_eligibility_type === option.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{option.icon}</span>
                    <h3 className="font-semibold text-gray-900">{option.label}</h3>
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Document Upload */}
          {step === 2 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
              <p className="text-gray-600 mb-6">
                Upload documents to verify your work eligibility
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <FiAlertCircle />
                  {error}
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
              />

              <div className="space-y-4 mb-8">
                {/* Government ID - Required for Citizens/PR */}
                {['citizen', 'pr'].includes(formData.work_eligibility_type) && (
                  <div
                    onClick={() => handleFileUpload('government_id')}
                    className={`p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      documents.government_id ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        documents.government_id ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {documents.government_id ? <FiCheck size={24} /> : <FiUpload size={24} />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Government ID</h3>
                        <p className="text-sm text-gray-500">
                          {documents.government_id 
                            ? documents.government_id.name 
                            : 'Driver\'s License, Passport, or Provincial ID'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Work Permit - Required for work permit/student visa */}
                {['work_permit', 'student_visa'].includes(formData.work_eligibility_type) && (
                  <div
                    onClick={() => handleFileUpload('work_permit')}
                    className={`p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      documents.work_permit ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        documents.work_permit ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {documents.work_permit ? <FiCheck size={24} /> : <FiFileText size={24} />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {formData.work_eligibility_type === 'student_visa' ? 'Study Permit' : 'Work Permit'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {documents.work_permit 
                            ? documents.work_permit.name 
                            : 'Upload your valid permit document'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SIN Last 3 Digits - Optional but helps verification */}
                <div className="p-6 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                      <FiShield size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">SIN Last 3 Digits (Optional)</h3>
                      <p className="text-sm text-gray-500 mb-2">Helps verify your identity faster</p>
                      <input
                        type="text"
                        maxLength={3}
                        value={formData.sin_last_three}
                        onChange={(e) => setFormData(prev => ({ ...prev, sin_last_three: e.target.value.replace(/\D/g, '') }))}
                        className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="XXX"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
                <p className="text-sm text-blue-800">
                  <strong>🔒 Your documents are secure.</strong> We use bank-level encryption and only share verified status with employers, never the documents themselves.
                </p>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 3: Preferences & Confirmation */}
          {step === 3 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Almost There!</h2>
              <p className="text-gray-600 mb-6">Set your preferences and complete your upgrade</p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <FiAlertCircle />
                  {error}
                </div>
              )}

              {/* Preferred Work Regions */}
              <div className="mb-8">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FiMapPin className="text-purple-600" />
                  Preferred Work Regions (Optional)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {canadianProvinces.map(province => (
                    <button
                      key={province}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          preferred_regions: prev.preferred_regions.includes(province)
                            ? prev.preferred_regions.filter(p => p !== province)
                            : [...prev.preferred_regions, province]
                        }));
                      }}
                      className={`px-4 py-2 rounded-lg border transition-all ${
                        formData.preferred_regions.includes(province)
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {province}
                    </button>
                  ))}
                </div>
              </div>

              {/* What you'll get */}
              <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-4">What you'll unlock:</h3>
                <div className="grid grid-cols-2 gap-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <benefit.icon className="text-purple-600 mt-1" size={20} />
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{benefit.title}</h4>
                        <p className="text-xs text-gray-600">{benefit.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms Agreement */}
              <label className="flex items-start gap-3 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreed_to_terms}
                  onChange={(e) => setFormData(prev => ({ ...prev, agreed_to_terms: e.target.checked }))}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-600">
                  I agree to the <a href="/terms" className="text-purple-600 hover:underline">Workforce Terms of Service</a> and 
                  authorize HR Bank to verify my work eligibility documents. I understand that false information may result in 
                  account termination.
                </span>
              </label>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Complete Upgrade'}
              </button>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiCheck size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upgrade Request Submitted!</h2>
              <p className="text-gray-600 mb-6">
                Your documents are being reviewed. This usually takes 1-2 business days.
              </p>
              
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl mb-6">
                <p className="text-sm text-purple-800">
                  We'll send you an email once your Workforce account is activated. 
                  In the meantime, you can continue using your WorkPassport.
                </p>
              </div>

              <button
                onClick={() => navigate('/workpassport/dashboard')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpgradeToWorkforce;
