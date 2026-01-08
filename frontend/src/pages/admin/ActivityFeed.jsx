import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import { Activity, Clock } from 'lucide-react';

const ActivityFeed = () => {
  const theme = useTheme();

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
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
                    <p className="text-gray-600">Recent platform activity and events</p>
                  </div>
                </div>
              </div>

              {/* Activity List */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6">
                  <div className="space-y-4">
                    {[
                      { action: 'New user registration', user: 'john.doe@email.com', type: 'workforce', time: '5 minutes ago' },
                      { action: 'Account activated', user: 'jane.smith@company.ca', type: 'employer', time: '15 minutes ago' },
                      { action: 'Credential approved', user: 'mike.wilson@email.com', type: 'workforce', time: '1 hour ago' },
                      { action: 'Support ticket resolved', user: 'support@hrbank.ca', type: 'admin', time: '2 hours ago' },
                      { action: 'New zone created', user: 'qnizami@hrbank.ca', type: 'admin', time: '3 hours ago' },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="p-2 rounded-full bg-blue-100">
                          <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{activity.action}</p>
                          <p className="text-sm text-gray-600">{activity.user}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 bg-gray-200 rounded-full">{activity.type}</span>
                          <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
