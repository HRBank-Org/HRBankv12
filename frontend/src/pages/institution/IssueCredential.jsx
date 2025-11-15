import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const IssueCredential = () => {
  const [step, setStep] = useState(1); // 1: Student, 2: Template, 3: Details, 4: Preview, 5: Blockchain
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState({
    student_name: '',
    student_email: '',
    student_id: '',
    worker_id: '',
    credential_template_id: '',
    credential_name: '',
    program_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    completion_date: '',
    expiry_date: '',
    grade_gpa: '',
    additional_details: {}
  });
  const [issuanceResult, setIssuanceResult] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  const handleIssue = async () => {
    setIssuing(true);
    setStep(5); // Show blockchain processing

    try {
      const response = await api.post('/api/blockchain-credentials/issue', formData);
      setIssuanceResult(response.data.data);
      
      // Wait a moment to show blockchain animation
      setTimeout(() => {
        setIssuing(false);
      }, 3000);
    } catch (error) {
      alert('Failed to issue credential: ' + (error.response?.data?.error?.message || error.message));
      setIssuing(false);
      setStep(4); // Go back to preview
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/institution/dashboard')} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-xl font-bold">Issue Blockchain Credential</h1>
              <p className="text-sm opacity-90">Step {step} of 5</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {['Student', 'Template', 'Details', 'Preview', 'Blockchain'].map((label, idx) => (
            <div key={idx} className="flex items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                idx + 1 <= step ? 'text-white' : 'bg-gray-200 text-gray-600'
              }`} style={{ backgroundColor: idx + 1 <= step ? theme.primaryColor : undefined }}>
                {idx + 1}
              </div>
              {idx < 4 && (
                <div className={`flex-1 h-1 mx-2 ${idx + 1 < step ? '' : 'bg-gray-200'}`} 
                     style={{ backgroundColor: idx + 1 < step ? theme.primaryColor : undefined }} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Step 1: Student Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Information</h2>
                <p className="text-gray-600">Enter the student/graduate receiving this credential</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name (as appears on credential) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.student_name}
                  onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.student_email}
                  onChange={(e) => setFormData({...formData, student_email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student ID (optional)
                </label>
                <input
                  type="text"
                  value={formData.student_id}
                  onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="WCC-2024-5678"
                />
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.student_name || !formData.student_email}
                  className="px-8 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Blockchain Processing */}
          {step === 5 && (
            <div className="text-center py-12">
              {issuing ? (
                <div>
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Issuing Credential to Blockchain...</h2>
                  <div className="space-y-3 text-left max-w-md mx-auto">
                    <p className="flex items-center gap-2 text-gray-700">
                      <span className="text-green-600">✓</span> Creating credential hash
                    </p>
                    <p className="flex items-center gap-2 text-gray-700">
                      <span className="text-green-600">✓</span> Uploading metadata to IPFS
                    </p>
                    <p className="flex items-center gap-2 text-gray-700 animate-pulse">
                      <span className="text-blue-600">⏳</span> Submitting to Polygon blockchain
                    </p>
                    <p className="flex items-center gap-2 text-gray-500">
                      <span>⏳</span> Waiting for confirmation
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 mt-6">This may take 30-60 seconds...</p>
                </div>
              ) : issuanceResult ? (
                <div>
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">✅ Credential Issued Successfully!</h2>
                  <p className="text-gray-600 mb-6">Credential is now on the blockchain and tamper-proof</p>

                  <div className="text-left bg-gray-50 rounded-lg p-6 mb-6">
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-600">Credential ID:</p>
                        <p className="font-mono font-semibold text-gray-900">{issuanceResult.credential_id}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Blockchain Transaction:</p>
                        <a href="#" className="font-mono text-blue-600 hover:underline text-xs break-all">
                          {issuanceResult.transaction_hash}
                        </a>
                      </div>
                      <div>
                        <p className="text-gray-600">IPFS Link:</p>
                        <a href={issuanceResult.ipfs_url} target="_blank" rel="noopener noreferrer" 
                           className="font-mono text-blue-600 hover:underline text-xs break-all">
                          {issuanceResult.ipfs_url}
                        </a>
                      </div>
                      <div>
                        <p className="text-gray-600">Verification URL:</p>
                        <a href={issuanceResult.verification_url} target="_blank" rel="noopener noreferrer"
                           className="text-blue-600 hover:underline break-all">
                          {issuanceResult.verification_url}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  {issuanceResult.qr_code && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 mb-3">Verification QR Code:</p>
                      <img src={issuanceResult.qr_code} alt="QR Code" className="mx-auto" style={{ width: '200px' }} />
                    </div>
                  )}

                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => navigate('/institution/dashboard')}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                    >
                      Back to Dashboard
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-6 py-3 rounded-lg text-white font-semibold"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      Issue Another Credential
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Step 2: Select Template */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Credential Type</h2>
                <p className="text-gray-600">Choose the type of credential you're issuing</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Personal Support Worker Certificate', program: 'PSW Training Program' },
                  { name: 'Security Guard License', program: 'Security Guard Training' },
                  { name: 'Food Handler Certificate', program: 'Food Safety Course' },
                  { name: 'Smart Serve Ontario', program: 'Responsible Beverage Service' },
                  { name: 'First Aid/CPR Certificate', program: 'First Aid Training' },
                  { name: 'Forklift License', program: 'Forklift Operation Course' }
                ].map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        credential_name: template.name,
                        program_name: template.program
                      });
                      setStep(3);
                    }}
                    className="p-4 border-2 border-gray-300 rounded-lg text-left hover:border-gray-400 transition-colors"
                  >
                    <h4 className="font-semibold text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{template.program}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Credential Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Credential Details</h2>
                <p className="text-gray-600">Enter specific details for this credential</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Completion Date
                  </label>
                  <input
                    type="date"
                    value={formData.completion_date}
                    onChange={(e) => setFormData({...formData, completion_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Does this credential expire?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hasExpiry"
                      onChange={() => setFormData({...formData, expiry_date: ''})}
                    />
                    <span className="text-sm text-gray-700">No expiry</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hasExpiry"
                      onChange={() => {}}
                    />
                    <span className="text-sm text-gray-700">Yes, expires on:</span>
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade/Performance (optional)
                </label>
                <select
                  value={formData.grade_gpa}
                  onChange={(e) => setFormData({...formData, grade_gpa: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                >
                  <option value="">Select grade...</option>
                  <option value="Honours">Honours</option>
                  <option value="Pass">Pass</option>
                  <option value="4.0 GPA">4.0 GPA</option>
                  <option value="3.8 GPA">3.8 GPA</option>
                  <option value="3.5 GPA">3.5 GPA</option>
                  <option value="3.0 GPA">3.0 GPA</option>
                </select>
              </div>

              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-8 py-3 rounded-lg text-white font-semibold"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Review & Confirm</h2>
              
              <div className="border border-gray-200 rounded-lg p-6 space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Student:</p>
                  <p className="font-semibold text-gray-900">{formData.student_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Credential:</p>
                  <p className="font-semibold text-gray-900">{formData.credential_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Program:</p>
                  <p className="font-semibold text-gray-900">{formData.program_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Issue Date:</p>
                  <p className="font-semibold text-gray-900">{formData.issue_date}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">Blockchain Issuance:</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>✓ Credential will be stored on Polygon blockchain</p>
                  <p>✓ Tamper-proof and instantly verifiable</p>
                  <p>✓ Estimated gas fee: ~$0.01 USD</p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <input type="checkbox" id="confirm" className="mt-1" required />
                <label htmlFor="confirm" className="text-sm text-yellow-900">
                  I confirm this credential information is accurate and I have authority to issue this on behalf of my institution
                </label>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleIssue}
                  disabled={issuing}
                  className="flex-1 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
                  style={{ backgroundColor: theme.accentColor }}
                >
                  Issue Credential on Blockchain ⛓️
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default IssueCredential;
