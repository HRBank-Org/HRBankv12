import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';
import { FiMessageSquare, FiPlus, FiX, FiSend } from 'react-icons/fi';

const Messages = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [sending, setSending] = useState(false);

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

  const loadTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const response = await api.get('/messages/team-members');
      if (response.data?.data?.members) {
        setTeamMembers(response.data.data.members);
      }
    } catch (error) {
      console.error('Failed to load team members:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleNewChat = () => {
    setShowNewChat(true);
    loadTeamMembers();
  };

  const startConversation = async () => {
    if (!selectedMember || !newMessage.trim()) return;
    
    setSending(true);
    try {
      const response = await api.post('/messages/threads/create', {
        target_user_id: selectedMember.workforce_id,
        message: newMessage.trim()
      });
      
      if (response.data.success) {
        setShowNewChat(false);
        setSelectedMember(null);
        setNewMessage('');
        // Navigate to the new thread
        navigate(`/employer/messages/${response.data.data.thread_id}`);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert(error.response?.data?.detail || 'Failed to start conversation');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader title="Messages" />
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <FiPlus className="w-5 h-5" />
            New Message
          </button>
        </div>

        {/* New Chat Modal */}
        {showNewChat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">New Conversation</h2>
                <button onClick={() => setShowNewChat(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Team Member</label>
                {loadingTeam ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No team members found</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                    {teamMembers.map((member) => (
                      <div
                        key={member.workforce_id}
                        onClick={() => setSelectedMember(member)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-3 ${
                          selectedMember?.workforce_id === member.workforce_id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          {member.full_name?.charAt(0) || member.first_name?.charAt(0) || 'W'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Worker'}
                          </p>
                          <p className="text-sm text-gray-500">{member.position_title || member.role_title || 'Team Member'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedMember && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full border rounded-lg p-3 h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={startConversation}
                      disabled={!newMessage.trim() || sending}
                      className="mt-3 w-full py-2 px-4 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <FiSend className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
          </div>
        ) : threads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FiMessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-600 mb-4">Start a conversation with your team</p>
            <button
              onClick={handleNewChat}
              className="px-6 py-2 text-white rounded-lg"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Start New Chat
            </button>
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
                        {thread.workforce_name?.charAt(0) || thread.other_user_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {thread.workforce_name || thread.other_user_name || 'User'}
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
