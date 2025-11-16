import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const STEPS = [
  { number: 1, title: 'Occupation', description: 'Choose your role' },
  { number: 2, title: 'Skills', description: 'Your capabilities' },
  { number: 3, title: 'Experience', description: 'Previous jobs & credentials' }
];

const CreateOccupationSimplified = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [relevantSkills, setRelevantSkills] = useState([]);
  const [relevantCertifications, setRelevantCertifications] = useState([]);
  
  const [formData, setFormData] = useState({
    occupation_title: '',
    occupation_category: '',
    skills: [],
    certifications: [],
    hourly_rate_preference: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadCategories();
  }, []);

  // Load skills when occupation is selected
  useEffect(() => {
    if (formData.occupation_title) {
      loadRelevantSkills();
    }
  }, [formData.occupation_title]);

  // Load certifications when category is selected
  useEffect(() => {
    if (formData.occupation_category) {
      loadRelevantCertifications();
    }
  }, [formData.occupation_category]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/api/occupations/categories');
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
      alert('Failed to load categories. Please refresh the page.');
    }
  };

  const loadRelevantSkills = () => {
    // Map occupations to relevant skills
    const skillsMap = {
      // Healthcare
      'Personal Support Worker (PSW)': ['Patient Care', 'First Aid', 'Vital Signs', 'Documentation', 'Communication', 'Empathy', 'Time Management'],
      'Registered Nurse (RN)': ['Patient Assessment', 'Medication Administration', 'IV Therapy', 'Emergency Response', 'Documentation', 'Critical Thinking'],
      'Caregiver': ['Personal Care', 'Meal Preparation', 'Companionship', 'Housekeeping', 'Patience', 'Communication'],
      
      // Security
      'Security Guard': ['Surveillance', 'Patrol', 'Incident Reporting', 'First Aid', 'Communication', 'Observation', 'Conflict Resolution'],
      'Security Officer': ['Access Control', 'CCTV Monitoring', 'Report Writing', 'Emergency Response', 'Customer Service'],
      
      // Food & Hospitality
      'Server / Waiter / Waitress': ['Customer Service', 'Menu Knowledge', 'Order Taking', 'Cash Handling', 'Multitasking', 'Communication'],
      'Bartender': ['Mixology', 'Customer Service', 'Cash Handling', 'Inventory Management', 'Smart Serve'],
      'Line Cook': ['Food Preparation', 'Cooking Techniques', 'Kitchen Equipment', 'Time Management', 'Sanitation', 'Food Safety'],
      
      // Retail
      'Cashier': ['Cash Handling', 'POS Systems', 'Customer Service', 'Product Knowledge', 'Attention to Detail'],
      'Sales Associate': ['Customer Service', 'Product Knowledge', 'Sales Techniques', 'Merchandising', 'Communication'],
      
      // Default skills for all
      'default': ['Customer Service', 'Communication', 'Time Management', 'Problem Solving', 'Teamwork', 'Attention to Detail', 'Organization', 'Reliability']
    };

    const skills = skillsMap[formData.occupation_title] || skillsMap['default'];
    setRelevantSkills(skills);
  };

  const loadRelevantCertifications = () => {
    // Map categories to common certifications
    const certsMap = {
      'Healthcare & Personal Care': [
        'PSW Certificate',
        'First Aid & CPR',
        'Vulnerable Sector Check',
        'RN License',
        'LPN License',
        'BLS (Basic Life Support)',
        'WHMIS',
        'Food Handler Certificate'
      ],
      'Security & Safety': [
        'Security Guard License',
        'Use of Force Certificate',
        'First Aid & CPR',
        'WHMIS',
        'Fire Safety Training',
        'Vulnerable Sector Check'
      ],
      'Food & Hospitality': [
        'Food Handler Certificate',
        'Smart Serve',
        'Safe Food Handling',
        'WHMIS',
        'First Aid & CPR',
        'Responsible Alcohol Service'
      ],
      'Construction & Trades': [
        'Trade Certificate',
        'WHMIS',
        'Fall Protection',
        'Confined Space',
        'Working at Heights',
        'Forklift License',
        'First Aid & CPR'
      ],
      'Transportation & Logistics': [
        'Driver License (G/G2/AZ/DZ)',
        'Forklift License',
        'WHMIS',
        'TDG (Transportation of Dangerous Goods)',
        'First Aid & CPR',
        'Clean Driving Record'
      ],
      'default': [
        'First Aid & CPR',
        'WHMIS',
        'Food Handler Certificate',
        'Vulnerable Sector Check'
      ]
    };

    const certs = certsMap[formData.occupation_category] || certsMap['default'];
    setRelevantCertifications(certs);
  };

  const handleOccupationSelect = (category, occupation) => {
    setFormData({
      ...formData,
      occupation_category: category,
      occupation_title: occupation,
      skills: [],
      certifications: []
    });
    setHoveredCategory(null);
    setCurrentStep(2);
  };

  const toggleSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const toggleCertification = (cert) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.occupation_title || !formData.occupation_category) {
      setError('Please select an occupation');
      return;
    }

    if (formData.skills.length === 0) {
      setError('Please select at least one skill');
      return;
    }

    if (!formData.hourly_rate_preference) {
      setError('Please enter your preferred hourly rate');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/api/workforce/occupation-profiles', formData);
      navigate('/workforce/occupation-profiles');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create occupation profile');
    } finally {
      setLoading(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Header */}
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workforce/occupation-profiles')} className="text-white hover:opacity-80">
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
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: theme.primaryColor }}></div>
          </div>
          <div className="flex justify-between py-4">
            {STEPS.map((step) => (
              <div key={step.number} className={`flex-1 text-center ${currentStep >= step.number ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`text-sm font-medium ${currentStep === step.number ? 'text-blue-600' : 'text-gray-600'}`}>
                  {step.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          )}

          {/* Step 1: Occupation Selection with Hover */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Occupation</h2>
              <p className="text-gray-600 mb-6">Hover over an industry to see available positions</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.name}
                    className="relative"
                    onMouseEnter={() => setHoveredCategory(cat.name)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <button
                      type="button"
                      className="w-full p-4 rounded-lg border-2 border-gray-300 hover:border-blue-500 text-left transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{cat.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{cat.name}</h4>
                          <p className="text-xs text-gray-600">{cat.description}</p>
                        </div>
                      </div>
                    </button>

                    {/* Dropdown on Hover */}
                    {hoveredCategory === cat.name && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                        {cat.occupations.map((occupation) => (
                          <button
                            key={occupation}
                            type="button"
                            onClick={() => handleOccupationSelect(cat.name, occupation)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            {occupation}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Skills Selection */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Skills</h2>
              <p className="text-gray-600 mb-2">Choose skills relevant to: <strong>{formData.occupation_title}</strong></p>
              <p className="text-sm text-gray-500 mb-6">Select at least 3 skills</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {relevantSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.skills.includes(skill)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {formData.skills.includes(skill) && '✓ '}
                    {skill}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={formData.skills.length < 3}
                  className="flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Next: Certifications
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Certifications */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Certifications</h2>
              <p className="text-gray-600 mb-6">Select certifications you have (optional but recommended)</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {relevantCertifications.map((cert) => (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleCertification(cert)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.certifications.includes(cert)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        formData.certifications.includes(cert) ? 'border-green-500 bg-green-500' : 'border-gray-300'
                      }`}>
                        {formData.certifications.includes(cert) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{cert}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Next: Set Rate
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Hourly Rate */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Preferred Hourly Rate</h2>
              <p className="text-gray-600 mb-6">Set your minimum acceptable hourly rate</p>

              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Rate (CAD) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="15"
                    step="0.50"
                    value={formData.hourly_rate_preference}
                    onChange={(e) => setFormData({...formData, hourly_rate_preference: e.target.value})}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g., 18.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Minimum wage in Ontario is $15.50/hour</p>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.hourly_rate_preference}
                  className="flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {loading ? 'Creating Profile...' : 'Create Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateOccupationSimplified;
