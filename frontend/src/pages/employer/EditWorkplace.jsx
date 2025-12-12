import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const EditWorkplace = () => {
  const { workplaceId } = useParams();
  const [formData, setFormData] = useState({
    workplace_name: '',
    address: '',
    postal_code: '',
    job_matching_radius_km: 20,
    timezone: 'America/Toronto'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
        setFormData({
          workplace_name: workplace.workplace_name,
          address: workplace.address,
          postal_code: workplace.postal_code,
          job_matching_radius_km: workplace.job_matching_radius_km,
          timezone: workplace.timezone
        });
      }
    } catch (error) {
      console.error('Failed to load workplace:', error);
    } finally {
      setLoading(false);
    }
  };

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
                name="workplace_name"
                type="text"
                required
                value={formData.workplace_name}
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
                placeholder="123 Main St, Windsor, ON"
              />
            </div>

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
                Job Matching Radius: {formData.job_matching_radius_km} km
              </label>
              <input
                name="job_matching_radius_km"
                type="range"
                min="5"
                max="50"
                value={formData.job_matching_radius_km}
                onChange={handleChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 km</span>
                <span>50 km</span>
              </div>
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
                disabled={saving}
                className="flex-1 py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EditWorkplace;
