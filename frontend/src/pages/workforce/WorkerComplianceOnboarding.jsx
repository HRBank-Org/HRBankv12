import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

import { useLanguage } from '../../contexts/LanguageContext';

const WorkerComplianceOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [legalTexts, setLegalTexts] = useState(null);
  const [casualAcknowledged, setCasualAcknowledged] = useState(false);
  const [termsAcknowledged, setTermsAcknowledged] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadLegalTexts();
    checkComplianceStatus();
  }, []);

  const loadLegalTexts = async () => {
    try {
      const response = await api.get('/api/compliance/worker/legal-texts');
      setLegalTexts(response.data.data);
    } catch (error) {
      console.error('Failed to load legal texts:', error);
    }
  };

  const checkComplianceStatus = async () => {
    try {
      const response = await api.get('/api/compliance/worker/status');
      const status = response.data.data.compliance;
      
      if (status.casual_employment_acknowledged && status.terms_acknowledged) {
        // All complete, redirect to dashboard
        navigate('/workforce/dashboard');
      } else if (status.casual_employment_acknowledged) {
        // Need to acknowledge terms
        setStep(2);
      }
    } catch (error) {
      console.error('Failed to check compliance status:', error);
    }
  };

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to get IP:', error);
      return 'unknown';
    }
  };

  const handleAcknowledgeCasual = async () => {
    if (!casualAcknowledged) {
      setMessage({ type: 'error', text: 'Please acknowledge the casual employment disclosure' });
      return;
    }

    setLoading(true);
    try {
      const ip_address = await getClientIP();
      
      await api.post('/api/compliance/worker/acknowledge-casual-employment', {
        ip_address
      });
      
      setMessage({ type: 'success', text: 'Casual employment status acknowledged!' });
      setTimeout(() => {
        setStep(2);
        setMessage({ type: '', text: '' });
      }, 1500);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to acknowledge casual employment' 
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
      await api.post('/api/compliance/worker/acknowledge-terms');
      
      setMessage({ type: 'success', text: 'Setup complete! Redirecting to dashboard...' });
      setTimeout(() => {
        navigate('/workforce/dashboard');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Worker Setup
          </h1>
          <p className="text-gray-600">
            Complete these steps to start applying for shifts
          </p>
          
          {/* Progress Bar */}
          <div className="mt-6 flex items-center justify-between">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {s}
                </div>
                {s < 2 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex justify-between text-sm">
            <span className={step >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              Employment Status
            </span>
            <span className={step >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
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

        {/* Step 1: Casual Employment Disclosure */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Step 1: Employment Status
            </h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-yellow-900 mb-2">⚠️ IMPORTANT: Casual Employment</h3>
              <div className="text-sm text-yellow-800 whitespace-pre-line max-h-96 overflow-y-auto">
                {legalTexts.casual_employment_disclosure}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-blue-900 mb-3">Key Points to Remember:</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span><strong>No Guaranteed Hours:</strong> Shifts are offered on a per-shift basis. You can accept or decline any shift.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span><strong>Multiple Employers:</strong> You can work for multiple employers simultaneously through HR Bank.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span><strong>You Are an Employee:</strong> You are an employee (T4) of each employer, entitled to vacation pay, overtime, and other protections.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span><strong>HR Bank is Not Your Employer:</strong> HR Bank is just a platform connecting you with employers.</span>
                </li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={casualAcknowledged}
                  onChange={(e) => setCasualAcknowledged(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <strong className="text-gray-900">I Understand</strong> that I am a casual employee with no guaranteed hours. I understand my rights and the nature of casual employment through HR Bank.
                </span>
              </label>
            </div>

            <button
              onClick={handleAcknowledgeCasual}
              disabled={loading || !casualAcknowledged}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Processing...' : 'I Understand & Continue'}
            </button>
          </div>
        )}

        {/* Step 2: Terms of Service */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Step 2: Terms of Service
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
                  className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <strong className="text-gray-900">I Agree</strong> to the HR Bank Terms of Service. I understand that HR Bank is not my employer and that each employer I work for is my actual employer.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleAcknowledgeTerms}
                disabled={loading || !termsAcknowledged}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Completing...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerComplianceOnboarding;
