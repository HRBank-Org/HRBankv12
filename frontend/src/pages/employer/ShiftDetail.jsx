import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import InviteModal from '../../components/employer/InviteModal';

const ShiftDetail = () => {
  const { shiftId } = useParams();
  const [shift, setShift] = useState(null);
  const [workplace, setWorkplace] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadShiftData();
  }, [shiftId]);

  const loadShiftData = async () => {
    try {
      // Load shift, workplace, and roles
      const shiftsRes = await api.get('/api/employer/shifts');
      const shiftData = shiftsRes.data.data.shifts.find(s => s.shift_id === shiftId);
      setShift(shiftData);

      if (shiftData) {
        const wpRes = await api.get('/api/employer/workplaces');
        const wp = wpRes.data.data.workplaces.find(w => w.workplace_id === shiftData.workplace_id);
        setWorkplace(wp);

        // TODO: Load roles for this shift
        // const rolesRes = await api.get(`/api/employer/shifts/${shiftId}/roles`);
        // setRoles(rolesRes.data.data.roles);
      }
    } catch (error) {
      console.error('Failed to load shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (emailList) => {
    try {
      const response = await api.post(`/api/employer/shifts/${shiftId}/invite`, {
        emails: emailList
      });
      
      return {
        success: true,
        message: response.data.message,
        data: response.data.data
      };
    } catch (error) {
      throw error;
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
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(`/employer/workplaces/${shift?.workplace_id}`)} className="hover:opacity-80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold">Manage Shift</h1>
            <p className="text-sm opacity-90">{workplace?.workplace_name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Shift Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {shift?.shift_date && new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              <p className="text-gray-600">{shift?.start_time} - {shift?.end_time}</p>
            </div>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
              shift?.status === 'open' ? 'bg-blue-100 text-blue-800' :
              shift?.status === 'filled' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {shift?.status}
            </span>
          </div>
        </div>

        {/* Roles Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Roles in This Shift</h3>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Shift Management</h3>
            <p className="text-sm text-gray-600 mb-6">
              Manage this shift's details, attendance, and tasks
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <button
                onClick={() => navigate(`/employer/shifts/${shift?.shift_id}/attendance`)}
                className="px-4 py-3 rounded-lg text-white font-medium"
                style={{ backgroundColor: theme.primaryColor }}
              >
                📋 Attendance & QR Code
              </button>
              <button
                onClick={() => {
                  // Get first role for this shift (simplified)
                  // In production, would show role selector if multiple
                  navigate(`/employer/roles/role_example/tasks`);
                }}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                ✓ Manage Tasks
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-3 border-2 rounded-lg text-white font-medium hover:opacity-90"
                style={{ backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }}
              >
                ✉️ Invite Workers
              </button>
              <button
                onClick={() => navigate('/employer/dashboard')}
                className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleInviteSubmit}
        type="shift"
        itemName={shift?.shift_date ? `${new Date(shift.shift_date).toLocaleDateString()} ${shift.start_time} - ${shift.end_time}` : ''}
      />
    </div>
  );
};

export default ShiftDetail;
