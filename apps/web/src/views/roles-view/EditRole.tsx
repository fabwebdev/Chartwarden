'use client';

import { useEffect, useState } from 'react';
import MainCard from 'components/MainCard';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Autocomplete from '@mui/material/Autocomplete';
import http from '../../hooks/useCookie';
import Swal from 'sweetalert2';
import AuthService from 'types/AuthService';

const EditRole = ( {roleId}: { roleId: any }) => {
  const {  logout} = AuthService();
  const [editedRoleData, setEditedRoleData] = useState<{
    id: string;
    name: string;
    permissions: any[];
  }>({
    id: '',
    name: '',
    permissions: [],
});
  useEffect(() => {
    const fetchRoleData = async () => {
      try {
        // Fetch role data
        const roleResponse = await http.get(`/rbac/roles/${roleId}`);
        console.log('Role API Response in EditRole:', roleResponse);
        console.log('Full role response data:', JSON.stringify(roleResponse.data, null, 2));
        
        // Handle different response structures
        let roleData = null;
        if (roleResponse.data?.role) {
          roleData = roleResponse.data.role;
        } else if (roleResponse.data?.data) {
          roleData = roleResponse.data.data;
        } else if (roleResponse.data) {
          // If response.data is a string (role name) or object
          if (typeof roleResponse.data === 'string') {
            roleData = { name: roleResponse.data, id: roleId };
          } else {
            roleData = roleResponse.data;
          }
        }
        
        if (!roleData) {
          console.error('No role data found in response');
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load role data'
          });
          return;
        }
        
        console.log('Extracted role data:', roleData);
        
        // Extract role name - handle both string and object formats
        let roleName = '';
        if (typeof roleData === 'string') {
          roleName = roleData;
        } else if (roleData.name) {
          roleName = roleData.name;
        } else if (roleData.id) {
          roleName = roleData.id;
        }
        
        console.log('Role name:', roleName);
        
        // Fetch role-specific permissions
        let rolePermissions = [];
        try {
          const permissionsResponse = await http.get(`/rbac/roles/${roleId}/permissions`);
          console.log('Role Permissions API Response:', permissionsResponse);
          
          // Handle different response structures for permissions
          if (Array.isArray(permissionsResponse.data)) {
            rolePermissions = permissionsResponse.data;
          } else if (permissionsResponse.data?.data && Array.isArray(permissionsResponse.data.data)) {
            rolePermissions = permissionsResponse.data.data;
          } else if (permissionsResponse.data?.permissions && Array.isArray(permissionsResponse.data.permissions)) {
            rolePermissions = permissionsResponse.data.permissions;
          } else if (permissionsResponse.data?.data?.permissions && Array.isArray(permissionsResponse.data.data.permissions)) {
            rolePermissions = permissionsResponse.data.data.permissions;
          }
        } catch (permError: any) {
          console.warn('Could not fetch role-specific permissions, using role data permissions:', permError);
          // Fallback to permissions from role data if available
          rolePermissions = roleData.permissions || [];
        }
        
        // Ensure rolePermissions is an array of objects
        const normalizedPermissions = Array.isArray(rolePermissions)
          ? rolePermissions.map((perm: any) => {
              if (typeof perm === 'string') {
                return { id: perm, name: perm };
              }
              return {
                id: perm.id || perm.name || perm,
                name: perm.name || perm.id || perm
              };
            })
          : [];
        
        console.log('Setting edited role data:', {
          id: roleData.id || roleId,
          name: roleName,
          permissions: normalizedPermissions
        });
        
        setEditedRoleData({
          id: roleData.id || roleId,
          name: roleName,
          permissions: normalizedPermissions
        });
      } catch (error: any) {
        console.error('Error fetching role data:', error);
        if(error.response?.status === 401){
          logout();
        }
      }
    };

    fetchRoleData();
  }, [roleId]);

  const [permissions, setPermissions] = useState<any[]>([]);
  useEffect(() => {
    const fetchPermissions = async () => {
      http
      .get(`/rbac/permissions`)
      .then((response: any) => {
        console.log('Permissions API Response in EditRole:', response);
        console.log('Response data:', response.data);
        
        // Handle different response structures
        let permissionsList = [];
        if (Array.isArray(response.data)) {
          permissionsList = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          permissionsList = response.data.data;
        } else if (response.data?.permissions && Array.isArray(response.data.permissions)) {
          permissionsList = response.data.permissions;
        } else if (response.data?.data?.permissions && Array.isArray(response.data.data.permissions)) {
          permissionsList = response.data.data.permissions;
        } else {
          console.warn('Unexpected permissions response structure in EditRole:', response.data);
          permissionsList = [];
        }
        
        console.log('Processed permissions array in EditRole:', permissionsList);
        
        // Convert string permissions to objects for Autocomplete
        // Autocomplete needs objects with id and name properties
        const normalizedPermissions = permissionsList.map((perm: any) => {
          if (typeof perm === 'string') {
            return { id: perm, name: perm };
          }
          // If already an object, ensure it has id and name
          return {
            id: perm.id || perm.name || perm,
            name: perm.name || perm.id || perm
          };
        });
        
        console.log('Normalized permissions for Autocomplete:', normalizedPermissions);
        setPermissions(normalizedPermissions);
      })
      .catch((error: any) => {
        console.error('Error fetching permissions in EditRole:', error);
        if(error.response?.status === 401){
          logout();
        }
        setPermissions([]);
      });
    };
    fetchPermissions();
  }, []);


  const handleChange = (e:any) => {
    const { name, value } = e.target;
    setEditedRoleData((prevRoleData) => ({
      ...prevRoleData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e:any) => {
    e.preventDefault();
    
    // Extract permission IDs from the permissions array
    const permissionIds = Array.isArray(editedRoleData.permissions)
      ? editedRoleData.permissions.map((perm: any) => {
          // Handle both object and string formats
          return typeof perm === 'string' ? perm : (perm.id || perm.name || perm);
        })
      : [];
    
    const data = {
      name: editedRoleData.name,
      permissions: permissionIds,
    };
    
    console.log('Submitting role update:', data);
    
      http
      .put(`/rbac/roles/${roleId}`, data)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Role updated',
          text: 'The role has been updated successfully!',
        });
        setTimeout(() => {
          window.location.href = '/roles';
        }, 1000);
      })
      .catch((error: any) => {
        console.error('Error updating role:', error);
        if(error.response?.status === 401){
          logout();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'Failed to update role'
          });
        }
      });
  };

  const handleCancel = () => {
    // Rediriger vers la page des utilisateurs si l'utilisateur annule la modification
    window.location.href = '/roles';
  };

  return (
    <MainCard>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={12}>
            <InputLabel sx={{ mb: 1 }}>Name</InputLabel>
              <TextField
                name="name"
                value={editedRoleData.name}
                onChange={handleChange}
                fullWidth
              />
          </Grid>
          
          <Grid item xs={12}>
            <InputLabel htmlFor="permissions">Permissions</InputLabel>
            <Autocomplete
              multiple
              id="permissions"
              options={Array.isArray(permissions) ? permissions : []}
              getOptionLabel={(option:any) => {
                if (typeof option === 'string') return option;
                return option.name || option.id || option || '';
              }}
              isOptionEqualToValue={(option: any, value: any) => {
                const optionId = typeof option === 'string' ? option : (option.id || option.name);
                const valueId = typeof value === 'string' ? value : (value.id || value.name);
                return optionId === valueId;
              }}
              value={Array.isArray(editedRoleData.permissions) ? editedRoleData.permissions : []}
              onChange={(event, newValue) => {
                console.log('Selected permissions:', newValue);
                setEditedRoleData((prevData) => ({
                    ...prevData,
                    permissions: newValue || [],
                }));
            }}
              renderInput={(params) => <TextField {...params} placeholder="Select permissions" />}
            />
            
          </Grid>
          
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" color="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="contained" type="submit">
                Update Role
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </MainCard>
  );
};

export default EditRole;
