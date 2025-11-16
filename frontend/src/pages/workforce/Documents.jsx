import React from 'react';
import DocumentsPage from '../common/DocumentsPage';

const WorkforceDocuments = () => {
  return <DocumentsPage />;

  const documentTypes = {
    government_id: {
      name: 'Government ID',
      description: 'Driver License, Passport, PR Card, etc.',
      required: true,
      hasExpiry: true,
      hasNumber: true
    },
    work_permit: {
      name: 'Work Permit',
      description: 'Canadian work permit (if applicable)',
      required: false,
      hasExpiry: true,
      hasNumber: true
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await api.get('/api/documents/me');
      // Handle both array and object responses
      const docsData = response.data.data;
      if (Array.isArray(docsData)) {
        setDocuments(docsData);
      } else if (docsData && docsData.documents) {
        setDocuments(docsData.documents);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (docType) => {
    setUploadingType(docType);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', uploadingType);
    formData.append('document_name', documentTypes[uploadingType].name);

    setMessage({ type: '', text: '' });

    try {
      await api.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage({ type: 'success', text: 'Document uploaded successfully!' });
      await loadDocuments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to upload document' });
    } finally {
      setUploadingType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending Review', bg: 'bg-yellow-100', textColor: 'text-yellow-800', icon: '⏳' },
      approved: { text: 'Approved', bg: 'bg-green-100', textColor: 'text-green-800', icon: '✓' },
      rejected: { text: 'Rejected', bg: 'bg-red-100', textColor: 'text-red-800', icon: '✗' }
    };
    return badges[status] || badges.pending;
  };

  const getDocumentForType = (type) => {
    return documents.find(doc => doc.document_type === type);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  const allRequiredApproved = Object.keys(documentTypes).every(type => {
    if (!documentTypes[type].required) return true;
    const doc = getDocumentForType(type);
    return doc && doc.verification_status === 'approved';
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader 
        onBackClick={() => navigate('/workforce/dashboard')}
        showBack={true}
        title="Documents"
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Account Activation Status */}
        {!allRequiredApproved && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Account Activation Pending</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Your account will be activated once all required documents are uploaded and approved by an admin.
                </p>
              </div>
            </div>
          </div>
        )}

        {message.text && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Document Requirements</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Upload clear, readable copies of your documents</li>
            <li>• Accepted formats: PDF, JPG, PNG (Max 5MB)</li>
            <li>• Ensure all information is visible and not cropped</li>
            <li>• Documents will be reviewed by HR Bank admin</li>
          </ul>
        </div>

        {/* Document Cards */}
        <div className="space-y-4">
          {Object.keys(documentTypes).map((type) => {
            const docInfo = documentTypes[type];
            const existingDoc = getDocumentForType(type);
            const badge = existingDoc ? getStatusBadge(existingDoc.verification_status) : null;

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

                {existingDoc ? (
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">Uploaded: {new Date(existingDoc.uploaded_date).toLocaleDateString()}</p>
                        {existingDoc.document_number && (
                          <p className="text-gray-600 mt-1">Document #: {existingDoc.document_number}</p>
                        )}
                        {existingDoc.expiry_date && (
                          <p className="text-gray-600 mt-1">Expiry: {existingDoc.expiry_date}</p>
                        )}
                        {existingDoc.file_url && (
                          <a 
                            href={`${process.env.REACT_APP_BACKEND_URL}${existingDoc.file_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium mt-2 inline-block hover:underline"
                            style={{ color: theme.primaryColor }}
                          >
                            View Document →
                          </a>
                        )}
                      </div>
                    </div>

                    {existingDoc.verification_status === 'rejected' && existingDoc.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                        <p className="text-sm font-medium text-red-900">Rejection Reason:</p>
                        <p className="text-sm text-red-800 mt-1">{existingDoc.rejection_reason}</p>
                      </div>
                    )}

                    {existingDoc.verification_status !== 'approved' && (
                      <button
                        onClick={() => handleFileSelect(type)}
                        disabled={uploadingType === type}
                        className="w-full px-4 py-2 border-2 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
                        style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                      >
                        {uploadingType === type ? 'Uploading...' : 'Re-upload Document'}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleFileSelect(type)}
                    disabled={uploadingType === type}
                    className="w-full px-4 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all disabled:opacity-50"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {uploadingType === type ? 'Uploading...' : 'Upload Document'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default WorkforceDocuments;
