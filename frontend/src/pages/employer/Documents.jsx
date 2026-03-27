import React from 'react';
import DocumentsPage from '../common/DocumentsPage';
import EmployerLayout from '../../components/layout/EmployerLayout';

import { useLanguage } from '../../contexts/LanguageContext';

const EmployerDocuments = () => {
  const { t } = useLanguage();
  return (
    <EmployerLayout title="Documents">
      <DocumentsPage />
    </EmployerLayout>
  );
};

export default EmployerDocuments;
