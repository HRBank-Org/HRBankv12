import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { FiEdit2, FiCheck, FiX, FiAlertCircle, FiDollarSign, FiCalendar, FiClock } from 'react-icons/fi';

const MinimumWageManager = () => {
  const [wages, setWages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [editingProvince, setEditingProvince] = useState(null);
  const [editForm, setEditForm] = useState({
    minimum_wage: '',
    effective_date: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.user_type !== 'admin' && user?.user_type !== 'super_admin') {
      navigate('/admin/login');
      return;
    }
    loadWages();
  }, [user]);

  const loadWages = async () => {
    try {
      const res = await api.get('/api/admin/minimum-wages/list');
      setWages(res.data.data.provinces || []);
    } catch (error) {
      console.error('Failed to load minimum wages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (province) => {
    setEditingProvince(province.province_code);
    setEditForm({
      minimum_wage: province.minimum_wage || province.general_minimum_wage || '',
      effective_date: province.effective_date ? new Date(province.effective_date).toISOString().split('T')[0] : '',
      notes: province.notes || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingProvince(null);
    setEditForm({ minimum_wage: '', effective_date: '', notes: '' });
  };

  const handleSave = async (provinceCode) => {
    if (!editForm.minimum_wage || parseFloat(editForm.minimum_wage) <= 0) {
      alert('Please enter a valid minimum wage');
      return;
    }

    if (!editForm.effective_date) {
      alert('Please select an effective date');
      return;
    }

    setSaving(true);
    try {
      await api.put('/api/admin/minimum-wages/update', {
        province_code: provinceCode,
        minimum_wage: parseFloat(editForm.minimum_wage),
        effective_date: editForm.effective_date,
        notes: editForm.notes
      });

      alert('Minimum wage updated successfully');
      setEditingProvince(null);
      loadWages(); // Reload data
    } catch (error) {
      console.error('Failed to update minimum wage:', error);
      alert(error.response?.data?.detail || 'Failed to update minimum wage');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      <AdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Minimum Wage Management</h1>
                <p className="text-gray-600">Configure provincial minimum wage settings</p>
              </div>

        {/* Alert Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <div className="flex items-start">
            <FiAlertCircle className="text-yellow-600 mt-0.5 mr-3" size={20} />
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">Critical Compliance Setting</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Minimum wage updates affect all role creation and validation across the platform. 
                Changes are logged for audit purposes and historical tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <FiDollarSign className="text-green-600" size={24} />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Provinces</p>
            <p className="text-3xl font-bold text-gray-900">{wages.length}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <FiCalendar className="text-blue-600" size={24} />
            </div>
            <p className="text-sm text-gray-600 mb-1">Last Updated</p>
            <p className="text-lg font-semibold text-gray-900">
              {wages.length > 0 ? formatDate(wages[0].updated_date || wages[0].effective_date) : 'N/A'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <FiClock className="text-purple-600" size={24} />
            </div>
            <p className="text-sm text-gray-600 mb-1">Configured</p>
            <p className="text-3xl font-bold text-gray-900">
              {wages.filter(w => w.minimum_wage || w.general_minimum_wage).length}
            </p>
          </div>
        </div>

        {/* Minimum Wages Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Provincial Minimum Wages</h2>
            <p className="text-sm text-gray-600 mt-1">
              Current minimum wage rates for all Canadian provinces and territories
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Province / Territory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Minimum Wage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wages.map((wage) => {
                  const isEditing = editingProvince === wage.province_code;
                  const currentWage = wage.minimum_wage || wage.general_minimum_wage || 0;

                  return (
                    <tr key={wage.province_code} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {wage.province_name || wage.province}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                          {wage.province_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editForm.minimum_wage}
                            onChange={(e) => setEditForm({ ...editForm, minimum_wage: e.target.value })}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="17.60"
                          />
                        ) : (
                          <div className="text-sm">
                            <span className={`font-bold ${currentWage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${currentWage.toFixed(2)}
                            </span>
                            <span className="text-gray-500 ml-1">/hr</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.effective_date}
                            onChange={(e) => setEditForm({ ...editForm, effective_date: e.target.value })}
                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">
                            {formatDate(wage.effective_date)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Updated for 2025"
                          />
                        ) : (
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {wage.notes || '-'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSave(wage.province_code)}
                              disabled={saving}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              <FiCheck size={18} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Cancel"
                            >
                              <FiX size={18} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(wage)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">📌 Important Notes:</h4>
          <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
            <li>All changes are logged in the audit system with timestamp and admin ID</li>
            <li>Historical wage data is preserved for compliance reporting</li>
            <li>Role creation automatically validates against these minimum wages</li>
            <li>Updates take effect immediately for new role postings</li>
          </ul>
        </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MinimumWageManager;
