import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Navigation, Clock, User, Truck,
  Shield, Sparkles, Building2, AlertTriangle, CheckCircle2,
  Phone, RefreshCw, Play, Pause, Target, Route
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const routeTypeIcons = {
  delivery: Truck,
  security_patrol: Shield,
  cleaning: Sparkles,
  healthcare: Building2,
  field_sales: Building2,
  maintenance: Building2,
  custom: MapPin
};

const statusColors = {
  scheduled: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  paused: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700'
};

const stopStatusColors = {
  pending: 'bg-gray-400',
  in_transit: 'bg-blue-500',
  arrived: 'bg-amber-500',
  completed: 'bg-green-500',
  skipped: 'bg-red-500'
};

const LiveRouteTracking = () => {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const workerMarkerRef = useRef(null);
  
  const [route, setRoute] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load Google Maps script
  useEffect(() => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setMapLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

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
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  const fetchTracking = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
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
  }, [routeId]);

  useEffect(() => {
    fetchRoute();
    fetchTracking();
  }, [fetchRoute, fetchTracking]);

  useEffect(() => {
    if (autoRefresh && route?.status === 'in_progress') {
      const interval = setInterval(() => {
        fetchTracking();
        fetchRoute();
      }, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, route?.status, fetchTracking, fetchRoute]);

  // Initialize and update map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !route) return;

    const stops = route.stops || [];
    if (stops.length === 0) return;

    // Initialize map if not done
    if (!mapInstanceRef.current) {
      const firstStop = stops[0];
      const center = firstStop?.location?.lat && firstStop?.location?.lng
        ? { lat: firstStop.location.lat, lng: firstStop.location.lng }
        : { lat: 42.3149, lng: -83.0364 }; // Windsor default

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
        ]
      });
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create bounds
    const bounds = new window.google.maps.LatLngBounds();

    // Add stop markers
    stops.forEach((stop, index) => {
      if (!stop.location?.lat || !stop.location?.lng) return;

      const position = { lat: stop.location.lat, lng: stop.location.lng };
      bounds.extend(position);

      const isCompleted = stop.status === 'completed';
      const isSkipped = stop.status === 'skipped';
      const isCurrent = route.current_stop_index === index && route.status === 'in_progress';
      const isArrived = stop.status === 'arrived';

      // Create custom marker icon
      const markerColor = isCompleted ? '#22c55e' : isSkipped ? '#ef4444' : isCurrent ? '#ff5f00' : isArrived ? '#f59e0b' : '#9ca3af';
      
      const marker = new window.google.maps.Marker({
        position,
        map,
        label: {
          text: (index + 1).toString(),
          color: 'white',
          fontWeight: 'bold'
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isCurrent ? 18 : 14,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2
        },
        title: stop.stop_name || `Stop ${index + 1}`,
        zIndex: isCurrent ? 1000 : 100 - index
      });

      // Info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${stop.stop_name || `Stop ${index + 1}`}</h3>
            <p style="color: #666; font-size: 12px; margin-bottom: 4px;">${stop.location?.address || ''}</p>
            ${stop.customer_name ? `<p style="font-size: 12px;"><strong>Contact:</strong> ${stop.customer_name}</p>` : ''}
            <p style="font-size: 12px;"><strong>Status:</strong> <span style="color: ${markerColor};">${stop.status}</span></p>
            ${stop.actual_arrival ? `<p style="font-size: 12px;"><strong>Arrived:</strong> ${new Date(stop.actual_arrival).toLocaleTimeString()}</p>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Draw route polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const path = stops
      .filter(s => s.location?.lat && s.location?.lng)
      .map(s => ({ lat: s.location.lat, lng: s.location.lng }));

    if (path.length > 1) {
      polylineRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map
      });
    }

    // Add worker marker if tracking available
    if (tracking?.last_known_location) {
      if (workerMarkerRef.current) {
        workerMarkerRef.current.setMap(null);
      }

      const workerPos = { 
        lat: tracking.last_known_location.lat, 
        lng: tracking.last_known_location.lng 
      };
      bounds.extend(workerPos);

      workerMarkerRef.current = new window.google.maps.Marker({
        position: workerPos,
        map,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 8,
          fillColor: '#ff5f00',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
          rotation: 0
        },
        title: route.worker_name || 'Worker',
        zIndex: 2000
      });

      // Draw breadcrumb trail
      const breadcrumbs = tracking.gps_breadcrumbs || [];
      if (breadcrumbs.length > 1) {
        const trailPath = breadcrumbs.map(b => ({ lat: b.lat, lng: b.lng }));
        new window.google.maps.Polyline({
          path: trailPath,
          geodesic: true,
          strokeColor: '#ff5f00',
          strokeOpacity: 0.6,
          strokeWeight: 3,
          map
        });
      }
    }

    // Fit bounds
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50 });
    }

  }, [mapLoaded, route, tracking]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#ff5f00] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-4">Route not found</h2>
          <Button onClick={() => navigate('/employer/field-service')}>Back to Routes</Button>
        </div>
      </div>
    );
  }

  const Icon = routeTypeIcons[route.route_type] || MapPin;
  const completedStops = route.stops?.filter(s => s.status === 'completed').length || 0;
  const totalStops = route.stops?.length || 0;

  return (
    <div className="min-h-screen bg-gray-100" data-testid="live-route-tracking">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/employer/field-service')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#ff5f00] rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">{route.route_name}</h1>
                  <p className="text-sm text-gray-500">{route.route_type.replace('_', ' ')} • Live Tracking</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={statusColors[route.status]}>{route.status.replace('_', ' ')}</Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'border-green-500 text-green-600' : ''}
              >
                {autoRefresh ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
                {autoRefresh ? 'Live' : 'Paused'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { fetchRoute(); fetchTracking(); }}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-72px)]">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />
          
          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">Legend</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f00]" />
                <span>Current Stop</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Arrived</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Skipped</span>
              </div>
            </div>
          </div>

          {/* Worker Location Status */}
          {tracking?.last_known_location && (
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-900">
                  {route.worker_name || 'Worker'} is live
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Last update: {new Date().toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-white border-l overflow-y-auto">
          {/* Stats */}
          <div className="p-4 border-b">
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gray-50">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{Math.round(route.completion_percentage || 0)}%</p>
                  <p className="text-xs text-gray-500">Complete</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-50">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{completedStops}/{totalStops}</p>
                  <p className="text-xs text-gray-500">Stops</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Worker Info */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{route.worker_name || 'Unassigned'}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Started: {route.actual_start_time ? new Date(route.actual_start_time).toLocaleTimeString() : 'Not started'}</span>
                </div>
              </div>
              {route.status === 'in_progress' && (
                <Navigation className="w-5 h-5 text-green-500 animate-pulse" />
              )}
            </div>
          </div>

          {/* Stops List */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Route className="w-4 h-4" />
              Route Stops
            </h3>
            <div className="space-y-2">
              {route.stops?.map((stop, index) => {
                const isCompleted = stop.status === 'completed';
                const isCurrent = route.current_stop_index === index && route.status === 'in_progress';
                const isSkipped = stop.status === 'skipped';
                
                return (
                  <div 
                    key={stop.stop_id}
                    className={`p-3 rounded-lg border ${
                      isCurrent ? 'border-[#ff5f00] bg-orange-50' :
                      isCompleted ? 'border-green-200 bg-green-50' :
                      isSkipped ? 'border-red-200 bg-red-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                        stopStatusColors[stop.status]
                      }`}>
                        {isCompleted ? '✓' : isSkipped ? '✕' : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {stop.stop_name || `Stop ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {stop.location?.address}
                        </p>
                        {stop.customer_name && (
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{stop.customer_name}</span>
                            {stop.customer_phone && (
                              <a href={`tel:${stop.customer_phone}`} className="text-blue-600">
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                        {stop.actual_arrival && (
                          <p className="text-xs text-green-600 mt-1">
                            Arrived: {new Date(stop.actual_arrival).toLocaleTimeString()}
                          </p>
                        )}
                        {stop.skip_reason && (
                          <p className="text-xs text-red-600 mt-1">
                            Skipped: {stop.skip_reason}
                          </p>
                        )}
                      </div>
                      {stop.verification?.gps_confirmed && (
                        <Target className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    {/* Tasks progress */}
                    {stop.tasks && stop.tasks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Tasks</span>
                          <span className="font-medium">
                            {stop.tasks.filter(t => t.completed).length}/{stop.tasks.length}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ 
                              width: `${(stop.tasks.filter(t => t.completed).length / stop.tasks.length) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Issues */}
          {route.issues_reported && route.issues_reported.length > 0 && (
            <div className="p-4 border-t">
              <h3 className="font-semibold text-yellow-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Issues ({route.issues_reported.length})
              </h3>
              <div className="space-y-2">
                {route.issues_reported.map((issue, i) => (
                  <div key={i} className="p-2 bg-yellow-50 rounded text-sm">
                    <p className="font-medium text-yellow-800">{issue.type}</p>
                    <p className="text-yellow-700 text-xs">{issue.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveRouteTracking;
