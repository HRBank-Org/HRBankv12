import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import GoogleWorkplaceMap from '../../components/maps/GoogleWorkplaceMap';
import api from '../../utils/api';
import { FiMapPin, FiUsers, FiCalendar, FiPlus, FiGrid, FiList, FiNavigation, FiHome } from 'react-icons/fi';

const WorkplacesNew = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    loadWorkplaces();
  }, []);

  const loadWorkplaces = async () => {
    try {
      const response = await api.get('/api/employer/workplaces');
      console.log('Workplaces response:', response.data);
      if (response.data.success) {
        const workplacesData = response.data.data?.workplaces || response.data.workplaces || [];
        setWorkplaces(workplacesData);
        console.log('Loaded workplaces:', workplacesData);
      }
    } catch (error) {
      console.error('Failed to load workplaces:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GenericHeader />
        <ModernSidebar />
        <div className="ml-[70px] pt-[64px] flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </div>
    );
  }

  const totalWorkplaces = workplaces.length;
  const activeLocations = workplaces.filter(w => w.status === 'active').length;
  const withActiveShifts = workplaces.filter(w => w.has_active_shifts).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <ModernSidebar />
      
      <div className="ml-[70px] pt-[64px]">
        {/* Page Header */}
        <div className="px-8 py-6 bg-white border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Workplace Management</h1>
          <p className="text-gray-600">Manage your business locations and workforce distribution</p>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {/* Stats Cards + Map Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left: Stats */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${theme.primaryColor}15` }}
                  >
                    <FiMapPin size={24} style={{ color: theme.primaryColor }} />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{totalWorkplaces}</div>
                    <div className="text-sm text-gray-600">Total Workplaces</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: '#10b98115' }}
                  >
                    <FiMapPin size={24} className="text-green-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{activeLocations}</div>
                    <div className="text-sm text-gray-600">Active Locations</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: '#3b82f615' }}
                  >
                    <FiCalendar size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{withActiveShifts}</div>
                    <div className="text-sm text-gray-600">With Active Shifts</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Map */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiMapPin size={20} className="text-gray-600" />
                Active Locations Map
              </h2>
              <GoogleWorkplaceMap 
                workplaces={workplaces} 
                onMarkerClick={(workplace) => navigate(`/employer/workplaces/${workplace.workplace_id}`)}
              />
            </div>
          </div>

          {/* Workplace Cards/List */}
          <div className="space-y-6">
            {/* Section Header with Add Button + View Toggle */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Your Workplaces ({workplaces.length})</h2>
              
              <div className="flex items-center gap-3">
                {/* Add Workplace Button */}
                <button
                  onClick={() => navigate('/employer/workplace-setup')}
                  className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-all flex items-center gap-2"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <FiPlus size={20} />
                  Add Workplace
                </button>

                {/* View Mode Toggle */}
                {workplaces.length > 0 && (
                  <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm p-1 border border-gray-200">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                      title="Grid View"
                    >
                      <FiGrid size={20} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                      title="List View"
                    >
                      <FiList size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {workplaces.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <FiMapPin size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Workplaces Yet</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first workplace</p>
                <button
                  onClick={() => navigate('/employer/workplace-setup')}
                  className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-all"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Add Workplace
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workplaces.map((workplace) => (
                  <div
                    key={workplace.workplace_id}
                    className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/employer/workplaces/${workplace.workplace_id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{workplace.workplace_name || workplace.name}</h3>
                        <p className="text-gray-600 text-sm flex items-center gap-2">
                          <FiMapPin size={16} />
                          {workplace.address}, {workplace.city}, {workplace.province} {workplace.postal_code}
                        </p>
                      </div>
                      <span 
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          workplace.status === 'inactive' 
                            ? 'bg-gray-100 text-gray-600' 
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {workplace.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiUsers size={18} />
                        <span className="text-sm">{workplace.assigned_workers || 0} Workers</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiCalendar size={18} />
                        <span className="text-sm">{workplace.active_shifts || 0} Shifts</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Workplace Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Address</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Workers</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Shifts</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {workplaces.map((workplace) => (
                      <tr 
                        key={workplace.workplace_id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/employer/workplaces/${workplace.workplace_id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{workplace.workplace_name || workplace.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-600 text-sm">
                            {workplace.address}, {workplace.city}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FiUsers size={16} />
                            <span className="text-sm">{workplace.assigned_workers || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FiCalendar size={16} />
                            <span className="text-sm">{workplace.active_shifts || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            workplace.status === 'inactive' 
                              ? 'bg-gray-100 text-gray-600' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {workplace.status === 'inactive' ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkplacesNew;
