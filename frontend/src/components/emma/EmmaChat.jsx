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

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/emma/parse-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const systemMessage = {
          role: 'assistant',
          content: response.data.data.message || "I've received your file and I'm processing it now...",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, systemMessage]);
        
        // Show parsed data if available
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
        content: error.response?.data?.error || "I had trouble processing that file. Please make sure it's a PDF or Word document.",
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

  if (!user) return null;

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
      {/* Header */}
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
            <p className="text-xs opacity-90">Your HR Bank Assistant</p>
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

      {/* Progress Bar */}
      {onboardingProgress < 100 && (
        <div className="px-4 py-2 bg-gray-50 border-b">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Profile Completion</span>
            <span className="font-semibold">{Math.round(onboardingProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
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

      {/* File Upload Area */}
      {showFileUpload && user.user_type === 'workforce' && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-700">📄 Upload your resume</span>
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadingFile}
              />
              <span className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                {uploadingFile ? 'Uploading...' : 'Choose File'}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2"
            style={{ focusRingColor: theme.primaryColor }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
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
