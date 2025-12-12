import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';
import moment from 'moment';
import { FiCheckCircle, FiCircle, FiClock, FiMapPin, FiCalendar } from 'react-icons/fi';

const MyTasks = () => {
  const theme = useTheme();
  const [shifts, setShifts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [taskCompletions, setTaskCompletions] = useState({});

  useEffect(() => {
    loadShiftsAndTasks();
  }, [selectedDate]);

  const loadShiftsAndTasks = async () => {
    try {
      setLoading(true);
      
      // Get shifts for selected date
      const shiftsRes = await api.get(`/api/workforce/my-shifts?date=${selectedDate}`);
      const shiftsData = shiftsRes.data.data.shifts || [];
      setShifts(shiftsData);
      
      // Get task completions for these shifts
      if (shiftsData.length > 0) {
        const completionsRes = await api.get(`/api/workforce/task-completions?date=${selectedDate}`);
        const completions = completionsRes.data.data.completions || [];
        
        // Convert to lookup object: {shift_id: {task_text: completion_object}}
        const completionsMap = {};
        completions.forEach(comp => {
          if (!completionsMap[comp.shift_id]) {
            completionsMap[comp.shift_id] = {};
          }
          completionsMap[comp.shift_id][comp.task_text] = comp;
        });
        setTaskCompletions(completionsMap);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = async (shift, task, taskType) => {
    try {
      const isCompleted = taskCompletions[shift.shift_id]?.[task]?.completed || false;
      
      if (isCompleted) {
        // Uncomplete task
        const completionId = taskCompletions[shift.shift_id][task].task_completion_id;
        await api.delete(`/api/workforce/task-completions/${completionId}`);
      } else {
        // Complete task
        await api.post('/api/workforce/task-completions', {
          shift_id: shift.shift_id,
          task_text: task,
          task_type: taskType,
          completed: true
        });
      }
      
      // Reload to get updated data
      loadShiftsAndTasks();
    } catch (error) {
      console.error('Failed to toggle task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  const getCompletionStats = (shift) => {
    const allTasks = [
      ...(shift.standard_tasks || []).map(t => ({ task: t, type: 'standard' })),
      ...(shift.custom_tasks || []).map(t => ({ task: t, type: 'custom' }))
    ];
    
    const completed = allTasks.filter(t => 
      taskCompletions[shift.shift_id]?.[t.task]?.completed
    ).length;
    
    return { completed, total: allTasks.length };
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
        <UserHeader />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader />
      
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600 mt-1">Daily task checklist for your shifts</p>
          </div>
          
          {/* Date Selector */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedDate(moment(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'))}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Previous
            </button>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            
            <button
              onClick={() => setSelectedDate(moment(selectedDate).add(1, 'day').format('YYYY-MM-DD'))}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Next →
            </button>
            
            <button
              onClick={() => setSelectedDate(moment().format('YYYY-MM-DD'))}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Today
            </button>
          </div>
        </div>

        {shifts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <FiCalendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No shifts scheduled for {moment(selectedDate).format('MMMM D, YYYY')}</p>
            <p className="text-gray-500 text-sm mt-2">Select a different date to view your tasks</p>
          </div>
        ) : (
          <div className="space-y-6">
            {shifts.map(shift => {
              const stats = getCompletionStats(shift);
              const allTasks = [
                ...(shift.standard_tasks || []).map(t => ({ task: t, type: 'standard' })),
                ...(shift.custom_tasks || []).map(t => ({ task: t, type: 'custom' }))
              ];
              
              return (
                <div key={shift.shift_id} className="bg-white rounded-xl shadow-md overflow-hidden">
                  {/* Shift Header */}
                  <div className="p-6 border-b border-gray-200" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}15 0%, ${theme.primaryColor}05 100%)` }}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{shift.position_title || shift.role_name}</h2>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <FiMapPin size={14} />
                            <span>{shift.workplace_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FiClock size={14} />
                            <span>{moment(shift.start_time).format('h:mm A')} - {moment(shift.end_time).format('h:mm A')}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Badge */}
                      <div className="text-right">
                        <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                          stats.completed === stats.total 
                            ? 'bg-green-100 text-green-800' 
                            : stats.completed > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {stats.completed}/{stats.total} Tasks
                        </div>
                        <div className="w-24 h-2 bg-gray-200 rounded-full mt-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                              backgroundColor: theme.primaryColor
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="p-6">
                    {allTasks.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No tasks for this shift</p>
                    ) : (
                      <div className="space-y-3">
                        {allTasks.map(({ task, type }, idx) => {
                          const isCompleted = taskCompletions[shift.shift_id]?.[task]?.completed || false;
                          const completion = taskCompletions[shift.shift_id]?.[task];
                          
                          return (
                            <div 
                              key={idx}
                              className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                                isCompleted 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleTaskToggle(shift, task, type)}
                            >
                              <div className="mt-1">
                                {isCompleted ? (
                                  <FiCheckCircle size={24} className="text-green-600" />
                                ) : (
                                  <FiCircle size={24} className="text-gray-400" />
                                )}
                              </div>
                              
                              <div className="flex-1">
                                <p className={`text-base ${isCompleted ? 'text-gray-600 line-through' : 'text-gray-900 font-medium'}`}>
                                  {task}
                                </p>
                                
                                {type === 'custom' && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                    Custom Task
                                  </span>
                                )}
                                
                                {isCompleted && completion && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    ✓ Completed {moment(completion.completed_at).format('h:mm A')}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasks;
