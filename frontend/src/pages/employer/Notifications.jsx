import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';
import { FiBell, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

import { useLanguage } from '../../contexts/LanguageContext';

const Notifications = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/notifications/my-notifications');
      setNotifications(response.data.data.notifications || []);
      setUnreadCount(response.data.data.unread_count || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/notifications/notifications/${notificationId}/read`);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'shift':
        return <FiBell className="w-5 h-5 text-blue-500" />;
      case 'approval':
        return <FiCheckCircle className="w-5 h-5 text-green-500" />;
      case 'alert':
        return <FiAlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FiBell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader title="Notifications" />
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: theme.primaryColor }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FiBell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.notification_id}
                className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-all ${
                  !notif.read_status ? 'border-l-4' : ''
                }`}
                style={!notif.read_status ? { borderColor: theme.primaryColor } : {}}
                onClick={() => {
                  if (!notif.read_status) {
                    markAsRead(notif.notification_id);
                  }
                  if (notif.action_url) {
                    navigate(notif.action_url);
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notif.notification_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h3 className={`font-semibold ${
                        !notif.read_status ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {notif.title}
                      </h3>
                      {!notif.read_status && (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primaryColor }}></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notif.created_date).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notifications;