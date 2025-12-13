import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiClock, FiMapPin, FiUsers, FiChevronRight } from 'react-icons/fi';
import api from '../../utils/api';
import moment from 'moment';

const UnstaffedShiftsAlert = ({ theme }) => {
  const navigate = useNavigate();
  const [unstaffedData, setUnstaffedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadUnstaffedShifts();
  }, []);

  const loadUnstaffedShifts = async () => {
    try {
      const response = await api.get('/api/compliance/unstaffed-shifts?days_ahead=7');
      setUnstaffedData(response.data.data);
    } catch (error) {
      console.error('Failed to load unstaffed shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!unstaffedData || unstaffedData.total_understaffed === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-green-900">All Shifts Fully Staffed!</h3>
            <p className="text-sm text-green-700">Great job! All shifts for the next 7 days have workers assigned.</p>
          </div>
        </div>
      </div>
    );
  }

  const { total_understaffed, critical_count, high_count, shifts } = unstaffedData;
  const urgencyColor = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        style={{ 
          borderLeft: `4px solid ${critical_count > 0 ? '#ef4444' : high_count > 0 ? '#f97316' : '#eab308'}` 
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              critical_count > 0 ? 'bg-red-100' : high_count > 0 ? 'bg-orange-100' : 'bg-yellow-100'
            }`}>
              <FiAlertTriangle className={`w-6 h-6 ${
                critical_count > 0 ? 'text-red-600' : high_count > 0 ? 'text-orange-600' : 'text-yellow-600'
              }`} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {total_understaffed} Shift{total_understaffed !== 1 ? 's' : ''} Need{total_understaffed === 1 ? 's' : ''} Attention
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {critical_count > 0 && (
                  <span className="text-red-600 font-medium">
                    {critical_count} completely unstaffed
                  </span>
                )}
                {critical_count > 0 && high_count > 0 && ' • '}
                {high_count > 0 && (
                  <span className="text-orange-600 font-medium">
                    {high_count} need more workers
                  </span>
                )}
              </p>
            </div>
          </div>
          <button 
            className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{ backgroundColor: theme.primaryColor }}
            onClick={(e) => {
              e.stopPropagation();
              navigate('/employer/roster');
            }}
          >
            Fill Shifts
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Expandable Shift List */}
      {expanded && (
        <div className="border-t border-gray-200">
          <div className="p-6 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Upcoming Shifts (Next 7 Days)</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {shifts.slice(0, 10).map((shift) => (
                <div
                  key={shift.shift_id}
                  className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          shift.urgency === 'critical' 
                            ? 'bg-red-100 text-red-700' 
                            : shift.urgency === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {shift.urgency === 'critical' ? '🚨 Critical' : shift.urgency === 'high' ? '⚠️ High' : '⚡ Medium'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {moment(shift.shift_date).format('ddd, MMM D')}
                        </span>
                      </div>
                      
                      <h5 className="font-semibold text-gray-900 mb-1">{shift.position_title}</h5>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <FiMapPin size={14} />
                          {shift.workplace_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <FiClock size={14} />
                          {moment(shift.start_time).format('h:mm A')} - {moment(shift.end_time).format('h:mm A')}
                        </div>
                        <div className="flex items-center gap-1">
                          <FiUsers size={14} />
                          <span className={shift.positions_filled === 0 ? 'text-red-600 font-medium' : ''}>
                            {shift.positions_filled}/{shift.positions_needed} filled
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => navigate(`/employer/roster?date=${shift.shift_date}&workplace=${shift.workplace_id}`)}
                      className="ml-4 px-4 py-2 text-sm font-medium rounded-lg text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      Assign Workers
                    </button>
                  </div>
                </div>
              ))}
              
              {shifts.length > 10 && (
                <button
                  onClick={() => navigate('/employer/roster')}
                  className="w-full py-2 text-sm font-medium text-center rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: theme.primaryColor }}
                >
                  View All {shifts.length} Shifts
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnstaffedShiftsAlert;
