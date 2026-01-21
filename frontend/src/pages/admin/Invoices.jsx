import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import {
  Receipt,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Eye,
  Filter,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building2,
  User,
  GraduationCap
} from 'lucide-react';

const AdminInvoices = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    customerType: ''
  });
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    total: 0
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, [filters, pagination.offset]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.customerType) params.append('customer_type', filters.customerType);
      params.append('limit', pagination.limit);
      params.append('offset', pagination.offset);

      const res = await api.get(`/api/invoices/admin/all?${params.toString()}`);
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
      setUpdatingStatus(invoiceId);
      await api.patch(`/api/invoices/admin/${invoiceId}/status?status=${newStatus}`);
      loadInvoices();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update invoice status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const downloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      setDownloading(invoiceId);
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
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download invoice:', error);
      alert('Failed to download invoice');
    } finally {
      setDownloading(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
      draft: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Receipt },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: AlertCircle }
    };
    return styles[status] || styles.draft;
  };

  const getCustomerTypeIcon = (type) => {
    switch (type) {
      case 'workforce': return User;
      case 'employer': return Building2;
      case 'institution': return GraduationCap;
      default: return User;
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <SuperAdminSidebar />
      
      <main className="transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 260px)' }}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
            <p className="text-gray-600 text-sm mt-1">
              View and manage all platform invoices
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.total_revenue)}</p>
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
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.pending_amount)}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{summary.paid_count || 0}</p>
                  <p className="text-xs text-gray-500">Paid Invoices</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{summary.pending_count || 0}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{summary.overdue_count || 0}</p>
                  <p className="text-xs text-gray-500">Overdue</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                data-testid="filter-status"
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="sent">Sent</option>
                <option value="overdue">Overdue</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filters.customerType}
                onChange={(e) => setFilters(prev => ({ ...prev, customerType: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                data-testid="filter-customer-type"
              >
                <option value="">All Customer Types</option>
                <option value="workforce">Workforce</option>
                <option value="employer">Employer</option>
                <option value="institution">Institution</option>
              </select>
              <button
                onClick={loadInvoices}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
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
              <div className="text-center py-12 px-4">
                <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No invoices found</h3>
                <p className="text-gray-500">No invoices match your filter criteria.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Invoice</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invoices.map(invoice => {
                        const statusStyle = getStatusBadge(invoice.status);
                        const StatusIcon = statusStyle.icon;
                        const CustomerIcon = getCustomerTypeIcon(invoice.customer_type);
                        return (
                          <tr key={invoice.invoice_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <CustomerIcon className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{invoice.customer_name}</p>
                                  <p className="text-xs text-gray-500">{invoice.customer_type}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">{formatDate(invoice.issue_date)}</div>
                              <div className="text-xs text-gray-500">Due: {formatDate(invoice.due_date)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                <StatusIcon className="w-3 h-3" />
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <p className="font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                              <p className="text-xs text-gray-500">Tax: {formatCurrency(invoice.total_tax)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setSelectedInvoice(invoice)}
                                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => downloadPDF(invoice.invoice_id, invoice.invoice_number)}
                                  disabled={downloading === invoice.invoice_id}
                                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                                  title="Download PDF"
                                >
                                  {downloading === invoice.invoice_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </button>
                                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                  <button
                                    onClick={() => updateStatus(invoice.invoice_id, 'paid')}
                                    disabled={updatingStatus === invoice.invoice_id}
                                    className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg disabled:opacity-50"
                                    title="Mark as Paid"
                                  >
                                    {updatingStatus === invoice.invoice_id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                  <p className="text-sm text-gray-600">
                    Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} invoices
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                      disabled={pagination.offset === 0}
                      className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                      disabled={pagination.offset + pagination.limit >= pagination.total}
                      className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onDownload={() => downloadPDF(selectedInvoice.invoice_id, selectedInvoice.invoice_number)}
          onUpdateStatus={updateStatus}
          downloading={downloading === selectedInvoice.invoice_id}
          updatingStatus={updatingStatus === selectedInvoice.invoice_id}
        />
      )}
    </div>
  );
};

const InvoiceDetailModal = ({ invoice, onClose, onDownload, onUpdateStatus, downloading, updatingStatus }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount || 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Invoice {invoice.invoice_number}</h2>
            <p className="text-sm text-gray-500">Issued on {formatDate(invoice.issue_date)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
            <p className="text-gray-900">{invoice.customer_name}</p>
            <p className="text-sm text-gray-600">{invoice.customer_email}</p>
            <p className="text-sm text-gray-600">{invoice.customer_address}</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded capitalize">
              {invoice.customer_type}
            </span>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Description</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600">Qty</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600">Price</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.line_items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.quantity || 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.gst_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST ({(invoice.gst_rate * 100).toFixed(1)}%)</span>
                  <span className="text-gray-900">{formatCurrency(invoice.gst_amount)}</span>
                </div>
              )}
              {invoice.pst_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">PST ({(invoice.pst_rate * 100).toFixed(2)}%)</span>
                  <span className="text-gray-900">{formatCurrency(invoice.pst_amount)}</span>
                </div>
              )}
              {invoice.hst_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">HST ({(invoice.hst_rate * 100).toFixed(0)}%)</span>
                  <span className="text-gray-900">{formatCurrency(invoice.hst_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-orange-600">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Status Actions */}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <div className="flex gap-2">
              <button
                onClick={() => onUpdateStatus(invoice.invoice_id, 'paid')}
                disabled={updatingStatus}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Mark as Paid
              </button>
              <button
                onClick={() => onUpdateStatus(invoice.invoice_id, 'cancelled')}
                disabled={updatingStatus}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel Invoice
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-100">
            Close
          </button>
          <button
            onClick={onDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminInvoices;
