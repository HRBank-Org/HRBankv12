import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  ArrowLeft, Download, FileSpreadsheet, FileJson, Clock, 
  Users, DollarSign, Calendar, CheckCircle, AlertCircle,
  Building2, Truck
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Provider logos/icons mapping
const PROVIDER_ICONS = {
  'Generic CSV': FileSpreadsheet,
  'Generic JSON': FileJson,
  'Gusto': Building2,
  'Ceridian Dayforce': Building2,
  'ADP Workforce Now': Building2,
  'ADP CSV Import': FileSpreadsheet,
  'Dayforce CSV Import': FileSpreadsheet,
};

export default function PayrollExport() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formats, setFormats] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('generic_csv');
  const [dateRange, setDateRange] = useState({
    start: getDefaultStartDate(),
    end: getDefaultEndDate()
  });
  const [exportHistory, setExportHistory] = useState([]);
  const [error, setError] = useState(null);

  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay() - 7); // Start of last week
    return date.toISOString().split('T')[0];
  }

  function getDefaultEndDate() {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay() - 1); // End of last week
    return date.toISOString().split('T')[0];
  }

  useEffect(() => {
    fetchFormats();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchSummary();
    }
  }, [dateRange]);

  const fetchFormats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/payroll-export/formats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFormats(data.data.formats);
      }
    } catch (err) {
      console.error('Failed to fetch formats:', err);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/payroll-export/summary?start_date=${dateRange.start}&end_date=${dateRange.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (err) {
      setError('Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/payroll-export/history?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExportHistory(data.data.exports);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/payroll-export/download?start_date=${dateRange.start}&end_date=${dateRange.end}&format_id=${selectedFormat}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Export failed');
      }
      
      // Get filename from header
      const contentDisposition = res.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]
        : `payroll_export.${selectedFormat.includes('csv') ? 'csv' : 'json'}`;
      
      // Download file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Refresh history
      fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const getProviderBadgeColor = (provider) => {
    if (provider.includes('Gusto')) return 'bg-green-100 text-green-800';
    if (provider.includes('Dayforce')) return 'bg-blue-100 text-blue-800';
    if (provider.includes('ADP')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/employer/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pages.employer.payrollExportTitle')}</h1>
              <p className="text-gray-500 dark:text-gray-400">Export timesheets to your payroll system</p>
            </div>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4 flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Date Range Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Pay Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const today = new Date();
                    const start = new Date(today);
                    start.setDate(today.getDate() - today.getDay() - 7);
                    const end = new Date(today);
                    end.setDate(today.getDate() - today.getDay() - 1);
                    setDateRange({
                      start: start.toISOString().split('T')[0],
                      end: end.toISOString().split('T')[0]
                    });
                  }}
                >
                  Last Week
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const today = new Date();
                    const start = new Date(today);
                    start.setDate(today.getDate() - today.getDay() - 14);
                    const end = new Date(today);
                    end.setDate(today.getDate() - today.getDay() - 1);
                    setDateRange({
                      start: start.toISOString().split('T')[0],
                      end: end.toISOString().split('T')[0]
                    });
                  }}
                >
                  Last 2 Weeks
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Employees</p>
                    <p className="text-2xl font-bold">{summary.summary.total_employees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Total Hours</p>
                    <p className="text-2xl font-bold">{summary.summary.total_hours}</p>
                    <p className="text-xs text-gray-400">
                      {summary.summary.total_overtime_hours > 0 && 
                        `(${summary.summary.total_overtime_hours}h OT)`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-500">Entries</p>
                    <p className="text-2xl font-bold">{summary.summary.total_entries}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600">Gross Pay</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(summary.summary.total_gross_pay)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Hours by Work Type */}
        {summary && summary.by_work_type && (
          <Card>
            <CardHeader>
              <CardTitle>Hours by Work Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Building2 className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{summary.by_work_type.on_site || 0}h</p>
                  <p className="text-sm text-gray-500">On-Site</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Clock className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold">{summary.by_work_type.continental || 0}h</p>
                  <p className="text-sm text-gray-500">Continental</p>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Truck className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                  <p className="text-2xl font-bold">{summary.by_work_type.route_based || 0}h</p>
                  <p className="text-sm text-gray-500">Route-Based</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Format Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Select Export Format
            </CardTitle>
            <CardDescription>
              Choose the format compatible with your payroll system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formats.map((format) => {
                const Icon = PROVIDER_ICONS[format.provider_name] || FileSpreadsheet;
                const isSelected = selectedFormat === format.format_id;
                
                return (
                  <div
                    key={format.format_id}
                    onClick={() => setSelectedFormat(format.format_id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{format.provider_name}</h3>
                          {isSelected && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <Badge className={`mt-1 text-xs ${getProviderBadgeColor(format.provider_name)}`}>
                          .{format.file_extension}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendations */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Recommendations</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>🇨🇦 <strong>Canada:</strong> Ceridian Dayforce CSV or Generic CSV</li>
                <li>🇺🇸 <strong>US Small Business:</strong> Gusto JSON</li>
                <li>🏢 <strong>Enterprise:</strong> ADP CSV Import</li>
                <li>🔧 <strong>API Integration:</strong> Generic JSON</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        <div className="flex justify-end gap-4">
          <Button
            onClick={handleExport}
            disabled={loading || !summary?.summary.total_entries}
            className="bg-indigo-600 hover:bg-indigo-700"
            data-testid="export-payroll-btn"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {summary?.summary.total_entries || 0} Entries
              </>
            )}
          </Button>
        </div>

        {/* Export History */}
        {exportHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Exports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {exportHistory.map((exp, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{exp.filename}</p>
                        <p className="text-xs text-gray-500">
                          {exp.period_start} to {exp.period_end} • {exp.entry_count} entries
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{exp.format}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
