import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const Workplaces = () => {
  const [workplaces, setWorkplaces] = useState([]);
  const [employerProfile, setEmployerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadWorkplaces();
  }, []);

  const loadWorkplaces = async () => {
    try {
      const [workplacesRes, profileRes] = await Promise.all([
        api.get('/api/employer/workplaces'),
        api.get('/api/users/me')
      ]);
      setWorkplaces(workplacesRes.data.data.workplaces);
      setEmployerProfile(profileRes.data.data.profile);
    } catch (error) {
      console.error('Failed to load workplaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workplaceId) => {
    try {
      await api.delete(`/api/employer/workplaces/${workplaceId}`);
      setDeleteConfirm(null);
      loadWorkplaces(); // Reload list
    } catch (error) {
      alert(error.response?.data?.error?.detail || 'Failed to delete workplace');
      setDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Header */}
      <header className="text-white px-6 py-4 shadow-md" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/employer/dashboard')} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold">My Workplaces</h1>
          </div>
          <button
            onClick={() => navigate('/employer/workplace-setup')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            + Add Workplace
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {workplaces.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Workplaces Yet</h3>
            <p className="text-gray-600 mb-6">Create your first workplace to start managing shifts and hiring workers</p>
            <button
              onClick={() => navigate('/employer/workplace/setup')}
              className="px-6 py-3 rounded-lg text-white font-semibold"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Create First Workplace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workplaces.map((workplace) => (
              <div key={workplace.workplace_id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {/* Company Name - Read Only */}
                      {employerProfile?.company_name && (
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: theme.primaryColor }}>
                          {employerProfile.company_name}
                        </p>
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{workplace.workplace_name}</h3>
                      <p className="text-sm text-gray-600">{workplace.address}</p>
                      <p className="text-sm text-gray-500">{workplace.postal_code}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/employer/workplaces/${workplace.workplace_id}/edit`)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit workplace"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{workplace.job_matching_radius_km} km radius</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 flex gap-3">
                    <button
                      onClick={() => navigate(`/employer/workplaces/${workplace.workplace_id}`)}
                      className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      View Shifts
                    </button>
                    <button
                      onClick={() => navigate(`/employer/workplaces/${workplace.workplace_id}/create-shift`)}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      + Shift
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(workplace.workplace_id)}
                      className="px-3 py-2 border-2 border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete workplace"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Workplace?</h3>
                <p className="text-sm text-gray-600">
                  This will permanently delete this workplace and all associated completed shifts. 
                  <strong> Active shifts must be completed or cancelled first.</strong>
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete Workplace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workplaces;
