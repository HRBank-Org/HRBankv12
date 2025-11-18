import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubdomainUserType, getLoginRoute } from '../utils/subdomainDetector';
import { Briefcase, Building2, GraduationCap, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';

const SubdomainPortal = () => {
  const navigate = useNavigate();
  const userType = getSubdomainUserType();

  const portalConfig = {
    admin: {
      title: 'Admin Portal',
      icon: Shield,
      description: 'HR Bank Administration',
      color: 'from-red-600 to-red-800',
      bgColor: 'bg-red-50',
    },
    employer: {
      title: 'Employer Portal',
      icon: Building2,
      description: 'Hire Verified Workers',
      color: 'from-orange-500 to-orange-700',
      bgColor: 'bg-orange-50',
    },
    workforce: {
      title: 'Workforce Portal',
      icon: Briefcase,
      description: 'Find Quality Jobs',
      color: 'from-blue-600 to-blue-800',
      bgColor: 'bg-blue-50',
    },
    institution: {
      title: 'Institution Portal',
      icon: GraduationCap,
      description: 'Certify & Train Workers',
      color: 'from-gray-700 to-gray-900',
      bgColor: 'bg-gray-50',
    },
  };

  const config = portalConfig[userType] || portalConfig.workforce;
  const Icon = config.icon;

  // Auto-redirect to login after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(getLoginRoute(userType));
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, userType]);

  const handleLoginNow = () => {
    navigate(getLoginRoute(userType));
  };

  const handleSignup = () => {
    navigate(`/signup?type=${userType}`);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${config.bgColor}`}>
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${config.color} mx-auto mb-6 flex items-center justify-center`}>
            <Icon className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h1 className=\"text-3xl font-bold text-gray-900 mb-2\">
            {config.title}
          </h1>
          <p className=\"text-gray-600 mb-8\">{config.description}</p>

          {/* Welcome Message */}
          <div className=\"bg-gray-50 rounded-lg p-4 mb-6\">
            <p className=\"text-sm text-gray-700\">
              Welcome to HR Bank {config.title}
            </p>
            <p className=\"text-xs text-gray-500 mt-2\">
              Redirecting to login...
            </p>
          </div>

          {/* Action Buttons */}
          <div className=\"space-y-3\">
            <Button
              onClick={handleLoginNow}
              className={`w-full bg-gradient-to-br ${config.color} hover:opacity-90 text-white h-12`}
            >
              Sign In Now
            </Button>
            <Button
              onClick={handleSignup}
              variant=\"outline\"
              className=\"w-full h-12\"
            >
              Create Account
            </Button>
          </div>

          {/* Back to Main */}
          <div className=\"mt-6\">
            <a
              href=\"https://hrbank.ca\"
              className=\"text-sm text-gray-500 hover:text-gray-700 underline\"
            >
              ← Back to Main Site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubdomainPortal;
