import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import WorkPassportSidebar from '../../components/layout/WorkPassportSidebar';
import WorkPassportHeader from '../../components/layout/WorkPassportHeader';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  FiPlus, 
  FiBriefcase, 
  FiEdit2, 
  FiTrash2, 
  FiClock, 
  FiAward,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';

// Popular occupations for suggestions
const POPULAR_OCCUPATIONS = [
  'Food Service Worker',
  'Retail Sales Associate',
  'Customer Service Representative',
  'Healthcare Assistant',
  'Security Guard',
  'Warehouse Worker',
  'Administrative Assistant',
  'Delivery Driver',
  'Cleaner/Janitor',
  'Construction Worker',
  'Cook/Chef',
  'Bartender',
  'Caregiver',
  'IT Support Technician',
  'Marketing Coordinator'
];

const WorkPassportOccupations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [occupations, setOccupations] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOccupation, setEditingOccupation] = useState(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    occupation_title: '',
    years_of_experience: '',
    skill_level: 'intermediate',
    description: '',
    skills: []
  });

  useEffect(() => {
    loadOccupations();
  }, []);

  const loadOccupations = async () => {
    try {
      const response = await api.get('/api/workpassport/occupations');
      if (response.data.success) {
        setOccupations(response.data.data.occupations || []);
      }
    } catch (error) {
      console.error('Failed to load occupations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.occupation_title.trim()) {
      setError('Please enter an occupation title');
      return;
    }

    setLoading(true);
    try {
      const endpoint = editingOccupation 
        ? `/api/workpassport/occupations/${editingOccupation.occupation_id}`
        : '/api/workpassport/occupations';
      
      const method = editingOccupation ? 'put' : 'post';
      
      const response = await api[method](endpoint, {
        occupation_title: formData.occupation_title,
        years_of_experience: parseInt(formData.years_of_experience) || 0,
        skill_level: formData.skill_level,
        description: formData.description,
        skills: formData.skills
      });

      if (response.data.success) {
        await loadOccupations();
        setShowAddModal(false);
        setEditingOccupation(null);
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save occupation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (occupationId) => {
    if (!window.confirm('Are you sure you want to delete this occupation profile?')) return;

    try {
      await api.delete(`/api/workpassport/occupations/${occupationId}`);
      await loadOccupations();
    } catch (err) {
      alert('Failed to delete occupation');
    }
  };

  const openEditModal = (occ) => {
    setEditingOccupation(occ);
    setFormData({
      occupation_title: occ.occupation_title,
      years_of_experience: occ.years_of_experience?.toString() || '',
      skill_level: occ.skill_level || 'intermediate',
      description: occ.description || '',
      skills: occ.skills || []
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      occupation_title: '',
      years_of_experience: '',
      skill_level: 'intermediate',
      description: '',
      skills: []
    });
    setError('');
  };

  const getSkillLevelColor = (level) => {
    switch (level) {
      case 'beginner': return 'bg-blue-100 text-blue-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-green-100 text-green-700';
      case 'expert': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading && occupations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkPassportHeader />
      <WorkPassportSidebar />
      
      <div className="transition-all duration-300 pt-16" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Occupation Profiles</h1>
              <p className="text-gray-600">Define your skills and experience in different fields</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setEditingOccupation(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <FiPlus />
              Add Occupation
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Info Banner */}
          <div className="mb-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl">
            <div className="flex items-start gap-3">
              <FiBriefcase className="text-cyan-600 mt-1" size={20} />
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Build Your Career Profile</h3>
                <p className="text-sm text-gray-600">
                  Add occupation profiles to showcase your expertise. This helps employers understand your background 
                  and Emma can provide better career guidance based on your profiles.
                </p>
              </div>
            </div>
          </div>

          {occupations.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiBriefcase size={32} className="text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Occupation Profiles Yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create your first occupation profile to showcase your skills and experience to potential employers.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <FiPlus />
                Create Your First Profile
              </button>
            </div>
          ) : (
            /* Occupation Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {occupations.map((occ) => (
                <div key={occ.occupation_id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                      <FiBriefcase size={24} className="text-cyan-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(occ)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(occ.occupation_id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2">{occ.occupation_title}</h3>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <FiClock size={14} />
                      {occ.years_of_experience || 0} years
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSkillLevelColor(occ.skill_level)}`}>
                      {occ.skill_level || 'Intermediate'}
                    </span>
                  </div>

                  {occ.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{occ.description}</p>
                  )}

                  {occ.skills && occ.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {occ.skills.slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                      {occ.skills.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                          +{occ.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingOccupation ? 'Edit Occupation' : 'Add Occupation Profile'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <FiAlertCircle />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Occupation Title *
                </label>
                <input
                  type="text"
                  value={formData.occupation_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, occupation_title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="e.g., Food Service Worker"
                  list="occupation-suggestions"
                />
                <datalist id="occupation-suggestions">
                  {POPULAR_OCCUPATIONS.map(occ => (
                    <option key={occ} value={occ} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.years_of_experience}
                    onChange={(e) => setFormData(prev => ({ ...prev, years_of_experience: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skill Level
                  </label>
                  <select
                    value={formData.skill_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, skill_level: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                  placeholder="Describe your experience and responsibilities..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Type a skill and press Enter"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const skill = e.target.value.trim();
                      if (skill && !formData.skills.includes(skill)) {
                        setFormData(prev => ({
                          ...prev,
                          skills: [...prev.skills, skill]
                        }));
                        e.target.value = '';
                      }
                    }
                  }}
                />
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-sm flex items-center gap-1"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            skills: prev.skills.filter((_, i) => i !== idx)
                          }))}
                          className="hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingOccupation(null);
                    resetForm();
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingOccupation ? 'Save Changes' : 'Add Occupation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkPassportOccupations;
