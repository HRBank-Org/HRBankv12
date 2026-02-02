import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom orange marker icon
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map bounds adjustment
const MapBounds = ({ markers }) => {
  const map = useMap();

  useEffect(() => {
    if (markers && markers.length > 0) {
      const validMarkers = markers.filter(m => m.position);
      if (validMarkers.length === 1) {
        // Single marker - center on it
        map.setView(validMarkers[0].position, 13);
      } else if (validMarkers.length > 1) {
        // Multiple markers - fit bounds
        const bounds = L.latLngBounds(validMarkers.map(m => m.position));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [markers, map]);

  return null;
};

const WorkplaceMap = ({ workplaces, onMarkerClick }) => {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Geocode addresses to get coordinates
  useEffect(() => {
    const geocodeWorkplaces = async () => {
      setLoading(true);
      const geocodedMarkers = [];

      for (const workplace of workplaces) {
        try {
          // Check if workplace already has coordinates
          if (workplace.latitude && workplace.longitude) {
            geocodedMarkers.push({
              id: workplace.workplace_id,
              name: workplace.workplace_name || workplace.name,
              address: `${workplace.address}, ${workplace.city}, ${workplace.province || ''} ${workplace.postal_code || ''}`,
              position: [parseFloat(workplace.latitude), parseFloat(workplace.longitude)],
              workplace: workplace
            });
          } else {
            // Geocode the address - try full address first
            let query = `${workplace.address}, ${workplace.city}, ${workplace.province || 'Ontario'}, Canada`;
            let response = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
              {
                headers: {
                  'User-Agent': 'HRBank-WorkplaceManagement'
                }
              }
            );
            
            let data = await response.json();
            
            // If full address fails, try just city/town
            if (!data || data.length === 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              query = `${workplace.city}, ${workplace.province || 'Ontario'}, Canada`;
              response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
                {
                  headers: {
                    'User-Agent': 'HRBank-WorkplaceManagement'
                  }
                }
              );
              data = await response.json();
            }
            
            if (data && data.length > 0) {
              geocodedMarkers.push({
                id: workplace.workplace_id,
                name: workplace.workplace_name || workplace.name,
                address: `${workplace.address}, ${workplace.city}`,
                position: [parseFloat(data[0].lat), parseFloat(data[0].lon)],
                workplace: workplace
              });
            } else {
              console.warn(`Could not geocode ${workplace.workplace_name}`);
            }
            
            // Rate limiting - wait 1 second between requests (Nominatim requirement)
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Failed to geocode ${workplace.workplace_name}:`, error);
        }
      }

      setMarkers(geocodedMarkers);
      setLoading(false);
    };

    if (workplaces && workplaces.length > 0) {
      geocodeWorkplaces();
    } else {
      setLoading(false);
    }
  }, [workplaces]);

  // Default center (Canada - Ontario region)
  const defaultCenter = [42.3149, -83.0364]; // Windsor, Ontario
  const defaultZoom = 10;

  if (loading) {
    return (
      <div className="bg-gray-100 rounded-lg h-full min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading map locations...</p>
        </div>
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg h-full min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-gray-600 font-medium">No locations to display</p>
          <p className="text-sm text-gray-500 mt-1">Add workplaces to see them on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[300px] rounded-lg overflow-hidden">
      <MapContainer 
        center={markers[0]?.position || defaultCenter} 
        zoom={defaultZoom} 
        style={{ height: '100%', width: '100%', minHeight: '300px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBounds markers={markers} />
        
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={marker.position}
            icon={orangeIcon}
            eventHandlers={{
              click: () => {
                if (onMarkerClick) {
                  onMarkerClick(marker.workplace);
                }
              }
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-gray-900 mb-1">{marker.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{marker.address}</p>
                {marker.workplace.assigned_workers !== undefined && (
                  <div className="text-xs text-gray-500">
                    <div>👥 {marker.workplace.assigned_workers || 0} Workers</div>
                    <div>📅 {marker.workplace.active_shifts || 0} Active Shifts</div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default WorkplaceMap;
