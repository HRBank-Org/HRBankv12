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
      {/* UserHeader Component */}
      <UserHeader 
        title={
          <div className="flex items-center gap-3">
            <span>HR Bank Admin Dashboard</span>
            {adminProfile?.is_super_admin && (
              <span className="px-3 py-1 bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full">
                SUPER ADMIN
              </span>
            )}
          </div>
        }
        showBack={false}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {(() => {
              const hour = new Date().getHours();
              if (hour < 12) return 'Good morning';
              if (hour < 18) return 'Good afternoon';
              return 'Good evening';
            })()}, {adminProfile?.full_name || 'Admin'}! 👋
          </h1>
          <p className="text-gray-600 mt-1">Welcome to your HR Bank Admin Dashboard</p>
        </div>

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
            onClick={() => navigate('/admin/manage-occupations')}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="text-3xl mb-2">💼</div>
            <h3 className="font-semibold text-gray-900 mb-1">Occupation Templates</h3>
            <p className="text-sm text-gray-600">Manage occupation categories and titles</p>
          </button>

          <button
            onClick={() => navigate('/admin/manage-certifications')}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="text-3xl mb-2">🎓</div>
            <h3 className="font-semibold text-gray-900 mb-1">Standard Certifications</h3>
            <p className="text-sm text-gray-600">Manage government-approved certifications</p>
          </button>

          <button
            onClick={() => navigate('/admin/manage-credentials')}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="text-3xl mb-2">📋</div>
            <h3 className="font-semibold text-gray-900 mb-1">Unassigned Credentials</h3>
            <p className="text-sm text-gray-600">Assign credentials to institutions</p>
          </button>

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
