import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import UserTypeTabs from '../components/UserTypeTabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import { getLogoByUserType, getLogoBackgroundColor } from '../utils/logoUtils';

const Login = () => {
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
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    toast({
      title: 'Google Login',
      description: 'Google OAuth integration - Mock functionality',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Mock login validation
    setTimeout(() => {
      if (formData.email && formData.password) {
        toast({
          title: 'Login Successful',
          description: `Signed in as ${activeTab}`,
        });
        // Store mock user data
        localStorage.setItem('hrbank_user', JSON.stringify({
          email: formData.email,
          userType: activeTab,
          isAuthenticated: true
        }));
        navigate('/dashboard');
      } else {
        toast({
          title: 'Error',
          description: 'Please fill in all fields',
          variant: 'destructive'
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#2C4A6B] rounded-2xl p-4 w-20 h-20 flex items-center justify-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_hrsite-validator/artifacts/7kpg5ub1_HRB%20App%20Icon%20Workforce.jpg" 
              alt="HR Bank Logo" 
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Welcome to HR Bank
        </h1>
        <p className="text-center text-gray-600 mb-6 text-sm">
          Sign in to continue
        </p>

        {/* User Type Tabs */}
        <UserTypeTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Google Login Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full mb-4 h-11 bg-white hover:bg-gray-50 border-gray-300"
          onClick={handleGoogleLogin}
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

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
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
            <Link 
              to="/forgot-password" 
              className="text-sm text-[#4267B2] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#4267B2] hover:bg-[#365899] text-white font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#4267B2] hover:underline font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;