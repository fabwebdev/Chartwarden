
// PROJECT IMPORTS
import {Button, Grid,Typography } from '@mui/material';
import MainCard from 'components/MainCard';
import { useMemo, useState } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';
import { useParams } from 'next/navigation';
import { createBenefitPeriod } from '../../api/patient';
import Swal from 'sweetalert2';
import AuthService from 'types/AuthService';

const CerticationsPage = () => {
  const { id } = useParams();
  const patientId = Array.isArray(id) ? id[0] : id;
  const { permissions, user } = AuthService();
  const [loading, setLoading] = useState(false);

  // Check if user has permission to create benefit periods
  const canCreateBenefitPeriod = () => {
    const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';
    if (isAdmin) return true;
    // Add specific permission check if needed
    return permissions.includes('update:patient') || permissions.includes('create:patient');
  };

  const handleCreateBenefitPeriod = async () => {
    if (!patientId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Patient ID is missing',
      });
      return;
    }

    try {
      setLoading(true);
      await createBenefitPeriod(patientId);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Benefit period created successfully!',
      });
      // Optionally refresh the page or update state
      window.location.reload();
    } catch (error: any) {
      console.error('Error creating benefit period:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to create benefit period',
      });
    } finally {
      setLoading(false);
    }
  };
  const columns = useMemo(
    () => [
      {
        Header: 'Period',
        accessor: 'peruod',
        sticky: 'left',
      },
      {
        Header: 'Start',
        accessor: 'start',
        sticky: 'left',
      },
      {
        Header: 'Nurse Narr.',
        accessor: 'Nurse',
        sticky: 'left',
      },
      {
        Header: 'Verbal',
        accessor: 'verbal',
        sticky: 'left',
      },
      {
        Header: 'Face to Face',
        accessor: 'face_face',
        sticky: 'left',
      },
      {
        Header: 'Attestation ',
        accessor: 'attestation',
        sticky: 'left',
      },
      {
        Header: 'Final',
        accessor: 'final',
        sticky: 'left',
      },
      
    ],
    []
  );
  return (
    <>
     <MainCard>
  <Grid container alignItems="center">
    <Grid item xs={6}> {/* Colonne pour le titre */}
      <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
      Benefit Periods & Certifications
      </Typography>
    </Grid>
    <Grid item xs={6} textAlign="right"> {/* Colonne pour le bouton */}
      {canCreateBenefitPeriod() && (
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleCreateBenefitPeriod}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'New Benefit Period'}
        </Button>
      )}
    </Grid>
    <Grid item xs={12} sx={{ mt: 3 }}> {/* Colonne pour le contenu */}
      <StickyTable columns={columns} data={[]} />
    </Grid>
  </Grid>
</MainCard>

    </>
  );
};

export default CerticationsPage;