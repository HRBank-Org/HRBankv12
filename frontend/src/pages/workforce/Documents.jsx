import React from 'react';
import DocumentsPage from '../common/DocumentsPage';
import WorkforceLayout from '../../components/layout/WorkforceLayout';

const WorkforceDocuments = () => {
  return (
    <WorkforceLayout title="My Documents">
      <DocumentsPage />
    </WorkforceLayout>
  );
};

export default WorkforceDocuments;
