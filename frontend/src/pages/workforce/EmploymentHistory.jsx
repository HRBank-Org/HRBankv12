import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceLayout from '../../components/layout/WorkforceLayout';
import api from '../../utils/api';

const EmploymentHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadEmploymentHistory();
  }, []);

  const loadEmploymentHistory = async () => {
    try {
      const response = await api.get('/api/employer/workforce-management/my-employment-history');
      setHistory(response.data.data.employment_history);
      setStats({
        total: response.data.data.total_employers,
        active: response.data.data.active_employers,
        past: response.data.data.past_employers
      });
    } catch (error) {
      console.error('Failed to load employment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      terminated: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getTerminationReason = (reason) => {
    if (!reason) return '';
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <WorkforceLayout title="Employment History">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </WorkforceLayout>
    );
  }

  return (
    <WorkforceLayout title="Employment History" subtitle="Your employment records with various employers">
      <div className="max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Total Employers</p>
            <p className="text-3xl font-bold" style={{ color: theme.primaryColor }}>{stats.total || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Active Employment</p>
            <p className="text-3xl font-bold text-green-600">{stats.active || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Past Employers</p>
            <p className="text-3xl font-bold text-gray-600">{stats.past || 0}</p>
          </div>
        </div>

        {/* Employment History List */}
        {history.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No employment history yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((employment) => (
              <div key={employment.relationship_id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {employment.company_logo ? (
                      <img 
                        src={employment.company_logo} 
                        alt={employment.company_name} 
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-600">
                          {employment.company_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{employment.company_name}</h3>
                      {employment.position_title && (
                        <p className="text-sm text-gray-600">{employment.position_title}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {employment.employment_type?.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(employment.status)}`}>
                    {employment.status.charAt(0).toUpperCase() + employment.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="text-sm font-medium">
                      {new Date(employment.employment_start_date).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {employment.employment_end_date && (
                    <div>
                      <p className="text-xs text-gray-500">End Date</p>
                      <p className="text-sm font-medium">
                        {new Date(employment.employment_end_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500">Shifts Completed</p>
                    <p className="text-sm font-medium">{employment.total_shifts_completed || 0}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Total Hours</p>
                    <p className="text-sm font-medium">{employment.total_hours_worked?.toFixed(1) || 0}h</p>
                  </div>

                  {employment.average_rating && (
                    <div>
                      <p className="text-xs text-gray-500">Rating</p>
                      <p className="text-sm font-medium">⭐ {employment.average_rating.toFixed(1)}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500">Rehire Status</p>
                    <p className={`text-sm font-medium ${employment.eligible_for_rehire ? 'text-green-600' : 'text-red-600'}`}>
                      {employment.eligible_for_rehire ? 'Eligible' : 'Not Eligible'}
                    </p>
                  </div>
                </div>

                {employment.termination_reason && employment.status !== 'active' && (
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong>Separation Reason:</strong> {getTerminationReason(employment.termination_reason)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkforceLayout>
  );
};

export default EmploymentHistory;
