'use client';

import Swal from 'sweetalert2';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Avatar from 'components/@extended/Avatar';
import StickyTable from '../../sections/tables/react-table/StickyTable';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Row } from 'react-table';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { Edit, Trash } from 'iconsax-react';
import Tooltip from '@mui/material/Tooltip';
import AuthService from 'types/AuthService';
import http from '../../hooks/useCookie';
const avatarImage = '/assets/images/users';

const UsersPage = () => {
  const router = useRouter();
  const [usersData, setUsersData] = useState([]);
  const { permissions, logout} = AuthService();
  const handleAddUser = () => {
    router.push('/users/add-new-user');
  };
  const fetchPermissionsData = async () => {
    try {
      const response = await http.get(`/rbac/permissions`);
      if (response.data && response.data.length > 0) {
        console.log('permission', response.data);
      } else {
        console.log('No permissions data found');
      }
    } catch (error:any) {
      if(error.response.status === 401){
        logout();
      }
    }
  };
  // const hasPermission = (permission: any) => {
  //   return permissions.includes(permission);
  // };
  const { user } = AuthService();
  
  // Check if user has admin role
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';
  
  const hasPermission = (permissionName: string) => {
    // Admin users have all permissions
    if (isAdmin) {
      return true;
    }
    return permissions.includes(permissionName);
  };
  const fetchUserData = async () => {
    http
    .get(`/users`)
    .then((response: any) => {
      console.log('Users API Response:', response);
      console.log('Response data:', response.data);
      
      // Handle different response structures
      let users = [];
      if (Array.isArray(response.data)) {
        // Direct array response
        users = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // Nested data structure: { data: [...] }
        users = response.data.data;
      } else if (response.data?.users && Array.isArray(response.data.users)) {
        // Nested users structure: { users: [...] }
        users = response.data.users;
      } else if (response.data?.data?.users && Array.isArray(response.data.data.users)) {
        // Deeply nested: { data: { users: [...] } }
        users = response.data.data.users;
      } else {
        console.warn('Unexpected response structure:', response.data);
        users = [];
      }
      
      setUsersData(users);
    })
    .catch((error: any) => {
      console.error('Error fetching users:', error);
      console.error('Request URL:', error.config?.url);
      console.error('Full URL:', error.config?.baseURL + error.config?.url);
      if(error.response?.status === 401){
        logout();
      } else if(error.response?.status === 404) {
        console.error('404 - Route not found. Please verify backend route is mounted correctly.');
        console.error('Expected: GET /api/users');
        console.error('Actual request:', error.config?.baseURL + error.config?.url);
      }
      // Set empty array on error to prevent forEach errors
      setUsersData([]);
    });
   
  };
  useEffect(() => {
    fetchPermissionsData();

    fetchUserData();
  }, []);
  const handleDeleteUser = async (userId: number) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'You will not be able to recover this user!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel!',
        reverseButtons: true
      });

      if (result.isConfirmed) {
        http
        .delete(`/users/${userId}`)
        .then((response: any) => {
          console.log('response', response);
          fetchUserData();
          Swal.fire('Deleted!', 'Your user has been deleted.', 'success');
        })
        .catch((error: any) => {
          if(error.response.status === 401){
            logout();
          }
        });
        // Rafraîchir les données après la suppression
        fetchUserData();
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire('Cancelled', 'Your user is safe :)', 'error');
      }
    } catch (error:any) {
      if(error.response.status === 401){
        logout();
      }
    }
  };
  const columns = [
      {
        Header: '#',
        Footer: '#',
        accessor: 'id',
        sticky: 'left',
        width: 50
      },
      {
        Header: 'Avatar',
        accessor: 'avatar',
        sticky: 'left',
        Cell: ({ value }: { value: number }) => <Avatar alt="Avatar" size="sm" src={`${avatarImage}/avatar-${!value ? 1 : value}.png`} />,
        width: 50
      },
      {
        Header: 'First Name',
        accessor: 'firstName',
        sticky: 'left',
        width: 120,
        defaultCanSort: true
      },
      {
        Header: 'Last Name',
        accessor: 'lastName',
        width: 120,
      },
      {
        Header: 'Email',
        accessor: 'email',
        width: 200
      },
      {
        Header: 'Role',
        accessor: 'roles',
        Cell: ({ value }: { value: any[] }) => (
          <div>
            {value.map((role: any, index: number) => (
              <span key={index}>{role.name}</span>
            ))}
          </div>
        ),
        width: 120
      },
      {
        Header: 'Contact',
        accessor: 'contact',
        width: 150
      },
      {
        Header: 'Actions',
        className: 'cell-center',
        disableSortBy: true,
        Cell: ({ row }: { row: Row<{id:any}> }) => {
          return (
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                   {hasPermission('users_principal_menu_create') && (
              <Tooltip title="Edit">
                  <IconButton 
                    color="primary" 
                    onClick={() => handleEditUser(row.original.id)}
                    size="small"
                  >
                    <Edit size={18} />
                </IconButton>
                </Tooltip>
              )}
              {hasPermission('users_principal_menu_delete') && (
                <Tooltip title="Delete">
                  <IconButton 
                    color="error" 
                    onClick={() => handleDeleteUser(row.original.id)}
                    size="small"
                  >
                    <Trash size={18} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          ); 
        }
      }
    ]

  const handleEditUser = (userId: number) => {
    router.push(`/users/edit-user/${userId}`);
  };


  return (
    <Grid container spacing={3} justifyContent="flex-end" alignItems="center">
      <Grid item>
        <Button variant="contained" color="primary" onClick={handleAddUser}>
          Add User
        </Button>
      </Grid>
      <Grid item xs={12}>
        <StickyTable title="Users" columns={columns} data={Array.isArray(usersData) ? usersData : []} />
      </Grid>
    </Grid>
  );
};

export default UsersPage;
