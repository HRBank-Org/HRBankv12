import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { FiUsers, FiCalendar, FiMapPin } from 'react-icons/fi';

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '300px',
  borderRadius: '8px'
};

// Default center (Windsor, Ontario)
const defaultCenter = {
  lat: 42.3149,
  lng: -83.0364
};

// Custom map styles for a cleaner look
const mapStyles = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  }
];

const GoogleWorkplaceMap = ({ workplaces, onMarkerClick }) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [map, setMap] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''
  });

  // Geocode workplaces that don't have coordinates
  useEffect(() => {
    if (!isLoaded || !workplaces || workplaces.length === 0) return;

    const geocodeWorkplaces = async () => {
      const geocoder = new window.google.maps.Geocoder();
      const geocodedMarkers = [];

      for (const workplace of workplaces) {
        // Skip inactive workplaces for map display
        if (workplace.status === 'inactive') continue;

        try {
          // Check if workplace already has coordinates
          if (workplace.lat && workplace.long) {
            geocodedMarkers.push({
              id: workplace.workplace_id,
              name: workplace.workplace_name || workplace.name,
              address: `${workplace.address}, ${workplace.city}, ${workplace.province || ''} ${workplace.postal_code || ''}`,
              position: {
                lat: parseFloat(workplace.lat),
                lng: parseFloat(workplace.long)
              },
              workplace: workplace
            });
          } else if (workplace.latitude && workplace.longitude) {
            geocodedMarkers.push({
              id: workplace.workplace_id,
              name: workplace.workplace_name || workplace.name,
              address: `${workplace.address}, ${workplace.city}, ${workplace.province || ''} ${workplace.postal_code || ''}`,
              position: {
                lat: parseFloat(workplace.latitude),
                lng: parseFloat(workplace.longitude)
              },
              workplace: workplace
            });
          } else {
            // Geocode the address
            const address = `${workplace.address}, ${workplace.city}, ${workplace.province || 'Ontario'}, Canada`;
            
            const result = await new Promise((resolve) => {
              geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                  resolve({
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng()
                  });
                } else {
                  console.warn(`Geocoding failed for ${workplace.workplace_name}: ${status}`);
                  resolve(null);
                }
              });
            });

            if (result) {
              geocodedMarkers.push({
                id: workplace.workplace_id,
                name: workplace.workplace_name || workplace.name,
                address: `${workplace.address}, ${workplace.city}`,
                position: result,
                workplace: workplace
              });
            }
          }
        } catch (error) {
          console.error(`Failed to process ${workplace.workplace_name}:`, error);
        }
      }

      setMarkers(geocodedMarkers);
    };

    geocodeWorkplaces();
  }, [isLoaded, workplaces]);

  // Fit bounds when markers change
  useEffect(() => {
    if (map && markers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach(marker => {
        bounds.extend(marker.position);
      });
      
      if (markers.length === 1) {
        map.setCenter(markers[0].position);
        map.setZoom(14);
      } else {
        map.fitBounds(bounds, { padding: 50 });
      }
    }
  }, [map, markers]);

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <div className="bg-gray-100 rounded-lg h-full min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <FiMapPin size={48} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Map failed to load</p>
          <p className="text-sm text-gray-500 mt-1">Please check your API key configuration</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-gray-100 rounded-lg h-full min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  if (markers.length === 0 && workplaces?.filter(w => w.status !== 'inactive').length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg h-full min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <FiMapPin size={48} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No active locations to display</p>
          <p className="text-sm text-gray-500 mt-1">Add workplaces to see them on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[300px] rounded-lg overflow-hidden">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={markers[0]?.position || defaultCenter}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: mapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            onClick={() => setSelectedMarker(marker)}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
              scaledSize: new window.google.maps.Size(40, 40)
            }}
          />
        ))}

        {selectedMarker && (
          <InfoWindow
            position={selectedMarker.position}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 min-w-[200px]">
              <h3 className="font-bold text-gray-900 mb-1 text-base">{selectedMarker.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{selectedMarker.address}</p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <FiUsers size={14} />
                  <span>{selectedMarker.workplace.assigned_workers || 0} Workers</span>
                </div>
                <div className="flex items-center gap-1">
                  <FiCalendar size={14} />
                  <span>{selectedMarker.workplace.active_shifts || 0} Shifts</span>
                </div>
              </div>
              
              {onMarkerClick && (
                <button
                  onClick={() => {
                    onMarkerClick(selectedMarker.workplace);
                    setSelectedMarker(null);
                  }}
                  className="w-full px-3 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                >
                  View Details
                </button>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default GoogleWorkplaceMap;
