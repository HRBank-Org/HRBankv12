import React from 'react';
import { FiX, FiDownload, FiFileText } from 'react-icons/fi';

// Sortable Table Header Component
// Multi-column sortable header - supports Shift+Click for secondary sorting
export const SortableHeader = ({ label, sortKey, currentSort, onSort, align = 'left' }) => {
  // currentSort is now an array: [{ key, direction }, { key, direction }, ...]
  const sortArray = Array.isArray(currentSort) ? currentSort : [currentSort];
  const sortIndex = sortArray.findIndex(s => s.key === sortKey);
  const isActive = sortIndex !== -1;
  const direction = isActive ? sortArray[sortIndex].direction : null;
  const sortPriority = isActive ? sortIndex + 1 : null;
  
  return (
    <th 
      className={`px-4 py-3 text-xs font-medium uppercase cursor-pointer hover:bg-gray-100 select-none transition-colors ${
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
      } ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
      onClick={(e) => onSort(sortKey, e.shiftKey)}
      title={isActive ? `Sort priority: ${sortPriority}. Shift+Click to add secondary sort` : 'Click to sort, Shift+Click to add to sort'}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}>
        {label}
        <span className={isActive ? 'text-blue-500' : 'text-gray-400'}>
          {isActive ? (direction === 'asc' ? '↑' : '↓') : '↕'}
        </span>
        {sortPriority && sortArray.length > 1 && (
          <span className="ml-0.5 w-4 h-4 bg-blue-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {sortPriority}
          </span>
        )}
      </div>
    </th>
  );
};

// Records Table Component with Multi-Column Sortable Columns
const RecordsTable = ({ activeWorkers, pastWorkers, sortConfig, setSortConfig, onExport, onDownloadWorker, theme }) => {
  // Merge active and past workers
  const allRecords = [
    ...activeWorkers.map(w => ({ ...w, recordStatus: 'active' })),
    ...pastWorkers.map(w => ({ ...w, recordStatus: w.termination_reason?.includes('laid') ? 'laid_off' : 'terminated' }))
  ];

  // Ensure sortConfig is always an array for multi-column sorting
  const sortArray = Array.isArray(sortConfig) ? sortConfig : [sortConfig];

  // Multi-column sort function - Shift+Click adds secondary sort
  const handleSort = (key, isShiftKey) => {
    setSortConfig(prev => {
      const prevArray = Array.isArray(prev) ? prev : [prev];
      const existingIndex = prevArray.findIndex(s => s.key === key);
      
      if (isShiftKey) {
        // Shift+Click: Add to sort or toggle direction
        if (existingIndex !== -1) {
          // Toggle direction of existing sort
          const updated = [...prevArray];
          updated[existingIndex] = {
            key,
            direction: updated[existingIndex].direction === 'asc' ? 'desc' : 'asc'
          };
          return updated;
        } else {
          // Add new sort criteria (max 3 columns)
          if (prevArray.length >= 3) {
            return [...prevArray.slice(1), { key, direction: 'asc' }];
          }
          return [...prevArray, { key, direction: 'asc' }];
        }
      } else {
        // Normal click: Replace all sorts with this one
        if (existingIndex !== -1 && prevArray.length === 1) {
          // Toggle direction if already the only sort
          return [{ key, direction: prevArray[0].direction === 'asc' ? 'desc' : 'asc' }];
        }
        return [{ key, direction: 'asc' }];
      }
    });
  };

  // Clear all sorts
  const handleClearSort = () => {
    setSortConfig([{ key: 'full_name', direction: 'asc' }]);
  };

  // Get comparison value for a key
  const getCompareValue = (record, key) => {
    switch (key) {
      case 'full_name':
        return record.full_name || '';
      case 'position_title':
        return record.position_title || '';
      case 'employment_start_date':
        return new Date(record.employment_start_date || 0).getTime();
      case 'employment_end_date':
        return new Date(record.employment_end_date || 0).getTime();
      case 'total_shifts_completed':
        return record.total_shifts_completed || 0;
      case 'total_hours_worked':
        return record.total_hours_worked || 0;
      case 'total_pay':
        return (record.total_hours_worked || 0) * 18;
      case 'recordStatus':
        const statusOrder = { active: 0, laid_off: 1, terminated: 2 };
        return statusOrder[record.recordStatus] || 0;
      default:
        return 0;
    }
  };

  // Apply multi-column sorting
  const sortedRecords = [...allRecords].sort((a, b) => {
    for (const { key, direction } of sortArray) {
      const aVal = getCompareValue(a, key);
      const bVal = getCompareValue(b, key);
      
      let comparison = 0;
      if (typeof aVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else {
        comparison = aVal - bVal;
      }
      
      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header with Export and Sort Info */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Employment Records</h3>
          <p className="text-xs text-gray-500">
            {allRecords.length} total records • Click headers to sort • <span className="text-blue-600">Shift+Click</span> for multi-column sort
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {sortArray.length > 1 && (
            <button
              onClick={handleClearSort}
              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
              title="Clear multi-column sort"
            >
              <FiX size={12} /> Clear Sort
            </button>
          )}
          <button
            onClick={() => onExport('csv')}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1"
          >
            <FiDownload size={14} /> CSV
          </button>
          <button
            onClick={() => onExport('pdf')}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1"
          >
            <FiDownload size={14} /> PDF
          </button>
        </div>
      </div>
      
      {/* Table with fixed header */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <SortableHeader label="Worker" sortKey="full_name" currentSort={sortConfig} onSort={handleSort} />
              <SortableHeader label="Role" sortKey="position_title" currentSort={sortConfig} onSort={handleSort} />
              <SortableHeader label="Start Date" sortKey="employment_start_date" currentSort={sortConfig} onSort={handleSort} />
              <SortableHeader label="End Date" sortKey="employment_end_date" currentSort={sortConfig} onSort={handleSort} />
              <SortableHeader label="Shifts" sortKey="total_shifts_completed" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortableHeader label="Hours" sortKey="total_hours_worked" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortableHeader label="Total Pay" sortKey="total_pay" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortableHeader label="Status" sortKey="recordStatus" currentSort={sortConfig} onSort={handleSort} />
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRecords.map((record) => (
              <tr key={record.user_id} className={`hover:bg-gray-50 ${record.recordStatus !== 'active' ? 'bg-gray-50/50' : ''}`}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      record.recordStatus === 'active' ? 'bg-gray-200 text-gray-600' : 'bg-gray-300 text-gray-500'
                    }`}>
                      {record.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{record.full_name}</p>
                      <p className="text-xs text-gray-500">{record.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.position_title}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {record.employment_start_date ? new Date(record.employment_start_date).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {record.employment_end_date ? new Date(record.employment_end_date).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                  {record.total_shifts_completed || 0}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                  {record.total_hours_worked?.toFixed(1) || 0}h
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-center" style={{ color: theme.primaryColor }}>
                  ${((record.total_hours_worked || 0) * 18).toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    record.recordStatus === 'active' ? 'bg-green-100 text-green-800' :
                    record.recordStatus === 'laid_off' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {record.recordStatus === 'active' ? 'Active' : 
                     record.recordStatus === 'laid_off' ? 'Laid Off' : 'Terminated'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button
                    onClick={() => onDownloadWorker(record)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Download record"
                  >
                    <FiDownload size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {allRecords.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          <FiFileText size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No employment records yet</p>
        </div>
      )}
    </div>
  );
};

export default RecordsTable;
