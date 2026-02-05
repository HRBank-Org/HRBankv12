import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import {
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  ChevronRight,
  ChevronDown,
  Users,
  Building2,
  Map,
  Globe,
  Filter
} from 'lucide-react';

const PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' }
];

const ZoneManagement = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [provinces, setProvinces] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [expandedProvinces, setExpandedProvinces] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProvince) {
      loadZones(selectedProvince);
    }
  }, [selectedProvince]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [provincesRes, zonesRes] = await Promise.all([
        api.get('/api/super-admin/provinces'),
        api.get('/api/super-admin/zones?limit=100')
      ]);
      
      setProvinces(provincesRes.data.data.provinces || []);
      setZones(zonesRes.data.data.zones || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async (provinceCode) => {
    try {
      const response = await api.get(`/api/super-admin/zones?province=${provinceCode}&limit=100`);
      setZones(response.data.data.zones || []);
    } catch (error) {
      console.error('Failed to load zones:', error);
    }
  };

  const toggleProvince = (code) => {
    setExpandedProvinces(prev => 
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    );
    setSelectedProvince(code);
  };

  const getProvinceColor = (code) => {
    const colors = {
      ON: 'bg-blue-500',
      BC: 'bg-green-500',
      AB: 'bg-red-500',
      QC: 'bg-purple-500',
      MB: 'bg-yellow-500',
      SK: 'bg-orange-500',
      NS: 'bg-teal-500',
      NB: 'bg-pink-500',
      NL: 'bg-indigo-500',
      PE: 'bg-rose-500',
      NT: 'bg-cyan-500',
      YT: 'bg-emerald-500',
      NU: 'bg-violet-500'
    };
    return colors[code] || 'bg-gray-500';
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;
    
    try {
      await api.delete(`/api/super-admin/zones/${zoneId}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete zone:', error);
    }
  };

  const filteredProvinces = provinces.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const zonesForProvince = (provinceCode) => {
    return zones.filter(z => z.province === provinceCode);
  };

  if (loading) {
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
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">Zones & Regions</h1>
                      <p className="text-gray-600">Manage geographic zones across Canada</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <Plus className="w-5 h-5" />
                    Create Zone
                  </button>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">13</p>
                      <p className="text-sm text-gray-600">Provinces/Territories</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <Map className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{zones.length}</p>
                      <p className="text-sm text-gray-600">Total Zones</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {provinces.reduce((sum, p) => sum + p.workforce_count, 0)}
                      </p>
                      <p className="text-sm text-gray-600">Total Workforce</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Building2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {provinces.reduce((sum, p) => sum + p.employer_count, 0)}
                      </p>
                      <p className="text-sm text-gray-600">Total Employers</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search provinces..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Provinces & Zones Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredProvinces.map((province) => {
                  const isExpanded = expandedProvinces.includes(province.code);
                  const provinceZones = zonesForProvince(province.code);
                  
                  return (
                    <div
                      key={province.code}
                      className="bg-white rounded-xl border shadow-sm overflow-hidden"
                    >
                      {/* Province Header */}
                      <button
                        onClick={() => toggleProvince(province.code)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${getProvinceColor(province.code)} flex items-center justify-center text-white font-bold`}>
                            {province.code}
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-gray-900">{province.name}</h3>
                            <p className="text-sm text-gray-500">
                              {province.workforce_count} workforce • {province.employer_count} employers
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">
                            {provinceZones.length} zone{provinceZones.length !== 1 ? 's' : ''}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Zones List */}
                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-4">
                          {provinceZones.length === 0 ? (
                            <div className="text-center py-6 text-gray-500">
                              <Map className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">No zones defined</p>
                              <button
                                onClick={() => {
                                  setSelectedProvince(province.code);
                                  setShowCreateModal(true);
                                }}
                                className="mt-2 text-sm text-orange-600 hover:text-orange-700"
                              >
                                + Add first zone
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {provinceZones.map((zone) => (
                                <div
                                  key={zone.zone_id}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900">{zone.zone_name}</p>
                                    <p className="text-xs text-gray-500">
                                      Code: {zone.zone_code} • {zone.cities?.length || 0} cities
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setEditingZone(zone)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteZone(zone.zone_id)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  setSelectedProvince(province.code);
                                  setShowCreateModal(true);
                                }}
                                className="w-full p-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg border border-dashed border-orange-300 transition-colors"
                              >
                                + Add Zone
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Create Zone Modal */}
      {showCreateModal && (
        <ZoneModal
          province={selectedProvince}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedProvince(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
          theme={theme}
        />
      )}

      {/* Edit Zone Modal */}
      {editingZone && (
        <ZoneModal
          zone={editingZone}
          province={editingZone.province}
          onClose={() => setEditingZone(null)}
          onSuccess={() => {
            setEditingZone(null);
            loadData();
          }}
          theme={theme}
        />
      )}
    </div>
  );
};

const ZoneModal = ({ zone, province, onClose, onSuccess, theme }) => {
  const [form, setForm] = useState({
    zone_name: zone?.zone_name || '',
    zone_code: zone?.zone_code || '',
    province: zone?.province || province || 'ON',
    cities: zone?.cities?.join(', ') || '',
    postal_code_prefixes: zone?.postal_code_prefixes?.join(', ') || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!form.zone_name || !form.zone_code || !form.province) {
      setError('Zone name, code, and province are required');
      return;
    }
    
    setSaving(true);
    try {
      const data = {
        zone_name: form.zone_name,
        zone_code: form.zone_code,
        province: form.province,
        cities: form.cities.split(',').map(c => c.trim()).filter(Boolean),
        postal_code_prefixes: form.postal_code_prefixes.split(',').map(p => p.trim()).filter(Boolean)
      };
      
      if (zone) {
        await api.put(`/api/super-admin/zones/${zone.zone_id}`, data);
      } else {
        await api.post('/api/super-admin/zones', data);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save zone');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{zone ? 'Edit Zone' : 'Create Zone'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
            <select
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={!!zone}
            >
              {PROVINCES.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name *</label>
            <input
              type="text"
              value={form.zone_name}
              onChange={(e) => setForm({ ...form, zone_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Greater Toronto Area"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone Code *</label>
            <input
              type="text"
              value={form.zone_code}
              onChange={(e) => setForm({ ...form, zone_code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., ON-GTA"
              disabled={!!zone}
            />
            <p className="text-xs text-gray-500 mt-1">Unique identifier for this zone</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cities</label>
            <input
              type="text"
              value={form.cities}
              onChange={(e) => setForm({ ...form, cities: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Toronto, Mississauga, Brampton"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated list of cities in this zone</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code Prefixes</label>
            <input
              type="text"
              value={form.postal_code_prefixes}
              onChange={(e) => setForm({ ...form, postal_code_prefixes: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="M, L, K"
            />
            <p className="text-xs text-gray-500 mt-1">Postal codes starting with these letters belong to this zone</p>
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
            {saving ? 'Saving...' : zone ? 'Update Zone' : 'Create Zone'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZoneManagement;
