// =============================================================================
// Nursing Clinical Notes Types
// =============================================================================
// TypeScript interfaces and types for nursing clinical documentation
// Aligned with the nursing_clinical_notes database schema
// =============================================================================

/**
 * Note status workflow states
 * Tracks the lifecycle of a nursing clinical note from creation to signing
 */
export type NursingNoteStatus =
  | 'DRAFT'              // Initial state, note is being created
  | 'IN_PROGRESS'        // Note is actively being worked on
  | 'COMPLETED'          // Note content is complete, ready for review
  | 'PENDING_SIGNATURE'  // Awaiting nurse signature
  | 'SIGNED'             // Signed and finalized
  | 'AMENDED'            // Modified after signing (requires amendment tracking)
  | 'VOID';              // Voided/cancelled note

/**
 * Content format types for rich text storage
 */
export type NursingNoteContentFormat = 'html' | 'json' | 'markdown';

/**
 * Patient identifiers for additional tracking
 * Stored as JSON in the database
 */
export interface PatientIdentifiers {
  ssn?: string;
  medicareNumber?: string;
  medicaidNumber?: string;
  insuranceId?: string;
  [key: string]: string | undefined;
}

/**
 * SOAP documentation structure
 * Standard clinical documentation format
 */
export interface SOAPNote {
  subjective?: string;  // Patient's report, symptoms, complaints
  objective?: string;   // Clinical findings, observations, measurements
  assessment?: string;  // Clinical assessment, evaluation
  plan?: string;        // Care plan, interventions, follow-up
}

/**
 * Additional clinical documentation sections
 */
export interface ClinicalSections {
  interventions?: string;      // Nursing interventions performed
  patient_response?: string;   // Patient response to interventions
  patient_education?: string;  // Education provided to patient/family
  communication?: string;      // Communication with team/family
}

/**
 * Digital signature metadata (21 CFR Part 11 compliance)
 */
export interface DigitalSignature {
  signedAt?: Date;
  signedById?: string;
  signatureHash?: string;  // SHA-256 hash for integrity verification
}

/**
 * Cosignature metadata (for supervision/oversight)
 */
export interface Cosignature {
  cosignedAt?: Date;
  cosignedById?: string;
}

/**
 * Amendment tracking metadata
 */
export interface Amendment {
  amended: boolean;
  amendmentReason?: string;
  amendedAt?: Date;
  amendedById?: string;
}

/**
 * Audit trail metadata
 */
export interface AuditMetadata {
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;  // Soft delete timestamp
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Core nursing clinical note interface
 * Main type for nursing documentation
 */
export interface NursingClinicalNote {
  id: number;

  // Patient and benefit period references
  patientId?: number;
  benefitPeriodId?: number;

  // Note timing
  noteDate?: string;           // Date of the visit/note
  noteTimestamp?: Date;        // Precise timestamp when note was created
  timeIn?: string;             // Check-in time for visit
  timeOut?: string;            // Check-out time for visit

  // Patient information (denormalized for quick access)
  patientName?: string;
  patientNumber?: string;
  dob?: string;

  // Location information
  locationName?: string;
  locationNumber?: string;

  // Benefit period text
  benefitPeriod?: string;

  // Visit type
  prnVisit?: boolean;          // PRN (as needed) visit flag

  // Patient identifiers
  patientIdentifiers?: PatientIdentifiers;

  // Nurse information
  nurseId?: string;
  nurseName?: string;
  nurseCredentials?: string;   // RN, LPN, NP, etc.

  // Note status
  noteStatus: NursingNoteStatus;

  // Rich text content
  content?: string;            // Main rich text note content
  contentFormat?: NursingNoteContentFormat;

  // SOAP documentation sections
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;

  // Additional clinical sections
  interventions?: string;
  patientResponse?: string;
  patientEducation?: string;
  communication?: string;

  // Digital signature
  signedAt?: Date;
  signedById?: string;
  signatureHash?: string;

  // Cosignature
  cosignedAt?: Date;
  cosignedById?: string;

