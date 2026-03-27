import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import { FiChevronLeft, FiChevronRight, FiCheckSquare, FiSquare, FiCamera } from 'react-icons/fi';

import { useLanguage } from '../../contexts/LanguageContext';

const Tasks = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Mock tasks data - will be replaced with API
  const tasks = [
    { id: 1, title: 'Morning Setup', completed: false, shift: 'Morning Shift' },
    { id: 2, title: 'Customer Service', completed: false, shift: 'Morning Shift' },
    { id: 3, title: 'Inventory Check', completed: false, shift: 'Morning Shift' }
  ];

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkforceHeader />
      <WorkforceSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{t('pages.workforce.tasksTitle')}</h1>
          <p className="text-gray-600">Track and complete your daily tasks</p>
        </div>

        <div className="p-8">
          {/* Date Navigator */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateDate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiChevronLeft size={24} />
              </button>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed
                </p>
              </div>
              
              <button
                onClick={() => navigateDate(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiChevronRight size={24} />
              </button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Today's Tasks</h3>
            
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <FiCheckSquare size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No tasks for this date</p>
                <p className="text-sm text-gray-500">Tasks will appear here when you have active shifts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <button className="mt-1">
                        {task.completed ? (
                          <FiCheckSquare size={24} className="text-green-600" />
                        ) : (
                          <FiSquare size={24} className="text-gray-400" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <h4 className={`font-semibold ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {task.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{task.shift}</p>
                      </div>
                      
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <FiCamera size={20} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h4 className="font-semibold text-blue-900 mb-2">🚧 Feature Under Development</h4>
            <p className="text-sm text-blue-800">
              Task management with photo evidence upload is coming soon. You'll be able to track daily tasks, mark them complete, and attach photos as proof of completion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tasks;