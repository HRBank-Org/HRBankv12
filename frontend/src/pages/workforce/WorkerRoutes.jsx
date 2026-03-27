import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Clock, ChevronRight, Truck, Shield, Sparkles,
  Building2, Calendar, AlertCircle, Play
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import WorkforceLayout from '../../components/layout/WorkforceLayout';

import { useLanguage } from '../../contexts/LanguageContext';

const API = process.env.REACT_APP_BACKEND_URL;

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
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700'
};

// RouteCard component - defined outside main component  
const RouteCard = ({ route, onNavigate }) => {
  const Icon = routeTypeIcons[route.route_type] || MapPin;
  const statusColor = statusColors[route.status] || statusColors.scheduled;
  const completedStops = route.stops?.filter(s => s.status === 'completed').length || 0;
  const totalStops = route.stops?.length || 0;
  const isActive = route.status === 'in_progress';

  return (
    <Card 
      className={`cursor-pointer transition-all ${isActive ? 'border-2 border-green-500 shadow-lg' : 'hover:shadow-md'}`}
      onClick={() => onNavigate(route.route_id)}
      data-testid={`worker-route-${route.route_id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isActive ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{route.route_name}</h3>
              <p className="text-sm text-gray-500 capitalize">{route.route_type.replace('_', ' ')}</p>
            </div>
          </div>
          <Badge className={statusColor}>{route.status.replace('_', ' ')}</Badge>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">{completedStops} of {totalStops} stops</span>
            <span className="font-medium">{Math.round(route.completion_percentage || 0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${isActive ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${route.completion_percentage || 0}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{new Date(route.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>{route.estimated_distance_km || 0} km</span>
          </div>
        </div>

        {isActive && (
          <Button className="w-full mt-3 bg-green-500 hover:bg-green-600">
            Continue Route <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const WorkerRoutes = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState(null);

  const fetchRoutes = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`${API}/api/field-service/routes?date=${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setRoutes(data.data.routes);
        // Find active route
        const active = data.data.routes.find(r => r.status === 'in_progress');
        setActiveRoute(active);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const handleNavigate = (routeId) => {
    navigate(`/workforce/routes/${routeId}`);
  };

  if (loading) {
    return (
      <WorkforceLayout title="My Routes">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#ff5f00] border-t-transparent rounded-full" />
        </div>
      </WorkforceLayout>
    );
  }

  return (
    <WorkforceLayout title="My Routes">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-gray-500 flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Active Route Banner */}
        {activeRoute && (
          <Card className="mb-4 bg-green-50 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium">Route in progress</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Routes List */}
        {routes.length > 0 ? (
          <div className="space-y-4">
            {routes.map(route => (
              <RouteCard key={route.route_id} route={route} onNavigate={handleNavigate} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">No routes today</h3>
              <p className="text-gray-500 text-sm">Check back later for assigned routes</p>
            </CardContent>
          </Card>
        )}
      </div>
    </WorkforceLayout>
  );
};

export default WorkerRoutes;
