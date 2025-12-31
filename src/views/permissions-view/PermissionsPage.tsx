'use client';


import React, { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import StickyTable from '../../sections/tables/react-table/StickyTable';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { Edit, Trash } from 'iconsax-react';
import Tooltip from '@mui/material/Tooltip';
import Swal from 'sweetalert2';
import { Row } from 'react-table';
import AuthService from 'types/AuthService';
import http from '../../hooks/useCookie';
// interface Permission {
//   name: string;
//   // Ajoutez d'autres propriétés au besoin
// }
const PermissionsPage = () => {
  const router = useRouter();
  const [permissionsData, setPermissionsData] = useState<any[]>([]);

  const { permissions, user } = AuthService();
  
  // Check if user has admin role
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';

  const fetchPermissionsData = async () => {
    http
    .get(`/permissions`)
    .then((response: any) => {
      console.log('Permissions API Response:', response);
      console.log('Response data:', response.data);
      
      // Handle different response structures
      let permissions = [];
      if (Array.isArray(response.data)) {
        // Direct array response
        permissions = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // Nested data structure: { data: [...] }
        permissions = response.data.data;
      } else if (response.data?.permissions && Array.isArray(response.data.permissions)) {
        // Nested permissions structure: { permissions: [...] }
        permissions = response.data.permissions;
      } else if (response.data?.data?.permissions && Array.isArray(response.data.data.permissions)) {
        // Deeply nested: { data: { permissions: [...] } }
        permissions = response.data.data.permissions;
      } else {
        console.warn('Unexpected permissions response structure:', response.data);
        permissions = [];
      }
      
      console.log('Processed permissions array:', permissions);
      setPermissionsData(permissions);
    })
    .catch((error: any) => {
      console.error('Error fetching permissions:', error);
      if(error.response?.status === 401){
        const { logout } = AuthService();
        logout();
      }
      // Set empty array on error to prevent forEach errors
      setPermissionsData([]);
    });
    
  };

  useEffect(() => {
    fetchPermissionsData();
  }, []);

  const handleAddPermission = () => {
    router.push('/permissions/add-new-permission');
  };

  const handleDeletePermission = async (permissionId: number | string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'You will not be able to recover this permission!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel!',
        reverseButtons: true
      });

      if (result.isConfirmed) {
        http
        .delete(`/permissions/${permissionId}`)
        .then((response: any) => {
          fetchPermissionsData();
          Swal.fire('Deleted!', 'Your permission has been deleted.', 'success');
        })
        .catch((error: any) => {
          console.log('error', error);
        });
        // Rafraîchir les données après la suppression
        fetchPermissionsData();
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire('Cancelled', 'Your permission is safe :)', 'error');
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
    }
  };
  // const hasPermission = (permission: any) => {
  //   return permissions.includes(permission);
  // };
  const hasPermission = (permissionName: string) => {
    // Admin users have all permissions
    if (isAdmin) {
      return true;
    }
    return permissions.includes(permissionName);
  };
  
  const handleUpdatePermission = async (permissionId: number | string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to update this permission!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, update it!',
        cancelButtonText: 'No, cancel!',
        reverseButtons: true
      });

      if (result.isConfirmed) {
        router.push(`/permissions/edit-permission/${permissionId}`);
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire('Cancelled', 'Your permission update has been cancelled :)', 'error');
      }
    } catch (error) {
      console.error('Error updating permission:', error);
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
      Header: 'Name',
      accessor: 'name',
      sticky: 'left',
      width: 120,
      defaultCanSort: true
    },
    {
      Header: 'Actions',
      className: 'cell-center',
      disableSortBy: true,
      Cell: ({ row }: { row: Row<{id:any}> } ) => {
        return (
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            {hasPermission('permissions_principal_menu_update') && (
              <Tooltip title="Edit">
                <IconButton 
                  color="primary" 
                  size="small"
                  onClick={() => handleUpdatePermission(row.original.id || row.original.name)}
                >
                  <Edit size={18} />
                </IconButton>
              </Tooltip>
            )}
            {hasPermission('permissions_principal_menu_delete') && (
              <Tooltip title="Delete">
                <IconButton 
                  color="error" 
                  size="small"
                  onClick={() => handleDeletePermission(row.original.id || row.original.name)}
                >
                  <Trash size={18} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      }
    }
  ];

  return (
    <Grid container spacing={3} justifyContent="flex-end" alignItems="center">
      <Grid item>
        <Button variant="contained" color="primary" onClick={handleAddPermission}>
          Add Permission
        </Button>
      </Grid>
      <Grid item xs={12}>
        <StickyTable title="Permissions" columns={columns} data={Array.isArray(permissionsData) ? permissionsData : []} />
      </Grid>
    </Grid>
  );
};

export default PermissionsPage;
