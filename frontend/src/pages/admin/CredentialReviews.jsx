import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { FileCheck, Search, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

const CredentialReviews = () => {
  const theme = useTheme();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadCredentials();
  }, [filter]);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/credential-submissions?status=${filter}&limit=50`);
      setCredentials(response.data.data?.submissions || []);
    } catch (error) {
      console.error('Failed to load credentials:', error);
      setCredentials([]);
    } finally {
      setLoading(false);
    }
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
                    <FileCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Credential Reviews</h1>
                    <p className="text-gray-600">Review and approve workforce credentials</p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="flex gap-2">
                  {['pending', 'approved', 'rejected', 'all'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                        filter === status
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Credentials List */}
              <div className="bg-white rounded-xl shadow-sm border">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: theme.primaryColor }}></div>
                  </div>
                ) : credentials.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No {filter} credentials found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {credentials.map((cred) => (
                      <div key={cred.submission_id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                              <FileCheck className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{cred.credential_name || 'Credential'}</p>
                              <p className="text-sm text-gray-500">{cred.user_email || 'Unknown user'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              cred.status === 'approved' ? 'bg-green-100 text-green-700' :
                              cred.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {cred.status}
                            </span>
                            <button className="p-2 hover:bg-gray-100 rounded-lg">
                              <Eye className="w-5 h-5 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CredentialReviews;
