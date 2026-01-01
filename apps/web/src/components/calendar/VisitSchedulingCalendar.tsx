'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  getDay,
  setHours,
  setMinutes,
  parseISO
} from 'date-fns';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  ArrowLeft2,
  ArrowRight2,
  Calendar1,
  Category,
  Grid6,
  TableDocument,
  Add,
  Warning2,
  CloseCircle,
  TickCircle,
  Clock,
  Location,
  User,
  DocumentText
} from 'iconsax-react';
import MainCard from 'components/MainCard';
import {
  ScheduledVisit,
  CalendarEvent,
  SchedulingConflict,
  getScheduledVisits,
  getConflicts,
  updateScheduledVisit,
  rescheduleVisit,
  getVisitTypeColor,
  getVisitTypeLabel,
  getVisitStatusLabel,
  visitToCalendarEvent,
  formatTime,
  VISIT_TYPES,
  VISIT_STATUSES
} from '../../api/scheduling';
import VisitFormDialog from './VisitFormDialog';
import VisitDetailPopover from './VisitDetailPopover';

// ==============================|| TYPES ||============================== //

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

interface VisitSchedulingCalendarProps {
  staffId?: number;
  patientId?: number;
  onVisitCreated?: (visit: ScheduledVisit) => void;
  onVisitUpdated?: (visit: ScheduledVisit) => void;
}

// ==============================|| DRAG ITEM TYPE ||============================== //

const ItemTypes = {
  VISIT: 'visit'
};

interface DragItem {
  type: string;
  event: CalendarEvent;
}

// ==============================|| DRAGGABLE VISIT EVENT ||============================== //

interface DraggableEventProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent, anchorEl: HTMLElement) => void;
  view: CalendarView;
}

const DraggableEvent = ({ event, onClick, view }: DraggableEventProps) => {
  const theme = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.VISIT,
    item: { type: ItemTypes.VISIT, event },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: () => {
      // Only allow dragging for SCHEDULED or CONFIRMED visits
      return ['SCHEDULED', 'CONFIRMED'].includes(event.visit.visit_status);
    }
  }));

  drag(ref);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onClick(event, e.currentTarget);
  };

  const isCompact = view === 'month';
  const showTime = view !== 'month';

  return (
    <Box
      ref={ref}
      onClick={handleClick}
      sx={{
        backgroundColor: event.color,
        color: '#fff',
        borderRadius: 1,
        px: 1,
        py: 0.5,
        mb: 0.5,
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: isDragging ? 0.5 : 1,
        fontSize: '0.75rem',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        position: 'relative',
        border: event.hasConflict ? `2px solid ${theme.palette.error.main}` : 'none',
        '&:hover': {
          filter: 'brightness(0.9)',
          boxShadow: theme.shadows[2]
        }
      }}
    >
      {event.hasConflict && (
        <Tooltip title="Scheduling Conflict">
          <Warning2
            size={14}
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              color: theme.palette.error.main
            }}
          />
        </Tooltip>
      )}
      <Stack direction="row" alignItems="center" spacing={0.5}>
        {showTime && (
          <Typography variant="caption" fontWeight={600}>
            {formatTime(event.visit.scheduled_start_time)}
          </Typography>
        )}
        <Typography
          variant="caption"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {isCompact ? getVisitTypeLabel(event.visit.visit_type).substring(0, 2) : event.title}
        </Typography>
      </Stack>
    </Box>
  );
};

// ==============================|| DROPPABLE DAY CELL ||============================== //

interface DroppableDayCellProps {
  date: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  onDrop: (event: CalendarEvent, date: Date) => void;
  onEventClick: (event: CalendarEvent, anchorEl: HTMLElement) => void;
  onDayClick: (date: Date) => void;
  view: CalendarView;
}

const DroppableDayCell = ({
  date,
  events,
  isCurrentMonth,
  onDrop,
  onEventClick,
  onDayClick,
  view
}: DroppableDayCellProps) => {
  const theme = useTheme();

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.VISIT,
    drop: (item: DragItem) => {
      onDrop(item.event, date);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  }));

  const dayEvents = events.filter((event) => isSameDay(event.start, date));
  const isActive = isOver && canDrop;

  return (
    <Box
      ref={drop}
      onClick={() => onDayClick(date)}
      sx={{
        minHeight: view === 'month' ? 100 : 60,
        p: 0.5,
        backgroundColor: isActive
          ? alpha(theme.palette.primary.main, 0.1)
          : isToday(date)
            ? alpha(theme.palette.primary.main, 0.05)
            : 'transparent',
        border: `1px solid ${theme.palette.divider}`,
        borderTop: 'none',
        borderLeft: 'none',
        cursor: 'pointer',
        opacity: isCurrentMonth ? 1 : 0.4,
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.08)
        }
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: isToday(date) ? 700 : 400,
          color: isToday(date) ? 'primary.main' : 'text.primary',
          mb: 0.5
        }}
      >
        {format(date, 'd')}
      </Typography>
      <Stack spacing={0.5}>
        {dayEvents.slice(0, 3).map((event) => (
          <DraggableEvent key={event.id} event={event} onClick={onEventClick} view={view} />
        ))}
        {dayEvents.length > 3 && (
          <Typography variant="caption" color="text.secondary">
            +{dayEvents.length - 3} more
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

// ==============================|| TIME SLOT ||============================== //

interface TimeSlotProps {
  date: Date;
  hour: number;
  events: CalendarEvent[];
  onDrop: (event: CalendarEvent, date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent, anchorEl: HTMLElement) => void;
  onSlotClick: (date: Date, hour: number) => void;
}

const TimeSlot = ({ date, hour, events, onDrop, onEventClick, onSlotClick }: TimeSlotProps) => {
  const theme = useTheme();

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.VISIT,
    drop: (item: DragItem) => {
      onDrop(item.event, date, hour);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  }));

  const slotEvents = events.filter((event) => {
    if (!isSameDay(event.start, date)) return false;
    const eventHour = event.start.getHours();
    return eventHour === hour;
  });

  const isActive = isOver && canDrop;

  return (
    <Box
      ref={drop}
      onClick={() => onSlotClick(date, hour)}
      sx={{
        height: 60,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
        cursor: 'pointer',
        position: 'relative',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.05)
        }
      }}
    >
      {slotEvents.map((event) => {
        const startMinutes = event.start.getMinutes();
        const duration = (event.end.getTime() - event.start.getTime()) / 60000;
        const height = Math.min((duration / 60) * 60, 120); // Max 2 hours visual

        return (
          <Box
            key={event.id}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(event, e.currentTarget as HTMLElement);
            }}
            sx={{
              position: 'absolute',
              top: (startMinutes / 60) * 60,
              left: 4,
              right: 4,
              height: height,
              backgroundColor: event.color,
              color: '#fff',
              borderRadius: 1,
              px: 1,
              py: 0.5,
              cursor: 'pointer',
              overflow: 'hidden',
              border: event.hasConflict ? `2px solid ${theme.palette.error.main}` : 'none',
              zIndex: 1,
              '&:hover': {
                filter: 'brightness(0.9)',
                boxShadow: theme.shadows[2]
              }
            }}
          >
            <Typography variant="caption" fontWeight={600}>
              {formatTime(event.visit.scheduled_start_time)}
            </Typography>
            <Typography variant="caption" sx={{ ml: 0.5 }}>
              {event.visit.patient_name || `Patient #${event.visit.patient_id}`}
            </Typography>
            {event.hasConflict && (
              <Warning2 size={12} style={{ marginLeft: 4, color: '#fff' }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

// ==============================|| MAIN CALENDAR COMPONENT ||============================== //

const VisitSchedulingCalendar = ({
  staffId,
  patientId,
  onVisitCreated,
  onVisitUpdated
}: VisitSchedulingCalendarProps) => {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<ScheduledVisit | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  // Popover state
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverEvent, setPopoverEvent] = useState<CalendarEvent | null>(null);

  // Filter menu state
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [selectedVisitTypes, setSelectedVisitTypes] = useState<string[]>([]);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    switch (view) {
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 0 }),
          end: endOfWeek(currentDate, { weekStartsOn: 0 })
        };
      case 'day':
        return {
          start: currentDate,
          end: currentDate
        };
      default:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
    }
  }, [currentDate, view]);

  // Fetch visits and conflicts
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(subMonths(dateRange.start, 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(addMonths(dateRange.end, 1)), 'yyyy-MM-dd');

      const [visitsResponse, conflictsResponse] = await Promise.all([
        getScheduledVisits({
          staff_id: staffId,
          patient_id: patientId,
          date_from: startDate,
          date_to: endDate
        }),
        getConflicts({
          staff_id: staffId,
          patient_id: patientId,
          date_from: startDate,
          date_to: endDate,
          conflict_status: 'DETECTED' as any
        })
      ]);

      setVisits(visitsResponse.data || []);
      setConflicts(conflictsResponse.data || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setVisits([]);
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, staffId, patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert visits to calendar events with conflict info
  useEffect(() => {
    const conflictVisitIds = new Set<number>();
    conflicts.forEach((c) => {
      conflictVisitIds.add(c.visit_id_1);
      conflictVisitIds.add(c.visit_id_2);
    });

    let filteredVisits = visits;
    if (selectedVisitTypes.length > 0) {
      filteredVisits = visits.filter((v) => selectedVisitTypes.includes(v.visit_type));
    }

    const calendarEvents = filteredVisits.map((visit) => {
      const event = visitToCalendarEvent(visit);
      event.hasConflict = conflictVisitIds.has(visit.id);
      if (event.hasConflict) {
        event.conflictInfo = conflicts.find(
          (c) => c.visit_id_1 === visit.id || c.visit_id_2 === visit.id
        );
      }
      return event;
    });

    setEvents(calendarEvents);
  }, [visits, conflicts, selectedVisitTypes]);

  // Navigation handlers
  const handlePrevious = () => {
    switch (view) {
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, -1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Drag and drop handler
  const handleEventDrop = async (event: CalendarEvent, newDate: Date, newHour?: number) => {
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    let newStartTime = event.visit.scheduled_start_time;

    if (newHour !== undefined) {
      const minutes = event.start.getMinutes();
      newStartTime = `${String(newHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    }

    try {
      await rescheduleVisit(event.id, newDateStr, newStartTime);
      fetchData();
      if (onVisitUpdated) {
        onVisitUpdated({
          ...event.visit,
          scheduled_date: newDateStr,
          scheduled_start_time: newStartTime
        });
      }
    } catch (error) {
      console.error('Error rescheduling visit:', error);
    }
  };

  // Event click handler
  const handleEventClick = (event: CalendarEvent, anchorEl: HTMLElement) => {
    setPopoverEvent(event);
    setPopoverAnchor(anchorEl);
  };

  // Day/Slot click handler
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedHour(9); // Default to 9 AM
    setSelectedVisit(null);
    setFormDialogOpen(true);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setSelectedVisit(null);
    setFormDialogOpen(true);
  };

  // Edit visit handler
  const handleEditVisit = (visit: ScheduledVisit) => {
    setSelectedVisit(visit);
    setSelectedDate(parseISO(visit.scheduled_date));
    const timeParts = visit.scheduled_start_time.split(':');
    setSelectedHour(parseInt(timeParts[0], 10));
    setPopoverAnchor(null);
    setFormDialogOpen(true);
  };

  // Form dialog handlers
  const handleFormClose = () => {
    setFormDialogOpen(false);
    setSelectedVisit(null);
    setSelectedDate(null);
    setSelectedHour(null);
  };

  const handleFormSave = (visit: ScheduledVisit) => {
    fetchData();
    handleFormClose();
    if (selectedVisit) {
      onVisitUpdated?.(visit);
    } else {
      onVisitCreated?.(visit);
    }
  };

  // Filter handlers
  const handleFilterClick = (e: React.MouseEvent<HTMLElement>) => {
    setFilterAnchor(e.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchor(null);
  };

  const toggleVisitTypeFilter = (visitType: string) => {
    setSelectedVisitTypes((prev) =>
      prev.includes(visitType) ? prev.filter((t) => t !== visitType) : [...prev, visitType]
    );
  };

  // Render calendar grid
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <Box>
        {/* Weekday headers */}
        <Grid container sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Grid item xs key={day} sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>
        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <Grid container key={weekIndex}>
            {week.map((day) => (
              <Grid item xs key={day.toISOString()}>
                <DroppableDayCell
                  date={day}
                  events={events}
                  isCurrentMonth={isSameMonth(day, currentDate)}
                  onDrop={(event, date) => handleEventDrop(event, date)}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                  view={view}
                />
              </Grid>
            ))}
          </Grid>
        ))}
      </Box>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate, { weekStartsOn: 0 })
    });
    const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Grid container>
          {/* Time column */}
          <Grid item sx={{ width: 60, flexShrink: 0 }}>
            <Box sx={{ height: 40, borderBottom: `1px solid ${theme.palette.divider}` }} />
            {hours.map((hour) => (
              <Box
                key={hour}
                sx={{
                  height: 60,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  pr: 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end'
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {format(setHours(new Date(), hour), 'h a')}
                </Typography>
              </Box>
            ))}
          </Grid>
          {/* Day columns */}
          {days.map((day) => (
            <Grid item xs key={day.toISOString()} sx={{ minWidth: 100 }}>
              <Box
                sx={{
                  height: 40,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  borderLeft: `1px solid ${theme.palette.divider}`,
                  p: 0.5,
                  textAlign: 'center',
                  backgroundColor: isToday(day) ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {format(day, 'EEE')}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={isToday(day) ? 700 : 400}
                  color={isToday(day) ? 'primary.main' : 'text.primary'}
                >
                  {format(day, 'd')}
                </Typography>
              </Box>
              {hours.map((hour) => (
                <Box key={hour} sx={{ borderLeft: `1px solid ${theme.palette.divider}` }}>
                  <TimeSlot
                    date={day}
                    hour={hour}
                    events={events}
                    onDrop={(event, date, h) => handleEventDrop(event, date, h)}
                    onEventClick={handleEventClick}
                    onSlotClick={handleSlotClick}
                  />
                </Box>
              ))}
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

    return (
      <Box>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h5">{format(currentDate, 'EEEE, MMMM d, yyyy')}</Typography>
        </Box>
        <Grid container>
          <Grid item sx={{ width: 80, flexShrink: 0 }}>
            {hours.map((hour) => (
              <Box
                key={hour}
                sx={{
                  height: 60,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  pr: 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {format(setHours(new Date(), hour), 'h:mm a')}
                </Typography>
              </Box>
            ))}
          </Grid>
          <Grid item xs>
            {hours.map((hour) => (
              <TimeSlot
                key={hour}
                date={currentDate}
                hour={hour}
                events={events}
                onDrop={(event, date, h) => handleEventDrop(event, date, h)}
                onEventClick={handleEventClick}
                onSlotClick={handleSlotClick}
              />
            ))}
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderAgendaView = () => {
    const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
    const groupedEvents: Record<string, CalendarEvent[]> = {};

    sortedEvents.forEach((event) => {
      const dateKey = format(event.start, 'yyyy-MM-dd');
      if (!groupedEvents[dateKey]) {
        groupedEvents[dateKey] = [];
      }
      groupedEvents[dateKey].push(event);
    });

    return (
      <Box>
        {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
          <Box key={dateKey} sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, px: 2 }}>
              {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
            </Typography>
            {dayEvents.map((event) => (
              <Box
                key={event.id}
                onClick={(e) => handleEventClick(event, e.currentTarget as HTMLElement)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1.5,
                  mx: 2,
                  mb: 1,
                  borderRadius: 1,
                  backgroundColor: alpha(event.color, 0.1),
                  borderLeft: `4px solid ${event.color}`,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: alpha(event.color, 0.2)
                  }
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" fontWeight={600}>
                      {formatTime(event.visit.scheduled_start_time)}
                      {event.visit.scheduled_end_time && ` - ${formatTime(event.visit.scheduled_end_time)}`}
                    </Typography>
                    <Chip
                      label={getVisitTypeLabel(event.visit.visit_type)}
                      size="small"
                      sx={{ backgroundColor: event.color, color: '#fff' }}
                    />
                    {event.hasConflict && (
                      <Chip
                        icon={<Warning2 size={14} />}
                        label="Conflict"
                        size="small"
                        color="error"
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {event.visit.patient_name || `Patient #${event.visit.patient_id}`}
                    {event.visit.staff_name && ` - ${event.visit.staff_name}`}
                  </Typography>
                </Box>
                <Chip
                  label={getVisitStatusLabel(event.visit.visit_status)}
                  size="small"
                  color={
                    event.visit.visit_status === 'COMPLETED'
                      ? 'success'
                      : event.visit.visit_status === 'CANCELLED'
                        ? 'error'
                        : 'default'
                  }
                />
              </Box>
            ))}
          </Box>
        ))}
        {Object.keys(groupedEvents).length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No visits scheduled</Typography>
          </Box>
        )}
      </Box>
    );
  };

  const conflictCount = conflicts.filter((c) => c.conflict_status !== 'RESOLVED').length;

  return (
    <DndProvider backend={HTML5Backend}>
      <MainCard>
        {/* Toolbar */}
        <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Grid item>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button variant="outlined" onClick={handleToday} size="small">
                Today
              </Button>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton onClick={handlePrevious} size="small">
                  <ArrowLeft2 />
                </IconButton>
                <Typography variant="h5" sx={{ minWidth: 200, textAlign: 'center' }}>
                  {view === 'month' && format(currentDate, 'MMMM yyyy')}
                  {view === 'week' &&
                    `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`}
                  {view === 'day' && format(currentDate, 'MMMM d, yyyy')}
                  {view === 'agenda' && format(currentDate, 'MMMM yyyy')}
                </Typography>
                <IconButton onClick={handleNext} size="small">
                  <ArrowRight2 />
                </IconButton>
              </Stack>
            </Stack>
          </Grid>
          <Grid item>
            <Stack direction="row" alignItems="center" spacing={1}>
              {conflictCount > 0 && (
                <Chip
                  icon={<Warning2 size={16} />}
                  label={`${conflictCount} Conflict${conflictCount > 1 ? 's' : ''}`}
                  color="error"
                  size="small"
                />
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={handleFilterClick}
                startIcon={
                  selectedVisitTypes.length > 0 ? (
                    <Badge badgeContent={selectedVisitTypes.length} color="primary">
                      <Category size={18} />
                    </Badge>
                  ) : (
                    <Category size={18} />
                  )
                }
              >
                Filter
              </Button>
              <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                <Tooltip title="Month View">
                  <IconButton
                    size="small"
                    onClick={() => setView('month')}
                    color={view === 'month' ? 'primary' : 'default'}
                  >
                    <Category size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Week View">
                  <IconButton
                    size="small"
                    onClick={() => setView('week')}
                    color={view === 'week' ? 'primary' : 'default'}
                  >
                    <Grid6 size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Day View">
                  <IconButton
                    size="small"
                    onClick={() => setView('day')}
                    color={view === 'day' ? 'primary' : 'default'}
                  >
                    <Calendar1 size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Agenda View">
                  <IconButton
                    size="small"
                    onClick={() => setView('agenda')}
                    color={view === 'agenda' ? 'primary' : 'default'}
                  >
                    <TableDocument size={18} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add size={18} />}
                onClick={() => {
                  setSelectedDate(new Date());
                  setSelectedHour(9);
                  setSelectedVisit(null);
                  setFormDialogOpen(true);
                }}
              >
                New Visit
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {/* Legend */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {VISIT_TYPES.slice(0, 6).map((type) => (
            <Chip
              key={type.value}
              label={type.label}
              size="small"
              sx={{
                backgroundColor: type.color,
                color: '#fff',
                opacity: selectedVisitTypes.length === 0 || selectedVisitTypes.includes(type.value) ? 1 : 0.3
              }}
              onClick={() => toggleVisitTypeFilter(type.value)}
            />
          ))}
        </Stack>

        {/* Calendar Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
            {view === 'agenda' && renderAgendaView()}
          </Box>
        )}

        {/* Filter Menu */}
        <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={handleFilterClose}>
          <MenuItem disabled>
            <Typography variant="subtitle2">Filter by Visit Type</Typography>
          </MenuItem>
          <Divider />
          {VISIT_TYPES.map((type) => (
            <MenuItem key={type.value} onClick={() => toggleVisitTypeFilter(type.value)}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: 0.5,
                  backgroundColor: type.color,
                  mr: 1
                }}
              />
              <Typography sx={{ flex: 1 }}>{type.label}</Typography>
              {selectedVisitTypes.includes(type.value) && <TickCircle size={16} color={theme.palette.primary.main} />}
            </MenuItem>
          ))}
          {selectedVisitTypes.length > 0 && (
            <>
              <Divider />
              <MenuItem onClick={() => setSelectedVisitTypes([])}>
                <Typography color="primary">Clear Filters</Typography>
              </MenuItem>
            </>
          )}
        </Menu>

        {/* Visit Form Dialog */}
        <VisitFormDialog
          open={formDialogOpen}
          onClose={handleFormClose}
          onSave={handleFormSave}
          visit={selectedVisit}
          initialDate={selectedDate}
          initialHour={selectedHour}
          staffId={staffId}
          patientId={patientId}
        />

        {/* Visit Detail Popover */}
        <VisitDetailPopover
          anchorEl={popoverAnchor}
          event={popoverEvent}
          onClose={() => {
            setPopoverAnchor(null);
            setPopoverEvent(null);
          }}
          onEdit={handleEditVisit}
          onRefresh={fetchData}
        />
      </MainCard>
    </DndProvider>
  );
};

export default VisitSchedulingCalendar;
