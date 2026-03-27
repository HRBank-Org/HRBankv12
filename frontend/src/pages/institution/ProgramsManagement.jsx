import React, { useState, useEffect } from 'react';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  GraduationCap,
  FolderOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  BookOpen,
  Clock,
  Monitor,
  FileText,
  MoreVertical,
  ExternalLink,
  Users
} from 'lucide-react';

const ProgramsManagement = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [faculties, setFaculties] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [programsByFaculty, setProgramsByFaculty] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [expandedFaculties, setExpandedFaculties] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editingProgram, setEditingProgram] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  
  // Forms
  const [facultyForm, setFacultyForm] = useState({ faculty_name: '', description: '', icon: '📚', color: '#3B82F6' });
  const [programForm, setProgramForm] = useState({
    faculty_id: '',
    program_name: '',
    program_code: '',
    sub_faculty: '',
    description: '',
    credential_type: 'Diploma',
    duration_weeks: '',
    duration_display: '',
    delivery_mode: 'In-Class',
    outline_url: '',
    status: 'active'
  });
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [facultiesRes, programsRes, metaRes] = await Promise.all([
        api.get('/api/institution/programs/faculties'),
        api.get('/api/institution/programs'),
        api.get('/api/institution/programs/metadata')
      ]);
      
      if (facultiesRes.data.success) {
        setFaculties(facultiesRes.data.data.faculties || []);
        // Expand all faculties by default
        const expanded = {};
        facultiesRes.data.data.faculties.forEach(f => {
          expanded[f.faculty_id] = true;
        });
        setExpandedFaculties(expanded);
      }
      
      if (programsRes.data.success) {
        setPrograms(programsRes.data.data.programs || []);
        setProgramsByFaculty(programsRes.data.data.by_faculty || []);
      }
      
      if (metaRes.data.success) {
        setMetadata(metaRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/api/institution/programs/faculties', facultyForm);
      if (res.data.success) {
        alert('Faculty created successfully!');
        setShowFacultyModal(false);
        setFacultyForm({ faculty_name: '', description: '', icon: '📚', color: '#3B82F6' });
        loadData();
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create faculty');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFaculty = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.put(`/api/institution/programs/faculties/${editingFaculty.faculty_id}`, facultyForm);
      if (res.data.success) {
        alert('Faculty updated successfully!');
        setShowFacultyModal(false);
        setEditingFaculty(null);
        setFacultyForm({ faculty_name: '', description: '', icon: '📚', color: '#3B82F6' });
        loadData();
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to update faculty');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFaculty = async (facultyId) => {
    if (!window.confirm('Are you sure you want to delete this faculty?')) return;
    try {
      const res = await api.delete(`/api/institution/programs/faculties/${facultyId}`);
      if (res.data.success) {
        alert('Faculty deleted');
        loadData();
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete faculty');
    }
  };

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...programForm,
        duration_weeks: programForm.duration_weeks ? parseInt(programForm.duration_weeks) : null
      };
      const res = await api.post('/api/institution/programs', payload);
      if (res.data.success) {
        alert('Program created successfully!');
        setShowProgramModal(false);
        resetProgramForm();
        loadData();
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create program');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProgram = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...programForm,
        duration_weeks: programForm.duration_weeks ? parseInt(programForm.duration_weeks) : null
      };
      const res = await api.put(`/api/institution/programs/${editingProgram.program_id}`, payload);
      if (res.data.success) {
        alert('Program updated successfully!');
        setShowProgramModal(false);
        setEditingProgram(null);
        resetProgramForm();
        loadData();
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to update program');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProgram = async (programId) => {
    if (!window.confirm('Are you sure you want to delete this program?')) return;
    try {
      const res = await api.delete(`/api/institution/programs/${programId}`);
      if (res.data.success) {
        alert('Program deleted');
        loadData();
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete program');
    }
  };

  const resetProgramForm = () => {
    setProgramForm({
      faculty_id: selectedFacultyId || '',
      program_name: '',
      program_code: '',
      sub_faculty: '',
      description: '',
      credential_type: 'Diploma',
      duration_weeks: '',
      duration_display: '',
      delivery_mode: 'In-Class',
      outline_url: '',
      status: 'active'
    });
  };

  const openEditFaculty = (faculty) => {
    setEditingFaculty(faculty);
    setFacultyForm({
      faculty_name: faculty.faculty_name,
      description: faculty.description || '',
      icon: faculty.icon || '📚',
      color: faculty.color || '#3B82F6'
    });
    setShowFacultyModal(true);
  };

  const openEditProgram = (program) => {
    setEditingProgram(program);
    setProgramForm({
      faculty_id: program.faculty_id,
      program_name: program.program_name,
      program_code: program.program_code || '',
      sub_faculty: program.sub_faculty || '',
      description: program.description || '',
      credential_type: program.credential_type,
      duration_weeks: program.duration_weeks || '',
      duration_display: program.duration_display || '',
      delivery_mode: program.delivery_mode || 'In-Class',
      outline_url: program.outline_url || '',
      status: program.status || 'active'
    });
    setShowProgramModal(true);
  };

  const openAddProgram = (facultyId = null) => {
    setEditingProgram(null);
    setSelectedFacultyId(facultyId);
    setProgramForm({
      ...programForm,
      faculty_id: facultyId || ''
    });
    setShowProgramModal(true);
  };

  const toggleFacultyExpand = (facultyId) => {
    setExpandedFaculties(prev => ({
      ...prev,
      [facultyId]: !prev[facultyId]
    }));
  };

  const getDeliveryIcon = (mode) => {
    switch (mode) {
      case 'Online': return <Monitor className="w-3.5 h-3.5" />;
      case 'Hybrid': return <Monitor className="w-3.5 h-3.5" />;
      case 'In-Class': return <Users className="w-3.5 h-3.5" />;
      default: return <BookOpen className="w-3.5 h-3.5" />;
    }
  };

  // Filter programs by search
  const filteredByFaculty = searchQuery
    ? programsByFaculty.map(f => ({
        ...f,
        programs: f.programs.filter(p =>
          p.program_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.program_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.sub_faculty || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(f => f.programs.length > 0)
    : programsByFaculty;

  const facultyIcons = ['📚', '💼', '🏥', '💻', '🎨', '⚖️', '🔬', '🏗️', '✈️', '🍳', '🎓', '📊'];
  const facultyColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  return (
    <InstitutionLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('nav.institution.programs')}</h1>
                <p className="text-gray-600">Manage your academic programs and faculties</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingFaculty(null);
                  setFacultyForm({ faculty_name: '', description: '', icon: '📚', color: '#3B82F6' });
                  setShowFacultyModal(true);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Add Faculty
              </button>
              <button
                onClick={() => openAddProgram()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                disabled={faculties.length === 0}
              >
                <Plus className="w-4 h-4" />
                Add Program
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{faculties.length}</p>
                <p className="text-sm text-gray-500">Faculties</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{programs.length}</p>
                <p className="text-sm text-gray-500">Programs</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {programs.filter(p => p.status === 'active').length}
                </p>
                <p className="text-sm text-gray-500">Active Programs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Programs by Faculty */}
        {loading ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-3">Loading programs...</p>
          </div>
        ) : faculties.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Faculties Yet</h3>
            <p className="text-gray-500 mb-4">Create your first faculty to organize programs</p>
            <button
              onClick={() => setShowFacultyModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Faculty
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredByFaculty.map((facultyGroup) => (
              <div key={facultyGroup.faculty_id} className="bg-white rounded-xl border overflow-hidden">
                {/* Faculty Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderLeft: `4px solid ${facultyGroup.faculty_color || '#3B82F6'}` }}
                  onClick={() => toggleFacultyExpand(facultyGroup.faculty_id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedFaculties[facultyGroup.faculty_id] ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-2xl">{facultyGroup.faculty_icon || '📚'}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{facultyGroup.faculty_name}</h3>
                      <p className="text-sm text-gray-500">{facultyGroup.programs.length} programs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddProgram(facultyGroup.faculty_id);
                      }}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Add program to this faculty"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const faculty = faculties.find(f => f.faculty_id === facultyGroup.faculty_id);
                        if (faculty) openEditFaculty(faculty);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit faculty"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Programs List */}
                {expandedFaculties[facultyGroup.faculty_id] && (
                  <div className="border-t divide-y">
                    {facultyGroup.programs.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <BookOpen className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p>No programs in this faculty yet</p>
                        <button
                          onClick={() => openAddProgram(facultyGroup.faculty_id)}
                          className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                          + Add first program
                        </button>
                      </div>
                    ) : (
                      facultyGroup.programs.map((program) => (
                        <div
                          key={program.program_id}
                          className="p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{program.program_name}</h4>
                                {program.program_code && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                    {program.program_code}
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  program.status === 'active' 
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {program.status}
                                </span>
                              </div>
                              {program.sub_faculty && (
                                <p className="text-sm text-gray-500 mt-0.5">{program.sub_faculty}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5" />
                                  {program.credential_type}
                                </span>
                                {program.duration_display && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {program.duration_display}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  {getDeliveryIcon(program.delivery_mode)}
                                  {program.delivery_mode}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {program.outline_url && (
                                <a
                                  href={program.outline_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                  title="View outline"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => openEditProgram(program)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Edit program"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProgram(program.program_id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete program"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Faculty Modal */}
        {showFacultyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingFaculty ? 'Edit Faculty' : 'Create Faculty'}
              </h2>
              <form onSubmit={editingFaculty ? handleUpdateFaculty : handleCreateFaculty}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Faculty Name</label>
                    <input
                      type="text"
                      value={facultyForm.faculty_name}
                      onChange={(e) => setFacultyForm({ ...facultyForm, faculty_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Healthcare, Business, Technology"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("pages.common.description")}</label>
                    <textarea
                      value={facultyForm.description}
                      onChange={(e) => setFacultyForm({ ...facultyForm, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                      placeholder="Brief description of this faculty"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                      <div className="flex flex-wrap gap-2">
                        {facultyIcons.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setFacultyForm({ ...facultyForm, icon })}
                            className={`p-2 text-xl rounded-lg border-2 transition-all ${
                              facultyForm.icon === icon ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {facultyColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFacultyForm({ ...facultyForm, color })}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              facultyForm.color === color ? 'border-gray-800 scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFacultyModal(false);
                      setEditingFaculty(null);
                    }}
                    className="flex-1 px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (editingFaculty ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Program Modal */}
        {showProgramModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingProgram ? 'Edit Program' : 'Add New Program'}
              </h2>
              <form onSubmit={editingProgram ? handleUpdateProgram : handleCreateProgram}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Faculty *</label>
                    <select
                      value={programForm.faculty_id}
                      onChange={(e) => setProgramForm({ ...programForm, faculty_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select faculty</option>
                      {faculties.map((f) => (
                        <option key={f.faculty_id} value={f.faculty_id}>
                          {f.icon} {f.faculty_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
                    <input
                      type="text"
                      value={programForm.program_name}
                      onChange={(e) => setProgramForm({ ...programForm, program_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Acupuncture Practitioner"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program Code</label>
                    <input
                      type="text"
                      value={programForm.program_code}
                      onChange={(e) => setProgramForm({ ...programForm, program_code: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., HLT-101"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Faculty</label>
                    <input
                      type="text"
                      value={programForm.sub_faculty}
                      onChange={(e) => setProgramForm({ ...programForm, sub_faculty: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Traditional Chinese Medicine"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credential Type *</label>
                    <select
                      value={programForm.credential_type}
                      onChange={(e) => setProgramForm({ ...programForm, credential_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      {(metadata.credential_types || []).map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Mode</label>
                    <select
                      value={programForm.delivery_mode}
                      onChange={(e) => setProgramForm({ ...programForm, delivery_mode: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {(metadata.delivery_modes || []).map((mode) => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (weeks)</label>
                    <input
                      type="number"
                      value={programForm.duration_weeks}
                      onChange={(e) => setProgramForm({ ...programForm, duration_weeks: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., 73"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration Display</label>
                    <input
                      type="text"
                      value={programForm.duration_display}
                      onChange={(e) => setProgramForm({ ...programForm, duration_display: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., 73 Weeks, 2 Years"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("pages.common.status")}</label>
                    <select
                      value={programForm.status}
                      onChange={(e) => setProgramForm({ ...programForm, status: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {(metadata.program_statuses || ['active', 'inactive', 'draft']).map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Outline URL</label>
                    <input
                      type="url"
                      value={programForm.outline_url}
                      onChange={(e) => setProgramForm({ ...programForm, outline_url: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("pages.common.description")}</label>
                    <textarea
                      value={programForm.description}
                      onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                      placeholder="Program description..."
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProgramModal(false);
                      setEditingProgram(null);
                      resetProgramForm();
                    }}
                    className="flex-1 px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (editingProgram ? 'Update Program' : 'Create Program')}
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

export default ProgramsManagement;
