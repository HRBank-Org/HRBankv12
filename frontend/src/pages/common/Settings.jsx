import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import GoogleCalendarSettings from '../../components/common/GoogleCalendarSettings';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState({});
  const [compliance, setCompliance] = useState({});
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [typesRes, docsRes] = await Promise.all([
        api.get('/api/documents/types'),
        api.get('/api/documents/my-documents')
      ]);
      
      setDocumentTypes(typesRes.data.data.document_types);
      setDocuments(docsRes.data.data.documents);
      setCompliance(docsRes.data.data.compliance);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDashboardRoute = () => {
    const routes = {
      workforce: '/workforce/dashboard',
      employer: '/employer/dashboard',
      institution: '/institution/dashboard'
    };
    return routes[user?.user_type] || '/';
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const text = {
      pending: 'Pending Review',
      verified: 'Verified',
      rejected: 'Rejected',
      expired: 'Expired'
    };
    return text[status] || status;
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.delete(`/api/documents/${documentId}`);
      await loadData();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
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
      {/* Header */}
      <header className="text-white px-4 py-4 shadow-md" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(getDashboardRoute())} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold">Settings & Documents</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'documents'
                ? 'border-b-2 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ borderColor: activeTab === 'documents' ? theme.primaryColor : 'transparent' }}
          >
            Documents & Verification
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'calendar'
                ? 'border-b-2 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ borderColor: activeTab === 'calendar' ? theme.primaryColor : 'transparent' }}
          >
            Google Calendar
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'account'
                ? 'border-b-2 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ borderColor: activeTab === 'account' ? theme.primaryColor : 'transparent' }}
          >
            Account Settings
          </button>
        </div>

        {activeTab === 'documents' ? (
          <>
            {/* Compliance Dashboard */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Document Compliance</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Compliance</p>
                  <p className="text-3xl font-bold" style={{ color: theme.primaryColor }}>
                    {compliance.percentage}%
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Verified</p>
                  <p className="text-3xl font-bold text-green-600">
                    {compliance.uploaded_required || 0}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Required</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {compliance.total_required || 0}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Missing</p>
                  <p className="text-3xl font-bold text-red-600">
                    {compliance.missing_required?.length || 0}
                  </p>
                </div>
              </div>

              {compliance.missing_required && compliance.missing_required.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">⚠️ Missing Required Documents:</p>
                  <ul className="text-sm text-red-700 list-disc ml-5">
                    {compliance.missing_required.map(type => (
                      <li key={type}>{documentTypes[type]?.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Document Types & Upload */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Required Documents</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(documentTypes).map(([key, docType]) => {
                  const uploadedDoc = documents.find(d => d.document_type === key);
                  
                  return (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {docType.name}
                            {docType.required && <span className="text-red-500 ml-1">*</span>}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{docType.description}</p>
                        </div>
                      </div>

                      {uploadedDoc ? (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{uploadedDoc.document_name}</p>
                              <p className="text-xs text-gray-500">
                                Uploaded {new Date(uploadedDoc.uploaded_date).toLocaleDateString()}
                              </p>
                              {uploadedDoc.expiry_date && (
                                <p className={`text-xs mt-1 ${
                                  uploadedDoc.is_expired ? 'text-red-600' : 
                                  uploadedDoc.days_until_expiry <= 30 ? 'text-yellow-600' : 
                                  'text-gray-600'
                                }`}>
                                  {uploadedDoc.is_expired 
                                    ? '❌ Expired' 
                                    : `Expires: ${new Date(uploadedDoc.expiry_date).toLocaleDateString()}`
                                  }
                                </p>
                              )}
                              <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(uploadedDoc.verification_status)}`}>
                                {getStatusText(uploadedDoc.verification_status)}
                              </span>
                            </div>
                            {!['verified', 'pending'].includes(uploadedDoc.verification_status) ? (
                              <button
                                onClick={() => handleDeleteDocument(uploadedDoc.document_id)}
                                className="ml-2 text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            ) : (
                              <span className="ml-2 text-xs text-gray-400">
                                🔒 Locked
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedDocType(key);
                            setShowUploadModal(true);
                          }}
                          className="mt-3 w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                        >
                          + Upload {docType.name}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Account Settings Tab */
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
            <p className="text-gray-600">Account settings coming soon...</p>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          documentType={selectedDocType}
          documentTypeName={documentTypes[selectedDocType]?.name}
          hasExpiry={documentTypes[selectedDocType]?.has_expiry}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedDocType(null);
          }}
          onSuccess={() => {
            setShowUploadModal(false);
            setSelectedDocType(null);
            loadData();
          }}
          theme={theme}
        />
      )}
    </div>
  );
};

// Upload Modal Component
const UploadModal = ({ documentType, documentTypeName, hasExpiry, onClose, onSuccess, theme }) => {
  const [formData, setFormData] = useState({
    document_name: '',
    issue_date: '',
    expiry_date: '',
    notes: ''
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      // Check file type
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(fileType)) {
        setError('File must be PDF, JPG, or PNG');
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        const fileType = file.name.split('.').pop().toLowerCase();
        
        await api.post('/api/documents/upload', {
          document_type: documentType,
          document_name: formData.document_name || file.name,
          file_data: base64Data,
          file_type: fileType,
          issue_date: formData.issue_date || null,
          expiry_date: formData.expiry_date || null,
          notes: formData.notes || null
        });
        
        onSuccess();
      };
      
      reader.onerror = () => {
        setError('Failed to read file');
        setUploading(false);
      };
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload document');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Upload {documentTypeName}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
            <input
              type="text"
              value={formData.document_name}
              onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="e.g., Driver's License, Business License"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select File (PDF, JPG, PNG - Max 10MB)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              required
            />
            {file && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
            <input
              type="date"
              value={formData.issue_date}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            />
          </div>

          {hasExpiry && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                required={hasExpiry}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="Additional information about this document"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
