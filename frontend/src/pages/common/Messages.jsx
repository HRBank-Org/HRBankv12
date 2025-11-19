import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const MessagesWithAI = () => {
  const [threads, setThreads] = useState([]);
  const [agentThread, setAgentThread] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [parsedResume, setParsedResume] = useState(null);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [applyingResume, setApplyingResume] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    loadAllThreads();
  }, []);

  useEffect(() => {
    if (selectedThread) {
      if (selectedThread.isAgent) {
        loadAgentMessages();
      } else {
        loadMessages(selectedThread.thread_id);
      }
    }
  }, [selectedThread]);

  const loadAllThreads = async () => {
    try {
      // Load human threads
      const threadsResponse = await api.get('/api/messages/threads');
      setThreads(threadsResponse.data.data.threads || []);

      // Load AI agent thread info
      const agentResponse = await api.get('/api/agent/thread-info');
      setAgentThread(agentResponse.data.data);
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId) => {
    try {
      const response = await api.get(`/api/messages/threads/${threadId}/messages`);
      setMessages(response.data.data.messages || []);
      
      // Mark messages as read
      await api.post(`/api/messages/threads/${threadId}/mark-read`).catch(() => {});
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadAgentMessages = async () => {
    try {
      const response = await api.get('/api/agent/history');
      const history = response.data.data.messages || [];
      
      // Transform to match message format
      const formattedMessages = history.map(msg => ({
        message_id: msg.message_id,
        sender_id: msg.sender_type === 'user' ? user.user_id : 'ai_agent',
        message_text: msg.message_text,
        created_date: msg.created_date
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Failed to load agent messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedThread) return;

    setSending(true);
    try {
      if (selectedThread.isAgent) {
        // Send to AI agent
        const response = await api.post('/api/agent/chat', {
          message: messageText
        });
        
        setMessageText('');
        await loadAgentMessages();
        await loadAllThreads(); // Refresh to update last message
      } else {
        // Send to human
        await api.post(`/api/messages/threads/${selectedThread.thread_id}/send`, {
          message: messageText
        });
        
        setMessageText('');
        await loadMessages(selectedThread.thread_id);
        await loadAllThreads();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.docx')) {
      alert('Please upload a PDF or DOCX file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setParsedResume(response.data.data);
      setShowResumeConfirm(true);

      // Send confirmation message to AI
      await api.post('/api/agent/chat', {
        message: `I uploaded my resume: ${file.name}`
      });
      await loadAgentMessages();
    } catch (error) {
      console.error('Failed to upload resume:', error);
      alert(error.response?.data?.detail || 'Failed to upload resume. Please try again.');
    } finally {
      setUploadingResume(false);
      event.target.value = ''; // Reset file input
    }
  };

  const applyResumeData = async () => {
    if (!parsedResume?.parse_id) return;

    setApplyingResume(true);
    try {
      const response = await api.post(`/api/resume/apply/${parsedResume.parse_id}`);
      
      alert('Resume data applied successfully! Your profile and occupation profiles have been updated.');
      setShowResumeConfirm(false);
      setParsedResume(null);

      // Send success message to AI
      await api.post('/api/agent/chat', {
        message: 'I confirmed the resume data. Please show me what was updated.'
      });
      await loadAgentMessages();
    } catch (error) {
      console.error('Failed to apply resume:', error);
      alert('Failed to apply resume data. Please try again.');
    } finally {
      setApplyingResume(false);
    }
  };

  const getDashboardRoute = () => {
    const routes = {
      workforce: '/workforce/dashboard',
      employer: '/employer/dashboard',
      institution: '/institution/dashboard'
    };
    return routes[user?.user_type] || '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Header */}
      <header className="text-white px-4 py-4 shadow-md" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(getDashboardRoute())} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
          {/* Threads List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Conversations</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* AI Agent Thread - Always at top */}
              {agentThread && (
                <button
                  onClick={() => setSelectedThread({ 
                    isAgent: true, 
                    thread_id: agentThread.thread_id,
                    agent_name: agentThread.agent_name 
                  })}
                  className={`w-full p-4 text-left border-b-2 border-blue-200 hover:bg-blue-50 transition-colors ${
                    selectedThread?.isAgent ? 'bg-blue-100' : 'bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img 
                          src={agentThread.agent_photo} 
                          alt={agentThread.agent_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{agentThread.agent_name}</p>
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                            AI Assistant
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{agentThread.last_message}</p>
                        {agentThread.message_count > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {agentThread.message_count} messages
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {/* Human Conversations */}
              {threads.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-sm">No conversations with employers/workers yet</p>
                  <p className="text-xs mt-2 text-gray-400">
                    Chat with {agentThread?.agent_name} above if you need help!
                  </p>
                </div>
              ) : (
                threads.map((thread) => {
                  const unreadCount = user.user_type === 'workforce' 
                    ? thread.workforce_unread_count 
                    : user.user_type === 'employer'
                    ? thread.employer_unread_count
                    : thread.institution_unread_count || 0;
                  
                  const otherParty = user.user_type === 'workforce' 
                    ? thread.employer_name 
                    : user.user_type === 'employer'
                    ? thread.workforce_name
                    : thread.employer_name || thread.workforce_name;

                  return (
                    <button
                      key={thread.thread_id}
                      onClick={() => setSelectedThread(thread)}
                      className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        selectedThread?.thread_id === thread.thread_id && !selectedThread.isAgent ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{otherParty}</p>
                          <p className="text-sm text-gray-500 truncate">{thread.last_message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {thread.last_message_at && new Date(thread.last_message_at).toLocaleDateString()}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <span className="ml-2 px-2 py-1 text-xs font-bold text-white rounded-full" style={{ backgroundColor: theme.primaryColor }}>
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Messages Panel */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
            {selectedThread ? (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  {selectedThread.isAgent ? (
                    <div className="flex items-center gap-3">
                      <img 
                        src={agentThread.agent_photo} 
                        alt={agentThread.agent_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {agentThread.agent_name}
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">AI Assistant</span>
                        </h3>
                        <p className="text-sm text-gray-500">Always here to help!</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {user.user_type === 'workforce' 
                          ? selectedThread.employer_name 
                          : user.user_type === 'employer'
                          ? selectedThread.workforce_name
                          : selectedThread.employer_name || selectedThread.workforce_name}
                      </h3>
                      {selectedThread.workplace_name && (
                        <p className="text-sm text-gray-500">{selectedThread.workplace_name}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      {selectedThread.isAgent ? (
                        <div>
                          <p className="mb-2">👋 Hi! I'm {agentThread.agent_name}.</p>
                          <p className="text-sm">Ask me anything about your profile, documents, shifts, or any issues you're facing!</p>
                        </div>
                      ) : (
                        <p>No messages yet. Start the conversation!</p>
                      )}
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isCurrentUser = msg.sender_id === user.user_id;
                      const isAgent = msg.sender_id === 'ai_agent';
                      
                      return (
                        <div
                          key={msg.message_id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="flex items-start gap-2 max-w-[70%]">
                            {!isCurrentUser && isAgent && (
                              <img 
                                src={agentThread.agent_photo} 
                                alt={agentThread.agent_name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            )}
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                isCurrentUser
                                  ? 'text-white'
                                  : isAgent
                                  ? 'bg-blue-100 text-gray-900'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                              style={isCurrentUser ? { backgroundColor: theme.primaryColor } : {}}
                            >
                              {isAgent && (
                                <p className="text-xs font-semibold text-blue-700 mb-1">{agentThread.agent_name}</p>
                              )}
                              <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                              <p className={`text-xs mt-1 ${isCurrentUser ? 'text-white opacity-75' : 'text-gray-500'}`}>
                                {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  {selectedThread.isAgent && user.user_type === 'workforce' && (
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        type="file"
                        id="resume-upload"
                        accept=".pdf,.docx"
                        onChange={handleResumeUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="resume-upload"
                        className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          uploadingResume ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">
                          {uploadingResume ? 'Parsing Resume...' : '📄 Upload Resume (PDF/DOCX)'}
                        </span>
                      </label>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                      placeholder={selectedThread.isAgent ? `Ask ${agentThread.agent_name} anything...` : "Type your message..."}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                      style={{ focusRingColor: theme.primaryColor }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !messageText.trim()}
                      className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center max-w-md px-6">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">Select a conversation</p>
                  <p className="text-sm text-gray-400">
                    Chat with {agentThread?.agent_name} for help, or select a conversation with an employer/worker
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Resume Confirmation Modal */}
      {showResumeConfirm && parsedResume && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Review Parsed Resume</h2>
              <p className="text-sm text-gray-600 mt-1">Please review the information extracted from your resume</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Personal Info */}
              {parsedResume.parsed_data?.personal_info && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p><span className="font-medium">Name:</span> {parsedResume.parsed_data.personal_info.full_name || 'N/A'}</p>
                    <p><span className="font-medium">Email:</span> {parsedResume.parsed_data.personal_info.email || 'N/A'}</p>
                    <p><span className="font-medium">Phone:</span> {parsedResume.parsed_data.personal_info.phone || 'N/A'}</p>
                  </div>
                </div>
              )}

              {/* Work Experience */}
              {parsedResume.parsed_data?.work_experience?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Work Experience ({parsedResume.parsed_data.work_experience.length})</h3>
                  <div className="space-y-3">
                    {parsedResume.parsed_data.work_experience.map((exp, idx) => (
                      <div key={idx} className="bg-blue-50 rounded-lg p-4">
                        <p className="font-semibold text-blue-900">{exp.position_title}</p>
                        <p className="text-sm text-blue-700">{exp.company_name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {exp.start_date} - {exp.end_date || 'Present'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {parsedResume.parsed_data?.skills?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Skills ({parsedResume.parsed_data.skills.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {parsedResume.parsed_data.skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {parsedResume.parsed_data?.education?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Education</h3>
                  <div className="space-y-3">
                    {parsedResume.parsed_data.education.map((edu, idx) => (
                      <div key={idx} className="bg-purple-50 rounded-lg p-4">
                        <p className="font-semibold text-purple-900">{edu.degree} {edu.field && `in ${edu.field}`}</p>
                        <p className="text-sm text-purple-700">{edu.institution}</p>
                        {edu.graduation_year && (
                          <p className="text-sm text-gray-600 mt-1">Graduated: {edu.graduation_year}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {parsedResume.parsed_data?.certifications?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Certifications</h3>
                  <div className="space-y-2">
                    {parsedResume.parsed_data.certifications.map((cert, idx) => (
                      <div key={idx} className="bg-yellow-50 rounded-lg p-3">
                        <p className="font-medium text-yellow-900">{cert.name}</p>
                        <p className="text-sm text-yellow-700">{cert.issuer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowResumeConfirm(false);
                  setParsedResume(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={applyingResume}
              >
                Cancel
              </button>
              <button
                onClick={applyResumeData}
                disabled={applyingResume}
                className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {applyingResume ? 'Applying...' : 'Apply to My Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesWithAI;
