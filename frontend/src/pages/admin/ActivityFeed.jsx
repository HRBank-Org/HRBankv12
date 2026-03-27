import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import { Activity, Clock, UserPlus, CheckCircle, FileCheck, AlertTriangle, Shield, Loader2 } from 'lucide-react';
import api from '../../utils/api';

import { useLanguage } from '../../contexts/LanguageContext';

const ActivityFeed = () => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      // Fetch recent activities from multiple sources
      const [usersRes, credentialsRes, ticketsRes] = await Promise.allSettled([
        api.get('/api/admin/users?limit=10&sort=-created_at'),
        api.get('/api/admin/credential-reviews?limit=10'),
        api.get('/api/admin/support-tickets?limit=5')
      ]);

      const activityList = [];

      // Process recent user registrations
      if (usersRes.status === 'fulfilled' && usersRes.value?.data?.data?.users) {
        usersRes.value.data.data.users.forEach(user => {
          activityList.push({
            id: `user-${user.user_id}`,
            action: user.profile_status === 'active' ? 'Account activated' : 'New user registration',
            user: user.email,
            type: user.user_type,
            timestamp: user.created_at,
            icon: user.profile_status === 'active' ? CheckCircle : UserPlus,
            iconBg: user.profile_status === 'active' ? 'bg-green-100' : 'bg-blue-100',
            iconColor: user.profile_status === 'active' ? 'text-green-600' : 'text-blue-600'
          });
        });
      }

      // Process credential reviews
      if (credentialsRes.status === 'fulfilled' && credentialsRes.value?.data?.data?.reviews) {
        credentialsRes.value.data.data.reviews.forEach(review => {
          activityList.push({
            id: `cred-${review.review_id || review._id}`,
            action: review.status === 'approved' ? 'Credential approved' : 
                   review.status === 'rejected' ? 'Credential rejected' : 'Credential pending review',
            user: review.user_email || review.user_id,
            type: 'credential',
            timestamp: review.submitted_at || review.created_at,
            icon: FileCheck,
            iconBg: review.status === 'approved' ? 'bg-green-100' : 
                   review.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100',
            iconColor: review.status === 'approved' ? 'text-green-600' : 
                      review.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
          });
        });
      }

      // Process support tickets
      if (ticketsRes.status === 'fulfilled' && ticketsRes.value?.data?.data?.tickets) {
        ticketsRes.value.data.data.tickets.forEach(ticket => {
          activityList.push({
            id: `ticket-${ticket.ticket_id}`,
            action: ticket.status === 'resolved' ? 'Support ticket resolved' : 
                   ticket.status === 'open' ? 'New support ticket' : 'Support ticket updated',
            user: ticket.user_email || 'support@hrbank.ca',
            type: 'support',
            timestamp: ticket.created_at,
            icon: AlertTriangle,
            iconBg: ticket.status === 'resolved' ? 'bg-green-100' : 'bg-orange-100',
            iconColor: ticket.status === 'resolved' ? 'text-green-600' : 'text-orange-600'
          });
        });
      }

      // Sort by timestamp (most recent first)
      activityList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setActivities(activityList.slice(0, 20)); // Show top 20
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return then.toLocaleDateString();
  };

  const getTypeColor = (type) => {
    const colors = {
      workforce: 'bg-blue-100 text-blue-800',
      employer: 'bg-orange-100 text-orange-800',
      institution: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      credential: 'bg-green-100 text-green-800',
      support: 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
                    <p className="text-gray-600">Recent platform activity and events</p>
                  </div>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Activity</option>
                    <option value="workforce">Workforce</option>
                    <option value="employer">Employers</option>
                    <option value="institution">Institutions</option>
                    <option value="credential">Credentials</option>
                    <option value="support">Support</option>
                  </select>
                  <button
                    onClick={fetchActivities}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {/* Activity List */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : filteredActivities.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No recent activity found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredActivities.map((activity) => {
                        const IconComponent = activity.icon || Clock;
                        return (
                          <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className={`p-2 rounded-full ${activity.iconBg}`}>
                              <IconComponent className={`w-4 h-4 ${activity.iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{activity.action}</p>
                              <p className="text-sm text-gray-600 truncate">{activity.user}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(activity.type)}`}>
                                {activity.type}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ActivityFeed;
