import React from 'react';
import ModernSidebar from './ModernSidebar';
import GenericHeader from './GenericHeader';

const EmployerLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      <GenericHeader />
      
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

export default EmployerLayout;
