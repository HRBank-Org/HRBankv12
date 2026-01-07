import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import {
  Shield,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  MapPin,
  User
} from 'lucide-react';

const AdminManagement = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [page, filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (filter) params.append('role', filter);
      
      const [adminsRes, rolesRes] = await Promise.all([
        api.get(`/api/super-admin/admins?${params}`),
        api.get('/api/super-admin/roles')
      ]);
      
      setAdmins(adminsRes.data.data.admins || []);
      setTotal(adminsRes.data.data.total || 0);
      setPages(adminsRes.data.data.pages || 1);
      setRoles(rolesRes.data.data.roles || []);
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      super_admin: 'bg-red-100 text-red-700',
      regional_manager: 'bg-blue-100 text-blue-700',
      account_activator: 'bg-green-100 text-green-700',
      credentials_reviewer: 'bg-purple-100 text-purple-700',
      customer_service: 'bg-yellow-100 text-yellow-700',
      compliance_officer: 'bg-orange-100 text-orange-700',
      franchise_manager: 'bg-pink-100 text-pink-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  if (loading && admins.length === 0) {
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
        <main className="flex-1 lg:ml-[260px] transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
                  <p className="text-gray-600">{total} admin users</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: theme.primaryColor }}
              >
                <Plus className="w-5 h-5" />
                Create Admin
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setFilter(''); setPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === '' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={filter === '' ? { backgroundColor: theme.primaryColor } : {}}
                >
                  All Roles
                </button>
                {roles.map(role => (
                  <button
                    key={role.role_type}
                    onClick={() => { setFilter(role.role_type); setPage(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === role.role_type ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={filter === role.role_type ? { backgroundColor: theme.primaryColor } : {}}
                  >
                    {role.display_name}
                  </button>
                ))}
              </div>
            </div>

            {/* Admins List */}
            <div className="bg-white rounded-xl shadow-sm border">
              {admins.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No admin users found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {admins.map(admin => (
                    <div key={admin.admin_id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{admin.full_name}</p>
                            <p className="text-sm text-gray-600">{admin.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(admin.role)}`}>
                                {admin.role?.replace('_', ' ')}
                              </span>
                              {admin.is_super_admin && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                  Super Admin
                                </span>
                              )}
                              {admin.assigned_provinces?.length > 0 && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  {admin.assigned_provinces.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingAdmin(admin)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Edit Role"
                          >
                            <Edit className="w-5 h-5" />
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
          </div>
        </main>
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <CreateAdminModal
          roles={roles}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
          theme={theme}
        />
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <EditAdminModal
          admin={editingAdmin}
          roles={roles}
          onClose={() => setEditingAdmin(null)}
          onSuccess={() => {
            setEditingAdmin(null);
            loadData();
          }}
          theme={theme}
        />
      )}
    </div>
  );
};

const CreateAdminModal = ({ roles, onClose, onSuccess, theme }) => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'customer_service',
    assigned_provinces: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const provinces = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!form.email || !form.password || !form.first_name || !form.last_name) {
      setError('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/api/super-admin/admins', form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create admin');
    } finally {
      setSaving(false);
    }
  };

  const toggleProvince = (prov) => {
    setForm(prev => ({
      ...prev,
      assigned_provinces: prev.assigned_provinces.includes(prov)
        ? prev.assigned_provinces.filter(p => p !== prov)
        : [...prev.assigned_provinces, prov]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Admin User</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({...form, first_name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({...form, last_name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({...form, role: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {roles.map(role => (
                <option key={role.role_type} value={role.role_type}>
                  {role.display_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Provinces</label>
            <div className="flex flex-wrap gap-2">
              {provinces.map(prov => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => toggleProvince(prov)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    form.assigned_provinces.includes(prov)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  style={form.assigned_provinces.includes(prov) ? { backgroundColor: theme.primaryColor } : {}}
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
            {saving ? 'Creating...' : 'Create Admin'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditAdminModal = ({ admin, roles, onClose, onSuccess, theme }) => {
  const [form, setForm] = useState({
    role: admin.role || '',
    assigned_provinces: admin.assigned_provinces || []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const provinces = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    setSaving(true);
    try {
      await api.put(`/api/super-admin/admins/${admin.admin_id}/role`, form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update admin');
    } finally {
      setSaving(false);
    }
  };

  const toggleProvince = (prov) => {
    setForm(prev => ({
      ...prev,
      assigned_provinces: prev.assigned_provinces.includes(prov)
        ? prev.assigned_provinces.filter(p => p !== prov)
        : [...prev.assigned_provinces, prov]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Edit Admin Role</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium">{admin.full_name}</p>
            <p className="text-sm text-gray-600">{admin.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({...form, role: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {roles.map(role => (
                <option key={role.role_type} value={role.role_type}>
                  {role.display_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Provinces</label>
            <div className="flex flex-wrap gap-2">
              {provinces.map(prov => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => toggleProvince(prov)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    form.assigned_provinces.includes(prov)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  style={form.assigned_provinces.includes(prov) ? { backgroundColor: theme.primaryColor } : {}}
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
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;
