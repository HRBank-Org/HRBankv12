import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const STEPS = [
  { number: 1, title: 'Occupation', description: 'Choose your career path' },
  { number: 2, title: 'Skills', description: 'What can you do?' },
  { number: 3, title: 'Rate', description: 'Your preferred pay' }
];

const CreateOccupation = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    occupation_title: '',
    occupation_category: '',
    skills: [],
    hourly_rate_preference: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesRes, skillsRes] = await Promise.all([
        api.get('/api/occupations/categories'),
        api.get('/api/workforce/skills/common')
      ]);
      
      // New structured format with categories object
      const categoriesData = categoriesRes.data.data.categories || {};
      
      // Convert to array for rendering
      const categoryArray = Object.keys(categoriesData).map(categoryName => ({
        name: categoryName,
        icon: categoriesData[categoryName].icon,
        description: categoriesData[categoryName].description,
        occupations: categoriesData[categoryName].occupations || []
      }));
      
      setCategories(categoryArray);
      setAvailableSkills(skillsRes.data.data.skills || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load categories. Please refresh the page.');
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = () => {
    setError('');
    
    if (currentStep === 1) {
      if (!formData.occupation_title || !formData.occupation_category) {
        setError('Please enter occupation title and select category');
        return;
      }
    } else if (currentStep === 2) {
      if (formData.skills.length < 3) {
        setError('Please select at least 3 skills');
        return;
      }
    }
    
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      await api.post('/api/occupations', formData);
      navigate('/workforce/occupations');
    } catch (err) {
      setError(err.response?.data?.error?.detail || err.response?.data?.error?.message || 'Failed to create occupation profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill) => {
    if (formData.skills.includes(skill)) {
      setFormData({
        ...formData,
        skills: formData.skills.filter(s => s !== skill)
      });
    } else {
      setFormData({
        ...formData,
        skills: [...formData.skills, skill]
      });
    }
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setFormData({
      ...formData,
      occupation_category: cat.name,
      occupation_title: '' // Reset occupation when category changes
    });
  };

  const handleOccupationSelect = (occupation) => {
    const occupationTitle = typeof occupation === 'object' ? occupation.title : occupation;
    setFormData({
      ...formData,
      occupation_title: occupationTitle
    });
    setSelectedCategory(null); // Close dropdown
  };

  const toggleTimeSlot = (day, hour) => {
    const timeSlot = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
    const daySlots = formData.availability_hours[day] || [];
    
    if (daySlots.includes(timeSlot)) {
      setFormData({
        ...formData,
        availability_hours: {
          ...formData.availability_hours,
          [day]: daySlots.filter(t => t !== timeSlot)
        }
      });
    } else {
      setFormData({
        ...formData,
        availability_hours: {
          ...formData.availability_hours,
          [day]: [...daySlots, timeSlot].sort()
        }
      });
    }
  };

  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Header */}
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/workforce/occupations')} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold">Create Occupation Profile</h1>
              <p className="text-sm opacity-90">Step {currentStep} of {STEPS.length}</p>
            </div>
          </div>
          
          {/* Progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((step) => (
              <div key={step.number} className="flex-1">
                <div className={`h-2 rounded-full transition-all ${
                  step.number <= currentStep ? 'bg-white' : 'bg-white/30'
                }`}></div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-2 opacity-75">{STEPS[currentStep - 1].title}: {STEPS[currentStep - 1].description}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {/* Step 1: Occupation Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">What's Your Occupation?</h2>
                <p className="text-gray-600">Choose a career path to create a profile for</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Category <span className="text-red-500">*</span>
                </label>
                {categories.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading categories...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => handleCategorySelect(cat)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          formData.occupation_category === cat.name
                            ? 'border-current'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{
                          borderColor: formData.occupation_category === cat.name ? theme.primaryColor : undefined,
                          backgroundColor: formData.occupation_category === cat.name ? `${theme.primaryColor}10` : 'white'
                        }}
                      >
                        <div className="text-2xl mb-2">{cat.icon}</div>
                        <h4 className="font-semibold text-gray-900">{cat.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{cat.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Occupation Title Dropdown - CLICK-BASED, NOT HOVER */}
              {selectedCategory && selectedCategory.occupations && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Occupation Title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                      {selectedCategory.occupations.map((occupation, idx) => {
                        const occupationTitle = typeof occupation === 'object' ? occupation.title : occupation;
                        const minRate = typeof occupation === 'object' ? occupation.minimum_hourly_rate : null;
                        
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleOccupationSelect(occupation)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{occupationTitle}</div>
                            {minRate && (
                              <div className="text-xs text-gray-500 mt-1">Min. Rate: ${minRate}/hr</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Show selected occupation */}
              {formData.occupation_title && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-900">Selected: {formData.occupation_title}</p>
                      <p className="text-xs text-green-700">Category: {formData.occupation_category}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Choose the occupation that best matches your primary role. 
                  You can create up to 3 different occupation profiles if you work in multiple fields.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Skills Selection - KEEP AS IS */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">What Are Your Skills?</h2>
                <p className="text-gray-600">Select at least 3 skills that match your expertise</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Skills <span className="text-red-500">*</span> <span className="text-gray-500 text-xs">(Selected: {formData.skills.length})</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSkills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        formData.skills.includes(skill)
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={{
                        backgroundColor: formData.skills.includes(skill) ? theme.primaryColor : undefined
                      }}
                    >
                      {formData.skills.includes(skill) && '✓ '}{skill}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Select skills that you're confident in. 
                  These will help match you with relevant job opportunities.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Rate Preference - KEEP AS IS */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Rate Preference</h2>
                <p className="text-gray-600">What's your preferred hourly rate?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Rate ($/hour)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={formData.hourly_rate_preference}
                  onChange={(e) => setFormData({...formData, hourly_rate_preference: parseFloat(e.target.value) || ''})}
                  placeholder="e.g., 20.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This helps match you with jobs that meet your pay expectations. Leave blank if flexible.
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Profile Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Occupation:</span>
                    <span className="font-medium text-gray-900">{formData.occupation_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium text-gray-900">{formData.occupation_category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Skills:</span>
                    <span className="font-medium text-gray-900">{formData.skills.length} selected</span>
                  </div>
                  {formData.hourly_rate_preference && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rate:</span>
                      <span className="font-medium text-gray-900">${formData.hourly_rate_preference}/hour</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Note:</strong> You can always edit this information later from your profile page.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Back
              </button>
            )}
            
            <div className="flex-1"></div>
            
            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                disabled={currentStep === 1 && (!formData.occupation_title || !formData.occupation_category)}
                className="px-8 py-3 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-8 py-3 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {loading ? 'Creating...' : 'Create Profile'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateOccupation;