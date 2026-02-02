import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowLeft, Plus, Briefcase, Clock, CheckCircle, AlertCircle,
  Home, Calendar, FileText, TrendingUp, Users, Target,
  ChevronRight, MoreVertical, RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  submitted: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  scheduled: 'bg-purple-100 text-purple-700',
  assigned: 'bg-indigo-100 text-indigo-700'
};

export default function RemoteWork() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workplaces, setWorkplaces] = useState([]);
  const [newShift, setNewShift] = useState({
    workplace_id: '',
    position_title: '',
    start_date: '',
    end_date: '',
    hourly_rate: 25,
    expected_hours: 40,
    deliverables: []
  });
  const [newDeliverable, setNewDeliverable] = useState({
    title: '',
    description: '',
    estimated_hours: 0,
    priority: 'medium'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchShifts(),
        fetchSummary(),
        fetchWorkplaces()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchShifts = async () => {
    const res = await fetch(`${API_URL}/api/remote-work/shifts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      setShifts(data.data.shifts);
    }
  };

  const fetchSummary = async () => {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const res = await fetch(
      `${API_URL}/api/remote-work/reports/summary?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (data.success) {
      setSummary(data.data);
    }
  };

  const fetchWorkplaces = async () => {
    const res = await fetch(`${API_URL}/api/employer/workplaces`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      setWorkplaces(data.data.workplaces || []);
    }
  };

  const addDeliverable = () => {
    if (!newDeliverable.title) return;
    setNewShift(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, { ...newDeliverable }]
    }));
    setNewDeliverable({ title: '', description: '', estimated_hours: 0, priority: 'medium' });
  };

  const removeDeliverable = (index) => {
    setNewShift(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }));
  };

  const createShift = async () => {
    if (!newShift.workplace_id || !newShift.position_title || !newShift.start_date || !newShift.end_date) {
      alert('Please fill all required fields');
      return;
    }

    const res = await fetch(`${API_URL}/api/remote-work/shifts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newShift)
    });

    const data = await res.json();
    if (data.success) {
      setShowCreateModal(false);
      setNewShift({
        workplace_id: '',
        position_title: '',
        start_date: '',
        end_date: '',
        hourly_rate: 25,
        expected_hours: 40,
        deliverables: []
      });
      fetchData();
    } else {
      alert(data.detail || 'Failed to create shift');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/employer/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Home className="w-6 h-6" />
                Remote Work Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400">Manage white-collar remote positions with deliverables</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Remote Shift
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Shifts</p>
                    <p className="text-xl font-bold">{summary.total_shifts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Hours Logged</p>
                    <p className="text-xl font-bold">{summary.total_actual_hours} / {summary.total_expected_hours}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Deliverables</p>
                    <p className="text-xl font-bold">{summary.completed_deliverables} / {summary.total_deliverables}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completion Rate</p>
                    <p className="text-xl font-bold">{summary.completion_rate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Approved</p>
                    <p className="text-xl font-bold">{summary.approved_deliverables}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Shifts List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Remote Shifts</CardTitle>
                <CardDescription>Manage remote work assignments and track deliverables</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : shifts.length === 0 ? (
              <div className="text-center py-12">
                <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Remote Shifts</h3>
                <p className="text-gray-500 mb-4">Create your first remote work shift with deliverables</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Remote Shift
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {shifts.map((shift) => (
                  <div 
                    key={shift.shift_id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/employer/remote-work/${shift.shift_id}`)}
                    data-testid={`remote-shift-${shift.shift_id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{shift.position_title}</h3>
                          <Badge className={STATUS_COLORS[shift.status] || 'bg-gray-100'}>
                            {shift.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {shift.start_date} - {shift.end_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {shift.actual_hours || 0} / {shift.expected_hours} hrs
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            {shift.completed_deliverables || 0} / {shift.total_deliverables || 0} deliverables
                          </span>
                        </div>
                        
                        {/* Deliverables preview */}
                        <div className="flex flex-wrap gap-2">
                          {shift.deliverables?.slice(0, 3).map((d, i) => (
                            <Badge key={i} variant="outline" className={PRIORITY_COLORS[d.priority]}>
                              {d.title}
                            </Badge>
                          ))}
                          {shift.deliverables?.length > 3 && (
                            <Badge variant="outline">+{shift.deliverables.length - 3} more</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Rate</p>
                        <p className="font-bold text-lg">${shift.hourly_rate}/hr</p>
                        {shift.worker_name && (
                          <p className="text-sm text-gray-500 mt-2">
                            <Users className="w-4 h-4 inline mr-1" />
                            {shift.worker_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Create Remote Work Shift</h2>
              
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Workplace *</label>
                    <select 
                      value={newShift.workplace_id}
                      onChange={(e) => setNewShift({ ...newShift, workplace_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700"
                    >
                      <option value="">Select workplace</option>
                      {workplaces.map(wp => (
                        <option key={wp.workplace_id} value={wp.workplace_id}>
                          {wp.workplace_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Position Title *</label>
                    <input
                      type="text"
                      value={newShift.position_title}
                      onChange={(e) => setNewShift({ ...newShift, position_title: e.target.value })}
                      placeholder="e.g., Remote Software Developer"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={newShift.start_date}
                      onChange={(e) => setNewShift({ ...newShift, start_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date *</label>
                    <input
                      type="date"
                      value={newShift.end_date}
                      onChange={(e) => setNewShift({ ...newShift, end_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Hourly Rate ($)</label>
                    <input
                      type="number"
                      value={newShift.hourly_rate}
                      onChange={(e) => setNewShift({ ...newShift, hourly_rate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Expected Hours</label>
                    <input
                      type="number"
                      value={newShift.expected_hours}
                      onChange={(e) => setNewShift({ ...newShift, expected_hours: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
                
                {/* Deliverables */}
                <div>
                  <h3 className="font-medium mb-2">Deliverables</h3>
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Title"
                        value={newDeliverable.title}
                        onChange={(e) => setNewDeliverable({ ...newDeliverable, title: e.target.value })}
                        className="px-2 py-1 border rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={newDeliverable.description}
                        onChange={(e) => setNewDeliverable({ ...newDeliverable, description: e.target.value })}
                        className="px-2 py-1 border rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Est. hours"
                        value={newDeliverable.estimated_hours}
                        onChange={(e) => setNewDeliverable({ ...newDeliverable, estimated_hours: parseFloat(e.target.value) })}
                        className="px-2 py-1 border rounded text-sm"
                      />
                      <select
                        value={newDeliverable.priority}
                        onChange={(e) => setNewDeliverable({ ...newDeliverable, priority: e.target.value })}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addDeliverable}>
                      <Plus className="w-4 h-4 mr-1" /> Add Deliverable
                    </Button>
                    
                    {newShift.deliverables.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {newShift.deliverables.map((d, i) => (
                          <div key={i} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded">
                            <div className="flex items-center gap-2">
                              <Badge className={PRIORITY_COLORS[d.priority]}>{d.priority}</Badge>
                              <span className="font-medium">{d.title}</span>
                              {d.estimated_hours > 0 && (
                                <span className="text-gray-500 text-sm">({d.estimated_hours}h)</span>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => removeDeliverable(i)}>
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={createShift} className="bg-indigo-600 hover:bg-indigo-700">
                  Create Remote Shift
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
