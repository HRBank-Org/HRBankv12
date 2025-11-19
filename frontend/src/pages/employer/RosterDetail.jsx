import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Plus, Calendar, Users, Clock, User, X } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import RecurringShiftDialog from '../../components/employer/RecurringShiftDialog';
import WorkforceAssignmentModal from '../../components/employer/WorkforceAssignmentModal';

const RosterDetail = () => {
  const { rosterId } = useParams();
  const navigate = useNavigate();
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  
  const [roleData, setRoleData] = useState({
    role_name: '',
    description: '',
    positions_needed: 1,
    hourly_rate: '',
    requirements: []
  });

  useEffect(() => {
    loadRoster();
  }, [rosterId]);

  const loadRoster = async () => {
    try {
      const response = await api.get(`/api/rosters/${rosterId}`);
      setRoster(response.data.data);
    } catch (error) {
      console.error('Failed to load roster:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    try {
      const response = await api.post(`/api/rosters/${rosterId}/roles`, {
        roster_id: rosterId,
        ...roleData
      });
      if (response.data.success) {
        setShowAddRoleModal(false);
        setRoleData({
          role_name: '',
          description: '',
          positions_needed: 1,
          hourly_rate: '',
          requirements: []
        });
        loadRoster();
      }
    } catch (error) {
      console.error('Failed to add role:', error);
      alert('Failed to add role. Please try again.');
    }
  };

  const handleOpenShiftDialog = (role) => {
    setSelectedRole(role);
    setShowAddShiftModal(true);
  };

  const handleShiftsCreated = () => {
    setShowAddShiftModal(false);
    setSelectedRole(null);
    loadRoster();
  };

  const handleAssignWorkforce = (shift) => {
    setSelectedShift(shift);
    setShowAssignModal(true);
  };

  const handleWorkforceAssigned = () => {
    setShowAssignModal(false);
    setSelectedShift(null);
    loadRoster();
  };

  const handleUnassign = async (shiftId) => {
    if (!confirm('Are you sure you want to unassign this workforce member?')) return;
    
    try {
      await api.delete(`/api/rosters/${rosterId}/shifts/${shiftId}/unassign`);
      loadRoster();
    } catch (error) {
      console.error('Failed to unassign:', error);
      alert('Failed to unassign. Please try again.');
    }
  };

  const getShiftsForRole = (roleId) => {
    return roster?.shifts?.filter(s => s.role_id === roleId) || [];
  };

  const formatTime = (time) => {
    // Convert 24-hour to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!roster) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Roster not found</p>
        <Button onClick={() => navigate('/employer/rosters')} className="mt-4">
          Back to Rosters
        </Button>
      </div>
    );
  }

  return (
    <div className=\"p-6\">
      {/* Header */}
      <div className=\"mb-6\">
        <button
          onClick={() => navigate('/employer/rosters')}
          className=\"flex items-center text-gray-600 hover:text-gray-900 mb-4\"
        >
          <ArrowLeft className=\"w-4 h-4 mr-2\" />
          Back to Rosters
        </button>
        <div className=\"flex justify-between items-start\">
          <div>
            <h1 className=\"text-2xl font-bold text-gray-900 mb-2\">{roster.title}</h1>
            <p className=\"text-gray-600\">
              {formatDate(roster.week_start_date)} - {formatDate(roster.week_end_date)}
            </p>
          </div>
          <div className=\"flex gap-3\">
            <Button
              onClick={() => setShowAddRoleModal(true)}
              className=\"bg-blue-600 hover:bg-blue-700 text-white\"
            >
              <Plus className=\"w-4 h-4 mr-2\" />
              Add Role
            </Button>
            <Button
              onClick={() => navigate(`/employer/rosters/${rosterId}/calendar`)}
              variant=\"outline\"
            >
              <Calendar className=\"w-4 h-4 mr-2\" />
              View Calendar
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4 mb-6\">
        <Card className=\"p-4\">
          <div className=\"text-sm text-gray-600 mb-1\">Total Roles</div>
          <div className=\"text-2xl font-bold text-gray-900\">{roster.roles?.length || 0}</div>
        </Card>
        <Card className=\"p-4\">
          <div className=\"text-sm text-gray-600 mb-1\">Total Shifts</div>
          <div className=\"text-2xl font-bold text-gray-900\">{roster.shifts?.length || 0}</div>
        </Card>
        <Card className=\"p-4\">
          <div className=\"text-sm text-gray-600 mb-1\">Assigned</div>
          <div className=\"text-2xl font-bold text-green-600\">
            {roster.shifts?.filter(s => s.workforce_id).length || 0}
          </div>
        </Card>
        <Card className=\"p-4\">
          <div className=\"text-sm text-gray-600 mb-1\">Open Shifts</div>
          <div className=\"text-2xl font-bold text-orange-600\">
            {roster.shifts?.filter(s => !s.workforce_id).length || 0}
          </div>
        </Card>
      </div>

      {/* Roles and Shifts */}
      {roster.roles?.length === 0 ? (
        <Card className=\"p-12 text-center\">
          <Users className=\"w-16 h-16 mx-auto mb-4 text-gray-400\" />
          <h3 className=\"text-xl font-semibold text-gray-900 mb-2\">No Roles Yet</h3>
          <p className=\"text-gray-600 mb-6\">Add roles/positions to start creating shifts</p>
          <Button onClick={() => setShowAddRoleModal(true)} className=\"bg-blue-600 hover:bg-blue-700 text-white\">
            Add First Role
          </Button>
        </Card>
      ) : (
        <div className=\"space-y-6\">
          {roster.roles?.map(role => {
            const shifts = getShiftsForRole(role.role_id);
            const assignedCount = shifts.filter(s => s.workforce_id).length;
            
            return (
              <Card key={role.role_id} className=\"p-6\">
                {/* Role Header */}
                <div className=\"flex justify-between items-start mb-4\">
                  <div>
                    <h3 className=\"text-lg font-semibold text-gray-900\">{role.role_name}</h3>
                    {role.description && (
                      <p className=\"text-sm text-gray-600 mt-1\">{role.description}</p>
                    )}
                    <div className=\"flex items-center gap-4 mt-2 text-sm text-gray-600\">
                      {role.hourly_rate && (
                        <span>Rate: ${role.hourly_rate}/hr</span>
                      )}
                      <span>
                        Positions: {assignedCount}/{role.positions_needed}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleOpenShiftDialog(role)}
                    size=\"sm\"
                    className=\"bg-blue-600 hover:bg-blue-700 text-white\"
                  >
                    <Plus className=\"w-4 h-4 mr-1\" />
                    Add Shifts
                  </Button>
                </div>

                {/* Shifts List */}
                {shifts.length === 0 ? (
                  <div className=\"text-center py-8 bg-gray-50 rounded-lg\">
                    <Clock className=\"w-8 h-8 mx-auto mb-2 text-gray-400\" />
                    <p className=\"text-sm text-gray-600\">No shifts created yet</p>
                  </div>
                ) : (
                  <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3\">
                    {shifts.map(shift => (
                      <div
                        key={shift.shift_id}
                        className=\"border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow\"
                        style={{ borderLeftWidth: '4px', borderLeftColor: shift.color }}
                      >
                        <div className=\"flex justify-between items-start mb-2\">
                          <div className=\"text-sm font-medium text-gray-900\">
                            {formatDate(shift.shift_date)}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            shift.status === 'assigned' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {shift.status}
                          </span>
                        </div>
                        <div className=\"text-sm text-gray-600 mb-3\">
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </div>
                        {shift.workforce_id ? (
                          <div className=\"flex items-center justify-between\">
                            <div className=\"flex items-center gap-2\">
                              {shift.workforce_photo ? (
                                <img
                                  src={shift.workforce_photo}
                                  alt={shift.workforce_name}
                                  className=\"w-6 h-6 rounded-full object-cover\"
                                />
                              ) : (
                                <div className=\"w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center\">
                                  <User className=\"w-4 h-4 text-blue-600\" />
                                </div>
                              )}
                              <span className=\"text-sm text-gray-900\">{shift.workforce_name}</span>
                            </div>
                            <button
                              onClick={() => handleUnassign(shift.shift_id)}
                              className=\"text-gray-400 hover:text-red-600\"
                            >
                              <X className=\"w-4 h-4\" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleAssignWorkforce(shift)}
                            size=\"sm\"
                            variant=\"outline\"
                            className=\"w-full\"
                          >
                            Assign Worker
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className=\"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50\">
          <div className=\"bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto\">
            <h3 className=\"text-xl font-semibold mb-4\">Add Role/Position</h3>
            
            <div className=\"space-y-4\">
              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                  Role Name *
                </label>
                <input
                  type=\"text\"
                  value={roleData.role_name}
                  onChange={(e) => setRoleData({...roleData, role_name: e.target.value})}
                  placeholder=\"e.g., Server, Cashier, Manager\"
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500\"
                  required
                />
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                  Description
                </label>
                <textarea
                  value={roleData.description}
                  onChange={(e) => setRoleData({...roleData, description: e.target.value})}
                  rows={2}
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500\"
                  placeholder=\"Brief description of the role...\"
                />
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                  Positions Needed *
                </label>
                <input
                  type=\"number\"
                  value={roleData.positions_needed}
                  onChange={(e) => setRoleData({...roleData, positions_needed: parseInt(e.target.value)})}
                  min=\"1\"
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500\"
                  required
                />
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                  Hourly Rate ($)
                </label>
                <input
                  type=\"number\"
                  value={roleData.hourly_rate}
                  onChange={(e) => setRoleData({...roleData, hourly_rate: e.target.value})}
                  step=\"0.01\"
                  min=\"17.60\"
                  placeholder=\"17.60\"
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500\"
                />
                <p className=\"text-xs text-gray-500 mt-1\">Minimum: $17.60 (Ontario)</p>
              </div>
            </div>

            <div className=\"flex gap-3 mt-6\">
              <Button
                onClick={() => setShowAddRoleModal(false)}
                variant=\"outline\"
                className=\"flex-1\"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddRole}
                className=\"flex-1 bg-blue-600 hover:bg-blue-700 text-white\"
                disabled={!roleData.role_name}
              >
                Add Role
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Shift Modal */}
      {showAddShiftModal && selectedRole && (
        <RecurringShiftDialog
          rosterId={rosterId}
          role={selectedRole}
          weekStart={roster.week_start_date}
          weekEnd={roster.week_end_date}
          onClose={() => {
            setShowAddShiftModal(false);
            setSelectedRole(null);
          }}
          onSuccess={handleShiftsCreated}
        />
      )}

      {/* Assign Workforce Modal */}
      {showAssignModal && selectedShift && (
        <WorkforceAssignmentModal
          rosterId={rosterId}
          shift={selectedShift}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedShift(null);
          }}
          onSuccess={handleWorkforceAssigned}
        />
      )}
    </div>
  );
};

export default RosterDetail;
