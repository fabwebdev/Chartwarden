'use client';

import { useState,useEffect } from 'react';
import { useRouter } from 'next/navigation';
import http from '../../hooks/useCookie';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import MainCard from 'components/MainCard';
import Swal from 'sweetalert2';
import Autocomplete from '@mui/material/Autocomplete';

const AddRole = () => {
    const router = useRouter();
    const [roleData, setRoleData] = useState<{ name: string; permissions: any[] }>({
      name: "",
      permissions: [],
  });
  
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setRoleData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    };
      const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        // Extract permission IDs from the permissions array
        const permissionIds = Array.isArray(roleData.permissions)
          ? roleData.permissions.map((perm: any) => {
              // Handle both object and string formats
              return typeof perm === 'string' ? perm : (perm.id || perm.name || perm);
            })
          : [];
        
        const data = {
          name: roleData.name,
          permissions: permissionIds,
        };
        
        console.log('Submitting role data:', data);
        
        http
        .post(`/rbac/roles`, data)
        .then((response: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Role Added',
            text: 'The role has been added successfully!',
          });
          router.push(`/roles`);
        })
        .catch((error: any) => {
          console.error('Error adding role:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'An error occurred while adding the role. Please try again later.',
          });
        });
      };
      
      
  
      const handleCancel = () => {
        // Afficher une alerte SweetAlert pour confirmer l'annulation
        Swal.fire({
          icon: 'warning',
          title: 'Are you sure?',
          text: 'Any unsaved changes will be lost.',
          showCancelButton: true,
          confirmButtonText: 'Yes, cancel',
          cancelButtonText: 'No, go back',
        }).then((result) => {
          if (result.isConfirmed) {
            router.push(`/permissions`);
          }
        });
      };


      const [permissions, setPermissions] = useState<any[]>([]);
        useEffect(() => {
            const fetchPermissions = async () => {
              http
              .get(`/rbac/permissions`)
              .then((response: any) => {
                console.log('Permissions API Response in AddRole:', response);
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
                  console.warn('Unexpected permissions response structure in AddRole:', response.data);
                  permissionsList = [];
                }
                
                console.log('Processed permissions array in AddRole:', permissionsList);
                
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
                console.error('Error fetching permissions in AddRole:', error);
                setPermissions([]);
              });
            };
            fetchPermissions();
        }, []);

      
      
  
    return (
      <MainCard title="Create Role">
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Stack spacing={1}>
                <InputLabel htmlFor="name">Name</InputLabel>
                <TextField
                  fullWidth
                  id="name"
                  name="name"
                  type="text"
                  value={roleData.name}
                  onChange={handleChange} // Ajoutez le gestionnaire de changement
                />
              </Stack>
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
                value={Array.isArray(roleData.permissions) ? roleData.permissions : []}
                onChange={(event, newValue) => {
                    console.log('Selected permissions:', newValue);
                    setRoleData((prevData) => ({
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
                  Add role
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </MainCard>
    );
  };

export default AddRole;
