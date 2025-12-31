'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import http from '../../hooks/useCookie';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import MainCard from 'components/MainCard';
import Swal from 'sweetalert2';

const AddPermission = () => {
    const router = useRouter();
    const [permissionData, setPermissionData] = useState({
      name: '', // Assurez-vous d'initialiser le champ `name` avec une chaîne vide
    });
  
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setPermissionData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    };
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      http
      .post(`/permissions/store`, permissionData)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Permission Added',
          text: 'The permission has been added successfully!',
        });
        router.push(`/permissions`);
      })
      .catch((error: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'An error occurred while adding the permission. Please try again later.',
        });
      });
      
    };
    // const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    //     e.preventDefault();
    //     try {
    //       const response = await axios.post('http://127.0.0.1:8000/api/permissions/store', permissionData);
    //       console.log('Response:', response);
    //       // Afficher une alerte SweetAlert pour indiquer que la permission a été ajoutée avec succès
    //       Swal.fire({
    //         icon: 'success',
    //         title: 'Permission Added',
    //         text: 'The permission has been added successfully!',
    //       });
    //       router.push(`/permissions`);
    //     } catch (error) {
    //       console.error('Error adding permission:', error);
    //       // Afficher une alerte SweetAlert pour indiquer qu'il y a eu une erreur lors de l'ajout de la permission
    //       Swal.fire({
    //         icon: 'error',
    //         title: 'Error',
    //         text: 'An error occurred while adding the permission. Please try again later.',
    //       });
    //     }
    //   };
      
  
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
      
  
    return (
      <MainCard title="Create Permission">
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
                  value={permissionData.name}
                  onChange={handleChange} // Ajoutez le gestionnaire de changement
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="outlined" color="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button variant="contained" type="submit">
                  Add Permission
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </MainCard>
    );
  };

export default AddPermission;
