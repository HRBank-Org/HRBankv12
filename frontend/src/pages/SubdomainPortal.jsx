import React from 'react';
import { getSubdomainUserType } from '../utils/subdomainDetector';
import WorkforceLanding from './subdomains/WorkforceLanding';
import EmployerLanding from './subdomains/EmployerLanding';
import InstitutionLanding from './subdomains/InstitutionLanding';
import AdminLanding from './subdomains/AdminLanding';

import { useLanguage } from '../contexts/LanguageContext';

const SubdomainPortal = () => {
  const { t } = useLanguage();
  const userType = getSubdomainUserType();

  // Route to the appropriate landing page based on subdomain
  switch (userType) {
    case 'workforce':
      return <WorkforceLanding />;
    case 'employer':
      return <EmployerLanding />;
    case 'institution':
      return <InstitutionLanding />;
    case 'admin':
      return <AdminLanding />;
    default:
      // If no subdomain detected, show workforce as default
      return <WorkforceLanding />;
  }
};

export default SubdomainPortal;
