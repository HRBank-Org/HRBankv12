import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { FiCheckCircle, FiHeart, FiArrowRight, FiShare2 } from 'react-icons/fi';

const DonationSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [donation, setDonation] = useState(null);
  const [error, setError] = useState('');

  const sessionId = searchParams.get('session_id');
  const fundraiserId = searchParams.get('fundraiser_id');

  useEffect(() => {
    if (sessionId) {
      processPayment();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const processPayment = async () => {
    try {
      const response = await api.post(`/api/fundraisers/webhook/donation-complete?session_id=${sessionId}`);
      if (response.data.success) {
        setDonation(response.data.data);
      }
    } catch (err) {
      console.error('Failed to process donation:', err);
      setError('There was an issue processing your donation. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your donation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center" data-testid="donation-success-card">
          {/* Success Icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
            <div className="relative w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <FiCheckCircle className="text-green-600" size={40} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2" data-testid="donation-success-title">
            Thank You for Your Donation!
          </h1>
          
          {donation?.gross_amount && (
            <p className="text-3xl font-bold text-green-600 mb-4" data-testid="donation-amount">
              {formatCurrency(donation.gross_amount)}
            </p>
          )}

          <p className="text-gray-600 mb-6">
            Your generous contribution will make a real difference. 
            You'll receive a confirmation email shortly.
          </p>

          {donation && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-gray-500 mb-1">Donation ID</p>
              <p className="font-mono text-sm text-gray-900">{donation.donation_id}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/workpassport/fundraisers')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors font-medium"
              data-testid="back-to-fundraisers-btn"
            >
              <FiHeart size={18} />
              View More Fundraisers
            </button>
            
            <button
              onClick={() => navigate('/workpassport/dashboard')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              data-testid="back-to-dashboard-btn"
            >
              Go to Dashboard
              <FiArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Platform Fee Note */}
        <p className="text-center text-xs text-gray-400 mt-4">
          5% of your donation supports the HR Bank platform
        </p>
      </div>
    </div>
  );
};

export default DonationSuccess;
