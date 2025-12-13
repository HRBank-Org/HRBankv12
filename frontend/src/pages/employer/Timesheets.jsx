import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import RateWorkforce from '../../components/ratings/RateWorkforce';
import ModernSidebar from '../../components/layout/ModernSidebar';

const Timesheets = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingBooking, setRatingBooking] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadTimesheets();
  }, []);

  const loadTimesheets = async () => {
    try {
      // TODO: Create endpoint to get employer's timesheets
      // const response = await api.get('/api/employer/timesheets');
      // setTimesheets(response.data.data.timesheets);
      setTimesheets([]);
    } catch (error) {
      console.error('Failed to load timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (timesheetId, booking) => {
    try {
      // TODO: Create approve endpoint
      // await api.post(`/api/employer/timesheets/${timesheetId}/approve`);
      
      // After approval, trigger rating
      setRatingBooking(booking);
    } catch (error) {
      alert('Failed to approve timesheet');
    }
  };

  const handlePay = async (timesheetId) => {
    if (!confirm('Process payment for this timesheet?')) return;

    try {
      const response = await api.post(`/api/payments/timesheets/${timesheetId}/pay`);
      alert(`Payment processed successfully!\n\nAmount: $${response.data.data.amount_charged}\nWorker receives: $${response.data.data.worker_payout}`);
      loadTimesheets();
    } catch (error) {
      alert(error.response?.data?.error?.detail || 'Payment processing failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      
      <div className="ml-[70px] transition-all duration-300">
        {/* Header */}
        <div className="px-8 py-6 bg-white shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
          <p className="text-gray-600 mt-1">Review and approve worker timesheets for payroll</p>
        </div>

        {/* Content */}
        <div className="p-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200 px-6 py-3">
            <nav className="flex gap-6">
              <button className="px-4 py-2 text-sm font-medium border-b-2" style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}>
                Pending Approval ({timesheets.filter(t => t.status === 'submitted').length})
              </button>
              <button className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                Approved ({timesheets.filter(t => t.status === 'approved').length})
              </button>
              <button className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                All Timesheets
              </button>
            </nav>
          </div>
        </div>

        {/* Timesheets List */}
        {timesheets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Timesheets Yet</h3>
            <p className="text-gray-600 mb-6">
              Timesheets will appear here after workers complete shifts and clock out.
            </p>
            <button
              onClick={() => navigate('/employer/workplaces')}
              className="px-6 py-3 rounded-lg text-white font-semibold"
              style={{ backgroundColor: theme.primaryColor }}
            >
              View Shifts
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {timesheets.map((timesheet) => (
              <div key={timesheet.timesheet_id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Worker Name</h3>
                    <p className="text-sm text-gray-600">
                      Week Ending: {new Date(timesheet.week_ending_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    timesheet.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                    timesheet.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {timesheet.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Regular Hours</p>
                    <p className="text-lg font-bold text-gray-900">{timesheet.regular_hours}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Overtime Hours</p>
                    <p className="text-lg font-bold text-gray-900">{timesheet.overtime_hours}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Gross Pay</p>
                    <p className="text-lg font-bold text-gray-900">${timesheet.gross_pay}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Net Pay</p>
                    <p className="text-lg font-bold text-green-600">${timesheet.net_pay}</p>
                  </div>
                </div>

                {timesheet.status === 'submitted' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleApprove(timesheet.timesheet_id, timesheet)}
                      className="flex-1 px-6 py-3 rounded-lg text-white font-medium"
                      style={{ backgroundColor: theme.accentColor }}
                    >
                      ✓ Approve & Rate Worker
                    </button>
                    <button className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                      Adjust Hours
                    </button>
                  </div>
                )}

                {timesheet.status === 'approved' && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                      <p className="text-sm text-green-800">
                        ✓ Timesheet approved. Ready to process payment.
                      </p>
                    </div>
                    <button
                      onClick={() => handlePay(timesheet.timesheet_id)}
                      className="w-full px-6 py-3 rounded-lg text-white font-semibold"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      💳 Pay Worker - ${timesheet.net_pay}
                    </button>
                  </div>
                )}

                {timesheet.status === 'paid' && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        ✓ Payment processed on {timesheet.paid_date ? new Date(timesheet.paid_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Rating Modal */}
      {ratingBooking && (
        <RateWorkforce 
          booking={ratingBooking}
          onComplete={() => {
            setRatingBooking(null);
            alert('Rating submitted! Timesheet approved.');
            loadTimesheets();
          }}
          onCancel={() => setRatingBooking(null)}
        />
      )}
    </div>
  );
};

export default Timesheets;
