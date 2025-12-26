import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import {
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Clock,
  AlertCircle,
  CheckCircle,
  User
} from 'lucide-react';

const SupportTickets = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('open');
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    loadTickets();
  }, [page, filter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (filter !== 'all') params.append('status', filter);
      
      const res = await api.get(`/api/super-admin/support-tickets?${params}`);
      setTickets(res.data.data.tickets || []);
      setTotal(res.data.data.total || 0);
      setPages(res.data.data.pages || 1);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
              <p className="text-gray-600">{total} tickets total</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
              <div className="flex gap-2">
                {['open', 'in_progress', 'resolved', 'closed', 'all'].map(f => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setPage(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      filter === f ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={filter === f ? { backgroundColor: theme.primaryColor } : {}}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets List */}
            <div className="bg-white rounded-xl shadow-sm border">
              {tickets.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No support tickets found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {tickets.map(ticket => (
                    <div
                      key={ticket.ticket_id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{ticket.subject}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                              {ticket.status?.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-1">{ticket.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {ticket.user_email || 'Unknown'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(ticket.created_date).toLocaleDateString()}
                            </span>
                            {ticket.category && (
                              <span className="capitalize">{ticket.category}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-600">
                    Page {page} of {pages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(pages, p + 1))}
                      disabled={page === pages}
                      className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={() => {
            loadTickets();
          }}
          theme={theme}
        />
      )}
    </div>
  );
};

const TicketDetailModal = ({ ticket, onClose, onUpdate, theme }) => {
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState(ticket.status);
  const [sending, setSending] = useState(false);

  const handleSendResponse = async () => {
    if (!response.trim()) return;
    
    setSending(true);
    try {
      await api.post(`/api/super-admin/support-tickets/${ticket.ticket_id}/respond`, {
        message: response,
        status: status !== ticket.status ? status : undefined
      });
      setResponse('');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to send response:', error);
      alert('Failed to send response');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{ticket.subject}</h2>
            <p className="text-sm text-gray-500">Ticket #{ticket.ticket_id?.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Ticket Info */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <label className="text-gray-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full mt-1 px-2 py-1 border rounded-lg text-sm"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-gray-500">Priority</label>
              <p className="font-medium capitalize mt-1">{ticket.priority}</p>
            </div>
            <div>
              <label className="text-gray-500">Category</label>
              <p className="font-medium capitalize mt-1">{ticket.category || 'General'}</p>
            </div>
          </div>
          
          {/* Original Message */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">{ticket.user_email}</span>
              <span className="text-xs text-gray-500">
                {new Date(ticket.created_date).toLocaleString()}
              </span>
            </div>
            <p className="text-gray-700">{ticket.description}</p>
          </div>
          
          {/* Message History */}
          {ticket.messages?.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Conversation</h4>
              {ticket.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.sender_type === 'admin'
                      ? 'bg-blue-50 ml-8'
                      : 'bg-gray-50 mr-8'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {msg.sender_type === 'admin' ? msg.sender_name || 'Admin' : ticket.user_email}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              ))}
            </div>
          )}
          
          {/* Reply Box */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reply</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              rows={4}
              placeholder="Type your response..."
            />
          </div>
        </div>
        
        <div className="flex gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handleSendResponse}
            disabled={sending || !response.trim()}
            className="flex-1 px-4 py-2 rounded-lg text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Response
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;
