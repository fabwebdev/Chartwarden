'use client';

import { useState } from 'react';
import {
  Grid,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { Add, Edit, Trash, UserAdd, People } from 'iconsax-react';
import http from '../../../hooks/useCookie';

interface Attendee {
  id: string;
  staff_id: string;
  staff_name: string;
  discipline: string;
  role: string;
  attended: boolean;
  attendance_type: string;
  arrival_time: string;
  departure_time: string;
  absent_reason: string;
  is_guest: boolean;
}

interface AttendeeManagementProps {
  meetingId?: string;
  attendees: Attendee[];
  setAttendees: (attendees: Attendee[]) => void;
  canEdit: boolean;
  onUpdate: () => void;
}

const DISCIPLINES = [
  { value: 'PHYSICIAN', label: 'Physician' },
  { value: 'REGISTERED_NURSE', label: 'Registered Nurse (RN)' },
  { value: 'LICENSED_PRACTICAL_NURSE', label: 'Licensed Practical Nurse (LPN)' },
  { value: 'NURSE_PRACTITIONER', label: 'Nurse Practitioner (NP)' },
  { value: 'SOCIAL_WORKER', label: 'Social Worker' },
  { value: 'CHAPLAIN', label: 'Chaplain' },
  { value: 'HOSPICE_AIDE', label: 'Hospice Aide' },
  { value: 'THERAPIST', label: 'Therapist' },
  { value: 'BEREAVEMENT_COUNSELOR', label: 'Bereavement Counselor' },
  { value: 'VOLUNTEER_COORDINATOR', label: 'Volunteer Coordinator' },
  { value: 'ADMINISTRATOR', label: 'Administrator' },
  { value: 'OTHER', label: 'Other' },
];

const ATTENDANCE_TYPES = [
  { value: 'IN_PERSON', label: 'In Person' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'PHONE', label: 'Phone' },
];

const ROLES = [
  { value: 'MEDICAL_DIRECTOR', label: 'Medical Director' },
  { value: 'TEAM_LEADER', label: 'Team Leader' },
  { value: 'CARE_COORDINATOR', label: 'Care Coordinator' },
  { value: 'CASE_MANAGER', label: 'Case Manager' },
  { value: 'TEAM_MEMBER', label: 'Team Member' },
  { value: 'GUEST', label: 'Guest' },
];

const emptyAttendee: Omit<Attendee, 'id'> = {
  staff_id: '',
  staff_name: '',
  discipline: '',
  role: 'TEAM_MEMBER',
  attended: true,
  attendance_type: 'IN_PERSON',
  arrival_time: '',
  departure_time: '',
  absent_reason: '',
  is_guest: false,
};

const AttendeeManagement = ({
  meetingId,
  attendees,
  setAttendees,
  canEdit,
  onUpdate,
}: AttendeeManagementProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [formData, setFormData] = useState<Omit<Attendee, 'id'>>(emptyAttendee);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenDialog = (attendee?: Attendee) => {
    if (attendee) {
      setEditingAttendee(attendee);
      setFormData({
        staff_id: attendee.staff_id,
        staff_name: attendee.staff_name,
        discipline: attendee.discipline,
        role: attendee.role,
        attended: attendee.attended,
        attendance_type: attendee.attendance_type,
        arrival_time: attendee.arrival_time,
        departure_time: attendee.departure_time,
        absent_reason: attendee.absent_reason,
        is_guest: attendee.is_guest,
      });
    } else {
      setEditingAttendee(null);
      setFormData(emptyAttendee);
    }
    setDialogOpen(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAttendee(null);
    setFormData(emptyAttendee);
    setError(null);
  };

  const handleFieldChange = (field: keyof Omit<Attendee, 'id'>, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAttendee = async () => {
    if (!formData.staff_name) {
      setError('Name is required');
      return;
    }
    if (!formData.discipline) {
      setError('Discipline is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (meetingId) {
        // Save to API
        if (editingAttendee) {
          // Update existing attendee - for now just update local state
          // API would need an update attendee endpoint
          setAttendees(
            attendees.map((a) =>
              a.id === editingAttendee.id ? { ...formData, id: editingAttendee.id } : a
            )
          );
        } else {
          // Add new attendee via API
          const response = await http.post(`/idg-meetings/${meetingId}/attendees`, formData);
          if (response.data?.data) {
            setAttendees([...attendees, response.data.data]);
          }
        }
      } else {
        // Local state only (new meeting not yet saved)
        if (editingAttendee) {
          setAttendees(
            attendees.map((a) =>
              a.id === editingAttendee.id ? { ...formData, id: editingAttendee.id } : a
            )
          );
        } else {
          const newAttendee: Attendee = {
            ...formData,
            id: `temp-${Date.now()}`,
          };
          setAttendees([...attendees, newAttendee]);
        }
      }

      onUpdate();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Error saving attendee:', err);
      setError(err.response?.data?.message || 'Failed to save attendee');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAttendee = (id: string) => {
    setAttendees(attendees.filter((a) => a.id !== id));
    onUpdate();
  };

  const handleToggleAttendance = (id: string) => {
    setAttendees(
      attendees.map((a) =>
        a.id === id ? { ...a, attended: !a.attended } : a
      )
    );
    onUpdate();
  };

  const presentCount = attendees.filter((a) => a.attended).length;
  const absentCount = attendees.filter((a) => !a.attended).length;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={3}>
        {/* Summary */}
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <People size={24} />
              <Typography variant="h6">Attendees</Typography>
              <Chip
                size="small"
                label={`${presentCount} Present`}
                color="success"
                variant="outlined"
              />
              {absentCount > 0 && (
                <Chip
                  size="small"
                  label={`${absentCount} Absent`}
                  color="error"
                  variant="outlined"
                />
              )}
            </Stack>
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<UserAdd size={20} />}
                onClick={() => handleOpenDialog()}
              >
                Add Attendee
              </Button>
            )}
          </Stack>
        </Grid>

        {/* Attendees Table */}
        <Grid item xs={12}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Discipline</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Attendance</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Arrival</TableCell>
                  <TableCell>Departure</TableCell>
                  {canEdit && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {attendees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 8 : 7} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">
                        No attendees added yet. Click "Add Attendee" to add team members.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  attendees.map((attendee) => (
                    <TableRow key={attendee.id}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" fontWeight={500}>
                            {attendee.staff_name}
                          </Typography>
                          {attendee.is_guest && (
                            <Chip size="small" label="Guest" variant="outlined" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {DISCIPLINES.find((d) => d.value === attendee.discipline)?.label ||
                            attendee.discipline}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {ROLES.find((r) => r.value === attendee.role)?.label || attendee.role}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={attendee.attended}
                                onChange={() => handleToggleAttendance(attendee.id)}
                                size="small"
                              />
                            }
                            label={attendee.attended ? 'Present' : 'Absent'}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label={attendee.attended ? 'Present' : 'Absent'}
                            color={attendee.attended ? 'success' : 'error'}
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {ATTENDANCE_TYPES.find((t) => t.value === attendee.attendance_type)
                            ?.label || attendee.attendance_type || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{attendee.arrival_time || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{attendee.departure_time || '-'}</Typography>
                      </TableCell>
                      {canEdit && (
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(attendee)}
                              >
                                <Edit size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveAttendee(attendee.id)}
                              >
                                <Trash size={16} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* Add/Edit Attendee Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAttendee ? 'Edit Attendee' : 'Add Attendee'}</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={formData.staff_name}
                onChange={(e) => handleFieldChange('staff_name', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Discipline</InputLabel>
                <Select
                  value={formData.discipline}
                  label="Discipline"
                  onChange={(e) => handleFieldChange('discipline', e.target.value)}
                >
                  {DISCIPLINES.map((d) => (
                    <MenuItem key={d.value} value={d.value}>
                      {d.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => handleFieldChange('role', e.target.value)}
                >
                  {ROLES.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      {r.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Attendance Type</InputLabel>
                <Select
                  value={formData.attendance_type}
                  label="Attendance Type"
                  onChange={(e) => handleFieldChange('attendance_type', e.target.value)}
                >
                  {ATTENDANCE_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.attended}
                      onChange={(e) => handleFieldChange('attended', e.target.checked)}
                    />
                  }
                  label="Attended"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_guest}
                      onChange={(e) => handleFieldChange('is_guest', e.target.checked)}
                    />
                  }
                  label="Guest"
                />
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TimePicker
                label="Arrival Time"
                value={formData.arrival_time ? dayjs(`2000-01-01 ${formData.arrival_time}`) : null}
                onChange={(time: Dayjs | null) =>
                  handleFieldChange('arrival_time', time?.format('HH:mm') || '')
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TimePicker
                label="Departure Time"
                value={
                  formData.departure_time ? dayjs(`2000-01-01 ${formData.departure_time}`) : null
                }
                onChange={(time: Dayjs | null) =>
                  handleFieldChange('departure_time', time?.format('HH:mm') || '')
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            {!formData.attended && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Absence"
                  value={formData.absent_reason}
                  onChange={(e) => handleFieldChange('absent_reason', e.target.value)}
                  multiline
                  rows={2}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAttendee} disabled={saving}>
            {saving ? 'Saving...' : editingAttendee ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default AttendeeManagement;
