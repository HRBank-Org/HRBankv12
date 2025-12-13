import React, { useState, useEffect } from 'react';
import { FiCoffee, FiClock, FiX, FiCheckCircle } from 'react-icons/fi';
import api from '../../utils/api';

const BreakReminderBanner = ({ workerId, shiftId, onBreakTaken }) => {
  const [breakStatus, setBreakStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onBreak, setOnBreak] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState(null);

  useEffect(() => {
    if (workerId && shiftId) {
      loadBreakStatus();
      // Check every 5 minutes
      const interval = setInterval(loadBreakStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [workerId, shiftId]);

  const loadBreakStatus = async () => {
    try {
      const response = await api.get(`/api/compliance/worker-break-status/${workerId}/${shiftId}`);
      setBreakStatus(response.data.data);
    } catch (error) {
      console.error('Failed to load break status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    try {
      const breakType = breakStatus.next_break_due?.break_type || 'short_break';
      const now = new Date().toISOString();
      
      await api.post('/api/compliance/track-break', {
        shift_id: shiftId,
        worker_id: workerId,
        break_type: breakType,
        break_start: now
      });

      setOnBreak(true);
      setBreakStartTime(now);
      
      // Auto end break after required duration
      const duration = breakStatus.next_break_due?.duration || 10;
      setTimeout(() => {
        handleEndBreak(now, breakType);
      }, duration * 60 * 1000);
      
    } catch (error) {
      console.error('Failed to start break:', error);
    }
  };

  const handleEndBreak = async (startTime = breakStartTime, type = null) => {
    try {
      const breakType = type || breakStatus.next_break_due?.break_type || 'short_break';
      
      await api.post('/api/compliance/track-break', {
        shift_id: shiftId,
        worker_id: workerId,
        break_type: breakType,
        break_start: startTime,
        break_end: new Date().toISOString()
      });

      setOnBreak(false);
      setBreakStartTime(null);
      await loadBreakStatus();
      
      if (onBreakTaken) {
        onBreakTaken();
      }
    } catch (error) {
      console.error('Failed to end break:', error);
    }
  };

  if (loading || !breakStatus || dismissed) return null;

  // Don't show if worker is compliant
  if (breakStatus.compliance_status === 'compliant' && !onBreak) return null;

  // Show break in progress banner
  if (onBreak) {
    return (
      <div className="fixed top-20 left-0 right-0 z-40 mx-auto max-w-2xl px-4">
        <div className="bg-green-500 text-white rounded-lg shadow-lg p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiCoffee size={24} />
              <div>
                <h3 className="font-bold">Break in Progress</h3>
                <p className="text-sm opacity-90">Enjoy your break! Timer will end automatically.</p>
              </div>
            </div>
            <button
              onClick={() => handleEndBreak()}
              className="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50"
            >
              <FiCheckCircle className="inline mr-2" />
              End Break Early
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show break reminder
  const nextBreak = breakStatus.next_break_due;
  if (!nextBreak) return null;

  return (
    <div className="fixed top-20 left-0 right-0 z-40 mx-auto max-w-2xl px-4">
      <div className="bg-red-500 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <FiClock size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">⚠️ Break Required!</h3>
              <p className="text-sm opacity-90">
                You've worked {breakStatus.hours_worked.toFixed(1)} hours. 
                Please take your {nextBreak.description} now.
              </p>
              <p className="text-xs opacity-75 mt-1">
                This is required by labor law for your health and safety.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleStartBreak}
              className="px-6 py-3 bg-white text-red-600 rounded-lg font-bold hover:bg-red-50 shadow-lg"
            >
              <FiCoffee className="inline mr-2" />
              Start {nextBreak.duration}-Min Break
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakReminderBanner;
