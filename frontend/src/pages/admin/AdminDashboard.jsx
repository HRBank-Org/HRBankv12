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
    if (user?.user_type !== 'admin' && user?.user_type !== 'super_admin') {
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/minimum-wage')}
            className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-green-500 text-left"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚖️</span>
              </div>
              {adminProfile?.is_super_admin && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                  SUPER ADMIN
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Minimum Wage Management</h3>
            <p className="text-sm text-gray-600">Update provincial minimum wage rates</p>
          </button>

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
            onClick={() => navigate('/admin/occupation-certifications')}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="text-3xl mb-2">🔗</div>
            <h3 className="font-semibold text-gray-900 mb-1">Link Certifications</h3>
            <p className="text-sm text-gray-600">Connect occupations to required certifications</p>
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
      </main>
    </div>
  );
};

export default AdminDashboard;
