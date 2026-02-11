import React from 'react';
import InstitutionSidebar from './InstitutionSidebar';
import InstitutionHeader from './InstitutionHeader';

const InstitutionLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <InstitutionSidebar />
      <InstitutionHeader />
      
      <main 
        className="transition-all duration-300 pt-20 px-6 pb-8"
        style={{ marginLeft: 'var(--sidebar-width, 70px)' }}
      >
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
            {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default InstitutionLayout;
