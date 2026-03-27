import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Send,
  X,
  User,
  ArrowLeft,
  Filter,
  RefreshCw,
  HelpCircle,
  FileText,
  CreditCard,
  Settings,
  Calendar,
  Award,
  Lightbulb,
  MessageCircle
} from 'lucide-react';

const CATEGORY_ICONS = {
  account: User,
  documents: FileText,
  verification: CheckCircle,
  payments: CreditCard,
  technical: Settings,
  shifts: Calendar,
  credentials: Award,
  feature_request: Lightbulb,
  general: MessageCircle
};

const Support = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    loadCategories();
    loadTickets();
  }, [filter]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/api/support/categories');
      if (res.data.success) {
        setCategories(res.data.data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: pagination.page, limit: 20 });
      if (filter !== 'all') params.append('status', filter);
      
      const res = await api.get(`/api/support/tickets?${params}`);
      if (res.data.success) {
        setTickets(res.data.data.tickets);
        setPagination(res.data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      waiting_user: 'bg-purple-100 text-purple-700 border-purple-200',
      resolved: 'bg-green-100 text-green-700 border-green-200',
      closed: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return styles[status] || styles.open;
  };

  const getPriorityDot = (priority) => {
    const colors = {
      urgent: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return colors[priority] || colors.medium;
  };

  if (selectedTicket) {
    return (
      <TicketDetail 
        ticketId={selectedTicket} 
        onBack={() => { setSelectedTicket(null); loadTickets(); }} 
        theme={theme}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
            <p className="text-gray-600 text-sm mt-1">
              Need help? Submit a ticket and we'll get back to you.
            </p>
          </div>
          <button
            onClick={() => setShowNewTicket(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: theme.primaryColor }}
            data-testid="create-ticket-btn"
          >
            <Plus className="w-5 h-5" />
            New Ticket
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'open', 'in_progress', 'waiting_user', 'resolved', 'closed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f 
                  ? 'text-white' 
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
              style={filter === f ? { backgroundColor: theme.primaryColor } : {}}
              data-testid={`filter-${f}`}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
          <button
            onClick={loadTickets}
            className="ml-auto p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            data-testid="refresh-tickets-btn"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No tickets yet</h3>
              <p className="text-gray-500 mb-4">Create a new ticket to get support from our team.</p>
              <button
                onClick={() => setShowNewTicket(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Plus className="w-4 h-4" />
                Create Ticket
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {tickets.map(ticket => (
                <button
                  key={ticket.ticket_id}
                  onClick={() => setSelectedTicket(ticket.ticket_id)}
                  className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                  data-testid={`ticket-${ticket.ticket_id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityDot(ticket.priority)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-gray-900 truncate">{ticket.subject}</span>
                        {ticket.has_new_response && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            New Reply
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(ticket.status)}`}>
                          {ticket.status?.replace('_', ' ')}
                        </span>
                        <span className="text-gray-500 capitalize">{ticket.category}</span>
                        <span className="text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.created_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages} ({pagination.total} tickets)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-white"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <NewTicketModal 
          categories={categories}
          onClose={() => setShowNewTicket(false)}
          onCreated={() => { setShowNewTicket(false); loadTickets(); }}
          theme={theme}
        />
      )}
    </div>
  );
};

// New Ticket Modal Component
const NewTicketModal = ({ categories, onClose, onCreated, theme }) => {
  const [formData, setFormData] = useState({
    category: 'general',
    subject: '',
    description: '',
    priority: 'medium'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.subject.length < 5) {
      setError('Subject must be at least 5 characters');
      return;
    }
    if (formData.description.length < 20) {
      setError('Description must be at least 20 characters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post('/api/support/tickets', formData);
      if (res.data.success) {
        onCreated();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Create Support Ticket</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => {
                const Icon = CATEGORY_ICONS[cat.value] || HelpCircle;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData(d => ({ ...d, category: cat.value }))}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      formData.category === cat.value
                        ? 'border-2 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    style={formData.category === cat.value ? { borderColor: theme.primaryColor } : {}}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <div className="flex gap-2">
              {['low', 'medium', 'high', 'urgent'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData(d => ({ ...d, priority: p }))}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                    formData.priority === p
                      ? 'text-white border-transparent'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                  style={formData.priority === p ? { 
                    backgroundColor: p === 'urgent' ? '#ef4444' : p === 'high' ? '#f97316' : p === 'medium' ? '#eab308' : '#22c55e'
                  } : {}}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData(d => ({ ...d, subject: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief summary of your issue"
              maxLength={200}
              data-testid="ticket-subject-input"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.subject.length}/200</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("pages.common.description")}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(d => ({ ...d, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={5}
              placeholder="Please describe your issue in detail. Include any relevant information that might help us assist you better."
              maxLength={5000}
              data-testid="ticket-description-input"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.description.length}/5000</p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
              data-testid="submit-ticket-btn"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Ticket Detail Component
const TicketDetail = ({ ticketId, onBack, theme }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/support/tickets/${ticketId}`);
      if (res.data.success) {
        setTicket(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || reply.length < 1) return;

    setSending(true);
    try {
      await api.post(`/api/support/tickets/${ticketId}/reply`, { message: reply });
      setReply('');
      loadTicket();
    } catch (error) {
      console.error('Failed to send reply:', error);
      alert('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async (rating) => {
    try {
      await api.post(`/api/support/tickets/${ticketId}/close?satisfaction_rating=${rating}`);
      loadTicket();
    } catch (error) {
      console.error('Failed to close ticket:', error);
    }
  };

  const handleReopen = async () => {
    const reason = prompt('Please provide a reason for reopening this ticket:');
    if (!reason || reason.length < 10) {
      alert('Please provide a reason with at least 10 characters');
      return;
    }
    try {
      await api.post(`/api/support/tickets/${ticketId}/reopen?reason=${encodeURIComponent(reason)}`);
      loadTicket();
    } catch (error) {
      console.error('Failed to reopen ticket:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      waiting_user: 'bg-purple-100 text-purple-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-600'
    };
    return styles[status] || styles.open;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
          <p className="text-gray-600">Ticket not found</p>
          <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const canReply = !['closed', 'resolved'].includes(ticket.status);
  const canClose = !['closed'].includes(ticket.status);
  const canReopen = ['closed', 'resolved'].includes(ticket.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button & Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          data-testid="back-to-tickets-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tickets
        </button>

        {/* Ticket Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(ticket.status)}`}>
                  {ticket.status?.replace('_', ' ')}
                </span>
                <span className="text-gray-500 text-sm">#{ticket.ticket_id}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="capitalize">{ticket.category}</span>
                <span>Priority: <span className="capitalize font-medium">{ticket.priority}</span></span>
                <span>Created: {new Date(ticket.created_date).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {canClose && (
                <button
                  onClick={() => {
                    const rating = prompt('Rate your support experience (1-5):');
                    if (rating && parseInt(rating) >= 1 && parseInt(rating) <= 5) {
                      handleClose(parseInt(rating));
                    }
                  }}
                  className="px-3 py-1.5 border rounded-lg text-sm font-medium text-green-700 border-green-300 hover:bg-green-50"
                >
                  Close Ticket
                </button>
              )}
              {canReopen && (
                <button
                  onClick={handleReopen}
                  className="px-3 py-1.5 border rounded-lg text-sm font-medium text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  Reopen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-medium text-gray-900">Conversation</h2>
          </div>

          <div className="divide-y max-h-[500px] overflow-y-auto">
            {ticket.messages?.map((msg, idx) => (
              <div
                key={msg.message_id || idx}
                className={`p-4 ${msg.sender_type === 'admin' ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    msg.sender_type === 'admin' ? 'bg-blue-600' : 'bg-gray-500'
                  }`}>
                    {msg.sender_type === 'admin' ? 'S' : 'U'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      {msg.sender_type === 'admin' ? (msg.sender_name || 'Support Team') : 'You'}
                    </span>
                    <span className="text-gray-500 text-sm ml-2">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="pl-10">
                  <p className="text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Box */}
          {canReply && (
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  data-testid="ticket-reply-input"
                />
                <button
                  onClick={handleReply}
                  disabled={sending || !reply.trim()}
                  className="px-4 py-2 rounded-lg text-white font-medium self-end disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: theme.primaryColor }}
                  data-testid="send-reply-btn"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Satisfaction Rating (if resolved/closed) */}
          {ticket.satisfaction_rating && (
            <div className="p-4 border-t bg-green-50">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  You rated this support experience: {ticket.satisfaction_rating}/5
                </span>
              </div>
              {ticket.satisfaction_feedback && (
                <p className="text-green-700 text-sm mt-1">{ticket.satisfaction_feedback}</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Support;
