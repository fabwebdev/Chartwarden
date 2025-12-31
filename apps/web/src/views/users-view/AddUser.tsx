'use client';

import { useState, ChangeEvent,useEffect } from 'react';
import { useRouter } from 'next/navigation';
import http from '../../hooks/useCookie';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import MainCard from 'components/MainCard';
import Avatar from 'components/@extended/Avatar';
import { Camera } from 'iconsax-react';
import Box from '@mui/material/Box';
import FormLabel from '@mui/material/FormLabel';
import { SelectChangeEvent } from '@mui/material';
import Swal from 'sweetalert2';
import AuthService from 'types/AuthService';
const AddUser = () => {
  const router = useRouter();
  const [role, setRoles] = useState('');
  const [userData, setUserData] = useState({
    avatar:  null as File | null,
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: '',
    contact: ''
  });

  
 
const { logout} = AuthService();
const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
const [rolesData, setRolesData] = useState<any[]>([]);
  const fetchRoleData = async () => {
    http
    .get(`/rbac/roles`)
    .then((response: any) => {
      console.log('Roles API Response:', response);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Is array?', Array.isArray(response.data));
      
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
        console.warn('Full response:', response);
        roles = [];
      }
      
      console.log('Processed roles array:', roles);
      // Handle both string arrays and object arrays
      // Convert strings to objects for consistent handling
      const normalizedRoles = Array.isArray(roles)
        ? roles.map((role: any) => {
            if (typeof role === 'string') {
              return { id: role, name: role };
            }
            if (typeof role === 'object' && !Array.isArray(role)) {
              return {
                id: role.id || role.name || role,
                name: role.name || role.id || role
              };
            }
            return role;
          })
        : [];
      console.log('Normalized roles array:', normalizedRoles);
      console.log('Roles count:', normalizedRoles.length);
      setRolesData(normalizedRoles);
    })
    .catch((error: any) => {
      console.error('Error fetching roles:', error);
      console.error('Error response:', error.response);
      if(error.response?.status === 401){
        logout();
      }
      // Set empty array on error to prevent map errors
      setRolesData([]);
    });
  };
const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | { name?: string | undefined; value: unknown; }> | SelectChangeEvent<string>) => {
  if ('target' in e) {
    const { name, value } = e.target as HTMLInputElement;
    if (name === 'avatar') {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Update userData state for avatar
        setUserData((prevUserData) => ({
          ...prevUserData,
          avatar: file,
        }));

        // Create preview URL for avatar
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setAvatarPreview(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    } else {
      // Ensure name is a string
      const fieldName = name as string;
      setUserData((prevUserData) => ({
        ...prevUserData,
        [fieldName]: value,
      }));
    }
  } else if (typeof e === 'string') {
    // If it's a SelectChangeEvent, update role value
    setUserData((prevUserData) => ({
      ...prevUserData,
      role: e,
    }));
  }
};

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

   // Validate required fields
   if (!userData.first_name && !userData.last_name) {
     Swal.fire({
       icon: 'error',
       title: 'Validation Error',
       text: 'First name or last name is required.',
     });
     return;
   }

   if (!userData.email) {
     Swal.fire({
       icon: 'error',
       title: 'Validation Error',
       text: 'Email is required.',
     });
     return;
   }

   // Prepare request body matching backend format (camelCase)
   const requestBody: any = {
     firstName: userData.first_name,
     lastName: userData.last_name,
     email: userData.email,
   };
   
   // Only include optional fields if they have values
   if (userData.password) {
     requestBody.password = userData.password;
   }
   if (userData.role) {
     requestBody.role = userData.role;
   }
   if (userData.contact) {
     requestBody.contact = userData.contact;
   }
   
   // Remove undefined fields
   Object.keys(requestBody).forEach(key => {
     if (requestBody[key as keyof typeof requestBody] === undefined) {
       delete requestBody[key as keyof typeof requestBody];
     }
   });

   console.log('Submitting user data:', requestBody);

   // If avatar is selected, send as multipart/form-data
   if (userData.avatar) {
    const formData = new FormData();
     formData.append('image', userData.avatar); // Backend expects 'image' field
     Object.entries(requestBody).forEach(([key, value]) => {
       if (value !== undefined && value !== null) {
         formData.append(key, value as string);
       }
     });
     
     console.log('Sending FormData with image');
    http
       .post(`/users`, formData, { 
         headers: { 'Content-Type': 'multipart/form-data' } 
       })
       .then((response: any) => {
      Swal.fire({
        icon: 'success',
        title: 'User Added',
        text: 'The user has been added successfully!',
      });
      router.push(`/users`);
    })
    .catch((error: any) => {
         console.error('Error adding user:', error);
         console.error('Error response:', error.response?.data);
         
         // Show validation errors from backend
         if (error.response?.status === 400 && error.response?.data?.errors) {
           const errors = error.response.data.errors;
           const errorMessages = errors.map((err: any) => err.msg).join(', ');
           Swal.fire({
             icon: 'error',
             title: 'Validation Error',
             text: errorMessages,
           });
         } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
             text: error.response?.data?.message || 'Failed to add user',
           });
         }
       });
   } else {
     // No avatar, send as JSON
     http
       .post(`/users`, requestBody)
       .then((response: any) => {
         Swal.fire({
           icon: 'success',
           title: 'User Added',
           text: 'The user has been added successfully!',
      });
         router.push(`/users`);
       })
     .catch((error: any) => {
       console.error('Error adding user:', error);
       console.error('Error response:', error.response?.data);
       
       // Show validation errors from backend
       if (error.response?.status === 400 && error.response?.data?.errors) {
         const errors = error.response.data.errors;
         const errorMessages = errors.map((err: any) => err.msg).join(', ');
         Swal.fire({
           icon: 'error',
           title: 'Validation Failed',
           text: errorMessages || error.response.data.message || 'Please check your input and try again.',
         });
       } else {
         Swal.fire({
           icon: 'error',
           title: 'Error',
           text: error.response?.data?.message || 'An error occurred while adding the user. Please try again later.',
         });
       }
     });
   }
 };

