import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Footer Badge */}
      <div className="pb-6 flex justify-center">
        <Link 
          to="#" 
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img 
            src="https://avatars.githubusercontent.com/in/1201222?s=120&u=2686cf91179bbafbc7a71bfbc43004cf9ae1acea&v=4" 
            alt="Emergent" 
            className="w-5 h-5 rounded"
          />
          <span>Made with Emergent</span>
        </Link>
      </div>
    </div>
  );
};

export default AuthLayout;