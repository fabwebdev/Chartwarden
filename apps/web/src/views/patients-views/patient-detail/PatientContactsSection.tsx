import React, { useState, useEffect } from 'react';
import {
  Box,
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
  AccordionDetails
} from '@mui/material';
import { Call, Add, Edit2, Trash, TickCircle, ArrowDown2, Profile2User, Sms } from 'iconsax-react';
import { PatientContact, CreatePatientContactRequest } from '../../../types/patient';
import {
  getPatientContacts,
  createPatientContact,
  updatePatientContact,
  deletePatientContact,
  setPatientContactPrimary
} from '../../../api/patient';
import Swal from 'sweetalert2';
import AuthService from 'types/AuthService';

interface PatientContactsSectionProps {
  patientId: string | number;
}

const CONTACT_TYPES = [
  { value: 'EMERGENCY', label: 'Emergency Contact', color: 'error' as const },
  { value: 'FAMILY', label: 'Family Member', color: 'primary' as const },
  { value: 'CAREGIVER', label: 'Caregiver', color: 'success' as const },
  { value: 'HEALTHCARE_PROXY', label: 'Healthcare Proxy', color: 'warning' as const },
  { value: 'LEGAL', label: 'Legal Contact', color: 'info' as const },
  { value: 'FUNERAL_HOME', label: 'Funeral Home', color: 'default' as const },
  { value: 'CLERGY', label: 'Clergy/Spiritual', color: 'secondary' as const },
  { value: 'OTHER', label: 'Other', color: 'default' as const }
];

const PHONE_TYPES = [
  { value: 'MOBILE', label: 'Mobile' },
  { value: 'HOME', label: 'Home' },
  { value: 'WORK', label: 'Work' }
];

const CONTACT_METHODS = [
  { value: 'PHONE', label: 'Phone Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'TEXT', label: 'Text Message' }
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const PatientContactsSection: React.FC<PatientContactsSectionProps> = ({ patientId }) => {
  const { logout, permissions, user } = AuthService();
  const [contacts, setContacts] = useState<PatientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedContact, setSelectedContact] = useState<PatientContact | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<CreatePatientContactRequest>({
    contact_type: 'EMERGENCY',
    first_name: '',
    last_name: '',
    relationship: '',
    primary_phone: '',
    primary_phone_type: 'MOBILE',
    email: '',
    authorized_for_phi: false,
    authorized_for_decisions: false
  });

  // Check permissions
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin';
  const canEdit = isAdmin || permissions.includes('update:patient') || permissions.includes('patients_principal_menu_edit');

  useEffect(() => {
    fetchContacts();
  }, [patientId]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await getPatientContacts(patientId);
      setContacts(response.data || []);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (contact?: PatientContact) => {
    if (contact) {
      setEditMode(true);
      setSelectedContact(contact);
      setFormData({
        contact_type: contact.contact_type || 'EMERGENCY',
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        middle_name: contact.middle_name,
        relationship: contact.relationship || '',
        relationship_detail: contact.relationship_detail,
        primary_phone: contact.primary_phone || '',
        primary_phone_type: contact.primary_phone_type || 'MOBILE',
        secondary_phone: contact.secondary_phone,
        secondary_phone_type: contact.secondary_phone_type,
        email: contact.email,
        address_line_1: contact.address_line_1,
        address_line_2: contact.address_line_2,
        city: contact.city,
        state: contact.state,
        zip_code: contact.zip_code,
        preferred_contact_method: contact.preferred_contact_method,
        preferred_contact_time: contact.preferred_contact_time,
        preferred_language: contact.preferred_language,
        priority: contact.priority,
        authorized_for_phi: contact.authorized_for_phi || false,
        authorized_for_decisions: contact.authorized_for_decisions || false,
        has_key_to_home: contact.has_key_to_home,
        lives_with_patient: contact.lives_with_patient,
        healthcare_proxy_document: contact.healthcare_proxy_document,
        power_of_attorney: contact.power_of_attorney,
        notes: contact.notes,
        special_instructions: contact.special_instructions
      });
    } else {
      setEditMode(false);
      setSelectedContact(null);
      setFormData({
        contact_type: 'EMERGENCY',
        first_name: '',
        last_name: '',
        relationship: '',
        primary_phone: '',
        primary_phone_type: 'MOBILE',
        email: '',
        authorized_for_phi: false,
        authorized_for_decisions: false
      });
    }
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setSelectedContact(null);
    setShowAdvanced(false);
  };

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name || !formData.relationship || !formData.primary_phone) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Please fill in all required fields' });
      return;
    }

    try {
      if (editMode && selectedContact?.id) {
        await updatePatientContact(patientId, selectedContact.id, formData);
        Swal.fire({ icon: 'success', title: 'Success', text: 'Contact updated successfully' });
      } else {
        await createPatientContact(patientId, formData);
        Swal.fire({ icon: 'success', title: 'Success', text: 'Contact added successfully' });
      }
      handleCloseDialog();
      fetchContacts();
    } catch (error: any) {
      console.error('Error saving contact:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to save contact'
      });
    }
  };

  const handleDelete = async (contactId: string | number) => {
    const result = await Swal.fire({
      title: 'Delete Contact?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it'
    });

    if (result.isConfirmed) {
      try {
        await deletePatientContact(patientId, contactId);
        Swal.fire({ icon: 'success', title: 'Deleted', text: 'Contact has been deleted' });
        fetchContacts();
      } catch (error: any) {
        console.error('Error deleting contact:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to delete contact'
        });
      }
    }
  };

  const handleSetPrimary = async (contactId: string | number) => {
    try {
      await setPatientContactPrimary(patientId, contactId);
      Swal.fire({ icon: 'success', title: 'Success', text: 'Contact set as primary' });
      fetchContacts();
    } catch (error: any) {
      console.error('Error setting primary contact:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to set primary contact'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Contacts" />
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  // Group contacts by type
  const emergencyContacts = contacts.filter(c => c.contact_type === 'EMERGENCY');
  const otherContacts = contacts.filter(c => c.contact_type !== 'EMERGENCY');

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Profile2User size={22} />
              <Typography variant="h5">Contacts</Typography>
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
                Add Contact
              </Button>
            )
          }
        />
        <Divider />
        <CardContent>
          {contacts.length === 0 ? (
            <Alert severity="info">No contacts on file. Click "Add Contact" to add one.</Alert>
          ) : (
            <Stack spacing={3}>
              {/* Emergency Contacts Section */}
              {emergencyContacts.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'error.main' }}>
                    Emergency Contacts ({emergencyContacts.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {emergencyContacts.map((contact) => (
                      <Grid item xs={12} md={6} key={contact.id}>
                        <ContactCard
                          contact={contact}
                          canEdit={canEdit}
                          onEdit={() => handleOpenDialog(contact)}
                          onDelete={() => handleDelete(contact.id!)}
                          onSetPrimary={() => handleSetPrimary(contact.id!)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Other Contacts Section */}
              {otherContacts.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Other Contacts ({otherContacts.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {otherContacts.map((contact) => (
                      <Grid item xs={12} md={6} key={contact.id}>
                        <ContactCard
                          contact={contact}
                          canEdit={canEdit}
                          onEdit={() => handleOpenDialog(contact)}
                          onDelete={() => handleDelete(contact.id!)}
                          onSetPrimary={() => handleSetPrimary(contact.id!)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <InputLabel>Contact Type *</InputLabel>
              <Select
                fullWidth
                value={formData.contact_type}
                onChange={(e) => setFormData({ ...formData, contact_type: e.target.value as any })}
              >
                {CONTACT_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="First Name *"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                label="Middle"
                value={formData.middle_name || ''}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="Last Name *"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Relationship *"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                placeholder="e.g., Spouse, Son, Daughter"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Relationship Detail"
                value={formData.relationship_detail || ''}
                onChange={(e) => setFormData({ ...formData, relationship_detail: e.target.value })}
                placeholder="e.g., Eldest daughter, Lives nearby"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Primary Phone *"
                value={formData.primary_phone}
                onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <InputLabel>Phone Type</InputLabel>
              <Select
                fullWidth
                value={formData.primary_phone_type || 'MOBILE'}
                onChange={(e) => setFormData({ ...formData, primary_phone_type: e.target.value as any })}
              >
                {PHONE_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Priority"
                type="number"
                value={formData.priority || 1}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>

            {/* Authorization Flags */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Authorization</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.authorized_for_phi || false}
                      onChange={(e) => setFormData({ ...formData, authorized_for_phi: e.target.checked })}
                    />
                  }
                  label="Authorized for PHI"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.authorized_for_decisions || false}
                      onChange={(e) => setFormData({ ...formData, authorized_for_decisions: e.target.checked })}
                    />
                  }
                  label="Can Make Care Decisions"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.has_key_to_home || false}
                      onChange={(e) => setFormData({ ...formData, has_key_to_home: e.target.checked })}
                    />
                  }
                  label="Has Key to Home"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.lives_with_patient || false}
                      onChange={(e) => setFormData({ ...formData, lives_with_patient: e.target.checked })}
                    />
                  }
                  label="Lives with Patient"
                />
              </Stack>
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
                        label="Secondary Phone"
                        value={formData.secondary_phone || ''}
                        onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <InputLabel>Preferred Contact Method</InputLabel>
                      <Select
                        fullWidth
                        value={formData.preferred_contact_method || ''}
                        onChange={(e) => setFormData({ ...formData, preferred_contact_method: e.target.value as any })}
                      >
                        <MenuItem value="">Not specified</MenuItem>
                        {CONTACT_METHODS.map((method) => (
                          <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>
                        ))}
                      </Select>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Address Line 1"
                        value={formData.address_line_1 || ''}
                        onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="City"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <InputLabel>State</InputLabel>
                      <Select
                        fullWidth
                        value={formData.state || ''}
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
                        label="ZIP Code"
                        value={formData.zip_code || ''}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Legal Documents</Typography>
                      <Stack direction="row" spacing={2}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.healthcare_proxy_document || false}
                              onChange={(e) => setFormData({ ...formData, healthcare_proxy_document: e.target.checked })}
                            />
                          }
                          label="Healthcare Proxy on File"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.power_of_attorney || false}
                              onChange={(e) => setFormData({ ...formData, power_of_attorney: e.target.checked })}
                            />
                          }
                          label="Power of Attorney on File"
                        />
                      </Stack>
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
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Special Instructions"
                        multiline
                        rows={2}
                        value={formData.special_instructions || ''}
                        onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                        placeholder="e.g., Best time to call, language preferences"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editMode ? 'Save Changes' : 'Add Contact'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Contact Card Component
interface ContactCardProps {
  contact: PatientContact;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, canEdit, onEdit, onDelete, onSetPrimary }) => {
  const getContactTypeConfig = (type?: string) => {
    const types: Record<string, { label: string; color: 'error' | 'primary' | 'success' | 'warning' | 'info' | 'default' | 'secondary' }> = {
      EMERGENCY: { label: 'Emergency', color: 'error' },
      FAMILY: { label: 'Family', color: 'primary' },
      CAREGIVER: { label: 'Caregiver', color: 'success' },
      HEALTHCARE_PROXY: { label: 'Healthcare Proxy', color: 'warning' },
      LEGAL: { label: 'Legal', color: 'info' },
      FUNERAL_HOME: { label: 'Funeral Home', color: 'default' },
      CLERGY: { label: 'Clergy', color: 'secondary' },
      OTHER: { label: 'Other', color: 'default' }
    };
    return types[type || 'OTHER'] || types.OTHER;
  };

  const typeConfig = getContactTypeConfig(contact.contact_type);
  const fullName = [contact.first_name, contact.middle_name, contact.last_name].filter(Boolean).join(' ');

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={typeConfig.label} size="small" color={typeConfig.color} />
            {contact.is_primary && (
              <Chip icon={<TickCircle size={14} />} label="Primary" size="small" color="success" />
            )}
            {contact.authorized_for_phi && (
              <Chip label="PHI" size="small" variant="outlined" />
            )}
            {contact.authorized_for_decisions && (
              <Chip label="Decisions" size="small" variant="outlined" />
            )}
          </Stack>
          {canEdit && (
            <Stack direction="row" spacing={0.5}>
              {!contact.is_primary && (
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

        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{fullName}</Typography>
        <Typography variant="body2" color="text.secondary">{contact.relationship}</Typography>

        <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Call size={14} />
            <Typography variant="body2">{contact.primary_phone}</Typography>
            {contact.primary_phone_type && (
              <Typography variant="caption" color="text.secondary">({contact.primary_phone_type})</Typography>
            )}
          </Stack>
        </Stack>

        {contact.email && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
            <Sms size={14} />
            <Typography variant="body2">{contact.email}</Typography>
          </Stack>
        )}

        {contact.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
            Note: {contact.notes}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientContactsSection;
