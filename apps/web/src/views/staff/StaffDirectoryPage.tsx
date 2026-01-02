'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

// MUI Components
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

// Icons
import {
  Add,
  Edit,
  Eye,
  Trash,
  SearchNormal1,
  Profile2User,
  Call,
  Sms,
  Award,
  Briefcase,
  Warning2,
  Refresh2,
  CloseCircle
} from 'iconsax-react';

// Project Imports
import MainCard from 'components/MainCard';
import Avatar from 'components/@extended/Avatar';
import AuthService from 'types/AuthService';
import { getAllStaff, getStaffCredentials, deleteStaff, StaffProfile, StaffCredential } from '../../api/staff';

// ==============================|| TYPES ||============================== //

type TabValue = 'directory' | 'expiring' | 'departments';
type Order = 'asc' | 'desc';

// Status configurations
const statusConfig: Record<string, { color: 'success' | 'error' | 'warning' | 'default' | 'info'; label: string }> = {
  ACTIVE: { color: 'success', label: 'Active' },
  INACTIVE: { color: 'default', label: 'Inactive' },
  TERMINATED: { color: 'error', label: 'Terminated' },
  ON_LEAVE: { color: 'warning', label: 'On Leave' }
};

const credentialStatusConfig: Record<string, { color: 'success' | 'error' | 'warning' | 'default' | 'info'; label: string }> = {
  ACTIVE: { color: 'success', label: 'Active' },
  EXPIRED: { color: 'error', label: 'Expired' },
  REVOKED: { color: 'error', label: 'Revoked' },
  PENDING_RENEWAL: { color: 'warning', label: 'Pending Renewal' }
};

const departmentConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  NURSING: { color: '#1976d2', icon: <Profile2User size={16} /> },
  SOCIAL_WORK: { color: '#9c27b0', icon: <Profile2User size={16} /> },
  CHAPLAINCY: { color: '#673ab7', icon: <Profile2User size={16} /> },
  ADMIN: { color: '#607d8b', icon: <Briefcase size={16} /> },
  MEDICAL: { color: '#4caf50', icon: <Profile2User size={16} /> }
};

// Helper functions
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatPhone = (phone?: string): string => {
  if (!phone) return 'N/A';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const getDaysUntilExpiration = (expirationDate: string): number => {
  const today = new Date();
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ==============================|| STAFF DIRECTORY PAGE ||============================== //

const StaffDirectoryPage: React.FC = () => {
  const router = useRouter();
  const { permissions, logout, user: currentUser } = AuthService();

  // State
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('directory');

  // Staff detail dialog
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [staffCredentials, setStaffCredentials] = useState<StaffCredential[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting
  const [orderBy, setOrderBy] = useState<keyof StaffProfile>('last_name');
  const [order, setOrder] = useState<Order>('asc');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    onLeave: 0,
    byDepartment: {} as Record<string, number>
  });

  // Check permissions
  const isAdmin = currentUser?.role === 'admin' ||
                  currentUser?.role?.name === 'admin' ||
                  String(currentUser?.role).toLowerCase() === 'admin';

  const hasPermission = (permissionName: string) => {
    if (isAdmin) return true;
    return permissions.includes(permissionName);
  };

  // Fetch staff data
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllStaff({ limit: 500 });
      let staffData: StaffProfile[] = [];

      if (Array.isArray(response)) {
        staffData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        staffData = response.data;
      }

      setStaff(staffData);

      // Calculate stats
      const activeCount = staffData.filter(s => s.employment_status === 'ACTIVE').length;
      const onLeaveCount = staffData.filter(s => s.employment_status === 'ON_LEAVE').length;

      const deptCounts: Record<string, number> = {};
      staffData.forEach(s => {
        if (s.department) {
          deptCounts[s.department] = (deptCounts[s.department] || 0) + 1;
        }
      });

      setStats({
        total: staffData.length,
        active: activeCount,
        onLeave: onLeaveCount,
        byDepartment: deptCounts
      });
    } catch (err: any) {
      console.error('Error fetching staff:', err);
      if (err.response?.status === 401) {
        logout();
      } else {
        setError('Failed to load staff directory. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // Fetch credentials for selected staff
  const fetchCredentials = useCallback(async (staffId: number) => {
    setLoadingCredentials(true);
    try {
      const response = await getStaffCredentials(staffId);
      let credentialsData: StaffCredential[] = [];

      if (Array.isArray(response)) {
        credentialsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        credentialsData = response.data;
      }

      setStaffCredentials(credentialsData);
    } catch (err: any) {
      console.error('Error fetching credentials:', err);
      setStaffCredentials([]);
    } finally {
      setLoadingCredentials(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Handle view staff details
  const handleViewStaff = async (staffMember: StaffProfile) => {
    setSelectedStaff(staffMember);
    setDetailDialogOpen(true);
    await fetchCredentials(staffMember.id);
  };

  // Handle delete staff
  const handleDeleteStaff = async (staffMember: StaffProfile) => {
    const result = await Swal.fire({
      title: 'Confirm Delete',
      text: `Are you sure you want to delete ${staffMember.first_name} ${staffMember.last_name}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await deleteStaff(staffMember.id);
        Swal.fire('Deleted!', 'Staff member has been deleted.', 'success');
        fetchStaff();
      } catch (err: any) {
        Swal.fire('Error', 'Failed to delete staff member.', 'error');
      }
    }
  };

  // Filtering logic
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchesSearch = searchQuery === '' ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.job_title?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || s.employment_status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || s.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [staff, searchQuery, statusFilter, departmentFilter]);

  // Sorting logic
  const sortedStaff = useMemo(() => {
    const comparator = (a: StaffProfile, b: StaffProfile): number => {
      const aVal = a[orderBy] ?? '';
      const bVal = b[orderBy] ?? '';
      if (bVal < aVal) return order === 'desc' ? -1 : 1;
      if (bVal > aVal) return order === 'desc' ? 1 : -1;
      return 0;
    };
    return [...filteredStaff].sort(comparator);
  }, [filteredStaff, order, orderBy]);

  // Paginated staff
  const paginatedStaff = useMemo(() => {
    return sortedStaff.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedStaff, page, rowsPerPage]);

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(staff.map(s => s.department).filter(Boolean));
    return Array.from(depts) as string[];
  }, [staff]);

  // Handle sort
  const handleSort = (property: keyof StaffProfile) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Column definitions
  const columns = [
    { id: 'employee_id' as keyof StaffProfile, label: 'Employee ID', sortable: true },
    { id: 'last_name' as keyof StaffProfile, label: 'Name', sortable: true },
    { id: 'job_title' as keyof StaffProfile, label: 'Job Title', sortable: true },
    { id: 'department' as keyof StaffProfile, label: 'Department', sortable: true },
    { id: 'email' as keyof StaffProfile, label: 'Contact', sortable: false },
    { id: 'employment_status' as keyof StaffProfile, label: 'Status', sortable: true },
    { id: 'actions' as keyof StaffProfile, label: 'Actions', sortable: false }
  ];

  return (
    <>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="textSecondary">Total Staff</Typography>
                <Typography variant="h3">{stats.total}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="textSecondary">Active</Typography>
                <Typography variant="h3" color="success.main">{stats.active}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="textSecondary">On Leave</Typography>
                <Typography variant="h3" color="warning.main">{stats.onLeave}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="textSecondary">Departments</Typography>
                <Typography variant="h3">{departments.length}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <MainCard
        title="Staff Directory"
        secondary={
          <Stack direction="row" spacing={2}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchStaff} disabled={loading}>
                <Refresh2 size={20} />
              </IconButton>
            </Tooltip>
            {hasPermission('manage:staff') && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => router.push('/admin/staff/new')}
              >
                Add Staff
              </Button>
            )}
          </Stack>
        }
      >
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v as TabValue)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Directory" value="directory" icon={<Profile2User size={18} />} iconPosition="start" />
          <Tab label="Expiring Credentials" value="expiring" icon={<Warning2 size={18} />} iconPosition="start" />
          <Tab label="By Department" value="departments" icon={<Briefcase size={18} />} iconPosition="start" />
        </Tabs>

        {activeTab === 'directory' && (
          <>
            {/* Search and Filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <TextField
                placeholder="Search by name, email, employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                inputProps={{ 'aria-label': 'Search staff members' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchNormal1 size={18} />
                    </InputAdornment>
                  )
                }}
                sx={{ minWidth: 300 }}
              />
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  inputProps={{ 'aria-label': 'Filter by employment status' }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                  <MenuItem value="ON_LEAVE">On Leave</MenuItem>
                  <MenuItem value="TERMINATED">Terminated</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Department</InputLabel>
                <Select
                  value={departmentFilter}
                  label="Department"
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  inputProps={{ 'aria-label': 'Filter by department' }}
                >
                  <MenuItem value="all">All Departments</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Loading State */}
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Staff Table */}
                <Box sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        {columns.map((column) => (
                          <TableCell key={column.id} align="left">
                            {column.sortable ? (
                              <TableSortLabel
                                active={orderBy === column.id}
                                direction={orderBy === column.id ? order : 'asc'}
                                onClick={() => handleSort(column.id)}
                              >
                                {column.label}
                              </TableSortLabel>
                            ) : (
                              column.label
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedStaff.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={columns.length} align="center">
                            <Typography variant="body2" color="textSecondary" sx={{ py: 4 }}>
                              No staff members found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedStaff.map((staffMember) => (
                          <TableRow key={staffMember.id} hover>
                            <TableCell>{staffMember.employee_id || 'N/A'}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar size="sm" color="primary">
                                  {staffMember.first_name?.[0]}{staffMember.last_name?.[0]}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2">
                                    {staffMember.last_name}, {staffMember.first_name}
                                    {staffMember.preferred_name && ` (${staffMember.preferred_name})`}
                                  </Typography>
                                  {staffMember.specialty && (
                                    <Typography variant="caption" color="textSecondary">
                                      {staffMember.specialty}
                                    </Typography>
                                  )}
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>{staffMember.job_title || 'N/A'}</TableCell>
                            <TableCell>
                              {staffMember.department ? (
                                <Chip
                                  label={staffMember.department}
                                  size="small"
                                  sx={{
                                    bgcolor: departmentConfig[staffMember.department]?.color || '#607d8b',
                                    color: 'white'
                                  }}
                                />
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.5}>
                                {staffMember.email && (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Sms size={14} />
                                    <Typography variant="body2">{staffMember.email}</Typography>
                                  </Stack>
                                )}
                                {staffMember.phone && (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Call size={14} />
                                    <Typography variant="body2">{formatPhone(staffMember.phone)}</Typography>
                                  </Stack>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={statusConfig[staffMember.employment_status]?.label || staffMember.employment_status}
                                color={statusConfig[staffMember.employment_status]?.color || 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1}>
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewStaff(staffMember)}
                                  >
                                    <Eye size={18} />
                                  </IconButton>
                                </Tooltip>
                                {hasPermission('manage:staff') && (
                                  <>
                                    <Tooltip title="Edit">
                                      <IconButton
                                        size="small"
                                        onClick={() => router.push(`/admin/staff/${staffMember.id}/edit`)}
                                      >
                                        <Edit size={18} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeleteStaff(staffMember)}
                                      >
                                        <Trash size={18} />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>

                {/* Pagination */}
                <TablePagination
                  component="div"
                  count={filteredStaff.length}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </>
            )}
          </>
        )}

        {activeTab === 'expiring' && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              This tab shows staff credentials expiring within the next 30 days.
            </Alert>
            <Typography variant="body2" color="textSecondary">
              Expiring credentials feature coming soon. Use the API endpoint GET /staff/credentials/expiring for now.
            </Typography>
          </Box>
        )}

        {activeTab === 'departments' && (
          <Grid container spacing={3}>
            {Object.entries(stats.byDepartment).map(([dept, count]) => (
              <Grid item xs={12} sm={6} md={4} key={dept}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: departmentConfig[dept]?.color || '#607d8b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                          }}
                        >
                          <Briefcase size={20} />
                        </Box>
                        <Typography variant="subtitle1">{dept}</Typography>
                      </Stack>
                      <Typography variant="h4">{count}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </MainCard>

      {/* Staff Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">Staff Profile</Typography>
            <IconButton onClick={() => setDetailDialogOpen(false)}>
              <CloseCircle size={24} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selectedStaff && (
            <Grid container spacing={3}>
              {/* Basic Info */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Personal Information
                </Typography>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar size="lg" color="primary">
                      {selectedStaff.first_name?.[0]}{selectedStaff.last_name?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h5">
                        {selectedStaff.first_name} {selectedStaff.middle_name || ''} {selectedStaff.last_name}
                      </Typography>
                      {selectedStaff.preferred_name && (
                        <Typography variant="body2" color="textSecondary">
                          Goes by: {selectedStaff.preferred_name}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="textSecondary">Employee ID</Typography>
                    <Typography variant="body1">{selectedStaff.employee_id || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Job Title</Typography>
                    <Typography variant="body1">{selectedStaff.job_title || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Department</Typography>
                    <Typography variant="body1">{selectedStaff.department || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Specialty</Typography>
                    <Typography variant="body1">{selectedStaff.specialty || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Employment Type</Typography>
                    <Typography variant="body1">{selectedStaff.employment_type || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Status</Typography>
                    <Chip
                      label={statusConfig[selectedStaff.employment_status]?.label || selectedStaff.employment_status}
                      color={statusConfig[selectedStaff.employment_status]?.color || 'default'}
                      size="small"
                    />
                  </Box>
                </Stack>
              </Grid>

              {/* Contact Info */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Contact Information
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Email</Typography>
                    <Typography variant="body1">{selectedStaff.email || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Phone</Typography>
                    <Typography variant="body1">{formatPhone(selectedStaff.phone)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Mobile</Typography>
                    <Typography variant="body1">{formatPhone(selectedStaff.mobile)}</Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="textSecondary">Address</Typography>
                    <Typography variant="body1">
                      {selectedStaff.address_line1 || 'N/A'}
                      {selectedStaff.address_line2 && <><br />{selectedStaff.address_line2}</>}
                      {selectedStaff.city && <><br />{selectedStaff.city}, {selectedStaff.state} {selectedStaff.zip_code}</>}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="textSecondary">Emergency Contact</Typography>
                    <Typography variant="body1">
                      {selectedStaff.emergency_contact_name || 'N/A'}
                      {selectedStaff.emergency_contact_relationship && ` (${selectedStaff.emergency_contact_relationship})`}
                    </Typography>
                    {selectedStaff.emergency_contact_phone && (
                      <Typography variant="body2">{formatPhone(selectedStaff.emergency_contact_phone)}</Typography>
                    )}
                  </Box>
                </Stack>
              </Grid>

              {/* Employment Info */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Employment Details
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Hire Date</Typography>
                    <Typography variant="body1">{formatDate(selectedStaff.hire_date)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Years of Experience</Typography>
                    <Typography variant="body1">{selectedStaff.years_of_experience || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Supervisory Role</Typography>
                    <Typography variant="body1">{selectedStaff.is_supervisory ? 'Yes' : 'No'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Max Patient Load</Typography>
                    <Typography variant="body1">{selectedStaff.max_patient_load || 'N/A'}</Typography>
                  </Box>
                </Stack>
              </Grid>

              {/* Credentials */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Credentials & Licenses
                </Typography>
                {loadingCredentials ? (
                  <CircularProgress size={24} />
                ) : staffCredentials.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">No credentials on file</Typography>
                ) : (
                  <List dense>
                    {staffCredentials.map((cred) => {
                      const daysUntil = getDaysUntilExpiration(cred.expiration_date);
                      const isExpiring = daysUntil > 0 && daysUntil <= 30;
                      const isExpired = daysUntil <= 0;

                      return (
                        <ListItem key={cred.id} sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Award size={16} />
                                <Typography variant="body2">{cred.credential_name}</Typography>
                                <Chip
                                  label={credentialStatusConfig[cred.credential_status]?.label || cred.credential_status}
                                  color={credentialStatusConfig[cred.credential_status]?.color || 'default'}
                                  size="small"
                                />
                              </Stack>
                            }
                            secondary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" color={isExpired ? 'error' : isExpiring ? 'warning.main' : 'textSecondary'}>
                                  {cred.credential_number && `#${cred.credential_number} • `}
                                  Expires: {formatDate(cred.expiration_date)}
                                  {isExpired && ' (EXPIRED)'}
                                  {isExpiring && !isExpired && ` (${daysUntil} days)`}
                                </Typography>
                              </Stack>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </Grid>

              {/* Notes */}
              {selectedStaff.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Notes
                  </Typography>
                  <Typography variant="body2">{selectedStaff.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          {hasPermission('manage:staff') && selectedStaff && (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => {
                setDetailDialogOpen(false);
                router.push(`/admin/staff/${selectedStaff.id}/edit`);
              }}
            >
              Edit Profile
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StaffDirectoryPage;
