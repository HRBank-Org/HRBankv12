import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const Messages = () => {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get agent info based on user type
  const getAgentInfo = () => {
    if (user?.user_type === 'workforce') {
      return {
        name: 'Suzie',
        photo: 'https://images.unsplash.com/photo-1655249493799-9cee4fe983bb',
        greeting: `${getGreeting()}! I'm Suzie, your HR Bank assistant. I'm here to help you with any questions or concerns.`
      };
    } else {
      return {
        name: 'Emma',
        photo: 'https://images.unsplash.com/photo-1652471949169-9c587e8898cd',
        greeting: `${getGreeting()}! I'm Emma, your HR Bank assistant. I'm here to help you manage your workforce and answer any questions.`
      };
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread.thread_id);
    }
  }, [selectedThread]);

  const loadThreads = async () => {
    try {
      const response = await api.get('/api/messages/threads');
      setThreads(response.data.data.threads || []);
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

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedThread) return;

    setSending(true);
    try {
      await api.post(`/api/messages/threads/${selectedThread.thread_id}/send`, {
        message: messageText
      });
      
      setMessageText('');
      await loadMessages(selectedThread.thread_id);
      await loadThreads();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
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
              {threads.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No messages yet</p>
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
                        selectedThread?.thread_id === thread.thread_id ? 'bg-blue-50' : ''
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
                <div className="p-4 border-b border-gray-200">
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

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isCurrentUser = msg.sender_id === user.user_id;
                      return (
                        <div
                          key={msg.message_id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isCurrentUser
                                ? 'text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                            style={isCurrentUser ? { backgroundColor: theme.primaryColor } : {}}
                          >
                            <p className="text-sm">{msg.message_text}</p>
                            <p className={`text-xs mt-1 ${isCurrentUser ? 'text-white opacity-75' : 'text-gray-500'}`}>
                              {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                      placeholder="Type your message..."
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
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;
