import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import { UserCog, Shield, Lock, Unlock, CheckCircle } from 'lucide-react';

const Permissions = () => {
  const theme = useTheme();

  const permissionGroups = [
    {
      name: 'User Management',
      permissions: [
        { key: 'can_activate_accounts', label: 'Activate User Accounts', description: 'Approve pending user registrations' },
        { key: 'can_deactivate_accounts', label: 'Deactivate Accounts', description: 'Suspend or deactivate user accounts' },
        { key: 'can_view_users', label: 'View All Users', description: 'Access full user database' },
      ]
    },
    {
      name: 'Credential Management',
      permissions: [
        { key: 'can_review_credentials', label: 'Review Credentials', description: 'View credential submissions' },
        { key: 'can_approve_credentials', label: 'Approve Credentials', description: 'Approve credential submissions' },
        { key: 'can_reject_credentials', label: 'Reject Credentials', description: 'Reject credential submissions' },
      ]
    },
    {
      name: 'Admin Management',
      permissions: [
        { key: 'can_create_admins', label: 'Create Admin Users', description: 'Add new admin accounts' },
        { key: 'can_edit_admins', label: 'Edit Admin Users', description: 'Modify admin account details' },
        { key: 'can_assign_roles', label: 'Assign Roles', description: 'Change admin role assignments' },
      ]
    },
    {
      name: 'System Settings',
      permissions: [
        { key: 'can_manage_zones', label: 'Manage Zones', description: 'Create and edit geographic zones' },
        { key: 'can_view_analytics', label: 'View Analytics', description: 'Access platform analytics' },
        { key: 'can_export_data', label: 'Export Data', description: 'Export reports and data' },
      ]
    },
  ];

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
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <UserCog className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Permissions</h1>
                    <p className="text-gray-600">System permissions and access control reference</p>
                  </div>
                </div>
              </div>

              {/* Permission Groups */}
              <div className="space-y-6">
                {permissionGroups.map((group) => (
                  <div key={group.name} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b">
                      <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-orange-500" />
                        {group.name}
                      </h2>
                    </div>
                    <div className="divide-y">
                      {group.permissions.map((perm) => (
                        <div key={perm.key} className="px-6 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-green-100">
                              <Lock className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{perm.label}</p>
                              <p className="text-sm text-gray-500">{perm.description}</p>
                            </div>
                          </div>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
                            {perm.key}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Permissions;
