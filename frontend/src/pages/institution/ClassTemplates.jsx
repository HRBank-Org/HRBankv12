import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';

const ClassTemplates = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [credentialTypes, setCredentialTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
    credential_type: '',
    validity_period_months: ''
  });

  useEffect(() => {
    loadTemplates();
    loadMetadata();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/api/institution/class-templates');
      setTemplates(response.data.data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const response = await api.get('/api/institution/metadata/credential-types');
      setCredentialTypes(response.data.data.credential_types);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  };

  const openModal = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        template_name: template.template_name,
        description: template.description || '',
        credential_type: template.credential_type,
        validity_period_months: template.validity_period_months || ''
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        template_name: '',
        description: '',
        credential_type: '',
        validity_period_months: ''
      });
    }
    setShowModal(true);
    setMessage({ type: '', text: '' });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        ...formData,
        validity_period_months: formData.validity_period_months ? parseInt(formData.validity_period_months) : null
      };

      if (editingTemplate) {
        await api.put(`/api/institution/class-templates/${editingTemplate.template_id}`, payload);
      } else {
        await api.post('/api/institution/class-templates', payload);
      }

      // Close modal first
      closeModal();
      
      // Reload templates list
      await loadTemplates();
      
      // Show success message after modal is closed
      setMessage({ 
        type: 'success', 
        text: editingTemplate ? 'Template updated successfully!' : 'Template created successfully!' 
      });
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save template' });
    }
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await api.delete(`/api/institution/class-templates/${templateId}`);
      setMessage({ type: 'success', text: 'Template deleted successfully!' });
      await loadTemplates();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to delete template' });
    }
  };

  if (loading) {
    return (
      <InstitutionLayout title="Class Templates">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </InstitutionLayout>
    );
  }

  return (
    <InstitutionLayout title="Class Templates" subtitle="Create reusable templates for your classes">
      <div data-testid="class-templates-page">
        {message.text && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-end mb-6">
          <button
            onClick={() => openModal()}
            className="px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all bg-indigo-600 hover:bg-indigo-700"
            data-testid="create-template-btn"
          >
            + Create Template
          </button>
        </div>

        {/* Templates Grid */}
        {templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.template_id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{template.template_name}</h3>
                    <span className="inline-block px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                      {template.credential_type}
                    </span>
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Validity Period:</span>
                    <span className="font-medium text-gray-900">
                      {template.validity_period_months ? `${template.validity_period_months} months` : 'Lifetime'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(template)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template.template_id)}
                    className="flex-1 px-4 py-2 border border-red-300 rounded-lg text-red-700 font-medium hover:bg-red-50 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Templates Yet</h3>
            <p className="text-gray-600 mb-6">Create your first class template to get started</p>
            <button
              onClick={() => openModal()}
              className="px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all bg-indigo-600 hover:bg-indigo-700"
            >
              + Create Template
            </button>
          </div>
        )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h2>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.template_name}
                  onChange={(e) => setFormData({...formData, template_name: e.target.value})}
                  required
                  placeholder="e.g., Food Safety Certificate"
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

              {/* Validity Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Validity Period (months)
                </label>
                <input
                  type="number"
                  value={formData.validity_period_months}
                  onChange={(e) => setFormData({...formData, validity_period_months: e.target.value})}
                  placeholder="Leave empty for lifetime validity"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty if credential never expires</p>
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
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </InstitutionLayout>
  );
};

export default ClassTemplates;
