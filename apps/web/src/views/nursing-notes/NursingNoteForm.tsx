'use client';

/**
 * NursingNoteForm Component
 *
 * Comprehensive form for creating and editing nursing clinical notes with:
 * - Rich text editor for clinical documentation
 * - SOAP note sections (Subjective, Objective, Assessment, Plan)
 * - Additional clinical sections (Interventions, Patient Response, Education, Communication)
 * - Auto-save functionality with debouncing
 * - Form validation and error handling
 * - Status management (Draft, In Progress, Completed, etc.)
 * - Character/word count display
 * - HIPAA-compliant HTML sanitization
 *
 * @example
 * ```tsx
 * <NursingNoteForm
 *   patientId={123}
 *   benefitPeriodId={456}
 *   noteId={789} // For editing existing notes
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 * />
 * ```
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Paper,
  Divider,
  CircularProgress,
  Chip,
  Stack,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Tooltip
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

// Icons
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Project imports
import RichTextEditor, { RichTextEditorRef } from 'components/@extended/RichTextEditor';
import { useNursingNote } from './hooks/useNursingNote';
import { useAutoSaveWithVisibility } from './hooks/useAutoSave';
import { sanitizeNursingNoteFields, getWordCount, getCharacterCount } from './utils/sanitize';

// Types
import type {
  NursingClinicalNote,
  CreateNursingNoteInput,
  UpdateNursingNoteInput,
  NursingNoteStatus,
  NursingNoteContentFormat
} from 'types/nursingNote';

// ==============================|| CONSTANTS ||============================== //

/**
 * Available note statuses with display labels
 */
const NOTE_STATUSES: { value: NursingNoteStatus; label: string; color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' }[] = [
  { value: 'DRAFT', label: 'Draft', color: 'default' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'primary' },
  { value: 'COMPLETED', label: 'Completed', color: 'info' },
  { value: 'PENDING_SIGNATURE', label: 'Pending Signature', color: 'warning' },
  { value: 'SIGNED', label: 'Signed', color: 'success' }
];

/**
 * Content format options
 */
