'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import http from '../../hooks/useCookie';
import MainCard from 'components/MainCard';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import Swal from 'sweetalert2';
import Box from '@mui/material/Box';  
import FormLabel from '@mui/material/FormLabel';
import Avatar from 'components/@extended/Avatar';
import { Camera } from 'iconsax-react';
import AuthService from 'types/AuthService';

const EditUser = ( {userId}: { userId: any }) => {
  const router = useRouter();
  const { logout} = AuthService();
  const [editedUserData, setEditedUserData] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: string;
    contact: string;
    avatar: File | null;
  }>({
    id: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: '',
    contact: '',
    avatar: null
  });
  const [rolesData, setRolesData] = useState<any[]>([]);
  const [role, setRoles] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fetchRoleData = async () => {
    http
    .get(`/rbac/roles`)
    .then((response: any) => {
      console.log('Roles API Response in EditUser:', response);
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
        console.warn('Unexpected roles response structure in EditUser:', response.data);
        roles = [];
      }
      
      console.log('Processed roles array in EditUser:', roles);
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
      console.log('Normalized roles array in EditUser:', normalizedRoles);
      setRolesData(normalizedRoles);
    })
    .catch((error: any) => {
      console.error('Error fetching roles in EditUser:', error);
      if(error.response?.status === 401){
        logout();
      }
      // Set empty array on error to prevent map errors
      setRolesData([]);
    });
  };


  const fetchUserData = async () => {
    http
    .get(`/users/${userId}`)
    .then((response: any) => {
      console.log('User API Response in EditUser:', response);
      console.log('Full response data:', JSON.stringify(response.data, null, 2));
      
      // Handle different response structures
      let user = null;
      let userRole = '';
      
      if (response.data?.user) {
        // Structure: { user: {...}, role: "..." }
        user = response.data.user;
        userRole = response.data.role || user.role || '';
      } else if (response.data?.data?.user) {
        // Structure: { data: { user: {...}, role: "..." } }
        user = response.data.data.user;
        userRole = response.data.data.role || user.role || '';
      } else if (response.data) {
        // Direct user object
        user = response.data;
        userRole = user.role || '';
      }
      
      if (!user) {
        console.error('No user data found in response');
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load user data'
        });
        return;
      }
      
      console.log('Extracted user data:', user);
      console.log('Extracted role:', userRole);
      
      // Map backend camelCase to frontend snake_case for form
      const firstName = user.firstName || user.first_name || '';
      const lastName = user.lastName || user.last_name || '';
      const email = user.email || '';
      const contact = user.contact || '';
      const avatarUrl = user.avatar || user.image || null;
      
      // Handle role - could be string or from roles array
      let finalRole = userRole;
      if (!finalRole && user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
        // If role is not set but roles array exists, use first role name
        finalRole = user.roles[0].name || user.roles[0];
      }
      
      setEditedUserData({
        id: user.id?.toString() || '',
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: '', // Don't pre-fill password
        role: finalRole,
        contact: contact,
        avatar: null // File object, not URL
      });
      
      // Set role for dropdown
      setRoles(finalRole);
      
      // Set avatar preview if URL exists
      if (avatarUrl) {
        setAvatarPreview(avatarUrl);
      }
      
      console.log('Form data set:', {
        first_name: firstName,
        last_name: lastName,
        email: email,
        contact: contact,
        role: finalRole
      });
    })
    .catch((error: any) => {
      console.error('Error fetching user data:', error);
      if(error.response?.status === 401){
        logout();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to load user data'
        });
      }
    });
  };
  useEffect(() => {
    fetchRoleData();
    fetchUserData();
  }, [userId]);

  // Cleanup avatar preview URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle file input for avatar
    if (name === 'avatar' && (e.target as HTMLInputElement).files) {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        setEditedUserData((prevUserData) => ({
          ...prevUserData,
          avatar: file,
        }));
      }
      return;
    }
    
    setEditedUserData((prevUserData) => ({
      ...prevUserData,
      [name]: value,
    }));
  };
  

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    // Prepare request body matching backend format (camelCase)
    const requestBody: any = {
      firstName: editedUserData.first_name,
      lastName: editedUserData.last_name,
      email: editedUserData.email,
    };
    
    // Only include optional fields if they have values
    if (editedUserData.password) {
      requestBody.password = editedUserData.password;
    }
    if (editedUserData.role) {
      requestBody.role = editedUserData.role;
    }
    if (editedUserData.contact) {
      requestBody.contact = editedUserData.contact;
    }
    
    // Handle image: if new file selected, convert to data URL; otherwise keep existing URL
    if (editedUserData.avatar) {
      // New file selected - convert to base64 data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        requestBody.image = base64String;
        
        console.log('Submitting user update with image data URL');
        submitUpdate(requestBody);
      };
      reader.onerror = () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to read image file'
        });
      };
      reader.readAsDataURL(editedUserData.avatar);
    } else if (avatarPreview && !avatarPreview.startsWith('blob:')) {
      // Existing image URL (not a blob URL from file selection)
      requestBody.image = avatarPreview;
      console.log('Submitting user update with existing image URL');
      submitUpdate(requestBody);
    } else {
      // No image to update
      console.log('Submitting user update without image');
      submitUpdate(requestBody);
    }
  };

  const submitUpdate = (requestBody: any) => {
    // Always send as JSON (Content-Type: application/json)
    http
      .put(`/users/${userId}`, requestBody)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'User updated',
          text: 'The user has been updated successfully!',
        });
        router.push(`/users`);
      })
      .catch((error: any) => {
        console.error('Update error:', error);
        console.error('Error response:', error.response?.data);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to update user'
        });
      });
  };

  const handleCancel = () => {
    // Rediriger vers la page des utilisateurs si l'utilisateur annule la modification
    window.location.href = '/users';
  };

  return (
    <MainCard>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <InputLabel sx={{ mb: 1 }}>First Name</InputLabel>
            <TextField name="first_name" value={editedUserData.first_name} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InputLabel sx={{ mb: 1 }}>Last Name</InputLabel>
            <TextField name="last_name" value={editedUserData.last_name} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InputLabel sx={{ mb: 1 }}>Email</InputLabel>
            <TextField name="email" value={editedUserData.email} type="email" onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InputLabel sx={{ mb: 1 }}>Password</InputLabel>
            <TextField 
              name="password" 
              type="password"
              value={editedUserData.password} 
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
                setRoles(selectedRole);
                setEditedUserData((prevUserData) => ({
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
            <TextField name="contact" value={editedUserData.contact} onChange={handleChange} fullWidth placeholder="Phone number or contact info" />
          </Grid>
          <Grid item xs={12} md={6}>
            <InputLabel sx={{ mb: 1 }}>Avatar Image</InputLabel>
            <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
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
                    <Typography sx={{ color: 'white' }}>Upload</Typography>
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
                Update User
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </MainCard>
  );
};

export default EditUser;
