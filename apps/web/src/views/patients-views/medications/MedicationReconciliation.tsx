import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { SnackbarProps } from 'types/snackbar';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Add,
  Trash,
  ArrowDown2,
  Warning2,
  TickCircle,
  CloseCircle,
  InfoCircle,
  Refresh2,
  DocumentText
} from 'iconsax-react';
import { format } from 'date-fns';

import {
  MedicationReconciliation as MedicationReconciliationType,
  HomeMedication,
  MedicationDiscrepancy,
  getMedicationReconciliationHistory,
  createMedicationReconciliation,
  compareMedications,
  getPatientMedications,
  Medication,
  RECONCILIATION_TYPES,
  ReconciliationType
} from 'api/medication';

interface MedicationReconciliationProps {
  patientId: string | number;
}

const MedicationReconciliation = ({ patientId }: MedicationReconciliationProps) => {
  const theme = useTheme();
  const [reconciliations, setReconciliations] = useState<MedicationReconciliationType[]>([]);
  const [currentMedications, setCurrentMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [reconciliationType, setReconciliationType] = useState<ReconciliationType>('ROUTINE');
  const [reconciliationDate, setReconciliationDate] = useState<Date>(new Date());
  const [homeMedications, setHomeMedications] = useState<HomeMedication[]>([]);
  const [discrepancies, setDiscrepancies] = useState<MedicationDiscrepancy[]>([]);
  const [actionsTaken, setActionsTaken] = useState('');
  const [comparing, setComparing] = useState(false);

  // New medication input
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFrequency, setNewMedFrequency] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reconciliationRes, medsRes] = await Promise.all([
        getMedicationReconciliationHistory(patientId),
        getPatientMedications(patientId, { status: 'ACTIVE', limit: 100 })
      ]);

      setReconciliations(reconciliationRes.data || []);
      setCurrentMedications(medsRes.data || []);
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      openSnackbar({
        open: true,
        message: 'Failed to load reconciliation history',
        variant: 'alert',
        alert: { color: 'error' }
      } as SnackbarProps);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddHomeMedication = () => {
    if (!newMedName.trim()) return;

    setHomeMedications([
      ...homeMedications,
      {
        medication_name: newMedName,
        dosage: newMedDosage,
        frequency: newMedFrequency
      }
    ]);

    setNewMedName('');
    setNewMedDosage('');
    setNewMedFrequency('');
  };

  const handleRemoveHomeMedication = (index: number) => {
    setHomeMedications(homeMedications.filter((_, i) => i !== index));
  };

  const handleCompare = async () => {
    if (homeMedications.length === 0) {
      openSnackbar({
        open: true,
        message: 'Please add at least one home medication to compare',
        variant: 'alert',
        alert: { color: 'warning' }
      } as SnackbarProps);
      return;
    }

    setComparing(true);
    try {
      const response = await compareMedications(patientId, homeMedications);
      if (response.status === 200 && response.data) {
        setDiscrepancies(response.data.discrepancies || []);
      }
    } catch (error) {
      console.error('Error comparing medications:', error);
      openSnackbar({
        open: true,
        message: 'Failed to compare medications',
        variant: 'alert',
        alert: { color: 'error' }
      } as SnackbarProps);
    } finally {
      setComparing(false);
    }
  };

  const handleSubmitReconciliation = async () => {
    setFormLoading(true);
    try {
      const response = await createMedicationReconciliation(patientId, {
        reconciliation_date: format(reconciliationDate, 'yyyy-MM-dd'),
        reconciliation_type: reconciliationType,
        home_medications: homeMedications,
        actions_taken: actionsTaken
      });

      if (response.status === 201) {
        openSnackbar({
          open: true,
          message: 'Medication reconciliation completed successfully',
          variant: 'alert',
          alert: { color: 'success' }
        } as SnackbarProps);

        // Reset form
        setFormOpen(false);
        setHomeMedications([]);
        setDiscrepancies([]);
        setActionsTaken('');
        setReconciliationType('ROUTINE');
        setReconciliationDate(new Date());
        fetchData();
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to create reconciliation';
      openSnackbar({
        open: true,
        message,
        variant: 'alert',
        alert: { color: 'error' }
      } as SnackbarProps);
    } finally {
      setFormLoading(false);
    }
  };

  const getDiscrepancyIcon = (type: string) => {
    switch (type) {
      case 'MISSING_FROM_CURRENT':
        return <CloseCircle size={18} color={theme.palette.error.main} />;
      case 'NEW_MEDICATION':
        return <Add size={18} color={theme.palette.info.main} />;
      case 'DOSAGE_DIFFERENCE':
      case 'FREQUENCY_DIFFERENCE':
        return <Warning2 size={18} color={theme.palette.warning.main} />;
      default:
        return <InfoCircle size={18} />;
    }
  };

  const getReconciliationTypeChip = (type: ReconciliationType) => {
    const config = RECONCILIATION_TYPES.find(t => t.value === type);
    const colors: Record<ReconciliationType, 'primary' | 'secondary' | 'success' | 'info'> = {
      ADMISSION: 'primary',
      TRANSFER: 'secondary',
      DISCHARGE: 'success',
      ROUTINE: 'info'
    };
    return (
      <Chip
        size="small"
        label={config?.label || type}
        color={colors[type] || 'default'}
      />
    );
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MM/dd/yyyy');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <MainCard
        title="Medication Reconciliation"
        secondary={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setFormOpen(true)}
          >
            New Reconciliation
          </Button>
        }
      >
        {/* Current Medications Summary */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2">Current Active Medications:</Typography>
            <Typography>{currentMedications.length}</Typography>
          </Stack>
        </Alert>

        {/* Reconciliation History */}
        <Typography variant="h6" sx={{ mb: 2 }}>Reconciliation History</Typography>

        {loading ? (
          <Typography>Loading...</Typography>
        ) : reconciliations.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <DocumentText size={48} color={theme.palette.grey[400]} />
            <Typography color="textSecondary" sx={{ mt: 1 }}>
              No reconciliation records found
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {reconciliations.map((recon) => (
              <Accordion key={recon.id}>
                <AccordionSummary expandIcon={<ArrowDown2 />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                    {getReconciliationTypeChip(recon.reconciliation_type)}
                    <Typography variant="subtitle2">
                      {formatDate(recon.reconciliation_date)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      by {recon.performed_by_name || 'Unknown'}
                    </Typography>
                    {recon.discrepancies_found && (
                      <Chip
                        size="small"
                        icon={<Warning2 size={14} />}
                        label="Discrepancies Found"
                        color="warning"
                      />
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Home Medications Reviewed:</Typography>
                      <List dense>
                        {recon.medications_reviewed?.home_medications?.map((med, index) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={med.medication_name || med.name}
                              secondary={`${med.dosage || ''} ${med.frequency || ''}`}
                            />
                          </ListItem>
                        )) || (
                          <ListItem>
                            <ListItemText secondary="No home medications recorded" />
                          </ListItem>
                        )}
                      </List>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Current Medications at Time of Review:</Typography>
                      <List dense>
                        {recon.medications_reviewed?.current_medications?.map((med, index) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={med.name}
                              secondary={`${med.dosage} - ${med.frequency}`}
                            />
                          </ListItem>
                        )) || (
                          <ListItem>
                            <ListItemText secondary="No current medications recorded" />
                          </ListItem>
                        )}
                      </List>
                    </Grid>
                    {recon.discrepancies_found && (
                      <Grid item xs={12}>
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          <Typography variant="subtitle2">Discrepancies Found:</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                            {recon.discrepancies_found}
                          </Typography>
                        </Alert>
                      </Grid>
                    )}
                    {recon.actions_taken && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">Actions Taken:</Typography>
                        <Typography variant="body2">{recon.actions_taken}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}
      </MainCard>

      {/* New Reconciliation Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>New Medication Reconciliation</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Basic Info */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Reconciliation Type</InputLabel>
                  <Select
                    value={reconciliationType}
                    label="Reconciliation Type"
                    onChange={(e) => setReconciliationType(e.target.value as ReconciliationType)}
                  >
                    {RECONCILIATION_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Reconciliation Date"
                  value={reconciliationDate}
                  onChange={(date) => date && setReconciliationDate(date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </Grid>

            <Divider />

            {/* Home Medications Entry */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Home Medications</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Enter the medications the patient reports taking at home
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Medication Name"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    placeholder="e.g., Metoprolol"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Dosage"
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    placeholder="e.g., 50mg"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Frequency"
                    value={newMedFrequency}
                    onChange={(e) => setNewMedFrequency(e.target.value)}
                    placeholder="e.g., Daily"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleAddHomeMedication}
                    disabled={!newMedName.trim()}
                    sx={{ height: '56px' }}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>

              {/* Added Home Medications List */}
              {homeMedications.length > 0 && (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Medication</TableCell>
                        <TableCell>Dosage</TableCell>
                        <TableCell>Frequency</TableCell>
                        <TableCell align="right">Remove</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {homeMedications.map((med, index) => (
                        <TableRow key={index}>
                          <TableCell>{med.medication_name}</TableCell>
                          <TableCell>{med.dosage || '-'}</TableCell>
                          <TableCell>{med.frequency || '-'}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveHomeMedication(index)}
                              color="error"
                            >
                              <Trash size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Compare Button */}
              <Button
                variant="outlined"
                startIcon={<Refresh2 />}
                onClick={handleCompare}
                disabled={homeMedications.length === 0 || comparing}
              >
                {comparing ? 'Comparing...' : 'Compare with Current Medications'}
              </Button>
            </Box>

            {/* Discrepancies */}
            {discrepancies.length > 0 && (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    {discrepancies.length} Discrepanc{discrepancies.length === 1 ? 'y' : 'ies'} Found
                  </Typography>
                </Alert>
                <List>
                  {discrepancies.map((discrepancy, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {getDiscrepancyIcon(discrepancy.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={discrepancy.medication}
                        secondary={discrepancy.description}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Current Medications Reference */}
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>Current Active Medications</Typography>
              {currentMedications.length === 0 ? (
                <Typography color="textSecondary">No active medications</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Medication</TableCell>
                        <TableCell>Dosage</TableCell>
                        <TableCell>Frequency</TableCell>
                        <TableCell>Route</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentMedications.map((med) => (
                        <TableRow key={med.id}>
                          <TableCell>{med.medication_name}</TableCell>
                          <TableCell>{med.dosage}</TableCell>
                          <TableCell>{med.frequency}</TableCell>
                          <TableCell>{med.medication_route}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            <Divider />

            {/* Actions Taken */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Actions Taken / Notes"
              value={actionsTaken}
              onChange={(e) => setActionsTaken(e.target.value)}
              placeholder="Document any actions taken to resolve discrepancies or other notes"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={formLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitReconciliation}
            disabled={formLoading}
            startIcon={<TickCircle />}
          >
            {formLoading ? 'Saving...' : 'Complete Reconciliation'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default MedicationReconciliation;
