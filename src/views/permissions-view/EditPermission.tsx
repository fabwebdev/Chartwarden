'use client';

// EditPermission.jsx

import { useEffect, useState } from 'react';
import http from '../../hooks/useCookie';
import MainCard from 'components/MainCard';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Swal from 'sweetalert2';

const EditPermission = ({ permissionId }: { permissionId: any })  => {
  const [editedPermissionData, setEditedPermissionData] = useState({
    id: '',
    name: '',
    // Autres champs de permission
  });

  useEffect(() => {
    const fetchPermissionData = async () => {
      http
      .get(`/permissions/${permissionId}`)
      .then((response: any) => {
        setEditedPermissionData(response.data);
      })
      .catch((error: any) => {
        console.log('error', error);
      });
    };

    if (permissionId) {
      fetchPermissionData();
    }
  }, [permissionId]);

  const handleChange = (e:any) => {
    const { name, value } = e.target;
    setEditedPermissionData((prevPermissionData) => ({
      ...prevPermissionData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e:any) => {
    e.preventDefault();
    http
    .put(`/permissions/${permissionId}`, editedPermissionData)
    .then((response: any) => {
      Swal.fire({
        icon: 'success',
        title: 'Permission update',
        text: 'The permission has been update successfully!',
      });
      window.location.href = '/permissions';
    })
    .catch((error: any) => {
      console.log('error', error);
    });
  };

  const handleCancel = () => {
    window.location.href = '/permissions';
  };

  return (
    <MainCard title="Edit Permission">
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
                value={editedPermissionData.name}
                onChange={handleChange}
              />
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" color="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="contained" type="submit">
                Submit
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </MainCard>
  );
};

export default EditPermission;
