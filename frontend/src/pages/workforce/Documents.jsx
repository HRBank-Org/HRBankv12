import React from 'react';
import DocumentsPage from '../common/DocumentsPage';
import WorkforceLayout from '../../components/layout/WorkforceLayout';

import { useLanguage } from '../../contexts/LanguageContext';

const WorkforceDocuments = () => {
  const { t } = useLanguage();
  return (
    <WorkforceLayout title="My Documents">
      <DocumentsPage />
    </WorkforceLayout>
  );
};

export default WorkforceDocuments;
