import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const ManageCertifications = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '',
    description: ''
  });
  
  const [certForm, setCertForm] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    loadCertifications();
  }, []);

  const loadCertifications = async () => {
    try {
      const response = await api.get('/api/admin/certifications/list');
      const categoriesData = response.data.data.categories || {};
      
      const categoryArray = Object.keys(categoriesData).map(categoryName => ({
        name: categoryName,
        icon: categoriesData[categoryName].icon,
        description: categoriesData[categoryName].description,
        certifications: categoriesData[categoryName].certifications || []
      }));
      
      setCategories(categoryArray);
    } catch (error) {
      console.error('Failed to load certifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name || !categoryForm.description) {
      alert('Please fill all fields');
      return;
    }

    try {
      await api.post('/api/admin/certifications/categories', categoryForm);
      alert('Category added successfully!');
      loadCertifications();
      setShowCategoryModal(false);
      setCategoryForm({ name: '', icon: '', description: '' });
    } catch (error) {
      alert('Failed to add category');
    }
  };

  const handleAddCertification = async () => {
    if (!certForm || !selectedCategory) {
      alert('Please enter certification name');
      return;
    }

    try {
      await api.post('/api/admin/certifications/add', {
        category: selectedCategory,
        certification: certForm
      });
      alert('Certification added successfully!');
      loadCertifications();
      setShowCertModal(false);
      setCertForm('');
    } catch (error) {
      alert('Failed to add certification');
    }
  };

  const handleDeleteCertification = async (categoryName, certification) => {
    if (!window.confirm(`Delete "${certification}"?`)) {
      return;
    }

    try {
      await api.delete('/api/admin/certifications/remove', {
        data: { category: categoryName, certification }
      });
      alert('Certification deleted');
      loadCertifications();
    } catch (error) {
      alert('Failed to delete certification');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/admin/dashboard')} className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Standard Certifications</h1>
                <p className="text-sm text-gray-600">Standardized certifications based on Canadian government standards</p>
              </div>
            </div>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Category
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-6">
          {categories.map((cat) => (
            <div key={cat.name} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{cat.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{cat.name}</h3>
                    <p className="text-sm text-gray-600">{cat.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{cat.certifications.length} certifications</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setShowCertModal(true);
                    }}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    + Add Certification
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {cat.certifications.map((cert, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded border border-gray-200"
                  >
                    <span className="text-sm text-gray-700">{cert}</span>
                    <button
                      onClick={() => handleDeleteCertification(cat.name, cert)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Certification Category</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Professional Services"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
                <input
                  type="text"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({...categoryForm, icon: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 💼"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Professional certifications and designations"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryForm({ name: '', icon: '', description: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Certification Modal */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Add Certification to {selectedCategory}
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certification Name</label>
              <input
                type="text"
                value={certForm}
                onChange={(e) => setCertForm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Red Seal - Carpenter"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCertModal(false);
                  setCertForm('');
                  setSelectedCategory(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCertification}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Certification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCertifications;
