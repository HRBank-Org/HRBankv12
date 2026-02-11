import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';

const ClassesManagement = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [credentialTypes, setCredentialTypes] = useState([]);
  const [classStatuses, setClassStatuses] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    template_id: '',
    title: '',
    description: '',
    credential_type: '',
    start_date: '',
    end_date: '',
    validity_period_months: '',
    status: 'draft'
  });

  useEffect(() => {
    loadClasses();
    loadTemplates();
    loadMetadata();
  }, [statusFilter]);

  const loadClasses = async () => {
    try {
      const url = statusFilter 
        ? `/api/institution/classes?status_filter=${statusFilter}`
        : '/api/institution/classes';
      const response = await api.get(url);
      setClasses(response.data.data.classes);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api.get('/api/institution/class-templates');
      setTemplates(response.data.data.templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadMetadata = async () => {
    try {
      const [typesRes, statusesRes] = await Promise.all([
        api.get('/api/institution/metadata/credential-types'),
        api.get('/api/institution/metadata/class-statuses')
      ]);
      setCredentialTypes(typesRes.data.data.credential_types);
      setClassStatuses(statusesRes.data.data.class_statuses);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  };

  const openModal = () => {
    setFormData({
      template_id: '',
      title: '',
      description: '',
      credential_type: '',
      start_date: '',
      end_date: '',
      validity_period_months: '',
      status: 'draft'
    });
    setShowModal(true);
    setMessage({ type: '', text: '' });
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleTemplateSelect = (e) => {
    const templateId = e.target.value;
    const template = templates.find(t => t.template_id === templateId);
    
    if (template) {
      setFormData({
        ...formData,
        template_id: templateId,
        title: template.template_name,
        credential_type: template.credential_type,
        validity_period_months: template.validity_period_months || '',
        description: template.description || ''
      });
    } else {
      setFormData({
        ...formData,
        template_id: '',
        title: '',
        credential_type: '',
        validity_period_months: '',
        description: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        ...formData,
        validity_period_months: formData.validity_period_months ? parseInt(formData.validity_period_months) : null
      };

      await api.post('/api/institution/classes', payload);
      setMessage({ type: 'success', text: 'Class created successfully!' });
      await loadClasses();
      closeModal();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to create class' });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      archived: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || colors.draft;
  };

  if (loading) {
    return (
      <InstitutionLayout title="Classes">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </InstitutionLayout>
    );
  }

  return (
    <InstitutionLayout title="Classes" subtitle="Manage your classes and enrolled students">
      <div data-testid="classes-management-page">
        {message.text && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Header with Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
            <p className="text-gray-600">Manage your classes and enrolled students</p>
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {classStatuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={openModal}
              className="px-6 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all whitespace-nowrap"
              style={{ backgroundColor: theme.primaryColor }}
            >
              + Create Class
            </button>
          </div>
        </div>

        {/* Classes Grid */}
        {classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div 
                key={cls.class_id} 
                onClick={() => navigate(`/institution/classes/${cls.class_id}`)}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{cls.title}</h3>
                    <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(cls.status)}`}>
                      {cls.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">🎓</span>
                    <span>{cls.credential_type}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📅</span>
                    <span>{new Date(cls.start_date).toLocaleDateString()} - {new Date(cls.end_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">👥</span>
                    <span>{cls.total_enrolled} student{cls.total_enrolled !== 1 ? 's' : ''} enrolled</span>
                  </div>
                  {cls.credentials_issued > 0 && (
                    <div className="flex items-center text-sm text-green-600 font-medium">
                      <span className="mr-2">✓</span>
                      <span>{cls.credentials_issued} credential{cls.credentials_issued !== 1 ? 's' : ''} issued</span>
                    </div>
                  )}
                </div>

                {cls.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{cls.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Classes Yet</h3>
            <p className="text-gray-600 mb-6">Create your first class to start enrolling students</p>
            <button
              onClick={openModal}
              className="px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
              style={{ backgroundColor: theme.primaryColor }}
            >
              + Create Class
            </button>
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create New Class</h2>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Use Template (Optional)
                </label>
                <select
                  value={formData.template_id}
                  onChange={handleTemplateSelect}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                >
                  <option value="">Start from scratch</option>
                  {templates.map(template => (
                    <option key={template.template_id} value={template.template_id}>
                      {template.template_name} ({template.credential_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  placeholder="e.g., Food Safety Level 1 - Fall 2025"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>

              {/* Credential Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credential Type *
                </label>
                <select
                  value={formData.credential_type}
                  onChange={(e) => setFormData({...formData, credential_type: e.target.value})}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                >
                  <option value="">Select type...</option>
                  {credentialTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                    min={formData.start_date}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Validity Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credential Validity (months)
                </label>
                <input
                  type="number"
                  value={formData.validity_period_months}
                  onChange={(e) => setFormData({...formData, validity_period_months: e.target.value})}
                  placeholder="Leave empty for lifetime validity"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                >
                  {classStatuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  placeholder="Optional description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassesManagement;
