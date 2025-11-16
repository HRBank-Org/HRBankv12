import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const UserHeader = ({ onBackClick, showBack = true, title = null, actions = null }) => {
  const { user, logout } = useAuth();
  const theme = useTheme();

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderUserInfo = () => {
    if (!user || !user.profile) return null;

    const profile = user.profile;
    const userType = user.user_type;

    if (userType === 'workforce') {
      // Workforce: Show name and photo
      return (
        <div className="flex items-center gap-3">
          {/* Profile Photo */}
          <div className="relative">
            {profile.profile_photo_url ? (
              <img
                src={profile.profile_photo_url}
                alt={profile.full_name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-white shadow-sm"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {getInitials(profile.full_name)}
              </div>
            )}
          </div>
          {/* Name */}
          <div className="text-white">
            <p className="font-semibold text-sm leading-tight">{profile.full_name}</p>
            <p className="text-xs opacity-90">Worker</p>
          </div>
        </div>
      );
    } else if (userType === 'employer') {
      // Employer: Show contact person name and company name + address
      const street = profile.address?.split(',')[0] || profile.address || '';
      const city = profile.city || '';
      const shortAddress = `${street}${city ? ' - ' + city : ''}`;
      
      return (
        <div className="text-white">
          <p className="font-semibold text-sm leading-tight">{profile.contact_person || 'Employer'}</p>
          <p className="text-xs opacity-90 font-medium">{profile.company_name}</p>
          {shortAddress && (
            <p className="text-xs opacity-75">{shortAddress}</p>
          )}
        </div>
      );
    } else if (userType === 'institution') {
      // Institution: Show contact person and institution name + address
      const street = profile.address?.split(',')[0] || profile.address || '';
      const city = profile.city || '';
      const shortAddress = `${street}${city ? ' - ' + city : ''}`;
      
      return (
        <div className="text-white">
          <p className="font-semibold text-sm leading-tight">{profile.contact_person || 'Institution'}</p>
          <p className="text-xs opacity-90 font-medium">{profile.institution_name}</p>
          {shortAddress && (
            <p className="text-xs opacity-75">{shortAddress}</p>
          )}
        </div>
      );
    } else if (userType === 'admin') {
      // Admin: Show admin name
      return (
        <div className="text-white">
          <p className="font-semibold text-sm leading-tight">{profile.full_name || 'Admin'}</p>
          <p className="text-xs opacity-90">Administrator</p>
        </div>
      );
    }

    return null;
  };

  return (
    <header className="text-white px-4 py-4 shadow-md" style={{ backgroundColor: theme.primaryColor }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Back button, Logo, Title/User Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBack && onBackClick && (
            <button onClick={onBackClick} className="hover:opacity-80 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg flex-shrink-0" />
          
          {/* Title or User Info */}
          {title ? (
            <h1 className="text-xl font-bold truncate">{title}</h1>
          ) : (
            <div className="min-w-0 flex-1">
              {renderUserInfo()}
            </div>
          )}
        </div>

        {/* Right: Actions or Logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {actions}
          <button 
            onClick={logout} 
            className="text-sm hover:underline whitespace-nowrap"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default UserHeader;
