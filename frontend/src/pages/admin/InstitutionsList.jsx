import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { GraduationCap, Search, MapPin, Mail, CheckCircle, Clock } from 'lucide-react';

const InstitutionsList = () => {
  const theme = useTheme();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/super-admin/pending-activations?user_type=institution&limit=100');
      setInstitutions(response.data.data.users || []);
    } catch (error) {
      console.error('Failed to load institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInstitutions = institutions.filter(inst =>
    inst.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.institution_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Institutions</h1>
                    <p className="text-gray-600">Manage educational institution accounts</p>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search institutions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Institutions Grid */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: theme.primaryColor }}></div>
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No institutions found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredInstitutions.map((inst) => (
                    <div key={inst.user_id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{inst.institution_name || inst.full_name || 'Institution'}</h3>
                          <p className="text-sm text-gray-500 truncate">{inst.email}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2 text-sm">
                        {inst.province && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{inst.province}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{inst.email}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          inst.profile_status === 'active' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {inst.profile_status}
                        </span>
                        <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default InstitutionsList;
