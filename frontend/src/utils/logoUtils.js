// Logo utility for HR Bank - maps user types to their respective logos

export const LOGOS = {
  master: 'https://customer-assets.emergentagent.com/job_bankclone-debug/artifacts/1n61gdhe_HR%20Bank%20Logo.png',
  institution: 'https://customer-assets.emergentagent.com/job_bankclone-debug/artifacts/5pr4pboq_HR%20Bank%20Institutions.jpg',
  employer: 'https://customer-assets.emergentagent.com/job_bankclone-debug/artifacts/44b0k6s6_HRB%20App%20Icon%20Employer.jpg',
  workforce: 'https://customer-assets.emergentagent.com/job_bankclone-debug/artifacts/pz2plcbj_HRB%20App%20Icon%20Workforce.jpg'
};

export const getLogoByUserType = (userType) => {
  switch(userType) {
    case 'workforce':
      return LOGOS.workforce;
    case 'employer':
      return LOGOS.employer;
    case 'institution':
      return LOGOS.institution;
    default:
      return LOGOS.master;
  }
};

export const getLogoBackgroundColor = (userType) => {
  switch(userType) {
    case 'workforce':
      return 'bg-[#30496d]';
    case 'employer':
      return 'bg-[#ff5f00]';
    case 'institution':
      return 'bg-gray-900';
    default:
      return 'bg-gradient-to-r from-[#ff5f00] to-[#30496d]';
  }
};
