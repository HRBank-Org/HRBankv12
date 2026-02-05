import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import { AlertTriangle, Search, Flag, Clock, CheckCircle, XCircle } from 'lucide-react';

const ReportedIssues = () => {
  const theme = useTheme();

  const issues = [
    { id: 1, title: 'Inappropriate behavior reported', reporter: 'employer@company.ca', reported: 'worker@email.com', status: 'open', priority: 'high', date: '2024-01-20' },
    { id: 2, title: 'No-show for scheduled shift', reporter: 'manager@restaurant.ca', reported: 'john.doe@email.com', status: 'investigating', priority: 'medium', date: '2024-01-19' },
    { id: 3, title: 'Payment dispute', reporter: 'jane.smith@email.com', reported: 'FastFood Inc.', status: 'resolved', priority: 'low', date: '2024-01-15' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reported Issues</h1>
                    <p className="text-gray-600">User reports and complaints</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100">
                      <Flag className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">8</p>
                      <p className="text-sm text-gray-600">Open Issues</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">3</p>
                      <p className="text-sm text-gray-600">Investigating</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">45</p>
                      <p className="text-sm text-gray-600">Resolved</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <XCircle className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">12</p>
                      <p className="text-sm text-gray-600">Dismissed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Issues List */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Issue</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Reporter</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Reported User</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Priority</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {issues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{issue.title}</p>
                          <p className="text-xs text-gray-500">{issue.date}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{issue.reporter}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{issue.reported}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            issue.priority === 'high' ? 'bg-red-100 text-red-700' :
                            issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {issue.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            issue.status === 'open' ? 'bg-red-100 text-red-700' :
                            issue.status === 'investigating' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {issue.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                            Review
                          </button>
                        </td>
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

export default ReportedIssues;
