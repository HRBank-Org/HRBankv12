import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import CalendarView from '../../components/scheduling/CalendarView';
import api from '../../utils/api';
import { FiPlus, FiMapPin, FiBriefcase } from 'react-icons/fi';

const Roster = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workplaceParam = searchParams.get('workplace') || 'all';
  
  const [workplaces, setWorkplaces] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Check if setup is complete
  const hasWorkplaces = workplaces.length > 0;
  const hasRoles = roles.length > 0;
  const setupComplete = hasWorkplaces && hasRoles;
  
  useEffect(() => {
    loadSetupData();
  }, []);
  
  const loadSetupData = async () => {
    try {
      const [wpRes, rolesRes] = await Promise.all([
        api.get('/api/employer/workplaces'),
        api.get('/api/employer/workplace-roles/list')
      ]);
      setWorkplaces(wpRes.data.data?.workplaces || []);
      setRoles(rolesRes.data.data?.roles || []);
    } catch (error) {
      console.error('Failed to load setup data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <ModernSidebar />
      
      {/* Main Content - reduced padding */}
      <div className="ml-[70px] pt-[64px] transition-all duration-300">
        {/* Setup Guidance Banner - only shows when setup incomplete */}
        {!loading && !setupComplete && (
          <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 mb-1">Setup Required Before Creating Shifts</h3>
                <p className="text-sm text-amber-700 mb-3">
                  {!hasWorkplaces 
                    ? "You need to create at least one workplace location before scheduling shifts."
                    : "You need to create at least one role before scheduling shifts. Roles define pay rates, certifications, and tasks."}
                </p>
                <div className="flex flex-wrap gap-3">
                  {!hasWorkplaces ? (
                    <button
                      onClick={() => navigate('/employer/workplaces')}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                    >
                      <FiMapPin className="w-4 h-4" />
                      Step 1: Create Workplace
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/employer/roles/create')}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                    >
                      <FiBriefcase className="w-4 h-4" />
                      Step 2: Create Role
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Content - reduced padding */}
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm">
            <CalendarView 
              initialWorkplace={workplaceParam} 
              setupComplete={setupComplete}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Roster;
