import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Button } from '../ui/button';
import { User, Search, X } from 'lucide-react';

const WorkforceAssignmentModal = ({ rosterId, shift, onClose, onSuccess }) => {
  const [workforceList, setWorkforceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadWorkforce();
  }, []);

  const loadWorkforce = async () => {
    try {
      // Get all workforce members (you can add filters later)
      const response = await api.get('/api/employer/workforce');
      setWorkforceList(response.data.data || []);
    } catch (error) {
      console.error('Failed to load workforce:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (workforceId) => {
    setAssigning(true);
    try {
      const response = await api.post(
        `/api/rosters/${rosterId}/shifts/${shift.shift_id}/assign`,
        { workforce_id: workforceId }
      );
      if (response.data.success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to assign workforce:', error);
      alert('Failed to assign workforce. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const filteredWorkforce = workforceList.filter(worker => 
    worker.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold mb-2">Assign Workforce</h3>
            <div className="text-sm text-gray-600">
              <p className="font-medium">{formatDate(shift.shift_date)}</p>
              <p>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search workforce by name or email..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Workforce List */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredWorkforce.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600">
              {searchTerm ? 'No workforce found matching your search' : 'No workforce members available'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredWorkforce.map(worker => (
              <div
                key={worker.user_id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {worker.profile_picture ? (
                    <img
                      src={worker.profile_picture}
                      alt={worker.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{worker.full_name}</p>
                    <p className="text-sm text-gray-600">{worker.email}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleAssign(worker.user_id)}
                  disabled={assigning}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {assigning ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkforceAssignmentModal;