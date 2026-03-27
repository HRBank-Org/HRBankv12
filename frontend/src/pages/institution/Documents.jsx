import React from 'react';
import DocumentsPage from '../common/DocumentsPage';

import { useLanguage } from '../../contexts/LanguageContext';

const InstitutionDocuments = () => {
  const { t } = useLanguage();
  return <DocumentsPage />;
};

export default InstitutionDocuments;
