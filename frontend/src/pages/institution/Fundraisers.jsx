import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';
import { 
  FiPlus, 
  FiDollarSign, 
  FiUsers, 
  FiEdit, 
  FiTrash2, 
  FiEye,
  FiImage,
  FiVideo,
  FiTarget,
  FiCalendar,
  FiX,
  FiCheck,
  FiTrendingUp
} from 'react-icons/fi';

const InstitutionFundraisers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fundraisers, setFundraisers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFundraiser, setSelectedFundraiser] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal_amount: '',
    min_donation: '5',
    media_url: '',
    media_type: 'image',
    end_date: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFundraisers();
  }, []);

  const loadFundraisers = async () => {
    try {
      const response = await api.get('/api/fundraisers/institution/list');
      if (response.data.success) {
        setFundraisers(response.data.data.fundraisers);
      }
    } catch (error) {
      console.error('Failed to load fundraisers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFundraiser = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        goal_amount: parseFloat(formData.goal_amount),
        min_donation: parseFloat(formData.min_donation),
        end_date: formData.end_date || null
      };

      const response = await api.post('/api/fundraisers/create', payload);
      if (response.data.success) {
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          goal_amount: '',
          min_donation: '5',
          media_url: '',
          media_type: 'image',
          end_date: ''
        });
        loadFundraisers();
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create fundraiser');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (fundraiser) => {
    try {
      await api.put(`/api/fundraisers/institution/${fundraiser.fundraiser_id}`, {
        is_active: !fundraiser.is_active
      });
      loadFundraisers();
    } catch (error) {
      console.error('Failed to update fundraiser:', error);
    }
  };

  const handleDelete = async (fundraiserId) => {
    if (!window.confirm('Are you sure you want to delete this fundraiser?')) return;
    
    try {
      await api.delete(`/api/fundraisers/institution/${fundraiserId}`);
      loadFundraisers();
    } catch (error) {
      console.error('Failed to delete fundraiser:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const getProgress = (raised, goal) => {
    return Math.min(100, (raised / goal) * 100);
  };

  if (loading) {
    return (
      <InstitutionLayout title="Fundraisers">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </InstitutionLayout>
    );
  }

  return (
    <InstitutionLayout title="Fundraisers" subtitle="Create and manage fundraising campaigns for your graduates">
      <div data-testid="fundraisers-page">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fundraisers</h1>
            <p className="text-gray-600 mt-1">Create and manage fundraising campaigns for your graduates</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            data-testid="create-fundraiser-btn"
          >
            <FiPlus size={18} />
            Create Fundraiser
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FiTarget className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">
                  {fundraisers.filter(f => f.is_active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FiDollarSign className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Raised</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(fundraisers.reduce((sum, f) => sum + f.raised_amount, 0))}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FiUsers className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Donors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {fundraisers.reduce((sum, f) => sum + f.donor_count, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fundraisers List */}
        {fundraisers.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiTarget className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No fundraisers yet</h3>
            <p className="text-gray-500 mb-6">Create your first fundraising campaign to engage with your graduates</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <FiPlus size={18} />
              Create Fundraiser
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {fundraisers.map((fundraiser) => (
              <div 
                key={fundraiser.fundraiser_id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden ${!fundraiser.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex">
                  {/* Media Preview */}
                  {fundraiser.media_url && (
                    <div className="w-48 h-40 flex-shrink-0 bg-gray-100">
                      {fundraiser.media_type === 'video' ? (
                        <video 
                          src={fundraiser.media_url} 
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img 
                          src={fundraiser.media_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{fundraiser.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            fundraiser.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {fundraiser.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{fundraiser.description}</p>
                        
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-900">
                              {formatCurrency(fundraiser.raised_amount)} raised
                            </span>
                            <span className="text-gray-500">
                              Goal: {formatCurrency(fundraiser.goal_amount)}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                              style={{ width: `${getProgress(fundraiser.raised_amount, fundraiser.goal_amount)}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <FiUsers size={14} />
                            {fundraiser.donor_count} donors
                          </span>
                          <span className="flex items-center gap-1">
                            <FiDollarSign size={14} />
                            Min: {formatCurrency(fundraiser.min_donation)}
                          </span>
                          {fundraiser.end_date && (
                            <span className="flex items-center gap-1">
                              <FiCalendar size={14} />
                              Ends: {new Date(fundraiser.end_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setSelectedFundraiser(fundraiser)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <FiEye size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(fundraiser)}
                          className={`p-2 rounded-lg transition-colors ${
                            fundraiser.is_active 
                              ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50' 
                              : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={fundraiser.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {fundraiser.is_active ? <FiX size={18} /> : <FiCheck size={18} />}
                        </button>
                        <button
                          onClick={() => handleDelete(fundraiser.fundraiser_id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create Fundraiser</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateFundraiser} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., New Library Building Fund"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={5}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your fundraising campaign..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                  minLength={20}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Goal Amount (CAD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={formData.goal_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, goal_amount: e.target.value }))}
                      placeholder="10000"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      min="100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Donation (CAD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={formData.min_donation}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_donation: e.target.value }))}
                      placeholder="5"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Media (Optional)</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, media_type: 'image' }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.media_type === 'image' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <FiImage size={16} />
                    Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, media_type: 'video' }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.media_type === 'video' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <FiVideo size={16} />
                    Video
                  </button>
                </div>
                <input
                  type="url"
                  value={formData.media_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, media_url: e.target.value }))}
                  placeholder={`Enter ${formData.media_type} URL...`}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Fundraiser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedFundraiser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{selectedFundraiser.title}</h2>
                <button
                  onClick={() => setSelectedFundraiser(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {selectedFundraiser.media_url && (
                <div className="mb-6 rounded-xl overflow-hidden">
                  {selectedFundraiser.media_type === 'video' ? (
                    <video src={selectedFundraiser.media_url} controls className="w-full" />
                  ) : (
                    <img src={selectedFundraiser.media_url} alt="" className="w-full" />
                  )}
                </div>
              )}
              
              <p className="text-gray-600 mb-6">{selectedFundraiser.description}</p>
              
              {/* Progress */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedFundraiser.raised_amount)}
                  </span>
                  <span className="text-gray-500">
                    of {formatCurrency(selectedFundraiser.goal_amount)} goal
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                    style={{ width: `${getProgress(selectedFundraiser.raised_amount, selectedFundraiser.goal_amount)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{selectedFundraiser.donor_count} donors</span>
                  <span>{Math.round(getProgress(selectedFundraiser.raised_amount, selectedFundraiser.goal_amount))}% funded</span>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedFundraiser(null)}
                className="w-full py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </InstitutionLayout>
  );
};

export default InstitutionFundraisers;
