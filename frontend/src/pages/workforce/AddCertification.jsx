import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const AddCertification = () => {
  const { occupationId } = useParams();
  const [occupation, setOccupation] = useState(null);
  const [credentialTypes, setCredentialTypes] = useState([]);
  const [formData, setFormData] = useState({
    credential_type_id: '',
    issuing_institution_name: '',
    credential_id_number: '',
    issue_date: '',
    expiration_date: '',
    document_file: null
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadData();
  }, [occupationId]);

  const loadData = async () => {
    try {
      const [occRes, credTypesRes] = await Promise.all([
        api.get('/api/occupations/me'),
        api.get('/api/credentials/types')
      ]);

      const occ = occRes.data.data.occupations.find(o => o.occupation_id === occupationId);
      setOccupation(occ);
      setCredentialTypes(credTypesRes.data.data.credential_types);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('File must be PDF, JPEG, or PNG');
        return;
      }

      setFormData({...formData, document_file: file});
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Step 1: Upload document (mock for now)
      const uploadRes = await api.post('/api/credentials/documents/upload', {
        file_name: formData.document_file?.name || 'credential.pdf'
      });

      const documentUrl = uploadRes.data.data.document_url;

      // Step 2: Submit credential
      await api.post('/api/credentials', {
        occupation_id: occupationId,
        credential_type_id: formData.credential_type_id,
        credential_type_name: credentialTypes.find(c => c.credential_type_id === formData.credential_type_id)?.credential_name || '',
        issuing_institution_name: formData.issuing_institution_name,
        credential_id_number: formData.credential_id_number,
        issue_date: formData.issue_date,
        expiration_date: formData.expiration_date || null,
        document_url: documentUrl
      });

      alert('Credential submitted for verification! It will be reviewed by an institution and then HR Bank admin.');
      navigate(`/workforce/occupations/${occupationId}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit credential');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(`/workforce/occupations/${occupationId}`)} className="hover:opacity-80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold">Add Certification</h1>
            <p className="text-sm opacity-90">{occupation?.occupation_title}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit Certification for Verification</h2>
          <p className="text-gray-600 mb-6">
            Your certification will be verified by an institution and then approved by HR Bank admin before appearing on your profile.
          </p>

          {/* 3-Step Process Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3">Verification Process (3 Steps):</h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span><strong>You Submit:</strong> Upload your credential document</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span><strong>Institution Verifies:</strong> They check if your credential is valid</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span><strong>HR Bank Admin Approves:</strong> Final quality check</span>
              </li>
              <li className="flex items-start gap-2 mt-3 pt-3 border-t border-blue-200">
                <span>✅</span>
                <span><strong>Result:</strong> Credential appears on your profile and recognized by job matching system</span>
              </li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certification Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.credential_type_id}
                onChange={(e) => setFormData({...formData, credential_type_id: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
              >
                <option value="">Select certification...</option>
                {credentialTypes.map((ct) => (
                  <option key={ct.credential_type_id} value={ct.credential_type_id}>
                    {ct.credential_name} ({ct.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issuing Institution <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.issuing_institution_name}
                onChange={(e) => setFormData({...formData, issuing_institution_name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                placeholder="e.g., St. Clair College, Red Cross"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credential ID/Number
              </label>
              <input
                type="text"
                value={formData.credential_id_number}
                onChange={(e) => setFormData({...formData, credential_id_number: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.issue_date}
                  onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="Leave blank if no expiry"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Document <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  required
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {formData.document_file ? (
                    <div>
                      <p className="text-green-600 font-medium mb-1">✓ {formData.document_file.name}</p>
                      <p className="text-xs text-gray-500">{(formData.document_file.size / 1024).toFixed(0)} KB</p>
                      <p className="text-xs text-blue-600 mt-2">Click to change file</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500">PDF, JPG, PNG up to 10MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(`/workforce/occupations/${occupationId}`)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.document_file}
                className="flex-1 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {submitting ? 'Submitting for Verification...' : 'Submit Credential'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddCertification;