  // Amendment tracking
  amended?: boolean;
  amendmentReason?: string;
  amendedAt?: Date;
  amendedById?: string;

  // Audit fields
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Nursing note with populated user relationships
 * Extended interface with denormalized user data for display
 */
export interface NursingClinicalNoteWithUsers extends NursingClinicalNote {
  nurse?: {
    id: string;
    name: string;
    email: string;
    credentials?: string;
  };
  signedBy?: {
    id: string;
    name: string;
    email: string;
  };
  cosignedBy?: {
    id: string;
    name: string;
    email: string;
  };
  amendedBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Nursing note creation payload
 * Used when creating a new note via API
 */
export interface CreateNursingNoteInput {
  patientId: number;
  benefitPeriodId?: number;
  noteDate: string;
  timeIn?: string;
  timeOut?: string;
  prnVisit?: boolean;
  content?: string;
  contentFormat?: NursingNoteContentFormat;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  interventions?: string;
  patientResponse?: string;
  patientEducation?: string;
  communication?: string;
}

/**
 * Nursing note update payload
 * Used when updating an existing note via API
 */
export interface UpdateNursingNoteInput {
  noteDate?: string;
  timeIn?: string;
  timeOut?: string;
  prnVisit?: boolean;
  noteStatus?: NursingNoteStatus;
  content?: string;
  contentFormat?: NursingNoteContentFormat;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  interventions?: string;
  patientResponse?: string;
  patientEducation?: string;
  communication?: string;
}

/**
 * Nursing note signature payload
 * Used when signing a note
 */
export interface SignNursingNoteInput {
  signatureHash: string;  // SHA-256 hash of signature data
}

/**
 * Nursing note amendment payload
 * Used when amending a signed note
 */
export interface AmendNursingNoteInput {
  amendmentReason: string;
  content?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  interventions?: string;
  patientResponse?: string;
  patientEducation?: string;
  communication?: string;
}

/**
 * Nursing note filter parameters
 * Used for querying/filtering notes
 */
export interface NursingNoteFilters {
  patientId?: number;
  nurseId?: string;
  noteStatus?: NursingNoteStatus | NursingNoteStatus[];
  startDate?: string;
  endDate?: string;
  benefitPeriodId?: number;
  prnVisit?: boolean;
  includeSigned?: boolean;
  includeAmended?: boolean;
  includeDeleted?: boolean;
}

/**
 * Nursing note search parameters
 * Used for full-text search within notes
 */
export interface NursingNoteSearchParams {
  query: string;
  patientId?: number;
  nurseId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Pagination parameters for note lists
 */
export interface NursingNotePaginationParams {
  page?: number;
  limit?: number;
  sortBy?: 'noteDate' | 'noteTimestamp' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated nursing note response
 */
export interface PaginatedNursingNotes {
  data: NursingClinicalNote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Nursing note statistics
 * Used for dashboard/analytics
 */
export interface NursingNoteStats {
  totalNotes: number;
  draftNotes: number;
  completedNotes: number;
  signedNotes: number;
  amendedNotes: number;
  notesByStatus: Record<NursingNoteStatus, number>;
  notesByNurse: Record<string, number>;
  notesByMonth: Record<string, number>;
}

/**
 * Auto-save state for draft notes
 */
export interface NursingNoteAutoSaveState {
  noteId?: number;
  lastSaved?: Date;
  isDirty: boolean;
  isSaving: boolean;
  error?: string;
}

/**
 * Rich text editor metadata
 */
export interface RichTextEditorMetadata {
  characterCount: number;
  wordCount: number;
  estimatedReadingTime: number; // in minutes
}

/**
 * Nursing note validation result
 */
export interface NursingNoteValidation {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
  warnings: {
    field: string;
    message: string;
  }[];
}

/**
 * Export format options
 */
export type NursingNoteExportFormat = 'pdf' | 'html' | 'json' | 'text';

/**
 * Export request payload
 */
export interface ExportNursingNoteRequest {
  noteId: number;
  format: NursingNoteExportFormat;
  includeSignatures?: boolean;
  includeAuditTrail?: boolean;
}
