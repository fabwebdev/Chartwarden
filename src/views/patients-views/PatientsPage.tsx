'use client'; 

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import {  Edit, Eye, Trash } from 'iconsax-react';
import Tooltip from '@mui/material/Tooltip';
import Swal from 'sweetalert2';
import http from '../../hooks/useCookie';
import AuthService from 'types/AuthService';
import { ListItemIcon, ListItemSecondaryAction, MenuItem, Select, Typography } from '@mui/material';
import MainCard from 'components/MainCard';
import { usePatientStore } from '../../store/patientStore';

const PatientsPage = () => {
  const router = useRouter();
  const [PatientsData, setPatientsData] = useState<any[]>([]);
  const { permissions, logout } = AuthService();
  const { setSelectedPatient } = usePatientStore();
  // Fonction pour mettre à jour la clé
  const handleAddPatient = () => {
    router.push('/patients/add-new-patient');
  };
  const fetchPermissionsData = async () => {
    try {
      const response = await http.get(`/rbac/permissions`);
      if (response.data && response.data.length > 0) {
      } 
    } catch (error: any) {
      if (error.response.status === 401) {
        logout();
      }
    }
  };

  const fetchPatientData = async () => {
    http
      .get('/patient')
      .then((response: any) => {
        console.log('Patients API Response:', response);
        console.log('Response data:', response.data);
        
        // Handle different response structures
        let patients = [];
        if (Array.isArray(response.data)) {
          // Direct array response
          patients = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          // Nested data structure: { data: [...] }
          patients = response.data.data;
        } else if (response.data?.patients && Array.isArray(response.data.patients)) {
          // Nested patients structure: { patients: [...] }
          patients = response.data.patients;
        } else if (response.data?.data?.patients && Array.isArray(response.data.data.patients)) {
          // Deeply nested: { data: { patients: [...] } }
          patients = response.data.data.patients;
        } else {
          console.warn('Unexpected patients response structure:', response.data);
          patients = [];
        }
        
        console.log('Processed patients array:', patients);
        setPatientsData(patients);
      })
      .catch((error: any) => {
        console.error('Error fetching patients:', error);
        if (error.response?.status === 401) {
          logout();
        } else {
          console.error('Error response:', error.response?.data);
        }
        // Set empty array on error to prevent forEach errors
        setPatientsData([]);
      });
  };

  const hasPermission = (permission: any) => {
    return permissions.includes(permission);
  };

  // Check if user has update patient permission (supports both old and new format)
  const hasUpdatePatientPermission = () => {
    return hasPermission('patients_principal_menu_edit') || 
           hasPermission('update:patient');
  };
  const handleRowClick = (patientId: any) => {
    // Find the selected patient from the list
    const selectedPatient = PatientsData.find((p) => p.id === patientId);
    
    // Store the selected patient in Zustand store
    if (selectedPatient) {
      setSelectedPatient(patientId, selectedPatient);
      console.log('Patient selected and stored in Zustand:', selectedPatient);
    }
    
    router.push(`/patients/patient-info/${patientId}`);
  };
  
  const handleSelectChange = (event: any) => {
    const patientId = event.target.value;
    if (patientId) {
      const selectedPatient = PatientsData.find((p) => p.id === patientId);
      if (selectedPatient) {
        setSelectedPatient(patientId, selectedPatient);
        console.log('Patient selected from dropdown and stored in Zustand:', selectedPatient);
        // Optionally navigate to patient info page
        // router.push(`/patients/patient-info/${patientId}`);
      }
    }
  };
  useEffect(() => {
    fetchPatientData();
    fetchPermissionsData();
  }, []);


  const handleEditPatient = (PatientId: number) => {
    router.push(`/patients/edit-patient/${PatientId}`);
  };

  const handleDeletePatient = async (PatientId: number) => {
    console.log('providersId', PatientId);
    http
      .delete(`/patient/${PatientId}`)
      .then((response: any) => {
        console.log('Response Delete:', response.data);
        Swal.fire({
          icon: 'success',
          title: 'Patient Delete',
          text: response.data.message
        });
        fetchPatientData();
      })
      .catch((error) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'An error occurred while delete patient Please try again later.'
        });
      });
  };

  return (
    <>
      <Grid container spacing={3} justifyContent="flex-end" alignItems="center">
        <Grid item>
          <Button variant="contained" color="primary" onClick={handleAddPatient}>
            Add Patient
          </Button>
        </Grid>
        <Grid item xs={12}>
          <MainCard title="Patient ">
            <Grid item xs={12}>
              <Stack spacing={1.25}>
                <Select 
                  fullWidth 
                  id="patient"
                  value=""
                  onChange={handleSelectChange}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    <em>Select a patient</em>
                  </MenuItem>
                  {PatientsData.map((patient, index) => (
                    <MenuItem key={index} value={patient.id}>
                      <Grid container>
                          <Grid item xs={8} sx={{}}  onClick={() => handleRowClick(patient.id)}>
                      <Typography variant="body1" color="primary" >
                      {patient.last_name} {patient.first_name}
                        </Typography>
                          </Grid>
                          <Grid item xs={4}>
                      <ListItemSecondaryAction>
                        <ListItemIcon>
                          {hasPermission('patients_principal_menu') && (
                            <Tooltip title="View">
                              <IconButton
                                color="secondary"
                                onClick={() => {
                                  handleRowClick(patient.id);
                                }}
                              >
                                <Eye />
                              </IconButton>
                            </Tooltip>
                          )}
                          {hasUpdatePatientPermission() && (
                            <Tooltip title="Edit">
                              <IconButton color="primary" onClick={() => handleEditPatient(patient.id)}>
                                <Edit />
                              </IconButton>
                            </Tooltip>
                          )}{' '}
                          {hasPermission('patients_principal_menu_delete') && (
                            <Tooltip title="Delete">
                              <IconButton color="error" onClick={() => handleDeletePatient(patient.id)}>
                                <Trash />
                              </IconButton>
                            </Tooltip>
                          )}
                        </ListItemIcon>
                      </ListItemSecondaryAction>
                          </Grid>
                      </Grid>
                    </MenuItem>
                  ))}
                </Select>
              </Stack>
            </Grid>
          </MainCard>
        </Grid>
      </Grid>
    </>
  );
};

export default PatientsPage;
