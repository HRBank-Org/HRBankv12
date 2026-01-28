import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import UserHeader from '../../components/common/UserHeader';
import { 
  FiFileText, 
  FiCheckCircle, 
  FiChevronDown, 
  FiChevronUp,
  FiDollarSign,
  FiShield,
  FiUsers,
  FiAlertCircle,
  FiArrowLeft
} from 'react-icons/fi';

const PartnershipAgreement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [agreementData, setAgreementData] = useState(null);
  const [showFullAgreement, setShowFullAgreement] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  
  // Form fields for signatory
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryTitle, setSignatoryTitle] = useState('');

  useEffect(() => {
    loadAgreement();
  }, []);

  const loadAgreement = async () => {
    try {
      const response = await api.get('/api/eula/partnership-agreement');
      setAgreementData(response.data.data);
    } catch (error) {
      console.error('Failed to load partnership agreement:', error);
      setError('Failed to load the Partnership Agreement');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e) => {
    const element = e.target;
    const scrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
    if (scrolledToBottom && !hasScrolled) {
      setHasScrolled(true);
    }
  };

  const handleAccept = async () => {
    if (!signatoryName.trim() || !signatoryTitle.trim()) {
      setError('Please enter your name and title as the authorized signatory');
      return;
    }

    setAccepting(true);
    setError('');

    try {
      const response = await api.post('/api/eula/partnership-agreement/accept', {
        signatory_name: signatoryName,
        signatory_title: signatoryTitle
      });
      
      if (response.data.success) {
        setAgreementData(prev => ({
          ...prev,
          accepted: true,
          acceptance_date: response.data.data.accepted_date
        }));
      }
    } catch (error) {
      console.error('Failed to accept agreement:', error);
      setError(error.response?.data?.detail || 'Failed to accept agreement. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Key points summary component
  const KeyPointCard = ({ icon: Icon, title, points, color }) => (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <ul className="space-y-2">
        {points.map((point, idx) => (
          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
            <span className="text-green-500 mt-0.5">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: theme.primaryColor }}
          ></div>
          <p className="text-gray-600">Loading Partnership Agreement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader title="Partnership Agreement" />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/institution/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          data-testid="back-to-dashboard-btn"
        >
          <FiArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6" data-testid="agreement-header">
          <div className="flex items-start gap-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${theme.primaryColor}15` }}
            >
              <FiFileText className="w-8 h-8" style={{ color: theme.primaryColor }} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Institution Partnership Agreement
              </h1>
              <p className="text-gray-600">
                This formal agreement establishes the partnership terms between your institution and HR Bank 
                for credential issuance, revenue sharing, and platform usage.
              </p>
              
              {/* Status Badge */}
              {agreementData?.accepted ? (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full">
                  <FiCheckCircle size={18} />
                  <span className="font-medium">Agreement Accepted</span>
                  <span className="text-green-600">• {formatDate(agreementData.acceptance_date)}</span>
                </div>
              ) : (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full">
                  <FiAlertCircle size={18} />
                  <span className="font-medium">Pending Acceptance</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Points Summary */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Partnership Terms</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <KeyPointCard
              icon={FiDollarSign}
              title="Revenue Share"
              color="#10B981"
              points={[
                "Credential Sales: You receive 50% of verification fees",
                "Fundraisers: You receive 95% of donations (5% platform fee)",
                "Monthly payouts with $50 CAD minimum threshold"
              ]}
            />
            <KeyPointCard
              icon={FiUsers}
              title="Your Responsibilities"
              color="#6366F1"
              points={[
                "Issue credentials only to qualified recipients",
                "Maintain accurate records of all credentials",
                "Respond to verification requests within 48 hours"
              ]}
            />
            <KeyPointCard
              icon={FiShield}
              title="Data & Privacy"
              color="#F59E0B"
              points={[
                "Credentials stored on blockchain (immutable)",
                "Must obtain student consent before issuing",
                "Report data breaches within 24 hours"
              ]}
            />
            <KeyPointCard
              icon={FiFileText}
              title="Termination"
              color="#EF4444"
              points={[
                "30 days notice required by either party",
                "Existing credentials remain valid on blockchain",
                "Outstanding payouts processed within 30 days"
              ]}
            />
          </div>
        </div>

        {/* Full Agreement Section */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6" data-testid="full-agreement-section">
          <button
            onClick={() => setShowFullAgreement(!showFullAgreement)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            data-testid="toggle-full-agreement-btn"
          >
            <div className="flex items-center gap-3">
              <FiFileText className="text-gray-400" size={20} />
              <span className="font-medium text-gray-900">View Full Partnership Agreement</span>
            </div>
            {showFullAgreement ? (
              <FiChevronUp className="text-gray-400" size={20} />
            ) : (
              <FiChevronDown className="text-gray-400" size={20} />
            )}
          </button>
          
          {showFullAgreement && (
            <div 
              className="border-t border-gray-100 px-6 py-4 max-h-[60vh] overflow-y-auto bg-gray-50"
              onScroll={handleScroll}
              data-testid="agreement-content"
            >
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                {agreementData?.agreement_content}
              </pre>
            </div>
          )}
        </div>

        {/* Acceptance Section */}
        {!agreementData?.accepted && (
          <div className="bg-white rounded-2xl shadow-sm p-6" data-testid="acceptance-section">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Accept Partnership Agreement</h3>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <p className="text-gray-600 mb-6">
              As an authorized representative of your institution, please provide your details below 
              to formally accept this Partnership Agreement.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="e.g., John Smith"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  data-testid="signatory-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Title/Position *
                </label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  placeholder="e.g., Dean of Academic Affairs"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  data-testid="signatory-title-input"
                />
              </div>
            </div>
            
            {/* Scroll Warning */}
            {showFullAgreement && !hasScrolled && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
                <FiAlertCircle size={18} />
                <span>Please scroll to the bottom of the full agreement to enable acceptance</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 max-w-md">
                By clicking "I Accept", you confirm you are authorized to enter this agreement 
                on behalf of your institution and agree to all terms.
              </p>
              <button
                onClick={handleAccept}
                disabled={accepting || (showFullAgreement && !hasScrolled) || !signatoryName || !signatoryTitle}
                className="px-8 py-3 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: theme.primaryColor }}
                data-testid="accept-agreement-btn"
              >
                {accepting ? 'Processing...' : 'I Accept the Partnership Agreement'}
              </button>
            </div>
          </div>
        )}

        {/* Already Accepted Section */}
        {agreementData?.accepted && (
          <div className="bg-green-50 rounded-2xl p-6 border border-green-200" data-testid="accepted-section">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FiCheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-1">
                  Partnership Agreement Accepted
                </h3>
                <p className="text-green-700 mb-3">
                  Thank you for partnering with HR Bank! Your institution is now fully set up 
                  to issue blockchain credentials and access all partnership benefits.
                </p>
                <div className="text-sm text-green-600">
                  <p><strong>Accepted on:</strong> {formatDate(agreementData.acceptance_date)}</p>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => navigate('/institution/credentials')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                    data-testid="issue-credentials-btn"
                  >
                    Issue Credentials
                  </button>
                  <button
                    onClick={() => navigate('/institution/fundraisers')}
                    className="px-4 py-2 bg-white text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors font-medium text-sm"
                    data-testid="create-fundraiser-btn"
                  >
                    Create Fundraiser
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnershipAgreement;
