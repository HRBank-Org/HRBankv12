import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';

const ManageAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [zones, setZones] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [adminsRes, zonesRes] = await Promise.all([
        api.get('/api/admin/admins'),
        api.get('/api/admin/zones')
      ]);
      setAdmins(adminsRes.data.data.admins);
      setZones(zonesRes.data.data.zones);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adminId) => {
    if (!window.confirm('Are you sure you want to deactivate this admin?')) return;
    try {
      await api.delete(`/api/admin/admins/${adminId}`);
      await loadData();
    } catch (error) {
      alert('Failed to delete admin');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader 
        title="Manage Admins"
        onBackClick={() => navigate('/admin/dashboard')}
        showBack={true}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button onClick={() => setShowCreateModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg">+ Create Admin</button>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Email</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Zones</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Actions</th></tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.admin_id} className="border-t">
                  <td className="px-6 py-4">{admin.full_name}{admin.is_super_admin && <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">SUPER</span>}</td>
                  <td className="px-6 py-4">{admin.email}</td>
                  <td className="px-6 py-4">{admin.zone_details?.map(z => z.zone_code).join(', ') || 'All'}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs ${admin.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{admin.status}</span></td>
                  <td className="px-6 py-4">{!admin.is_super_admin && <button onClick={() => handleDelete(admin.admin_id)} className="text-red-600 hover:text-red-800">Deactivate</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showCreateModal && <CreateAdminModal zones={zones} onClose={() => setShowCreateModal(false)} onSuccess={() => { setShowCreateModal(false); loadData(); }} />}
    </div>
  );
};

const CreateAdminModal = ({ zones, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', phone: '', assigned_zones: [], is_super_admin: false });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/admin/admins', formData);
      onSuccess();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Create Admin</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Full Name *</label><input type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required /></div>
          <div><label className="block text-sm font-medium mb-1">Email *</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required /></div>
          <div><label className="block text-sm font-medium mb-1">Password *</label><input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required /></div>
          <div><label className="block text-sm font-medium mb-1">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Assign Zones (optional)</label><select multiple value={formData.assigned_zones} onChange={(e) => setFormData({...formData, assigned_zones: Array.from(e.target.selectedOptions, option => option.value)})} className="w-full px-3 py-2 border rounded-lg">{zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name} ({z.zone_code})</option>)}</select><p className="text-xs text-gray-500 mt-1">Leave empty for all zones</p></div>
          <div><label className="flex items-center gap-2"><input type="checkbox" checked={formData.is_super_admin} onChange={(e) => setFormData({...formData, is_super_admin: e.target.checked})} /><span className="text-sm">Super Admin (can manage other admins)</span></label></div>
          <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button><button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Creating...' : 'Create'}</button></div>
        </form>
      </div>
    </div>
  );
};

export default ManageAdmins;