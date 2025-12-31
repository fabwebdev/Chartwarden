'use client';


import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import StickyTable from '../../sections/tables/react-table/StickyTable';
import React, { useState, useEffect } from 'react';
import http from '../../hooks/useCookie';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { Add, Edit, Eye, Trash } from 'iconsax-react';
import Tooltip from '@mui/material/Tooltip';
import AuthService from 'types/AuthService';

const RolesPage = () => {
  const router = useRouter();
  const [rolesData, setRolesData] = useState<any[]>([]);
  const { permissions, logout, user } = AuthService();
  
  // Check if user has admin role
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';
  
  const handleAddRole = () => {
    router.push('/roles/add-new-role');
  };
  const hasPermission = (permissionName: string) => {
    // Admin users have all permissions
    if (isAdmin) {
      return true;
    }
    // Check if user has the permission
    return permissions.includes(permissionName);
  };
  const fetchRoleData = async () => {
    http
    .get(`/rbac/roles`)
    .then((response: any) => {
      console.log('Roles API Response:', response);
      console.log('Response data:', response.data);
      
      // Handle different response structures
      let roles = [];
      if (Array.isArray(response.data)) {
        // Direct array response
        roles = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // Nested data structure: { data: [...] }
        roles = response.data.data;
      } else if (response.data?.roles && Array.isArray(response.data.roles)) {
        // Nested roles structure: { roles: [...] }
        roles = response.data.roles;
      } else if (response.data?.data?.roles && Array.isArray(response.data.data.roles)) {
        // Deeply nested: { data: { roles: [...] } }
        roles = response.data.data.roles;
      } else {
        console.warn('Unexpected roles response structure:', response.data);
        roles = [];
      }
      
      console.log('Processed roles array:', roles);
      // Handle both string arrays and object arrays
      // If roles are strings, convert them to objects with name property
      // If roles are objects, keep them as is
      const validRoles = Array.isArray(roles) 
        ? roles
            .filter((role: any) => role !== null && role !== undefined)
            .map((role: any) => {
              // If role is a string, convert to object
              if (typeof role === 'string') {
                return { id: role, name: role };
              }
              // If role is already an object, ensure it has name property
              if (typeof role === 'object' && !Array.isArray(role)) {
                return {
                  id: role.id || role.name || role,
                  name: role.name || role.id || role
                };
              }
              return null;
            })
            .filter((role: any) => role !== null)
        : [];
      console.log('Valid roles array:', validRoles);
      setRolesData(validRoles);
    })
    .catch((error: any) => {
      console.error('Error fetching roles:', error);
      if(error.response?.status === 401){
        logout();
      }
      // Set empty array on error to prevent forEach errors
      setRolesData([]);
    });
  };
  useEffect(() => {
    fetchRoleData();
  }, []);
  const handleDeleteRole = async (roleId: number | string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'You will not be able to recover this role!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel!',
        reverseButtons: true
      });

      if (result.isConfirmed) {
        http
        .delete(`/rbac/roles/${roleId}`)
        .then((response: any) => {
          console.log('response', response);
          fetchRoleData();
          Swal.fire('Deleted!', 'Your role has been deleted.', 'success');
        })
        .catch((error: any) => {
          if(error.response.status === 401){
            logout();
          }
        });
        // Rafraîchir les données après la suppression
        fetchRoleData();
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire('Cancelled', 'Your role is safe :)', 'error');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
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
        Cell: ({ row }: { row: any }) => {
          const collapseIcon = row.isExpanded ? <Add /> : <Eye />;
          return (
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
              {hasPermission('roles_principal_menu_view') && (
              <Tooltip title="View">
                  <IconButton color="secondary" size="small">
                    {collapseIcon}
                  </IconButton>
              </Tooltip>
            )}  
              {hasPermission('roles_principal_menu_update') && (
              <Tooltip title="Edit">
                  <IconButton 
                    color="primary" 
                    size="small"
                    onClick={() => handleEditRole(row.original.id || row.original.name)}
                  >
                    <Edit size={18} />
                </IconButton>
              </Tooltip>
              )}
              {hasPermission('roles_principal_menu_delete') && (
              <Tooltip title="Delete">
                  <IconButton 
                    color="error" 
                    size="small"
                    onClick={() => handleDeleteRole(row.original.id || row.original.name)}
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

  const handleEditRole = (roleId: number | string) => {
    router.push(`/roles/edit-role/${roleId}`);
  };

  return (
    <Grid container spacing={3} justifyContent="flex-end" alignItems="center">
      <Grid item>
        <Button variant="contained" color="primary" onClick={handleAddRole}>
          Add Role
        </Button>
      </Grid>
      <Grid item xs={12}>
        <StickyTable title="Roles" columns={columns} data={Array.isArray(rolesData) ? rolesData : []} />
      </Grid>
    </Grid>
  );
};

export default RolesPage;
