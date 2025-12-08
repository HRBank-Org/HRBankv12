import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const UserHeader = ({ onBackClick, showBack = true, title = null, actions = null, greeting = null, weather = null }) => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate ? useNavigate() : null;

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
      // Workforce: Show name, occupation titles, and behavior rating
      const firstName = profile.first_name || '';
      const lastName = profile.last_name || '';
      const fullName = profile.full_name || `${firstName} ${lastName}`.trim();
      const occupationTitles = profile.occupation_titles || [];
      const behaviorRating = profile.behavior_rating || 0;
      const behaviorRatingCount = profile.behavior_rating_count || 0;
      
      // Get photo URL - handle both relative and absolute URLs
      let photoUrl = profile.profile_photo_url;
      if (photoUrl && !photoUrl.startsWith('http')) {
        photoUrl = `${process.env.REACT_APP_BACKEND_URL || ''}${photoUrl}`;
      }
      
      return (
        <div className="flex items-center gap-3">
          {/* Profile Photo */}
          <div className="relative">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={fullName}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-white shadow-sm"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {getInitials(fullName)}
              </div>
            )}
          </div>
          {/* Name, Occupations, and Rating */}
          <div className="text-white">
            <p className="font-semibold text-sm leading-tight">{firstName} {lastName}</p>
            {occupationTitles.length > 0 ? (
              <p className="text-xs opacity-90">{occupationTitles.join(', ')}</p>
            ) : (
              <p className="text-xs opacity-90">Workforce</p>
            )}
            {behaviorRating > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <svg className="w-3 h-3 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs font-medium">{behaviorRating.toFixed(1)}</span>
                <span className="text-xs opacity-75">({behaviorRatingCount})</span>
              </div>
            )}
          </div>
        </div>
      );
    } else if (userType === 'employer') {
      // Employer: Show company logo (optional), contact person name with title, company name + address
      const fullName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.contact_name || profile.contact_person || 'Employer';
      const street = profile.address?.split(',')[0] || profile.address || '';
      const city = profile.city || '';
      const shortAddress = `${street}${city ? ' - ' + city : ''}`;
      
      return (
        <div className="flex items-center gap-3">
          {/* Company Logo */}
          {profile.company_logo_url && (
            <img
              src={profile.company_logo_url}
              alt={profile.company_name}
              className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow-sm bg-white"
            />
          )}
          {/* Company Info */}
          <div className="text-white">
            <p className="font-semibold text-sm leading-tight">
              {fullName}
              {profile.title && ` • ${profile.title}`}
            </p>
            <p className="text-xs opacity-90 font-medium">{profile.company_name}</p>
            {shortAddress && (
              <p className="text-xs opacity-75">{shortAddress}</p>
            )}
          </div>
        </div>
      );
    } else if (userType === 'institution') {
      // Institution: Show institution logo (optional), contact person with title, institution name + address
      const fullName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.contact_name || profile.contact_person || 'Institution';
      const street = profile.address?.split(',')[0] || profile.address || '';
      const city = profile.city || '';
      const shortAddress = `${street}${city ? ' - ' + city : ''}`;
      
      return (
        <div className="flex items-center gap-3">
          {/* Institution Logo */}
          {profile.institution_logo_url && (
            <img
              src={profile.institution_logo_url}
              alt={profile.institution_name}
              className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow-sm bg-white"
            />
          )}
          {/* Institution Info */}
          <div className="text-white">
            <p className="font-semibold text-sm leading-tight">
              {fullName}
              {profile.title && ` • ${profile.title}`}
            </p>
            <p className="text-xs opacity-90 font-medium">{profile.institution_name}</p>
            {shortAddress && (
              <p className="text-xs opacity-75">{shortAddress}</p>
            )}
          </div>
        </div>
      );
    } else if (userType === 'admin') {
      // Admin: Show admin photo (optional), name with title, and region
      const fullName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin';
      const region = profile.assigned_provinces?.[0] || profile.assigned_zones?.[0];
      
      return (
        <div className="flex items-center gap-3">
          {/* Admin Photo */}
          {profile.profile_photo_url ? (
            <img
              src={profile.profile_photo_url}
              alt={fullName}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-white shadow-sm bg-black"
            >
              {getInitials(fullName)}
            </div>
          )}
          {/* Admin Info */}
          <div className="text-white">
            <p className="font-semibold text-sm leading-tight">
              {fullName}
              {profile.title && ` • ${profile.title}`}
            </p>
            <p className="text-xs opacity-90">
              {profile.is_super_admin ? 'Super Admin' : 'Administrator'}
              {region && ` • ${region}`}
            </p>
          </div>
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
          
          {/* Dynamic Greeting with Weather */}
          {greeting && (
            <div className="ml-4 text-white">
              <div className="text-sm font-medium opacity-90">{greeting} 👋</div>
              {weather && (
                <div className="text-xs opacity-75">{weather}</div>
              )}
            </div>
          )}
        </div>

        {/* Right: Documents, Settings, Actions, Logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Documents Icon - All user types */}
          {user && user.user_type && (
            <button 
              onClick={() => navigate && navigate(`/${user.user_type}/documents`)}
              className="hover:opacity-80 cursor-pointer"
              title="Documents"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
          
          {/* Settings Icon - All user types */}
          {user && user.user_type && (
            <button 
              onClick={() => navigate && navigate(`/${user.user_type}/settings`)}
              className="hover:opacity-80 cursor-pointer"
              title="Settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          
          {/* Custom Actions (messages, notifications, etc.) */}
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
