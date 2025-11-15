import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const InviteModal = ({ isOpen, onClose, onSubmit, type = 'shift', itemName }) => {
  const [emails, setEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const theme = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    // Convert comma-separated emails to array
    const emailList = emails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (emailList.length === 0) {
      setResult({ success: false, message: 'Please enter at least one email address' });
      setLoading(false);
      return;
    }

    try {
      const response = await onSubmit(emailList);
      setResult(response);
      
      if (response.success) {
        // Clear form on success
        setTimeout(() => {
          setEmails('');
          setResult(null);
          onClose();
        }, 2000);
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: error.response?.data?.detail || 'Failed to send invitations' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmails('');
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Invite Workers to {type === 'shift' ? 'Shift' : 'Job'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {itemName && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>{type === 'shift' ? 'Shift' : 'Job'}:</strong> {itemName}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Addresses
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email addresses separated by commas&#10;e.g., john@example.com, jane@example.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple emails with commas
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Invitations will be sent to workers who aren't on the platform yet. 
              They'll receive an email with a link to create an account and {type === 'shift' ? 'apply for this shift' : 'view this job'}.
            </p>
          </div>

          {result && (
            <div className={`p-3 rounded-lg ${
              result.success 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="text-sm font-medium">{result.message}</p>
              {result.success && result.data && (
                <p className="text-xs mt-1">
                  Sent: {result.data.successful_invites} | Failed: {result.data.failed_invites}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {loading ? 'Sending...' : 'Send Invitations'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;
