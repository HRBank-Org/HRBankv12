import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const SkillsStep = ({ data, onNext, onBack }) => {
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState(data.skills || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const response = await api.get('/api/workforce/skills/common');
      setAvailableSkills(response.data.data.skills);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  };

  const toggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedSkills.length < 3) {
      setError('Please select at least 3 skills');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/api/workforce/me/profile/skills', selectedSkills);
      onNext({ skills: selectedSkills });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update skills');
    } finally {
      setLoading(false);
    }
  };

  const filteredSkills = availableSkills.filter(skill =>
    skill.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">What Skills Do You Have?</h2>
      <p className="text-gray-600 mb-6">Select at least 3 skills that match your experience</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {/* Selected Skills Count */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected
          </span>
          {selectedSkills.length >= 3 && (
            <span className="text-xs text-green-600 font-semibold">✓ Minimum met</span>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search skills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
        />
      </div>

      {/* Skills Grid */}
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {filteredSkills.map((skill) => {
            const isSelected = selectedSkills.includes(skill);
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

      {/* Selected Skills Tags */}
      {selectedSkills.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Selected Skills:</p>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {skill}
                <button
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className="hover:bg-white/20 rounded-full p-0.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || selectedSkills.length < 3}
          className="px-8 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {loading ? 'Saving...' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default SkillsStep;
