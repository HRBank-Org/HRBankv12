import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const EmmaChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem('emma_minimized') === 'true';
  });
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [onboardingProgress, setOnboardingProgress] = useState(0);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const theme = useTheme();

  // Emma's avatar image
  const EMMA_AVATAR = 'https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?w=200&h=200&fit=crop';

  useEffect(() => {
    if (user && isOpen) {
      loadConversation();
    }
  }, [user, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Show Emma on first login or if onboarding is incomplete
    if (user && !isMinimized && onboardingProgress < 100) {
      const hasSeenEmma = localStorage.getItem('emma_seen');
      if (!hasSeenEmma) {
        setIsOpen(true);
        localStorage.setItem('emma_seen', 'true');
      }
    }
  }, [user, onboardingProgress]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadConversation = async () => {
    setConversationLoading(true);
    try {
      const response = await api.get('/api/emma/conversation');
      if (response.data.success) {
        setMessages(response.data.data.messages || []);
        setOnboardingProgress(response.data.data.onboarding_progress || 0);
      }
    } catch (error) {
      console.error('Failed to load Emma conversation:', error);
    } finally {
      setConversationLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await api.post('/api/emma/chat', {
        message: inputMessage
      }, {
        timeout: 45000 // 45 second timeout for AI responses
      });

      if (response.data.success) {
        const emmaMessage = {
          role: 'assistant',
          content: response.data.data.message,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, emmaMessage]);
        setOnboardingProgress(response.data.data.onboarding_progress || 0);
        
        // Check for LinkedIn actions in the response
        const messageText = response.data.data.message;
        handleLinkedInActions(messageText);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        role: 'assistant',
        content: "I apologize, I'm having trouble processing that right now. Could you please try again or rephrase your question?",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF, Word document, or image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingFile(true);

    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      
      try {
        const response = await api.post('/api/emma/parse-resume', {
          file_data: base64String,
          file_name: file.name,
          file_type: file.type
        }, {
          timeout: 60000 // 60 second timeout for file parsing
        });

        if (response.data.success) {
          // Format the parsed data into a message
          const parsedData = response.data.data;
          const formattedMessage = formatResumeData(parsedData);
          
          const emmaMessage = {
            role: 'assistant',
            content: formattedMessage,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, emmaMessage]);
        }
      } catch (error) {
        console.error('Failed to parse resume:', error);
        const errorMessage = {
          role: 'assistant',
          content: "I had trouble reading that file. Could you try uploading a different format or ensure the file isn't corrupted?",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setUploadingFile(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsDataURL(file);
  };

  const formatResumeData = (data) => {
    let formatted = "📄 Great! I've analyzed your resume. Here's what I found:\n\n";
    
    if (data.occupation_title) {
      formatted += `**Position:** ${data.occupation_title}\n`;
    }
    if (data.years_of_experience) {
      formatted += `**Experience:** ${data.years_of_experience} years\n`;
    }
    if (data.skills && data.skills.length > 0) {
      formatted += `**Skills:** ${data.skills.join(', ')}\n`;
    }
    
    formatted += "\n📋 I can add this information to your profile if everything looks correct. Just let me know if you'd like me to proceed!";
    
    return formatted;
  };

  // Handle LinkedIn actions from Emma's responses
  const handleLinkedInActions = async (messageText) => {
    // Check for connect_linkedin action
    if (messageText.includes('"action": "connect_linkedin"') || messageText.includes('connect_linkedin')) {
      try {
        const response = await api.post('/api/emma/linkedin-action', {
          action: 'connect_linkedin'
        });
        
        if (response.data.success && response.data.data.url) {
          // Show LinkedIn connect button
          const linkedinMessage = {
            role: 'assistant',
            content: '🔗 Click below to connect your LinkedIn account:',
            timestamp: new Date().toISOString(),
            linkedinAction: {
              type: 'connect',
              url: response.data.data.url
            }
          };
          setMessages(prev => [...prev, linkedinMessage]);
        }
      } catch (error) {
        console.error('LinkedIn action error:', error);
      }
    }
    
    // Check for sync_linkedin_profile action
    if (messageText.includes('"action": "sync_linkedin_profile"') || messageText.includes('sync_linkedin_profile')) {
      try {
        const response = await api.post('/api/emma/linkedin-action', {
          action: 'sync_linkedin_profile'
        });
        
        if (response.data.success) {
          const syncMessage = {
            role: 'assistant',
            content: `✅ ${response.data.data.message}`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, syncMessage]);
        }
      } catch (error) {
        console.error('LinkedIn sync error:', error);
      }
    }
  };

  const handleMinimize = () => {
    setIsOpen(false);
    setIsMinimized(true);
    localStorage.setItem('emma_minimized', 'true');
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    localStorage.setItem('emma_minimized', 'false');
  };

  // Don't show on landing page, login pages, OR for admin users
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isPublicPage = currentPath === '/' || currentPath.startsWith('/login') || currentPath.startsWith('/signup');
  const isAdminUser = user?.user_type === 'admin';
  
  if (!user || isPublicPage || isAdminUser) return null;

  // Get user type label for branding
  const getUserTypeLabel = () => {
    if (user.user_type === 'workforce') return 'Workforce Assistant';
    if (user.user_type === 'employer') return 'Employer Assistant';
    if (user.user_type === 'institution') return 'Institution Assistant';
    if (user.user_type === 'workpassport') return 'Career Guide';
    return 'HR Bank Assistant';
  };

  // Minimized state - show floating button
  if (!isOpen || isMinimized) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-transform duration-200 flex items-center justify-center"
        style={{ backgroundColor: theme.primaryColor }}
        title="Chat with Emma"
      >
        <img
          src={EMMA_AVATAR}
          alt="Emma"
          className="w-14 h-14 rounded-full object-cover border-2 border-white"
        />
        {onboardingProgress < 100 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
            !
          </div>
        )}
      </button>
    );
  }

  // Open chat interface
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 h-[480px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header - Branded */}
      <div
        className="px-4 py-3 text-white flex items-center justify-between"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <img
            src={EMMA_AVATAR}
            alt="Emma"
            className="w-10 h-10 rounded-full object-cover border-2 border-white"
          />
          <div>
            <h3 className="font-semibold text-sm">Emma</h3>
            <p className="text-xs opacity-90">{getUserTypeLabel()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (window.confirm('Start a new conversation with Emma? This will reset your chat history.')) {
                try {
                  setConversationLoading(true);
                  await api.post('/api/emma/reset-conversation');
                  await loadConversation();
                } catch (error) {
                  console.error('Failed to reset conversation:', error);
                  alert('Failed to reset conversation. Please try again.');
                }
              }
            }}
            className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
            title="Start New Conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleMinimize}
            className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
            title="Minimize"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar (if onboarding incomplete) */}
      {onboardingProgress < 100 && (
        <div className="px-4 py-2 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Profile Completion</span>
            <span className="text-xs font-semibold" style={{ color: theme.primaryColor }}>
              {onboardingProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${onboardingProgress}%`, backgroundColor: theme.primaryColor }}
            ></div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {conversationLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <img
                  src={EMMA_AVATAR}
                  alt="Emma"
                  className="w-8 h-8 rounded-full object-cover mr-2 flex-shrink-0"
                />
              )}
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                  message.role === 'user'
                    ? 'text-white'
                    : 'bg-white text-gray-800 shadow-sm'
                }`}
                style={message.role === 'user' ? { backgroundColor: theme.primaryColor } : {}}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <img
              src={EMMA_AVATAR}
              alt="Emma"
              className="w-8 h-8 rounded-full object-cover mr-2"
            />
            <div className="bg-white px-4 py-3 rounded-2xl shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          {(user.user_type === 'workforce' || user.user_type === 'workpassport') && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile || loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Upload resume"
              >
                {uploadingFile ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </button>
            </>
          )}
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={loading || uploadingFile}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-100"
            style={{ focusRing: theme.primaryColor }}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading || uploadingFile}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmmaChat;