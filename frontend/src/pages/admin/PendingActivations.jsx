import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import {
  UserCheck,
  UserX,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  GraduationCap,
  MapPin,
  Calendar,
  Check,
  X,
  Eye,
  ChevronDown
} from 'lucide-react';

// Canadian provinces
const PROVINCES = [
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'QC', name: 'Quebec' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'YT', name: 'Yukon' },
  { code: 'NU', name: 'Nunavut' }
];

const PendingActivations = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [activating, setActivating] = useState(null);
  
  // Location filters
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  
  // Stats by location
  const [locationStats, setLocationStats] = useState({});

  useEffect(() => {
    loadUsers();
  }, [page, filter, selectedProvince, selectedCity]);

  useEffect(() => {
    loadLocationStats();
  }, []);

  const loadLocationStats = async () => {
    try {
      const res = await api.get('/api/super-admin/pending-activations?limit=500');
      const allUsers = res.data.data.pending_users || [];
      
      // Calculate stats by province and city
      const stats = {};
      allUsers.forEach(user => {
        const province = user.province || 'Unknown';
        const city = user.city || 'Unknown';
        
        if (!stats[province]) {
          stats[province] = { total: 0, cities: {} };
        }
        stats[province].total++;
        
        if (!stats[province].cities[city]) {
          stats[province].cities[city] = 0;
        }
        stats[province].cities[city]++;
      });
      
      setLocationStats(stats);
    } catch (error) {
      console.error('Failed to load location stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (filter !== 'all') params.append('user_type', filter);
      if (selectedProvince) params.append('province', selectedProvince);
      if (selectedCity) params.append('city', selectedCity);
      
      const res = await api.get(`/api/super-admin/pending-activations?${params}`);
      setUsers(res.data.data.pending_users || []);
      setTotal(res.data.data.total || 0);
      setPages(res.data.data.pages || 1);
    } catch (error) {
      console.error('Failed to load pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceChange = (province) => {
    setSelectedProvince(province);
    setSelectedCity('');
    setPage(1);
    
    // Update available cities for selected province
    if (province && locationStats[province]) {
      setAvailableCities(Object.keys(locationStats[province].cities).sort());
    } else {
      setAvailableCities([]);
    }
  };

  const handleActivate = async (userId) => {
    if (!window.confirm('Are you sure you want to activate this user?')) return;
    
    setActivating(userId);
    try {
      await api.post(`/api/super-admin/activate-user/${userId}`);
      loadUsers();
      loadLocationStats();
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to activate user:', error);
      alert(error.response?.data?.detail || 'Failed to activate user');
    } finally {
      setActivating(null);
    }
  };

  const getUserTypeIcon = (type) => {
    switch (type) {
      case 'workforce': return <User className="w-4 h-4" />;
      case 'employer': return <Building2 className="w-4 h-4" />;
      case 'institution': return <GraduationCap className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getUserTypeColor = (type) => {
    switch (type) {
      case 'workforce': return 'bg-blue-100 text-blue-700';
      case 'employer': return 'bg-green-100 text-green-700';
      case 'institution': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredUsers = users.filter(user => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.profile?.company_name?.toLowerCase().includes(searchLower) ||
      user.profile?.institution_name?.toLowerCase().includes(searchLower) ||
      user.city?.toLowerCase().includes(searchLower)
    );
  });

  // Get sorted provinces with counts
  const sortedProvinces = Object.entries(locationStats)
    .filter(([key]) => key !== 'Unknown')
    .sort((a, b) => b[1].total - a[1].total);

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pending Activations</h1>
                <p className="text-gray-600">{total} users waiting for activation</p>
              </div>
              <button
                onClick={() => setShowLocationFilter(!showLocationFilter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  showLocationFilter || selectedProvince ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Location Filter
                {selectedProvince && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{selectedProvince}</span>}
                <ChevronDown className={`w-4 h-4 transition-transform ${showLocationFilter ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Location Filter Panel */}
            {showLocationFilter && (
              <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Filter by Location
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Province Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <button
                        onClick={() => handleProvinceChange('')}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          !selectedProvince ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-medium">All Provinces</span>
                        <span className="text-sm text-gray-500">{Object.values(locationStats).reduce((sum, p) => sum + p.total, 0)}</span>
                      </button>
                      {sortedProvinces.map(([province, data]) => (
                        <button
                          key={province}
                          onClick={() => handleProvinceChange(province)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            selectedProvince === province ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-medium">{province}</span>
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                            {data.total}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* City Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City {selectedProvince && `in ${selectedProvince}`}
                    </label>
                    {selectedProvince ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <button
                          onClick={() => setSelectedCity('')}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            !selectedCity ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-medium">All Cities in {selectedProvince}</span>
                          <span className="text-sm text-gray-500">{locationStats[selectedProvince]?.total || 0}</span>
                        </button>
                        {availableCities.map(city => (
                          <button
                            key={city}
                            onClick={() => { setSelectedCity(city); setPage(1); }}
                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              selectedCity === city ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <span className="font-medium">{city}</span>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                              {locationStats[selectedProvince]?.cities[city] || 0}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 text-gray-400 border border-dashed rounded-lg">
                        Select a province to see cities
                      </div>
                    )}
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedProvince || selectedCity) && (
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <button
                      onClick={() => { handleProvinceChange(''); }}
                      className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Clear Location Filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Search and Type Filters */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, company, or city..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex gap-2">
                  {['all', 'workforce', 'employer', 'institution'].map(f => (
                    <button
                      key={f}
                      onClick={() => { setFilter(f); setPage(1); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        filter === f
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={filter === f ? { backgroundColor: theme.primaryColor } : {}}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(selectedProvince || selectedCity) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-blue-700 font-medium">Filtering:</span>
                {selectedProvince && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedProvince}
                    {!selectedCity && (
                      <button onClick={() => handleProvinceChange('')} className="ml-1 hover:text-blue-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                )}
                {selectedCity && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1">
                    {selectedCity}
                    <button onClick={() => setSelectedCity('')} className="ml-1 hover:text-green-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Users List */}
            <div className="bg-white rounded-xl shadow-sm border">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No pending activations found</p>
                  {(selectedProvince || selectedCity) && (
                    <button
                      onClick={() => handleProvinceChange('')}
                      className="mt-2 text-blue-600 hover:underline"
                    >
                      Clear location filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map(user => (
                    <div key={user.user_id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            {getUserTypeIcon(user.user_type)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.full_name || user.profile?.company_name || user.profile?.institution_name || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getUserTypeColor(user.user_type)}`}>
                                {user.user_type}
                              </span>
                              {(user.city || user.province) && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  {[user.city, user.province].filter(Boolean).join(', ')}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                {new Date(user.created_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleActivate(user.user_id)}
                            disabled={activating === user.user_id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                          >
                            {activating === user.user_id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Activate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-600">
                    Page {page} of {pages} ({total} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(pages, p + 1))}
                      disabled={page === pages}
                      className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onActivate={handleActivate}
          activating={activating}
          theme={theme}
        />
      )}
    </div>
  );
};

const UserDetailModal = ({ user, onClose, onActivate, activating, theme }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">User Details</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Email</label>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">User Type</label>
            <p className="font-medium capitalize">{user.user_type}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Name</label>
            <p className="font-medium">{user.full_name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Status</label>
            <p className="font-medium capitalize">{user.profile_status}</p>
          </div>
          {(user.city || user.province) && (
            <>
              <div>
                <label className="text-sm text-gray-500">City</label>
                <p className="font-medium">{user.city || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Province</label>
                <p className="font-medium">{user.province || 'N/A'}</p>
              </div>
            </>
          )}
          <div>
            <label className="text-sm text-gray-500">Registered</label>
            <p className="font-medium">{new Date(user.created_date).toLocaleString()}</p>
          </div>
        </div>

        {user.profile && (
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-2">Profile Information</h3>
            <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
              {JSON.stringify(user.profile, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="flex gap-3 p-4 border-t">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Close
        </button>
        <button
          onClick={() => onActivate(user.user_id)}
          disabled={activating === user.user_id}
          className="flex-1 px-4 py-2 rounded-lg text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {activating === user.user_id ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              Activate User
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

export default PendingActivations;
