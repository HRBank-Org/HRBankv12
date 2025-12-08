import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const UserHeader = ({ onBackClick, showBack = true, title = null, actions = null, greeting = null, weather = null }) => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate ? useNavigate() : null;
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Add/remove body class when sidebar opens to shift content
  React.useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [menuOpen]);

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
            <div className="ml-4 text-white flex items-center gap-3">
              <div>
                <div className="text-sm font-medium opacity-90">{greeting} 👋</div>
                {weather && (
                  <div className="text-xs opacity-75">{weather}</div>
                )}
              </div>
              
              {/* Menu Hint Indicator - Hamburger Icon */}
              <div 
                className="relative group"
                onMouseEnter={() => setMenuOpen(true)}
              >
                <div className="flex items-center justify-center p-2 bg-white bg-opacity-20 rounded-lg cursor-pointer hover:bg-opacity-30 transition-all animate-pulse">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                
                {/* Tooltip */}
                <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  Menu options →
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Custom Actions + Hamburger Menu */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Custom Actions (messages, notifications, etc.) */}
          {actions}
          
          {/* Hover-Activated Sidebar with Wider Trigger Area */}
          <div 
            className="fixed top-0 right-0 h-full z-40 flex"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            {/* Expanded Sidebar - slides out from behind */}
            <div 
              className="h-full bg-gray-900 shadow-2xl transition-all duration-150 ease-in-out overflow-hidden"
              style={{ width: menuOpen ? '280px' : '0px' }}
            >
              {/* Sidebar Header */}
              <div className="px-6 py-6 border-b border-gray-700 w-[280px]">
                <div className="text-white">
                  <h3 className="font-bold text-lg">Menu</h3>
                  {user && user.profile && (
                    <p className="text-sm text-gray-400 mt-1">
                      {user.profile.full_name || user.profile.first_name || 'User'}
                    </p>
                  )}
                </div>
              </div>

              {/* Sidebar Content */}
              <div className="p-4 w-[280px]">
                {/* Notifications */}
                {user && user.user_type && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate && navigate(`/${user.user_type}/notifications`);
                    }}
                    className="w-full px-4 py-4 text-left hover:bg-gray-800 rounded-lg flex items-center gap-4 text-white transition-colors mb-2 relative"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center relative">
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {/* Notification badge - can be dynamic */}
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        3
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold">Notifications</div>
                      <div className="text-xs text-gray-400">Shifts, approvals & alerts</div>
                    </div>
                  </button>
                )}
                
                {/* Messages/Chat */}
                {user && user.user_type && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate && navigate(`/${user.user_type}/messages`);
                    }}
                    className="w-full px-4 py-4 text-left hover:bg-gray-800 rounded-lg flex items-center gap-4 text-white transition-colors mb-2 relative"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center relative">
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {/* Unread badge - can be dynamic */}
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        2
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold">Messages</div>
                      <div className="text-xs text-gray-400">Chat with team</div>
                    </div>
                  </button>
                )}
                
                {/* Divider */}
                <div className="border-t border-gray-700 my-4"></div>
                
                {/* Documents */}
                {user && user.user_type && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate && navigate(`/${user.user_type}/documents`);
                    }}
                    className="w-full px-4 py-4 text-left hover:bg-gray-800 rounded-lg flex items-center gap-4 text-white transition-colors mb-2"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold">Documents</div>
                      <div className="text-xs text-gray-400">View and manage files</div>
                    </div>
                  </button>
                )}
                
                {/* Settings */}
                {user && user.user_type && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate && navigate(`/${user.user_type}/settings`);
                    }}
                    className="w-full px-4 py-4 text-left hover:bg-gray-800 rounded-lg flex items-center gap-4 text-white transition-colors mb-2"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold">Settings</div>
                      <div className="text-xs text-gray-400">Account preferences</div>
                    </div>
                  </button>
                )}
                
                {/* Divider */}
                <div className="border-t border-gray-700 my-4"></div>
                
                {/* Logout */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-4 py-4 text-left hover:bg-red-900 hover:bg-opacity-30 rounded-lg flex items-center gap-4 text-red-400 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-900 bg-opacity-20 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold">Logout</div>
                    <div className="text-xs text-red-300">Sign out of your account</div>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Wider Hover Trigger Area - Visible edge with invisible hover zone */}
            <div className="relative">
              {/* Invisible hover zone extends 30px */}
              <div className="absolute right-0 top-0 w-[30px] h-full -mr-[29px]"></div>
              {/* Visible thin edge */}
              <div className="w-1 h-full bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default UserHeader;
