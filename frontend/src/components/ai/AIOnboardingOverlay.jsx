import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader, Upload, ChevronDown } from 'lucide-react';
import api from '../../utils/api';

const AIOnboardingOverlay = ({ onComplete, onSkip }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [currentState, setCurrentState] = useState('welcome');
  const [quickActions, setQuickActions] = useState([]);
  const [progress, setProgress] = useState(null);
  const [occupationSuggestions, setOccupationSuggestions] = useState([]);
  const [profileSuggestions, setProfileSuggestions] = useState([]);
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [actionResults, setActionResults] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Start onboarding conversation
    startOnboarding();
  }, []);

  const startOnboarding = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/ai/chat/start');
      const data = response.data.data;
      
      setConversationId(data.conversation_id);
      setCurrentState(data.current_state);
      setQuickActions(data.quick_actions || []);
      setProgress(data.progress);
      
      setMessages([
        {
          role: 'ai',
          message: data.ai_message,
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error('Failed to start onboarding:', error);
      setMessages([
        {
          role: 'ai',
          message: "Hi! I'm having trouble connecting. Let's try that again...",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || loading) return;

    // Add user message to UI
    const userMessage = {
      role: 'user',
      message: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await api.post('/api/ai/chat/message', {
        message: textToSend
      });
      
      const data = response.data.data;
      
      // Add AI response
      const aiMessage = {
        role: 'ai',
        message: data.ai_message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      
      setCurrentState(data.current_state);
      setQuickActions(data.quick_actions || []);
      setProgress(data.progress);
      setOccupationSuggestions(data.occupation_suggestions || []);
      
      // Check for profile suggestions from resume analysis
      if (data.action_results && data.action_results.length > 0) {
        setActionResults(data.action_results);
        
        // Look for analyze_resume_for_profiles result
        const resumeAnalysis = data.action_results.find(r => r.type === 'analyze_resume_for_profiles');
        if (resumeAnalysis && resumeAnalysis.status === 'success') {
          setProfileSuggestions(resumeAnalysis.data || []);
          setSelectedProfiles([]); // Reset selection
        }
      }
      
      // Check if onboarding is complete
      if (data.onboarding_complete) {
        setTimeout(() => {
          onComplete();
        }, 3000); // 3 seconds to read final message
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        role: 'ai',
        message: "Sorry, I didn't catch that. Could you try again?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    if (action.action === 'upload_resume') {
      // Trigger file upload
      document.getElementById('resume-upload').click();
    } else {
      // Send action as message
      sendMessage(action.label);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload file to get URL
      const uploadResponse = await api.post('/api/worker/qualifications/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const documentUrl = uploadResponse.data.data.document_url;
      
      // Check current state to determine if this is resume or document upload
      if (currentState === 'document_upload' || currentState === 'document_collection') {
        // This is a document upload (ID, SIN, banking, etc.)
        sendMessage(`I've uploaded ${file.name}. This is my document.`);
      } else {
        // This is resume upload
        sendMessage(`I've uploaded my resume: ${file.name}. Please analyze it and suggest profiles.`);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      sendMessage(`I've uploaded ${file.name}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ backdropFilter: 'blur(8px)' }}
      />
      
      {/* Chat Window */}
      <div className="relative w-full max-w-2xl h-[90vh] max-h-[800px] bg-white rounded-2xl shadow-2xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Welcome to HR Bank</h2>
              <p className="text-sm text-blue-100">Let's get you started!</p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-white/80 hover:text-white transition-colors"
            title="Skip onboarding"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        {progress && (
          <div className="px-6 py-3 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {progress.label}
              </span>
              <span className="text-sm text-gray-500">
                Step {progress.current} of {progress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <span className={`text-xs mt-1 block ${
                  msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <Loader className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Profile Suggestions from Resume Analysis */}
        {profileSuggestions.length > 0 && !loading && (
          <div className="px-6 py-4 border-t bg-gradient-to-br from-green-50 to-blue-50">
            <p className="text-sm font-semibold text-gray-700 mb-1">✨ Profiles Found in Your Resume:</p>
            <p className="text-xs text-gray-600 mb-3">Select the profiles you want to create (you can choose multiple)</p>
            <div className="space-y-3 mb-4">
              {profileSuggestions.map((profile, index) => {
                const isSelected = selectedProfiles.includes(index);
                return (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedProfiles(prev => 
                        prev.includes(index) 
                          ? prev.filter(i => i !== index)
                          : [...prev, index]
                      );
                    }}
                    className={`bg-white border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-green-500 bg-green-50 shadow-md' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start">
                      {/* Checkbox */}
                      <div className="flex-shrink-0 mr-3 mt-1">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Profile Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900 text-base">{profile.template.name}</h4>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            {profile.match_score}% match
                          </span>
                        </div>
                        
                        {/* Matched Requirements */}
                        <div className="space-y-1 mb-3">
                          {profile.matched_requirements.certifications.length > 0 && (
                            <div className="text-xs">
                              <span className="font-semibold text-gray-700">Certifications: </span>
                              <span className="text-gray-600">
                                {profile.matched_requirements.certifications.map(c => c.name).join(', ')}
                              </span>
                            </div>
                          )}
                          {profile.matched_requirements.skills.length > 0 && (
                            <div className="text-xs">
                              <span className="font-semibold text-gray-700">Skills: </span>
                              <span className="text-gray-600">
                                {profile.matched_requirements.skills.map(s => s.name).join(', ')}
                              </span>
                            </div>
                          )}
                          {profile.matched_requirements.experience_months > 0 && (
                            <div className="text-xs">
                              <span className="font-semibold text-gray-700">Experience: </span>
                              <span className="text-gray-600">
                                {Math.floor(profile.matched_requirements.experience_months / 12)} years{' '}
                                {profile.matched_requirements.experience_months % 12} months
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Earnings */}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="font-semibold text-green-600">💰 ${profile.earnings.hourly}/hr</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-600">${profile.earnings.monthly.toLocaleString()}/mo</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            ${profile.earnings.annual.toLocaleString()}/year potential
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Approve Button */}
            {selectedProfiles.length > 0 && (
              <button
                onClick={() => {
                  const selected = profileSuggestions.filter((_, i) => selectedProfiles.includes(i));
                  const profileNames = selected.map(p => p.template.name).join(', ');
                  sendMessage(`Yes, create profiles for: ${profileNames}`);
                }}
                className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all shadow-md"
              >
                ✅ Create {selectedProfiles.length} Profile{selectedProfiles.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Occupation Suggestions with Earnings (for manual entry) */}
        {occupationSuggestions.length > 0 && !loading && profileSuggestions.length === 0 && (
          <div className="px-6 py-4 border-t bg-gradient-to-br from-blue-50 to-purple-50">
            <p className="text-sm font-semibold text-gray-700 mb-3">💼 Available Roles:</p>
            <div className="space-y-3">
              {occupationSuggestions.map((occ, index) => (
                <div
                  key={index}
                  onClick={() => sendMessage(`I want to work as a ${occ.name}`)}
                  className="bg-white border-2 border-blue-200 rounded-xl p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-base mb-1">{occ.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{occ.category}</p>
                      {occ.earnings && (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="font-semibold text-green-600">💰 ${occ.earnings.hourly}/hr</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-600">${occ.earnings.monthly.toLocaleString()}/mo</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            ${occ.earnings.annual.toLocaleString()}/year potential
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xl">
                          {occ.category === 'Security' ? '🛡️' : 
                           occ.category === 'Hospitality' ? '🍽️' :
                           occ.category === 'Transportation' ? '🚗' :
                           occ.category === 'Healthcare' ? '🏥' :
                           occ.category === 'Construction' ? '🏗️' : '💼'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Upload Checklist */}
        {(currentState === 'document_collection' || currentState === 'document_upload') && !loading && (
          <div className="px-6 py-4 border-t bg-gradient-to-br from-yellow-50 to-orange-50">
            <div className="mb-3">
              <h4 className="font-semibold text-gray-900 text-sm mb-1">📋 Required for Account Activation</h4>
              <p className="text-xs text-gray-600">Upload these documents to start receiving job offers and get paid</p>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-5 h-5 rounded border-2 border-orange-400 bg-white flex items-center justify-center">
                  <span className="text-xs">📄</span>
                </div>
                <span className="text-gray-700">Government-issued ID</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-5 h-5 rounded border-2 border-orange-400 bg-white flex items-center justify-center">
                  <span className="text-xs">🆔</span>
                </div>
                <span className="text-gray-700">Social Insurance Number (SIN)</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-5 h-5 rounded border-2 border-orange-400 bg-white flex items-center justify-center">
                  <span className="text-xs">🏦</span>
                </div>
                <span className="text-gray-700">Banking info (void cheque/statement)</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white flex items-center justify-center">
                  <span className="text-xs">📜</span>
                </div>
                <span className="text-gray-500">Certifications (optional now)</span>
              </div>
            </div>

            <div className="bg-white border-2 border-orange-300 rounded-lg p-3 mb-3">
              <p className="text-xs font-semibold text-orange-800 mb-1">⚠️ Why These Documents Matter:</p>
              <ul className="text-xs text-orange-700 space-y-1 list-disc list-inside">
                <li><strong>Get matched to jobs:</strong> Employers verify your identity</li>
                <li><strong>Receive payments:</strong> Direct deposit needs banking info</li>
                <li><strong>Tax compliance:</strong> SIN required for T4 slips</li>
              </ul>
            </div>

            <button
              onClick={() => document.getElementById('resume-upload').click()}
              className="w-full py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all"
            >
              📤 Upload Document
            </button>
          </div>
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && !loading && (
          <div className="px-6 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-blue-500 transition-all"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 border-t bg-white">
          <div className="flex items-end space-x-2">
            <input
              type="file"
              id="resume-upload"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <button
              onClick={() => document.getElementById('resume-upload').click()}
              className="p-3 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
              title="Upload resume"
              disabled={loading}
            >
              <Upload size={20} />
            </button>

            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="1"
              disabled={loading}
            />

            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || loading}
              className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={20} />
            </button>
          </div>

          <button
            onClick={onSkip}
            className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip onboarding for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIOnboardingOverlay;
