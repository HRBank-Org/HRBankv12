import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LogOut, Briefcase, Users, Building2 } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is authenticated
    const userData = localStorage.getItem('hrbank_user');
    if (!userData) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('hrbank_user');
    navigate('/');
  };

  const getUserTypeIcon = (userType) => {
    switch(userType) {
      case 'workforce':
        return <Briefcase className="w-8 h-8" />;
      case 'employer':
        return <Building2 className="w-8 h-8" />;
      case 'institution':
        return <Users className="w-8 h-8" />;
      default:
        return <Briefcase className="w-8 h-8" />;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-[#2C4A6B] rounded-xl p-2 w-12 h-12 flex items-center justify-center">
              <img 
                src="https://customer-assets.emergentagent.com/job_hrsite-validator/artifacts/7kpg5ub1_HRB%20App%20Icon%20Workforce.jpg" 
                alt="HR Bank Logo" 
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <h1 className="text-xl font-bold text-gray-900">HR Bank</h1>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back{user.fullName ? `, ${user.fullName}` : ''}!
          </h2>
          <p className="text-gray-600">You're signed in as a {user.userType}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-[#4267B2] text-white p-3 rounded-lg">
                  {getUserTypeIcon(user.userType)}
                </div>
                <div>
                  <CardTitle className="text-lg">Your Profile</CardTitle>
                  <CardDescription className="capitalize">{user.userType} Account</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <p className="text-gray-600">{user.email}</p>
                </div>
                {user.fullName && (
                  <div>
                    <span className="font-medium text-gray-700">Name:</span>
                    <p className="text-gray-600">{user.fullName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mock Feature Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Edit Profile
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Notifications
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Get Started</CardTitle>
              <CardDescription>Complete your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                This is a mock dashboard. In a full implementation, you would see personalized content based on your user type.
              </p>
              <Button className="w-full bg-[#4267B2] hover:bg-[#365899]">
                Complete Setup
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;