const CONTENT_FORMATS: { value: NursingNoteContentFormat; label: string }[] = [
  { value: 'html', label: 'HTML (Rich Text)' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' }
];

/**
 * Clinical note templates for quick documentation
 */
const NOTE_TEMPLATES = [
  {
    id: 'routine-visit',
    name: 'Routine Visit',
    content: '<p>Patient seen for routine skilled nursing visit.</p>'
  },
  {
    id: 'prn-visit',
    name: 'PRN Visit',
    content: '<p>Patient seen for PRN (as needed) visit.</p>'
  },
  {
    id: 'initial-assessment',
    name: 'Initial Assessment',
    content: '<p>Initial comprehensive assessment completed.</p>'
  }
];

// ==============================|| FORM DATA INTERFACE ||============================== //

interface NursingNoteFormData {
  // Note metadata
  noteDate: Dayjs | null;
  timeIn: string;
  timeOut: string;
  prnVisit: boolean;
  noteStatus: NursingNoteStatus;
  contentFormat: NursingNoteContentFormat;

  // Main content
  content: string;

  // SOAP sections
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;

  // Additional clinical sections
  interventions: string;
  patientResponse: string;
  patientEducation: string;
  communication: string;
}

/**
 * Initial form data with defaults
 */
const getInitialFormData = (): NursingNoteFormData => ({
  noteDate: dayjs(),
  timeIn: '',
  timeOut: '',
  prnVisit: false,
  noteStatus: 'DRAFT',
  contentFormat: 'html',
  content: '',
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  interventions: '',
  patientResponse: '',
  patientEducation: '',
  communication: ''
});

// ==============================|| COMPONENT PROPS ||============================== //

interface NursingNoteFormProps {
  /**
   * Patient ID for the note
   */
  patientId: number;

  /**
   * Optional benefit period ID
   */
  benefitPeriodId?: number;

  /**
   * Note ID for editing existing notes
   */
  noteId?: number;

  /**
   * Initial data for the form (for editing)
   */
  initialData?: Partial<NursingClinicalNote>;

  /**
   * Submit handler
   */
  onSubmit?: (data: CreateNursingNoteInput | UpdateNursingNoteInput) => Promise<void>;

  /**
   * Cancel handler
   */
  onCancel?: () => void;

  /**
   * Enable auto-save functionality
   * @default true
   */
  enableAutoSave?: boolean;

  /**
   * Auto-save interval in milliseconds
   * @default 30000 (30 seconds)
   */
  autoSaveInterval?: number;

  /**
   * Show advanced sections (SOAP, additional fields)
   * @default false
   */
  showAdvancedSections?: boolean;
}

// ==============================|| MAIN COMPONENT ||============================== //

const NursingNoteForm = ({
  patientId,
  benefitPeriodId,
  noteId,
  initialData,
  onSubmit,
  onCancel,
  enableAutoSave = true,
  autoSaveInterval = 30000,
  showAdvancedSections = false
}: NursingNoteFormProps) => {
  // ==============================|| STATE ||============================== //

  const [formData, setFormData] = useState<NursingNoteFormData>(getInitialFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSOAPSections, setShowSOAPSections] = useState(showAdvancedSections);
  const [showAdditionalSections, setShowAdditionalSections] = useState(showAdvancedSections);

  // Rich text editor refs
  const contentEditorRef = useRef<RichTextEditorRef>(null);
  const subjectiveEditorRef = useRef<RichTextEditorRef>(null);
  const objectiveEditorRef = useRef<RichTextEditorRef>(null);
  const assessmentEditorRef = useRef<RichTextEditorRef>(null);
  const planEditorRef = useRef<RichTextEditorRef>(null);

  // ==============================|| HOOKS ||============================== //

  const {
    note,
    createNote,
    updateNote,
    patchNote,
    isSaving,
    error: apiError
  } = useNursingNote({
    noteId,
    patientId,
    autoFetch: !!noteId
  });

  // ==============================|| AUTO-SAVE ||============================== //

  const autoSaveData = useMemo(() => ({
    ...formData,
    noteDate: formData.noteDate?.toISOString()
  }), [formData]);

  const autoSave = useAutoSaveWithVisibility(autoSaveData, {
    onSave: async (data) => {
      if (!noteId || !enableAutoSave) return;

      const sanitizedData = sanitizeNursingNoteFields({
        content: data.content,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        interventions: data.interventions,
        patientResponse: data.patientResponse,
        patientEducation: data.patientEducation,
        communication: data.communication
      });

      await patchNote(noteId, {
        noteDate: data.noteDate,
        timeIn: data.timeIn || undefined,
        timeOut: data.timeOut || undefined,
        prnVisit: data.prnVisit,
        noteStatus: data.noteStatus,
        contentFormat: data.contentFormat,
        ...sanitizedData
      });
    },
    debounceMs: autoSaveInterval,
    enabled: enableAutoSave && !!noteId,
    onSuccess: () => {
      // Optional: Show a subtle success indicator
      console.log('Auto-saved successfully');
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
    }
  });

  // ==============================|| EFFECTS ||============================== //

  /**
   * Load initial data when editing existing note
   */
  useEffect(() => {
    if (note && noteId) {
      setFormData({
        noteDate: note.noteDate ? dayjs(note.noteDate) : dayjs(),
        timeIn: note.timeIn || '',
        timeOut: note.timeOut || '',
        prnVisit: note.prnVisit || false,
        noteStatus: note.noteStatus || 'DRAFT',
        contentFormat: note.contentFormat || 'html',
        content: note.content || '',
        subjective: note.subjective || '',
        objective: note.objective || '',
        assessment: note.assessment || '',
        plan: note.plan || '',
        interventions: note.interventions || '',
        patientResponse: note.patientResponse || '',
        patientEducation: note.patientEducation || '',
        communication: note.communication || ''
      });
    } else if (initialData) {
      setFormData({
        ...getInitialFormData(),
        noteDate: initialData.noteDate ? dayjs(initialData.noteDate) : dayjs(),
        timeIn: initialData.timeIn || '',
        timeOut: initialData.timeOut || '',
        prnVisit: initialData.prnVisit || false,
        noteStatus: initialData.noteStatus || 'DRAFT',
        contentFormat: initialData.contentFormat || 'html',
        content: initialData.content || '',
        subjective: initialData.subjective || '',
        objective: initialData.objective || '',
        assessment: initialData.assessment || '',
        plan: initialData.plan || '',
        interventions: initialData.interventions || '',
        patientResponse: initialData.patientResponse || '',
        patientEducation: initialData.patientEducation || '',
        communication: initialData.communication || ''
      });
    }
  }, [note, noteId, initialData]);

  // ==============================|| HANDLERS ||============================== //

  /**
   * Handle form field changes
   */
  const handleChange = useCallback((field: keyof NursingNoteFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Handle checkbox changes
   */
  const handleCheckboxChange = useCallback((field: keyof NursingNoteFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.checked }));
  }, []);

  /**
   * Handle date changes
   */
  const handleDateChange = useCallback((value: Dayjs | null) => {
    setFormData(prev => ({ ...prev, noteDate: value }));
    if (errors.noteDate) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.noteDate;
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Handle rich text editor changes
   */
  const handleRichTextChange = useCallback((field: keyof NursingNoteFormData) => (html: string, text: string) => {
    setFormData(prev => ({ ...prev, [field]: html }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Validate form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate note date
    if (!formData.noteDate) {
      newErrors.noteDate = 'Note date is required';
    } else if (formData.noteDate.isAfter(dayjs())) {
      newErrors.noteDate = 'Note date cannot be in the future';
    }

    // Validate that at least one content field has data
    const hasContent =
      formData.content ||
      formData.subjective ||
      formData.objective ||
      formData.assessment ||
      formData.plan ||
      formData.interventions ||
      formData.patientResponse ||
      formData.patientEducation ||
      formData.communication;

    if (!hasContent) {
      newErrors.content = 'At least one clinical documentation field is required';
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (formData.timeIn && !timeRegex.test(formData.timeIn)) {
      newErrors.timeIn = 'Time must be in HH:MM format (e.g., 09:30)';
    }
    if (formData.timeOut && !timeRegex.test(formData.timeOut)) {
      newErrors.timeOut = 'Time must be in HH:MM format (e.g., 10:30)';
    }

    // Validate time out is after time in
    if (formData.timeIn && formData.timeOut) {
      const [inHour, inMin] = formData.timeIn.split(':').map(Number);
      const [outHour, outMin] = formData.timeOut.split(':').map(Number);
      const timeInMinutes = inHour * 60 + inMin;
      const timeOutMinutes = outHour * 60 + outMin;

      if (timeOutMinutes <= timeInMinutes) {
        newErrors.timeOut = 'Time out must be after time in';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Sanitize HTML content
      const sanitizedData = sanitizeNursingNoteFields({
        content: formData.content,
        subjective: formData.subjective,
        objective: formData.objective,
        assessment: formData.assessment,
        plan: formData.plan,
        interventions: formData.interventions,
        patientResponse: formData.patientResponse,
        patientEducation: formData.patientEducation,
        communication: formData.communication
      });

      const submitData: CreateNursingNoteInput | UpdateNursingNoteInput = {
        noteDate: formData.noteDate!.format('YYYY-MM-DD'),
        timeIn: formData.timeIn || undefined,
        timeOut: formData.timeOut || undefined,
        prnVisit: formData.prnVisit,
        noteStatus: formData.noteStatus,
        contentFormat: formData.contentFormat,
        ...sanitizedData
      };

      // Add patient and benefit period IDs for creation
      if (!noteId) {
        (submitData as CreateNursingNoteInput).patientId = patientId;
        if (benefitPeriodId) {
          (submitData as CreateNursingNoteInput).benefitPeriodId = benefitPeriodId;
        }
      }

      // Call custom onSubmit handler if provided, otherwise use hook methods
      if (onSubmit) {
        await onSubmit(submitData);
      } else if (noteId) {
        await updateNote(noteId, submitData as UpdateNursingNoteInput);
      } else {
        await createNote(submitData as CreateNursingNoteInput);
      }

      // Reset form on successful creation
      if (!noteId) {
        setFormData(getInitialFormData());
        contentEditorRef.current?.clearContent();
        subjectiveEditorRef.current?.clearContent();
        objectiveEditorRef.current?.clearContent();
        assessmentEditorRef.current?.clearContent();
        planEditorRef.current?.clearContent();
      }
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to save nursing note');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, noteId, patientId, benefitPeriodId, validateForm, onSubmit, createNote, updateNote]);

  /**
   * Handle save as draft
   */
  const handleSaveAsDraft = useCallback(async () => {
    setFormData(prev => ({ ...prev, noteStatus: 'DRAFT' }));
    // Trigger form submission with draft status
    await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  }, [handleSubmit]);

  /**
   * Handle mark as complete
   */
  const handleMarkAsComplete = useCallback(async () => {
    setFormData(prev => ({ ...prev, noteStatus: 'COMPLETED' }));
    // Trigger form submission with completed status
    await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  }, [handleSubmit]);

  // ==============================|| COMPUTED VALUES ||============================== //

  const contentWordCount = useMemo(() => getWordCount(formData.content), [formData.content]);
  const contentCharCount = useMemo(() => getCharacterCount(formData.content), [formData.content]);

  const combinedError = submitError || apiError?.message;

  // ==============================|| RENDER ||============================== //

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper elevation={0} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Header */}
            <Grid item xs={12}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Typography variant="h5">
                  {noteId ? 'Edit Nursing Note' : 'New Nursing Note'}
                </Typography>

                {/* Auto-save indicator */}
                {enableAutoSave && noteId && (
                  <Chip
                    size="small"
                    label={
                      autoSave.isSaving
                        ? 'Saving...'
                        : autoSave.lastSaved
                        ? `Saved ${dayjs(autoSave.lastSaved).fromNow()}`
                        : autoSave.isDirty
                        ? 'Unsaved changes'
                        : 'All changes saved'
                    }
                    color={autoSave.isSaving ? 'primary' : autoSave.isDirty ? 'warning' : 'success'}
                    icon={autoSave.isSaving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                  />
                )}
              </Stack>

              {combinedError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {combinedError}
                </Alert>
              )}
              {errors.content && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {errors.content}
                </Alert>
              )}
            </Grid>

            {/* Note Metadata */}
            <Grid item xs={12} md={6}>
              <DateTimePicker
                label="Note Date/Time *"
                value={formData.noteDate}
                onChange={handleDateChange}
                maxDateTime={dayjs()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.noteDate,
                    helperText: errors.noteDate
                  }
                }}
              />
            </Grid>

            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                label="Time In"
                placeholder="HH:MM"
                value={formData.timeIn}
                onChange={handleChange('timeIn')}
                error={!!errors.timeIn}
                helperText={errors.timeIn || 'e.g., 09:30'}
              />
            </Grid>

            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                label="Time Out"
                placeholder="HH:MM"
                value={formData.timeOut}
                onChange={handleChange('timeOut')}
                error={!!errors.timeOut}
                helperText={errors.timeOut || 'e.g., 10:30'}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Note Status</InputLabel>
                <Select
                  value={formData.noteStatus}
                  label="Note Status"
                  onChange={handleChange('noteStatus') as any}
                >
                  {NOTE_STATUSES.map(status => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Content Format</InputLabel>
                <Select
                  value={formData.contentFormat}
                  label="Content Format"
                  onChange={handleChange('contentFormat') as any}
                >
                  {CONTENT_FORMATS.map(format => (
                    <MenuItem key={format.value} value={format.value}>
                      {format.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.prnVisit}
                    onChange={handleCheckboxChange('prnVisit')}
                  />
                }
                label="PRN Visit (As Needed)"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Main Content */}
            <Grid item xs={12}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" color="primary">
                  Clinical Documentation
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={`${contentWordCount} words`} variant="outlined" />
                  <Chip size="small" label={`${contentCharCount} characters`} variant="outlined" />
                </Stack>
              </Stack>

              <RichTextEditor
                ref={contentEditorRef}
                value={formData.content}
                onChange={handleRichTextChange('content')}
                placeholder="Enter clinical documentation..."
                minHeight={200}
                maxHeight={500}
                showCharacterCount
                showTemplates
                templates={NOTE_TEMPLATES}
                toolbarVariant="clinical"
                error={!!errors.content}
                helperText={errors.content}
              />
            </Grid>

            {/* SOAP Sections */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle1" color="primary">
                        SOAP Documentation
                      </Typography>
                      <Tooltip title="Subjective, Objective, Assessment, Plan - Standard clinical documentation format">
                        <InfoOutlinedIcon fontSize="small" color="action" />
                      </Tooltip>
                    </Stack>
                    <IconButton
                      onClick={() => setShowSOAPSections(!showSOAPSections)}
                      size="small"
                    >
                      {showSOAPSections ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Stack>

                  <Collapse in={showSOAPSections}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={6}>
                        <RichTextEditor
                          ref={subjectiveEditorRef}
                          value={formData.subjective}
                          onChange={handleRichTextChange('subjective')}
                          label="Subjective"
                          placeholder="Patient's report, symptoms, complaints..."
                          minHeight={120}
                          maxHeight={300}
                          showCharacterCount={false}
                          showToolbar
                          toolbarVariant="clinical"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <RichTextEditor
                          ref={objectiveEditorRef}
                          value={formData.objective}
                          onChange={handleRichTextChange('objective')}
                          label="Objective"
                          placeholder="Clinical findings, observations, measurements..."
                          minHeight={120}
                          maxHeight={300}
                          showCharacterCount={false}
                          showToolbar
                          toolbarVariant="clinical"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <RichTextEditor
                          ref={assessmentEditorRef}
                          value={formData.assessment}
                          onChange={handleRichTextChange('assessment')}
                          label="Assessment"
                          placeholder="Clinical assessment, evaluation..."
                          minHeight={120}
                          maxHeight={300}
                          showCharacterCount={false}
                          showToolbar
                          toolbarVariant="clinical"
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <RichTextEditor
                          ref={planEditorRef}
                          value={formData.plan}
                          onChange={handleRichTextChange('plan')}
                          label="Plan"
                          placeholder="Care plan, interventions, follow-up..."
                          minHeight={120}
                          maxHeight={300}
                          showCharacterCount={false}
                          showToolbar
                          toolbarVariant="clinical"
                        />
                      </Grid>
                    </Grid>
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>

            {/* Additional Clinical Sections */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1" color="primary">
                      Additional Clinical Sections
                    </Typography>
                    <IconButton
                      onClick={() => setShowAdditionalSections(!showAdditionalSections)}
                      size="small"
                    >
                      {showAdditionalSections ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Stack>

                  <Collapse in={showAdditionalSections}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Interventions"
                          placeholder="Nursing interventions performed..."
                          value={formData.interventions}
                          onChange={handleChange('interventions')}
                          multiline
                          rows={3}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Patient Response"
                          placeholder="Patient response to interventions..."
                          value={formData.patientResponse}
                          onChange={handleChange('patientResponse')}
                          multiline
                          rows={3}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Patient Education"
                          placeholder="Education provided to patient/family..."
                          value={formData.patientEducation}
                          onChange={handleChange('patientEducation')}
                          multiline
                          rows={3}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Communication"
                          placeholder="Communication with team/family..."
                          value={formData.communication}
                          onChange={handleChange('communication')}
                          multiline
                          rows={3}
                        />
                      </Grid>
                    </Grid>
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                {onCancel && (
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={isSubmitting || isSaving}
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  variant="outlined"
                  onClick={handleSaveAsDraft}
                  disabled={isSubmitting || isSaving}
                  startIcon={<SaveIcon />}
                >
                  Save as Draft
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || isSaving}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                >
                  {isSubmitting ? 'Saving...' : noteId ? 'Update Note' : 'Create Note'}
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  onClick={handleMarkAsComplete}
                  disabled={isSubmitting || isSaving}
                  startIcon={<CheckCircleIcon />}
                >
                  Complete & Sign
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </LocalizationProvider>
  );
};

export default NursingNoteForm;
