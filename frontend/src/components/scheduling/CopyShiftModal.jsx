import React, { useState } from 'react';
import { FiX, FiCalendar, FiCopy, FiRepeat } from 'react-icons/fi';
import api from '../../utils/api';
import moment from 'moment';

const CopyShiftModal = ({ isOpen, onClose, shift, onSuccess }) => {
  const [copyMode, setCopyMode] = useState('single'); // single, multiple, recurring
  const [formData, setFormData] = useState({
    target_dates: [moment().format('YYYY-MM-DD')],
    is_recurring: false,
    recurrence_rule: 'weekly',
    recurrence_end_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddDate = () => {
    setFormData({
      ...formData,
      target_dates: [...formData.target_dates, moment().format('YYYY-MM-DD')]
    });
  };

  const handleRemoveDate = (index) => {
    const newDates = formData.target_dates.filter((_, i) => i !== index);
    setFormData({ ...formData, target_dates: newDates });
  };

  const handleDateChange = (index, value) => {
    const newDates = [...formData.target_dates];
    newDates[index] = value;
    setFormData({ ...formData, target_dates: newDates });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (copyMode === 'recurring') {
        // Create recurring shifts based on original shift
        const startDateTime = moment(`${formData.target_dates[0]} ${moment(shift.start_time).format('HH:mm')}`, 'YYYY-MM-DD HH:mm').toISOString();
        const endDateTime = moment(`${formData.target_dates[0]} ${moment(shift.end_time).format('HH:mm')}`, 'YYYY-MM-DD HH:mm').toISOString();

        const payload = {
          workplace_id: shift.workplace_id,
          position_title: shift.position_title,
          start_time: startDateTime,
          end_time: endDateTime,
          positions_needed: shift.positions_needed,
          hourly_rate: shift.hourly_rate,
          notes: shift.notes,
          required_skills: shift.required_skills || [],
          required_certifications: shift.required_certifications || [],
          is_recurring: true,
          recurrence_rule: formData.recurrence_rule,
          recurrence_end_date: formData.recurrence_end_date 
            ? moment(formData.recurrence_end_date).toISOString() 
            : null
        };

        await api.post('/api/calendar/shifts', payload);
      } else {
        // Copy shift to each selected date
        for (const targetDate of formData.target_dates) {
          const startDateTime = moment(`${targetDate} ${moment(shift.start_time).format('HH:mm')}`, 'YYYY-MM-DD HH:mm').toISOString();
          const endDateTime = moment(`${targetDate} ${moment(shift.end_time).format('HH:mm')}`, 'YYYY-MM-DD HH:mm').toISOString();

          const payload = {
            workplace_id: shift.workplace_id,
            position_title: shift.position_title,
            start_time: startDateTime,
            end_time: endDateTime,
            positions_needed: shift.positions_needed,
            hourly_rate: shift.hourly_rate,
            notes: shift.notes,
            required_skills: shift.required_skills || [],
            required_certifications: shift.required_certifications || [],
            is_recurring: false
          };

          await api.post('/api/calendar/shifts', payload);
        }
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to copy shift');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCopy className="w-5 h-5 text-white" />
              <h3 className="text-xl font-bold text-white">Copy Shift</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Original Shift Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Copying:</h4>
              <p className="text-sm text-gray-700">{shift.position_title}</p>
              <p className="text-sm text-gray-500">{shift.workplace_name}</p>
              <p className="text-sm text-gray-500">
                {moment(shift.start_time).format('MMM DD, YYYY • h:mm A')} - {moment(shift.end_time).format('h:mm A')}
              </p>
            </div>

            {/* Copy Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Copy Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="single"
                    checked={copyMode === 'single'}
                    onChange={(e) => setCopyMode(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Single Date</div>
                    <div className="text-xs text-gray-500">Copy to one specific date</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="multiple"
                    checked={copyMode === 'multiple'}
                    onChange={(e) => setCopyMode(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Multiple Dates</div>
                    <div className="text-xs text-gray-500">Copy to several specific dates</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="recurring"
                    checked={copyMode === 'recurring'}
                    onChange={(e) => setCopyMode(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex items-center gap-2">
                    <FiRepeat className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">Recurring</div>
                      <div className="text-xs text-gray-500">Copy on a recurring schedule</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Date Selection */}
            {copyMode === 'recurring' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.target_dates[0]}
                    onChange={(e) => handleDateChange(0, e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repeat
                  </label>
                  <select
                    value={formData.recurrence_rule}
                    onChange={(e) => setFormData({ ...formData, recurrence_rule: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                    min={formData.target_dates[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to create shifts for 3 months
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Target Date{copyMode === 'multiple' ? 's' : ''}
                </label>
                {formData.target_dates.map((date, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => handleDateChange(index, e.target.value)}
                      required
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {copyMode === 'multiple' && formData.target_dates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                {copyMode === 'multiple' && (
                  <button
                    type="button"
                    onClick={handleAddDate}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add another date
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <FiCopy className="w-4 h-4" />
                {loading ? 'Copying...' : 'Copy Shift'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CopyShiftModal;