// handleChangerole removed - role is now handled directly in Select onChange

  const handleCancel = () => {
    router.push(`/users`);
  };

  useEffect(() => {
    fetchRoleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <MainCard>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <InputLabel sx={{ mb: 1 }}>First Name</InputLabel>
            <TextField name="first_name" value={userData.first_name} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InputLabel sx={{ mb: 1 }}>Last Name</InputLabel>
            <TextField name="last_name" value={userData.last_name} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InputLabel sx={{ mb: 1 }}>Email</InputLabel>
            <TextField name="email" value={userData.email} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InputLabel sx={{ mb: 1 }}>Password</InputLabel>
            <TextField 
              name="password" 
              type="password"
              value={userData.password} 
              onChange={handleChange} 
              fullWidth 
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InputLabel sx={{ mb: 1 }}>Role</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              name="role"
              placeholder="Role"
              value={role}
              onChange={(e) => {
                const selectedRole = e.target.value;
                console.log('Selected role:', selectedRole);
                setRoles(selectedRole); // Mettre à jour l'état du rôle
                setUserData((prevUserData) => ({
                  ...prevUserData,
                  role: selectedRole,
                }));
              }}
              fullWidth
              displayEmpty
            >
              <MenuItem value="" disabled>
                <em>Select a role</em>
              </MenuItem>
              {Array.isArray(rolesData) && rolesData.length > 0 ? (
                rolesData.map((roleItem: any, index: number) => {
                  const roleValue = roleItem.name || roleItem.id || roleItem;
                  const roleLabel = roleItem.name || roleItem.label || roleItem;
                  console.log('Rendering role:', { roleValue, roleLabel, roleItem });
                  return (
                    <MenuItem key={roleItem.id || index} value={roleValue}>
                      {roleLabel}
                    </MenuItem>
                  );
                })
              ) : (
                <MenuItem value="" disabled>
                  No roles available
                </MenuItem>
              )}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6}>
            <InputLabel sx={{ mb: 1 }}>Contact</InputLabel>
            <TextField name="contact" value={userData.contact} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} md={3}>
            <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
              <FormLabel
                htmlFor="change-avatar"
                component="label"
                sx={{
                  position: 'relative',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  width: 120,
                  height: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    '& .overlay': { opacity: 1 }
                  }
                }}
              >
                <Avatar 
                  alt="Avatar" 
                  src={avatarPreview || undefined} 
                  size="xl"
                  sx={{ width: 120, height: 120 }}
                />

                <Box
                  className="overlay"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'opacity 0.3s'
                  }}
                >
                  <Stack spacing={0.5} alignItems="center">
                    <Camera style={{ color: 'white', fontSize: '2rem' }} />
                    <Typography sx={{ color: 'white', fontSize: '0.875rem' }}>Upload</Typography>
                  </Stack>
                </Box>
              </FormLabel>
              
              <TextField
                type="file"
                id="change-avatar"
                name="avatar" 
                variant="outlined"
                sx={{ display: 'none' }}
                onChange={handleChange}
                inputProps={{ accept: 'image/*' }}
              />
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" color="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="contained" type="submit">
                Add User
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </MainCard>
  );
};

export default AddUser;
