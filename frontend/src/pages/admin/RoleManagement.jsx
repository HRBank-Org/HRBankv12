import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import {
  Shield,
  Key,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  Info,
  ChevronRight,
  Search,
  Filter,
  Plus,
  Settings,
  Lock,
  Unlock,
  UserCheck,
  FileCheck,
  MessageSquare,
  Building2,
  MapPin,
  AlertTriangle
} from 'lucide-react';

// Permission categories and their icons
const PERMISSION_CATEGORIES = {
  user_management: {
    label: 'User Management',
    icon: Users,
    color: 'blue',
    permissions: ['can_activate_accounts', 'can_deactivate_accounts', 'can_view_users']
  },
  credential_management: {
    label: 'Credential Management',
    icon: FileCheck,
    color: 'purple',
    permissions: ['can_review_credentials', 'can_approve_credentials', 'can_reject_credentials']
  },
  admin_management: {
    label: 'Admin Management',
    icon: Shield,
    color: 'red',
    permissions: ['can_create_admins', 'can_edit_admins', 'can_assign_roles']
  },
  franchise_management: {
    label: 'Franchise Management',
    icon: Building2,
    color: 'green',
    permissions: ['can_manage_franchises', 'can_view_franchises']
  },
  support: {
    label: 'Support',
    icon: MessageSquare,
    color: 'yellow',
    permissions: ['can_handle_tickets', 'can_view_tickets']
  },
  compliance: {
    label: 'Compliance',
    icon: AlertTriangle,
    color: 'orange',
    permissions: ['can_review_compliance', 'can_manage_zones']
  },
  analytics: {
    label: 'Analytics',
    icon: Settings,
    color: 'gray',
    permissions: ['can_view_analytics', 'can_export_data']
  }
};

// Human-readable permission names
const PERMISSION_LABELS = {
  can_activate_accounts: 'Activate User Accounts',
  can_deactivate_accounts: 'Deactivate User Accounts',
  can_view_users: 'View All Users',
  can_review_credentials: 'Review Credentials',
  can_approve_credentials: 'Approve Credentials',
  can_reject_credentials: 'Reject Credentials',
  can_create_admins: 'Create Admin Users',
  can_edit_admins: 'Edit Admin Users',
  can_assign_roles: 'Assign Admin Roles',
  can_manage_franchises: 'Manage Franchises',
  can_view_franchises: 'View Franchises',
  can_handle_tickets: 'Handle Support Tickets',
  can_view_tickets: 'View Support Tickets',
  can_review_compliance: 'Review Compliance Documents',
  can_manage_zones: 'Manage Zones & Regions',
  can_view_analytics: 'View Analytics',
  can_export_data: 'Export Data'
};

