// =============================================================================
// Nursing Note Card Component
// =============================================================================
// Displays an individual nursing clinical note in the history view
// Used in the NursingNoteHistory list component
// =============================================================================

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Typography,
  Button,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  CheckCircle as SignIcon,
  Warning as WarningIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';

// PROJECT IMPORTS
import { NursingClinicalNote, NursingNoteStatus } from 'types/nursingNote';
import { formatDate, formatDateTime, truncate } from './utils/formatters';
import { sanitizeHtml, getWordCount } from './utils/sanitize';

/**
 * Props for the NursingNoteCard component
 */
export interface NursingNoteCardProps {
  /**
   * The nursing note data to display
   */
  note: NursingClinicalNote;

  /**
   * Callback when the view/details button is clicked
   */
  onView?: (note: NursingClinicalNote) => void;

  /**
   * Callback when the edit button is clicked
   */
  onEdit?: (note: NursingClinicalNote) => void;

  /**
   * Callback when the sign button is clicked
   */
  onSign?: (note: NursingClinicalNote) => void;

  /**
   * Whether the current user can edit this note
   * @default false
   */
  canEdit?: boolean;

  /**
   * Whether the current user can sign this note
   * @default false
   */
  canSign?: boolean;

  /**
   * Whether to show the full content or a truncated preview
   * @default false (show preview)
   */
  showFullContent?: boolean;

  /**
   * Maximum characters to show in content preview
   * @default 200
   */
  previewLength?: number;

  /**
   * Whether to highlight the card (e.g., for search results)
   * @default false
   */
  highlighted?: boolean;
}

/**
 * Gets the appropriate color for a note status badge
 */
function getStatusColor(
  status: NursingNoteStatus
): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'IN_PROGRESS':
      return 'info';
    case 'COMPLETED':
      return 'primary';
    case 'PENDING_SIGNATURE':
      return 'warning';
    case 'SIGNED':
      return 'success';
    case 'AMENDED':
      return 'secondary';
    case 'VOID':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Gets a human-readable label for a note status
 */
function getStatusLabel(status: NursingNoteStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'COMPLETED':
      return 'Completed';
    case 'PENDING_SIGNATURE':
      return 'Pending Signature';
    case 'SIGNED':
      return 'Signed';
    case 'AMENDED':
      return 'Amended';
    case 'VOID':
      return 'Void';
    default:
      return status;
  }
}

/**
 * Formats the note content for display
 * Strips HTML tags and creates a plain text preview
 */
function formatContentPreview(html: string | undefined, maxLength: number): string {
  if (!html) return 'No content';

  // Sanitize and strip HTML to get plain text
  const sanitized = sanitizeHtml(html, { stripAll: true, preserveLineBreaks: false });

  // Truncate to specified length
  return truncate(sanitized, maxLength);
}

/**
 * Nursing Note Card Component
 * Displays a nursing clinical note with metadata and actions
 */
