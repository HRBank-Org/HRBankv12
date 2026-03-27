import React, { useState, useEffect } from 'react';
import { FiBell, FiMail, FiMessageSquare, FiSmartphone, FiRefreshCw } from 'react-icons/fi';
import api from '../../services/api';
import PushNotificationSettings from '../../components/common/PushNotificationSettings';
import WorkforceLayout from '../../components/layout/WorkforceLayout';

const NotificationSettings = () => {
  const [preferences, setPreferences] = useState(null);
  const [notificationTypes, setNotificationTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      // Load notification types
      const typesRes = await api.get('/api/notification-preferences/types');
      setNotificationTypes(typesRes.data.data.types);
      
      // Load user preferences
      const prefsRes = await api.get('/api/notification-preferences/');
      setPreferences(prefsRes.data.data);
      
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load notification settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (notificationType, channel) => {
    setPreferences(prev => ({
      ...prev,
      [notificationType]: {
        ...prev[notificationType],
        [channel]: !prev[notificationType][channel]
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/api/notification-preferences/', preferences);
      setMessage({ type: 'success', text: 'Notification preferences saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all notification preferences to defaults?')) return;
    
    try {
      setSaving(true);
      await api.post('/api/notification-preferences/reset');
      await loadPreferences();
      setMessage({ type: 'success', text: 'Preferences reset to defaults' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Failed to reset preferences:', error);
      setMessage({ type: 'error', text: 'Failed to reset preferences' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <WorkforceLayout title="Notification Settings">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </WorkforceLayout>
    );
  }

  // Group notification types by category
  const groupedTypes = {};
  Object.entries(notificationTypes).forEach(([key, value]) => {
    const category = value.category;
    if (!groupedTypes[category]) {
      groupedTypes[category] = [];
    }
    groupedTypes[category].push({ key, ...value });
  });

  return (
    <WorkforceLayout title="Notification Settings" subtitle="Manage how you receive notifications">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiBell className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
                <p className="text-gray-600 mt-1">Choose how you want to be notified</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="mb-6">
          <PushNotificationSettings />
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Notification Types */}
        <div className="space-y-6">
          {Object.entries(groupedTypes).map(([category, types]) => (
            <div key={category} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-blue-50 px-6 py-3 border-b border-blue-100">
                <h2 className="font-semibold text-blue-900">{category}</h2>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {types.map(type => (
                    <div key={type.key} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                      <div className="mb-3">
                        <h3 className="font-medium text-gray-900">{type.label}</h3>
                        <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-6 ml-4">
                        {/* Email Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences?.[type.key]?.email || false}
                            onChange={() => handleToggle(type.key, 'email')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <FiMail className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">Email</span>
                        </label>

                        {/* SMS Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences?.[type.key]?.sms || false}
                            onChange={() => handleToggle(type.key, 'sms')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <FiMessageSquare className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">SMS</span>
                        </label>

                        {/* Push Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences?.[type.key]?.push || false}
                            onChange={() => handleToggle(type.key, 'push')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <FiSmartphone className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">Push</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Changes will take effect immediately after saving
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </WorkforceLayout>
  );
};

export default NotificationSettings;
