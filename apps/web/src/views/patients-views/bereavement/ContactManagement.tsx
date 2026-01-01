import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import {
  BereavementContact,
  CreateContactData,
  getCaseContacts,
  addContact,
  updateContact,
  formatRelationship,
  formatContactMethod,
  formatGriefStage,
  getStatusColor
} from 'api/bereavement';

interface ContactManagementProps {
  caseId: number;
  canEdit: boolean;
  onRefresh?: () => void;
}

interface ContactFormData {
  first_name: string;
  last_name: string;
  relationship_to_deceased: string;
  phone: string;
  email: string;
  address: string;
  preferred_contact_method: string;
  preferred_contact_times: string;
  preferred_language: string;
  is_primary_contact: boolean;
  wants_services: boolean;
  has_special_needs: boolean;
  special_needs_notes: string;
}

const initialFormData: ContactFormData = {
  first_name: '',
  last_name: '',
  relationship_to_deceased: '',
  phone: '',
  email: '',
  address: '',
  preferred_contact_method: 'PHONE',
  preferred_contact_times: '',
  preferred_language: 'English',
  is_primary_contact: false,
  wants_services: true,
  has_special_needs: false,
  special_needs_notes: ''
};

const ContactManagement: React.FC<ContactManagementProps> = ({
  caseId,
  canEdit,
  onRefresh
}) => {
  const [contacts, setContacts] = useState<BereavementContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedContact, setSelectedContact] = useState<BereavementContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCaseContacts(caseId);
      setContacts(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setSelectedContact(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleOpenEdit = (contact: BereavementContact) => {
    setFormData({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      relationship_to_deceased: contact.relationship_to_deceased || '',
      phone: contact.phone || '',
      email: contact.email || '',
      address: contact.address || '',
      preferred_contact_method: contact.preferred_contact_method || 'PHONE',
      preferred_contact_times: contact.preferred_contact_times || '',
      preferred_language: contact.preferred_language || 'English',
      is_primary_contact: contact.is_primary_contact || false,
      wants_services: contact.wants_services !== false,
      has_special_needs: contact.has_special_needs || false,
      special_needs_notes: contact.special_needs_notes || ''
    });
    setSelectedContact(contact);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleChange = (field: keyof ContactFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name) {
      setError('First name and last name are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (formMode === 'create') {
        await addContact(caseId, formData as CreateContactData);
      } else if (selectedContact) {
        await updateContact(selectedContact.id, formData as Partial<BereavementContact>);
      }

      setFormOpen(false);
      fetchContacts();
      onRefresh?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePrimary = async (contact: BereavementContact) => {
    try {
      await updateContact(contact.id, { is_primary_contact: !contact.is_primary_contact });
      fetchContacts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update contact');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <MainCard
        title="Family Contacts"
        secondary={
          canEdit && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Add Contact
            </Button>
          )
        }
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {contacts.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary" gutterBottom>
              No contacts have been added yet.
            </Typography>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleOpenCreate}
                sx={{ mt: 1 }}
              >
                Add First Contact
              </Button>
            )}
          </Box>
        ) : (
          <Grid container spacing={2}>
            {contacts.map((contact) => (
              <Grid item xs={12} md={6} key={contact.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {contact.first_name} {contact.last_name}
                          </Typography>
                          {contact.is_primary_contact && (
                            <Chip size="small" label="Primary" color="primary" />
                          )}
                        </Box>
                        {contact.relationship_to_deceased && (
                          <Typography variant="body2" color="text.secondary">
                            {formatRelationship(contact.relationship_to_deceased)}
                          </Typography>
                        )}
                      </Box>
                      {canEdit && (
                        <Box>
                          <Tooltip title={contact.is_primary_contact ? 'Remove as primary' : 'Set as primary'}>
                            <IconButton
                              size="small"
                              onClick={() => handleTogglePrimary(contact)}
                            >
                              {contact.is_primary_contact ? (
                                <StarIcon color="primary" />
                              ) : (
                                <StarBorderIcon />
                              )}
                            </IconButton>
                          </Tooltip>
                          <IconButton size="small" onClick={() => handleOpenEdit(contact)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Box display="flex" flexDirection="column" gap={0.5}>
                      {contact.phone && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2">{contact.phone}</Typography>
                        </Box>
                      )}
                      {contact.email && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2">{contact.email}</Typography>
                        </Box>
                      )}
                    </Box>

                    <Box display="flex" gap={1} flexWrap="wrap" mt={1.5}>
                      {contact.preferred_contact_method && (
                        <Chip
                          size="small"
                          label={`Prefers: ${formatContactMethod(contact.preferred_contact_method)}`}
                          variant="outlined"
                        />
                      )}
                      {contact.consent_status && (
                        <Chip
                          size="small"
                          label={`Consent: ${contact.consent_status}`}
                          color={getStatusColor(contact.consent_status)}
                          variant="outlined"
                        />
                      )}
                      {contact.grief_stage && (
                        <Chip
                          size="small"
                          label={formatGriefStage(contact.grief_stage)}
                          variant="outlined"
                        />
                      )}
                      {!contact.wants_services && (
                        <Chip
                          size="small"
                          label="Declined Services"
                          color="warning"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </MainCard>

      {/* Contact Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {formMode === 'create' ? 'Add Contact' : 'Edit Contact'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name *"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name *"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Relationship to Deceased</InputLabel>
                <Select
                  value={formData.relationship_to_deceased}
                  label="Relationship to Deceased"
                  onChange={(e) => handleChange('relationship_to_deceased', e.target.value)}
                >
                  <MenuItem value="">Select...</MenuItem>
                  <MenuItem value="SPOUSE">Spouse</MenuItem>
                  <MenuItem value="CHILD">Child</MenuItem>
                  <MenuItem value="PARENT">Parent</MenuItem>
                  <MenuItem value="SIBLING">Sibling</MenuItem>
                  <MenuItem value="FRIEND">Friend</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Preferred Contact Method</InputLabel>
                <Select
                  value={formData.preferred_contact_method}
                  label="Preferred Contact Method"
                  onChange={(e) => handleChange('preferred_contact_method', e.target.value)}
                >
                  <MenuItem value="PHONE">Phone</MenuItem>
                  <MenuItem value="EMAIL">Email</MenuItem>
                  <MenuItem value="MAIL">Mail</MenuItem>
                  <MenuItem value="IN_PERSON">In Person</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Preferred Contact Times"
                value={formData.preferred_contact_times}
                onChange={(e) => handleChange('preferred_contact_times', e.target.value)}
                placeholder="e.g., Mornings, After 5pm"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Preferred Language"
                value={formData.preferred_language}
                onChange={(e) => handleChange('preferred_language', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.is_primary_contact}
                    onChange={(e) => handleChange('is_primary_contact', e.target.checked)}
                  />
                }
                label="Primary contact for bereavement services"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.wants_services}
                    onChange={(e) => handleChange('wants_services', e.target.checked)}
                  />
                }
                label="Wants to receive bereavement services"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.has_special_needs}
                    onChange={(e) => handleChange('has_special_needs', e.target.checked)}
                  />
                }
                label="Has special needs or accessibility requirements"
              />
            </Grid>
            {formData.has_special_needs && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Special Needs Notes"
                  value={formData.special_needs_notes}
                  onChange={(e) => handleChange('special_needs_notes', e.target.value)}
                  placeholder="Describe any special needs or accommodations..."
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {formMode === 'create' ? 'Add Contact' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ContactManagement;
