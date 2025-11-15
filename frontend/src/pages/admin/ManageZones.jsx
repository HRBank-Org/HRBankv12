import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const ManageZones = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      const response = await api.get('/api/admin/zones');
      setZones(response.data.data.zones);
    } catch (error) {
      console.error('Failed to load zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeOntarioZones = async () => {
    if (!window.confirm('Initialize default Ontario zones?')) return;
    try {
      await api.post('/api/admin/zones/initialize-ontario');
      await loadZones();
      alert('Ontario zones initialized successfully');
    } catch (error) {
      alert('Failed to initialize zones');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Manage Geographic Zones</h1>
          <button onClick={() => navigate('/admin/dashboard')} className="px-4 py-2 bg-blue-700 rounded-lg">Back</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button onClick={initializeOntarioZones} className="px-6 py-3 bg-green-600 text-white rounded-lg">Initialize Ontario Zones</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map(zone => (
            <div key={zone.zone_id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{zone.zone_name}</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">{zone.zone_code}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Province: {zone.province}</p>
              <div className="text-sm space-y-1">
                <p><strong>Cities:</strong> {zone.cities?.slice(0, 3).join(', ')}{zone.cities?.length > 3 && '...'}</p>
                <p><strong>Postal Codes:</strong> {zone.postal_code_prefixes?.slice(0, 3).join(', ')}{zone.postal_code_prefixes?.length > 3 && '...'}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ManageZones;