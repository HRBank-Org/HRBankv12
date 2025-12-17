import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const EditWorkplace = () => {
  const { workplaceId } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    province: 'ON',
    postal_code: '',
    phone: '',
    description: '',
    geofence_radius: 100
  });
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadWorkplace();
  }, [workplaceId]);

  const loadWorkplace = async () => {
    try {
      const response = await api.get('/api/employer/workplaces');
      const workplace = response.data.data.workplaces.find(w => w.workplace_id === workplaceId);
      if (workplace) {
        const data = {
          name: workplace.name || '',
          address: workplace.address || '',
          city: workplace.city || '',
          province: workplace.province || 'ON',
          postal_code: workplace.postal_code || '',
          phone: workplace.phone || '',
          description: workplace.description || '',
          geofence_radius: workplace.geofence_radius || 100
        };
        setFormData(data);
        setOriginalData(data);
      }
    } catch (error) {
      console.error('Failed to load workplace:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Check if form has changes
  useEffect(() => {
    if (originalData) {
      const changed = Object.keys(formData).some(key => formData[key] !== originalData[key]);
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await api.patch(`/api/employer/workplaces/${workplaceId}`, formData);
      navigate('/employer/dashboard', { state: { activeTab: 'schedule', showWorkplaces: true } });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update workplace');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/employer/dashboard', { state: { activeTab: 'schedule', showWorkplaces: true } })} className="hover:opacity-80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
          <h1 className="text-lg font-bold">Edit Workplace</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Workplace Details</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workplace Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                placeholder="e.g., Main Location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                name="address"
                type="text"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  name="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="Windsor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Province
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                >
                  <option value="ON">Ontario</option>
                  <option value="BC">British Columbia</option>
                  <option value="AB">Alberta</option>
                  <option value="QC">Quebec</option>
                  <option value="MB">Manitoba</option>
                  <option value="SK">Saskatchewan</option>
                  <option value="NS">Nova Scotia</option>
                  <option value="NB">New Brunswick</option>
                  <option value="NL">Newfoundland</option>
                  <option value="PE">PEI</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  name="postal_code"
                  type="text"
                  required
                  value={formData.postal_code}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="N9A 1A1"
                  maxLength={7}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="(519) 555-1234"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                placeholder="Brief description of this workplace..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geofence Radius: {formData.geofence_radius}m
              </label>
              <input
                name="geofence_radius"
                type="range"
                min="50"
                max="500"
                step="25"
                value={formData.geofence_radius}
                onChange={handleChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50m</span>
                <span>500m</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Workers must be within this radius to clock in/out
              </p>
            </div>

            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/employer/workplaces')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="flex-1 py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: hasChanges ? theme.primaryColor : '#9CA3AF' }}
              >
                {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EditWorkplace;
