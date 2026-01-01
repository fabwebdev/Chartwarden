import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper
} from '@mui/material';
import { Hospital, Call, Sms, Location, TickCircle, Clock } from 'iconsax-react';
import { getPatientPharmacyById } from '../../../api/patient';
import AuthService from 'types/AuthService';

interface PatientPharmacySectionProps {
  patientId: string | number;
  pharmacyId?: string | number | null;
}

interface Pharmacy {
  id?: number | string;
  name?: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  fax?: string;
  email?: string;
  npi?: string;
  deaNumber?: string;
  pharmacyType?: string;
  operatingHours?: string;
  isActive?: boolean;
  is24Hour?: boolean;
  acceptsMedicare?: boolean;
  acceptsMedicaid?: boolean;
  deliversMedications?: boolean;
  notes?: string;
}

const PatientPharmacySection: React.FC<PatientPharmacySectionProps> = ({ patientId, pharmacyId }) => {
  const { logout } = AuthService();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pharmacyId) {
      fetchPharmacy();
    } else {
      setLoading(false);
    }
  }, [pharmacyId]);

  const fetchPharmacy = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPatientPharmacyById(pharmacyId!);
      setPharmacy(response.data || response);
    } catch (err: any) {
      console.error('Error fetching pharmacy:', err);
      if (err.response?.status === 401) {
        logout();
      } else {
        setError('Failed to load pharmacy information');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = () => {
    if (!pharmacy) return 'N/A';
    const parts = [
      pharmacy.address,
      pharmacy.addressLine2,
      [pharmacy.city, pharmacy.state, pharmacy.zip_code].filter(Boolean).join(', ')
    ].filter(Boolean);
    return parts.length > 0 ? parts.join('\n') : 'N/A';
  };

  const getPharmacyTypeLabel = (type?: string) => {
    const types: Record<string, string> = {
      RETAIL: 'Retail Pharmacy',
      MAIL_ORDER: 'Mail Order',
      SPECIALTY: 'Specialty Pharmacy',
      COMPOUNDING: 'Compounding Pharmacy',
      HOSPITAL: 'Hospital Pharmacy',
      LONG_TERM_CARE: 'Long-Term Care',
      OTHER: 'Other'
    };
    return types[type || ''] || type || 'Retail Pharmacy';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Pharmacy" />
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader title="Pharmacy" />
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!pharmacyId || !pharmacy) {
    return (
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Hospital size={22} />
              <Typography variant="h5">Pharmacy</Typography>
            </Stack>
          }
        />
        <Divider />
        <CardContent>
          <Alert severity="info">No pharmacy assigned. Select a pharmacy from the General tab.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Hospital size={22} />
            <Typography variant="h5">Pharmacy</Typography>
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1}>
            {pharmacy.is24Hour && (
              <Chip icon={<Clock size={14} />} label="24 Hour" size="small" color="success" />
            )}
            {pharmacy.deliversMedications && (
              <Chip label="Delivers" size="small" color="info" />
            )}
          </Stack>
        }
      />
      <Divider />
      <CardContent>
        <Grid container spacing={3}>
          {/* Pharmacy Name and Type */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>{pharmacy.name || 'Unnamed Pharmacy'}</Typography>
            <Chip label={getPharmacyTypeLabel(pharmacy.pharmacyType)} size="small" variant="outlined" />
          </Grid>

          {/* Address */}
          <Grid item xs={12} md={6}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Location size={18} style={{ marginTop: 4 }} />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {formatAddress()}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          {/* Contact Info */}
          <Grid item xs={12} md={6}>
            <Stack spacing={1.5}>
              {pharmacy.phone && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Call size={18} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                    <Typography variant="body2">{pharmacy.phone}</Typography>
                  </Box>
                </Stack>
              )}
              {pharmacy.fax && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Sms size={18} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Fax</Typography>
                    <Typography variant="body2">{pharmacy.fax}</Typography>
                  </Box>
                </Stack>
              )}
              {pharmacy.email && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Sms size={18} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                    <Typography variant="body2">{pharmacy.email}</Typography>
                  </Box>
                </Stack>
              )}
            </Stack>
          </Grid>

          {/* Identifiers */}
          {(pharmacy.npi || pharmacy.deaNumber) && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Identifiers</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    {pharmacy.npi && (
                      <TableRow>
                        <TableCell sx={{ fontWeight: 500, width: '40%' }}>NPI Number</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{pharmacy.npi}</TableCell>
                      </TableRow>
                    )}
                    {pharmacy.deaNumber && (
                      <TableRow>
                        <TableCell sx={{ fontWeight: 500 }}>DEA Number</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{pharmacy.deaNumber}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          )}

          {/* Acceptance Flags */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Insurance Acceptance</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                icon={pharmacy.acceptsMedicare ? <TickCircle size={14} /> : undefined}
                label="Medicare"
                size="small"
                color={pharmacy.acceptsMedicare ? 'success' : 'default'}
                variant={pharmacy.acceptsMedicare ? 'filled' : 'outlined'}
              />
              <Chip
                icon={pharmacy.acceptsMedicaid ? <TickCircle size={14} /> : undefined}
                label="Medicaid"
                size="small"
                color={pharmacy.acceptsMedicaid ? 'success' : 'default'}
                variant={pharmacy.acceptsMedicaid ? 'filled' : 'outlined'}
              />
            </Stack>
          </Grid>

          {/* Notes */}
          {pharmacy.notes && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Notes</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {pharmacy.notes}
              </Typography>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PatientPharmacySection;
