import api from './api';

export const documentService = {
  // Get my documents
  getMyDocuments: async () => {
    const response = await api.get('/documents/my-documents');
    return response.data;
  },

  // Upload document
  uploadDocument: async (documentData) => {
    const formData = new FormData();
    formData.append('document_type', documentData.document_type);
    formData.append('file', {
      uri: documentData.uri,
      type: documentData.type || 'application/pdf',
      name: documentData.name || 'document.pdf',
    });
    
    if (documentData.issue_date) {
      formData.append('issue_date', documentData.issue_date);
    }
    if (documentData.expiry_date) {
      formData.append('expiry_date', documentData.expiry_date);
    }

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete document
  deleteDocument: async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },

  // Get required documents
  getRequiredDocuments: async () => {
    const response = await api.get('/documents/required');
    return response.data;
  },
};
