import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Calendar, Plus, Users, Clock, MapPin } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const RosterManagement = () => {
  const navigate = useNavigate();
  const [rosters, setRosters] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkplace, setSelectedWorkplace] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    workplace_id: '',
    week_start_date: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedWorkplace]);

  const loadData = async () => {
    try {
      // Load workplaces
      const workplacesRes = await api.get('/api/employer/workplaces');
      const workplacesData = workplacesRes.data.data?.workplaces || workplacesRes.data.workplaces || [];
      setWorkplaces(Array.isArray(workplacesData) ? workplacesData : []);

      // Load rosters
      const params = selectedWorkplace !== 'all' ? { workplace_id: selectedWorkplace } : {};
      const rostersRes = await api.get('/api/rosters', { params });
      setRosters(rostersRes.data.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoster = async () => {
    try {
      const response = await api.post('/api/rosters', createData);
      if (response.data.success) {
        setShowCreateModal(false);
        loadData();
        // Navigate to roster detail page
        navigate(`/employer/rosters/${response.data.data.roster_id}`);
      }
    } catch (error) {
      console.error('Failed to create roster:', error);
      alert('Failed to create roster. Please try again.');
    }
  };

  const getNextMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  };

  const getRosterStats = (roster) => {
    const totalShifts = roster.shifts?.length || 0;
    const assignedShifts = roster.shifts?.filter(s => s.workforce_id).length || 0;
    const openShifts = totalShifts - assignedShifts;
    return { totalShifts, assignedShifts, openShifts };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Roster Management</h1>
        <p className="text-gray-600">Create and manage weekly rosters for your workplaces</p>
      </div>

      {/* Filters and Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <select
            value={selectedWorkplace}
            onChange={(e) => setSelectedWorkplace(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Workplaces</option>
            {Array.isArray(workplaces) && workplaces.map(wp => (
              <option key={wp.id} value={wp.id}>{wp.name}</option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Roster
        </Button>
      </div>

      {/* Rosters Grid */}
      {rosters.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Rosters Yet</h3>
          <p className="text-gray-600 mb-6">Create your first weekly roster to start scheduling shifts</p>
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            Create First Roster
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rosters.map(roster => {
            const stats = getRosterStats(roster);
            return (
              <Card
                key={roster.roster_id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/employer/rosters/${roster.roster_id}`)}
              >
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(roster.status)}`}>
                    {roster.status}
                  </span>
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>

                {/* Roster Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{roster.title}</h3>

                {/* Workplace */}
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <MapPin className="w-4 h-4 mr-1" />
                  {roster.workplace_name}
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Shifts:</span>
                    <span className="font-medium text-gray-900">{stats.totalShifts}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Assigned:</span>
                    <span className="font-medium text-green-600">{stats.assignedShifts}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Open:</span>
                    <span className="font-medium text-orange-600">{stats.openShifts}</span>
                  </div>
                </div>

                {/* Roles */}
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  {roster.roles?.length || 0} role(s)
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Roster Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Create New Roster</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workplace *
                </label>
                <select
                  value={createData.workplace_id}
                  onChange={(e) => setCreateData({...createData, workplace_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select workplace...</option>
                  {Array.isArray(workplaces) && workplaces.map(wp => (
                    <option key={wp.id} value={wp.id}>{wp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Week Start Date (Monday) *
                </label>
                <input
                  type="date"
                  value={createData.week_start_date}
                  onChange={(e) => setCreateData({...createData, week_start_date: e.target.value})}
                  min={getNextMonday()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Select a Monday to start the week</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={createData.notes}
                  onChange={(e) => setCreateData({...createData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this roster..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRoster}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!createData.workplace_id || !createData.week_start_date}
              >
                Create Roster
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterManagement;