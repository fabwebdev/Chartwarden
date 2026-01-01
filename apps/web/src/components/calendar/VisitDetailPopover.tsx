'use client';

import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';
import { format, parseISO } from 'date-fns';
import Swal from 'sweetalert2';
import {
  Calendar,
  Clock,
  User,
  Location,
  Edit,
  Trash,
  TickCircle,
  CloseCircle,
  Warning2,
  DocumentText
} from 'iconsax-react';
import {
  CalendarEvent,
  ScheduledVisit,
  cancelVisit,
  confirmVisit,
  getVisitTypeLabel,
  getVisitTypeColor,
  getVisitStatusLabel,
  formatTime
} from '../../api/scheduling';

// ==============================|| TYPES ||============================== //

interface VisitDetailPopoverProps {
  anchorEl: HTMLElement | null;
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (visit: ScheduledVisit) => void;
  onRefresh: () => void;
}

// ==============================|| VISIT DETAIL POPOVER ||============================== //

const VisitDetailPopover = ({ anchorEl, event, onClose, onEdit, onRefresh }: VisitDetailPopoverProps) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const open = Boolean(anchorEl) && Boolean(event);

  if (!event) return null;

  const { visit } = event;
  const visitColor = getVisitTypeColor(visit.visit_type);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await confirmVisit(visit.id);
      Swal.fire({
        icon: 'success',
        title: 'Visit Confirmed',
        text: 'The visit has been confirmed.',
        timer: 2000,
        showConfirmButton: false
      });
      onRefresh();
      onClose();
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to confirm the visit.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: 'Cancel Visit?',
      text: 'Please provide a reason for cancellation:',
      input: 'textarea',
      inputPlaceholder: 'Enter cancellation reason...',
      showCancelButton: true,
      confirmButtonText: 'Cancel Visit',
      confirmButtonColor: theme.palette.error.main,
      cancelButtonText: 'Go Back',
      inputValidator: (value) => {
        if (!value) {
          return 'Please provide a cancellation reason';
        }
        return null;
      }
    });

    if (result.isConfirmed && result.value) {
      setLoading(true);
      try {
        await cancelVisit(visit.id, result.value);
        Swal.fire({
          icon: 'success',
          title: 'Visit Cancelled',
          text: 'The visit has been cancelled.',
          timer: 2000,
          showConfirmButton: false
        });
        onRefresh();
        onClose();
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to cancel the visit.'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'info';
      case 'CONFIRMED':
        return 'primary';
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
      case 'MISSED':
        return 'error';
      default:
        return 'default';
    }
  };

  const canEdit = ['SCHEDULED', 'CONFIRMED'].includes(visit.visit_status);
  const canConfirm = visit.visit_status === 'SCHEDULED';
  const canCancel = ['SCHEDULED', 'CONFIRMED'].includes(visit.visit_status);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center'
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center'
      }}
      slotProps={{
        paper: {
          sx: {
            width: 320,
            borderRadius: 2,
            boxShadow: theme.shadows[8]
          }
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          backgroundColor: visitColor,
          color: '#fff',
          p: 2
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {getVisitTypeLabel(visit.visit_type)}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {visit.visit_purpose || 'Routine Visit'}
            </Typography>
          </Box>
          <Chip
            label={getVisitStatusLabel(visit.visit_status)}
            size="small"
            sx={{
              backgroundColor: alpha('#fff', 0.2),
              color: '#fff'
            }}
          />
        </Stack>
        {event.hasConflict && (
          <Chip
            icon={<Warning2 size={14} style={{ color: '#fff' }} />}
            label="Scheduling Conflict"
            size="small"
            sx={{
              mt: 1,
              backgroundColor: alpha(theme.palette.error.main, 0.8),
              color: '#fff'
            }}
          />
        )}
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          {/* Date & Time */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Calendar size={18} color={theme.palette.text.secondary} />
            <Typography variant="body2">
              {format(parseISO(visit.scheduled_date), 'EEEE, MMMM d, yyyy')}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Clock size={18} color={theme.palette.text.secondary} />
            <Typography variant="body2">
              {formatTime(visit.scheduled_start_time)}
              {visit.scheduled_end_time && ` - ${formatTime(visit.scheduled_end_time)}`}
              {visit.estimated_duration_minutes && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  ({visit.estimated_duration_minutes} min)
                </Typography>
              )}
            </Typography>
          </Stack>

          {/* Patient */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <User size={18} color={theme.palette.text.secondary} />
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {visit.patient_name || `Patient #${visit.patient_id}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Patient
              </Typography>
            </Box>
          </Stack>

          {/* Staff */}
          {visit.staff_name && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <User size={18} color={theme.palette.text.secondary} />
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {visit.staff_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Staff Member
                </Typography>
              </Box>
            </Stack>
          )}

          {/* Notes */}
          {visit.visit_notes && (
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <DocumentText size={18} color={theme.palette.text.secondary} style={{ marginTop: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {visit.visit_notes}
              </Typography>
            </Stack>
          )}

          {/* Conflict Info */}
          {event.hasConflict && event.conflictInfo && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Warning2 size={16} color={theme.palette.error.main} />
                <Typography variant="caption" color="error.main" fontWeight={500}>
                  {event.conflictInfo.conflict_type.replace(/_/g, ' ')}
                </Typography>
              </Stack>
              {event.conflictInfo.conflict_description && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {event.conflictInfo.conflict_description}
                </Typography>
              )}
            </Box>
          )}

          {/* GPS Check-in/out */}
          {(visit.actual_check_in_time || visit.actual_check_out_time) && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                GPS Tracking
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                {visit.actual_check_in_time && (
                  <Chip
                    icon={<Location size={14} />}
                    label={`In: ${format(new Date(visit.actual_check_in_time), 'h:mm a')}`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
                {visit.actual_check_out_time && (
                  <Chip
                    icon={<Location size={14} />}
                    label={`Out: ${format(new Date(visit.actual_check_out_time), 'h:mm a')}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>

      <Divider />

      {/* Actions */}
      <Box sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} justifyContent="space-between">
          <Stack direction="row" spacing={1}>
            {canConfirm && (
              <Button
                size="small"
                color="success"
                variant="outlined"
                startIcon={loading ? <CircularProgress size={14} /> : <TickCircle size={16} />}
                onClick={handleConfirm}
                disabled={loading}
              >
                Confirm
              </Button>
            )}
            {canCancel && (
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<CloseCircle size={16} />}
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </Stack>
          {canEdit && (
            <Button
              size="small"
              variant="contained"
              startIcon={<Edit size={16} />}
              onClick={() => onEdit(visit)}
            >
              Edit
            </Button>
          )}
        </Stack>
      </Box>
    </Popover>
  );
};

export default VisitDetailPopover;
