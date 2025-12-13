import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const WorkplaceDetail = () => {
  const { workplaceId } = useParams();
  const [workplace, setWorkplace] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(null);
  const [newDates, setNewDates] = useState(['']);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadWorkplaceData();
  }, [workplaceId]);

  const loadWorkplaceData = async () => {
    try {
      const [wpRes, shiftsRes] = await Promise.all([
        api.get('/api/employer/workplaces'),
        api.get('/api/employer/shifts')
      ]);

      const wp = wpRes.data.data.workplaces.find(w => w.workplace_id === workplaceId);
      setWorkplace(wp);

      // Filter shifts for this workplace
      const workplaceShifts = shiftsRes.data.data.shifts.filter(s => s.workplace_id === workplaceId);
      setShifts(workplaceShifts);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (shiftId) => {
    try {
      await api.post(`/api/employer/shifts/${shiftId}/duplicate`, newDates.filter(d => d));
      setDuplicating(null);
      setNewDates(['']);
      loadWorkplaceData(); // Reload
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to duplicate shift');
    }
  };

  const addDateField = () => {
    setNewDates([...newDates, '']);
  };

  const updateDate = (index, value) => {
    const updated = [...newDates];
    updated[index] = value;
    setNewDates(updated);
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
            <button onClick={() => navigate('/employer/dashboard', { state: { activeTab: 'schedule', showWorkplaces: true } })} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-xl font-bold">{workplace?.workplace_name}</h1>
              <p className="text-sm opacity-90">{workplace?.address}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/employer/workplaces/${workplaceId}/create-shift`)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            + Create Shift
          </button>
        </div>
      </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Shifts & Schedules</h2>

        {shifts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Shifts Yet</h3>
            <p className="text-gray-600 mb-6">Create your first shift to start scheduling workers</p>
            <button
              onClick={() => navigate(`/employer/workplaces/${workplaceId}/create-shift`)}
              className="px-6 py-3 rounded-lg text-white font-semibold"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Create First Shift
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <div key={shift.shift_id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        shift.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        shift.status === 'filled' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {shift.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {shift.start_time} - {shift.end_time}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setDuplicating(shift.shift_id)}
                      className="px-3 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50"
                      title="Duplicate shift"
                    >
                      📋 Duplicate
                    </button>
                    <button
                      onClick={() => navigate(`/employer/shifts/${shift.shift_id}`)}
                      className="px-4 py-2 rounded-lg font-medium text-white"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      Manage Roles
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Duplicate Shift Dialog */}
      {duplicating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Duplicate Shift to New Dates</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select the dates you want to copy this shift to. All roles and details will be duplicated.
            </p>
            
            <div className="space-y-3 mb-6">
              {newDates.map((date, index) => (
                <input
                  key={index}
                  type="date"
                  value={date}
                  onChange={(e) => updateDate(index, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="Select date"
                />
              ))}
              <button
                onClick={addDateField}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
              >
                + Add Another Date
              </button>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDuplicating(null);
                  setNewDates(['']);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDuplicate(duplicating)}
                disabled={newDates.filter(d => d).length === 0}
                className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Duplicate to {newDates.filter(d => d).length} Date(s)
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default WorkplaceDetail;
