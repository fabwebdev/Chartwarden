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
  Alert,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@mui/material';
import { CardCoin, Add, Edit2, Trash, TickCircle, ArrowDown2, Shield } from 'iconsax-react';
import { PatientPayer, CreatePatientPayerRequest, PayerType, SubscriberRelationship } from '../../../types/patient';
import {
  getPatientPayers,
  createPatientPayer,
  updatePatientPayer,
  deletePatientPayer,
  setPatientPayerPrimary,
  verifyPatientPayer
} from '../../../api/patient';
import Swal from 'sweetalert2';
import AuthService from 'types/AuthService';

interface PatientPayersSectionProps {
  patientId: string | number;
}

const PAYER_TYPES: Array<{ value: PayerType; label: string; color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' | 'default' }> = [
  { value: 'MEDICARE', label: 'Medicare', color: 'primary' },
  { value: 'MEDICAID', label: 'Medicaid', color: 'secondary' },
  { value: 'COMMERCIAL', label: 'Commercial', color: 'info' },
  { value: 'MANAGED_CARE', label: 'Managed Care', color: 'warning' },
  { value: 'TRICARE', label: 'TRICARE', color: 'success' },
  { value: 'CHAMPVA', label: 'CHAMPVA', color: 'success' },
  { value: 'WORKERS_COMP', label: 'Workers Comp', color: 'error' },
  { value: 'AUTO', label: 'Auto Insurance', color: 'warning' },
  { value: 'SELF_PAY', label: 'Self Pay', color: 'default' },
  { value: 'OTHER', label: 'Other', color: 'default' }
];

