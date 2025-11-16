import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const WorkforceSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    profile_photo_url: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: ''
  });
  
  // OTP verification states
  const [verificationStatus, setVerificationStatus] = useState({
    phone_verified: false,
    email_verified: false
  });
  const [otpModal, setOtpModal] = useState({ show: false, type: '', contact: '' });
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Photo upload states
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 100, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  const isAccountActive = user?.profile_status === 'active';

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileRes, verificationRes] = await Promise.all([
        api.get('/api/workforce/me/profile'),
        api.get('/api/otp/verification-status')
      ]);
      
      const data = profileRes.data.data;
      setProfile({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        profile_photo_url: data.profile_photo_url || '',
        email: user?.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        province: data.province || '',
        postal_code: data.postal_code || ''
      });
      
      setVerificationStatus(verificationRes.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (type, contact) => {
    setSendingOtp(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await api.post('/api/otp/send-otp', {
        contact,
        type
      });
      
      // Show OTP in test mode
      if (response.data.test_mode && response.data.otp) {
        setMessage({ 
          type: 'success', 
          text: `TEST MODE: Your OTP is ${response.data.otp}` 
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: `OTP sent to ${contact}` 
        });
      }
      
      setOtpModal({ show: true, type, contact });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to send OTP' 
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    setVerifyingOtp(true);
    setMessage({ type: '', text: '' });
    
    try {
      await api.post('/api/otp/verify-otp', {
        contact: otpModal.contact,
        type: otpModal.type,
        code: otpCode
      });
      
      setMessage({ 
        type: 'success', 
        text: `${otpModal.type === 'phone' ? 'Phone' : 'Email'} verified successfully!` 
      });
      
      // Update verification status
      setVerificationStatus(prev => ({
        ...prev,
        [`${otpModal.type}_verified`]: true
      }));
      
      // Close modal and reset
      setOtpModal({ show: false, type: '', contact: '' });
      setOtpCode('');
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Invalid OTP code' 
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleChangePassword = async () => {
    setChangingPassword(true);
    setMessage({ type: '', text: '' });
    
    // Validate passwords
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
      formData.append('file', croppedBlob, 'profile-photo.jpg');

      const response = await api.post('/api/upload-profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setProfile({ ...profile, profile_photo_url: response.data.photo_url });
      setMessage({ type: 'success', text: 'Photo uploaded successfully!' });
      setShowPhotoUpload(false);
      setSelectedImage(null);
      
      // Refresh to update header photo
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to upload photo' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to delete your profile photo?')) return;

    try {
      await api.delete('/api/delete-profile-photo');
      setProfile({ ...profile, profile_photo_url: '' });
      setMessage({ type: 'success', text: 'Photo deleted successfully!' });
      
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete photo' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      await api.patch('/api/workforce/me/profile', {
        first_name: profile.first_name,
        last_name: profile.last_name,
        profile_photo_url: profile.profile_photo_url,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        province: profile.province,
        postal_code: profile.postal_code
      });
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Refresh user data in AuthContext
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save profile' });
    } finally {
      setSaving(false);
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
        onBackClick={() => navigate('/workforce/dashboard')}
        showBack={true}
        title="Settings"
      />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Account Status Banner */}
        {!isAccountActive && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Profile Not Activated</p>
                <p className="text-xs text-yellow-700 mt-1">
                  You can edit your information now, but these fields will be locked once your account is activated by an admin.
                </p>
              </div>
            </div>
          </div>
        )}

        {message.text && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>

          <div className="space-y-6">
            {/* Name Fields - Always Editable */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>
            </div>

            {/* Profile Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo
              </label>
              <div className="flex items-center gap-4">
                {profile.profile_photo_url && (
                  <img 
                    src={profile.profile_photo_url.startsWith('http') ? profile.profile_photo_url : `${process.env.REACT_APP_BACKEND_URL}${profile.profile_photo_url}`}
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
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
                    {profile.profile_photo_url ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {profile.profile_photo_url && (
                    <button
                      onClick={handleDeletePhoto}
                      className="ml-2 px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-50 transition-all"
                    >
                      Delete
                    </button>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Upload a square photo for best results. Max 5MB.</p>
                </div>
              </div>
            </div>

            {/* Email - Always locked but can be verified */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email <span className="text-gray-400">(locked)</span>
                </label>
                {verificationStatus.email_verified ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <button
                    onClick={() => handleSendOTP('email', profile.email)}
                    disabled={sendingOtp || !profile.email}
                    className="text-xs font-medium hover:underline disabled:opacity-50"
                    style={{ color: theme.primaryColor }}
                  >
                    {sendingOtp ? 'Sending...' : 'Verify Email'}
                  </button>
                )}
              </div>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Phone with verification */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Phone {verificationStatus.phone_verified && <span className="text-gray-400">(locked)</span>}
                </label>
                {verificationStatus.phone_verified ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified & Locked
                  </span>
                ) : (
                  <button
                    onClick={() => handleSendOTP('phone', profile.phone)}
                    disabled={sendingOtp || !profile.phone}
                    className="text-xs font-medium hover:underline disabled:opacity-50"
                    style={{ color: theme.primaryColor }}
                  >
                    {sendingOtp ? 'Sending...' : 'Verify Phone'}
                  </button>
                )}
              </div>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                disabled={verificationStatus.phone_verified}
                placeholder="+1234567890"
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 ${verificationStatus.phone_verified ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                style={{ focusRing: theme.primaryColor }}
              />
              <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for Canada/US)</p>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
                <input
                  type="text"
                  value={profile.province}
                  onChange={(e) => setProfile({ ...profile, province: e.target.value })}
                  placeholder="ON"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                <input
                  type="text"
                  value={profile.postal_code}
                  onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                  placeholder="M5V 3A8"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>
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

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Privacy Note</p>
              <p className="mt-1">Your personal information (email, phone, address) is NEVER shared with employers. They only see your occupation profiles.</p>
            </div>
          </div>
        </div>
      </main>

      {/* OTP Verification Modal */}
      {otpModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Verify {otpModal.type === 'phone' ? 'Phone Number' : 'Email'}
              </h3>
              <button
                onClick={() => {
                  setOtpModal({ show: false, type: '', contact: '' });
                  setOtpCode('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Enter the 6-digit code sent to <span className="font-medium">{otpModal.contact}</span>
            </p>

            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-opacity-50 mb-4"
              style={{ focusRing: theme.primaryColor }}
            />

            <div className="flex gap-3">
              <button
                onClick={handleVerifyOTP}
                disabled={verifyingOtp || otpCode.length !== 6}
                className="flex-1 px-4 py-3 rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {verifyingOtp ? 'Verifying...' : 'Verify'}
              </button>
              <button
                onClick={() => handleSendOTP(otpModal.type, otpModal.contact)}
                disabled={sendingOtp}
                className="px-4 py-3 border-2 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: theme.primaryColor }}
              >
                {sendingOtp ? 'Sending...' : 'Resend'}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-3">
              Code expires in 10 minutes. Maximum 3 attempts allowed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkforceSettings;
