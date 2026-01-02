'use client';

/**
 * Nursing Notes Page
 *
 * Main page for viewing and managing nursing notes for a specific patient.
 * Displays a comprehensive history of all nursing clinical notes with
 * filtering, search, and management capabilities.
 *
 * Route: /nursing-notes/[patientId]
 */

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Button,
  Typography,
  Breadcrumbs,
  Link,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

// Project imports
import {
  NursingNoteHistory,
  NursingNoteForm,
  useNursingNote,
} from 'views/nursing-notes';
import type { NursingClinicalNote } from 'types/nursingNote';

// ==============================|| NURSING NOTES PAGE ||============================== //

export default function NursingNotesPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params?.patientId ? parseInt(params.patientId as string, 10) : undefined;

  // State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NursingClinicalNote | null>(null);

  // Hook for refreshing notes list
  const { refreshNotes } = useNursingNote({
    patientId,
    autoFetch: false,
  });

  // ==============================|| HANDLERS ||============================== //

  /**
   * Handle view note details
   */
  const handleViewNote = useCallback(
    (note: NursingClinicalNote) => {
      // Navigate to note detail page
      router.push(`/nursing-notes/${patientId}/${note.id}`);
    },
    [patientId, router]
  );

  /**
   * Handle edit note
   */
  const handleEditNote = useCallback((note: NursingClinicalNote) => {
    setSelectedNote(note);
    setShowEditDialog(true);
  }, []);

  /**
   * Handle sign note
   */
  const handleSignNote = useCallback(
    async (note: NursingClinicalNote) => {
      // TODO: Implement digital signature workflow
      console.log('Sign note:', note.id);
      // For now, navigate to note detail page where signing can be implemented
      router.push(`/nursing-notes/${patientId}/${note.id}?action=sign`);
    },
    [patientId, router]
  );

  /**
   * Handle create note
   */
  const handleCreateNote = useCallback(() => {
    setShowCreateDialog(true);
  }, []);

  /**
   * Handle close create dialog
   */
  const handleCloseCreateDialog = useCallback(() => {
    setShowCreateDialog(false);
  }, []);

  /**
   * Handle close edit dialog
   */
  const handleCloseEditDialog = useCallback(() => {
    setShowEditDialog(false);
    setSelectedNote(null);
  }, []);

  /**
   * Handle note created successfully
   */
  const handleNoteCreated = useCallback(async () => {
    handleCloseCreateDialog();
    // Refresh the notes list
    await refreshNotes();
  }, [handleCloseCreateDialog, refreshNotes]);

  /**
   * Handle note updated successfully
   */
  const handleNoteUpdated = useCallback(async () => {
    handleCloseEditDialog();
    // Refresh the notes list
    await refreshNotes();
  }, [handleCloseEditDialog, refreshNotes]);

  /**
   * Handle back to patients
   */
  const handleBackToPatients = useCallback(() => {
    router.push('/patients');
  }, [router]);

  // ==============================|| RENDER ||============================== //

  if (!patientId) {
    return (
      <Container>
        <Typography variant="h5" color="error">
          Invalid patient ID
        </Typography>
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
            onClick={handleBackToPatients}
            sx={{ cursor: 'pointer' }}
          >
            Patients
          </Link>
          <Typography color="text.primary">Nursing Notes</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>
              Nursing Notes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Patient ID: {patientId}
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToPatients}
            >
              Back to Patients
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateNote}
            >
              New Note
            </Button>
          </Stack>
        </Stack>

        {/* Notes History */}
        <NursingNoteHistory
          patientId={patientId}
          onViewNote={handleViewNote}
          onEditNote={handleEditNote}
          onSignNote={handleSignNote}
          canEdit={true}
          canSign={true}
          showFilters={true}
          showSearch={true}
          showExportOptions={true}
        />

        {/* Create Note Dialog */}
        <Dialog
          open={showCreateDialog}
          onClose={handleCloseCreateDialog}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Create New Nursing Note</Typography>
              <IconButton onClick={handleCloseCreateDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <NursingNoteForm
                patientId={patientId}
                onCancel={handleCloseCreateDialog}
                onSubmit={async (data) => {
                  // The form will handle the API call
                  await handleNoteCreated();
                }}
                enableAutoSave={false}
              />
            </Box>
          </DialogContent>
        </Dialog>

        {/* Edit Note Dialog */}
        <Dialog
          open={showEditDialog}
          onClose={handleCloseEditDialog}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Edit Nursing Note</Typography>
              <IconButton onClick={handleCloseEditDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              {selectedNote && (
                <NursingNoteForm
                  patientId={patientId}
                  noteId={selectedNote.id}
                  initialData={selectedNote}
                  onCancel={handleCloseEditDialog}
                  onSubmit={async (data) => {
                    // The form will handle the API call
                    await handleNoteUpdated();
                  }}
                  enableAutoSave={true}
                />
              )}
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    </Container>
  );
}