const NursingNoteCard: React.FC<NursingNoteCardProps> = ({
  note,
  onView,
  onEdit,
  onSign,
  canEdit = false,
  canSign = false,
  showFullContent = false,
  previewLength = 200,
  highlighted = false,
}) => {
  // Determine if the note is editable
  const isEditable = canEdit && ['DRAFT', 'IN_PROGRESS'].includes(note.noteStatus);

  // Determine if the note can be signed
  const isSignable = canSign && note.noteStatus === 'PENDING_SIGNATURE';

  // Format dates
  const noteDate = note.noteDate ? formatDate(note.noteDate) : 'No date';
  const createdAt = formatDateTime(note.createdAt);
  const updatedAt = note.updatedAt ? formatDateTime(note.updatedAt) : null;

  // Get content preview
  const contentPreview = showFullContent
    ? note.content || 'No content'
    : formatContentPreview(note.content, previewLength);

  // Calculate word count for display
  const wordCount = note.content ? getWordCount(note.content) : 0;

  return (
    <Card
      elevation={highlighted ? 3 : 1}
      sx={{
        mb: 2,
        borderLeft: highlighted ? 4 : 0,
        borderColor: highlighted ? 'primary.main' : 'transparent',
        transition: 'all 0.2s',
        '&:hover': {
          elevation: 2,
          boxShadow: 2,
        },
      }}
    >
      <CardContent>
        {/* Header: Status Badge and Metadata */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip
              label={getStatusLabel(note.noteStatus)}
              color={getStatusColor(note.noteStatus)}
              size="small"
              variant="outlined"
            />

            {note.prnVisit && (
              <Chip
                label="PRN Visit"
                color="warning"
                size="small"
                variant="outlined"
              />
            )}

            {note.amended && (
              <Tooltip title={`Amended: ${note.amendmentReason || 'No reason provided'}`}>
                <Chip
                  icon={<WarningIcon />}
                  label="Amended"
                  color="secondary"
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            {wordCount > 0 && (
              <Typography variant="caption" color="text.secondary">
                {wordCount} words
              </Typography>
            )}
          </Stack>
        </Stack>

        {/* Note Date and Time */}
        <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <CalendarIcon fontSize="small" color="action" />
            <Typography variant="body2" fontWeight={500}>
              {noteDate}
            </Typography>
          </Stack>

          {(note.timeIn || note.timeOut) && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <TimeIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {note.timeIn && `In: ${note.timeIn}`}
                {note.timeIn && note.timeOut && ' • '}
                {note.timeOut && `Out: ${note.timeOut}`}
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Nurse Information */}
        {note.nurseName && (
          <Stack direction="row" alignItems="center" spacing={0.5} mb={1.5}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {note.nurseName}
              {note.nurseCredentials && `, ${note.nurseCredentials}`}
            </Typography>
          </Stack>
        )}

        {/* Patient Information (if available) */}
        {note.patientName && (
          <Stack direction="row" alignItems="center" spacing={0.5} mb={1.5}>
            <AssignmentIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Patient: {note.patientName}
              {note.patientNumber && ` (${note.patientNumber})`}
            </Typography>
          </Stack>
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* Content Preview */}
        <Box mb={1.5}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {contentPreview}
          </Typography>
          {!showFullContent && note.content && note.content.length > previewLength && (
            <Typography variant="caption" color="primary" sx={{ cursor: 'pointer', mt: 0.5, display: 'block' }}>
              Read more...
            </Typography>
          )}
        </Box>

        {/* SOAP Sections Summary (if available) */}
        {(note.subjective || note.objective || note.assessment || note.plan) && (
          <Stack direction="row" spacing={1} mb={1} flexWrap="wrap">
            {note.subjective && (
              <Chip label="S" size="small" variant="outlined" title="Subjective" />
            )}
            {note.objective && (
              <Chip label="O" size="small" variant="outlined" title="Objective" />
            )}
            {note.assessment && (
              <Chip label="A" size="small" variant="outlined" title="Assessment" />
            )}
            {note.plan && (
              <Chip label="P" size="small" variant="outlined" title="Plan" />
            )}
          </Stack>
        )}

        {/* Signature Information */}
        {note.signedAt && note.signedById && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Signed at {formatDateTime(note.signedAt)}
            </Typography>
          </Box>
        )}

        {/* Amendment Information */}
        {note.amended && note.amendedAt && (
          <Box mt={0.5}>
            <Typography variant="caption" color="warning.main">
              Amended at {formatDateTime(note.amendedAt)}
              {note.amendmentReason && ` - ${note.amendmentReason}`}
            </Typography>
          </Box>
        )}

        {/* Timestamps */}
        <Box mt={1}>
          <Typography variant="caption" color="text.disabled">
            Created: {createdAt}
            {updatedAt && updatedAt !== createdAt && ` • Updated: ${updatedAt}`}
          </Typography>
        </Box>
      </CardContent>

      {/* Actions */}
      {(onView || onEdit || onSign) && (
        <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
          {onView && (
            <Button
              size="small"
              startIcon={<ViewIcon />}
              onClick={() => onView(note)}
              variant="outlined"
            >
              View
            </Button>
          )}

          {onEdit && isEditable && (
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => onEdit(note)}
              variant="outlined"
              color="primary"
            >
              Edit
            </Button>
          )}

          {onSign && isSignable && (
            <Button
              size="small"
              startIcon={<SignIcon />}
              onClick={() => onSign(note)}
              variant="contained"
              color="success"
            >
              Sign
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
};

export default NursingNoteCard;
