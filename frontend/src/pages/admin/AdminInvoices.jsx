import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  FileText,
  Download,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Loader2,
  Users,
  Building2,
  GraduationCap,
  Receipt,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

const AdminInvoices = () => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    customer_type: '',
    search: ''
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0 });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [filters, pagination.page]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit
      });
      if (filters.status) params.append('status', filters.status);
      if (filters.customer_type) params.append('customer_type', filters.customer_type);

      const res = await api.get(`/api/invoices/admin/all?${params}`);
      if (res.data.success) {
        setInvoices(res.data.data.invoices);
        setSummary(res.data.data.summary);
        setPagination(prev => ({ ...prev, total: res.data.data.total }));
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (invoiceId, newStatus) => {
    try {
      await api.patch(`/api/invoices/admin/${invoiceId}/status?status=${newStatus}`);
      loadInvoices();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update invoice status');
    }
  };

  const downloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const res = await api.get(`/api/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `HRBank_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-CA');
  };

  const getStatusBadge = (status) => {
    const styles = {
      paid: 'bg-green-100 text-green-700',
      sent: 'bg-blue-100 text-blue-700',
      overdue: 'bg-red-100 text-red-700',
      draft: 'bg-gray-100 text-gray-600',
      cancelled: 'bg-gray-100 text-gray-500'
    };
    return styles[status] || styles.draft;
  };

  const getCustomerIcon = (type) => {
    const icons = { workforce: Users, employer: Building2, institution: GraduationCap };
    return icons[type] || Users;
  };

  const pages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 p-6 lg:ml-[260px] pt-20 pt-20">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
                <p className="text-gray-600">Manage all platform invoices</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: theme.primaryColor }}
                data-testid="create-invoice-btn"
              >
                <Plus className="w-5 h-5" />
                Create Invoice
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.total_revenue)}</p>
                    <p className="text-xs text-gray-500">Total Revenue</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.pending_amount)}</p>
                    <p className="text-xs text-gray-500">{t("pages.common.pending")}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{summary.paid_count || 0}</p>
                    <p className="text-xs text-gray-500">Paid</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{summary.pending_count || 0}</p>
                    <p className="text-xs text-gray-500">{t("pages.common.pending")}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{summary.overdue_count || 0}</p>
                    <p className="text-xs text-gray-500">Overdue</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="sent">Sent</option>
                  <option value="overdue">Overdue</option>
                  <option value="draft">Draft</option>
                  <option value="cancelled">{t("pages.common.cancelled")}</option>
                </select>
                <select
                  value={filters.customer_type}
                  onChange={(e) => setFilters(f => ({ ...f, customer_type: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All Customers</option>
                  <option value="workforce">Workforce</option>
                  <option value="employer">Employer</option>
                  <option value="institution">Institution</option>
                </select>
                <button
                  onClick={loadInvoices}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No invoices found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Invoice</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("pages.common.date")}</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("pages.common.status")}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t("pages.common.amount")}</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t("pages.common.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {invoices.map(invoice => {
                          const CustomerIcon = getCustomerIcon(invoice.customer_type);
                          return (
                            <tr key={invoice.invoice_id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                                <p className="text-xs text-gray-500">{invoice.invoice_id}</p>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <CustomerIcon className="w-4 h-4 text-gray-400" />
                                  <div>
                                    <p className="text-sm text-gray-900">{invoice.customer_name || 'Unknown'}</p>
                                    <p className="text-xs text-gray-500 capitalize">{invoice.customer_type}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-gray-900">{formatDate(invoice.issue_date)}</p>
                                <p className="text-xs text-gray-500">Due: {formatDate(invoice.due_date)}</p>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={invoice.status}
                                  onChange={(e) => updateStatus(invoice.invoice_id, e.target.value)}
                                  className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${getStatusBadge(invoice.status)}`}
                                >
                                  <option value="draft">Draft</option>
                                  <option value="sent">Sent</option>
                                  <option value="paid">Paid</option>
                                  <option value="overdue">Overdue</option>
                                  <option value="cancelled">{t("pages.common.cancelled")}</option>
                                </select>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <p className="font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                                <p className="text-xs text-gray-500">Tax: {formatCurrency(invoice.total_tax)}</p>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => setSelectedInvoice(invoice)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4 text-gray-500" />
                                  </button>
                                  <button
                                    onClick={() => downloadPDF(invoice.invoice_id, invoice.invoice_number)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                                    title="Download PDF"
                                  >
                                    <Download className="w-4 h-4 text-gray-500" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t">
                      <p className="text-sm text-gray-600">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                          disabled={pagination.page === 1}
                          className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setPagination(p => ({ ...p, page: Math.min(pages, p.page + 1) }))}
                          disabled={pagination.page === pages}
                          className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <CreateInvoiceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadInvoices(); }}
          theme={theme}
        />
      )}
    </div>
  );
};

const InvoiceDetailModal = ({ invoice, onClose }) => {
  const formatCurrency = (amount) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount || 0);
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Invoice {invoice.invoice_number}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{invoice.customer_name}</span></div>
            <div><span className="text-gray-500">Type:</span> <span className="font-medium capitalize">{invoice.customer_type}</span></div>
            <div><span className="text-gray-500">Issue Date:</span> <span className="font-medium">{formatDate(invoice.issue_date)}</span></div>
            <div><span className="text-gray-500">Due Date:</span> <span className="font-medium">{formatDate(invoice.due_date)}</span></div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">{t("pages.common.description")}</th>
                  <th className="px-4 py-2 text-right">{t("pages.common.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items?.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{item.description}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td className="px-4 py-2 font-medium">Subtotal</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                {invoice.total_tax > 0 && (
                  <tr>
                    <td className="px-4 py-2 font-medium">Tax ({invoice.province})</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(invoice.total_tax)}</td>
                  </tr>
                )}
                <tr className="font-bold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(invoice.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateInvoiceModal = ({ onClose, onCreated, theme }) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_type: 'workforce',
    province: 'ON',
    notes: '',
    line_items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }]
  });
  const [submitting, setSubmitting] = useState(false);
  const [taxRates, setTaxRates] = useState(null);

  useEffect(() => {
    loadTaxRates(formData.province);
  }, [formData.province]);

  const loadTaxRates = async (province) => {
    try {
      const res = await api.get(`/api/invoices/tax-rates/${province}`);
      if (res.data.success) {
        setTaxRates(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load tax rates:', e);
    }
  };

  const updateLineItem = (index, field, value) => {
    const items = [...formData.line_items];
    items[index][field] = value;
    if (field === 'unit_price' || field === 'quantity') {
      items[index].amount = items[index].quantity * items[index].unit_price;
    }
    setFormData({ ...formData, line_items: items });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]
    });
  };

  const removeLineItem = (index) => {
    if (formData.line_items.length > 1) {
      setFormData({
        ...formData,
        line_items: formData.line_items.filter((_, i) => i !== index)
      });
    }
  };

  const subtotal = formData.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const taxAmount = taxRates ? subtotal * taxRates.total_rate : 0;
  const total = subtotal + taxAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) {
      alert('Please enter customer ID');
      return;
    }
    if (formData.line_items.some(item => !item.description || item.amount <= 0)) {
      alert('Please fill in all line items');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/invoices/admin/create', formData);
      onCreated();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert(error.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Create Invoice</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
              <input
                type="text"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="usr_xxxxx"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
              <select
                value={formData.customer_type}
                onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="workforce">Workforce</option>
                <option value="employer">Employer</option>
                <option value="institution">Institution</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <select
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="ON">Ontario (HST 13%)</option>
              <option value="BC">British Columbia (GST 5% + PST 7%)</option>
              <option value="AB">Alberta (GST 5%)</option>
              <option value="QC">Quebec (GST 5% + QST 9.975%)</option>
              <option value="NS">Nova Scotia (HST 15%)</option>
              <option value="NB">New Brunswick (HST 15%)</option>
              <option value="MB">Manitoba (GST 5% + PST 7%)</option>
              <option value="SK">Saskatchewan (GST 5% + PST 6%)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Line Items</label>
              <button type="button" onClick={addLineItem} className="text-sm text-blue-600 hover:underline">
                + Add Item
              </button>
            </div>
            <div className="space-y-2">
              {formData.line_items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="Description"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-16 px-3 py-2 border rounded-lg text-sm"
                    min="1"
                  />
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border rounded-lg text-sm"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                  />
                  <span className="w-20 text-right text-sm font-medium">${item.amount.toFixed(2)}</span>
                  {formData.line_items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax ({taxRates?.province_code || formData.province})</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {submitting ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminInvoices;
