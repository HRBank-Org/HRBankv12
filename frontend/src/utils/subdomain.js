/**
 * Subdomain detection and user type locking utilities
 */

export const getSubdomain = () => {
  // Guard against SSR/build environment
  if (typeof window === 'undefined') {
    return null;
  }
  
  const hostname = window.location.hostname;
  
  // Extract subdomain
  const parts = hostname.split('.');
  
  // If localhost or IP, no subdomain
  if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }
  
  // If only 2 parts (domain.com), no subdomain
  if (parts.length <= 2) {
    return null;
  }
  
  // Return first part as subdomain
  return parts[0];
};

export const getUserTypeFromSubdomain = () => {
  const subdomain = getSubdomain();
  
  const subdomainMap = {
    'employer': 'employer',
    'workforce': 'workforce',
    'worker': 'workforce',  // Alias
    'institution': 'institution',
    'admin': 'admin'
  };
  
  return subdomainMap[subdomain] || null;
};

export const isSubdomainRestricted = () => {
  return getUserTypeFromSubdomain() !== null;
};

export const validateUserTypeForSubdomain = (userType) => {
  const expectedType = getUserTypeFromSubdomain();
  
  if (!expectedType) {
    // No subdomain restriction
    return true;
  }
  
  return userType === expectedType;
};

export const getSubdomainRedirectUrl = (userType) => {
  const urls = {
    'employer': process.env.REACT_APP_EMPLOYER_URL || 'https://employer.hrbank.ca',
    'workforce': process.env.REACT_APP_WORKFORCE_URL || 'https://workforce.hrbank.ca',
    'institution': process.env.REACT_APP_INSTITUTION_URL || 'https://institution.hrbank.ca',
    'admin': process.env.REACT_APP_ADMIN_URL || 'https://admin.hrbank.ca'
  };
  
  return urls[userType];
};

export const redirectToCorrectSubdomain = (userType) => {
  // Guard against SSR/build environment
  if (typeof window === 'undefined') {
    return;
  }
  
  const currentSubdomain = getUserTypeFromSubdomain();
  
  // If on correct subdomain, do nothing
  if (currentSubdomain === userType) {
    return;
  }
  
  // If no subdomain restriction and no user type, do nothing
  if (!currentSubdomain && !userType) {
    return;
  }
  
  // Redirect to correct subdomain
  const redirectUrl = getSubdomainRedirectUrl(userType);
  if (redirectUrl) {
    window.location.href = redirectUrl;
  }
};

export const getManifestUrl = () => {
  const subdomain = getSubdomain();
  
  const manifestMap = {
    'employer': '/manifest-employer.json',
    'workforce': '/manifest-workforce.json',
    'worker': '/manifest-workforce.json',
    'institution': '/manifest-institution.json',
    'admin': '/manifest-employer.json'  // Use employer manifest for admin
  };
  
  return manifestMap[subdomain] || '/manifest.json';
};

export const getThemeColor = () => {
  const subdomain = getSubdomain();
  
  const colorMap = {
    'employer': '#ff5f00',
    'workforce': '#2563eb',
    'worker': '#2563eb',
    'institution': '#7c3aed',
    'admin': '#1e293b'
  };
  
  return colorMap[subdomain] || '#ff5f00';
};
