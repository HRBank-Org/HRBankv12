import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import {
  FileCheck,
  Upload,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Loader2,
  Info,
  Shield
} from 'lucide-react';

const InsuranceUpload = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requirements, setRequirements] = useState(null);
  const [currentSubmission, setCurrentSubmission] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);
  
  const [form, setForm] = useState({
    document_name: '',
    certificate_number: '',
    expiry_date: '',
    notes: '',
    file: null
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadRequirements();
  }, []);

  const loadRequirements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/employer/insurance/requirements');
      if (res.data.success) {
        const data = res.data.data;
        setRequirements(data.requirement);
        setCurrentSubmission(data.current_submission);
        setIsVerified(data.is_verified);
        setExpiryDate(data.expiry_date);
        
        // Pre-fill document name from requirement
        if (data.requirement) {
          setForm(prev => ({
            ...prev,
            document_name: data.requirement.name || ''
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load requirements:', error);
      setError('Failed to load insurance requirements');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PDF, JPEG, or PNG file');
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB');
        return;
      }
      setForm(prev => ({ ...prev, file }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.file) {
      setError('Please select a file to upload');
      return;
    }

    if (!form.document_name) {
      setError('Please enter the document name');
      return;
    }

    if (requirements?.expiry_required && !form.expiry_date) {
      setError('Please enter the expiry date');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('document_name', form.document_name);
      formData.append('certificate_number', form.certificate_number || '');
      formData.append('expiry_date', form.expiry_date || '');
      formData.append('notes', form.notes || '');
      formData.append('file', form.file);

      await api.post('/api/employer/insurance/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Reload to show updated status
      loadRequirements();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to submit document');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // No insurance requirement for this country
  if (!requirements) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-green-100">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Workers' Insurance</h2>
            <p className="text-gray-600">No insurance verification required for your region</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Workers' Insurance Verification</h2>
              <p className="text-gray-600">{requirements.description}</p>
            </div>
          </div>
          
          {isVerified ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Verified</span>
            </div>
          ) : currentSubmission?.status === 'pending' ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Under Review</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">Action Required</span>
            </div>
          )}
        </div>
      </div>

      {/* Requirement Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">{requirements.full_name}</h3>
            <p className="text-blue-700 text-sm mt-1">
              As an employer, you are required to provide proof of workers' insurance coverage.
              This helps protect both you and your workforce.
            </p>
          </div>
        </div>
      </div>

      {/* Current Submission Status */}
      {currentSubmission && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Submission</h3>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg border">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{currentSubmission.document_name}</p>
                {currentSubmission.certificate_number && (
                  <p className="text-sm text-gray-500">Certificate #: {currentSubmission.certificate_number}</p>
                )}
                <p className="text-sm text-gray-500">
                  Submitted: {new Date(currentSubmission.submitted_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBadge(currentSubmission.status)}`}>
                {getStatusIcon(currentSubmission.status)}
                {currentSubmission.status.charAt(0).toUpperCase() + currentSubmission.status.slice(1)}
              </span>
              {currentSubmission.status === 'rejected' && currentSubmission.rejection_reason && (
                <p className="text-sm text-red-600 mt-2">{currentSubmission.rejection_reason}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Form - Show if not verified or rejected */}
      {(!isVerified && (!currentSubmission || currentSubmission.status === 'rejected')) && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {currentSubmission?.status === 'rejected' ? 'Resubmit Document' : 'Upload Insurance Document'}
          </h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.document_name}
                  onChange={(e) => setForm({ ...form, document_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={requirements.name}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate/Policy Number
                </label>
                <input
                  type="text"
                  value={form.certificate_number}
                  onChange={(e) => setForm({ ...form, certificate_number: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter certificate number"
                />
              </div>
            </div>

            {requirements.expiry_required && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <div className="relative max-w-xs">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                    required={requirements.expiry_required}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Document <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="insurance-file"
                />
                <label htmlFor="insurance-file" className="cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                  {form.file ? (
                    <p className="text-green-600 font-medium">{form.file.name}</p>
                  ) : (
                    <>
                      <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
                      <p className="text-sm text-gray-500 mt-1">PDF, JPG, or PNG (max 10MB)</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="Any additional information..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Submit for Verification
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Verified Status */}
      {isVerified && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">Insurance Verified</h3>
              <p className="text-green-700">
                Your workers' insurance has been verified and is active.
                {expiryDate && (
                  <span> Valid until: {new Date(expiryDate).toLocaleDateString()}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceUpload;
