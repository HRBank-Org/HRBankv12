import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import {
  Users,
  UserCheck,
  Award,
  MessageSquare,
  Building2,
  Shield,
  TrendingUp,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

const SuperAdminDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashboardRes, rolesRes] = await Promise.all([
        api.get('/api/super-admin/dashboard'),
        api.get('/api/super-admin/roles')
      ]);
      setDashboard(dashboardRes.data.data);
      setRoles(rolesRes.data.data.roles || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  const actionItems = dashboard?.action_items || {};
  const platformStats = dashboard?.platform_stats || {};
  const adminInfo = dashboard?.admin || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-gray-600">
                Welcome back! You are logged in as{' '}
                <span className="font-medium capitalize">{adminInfo.role?.replace('_', ' ')}</span>
                {adminInfo.is_super_admin && <span className="ml-2 text-orange-600">(Super Admin)</span>}
              </p>
            </div>

            {/* Action Items */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <ActionCard
                icon={<UserCheck className="w-6 h-6" />}
                label="Pending Activations"
                value={actionItems.pending_activations || 0}
                color="#F59E0B"
                onClick={() => navigate('/admin/pending-activations')}
                urgent={actionItems.pending_activations > 10}
              />
              <ActionCard
                icon={<Award className="w-6 h-6" />}
                label="Pending Credentials"
                value={actionItems.pending_credentials || 0}
                color="#8B5CF6"
                onClick={() => navigate('/admin/credentials')}
                urgent={actionItems.pending_credentials > 5}
              />
              <ActionCard
                icon={<MessageSquare className="w-6 h-6" />}
                label="Open Tickets"
                value={actionItems.open_tickets || 0}
                color="#EF4444"
                onClick={() => navigate('/admin/support-tickets')}
                urgent={actionItems.open_tickets > 10}
              />
            </div>

            {/* Platform Stats */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatItem
                  icon={<Users className="w-5 h-5" />}
                  label="Workforce"
                  value={platformStats.total_workforce || 0}
                />
                <StatItem
                  icon={<Building2 className="w-5 h-5" />}
                  label="Employers"
                  value={platformStats.total_employers || 0}
                />
                <StatItem
                  icon={<Award className="w-5 h-5" />}
                  label="Institutions"
                  value={platformStats.total_institutions || 0}
                />
                <StatItem
                  icon={<Shield className="w-5 h-5" />}
                  label="Admins"
                  value={platformStats.total_admins || 0}
                />
                <StatItem
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="Franchises"
                  value={platformStats.total_franchises || 0}
                />
              </div>
            </div>

            {/* Quick Actions & Roles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <QuickAction
                    label="Review Pending Activations"
                    description={`${actionItems.pending_activations || 0} users waiting`}
                    onClick={() => navigate('/admin/pending-activations')}
                    theme={theme}
                  />
                  <QuickAction
                    label="Manage Admin Users"
                    description="Create and assign roles"
                    onClick={() => navigate('/admin/admins')}
                    theme={theme}
                  />
                  <QuickAction
                    label="View Franchise Analytics"
                    description="Multi-location insights"
                    onClick={() => navigate('/admin/franchises')}
                    theme={theme}
                  />
                  <QuickAction
                    label="Handle Support Tickets"
                    description={`${actionItems.open_tickets || 0} open tickets`}
                    onClick={() => navigate('/admin/support-tickets')}
                    theme={theme}
                  />
                </div>
              </div>

              {/* Available Roles */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Roles</h2>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {roles.map((role, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{role.display_name}</span>
                        <Shield className="w-4 h-4 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Regional Coverage (if applicable) */}
            {adminInfo.assigned_provinces?.length > 0 && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Regional Assignment</span>
                </div>
                <p className="text-blue-600 mt-1">
                  You are assigned to: {adminInfo.assigned_provinces.join(', ')}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const ActionCard = ({ icon, label, value, color, onClick, urgent }) => (
  <button
    onClick={onClick}
    className={`bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition-shadow text-left w-full ${
      urgent ? 'ring-2 ring-red-200' : ''
    }`}
  >
    <div className="flex items-center justify-between">
      <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      {urgent && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Urgent</span>}
    </div>
    <p className="text-3xl font-bold text-gray-900 mt-3">{value}</p>
    <p className="text-gray-600 text-sm">{label}</p>
  </button>
);

const StatItem = ({ icon, label, value }) => (
  <div className="text-center p-3">
    <div className="flex justify-center text-gray-400 mb-2">{icon}</div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-600">{label}</p>
  </div>
);

const QuickAction = ({ label, description, onClick, theme }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border"
  >
    <div>
      <p className="font-medium text-gray-900">{label}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-400" />
  </button>
);

export default SuperAdminDashboard;
