import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  FileText,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  Receipt,
  CreditCard
} from 'lucide-react';

const Invoices = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [filter, setFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, [filter]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/api/invoices/my-invoices${params}`);
      if (res.data.success) {
        setInvoices(res.data.data.invoices);
        setSummary(res.data.data.summary);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
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
      draft: { bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: AlertCircle }
    };
    return styles[status] || styles.draft;
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
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
          <p className="text-gray-600 text-sm mt-1">
            View and download your payment invoices
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.total_paid)}</p>
                <p className="text-xs text-gray-500">Total Paid</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.total_pending)}</p>
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
                <p className="text-xl font-bold text-gray-900">{summary.paid_count || 0}</p>
                <p className="text-xs text-gray-500">Paid Invoices</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{invoices.length}</p>
                <p className="text-xs text-gray-500">Total Invoices</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'paid', 'sent', 'overdue'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f 
                  ? 'text-white' 
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
              style={filter === f ? { backgroundColor: theme.primaryColor } : {}}
              data-testid={`filter-${f}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No invoices yet</h3>
              <p className="text-gray-500">Your invoices will appear here after making purchases.</p>
            </div>
          ) : (
            <div className="divide-y">
              {invoices.map(invoice => {
                const statusStyle = getStatusBadge(invoice.status);
                const StatusIcon = statusStyle.icon;
                return (
                  <div
                    key={invoice.invoice_id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            <StatusIcon className="w-3 h-3" />
                            {invoice.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(invoice.issue_date)}
                          </span>
                          {invoice.line_items?.[0] && (
                            <span className="truncate max-w-[200px]">
                              {invoice.line_items[0].description}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                        <p className="text-xs text-gray-500">
                          Tax: {formatCurrency(invoice.total_tax)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                          title="View Details"
                          data-testid={`view-invoice-${invoice.invoice_id}`}
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => downloadPDF(invoice.invoice_id, invoice.invoice_number)}
                          disabled={downloading === invoice.invoice_id}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                          title="Download PDF"
                          data-testid={`download-invoice-${invoice.invoice_id}`}
                        >
                          {downloading === invoice.invoice_id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Download className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onDownload={() => downloadPDF(selectedInvoice.invoice_id, selectedInvoice.invoice_number)}
          downloading={downloading === selectedInvoice.invoice_id}
          theme={theme}
        />
      )}
    </div>
  );
};

const InvoiceDetailModal = ({ invoice, onClose, onDownload, downloading, theme }) => {
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status & Dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{t("pages.common.status")}</p>
              <p className={`font-semibold capitalize ${invoice.status === 'paid' ? 'text-green-600' : invoice.status === 'overdue' ? 'text-red-600' : 'text-blue-600'}`}>
                {invoice.status}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Due Date</p>
              <p className="font-semibold text-gray-900">{formatDate(invoice.due_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Province</p>
              <p className="font-semibold text-gray-900">{invoice.province_name || invoice.province}</p>
            </div>
            {invoice.paid_date && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Paid Date</p>
                <p className="font-semibold text-green-600">{formatDate(invoice.paid_date)}</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">{t("pages.common.description")}</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Qty</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Price</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 uppercase">{t("pages.common.amount")}</th>
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
                <span style={{ color: theme.primaryColor }}>{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{invoice.notes}</p>
            </div>
          )}

          {/* Payment Info */}
          {invoice.payment_method && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CreditCard className="w-4 h-4" />
              <span>Paid via {invoice.payment_method}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-100"
          >
            Close
          </button>
          <button
            onClick={onDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoices;
