import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, MapPin, Clock, Trash2, GripVertical, ChevronDown,
  ChevronUp, Save, ArrowLeft, Truck, Shield, Sparkles,
  Building2, CheckCircle2, X, Search, User
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const routeTypes = [
  { value: 'delivery', label: 'Delivery', icon: Truck, description: 'Last-mile delivery routes' },
  { value: 'security_patrol', label: 'Security Patrol', icon: Shield, description: 'Guard patrol checkpoints' },
  { value: 'cleaning', label: 'Cleaning', icon: Sparkles, description: 'Cleaning service locations' },
  { value: 'maintenance', label: 'Maintenance', icon: Building2, description: 'Field service calls' },
  { value: 'custom', label: 'Custom', icon: MapPin, description: 'Custom route type' }
];

const taskTypes = [
  { value: 'checklist', label: 'Checklist Item' },
  { value: 'photo', label: 'Photo Required' },
  { value: 'signature', label: 'Signature Required' },
  { value: 'barcode_scan', label: 'Barcode Scan' },
  { value: 'notes', label: 'Notes Entry' }
];

// TaskRow component - defined outside main component
const TaskRow = ({ task, index, onUpdate, onRemove }) => (
  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
    <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
    <Input
      placeholder="Task title"
      value={task.title}
      onChange={(e) => onUpdate(index, 'title', e.target.value)}
      className="flex-1"
    />
    <select
      value={task.task_type}
      onChange={(e) => onUpdate(index, 'task_type', e.target.value)}
      className="px-2 py-2 border rounded-lg text-sm"
    >
      {taskTypes.map(t => (
        <option key={t.value} value={t.value}>{t.label}</option>
      ))}
    </select>
    <label className="flex items-center gap-1 text-sm">
      <input
        type="checkbox"
        checked={task.required}
        onChange={(e) => onUpdate(index, 'required', e.target.checked)}
      />
      Required
    </label>
    <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
      <X className="w-4 h-4 text-red-500" />
    </Button>
  </div>
);

