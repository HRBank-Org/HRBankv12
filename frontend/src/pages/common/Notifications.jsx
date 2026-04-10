import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

import { useLanguage } from '../../contexts/LanguageContext';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const unreadOnly = filter === 'unread';
      // Enable translation by default
      const response = await api.get(`/api/notifications/my-notifications?unread_only=${unreadOnly}&limit=50&translate=true`);
      setNotifications(response.data.data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/api/notifications/notifications/${notificationId}/read`);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read');
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
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

  const getNotificationIcon = (type) => {
    const icons = {
      shift_reminder: '📅',
      shift_assigned: '✅',
      shift_cancelled: '❌',
      job_offer: '💼',
      payment: '💰',
      message: '💬',
      rating: '⭐',
      employment_terminated: '🚫',
      rehired: '🎉',
      credential_received: '🎓',
      enrollment: '📚',
      invitation: '📩',
      cohort_ending_soon: '⏰',
      cohort_ended_today: '📋',
      cohort_ended: '📋',
      cohort_credentials_overdue: '🚨',
      default: '🔔'
    };
    return icons[type] || icons.default;
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
            <h1 className="text-xl font-bold">Notifications</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Filter and Actions */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={filter === 'all' ? { backgroundColor: theme.primaryColor } : {}}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={filter === 'unread' ? { backgroundColor: theme.primaryColor } : {}}
            >
              Unread
            </button>
          </div>

          <button
            onClick={markAllAsRead}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Mark all as read
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-gray-500">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={`bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow ${
                  !notification.read_status ? 'border-l-4' : ''
                }`}
                style={!notification.read_status ? { borderColor: theme.primaryColor } : {}}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {notification.title_translated || notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message_translated || notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-gray-400">
                            {new Date(notification.created_date).toLocaleString()}
                          </p>
                          {notification.translated_to && notification.translated_to !== 'en' && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                              🌐 {notification.translated_to.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {!notification.read_status && (
                        <button
                          onClick={() => markAsRead(notification.notification_id)}
                          className="text-sm px-3 py-1 rounded-lg hover:opacity-80 transition-opacity text-white"
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;
