import React from 'react';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import { FiDollarSign, FiCalendar, FiUsers, FiDownload } from 'react-icons/fi';

const Payroll = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <ModernSidebar />
      
      {/* Main Content */}
      <div className="ml-[70px] pt-[64px] transition-all duration-300">
        {/* Header */}
        <div className="px-8 py-6 bg-white shadow-sm border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 mt-1">
            Process and manage payroll for your workforce
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#10b98115' }}
            >
              <FiDollarSign size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Payroll Module Coming Soon
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              We're building comprehensive payroll management features including automated calculations, 
              tax deductions, direct deposits, and detailed reporting.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
              <div className="p-6 bg-gray-50 rounded-xl">
                <FiCalendar size={32} className="text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Pay Periods</h3>
                <p className="text-sm text-gray-600">Flexible pay schedules and automated processing</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <FiUsers size={32} className="text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Employee Records</h3>
                <p className="text-sm text-gray-600">Detailed pay history and tax documentation</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <FiDownload size={32} className="text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Reports</h3>
                <p className="text-sm text-gray-600">Comprehensive payroll reports and exports</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payroll;
