import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import { FileText, Search, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const DocumentVerification = () => {
  const theme = useTheme();

  const documents = [
    { id: 1, type: 'Business License', company: 'Swan Pizza Inc.', status: 'verified', date: '2024-01-15' },
    { id: 2, type: 'WSIB Certificate', company: 'CleanGrid Services', status: 'pending', date: '2024-01-20' },
    { id: 3, type: 'Insurance Certificate', company: 'Tech Solutions Ltd.', status: 'expired', date: '2024-01-10' },
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
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Document Verification</h1>
                    <p className="text-gray-600">Verify employer compliance documents</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">12</p>
                      <p className="text-sm text-gray-600">Pending Review</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">156</p>
                      <p className="text-sm text-gray-600">Verified</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">5</p>
                      <p className="text-sm text-gray-600">Expired</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents Table */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Document</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Company</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Date</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <span className="font-medium">{doc.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{doc.company}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            doc.status === 'verified' ? 'bg-green-100 text-green-700' :
                            doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{doc.date}</td>
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

export default DocumentVerification;
