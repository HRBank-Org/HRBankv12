import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import PersonalInfoStep from '../../components/workforce/PersonalInfoStep';
import SkillsStep from '../../components/workforce/SkillsStep';
import AvailabilityStep from '../../components/workforce/AvailabilityStep';
import DocumentsStep from '../../components/workforce/DocumentsStep';
import ReviewStep from '../../components/workforce/ReviewStep';

import { useLanguage } from '../../contexts/LanguageContext';

const STEPS = [
  { number: 1, title: 'Personal Info', component: PersonalInfoStep },
  { number: 2, title: 'Skills', component: SkillsStep },
  { number: 3, title: 'Availability', component: AvailabilityStep },
  { number: 4, title: 'Documents', component: DocumentsStep },
  { number: 5, title: 'Review', component: ReviewStep }
];

const ProfileWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState({
    address: '',
    postal_code: '',
    skills: [],
    availability_hours: {},
    blackout_dates: [],
    hourly_rate_preference: null,
    documents: []
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = (stepData) => {
    setProfileData({ ...profileData, ...stepData });
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Profile is complete, navigate to dashboard
      navigate('/workforce/dashboard');
    } catch (error) {
      console.error('Error completing profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Header */}
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold">Complete Your Profile</h1>
              <p className="text-sm opacity-90">Step {currentStep} of {STEPS.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: theme.primaryColor,
                width: `${progress}%`
              }}
            ></div>
          </div>
          <div className="flex justify-between mt-3">
            {STEPS.map((step) => (
              <div 
                key={step.number}
                className={`text-xs font-medium ${
                  step.number <= currentStep ? 'opacity-100' : 'opacity-40'
                }`}
                style={{ color: step.number <= currentStep ? theme.primaryColor : '#9CA3AF' }}
              >
                {step.title}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <CurrentStepComponent 
            data={profileData}
            onNext={handleNext}
            onBack={handleBack}
            onComplete={handleComplete}
            isFirstStep={currentStep === 1}
            isLastStep={currentStep === STEPS.length}
          />
        </div>
      </main>
    </div>
  );
};

export default ProfileWizard;
