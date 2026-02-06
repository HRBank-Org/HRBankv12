import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiArrowLeft } from 'react-icons/fi';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use the login function from AuthContext
      const response = await login({
        ...formData,
        user_type: 'admin'
      });

      console.log('Login response:', response);
      console.log('User type from response:', response?.data?.user_type);

      if (response.success) {
        const userType = response.data?.user_type;
        // Verify it's an admin or super_admin
        if (userType === 'admin' || userType === 'super_admin') {
          // Small delay to ensure token is stored
          setTimeout(() => {
            navigate('/admin/super-dashboard');
          }, 100);
        } else {
          console.error('User type mismatch. Expected admin/super_admin, got:', userType);
          setError('Access denied. Admin credentials required.');
          logout();
        }
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.detail || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col px-4">
      {/* Back Button */}
      <div className="pt-6 px-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <FiArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="bg-white w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          <h1 className="text-3xl font-bold text-white mb-2">HR Bank Admin</h1>
          <p className="text-blue-100">Administrative Portal</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@hrbank.ca"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-blue-100 text-sm">
          <p>HR Bank Administrative System</p>
          <p className="mt-1">© 2024 HR Bank Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
    </div>
  );
};

export default AdminLogin;
