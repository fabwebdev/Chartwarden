import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import {
  Certification,
  F2FEncounter,
  getCertificationById,
  signCertification,
  completeCertification,
  revokeCertification,
  validateF2FForCertification,
  formatCertificationPeriod,
  getStatusColor,
  getDaysUntilDeadline
} from 'api/certification';
import Swal from 'sweetalert2';

interface CertificationDetailProps {
  open: boolean;
  onClose: () => void;
  certificationId: number | null;
  onRefresh: () => void;
  canSign: boolean;
  canEdit: boolean;
  onEdit: (certification: Certification) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
};

const CertificationDetail: React.FC<CertificationDetailProps> = ({
  open,
  onClose,
  certificationId,
  onRefresh,
  canSign,
  canEdit,
  onEdit
}) => {
  const [certification, setCertification] = useState<Certification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [f2fValidation, setF2fValidation] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCertification = useCallback(async () => {
    if (!certificationId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getCertificationById(certificationId);
      setCertification(response.data);

      // Also validate F2F
      const f2fResponse = await validateF2FForCertification(certificationId);
      setF2fValidation(f2fResponse.data);
    } catch (err: any) {
      console.error('Error fetching certification:', err);
      setError(err.response?.data?.message || 'Failed to load certification details');
    } finally {
      setLoading(false);
    }
  }, [certificationId]);

  useEffect(() => {
    if (open && certificationId) {
      fetchCertification();
      setTabValue(0);
    }
  }, [open, certificationId, fetchCertification]);

  const handleSign = async () => {
    if (!certification) return;

    const result = await Swal.fire({
      title: 'Sign Certification',
      text: 'This action will electronically sign this certification. This cannot be undone.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sign',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoading(true);
      await signCertification(certification.id);
      await Swal.fire({
        icon: 'success',
        title: 'Signed',
        text: 'Certification has been signed successfully.'
      });
      fetchCertification();
      onRefresh();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to sign certification'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!certification) return;

    const result = await Swal.fire({
      title: 'Complete Certification',
      text: 'Mark this certification as complete?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Complete',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoading(true);
      await completeCertification(certification.id);
      await Swal.fire({
        icon: 'success',
        title: 'Completed',
        text: 'Certification has been marked as complete.'
      });
      fetchCertification();
      onRefresh();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to complete certification'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!certification) return;

    const result = await Swal.fire({
      title: 'Revoke Certification',
      input: 'textarea',
      inputLabel: 'Revocation Reason',
      inputPlaceholder: 'Enter the reason for revoking this certification...',
      inputValidator: (value) => {
        if (!value) return 'Reason is required';
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Revoke',
      confirmButtonColor: '#d32f2f'
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoading(true);
      await revokeCertification(certification.id, result.value);
      await Swal.fire({
        icon: 'success',
        title: 'Revoked',
        text: 'Certification has been revoked.'
      });
      fetchCertification();
      onRefresh();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to revoke certification'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return date;
    }
  };

  const formatDateTime = (date?: string | null) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return date;
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Certification Details</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : certification ? (
          <Box>
            {/* Header with status */}
            <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      {formatCertificationPeriod(certification.certification_period)}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={certification.certification_status}
                        color={getStatusColor(certification.certification_status)}
                        size="small"
                      />
                      {certification.physician_signature ? (
                        <Chip
                          icon={<CheckIcon />}
                          label="Signed"
                          color="success"
                          variant="outlined"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<WarningIcon />}
                          label="Unsigned"
                          color="warning"
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Start Date
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(certification.start_date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          End Date
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(certification.end_date)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Deadline warning */}
                {certification.certification_status !== 'COMPLETED' &&
                  certification.certification_status !== 'REVOKED' && (
                    <Box sx={{ mt: 2 }}>
                      {(() => {
                        const days = getDaysUntilDeadline(certification.end_date);
                        if (days < 0) {
                          return (
                            <Alert severity="error" icon={<ErrorIcon />}>
                              This certification period expired {Math.abs(days)} days ago.
                              Please renew immediately.
                            </Alert>
                          );
                        }
                        if (days <= 14) {
                          return (
                            <Alert severity="warning" icon={<WarningIcon />}>
                              {days} days remaining until this certification period expires.
                            </Alert>
                          );
                        }
                        return null;
                      })()}
                    </Box>
                  )}
              </CardContent>
            </Card>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                <Tab label="Documentation" />
                <Tab label="Face-to-Face" />
                <Tab label="Signature" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Terminal Illness Narrative
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {certification.terminal_illness_narrative || 'Not documented'}
                  </Typography>
                </Grid>

                {certification.clinical_progression && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Clinical Progression
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {certification.clinical_progression}
                    </Typography>
                  </Grid>
                )}

                {certification.decline_indicators && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Decline Indicators
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {certification.decline_indicators}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {f2fValidation && (
                <Box sx={{ mb: 3 }}>
                  {!f2fValidation.f2fRequired ? (
                    <Alert severity="info">
                      Face-to-Face encounter is not required for this certification period.
                    </Alert>
                  ) : f2fValidation.isValid ? (
                    <Alert severity="success" icon={<CheckIcon />}>
                      Valid Face-to-Face encounter found. Compliance requirements met.
                    </Alert>
                  ) : (
                    <Alert severity="warning" icon={<WarningIcon />}>
                      Face-to-Face encounter required but not found or not attested.
                      <br />
                      Valid window: {f2fValidation.validWindow?.start} to {f2fValidation.validWindow?.end}
                    </Alert>
                  )}
                </Box>
              )}

              {certification.faceToFaceEncounters && certification.faceToFaceEncounters.length > 0 ? (
                <List>
                  {certification.faceToFaceEncounters.map((f2f: F2FEncounter) => (
                    <ListItem key={f2f.id} sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                      <ListItemIcon>
                        <PersonIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle1">
                              {formatDate(f2f.encounter_date)}
                            </Typography>
                            {f2f.attestation && (
                              <Chip
                                icon={<CheckIcon />}
                                label="Attested"
                                color="success"
                                size="small"
                              />
                            )}
                          </Stack>
                        }
                        secondary={
                          <>
                            <Typography variant="body2">
                              Provider: {f2f.performed_by_name} ({f2f.performed_by_type})
                            </Typography>
                            <Typography variant="body2">
                              Visit Type: {f2f.visit_type}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {f2f.findings}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box textAlign="center" py={4}>
                  <DocumentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    No Face-to-Face encounters recorded for this certification.
                  </Typography>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              {certification.physician_signature ? (
                <Card sx={{ bgcolor: 'success.lighter' }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <CheckIcon color="success" sx={{ fontSize: 40 }} />
                      <Box>
                        <Typography variant="h6" color="success.dark">
                          Electronically Signed
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          <strong>Signed by:</strong> {certification.physician_signature.signedByName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Date/Time:</strong> {formatDateTime(certification.physician_signature.signedAt)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Signature Type:</strong> {certification.physician_signature.signatureType}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          21 CFR Part 11 Compliant Electronic Signature
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ) : (
                <Card sx={{ bgcolor: 'warning.lighter' }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <WarningIcon color="warning" sx={{ fontSize: 40 }} />
                      <Box>
                        <Typography variant="h6" color="warning.dark">
                          Awaiting Signature
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          This certification has not been signed by a physician.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Due by:</strong> {formatDate(certification.certification_due_date)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          CMS requires physician signature within 2 days of start of care.
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {certification.certification_timeliness && (
                <Box sx={{ mt: 2 }}>
                  <Alert
                    severity={certification.certification_timeliness === 'TIMELY' ? 'success' : 'warning'}
                    icon={certification.certification_timeliness === 'TIMELY' ? <CheckIcon /> : <ScheduleIcon />}
                  >
                    Certification was {certification.certification_timeliness === 'TIMELY' ? 'completed on time' : `completed ${certification.days_late} day(s) late`}.
                  </Alert>
                </Box>
              )}
            </TabPanel>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {certification && (
          <>
            {canEdit && !certification.physician_signature && (
              <Button
                startIcon={<EditIcon />}
                onClick={() => {
                  onClose();
                  onEdit(certification);
                }}
              >
                Edit
              </Button>
            )}
            {canSign && !certification.physician_signature && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckIcon />}
                onClick={handleSign}
                disabled={actionLoading}
              >
                Sign Certification
              </Button>
            )}
            {certification.physician_signature &&
              certification.certification_status === 'ACTIVE' && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleComplete}
                  disabled={actionLoading}
                >
                  Mark Complete
                </Button>
              )}
            {certification.certification_status !== 'REVOKED' &&
              certification.certification_status !== 'COMPLETED' && (
                <Button
                  color="error"
                  onClick={handleRevoke}
                  disabled={actionLoading}
                >
                  Revoke
                </Button>
              )}
          </>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CertificationDetail;