const CreateFieldServiceRoute = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  
  const [route, setRoute] = useState({
    route_name: '',
    route_type: 'delivery',
    route_description: '',
    workplace_id: '',
    worker_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_start_time: '09:00',
    scheduled_end_time: '17:00',
    tracking_enabled: true,
    beginning_tasks: [],
    stops: [],
    ending_tasks: []
  });

  const [expandedSections, setExpandedSections] = useState({
    beginning: true,
    stops: true,
    ending: true
  });

  useEffect(() => {
    fetchWorkers();
    fetchWorkplaces();
  }, []);

  const fetchWorkers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/employer/workforce`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setWorkers(data.data?.workers || []);
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const fetchWorkplaces = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/employer/workplaces`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setWorkplaces(data.data?.workplaces || []);
      }
    } catch (error) {
      console.error('Error fetching workplaces:', error);
    }
  };

  const addTask = (section) => {
    const newTask = {
      title: '',
      description: '',
      task_type: 'checklist',
      required: true
    };
    
    setRoute(r => ({
      ...r,
      [section]: [...r[section], newTask]
    }));
  };

  const updateTask = (section, index, field, value) => {
    setRoute(r => ({
      ...r,
      [section]: r[section].map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      )
    }));
  };

  const removeTask = (section, index) => {
    setRoute(r => ({
      ...r,
      [section]: r[section].filter((_, i) => i !== index)
    }));
  };

  const addStop = () => {
    const newStop = {
      stop_name: '',
      location: { lat: 0, lng: 0, address: '' },
      customer_name: '',
      customer_phone: '',
      customer_notes: '',
      estimated_duration_minutes: 15,
      tasks: []
    };
    
    setRoute(r => ({
      ...r,
      stops: [...r.stops, newStop]
    }));
  };

  const updateStop = (index, field, value) => {
    setRoute(r => ({
      ...r,
      stops: r.stops.map((stop, i) => 
        i === index ? { ...stop, [field]: value } : stop
      )
    }));
  };

  const removeStop = (index) => {
    setRoute(r => ({
      ...r,
      stops: r.stops.filter((_, i) => i !== index)
    }));
  };

  const addStopTask = (stopIndex) => {
    const newTask = {
      title: '',
      task_type: 'checklist',
      required: true
    };
    
    setRoute(r => ({
      ...r,
      stops: r.stops.map((stop, i) => 
        i === stopIndex ? { ...stop, tasks: [...stop.tasks, newTask] } : stop
      )
    }));
  };

  const updateStopTask = (stopIndex, taskIndex, field, value) => {
    setRoute(r => ({
      ...r,
      stops: r.stops.map((stop, i) => 
        i === stopIndex ? {
          ...stop,
          tasks: stop.tasks.map((task, j) => 
            j === taskIndex ? { ...task, [field]: value } : task
          )
        } : stop
      )
    }));
  };

  const removeStopTask = (stopIndex, taskIndex) => {
    setRoute(r => ({
      ...r,
      stops: r.stops.map((stop, i) => 
        i === stopIndex ? {
          ...stop,
          tasks: stop.tasks.filter((_, j) => j !== taskIndex)
        } : stop
      )
    }));
  };

  const moveStop = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= route.stops.length) return;
    
    const stops = [...route.stops];
    [stops[index], stops[newIndex]] = [stops[newIndex], stops[index]];
    setRoute(r => ({ ...r, stops }));
  };

  const handleSubmit = async () => {
    if (!route.route_name) {
      toast({ title: 'Error', description: 'Please enter a route name', variant: 'destructive' });
      return;
    }
    
    if (route.stops.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one stop', variant: 'destructive' });
      return;
    }

    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Build scheduled datetime
      const scheduledStart = `${route.scheduled_date}T${route.scheduled_start_time}:00`;
      const scheduledEnd = route.scheduled_end_time ? `${route.scheduled_date}T${route.scheduled_end_time}:00` : null;
      
      const payload = {
        route_name: route.route_name,
        route_type: route.route_type,
        route_description: route.route_description,
        workplace_id: route.workplace_id || null,
        worker_id: route.worker_id || null,
        scheduled_date: route.scheduled_date,
        scheduled_start_time: scheduledStart,
        scheduled_end_time: scheduledEnd,
        tracking_enabled: route.tracking_enabled,
        beginning_tasks: route.beginning_tasks.filter(t => t.title),
        stops: route.stops.map((stop, idx) => ({
          ...stop,
          sequence_order: idx,
          tasks: stop.tasks.filter(t => t.title)
        })),
        ending_tasks: route.ending_tasks.filter(t => t.title)
      };

      const response = await fetch(`${API}/api/field-service/routes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'Success', description: 'Route created successfully' });
        navigate('/employer/field-service');
      } else {
        toast({ title: 'Error', description: data.detail || 'Failed to create route', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create route', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/employer/field-service')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Route</h1>
            <p className="text-gray-500">Build a new field service route</p>
          </div>
        </div>

        {/* Route Type Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Route Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {routeTypes.map(type => {
                const Icon = type.icon;
                const isSelected = route.route_type === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setRoute(r => ({ ...r, route_type: type.value }))}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      isSelected 
                        ? 'border-[#ff5f00] bg-orange-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`route-type-${type.value}`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-[#ff5f00]' : 'text-gray-500'}`} />
                    <p className={`text-sm font-medium ${isSelected ? 'text-[#ff5f00]' : 'text-gray-700'}`}>
                      {type.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Route Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Route Name *</Label>
                <Input
                  placeholder="e.g., Morning Delivery Route"
                  value={route.route_name}
                  onChange={(e) => setRoute(r => ({ ...r, route_name: e.target.value }))}
                  data-testid="route-name-input"
                />
              </div>
              <div>
                <Label>Assign Worker</Label>
                <select
                  value={route.worker_id}
                  onChange={(e) => setRoute(r => ({ ...r, worker_id: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select worker (optional)</option>
                  {workers.map(w => (
                    <option key={w.user_id || w.workforce_id} value={w.user_id || w.workforce_id}>
                      {w.first_name} {w.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <textarea
                placeholder="Route description (optional)"
                value={route.route_description}
                onChange={(e) => setRoute(r => ({ ...r, route_description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={route.scheduled_date}
                  onChange={(e) => setRoute(r => ({ ...r, scheduled_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={route.scheduled_start_time}
                  onChange={(e) => setRoute(r => ({ ...r, scheduled_start_time: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={route.scheduled_end_time}
                  onChange={(e) => setRoute(r => ({ ...r, scheduled_end_time: e.target.value }))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={route.tracking_enabled}
                onChange={(e) => setRoute(r => ({ ...r, tracking_enabled: e.target.checked }))}
              />
              <span className="text-sm">Enable GPS tracking</span>
            </label>
          </CardContent>
        </Card>

        {/* Beginning Tasks */}
        <Card className="mb-6">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedSections(s => ({ ...s, beginning: !s.beginning }))}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                Beginning Tasks
                <span className="text-sm font-normal text-gray-500">
                  ({route.beginning_tasks.length})
                </span>
              </CardTitle>
              {expandedSections.beginning ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.beginning && (
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">Tasks to complete before starting the route</p>
              {route.beginning_tasks.map((task, i) => (
                <TaskRow
                  key={i}
                  task={task}
                  index={i}
                  section="beginning_tasks"
                  onUpdate={(idx, field, value) => updateTask('beginning_tasks', idx, field, value)}
                  onRemove={(idx) => removeTask('beginning_tasks', idx)}
                />
              ))}
              <Button variant="outline" size="sm" onClick={() => addTask('beginning_tasks')}>
                <Plus className="w-4 h-4 mr-1" /> Add Task
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Stops */}
        <Card className="mb-6">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedSections(s => ({ ...s, stops: !s.stops }))}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-500" />
                Route Stops
                <span className="text-sm font-normal text-gray-500">
                  ({route.stops.length})
                </span>
              </CardTitle>
              {expandedSections.stops ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.stops && (
            <CardContent className="space-y-4">
              {route.stops.map((stop, stopIndex) => (
                <div key={stopIndex} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#ff5f00] text-white flex items-center justify-center font-bold">
                        {stopIndex + 1}
                      </div>
                      <span className="font-medium">Stop {stopIndex + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStop(stopIndex, 'up')}
                        disabled={stopIndex === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStop(stopIndex, 'down')}
                        disabled={stopIndex === route.stops.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStop(stopIndex)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <Label className="text-xs">Stop Name</Label>
                      <Input
                        placeholder="e.g., Customer Location"
                        value={stop.stop_name}
                        onChange={(e) => updateStop(stopIndex, 'stop_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Address</Label>
                      <Input
                        placeholder="Street address"
                        value={stop.location?.address || ''}
                        onChange={(e) => updateStop(stopIndex, 'location', { ...stop.location, address: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <Label className="text-xs">Customer Name</Label>
                      <Input
                        placeholder="Name"
                        value={stop.customer_name}
                        onChange={(e) => updateStop(stopIndex, 'customer_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input
                        placeholder="Phone"
                        value={stop.customer_phone}
                        onChange={(e) => updateStop(stopIndex, 'customer_phone', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Duration (min)</Label>
                      <Input
                        type="number"
                        value={stop.estimated_duration_minutes}
                        onChange={(e) => updateStop(stopIndex, 'estimated_duration_minutes', parseInt(e.target.value) || 15)}
                      />
                    </div>
                  </div>

                  {/* Stop Tasks */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-medium mb-2">Tasks at this stop:</p>
                    <div className="space-y-2">
                      {stop.tasks.map((task, taskIndex) => (
                        <div key={taskIndex} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <Input
                            placeholder="Task title"
                            value={task.title}
                            onChange={(e) => updateStopTask(stopIndex, taskIndex, 'title', e.target.value)}
                            className="flex-1"
                          />
                          <select
                            value={task.task_type}
                            onChange={(e) => updateStopTask(stopIndex, taskIndex, 'task_type', e.target.value)}
                            className="px-2 py-2 border rounded text-sm"
                          >
                            {taskTypes.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                          <Button variant="ghost" size="sm" onClick={() => removeStopTask(stopIndex, taskIndex)}>
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addStopTask(stopIndex)}>
                        <Plus className="w-4 h-4 mr-1" /> Add Task
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              <Button onClick={addStop} className="w-full" variant="outline" data-testid="add-stop-btn">
                <Plus className="w-4 h-4 mr-2" /> Add Stop
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Ending Tasks */}
        <Card className="mb-6">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedSections(s => ({ ...s, ending: !s.ending }))}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-500" />
                Ending Tasks
                <span className="text-sm font-normal text-gray-500">
                  ({route.ending_tasks.length})
                </span>
              </CardTitle>
              {expandedSections.ending ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.ending && (
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">Tasks to complete after finishing the route</p>
              {route.ending_tasks.map((task, i) => (
                <TaskRow
                  key={i}
                  task={task}
                  index={i}
                  section="ending_tasks"
                  onUpdate={(idx, field, value) => updateTask('ending_tasks', idx, field, value)}
                  onRemove={(idx) => removeTask('ending_tasks', idx)}
                />
              ))}
              <Button variant="outline" size="sm" onClick={() => addTask('ending_tasks')}>
                <Plus className="w-4 h-4 mr-1" /> Add Task
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/employer/field-service')}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={saving}
            className="bg-[#ff5f00] hover:bg-[#e55500]"
            data-testid="save-route-btn"
          >
            {saving ? 'Creating...' : <><Save className="w-4 h-4 mr-2" /> Create Route</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateFieldServiceRoute;
