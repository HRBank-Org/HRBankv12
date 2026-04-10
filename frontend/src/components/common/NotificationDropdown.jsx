import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiExternalLink, FiArrowRight } from 'react-icons/fi';
import api from '../../utils/api';

const NotificationDropdown = ({ variant = 'dark' }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const isDark = variant === 'dark';

  useEffect(() => {
    loadUnreadCount();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const res = await api.get('/api/notifications/my-notifications?unread_only=true&limit=1');
      setUnreadCount(res.data.data?.unread_count || 0);
    } catch { /* silent */ }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/notifications/my-notifications?limit=5');
      setNotifications(res.data.data?.notifications || []);
      setUnreadCount(res.data.data?.unread_count || 0);
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleToggle = () => {
    if (!open) loadNotifications();
    setOpen(!open);
  };

  const markAsRead = async (notifId) => {
    try {
      await api.put(`/api/notifications/${notifId}/read`);
      setNotifications(prev => prev.map(n =>
        n.notification_id === notifId ? { ...n, read_status: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const getIcon = (type) => {
    const icons = {
      credential_received: '\u{1F393}',
      enrollment: '\u{1F4DA}',
      invitation: '\u{1F4E9}',
      cohort_ending_7days: '\u23F0',
      cohort_ending_3days: '\u23F0',
      cohort_ended_today: '\u{1F4CB}',
      cohort_credentials_overdue: '\u{1F6A8}',
      shift_assigned: '\u2705',
      job_offer: '\u{1F4BC}',
      payment: '\u{1F4B0}'
    };
    return icons[type] || '\u{1F514}';
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const basePath = window.location.pathname.startsWith('/workpassport') ? '/workpassport' : '/workforce';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        data-testid="notification-bell-btn"
        className={`relative p-2 rounded-lg transition-colors ${
          isDark
            ? 'hover:bg-white hover:bg-opacity-10'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
      >
        <FiBell size={20} className={isDark ? 'text-white' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notification_id}
                  data-testid={`notification-item-${n.notification_id}`}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !n.read_status ? 'bg-blue-50/40' : ''
                  }`}
                  onClick={() => {
                    if (!n.read_status) markAsRead(n.notification_id);
                    if (n.action_url) {
                      navigate(n.action_url);
                      setOpen(false);
                    }
                  }}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">{getIcon(n.notification_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!n.read_status ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_date)}</p>
                  </div>
                  {!n.read_status && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <button
            onClick={() => { navigate(`${basePath}/notifications`); setOpen(false); }}
            data-testid="view-all-notifications-btn"
            className="w-full px-4 py-3 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1"
          >
            View all notifications
            <FiArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
