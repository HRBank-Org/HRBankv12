import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';

import { useLanguage } from '../../contexts/LanguageContext';

const ClassDetails = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadClassDetails();
  }, [classId]);

  const loadClassDetails = async () => {
    try {
      const response = await api.get(`/api/institution/classes/${classId}`);
      setClassData(response.data.data);
    } catch (error) {
      console.error('Failed to load class details:', error);
      setMessage({ type: 'error', text: 'Failed to load class details' });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteStudents = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const emails = inviteEmails.split(',').map(e => e.trim()).filter(e => e);
      
      await api.post('/api/institution/students/invite', {
        class_id: classId,
        emails: emails
      });

      setMessage({ type: 'success', text: `Sent ${emails.length} invitation(s) successfully!` });
      setShowInviteModal(false);
      setInviteEmails('');
      await loadClassDetails();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to send invitations' });
    }
  };

  const handleIssueCredentials = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        class_id: classId,
        student_ids: selectedStudents.length === classData.students.length ? 'all' : selectedStudents
      };

      const response = await api.post('/api/institution/credentials/issue', payload);
      
      setMessage({ 
        type: 'success', 
        text: `Issued ${response.data.data.credentials_issued} credential(s) successfully!` 
      });
      setShowIssueModal(false);
      setSelectedStudents([]);
      await loadClassDetails();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to issue credentials' });
    }
  };

  const toggleStudentSelection = (userId) => {
    setSelectedStudents(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === classData.students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(classData.students.map(s => s.user_id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="text-center">
          <p className="text-gray-600 mb-4">Class not found</p>
          <button
            onClick={() => navigate('/institution/classes')}
            className="text-blue-600 hover:underline"
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      archived: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || colors.draft;
  };

  return (
    <InstitutionLayout title={classData?.class_name || t("pages.institution.classes.details", "Cohort Details")} subtitle={classData?.program_name}>
      <div className="max-w-7xl mx-auto">
        {message.text && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Class Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{classData.title}</h1>
              <span className={`inline-block px-3 py-1 text-sm rounded-full ${getStatusColor(classData.status)}`}>
                {classData.status}
              </span>
            </div>
            <button
              onClick={() => navigate(`/institution/classes/${classId}/edit`)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
            >
              Edit Class
            </button>
          </div>

          {classData.description && (
            <p className="text-gray-600 mb-4">{classData.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Credential Type</p>
              <p className="font-medium text-gray-900">{classData.credential_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Start Date</p>
              <p className="font-medium text-gray-900">{new Date(classData.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">End Date</p>
              <p className="font-medium text-gray-900">{new Date(classData.end_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Validity Period</p>
              <p className="font-medium text-gray-900">
                {classData.validity_period_months ? `${classData.validity_period_months} months` : 'Lifetime'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                <p className="text-sm text-gray-600">Students Enrolled</p>
                <p className="text-2xl font-bold text-gray-900">{classData.total_enrolled}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">
                🎓
              </div>
              <div>
                <p className="text-sm text-gray-600">Credentials Issued</p>
                <p className="text-2xl font-bold text-gray-900">{classData.credentials_issued}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl">
                ⏳
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Credentials</p>
                <p className="text-2xl font-bold text-gray-900">
                  {classData.total_enrolled - classData.credentials_issued}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
            style={{ backgroundColor: theme.primaryColor }}
          >
            📧 Invite Students
          </button>
          <button
            onClick={() => setShowIssueModal(true)}
            disabled={classData.total_enrolled === 0 || classData.total_enrolled === classData.credentials_issued}
            className="px-6 py-3 bg-green-600 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎓 Issue Credentials
          </button>
        </div>

        {/* Students List */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Enrolled Students</h2>
          
          {classData.students && classData.students.length > 0 ? (
            <div className="space-y-3">
              {classData.students.map((student) => (
                <div 
                  key={student.user_id}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {student.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.full_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{student.email || 'No email'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No students enrolled yet</p>
              <button 
                onClick={() => setShowInviteModal(true)}
                className="text-sm font-medium hover:underline"
                style={{ color: theme.primaryColor }}
              >
                Invite your first students
              </button>
            </div>
          )}
        </div>

      {/* Invite Students Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Invite Students</h2>
                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleInviteStudents} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Email Addresses *
                </label>
                <textarea
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  required
                  rows={6}
                  placeholder="Enter email addresses, separated by commas&#10;Example: student1@email.com, student2@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Students will receive an invitation to join HR Bank and enroll in this class
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Send Invitations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Credentials Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Issue Credentials</h2>
                <button 
                  onClick={() => setShowIssueModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleIssueCredentials} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Credential:</strong> {classData.credential_type} - {classData.title}
                </p>
                <p className="text-sm text-blue-900">
                  <strong>Validity:</strong> {classData.validity_period_months ? `${classData.validity_period_months} months` : 'Lifetime'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Select Students to Issue Credentials *
                  </label>
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    className="text-sm font-medium hover:underline"
                    style={{ color: theme.primaryColor }}
                  >
                    {selectedStudents.length === classData.students.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                  {classData.students.map((student) => (
                    <label 
                      key={student.user_id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.user_id)}
                        onChange={() => toggleStudentSelection(student.user_id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{student.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-600">{student.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900">
                  ⚠️ Credentials will be issued with blockchain verification. This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedStudents.length === 0}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Issue to {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </InstitutionLayout>
  );
};

export default ClassDetails;
