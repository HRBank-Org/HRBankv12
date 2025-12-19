import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const ComplianceOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [legalTexts, setLegalTexts] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState(null);
  
  // Form data
  const [payrollProvider, setPayrollProvider] = useState('');
  const [classificationAcknowledged, setClassificationAcknowledged] = useState(false);
  const [termsAcknowledged, setTermsAcknowledged] = useState(false);
  
  // WSIB data
  const [wsibData, setWsibData] = useState({
    wsib_account_number: '',
    industry_type: '',
    issue_date: '',
    expiry_date: '',
    certificate_file: null,
    certificate_url: ''
  });
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadLegalTexts();
    checkComplianceStatus();
  }, []);

  const loadLegalTexts = async () => {
    try {
      const response = await api.get('/api/compliance/employer/legal-texts');
      setLegalTexts(response.data.data);
    } catch (error) {
      console.error('Failed to load legal texts:', error);
    }
  };

  const checkComplianceStatus = async () => {
    try {
      const response = await api.get('/api/compliance/employer/status');
      const status = response.data.data.compliance;
      setComplianceStatus(status);
      
      // Determine which step to show based on completion
      if (status.classification_confirmed && status.wsib_verified && status.terms_acknowledged) {
        // All complete, redirect to dashboard
        navigate('/employer/home');
      } else if (status.classification_confirmed && status.wsib_account_number && !status.wsib_verified) {
        // Waiting for WSIB verification
        setStep(4);
      } else if (status.classification_confirmed && !status.wsib_account_number) {
        // Need to upload WSIB
        setStep(2);
      } else if (!status.classification_confirmed) {
        // Need to confirm classification
        setStep(1);
      }
    } catch (error) {
      console.error('Failed to check compliance status:', error);
    }
  };

  const handleConfirmClassification = async () => {
    if (!payrollProvider) {
      setMessage({ type: 'error', text: 'Please select a payroll provider' });
      return;
    }
    
    if (!classificationAcknowledged) {
      setMessage({ type: 'error', text: 'Please acknowledge that workers are employees' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/compliance/employer/confirm-classification', {
        payroll_provider: payrollProvider
      });
      
      setMessage({ type: 'success', text: 'Worker classification confirmed!' });
      setTimeout(() => {
        setStep(2);
        setMessage({ type: '', text: '' });
      }, 1500);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to confirm classification' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Upload file first
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(50);
      const uploadResponse = await api.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setUploadProgress(100);
      setWsibData(prev => ({
        ...prev,
        certificate_file: file,
        certificate_url: uploadResponse.data.data.file_url
      }));
      
      setMessage({ type: 'success', text: 'Certificate uploaded successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload file' });
    }
  };

  const handleSubmitWSIB = async () => {
    if (!wsibData.wsib_account_number || !wsibData.industry_type || 
        !wsibData.issue_date || !wsibData.expiry_date || !wsibData.certificate_url) {
      setMessage({ type: 'error', text: 'Please fill in all WSIB fields and upload certificate' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/compliance/employer/wsib/upload', {
        wsib_account_number: wsibData.wsib_account_number,
        industry_type: wsibData.industry_type,
        certificate_url: wsibData.certificate_url,
        issue_date: wsibData.issue_date,
        expiry_date: wsibData.expiry_date
      });
      
      setMessage({ type: 'success', text: 'WSIB certificate submitted for verification!' });
      setTimeout(() => {
        setStep(3);
        setMessage({ type: '', text: '' });
      }, 1500);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to submit WSIB certificate' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeTerms = async () => {
    if (!termsAcknowledged) {
      setMessage({ type: 'error', text: 'Please acknowledge the terms of service' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/compliance/employer/acknowledge-terms');
      
      setMessage({ type: 'success', text: 'Terms acknowledged! Checking final status...' });
      setTimeout(() => {
        checkComplianceStatus();
      }, 1500);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to acknowledge terms' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!legalTexts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Employer Compliance Setup
          </h1>
          <p className="text-gray-600">
            Complete these steps to start posting shifts and hiring workers
          </p>
          
          {/* Progress Bar */}
          <div className="mt-6 flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-orange-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex justify-between text-sm">
            <span className={step >= 1 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
              Worker Classification
            </span>
            <span className={step >= 2 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
              WSIB Coverage
            </span>
            <span className={step >= 3 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
              Terms of Service
            </span>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`rounded-lg p-4 mb-6 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Step 1: Worker Classification */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Step 1: Worker Classification
            </h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-yellow-900 mb-2">⚠️ IMPORTANT: Worker Classification</h3>
              <div className="text-sm text-yellow-800 whitespace-pre-line">
                {legalTexts.classification_disclosure}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Your Payroll Provider <span className="text-red-500">*</span>
                </label>
                <select
                  value={payrollProvider}
                  onChange={(e) => setPayrollProvider(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Choose payroll provider...</option>
                  {legalTexts.payroll_providers.map(provider => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  You must use T4 payroll (CRA deductions). Contractor/T4A is not allowed.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={classificationAcknowledged}
                    onChange={(e) => setClassificationAcknowledged(e.target.checked)}
                    className="mt-1 w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">
                    <strong className="text-gray-900">I confirm</strong> that workers on HR Bank are my EMPLOYEES (not independent contractors). I will use CRA T4 payroll (not T4A) and comply with all Employment Standards Act requirements.
                  </span>
                </label>
              </div>

              <button
                onClick={handleConfirmClassification}
                disabled={loading || !payrollProvider || !classificationAcknowledged}
                className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Confirming...' : 'Confirm & Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: WSIB Upload */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Step 2: WSIB Coverage
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-blue-900 mb-2">📋 WSIB Requirement</h3>
              <p className="text-sm text-blue-800">
                Workplace Safety and Insurance Board (WSIB) coverage is required for all employers in Ontario. Upload your current WSIB Certificate of Clearance. Our admin team will verify it within 24-48 hours.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WSIB Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={wsibData.wsib_account_number}
                  onChange={(e) => setWsibData(prev => ({ ...prev, wsib_account_number: e.target.value }))}
                  placeholder="e.g., 12345678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={wsibData.industry_type}
                  onChange={(e) => setWsibData(prev => ({ ...prev, industry_type: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select industry type...</option>
                  {legalTexts.wsib_industry_types.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={wsibData.issue_date}
                    onChange={(e) => setWsibData(prev => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={wsibData.expiry_date}
                    onChange={(e) => setWsibData(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WSIB Certificate (PDF or Image) <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="wsib-upload"
                  />
                  <label htmlFor="wsib-upload" className="cursor-pointer">
                    {wsibData.certificate_file ? (
                      <div className="text-green-600">
                        ✓ {wsibData.certificate_file.name}
                      </div>
                    ) : (
                      <>
                        <div className="text-4xl mb-2">📄</div>
                        <div className="text-sm text-gray-600">
                          Click to upload WSIB Certificate
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          PDF, JPG, or PNG (max 5MB)
                        </div>
                      </>
                    )}
                  </label>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitWSIB}
                  disabled={loading}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Terms of Service */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Step 3: Terms of Service
            </h2>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 max-h-96 overflow-y-auto">
              <div className="text-sm text-gray-700 whitespace-pre-line">
                {legalTexts.terms_of_service}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAcknowledged}
                  onChange={(e) => setTermsAcknowledged(e.target.checked)}
                  className="mt-1 w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">
                  <strong className="text-gray-900">I Agree</strong> to the HR Bank Terms of Service. I understand that I am the employer and responsible for all employment law compliance.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleAcknowledgeTerms}
                disabled={loading || !termsAcknowledged}
                className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Processing...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Waiting for Verification */}
        {step === 4 && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              WSIB Verification Pending
            </h2>
            <p className="text-gray-600 mb-6">
              Your WSIB certificate is being verified by our admin team. This typically takes 24-48 hours. You'll receive an SMS notification when approved.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-800 space-y-2 text-left">
                <li>✓ Our admin team will verify your WSIB certificate</li>
                <li>✓ You'll receive an SMS notification when approved</li>
                <li>✓ Once approved, you can start posting shifts</li>
                <li>✓ If rejected, you'll receive instructions to resubmit</li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/employer/home')}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceOnboarding;
