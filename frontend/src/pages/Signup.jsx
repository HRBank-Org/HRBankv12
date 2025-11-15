import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import UserTypeTabs from '../components/UserTypeTabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import { getLogoByUserType, getLogoBackgroundColor } from '../utils/logoUtils';

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const userTypeFromUrl = searchParams.get('type') || 'workforce';
  const [activeTab, setActiveTab] = useState(userTypeFromUrl);

  useEffect(() => {
    if (userTypeFromUrl) {
      setActiveTab(userTypeFromUrl);
    }
  }, [userTypeFromUrl]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignup = () => {
    toast({
      title: 'Google Sign Up',
      description: 'Google OAuth integration - Mock functionality',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.fullName,
          password: formData.password,
          user_type: activeTab
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Account Created',
          description: 'Your account has been created successfully',
        });
        
        // Store user data
        localStorage.setItem('hrbank_user', JSON.stringify({
          ...data.user,
          userType: data.user.user_type,
          fullName: data.user.full_name,
          isAuthenticated: true
        }));
        
        navigate('/dashboard');
      } else {
        toast({
          title: 'Signup Failed',
          description: data.detail || 'Failed to create account',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to server. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className={`${getLogoBackgroundColor(activeTab)} rounded-2xl p-4 w-20 h-20 flex items-center justify-center transition-all duration-300`}>
            <img 
              src={getLogoByUserType(activeTab)}
              alt="HR Bank Logo" 
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Create your account
        </h1>
        <p className="text-center text-gray-600 mb-6 text-sm">
          Join HR Bank today
        </p>

        {/* User Type Tabs */}
        <UserTypeTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Google Signup Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full mb-4 h-11 bg-white hover:bg-gray-50 border-gray-300"
          onClick={handleGoogleSignup}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-5 h-5 mr-2"
          />
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <Input
              type="text"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="h-11"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-11"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="h-11"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#4267B2] hover:bg-[#365899] text-white font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>

        {/* Sign In Link */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/" className="text-[#4267B2] hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Signup;