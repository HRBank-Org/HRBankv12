import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import EmployerLayout from '../../components/layout/EmployerLayout';
import api from '../../utils/api';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { useLanguage } from '../../contexts/LanguageContext';

const EmployerSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    title: '',
    company_name: '',
    company_logo_url: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    industry: '',
    preferred_language: 'en'
  });

  // Supported languages for employers (English + French - bilingual Canada)
  const EMPLOYER_LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'fr', name: 'French', native: 'Français' },
  ];

  // Photo upload states
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 100, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/api/employer/me/profile');
      const data = response.data.data;
      setProfile({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        title: data.title || '',
        company_name: data.company_name || '',
        company_logo_url: data.company_logo_url || '',
        email: user?.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        province: data.province || '',
        postal_code: data.postal_code || '',
        industry: data.industry || '',
        preferred_language: data.preferred_language || 'en'
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate address
      if (profile.address && profile.city && profile.province && profile.postal_code) {
        const validationResponse = await api.post('/api/validation/validate-address', {
          address: profile.address,
          city: profile.city,
          province: profile.province,
          postal_code: profile.postal_code
        });

        if (!validationResponse.data.valid) {
          setMessage({
            type: 'error',
            text: `Address validation failed: ${validationResponse.data.errors.join(', ')}`
          });
          setSaving(false);
          return;
        }

        const formatted = validationResponse.data.formatted;
        profile.city = formatted.city;
        profile.province = formatted.province;
        profile.postal_code = formatted.postal_code;
      }

      await api.patch('/api/employer/me/profile', profile);

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => navigate('/employer/home'), 1500);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setSelectedImage(reader.result));
      reader.readAsDataURL(e.target.files[0]);
      setShowPhotoUpload(true);
    }
  };

  const getCroppedImg = (image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleUploadPhoto = async () => {
    if (!completedCrop || !imgRef.current) return;

    setUploadingPhoto(true);
    setMessage({ type: '', text: '' });

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      const formData = new FormData();
      formData.append('file', croppedBlob, 'company-logo.jpg');

      const response = await api.post('/api/upload-profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setProfile({ ...profile, company_logo_url: response.data.photo_url });
      setMessage({ type: 'success', text: 'Logo uploaded successfully!' });
      setShowPhotoUpload(false);
      setSelectedImage(null);

      setTimeout(() => navigate('/employer/home'), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to upload logo' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to delete your company logo?')) return;

    try {
      await api.delete('/api/delete-profile-photo');
      setProfile({ ...profile, company_logo_url: '' });
      setMessage({ type: 'success', text: 'Logo deleted successfully!' });
      setTimeout(() => navigate('/employer/home'), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete logo' });
    }
  };

  const handleChangePassword = async () => {
    setChangingPassword(true);
    setMessage({ type: '', text: '' });

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setChangingPassword(false);
      return;
    }

    if (passwordData.new_password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      setChangingPassword(false);
      return;
    }

    try {
      await api.post('/api/auth/change-password', {
        user_id: user.user_id,
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setShowPasswordChange(false);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to change password'
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <EmployerLayout title="Settings">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout title="Settings">
      <div className="max-w-3xl mx-auto">
        {message.text && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Company Information</h2>

          <div className="space-y-6">
            {/* Contact Person */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
              <input
                type="text"
                value={profile.title}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                placeholder="e.g., HR Manager, Owner"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                style={{ focusRing: theme.primaryColor }}
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                value={profile.company_name}
                onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                style={{ focusRing: theme.primaryColor }}
              />
            </div>

            {/* Company Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
              <div className="flex items-center gap-4">
                {profile.company_logo_url && (
                  <img
                    src={profile.company_logo_url.startsWith('http') ? profile.company_logo_url : `${process.env.REACT_APP_BACKEND_URL}${profile.company_logo_url}`}
                    alt="Company Logo"
                    className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
                  />
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 border-2 rounded-lg font-medium hover:bg-gray-50 transition-all"
                    style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                  >
                    {profile.company_logo_url ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  {profile.company_logo_url && (
                    <button
                      onClick={handleDeletePhoto}
                      className="ml-2 px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-50 transition-all"
                    >
                      Delete
                    </button>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Upload a square logo for best results. Max 5MB.</p>
                </div>
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
              <input
                type="text"
                value={profile.industry}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                placeholder="e.g., Hospitality, Healthcare"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                style={{ focusRing: theme.primaryColor }}
              />
            </div>

            {/* Email - Always locked */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-gray-400">(locked)</span>
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                style={{ focusRing: theme.primaryColor }}
              />
            </div>

            {/* City, Province, Postal Code */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="Toronto"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
                <select
                  value={profile.province}
                  onChange={(e) => setProfile({ ...profile, province: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                >
                  <option value="">Select...</option>
                  <option value="AB">Alberta (AB)</option>
                  <option value="BC">British Columbia (BC)</option>
                  <option value="MB">Manitoba (MB)</option>
                  <option value="NB">New Brunswick (NB)</option>
                  <option value="NL">Newfoundland (NL)</option>
                  <option value="NS">Nova Scotia (NS)</option>
                  <option value="NT">Northwest Territories (NT)</option>
                  <option value="NU">Nunavut (NU)</option>
                  <option value="ON">Ontario (ON)</option>
                  <option value="PE">Prince Edward Island (PE)</option>
                  <option value="QC">Quebec (QC)</option>
                  <option value="SK">Saskatchewan (SK)</option>
                  <option value="YT">Yukon (YT)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                <input
                  type="text"
                  value={profile.postal_code}
                  onChange={(e) => setProfile({ ...profile, postal_code: e.target.value.toUpperCase() })}
                  placeholder="A1A 1A1"
                  maxLength={7}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
                <p className="text-xs text-gray-500 mt-1">Format: A1A 1A1</p>
              </div>
            </div>

            {/* Preferred Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Language
              </label>
              <select
                value={profile.preferred_language}
                onChange={(e) => setProfile({ ...profile, preferred_language: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                style={{ focusRing: theme.primaryColor }}
              >
                {EMPLOYER_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.native})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Dashboard and communications will use this language
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Notification Settings Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Configure how you want to receive notifications about shifts, attendance, and other important events.
          </p>
          <button
            onClick={() => navigate('/employer/settings/notifications')}
            className="px-4 py-2 rounded-lg border-2 font-medium hover:bg-gray-50 transition-all"
            style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
          >
            Manage Notification Preferences
          </button>
        </div>

        {/* Password Change Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Security</h2>
          </div>

          {!showPasswordChange ? (
            <button
              onClick={() => setShowPasswordChange(true)}
              className="px-4 py-2 rounded-lg border-2 font-medium hover:bg-gray-50 transition-all"
              style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
            >
              Change Password
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password}
                  className="px-6 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all disabled:opacity-50"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                  }}
                  disabled={changingPassword}
                  className="px-6 py-2 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photo Crop Modal */}
      {showPhotoUpload && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Crop Your Logo</h3>
              <button
                onClick={() => {
                  setShowPhotoUpload(false);
                  setSelectedImage(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-96 overflow-auto mb-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
              >
                <img
                  ref={imgRef}
                  src={selectedImage}
                  alt="Crop preview"
                  style={{ maxWidth: '100%' }}
                />
              </ReactCrop>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUploadPhoto}
                disabled={!completedCrop || uploadingPhoto}
                className="flex-1 px-4 py-3 rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {uploadingPhoto ? 'Uploading...' : 'Upload Logo'}
              </button>
              <button
                onClick={() => {
                  setShowPhotoUpload(false);
                  setSelectedImage(null);
                }}
                disabled={uploadingPhoto}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-3">
              Drag to adjust the crop area.
            </p>
          </div>
        </div>
      )}
    </EmployerLayout>
  );
};

export default EmployerSettings;