const SUBSCRIBER_RELATIONSHIPS: Array<{ value: SubscriberRelationship; label: string }> = [
  { value: 'SELF', label: 'Self' },
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'CHILD', label: 'Child' },
  { value: 'OTHER', label: 'Other' }
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const PatientPayersSection: React.FC<PatientPayersSectionProps> = ({ patientId }) => {
  const { logout, permissions, user } = AuthService();
  const [payers, setPayers] = useState<PatientPayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPayer, setSelectedPayer] = useState<PatientPayer | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<CreatePatientPayerRequest>({
    payer_type: 'MEDICARE',
    payer_name: '',
    payer_order: 1,
    policy_number: '',
    group_number: '',
    subscriber_relationship: 'SELF',
    is_active: true,
    is_primary: false
  });

  // Check permissions
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin';
  const canEdit = isAdmin || permissions.includes('update:patient') || permissions.includes('patients_principal_menu_edit');

  useEffect(() => {
    fetchPayers();
  }, [patientId]);

  const fetchPayers = async () => {
    try {
      setLoading(true);
      const response = await getPatientPayers(patientId);
      setPayers(response.data || []);
    } catch (error: any) {
      console.error('Error fetching payers:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (payer?: PatientPayer) => {
    if (payer) {
      setEditMode(true);
      setSelectedPayer(payer);
      setFormData({
        payer_type: payer.payer_type || 'MEDICARE',
        payer_name: payer.payer_name || '',
        payer_order: payer.payer_order || 1,
        payer_id: payer.payer_id,
        payer_phone: payer.payer_phone,
        payer_address_line1: payer.payer_address_line1,
        payer_city: payer.payer_city,
        payer_state: payer.payer_state,
        payer_zip: payer.payer_zip,
        policy_number: payer.policy_number,
        group_number: payer.group_number,
        group_name: payer.group_name,
        plan_name: payer.plan_name,
        subscriber_id: payer.subscriber_id,
        subscriber_name: payer.subscriber_name,
        subscriber_relationship: payer.subscriber_relationship || 'SELF',
        medicare_beneficiary_id: payer.medicare_beneficiary_id,
        medicare_hospice_election_date: payer.medicare_hospice_election_date,
        medicaid_id: payer.medicaid_id,
        medicaid_state: payer.medicaid_state,
        is_dual_eligible: payer.is_dual_eligible,
        effective_date: payer.effective_date,
        termination_date: payer.termination_date,
        authorization_number: payer.authorization_number,
        is_active: payer.is_active !== false,
        is_primary: payer.is_primary || false,
        notes: payer.notes
      });
    } else {
      setEditMode(false);
      setSelectedPayer(null);
      setFormData({
        payer_type: 'MEDICARE',
        payer_name: '',
        payer_order: payers.length + 1,
        policy_number: '',
        group_number: '',
        subscriber_relationship: 'SELF',
        is_active: true,
        is_primary: payers.length === 0 // First payer is primary by default
      });
    }
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setSelectedPayer(null);
    setShowAdvanced(false);
  };

  const handleSubmit = async () => {
    if (!formData.payer_type || !formData.payer_name) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Payer type and name are required' });
      return;
    }

    try {
      if (editMode && selectedPayer?.id) {
        await updatePatientPayer(patientId, selectedPayer.id, formData);
        Swal.fire({ icon: 'success', title: 'Success', text: 'Payer updated successfully' });
      } else {
        await createPatientPayer(patientId, formData);
        Swal.fire({ icon: 'success', title: 'Success', text: 'Payer added successfully' });
      }
      handleCloseDialog();
      fetchPayers();
    } catch (error: any) {
      console.error('Error saving payer:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to save payer'
      });
    }
  };

  const handleDelete = async (payerId: string | number) => {
    const result = await Swal.fire({
      title: 'Delete Payer?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it'
    });

    if (result.isConfirmed) {
      try {
        await deletePatientPayer(patientId, payerId);
        Swal.fire({ icon: 'success', title: 'Deleted', text: 'Payer has been deleted' });
        fetchPayers();
      } catch (error: any) {
        console.error('Error deleting payer:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to delete payer'
        });
      }
    }
  };

  const handleSetPrimary = async (payerId: string | number) => {
    try {
      await setPatientPayerPrimary(patientId, payerId);
      Swal.fire({ icon: 'success', title: 'Success', text: 'Payer set as primary' });
      fetchPayers();
    } catch (error: any) {
      console.error('Error setting primary payer:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to set primary payer'
      });
    }
  };

  const handleVerify = async (payerId: string | number) => {
    try {
      await verifyPatientPayer(patientId, payerId, {
        verification_method: 'MANUAL',
        eligibility_status: 'ACTIVE'
      });
      Swal.fire({ icon: 'success', title: 'Verified', text: 'Payer eligibility verified' });
      fetchPayers();
    } catch (error: any) {
      console.error('Error verifying payer:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to verify payer'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Insurance / Payer Information" />
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  // Sort payers by order
  const sortedPayers = [...payers].sort((a, b) => (a.payer_order || 1) - (b.payer_order || 1));

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <CardCoin size={22} />
              <Typography variant="h5">Insurance / Payer Information</Typography>
            </Stack>
          }
          subheader="Medicare, Medicaid, and other payer coverage"
          action={
            canEdit && (
              <Button
                variant="contained"
                size="small"
                startIcon={<Add size={18} />}
                onClick={() => handleOpenDialog()}
              >
                Add Payer
              </Button>
            )
          }
        />
        <Divider />
        <CardContent>
          {payers.length === 0 ? (
            <Alert severity="info">No payer information on file. Click "Add Payer" to add insurance coverage.</Alert>
          ) : (
            <Stack spacing={2}>
              {sortedPayers.map((payer, index) => (
                <PayerCard
                  key={payer.id}
                  payer={payer}
                  index={index}
                  canEdit={canEdit}
                  onEdit={() => handleOpenDialog(payer)}
                  onDelete={() => handleDelete(payer.id!)}
                  onSetPrimary={() => handleSetPrimary(payer.id!)}
                  onVerify={() => handleVerify(payer.id!)}
                />
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Payer' : 'Add New Payer'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12} sm={6}>
              <InputLabel>Payer Type *</InputLabel>
              <Select
                fullWidth
                value={formData.payer_type}
                onChange={(e) => setFormData({ ...formData, payer_type: e.target.value as PayerType })}
              >
                {PAYER_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payer Order"
                type="number"
                value={formData.payer_order || 1}
                onChange={(e) => setFormData({ ...formData, payer_order: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1, max: 10 }}
                helperText="1 = Primary, 2 = Secondary, etc."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Insurance Company Name *"
                value={formData.payer_name}
                onChange={(e) => setFormData({ ...formData, payer_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Policy/Member ID"
                value={formData.policy_number || ''}
                onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Group Number"
                value={formData.group_number || ''}
                onChange={(e) => setFormData({ ...formData, group_number: e.target.value })}
              />
            </Grid>

            {/* Medicare-specific fields */}
            {formData.payer_type === 'MEDICARE' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Medicare Beneficiary ID (MBI)"
                    value={formData.medicare_beneficiary_id || ''}
                    onChange={(e) => setFormData({ ...formData, medicare_beneficiary_id: e.target.value })}
                    inputProps={{ maxLength: 11 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Hospice Election Date"
                    type="date"
                    value={formData.medicare_hospice_election_date || ''}
                    onChange={(e) => setFormData({ ...formData, medicare_hospice_election_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}

            {/* Medicaid-specific fields */}
            {formData.payer_type === 'MEDICAID' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Medicaid ID"
                    value={formData.medicaid_id || ''}
                    onChange={(e) => setFormData({ ...formData, medicaid_id: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InputLabel>Medicaid State</InputLabel>
                  <Select
                    fullWidth
                    value={formData.medicaid_state || ''}
                    onChange={(e) => setFormData({ ...formData, medicaid_state: e.target.value })}
                  >
                    <MenuItem value="">Select</MenuItem>
                    {US_STATES.map((state) => (
                      <MenuItem key={state} value={state}>{state}</MenuItem>
                    ))}
                  </Select>
                </Grid>
              </>
            )}

            {/* Dual Eligible */}
            {(formData.payer_type === 'MEDICARE' || formData.payer_type === 'MEDICAID') && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_dual_eligible || false}
                      onChange={(e) => setFormData({ ...formData, is_dual_eligible: e.target.checked })}
                    />
                  }
                  label="Dual Eligible (Medicare + Medicaid)"
                />
              </Grid>
            )}

            {/* Subscriber Information */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Subscriber Information</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <InputLabel>Relationship to Subscriber</InputLabel>
              <Select
                fullWidth
                value={formData.subscriber_relationship || 'SELF'}
                onChange={(e) => setFormData({ ...formData, subscriber_relationship: e.target.value as SubscriberRelationship })}
              >
                {SUBSCRIBER_RELATIONSHIPS.map((rel) => (
                  <MenuItem key={rel.value} value={rel.value}>{rel.label}</MenuItem>
                ))}
              </Select>
            </Grid>
            {formData.subscriber_relationship !== 'SELF' && (
              <>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Subscriber ID"
                    value={formData.subscriber_id || ''}
                    onChange={(e) => setFormData({ ...formData, subscriber_id: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Subscriber Name"
                    value={formData.subscriber_name || ''}
                    onChange={(e) => setFormData({ ...formData, subscriber_name: e.target.value })}
                  />
                </Grid>
              </>
            )}

            {/* Coverage Dates */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Coverage Dates</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Effective Date"
                type="date"
                value={formData.effective_date || ''}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Termination Date"
                type="date"
                value={formData.termination_date || ''}
                onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Advanced Options */}
            <Grid item xs={12}>
              <Accordion expanded={showAdvanced} onChange={() => setShowAdvanced(!showAdvanced)}>
                <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
                  <Typography variant="subtitle2">Advanced Options</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Payer ID (EDI)"
                        value={formData.payer_id || ''}
                        onChange={(e) => setFormData({ ...formData, payer_id: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Plan Name"
                        value={formData.plan_name || ''}
                        onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Authorization Number"
                        value={formData.authorization_number || ''}
                        onChange={(e) => setFormData({ ...formData, authorization_number: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Payer Phone"
                        value={formData.payer_phone || ''}
                        onChange={(e) => setFormData({ ...formData, payer_phone: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Notes"
                        multiline
                        rows={2}
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Status Flags */}
            <Grid item xs={12}>
              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_active !== false}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_primary || false}
                      onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    />
                  }
                  label="Primary Payer"
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editMode ? 'Save Changes' : 'Add Payer'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Payer Card Component
interface PayerCardProps {
  payer: PatientPayer;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
  onVerify: () => void;
}

const PayerCard: React.FC<PayerCardProps> = ({ payer, index, canEdit, onEdit, onDelete, onSetPrimary, onVerify }) => {
  const getPayerTypeConfig = (type?: PayerType) => {
    const types: Record<PayerType, { label: string; color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' | 'default' }> = {
      MEDICARE: { label: 'Medicare', color: 'primary' },
      MEDICAID: { label: 'Medicaid', color: 'secondary' },
      COMMERCIAL: { label: 'Commercial', color: 'info' },
      MANAGED_CARE: { label: 'Managed Care', color: 'warning' },
      TRICARE: { label: 'TRICARE', color: 'success' },
      CHAMPVA: { label: 'CHAMPVA', color: 'success' },
      WORKERS_COMP: { label: 'Workers Comp', color: 'error' },
      AUTO: { label: 'Auto', color: 'warning' },
      SELF_PAY: { label: 'Self Pay', color: 'default' },
      OTHER: { label: 'Other', color: 'default' }
    };
    return types[type || 'OTHER'] || types.OTHER;
  };

  const typeConfig = getPayerTypeConfig(payer.payer_type);
  const orderLabel = payer.payer_order === 1 ? 'Primary' : payer.payer_order === 2 ? 'Secondary' : payer.payer_order === 3 ? 'Tertiary' : `#${payer.payer_order}`;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={orderLabel} size="small" color={payer.payer_order === 1 ? 'success' : 'default'} />
            <Chip label={typeConfig.label} size="small" color={typeConfig.color} />
            {payer.is_primary && (
              <Chip icon={<TickCircle size={14} />} label="Primary" size="small" color="success" />
            )}
            {payer.is_verified && (
              <Chip icon={<Shield size={14} />} label="Verified" size="small" color="info" />
            )}
            {payer.is_dual_eligible && (
              <Chip label="Dual Eligible" size="small" variant="outlined" />
            )}
            {!payer.is_active && (
              <Chip label="Inactive" size="small" color="default" />
            )}
          </Stack>
          {canEdit && (
            <Stack direction="row" spacing={0.5}>
              {!payer.is_verified && (
                <IconButton size="small" onClick={onVerify} title="Verify Eligibility">
                  <Shield size={16} />
                </IconButton>
              )}
              {!payer.is_primary && (
                <IconButton size="small" onClick={onSetPrimary} title="Set as Primary">
                  <TickCircle size={16} />
                </IconButton>
              )}
              <IconButton size="small" onClick={onEdit}>
                <Edit2 size={16} />
              </IconButton>
              <IconButton size="small" onClick={onDelete} color="error">
                <Trash size={16} />
              </IconButton>
            </Stack>
          )}
        </Stack>

        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{payer.payer_name}</Typography>
        {payer.plan_name && (
          <Typography variant="body2" color="text.secondary">{payer.plan_name}</Typography>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <Table size="small">
              <TableBody>
                {payer.policy_number && (
                  <TableRow>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0, width: '40%' }}>
                      <Typography variant="caption" color="text.secondary">Policy/Member ID</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0, fontFamily: 'monospace' }}>
                      {payer.policy_number}
                    </TableCell>
                  </TableRow>
                )}
                {payer.group_number && (
                  <TableRow>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0 }}>
                      <Typography variant="caption" color="text.secondary">Group Number</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0, fontFamily: 'monospace' }}>
                      {payer.group_number}
                    </TableCell>
                  </TableRow>
                )}
                {payer.medicare_beneficiary_id && (
                  <TableRow>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0 }}>
                      <Typography variant="caption" color="text.secondary">MBI</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0, fontFamily: 'monospace' }}>
                      {payer.medicare_beneficiary_id}
                    </TableCell>
                  </TableRow>
                )}
                {payer.medicaid_id && (
                  <TableRow>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0 }}>
                      <Typography variant="caption" color="text.secondary">Medicaid ID</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0, fontFamily: 'monospace' }}>
                      {payer.medicaid_id}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Table size="small">
              <TableBody>
                {payer.effective_date && (
                  <TableRow>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0, width: '40%' }}>
                      <Typography variant="caption" color="text.secondary">Effective</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0 }}>
                      {new Date(payer.effective_date).toLocaleDateString('en-US')}
                    </TableCell>
                  </TableRow>
                )}
                {payer.termination_date && (
                  <TableRow>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0 }}>
                      <Typography variant="caption" color="text.secondary">Terminates</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0 }}>
                      {new Date(payer.termination_date).toLocaleDateString('en-US')}
                    </TableCell>
                  </TableRow>
                )}
                {payer.authorization_number && (
                  <TableRow>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0 }}>
                      <Typography variant="caption" color="text.secondary">Auth #</Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 0.5, px: 0, fontFamily: 'monospace' }}>
                      {payer.authorization_number}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Grid>
        </Grid>

        {payer.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
            Note: {payer.notes}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientPayersSection;
