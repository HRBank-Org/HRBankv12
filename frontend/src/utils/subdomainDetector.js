/**
 * Detect subdomain and determine user type from URL
 * Returns the user type (admin, employer, workforce, institution) or null for main domain
 */
export const getSubdomainUserType = () => {
  const hostname = window.location.hostname;
  
  // Check for subdomain
  // Format: subdomain.hrbank.ca or subdomain.preview.emergentagent.com
  const parts = hostname.split('.');
  
  // For localhost or IP, return null (main domain)
  if (hostname === 'localhost' || hostname.match(/^\d/)) {
    return null;
  }
  
  // Get the first part (subdomain)
  const subdomain = parts[0];
  
  // Map subdomains to user types
  const subdomainMap = {
    'admin': 'admin',
    'employer': 'employer',
    'workforce': 'workforce',
    'institution': 'institution'
  };
  
  return subdomainMap[subdomain] || null;
};

/**
 * Get login route based on user type
 */
export const getLoginRoute = (userType) => {
  if (userType === 'admin') {
    return '/admin/login';
  }
  return `/login?type=${userType}`;
};

/**
 * Get signup route based on user type
 */
export const getSignupRoute = (userType) => {
  return `/signup?type=${userType}`;
};

/**
 * Check if current URL is a subdomain portal
 */
export const isSubdomainPortal = () => {
  return getSubdomainUserType() !== null;
};
