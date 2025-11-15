import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import { Upload, Trash2, LogOut } from 'lucide-react';
import axios from 'axios';
import { LOGOS } from '../utils/logoUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InstitutionSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [currentLogo, setCurrentLogo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and is an institution
    const userData = localStorage.getItem('hrbank_user');
    if (!userData) {
      navigate('/');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType !== 'institution') {
      toast({
        title: 'Access Denied',
        description: 'Only institutions can access this page',
        variant: 'destructive'
      });
      navigate('/dashboard');
      return;
    }
    setUser(parsedUser);
    setInstitutionName(parsedUser.fullName || '');
    
    // Fetch current logo if exists
    fetchCurrentLogo(parsedUser.id);
  }, [navigate, toast]);

  const fetchCurrentLogo = async (institutionId) => {
    try {
      const response = await axios.get(`${API}/partner-logos/`);
      const userLogo = response.data.find(logo => logo.institution_id === institutionId);
      if (userLogo) {
        setCurrentLogo(userLogo);
        setLogoUrl(userLogo.logo_url);
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    }
  };

  const handleUploadLogo = async (e) => {
    e.preventDefault();
    
    if (!logoUrl || !institutionName) {
      toast({
        title: 'Error',
        description: 'Please provide both institution name and logo URL',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API}/partner-logos/?institution_id=${user.id}`,
        {
          institution_name: institutionName,
          logo_url: logoUrl
        }
      );

      toast({
        title: 'Success',
        description: 'Logo uploaded successfully and will appear on the landing page',
      });

      setCurrentLogo(response.data);
      setLogoUrl('');
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error.response?.data?.detail || 'Failed to upload logo',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!currentLogo) return;

    setIsLoading(true);

    try {
      await axios.delete(`${API}/partner-logos/${currentLogo.id}?institution_id=${user.id}`);

      toast({
        title: 'Success',
        description: 'Logo deleted successfully',
      });

      setCurrentLogo(null);
      setLogoUrl('');
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error.response?.data?.detail || 'Failed to delete logo',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hrbank_user');
    navigate('/');
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
            <h1 className="text-xl font-bold text-gray-900">HR Bank - Institution Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </Button>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Partner Logo Management</h2>
          <p className="text-gray-600">Upload your institution's logo to appear on the HR Bank landing page</p>
        </div>

        <div className="grid gap-6">
          {/* Current Logo Display */}
          {currentLogo && (
            <Card>
              <CardHeader>
                <CardTitle>Current Logo</CardTitle>
                <CardDescription>This logo is currently displayed on the landing page</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-40 h-20 bg-white border border-gray-300 rounded-lg flex items-center justify-center p-2">
                      <img
                        src={currentLogo.logo_url}
                        alt={currentLogo.institution_name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{currentLogo.institution_name}</p>
                      <p className="text-sm text-gray-500">Uploaded {new Date(currentLogo.uploaded_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteLogo}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload New Logo Form */}
          <Card>
            <CardHeader>
              <CardTitle>Upload New Logo</CardTitle>
              <CardDescription>
                {currentLogo 
                  ? 'Replace your current logo with a new one' 
                  : 'Add your institution logo to the partner carousel'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadLogo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Institution Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Your Institution Name"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="h-11"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Recommended size: 200x80px (transparent background preferred)
                  </p>
                </div>

                {/* Logo Preview */}
                {logoUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview
                    </label>
                    <div className="w-40 h-20 bg-white border border-gray-300 rounded-lg flex items-center justify-center p-2">
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/200x80/cccccc/666666?text=Invalid+URL';
                        }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#4267B2] hover:bg-[#365899] text-white h-11 flex items-center justify-center gap-2"
                  disabled={isLoading}
                >
                  <Upload className="w-4 h-4" />
                  {isLoading ? 'Uploading...' : currentLogo ? 'Update Logo' : 'Upload Logo'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Logo should be in PNG, JPG, or SVG format</li>
                <li>• Recommended dimensions: 200x80 pixels</li>
                <li>• Transparent background is preferred for best display</li>
                <li>• Logo will appear in the partner carousel on the landing page</li>
                <li>• You can update or delete your logo at any time</li>
                <li>• Logo must represent your institution accurately</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default InstitutionSettings;
