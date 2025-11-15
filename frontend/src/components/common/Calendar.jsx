import React, { useState, useCallback } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendar.css';

const localizer = momentLocalizer(moment);

const Calendar = ({
  events = [],
  onSelectSlot,
  onSelectEvent,
  onEventDrop,
  onEventResize,
  view = 'week',
  onViewChange,
  date,
  onNavigate,
  selectable = true,
  editable = false,
  components,
  eventPropGetter,
  slotPropGetter,
  step = 60,
  timeslots = 1,
  min,
  max,
  ...props
}) => {
  const [currentView, setCurrentView] = useState(view);
  const [currentDate, setCurrentDate] = useState(date || new Date());

  const handleViewChange = useCallback((newView) => {
    setCurrentView(newView);
    onViewChange?.(newView);
  }, [onViewChange]);

  const handleNavigate = useCallback((newDate) => {
    setCurrentDate(newDate);
    onNavigate?.(newDate);
  }, [onNavigate]);

  const handleSelectSlot = useCallback((slotInfo) => {
    onSelectSlot?.(slotInfo);
  }, [onSelectSlot]);

  const handleSelectEvent = useCallback((event) => {
    onSelectEvent?.(event);
  }, [onSelectEvent]);

  const handleEventDrop = useCallback((data) => {
    if (editable && onEventDrop) {
      onEventDrop(data);
    }
  }, [editable, onEventDrop]);

  const handleEventResize = useCallback((data) => {
    if (editable && onEventResize) {
      onEventResize(data);
    }
  }, [editable, onEventResize]);

  // Default event styling
  const defaultEventPropGetter = useCallback((event) => {
    const style = {
      backgroundColor: event.color || '#3174ad',
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block'
    };

    if (event.type === 'availability') {
      style.backgroundColor = '#10B981'; // Green for availability
    } else if (event.type === 'shift') {
      style.backgroundColor = '#3B82F6'; // Blue for shifts
    } else if (event.type === 'blackout') {
      style.backgroundColor = '#EF4444'; // Red for blackout
      style.opacity = 0.5;
    }

    return { style };
  }, []);

  return (
    <div className="calendar-container" style={{ height: '700px' }}>
      <BigCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={currentView}
        onView={handleViewChange}
        date={currentDate}
        onNavigate={handleNavigate}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        onEventDrop={editable ? handleEventDrop : undefined}
        onEventResize={editable ? handleEventResize : undefined}
        selectable={selectable}
        resizable={editable}
        eventPropGetter={eventPropGetter || defaultEventPropGetter}
        slotPropGetter={slotPropGetter}
        components={components}
        step={step}
        timeslots={timeslots}
        min={min || new Date(2024, 0, 1, 6, 0, 0)} // 6 AM
        max={max || new Date(2024, 0, 1, 22, 0, 0)} // 10 PM
        popup
        {...props}
      />
    </div>
  );
};

export default Calendar;