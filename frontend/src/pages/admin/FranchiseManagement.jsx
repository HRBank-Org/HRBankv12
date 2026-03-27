import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  Grid,
  Plus,
  Building2,
  MapPin,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Edit
} from 'lucide-react';

const FranchiseManagement = () => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [franchises, setFranchises] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFranchise, setSelectedFranchise] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadFranchises();
  }, [page]);

  const loadFranchises = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/super-admin/franchises?page=${page}&limit=20`);
      setFranchises(res.data.data.franchises || []);
      setTotal(res.data.data.total || 0);
      setPages(res.data.data.pages || 1);
    } catch (error) {
      console.error('Failed to load franchises:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (franchiseId) => {
    try {
      const res = await api.get(`/api/super-admin/franchises/${franchiseId}/analytics`);
      setAnalytics(res.data.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleViewFranchise = async (franchise) => {
    setSelectedFranchise(franchise);
    await loadAnalytics(franchise.franchise_id);
  };

  if (loading && franchises.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 p-6 lg:ml-[260px] pt-20 pt-20">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Franchise Management</h1>
                <p className="text-gray-600">{total} franchises registered</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Plus className="w-5 h-5" />
                Add Franchise
              </button>
            </div>

            {/* Franchises Grid */}
            {franchises.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <Grid className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Franchises Yet</h3>
                <p className="text-gray-600 mb-4">Create your first franchise to manage multi-location businesses</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Create Franchise
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {franchises.map(franchise => (
                  <div key={franchise.franchise_id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{franchise.franchise_name}</h3>
                        <p className="text-sm text-gray-600">{franchise.brand_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        franchise.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {franchise.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{franchise.total_locations || 0} locations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{franchise.provinces?.length || 0} provinces</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>{franchise.subscription_tier || 'Standard'} tier</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewFranchise(franchise)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600">Page {page} of {pages}</span>
                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Franchise Modal */}
      {showCreateModal && (
        <CreateFranchiseModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadFranchises();
          }}
          theme={theme}
        />
      )}

      {/* Franchise Detail Modal */}
      {selectedFranchise && (
        <FranchiseDetailModal
          franchise={selectedFranchise}
          analytics={analytics}
          onClose={() => { setSelectedFranchise(null); setAnalytics(null); }}
          theme={theme}
        />
      )}
    </div>
  );
};

const CreateFranchiseModal = ({ onClose, onSuccess, theme }) => {
  const [form, setForm] = useState({
    franchise_name: '',
    brand_name: '',
    parent_company: '',
    contact_email: '',
    contact_phone: '',
    headquarters_address: '',
    provinces: [],
    subscription_tier: 'standard'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const provinces = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!form.franchise_name || !form.brand_name || !form.contact_email) {
      setError('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/api/super-admin/franchises', form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create franchise');
    } finally {
      setSaving(false);
    }
  };

  const toggleProvince = (prov) => {
    setForm(prev => ({
      ...prev,
      provinces: prev.provinces.includes(prov)
        ? prev.provinces.filter(p => p !== prov)
        : [...prev.provinces, prov]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Franchise</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Franchise Name *</label>
            <input
              type="text"
              value={form.franchise_name}
              onChange={(e) => setForm({...form, franchise_name: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Tim Hortons Ontario"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
            <input
              type="text"
              value={form.brand_name}
              onChange={(e) => setForm({...form, brand_name: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Tim Hortons"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Company</label>
            <input
              type="text"
              value={form.parent_company}
              onChange={(e) => setForm({...form, parent_company: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Restaurant Brands International"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({...form, contact_email: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm({...form, contact_phone: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
            <select
              value={form.subscription_tier}
              onChange={(e) => setForm({...form, subscription_tier: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Operating Provinces</label>
            <div className="flex flex-wrap gap-2">
              {provinces.map(prov => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => toggleProvince(prov)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    form.provinces.includes(prov)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  style={form.provinces.includes(prov) ? { backgroundColor: theme.primaryColor } : {}}
                >
                  {prov}
                </button>
              ))}
            </div>
          </div>
        </form>
        
        <div className="flex gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {saving ? 'Creating...' : 'Create Franchise'}
          </button>
        </div>
      </div>
    </div>
  );
};

const FranchiseDetailModal = ({ franchise, analytics, onClose, theme }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">{franchise.franchise_name}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Brand</label>
            <p className="font-medium">{franchise.brand_name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Parent Company</label>
            <p className="font-medium">{franchise.parent_company || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Contact Email</label>
            <p className="font-medium">{franchise.contact_email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Subscription</label>
            <p className="font-medium capitalize">{franchise.subscription_tier}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">{t("pages.common.status")}</label>
            <p className="font-medium capitalize">{franchise.status}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Provinces</label>
            <p className="font-medium">{franchise.provinces?.join(', ') || 'None'}</p>
          </div>
        </div>

        {/* Analytics */}
        {analytics && (
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Analytics</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{analytics.analytics?.total_locations || 0}</p>
                <p className="text-sm text-gray-600">Locations</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{analytics.analytics?.total_workforce || 0}</p>
                <p className="text-sm text-gray-600">Workers</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{analytics.analytics?.total_shifts || 0}</p>
                <p className="text-sm text-gray-600">Total Shifts</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{analytics.analytics?.provinces_covered || 0}</p>
                <p className="text-sm text-gray-600">Provinces</p>
              </div>
            </div>
          </div>
        )}

        {/* Locations */}
        {franchise.locations?.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Locations ({franchise.locations.length})</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {franchise.locations.map((loc, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{loc.company_name}</p>
                    <p className="text-xs text-gray-500">{loc.city}, {loc.province}</p>
                  </div>
                </div>
              ))}
            </div>
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
      </div>
    </div>
  </div>
);

export default FranchiseManagement;
