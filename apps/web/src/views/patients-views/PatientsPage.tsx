'use client';

import { useMemo, useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

// Material-UI
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

// Third-party
import Swal from 'sweetalert2';

// Icons
import { Edit, Eye, Trash, SearchNormal1, Add } from 'iconsax-react';

// Project imports
import http from '../../hooks/useCookie';
import AuthService from 'types/AuthService';
import MainCard from 'components/MainCard';
import ScrollX from 'components/ScrollX';
import { usePatientStore } from '../../store/patientStore';
import { CSVExport } from 'components/third-party/ReactTable';

// Types
import { ThemeMode } from 'types/config';

// ==============================|| PATIENT INTERFACE ||============================== //

interface Patient {
  id: number | string;
  medical_record_number?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  primary_phone?: string;
  status?: string;
  [key: string]: unknown;
}

// ==============================|| STATUS CHIP ||============================== //

const getStatusColor = (status: string): 'success' | 'warning' | 'secondary' | 'error' | 'default' => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'warning';
    case 'discharged':
      return 'secondary';
    case 'deceased':
      return 'error';
    default:
      return 'default';
  }
};

// ==============================|| SORTING ||============================== //

type Order = 'asc' | 'desc';

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  const aVal = a[orderBy] ?? '';
  const bVal = b[orderBy] ?? '';
  if (bVal < aVal) return -1;
  if (bVal > aVal) return 1;
  return 0;
}

function getComparator<Key extends keyof Patient>(
  order: Order,
  orderBy: Key
): (a: Patient, b: Patient) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

// ==============================|| COLUMN DEFINITIONS ||============================== //

interface HeadCell {
  id: keyof Patient | 'actions';
  label: string;
  sortable: boolean;
  align: 'left' | 'center' | 'right';
}

const headCells: HeadCell[] = [
  { id: 'medical_record_number', label: 'MRN', sortable: true, align: 'left' },
  { id: 'last_name', label: 'Last Name', sortable: true, align: 'left' },
  { id: 'first_name', label: 'First Name', sortable: true, align: 'left' },
  { id: 'date_of_birth', label: 'Date of Birth', sortable: true, align: 'left' },
  { id: 'gender', label: 'Gender', sortable: true, align: 'left' },
  { id: 'primary_phone', label: 'Phone', sortable: false, align: 'left' },
  { id: 'status', label: 'Status', sortable: true, align: 'left' },
  { id: 'actions', label: 'Actions', sortable: false, align: 'center' }
];

// ==============================|| PATIENTS PAGE ||============================== //

const PatientsPage = () => {
  const router = useRouter();
  const theme = useTheme();
  const [patientsData, setPatientsData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { permissions, logout } = AuthService();
  const { setSelectedPatient } = usePatientStore();

  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof Patient>('last_name');
  const [searchTerm, setSearchTerm] = useState('');

  // Permission helpers
  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  const hasViewPermission = () => {
    return hasPermission('patients_principal_menu') || hasPermission('view:patient');
  };

  const hasUpdatePatientPermission = () => {
    return hasPermission('patients_principal_menu_edit') || hasPermission('update:patient');
  };

  const hasDeletePatientPermission = () => {
    return hasPermission('patients_principal_menu_delete') || hasPermission('delete:patient');
  };

  const hasCreatePatientPermission = () => {
    return hasPermission('patients_principal_menu_add') || hasPermission('create:patient');
  };

  // Navigation handlers
  const handleAddPatient = () => {
    router.push('/patients/add-new-patient');
  };

  const handleViewPatient = (patientId: number | string) => {
    const selectedPatient = patientsData.find((p) => p.id === patientId);
    if (selectedPatient) {
      setSelectedPatient(patientId, selectedPatient);
    }
    router.push(`/patients/patient-info/${patientId}`);
  };

  const handleEditPatient = (patientId: number | string) => {
    router.push(`/patients/edit-patient/${patientId}`);
  };

  const handleDeletePatient = async (patientId: number | string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this patient record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.grey[500],
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      http
        .delete(`/patient/${patientId}`)
        .then((response: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: response.data?.message || 'Patient has been deleted.'
          });
          fetchPatientData();
        })
        .catch(() => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while deleting the patient. Please try again later.'
          });
        });
    }
  };

  // Data fetching
  const fetchPatientData = async () => {
    setLoading(true);
    http
      .get('/patient')
      .then((response: any) => {
        let patients: Patient[] = [];
        if (Array.isArray(response.data)) {
          patients = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          patients = response.data.data;
        } else if (response.data?.patients && Array.isArray(response.data.patients)) {
          patients = response.data.patients;
        } else if (response.data?.data?.patients && Array.isArray(response.data.data.patients)) {
          patients = response.data.data.patients;
        } else {
          patients = [];
        }
        setPatientsData(patients);
      })
      .catch((error: any) => {
        if (error.response?.status === 401) {
          logout();
        }
        setPatientsData([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPatientData();
  }, []);

  // Sorting handlers
  const handleRequestSort = (property: keyof Patient) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Pagination handlers
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Search/Filter
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let data = [...patientsData];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      data = data.filter(
        (patient) =>
          patient.first_name?.toLowerCase().includes(searchLower) ||
          patient.last_name?.toLowerCase().includes(searchLower) ||
          patient.medical_record_number?.toLowerCase().includes(searchLower) ||
          patient.primary_phone?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    data = stableSort(data, getComparator(order, orderBy));

    return data;
  }, [patientsData, searchTerm, order, orderBy]);

  // Paginated data
  const paginatedData = useMemo(() => {
    return filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  // Export data
  const exportData = useMemo(() => {
    return patientsData.map((patient) => ({
      MRN: patient.medical_record_number || '',
      'Last Name': patient.last_name || '',
      'First Name': patient.first_name || '',
      'Date of Birth': patient.date_of_birth || '',
      Gender: patient.gender || '',
      Phone: patient.primary_phone || '',
      Status: patient.status || ''
    }));
  }, [patientsData]);

  // Format date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Header with Add button */}
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Patient List</Typography>
          {hasCreatePatientPermission() && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add size={18} />}
              onClick={handleAddPatient}
            >
              Add Patient
            </Button>
          )}
        </Stack>
      </Grid>

      {/* Main table card */}
      <Grid item xs={12}>
        <MainCard
          content={false}
          title={
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
              <TextField
                size="small"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search patients..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchNormal1 size={18} />
                    </InputAdornment>
                  )
                }}
                sx={{ width: { xs: '100%', sm: 300 } }}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="textSecondary">
                  {filteredData.length} patient{filteredData.length !== 1 ? 's' : ''} found
                </Typography>
                {exportData.length > 0 && <CSVExport data={exportData} filename="patients-list.csv" />}
              </Stack>
            </Stack>
          }
        >
          <ScrollX>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    {headCells.map((headCell) => (
                      <TableCell
                        key={headCell.id}
                        align={headCell.align}
                        sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}
                      >
                        {headCell.sortable ? (
                          <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={() => handleRequestSort(headCell.id as keyof Patient)}
                          >
                            {headCell.label}
                          </TableSortLabel>
                        ) : (
                          headCell.label
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((patient) => (
                      <TableRow
                        key={patient.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: theme.palette.mode === ThemeMode.DARK ? 'secondary.100' : 'grey.50'
                          }
                        }}
                        onClick={() => handleViewPatient(patient.id)}
                      >
                        <TableCell>{patient.medical_record_number || '-'}</TableCell>
                        <TableCell>{patient.last_name || '-'}</TableCell>
                        <TableCell>{patient.first_name || '-'}</TableCell>
                        <TableCell>{formatDate(patient.date_of_birth)}</TableCell>
                        <TableCell>{patient.gender || '-'}</TableCell>
                        <TableCell>{patient.primary_phone || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={patient.status || 'Unknown'}
                            color={getStatusColor(patient.status || '')}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            {hasViewPermission() && (
                              <Tooltip title="View">
                                <IconButton
                                  color="secondary"
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewPatient(patient.id);
                                  }}
                                >
                                  <Eye size={18} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {hasUpdatePatientPermission() && (
                              <Tooltip title="Edit">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditPatient(patient.id);
                                  }}
                                >
                                  <Edit size={18} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {hasDeletePatientPermission() && (
                              <Tooltip title="Delete">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePatient(patient.id);
                                  }}
                                >
                                  <Trash size={18} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={headCells.length} align="center" sx={{ py: 8 }}>
                        <Typography color="textSecondary">No patients found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </ScrollX>

          {/* Pagination */}
          {!loading && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={filteredData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          )}
        </MainCard>
      </Grid>
    </Grid>
  );
};

export default PatientsPage;
