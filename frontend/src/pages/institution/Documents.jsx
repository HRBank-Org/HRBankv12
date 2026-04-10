import React from 'react';
import DocumentsPage from '../common/DocumentsPage';
import InstitutionLayout from '../../components/layout/InstitutionLayout';

import { useLanguage } from '../../contexts/LanguageContext';

const InstitutionDocuments = () => {
  const { t } = useLanguage();
  return (
    <InstitutionLayout title={t("pages.institution.documents.title", "Documents")}>
      <DocumentsPage />
    </InstitutionLayout>
  );
};

export default InstitutionDocuments;
