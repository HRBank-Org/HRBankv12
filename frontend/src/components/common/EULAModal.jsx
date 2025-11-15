import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const EULAModal = ({ isOpen, onAccept }) => {
  const [eulaData, setEulaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    if (isOpen && user) {
      checkEULAStatus();
    }
  }, [isOpen, user]);

  const checkEULAStatus = async () => {
    try {
      const response = await api.get('/api/eula/check');
      setEulaData(response.data.data);
      
      // If already accepted, call onAccept immediately
      if (response.data.data.accepted) {
        onAccept();
      }
    } catch (error) {
      console.error('Failed to check EULA status:', error);
      setError('Failed to load agreement');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e) => {
    const element = e.target;
    const scrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    if (scrolledToBottom && !hasScrolled) {
      setHasScrolled(true);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError('');

    try {
      await api.post('/api/eula/accept');
      onAccept();
    } catch (error) {
      console.error('Failed to accept EULA:', error);
      setError('Failed to accept agreement. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (!isOpen || !user) return null;

  // If already accepted, don't show modal
  if (eulaData && eulaData.accepted) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">End User License Agreement</h2>
              <p className="text-sm text-gray-600">Please read and accept to continue</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto px-6 py-4"
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
            </div>
          ) : eulaData ? (
            <div className="prose prose-sm max-w-none">
              <div 
                className="whitespace-pre-wrap text-gray-700 leading-relaxed"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {eulaData.eula_content}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Failed to load agreement
            </div>
          )}
        </div>

        {/* Scroll Indicator */}
        {!hasScrolled && (
          <div className="px-6 py-2 bg-yellow-50 border-t border-yellow-200">
            <p className="text-sm text-yellow-800 text-center">
              ⬇️ Please scroll to the bottom to read the entire agreement
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Version {eulaData?.version || '1.0'} • Effective Date: November 15, 2024
            </p>
            <button
              onClick={handleAccept}
              disabled={!hasScrolled || accepting}
              className="px-6 py-3 text-white font-medium rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {accepting ? 'Accepting...' : hasScrolled ? 'I Accept' : 'Please Read to Continue'}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-3 text-center">
            By clicking "I Accept", you acknowledge that you have read, understood, and agree to be bound by this Agreement.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EULAModal;
