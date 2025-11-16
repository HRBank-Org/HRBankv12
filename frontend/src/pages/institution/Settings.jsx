import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const InstitutionSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profile, setProfile] = useState({
    contact_name: '',
    title: '',
    institution_name: '',
    institution_logo_url: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    institution_type: ''
  });

  // Logo upload states
  const [showLogoUpload, setShowLogoUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 100, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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

  // OTP verification states
  const [showPhoneOTP, setShowPhoneOTP] = useState(false);
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [phoneOTP, setPhoneOTP] = useState('');
  const [emailOTP, setEmailOTP] = useState('');
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/api/institutions/me/profile');
      const data = response.data.data;
      setProfile({
        contact_name: data.contact_name || '',
        title: data.title || '',
        institution_name: data.institution_name || '',
        institution_logo_url: data.institution_logo_url || '',
        email: user?.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        province: data.province || '',
        postal_code: data.postal_code || '',
        institution_type: data.institution_type || ''
      });
      
      // Check verification status
      setPhoneVerified(data.phone_verified || false);
      setEmailVerified(data.email_verified || false);
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
      }

      await api.put('/api/institutions/me/profile', profile);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      // Redirect to dashboard after save
      setTimeout(() => {
        navigate('/institution/dashboard');
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  // Logo Upload Functions
  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result);
      setShowLogoUpload(true);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!completedCrop || !imgRef.current) return;

    setUploadingLogo(true);
    setMessage({ type: '', text: '' });

    try {
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'logo.jpg');

        const response = await api.post('/api/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setProfile(prev => ({ ...prev, institution_logo_url: response.data.data.file_url }));
        setMessage({ type: 'success', text: 'Logo uploaded successfully!' });
        setShowLogoUpload(false);
        setSelectedImage(null);
      }, 'image/jpeg', 0.95);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload logo' });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Password Change Functions
  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.new_password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setChangingPassword(true);
    setMessage({ type: '', text: '' });

    try {
      await api.post('/api/users/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setShowPasswordChange(false);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to change password' });
    } finally {
      setChangingPassword(false);
    }
  };

  // OTP Functions
  const sendPhoneOTP = async () => {
    if (!profile.phone || profile.phone.length < 10) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number' });
      return;
    }

    try {
      await api.post('/api/otp/send-phone-otp', { phone: profile.phone });
      setShowPhoneOTP(true);
      setMessage({ type: 'success', text: 'OTP sent to your phone!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send OTP' });
    }
  };

  const verifyPhoneOTP = async () => {
    if (!phoneOTP || phoneOTP.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit OTP' });
      return;
    }

    setVerifyingPhone(true);
    try {
      await api.post('/api/otp/verify-phone-otp', {
        phone: profile.phone,
        otp: phoneOTP
      });
      
      setPhoneVerified(true);
      setShowPhoneOTP(false);
      setPhoneOTP('');
      setMessage({ type: 'success', text: 'Phone verified successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid OTP. Please try again.' });
    } finally {
      setVerifyingPhone(false);
    }
  };

  const sendEmailOTP = async () => {
    if (!profile.email) {
      setMessage({ type: 'error', text: 'Email is required' });
      return;
    }

    try {
      await api.post('/api/otp/send-email-otp', { email: profile.email });
      setShowEmailOTP(true);
      setMessage({ type: 'success', text: 'OTP sent to your email!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send OTP' });
    }
  };

  const verifyEmailOTP = async () => {
    if (!emailOTP || emailOTP.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit OTP' });
      return;
    }

    setVerifyingEmail(true);
    try {
      await api.post('/api/otp/verify-email-otp', {
        email: profile.email,
        otp: emailOTP
      });
      
      setEmailVerified(true);
      setShowEmailOTP(false);
      setEmailOTP('');
      setMessage({ type: 'success', text: 'Email verified successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid OTP. Please try again.' });
    } finally {
      setVerifyingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader 
        onBackClick={() => navigate('/institution/dashboard')}
        showBack={true}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Institution Settings</h1>

        {message.text && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Institution Information */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Institution Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Institution Name *</label>
              <input
                type="text"
                value={profile.institution_name}
                onChange={(e) => setProfile({...profile, institution_name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="e.g., Toronto Medical College"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Institution Type</label>
              <select
                value={profile.institution_type}
                onChange={(e) => setProfile({...profile, institution_type: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              >
                <option value="">Select type...</option>
                <option value="college">College</option>
                <option value="university">University</option>
                <option value="training_center">Training Center</option>
                <option value="certification_body">Certification Body</option>
                <option value="technical_institute">Technical Institute</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Institution Logo</label>
              <div className="flex items-center gap-4">
                {profile.institution_logo_url && (
                  <img 
                    src={`${process.env.REACT_APP_BACKEND_URL}${profile.institution_logo_url}`}
                    alt="Institution Logo"
                    className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                  />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  {profile.institution_logo_url ? 'Change Logo' : 'Upload Logo'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Person */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Person (Registrar)</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                value={profile.contact_name}
                onChange={(e) => setProfile({...profile, contact_name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="e.g., Dr. John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={profile.title}
                onChange={(e) => setProfile({...profile, title: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="e.g., Registrar, Dean, Director"
              />
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={emailVerified}
                  placeholder="your.email@institution.edu"
                />
                {emailVerified ? (
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium whitespace-nowrap">✓ Verified</span>
                ) : (
                  <button
                    onClick={sendEmailOTP}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all whitespace-nowrap"
                  >
                    Verify Email
                  </button>
                )}
              </div>
              {emailVerified && (
                <p className="text-xs text-gray-500 mt-1">✓ Email is verified and locked for security</p>
              )}
              {showEmailOTP && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={emailOTP}
                    onChange={(e) => setEmailOTP(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={verifyEmailOTP}
                    disabled={verifyingEmail}
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {verifyingEmail ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  placeholder="e.g., +1 (555) 123-4567"
                />
                {phoneVerified ? (
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">✓ Verified</span>
                ) : (
                  <button
                    onClick={sendPhoneOTP}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
                  >
                    Verify
                  </button>
                )}
              </div>
              {showPhoneOTP && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={phoneOTP}
                    onChange={(e) => setPhoneOTP(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={verifyPhoneOTP}
                    disabled={verifyingPhone}
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {verifyingPhone ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Address</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({...profile, address: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="e.g., 123 University Ave"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({...profile, city: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  placeholder="Toronto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
                <select
                  value={profile.province}
                  onChange={(e) => setProfile({...profile, province: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="ON">Ontario</option>
                  <option value="QC">Quebec</option>
                  <option value="BC">British Columbia</option>
                  <option value="AB">Alberta</option>
                  <option value="MB">Manitoba</option>
                  <option value="SK">Saskatchewan</option>
                  <option value="NS">Nova Scotia</option>
                  <option value="NB">New Brunswick</option>
                  <option value="NL">Newfoundland and Labrador</option>
                  <option value="PE">Prince Edward Island</option>
                  <option value="NT">Northwest Territories</option>
                  <option value="YT">Yukon</option>
                  <option value="NU">Nunavut</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                <input
                  type="text"
                  value={profile.postal_code}
                  onChange={(e) => setProfile({...profile, postal_code: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  placeholder="M5H 2N2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Security</h2>
          
          {!showPasswordChange ? (
            <button
              onClick={() => setShowPasswordChange(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
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
                  onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={changingPassword}
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/institution/dashboard')}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all disabled:opacity-50"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </main>

      {/* Logo Upload Modal */}
      {showLogoUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Crop Institution Logo</h2>
            </div>

            <div className="p-6">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
              >
                <img
                  ref={imgRef}
                  src={selectedImage}
                  alt="Crop"
                  style={{ maxHeight: '400px' }}
                />
              </ReactCrop>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowLogoUpload(false);
                  setSelectedImage(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoUpload}
                disabled={uploadingLogo}
                className="flex-1 px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstitutionSettings;
