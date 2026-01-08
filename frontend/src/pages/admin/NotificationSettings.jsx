import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import { Bell, Mail, MessageSquare, Smartphone, Globe, ToggleLeft, ToggleRight } from 'lucide-react';

const NotificationSettings = () => {
  const theme = useTheme();

  const notificationTypes = [
    {
      category: 'User Notifications',
      settings: [
        { key: 'new_registration', label: 'New User Registrations', description: 'Alert when new users sign up', enabled: true },
        { key: 'account_activation', label: 'Account Activations', description: 'Alert when accounts are activated', enabled: true },
        { key: 'credential_submission', label: 'Credential Submissions', description: 'Alert when credentials are submitted for review', enabled: false },
      ]
    },
    {
      category: 'Support Notifications',
      settings: [
        { key: 'new_ticket', label: 'New Support Tickets', description: 'Alert when support tickets are created', enabled: true },
        { key: 'ticket_escalation', label: 'Ticket Escalations', description: 'Alert when tickets are escalated', enabled: true },
        { key: 'ticket_resolved', label: 'Ticket Resolutions', description: 'Alert when tickets are resolved', enabled: false },
      ]
    },
    {
      category: 'System Notifications',
      settings: [
        { key: 'system_errors', label: 'System Errors', description: 'Critical system error alerts', enabled: true },
        { key: 'security_alerts', label: 'Security Alerts', description: 'Suspicious activity notifications', enabled: true },
        { key: 'maintenance', label: 'Maintenance Reminders', description: 'Scheduled maintenance notifications', enabled: true },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
                    <p className="text-gray-600">Configure admin notification preferences</p>
                  </div>
                </div>
              </div>

              {/* Delivery Methods */}
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h2 className="font-semibold text-gray-900 mb-4">Delivery Methods</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Email</span>
                    </div>
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">Push</span>
                    </div>
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                      <span className="font-medium">SMS</span>
                    </div>
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Notification Types */}
              <div className="space-y-6">
                {notificationTypes.map((category) => (
                  <div key={category.category} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b">
                      <h2 className="font-semibold text-gray-900">{category.category}</h2>
                    </div>
                    <div className="divide-y">
                      {category.settings.map((setting) => (
                        <div key={setting.key} className="px-6 py-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{setting.label}</p>
                            <p className="text-sm text-gray-500">{setting.description}</p>
                          </div>
                          {setting.enabled ? (
                            <ToggleRight className="w-10 h-10 text-green-500 cursor-pointer hover:text-green-600" />
                          ) : (
                            <ToggleLeft className="w-10 h-10 text-gray-400 cursor-pointer hover:text-gray-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button
                  className="px-6 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default NotificationSettings;
