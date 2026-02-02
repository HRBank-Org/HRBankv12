import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Clock, MapPin, DollarSign, FileText, TrendingUp, Calendar, Download } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function EmployerBilling() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [period, setPeriod] = useState('current_month');
  const [error, setError] = useState(null);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [summaryRes, weeklyRes] = await Promise.all([
        fetch(`${API_URL}/api/employer/billing/summary?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/employer/billing/weekly-breakdown?weeks=4`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const summaryData = await summaryRes.json();
      const weeklyDataRes = await weeklyRes.json();

      if (summaryData.success) setSummary(summaryData.data);
      if (weeklyDataRes.success) setWeeklyData(weeklyDataRes.data);
    } catch (err) {
      setError('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, token]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Billing</h1>
              <p className="text-gray-500 dark:text-gray-400">View hours, fees, and invoice details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="current_week">This Week</option>
              <option value="current_month">This Month</option>
              <option value="last_month">Last Month</option>
            </select>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4 text-red-600 dark:text-red-400">{error}</CardContent>
          </Card>
        )}

        {/* Fee Structure Info */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Platform Fee Structure</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  <strong>$1.00/hour</strong> for all shift types + <strong>$0.25/verified stop</strong> for route-based work
                </p>
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
                  <Clock className="w-8 h-8 text-indigo-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
                    <p className="text-2xl font-bold">{summary.summary.total_hours}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Shifts</p>
                    <p className="text-2xl font-bold">{summary.summary.total_shifts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <MapPin className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Route Stops</p>
                    <p className="text-2xl font-bold">{summary.summary.total_stops}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="text-sm text-indigo-600 dark:text-indigo-300">Platform Fees</p>
                    <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-200">
                      {formatCurrency(summary.summary.total_platform_fees)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Breakdown by Type */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Breakdown by Shift Type
              </CardTitle>
              <CardDescription>
                {summary.period.start} to {summary.period.end}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium">Shift Type</th>
                      <th className="text-right py-3 px-4 font-medium">Shifts</th>
                      <th className="text-right py-3 px-4 font-medium">Hours</th>
                      <th className="text-right py-3 px-4 font-medium">Stops</th>
                      <th className="text-right py-3 px-4 font-medium">Hourly Fees</th>
                      <th className="text-right py-3 px-4 font-medium">Stop Fees</th>
                      <th className="text-right py-3 px-4 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.breakdown_by_type).map(([type, data]) => (
                      <tr key={type} className="border-b dark:border-gray-700">
                        <td className="py-3 px-4">
                          <Badge variant={
                            type === 'on_site' ? 'default' :
                            type === 'continental' ? 'secondary' :
                            'outline'
                          }>
                            {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4">{data.shifts}</td>
                        <td className="text-right py-3 px-4">{data.hours}</td>
                        <td className="text-right py-3 px-4">{data.stops || '-'}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(data.hourly_fees)}</td>
                        <td className="text-right py-3 px-4">{data.stop_fees ? formatCurrency(data.stop_fees) : '-'}</td>
                        <td className="text-right py-3 px-4 font-semibold">
                          {formatCurrency(data.hourly_fees + (data.stop_fees || 0))}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                      <td className="py-3 px-4">Total</td>
                      <td className="text-right py-3 px-4">{summary.summary.total_shifts}</td>
                      <td className="text-right py-3 px-4">{summary.summary.total_hours}</td>
                      <td className="text-right py-3 px-4">{summary.summary.total_stops}</td>
                      <td className="text-right py-3 px-4">{formatCurrency(summary.summary.total_hourly_fees)}</td>
                      <td className="text-right py-3 px-4">{formatCurrency(summary.summary.total_stop_fees)}</td>
                      <td className="text-right py-3 px-4 text-indigo-600">
                        {formatCurrency(summary.summary.total_platform_fees)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Breakdown */}
        {weeklyData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Weekly Breakdown
              </CardTitle>
              <CardDescription>Last 4 weeks of activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium">Week</th>
                      <th className="text-right py-3 px-4 font-medium">On-Site</th>
                      <th className="text-right py-3 px-4 font-medium">Continental</th>
                      <th className="text-right py-3 px-4 font-medium">Route-Based</th>
                      <th className="text-right py-3 px-4 font-medium">Total Hours</th>
                      <th className="text-right py-3 px-4 font-medium">Stops</th>
                      <th className="text-right py-3 px-4 font-medium">Platform Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData.weeks.map((week, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700">
                        <td className="py-3 px-4">
                          <div className="font-medium">Week {week.week_number}</div>
                          <div className="text-xs text-gray-500">{week.week_start}</div>
                        </td>
                        <td className="text-right py-3 px-4">{week.hours_by_type.on_site}h</td>
                        <td className="text-right py-3 px-4">{week.hours_by_type.continental}h</td>
                        <td className="text-right py-3 px-4">{week.hours_by_type.route_based}h</td>
                        <td className="text-right py-3 px-4 font-medium">{week.total_hours}h</td>
                        <td className="text-right py-3 px-4">{week.route_stops}</td>
                        <td className="text-right py-3 px-4 font-semibold text-indigo-600">
                          {formatCurrency(week.fees.total_fees)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                      <td className="py-3 px-4">4-Week Total</td>
                      <td colSpan={3}></td>
                      <td className="text-right py-3 px-4">{weeklyData.totals.total_hours}h</td>
                      <td></td>
                      <td className="text-right py-3 px-4 text-indigo-600">
                        {formatCurrency(weeklyData.totals.total_fees)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/employer/invoices')}>
            <FileText className="w-4 h-4 mr-2" />
            View Invoices
          </Button>
          <Button onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>
    </div>
  );
}
