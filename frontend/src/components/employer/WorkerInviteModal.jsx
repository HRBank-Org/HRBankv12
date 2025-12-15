import React, { useState } from 'react';
import { FiX, FiMail, FiPhone, FiUserPlus, FiAlertCircle } from 'react-icons/fi';
import api from '../../utils/api';

const WorkerInviteModal = ({ isOpen, onClose, role, workplace }) => {
  const [inviteType, setInviteType] = useState('single'); // 'single' or 'bulk'
  const [singleInvite, setSingleInvite] = useState({
    email: '',
    phone: '',
    first_name: '',
    last_name: ''
  });
  const [bulkInvites, setBulkInvites] = useState([{ email: '', phone: '', first_name: '', last_name: '' }]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setBulkInvites([...bulkInvites, { email: '', phone: '', first_name: '', last_name: '' }]);
  };

  const handleRemoveRow = (index) => {
    if (bulkInvites.length > 1) {
      setBulkInvites(bulkInvites.filter((_, i) => i !== index));
    }
  };

  const handleBulkChange = (index, field, value) => {
    const updated = [...bulkInvites];
    updated[index][field] = value;
    setBulkInvites(updated);
  };

  const validateInvite = (invite) => {
    if (!invite.email && !invite.phone) {
      return 'Email or phone number is required';
    }
    if (invite.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.email)) {
      return 'Invalid email format';
    }
    if (invite.phone && !/^\+?[1-9]\d{1,14}$/.test(invite.phone.replace(/[\s()-]/g, ''))) {
      return 'Invalid phone format';
    }
    if (!invite.first_name || !invite.last_name) {
      return 'First and last name are required';
    }
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    const invites = inviteType === 'single' ? [singleInvite] : bulkInvites;
    
    // Validate all invites
    for (let i = 0; i < invites.length; i++) {
      const validationError = validateInvite(invites[i]);
      if (validationError) {
        setError(`Row ${i + 1}: ${validationError}`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        role_id: role.role_id,
        workplace_id: workplace.workplace_id,
        invites: invites.map(inv => ({
          email: inv.email || null,
          phone: inv.phone || null,
          first_name: inv.first_name,
          last_name: inv.last_name
        }))
      };

      await api.post('/api/employer/invite-workers', payload);
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset form
        setSingleInvite({ email: '', phone: '', first_name: '', last_name: '' });
        setBulkInvites([{ email: '', phone: '', first_name: '', last_name: '' }]);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Invite Workers</h2>
            <p className="text-blue-100 text-sm mt-1">
              {role.title} • {workplace.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Invite Type Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setInviteType('single')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                inviteType === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiUserPlus className="inline mr-2" />
              Single Invite
            </button>
            <button
              onClick={() => setInviteType('bulk')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                inviteType === 'bulk'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiMail className="inline mr-2" />
              Bulk Invite
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <div className="text-green-600 mt-0.5">✓</div>
              <div>
                <h4 className="font-semibold text-green-900">Invitations Sent!</h4>
                <p className="text-sm text-green-700 mt-1">
                  Workers will receive an email and/or SMS with a link to join your team.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <FiAlertCircle className="text-red-600 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-red-900">Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Single Invite Form */}
          {inviteType === 'single' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={singleInvite.first_name}
                    onChange={(e) => setSingleInvite({ ...singleInvite, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={singleInvite.last_name}
                    onChange={(e) => setSingleInvite({ ...singleInvite, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMail className="inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={singleInvite.email}
                  onChange={(e) => setSingleInvite({ ...singleInvite, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="worker@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiPhone className="inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={singleInvite.phone}
                  onChange={(e) => setSingleInvite({ ...singleInvite, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 (519) 555-0123"
                />
                <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for Canada)</p>
              </div>
              <p className="text-sm text-gray-600">
                * Either email or phone is required for invitation
              </p>
            </div>
          )}

          {/* Bulk Invite Form */}
          {inviteType === 'bulk' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">First Name *</th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Last Name *</th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Email</th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Phone</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkInvites.map((invite, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={invite.first_name}
                            onChange={(e) => handleBulkChange(index, 'first_name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="John"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={invite.last_name}
                            onChange={(e) => handleBulkChange(index, 'last_name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Smith"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="email"
                            value={invite.email}
                            onChange={(e) => handleBulkChange(index, 'email', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="email@example.com"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="tel"
                            value={invite.phone}
                            onChange={(e) => handleBulkChange(index, 'phone', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="+15195550123"
                          />
                        </td>
                        <td className="py-2 px-2">
                          {bulkInvites.length > 1 && (
                            <button
                              onClick={() => handleRemoveRow(index)}
                              className="text-red-600 hover:bg-red-50 p-1 rounded"
                            >
                              <FiX size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={handleAddRow}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Another Person
              </button>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">📧 How it works:</h4>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li>Workers will receive an email and/or SMS with a signup link</li>
              <li>Link includes your company and role information</li>
              <li>Workers can accept or decline the invitation</li>
              <li>Accepted workers will appear in your workforce roster</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : `Send ${inviteType === 'bulk' ? `${bulkInvites.length} ` : ''}Invitation${inviteType === 'bulk' && bulkInvites.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkerInviteModal;