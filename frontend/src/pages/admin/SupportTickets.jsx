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
  User,
  Filter,
  Users,
  Building2,
  GraduationCap,
  RefreshCw,
  Eye,
  UserPlus,
  Loader2
} from 'lucide-react';

const SupportTickets = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    user_type: '',
    unassigned_only: false,
    search: ''
  });
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    loadTickets();
    loadStats();
  }, [filters, pagination.page]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 30
      });
      
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      if (filters.user_type) params.append('user_type', filters.user_type);
      if (filters.unassigned_only) params.append('unassigned_only', 'true');
      if (filters.search) params.append('search', filters.search);
      
      const res = await api.get(`/api/support/admin/tickets?${params}`);
      if (res.data.success) {
        setTickets(res.data.data.tickets || []);
        setPagination(prev => ({
          ...prev,
          pages: res.data.data.pagination?.pages || 1,
          total: res.data.data.pagination?.total || 0
        }));
        if (res.data.data.stats) {
          setStats(res.data.data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/api/support/admin/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      waiting_user: 'bg-purple-100 text-purple-700 border-purple-200',
      resolved: 'bg-green-100 text-green-700 border-green-200',
      closed: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return colors[status] || colors.open;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[priority] || colors.medium;
  };

  const getUserTypeIcon = (userType) => {
    const icons = {
      workforce: User,
      employer: Building2,
      institution: GraduationCap
    };
    return icons[userType] || User;
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: theme.primaryColor }} />
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
              <p className="text-gray-600">Manage user support requests</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.open || 0}</p>
                    <p className="text-sm text-gray-500">Open</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.in_progress || 0}</p>
                    <p className="text-sm text-gray-500">In Progress</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.waiting_user || 0}</p>
                    <p className="text-sm text-gray-500">Waiting User</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.unassigned || 0}</p>
                    <p className="text-sm text-gray-500">Unassigned</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={filters.search}
                      onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      data-testid="search-tickets-input"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm"
                  data-testid="status-filter"
                >
                  <option value="">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_user">Waiting User</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm"
                  data-testid="priority-filter"
                >
                  <option value="">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* User Type Filter */}
                <select
                  value={filters.user_type}
                  onChange={(e) => setFilters(f => ({ ...f, user_type: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm"
                  data-testid="user-type-filter"
                >
                  <option value="">All Users</option>
                  <option value="workforce">Workforce</option>
                  <option value="employer">Employer</option>
                  <option value="institution">Institution</option>
                </select>

                {/* Unassigned Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.unassigned_only}
                    onChange={(e) => setFilters(f => ({ ...f, unassigned_only: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">Unassigned only</span>
                </label>

                {/* Refresh */}
                <button
                  onClick={() => { loadTickets(); loadStats(); }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  data-testid="refresh-btn"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </button>
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
                  {tickets.map(ticket => {
                    const UserIcon = getUserTypeIcon(ticket.user_type);
                    return (
                      <div
                        key={ticket.ticket_id}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedTicket(ticket)}
                        data-testid={`ticket-row-${ticket.ticket_id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium text-gray-900">{ticket.subject}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                                {ticket.status?.replace('_', ' ')}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-3.5 h-3.5" />
                                {ticket.user_name || ticket.user_email}
                              </span>
                              <span className="capitalize">{ticket.category}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(ticket.created_date).toLocaleDateString()}
                              </span>
                              {ticket.assigned_admin_name && (
                                <span className="text-blue-600">
                                  Assigned: {ticket.assigned_admin_name}
                                </span>
                              )}
                              {ticket.message_count > 1 && (
                                <span className="text-gray-400">
                                  {ticket.message_count} messages
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.pages} ({pagination.total} tickets)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
                      disabled={pagination.page === pagination.pages}
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
            loadStats();
          }}
          theme={theme}
        />
      )}
    </div>
  );
};

const TicketDetailModal = ({ ticket, onClose, onUpdate, theme }) => {
  const [fullTicket, setFullTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadFullTicket();
  }, [ticket.ticket_id]);

  const loadFullTicket = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/support/admin/tickets/${ticket.ticket_id}`);
      if (res.data.success) {
        setFullTicket(res.data.data);
        setStatus(res.data.data.status);
        setPriority(res.data.data.priority);
      }
    } catch (error) {
      console.error('Failed to load ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResponse = async () => {
    if (!response.trim()) return;
    
    setSending(true);
    try {
      await api.post(`/api/support/admin/tickets/${ticket.ticket_id}/reply?is_internal=${isInternal}`, {
        message: response
      });
      setResponse('');
      loadFullTicket();
      onUpdate();
    } catch (error) {
      console.error('Failed to send response:', error);
      alert('Failed to send response');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateTicket = async () => {
    try {
      const params = new URLSearchParams();
      if (status !== fullTicket?.status) params.append('status', status);
      if (priority !== fullTicket?.priority) params.append('priority', priority);
      
      if (params.toString()) {
        await api.patch(`/api/support/admin/tickets/${ticket.ticket_id}?${params}`);
        loadFullTicket();
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to update ticket:', error);
      alert('Failed to update ticket');
    }
  };

  const getStatusColor = (s) => {
    const colors = {
      open: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      waiting_user: 'bg-purple-100 text-purple-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-600'
    };
    return colors[s] || colors.open;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold">{ticket.subject}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fullTicket?.status || ticket.status)}`}>
                {(fullTicket?.status || ticket.status)?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500">#{ticket.ticket_id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Ticket Info */}
            <div className="p-4 border-b bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <label className="text-gray-500 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    onBlur={handleUpdateTicket}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_user">Waiting User</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    onBlur={handleUpdateTicket}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">Category</label>
                  <p className="font-medium capitalize">{fullTicket?.category}</p>
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">User</label>
                  <p className="font-medium">{fullTicket?.user_name || fullTicket?.user_email}</p>
                  <p className="text-xs text-gray-500 capitalize">{fullTicket?.user_type}</p>
                </div>
              </div>
              {fullTicket?.assigned_admin_name && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-sm text-gray-500">Assigned to: </span>
                  <span className="text-sm font-medium text-blue-600">{fullTicket.assigned_admin_name}</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '400px' }}>
              {fullTicket?.messages?.map((msg, idx) => (
                <div
                  key={msg.message_id || idx}
                  className={`p-3 rounded-lg ${
                    msg.sender_type === 'admin'
                      ? msg.is_internal 
                        ? 'bg-yellow-50 border border-yellow-200 ml-8'
                        : 'bg-blue-50 ml-8'
                      : 'bg-gray-100 mr-8'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {msg.sender_type === 'admin' ? (msg.sender_name || 'Admin') : fullTicket.user_name}
                    </span>
                    {msg.is_internal && (
                      <span className="px-1.5 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded">
                        Internal Note
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Reply Box */}
            <div className="p-4 border-t bg-gray-50">
              <div className="mb-2 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-600">Internal note (not visible to user)</span>
                </label>
              </div>
              <div className="flex gap-3">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder={isInternal ? "Add internal note..." : "Type your response..."}
                  data-testid="admin-reply-input"
                />
                <button
                  onClick={handleSendResponse}
                  disabled={sending || !response.trim()}
                  className="px-4 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50 self-end"
                  style={{ backgroundColor: theme.primaryColor }}
                  data-testid="admin-send-reply-btn"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SupportTickets;
