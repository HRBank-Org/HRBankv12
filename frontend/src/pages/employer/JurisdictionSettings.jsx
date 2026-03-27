import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  Globe2,
  MapPin,
  Plus,
  Clock,
  Check,
  X,
  AlertCircle,
  Shield,
  Building2,
  FileText,
  Upload,
  ChevronRight,
  Loader2,
  Info
} from 'lucide-react';

const JurisdictionSettings = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [authorizations, setAuthorizations] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [primaryJurisdiction, setPrimaryJurisdiction] = useState(null);
  const [showExpansionForm, setShowExpansionForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expansionForm, setExpansionForm] = useState({
    targetJurisdiction: '',
    businessRegistrationNumber: '',
    taxRegistrationNumber: '',
    notes: ''
  });

  useEffect(() => {
    loadAuthorizations();
  }, []);

  const loadAuthorizations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/jurisdiction/my-authorizations');
      if (res.data.success) {
        setAuthorizations(res.data.data.authorized_jurisdictions || []);
        setPendingRequests(res.data.data.pending_expansion_requests || []);
        setPrimaryJurisdiction(res.data.data.primary_jurisdiction);
      }
    } catch (error) {
      console.error('Failed to load authorizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpansionRequest = async (e) => {
    e.preventDefault();
    
    if (!expansionForm.targetJurisdiction || !expansionForm.businessRegistrationNumber) {
      alert('Please fill in required fields');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/api/jurisdiction/request-expansion', {
        target_jurisdiction: expansionForm.targetJurisdiction,
        business_registration_number: expansionForm.businessRegistrationNumber,
        tax_registration_number: expansionForm.taxRegistrationNumber || null,
        notes: expansionForm.notes || null
      });

      if (res.data.success) {
        alert('Expansion request submitted successfully! HR Bank will review your application.');
        setShowExpansionForm(false);
        setExpansionForm({
          targetJurisdiction: '',
          businessRegistrationNumber: '',
          taxRegistrationNumber: '',
          notes: ''
        });
        loadAuthorizations();
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this expansion request?')) return;
    
    try {
      await api.delete(`/api/jurisdiction/expansion-request/${requestId}`);
      alert('Request cancelled');
      loadAuthorizations();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to cancel request');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Pending Review</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1"><Check className="w-3 h-3" /> Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1"><X className="w-3 h-3" /> Rejected</span>;
      default:
        return null;
    }
  };

  // Common jurisdiction codes for expansion
  const commonJurisdictions = [
    { code: 'CA-ON', name: 'Ontario, Canada' },
    { code: 'CA-BC', name: 'British Columbia, Canada' },
    { code: 'CA-AB', name: 'Alberta, Canada' },
    { code: 'CA-QC', name: 'Quebec, Canada' },
    { code: 'CA-MB', name: 'Manitoba, Canada' },
    { code: 'CA-SK', name: 'Saskatchewan, Canada' },
    { code: 'CA-NS', name: 'Nova Scotia, Canada' },
    { code: 'CA-NB', name: 'New Brunswick, Canada' },
    { code: 'US-CA', name: 'California, USA' },
    { code: 'US-TX', name: 'Texas, USA' },
    { code: 'US-NY', name: 'New York, USA' },
    { code: 'US-FL', name: 'Florida, USA' },
    { code: 'US-MI', name: 'Michigan, USA' },
    { code: 'US-OH', name: 'Ohio, USA' },
    { code: 'IN-MH', name: 'Maharashtra, India' },
    { code: 'IN-KA', name: 'Karnataka, India' },
    { code: 'GB-ENG', name: 'England, UK' },
  ];

  // Filter out already authorized jurisdictions
  const availableJurisdictions = commonJurisdictions.filter(
    j => !authorizations.find(a => a.jurisdiction_code === j.code)
  );

  const content = (
    <div className={embedded ? '' : 'max-w-4xl mx-auto'}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Globe2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Authorized Jurisdictions</h2>
              <p className="text-sm text-gray-600">Where you can create workplaces and hire workers</p>
            </div>
          </div>
          {!showExpansionForm && (
            <button
              onClick={() => setShowExpansionForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Request Expansion
            </button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p>Your operations are restricted to authorized jurisdictions based on your business registration. 
            To expand to new provinces or states, submit an expansion request with proof of business registration in that jurisdiction.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-500 mt-3">Loading...</p>
        </div>
      ) : (
        <>
          {/* Expansion Request Form */}
          {showExpansionForm && (
            <div className="bg-white rounded-xl border shadow-sm mb-6 overflow-hidden">
              <div className="p-5 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Request Jurisdiction Expansion
                </h3>
              </div>
              <form onSubmit={handleExpansionRequest} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Jurisdiction <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={expansionForm.targetJurisdiction}
                    onChange={(e) => setExpansionForm({ ...expansionForm, targetJurisdiction: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select a jurisdiction</option>
                    <optgroup label="Canada">
                      {availableJurisdictions.filter(j => j.code.startsWith('CA-')).map(j => (
                        <option key={j.code} value={j.code}>{j.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="United States">
                      {availableJurisdictions.filter(j => j.code.startsWith('US-')).map(j => (
                        <option key={j.code} value={j.code}>{j.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Other">
                      {availableJurisdictions.filter(j => !j.code.startsWith('CA-') && !j.code.startsWith('US-')).map(j => (
                        <option key={j.code} value={j.code}>{j.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Registration Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={expansionForm.businessRegistrationNumber}
                    onChange={(e) => setExpansionForm({ ...expansionForm, businessRegistrationNumber: e.target.value })}
                    placeholder="e.g., Corporation #, BN, etc."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your business registration number in the target jurisdiction
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Registration Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={expansionForm.taxRegistrationNumber}
                    onChange={(e) => setExpansionForm({ ...expansionForm, taxRegistrationNumber: e.target.value })}
                    placeholder="e.g., GST/HST, EIN, etc."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={expansionForm.notes}
                    onChange={(e) => setExpansionForm({ ...expansionForm, notes: e.target.value })}
                    placeholder="Any additional information about your expansion..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExpansionForm(false)}
                    className="px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Current Authorizations */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-medium text-gray-900">Current Authorizations</h3>
            </div>
            <div className="divide-y">
              {authorizations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Globe2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>No authorized jurisdictions found</p>
                </div>
              ) : (
                authorizations.map((auth, index) => (
                  <div
                    key={auth.jurisdiction_code}
                    className={`p-4 flex items-center justify-between ${auth.is_primary ? 'bg-indigo-50/50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${auth.is_primary ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                        <MapPin className={`w-5 h-5 ${auth.is_primary ? 'text-indigo-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{auth.name}</span>
                          {auth.is_primary && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{auth.country} • {auth.jurisdiction_code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {auth.minimum_wage && (
                        <span className="text-sm text-gray-600">
                          Min Wage: {auth.currency === 'CAD' || auth.currency === 'USD' ? '$' : ''}{auth.minimum_wage}
                        </span>
                      )}
                      <div className="flex gap-1">
                        {(auth.compliance_badges || []).slice(0, 2).map(badge => (
                          <span key={badge} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-amber-50">
                <h3 className="font-medium text-amber-800 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pending Expansion Requests
                </h3>
              </div>
              <div className="divide-y">
                {pendingRequests.map((request) => (
                  <div key={request.request_id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {request.target_jurisdiction_name || request.target_jurisdiction}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Submitted: {new Date(request.submitted_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Registration #: {request.business_registration_number}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(request.status)}
                        {request.status === 'pending' && (
                          <button
                            onClick={() => cancelRequest(request.request_id)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {content}
    </div>
  );
};

export default JurisdictionSettings;
