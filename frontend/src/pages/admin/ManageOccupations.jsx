import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';

const ManageOccupations = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showOccupationModal, setShowOccupationModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '',
    description: ''
  });
  
  const [occupationForm, setOccupationForm] = useState({
    title: '',
    minimum_hourly_rate: '',
    certifications: []
  });
  
  const [allCertifications, setAllCertifications] = useState([]);
  const [certSearchQuery, setCertSearchQuery] = useState('');
  const [showCertDropdown, setShowCertDropdown] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
    loadCertifications();
  }, []);

  const loadCertifications = async () => {
    try {
      const response = await api.get('/api/admin/certifications/flat-list');
      setAllCertifications(response.data.data.certifications || []);
    } catch (error) {
      console.error('Failed to load certifications:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/api/admin/occupations/manage');
      const categoriesData = response.data.data.categories || {};
      
      const categoryArray = Object.keys(categoriesData).map(categoryName => ({
        name: categoryName,
        icon: categoriesData[categoryName].icon,
        description: categoriesData[categoryName].description,
        occupations: categoriesData[categoryName].occupations || []
      }));
      
      setCategories(categoryArray);
    } catch (error) {
      console.error('Failed to load categories:', error);
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
      await api.post('/api/admin/occupations/categories', categoryForm);
      alert('Category added successfully!');
      loadCategories();
      setShowCategoryModal(false);
      setCategoryForm({ name: '', icon: '', description: '' });
    } catch (error) {
      alert('Failed to add category');
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}"? This will remove all occupations in this category.`)) {
      return;
    }

    try {
      await api.delete(`/api/admin/occupations/categories/${encodeURIComponent(categoryName)}`);
      alert('Category deleted');
      loadCategories();
    } catch (error) {
      alert('Failed to delete category');
    }
  };

  const handleAddOccupation = async () => {
    if (!occupationForm.title || !selectedCategory) {
      alert('Please enter occupation title');
      return;
    }
    
    if (!occupationForm.minimum_hourly_rate || parseFloat(occupationForm.minimum_hourly_rate) <= 0) {
      alert('Please enter a valid minimum hourly rate');
      return;
    }

    try {
      await api.post('/api/admin/occupations/add', {
        category: selectedCategory,
        occupation: occupationForm.title,
        minimum_hourly_rate: parseFloat(occupationForm.minimum_hourly_rate),
        required_certifications: occupationForm.certifications
      });
      alert('Occupation added successfully!');
      loadCategories();
      setShowOccupationModal(false);
      setOccupationForm({ title: '', minimum_hourly_rate: '', certifications: [] });
      setCertSearchQuery('');
    } catch (error) {
      alert('Failed to add occupation');
    }
  };

  const addCertificationToOccupation = (cert) => {
    if (!occupationForm.certifications.includes(cert)) {
      setOccupationForm({
        ...occupationForm,
        certifications: [...occupationForm.certifications, cert]
      });
    }
    setCertSearchQuery('');
    setShowCertDropdown(false);
  };

  const removeCertificationFromOccupation = (cert) => {
    setOccupationForm({
      ...occupationForm,
      certifications: occupationForm.certifications.filter(c => c !== cert)
    });
  };

  const filteredCertifications = allCertifications.filter(cert =>
    cert.toLowerCase().includes(certSearchQuery.toLowerCase()) &&
    !occupationForm.certifications.includes(cert)
  );

  const handleDeleteOccupation = async (categoryName, occupation) => {
    if (!window.confirm(`Delete "${occupation}"?`)) {
      return;
    }

    try {
      await api.delete('/api/admin/occupations/remove', {
        data: { category: categoryName, occupation }
      });
      alert('Occupation deleted');
      loadCategories();
    } catch (error) {
      alert('Failed to delete occupation');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SuperAdminSidebar />
        <div className="flex-1 ml-[70px] lg:ml-[260px] pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <div className="flex-1 ml-[70px] lg:ml-[260px] pt-20">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Industries & Occupations</h1>
                <p className="text-sm text-gray-600">Add, edit, or remove occupation categories and titles</p>
              </div>
            </div>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Industry
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
                    <p className="text-xs text-gray-500 mt-1">{cat.occupations.length} occupations</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setShowOccupationModal(true);
                    }}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    + Add Occupation
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.name)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete Industry
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {cat.occupations.map((occupation, idx) => {
                  // Handle both string format (legacy) and object format (new)
                  const isObject = typeof occupation === 'object';
                  const title = isObject ? occupation.title : occupation;
                  const certs = isObject ? occupation.required_certifications || [] : [];
                  
                  return (
                    <div
                      key={idx}
                      className="flex items-start justify-between px-3 py-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{title}</span>
                        {certs.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {certs.map((cert, certIdx) => (
                              <span
                                key={certIdx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                🎓 {cert}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteOccupation(cat.name, title)}
                        className="text-red-600 hover:text-red-800 text-xs ml-2 flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Industry Category</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Technology & IT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
                <input
                  type="text"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({...categoryForm, icon: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 💻"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Software, hardware, IT support"
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
                Add Industry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Occupation Modal */}
      {showOccupationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Add Occupation to {selectedCategory}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation Title *
                </label>
                <input
                  type="text"
                  value={occupationForm.title}
                  onChange={(e) => setOccupationForm({...occupationForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Software Developer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Hourly Rate * <span className="text-gray-500 font-normal">(must be ≥ provincial minimum wage)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={occupationForm.minimum_hourly_rate}
                    onChange={(e) => setOccupationForm({...occupationForm, minimum_hourly_rate: e.target.value})}
                    className="w-full pl-7 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="17.20"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">/hr</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">This rate will be enforced as minimum when employers create roles</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Certifications (optional)
                </label>
                
                {/* Selected Certifications */}
                {occupationForm.certifications.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {occupationForm.certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        <span>🎓 {cert}</span>
                        <button
                          type="button"
                          onClick={() => removeCertificationFromOccupation(cert)}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search and Add Certifications */}
                <div className="relative">
                  <input
                    type="text"
                    value={certSearchQuery}
                    onChange={(e) => {
                      setCertSearchQuery(e.target.value);
                      setShowCertDropdown(true);
                    }}
                    onFocus={() => setShowCertDropdown(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Search and select certifications..."
                  />
                  
                  {/* Dropdown */}
                  {showCertDropdown && certSearchQuery && filteredCertifications.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCertifications.slice(0, 10).map((cert, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => addCertificationToOccupation(cert)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                        >
                          {cert}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 mt-1">
                  💡 Search for standard certifications from the government-approved list
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowOccupationModal(false);
                  setOccupationForm({ title: '', certifications: [] });
                  setSelectedCategory(null);
                  setCertSearchQuery('');
                  setShowCertDropdown(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOccupation}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Occupation
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ManageOccupations;
