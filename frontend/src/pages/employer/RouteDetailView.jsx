import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Clock, User, CheckCircle2, Circle,
  AlertTriangle, Navigation, Phone, Camera, FileSignature,
  Play, RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  scheduled: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  paused: 'bg-yellow-100 text-yellow-700'
};

const stopStatusColors = {
  pending: 'bg-gray-100 text-gray-600',
  in_transit: 'bg-blue-100 text-blue-600',
  arrived: 'bg-amber-100 text-amber-600',
  completed: 'bg-green-100 text-green-600',
  skipped: 'bg-red-100 text-red-600'
};

// TaskItem component - defined outside main component
const TaskItem = ({ task }) => (
  <div className={`flex items-center gap-3 p-2 rounded ${task.completed ? 'bg-green-50' : 'bg-gray-50'}`}>
    {task.completed ? (
      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
    ) : (
      <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
    )}
    <div className="flex-1">
      <p className={`text-sm ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
        {task.title}
      </p>
      {task.task_type !== 'checklist' && (
        <span className="text-xs text-gray-400 capitalize">{task.task_type.replace('_', ' ')}</span>
      )}
    </div>
    {task.completed && task.completed_at && (
      <span className="text-xs text-gray-400">
        {new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    )}
  </div>
);

// StopCard component - defined outside main component
const StopCard = ({ stop, index, currentStopIndex, routeStatus }) => {
  const statusColor = stopStatusColors[stop.status] || stopStatusColors.pending;
  const isActive = currentStopIndex === index && routeStatus === 'in_progress';
  
  return (
    <div 
      className={`border rounded-lg p-4 ${isActive ? 'border-[#ff5f00] bg-orange-50' : 'bg-white'}`}
      data-testid={`stop-${stop.stop_id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
            stop.status === 'completed' ? 'bg-green-500 text-white' :
            stop.status === 'skipped' ? 'bg-red-500 text-white' :
            isActive ? 'bg-[#ff5f00] text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {stop.status === 'completed' ? '✓' : stop.status === 'skipped' ? '✕' : index + 1}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{stop.stop_name || `Stop ${index + 1}`}</h4>
            <p className="text-sm text-gray-500">{stop.location?.address}</p>
          </div>
        </div>
        <Badge className={statusColor}>{stop.status}</Badge>
      </div>

      {(stop.customer_name || stop.customer_phone) && (
        <div className="flex items-center gap-4 mb-3 text-sm">
          {stop.customer_name && (
            <span className="flex items-center gap-1 text-gray-600">
              <User className="w-4 h-4" /> {stop.customer_name}
            </span>
          )}
          {stop.customer_phone && (
            <a href={`tel:${stop.customer_phone}`} className="flex items-center gap-1 text-blue-600">
              <Phone className="w-4 h-4" /> {stop.customer_phone}
            </a>
          )}
        </div>
      )}

      <div className="flex gap-4 mb-3 text-sm text-gray-500">
        {stop.actual_arrival && (
          <span>Arrived: {new Date(stop.actual_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        )}
        {stop.actual_departure && (
          <span>Left: {new Date(stop.actual_departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        )}
        <span>Est. Duration: {stop.estimated_duration_minutes} min</span>
      </div>

      {stop.verification && (stop.verification.gps_confirmed || stop.verification.photo_proof?.length > 0 || stop.verification.signature) && (
        <div className="flex gap-2 mb-3">
          {stop.verification.gps_confirmed && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <MapPin className="w-3 h-3 mr-1" /> GPS Verified
            </Badge>
          )}
          {stop.verification.photo_proof?.length > 0 && (
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              <Camera className="w-3 h-3 mr-1" /> {stop.verification.photo_proof.length} Photo(s)
            </Badge>
          )}
          {stop.verification.signature && (
            <Badge variant="outline" className="text-purple-600 border-purple-600">
              <FileSignature className="w-3 h-3 mr-1" /> Signed
            </Badge>
          )}
        </div>
      )}

      {stop.skip_reason && (
        <div className="p-2 bg-red-50 rounded text-sm text-red-600 mb-3">
          Skip reason: {stop.skip_reason}
        </div>
      )}

      {stop.tasks && stop.tasks.length > 0 && (
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Tasks</p>
          {stop.tasks.map((task, i) => (
            <TaskItem key={i} task={task} />
          ))}
        </div>
      )}
    </div>
  );
};

const RouteDetailView = () => {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(null);

  const fetchRoute = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/field-service/routes/${routeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setRoute(data.data.route);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      toast({ title: 'Error', description: 'Failed to load route', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [routeId, toast]);

  const fetchTracking = useCallback(async () => {
    if (!route || route.status !== 'in_progress') return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/field-service/routes/${routeId}/tracking`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTracking(data.data);
      }
    } catch (error) {
      console.error('Error fetching tracking:', error);
    }
  }, [routeId, route]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  useEffect(() => {
    if (route?.status === 'in_progress') {
      fetchTracking();
      const interval = setInterval(fetchTracking, 15000);
      return () => clearInterval(interval);
    }
  }, [route?.status, fetchTracking]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#ff5f00] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Route not found</h2>
          <Button onClick={() => navigate('/employer/field-service')}>Back to Routes</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/employer/field-service')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{route.route_name}</h1>
              <Badge className={statusColors[route.status]}>{route.status.replace('_', ' ')}</Badge>
            </div>
            <p className="text-gray-500">{route.route_type.replace('_', ' ')} • {route.scheduled_date}</p>
          </div>
          <Button variant="outline" onClick={fetchRoute}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{Math.round(route.completion_percentage || 0)}%</p>
              <p className="text-sm text-gray-500">Complete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">
                {route.stops?.filter(s => s.status === 'completed').length || 0}/{route.stops?.length || 0}
              </p>
              <p className="text-sm text-gray-500">Stops</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{route.actual_distance_km || route.estimated_distance_km || 0}</p>
              <p className="text-sm text-gray-500">km {route.actual_distance_km ? '(actual)' : '(est.)'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">
                {route.actual_duration_minutes || route.estimated_duration_minutes || '-'}
              </p>
              <p className="text-sm text-gray-500">min {route.actual_duration_minutes ? '(actual)' : '(est.)'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Worker Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{route.worker_name || 'Unassigned'}</p>
                  <p className="text-sm text-gray-500">Assigned Worker</p>
                </div>
              </div>
              {tracking?.last_known_location && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Last Location Update</p>
                  <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <Navigation className="w-4 h-4" />
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Beginning Tasks */}
        {route.beginning_tasks && route.beginning_tasks.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-500" />
                Beginning Tasks
                <span className="text-sm font-normal text-gray-500">
                  ({route.beginning_tasks.filter(t => t.completed).length}/{route.beginning_tasks.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {route.beginning_tasks.map((task, i) => (
                <TaskItem key={i} task={task} type="beginning" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Stops */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-500" />
              Route Stops
              <span className="text-sm font-normal text-gray-500">
                ({route.stops?.filter(s => s.status === 'completed').length || 0}/{route.stops?.length || 0})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {route.stops?.map((stop, i) => (
              <StopCard key={stop.stop_id} stop={stop} index={i} />
            ))}
          </CardContent>
        </Card>

        {/* Ending Tasks */}
        {route.ending_tasks && route.ending_tasks.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-500" />
                Ending Tasks
                <span className="text-sm font-normal text-gray-500">
                  ({route.ending_tasks.filter(t => t.completed).length}/{route.ending_tasks.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {route.ending_tasks.map((task, i) => (
                <TaskItem key={i} task={task} type="ending" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Issues */}
        {route.issues_reported && route.issues_reported.length > 0 && (
          <Card className="mb-6 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="w-5 h-5" />
                Issues Reported ({route.issues_reported.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {route.issues_reported.map((issue, i) => (
                  <div key={i} className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800">{issue.type}</p>
                    <p className="text-sm text-yellow-700">{issue.description}</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      {new Date(issue.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RouteDetailView;
