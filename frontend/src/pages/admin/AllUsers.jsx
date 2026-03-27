import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  Users, Search, ChevronLeft, ChevronRight, UserCheck, Building2, GraduationCap, Shield,
  CheckCircle, XCircle, Eye, X, Mail, Phone, MapPin, Calendar, MoreVertical, AlertTriangle,
  Ban, Unlock, FileText, Send
} from 'lucide-react';

const AllUsers = () => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userType, setUserType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    loadUsers();
  }, [page, userType, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (userType !== 'all') params.append('user_type', userType);
      if (statusFilter !== 'all') params.append('profile_status', statusFilter);
      
      const response = await api.get(`/api/admin/users?${params}`);
      setUsers(response.data.data.users || []);
      setTotal(response.data.data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserIcon = (type) => {
    switch (type) {
      case 'workforce': return <UserCheck className="w-4 h-4" />;
      case 'employer': return <Building2 className="w-4 h-4" />;
      case 'institution': return <GraduationCap className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const handleActivate = async (userId) => {
    setProcessing(userId);
    try {
      await api.post(`/api/super-admin/activate-user/${userId}`, {
        note: actionNote || 'Account activated by admin'
      });
      await loadUsers();
      setSelectedUser(null);
      setActionNote('');
    } catch (error) {
      console.error('Failed to activate user:', error);
      alert(error.response?.data?.detail || 'Failed to activate user');
    } finally {
      setProcessing(null);
    }
  };

  const handleSuspend = async (userId) => {
    const reason = prompt('Enter reason for suspension:');
    if (!reason) return;
    
    setProcessing(userId);
    try {
      await api.post(`/api/super-admin/suspend-user/${userId}`, { reason });
      await loadUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to suspend user:', error);
      alert(error.response?.data?.detail || 'Failed to suspend user');
    } finally {
      setProcessing(null);
    }
  };

  const handleUnsuspend = async (userId) => {
    setProcessing(userId);
    try {
      await api.post(`/api/super-admin/unsuspend-user/${userId}`);
      await loadUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to unsuspend user:', error);
      alert(error.response?.data?.detail || 'Failed to unsuspend user');
    } finally {
      setProcessing(null);
    }
  };

  const handleResendVerification = async (userId, email) => {
    setProcessing(userId);
    try {
      await api.post('/api/auth/resend-verification', { email });
      alert('Verification email sent!');
    } catch (error) {
      console.error('Failed to send verification:', error);
      alert(error.response?.data?.detail || 'Failed to send verification email');
    } finally {
      setProcessing(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const badges = {
      'active': 'bg-green-100 text-green-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'pending_verification': 'bg-orange-100 text-orange-700',
      'under_review': 'bg-blue-100 text-blue-700',
      'suspended': 'bg-red-100 text-red-700',
      'inactive': 'bg-gray-100 text-gray-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const isPending = (user) => {
    return ['pending', 'pending_verification', 'under_review'].includes(user.profile_status);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">All Users</h1>
                    <p className="text-gray-600">{total} total users in the system</p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                      {['all', 'workforce', 'employer', 'institution'].map((type) => (
                        <button
                          key={type}
                          onClick={() => { setUserType(type); setPage(1); }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                            userType === type
                              ? 'bg-white text-orange-700 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                      {['all', 'pending_verification', 'active', 'suspended'].map((status) => (
                        <button
                          key={status}
                          onClick={() => { setStatusFilter(status); setPage(1); }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            statusFilter === status
                              ? 'bg-white text-orange-700 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {status === 'all' ? 'All Status' : status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: theme.primaryColor }}></div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No users found</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">User</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">{t("pages.common.type")}</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">{t("pages.common.status")}</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Province</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Joined</th>
                        <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">{t("pages.common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredUsers.map((user) => (
                        <tr key={user.user_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                                {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{user.full_name || 'N/A'}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-2 text-sm">
                              {getUserIcon(user.user_type)}
                              <span className="capitalize">{user.user_type}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.profile_status)}`}>
                              {user.profile_status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{user.province || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {isPending(user) && (
                                <button
                                  onClick={() => handleActivate(user.user_id)}
                                  disabled={processing === user.user_id}
                                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                                >
                                  {processing === user.user_id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                  Activate
                                </button>
                              )}
                              {user.profile_status === 'pending_verification' && (
                                <button
                                  onClick={() => handleResendVerification(user.user_id, user.email)}
                                  disabled={processing === user.user_id}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                                  title="Resend verification email"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Pagination */}
                {total > 20 && (
                  <div className="px-6 py-4 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} users
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page * 20 >= total}
                        className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
              <button
                onClick={() => { setSelectedUser(null); setActionNote(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-medium">
                  {selectedUser.full_name?.charAt(0) || selectedUser.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedUser.full_name || 'N/A'}</h3>
                  <p className="text-gray-500">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      {getUserIcon(selectedUser.user_type)}
                      <span className="capitalize">{selectedUser.user_type}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedUser.profile_status)}`}>
                      {selectedUser.profile_status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Contact Information</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedUser.email}</span>
                    {selectedUser.email_verified && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {selectedUser.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedUser.phone}</span>
                    </div>
                  )}
                  {(selectedUser.city || selectedUser.province) && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{[selectedUser.city, selectedUser.province].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Joined {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">{t("pages.common.actions")}</h4>
                
                {isPending(selectedUser) && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-yellow-800">Account Pending Activation</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          This user's account needs to be activated before they can access the platform.
                        </p>
                        <textarea
                          value={actionNote}
                          onChange={(e) => setActionNote(e.target.value)}
                          placeholder="Add a note (optional)..."
                          className="w-full mt-3 p-2 border rounded-lg text-sm"
                          rows={2}
                        />
                        <button
                          onClick={() => handleActivate(selectedUser.user_id)}
                          disabled={processing === selectedUser.user_id}
                          className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {processing === selectedUser.user_id ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              Activate Account
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedUser.profile_status === 'pending_verification' && (
                  <button
                    onClick={() => handleResendVerification(selectedUser.user_id, selectedUser.email)}
                    disabled={processing === selectedUser.user_id}
                    className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Resend Verification Email
                  </button>
                )}

                {selectedUser.profile_status === 'active' && (
                  <button
                    onClick={() => handleSuspend(selectedUser.user_id)}
                    disabled={processing === selectedUser.user_id}
                    className="w-full px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Suspend Account
                  </button>
                )}

                {selectedUser.profile_status === 'suspended' && (
                  <button
                    onClick={() => handleUnsuspend(selectedUser.user_id)}
                    disabled={processing === selectedUser.user_id}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    Unsuspend Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllUsers;
