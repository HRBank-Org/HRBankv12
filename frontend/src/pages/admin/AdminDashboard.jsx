import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';

const AdminDashboard = () => {
  const [adminProfile, setAdminProfile] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user?.user_type !== 'admin') {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const profileRes = await api.get('/api/admin/my-profile');
      setAdminProfile(profileRes.data.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white px-4 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">HR Bank Admin Dashboard</h1>
            {adminProfile?.is_super_admin && (
              <span className="px-3 py-1 bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full">
                SUPER ADMIN
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">{user?.full_name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Admin Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Your Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{adminProfile?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="font-medium capitalize">{adminProfile?.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Assigned Zones</p>
              <p className="font-medium">
                {adminProfile?.zone_details?.length > 0
                  ? adminProfile.zone_details.map(z => z.zone_name).join(', ')
                  : 'All Zones'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Provinces</p>
              <p className="font-medium">
                {adminProfile?.assigned_provinces?.length > 0
                  ? adminProfile.assigned_provinces.join(', ')
                  : 'All Provinces'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/document-review')}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="text-3xl mb-2">📄</div>
            <h3 className="font-semibold text-gray-900 mb-1">Document Review</h3>
            <p className="text-sm text-gray-600">Review and approve user documents</p>
          </button>

          {adminProfile?.is_super_admin && (
            <>
              <button
                onClick={() => navigate('/admin/manage-admins')}
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="text-3xl mb-2">👥</div>
                <h3 className="font-semibold text-gray-900 mb-1">Manage Admins</h3>
                <p className="text-sm text-gray-600">Create and manage admin accounts</p>
              </button>

              <button
                onClick={() => navigate('/admin/manage-zones')}
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="text-3xl mb-2">🗺️</div>
                <h3 className="font-semibold text-gray-900 mb-1">Manage Zones</h3>
                <p className="text-sm text-gray-600">Configure geographic zones</p>
              </button>
            </>
          )}

          <button
            onClick={() => navigate('/admin/analytics')}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900 mb-1">Analytics</h3>
            <p className="text-sm text-gray-600">View platform statistics</p>
          </button>
        </div>

        {/* Permissions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Your Permissions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <span className={adminProfile?.can_approve_documents ? 'text-green-600' : 'text-gray-400'}>
                {adminProfile?.can_approve_documents ? '✓' : '✗'}
              </span>
              <span className="text-sm">Approve Documents</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={adminProfile?.can_manage_users ? 'text-green-600' : 'text-gray-400'}>
                {adminProfile?.can_manage_users ? '✓' : '✗'}
              </span>
              <span className="text-sm">Manage Users</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={adminProfile?.can_manage_admins ? 'text-green-600' : 'text-gray-400'}>
                {adminProfile?.can_manage_admins ? '✓' : '✗'}
              </span>
              <span className="text-sm">Manage Admins</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={adminProfile?.can_view_analytics ? 'text-green-600' : 'text-gray-400'}>
                {adminProfile?.can_view_analytics ? '✓' : '✗'}
              </span>
              <span className="text-sm">View Analytics</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
