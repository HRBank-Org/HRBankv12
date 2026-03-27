import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';
import { FiSend, FiArrowLeft, FiPaperclip, FiUser } from 'react-icons/fi';

import { useLanguage } from '../../contexts/LanguageContext';

const MessageThread = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();
  const messagesEndRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [thread, setThread] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadThread();
    loadMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThread = async () => {
    try {
      const response = await api.get(`/messages/threads/${threadId}`);
      setThread(response.data.data);
    } catch (error) {
      console.error('Failed to load thread:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await api.get(`/messages/threads/${threadId}/messages`);
      setMessages(response.data.data.messages || []);
      
      // Mark messages as read
      await api.post(`/messages/threads/${threadId}/mark-read`);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await api.post(`/messages/threads/${threadId}/send`, {
        message: newMessage.trim()
      });
      
      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 24 hours
    if (diff < 86400000) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    }
    
    // Older
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <UserHeader title="Messages" />
      
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/employer/messages')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          
          {thread && (
            <>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: theme.primaryColor }}>
                {thread.other_user_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">{thread.other_user_name || 'User'}</h2>
                <p className="text-sm text-gray-500">{thread.other_user_role || 'Worker'}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <FiUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isCurrentUser = message.sender_type === 'employer';
                const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                
                return (
                  <div
                    key={message.message_id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      {showAvatar && !isCurrentUser && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: theme.primaryColor }}>
                          {message.sender_name?.charAt(0) || 'U'}
                        </div>
                      )}
                      {showAvatar && isCurrentUser && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 bg-gray-600">
                          You
                        </div>
                      )}
                      {!showAvatar && <div className="w-8" />}
                      
                      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                        {showAvatar && (
                          <span className="text-xs text-gray-500 mb-1">
                            {isCurrentUser ? 'You' : message.sender_name}
                          </span>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isCurrentUser
                              ? 'text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                          style={isCurrentUser ? { backgroundColor: theme.primaryColor } : {}}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                        </div>
                        <span className="text-xs text-gray-400 mt-1">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={sendMessage} className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                placeholder="Type a message..."
                rows="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:border-transparent resize-none"
                style={{ focusRing: `${theme.primaryColor}40` }}
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-3 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <FiSend className="w-5 h-5" />
              )}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;
