import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const DocumentsStep = ({ data, onNext, onBack }) => {
  const [documents, setDocuments] = useState(data.documents || []);
  const theme = useTheme();

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    // For now, just store file names (upload functionality to be implemented)
    const newDocs = files.map(f => ({
      name: f.name,
      type: 'ID',
      size: f.size,
      uploaded_date: new Date().toISOString()
    }));
    setDocuments([...documents, ...newDocs]);
  };

  const removeDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    onNext({ documents });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Documents</h2>
      <p className="text-gray-600 mb-6">Upload your ID and any certifications (optional for now)</p>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 hover:border-gray-400 transition-colors">
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500">PDF, JPG, PNG up to 5MB</p>
        </label>
      </div>

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-gray-700">Uploaded Documents:</p>
          {documents.map((doc, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeDocument(index)}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500 mb-6">
        📝 Note: Documents are optional for now. You can add certifications later.
      </p>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: theme.primaryColor }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default DocumentsStep;
