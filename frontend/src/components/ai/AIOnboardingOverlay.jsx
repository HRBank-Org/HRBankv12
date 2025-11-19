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
      
      // Check if onboarding is complete
      if (data.onboarding_complete) {
        setTimeout(() => {
          onComplete();
        }, 2000);
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
    // TODO: Upload file and send URL to AI
    // For now, just send a message
    sendMessage(`I've uploaded my resume: ${file.name}`);
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
