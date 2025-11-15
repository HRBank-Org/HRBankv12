import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Mock password reset
    setTimeout(() => {
      if (email) {
        toast({
          title: 'Password Reset Email Sent',
          description: 'Check your email for reset instructions',
        });
        setIsSubmitted(true);
      } else {
        toast({
          title: 'Error',
          description: 'Please enter your email address',
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

        {!isSubmitted ? (
          <>
            {/* Title */}
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Forgot Password?
            </h1>
            <p className="text-center text-gray-600 mb-8 text-sm">
              Enter your email address and we'll send you instructions to reset your password
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#4267B2] hover:bg-[#365899] text-white font-medium mb-4"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </>
        ) : (
          <>
            {/* Success Message */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="bg-green-100 rounded-full p-4">
                  <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Check your email
              </h2>
              <p className="text-gray-600 mb-8 text-sm">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
            </div>
          </>
        )}

        {/* Back to Login */}
        <Link 
          to="/" 
          className="flex items-center justify-center gap-2 text-sm text-[#4267B2] hover:underline font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;