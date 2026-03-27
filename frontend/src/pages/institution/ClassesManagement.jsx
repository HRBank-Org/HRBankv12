import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';

import { useLanguage } from '../../contexts/LanguageContext';

const ClassesManagement = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [classStatuses] = useState(['draft', 'active', 'completed', 'archived']);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [formData, setFormData] = useState({
    program_id: '',
    start_date: '',
    end_date: '',
    status: 'draft'
  });

  useEffect(() => {
    loadClasses();
    loadPrograms();
  }, [statusFilter]);

  const loadClasses = async () => {
    try {
      const url = statusFilter 
        ? `/api/institution/classes?status_filter=${statusFilter}`
        : '/api/institution/classes';
      const response = await api.get(url);
      setClasses(response.data.data.classes || []);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrograms = async () => {
    try {
      const response = await api.get('/api/institution/programs');
      setPrograms(response.data.data?.programs || []);
    } catch (error) {
      console.error('Failed to load programs:', error);
    }
  };

  const openModal = () => {
    setFormData({
      program_id: '',
      start_date: '',
      end_date: '',
      status: 'draft'
    });
    setSelectedProgram(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setMessage({ type: '', text: '' });
  };

  const handleProgramSelect = (e) => {
    const programId = e.target.value;
    setFormData({ ...formData, program_id: programId });
    
    const program = programs.find(p => p.program_id === programId);
    setSelectedProgram(program || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!formData.program_id) {
      setMessage({ type: 'error', text: 'Please select a program' });
      return;
    }

    try {
      // Create cohort/class linked to program
      const payload = {
        program_id: formData.program_id,
        title: `${selectedProgram?.program_name} - ${formData.start_date}`,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
        // Inherited from program
        credential_type: selectedProgram?.credential_type,
        validity_period_months: selectedProgram?.validity_period_months
      };

      await api.post('/api/institution/classes', payload);
      setMessage({ type: 'success', text: 'Cohort created successfully!' });
      await loadClasses();
      closeModal();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to create cohort' });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      archived: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || colors.draft;
  };

  if (loading) {
    return (
      <InstitutionLayout title="Cohorts" subtitle="Manage cohorts and enrolled students">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </InstitutionLayout>
    );
  }

  return (
    <InstitutionLayout title="Cohorts" subtitle="Manage cohorts and enrolled students">
      <div data-testid="classes-management-page">
        {message.text && (
          <div className={`rounded-lg p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              data-testid="status-filter"
            >
              <option value="">All Statuses</option>
              {classStatuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={openModal}
            className="px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all bg-indigo-600 hover:bg-indigo-700"
            data-testid="create-class-btn"
          >
            + Create Cohort
          </button>
        </div>

        {/* Classes Grid */}
        {classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div 
                key={cls.class_id}
                onClick={() => navigate(`/institution/classes/${cls.class_id}`)}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                data-testid={`class-card-${cls.class_id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{cls.title}</h3>
                    <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(cls.status)}`}>
                      {cls.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {cls.credential_type && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Credential:</span>
                      <span className="font-medium">{cls.credential_type}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Students:</span>
                    <span className="font-medium">{cls.enrolled_count || 0}</span>
                  </div>
                  {cls.start_date && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Period:</span>
                      <span className="font-medium">
                        {new Date(cls.start_date).toLocaleDateString()} - {cls.end_date ? new Date(cls.end_date).toLocaleDateString() : 'Ongoing'}
                      </span>
                    </div>
                  )}
                </div>

                {cls.program_name && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-indigo-600 font-medium">{cls.program_name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Cohorts Yet</h3>
            <p className="text-gray-600 mb-6">Create your first cohort to start enrolling students</p>
            <button
              onClick={openModal}
              className="px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all bg-indigo-600 hover:bg-indigo-700"
              data-testid="create-first-class-btn"
            >
              + Create Cohort
            </button>
          </div>
        )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create New Cohort</h2>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  data-testid="close-modal-btn"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Program Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Program *
                </label>
                <select
                  value={formData.program_id}
                  onChange={handleProgramSelect}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  data-testid="program-select"
                >
                  <option value="">Choose a program...</option>
                  {programs.map(program => (
                    <option key={program.program_id} value={program.program_id}>
                      {program.program_name} ({program.credential_type})
                    </option>
                  ))}
                </select>
                {programs.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No programs found. <a href="/institution/programs" className="underline">Create a program first</a>.
                  </p>
                )}
              </div>

              {/* Selected Program Info */}
              {selectedProgram && (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                  <h4 className="font-medium text-indigo-900 mb-2">Program Details (Inherited)</h4>
                  <div className="text-sm text-indigo-700 space-y-1">
                    <p><span className="text-indigo-500">Credential Type:</span> {selectedProgram.credential_type}</p>
                    <p><span className="text-indigo-500">Validity:</span> {selectedProgram.validity_period_months ? `${selectedProgram.validity_period_months} months` : 'Lifetime'}</p>
                    {selectedProgram.faculty_name && (
                      <p><span className="text-indigo-500">Faculty:</span> {selectedProgram.faculty_name}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    data-testid="start-date-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                    min={formData.start_date}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    data-testid="end-date-input"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  data-testid="status-select"
                >
                  {classStatuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Info Note */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p>When the cohort's end date is reached, you'll be notified to issue credentials to enrolled students.</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all"
                  data-testid="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.program_id}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700"
                  data-testid="create-cohort-btn"
                >
                  Create Cohort
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

export default ClassesManagement;
