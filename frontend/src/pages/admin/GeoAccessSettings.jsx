import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  Globe,
  Shield,
  Briefcase,
  Check,
  X,
  Search,
  Info,
  AlertTriangle,
  Loader2,
  Save
} from 'lucide-react';

const GeoAccessSettings = () => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [allCountries, setAllCountries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'employment'

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/geo-access/settings');
      if (res.data.success) {
        setSettings(res.data.data.settings);
        setAllCountries(res.data.data.all_countries || []);
      }
    } catch (error) {
      console.error('Failed to load geo settings:', error);
      alert(error.response?.data?.detail || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleCountry = async (countryCode, accessType) => {
    const currentList = accessType === 'admin' 
      ? settings.admin_countries 
      : settings.employment_countries;
    
    const isEnabled = currentList.includes(countryCode);
    
    // Prevent disabling Canada
    if (countryCode === 'CA' && isEnabled) {
      alert('Canada cannot be disabled');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/api/admin/geo-access/toggle-country', {
        country_code: countryCode,
        access_type: accessType,
        enabled: !isEnabled
      });
      
      if (res.data.success) {
        setSettings(res.data.data.settings);
      }
    } catch (error) {
      console.error('Failed to toggle country:', error);
      alert(error.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const filteredCountries = allCountries.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCountries = settings?.admin_countries || [];
  const employmentCountries = settings?.employment_countries || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="p-6">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Geo-Access Control</h1>
                    <p className="text-gray-600">Manage which countries can access platform features</p>
                  </div>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Access Control Rules:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li><strong>Admin Access:</strong> Countries where admin users can log in and manage the platform</li>
                      <li><strong>Employment Access:</strong> Countries where Employer/Workforce accounts can be created (for labor law compliance)</li>
                      <li><strong>WorkPassport & Institutions:</strong> Available worldwide (blockchain credentials)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-3">Loading settings...</p>
                </div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100">
                          <Shield className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{adminCountries.length}</p>
                          <p className="text-sm text-gray-600">Countries with Admin Access</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100">
                          <Briefcase className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{employmentCountries.length}</p>
                          <p className="text-sm text-gray-600">Countries with Employment Access</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="flex border-b">
                      <button
                        onClick={() => setActiveTab('admin')}
                        className={`flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                          activeTab === 'admin'
                            ? 'border-purple-500 text-purple-600 bg-purple-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        Admin Access ({adminCountries.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('employment')}
                        className={`flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                          activeTab === 'employment'
                            ? 'border-green-500 text-green-600 bg-green-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Briefcase className="w-4 h-4" />
                        Employment Access ({employmentCountries.length})
                      </button>
                    </div>

                    {/* Search */}
                    <div className="p-4 border-b bg-gray-50">
                      <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Country List */}
                    <div className="divide-y max-h-[500px] overflow-y-auto">
                      {filteredCountries.map((country) => {
                        const isAdminEnabled = adminCountries.includes(country.code);
                        const isEmploymentEnabled = employmentCountries.includes(country.code);
                        const isEnabled = activeTab === 'admin' ? isAdminEnabled : isEmploymentEnabled;
                        const isCanada = country.code === 'CA';

                        return (
                          <div
                            key={country.code}
                            className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors ${
                              isEnabled ? 'bg-green-50/50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-2xl">{country.flag}</span>
                              <div>
                                <p className="font-medium text-gray-900">{country.name}</p>
                                <p className="text-sm text-gray-500">{country.code}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Status badges */}
                              <div className="flex items-center gap-2">
                                {isAdminEnabled && (
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    Admin
                                  </span>
                                )}
                                {isEmploymentEnabled && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" />
                                    Employment
                                  </span>
                                )}
                              </div>

                              {/* Toggle */}
                              <button
                                onClick={() => toggleCountry(country.code, activeTab)}
                                disabled={saving || isCanada}
                                className={`relative w-14 h-7 rounded-full transition-colors ${
                                  isEnabled 
                                    ? activeTab === 'admin' ? 'bg-purple-500' : 'bg-green-500'
                                    : 'bg-gray-300'
                                } ${isCanada ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={isCanada ? 'Canada cannot be disabled' : `Toggle ${activeTab} access`}
                              >
                                <span
                                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    isEnabled ? 'translate-x-8' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Afghanistan Team Note */}
                  {adminCountries.includes('AF') && (
                    <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-800">
                          <p className="font-medium">Afghanistan Admin Access Enabled</p>
                          <p className="text-green-700 mt-1">
                            Your Afghanistan team can access the admin panel. They can manage compliance, 
                            verification, and customer service functions.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default GeoAccessSettings;
