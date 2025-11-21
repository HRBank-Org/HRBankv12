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
  const [allCertifications, setAllCertifications] = useState([]);
  const [certSearchQuery, setCertSearchQuery] = useState('');
  const [showCertDropdown, setShowCertDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    occupation_title: '',
    occupation_category: '',
    skills: [],
    certifications: [],
    years_of_experience: 0
  });
  
  const [credentials, setCredentials] = useState([]);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [credentialForm, setCredentialForm] = useState({
    credential_type: 'Certificate',
    credential_name: '',
    field_of_study: '',
    institution_name: '',
    institution_email: '',
    issue_date: '',
    expiry_date: '',
    document_file: null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadCategories();
    loadAllCertifications();
  }, []);

  const loadAllCertifications = async () => {
    try {
      const response = await api.get('/api/admin/certifications/flat-list');
      setAllCertifications(response.data.data.certifications || []);
    } catch (error) {
      console.error('Failed to load certifications:', error);
    }
  };

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

    setLoading(true);
    setError('');

    try {
      // Create occupation profile
      const profileData = {
        ...formData,
        credentials: credentials
      };
      
      await api.post('/api/occupations', profileData);
      
      // If credentials added, send verification requests
      if (credentials.length > 0) {
        alert(`Profile created! ${credentials.length} credential(s) submitted for verification. Institutions will be notified.`);
      } else {
        alert('Profile created successfully!');
      }
      
      navigate('/workforce/dashboard');
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

          {/* Step 3: Experience & Credentials */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Experience & Credentials</h2>
              <p className="text-gray-600 mb-6">Add your work experience and verified credentials</p>

              {/* Years of Experience */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience in this field
                </label>
                <select
                  value={formData.years_of_experience}
                  onChange={(e) => setFormData({...formData, years_of_experience: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">Less than 1 year</option>
                  <option value="1">1 year</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                  <option value="4">4 years</option>
                  <option value="5">5+ years</option>
                  <option value="10">10+ years</option>
                </select>
              </div>

              {/* Standard Certifications Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Certifications</h3>
                <p className="text-sm text-gray-600 mb-4">Select certifications you possess from the standardized list</p>
                
                {/* Selected Certifications */}
                {formData.certifications.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {formData.certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        <span>🎓 {cert}</span>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, certifications: formData.certifications.filter(c => c !== cert)})}
                          className="text-green-600 hover:text-green-800 font-bold"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Search for your certifications..."
                  />
                  
                  {/* Dropdown */}
                  {showCertDropdown && certSearchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {allCertifications
                        .filter(cert => 
                          cert.toLowerCase().includes(certSearchQuery.toLowerCase()) &&
                          !formData.certifications.includes(cert)
                        )
                        .slice(0, 10)
                        .map((cert, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFormData({...formData, certifications: [...formData.certifications, cert]});
                              setCertSearchQuery('');
                              setShowCertDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                          >
                            {cert}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 mt-1">
                  💡 Select from government-approved certifications (Red Seal, Smart Serve, First Aid, etc.)
                </p>
              </div>

              {/* Institution-Verified Credentials Section */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Institution-Verified Credentials</h3>
                    <p className="text-sm text-gray-600">Add degrees, diplomas, licenses (requires institution verification)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCredentialModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    + Add Credential
                  </button>
                </div>

                {credentials.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600">No credentials added yet</p>
                    <p className="text-sm text-gray-500 mt-1">Add your certifications, degrees, or licenses to verify your qualifications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {credentials.map((cred, index) => (
                      <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{cred.credential_name}</h4>
                            <p className="text-sm text-gray-600">{cred.credential_type} • {cred.institution_name}</p>
                            <p className="text-xs text-gray-500 mt-1">Issued: {cred.issue_date}</p>
                            <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                              ⏳ Pending Verification
                            </span>
                          </div>
                          <button
                            onClick={() => setCredentials(credentials.filter((_, i) => i !== index))}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
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

      {/* Add Credential Modal */}
      {showCredentialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Credential for Verification</h3>
            <p className="text-sm text-gray-600 mb-6">
              The issuing institution will be invited to verify this credential
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credential Type</label>
                  <select
                    value={credentialForm.credential_type}
                    onChange={(e) => setCredentialForm({...credentialForm, credential_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Certificate</option>
                    <option>Diploma</option>
                    <option>Degree</option>
                    <option>License</option>
                    <option>Certification</option>
                    <option>Training Completion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study (Optional)</label>
                  <input
                    type="text"
                    value={credentialForm.field_of_study}
                    onChange={(e) => setCredentialForm({...credentialForm, field_of_study: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Nursing, Healthcare"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credential Name *</label>
                <input
                  type="text"
                  value={credentialForm.credential_name}
                  onChange={(e) => setCredentialForm({...credentialForm, credential_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Personal Support Worker Certificate"
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Issuing Institution</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name *</label>
                    <input
                      type="text"
                      value={credentialForm.institution_name}
                      onChange={(e) => setCredentialForm({...credentialForm, institution_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., George Brown College"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Institution Email *</label>
                    <input
                      type="email"
                      value={credentialForm.institution_email}
                      onChange={(e) => setCredentialForm({...credentialForm, institution_email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., registrar@georgebrown.ca"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Institution will receive verification request at this email
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
                  <input
                    type="date"
                    value={credentialForm.issue_date}
                    onChange={(e) => setCredentialForm({...credentialForm, issue_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (if applicable)</label>
                  <input
                    type="date"
                    value={credentialForm.expiry_date}
                    onChange={(e) => setCredentialForm({...credentialForm, expiry_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>How verification works:</strong><br/>
                  1. You submit this credential<br/>
                  2. Institution receives email invitation to verify<br/>
                  3. Institution creates account and confirms/rejects<br/>
                  4. Verified credentials appear with ✓ badge on your profile
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCredentialModal(false);
                  setCredentialForm({
                    credential_type: 'Certificate',
                    credential_name: '',
                    field_of_study: '',
                    institution_name: '',
                    institution_email: '',
                    issue_date: '',
                    expiry_date: '',
                    document_file: null
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!credentialForm.credential_name || !credentialForm.institution_name || !credentialForm.institution_email || !credentialForm.issue_date) {
                    alert('Please fill all required fields');
                    return;
                  }
                  setCredentials([...credentials, credentialForm]);
                  setShowCredentialModal(false);
                  setCredentialForm({
                    credential_type: 'Certificate',
                    credential_name: '',
                    field_of_study: '',
                    institution_name: '',
                    institution_email: '',
                    issue_date: '',
                    expiry_date: '',
                    document_file: null
                  });
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Credential
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOccupationSimplified;