const RoleManagement = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, adminsRes] = await Promise.all([
        api.get('/api/super-admin/roles'),
        api.get('/api/super-admin/admins?limit=100')
      ]);
      
      setRoles(rolesRes.data.data.roles || []);
      setAdmins(adminsRes.data.data.admins || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (roleType) => {
    const colors = {
      super_admin: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', gradient: 'from-red-500 to-red-600' },
      regional_manager: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-500 to-blue-600' },
      account_activator: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', gradient: 'from-green-500 to-green-600' },
      credentials_reviewer: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', gradient: 'from-purple-500 to-purple-600' },
      customer_service: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', gradient: 'from-yellow-500 to-yellow-600' },
      compliance_officer: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', gradient: 'from-orange-500 to-orange-600' },
      franchise_manager: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', gradient: 'from-pink-500 to-pink-600' }
    };
    return colors[roleType] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', gradient: 'from-gray-500 to-gray-600' };
  };

  const getRoleIcon = (roleType) => {
    const icons = {
      super_admin: Shield,
      regional_manager: MapPin,
      account_activator: UserCheck,
      credentials_reviewer: FileCheck,
      customer_service: MessageSquare,
      compliance_officer: AlertTriangle,
      franchise_manager: Building2
    };
    return icons[roleType] || Key;
  };

  const countAdminsWithRole = (roleType) => {
    return admins.filter(a => a.role === roleType).length;
  };

  const getPermissionCount = (role) => {
    if (!role.default_permissions) return { enabled: 0, total: 0 };
    const permissions = Object.entries(role.default_permissions);
    const enabled = permissions.filter(([_, value]) => value === true).length;
    return { enabled, total: permissions.length };
  };

  const filteredRoles = roles.filter(role => 
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              {/* Page Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
                    <p className="text-gray-600">Configure admin roles and permissions</p>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Key className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
                      <p className="text-sm text-gray-600">Total Roles</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
                      <p className="text-sm text-gray-600">Total Admins</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100">
                      <Shield className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{countAdminsWithRole('super_admin')}</p>
                      <p className="text-sm text-gray-600">Super Admins</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Lock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{Object.keys(PERMISSION_LABELS).length}</p>
                      <p className="text-sm text-gray-600">Permissions</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search roles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Roles Display */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRoles.map((role) => {
                    const colors = getRoleColor(role.role_type);
                    const Icon = getRoleIcon(role.role_type);
                    const adminCount = countAdminsWithRole(role.role_type);
                    const permCount = getPermissionCount(role);

                    return (
                      <div
                        key={role.role_type}
                        className={`bg-white rounded-xl border ${colors.border} shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden`}
                        onClick={() => setSelectedRole(role)}
                      >
                        {/* Card Header */}
                        <div className={`h-2 bg-gradient-to-r ${colors.gradient}`} />
                        
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${colors.bg}`}>
                              <Icon className={`w-6 h-6 ${colors.text}`} />
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                              {adminCount} admin{adminCount !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {role.display_name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {role.description}
                          </p>

                          {/* Permissions Preview */}
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Lock className="w-4 h-4" />
                              <span>{permCount.enabled} of {permCount.total} permissions</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Role</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Description</th>
                        <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">Admins</th>
                        <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">Permissions</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredRoles.map((role) => {
                        const colors = getRoleColor(role.role_type);
                        const Icon = getRoleIcon(role.role_type);
                        const adminCount = countAdminsWithRole(role.role_type);
                        const permCount = getPermissionCount(role);

                        return (
                          <tr key={role.role_type} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${colors.bg}`}>
                                  <Icon className={`w-5 h-5 ${colors.text}`} />
                                </div>
                                <span className="font-medium text-gray-900">{role.display_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                              {role.description}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                {adminCount}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-600">
                              {permCount.enabled}/{permCount.total}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedRole(role)}
                                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Permission Legend */}
              <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  Permission Categories
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => {
                    const Icon = category.icon;
                    return (
                      <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`p-2 rounded-lg bg-${category.color}-100`}>
                          <Icon className={`w-4 h-4 text-${category.color}-600`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{category.label}</p>
                          <p className="text-xs text-gray-500">{category.permissions.length} permissions</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Role Detail Modal */}
      {selectedRole && (
        <RoleDetailModal
          role={selectedRole}
          admins={admins.filter(a => a.role === selectedRole.role_type)}
          onClose={() => setSelectedRole(null)}
          theme={theme}
        />
      )}
    </div>
  );
};

const RoleDetailModal = ({ role, admins, onClose, theme }) => {
  const colors = {
    super_admin: { bg: 'bg-red-100', text: 'text-red-700', gradient: 'from-red-500 to-red-600' },
    regional_manager: { bg: 'bg-blue-100', text: 'text-blue-700', gradient: 'from-blue-500 to-blue-600' },
    account_activator: { bg: 'bg-green-100', text: 'text-green-700', gradient: 'from-green-500 to-green-600' },
    credentials_reviewer: { bg: 'bg-purple-100', text: 'text-purple-700', gradient: 'from-purple-500 to-purple-600' },
    customer_service: { bg: 'bg-yellow-100', text: 'text-yellow-700', gradient: 'from-yellow-500 to-yellow-600' },
    compliance_officer: { bg: 'bg-orange-100', text: 'text-orange-700', gradient: 'from-orange-500 to-orange-600' },
    franchise_manager: { bg: 'bg-pink-100', text: 'text-pink-700', gradient: 'from-pink-500 to-pink-600' }
  }[role.role_type] || { bg: 'bg-gray-100', text: 'text-gray-700', gradient: 'from-gray-500 to-gray-600' };

  const permissions = role.default_permissions || {};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.gradient} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{role.display_name}</h2>
                <p className="text-white/80 text-sm">{role.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XCircle className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
              <p className="text-sm text-gray-600">Assigned Admins</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(permissions).filter(v => v === true).length}
              </p>
              <p className="text-sm text-gray-600">Enabled Permissions</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(permissions).filter(v => v === false).length}
              </p>
              <p className="text-sm text-gray-600">Disabled Permissions</p>
            </div>
          </div>

          {/* Permissions Grid */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-gray-600" />
              Permissions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(permissions).map(([key, value]) => (
                <div
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    value ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {value ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className={`text-sm font-medium ${value ? 'text-green-800' : 'text-gray-600'}`}>
                      {PERMISSION_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    value ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {value ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Admins */}
          {admins.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                Assigned Administrators ({admins.length})
              </h3>
              <div className="space-y-2">
                {admins.map((admin) => (
                  <div
                    key={admin.admin_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-semibold">
                        {admin.full_name?.charAt(0) || admin.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{admin.full_name}</p>
                        <p className="text-sm text-gray-600">{admin.email}</p>
                      </div>
                    </div>
                    {admin.assigned_provinces?.length > 0 && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {admin.assigned_provinces.join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
