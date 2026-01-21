import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import {
  Link2,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Package,
  Building2,
  Calendar,
  Copy,
  RefreshCw,
  Globe,
  MapPin,
  X,
  Key,
  Shield,
  Clock,
  Users
} from 'lucide-react';

const PartnerManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(null);
  const [showTerritoryModal, setShowTerritoryModal] = useState(false);
  const [activeTab, setActiveTab] = useState('partners');

  useEffect(() => {
    if (activeTab === 'partners') {
      loadPartners();
    } else if (activeTab === 'territories') {
      loadTerritories();
    } else {
      loadWorkOrders();
    }
  }, [activeTab]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/partner/list', {
        headers: { 'X-Admin-Key': 'hrbank_admin_secret' }
      });
      if (res.data.success) {
        setPartners(res.data.data.partners);
      }
    } catch (error) {
      console.error('Failed to load partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTerritories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/partner/fsa-territories', {
        headers: { 'X-Admin-Key': 'hrbank_admin_secret' }
      });
      if (res.data.success) {
        setTerritories(res.data.data.territories || []);
      }
    } catch (error) {
      console.error('Failed to load territories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      // For admin view, we'd need an admin endpoint - for now show empty
      setWorkOrders([]);
    } catch (error) {
      console.error('Failed to load work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <SuperAdminSidebar />
      
      <main className="transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 260px)' }}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
              <p className="text-gray-600 text-sm mt-1">
                Manage CleanGrid integration - FSA routing is managed in CleanGrid
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRegisterModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                data-testid="register-partner-btn"
              >
                <Plus className="w-4 h-4" />
                Register Partner
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 shadow-sm w-fit">
            <button
              onClick={() => setActiveTab('partners')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'partners' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Partners ({partners.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'orders' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Work Orders
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : activeTab === 'partners' ? (
              partners.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Link2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Partners Registered</h3>
                  <p className="text-gray-500">Register CleanGrid or other partners to receive work orders.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Partner</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Contact</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Orders</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Registered</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {partners.map(partner => (
                        <tr key={partner.partner_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                                {partner.partner_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{partner.partner_name}</p>
                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{partner.partner_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{partner.contact_email}</p>
                            <a href={partner.webhook_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              Webhook URL
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              partner.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {partner.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                              {partner.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm">
                                {partner.work_orders_received || 0}
                              </span>
                              <span className="text-xs text-gray-500 mt-1">
                                {partner.work_orders_completed || 0} done
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600">{formatDate(partner.created_date)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setShowCredentialsModal(partner)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                title="View Credentials"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="text-center py-12 px-4">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Work Orders View</h3>
                <p className="text-gray-500">Work orders are managed by franchisees in their employer dashboard.</p>
                <p className="text-sm text-gray-400 mt-2">Go to Employer Dashboard → Work Orders to view and manage.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Register Partner Modal */}
      {showRegisterModal && (
        <RegisterPartnerModal
          onClose={() => setShowRegisterModal(false)}
          onSuccess={(newPartner) => {
            setShowRegisterModal(false);
            setShowCredentialsModal(newPartner);
            loadPartners();
          }}
        />
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && (
        <CredentialsModal
          partner={showCredentialsModal}
          onClose={() => setShowCredentialsModal(null)}
        />
      )}

      {/* Territory Assignment Modal */}
      {showTerritoryModal && (
        <TerritoryModal
          onClose={() => setShowTerritoryModal(false)}
          onSuccess={() => {
            setShowTerritoryModal(false);
            loadTerritories();
          }}
        />
      )}
    </div>
  );
};

const RegisterPartnerModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    partner_name: '',
    contact_email: '',
    webhook_url: '',
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.partner_name || !formData.contact_email || !formData.webhook_url) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/api/partner/register', formData, {
        headers: { 'X-Admin-Key': 'hrbank_admin_secret' }
      });
      if (res.data) {
        onSuccess(res.data);
      }
    } catch (error) {
      console.error('Failed to register partner:', error);
      alert(error.response?.data?.detail || 'Failed to register partner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Register New Partner</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partner Name *</label>
            <input
              type="text"
              value={formData.partner_name}
              onChange={(e) => setFormData(prev => ({ ...prev, partner_name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., CleanGrid"
              data-testid="partner-name-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="api@partner.com"
              data-testid="partner-email-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL *</label>
            <input
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="https://partner.com/webhook/hrbank"
              data-testid="partner-webhook-input"
            />
            <p className="text-xs text-gray-500 mt-1">URL to receive status updates</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
              placeholder="Brief description of the partner..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
              data-testid="submit-partner-btn"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Register Partner
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TerritoryModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [employers, setEmployers] = useState([]);
  const [formData, setFormData] = useState({
    fsa: '',
    employer_id: ''
  });

  useEffect(() => {
    loadEmployers();
  }, []);

  const loadEmployers = async () => {
    try {
      const res = await api.get('/api/admin/employers');
      if (res.data.success) {
        setEmployers(res.data.data.employers || []);
      }
    } catch (error) {
      console.error('Failed to load employers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fsa || !formData.employer_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/partner/fsa-territory/assign', formData, {
        headers: { 'X-Admin-Key': 'hrbank_admin_secret' }
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to assign territory:', error);
      alert(error.response?.data?.detail || 'Failed to assign territory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Assign FSA Territory</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">FSA Code *</label>
            <input
              type="text"
              value={formData.fsa}
              onChange={(e) => setFormData(prev => ({ ...prev, fsa: e.target.value.toUpperCase() }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-lg"
              placeholder="N9A"
              maxLength={3}
              data-testid="fsa-input"
            />
            <p className="text-xs text-gray-500 mt-1">First 3 characters of postal code (e.g., N9A, N8H)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Franchisee Employer *</label>
            <select
              value={formData.employer_id}
              onChange={(e) => setFormData(prev => ({ ...prev, employer_id: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              data-testid="employer-select"
            >
              <option value="">Select franchisee...</option>
              {employers.map(emp => (
                <option key={emp.user_id} value={emp.user_id}>
                  {emp.company_name || emp.email}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
              data-testid="submit-territory-btn"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign Territory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CredentialsModal = ({ partner, onClose }) => {
  const [copied, setCopied] = useState('');

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Partner Credentials</h2>
              <p className="text-sm text-gray-500">{partner.partner_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <strong>Important:</strong> Store these credentials securely. Share with the partner for webhook integration.
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Partner ID</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono truncate">
                {partner.partner_id}
              </code>
              <button
                onClick={() => copyToClipboard(partner.partner_id, 'id')}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                {copied === 'id' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {partner.api_key && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">API Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono truncate">
                  {partner.api_key}
                </code>
                <button
                  onClick={() => copyToClipboard(partner.api_key, 'key')}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                >
                  {copied === 'key' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {partner.webhook_secret && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Webhook Secret</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono truncate">
                  {partner.webhook_secret}
                </code>
                <button
                  onClick={() => copyToClipboard(partner.webhook_secret, 'secret')}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                >
                  {copied === 'secret' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold text-gray-900 mb-2">API Endpoints</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-mono text-xs">POST</span>
                <code className="text-gray-600">/api/partner/work-orders</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono text-xs">GET</span>
                <code className="text-gray-600">/api/partner/work-orders</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono text-xs">GET</span>
                <code className="text-gray-600">/api/partner/work-orders/:id</code>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerManagement;
