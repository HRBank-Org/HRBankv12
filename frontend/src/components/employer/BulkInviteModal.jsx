import React, { useState } from 'react';
import { FiX, FiMail, FiUpload, FiUserPlus, FiAlertCircle } from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const BulkInviteModal = ({ isOpen, onClose, roleId, roleName, availablePositions, onSuccess }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('manual'); // manual, email, csv
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Manual entry state
  const [manualInvites, setManualInvites] = useState([
    { first_name: '', last_name: '', email: '', phone: '' }
  ]);
  
  // Bulk email state
  const [emailList, setEmailList] = useState('');
  
  // CSV upload state
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);

  if (!isOpen) return null;

  const addManualRow = () => {
    if (manualInvites.length >= availablePositions) {
      setError(`Cannot add more than ${availablePositions} invitations`);
      return;
    }
    setManualInvites([...manualInvites, { first_name: '', last_name: '', email: '', phone: '' }]);
    setError('');
  };

  const removeManualRow = (index) => {
    setManualInvites(manualInvites.filter((_, i) => i !== index));
    setError('');
  };

  const updateManualRow = (index, field, value) => {
    const updated = [...manualInvites];
    updated[index][field] = value;
    setManualInvites(updated);
  };

  const handleManualSubmit = async () => {
    setError('');
    
    // Validate
    const validInvites = manualInvites.filter(inv => 
      inv.first_name && inv.last_name && inv.email && inv.phone
    );
    
    if (validInvites.length === 0) {
      setError('Please fill in at least one complete invitation');
      return;
    }
    
    if (validInvites.length > availablePositions) {
      setError(`Cannot invite more than ${availablePositions} people`);
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/employer/invitations/send-manual', {
        invites: validInvites.map(inv => ({
          ...inv,
          role_id: roleId
        }))
      });
      
      onSuccess(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailListSubmit = async () => {
    setError('');
    
    const emails = emailList.split(/[,\n]/).map(e => e.trim()).filter(e => e);
    
    if (emails.length === 0) {
      setError('Please enter at least one email');
      return;
    }
    
    if (emails.length > availablePositions) {
      setError(`Cannot invite more than ${availablePositions} people`);
      return;
    }

    try {
      setLoading(true);
      const invites = emails.map(email => ({
        first_name: '',
        last_name: '',
        email: email,
        phone: '',
        role_id: roleId
      }));
      
      const response = await api.post('/api/employer/invitations/send-manual', { invites });
      onSuccess(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setError('Please select a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      setLoading(true);
      const response = await api.post('/api/employer/invitations/send-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCsvFile(file);
      setError('');
      
      // Parse CSV for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const preview = lines.slice(0, 6).map(line => line.split(','));
        setCsvPreview(preview);
      };
      reader.readAsText(file);
    }
  };

  const downloadTemplate = () => {
    const template = 'first_name,last_name,email,phone,role_name\nJohn,Doe,john@example.com,555-1234,Chef\nJane,Smith,jane@example.com,555-5678,Chef';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_invite_template.csv';
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Invite Team</h2>
            <p className="text-sm text-gray-600 mt-1">
              {roleName} • {availablePositions} position{availablePositions !== 1 ? 's' : ''} available
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiX size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'manual' ? 'border-current' : 'border-transparent text-gray-500'
            }`}
            style={{ color: activeTab === 'manual' ? theme.primaryColor : undefined }}
          >
            <FiUserPlus className="inline mr-2" />
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'email' ? 'border-current' : 'border-transparent text-gray-500'
            }`}
            style={{ color: activeTab === 'email' ? theme.primaryColor : undefined }}
          >
            <FiMail className="inline mr-2" />
            Email List
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'csv' ? 'border-current' : 'border-transparent text-gray-500'
            }`}
            style={{ color: activeTab === 'csv' ? theme.primaryColor : undefined }}
          >
            <FiUpload className="inline mr-2" />
            CSV Upload
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <FiAlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'manual' && (
            <div className="space-y-4">
              {manualInvites.map((invite, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={invite.first_name}
                    onChange={(e) => updateManualRow(index, 'first_name', e.target.value)}
                    className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={invite.last_name}
                    onChange={(e) => updateManualRow(index, 'last_name', e.target.value)}
                    className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={invite.email}
                    onChange={(e) => updateManualRow(index, 'email', e.target.value)}
                    className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={invite.phone}
                    onChange={(e) => updateManualRow(index, 'phone', e.target.value)}
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                  {manualInvites.length > 1 && (
                    <button
                      onClick={() => removeManualRow(index)}
                      className="col-span-12 md:col-span-1 px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <FiX size={20} />
                    </button>
                  )}
                </div>
              ))}
              
              {manualInvites.length < availablePositions && (
                <button
                  onClick={addManualRow}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
                >
                  + Add Another Person
                </button>
              )}
            </div>
          )}

          {activeTab === 'email' && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Enter email addresses separated by commas or new lines (max {availablePositions})
              </p>
              <textarea
                value={emailList}
                onChange={(e) => setEmailList(e.target.value)}
                rows={10}
                placeholder="john@example.com, jane@example.com&#10;mike@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
              />
            </div>
          )}

          {activeTab === 'csv' && (
            <div>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  CSV must contain: first_name, last_name, email, phone, role_name
                </p>
                <button
                  onClick={downloadTemplate}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Download Template →
                </button>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FiUpload size={48} className="text-gray-400 mx-auto mb-4" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="px-6 py-3 rounded-lg text-white font-medium cursor-pointer inline-block"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Choose CSV File
                </label>
                {csvFile && (
                  <p className="mt-4 text-sm text-gray-600">
                    Selected: {csvFile.name}
                  </p>
                )}
              </div>

              {csvPreview.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                  <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                    <table className="text-xs">
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j} className="px-2 py-1 border-b border-gray-200">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={
              activeTab === 'manual' ? handleManualSubmit :
              activeTab === 'email' ? handleEmailListSubmit :
              handleCsvUpload
            }
            disabled={loading}
            className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {loading ? 'Sending...' : 'Send Invitations'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkInviteModal;