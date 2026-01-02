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
import Checkbox from '@mui/material/Checkbox';
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
import Autocomplete from '@mui/material/Autocomplete';

// Icons
import {
  Add,
  Edit,
  Trash,
  SearchNormal1,
  UserTick,
  UserRemove,
  Lock1,
  Unlock,
  Refresh2,
  ExportSquare,
  Profile2User,
  ShieldTick,
  Clock,
  Warning2
} from 'iconsax-react';

// Project Imports
import MainCard from 'components/MainCard';
import Avatar from 'components/@extended/Avatar';
import http from '../../hooks/useCookie';
import AuthService from 'types/AuthService';

// Types
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  contact?: string;
  image?: string;
  is_active: boolean;
  role?: string;
  roles?: Array<{ id: string; name: string }>;
  last_login_at?: string;
  failed_login_attempts?: number;
  locked_until?: string;
  createdAt?: string;
  deleted_at?: string;
}

interface Role {
  id: string | number;
  name: string;
  description?: string;
  hierarchy_level?: number;
}

type UserStatus = 'all' | 'active' | 'inactive' | 'locked' | 'deleted';
type TabValue = 'users' | 'roles' | 'activity';

// Status configurations
const statusConfig: Record<string, { color: 'success' | 'error' | 'warning' | 'default' | 'info'; label: string }> = {
  active: { color: 'success', label: 'Active' },
  inactive: { color: 'default', label: 'Inactive' },
  locked: { color: 'error', label: 'Locked' },
  deleted: { color: 'warning', label: 'Deleted' }
};

// Helper function to determine user status
const getUserStatus = (user: User): string => {
  if (user.deleted_at) return 'deleted';
  if (user.locked_until && new Date(user.locked_until) > new Date()) return 'locked';
  if (!user.is_active) return 'inactive';
  return 'active';
};

