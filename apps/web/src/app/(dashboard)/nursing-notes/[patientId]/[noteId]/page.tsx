'use client';

/**
 * Individual Nursing Note View/Edit Page
 *
 * Displays a single nursing note with full details, allowing viewing,
 * editing, signing, and other management actions.
 *
 * Route: /nursing-notes/[patientId]/[noteId]
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Button,
  Typography,
  Breadcrumbs,
  Link,
  Stack,
  Paper,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  CheckCircle as SignIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';

// Project imports
import { NursingNoteForm, useNursingNote } from 'views/nursing-notes';
import RichTextEditor from 'components/@extended/RichTextEditor';

// ==============================|| INDIVIDUAL NOTE PAGE ||============================== //

export default function IndividualNotePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const patientId = params?.patientId ? parseInt(params.patientId as string, 10) : undefined;
  const noteId = params?.noteId ? parseInt(params.noteId as string, 10) : undefined;
  const action = searchParams?.get('action'); // e.g., ?action=sign

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(action === 'sign');
  const [signaturePassword, setSignaturePassword] = useState('');
  const [signingError, setSigningError] = useState<string | null>(null);

  // Hook for fetching note
  const { note, isLoading, error, fetchNote, updateNote, signNote, isSaving } = useNursingNote({
    noteId,
    patientId,
    autoFetch: true,
  });

  // ==============================|| EFFECTS ||============================== //

  useEffect(() => {
    if (noteId) {
      fetchNote(noteId);
    }
  }, [noteId, fetchNote]);

  // ==============================|| HANDLERS ||============================== //

  /**
   * Handle back to notes list
   */
  const handleBackToList = useCallback(() => {
    router.push(`/nursing-notes/${patientId}`);
  }, [patientId, router]);

  /**
   * Handle edit mode toggle
   */
  const handleEditToggle = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  /**
   * Handle note updated
   */
  const handleNoteUpdated = useCallback(async () => {
    setIsEditing(false);
    if (noteId) {
      await fetchNote(noteId);
    }
  }, [noteId, fetchNote]);

  /**
   * Handle sign note
   */
  const handleSignNote = useCallback(() => {
    setShowSignDialog(true);
  }, []);

  /**
   * Handle close sign dialog
   */
  const handleCloseSignDialog = useCallback(() => {
    setShowSignDialog(false);
    setSignaturePassword('');
    setSigningError(null);
  }, []);

  /**
   * Handle confirm signature
   */
  const handleConfirmSignature = useCallback(async () => {
    if (!noteId || !signaturePassword) {
      setSigningError('Password is required for signature');
      return;
    }

    try {
      // Generate signature hash (in production, use proper cryptographic signing)
      const signatureHash = btoa(`${noteId}-${signaturePassword}-${Date.now()}`);

      await signNote(noteId, signatureHash);

      handleCloseSignDialog();
      // Refresh note data
      await fetchNote(noteId);
    } catch (err: any) {
      setSigningError(err.message || 'Failed to sign note');
    }
  }, [noteId, signaturePassword, signNote, handleCloseSignDialog, fetchNote]);

  /**
   * Handle print
   */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /**
   * Handle export to PDF
   */
  const handleExportPDF = useCallback(() => {
    // TODO: Implement PDF export
    console.log('Export to PDF');
  }, []);

  // ==============================|| RENDER HELPERS ||============================== //

  const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'IN_PROGRESS':
        return 'primary';
      case 'COMPLETED':
        return 'primary';
      case 'PENDING_SIGNATURE':
        return 'warning';
      case 'SIGNED':
        return 'success';
      case 'VOID':
        return 'error';
      default:
        return 'default';
    }
  };

  // ==============================|| RENDER ||============================== //

  if (!patientId || !noteId) {
    return (
      <Container>
        <Typography variant="h5" color="error">
          Invalid patient ID or note ID
        </Typography>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !note) {
    return (
      <Container>
        <Alert severity="error">
          {error?.message || 'Note not found'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToList}
          sx={{ mt: 2 }}
        >
          Back to Notes
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body1"
            onClick={() => router.push('/patients')}
            sx={{ cursor: 'pointer' }}
          >
            Patients
          </Link>
          <Link
            component="button"
            variant="body1"
            onClick={handleBackToList}
            sx={{ cursor: 'pointer' }}
          >
            Nursing Notes
          </Link>
          <Typography color="text.primary">Note #{noteId}</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Nursing Note #{noteId}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={note.noteStatus}
                color={getStatusColor(note.noteStatus)}
                size="small"
              />
              {note.prnVisit && <Chip label="PRN Visit" color="warning" size="small" />}
              {note.amended && <Chip label="Amended" color="secondary" size="small" />}
            </Stack>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToList}
            >
              Back to List
            </Button>
            {!isEditing && ['DRAFT', 'IN_PROGRESS'].includes(note.noteStatus) && (
              <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEditToggle}>
                Edit
              </Button>
            )}
            {!isEditing && note.noteStatus === 'PENDING_SIGNATURE' && (
              <Button
                variant="contained"
                color="success"
                startIcon={<SignIcon />}
                onClick={handleSignNote}
              >
                Sign Note
              </Button>
            )}
            {!isEditing && (
              <>
                <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
                  Print
                </Button>
                <Button variant="outlined" startIcon={<PdfIcon />} onClick={handleExportPDF}>
                  Export PDF
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {/* Note Content */}
        {isEditing ? (
          <NursingNoteForm
            patientId={patientId}
            noteId={noteId}
            initialData={note}
            onCancel={handleEditToggle}
            onSubmit={async (data) => {
              await handleNoteUpdated();
            }}
            enableAutoSave={true}
            showAdvancedSections={true}
          />
        ) : (
          <Paper elevation={0} sx={{ p: 3 }}>
            {/* Metadata */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Note Date
                </Typography>
                <Typography variant="body1">
                  {note.noteDate ? dayjs(note.noteDate).format('MMMM D, YYYY') : 'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Visit Time
                </Typography>
                <Typography variant="body1">
                  {note.timeIn && note.timeOut
                    ? `${note.timeIn} - ${note.timeOut}`
                    : note.timeIn || note.timeOut || 'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Nurse
                </Typography>
                <Typography variant="body1">
                  {note.nurseName || 'N/A'}
                  {note.nurseCredentials && `, ${note.nurseCredentials}`}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Patient
                </Typography>
                <Typography variant="body1">
                  {note.patientName || 'N/A'}
                  {note.patientNumber && ` (${note.patientNumber})`}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Main Content */}
            {note.content && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Clinical Documentation
                </Typography>
                <Box
                  sx={{ mt: 1 }}
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              </Box>
            )}

            {/* SOAP Sections */}
            {(note.subjective || note.objective || note.assessment || note.plan) && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom>
                  SOAP Documentation
                </Typography>

                <Grid container spacing={3} sx={{ mt: 1 }}>
                  {note.subjective && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Subjective
                      </Typography>
                      <Box dangerouslySetInnerHTML={{ __html: note.subjective }} />
                    </Grid>
                  )}

                  {note.objective && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Objective
                      </Typography>
                      <Box dangerouslySetInnerHTML={{ __html: note.objective }} />
                    </Grid>
                  )}

                  {note.assessment && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Assessment
                      </Typography>
                      <Box dangerouslySetInnerHTML={{ __html: note.assessment }} />
                    </Grid>
                  )}

                  {note.plan && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Plan
                      </Typography>
                      <Box dangerouslySetInnerHTML={{ __html: note.plan }} />
                    </Grid>
                  )}
                </Grid>
              </>
            )}

            {/* Additional Clinical Sections */}
            {(note.interventions ||
              note.patientResponse ||
              note.patientEducation ||
              note.communication) && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom>
                  Additional Clinical Information
                </Typography>

                <Grid container spacing={3} sx={{ mt: 1 }}>
                  {note.interventions && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Interventions
                      </Typography>
                      <Typography variant="body2">{note.interventions}</Typography>
                    </Grid>
                  )}

                  {note.patientResponse && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Patient Response
                      </Typography>
                      <Typography variant="body2">{note.patientResponse}</Typography>
                    </Grid>
                  )}

                  {note.patientEducation && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Patient Education
                      </Typography>
                      <Typography variant="body2">{note.patientEducation}</Typography>
                    </Grid>
                  )}

                  {note.communication && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Communication
                      </Typography>
                      <Typography variant="body2">{note.communication}</Typography>
                    </Grid>
                  )}
                </Grid>
              </>
            )}

            {/* Signature Information */}
            {note.signedAt && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Signature
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Signed on {dayjs(note.signedAt).format('MMMM D, YYYY [at] h:mm A')}
                  </Typography>
                  {note.signatureHash && (
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                      Signature Hash: {note.signatureHash.substring(0, 16)}...
                    </Typography>
                  )}
                </Box>
              </>
            )}

            {/* Amendment Information */}
            {note.amended && (
              <>
                <Divider sx={{ my: 3 }} />
                <Alert severity="warning">
                  <Typography variant="subtitle2">Note Amended</Typography>
                  {note.amendedAt && (
                    <Typography variant="body2">
                      Amended on {dayjs(note.amendedAt).format('MMMM D, YYYY [at] h:mm A')}
                    </Typography>
                  )}
                  {note.amendmentReason && (
                    <Typography variant="body2">Reason: {note.amendmentReason}</Typography>
                  )}
                </Alert>
              </>
            )}

            {/* Audit Trail */}
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="caption" color="text.disabled">
                Created: {dayjs(note.createdAt).format('MMMM D, YYYY [at] h:mm A')}
              </Typography>
              <br />
              <Typography variant="caption" color="text.disabled">
                Last Updated: {dayjs(note.updatedAt).format('MMMM D, YYYY [at] h:mm A')}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Sign Dialog */}
        <Dialog open={showSignDialog} onClose={handleCloseSignDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Sign Nursing Note</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" gutterBottom>
                By signing this note, you confirm that all information is accurate and complete.
              </Typography>

              <TextField
                fullWidth
                type="password"
                label="Enter your password to sign"
                value={signaturePassword}
                onChange={(e) => setSignaturePassword(e.target.value)}
                margin="normal"
                autoFocus
                error={!!signingError}
                helperText={signingError}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseSignDialog}>Cancel</Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleConfirmSignature}
              disabled={!signaturePassword || isSaving}
              startIcon={isSaving ? <CircularProgress size={20} /> : <SignIcon />}
            >
              {isSaving ? 'Signing...' : 'Sign Note'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

// Import Grid component
import { Grid } from '@mui/material';
