import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';
import { FiMessageSquare, FiSend } from 'react-icons/fi';

const Messages = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      const response = await api.get('/messages/threads');
      setThreads(response.data.data.threads || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader title="Messages" />
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
          </div>
        ) : threads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FiMessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-600">Start a conversation with your team</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chat List */}
            <div className="md:col-span-1 bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Conversations</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {threads.map((thread) => (
                  <div
                    key={thread.thread_id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/employer/messages/${thread.thread_id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: theme.primaryColor }}>
                        {thread.other_user_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {thread.other_user_name || 'User'}
                          </h3>
                          {thread.employer_unread_count > 0 && (
                            <span className="px-2 py-1 text-xs font-bold text-white rounded-full"
                              style={{ backgroundColor: theme.primaryColor }}>
                              {thread.employer_unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {thread.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Area Placeholder */}
            <div className="md:col-span-2 bg-white rounded-lg shadow-sm flex items-center justify-center p-12">
              <div className="text-center">
                <FiMessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Select a conversation to view messages</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;