// Format date for display
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const UserManagementDashboard: React.FC = () => {
  const router = useRouter();
  const { permissions, logout, user: currentUser } = AuthService();

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('users');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting
  const [orderBy, setOrderBy] = useState<keyof User>('firstName');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // Selection for bulk actions
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Dialogs
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState<User | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    locked: 0
  });

  // Check permissions
  const isAdmin = currentUser?.role === 'admin' ||
                  currentUser?.role?.name === 'admin' ||
                  currentUser?.role?.toLowerCase() === 'admin';

  const hasPermission = (permissionName: string) => {
    if (isAdmin) return true;
    return permissions.includes(permissionName);
  };

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await http.get('/users');
      let usersData: User[] = [];

      if (Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        usersData = response.data.data;
      } else if (response.data?.users && Array.isArray(response.data.users)) {
        usersData = response.data.users;
      } else if (response.data?.data?.users && Array.isArray(response.data.data.users)) {
        usersData = response.data.data.users;
      }

      setUsers(usersData);

      // Calculate stats
      const activeCount = usersData.filter(u => getUserStatus(u) === 'active').length;
      const inactiveCount = usersData.filter(u => getUserStatus(u) === 'inactive').length;
      const lockedCount = usersData.filter(u => getUserStatus(u) === 'locked').length;

      setStats({
        total: usersData.length,
        active: activeCount,
        inactive: inactiveCount,
        locked: lockedCount
      });
    } catch (err: any) {
      console.error('Error fetching users:', err);
      if (err.response?.status === 401) {
        logout();
      } else {
        setError('Failed to load users. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      // Try /roles endpoint first (role management API), fallback to /rbac/roles
      let response;
      try {
        response = await http.get('/roles');
      } catch (err: any) {
        if (err.response?.status === 404 || err.response?.status === 403) {
          // Fallback to rbac endpoint
          response = await http.get('/rbac/roles');
        } else {
          throw err;
        }
      }

      let rolesData: Role[] = [];

      if (Array.isArray(response.data)) {
        rolesData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        rolesData = response.data.data;
      } else if (response.data?.data?.roles && Array.isArray(response.data.data.roles)) {
        rolesData = response.data.data.roles;
      } else if (response.data?.roles && Array.isArray(response.data.roles)) {
        rolesData = response.data.roles;
      }

      // Normalize roles
      rolesData = rolesData.map((role: any) => {
        if (typeof role === 'string') {
          return { id: role, name: role };
        }
        return {
          id: role.id || role.name,
          name: role.name || role.id,
          description: role.description || role.display_name
        };
      });

      setRoles(rolesData);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
      if (err.response?.status === 401) {
        logout();
      }
    }
  }, [logout]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user =>
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(user => getUserStatus(user) === statusFilter);
    }

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter(user => {
        const userRoles = user.roles?.map(r => r.name) || [user.role];
        return userRoles.includes(roleFilter);
      });
    }

    // Sort
    result.sort((a, b) => {
      const aValue = a[orderBy] ?? '';
      const bValue = b[orderBy] ?? '';

      if (order === 'asc') {
        return String(aValue).localeCompare(String(bValue));
      }
      return String(bValue).localeCompare(String(aValue));
    });

    return result;
  }, [users, searchQuery, statusFilter, roleFilter, orderBy, order]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);

  // Handlers
  const handleSort = (property: keyof User) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedUsers(paginatedUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddUser = () => {
    router.push('/users/add-new-user');
  };

  const handleEditUser = (userId: string) => {
    router.push(`/users/edit-user/${userId}`);
  };

  const handleDeleteUser = async (user: User) => {
    const result = await Swal.fire({
      title: 'Delete User?',
      text: `Are you sure you want to delete ${user.firstName} ${user.lastName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      try {
        await http.delete(`/users/${user.id}`);
        await fetchUsers();
        Swal.fire('Deleted!', 'User has been deleted.', 'success');
      } catch (err: any) {
        console.error('Error deleting user:', err);
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete user', 'error');
      }
    }
  };

  const handleStatusChange = async () => {
    if (!selectedUserForAction || !newStatus) return;

    try {
      await http.patch(`/users/${selectedUserForAction.id}/status`, { status: newStatus });
      await fetchUsers();
      setStatusDialogOpen(false);
      setSelectedUserForAction(null);
      setNewStatus('');
      Swal.fire('Success', 'User status updated successfully', 'success');
    } catch (err: any) {
      console.error('Error updating status:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const handleLockUser = async (user: User) => {
    const { value: duration } = await Swal.fire({
      title: 'Lock Account',
      text: `Lock ${user.firstName} ${user.lastName}'s account for how long?`,
      input: 'select',
      inputOptions: {
        '1': '1 hour',
        '24': '24 hours',
        '168': '1 week',
        '720': '30 days'
      },
      inputPlaceholder: 'Select duration',
      showCancelButton: true
    });

    if (duration) {
      try {
        await http.post(`/users/${user.id}/lock`, { duration_hours: parseInt(duration) });
        await fetchUsers();
        Swal.fire('Locked', 'Account has been locked', 'success');
      } catch (err: any) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to lock account', 'error');
      }
    }
  };

  const handleUnlockUser = async (user: User) => {
    try {
      await http.post(`/users/${user.id}/unlock`);
      await fetchUsers();
      Swal.fire('Unlocked', 'Account has been unlocked', 'success');
    } catch (err: any) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to unlock account', 'error');
    }
  };

  const handleRoleAssignment = (user: User) => {
    setSelectedUserForAction(user);
    const userRoles = user.roles?.map(r => roles.find(role => role.name === r.name) || r) || [];
    setSelectedRoles(userRoles as Role[]);
    setRoleDialogOpen(true);
  };

  const handleSaveRoles = async () => {
    if (!selectedUserForAction) return;

    try {
      await http.put(`/users/${selectedUserForAction.id}`, {
        firstName: selectedUserForAction.firstName,
        lastName: selectedUserForAction.lastName,
        email: selectedUserForAction.email,
        role: selectedRoles.length > 0 ? selectedRoles[0].name : 'patient'
      });
      await fetchUsers();
      setRoleDialogOpen(false);
      setSelectedUserForAction(null);
      setSelectedRoles([]);
      Swal.fire('Success', 'Role assignment updated', 'success');
    } catch (err: any) {
      console.error('Error updating roles:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to update roles', 'error');
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedUsers.length === 0) return;

    const result = await Swal.fire({
      title: 'Bulk Status Update',
      text: `Update ${selectedUsers.length} users to ${status}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, update',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await http.post('/users/bulk/status', {
          userIds: selectedUsers,
          status
        });
        await fetchUsers();
        setSelectedUsers([]);
        Swal.fire('Success', 'Users updated successfully', 'success');
      } catch (err: any) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to update users', 'error');
      }
    }
  };

  // Render stats cards
  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.lighter' }}>
                <Profile2User size={24} color="var(--mui-palette-primary-main)" />
              </Box>
              <Box>
                <Typography variant="h4">{stats.total}</Typography>
                <Typography variant="body2" color="text.secondary">Total Users</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.lighter' }}>
                <UserTick size={24} color="var(--mui-palette-success-main)" />
              </Box>
              <Box>
                <Typography variant="h4">{stats.active}</Typography>
                <Typography variant="body2" color="text.secondary">Active Users</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.200' }}>
                <UserRemove size={24} color="var(--mui-palette-grey-600)" />
              </Box>
              <Box>
                <Typography variant="h4">{stats.inactive}</Typography>
                <Typography variant="body2" color="text.secondary">Inactive Users</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'error.lighter' }}>
                <Lock1 size={24} color="var(--mui-palette-error-main)" />
              </Box>
              <Box>
                <Typography variant="h4">{stats.locked}</Typography>
                <Typography variant="body2" color="text.secondary">Locked Accounts</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Render filters
  const renderFilters = () => (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
      <TextField
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="small"
        sx={{ minWidth: 250 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchNormal1 size={18} />
            </InputAdornment>
          )
        }}
      />
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={statusFilter}
          label="Status"
          onChange={(e) => setStatusFilter(e.target.value as UserStatus)}
        >
          <MenuItem value="all">All Status</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
          <MenuItem value="locked">Locked</MenuItem>
          <MenuItem value="deleted">Deleted</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Role</InputLabel>
        <Select
          value={roleFilter}
          label="Role"
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <MenuItem value="all">All Roles</MenuItem>
          {roles.map((role) => (
            <MenuItem key={role.id} value={role.name}>{role.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ flexGrow: 1 }} />
      <Stack direction="row" spacing={1}>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchUsers} color="primary">
            <Refresh2 size={20} />
          </IconButton>
        </Tooltip>
        {hasPermission('users_principal_menu_create') && (
          <Button
            variant="contained"
            startIcon={<Add size={18} />}
            onClick={handleAddUser}
          >
            Add User
          </Button>
        )}
      </Stack>
    </Stack>
  );

  // Render bulk actions
  const renderBulkActions = () => {
    if (selectedUsers.length === 0) return null;

    return (
      <Alert
        severity="info"
        sx={{ mb: 2 }}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              onClick={() => handleBulkStatusUpdate('active')}
              startIcon={<UserTick size={16} />}
            >
              Activate
            </Button>
            <Button
              size="small"
              onClick={() => handleBulkStatusUpdate('inactive')}
              startIcon={<UserRemove size={16} />}
            >
              Deactivate
            </Button>
            <Button
              size="small"
              color="inherit"
              onClick={() => setSelectedUsers([])}
            >
              Clear
            </Button>
          </Stack>
        }
      >
        {selectedUsers.length} user(s) selected
      </Alert>
    );
  };

  // Render users table
  const renderUsersTable = () => (
    <MainCard content={false}>
      {renderBulkActions()}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedUsers.length > 0 && selectedUsers.length < paginatedUsers.length}
                checked={paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                onChange={handleSelectAll}
              />
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'firstName'}
                direction={orderBy === 'firstName' ? order : 'asc'}
                onClick={() => handleSort('firstName')}
              >
                User
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'email'}
                direction={orderBy === 'email' ? order : 'asc'}
                onClick={() => handleSort('email')}
              >
                Email
              </TableSortLabel>
            </TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Last Login</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : paginatedUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                <Typography color="text.secondary">No users found</Typography>
              </TableCell>
            </TableRow>
          ) : (
            paginatedUsers.map((user) => {
              const status = getUserStatus(user);
              const statusInfo = statusConfig[status] || statusConfig.inactive;
              const isSelected = selectedUsers.includes(user.id);
              const userRoleNames = user.roles?.map(r => r.name).join(', ') || user.role || 'N/A';

              return (
                <TableRow
                  key={user.id}
                  hover
                  selected={isSelected}
                  sx={{ '&:last-child td': { border: 0 } }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar
                        alt={`${user.firstName} ${user.lastName}`}
                        src={user.image}
                        size="sm"
                      />
                      <Box>
                        <Typography variant="subtitle2">
                          {user.firstName} {user.lastName}
                        </Typography>
                        {user.contact && (
                          <Typography variant="caption" color="text.secondary">
                            {user.contact}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={userRoleNames}
                      size="small"
                      variant="outlined"
                      onClick={() => hasPermission('users_principal_menu_update') && handleRoleAssignment(user)}
                      sx={{ cursor: hasPermission('users_principal_menu_update') ? 'pointer' : 'default' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusInfo.label}
                      size="small"
                      color={statusInfo.color}
                    />
                    {user.failed_login_attempts && parseInt(String(user.failed_login_attempts)) > 0 && (
                      <Tooltip title={`${user.failed_login_attempts} failed login attempts`}>
                        <Warning2 size={16} color="orange" style={{ marginLeft: 8 }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(user.last_login_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                      {hasPermission('users_principal_menu_update') && (
                        <Tooltip title="Edit">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleEditUser(user.id)}
                          >
                            <Edit size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {hasPermission('users_principal_menu_update') && status !== 'locked' && (
                        <Tooltip title="Lock Account">
                          <IconButton
                            color="warning"
                            size="small"
                            onClick={() => handleLockUser(user)}
                          >
                            <Lock1 size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {hasPermission('users_principal_menu_update') && status === 'locked' && (
                        <Tooltip title="Unlock Account">
                          <IconButton
                            color="success"
                            size="small"
                            onClick={() => handleUnlockUser(user)}
                          >
                            <Unlock size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {hasPermission('users_principal_menu_delete') && (
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={filteredUsers.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </MainCard>
  );

  // Role assignment dialog
  const renderRoleDialog = () => (
    <Dialog
      open={roleDialogOpen}
      onClose={() => setRoleDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Assign Roles
        {selectedUserForAction && (
          <Typography variant="body2" color="text.secondary">
            {selectedUserForAction.firstName} {selectedUserForAction.lastName}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Autocomplete
          multiple
          options={roles}
          getOptionLabel={(option) => option.name}
          value={selectedRoles}
          onChange={(_, newValue) => setSelectedRoles(newValue)}
          isOptionEqualToValue={(option, value) => option.id === value.id || option.name === value.name}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Roles"
              placeholder="Select roles"
              sx={{ mt: 2 }}
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveRoles} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );

  // Status change dialog
  const renderStatusDialog = () => (
    <Dialog
      open={statusDialogOpen}
      onClose={() => setStatusDialogOpen(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Change User Status</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>New Status</InputLabel>
          <Select
            value={newStatus}
            label="New Status"
            onChange={(e) => setNewStatus(e.target.value)}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="suspended">Suspended</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleStatusChange} variant="contained">Update</Button>
      </DialogActions>
    </Dialog>
  );

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button onClick={fetchUsers} sx={{ ml: 2 }}>Retry</Button>
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>User Management</Typography>

      {renderStatsCards()}

      <MainCard>
        {renderFilters()}
        <Divider sx={{ mb: 2 }} />
        {renderUsersTable()}
      </MainCard>

      {renderRoleDialog()}
      {renderStatusDialog()}
    </Box>
  );
};

export default UserManagementDashboard;
