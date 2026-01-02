// =============================================================================
// Nursing Notes Module - Barrel Export
// =============================================================================
// Centralized exports for all nursing notes components, hooks, and utilities
// =============================================================================

// Components
export { default as NursingNoteForm } from './NursingNoteForm';
export { default as NursingNoteCard } from './NursingNoteCard';
export { default as NursingNoteHistory } from './NursingNoteHistory';

// Hooks
export { useNursingNote, default as useNursingNoteHook } from './hooks/useNursingNote';
export { useAutoSave, useAutoSaveWithVisibility } from './hooks/useAutoSave';

// Utilities
export {
  sanitizeHtml,
  validateSafeHtml,
  sanitizeNursingNoteFields,
  getWordCount,
  getCharacterCount,
  getEstimatedReadingTime,
} from './utils/sanitize';
export { formatDate, formatDateTime, truncate } from './utils/formatters';

// Types (re-export from @chartwarden/types)
export type {
  NursingClinicalNote,
  NursingClinicalNoteWithUsers,
  CreateNursingNoteInput,
  UpdateNursingNoteInput,
  SignNursingNoteInput,
  AmendNursingNoteInput,
  NursingNoteFilters,
  NursingNoteSearchParams,
  NursingNotePaginationParams,
  PaginatedNursingNotes,
  NursingNoteStats,
  NursingNoteAutoSaveState,
  RichTextEditorMetadata,
  NursingNoteValidation,
  NursingNoteStatus,
  NursingNoteContentFormat,
  ExportNursingNoteRequest,
  NursingNoteExportFormat,
} from 'types/nursingNote';
