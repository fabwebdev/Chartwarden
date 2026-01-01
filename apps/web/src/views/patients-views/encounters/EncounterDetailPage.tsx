'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Grid,
  Typography,
  Button,
  Stack,
  Chip,
  Divider,
  Box,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';
import {
  ArrowLeft,
  Edit,
  DocumentText,
  Calendar,
  User,
  Location,
  Clock,
  TickCircle,
  ArrowDown2,
  Note,
  Heart,
  Activity,
  People,
  Shield,
  MessageText
} from 'iconsax-react';
import Swal from 'sweetalert2';
import MainCard from 'components/MainCard';
import AuthService from 'types/AuthService';
import {
  getEncounterById,
  signEncounter,
  cosignEncounter,
  Encounter,
  EncounterAddendum,
  EncounterAmendment,
  getEncounterTypeLabel,
  getDisciplineLabel,
  getStatusLabel,
  formatEncounterDate
} from '../../../api/encounter';

interface EncounterDetailPageProps {
  encounterId?: string | number;
  patientId?: string | number;
}

const EncounterDetailPage = ({ encounterId: propEncounterId, patientId: propPatientId }: EncounterDetailPageProps) => {
  const router = useRouter();
  const params = useParams();
  const { permissions, logout } = AuthService();

  // Get IDs from props or URL params
  const encounterId = propEncounterId || params?.encounterId;
  const patientId = propPatientId || params?.id;

  // State
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  // Permission helpers
  const hasPermission = (permission: string) => permissions.includes(permission);

  const hasEditPermission = () => {
    return hasPermission('update:clinical_notes') || hasPermission('clinical_notes_edit');
  };

  const canSign = () => {
    if (!encounter) return false;
    return hasEditPermission() && encounter.encounter_status === 'COMPLETED';
  };

  const canCosign = () => {
    if (!encounter) return false;
    return hasEditPermission() && encounter.encounter_status === 'SIGNED';
  };

  const canEdit = () => {
    if (!encounter) return false;
    return hasEditPermission() && !['SIGNED', 'COSIGNED', 'AMENDED'].includes(encounter.encounter_status);
  };

  // Fetch encounter
  const fetchEncounter = async () => {
    if (!encounterId) return;

    setLoading(true);
    try {
      const response = await getEncounterById(encounterId);
      if (response?.data) {
        setEncounter(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching encounter:', error);
      if (error.response?.status === 401) {
        logout();
      } else if (error.response?.status === 404) {
        Swal.fire({
          icon: 'error',
          title: 'Not Found',
          text: 'Encounter not found.'
        }).then(() => {
          router.back();
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load encounter details.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEncounter();
  }, [encounterId]);

  // Handle sign
  const handleSign = async () => {
    const result = await Swal.fire({
      title: 'Sign Encounter?',
      text: 'This action creates a legally binding electronic signature. You cannot edit the encounter after signing.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, sign it'
    });

    if (result.isConfirmed) {
      setSigning(true);
      try {
        await signEncounter(encounterId!);
        Swal.fire({
          icon: 'success',
          title: 'Signed',
          text: 'Encounter has been signed successfully.'
        });
        fetchEncounter();
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to sign encounter.'
        });
      } finally {
        setSigning(false);
      }
    }
  };

  // Handle cosign
  const handleCosign = async () => {
    const result = await Swal.fire({
      title: 'Co-sign Encounter?',
      text: 'This will add your supervisory signature to this encounter.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, co-sign it'
    });

    if (result.isConfirmed) {
      setSigning(true);
      try {
        await cosignEncounter(encounterId!);
        Swal.fire({
          icon: 'success',
          title: 'Co-signed',
          text: 'Encounter has been co-signed successfully.'
        });
        fetchEncounter();
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to co-sign encounter.'
        });
      } finally {
        setSigning(false);
      }
    }
  };

  // Handle edit
  const handleEdit = () => {
    if (patientId) {
      router.push(`/patients/encounters/${patientId}/${encounterId}/edit`);
    } else {
      router.push(`/encounters/${encounterId}/edit`);
    }
  };

  // Handle back
  const handleBack = () => {
    router.back();
  };

  // Get status chip color
  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'SCHEDULED':
        return 'info';
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'primary';
      case 'SIGNED':
        return 'success';
      case 'COSIGNED':
        return 'success';
      case 'AMENDED':
        return 'secondary';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <MainCard>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  if (!encounter) {
    return (
      <MainCard>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={400}>
          <DocumentText size={48} color="#ccc" />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            Encounter not found
          </Typography>
          <Button variant="contained" onClick={handleBack} sx={{ mt: 2 }}>
            Go Back
          </Button>
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Stack direction="row" alignItems="center" spacing={2}>
                <IconButton onClick={handleBack}>
                  <ArrowLeft />
                </IconButton>
                <Box>
                  <Typography variant="h5" component="div">
                    {getEncounterTypeLabel(encounter.encounter_type)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Encounter ID: {encounter.id}
                  </Typography>
                </Box>
                <Chip
                  label={getStatusLabel(encounter.encounter_status)}
                  color={getStatusColor(encounter.encounter_status)}
                  size="small"
                />
                {encounter.amended && (
                  <Chip label={`Amended (${encounter.amendment_count})`} color="secondary" size="small" variant="outlined" />
                )}
              </Stack>
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={1}>
                {canEdit() && (
                  <Button variant="outlined" startIcon={<Edit size={18} />} onClick={handleEdit}>
                    Edit
                  </Button>
                )}
                {canSign() && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<TickCircle size={18} />}
                    onClick={handleSign}
                    disabled={signing}
                  >
                    {signing ? 'Signing...' : 'Sign'}
                  </Button>
                )}
                {canCosign() && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<TickCircle size={18} />}
                    onClick={handleCosign}
                    disabled={signing}
                  >
                    {signing ? 'Co-signing...' : 'Co-sign'}
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        {/* Basic Info */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader
              avatar={<Calendar size={20} />}
              title="Encounter Information"
              titleTypographyProps={{ variant: 'subtitle1' }}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Date & Time
                  </Typography>
                  <Typography variant="body2">{formatEncounterDate(encounter.encounter_date)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body2">
                    {encounter.encounter_duration_minutes ? `${encounter.encounter_duration_minutes} minutes` : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Location Type
                  </Typography>
                  <Typography variant="body2">{encounter.visit_location || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body2">{encounter.visit_address || 'N/A'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Provider Info */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader avatar={<User size={20} />} title="Provider Information" titleTypographyProps={{ variant: 'subtitle1' }} />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Provider
                  </Typography>
                  <Typography variant="body2">{encounter.staff_name || 'N/A'}</Typography>
                  {encounter.staff_credentials && (
                    <Typography variant="caption" color="text.secondary">
                      {encounter.staff_credentials}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Discipline
                  </Typography>
                  <Typography variant="body2">{getDisciplineLabel(encounter.discipline)}</Typography>
                </Grid>
                {encounter.cosigner_name && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Co-signer
                      </Typography>
                      <Typography variant="body2">{encounter.cosigner_name}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* SOAP Notes */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ArrowDown2 />}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Note size={20} />
                <Typography variant="subtitle1">SOAP Notes</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Subjective
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {encounter.subjective || 'No subjective notes recorded.'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Objective
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {encounter.objective || 'No objective notes recorded.'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Assessment
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {encounter.assessment || 'No assessment notes recorded.'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Plan
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {encounter.plan || 'No plan notes recorded.'}
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Vital Signs & Pain Assessment */}
        {(encounter.vital_signs || encounter.pain_assessment) && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ArrowDown2 />}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Activity size={20} />
                  <Typography variant="subtitle1">Vital Signs & Pain Assessment</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  {encounter.vital_signs && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Vital Signs
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {typeof encounter.vital_signs === 'object'
                          ? JSON.stringify(encounter.vital_signs, null, 2)
                          : encounter.vital_signs}
                      </Typography>
                    </Grid>
                  )}
                  {encounter.pain_assessment && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Pain Assessment
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {typeof encounter.pain_assessment === 'object'
                          ? JSON.stringify(encounter.pain_assessment, null, 2)
                          : encounter.pain_assessment}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Caregiver Information */}
        {encounter.caregiver_present && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ArrowDown2 />}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <People size={20} />
                  <Typography variant="subtitle1">Caregiver Information</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      Caregiver Name
                    </Typography>
                    <Typography variant="body2">{encounter.caregiver_name || 'N/A'}</Typography>
                  </Grid>
                  {encounter.caregiver_assessment && (
                    <Grid item xs={12} md={8}>
                      <Typography variant="caption" color="text.secondary">
                        Caregiver Assessment
                      </Typography>
                      <Typography variant="body2">{encounter.caregiver_assessment}</Typography>
                    </Grid>
                  )}
                  {encounter.caregiver_coping && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Caregiver Coping
                      </Typography>
                      <Typography variant="body2">{encounter.caregiver_coping}</Typography>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Safety & Environment */}
        {(encounter.safety_concerns || encounter.fall_risk || encounter.environment_assessment) && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ArrowDown2 />}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Shield size={20} />
                  <Typography variant="subtitle1">Safety & Environment</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {encounter.safety_concerns && (
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        Safety Concerns
                      </Typography>
                      <Typography variant="body2">{encounter.safety_concerns}</Typography>
                    </Grid>
                  )}
                  {encounter.fall_risk && (
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        Fall Risk
                      </Typography>
                      <Typography variant="body2">{encounter.fall_risk}</Typography>
                    </Grid>
                  )}
                  {encounter.environment_assessment && (
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        Environment Assessment
                      </Typography>
                      <Typography variant="body2">{encounter.environment_assessment}</Typography>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Clinical Notes & Recommendations */}
        {(encounter.clinical_notes || encounter.recommendations) && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ArrowDown2 />}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <MessageText size={20} />
                  <Typography variant="subtitle1">Clinical Notes & Recommendations</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  {encounter.clinical_notes && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Clinical Notes
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {encounter.clinical_notes}
                      </Typography>
                    </Grid>
                  )}
                  {encounter.recommendations && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Recommendations
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {encounter.recommendations}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Addendums */}
        {encounter.addendums && encounter.addendums.length > 0 && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardHeader title="Addendums" titleTypographyProps={{ variant: 'subtitle1' }} />
              <CardContent>
                <List disablePadding>
                  {encounter.addendums.map((addendum: EncounterAddendum, index: number) => (
                    <ListItem key={addendum.id} divider={index < encounter.addendums!.length - 1}>
                      <ListItemText
                        primary={
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight={500}>
                              {addendum.added_by_name || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatEncounterDate(addendum.addendum_date)}
                            </Typography>
                          </Stack>
                        }
                        secondary={
                          <>
                            {addendum.addendum_reason && (
                              <Typography variant="caption" color="text.secondary" component="div">
                                Reason: {addendum.addendum_reason}
                              </Typography>
                            )}
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {addendum.addendum_content}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Amendments */}
        {encounter.amendments && encounter.amendments.length > 0 && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardHeader title="Amendments" titleTypographyProps={{ variant: 'subtitle1' }} />
              <CardContent>
                <List disablePadding>
                  {encounter.amendments.map((amendment: EncounterAmendment, index: number) => (
                    <ListItem key={amendment.id} divider={index < encounter.amendments!.length - 1}>
                      <ListItemText
                        primary={
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight={500}>
                              Field: {amendment.field_amended}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatEncounterDate(amendment.amendment_date)} by {amendment.amended_by_name}
                            </Typography>
                          </Stack>
                        }
                        secondary={
                          <>
                            <Typography variant="caption" color="text.secondary" component="div">
                              Reason: {amendment.amendment_reason}
                            </Typography>
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                              <Grid item xs={6}>
                                <Alert severity="error" icon={false} sx={{ py: 0.5 }}>
                                  <Typography variant="caption">Original:</Typography>
                                  <Typography variant="body2">{amendment.original_value || 'N/A'}</Typography>
                                </Alert>
                              </Grid>
                              <Grid item xs={6}>
                                <Alert severity="success" icon={false} sx={{ py: 0.5 }}>
                                  <Typography variant="caption">Amended:</Typography>
                                  <Typography variant="body2">{amendment.amended_value || 'N/A'}</Typography>
                                </Alert>
                              </Grid>
                            </Grid>
                            {amendment.amendment_notes && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                Notes: {amendment.amendment_notes}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Signature Info */}
        {encounter.signature && (
          <Grid item xs={12}>
            <Alert severity="success" icon={<TickCircle size={20} />}>
              <Typography variant="body2">
                <strong>Signed</strong> by {encounter.staff_name} on{' '}
                {encounter.signature?.signedAt ? formatEncounterDate(encounter.signature.signedAt) : 'N/A'}
              </Typography>
              {encounter.cosignature && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Co-signed</strong> by {encounter.cosigner_name} on{' '}
                  {encounter.cosignature?.signedAt ? formatEncounterDate(encounter.cosignature.signedAt) : 'N/A'}
                </Typography>
              )}
            </Alert>
          </Grid>
        )}

        {/* Metadata */}
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary">
            Created: {encounter.createdAt ? formatEncounterDate(encounter.createdAt) : 'N/A'} | Last Updated:{' '}
            {encounter.updatedAt ? formatEncounterDate(encounter.updatedAt) : 'N/A'}
          </Typography>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default EncounterDetailPage;
