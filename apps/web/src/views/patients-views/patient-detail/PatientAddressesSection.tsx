import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { Location, Add, Edit2, Trash, TickCircle } from 'iconsax-react';
import { PatientAddress, CreatePatientAddressRequest } from '../../../types/patient';
import {
  getPatientAddresses,
  createPatientAddress,
  updatePatientAddress,
  deletePatientAddress,
  setPatientAddressPrimary
} from '../../../api/patient';
import Swal from 'sweetalert2';
import AuthService from 'types/AuthService';

interface PatientAddressesSectionProps {
  patientId: string | number;
}

const ADDRESS_TYPES = [
  { value: 'PRIMARY', label: 'Primary Residence' },
  { value: 'BILLING', label: 'Billing Address' },
  { value: 'MAILING', label: 'Mailing Address' },
  { value: 'FACILITY', label: 'Facility Address' },
  { value: 'TEMPORARY', label: 'Temporary Address' }
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const PatientAddressesSection: React.FC<PatientAddressesSectionProps> = ({ patientId }) => {
  const { logout, permissions, user } = AuthService();
  const [addresses, setAddresses] = useState<PatientAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<PatientAddress | null>(null);
  const [formData, setFormData] = useState<CreatePatientAddressRequest>({
    address_type: 'PRIMARY',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    county: '',
    phone_number: '',
    is_primary: false,
    notes: ''
  });

  // Check permissions
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin';
  const canEdit = isAdmin || permissions.includes('update:patient') || permissions.includes('patients_principal_menu_edit');

  useEffect(() => {
    fetchAddresses();
  }, [patientId]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await getPatientAddresses(patientId);
      setAddresses(response.data || []);
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (address?: PatientAddress) => {
    if (address) {
      setEditMode(true);
      setSelectedAddress(address);
      setFormData({
        address_type: address.address_type || 'PRIMARY',
        address_line_1: address.address_line_1 || '',
        address_line_2: address.address_line_2 || '',
        city: address.city || '',
        state: address.state || '',
        zip_code: address.zip_code || '',
        county: address.county || '',
        phone_number: address.phone_number || '',
        is_primary: address.is_primary || false,
        notes: address.notes || ''
      });
    } else {
      setEditMode(false);
      setSelectedAddress(null);
      setFormData({
        address_type: 'PRIMARY',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        zip_code: '',
        county: '',
        phone_number: '',
        is_primary: false,
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setSelectedAddress(null);
  };

  const handleSubmit = async () => {
    try {
      if (editMode && selectedAddress?.id) {
        await updatePatientAddress(patientId, selectedAddress.id, formData);
        Swal.fire({ icon: 'success', title: 'Success', text: 'Address updated successfully' });
      } else {
        await createPatientAddress(patientId, formData);
        Swal.fire({ icon: 'success', title: 'Success', text: 'Address added successfully' });
      }
      handleCloseDialog();
      fetchAddresses();
    } catch (error: any) {
      console.error('Error saving address:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to save address'
      });
    }
  };

  const handleDelete = async (addressId: string | number) => {
    const result = await Swal.fire({
      title: 'Delete Address?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it'
    });

    if (result.isConfirmed) {
      try {
        await deletePatientAddress(patientId, addressId);
        Swal.fire({ icon: 'success', title: 'Deleted', text: 'Address has been deleted' });
        fetchAddresses();
      } catch (error: any) {
        console.error('Error deleting address:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to delete address'
        });
      }
    }
  };

  const handleSetPrimary = async (addressId: string | number) => {
    try {
      await setPatientAddressPrimary(patientId, addressId);
      Swal.fire({ icon: 'success', title: 'Success', text: 'Address set as primary' });
      fetchAddresses();
    } catch (error: any) {
      console.error('Error setting primary address:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to set primary address'
      });
    }
  };

  const getAddressTypeLabel = (type?: string) => {
    const found = ADDRESS_TYPES.find(t => t.value === type);
    return found?.label || type || 'Unknown';
  };

  const formatAddress = (address: PatientAddress) => {
    const parts = [
      address.address_line_1,
      address.address_line_2,
      [address.city, address.state, address.zip_code].filter(Boolean).join(', ')
    ].filter(Boolean);
    return parts.join('\n');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Addresses" />
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Location size={22} />
              <Typography variant="h5">Addresses</Typography>
            </Stack>
          }
          action={
            canEdit && (
              <Button
                variant="contained"
                size="small"
                startIcon={<Add size={18} />}
                onClick={() => handleOpenDialog()}
              >
                Add Address
              </Button>
            )
          }
        />
        <Divider />
        <CardContent>
          {addresses.length === 0 ? (
            <Alert severity="info">No addresses on file. Click "Add Address" to add one.</Alert>
          ) : (
            <Grid container spacing={2}>
              {addresses.map((address) => (
                <Grid item xs={12} md={6} key={address.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={getAddressTypeLabel(address.address_type)}
                            size="small"
                            color={address.address_type === 'PRIMARY' ? 'primary' : 'default'}
                          />
                          {address.is_primary && (
                            <Chip
                              icon={<TickCircle size={14} />}
                              label="Primary"
                              size="small"
                              color="success"
                            />
                          )}
                          {address.is_verified && (
                            <Chip label="Verified" size="small" color="info" />
                          )}
                        </Stack>
                        {canEdit && (
                          <Stack direction="row" spacing={0.5}>
                            {!address.is_primary && (
                              <IconButton size="small" onClick={() => handleSetPrimary(address.id!)} title="Set as Primary">
                                <TickCircle size={16} />
                              </IconButton>
                            )}
                            <IconButton size="small" onClick={() => handleOpenDialog(address)}>
                              <Edit2 size={16} />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDelete(address.id!)} color="error">
                              <Trash size={16} />
                            </IconButton>
                          </Stack>
                        )}
                      </Stack>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {formatAddress(address)}
                      </Typography>
                      {address.phone_number && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Phone: {address.phone_number}
                        </Typography>
                      )}
                      {address.county && (
                        <Typography variant="body2" color="text.secondary">
                          County: {address.county}
                        </Typography>
                      )}
                      {address.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                          Note: {address.notes}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Address' : 'Add New Address'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <InputLabel>Address Type</InputLabel>
              <Select
                fullWidth
                value={formData.address_type}
                onChange={(e) => setFormData({ ...formData, address_type: e.target.value as any })}
              >
                {ADDRESS_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 1 *"
                value={formData.address_line_1}
                onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 2"
                value={formData.address_line_2}
                onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City *"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <InputLabel>State *</InputLabel>
              <Select
                fullWidth
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              >
                <MenuItem value="">Select</MenuItem>
                {US_STATES.map((state) => (
                  <MenuItem key={state} value={state}>{state}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="ZIP Code *"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                placeholder="12345"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="County"
                value={formData.county}
                onChange={(e) => setFormData({ ...formData, county: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editMode ? 'Save Changes' : 'Add Address'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PatientAddressesSection;
