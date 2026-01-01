'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Stack,
  Chip,
  CircularProgress,
  Box
} from '@mui/material';
import { Eye, Edit, Trash, DocumentText, Calendar, Filter, Refresh } from 'iconsax-react';
import Swal from 'sweetalert2';
import MainCard from 'components/MainCard';
import StickyTable from 'sections/tables/react-table/StickyTable';
import AuthService from 'types/AuthService';
import { usePatientStore } from '../../store/patientStore';
import {
  getEncounters,
  getPatientEncounters,
  deleteEncounter,
  Encounter,
  EncounterFilters,
  ENCOUNTER_TYPES,
  DISCIPLINES,
  ENCOUNTER_STATUSES,
  getEncounterTypeLabel,
  getDisciplineLabel,
  getStatusLabel,
  formatEncounterDate
} from '../../api/encounter';

interface EncountersPageProps {
  patientId?: string | number;
}

const EncountersPage = ({ patientId }: EncountersPageProps) => {
  const router = useRouter();
  const { permissions, logout } = AuthService();
  const { selectedPatientId } = usePatientStore();

  // Use patientId prop or from store
  const currentPatientId = patientId || selectedPatientId;

  // Data state
  const [encountersData, setEncountersData] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<EncounterFilters>({
    status: '',
    discipline: '',
    date_from: '',
    date_to: '',
    limit: 50,
    offset: 0
  });

  // Permission helpers
  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  const hasViewPermission = () => {
    return hasPermission('view:clinical_notes') || hasPermission('clinical_notes_view');
  };

  const hasEditPermission = () => {
    return hasPermission('update:clinical_notes') || hasPermission('clinical_notes_edit');
  };

  const hasDeletePermission = () => {
    return hasPermission('delete:clinical_notes') || hasPermission('clinical_notes_delete');
  };

  // Fetch encounters
  const fetchEncounters = async () => {
    setLoading(true);
    try {
      let response;
      if (currentPatientId) {
        response = await getPatientEncounters(currentPatientId);
      } else {
        response = await getEncounters(filters);
      }

      // Handle different response structures
      let encounters: Encounter[] = [];
      if (Array.isArray(response)) {
        encounters = response;
      } else if (response?.data && Array.isArray(response.data)) {
        encounters = response.data;
        setTotalCount(response.total || response.data.length);
      } else if (Array.isArray(response?.data?.data)) {
        encounters = response.data.data;
        setTotalCount(response.data.total || response.data.data.length);
      }

      setEncountersData(encounters);
    } catch (error: any) {
      console.error('Error fetching encounters:', error);
      if (error.response?.status === 401) {
        logout();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load encounters. Please try again.'
        });
      }
      setEncountersData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEncounters();
  }, [currentPatientId, filters.status, filters.discipline, filters.date_from, filters.date_to]);

  // Handle view encounter
  const handleViewEncounter = (encounterId: number) => {
    if (currentPatientId) {
      router.push(`/patients/encounters/${currentPatientId}/${encounterId}`);
    } else {
      router.push(`/encounters/${encounterId}`);
    }
  };

  // Handle edit encounter
  const handleEditEncounter = (encounterId: number) => {
    if (currentPatientId) {
      router.push(`/patients/encounters/${currentPatientId}/${encounterId}/edit`);
    } else {
      router.push(`/encounters/${encounterId}/edit`);
    }
  };

  // Handle delete encounter
  const handleDeleteEncounter = async (encounterId: number) => {
    const result = await Swal.fire({
      title: 'Delete Encounter?',
      text: 'This action cannot be undone. Only unsigned encounters can be deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it'
    });

    if (result.isConfirmed) {
      try {
        await deleteEncounter(encounterId);
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Encounter has been deleted successfully.'
        });
        fetchEncounters();
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to delete encounter. It may already be signed.'
        });
      }
    }
  };

  // Get status chip color
  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'SCHEDULED':
        return 'info';
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'primary';
      case 'SIGNED':
        return 'success';
      case 'COSIGNED':
        return 'success';
      case 'AMENDED':
        return 'secondary';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  // Table columns
  const columns = useMemo(
    () => [
      {
        Header: 'Type',
        accessor: 'encounter_type',
        sticky: 'left',
        Cell: ({ value }: { value: string }) => (
          <Typography variant="body2" fontWeight={500}>
            {getEncounterTypeLabel(value)}
          </Typography>
        )
      },
      {
        Header: 'Date',
        accessor: 'encounter_date',
        Cell: ({ value }: { value: string }) => (
          <Typography variant="body2">{formatEncounterDate(value)}</Typography>
        )
      },
      {
        Header: 'Discipline',
        accessor: 'discipline',
        Cell: ({ value }: { value: string }) => (
          <Typography variant="body2">{getDisciplineLabel(value)}</Typography>
        )
      },
      {
        Header: 'Provider',
        accessor: 'staff_name',
        Cell: ({ value, row }: { value: string; row: { original: Encounter } }) => (
          <Stack>
            <Typography variant="body2" fontWeight={500}>
              {value || 'N/A'}
            </Typography>
            {row.original.staff_credentials && (
              <Typography variant="caption" color="text.secondary">
                {row.original.staff_credentials}
              </Typography>
            )}
          </Stack>
        )
      },
      {
        Header: 'Status',
        accessor: 'encounter_status',
        Cell: ({ value }: { value: string }) => (
          <Chip label={getStatusLabel(value)} color={getStatusColor(value)} size="small" />
        )
      },
      {
        Header: 'Duration',
        accessor: 'encounter_duration_minutes',
        Cell: ({ value }: { value: number }) => (
          <Typography variant="body2">{value ? `${value} min` : '-'}</Typography>
        )
      },
      {
        Header: 'Actions',
        accessor: 'id',
        Cell: ({ value, row }: { value: number; row: { original: Encounter } }) => {
          const encounter = row.original;
          const isSigned = ['SIGNED', 'COSIGNED', 'AMENDED'].includes(encounter.encounter_status);

          return (
            <Stack direction="row" spacing={0.5}>
              {hasViewPermission() && (
                <Tooltip title="View Details">
                  <IconButton color="primary" size="small" onClick={() => handleViewEncounter(value)}>
                    <Eye size={18} />
                  </IconButton>
                </Tooltip>
              )}
              {hasEditPermission() && !isSigned && (
                <Tooltip title="Edit">
                  <IconButton color="secondary" size="small" onClick={() => handleEditEncounter(value)}>
                    <Edit size={18} />
                  </IconButton>
                </Tooltip>
              )}
              {hasDeletePermission() && !isSigned && (
                <Tooltip title="Delete">
                  <IconButton color="error" size="small" onClick={() => handleDeleteEncounter(value)}>
                    <Trash size={18} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          );
        }
      }
    ],
    [permissions, currentPatientId]
  );

  // Handle filter changes
  const handleFilterChange = (field: keyof EncounterFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value, offset: 0 }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      status: '',
      discipline: '',
      date_from: '',
      date_to: '',
      limit: 50,
      offset: 0
    });
  };

  return (
    <>
      <MainCard>
        <Grid container spacing={2}>
          {/* Header */}
          <Grid item xs={12}>
            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item>
                <Typography variant="h5" component="div">
                  <DocumentText size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Encounters
                  {totalCount > 0 && (
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      ({totalCount} total)
                    </Typography>
                  )}
                </Typography>
              </Grid>
              <Grid item>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<Filter size={18} />}
                    onClick={() => setShowFilters(!showFilters)}
                    sx={{ borderRadius: '5px' }}
                  >
                    {showFilters ? 'Hide Filters' : 'Filters'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<Refresh size={18} />}
                    onClick={fetchEncounters}
                    sx={{ borderRadius: '5px' }}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    color="inherit"
                    startIcon={<Calendar size={18} />}
                    sx={{ border: '1px solid #fafafa', borderRadius: '5px' }}
                  >
                    Calendar
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Grid>

          {/* Filters */}
          {showFilters && (
            <Grid item xs={12}>
              <MainCard sx={{ mt: 1, bgcolor: 'grey.50' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={filters.status || ''}
                        label="Status"
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                      >
                        <MenuItem value="">All Statuses</MenuItem>
                        {ENCOUNTER_STATUSES.map((status) => (
                          <MenuItem key={status.value} value={status.value}>
                            {status.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Discipline</InputLabel>
                      <Select
                        value={filters.discipline || ''}
                        label="Discipline"
                        onChange={(e) => handleFilterChange('discipline', e.target.value)}
                      >
                        <MenuItem value="">All Disciplines</MenuItem>
                        {DISCIPLINES.map((discipline) => (
                          <MenuItem key={discipline.value} value={discipline.value}>
                            {discipline.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="From Date"
                      InputLabelProps={{ shrink: true }}
                      value={filters.date_from || ''}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="To Date"
                      InputLabelProps={{ shrink: true }}
                      value={filters.date_to || ''}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <Button variant="text" color="secondary" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </Grid>
                </Grid>
              </MainCard>
            </Grid>
          )}

          {/* Table */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                <CircularProgress />
              </Box>
            ) : encountersData.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={300}>
                <DocumentText size={48} color="#ccc" />
                <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                  No encounters found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentPatientId
                    ? 'This patient has no recorded encounters yet.'
                    : 'Try adjusting your filters or create a new encounter.'}
                </Typography>
              </Box>
            ) : (
              <StickyTable columns={columns} data={encountersData} title="Encounter List" />
            )}
          </Grid>
        </Grid>
      </MainCard>
    </>
  );
};

export default EncountersPage;
