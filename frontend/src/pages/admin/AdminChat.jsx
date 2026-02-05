import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import {
  MessageSquare,
  Search,
  Send,
  X,
  User,
  Users,
  ChevronLeft,
  Clock,
  Check,
  CheckCheck,
  Plus,
  Loader2
} from 'lucide-react';

const AdminChat = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadThreads();
    loadContacts();
  }, []);

  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread.thread_id);
    }
  }, [selectedThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadThreads();
      if (selectedThread) {
        loadMessages(selectedThread.thread_id);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedThread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThreads = async () => {
    try {
      const res = await api.get('/api/admin-messaging/threads');
      if (res.data.success) {
        setThreads(res.data.data.threads || []);
        setTotalUnread(res.data.data.total_unread || 0);
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const res = await api.get('/api/admin-messaging/available-contacts');
      if (res.data.success) {
        setContacts(res.data.data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadMessages = async (threadId) => {
    try {
      const res = await api.get(`/api/admin-messaging/threads/${threadId}/messages`);
      if (res.data.success) {
        setMessages(res.data.data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const startNewChat = async (contact) => {
    try {
      const res = await api.post('/api/admin-messaging/threads/create', {
        recipient_user_id: contact.user_id
      });
      if (res.data.success) {
        setShowNewChat(false);
        await loadThreads();
        // Find and select the new/existing thread
        const thread = threads.find(t => 
          t.participants?.includes(contact.user_id)
        ) || { thread_id: res.data.data.thread_id, other_participant: contact };
        setSelectedThread(thread);
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
      alert(error.response?.data?.detail || 'Failed to start chat');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;

    setSending(true);
    try {
      await api.post(`/api/admin-messaging/threads/${selectedThread.thread_id}/messages`, {
        message: newMessage
      });
      setNewMessage('');
      loadMessages(selectedThread.thread_id);
      loadThreads();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      super_admin: 'bg-red-100 text-red-700',
      regional_manager: 'bg-blue-100 text-blue-700',
      franchise_manager: 'bg-pink-100 text-pink-700',
      compliance_officer: 'bg-orange-100 text-orange-700',
      credentials_reviewer: 'bg-purple-100 text-purple-700',
      account_activator: 'bg-green-100 text-green-700',
      customer_service: 'bg-yellow-100 text-yellow-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const filteredContacts = contacts.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="h-[calc(100vh-80px)] flex">
            {/* Thread List */}
            <div className={`w-80 border-r bg-white flex flex-col ${selectedThread && 'hidden md:flex'}`}>
              {/* Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Admin Chat</h2>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                    title="New Chat"
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                {totalUnread > 0 && (
                  <div className="text-sm text-blue-600 font-medium">
                    {totalUnread} unread message{totalUnread !== 1 && 's'}
                  </div>
                )}
              </div>

              {/* Thread List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : threads.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No conversations yet</p>
                    <button
                      onClick={() => setShowNewChat(true)}
                      className="mt-3 text-sm text-blue-600 hover:underline"
                    >
                      Start a new chat
                    </button>
                  </div>
                ) : (
                  threads.map((thread) => (
                    <button
                      key={thread.thread_id}
                      onClick={() => setSelectedThread(thread)}
                      className={`w-full p-4 text-left hover:bg-gray-50 border-b transition-colors ${
                        selectedThread?.thread_id === thread.thread_id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                          {thread.other_participant?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 truncate">
                              {thread.other_participant?.full_name || 'Unknown'}
                            </p>
                            {thread.unread_count > 0 && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                                {thread.unread_count}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${getRoleColor(thread.other_participant?.role)}`}>
                              {thread.other_participant?.role?.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {thread.last_message_preview || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${!selectedThread && 'hidden md:flex'}`}>
              {selectedThread ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b bg-white flex items-center gap-3">
                    <button
                      onClick={() => setSelectedThread(null)}
                      className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      {selectedThread.other_participant?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {selectedThread.other_participant?.full_name || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(selectedThread.other_participant?.role)}`}>
                          {selectedThread.other_participant?.role?.replace('_', ' ')}
                        </span>
                        {selectedThread.other_participant?.assigned_provinces?.length > 0 && (
                          <span className="text-xs text-gray-500">
                            • {selectedThread.other_participant.assigned_provinces.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => {
                          const isOwn = msg.sender_id === localStorage.getItem('user_id');
                          return (
                            <div
                              key={msg.message_id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                                  isOwn
                                    ? 'bg-blue-600 text-white rounded-br-md'
                                    : 'bg-white text-gray-900 rounded-bl-md'
                                }`}
                              >
                                {!isOwn && (
                                  <p className="text-xs font-medium text-gray-500 mb-1">
                                    {msg.sender_name}
                                  </p>
                                )}
                                <p className="whitespace-pre-wrap">{msg.message}</p>
                                <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                                  <Clock className="w-3 h-3" />
                                  {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {isOwn && (
                                    msg.read_by?.length > 1 ? (
                                      <CheckCheck className="w-3 h-3 ml-1" />
                                    ) : (
                                      <Check className="w-3 h-3 ml-1" />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="p-4 bg-white border-t">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        data-testid="chat-input"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="p-3 rounded-full text-white disabled:opacity-50"
                        style={{ backgroundColor: theme.primaryColor }}
                        data-testid="send-btn"
                      >
                        {sending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-100">
                  <div className="text-center text-gray-500">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="text-sm">or start a new chat</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Conversation</h2>
              <button
                onClick={() => setShowNewChat(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search admins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No contacts available</p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.user_id}
                    onClick={() => startNewChat(contact)}
                    className="w-full p-4 text-left hover:bg-gray-50 border-b transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      {contact.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{contact.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(contact.role)}`}>
                          {contact.role?.replace('_', ' ')}
                        </span>
                        {contact.assigned_provinces?.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {contact.assigned_provinces.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChat;
