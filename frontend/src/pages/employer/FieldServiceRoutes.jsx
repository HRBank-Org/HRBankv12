import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, MapPin, Clock, ChevronRight,
  CheckCircle2, AlertTriangle, Truck, Shield,
  Sparkles, Building2, Filter, Eye, Edit, Trash2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const routeTypeIcons = {
  delivery: Truck,
  security_patrol: Shield,
  cleaning: Sparkles,
  healthcare: Plus,
  field_sales: Building2,
  maintenance: Building2,
  custom: MapPin
};

const routeTypeColors = {
  delivery: 'bg-blue-100 text-blue-700',
  security_patrol: 'bg-purple-100 text-purple-700',
  cleaning: 'bg-green-100 text-green-700',
  healthcare: 'bg-red-100 text-red-700',
  field_sales: 'bg-orange-100 text-orange-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  custom: 'bg-gray-100 text-gray-700'
};

const statusColors = {
  scheduled: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  paused: 'bg-yellow-100 text-yellow-700'
};

// RouteCard component - defined outside main component
const RouteCard = ({ route, onDelete, onView, onEdit }) => {
  const Icon = routeTypeIcons[route.route_type] || MapPin;
  const typeColor = routeTypeColors[route.route_type] || routeTypeColors.custom;
  const statusColor = statusColors[route.status] || statusColors.scheduled;
  
  const completedStops = route.stops?.filter(s => s.status === 'completed').length || 0;
  const totalStops = route.stops?.length || 0;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`route-card-${route.route_id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${typeColor} flex items-center justify-center`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{route.route_name}</h3>
              <p className="text-sm text-gray-500">{route.worker_name || 'Unassigned'}</p>
            </div>
          </div>
          <Badge className={statusColor}>{route.status.replace('_', ' ')}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalStops}</p>
            <p className="text-xs text-gray-500">Stops</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{Math.round(route.completion_percentage || 0)}%</p>
            <p className="text-xs text-gray-500">Complete</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{route.estimated_distance_km || 0}</p>
            <p className="text-xs text-gray-500">km</p>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${route.completion_percentage || 0}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{new Date(route.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{completedStops}/{totalStops} stops</span>
          </div>
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onView(route.route_id)}>
            <Eye className="w-4 h-4 mr-1" /> View
          </Button>
          {route.status === 'in_progress' && (
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onView(route.route_id, true)}
            >
              <MapPin className="w-4 h-4 mr-1" /> Live
            </Button>
          )}
          {route.status === 'scheduled' && (
            <>
              <Button size="sm" variant="outline" onClick={() => onEdit(route.route_id)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:bg-red-50"
                onClick={() => onDelete(route.route_id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// LiveRouteCard component - defined outside main component
const LiveRouteCard = ({ route, onNavigate }) => {
  const Icon = routeTypeIcons[route.route_type] || MapPin;
  const timeStatusColor = {
    on_schedule: 'text-green-600',
    behind_schedule: 'text-red-600',
    ahead_of_schedule: 'text-blue-600'
  }[route.time_status] || 'text-gray-600';

  return (
    <div 
      className="flex items-center gap-4 p-3 bg-white rounded-lg border hover:shadow-sm cursor-pointer"
      onClick={() => onNavigate(route.route_id)}
      data-testid={`live-route-${route.route_id}`}
    >
      <div className={`w-3 h-3 rounded-full ${route.status === 'in_progress' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{route.route_name}</p>
        <p className="text-sm text-gray-500">{route.worker_name}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-gray-900">Stop {route.current_stop}/{route.total_stops}</p>
        <p className={`text-sm ${timeStatusColor}`}>
          {route.time_status.replace('_', ' ')}
        </p>
      </div>
      <div className="w-16">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{Math.round(route.completion_percentage)}%</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </div>
  );
};

const FieldServiceRoutes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    route_type: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [liveData, setLiveData] = useState(null);

  const fetchRoutes = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.route_type) params.append('route_type', filter.route_type);
      if (filter.date) params.append('date', filter.date);

      const response = await fetch(`${API}/api/field-service/routes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setRoutes(data.data.routes);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchLiveDashboard = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API}/api/field-service/dashboard/live`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setLiveData(data.data);
      }
    } catch (error) {
      console.error('Error fetching live dashboard:', error);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
    fetchLiveDashboard();
    
    const interval = setInterval(fetchLiveDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchRoutes, fetchLiveDashboard]);

  const deleteRoute = async (routeId) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API}/api/field-service/routes/${routeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Route deleted', description: 'Route has been removed' });
        fetchRoutes();
      } else {
        toast({ title: 'Error', description: data.detail || 'Failed to delete route', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete route', variant: 'destructive' });
    }
  };

  const handleViewRoute = (routeId, isLive = false) => {
    if (isLive) {
      navigate(`/employer/field-service/routes/${routeId}/tracking`);
    } else {
      navigate(`/employer/field-service/routes/${routeId}`);
    }
  };

  const handleEditRoute = (routeId) => {
    navigate(`/employer/field-service/routes/${routeId}/edit`);
  };

  const handleLiveRouteNavigate = (routeId) => {
    navigate(`/employer/field-service/routes/${routeId}/tracking`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Field Service Routes</h1>
            <p className="text-gray-500">Manage delivery, patrol, cleaning, and service routes</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => navigate('/employer/field-service/billing')}
              data-testid="billing-btn"
            >
              Billing
            </Button>
            <Button 
              onClick={() => navigate('/employer/field-service/routes/new')}
              className="bg-[#ff5f00] hover:bg-[#e55500]"
              data-testid="create-route-btn"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Route
            </Button>
          </div>
        </div>

        {/* Live Routes Dashboard */}
        {liveData && liveData.active_routes.length > 0 && (
          <Card className="mb-6 border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live Routes
                </CardTitle>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500">
                    <span className="font-bold text-gray-900">{liveData.summary.in_progress}</span> in progress
                  </span>
                  {liveData.summary.behind_schedule > 0 && (
                    <span className="text-red-600">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      {liveData.summary.behind_schedule} behind
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {liveData.active_routes.map(route => (
                <LiveRouteCard 
                  key={route.route_id} 
                  route={route} 
                  onNavigate={handleLiveRouteNavigate}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              
              <input
                type="date"
                value={filter.date}
                onChange={(e) => setFilter(f => ({ ...f, date: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              
              <select
                value={filter.status}
                onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              
              <select
                value={filter.route_type}
                onChange={(e) => setFilter(f => ({ ...f, route_type: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Types</option>
                <option value="delivery">Delivery</option>
                <option value="security_patrol">Security Patrol</option>
                <option value="cleaning">Cleaning</option>
                <option value="healthcare">Healthcare</option>
                <option value="field_sales">Field Sales</option>
                <option value="maintenance">Maintenance</option>
              </select>
              
              <Button variant="outline" size="sm" onClick={fetchRoutes}>
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Routes Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-48 bg-gray-100" />
              </Card>
            ))}
          </div>
        ) : routes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map(route => (
              <RouteCard 
                key={route.route_id} 
                route={route}
                onDelete={deleteRoute}
                onView={handleViewRoute}
                onEdit={handleEditRoute}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No routes found</h3>
              <p className="text-gray-500 mb-4">Create your first route to start managing field service operations</p>
              <Button onClick={() => navigate('/employer/field-service/routes/new')}>
                <Plus className="w-4 h-4 mr-2" /> Create Route
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FieldServiceRoutes;
