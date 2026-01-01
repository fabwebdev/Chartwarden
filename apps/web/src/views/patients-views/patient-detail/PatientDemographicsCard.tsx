import React from 'react';
import { Card, CardContent, CardHeader, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import { User, Calendar, Profile, SecurityUser, HeartCircle, Health, MoneyRecive } from 'iconsax-react';
import { Patient } from '../../../types/patient';

interface PatientDemographicsCardProps {
  patient: Patient | null;
  loading?: boolean;
}

const PatientDemographicsCard: React.FC<PatientDemographicsCardProps> = ({ patient, loading }) => {
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  // Format SSN to show only last 4 digits
  const formatSSN = (ssn?: string) => {
    if (!ssn) return 'N/A';
    // Remove any dashes and get last 4 digits
    const digits = ssn.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `XXX-XX-${digits.slice(-4)}`;
    }
    return 'XXX-XX-XXXX';
  };

  // Format gender for display
  const formatGender = (gender?: string) => {
    if (!gender) return 'N/A';
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Demographics" />
        <CardContent>
          <Typography>Loading patient demographics...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!patient) {
    return (
      <Card>
        <CardHeader title="Demographics" />
        <CardContent>
          <Typography color="text.secondary">No patient data available</Typography>
        </CardContent>
      </Card>
    );
  }

  const fullName = [
    patient.first_name,
    patient.mi,
    patient.last_name,
    patient.suffix
  ].filter(Boolean).join(' ');

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <User size={22} />
            <Typography variant="h5">Demographics</Typography>
          </Stack>
        }
        action={
          <Chip
            label={patient.hipaa_received === true || patient.hipaa_received === '1' || patient.hipaa_received === 'true' ? 'HIPAA Signed' : 'HIPAA Pending'}
            color={patient.hipaa_received === true || patient.hipaa_received === '1' || patient.hipaa_received === 'true' ? 'success' : 'warning'}
            size="small"
          />
        }
      />
      <Divider />
      <CardContent>
        <Grid container spacing={3}>
          {/* Name Section */}
          <Grid item xs={12}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Profile size={18} />
              <Typography variant="subtitle2" color="text.secondary">Full Name</Typography>
            </Stack>
            <Typography variant="h6">{fullName || 'N/A'}</Typography>
            {patient.preferred_name && (
              <Typography variant="body2" color="text.secondary">
                Preferred: {patient.preferred_name}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Date of Birth & Age */}
          <Grid item xs={12} sm={6}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Calendar size={18} />
              <Typography variant="subtitle2" color="text.secondary">Date of Birth</Typography>
            </Stack>
            <Typography variant="body1">{formatDate(patient.date_of_birth)}</Typography>
            <Typography variant="body2" color="text.secondary">Age: {calculateAge(patient.date_of_birth)}</Typography>
          </Grid>

          {/* Gender */}
          <Grid item xs={12} sm={6}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Profile size={18} />
              <Typography variant="subtitle2" color="text.secondary">Gender</Typography>
            </Stack>
            <Typography variant="body1">{formatGender(patient.genders)}</Typography>
          </Grid>

          {/* SSN */}
          <Grid item xs={12} sm={6}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <SecurityUser size={18} />
              <Typography variant="subtitle2" color="text.secondary">Social Security Number</Typography>
            </Stack>
            <Typography variant="body1">{formatSSN(patient.ssn)}</Typography>
          </Grid>

          {/* Patient Consents */}
          <Grid item xs={12} sm={6}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Health size={18} />
              <Typography variant="subtitle2" color="text.secondary">Patient Consents</Typography>
            </Stack>
            <Chip
              label={patient.patient_consents === '1' || patient.patient_consents === 'true' ? 'Yes' : 'No'}
              color={patient.patient_consents === '1' || patient.patient_consents === 'true' ? 'success' : 'default'}
              size="small"
            />
          </Grid>

          {/* Oxygen Dependent */}
          <Grid item xs={12} sm={6}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <HeartCircle size={18} />
              <Typography variant="subtitle2" color="text.secondary">Oxygen Dependent</Typography>
            </Stack>
            <Chip
              label={patient.oxygen_dependent_id ? 'Yes' : 'No'}
              color={patient.oxygen_dependent_id ? 'warning' : 'default'}
              size="small"
            />
          </Grid>

          {/* DNR Status */}
          <Grid item xs={12} sm={6}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <MoneyRecive size={18} />
              <Typography variant="subtitle2" color="text.secondary">DNR Status</Typography>
            </Stack>
            <Chip
              label={patient.dnr_id ? 'DNR on File' : 'Not Specified'}
              color={patient.dnr_id ? 'error' : 'default'}
              size="small"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PatientDemographicsCard;
