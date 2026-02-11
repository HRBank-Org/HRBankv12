import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';
import { 
  FiUpload, FiFile, FiCheck, FiAlertCircle, FiEye, 
  FiTrash2, FiAward, FiLoader, FiSearch, FiFilter 
} from 'react-icons/fi';

const TranscriptsManagement = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [issuingCredential, setIssuingCredential] = useState(false);

  const loadTranscripts = useCallback(async () => {
    try {
      let url = '/api/transcripts';
      const params = new URLSearchParams();
      if (statusFilter) params.append('status_filter', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await api.get(url);
      setTranscripts(response.data.data.transcripts || []);
    } catch (error) {
      console.error('Failed to load transcripts:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTranscripts();
  }, [loadTranscripts]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/transcripts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        alert('Transcript uploaded and processed successfully!');
        loadTranscripts();
        
        // Show extracted data
        if (response.data.extracted_data) {
          setSelectedTranscript({
            transcript_id: response.data.transcript_id,
            extracted_data: response.data.extracted_data,
            validation: response.data.validation,
            status: response.data.status
          });
          setShowDetailModal(true);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.detail || 'Failed to upload transcript');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleViewTranscript = async (transcript) => {
    try {
      const response = await api.get(`/api/transcripts/${transcript.transcript_id}`);
      setSelectedTranscript(response.data.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load transcript details:', error);
    }
  };

  const handleIssueCredential = async (transcriptId) => {
    if (!window.confirm('Issue a blockchain credential for this transcript?')) return;

    setIssuingCredential(true);
    try {
      const response = await api.post(`/api/transcripts/${transcriptId}/issue-credential`);
      if (response.data.success) {
        alert('Blockchain credential issued successfully!');
        loadTranscripts();
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error('Failed to issue credential:', error);
      alert(error.response?.data?.detail || 'Failed to issue credential');
    } finally {
      setIssuingCredential(false);
    }
  };

  const handleDeleteTranscript = async (transcriptId) => {
    if (!window.confirm('Are you sure you want to delete this transcript?')) return;

    try {
      await api.delete(`/api/transcripts/${transcriptId}`);
      loadTranscripts();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Failed to delete transcript:', error);
      alert(error.response?.data?.detail || 'Failed to delete transcript');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      extracted: { color: 'bg-green-100 text-green-800', icon: FiCheck, text: 'Extracted' },
      pending_manual_entry: { color: 'bg-yellow-100 text-yellow-800', icon: FiAlertCircle, text: 'Manual Entry Needed' },
      verified: { color: 'bg-blue-100 text-blue-800', icon: FiCheck, text: 'Verified' },
      credentialed: { color: 'bg-purple-100 text-purple-800', icon: FiAward, text: 'Credentialed' }
    };
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        {Icon && <Icon className="w-3 h-3" />}
        {badge.text}
      </span>
    );
  };

  const filteredTranscripts = transcripts.filter(t => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const studentName = t.extracted_data?.student?.name?.toLowerCase() || '';
      const program = t.extracted_data?.program?.name?.toLowerCase() || '';
      const filename = t.original_filename?.toLowerCase() || '';
      if (!studentName.includes(search) && !program.includes(search) && !filename.includes(search)) {
        return false;
      }
    }
    return true;
  });

  return (
    <InstitutionLayout title="Transcript Management" subtitle="Upload, extract, and verify academic transcripts">
      <div data-testid="transcripts-management-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transcript Management</h1>
            <p className="text-gray-600">Upload PDF transcripts to extract and verify academic data</p>
          </div>
          
          <label className="relative cursor-pointer" data-testid="upload-transcript-label">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
              data-testid="transcript-file-input"
            />
            <span 
              className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors bg-indigo-600 hover:bg-indigo-700"
            >
              {uploading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Uploading... {uploadProgress}%
                </>
              ) : (
                <>
                  <FiUpload className="w-5 h-5" />
                  Upload Transcript
                </>
              )}
            </span>
          </label>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by student name, program, or filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="extracted">Extracted</option>
              <option value="pending_manual_entry">Manual Entry Needed</option>
              <option value="verified">Verified</option>
              <option value="credentialed">Credentialed</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Total Transcripts</p>
            <p className="text-2xl font-bold text-gray-900">{transcripts.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Extracted</p>
            <p className="text-2xl font-bold text-green-600">
              {transcripts.filter(t => t.status === 'extracted').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Pending Entry</p>
            <p className="text-2xl font-bold text-yellow-600">
              {transcripts.filter(t => t.status === 'pending_manual_entry').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Credentialed</p>
            <p className="text-2xl font-bold text-purple-600">
              {transcripts.filter(t => t.status === 'credentialed').length}
            </p>
          </div>
        </div>

        {/* Transcripts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FiLoader className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredTranscripts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FiFile className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Transcripts Yet</h3>
            <p className="text-gray-600 mb-4">Upload PDF transcripts to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student / Program
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GPA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTranscripts.map((transcript) => (
                  <tr key={transcript.transcript_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">
                          {transcript.extracted_data?.student?.name || 'Unknown Student'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {transcript.extracted_data?.program?.name || transcript.original_filename}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-semibold text-gray-900">
                        {transcript.extracted_data?.academic_record?.cumulative_gpa?.toFixed(2) || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transcript.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transcript.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewTranscript(transcript)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <FiEye className="w-5 h-5" />
                      </button>
                      {transcript.status !== 'credentialed' && (
                        <>
                          <button
                            onClick={() => handleIssueCredential(transcript.transcript_id)}
                            className="text-purple-600 hover:text-purple-900 mr-4"
                            title="Issue Blockchain Credential"
                          >
                            <FiAward className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTranscript(transcript.transcript_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedTranscript && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Transcript Details</h2>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {/* Student Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Student Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-lg">
                      {selectedTranscript.extracted_data?.student?.name || 'Unknown'}
                    </p>
                    <p className="text-gray-600">
                      ID: {selectedTranscript.extracted_data?.student?.student_id || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Program Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Program</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold">
                      {selectedTranscript.extracted_data?.program?.name || 'Unknown Program'}
                    </p>
                    <p className="text-gray-600">
                      {selectedTranscript.extracted_data?.program?.degree_type || ''} 
                      {selectedTranscript.extracted_data?.program?.major ? ` in ${selectedTranscript.extracted_data.program.major}` : ''}
                    </p>
                  </div>
                </div>

                {/* Academic Record */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Academic Record</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedTranscript.extracted_data?.academic_record?.cumulative_gpa?.toFixed(2) || 'N/A'}
                      </p>
                      <p className="text-xs text-blue-600">GPA</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {selectedTranscript.extracted_data?.academic_record?.total_credits_earned || 0}
                      </p>
                      <p className="text-xs text-green-600">Credits Earned</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedTranscript.extracted_data?.courses?.length || 0}
                      </p>
                      <p className="text-xs text-purple-600">Courses</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm font-semibold text-gray-600">
                        {selectedTranscript.extracted_data?.academic_record?.status || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">Status</p>
                    </div>
                  </div>
                </div>

                {/* Courses Preview */}
                {selectedTranscript.extracted_data?.courses?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Courses ({selectedTranscript.extracted_data.courses.length})
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="pb-2">Code</th>
                            <th className="pb-2">Name</th>
                            <th className="pb-2">Credits</th>
                            <th className="pb-2">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTranscript.extracted_data.courses.slice(0, 10).map((course, idx) => (
                            <tr key={idx} className="border-t border-gray-200">
                              <td className="py-1">{course.course_code}</td>
                              <td className="py-1">{course.course_name}</td>
                              <td className="py-1">{course.credits}</td>
                              <td className="py-1 font-semibold">{course.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {selectedTranscript.extracted_data.courses.length > 10 && (
                        <p className="text-center text-gray-500 text-xs mt-2">
                          + {selectedTranscript.extracted_data.courses.length - 10} more courses
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Validation */}
                {selectedTranscript.validation && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Data Validation</h3>
                    <div className={`rounded-lg p-4 ${selectedTranscript.validation.is_valid ? 'bg-green-50' : 'bg-yellow-50'}`}>
                      <p className={`font-semibold ${selectedTranscript.validation.is_valid ? 'text-green-700' : 'text-yellow-700'}`}>
                        {selectedTranscript.validation.is_valid ? '✓ Data Valid' : '⚠ Validation Warnings'}
                      </p>
                      {selectedTranscript.validation.warnings?.length > 0 && (
                        <ul className="mt-2 text-sm text-yellow-600">
                          {selectedTranscript.validation.warnings.map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  {selectedTranscript.status !== 'credentialed' && (
                    <button
                      onClick={() => handleIssueCredential(selectedTranscript.transcript_id)}
                      disabled={issuingCredential}
                      className="px-4 py-2 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700"
                    >
                      {issuingCredential ? (
                        <FiLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        <FiAward className="w-4 h-4" />
                      )}
                      Issue Blockchain Credential
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TranscriptsManagement;
