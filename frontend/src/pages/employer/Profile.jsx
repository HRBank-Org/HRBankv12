import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Building2, Mail, Phone, MapPin, Edit2, Save, X } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import EmployerLayout from '../../components/layout/EmployerLayout';

import { useLanguage } from '../../contexts/LanguageContext';

const EmployerProfile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    address: '',
    city: '',
    postal_code: '',
    contact_person: '',
    phone: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/api/users/me');
      const userData = response.data.data;
      setUser(userData);
      setProfile(userData.profile || {});
      setFormData({
        company_name: userData.profile?.company_name || '',
        industry: userData.profile?.industry || '',
        address: userData.profile?.address || '',
        city: userData.profile?.city || '',
        postal_code: userData.profile?.postal_code || '',
        contact_person: userData.profile?.contact_person || userData.full_name || '',
        phone: userData.phone || ''
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.patch('/api/employer/me/profile', formData);
      setEditing(false);
      loadProfile();
    } catch (error) {
      alert('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <EmployerLayout title="Company Profile">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout title="Company Profile" subtitle="Manage your company information">
      <div className="max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex justify-end mb-6">
          {!editing ? (
            <Button onClick={() => setEditing(true)} variant="outline">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => setEditing(false)} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Profile Content */}
        <Card className="p-8">
        {editing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your Company Inc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Hospitality, Retail"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(123) 456-7890"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Toronto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="M5H 2N2"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Company Name */}
            <div className="pb-6 border-b">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile?.company_name || 'Company Name Not Set'}
                </h2>
              </div>
              {profile?.industry && (
                <p className="text-gray-600 ml-9">{profile.industry}</p>
              )}
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Contact Person</div>
                <div className="text-gray-900">{profile?.contact_person || user?.full_name || 'Not set'}</div>
              </div>

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
                  {formData.phone || user?.phone || 'Not set'}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Location</div>
                <div className="flex items-center gap-2 text-gray-900">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {profile?.city || 'Not set'}
                </div>
              </div>
            </div>

            {/* Address */}
            {(profile?.address || profile?.postal_code) && (
              <div className="pt-6 border-t">
                <div className="text-sm font-medium text-gray-500 mb-2">Full Address</div>
                <div className="text-gray-900">
                  {profile?.address && <div>{profile.address}</div>}
                  {profile?.city && profile?.postal_code && (
                    <div>{profile.city}, {profile.postal_code}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
      </div>
    </EmployerLayout>
  );
};

export default EmployerProfile;