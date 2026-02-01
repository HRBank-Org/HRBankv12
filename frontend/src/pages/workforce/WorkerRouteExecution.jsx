import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Clock, CheckCircle2, Circle, Play, Pause,
  Navigation, Camera, FileSignature, Phone, AlertTriangle,
  ChevronRight, ChevronDown, ChevronUp, SkipForward, Check,
  Loader2, MapPinOff
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const WorkerRouteExecution = () => {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const watchIdRef = useRef(null);
  
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    beginning: true,
    stops: true,
    ending: false
  });
  const [skipReason, setSkipReason] = useState('');
  const [showSkipModal, setShowSkipModal] = useState(null);

  const fetchRoute = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
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

  // GPS tracking
  useEffect(() => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError(error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }
    
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Send GPS updates when route is in progress
  useEffect(() => {
    if (route?.status === 'in_progress' && currentLocation) {
      const interval = setInterval(async () => {
        try {
          const token = localStorage.getItem('access_token');
          await fetch(`${API}/api/field-service/routes/${routeId}/gps`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              lat: currentLocation.lat,
              lng: currentLocation.lng,
              accuracy_meters: currentLocation.accuracy
            })
          });
        } catch (error) {
          console.error('GPS update failed:', error);
        }
      }, 30000); // Every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [route?.status, currentLocation, routeId]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  const startRoute = async () => {
    setProcessingAction('start');
    try {
      const token = localStorage.getItem('access_token');
      const body = currentLocation ? {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        accuracy_meters: currentLocation.accuracy
      } : {};
      
      const response = await fetch(`${API}/api/field-service/routes/${routeId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Route Started', description: 'GPS tracking is now active' });
        fetchRoute();
      } else {
        toast({ title: 'Error', description: data.detail || 'Failed to start route', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to start route', variant: 'destructive' });
    } finally {
      setProcessingAction(null);
    }
  };

  const completeTask = async (taskId, taskLocation) => {
    setProcessingAction(`task-${taskId}`);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API}/api/field-service/routes/${routeId}/tasks/${taskId}/complete?task_location=${taskLocation}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        fetchRoute();
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to complete task', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to complete task', variant: 'destructive' });
    } finally {
      setProcessingAction(null);
    }
  };

  const arriveAtStop = async (stopId) => {
    if (!currentLocation) {
      toast({ title: 'Location Required', description: 'Please enable location services', variant: 'destructive' });
      return;
    }
    
    setProcessingAction(`arrive-${stopId}`);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API}/api/field-service/routes/${routeId}/stops/${stopId}/arrive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          accuracy_meters: currentLocation.accuracy
        })
      });
      const data = await response.json();
      if (data.success) {
        const gpsVerified = data.data.gps_confirmed;
        toast({ 
          title: gpsVerified ? 'Arrival Verified' : 'Arrived (Outside Geofence)',
          description: gpsVerified ? 'GPS location confirmed' : `${Math.round(data.data.distance_meters)}m from stop`
        });
        fetchRoute();
      } else {
        toast({ title: 'Error', description: data.detail || 'Failed to mark arrival', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark arrival', variant: 'destructive' });
    } finally {
      setProcessingAction(null);
    }
  };

  const completeStop = async (stopId) => {
    setProcessingAction(`complete-${stopId}`);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API}/api/field-service/routes/${routeId}/stops/${stopId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Stop Completed' });
        fetchRoute();
      } else {
        toast({ title: 'Incomplete Tasks', description: data.error || 'Complete all required tasks first', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to complete stop', variant: 'destructive' });
    } finally {
      setProcessingAction(null);
    }
  };

  const skipStop = async (stopId) => {
    if (!skipReason.trim()) {
      toast({ title: 'Reason Required', description: 'Please provide a skip reason', variant: 'destructive' });
      return;
    }
    
    setProcessingAction(`skip-${stopId}`);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API}/api/field-service/routes/${routeId}/stops/${stopId}/skip?reason=${encodeURIComponent(skipReason)}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Stop Skipped' });
        setShowSkipModal(null);
        setSkipReason('');
        fetchRoute();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to skip stop', variant: 'destructive' });
    } finally {
      setProcessingAction(null);
    }
  };

  const completeRoute = async () => {
    setProcessingAction('complete-route');
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API}/api/field-service/routes/${routeId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Route Completed!', description: 'Great job!' });
        navigate('/workforce/routes');
      } else {
        toast({ title: 'Cannot Complete', description: data.error || 'Complete all required items first', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to complete route', variant: 'destructive' });
    } finally {
      setProcessingAction(null);
    }
  };

  const openNavigation = (stop) => {
    const { lat, lng, address } = stop.location || {};
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else if (address) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff5f00]" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900">Route not found</h3>
            <Button className="mt-4" onClick={() => navigate('/workforce/routes')}>Back to Routes</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allBeginningDone = route.beginning_tasks?.every(t => t.completed) ?? true;
  const allStopsDone = route.stops?.every(s => s.status === 'completed' || s.status === 'skipped') ?? true;
  const allEndingDone = route.ending_tasks?.every(t => t.completed) ?? true;
  const canComplete = allBeginningDone && allStopsDone && allEndingDone;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/workforce/routes')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-gray-900">{route.route_name}</h1>
              <p className="text-sm text-gray-500">{Math.round(route.completion_percentage || 0)}% complete</p>
            </div>
            {route.status === 'in_progress' && (
              <Badge className="bg-green-100 text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                Active
              </Badge>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${route.completion_percentage || 0}%` }}
            />
          </div>

          {/* GPS Status */}
          <div className="flex items-center gap-2 mt-2 text-sm">
            {currentLocation ? (
              <span className="text-green-600 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> GPS Active
              </span>
            ) : locationError ? (
              <span className="text-red-600 flex items-center gap-1">
                <MapPinOff className="w-3 h-3" /> {locationError}
              </span>
            ) : (
              <span className="text-yellow-600 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Acquiring GPS...
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Start Route Button */}
        {route.status === 'scheduled' && (
          <Card className="border-2 border-dashed border-green-300 bg-green-50">
            <CardContent className="p-6 text-center">
              <Play className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">Ready to Start?</h3>
              <p className="text-gray-600 text-sm mb-4">Begin your route and start GPS tracking</p>
              <Button 
                className="bg-green-500 hover:bg-green-600 w-full"
                onClick={startRoute}
                disabled={processingAction === 'start'}
              >
                {processingAction === 'start' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Start Route
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Beginning Tasks */}
        <Card>
          <CardHeader 
            className="cursor-pointer py-3"
            onClick={() => setExpandedSections(s => ({ ...s, beginning: !s.beginning }))}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {allBeginningDone ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
                Before You Go
                <span className="text-sm font-normal text-gray-500">
                  ({route.beginning_tasks?.filter(t => t.completed).length || 0}/{route.beginning_tasks?.length || 0})
                </span>
              </CardTitle>
              {expandedSections.beginning ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.beginning && route.beginning_tasks?.length > 0 && (
            <CardContent className="pt-0 space-y-2">
              {route.beginning_tasks.map((task) => (
                <div 
                  key={task.task_id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${task.completed ? 'bg-green-50' : 'bg-gray-50'}`}
                >
                  <button
                    onClick={() => !task.completed && route.status === 'in_progress' && completeTask(task.task_id, 'beginning')}
                    disabled={task.completed || route.status !== 'in_progress' || processingAction === `task-${task.task_id}`}
                    className="flex-shrink-0"
                  >
                    {processingAction === `task-${task.task_id}` ? (
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    ) : task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300 hover:text-green-400" />
                    )}
                  </button>
                  <span className={task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}>
                    {task.title}
                  </span>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Stops */}
        <Card>
          <CardHeader 
            className="cursor-pointer py-3"
            onClick={() => setExpandedSections(s => ({ ...s, stops: !s.stops }))}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                Stops
                <span className="text-sm font-normal text-gray-500">
                  ({route.stops?.filter(s => s.status === 'completed').length || 0}/{route.stops?.length || 0})
                </span>
              </CardTitle>
              {expandedSections.stops ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.stops && (
            <CardContent className="pt-0 space-y-3">
              {route.stops?.map((stop, index) => {
                const isCompleted = stop.status === 'completed';
                const isSkipped = stop.status === 'skipped';
                const isArrived = stop.status === 'arrived';
                const isPending = stop.status === 'pending' || stop.status === 'in_transit';
                const isCurrentStop = route.current_stop_index === index;
                
                return (
                  <div 
                    key={stop.stop_id}
                    className={`rounded-lg border p-4 ${
                      isCompleted ? 'bg-green-50 border-green-200' :
                      isSkipped ? 'bg-red-50 border-red-200' :
                      isCurrentStop && route.status === 'in_progress' ? 'bg-blue-50 border-blue-300' :
                      'bg-white border-gray-200'
                    }`}
                  >
                    {/* Stop Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        isCompleted ? 'bg-green-500 text-white' :
                        isSkipped ? 'bg-red-500 text-white' :
                        isArrived ? 'bg-blue-500 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {isCompleted ? '✓' : isSkipped ? '✕' : index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{stop.stop_name || `Stop ${index + 1}`}</h4>
                        <p className="text-sm text-gray-500">{stop.location?.address}</p>
                        {stop.customer_name && (
                          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                            {stop.customer_name}
                            {stop.customer_phone && (
                              <a href={`tel:${stop.customer_phone}`} className="text-blue-600 ml-2">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tasks at Stop */}
                    {isArrived && stop.tasks?.length > 0 && (
                      <div className="space-y-2 mb-3 pl-11">
                        {stop.tasks.map((task) => (
                          <div 
                            key={task.task_id}
                            className={`flex items-center gap-2 p-2 rounded ${task.completed ? 'bg-green-100' : 'bg-white'}`}
                          >
                            <button
                              onClick={() => !task.completed && completeTask(task.task_id, stop.stop_id)}
                              disabled={task.completed || processingAction === `task-${task.task_id}`}
                            >
                              {processingAction === `task-${task.task_id}` ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-300" />
                              )}
                            </button>
                            <span className={`text-sm ${task.completed ? 'line-through text-gray-500' : ''}`}>
                              {task.title}
                            </span>
                            {task.task_type === 'photo' && <Camera className="w-4 h-4 text-gray-400" />}
                            {task.task_type === 'signature' && <FileSignature className="w-4 h-4 text-gray-400" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Skip Reason */}
                    {isSkipped && stop.skip_reason && (
                      <p className="text-sm text-red-600 pl-11 mb-3">Skipped: {stop.skip_reason}</p>
                    )}

                    {/* Actions */}
                    {route.status === 'in_progress' && !isCompleted && !isSkipped && (
                      <div className="flex gap-2 pl-11">
                        {isPending && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openNavigation(stop)}
                            >
                              <Navigation className="w-4 h-4 mr-1" /> Navigate
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => arriveAtStop(stop.stop_id)}
                              disabled={processingAction === `arrive-${stop.stop_id}`}
                            >
                              {processingAction === `arrive-${stop.stop_id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              ) : (
                                <MapPin className="w-4 h-4 mr-1" />
                              )}
                              I'm Here
                            </Button>
                          </>
                        )}
                        {isArrived && (
                          <>
                            <Button 
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() => completeStop(stop.stop_id)}
                              disabled={processingAction === `complete-${stop.stop_id}`}
                            >
                              {processingAction === `complete-${stop.stop_id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              ) : (
                                <Check className="w-4 h-4 mr-1" />
                              )}
                              Complete Stop
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => setShowSkipModal(stop.stop_id)}
                            >
                              <SkipForward className="w-4 h-4 mr-1" /> Skip
                            </Button>
                          </>
                        )}
                        {isPending && (
                          <Button 
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => setShowSkipModal(stop.stop_id)}
                          >
                            Skip
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>

        {/* Ending Tasks */}
        <Card>
          <CardHeader 
            className="cursor-pointer py-3"
            onClick={() => setExpandedSections(s => ({ ...s, ending: !s.ending }))}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {allEndingDone ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
                After Route
                <span className="text-sm font-normal text-gray-500">
                  ({route.ending_tasks?.filter(t => t.completed).length || 0}/{route.ending_tasks?.length || 0})
                </span>
              </CardTitle>
              {expandedSections.ending ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.ending && route.ending_tasks?.length > 0 && (
            <CardContent className="pt-0 space-y-2">
              {route.ending_tasks.map((task) => (
                <div 
                  key={task.task_id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${task.completed ? 'bg-green-50' : 'bg-gray-50'}`}
                >
                  <button
                    onClick={() => !task.completed && route.status === 'in_progress' && allStopsDone && completeTask(task.task_id, 'ending')}
                    disabled={task.completed || route.status !== 'in_progress' || !allStopsDone || processingAction === `task-${task.task_id}`}
                    className="flex-shrink-0"
                  >
                    {processingAction === `task-${task.task_id}` ? (
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    ) : task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300 hover:text-green-400" />
                    )}
                  </button>
                  <span className={task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}>
                    {task.title}
                  </span>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Skip Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Skip Stop?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Please provide a reason for skipping this stop.</p>
              <textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="e.g., Customer not available, Address incorrect..."
                className="w-full p-3 border rounded-lg mb-4"
                rows={3}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowSkipModal(null); setSkipReason(''); }}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  onClick={() => skipStop(showSkipModal)}
                  disabled={processingAction === `skip-${showSkipModal}`}
                >
                  {processingAction === `skip-${showSkipModal}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Skip Stop'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete Route Button */}
      {route.status === 'in_progress' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-lg mx-auto">
            <Button 
              className={`w-full h-12 text-lg ${canComplete ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300'}`}
              disabled={!canComplete || processingAction === 'complete-route'}
              onClick={completeRoute}
            >
              {processingAction === 'complete-route' ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              )}
              {canComplete ? 'Complete Route' : 'Complete All Items First'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerRouteExecution;
