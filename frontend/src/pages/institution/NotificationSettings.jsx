import React, { useState, useEffect } from 'react';
import { Bell, Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import PushNotificationSettings from '../../components/common/PushNotificationSettings';
import InstitutionLayout from '../../components/layout/InstitutionLayout';

import { useLanguage } from '../../contexts/LanguageContext';

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [preferences, setPreferences] = useState({
    credential_issued: { email: true, push: true },
    credential_revoked: { email: true, push: true },
    verification_request: { email: true, push: true },
    payment_received: { email: true, push: false },
    new_student_enrollment: { email: false, push: true },
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleToggle = (key, channel) => {
    setPreferences(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [channel]: !prev[key][channel]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/notification-preferences/', preferences);
      setMessage({ type: 'success', text: 'Preferences saved!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const notificationTypes = [
    { key: 'credential_issued', label: 'Credential Issued', description: 'When a credential is issued to a student' },
    { key: 'credential_revoked', label: 'Credential Revoked', description: 'When a credential is revoked' },
    { key: 'verification_request', label: 'Verification Requests', description: 'When an employer requests verification' },
    { key: 'payment_received', label: 'Payment Received', description: 'When payment is received for credentials' },
    { key: 'new_student_enrollment', label: 'New Enrollments', description: 'When a student enrolls in a class' },
  ];

  return (
    <InstitutionLayout title={t("pages.institution.notificationSettings.title", "Notification Settings")}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
              <p className="text-gray-600">Manage how you receive notifications</p>
            </div>
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

        {/* Email & Push Preferences */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Notification Preferences</h2>
          
          <div className="space-y-4">
            {notificationTypes.map((type) => (
              <div key={type.key} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{type.label}</p>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences[type.key]?.email || false}
                      onChange={() => handleToggle(type.key, 'email')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{t("pages.common.email")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences[type.key]?.push || false}
                      onChange={() => handleToggle(type.key, 'push')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Bell className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Push</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </InstitutionLayout>
  );
};

export default NotificationSettings;
