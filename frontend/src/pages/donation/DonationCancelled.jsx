import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiXCircle, FiArrowLeft, FiHeart } from 'react-icons/fi';

import { useLanguage } from '../../contexts/LanguageContext';

const DonationCancelled = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const fundraiserId = searchParams.get('fundraiser_id');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center" data-testid="donation-cancelled-card">
          {/* Cancelled Icon */}
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiXCircle className="text-gray-400" size={40} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2" data-testid="donation-cancelled-title">
            Donation Cancelled
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your donation was not processed. No charges have been made to your account.
            You can try again anytime you'd like to contribute.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/workpassport/fundraisers')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors font-medium"
              data-testid="try-again-btn"
            >
              <FiHeart size={18} />
              Try Again
            </button>
            
            <button
              onClick={() => navigate('/workpassport/dashboard')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              data-testid="back-to-dashboard-btn"
            >
              <FiArrowLeft size={18} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationCancelled;
