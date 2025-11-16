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
      
      // New format: industries object with occupations array
      const industries = categoriesRes.data.data.industries || {};
      
      // Convert to flat array for category selection
      let categoryArray = Object.keys(industries).map(industry => ({
        name: industry,
        occupations: industries[industry],
        example: industries[industry].map(o => o.occupation_name).slice(0, 2).join(', ')
      }));
      
      // Fallback to default categories if none exist
      if (categoryArray.length === 0) {
        categoryArray = [
          { name: 'Healthcare', example: 'Nurse, PSW, Caregiver' },
          { name: 'Security', example: 'Security Guard, Loss Prevention' },
          { name: 'Hospitality', example: 'Server, Bartender, Cook' },
          { name: 'Retail', example: 'Sales Associate, Cashier' },
          { name: 'Construction', example: 'Laborer, Carpenter, Electrician' },
          { name: 'Education', example: 'Tutor, Teaching Assistant' },
          { name: 'Transportation', example: 'Driver, Delivery, Courier' },
          { name: 'Administrative', example: 'Receptionist, Data Entry' }
        ];
      }
      
      setCategories(categoryArray);
      setAvailableSkills(skillsRes.data.data.skills || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Set fallback categories even on error
      setCategories([
        { name: 'Healthcare', example: 'Nurse, PSW, Caregiver' },
        { name: 'Security', example: 'Security Guard, Loss Prevention' },
        { name: 'Hospitality', example: 'Server, Bartender, Cook' },
        { name: 'Retail', example: 'Sales Associate, Cashier' },
        { name: 'Construction', example: 'Laborer, Carpenter, Electrician' },
        { name: 'Education', example: 'Tutor, Teaching Assistant' },
        { name: 'Transportation', example: 'Driver, Delivery, Courier' },
        { name: 'Administrative', example: 'Receptionist, Data Entry' }
      ]);
      setAvailableSkills([
        'Customer Service', 'Communication', 'Time Management', 'Problem Solving',
        'Teamwork', 'Attention to Detail', 'Organization', 'Computer Skills'
      ]);
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Occupation Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.occupation_title}
                  onChange={(e) => setFormData({...formData, occupation_title: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  style={{ borderColor: theme.primaryColor }}
                  placeholder="e.g., Security Guard, Personal Support Worker, Server"
                />
                <p className="text-xs text-gray-500 mt-1">This will be your job title for this profile</p>
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
                      onClick={() => setFormData({...formData, occupation_category: cat.name})}
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
                      <h4 className="font-semibold text-gray-900">{cat.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{cat.example}</p>
                    </button>
                  ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> You can create up to 3 occupation profiles. Each one works independently 
                  with its own skills, certifications, and job matches.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Skills */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Skills for {formData.occupation_title}</h2>
                <p className="text-gray-600">Choose at least 3 skills relevant to this occupation</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {formData.skills.length} skill{formData.skills.length !== 1 ? 's' : ''} selected
                  </span>
                  {formData.skills.length >= 3 && (
                    <span className="text-xs text-green-600 font-semibold">✓ Minimum met</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {availableSkills.map((skill) => {
                  const isSelected = formData.skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-4 py-3 rounded-lg border-2 text-left text-sm font-medium transition-all ${
                        isSelected 
                          ? 'border-current text-white shadow-sm'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                      style={{
                        backgroundColor: isSelected ? theme.primaryColor : 'white',
                        borderColor: isSelected ? theme.primaryColor : undefined
                      }}
                    >
                      {isSelected && <span className="mr-2">✓</span>}
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Hourly Rate */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Preferred Hourly Rate</h2>
                <p className="text-gray-600">What's your target hourly rate for {formData.occupation_title}?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Rate (Optional)
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="15"
                    max="50"
                    value={formData.hourly_rate_preference}
                    onChange={(e) => setFormData({...formData, hourly_rate_preference: parseFloat(e.target.value)})}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-lg"
                    placeholder="20.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This helps match you with jobs that meet your pay expectations
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Profile Summary</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>Occupation:</strong> {formData.occupation_title}</p>
                      <p><strong>Category:</strong> {formData.occupation_category}</p>
                      <p><strong>Skills:</strong> {formData.skills.length} selected</p>
                      <p><strong>Rate:</strong> {formData.hourly_rate_preference ? `$${formData.hourly_rate_preference}/hour` : 'Not set'}</p>
                    </div>
                    <p className="text-sm text-green-700 mt-3">
                      Click Complete to create your occupation profile. You can add certifications later!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-8 border-t border-gray-200 mt-8">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
            )}
            
            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 ml-auto"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 ml-auto"
                style={{ backgroundColor: theme.accentColor }}
              >
                {loading ? 'Creating...' : 'Complete ✓'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateOccupation;
