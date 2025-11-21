import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';

const ManageOccupationCertifications = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState({});
  const [availableCertifications, setAvailableCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOccupation, setSelectedOccupation] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCerts, setSelectedCerts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [occRes, certsRes] = await Promise.all([
        api.get('/api/admin/occupations/manage'),
        api.get('/api/credentials/types')
      ]);

      setCategories(occRes.data.data.categories);
      setAvailableCertifications(certsRes.data.data.credential_types || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!window.confirm(
      'This will auto-migrate all occupations from string format to object format with smart certification matching.\n\n' +
      'Examples:\n' +
      '- Registered Nurse → RN + CPR certifications\n' +
      '- Bartender → Smart Serve + Food Handler\n' +
      '- Security Guard → Security License\n\n' +
      'Continue?'
    )) {
      return;
    }

    setMigrating(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/api/admin/occupations/migrate-to-object-format');
      setMessage({ 
        type: 'success', 
        text: `✅ ${response.data.message}\n\nMigrated: ${response.data.data.migrated_count}\nAlready migrated: ${response.data.data.already_migrated}` 
      });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Migration failed' });
    } finally {
      setMigrating(false);
    }
  };

  const openEditModal = (category, occupation) => {
    const occTitle = typeof occupation === 'string' ? occupation : occupation.title;
    const existingCerts = typeof occupation === 'object' ? occupation.required_certifications || [] : [];
    
    setSelectedOccupation({
      category,
      title: occTitle,
      currentCerts: existingCerts
    });
    setSelectedCerts(existingCerts);
    setShowEditModal(true);
    setMessage({ type: '', text: '' });
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedOccupation(null);
    setSelectedCerts([]);
  };

  const toggleCertification = (certName) => {
    if (selectedCerts.includes(certName)) {
      setSelectedCerts(selectedCerts.filter(c => c !== certName));
    } else {
      setSelectedCerts([...selectedCerts, certName]);
    }
  };

  const handleSave = async () => {
    if (!selectedOccupation) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put('/api/admin/occupations/update-certifications', {
        category: selectedOccupation.category,
        occupation_title: selectedOccupation.title,
        required_certifications: selectedCerts
      });

      setMessage({ type: 'success', text: `✅ Updated certifications for ${selectedOccupation.title}` });
      await loadData();
      setTimeout(() => closeEditModal(), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update certifications' });
    } finally {
      setSaving(false);
    }
  };

  const getCertificationStats = () => {
    let totalOccupations = 0;
    let withCerts = 0;
    let withoutCerts = 0;

    Object.values(categories).forEach(category => {
      category.occupations.forEach(occ => {
        totalOccupations++;
        if (typeof occ === 'object' && occ.required_certifications && occ.required_certifications.length > 0) {
          withCerts++;
        } else {
          withoutCerts++;
        }
      });
    });

    return { totalOccupations, withCerts, withoutCerts };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = getCertificationStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader 
        onBackClick={() => navigate('/admin/dashboard')}
        showBack={true}
        title="Manage Occupation Certifications"
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {message.text && !showEditModal && (
          <div className={`rounded-lg p-4 mb-6 whitespace-pre-line ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Stats & Migration */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Certification Status</h2>
              <p className="text-sm text-gray-600 mt-1">Link certifications to occupation templates</p>
            </div>
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {migrating ? 'Migrating...' : '⚡ Auto-Migrate All'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Occupations</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalOccupations}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-700">With Certifications</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.withCerts}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-orange-700">Without Certifications</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.withoutCerts}</p>
            </div>
          </div>
        </div>

        {/* Categories */}
        {Object.entries(categories).map(([categoryName, categoryData]) => (
          <div key={categoryName} className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>{categoryData.icon}</span>
              <span>{categoryName}</span>
              <span className="text-sm font-normal text-gray-500">
                ({categoryData.occupations.length} occupations)
              </span>
            </h3>

            <div className="space-y-2">
              {categoryData.occupations.map((occ, index) => {
                const isObject = typeof occ === 'object';
                const title = isObject ? occ.title : occ;
                const certs = isObject ? occ.required_certifications || [] : [];
                const hasCerts = certs.length > 0;

                return (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{title}</p>
                      {hasCerts ? (
                        <p className="text-sm text-green-600 mt-1">
                          ✓ {certs.length} certification{certs.length !== 1 ? 's' : ''}: {certs.join(', ')}
                        </p>
                      ) : (
                        <p className="text-sm text-orange-600 mt-1">
                          ⚠️ No certifications linked
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => openEditModal(categoryName, occ)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {hasCerts ? 'Edit' : 'Add'} Certifications
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {/* Edit Modal */}
      {showEditModal && selectedOccupation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Link Certifications</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedOccupation.title}</p>
                </div>
                <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {message.text && (
                <div className={`rounded-lg p-4 mb-6 ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4">
                Select all certifications required for this occupation:
              </p>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableCertifications.map((cert) => (
                  <label
                    key={cert.credential_type_id}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCerts.includes(cert.credential_name)}
                      onChange={() => toggleCertification(cert.credential_name)}
                      className="mt-1 w-5 h-5 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{cert.credential_name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {cert.category} • {cert.issuing_body_type}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{cert.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Selected: {selectedCerts.length} certification{selectedCerts.length !== 1 ? 's' : ''}
                </p>
                {selectedCerts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCerts.map((cert, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {cert}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeEditModal}
                  className="flex-1 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-6 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageOccupationCertifications;
