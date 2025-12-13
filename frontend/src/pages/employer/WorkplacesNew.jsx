import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import api from '../../utils/api';
import { FiMapPin, FiUsers, FiCalendar, FiPlus } from 'react-icons/fi';

const WorkplacesNew = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkplaces();
  }, []);

  const loadWorkplaces = async () => {
    try {
      const response = await api.get('/api/employer/workplaces');
      if (response.data.success) {
        setWorkplaces(response.data.data.workplaces || []);
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
          {/* Add Workplace Button */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/employer/workplace/setup')}
              className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-all flex items-center gap-2"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <FiPlus size={20} />
              Add Workplace
            </button>
          </div>

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
              <div className="bg-gray-100 rounded-lg h-full min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <FiMapPin size={48} className="text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium mb-1">Map Integration Coming Soon</p>
                  <p className="text-sm text-gray-500">Pin pointing for {activeLocations} active location{activeLocations !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Workplace Cards */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Your Workplaces</h2>
            
            {workplaces.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <FiMapPin size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Workplaces Yet</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first workplace</p>
                <button
                  onClick={() => navigate('/employer/workplace/setup')}
                  className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-all"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Add Workplace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {workplaces.map((workplace) => (
                  <div
                    key={workplace.workplace_id}
                    className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/employer/workplace/${workplace.workplace_id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{workplace.name}</h3>
                        <p className="text-gray-600 text-sm flex items-center gap-2">
                          <FiMapPin size={16} />
                          {workplace.address}, {workplace.city}, {workplace.province} {workplace.postal_code}
                        </p>
                      </div>
                      <span 
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          workplace.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {workplace.status || 'Active'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiUsers size={18} />
                        <span className="text-sm">{workplace.assigned_workers || 0} Workers</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiCalendar size={18} />
                        <span className="text-sm">{workplace.active_shifts || 0} Active Shifts</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkplacesNew;
