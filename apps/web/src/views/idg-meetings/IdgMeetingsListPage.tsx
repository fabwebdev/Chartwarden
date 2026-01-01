'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Grid,
  Button,
  TextField,
  InputAdornment,
  Stack,
  IconButton,
  Tooltip,
  Chip,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  SearchNormal1,
  Edit,
  Eye,
  Calendar,
  Clock,
  Location,
  People,
  Filter,
} from 'iconsax-react';
import MainCard from 'components/MainCard';
import http from '../../hooks/useCookie';
import AuthService from 'types/AuthService';

// Meeting type labels
const MEETING_TYPES: Record<string, string> = {
  INITIAL: 'Initial',
  ROUTINE: 'Routine',
  RECERTIFICATION: 'Recertification',
  EMERGENCY: 'Emergency',
  SPECIAL: 'Special',
};

// Status colors and labels
const STATUS_CONFIG: Record<string, { color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'; label: string }> = {
  SCHEDULED: { color: 'info', label: 'Scheduled' },
  IN_PROGRESS: { color: 'warning', label: 'In Progress' },
  COMPLETED: { color: 'success', label: 'Completed' },
  CANCELLED: { color: 'error', label: 'Cancelled' },
  RESCHEDULED: { color: 'default', label: 'Rescheduled' },
};

interface IdgMeeting {
  id: number;
  meeting_type: string;
  meeting_status: string;
  meeting_date: string;
  meeting_time: string | null;
  meeting_duration_minutes: number | null;
  location: string | null;
  virtual_meeting: boolean;
  facilitator_name: string | null;
  patients_reviewed_count: number | null;
  createdAt: string;
}

const IdgMeetingsListPage = () => {
  const router = useRouter();
  const { permissions, user } = AuthService();

  // State
  const [meetings, setMeetings] = useState<IdgMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Permission checks
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';

  const hasPermission = useCallback((permission: string) => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  }, [isAdmin, permissions]);

  const canView = hasPermission('VIEW_CLINICAL_NOTES');
  const canCreate = hasPermission('CREATE_CLINICAL_NOTES');
  const canEdit = hasPermission('UPDATE_CLINICAL_NOTES');

  // Fetch meetings
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await http.get('/idg-meetings', {
        params: {
          limit: rowsPerPage,
          offset: page * rowsPerPage,
        },
      });

      if (response.data?.data) {
        setMeetings(response.data.data);
        setTotalCount(response.data.count || response.data.data.length);
      } else if (Array.isArray(response.data)) {
        setMeetings(response.data);
        setTotalCount(response.data.length);
      }
    } catch (err: any) {
      console.error('Error fetching IDG meetings:', err);
      setError(err.response?.data?.message || 'Failed to load meetings');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Filter meetings
  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      !searchQuery ||
      meeting.facilitator_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      MEETING_TYPES[meeting.meeting_type]?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || meeting.meeting_status === statusFilter;
    const matchesType = !typeFilter || meeting.meeting_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Handlers
  const handleCreateMeeting = () => {
    router.push('/idg-meetings/new');
  };

  const handleViewMeeting = (id: number) => {
    router.push(`/idg-meetings/${id}`);
  };

  const handleEditMeeting = (id: number) => {
    router.push(`/idg-meetings/${id}`);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <MainCard
      title="IDG Meetings"
      secondary={
        canCreate && (
          <Button
            variant="contained"
            startIcon={<Add size={20} />}
            onClick={handleCreateMeeting}
          >
            New Meeting
          </Button>
        )
      }
    >
      <Grid container spacing={3}>
        {/* Filters */}
        <Grid item xs={12}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              fullWidth
              placeholder="Search by facilitator, location, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchNormal1 size={20} />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 400 }}
            />

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                {Object.entries(MEETING_TYPES).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {(statusFilter || typeFilter || searchQuery) && (
              <Button
                variant="outlined"
                onClick={() => {
                  setStatusFilter('');
                  setTypeFilter('');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </Stack>
        </Grid>

        {/* Error Alert */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Grid>
        )}

        {/* Meetings Table */}
        <Grid item xs={12}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Facilitator</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Patients Reviewed</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={40} />
                    </TableCell>
                  </TableRow>
                ) : filteredMeetings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">
                        {meetings.length === 0
                          ? 'No meetings found. Create your first IDG meeting.'
                          : 'No meetings match your filters.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMeetings.map((meeting) => (
                    <TableRow
                      key={meeting.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleViewMeeting(meeting.id)}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Calendar size={16} color="#666" />
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {formatDate(meeting.meeting_date)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {formatTime(meeting.meeting_time)}
                              {meeting.meeting_duration_minutes && ` (${meeting.meeting_duration_minutes} min)`}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={MEETING_TYPES[meeting.meeting_type] || meeting.meeting_type}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={STATUS_CONFIG[meeting.meeting_status]?.label || meeting.meeting_status}
                          color={STATUS_CONFIG[meeting.meeting_status]?.color || 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {meeting.facilitator_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          {meeting.virtual_meeting && (
                            <Chip size="small" label="Virtual" color="secondary" variant="outlined" />
                          )}
                          <Typography variant="body2">
                            {meeting.location || (meeting.virtual_meeting ? 'Online' : '-')}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {meeting.patients_reviewed_count ?? '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {canView && (
                            <Tooltip title="View Meeting">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewMeeting(meeting.id);
                                }}
                              >
                                <Eye size={18} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canEdit && meeting.meeting_status !== 'COMPLETED' && (
                            <Tooltip title="Edit Meeting">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditMeeting(meeting.id);
                                }}
                              >
                                <Edit size={18} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default IdgMeetingsListPage;
