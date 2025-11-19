import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Plus, Calendar, Users } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const RosterDetail = () => {
  const { rosterId } = useParams();
  const navigate = useNavigate();
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/employer/rosters')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rosters
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{roster.title}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Total Roles</div>
          <div className="text-2xl font-bold text-gray-900">{roster.roles?.length || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Total Shifts</div>
          <div className="text-2xl font-bold text-gray-900">{roster.shifts?.length || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Assigned</div>
          <div className="text-2xl font-bold text-green-600">
            {roster.shifts?.filter(s => s.workforce_id).length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Open Shifts</div>
          <div className="text-2xl font-bold text-orange-600">
            {roster.shifts?.filter(s => !s.workforce_id).length || 0}
          </div>
        </Card>
      </div>

      {roster.roles?.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Roles Yet</h3>
          <p className="text-gray-600 mb-6">Add roles/positions to start creating shifts</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {roster.roles?.map(role => (
            <Card key={role.role_id} className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">{role.role_name}</h3>
              {role.description && (
                <p className="text-sm text-gray-600 mt-1">{role.description}</p>
              )}
              <div className="text-sm text-gray-600 mt-2">
                Positions: {role.positions_filled}/{role.positions_needed}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RosterDetail;
