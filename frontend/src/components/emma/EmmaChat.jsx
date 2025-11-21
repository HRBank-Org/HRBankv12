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
      });

      if (response.data.success) {
        const emmaMessage = {
          role: 'assistant',
          content: response.data.data.message,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, emmaMessage]);
        setOnboardingProgress(response.data.data.onboarding_progress || 0);
        setShowFileUpload(response.data.data.should_show_file_upload || false);
      }
    } catch (error) {
      console.error('Failed to send message to Emma:', error);
      const errorMessage = {
        role: 'assistant',
        content: "I apologize, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const errorMessage = {
        role: 'assistant',
        content: "The file is too large. Please upload a file smaller than 10MB.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Add user message showing file upload
    const uploadMessage = {
      role: 'user',
      content: `📎 Uploading: ${file.name}`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, uploadMessage]);

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Determine if it's a resume (for workforce) or general document
      const isResume = file.name.toLowerCase().includes('resume') || 
                       file.name.toLowerCase().includes('cv') ||
                       (user.user_type === 'workforce' && (file.type.includes('pdf') || file.type.includes('word')));
      
      const endpoint = isResume && user.user_type === 'workforce' 
        ? '/api/emma/parse-resume' 
        : '/api/documents/upload'; // Use general document upload endpoint

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const systemMessage = {
          role: 'assistant',
          content: response.data.data.message || 
                   `Great! I've received your file "${file.name}". ${isResume ? "Let me analyze it for you..." : "I've saved it to your documents."}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, systemMessage]);
        
        // Show parsed data if available (for resumes)
        if (response.data.data.parsed_data) {
          const parsedDataMessage = {
            role: 'assistant',
            content: formatParsedResumeData(response.data.data.parsed_data),
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, parsedDataMessage]);
        }
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage = {
        role: 'assistant',
        content: error.response?.data?.error || 
                 "I had trouble processing that file. Please make sure it's a valid document (PDF, Word, or image file for ID).",
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

  const formatParsedResumeData = (data) => {
    let formatted = "Here's what I found in your resume:\n\n";
    
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

  // Don't show on landing page or login pages
  const currentPath = window.location.pathname;
  const isPublicPage = currentPath === '/' || currentPath.startsWith('/login') || currentPath.startsWith('/signup');
  
  if (!user || isPublicPage) return null;

  // Get user type label for branding
  const getUserTypeLabel = () => {
    if (user.user_type === 'workforce') return 'Workforce Assistant';
    if (user.user_type === 'employer') return 'Employer Assistant';
    if (user.user_type === 'institution') return 'Institution Assistant';
    if (user.user_type === 'admin') return 'Admin Assistant';
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
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
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
            onClick={handleMinimize}
            className="hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
            title="Minimize"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress Bar - Branded */}
      {onboardingProgress < 100 && (
        <div className="px-4 py-2 border-b" style={{ backgroundColor: `${theme.primaryColor}15` }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: theme.primaryColor }}>
            <span className="font-medium">Profile Completion</span>
            <span className="font-bold">{Math.round(onboardingProgress)}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${onboardingProgress}%`,
                backgroundColor: theme.primaryColor
              }}
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <img src={EMMA_AVATAR} alt="Emma" className="w-20 h-20 rounded-full mx-auto mb-4 object-cover" />
            <p className="font-semibold text-gray-700">
              {getTimeBasedGreeting()}! I'm Emma 👋
            </p>
            <p className="text-sm mt-2">
              I'm here to help you get started with HR Bank. How can I assist you today?
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
            >
              {msg.role === 'assistant' && (
                <img
                  src={EMMA_AVATAR}
                  alt="Emma"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
                style={msg.role === 'user' ? { backgroundColor: theme.primaryColor } : {}}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs mt-1 opacity-75">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start gap-2">
            <img src={EMMA_AVATAR} alt="Emma" className="w-8 h-8 rounded-full object-cover" />
            <div className="bg-gray-100 rounded-2xl px-4 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
        {/* Show selected file preview if any */}
        {uploadingFile && (
          <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-blue-700">Uploading file...</span>
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2"
            style={{ focusRingColor: theme.primaryColor }}
            disabled={loading || uploadingFile}
          />
          
          {/* Attachment Button */}
          <label 
            className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50"
            title="Attach file"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadingFile || loading}
            />
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </label>
          
          {/* Send Button */}
          <button
            type="submit"
            disabled={loading || !inputMessage.trim() || uploadingFile}
            className="px-4 py-2 text-white rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmmaChat;
