import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { User, Mail, Phone, MapPin, Calendar, Edit2, Shield } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import BlockchainVerifiedBadge, { BlockchainCredentialsSection } from '../../components/common/BlockchainVerifiedBadge';
import WorkforceLayout from '../../components/layout/WorkforceLayout';

import { useLanguage } from '../../contexts/LanguageContext';

const WorkforceProfile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockchainCredentials, setBlockchainCredentials] = useState([]);
  const [credentialsLoading, setCredentialsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadBlockchainCredentials();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/api/users/me');
      const userData = response.data.data;
      setUser(userData);
      
      // Try to get workforce profile
      try {
        const profileRes = await api.get('/api/workforce/me/profile');
        setProfile(profileRes.data.data);
      } catch (err) {
        setProfile({});
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockchainCredentials = async () => {
    try {
      const response = await api.get('/api/blockchain-credentials/my-credentials');
      setBlockchainCredentials(response.data.data?.credentials || []);
    } catch (error) {
      console.error('Failed to load blockchain credentials:', error);
      setBlockchainCredentials([]);
    } finally {
      setCredentialsLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'W';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name[0];
  };

  if (loading) {
    return (
      <WorkforceLayout title="My Profile">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </WorkforceLayout>
    );
  }

  return (
    <WorkforceLayout title="My Profile" subtitle="View and manage your information">
      <div className="max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={() => navigate('/workforce/settings')}
            variant="outline"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

      {/* Profile Card */}
      <Card className="p-8">
        {/* Profile Header */}
        <div className="flex items-center gap-6 pb-6 border-b mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {getInitials(user?.full_name)}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {user?.full_name || 'Workforce Member'}
            </h2>
            {profile?.trade && (
              <p className="text-gray-600 mb-2">{profile.trade}</p>
            )}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Active Member
              </span>
              {profile?.verified && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  ✓ Verified
                </span>
              )}
              {blockchainCredentials.length > 0 && (
                <BlockchainVerifiedBadge 
                  count={blockchainCredentials.filter(c => c.status !== 'revoked' && !c.is_expired).length}
                  size="md"
                  onClick={() => navigate('/workforce/credentials')}
                />
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">{t("pages.common.email")}</div>
              <div className="flex items-center gap-2 text-gray-900">
                <Mail className="w-4 h-4 text-gray-400" />
                {user?.email || 'Not set'}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Phone</div>
              <div className="flex items-center gap-2 text-gray-900">
                <Phone className="w-4 h-4 text-gray-400" />
                {user?.phone || profile?.phone || 'Not set'}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Location</div>
              <div className="flex items-center gap-2 text-gray-900">
                <MapPin className="w-4 h-4 text-gray-400" />
                {profile?.city ? `${profile.city}, ${profile.province || 'Ontario'}` : 'Not set'}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Member Since</div>
              <div className="flex items-center gap-2 text-gray-900">
                <Calendar className="w-4 h-4 text-gray-400" />
                {user?.created_date ? new Date(user.created_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Professional Info */}
        {(profile?.experience_years || profile?.skills) && (
          <div className="pt-6 mt-6 border-t space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Professional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile?.experience_years && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Experience</div>
                  <div className="text-gray-900">{profile.experience_years} years</div>
                </div>
              )}

              {profile?.hourly_rate && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Hourly Rate</div>
                  <div className="text-gray-900">${profile.hourly_rate}/hr</div>
                </div>
              )}
            </div>

            {profile?.skills && profile.skills.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">Skills</div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-6 mt-6 border-t">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => navigate('/workforce/my-shifts')}
              variant="outline"
              className="w-full"
            >
              View My Shifts
            </Button>
            <Button
              onClick={() => navigate('/workforce/credentials')}
              variant="outline"
              className="w-full"
            >
              <Shield className="w-4 h-4 mr-2" />
              My Credentials
            </Button>
            <Button
              onClick={() => navigate('/workforce/settings')}
              variant="outline"
              className="w-full"
            >
              Account Settings
            </Button>
          </div>
        </div>

        {/* Blockchain Credentials Section */}
        {(blockchainCredentials.length > 0 || credentialsLoading) && (
          <div className="pt-6 mt-6 border-t">
            <BlockchainCredentialsSection
              credentials={blockchainCredentials}
              loading={credentialsLoading}
              onViewAll={() => navigate('/workforce/credentials')}
              maxDisplay={2}
            />
          </div>
        )}
      </Card>
      </div>
    </WorkforceLayout>
  );
};

export default WorkforceProfile;