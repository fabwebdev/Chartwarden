import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, Grid, Stack, Typography, Alert, Breadcrumbs, Link } from '@mui/material';
import MainCard from 'components/MainCard';
import { User, ArrowRight2 } from 'iconsax-react';
import { getPatientById } from '../../../api/patient';
import AuthService from 'types/AuthService';
import { Patient } from '../../../types/patient';

// Import section components
import PatientDemographicsCard from './PatientDemographicsCard';
import PatientIdentifiersCard from './PatientIdentifiersCard';
import PatientAddressesSection from './PatientAddressesSection';
import PatientContactsSection from './PatientContactsSection';
import PatientPharmacySection from './PatientPharmacySection';
import PatientPayersSection from './PatientPayersSection';

interface PatientDetailPageProps {
  patientId?: string | number;
  showBreadcrumbs?: boolean;
}

const PatientDetailPage: React.FC<PatientDetailPageProps> = ({ patientId: propPatientId, showBreadcrumbs = true }) => {
  const params = useParams();
  const { logout } = AuthService();

  // Use prop patientId if provided, otherwise get from URL params
  const patientId = propPatientId || (Array.isArray(params?.id) ? params.id[0] : params?.id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      fetchPatient();
    }
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPatientById(patientId!);
      // Handle different response structures
      const patientData = response.data || response;
      setPatient(patientData);
    } catch (err: any) {
      console.error('Error fetching patient:', err);
      if (err.response?.status === 401) {
        logout();
      } else if (err.response?.status === 404) {
        setError('Patient not found');
      } else {
        setError('Failed to load patient data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPatientFullName = () => {
    if (!patient) return 'Patient';
    return [patient.first_name, patient.mi, patient.last_name, patient.suffix]
      .filter(Boolean)
      .join(' ');
  };

  if (loading) {
    return (
      <MainCard>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Stack spacing={2} alignItems="center">
            <CircularProgress size={48} />
            <Typography color="text.secondary">Loading patient details...</Typography>
          </Stack>
        </Box>
      </MainCard>
    );
  }

  if (error) {
    return (
      <MainCard>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      </MainCard>
    );
  }

  if (!patient) {
    return (
      <MainCard>
        <Alert severity="warning">No patient data available</Alert>
      </MainCard>
    );
  }

  return (
    <Box>
      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        <Breadcrumbs separator={<ArrowRight2 size={14} />} sx={{ mb: 2 }}>
          <Link href="/patients" color="inherit" underline="hover">
            Patients
          </Link>
          <Typography color="text.primary">{getPatientFullName()}</Typography>
        </Breadcrumbs>
      )}

      {/* Page Header */}
      <MainCard sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}
          >
            <User size={28} />
          </Box>
          <Box>
            <Typography variant="h4">{getPatientFullName()}</Typography>
            <Typography variant="body2" color="text.secondary">
              Patient ID: {patient.id}
              {patient.date_of_birth && ` | DOB: ${new Date(patient.date_of_birth).toLocaleDateString('en-US')}`}
            </Typography>
          </Box>
        </Stack>
      </MainCard>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column - Demographics & Identifiers */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <PatientDemographicsCard patient={patient} loading={loading} />
            <PatientIdentifiersCard patient={patient} loading={loading} />
          </Stack>
        </Grid>

        {/* Right Column - Other Sections */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            {/* Addresses Section */}
            <PatientAddressesSection patientId={patientId!} />

            {/* Contacts Section */}
            <PatientContactsSection patientId={patientId!} />

            {/* Pharmacy Section */}
            <PatientPharmacySection
              patientId={patientId!}
              pharmacyId={patient.patient_pharmacy_id}
            />

            {/* Payers/Insurance Section */}
            <PatientPayersSection patientId={patientId!} />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PatientDetailPage;
