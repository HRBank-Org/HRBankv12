import React, { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { FiUser, FiCalendar, FiTruck, FiClock, FiCheck, FiX, FiRefreshCw, FiChevronUp, FiChevronDown, FiZap, FiAlertTriangle, FiMapPin, FiExternalLink } from 'react-icons/fi';

// Work Type Icons
const WorkTypeIcon = ({ type }) => {
  switch (type) {
    case 'route_based':
      return <FiTruck className="text-orange-500" />;
    case 'continental':
      return <FiRefreshCw className="text-indigo-500" />;
    default:
      return <FiMapPin className="text-blue-500" />;
  }
};

// Auto-Assign Modal Component
const AutoAssignModal = ({ isOpen, onClose, onConfirm, theme }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [routeToJobBoard, setRouteToJobBoard] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAutoAssignProposals();
    }
  }, [isOpen]);

  const fetchAutoAssignProposals = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/employer/workforce-management/auto-assign', {
        include_route_based: true,
        include_continental: true,
        route_to_job_board: false
      });
      setResults(response.data.data);
      // Select all assignments by default
      setSelectedAssignments(response.data.data.proposed_assignments.map(a => a.worker_id));
    } catch (error) {
      console.error('Auto-assign failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignment = (workerId) => {
    setSelectedAssignments(prev => 
      prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleConfirm = async () => {
    const assignmentsToConfirm = results.proposed_assignments.filter(
      a => selectedAssignments.includes(a.worker_id)
    );
    
    setLoading(true);
    try {
      await api.post('/api/employer/workforce-management/auto-assign/confirm', {
        assignments: assignmentsToConfirm,
        route_unfilled_to_board: routeToJobBoard,
        unfilled_roles: routeToJobBoard ? results.unfilled_roles : []
      });
      onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm failed:', error);
      alert(error.response?.data?.detail || 'Failed to confirm assignments');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: theme.primaryColor }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FiZap /> Auto-Assign Workforce
              </h2>
              <p className="text-white text-opacity-80 text-sm">Review and approve proposed assignments</p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
            </div>
          ) : results ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900">{results.summary.total_workers_available}</div>
                  <div className="text-xs text-gray-500">Workers Available</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.summary.assignments_proposed}</div>
                  <div className="text-xs text-gray-500">Assignments</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{results.summary.roles_unfilled}</div>
                  <div className="text-xs text-gray-500">Unfilled Roles</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{results.summary.positions_unfilled}</div>
                  <div className="text-xs text-gray-500">Positions Needed</div>
                </div>
              </div>

              {/* Proposed Assignments */}
              {results.proposed_assignments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FiCheck className="text-green-500" /> Proposed Assignments
                  </h3>
                  <div className="space-y-2">
                    {results.proposed_assignments.map((assignment) => (
                      <div 
                        key={assignment.worker_id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedAssignments.includes(assignment.worker_id)
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => toggleAssignment(assignment.worker_id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedAssignments.includes(assignment.worker_id)}
                              onChange={() => toggleAssignment(assignment.worker_id)}
                              className="w-5 h-5 rounded"
                              style={{ accentColor: theme.primaryColor }}
                            />
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold">
                              {assignment.worker_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{assignment.worker_name}</div>
                              <div className="text-sm text-gray-500">{assignment.worker_email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                                <WorkTypeIcon type={assignment.work_type} />
                                {assignment.role_name}
                              </div>
                              <div className="text-xs text-gray-500">{assignment.workplace_name}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium" style={{ color: theme.primaryColor }}>
                                {assignment.weekly_hours}h / 48h
                              </div>
                              <div className="text-xs text-gray-500">{assignment.remaining_hours}h available</div>
                            </div>
                          </div>
                        </div>
                        {assignment.match_reasons.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {assignment.match_reasons.map((reason, i) => (
                              <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unfilled Roles */}
              {results.unfilled_roles.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FiAlertTriangle className="text-amber-500" /> Unfilled Roles (Workforce Shortage)
                  </h3>
                  <div className="space-y-2">
                    {results.unfilled_roles.map((role) => (
                      <div key={role.role_id} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <WorkTypeIcon type={role.work_type} />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{role.role_name}</div>
                              <div className="text-sm text-gray-500">{role.workplace_name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-amber-700">
                              {role.positions_needed} position{role.positions_needed > 1 ? 's' : ''} needed
                            </div>
                            <div className="text-xs text-gray-500">${role.hourly_rate}/hr</div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-amber-700">
                          {role.reason}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Route to Job Board Option */}
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={routeToJobBoard}
                        onChange={(e) => setRouteToJobBoard(e.target.checked)}
                        className="w-5 h-5 rounded"
                        style={{ accentColor: theme.primaryColor }}
                      />
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <FiExternalLink /> Route unfilled roles to Job Board
                        </div>
                        <div className="text-sm text-gray-500">
                          Post these positions publicly to attract new candidates
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {results.proposed_assignments.length === 0 && results.unfilled_roles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FiCheck size={48} className="mx-auto mb-4 text-green-500" />
                  <p className="font-medium">All roles are fully staffed!</p>
                  <p className="text-sm">No assignments needed at this time.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Failed to load assignment proposals
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedAssignments(results?.proposed_assignments.map(a => a.worker_id) || [])}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Select All
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || selectedAssignments.length === 0}
              className="px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {loading ? 'Processing...' : `Approve ${selectedAssignments.length} Assignment${selectedAssignments.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Draggable Worker Card
const DraggableWorker = ({ worker, isOverlay = false }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: worker.user_id,
    data: { type: 'worker', worker }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  if (isOverlay) {
    return (
      <div className="bg-white rounded-lg shadow-xl p-3 border-2 border-blue-500 w-48">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
            {worker.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">{worker.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{worker.position_title}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 border-blue-400 shadow-lg' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          {worker.profile_picture ? (
            <img src={worker.profile_picture} alt={worker.full_name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <span className="font-semibold text-gray-600">
              {worker.full_name?.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{worker.full_name}</p>
          <p className="text-xs text-gray-500 truncate">{worker.position_title || 'Worker'}</p>
        </div>
        {worker.today_status?.is_clocked_in && (
          <span className="w-2 h-2 bg-green-500 rounded-full" title="Clocked In" />
        )}
      </div>
      {worker.week_kpis && (
        <div className="mt-2 flex gap-2 text-xs">
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{worker.week_kpis.total_hours}h</span>
          <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded">{worker.week_kpis.shifts_completed} shifts</span>
        </div>
      )}
    </div>
  );
};

// Droppable Shift/Task Card
const DroppableShift = ({ shift, isOver, assignedWorkers = [], onRemoveWorker }) => {
  const { setNodeRef } = useDroppable({
    id: shift.shift_id || shift.task_id,
    data: { type: 'shift', shift }
  });

  const isTask = !!shift.task_id;
  const startTime = shift.start_time ? new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : shift.scheduled_start_time;
  const endTime = shift.end_time ? new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : shift.scheduled_end_time;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 p-4 transition-all ${
        isOver 
          ? 'border-blue-500 bg-blue-50 shadow-lg' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isTask ? 'bg-orange-100' : 'bg-blue-100'}`}>
            {isTask ? <FiTruck className="text-orange-600" /> : <FiCalendar className="text-blue-600" />}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{shift.position_title || shift.title || 'Shift'}</h4>
            <p className="text-xs text-gray-500">{shift.workplace_name || shift.client_name}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${isTask ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
          {isTask ? 'Task' : shift.shift_type === 'continental' ? '12h' : 'Shift'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <FiClock size={14} />
        <span>{startTime} - {endTime}</span>
        {shift.shift_date && (
          <span className="text-gray-400">• {new Date(shift.shift_date).toLocaleDateString()}</span>
        )}
      </div>

      {/* Assigned Workers */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500 mb-2">
          Assigned ({assignedWorkers.length}/{shift.positions_available || shift.workers_needed || 1})
        </p>
        {assignedWorkers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assignedWorkers.map((worker) => (
              <div 
                key={worker.worker_id || worker.user_id} 
                className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs"
              >
                <span>{worker.full_name || worker.worker_name}</span>
                <button
                  onClick={() => onRemoveWorker(shift, worker)}
                  className="hover:bg-green-200 rounded-full p-0.5"
                >
                  <FiX size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={`border-2 border-dashed rounded-lg p-3 text-center text-sm ${
            isOver ? 'border-blue-400 bg-blue-100 text-blue-600' : 'border-gray-300 text-gray-400'
          }`}>
            {isOver ? 'Release to assign' : 'Drop worker here'}
          </div>
        )}
      </div>
    </div>
  );
};

// Workforce Sort Controls Component
const WorkforceSortControls = ({ workers, onSortedWorkers }) => {
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    const sorted = [...workers].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = (a.full_name || '').localeCompare(b.full_name || '');
      } else if (sortBy === 'role') {
        comparison = (a.position_title || '').localeCompare(b.position_title || '');
      } else if (sortBy === 'hours') {
        comparison = (a.week_kpis?.total_hours || 0) - (b.week_kpis?.total_hours || 0);
      } else if (sortBy === 'status') {
        // Sort by availability (available first)
        const aHours = a.week_kpis?.total_hours || 0;
        const bHours = b.week_kpis?.total_hours || 0;
        comparison = aHours - bHours;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    onSortedWorkers(sorted);
  }, [workers, sortBy, sortOrder, onSortedWorkers]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="text-xs border-0 bg-transparent focus:ring-0 text-gray-700 pr-6"
      >
        <option value="name">Sort by Name</option>
        <option value="role">Sort by Role</option>
        <option value="hours">Sort by Hours</option>
        <option value="status">Sort by Availability</option>
      </select>
      <button
        onClick={toggleSortOrder}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
      >
        {sortOrder === 'asc' ? (
          <FiChevronUp size={14} className="text-gray-600" />
        ) : (
          <FiChevronDown size={14} className="text-gray-600" />
        )}
      </button>
    </div>
  );
};

// Main Drag & Drop Assignment Component
const DragDropAssignment = ({ workers = [], shifts = [], tasks = [], onAssign, onUnassign, loading, onRefresh }) => {
  const theme = useTheme();
  const [activeWorker, setActiveWorker] = useState(null);
  const [overId, setOverId] = useState(null);
  const [sortedWorkers, setSortedWorkers] = useState([]);
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event) => {
    const { active } = event;
    const worker = workers.find(w => w.user_id === active.id);
    setActiveWorker(worker);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    setOverId(over?.id || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const worker = workers.find(w => w.user_id === active.id);
      const targetShift = shifts.find(s => s.shift_id === over.id);
      const targetTask = tasks.find(t => t.task_id === over.id);
      
      if (worker && (targetShift || targetTask)) {
        onAssign(worker, targetShift || targetTask);
      }
    }
    
    setActiveWorker(null);
    setOverId(null);
  };

  const handleDragCancel = () => {
    setActiveWorker(null);
    setOverId(null);
  };

  const handleAutoAssignComplete = () => {
    // Refresh the data after auto-assign
    if (onRefresh) {
      onRefresh();
    }
  };

  // Combine shifts and tasks
  const allWork = [
    ...shifts.map(s => ({ ...s, _type: 'shift' })),
    ...tasks.map(t => ({ ...t, _type: 'task' }))
  ];

  // Get assigned workers for a shift/task
  const getAssignedWorkers = (item) => {
    if (item._type === 'task') {
      return item.worker_id ? [{ worker_id: item.worker_id, full_name: item.worker_name || 'Assigned' }] : [];
    }
    return item.assigned_workers || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workforce Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-xl p-4 sticky top-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FiUser className="text-blue-500" />
              Workforce ({workers.length})
            </h3>
            
            {/* Sort Controls */}
            <WorkforceSortControls workers={workers} onSortedWorkers={setSortedWorkers} />
            
            {workers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No workers available</p>
            ) : (
              <div className="space-y-2 max-h-[550px] overflow-y-auto pr-2 mt-3">
                {(sortedWorkers.length > 0 ? sortedWorkers : workers).map((worker) => (
                  <DraggableWorker key={worker.user_id} worker={worker} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Shifts & Tasks Panel */}
        <div className="lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiCalendar className="text-orange-500" />
            Shifts & Tasks ({allWork.length})
          </h3>
          
          {allWork.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FiCalendar size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No shifts or tasks to assign</p>
              <p className="text-sm text-gray-400 mt-1">Create shifts in Calendar Scheduling first</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allWork.map((item) => (
                <DroppableShift
                  key={item.shift_id || item.task_id}
                  shift={item}
                  isOver={overId === (item.shift_id || item.task_id)}
                  assignedWorkers={getAssignedWorkers(item)}
                  onRemoveWorker={onUnassign}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeWorker ? <DraggableWorker worker={activeWorker} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DragDropAssignment;
