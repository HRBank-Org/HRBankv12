import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import api from '../../utils/api';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import { FiMapPin, FiClock, FiCheckCircle, FiAlertCircle, FiNavigation, FiRefreshCw } from 'react-icons/fi';

const GEOFENCE_RADIUS = 50; // 50 meters

const ClockInOutNew = () => {
  const { shiftId } = useParams();
  const [searchParams] = useSearchParams();
  const shiftIdFromQuery = searchParams.get('shift');
  const activeShiftId = shiftId || shiftIdFromQuery;
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [shift, setShift] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  
  // Location state
  const [workerLocation, setWorkerLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [distance, setDistance] = useState(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  
  // Google Maps
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''
  });
  
  const [map, setMap] = useState(null);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get worker's current location
  const getCurrentLocation = useCallback(() => {
    setLoadingLocation(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLoadingLocation(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setWorkerLocation(loc);
        setLoadingLocation(false);
        
        // Calculate distance if we have workplace location
        if (shift?.workplace?.lat && shift?.workplace?.lng) {
          const dist = calculateDistance(
            loc.lat, loc.lng,
            parseFloat(shift.workplace.lat), parseFloat(shift.workplace.lng)
          );
          setDistance(dist);
          setIsWithinGeofence(dist <= GEOFENCE_RADIUS);
        }
      },
      (error) => {
        console.error('Location error:', error);
        setLocationError(
          error.code === 1 ? 'Location permission denied. Please enable location services.' :
          error.code === 2 ? 'Location unavailable. Please try again.' :
          error.code === 3 ? 'Location request timed out. Please try again.' :
          'Failed to get location'
        );
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [shift]);

  // Load shift data
  useEffect(() => {
    const loadData = async () => {
      if (!activeShiftId) {
        // Try to load today's shifts
        try {
          const res = await api.get('/api/attendance/my-attendance/today');
          if (res.data.data.shifts?.length > 0) {
            const todayShift = res.data.data.shifts[0];
            setShift(todayShift);
            setAttendance(todayShift.attendance);
          }
        } catch (error) {
          console.error('Failed to load today\'s shifts:', error);
        }
        setLoading(false);
        return;
      }
      
      try {
        // Get shift details
        const shiftRes = await api.get(`/api/shifts/${activeShiftId}`);
        const shiftData = shiftRes.data.data;
        
        // Get workplace details
        if (shiftData.workplace_id) {
          const wpRes = await api.get('/api/employer/workplaces');
          const workplace = wpRes.data.data.workplaces?.find(w => w.workplace_id === shiftData.workplace_id);
          if (workplace) {
            shiftData.workplace = {
              name: workplace.workplace_name || workplace.name,
              address: workplace.address,
              lat: workplace.lat || workplace.latitude,
              lng: workplace.long || workplace.longitude
            };
          }
        }
        
        setShift(shiftData);
        
        // Get attendance status
        try {
          const attRes = await api.get(`/api/attendance/shifts/${activeShiftId}/clock-status`);
          setAttendance(attRes.data.data);
        } catch (error) {
          console.log('No attendance record yet');
        }
      } catch (error) {
        console.error('Failed to load shift:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [activeShiftId]);

  // Get location when shift is loaded
  useEffect(() => {
    if (shift) {
      getCurrentLocation();
    }
  }, [shift, getCurrentLocation]);

  // Update distance when worker location changes
  useEffect(() => {
    if (workerLocation && shift?.workplace?.lat && shift?.workplace?.lng) {
      const dist = calculateDistance(
        workerLocation.lat, workerLocation.lng,
        parseFloat(shift.workplace.lat), parseFloat(shift.workplace.lng)
      );
      setDistance(dist);
      setIsWithinGeofence(dist <= GEOFENCE_RADIUS);
    }
  }, [workerLocation, shift]);

  const handleClockIn = async () => {
    if (!workerLocation) {
      alert('Please enable location services to clock in');
      return;
    }
    
    if (!isWithinGeofence) {
      alert(`You need to be within ${GEOFENCE_RADIUS} meters of the workplace to clock in. You are currently ${Math.round(distance)} meters away.`);
      return;
    }
    
    setClockingIn(true);
    try {
      const response = await api.post('/api/attendance/gps-clock-in', {
        shift_id: activeShiftId || shift?.shift_id,
        location: {
          lat: workerLocation.lat,
          lng: workerLocation.lng,
          accuracy: workerLocation.accuracy
        }
      });
      
      setAttendance({
        status: 'clocked_in',
        clock_in_time: response.data.data.clock_in_time,
        attendance_id: response.data.data.attendance_id,
        is_late: response.data.data.is_late,
        minutes_late: response.data.data.minutes_late
      });
      
      alert(response.data.message || 'Clocked in successfully! ✓');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to clock in');
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    setClockingOut(true);
    try {
      const response = await api.post('/api/attendance/gps-clock-out', {
        shift_id: activeShiftId || shift?.shift_id,
        attendance_id: attendance?.attendance_id,
        location: workerLocation ? {
          lat: workerLocation.lat,
          lng: workerLocation.lng,
          accuracy: workerLocation.accuracy
        } : null
      });
      
      setAttendance({
        ...attendance,
        status: 'clocked_out',
        clock_out_time: response.data.data.clock_out_time,
        duration_hours: response.data.data.duration_hours
      });
      
      alert(response.data.message || 'Clocked out successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to clock out');
    } finally {
      setClockingOut(false);
    }
  };

  const onMapLoad = useCallback((map) => {
    setMap(map);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <WorkforceHeader />
        <WorkforceSidebar />
        <div className="ml-[70px] pt-[64px] flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="min-h-screen bg-gray-50">
        <WorkforceHeader />
        <WorkforceSidebar />
        <div className="ml-[70px] pt-[64px] p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-12 text-center">
            <FiClock size={64} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Shift</h2>
            <p className="text-gray-600 mb-6">You don't have any shifts scheduled for today.</p>
            <button
              onClick={() => navigate('/workforce/my-shifts')}
              className="px-6 py-3 rounded-lg text-white font-medium"
              style={{ backgroundColor: theme.primaryColor }}
            >
              View My Shifts
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isClockedIn = attendance?.status === 'clocked_in';
  const isClockedOut = attendance?.status === 'clocked_out';

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkforceHeader />
      <WorkforceSidebar />
      
      <div className="ml-[70px] pt-[64px]">
        {/* Header */}
        <div className="px-8 py-6 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clock In/Out</h1>
              <p className="text-gray-600">{shift?.role_title || shift?.position_title}</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Shift Info & Actions */}
            <div className="space-y-6">
              {/* Shift Details Card */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Shift Details</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-600">
                    <FiClock size={20} />
                    <span>{shift?.start_time} - {shift?.end_time}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <FiMapPin size={20} />
                    <span>{shift?.workplace?.name || 'Unknown Location'}</span>
                  </div>
                  {shift?.workplace?.address && (
                    <p className="text-sm text-gray-500 ml-8">{shift.workplace.address}</p>
                  )}
                </div>
              </div>

              {/* Location Status Card */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Your Location</h2>
                  <button
                    onClick={getCurrentLocation}
                    disabled={loadingLocation}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    title="Refresh location"
                  >
                    <FiRefreshCw size={20} className={loadingLocation ? 'animate-spin' : ''} />
                  </button>
                </div>
                
                {locationError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <FiAlertCircle size={20} />
                      <span className="font-medium">Location Error</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">{locationError}</p>
                    <button
                      onClick={getCurrentLocation}
                      className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      Try Again
                    </button>
                  </div>
                ) : loadingLocation ? (
                  <div className="flex items-center gap-3 text-gray-600">
                    <FiNavigation size={20} className="animate-pulse" />
                    <span>Getting your location...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Distance Display */}
                    <div className={`p-4 rounded-lg ${isWithinGeofence ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                      <div className="flex items-center gap-3">
                        {isWithinGeofence ? (
                          <FiCheckCircle size={24} className="text-green-600" />
                        ) : (
                          <FiAlertCircle size={24} className="text-amber-600" />
                        )}
                        <div>
                          <p className={`font-bold ${isWithinGeofence ? 'text-green-700' : 'text-amber-700'}`}>
                            {distance !== null ? `${Math.round(distance)} meters away` : 'Calculating...'}
                          </p>
                          <p className={`text-sm ${isWithinGeofence ? 'text-green-600' : 'text-amber-600'}`}>
                            {isWithinGeofence 
                              ? '✓ Within clock-in range' 
                              : `Move ${Math.round(distance - GEOFENCE_RADIUS)} meters closer`}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {workerLocation?.accuracy && (
                      <p className="text-xs text-gray-500">
                        GPS accuracy: ±{Math.round(workerLocation.accuracy)} meters
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Clock In/Out Button */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                {isClockedOut ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                      <FiCheckCircle size={32} className="text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Shift Complete!</h3>
                    <p className="text-gray-600 mb-2">
                      You worked {attendance?.duration_hours?.toFixed(1) || '?'} hours
                    </p>
                    <p className="text-sm text-gray-500">
                      Clocked out at {attendance?.clock_out_time && new Date(attendance.clock_out_time).toLocaleTimeString()}
                    </p>
                  </div>
                ) : isClockedIn ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                      <FiCheckCircle size={32} className="text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Clocked In</h3>
                    <p className="text-gray-600 mb-4">
                      Started at {attendance?.clock_in_time && new Date(attendance.clock_in_time).toLocaleTimeString()}
                    </p>
                    {attendance?.is_late && (
                      <p className="text-sm text-amber-600 mb-4">
                        ⚠️ {attendance.minutes_late} minutes late
                      </p>
                    )}
                    <button
                      onClick={handleClockOut}
                      disabled={clockingOut}
                      className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {clockingOut ? 'Clocking Out...' : 'Clock Out'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                         style={{ backgroundColor: `${theme.primaryColor}20` }}>
                      <FiClock size={32} style={{ color: theme.primaryColor }} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Start?</h3>
                    <p className="text-gray-600 mb-4">
                      Make sure you're at the workplace location
                    </p>
                    <button
                      onClick={handleClockIn}
                      disabled={clockingIn || !isWithinGeofence || loadingLocation}
                      className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: isWithinGeofence ? theme.primaryColor : '#9CA3AF' }}
                    >
                      {clockingIn ? 'Clocking In...' : 
                       loadingLocation ? 'Getting Location...' :
                       !isWithinGeofence ? `Move Closer (${Math.round(distance)}m away)` : 
                       'Clock In'}
                    </button>
                    {!isWithinGeofence && !loadingLocation && (
                      <p className="text-sm text-gray-500 mt-3">
                        You must be within {GEOFENCE_RADIUS} meters of the workplace
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Map */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Location Map</h2>
              <div className="h-[400px] rounded-lg overflow-hidden">
                {isLoaded && shift?.workplace?.lat && shift?.workplace?.lng ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{
                      lat: workerLocation?.lat || parseFloat(shift.workplace.lat),
                      lng: workerLocation?.lng || parseFloat(shift.workplace.lng)
                    }}
                    zoom={17}
                    onLoad={onMapLoad}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                      mapTypeControl: false,
                      streetViewControl: false
                    }}
                  >
                    {/* Workplace marker */}
                    <Marker
                      position={{
                        lat: parseFloat(shift.workplace.lat),
                        lng: parseFloat(shift.workplace.lng)
                      }}
                      icon={{
                        url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
                        scaledSize: new window.google.maps.Size(40, 40)
                      }}
                      title={shift.workplace.name}
                    />
                    
                    {/* Geofence circle */}
                    <Circle
                      center={{
                        lat: parseFloat(shift.workplace.lat),
                        lng: parseFloat(shift.workplace.lng)
                      }}
                      radius={GEOFENCE_RADIUS}
                      options={{
                        fillColor: isWithinGeofence ? '#22C55E' : '#F59E0B',
                        fillOpacity: 0.2,
                        strokeColor: isWithinGeofence ? '#22C55E' : '#F59E0B',
                        strokeOpacity: 0.8,
                        strokeWeight: 2
                      }}
                    />
                    
                    {/* Worker location marker */}
                    {workerLocation && (
                      <Marker
                        position={{
                          lat: workerLocation.lat,
                          lng: workerLocation.lng
                        }}
                        icon={{
                          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                          scaledSize: new window.google.maps.Size(40, 40)
                        }}
                        title="Your Location"
                      />
                    )}
                  </GoogleMap>
                ) : (
                  <div className="h-full bg-gray-100 flex items-center justify-center">
                    <p className="text-gray-500">Loading map...</p>
                  </div>
                )}
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <span className="text-gray-600">Workplace</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">You</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-green-500 bg-green-100"></div>
                  <span className="text-gray-600">{GEOFENCE_RADIUS}m zone</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockInOutNew;
