import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import { Clock, Search, Filter, User, FileText, Settings, Shield } from 'lucide-react';

const AuditLogs = () => {
  const theme = useTheme();

  const logs = [
    { id: 1, action: 'User Activated', user: 'qnizami@hrbank.ca', target: 'john.doe@email.com', ip: '192.168.1.1', timestamp: '2024-01-20 14:32:15' },
    { id: 2, action: 'Zone Created', user: 'qnizami@hrbank.ca', target: 'ON-GTA', ip: '192.168.1.1', timestamp: '2024-01-20 14:28:00' },
    { id: 3, action: 'Admin Role Changed', user: 'qnizami@hrbank.ca', target: 'admin@hrbank.ca', ip: '192.168.1.1', timestamp: '2024-01-20 13:45:22' },
    { id: 4, action: 'Settings Updated', user: 'qnizami@hrbank.ca', target: 'platform_settings', ip: '192.168.1.1', timestamp: '2024-01-20 12:00:00' },
    { id: 5, action: 'Credential Approved', user: 'reviewer@hrbank.ca', target: 'worker@email.com', ip: '192.168.1.2', timestamp: '2024-01-20 11:30:45' },
  ];

  const getActionIcon = (action) => {
    if (action.includes('User')) return <User className="w-4 h-4" />;
    if (action.includes('Zone') || action.includes('Settings')) return <Settings className="w-4 h-4" />;
    if (action.includes('Credential')) return <FileText className="w-4 h-4" />;
    if (action.includes('Admin')) return <Shield className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

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
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                    <p className="text-gray-600">System activity and change history</p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select className="px-4 py-2 border rounded-lg bg-white">
                      <option>All Actions</option>
                      <option>User Actions</option>
                      <option>Admin Actions</option>
                      <option>System Changes</option>
                    </select>
                    <input type="date" className="px-4 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Logs Table */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Action</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Performed By</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Target</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">IP Address</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                              {getActionIcon(log.action)}
                            </div>
                            <span className="font-medium text-gray-900">{log.action}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{log.user}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{log.target}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">{log.ip}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{log.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuditLogs;
