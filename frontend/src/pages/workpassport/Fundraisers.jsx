import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import WorkPassportHeader from '../../components/layout/WorkPassportHeader';
import WorkPassportSidebar from '../../components/layout/WorkPassportSidebar';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  FiHeart, 
  FiDollarSign, 
  FiUsers, 
  FiTarget,
  FiCalendar,
  FiCheck,
  FiExternalLink,
  FiX,
  FiPlay
} from 'react-icons/fi';

const GraduateFundraisers = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [fundraisers, setFundraisers] = useState([]);
  const [selectedFundraiser, setSelectedFundraiser] = useState(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationMessage, setDonationMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [donating, setDonating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFundraisers();
  }, []);

  const loadFundraisers = async () => {
    try {
      const response = await api.get('/api/fundraisers/my-institutions');
      if (response.data.success) {
        setFundraisers(response.data.data.fundraisers);
      }
    } catch (error) {
      console.error('Failed to load fundraisers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async () => {
    if (!selectedFundraiser || !donationAmount) return;
    
    const amount = parseFloat(donationAmount);
    if (amount < selectedFundraiser.min_donation) {
      setError(`Minimum donation is $${selectedFundraiser.min_donation}`);
      return;
    }
    
    setError('');
    setDonating(true);
    
    try {
      const response = await api.post(`/api/fundraisers/donate/${selectedFundraiser.fundraiser_id}`, {
        amount,
        message: donationMessage,
        anonymous
      });
      
      if (response.data.success && response.data.data.checkout_url) {
        window.location.href = response.data.data.checkout_url;
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to process donation');
      setDonating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const getProgress = (raised, goal) => {
    return Math.min(100, (raised / goal) * 100);
  };

  const quickAmounts = [10, 25, 50, 100];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkPassportHeader />
      <WorkPassportSidebar />
      
      <div className="transition-all duration-300 pt-16" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Support Your Institutions</h1>
            <p className="text-gray-600">
              Fundraisers from institutions where you've earned credentials
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {fundraisers.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiHeart className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No fundraisers available</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Fundraisers from your credential-issuing institutions will appear here. 
                Get verified credentials to see fundraising campaigns.
              </p>
              <button
                onClick={() => navigate('/workpassport/credentials')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
              >
                View My Credentials
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {fundraisers.map((fundraiser) => (
                <div 
                  key={fundraiser.fundraiser_id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedFundraiser(fundraiser);
                    setDonationAmount(fundraiser.min_donation.toString());
                  }}
                >
                  {/* Media */}
                  {fundraiser.media_url ? (
                    <div className="h-48 bg-gray-100 relative">
                      {fundraiser.media_type === 'video' ? (
                        <>
                          <video 
                            src={fundraiser.media_url} 
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                              <FiPlay className="text-gray-900" size={20} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img 
                          src={fundraiser.media_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      )}
                      {fundraiser.user_donated && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <FiCheck size={12} />
                          Donated
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center relative">
                      <FiHeart className="text-white/30" size={48} />
                      {fundraiser.user_donated && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <FiCheck size={12} />
                          Donated
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      {fundraiser.institution_logo && (
                        <img 
                          src={fundraiser.institution_logo} 
                          alt="" 
                          className="w-6 h-6 rounded object-cover"
                        />
                      )}
                      <span className="text-sm text-gray-500">{fundraiser.institution_name}</span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {fundraiser.title}
                    </h3>
                    
                    {/* Progress */}
                    <div className="mb-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                          style={{ width: `${getProgress(fundraiser.raised_amount, fundraiser.goal_amount)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(fundraiser.raised_amount)}
                        </span>
                        <span className="text-gray-500">
                          {Math.round(getProgress(fundraiser.raised_amount, fundraiser.goal_amount))}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiUsers size={14} />
                        {fundraiser.donor_count} donors
                      </span>
                      {fundraiser.end_date && (
                        <span className="flex items-center gap-1">
                          <FiCalendar size={14} />
                          {new Date(fundraiser.end_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Donation Modal */}
      {selectedFundraiser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedFundraiser.institution_logo && (
                    <img 
                      src={selectedFundraiser.institution_logo} 
                      alt="" 
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Make a Donation</h2>
                    <p className="text-sm text-gray-500">{selectedFundraiser.institution_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedFundraiser(null);
                    setError('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">{selectedFundraiser.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{selectedFundraiser.description}</p>
              
              {/* Progress */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-gray-900">
                    {formatCurrency(selectedFundraiser.raised_amount)}
                  </span>
                  <span className="text-gray-500 text-sm">
                    of {formatCurrency(selectedFundraiser.goal_amount)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                    style={{ width: `${getProgress(selectedFundraiser.raised_amount, selectedFundraiser.goal_amount)}%` }}
                  />
                </div>
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">{error}</div>
              )}
              
              {/* Quick Amounts */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Amount</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setDonationAmount(amount.toString())}
                      className={`py-2.5 rounded-lg font-medium transition-colors ${
                        donationAmount === amount.toString()
                          ? 'bg-cyan-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    placeholder="Other amount"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg font-medium"
                    min={selectedFundraiser.min_donation}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum donation: {formatCurrency(selectedFundraiser.min_donation)}
                </p>
              </div>
              
              {/* Message */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add a message (optional)
                </label>
                <textarea
                  value={donationMessage}
                  onChange={(e) => setDonationMessage(e.target.value)}
                  placeholder="Share why you're supporting this cause..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
              
              {/* Anonymous */}
              <label className="flex items-center gap-3 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="w-4 h-4 text-cyan-500 border-gray-300 rounded focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-700">Donate anonymously</span>
              </label>
              
              {/* Submit */}
              <button
                onClick={handleDonate}
                disabled={donating || !donationAmount}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {donating ? (
                  'Processing...'
                ) : (
                  <>
                    <FiHeart size={18} />
                    Donate {donationAmount ? formatCurrency(parseFloat(donationAmount)) : ''}
                  </>
                )}
              </button>
              
              <p className="text-xs text-center text-gray-500 mt-3">
                Secure payment powered by Stripe
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraduateFundraisers;
