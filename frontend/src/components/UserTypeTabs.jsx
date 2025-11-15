import React from 'react';

const UserTypeTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'workforce', label: 'Workforce' },
    { id: 'employer', label: 'Employer' },
    { id: 'institution', label: 'Institution' }
  ];

  return (
    <div className="flex gap-2 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-[#4267B2] text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default UserTypeTabs;