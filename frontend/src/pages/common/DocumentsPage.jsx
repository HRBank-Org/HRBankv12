import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';

const DocumentsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState({});
  const [compliance, setCompliance] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadModal, setUploadModal] = useState({ open: false, type: null });
  const [uploadData, setUploadData] = useState({
    file: null,
    fileName: '',
    filePreview: null,
    document_number: '',
    issue_date: '',
    expiry_date: '',
    notes: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocumentTypes();
    loadDocuments();
  }, []);

  const loadDocumentTypes = async () => {
    try {
      const response = await api.get('/api/documents/types');
      setDocumentTypes(response.data.data.document_types || {});
    } catch (error) {
      console.error('Failed to load document types:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await api.get('/api/documents/me');
      const data = response.data.data;
      setDocuments(data.documents || []);
      setCompliance(data.compliance);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const openUploadModal = (type) => {
    setUploadModal({ open: true, type });
    setUploadData({
      file: null,
      fileName: '',
      filePreview: null,
      issue_date: '',
      expiry_date: '',
      notes: ''
    });
    setMessage({ type: '', text: '' });
  };

  const closeUploadModal = () => {
    setUploadModal({ open: false, type: null });
    setUploadData({
      file: null,
      fileName: '',
      filePreview: null,
      issue_date: '',
      expiry_date: '',
      notes: ''
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 10MB' });
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only PDF, JPG, and PNG files are allowed' });
      return;
    }

    setUploadData(prev => ({
      ...prev,
      file,
      fileName: file.name,
      filePreview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
  };

  const handleUpload = async () => {
    if (!uploadData.file) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    const docType = documentTypes[uploadModal.type];
    
    // Validate required dates
    if (docType?.requires_issue_date && !uploadData.issue_date) {
      setMessage({ type: 'error', text: 'Issue date is required for this document' });
      return;
    }
    
    if (docType?.requires_expiry_date && !uploadData.expiry_date) {
      setMessage({ type: 'error', text: 'Expiry date is required for this document' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(uploadData.file);
      
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
          const fileExtension = uploadData.fileName.split('.').pop().toLowerCase();

          const payload = {
            document_type: uploadModal.type,
            document_name: docType?.name || uploadModal.type,
            file_data: base64Data,
            file_type: fileExtension,
            issue_date: uploadData.issue_date || null,
            expiry_date: uploadData.expiry_date || null,
            notes: uploadData.notes || null
          };

          await api.post('/api/documents/upload', payload);

          setMessage({ type: 'success', text: 'Document uploaded successfully! It will be reviewed by an admin.' });
          closeUploadModal();
          await loadDocuments();
        } catch (error) {
          setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to upload document' });
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setMessage({ type: 'error', text: 'Failed to read file' });
        setUploading(false);
      };
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process file' });
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending Review', bg: 'bg-yellow-100', textColor: 'text-yellow-800', icon: '⏳' },
      verified: { text: 'Verified', bg: 'bg-green-100', textColor: 'text-green-800', icon: '✓' },
      rejected: { text: 'Rejected', bg: 'bg-red-100', textColor: 'text-red-800', icon: '✗' },
      expired: { text: 'Expired', bg: 'bg-red-100', textColor: 'text-red-800', icon: '⚠' }
    };
    return badges[status] || badges.pending;
  };

  const getExpiryWarning = (doc) => {
    if (!doc.expiry_date || !doc.days_until_expiry) return null;
    
    const days = doc.days_until_expiry;
    
    if (doc.is_expired) {
      return {
        text: 'This document has expired',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: '🚫'
      };
    } else if (days <= 7) {
      return {
        text: `Expires in ${days} day${days !== 1 ? 's' : ''}`,
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: '⚠️'
      };
    } else if (days <= 30) {
      return {
        text: `Expires in ${days} days`,
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: '📅'
      };
    }
    
    return null;
  };

  const getDocumentForType = (type) => {
    return documents.find(doc => doc.document_type === type);
  };

  const getDashboardRoute = () => {
    const userType = user?.user_type || 'workforce';
    return `/${userType}/dashboard`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader 
        onBackClick={() => navigate(getDashboardRoute())}
        showBack={true}
        title="Documents"
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Account Status Banner */}
        {user?.account_status === 'restricted' && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚫</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Account Restricted</p>
                <p className="text-xs text-red-800 mt-1">
                  Your account has been restricted due to expired documents. Please upload new, valid documents to restore full access.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Compliance Status */}
        {compliance && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Compliance</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold text-gray-900">{compliance.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${compliance.percentage}%`, 
                      backgroundColor: compliance.percentage === 100 ? '#10b981' : theme.primaryColor 
                    }}
                  ></div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{compliance.uploaded_required}/{compliance.total_required}</p>
                <p className="text-xs text-gray-600">Required Docs</p>
              </div>
            </div>
            
            {compliance.missing_required && compliance.missing_required.length > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-900">Missing Required Documents:</p>
                <ul className="text-xs text-yellow-800 mt-1 ml-4 list-disc">
                  {compliance.missing_required.map(type => (
                    <li key={type}>{documentTypes[type]?.name || type}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {message.text && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Document Requirements</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Upload clear, readable copies of your documents</li>
            <li>• Accepted formats: PDF, JPG, PNG (Max 10MB)</li>
            <li>• Provide accurate issue and expiry dates for validation</li>
            <li>• Documents will be reviewed within 1-2 business days</li>
            <li>• You'll receive an email when your documents are verified</li>
          </ul>
        </div>

        {/* Document Cards */}
        <div className="space-y-4">
          {Object.keys(documentTypes).map((type) => {
            const docInfo = documentTypes[type];
            const existingDoc = getDocumentForType(type);
            const badge = existingDoc ? getStatusBadge(existingDoc.verification_status) : null;
            const expiryWarning = existingDoc ? getExpiryWarning(existingDoc) : null;

            return (
              <div key={type} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{docInfo.name}</h3>
                      {docInfo.required && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">Required</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{docInfo.description}</p>
                  </div>
                  {badge && (
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${badge.bg} ${badge.textColor} text-xs font-semibold whitespace-nowrap`}>
                      <span>{badge.icon}</span>
                      <span>{badge.text}</span>
                    </div>
                  )}
                </div>

                {/* Expiry Warning */}
                {expiryWarning && (
                  <div className={`mb-4 p-3 rounded-lg border ${expiryWarning.bgColor} ${expiryWarning.borderColor}`}>
                    <div className="flex items-center gap-2">
                      <span>{expiryWarning.icon}</span>
                      <span className={`text-sm font-medium ${expiryWarning.color}`}>
                        {expiryWarning.text}
                      </span>
                    </div>
                  </div>
                )}

                {existingDoc ? (
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Uploaded</p>
                          <p className="font-medium text-gray-900">{new Date(existingDoc.uploaded_date).toLocaleDateString()}</p>
                        </div>
                        {existingDoc.issue_date && (
                          <div>
                            <p className="text-gray-600">Issue Date</p>
                            <p className="font-medium text-gray-900">{new Date(existingDoc.issue_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {existingDoc.expiry_date && (
                          <div>
                            <p className="text-gray-600">Expiry Date</p>
                            <p className={`font-medium ${existingDoc.is_expired ? 'text-red-600' : 'text-gray-900'}`}>
                              {new Date(existingDoc.expiry_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {existingDoc.file_url && (
                        <a 
                          href={`${process.env.REACT_APP_BACKEND_URL}${existingDoc.file_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium inline-flex items-center gap-1 hover:underline"
                          style={{ color: theme.primaryColor }}
                        >
                          View Document →
                        </a>
                      )}
                    </div>

                    {existingDoc.verification_status === 'rejected' && existingDoc.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                        <p className="text-sm font-medium text-red-900">Rejection Reason:</p>
                        <p className="text-sm text-red-800 mt-1">{existingDoc.rejection_reason}</p>
                      </div>
                    )}

                    {(existingDoc.verification_status !== 'verified' || existingDoc.is_expired) && (
                      <button
                        onClick={() => openUploadModal(type)}
                        className="w-full px-4 py-2 border-2 rounded-lg font-medium hover:bg-gray-50 transition-all"
                        style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                      >
                        {existingDoc.is_expired ? 'Upload New Document (Expired)' : 'Re-upload Document'}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => openUploadModal(type)}
                    className="w-full px-4 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Upload Document
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Upload Modal */}
      {uploadModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Upload {documentTypes[uploadModal.type]?.name}
                </h2>
                <button 
                  onClick={closeUploadModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document File *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold hover:file:bg-gray-100"
                  style={{ 
                    'file:backgroundColor': theme.primaryColor, 
                    'file:color': 'white' 
                  }}
                />
                {uploadData.fileName && (
                  <p className="mt-2 text-sm text-gray-600">Selected: {uploadData.fileName}</p>
                )}
                {uploadData.filePreview && (
                  <img src={uploadData.filePreview} alt="Preview" className="mt-3 max-h-40 rounded-lg" />
                )}
              </div>

              {/* Issue Date */}
              {documentTypes[uploadModal.type]?.requires_issue_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    value={uploadData.issue_date}
                    onChange={(e) => setUploadData(prev => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ focusRing: theme.primaryColor }}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              {/* Expiry Date */}
              {documentTypes[uploadModal.type]?.requires_expiry_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={uploadData.expiry_date}
                    onChange={(e) => setUploadData(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ focusRing: theme.primaryColor }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={uploadData.notes}
                  onChange={(e) => setUploadData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Add any additional information..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ focusRing: theme.primaryColor }}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={closeUploadModal}
                disabled={uploading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadData.file}
                className="flex-1 px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
