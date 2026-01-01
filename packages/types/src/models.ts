// =============================================================================
// Core Domain Models
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole =
  | 'admin' | 'physician' | 'nurse' | 'rn' | 'lpn' | 'cna'
  | 'social_worker' | 'chaplain' | 'aide' | 'billing' | 'scheduler' | 'medical_director';

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: Date;
  gender: Gender;
  admissionDate: Date;
  dischargeDate?: Date;
  levelOfCare: LevelOfCare;
  status: PatientStatus;
  primaryDiagnosis?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type Gender = 'male' | 'female' | 'other' | 'unknown';
export type LevelOfCare = 'routine' | 'continuous' | 'inpatient' | 'respite';
export type PatientStatus = 'pending_admission' | 'active' | 'discharged' | 'deceased' | 'revoked' | 'transferred';

export interface Encounter {
  id: string;
  patientId: string;
  staffId: string;
  encounterType: EncounterType;
  visitType: VisitType;
  status: EncounterStatus;
  scheduledAt: Date;
  checkinAt?: Date;
  checkoutAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EncounterType = 'routine_visit' | 'admission' | 'recertification' | 'discharge' | 'death_visit' | 'prn_visit' | 'on_call';
export type VisitType = 'rn' | 'lpn' | 'cna' | 'msw' | 'chaplain' | 'volunteer' | 'physician' | 'np';
export type EncounterStatus = 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'cancelled';

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  route: MedicationRoute;
  frequency: string;
  status: MedicationStatus;
  isControlled: boolean;
  controlledSchedule?: 'II' | 'III' | 'IV' | 'V';
  createdAt: Date;
  updatedAt: Date;
}

export type MedicationRoute = 'oral' | 'sublingual' | 'topical' | 'transdermal' | 'subcutaneous' | 'intramuscular' | 'intravenous' | 'rectal' | 'inhalation';
export type MedicationStatus = 'active' | 'on_hold' | 'discontinued' | 'completed';

// =============================================================================
// Medication Administration Record (MAR)
// =============================================================================

export interface MAREntry {
  id: string;
  patientId: string;
  medicationId: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: MARStatus;
  dosageGiven?: string;
  routeUsed?: string;
  administeredById?: string;
  administeredByName?: string;
  reasonNotGiven?: string;
  patientResponse?: string;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MARStatus = 'GIVEN' | 'NOT_GIVEN' | 'REFUSED' | 'HELD' | 'LATE' | 'MISSED';

export interface MAREntryWithMedication extends MAREntry {
  medication?: Medication;
}

export interface Claim {
  id: string;
  patientId: string;
  payerId: string;
  claimNumber: string;
  serviceFromDate: Date;
  serviceToDate: Date;
  totalCharges: number;
  status: ClaimStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ClaimStatus = 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected' | 'paid' | 'denied' | 'appealed' | 'void';

// =============================================================================
// Medicare Hospice Cap Tracking Models
// CMS Requirement: Track beneficiary cap per federal fiscal year (Oct 1 - Sep 30)
// =============================================================================

/**
 * Cap Tracking - Medicare hospice cap per beneficiary per cap year
 * CMS requires hospices to track payments to ensure they don't exceed the annual cap
 * FY 2025 cap: $34,465.34 per beneficiary
 */
export interface CapTracking {
  id: number;
  patientId: number;

  // Cap year (Oct 1 - Sep 30)
  capYear: number; // e.g., 2025 for cap year 2024-2025
  capYearStartDate: string; // Oct 1
  capYearEndDate: string; // Sep 30

  // Cap amount (in cents for precision)
  capAmountCents: number; // $34,465.34 = 3446534 cents
  totalPaymentsCents: number; // Total payments applied in cap year
  remainingCapCents: number; // Remaining cap amount

  // Cap utilization percentage (for easier querying)
  utilizationPercentage: number; // e.g., 85.50 for 85.5%

  // Cap exceeded tracking
  capExceeded: boolean;
  capExceededDate?: string;
  capExceededAmountCents?: number; // Amount over cap

  // Alert thresholds tracking
  alert80Triggered: boolean;
  alert80Date?: Date;
  alert90Triggered: boolean;
  alert90Date?: Date;
  alert95Triggered: boolean;
  alert95Date?: Date;

  // Calculation tracking
  lastCalculatedAt?: Date;
  calculationStatus: CapCalculationStatus;

  // Notes and metadata
  notes?: string;
  metadata?: Record<string, unknown>;

  // Audit fields
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CapCalculationStatus = 'CURRENT' | 'PENDING_RECALC' | 'ERROR';

/**
 * Cap Tracking with Patient - Cap record joined with patient info
 */
export interface CapTrackingWithPatient {
  cap: CapTracking;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
  };
}

/**
 * Calculate Cap Request - Request payload for cap calculation
 */
export interface CalculateCapRequest {
  patientId: number;
  capYear: number;
}

/**
 * Calculate Cap Response - Response from cap calculation
 */
export interface CalculateCapResponse {
  status: number;
  message: string;
  data: {
    capTracking: CapTracking;
    alertsTriggered: string[];
  };
}

/**
 * Cap Utilization Report Summary - Aggregate statistics for cap tracking
 */
export interface CapUtilizationSummary {
  totalPatients: number;
  totalCapAmount: number; // in cents
  totalPayments: number; // in cents
  totalRemaining: number; // in cents
  patientsExceeded: number;
  totalExceededAmount: number; // in cents
  patientsAbove80: number;
  patientsAbove90: number;
  patientsAbove95: number;
  averageUtilization: number; // percentage
}

/**
 * Cap Utilization Report - Full report with summary and breakdown
 */
export interface CapUtilizationReport {
  summary: CapUtilizationSummary;
  breakdown: CapTracking[];
}

/**
 * Cap Tracking Response - Standard response for cap tracking operations
 */
export interface CapTrackingResponse {
  status: number;
  data: CapTracking[];
  count: number;
}

/**
 * Patients Approaching Cap Response - Response for threshold queries
 */
export interface PatientsApproachingCapResponse {
  status: number;
  data: CapTrackingWithPatient[];
  count: number;
}

// =============================================================================
// ERA (Electronic Remittance Advice) Processing Models
// Phase 3B - 835 EDI Transaction Processing
// =============================================================================

/**
 * ERA File - Tracks received 835 EDI files
 * Contains payment information from payers
 */
export interface ERAFile {
  id: number;
  fileId: string;
  fileName: string;
  fileSize?: number;
  edi835Content?: string;
  controlNumber?: string;
  payerId?: number;
  payerName?: string;
  payerIdentifier?: string;
  productionDate?: string;
  receivedDate: Date;
  status: ERAFileStatus;
  processedAt?: Date;
  totalPayments: number;
  totalAmount: number;
  totalClaims: number;
  autoPostedCount: number;
  exceptionCount: number;
  source?: ERASource;
  sourcePath?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  uploadedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ERAFileStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'PARTIALLY_POSTED';
export type ERASource = 'SFTP' | 'API' | 'MANUAL_UPLOAD' | 'EMAIL';

/**
 * ERA Payment - Payment details extracted from 835 transactions
 * Each payment corresponds to a claim payment from the payer
 */
export interface ERAPayment {
  id: number;
  eraFileId: number;
  paymentId: string;
  checkNumber?: string;
  checkDate?: string;
  payerId?: number;
  payerName?: string;
  payerIdentifier?: string;
  payeeName?: string;
  payeeNpi?: string;
  payeeTaxId?: string;
  totalPaymentAmount: number;
  totalBilledAmount?: number;
  totalAllowedAmount?: number;
  totalAdjustmentAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentFormat?: string;
  claimId?: number;
  patientAccountNumber?: string;
  patientName?: string;
  claimStatementPeriodStart?: string;
  claimStatementPeriodEnd?: string;
  claimStatus?: ERAClaimStatus;
  serviceLineCount?: number;
  adjustmentCodes?: AdjustmentCode[];
  remarkCodes?: string[];
  postingStatus: ERAPostingStatus;
  postedAt?: Date;
  postedById?: string;
  isException: boolean;
  exceptionReason?: string;
  exceptionResolvedAt?: Date;
  claimPaymentInfo?: Record<string, unknown>;
  servicePaymentInfo?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentMethod = 'CHECK' | 'EFT' | 'VIRTUAL_CARD';
export type ERAClaimStatus = 'PAID' | 'DENIED' | 'PARTIAL' | 'ADJUSTED';
export type ERAPostingStatus = 'PENDING' | 'AUTO_POSTED' | 'MANUAL_POSTED' | 'EXCEPTION' | 'DENIED';

/**
 * Adjustment Code - CARC/RARC codes from 835
 * Claim Adjustment Reason Codes explain payment adjustments
 */
export interface AdjustmentCode {
  groupCode: AdjustmentGroupCode;
  code: string;
  amount: number;
  quantity?: number;
}

export type AdjustmentGroupCode =
  | 'CO'  // Contractual Obligation
  | 'CR'  // Correction and Reversal
  | 'OA'  // Other Adjustment
  | 'PI'  // Payer Initiated Reduction
  | 'PR'; // Patient Responsibility

/**
 * Payment Posting - Audit trail of automated and manual payment postings
 */
export interface PaymentPosting {
  id: number;
  eraPaymentId: number;
  claimId: number;
  postingId: string;
  postingDate: Date;
  postingType: PostingType;
  postingLevel?: PostingLevel;
  paymentAmount: number;
  allowedAmount?: number;
  billedAmount?: number;
  adjustmentAmount?: number;
  contractualAdjustment?: number;
  patientResponsibility?: number;
  writeOffAmount?: number;
  adjustmentReasonCodes?: AdjustmentCode[];
  adjustmentDetails?: Record<string, unknown>;
  previousBalance?: number;
  newBalance?: number;
  serviceLineNumber?: number;
  procedureCode?: string;
  serviceDate?: string;
  isValidated: boolean;
  validationNotes?: string;
  isReversed: boolean;
  reversedAt?: Date;
  reversedById?: string;
  reversalReason?: string;
  metadata?: Record<string, unknown>;
  postedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PostingType = 'AUTO' | 'MANUAL' | 'ADJUSTMENT';
export type PostingLevel = 'CLAIM' | 'SERVICE_LINE';

/**
 * Posting Exception - Payments that couldn't be auto-posted
 * Requires manual review and resolution
 */
export interface PostingException {
  id: number;
  eraPaymentId: number;
  eraFileId: number;
  exceptionId: string;
  exceptionType: ExceptionType;
  exceptionReason: string;
  exceptionSeverity: ExceptionSeverity;
  checkNumber?: string;
  paymentAmount?: number;
  patientAccountNumber?: string;
  attemptedClaimId?: number;
  matchConfidenceScore?: number;
  status: ExceptionStatus;
  assignedToId?: string;
  assignedAt?: Date;
  resolutionType?: ResolutionType;
  resolutionNotes?: string;
  resolvedAt?: Date;
  resolvedById?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  createdAt: Date;
  slaDeadline?: Date;
  isOverdue: boolean;
  metadata?: Record<string, unknown>;
  updatedAt: Date;
}

export type ExceptionType =
  | 'CLAIM_NOT_FOUND'
  | 'AMOUNT_MISMATCH'
  | 'DUPLICATE_PAYMENT'
  | 'PARTIAL_PAYMENT'
  | 'PATIENT_MISMATCH'
  | 'INVALID_CLAIM_STATUS'
  | 'MISSING_REQUIRED_DATA'
  | 'LOW_CONFIDENCE_MATCH'
  | 'PROCESSING_ERROR';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ExceptionStatus = 'PENDING' | 'ASSIGNED' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type ResolutionType = 'MANUAL_POSTED' | 'CLAIM_CORRECTED' | 'PAYER_CONTACTED' | 'WRITTEN_OFF' | 'REFUNDED';

/**
 * Reconciliation Batch - Daily deposit reconciliation tracking
 * Matches ERA payments against bank deposits
 */
export interface ReconciliationBatch {
  id: number;
  batchId: string;
  batchDate: string;
  depositDate?: string;
  depositAmount?: number;
  bankStatementAmount?: number;
  eraFileCount: number;
  totalEraPayments: number;
  totalPostedPayments: number;
  varianceAmount?: number;
  isReconciled: boolean;
  reconciliationStatus: ReconciliationStatus;
  unmatchedDeposits?: Record<string, unknown>[];
  unmatchedEras?: Record<string, unknown>[];
  bankAccountNumber?: string;
  bankRoutingNumber?: string;
  bankStatementReference?: string;
  reconciliationNotes?: string;
  varianceExplanation?: string;
  approvedById?: string;
  approvedAt?: Date;
  metadata?: Record<string, unknown>;
  reconciledById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReconciliationStatus = 'PENDING' | 'IN_PROGRESS' | 'RECONCILED' | 'VARIANCE_IDENTIFIED' | 'EXCEPTION';

/**
 * ERA Processing Summary - Summary of ERA file processing results
 */
export interface ERAProcessingSummary {
  eraFileId: number;
  totalClaims: number;
  autoPosted: number;
  exceptions: number;
  totalAmount: number;
}

/**
 * ERA Upload Request - Request payload for uploading 835 files
 */
export interface ERAUploadRequest {
  fileName: string;
  fileContent: string;
}

/**
 * ERA Reconciliation Request - Request payload for reconciliation
 */
export interface ERAReconciliationRequest {
  batchDate: string;
  depositAmount?: number;
  bankStatementAmount?: number;
}

/**
 * Exception Resolution Request - Request payload for resolving exceptions
 */
export interface ExceptionResolutionRequest {
  resolutionType: ERAResolutionType;
  notes?: string;
}

export type ERAResolutionType = 'MANUAL_POSTED' | 'CLAIM_CORRECTED' | 'PAYER_CONTACTED' | 'WRITTEN_OFF' | 'REFUNDED';

// =============================================================================
// Denial Management Models
// Phase 3C - Denial Tracking, Root Cause Analysis, Appeal Management
// =============================================================================

/**
 * Claim Denial - Master table tracking all denied or partially denied claims
 * Tracks denial status, root cause, preventability, and appeal workflow
 */
export interface ClaimDenial {
  id: number;
  claimId: number;
  patientId: number;
  payerId?: number;
  denialId: string;
  denialDate: Date;
  eraPaymentId?: number;
  checkNumber?: string;
  denialType: DenialType;
  denialStatus: DenialStatus;
  billedAmount: number;
  deniedAmount: number;
  allowedAmount?: number;
  paidAmount?: number;
  adjustmentAmount?: number;
  denialCategoryId?: number;
  primaryDenialReason?: string;
  isPreventable?: boolean;
  preventableReason?: string;
  rootCause?: string;
  isAppealable: boolean;
  appealDeadline?: Date;
  daysUntilDeadline?: number;
  willAppeal?: boolean;
  appealDecisionDate?: Date;
  appealDecisionById?: string;
  appealDecisionReason?: string;
  assignedToId?: string;
  assignedAt?: Date;
  assignedById?: string;
  resolvedDate?: Date;
  resolvedById?: string;
  resolutionType?: DenialResolutionType;
  resolutionAmount?: number;
  resolutionNotes?: string;
  priorityScore?: number;
  priorityLevel?: PriorityLevel;
  requiresProviderEducation: boolean;
  educationCompleted: boolean;
  educationNotes?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
  identifiedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DenialType = 'FULL_DENIAL' | 'PARTIAL_DENIAL' | 'LINE_DENIAL' | 'ADJUSTMENT';
export type DenialStatus = 'IDENTIFIED' | 'UNDER_REVIEW' | 'APPEALING' | 'RESOLVED' | 'WRITTEN_OFF' | 'PATIENT_BILLED';
export type DenialResolutionType = 'APPEAL_WON' | 'APPEAL_LOST' | 'CORRECTED_RESUBMIT' | 'WRITTEN_OFF' | 'PATIENT_BILLED' | 'PAYER_ERROR_CORRECTED' | 'WRITE_OFF' | 'PATIENT_RESPONSIBILITY' | 'CORRECTED_CLAIM' | 'CONTRACTUAL_ADJUSTMENT';
export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Denial Reason - Links denials to specific CARC/RARC codes
 * Each denial can have multiple adjustment reason codes
 */
export interface DenialReason {
  id: number;
  denialId: number;
  carcCodeId?: number;
  carcCode: string;
  rarcCodes?: string[];
  groupCode: GroupCode;
  adjustmentAmount?: number;
  adjustmentQuantity?: number;
  serviceLineNumber?: number;
  procedureCode?: string;
  serviceDate?: Date;
  payerExplanation?: string;
  isPrimaryReason: boolean;
  isAppealable?: boolean;
  recommendedAction?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type GroupCode = 'CO' | 'PR' | 'OA' | 'PI';

/**
 * Appeal Case - Tracks appeal submissions and outcomes
 * Supports multi-level appeals (Redetermination through Federal Court)
 */
export interface AppealCase {
  id: number;
  appealId: string;
  denialId: number;
  claimId: number;
  appealLevel: AppealLevel;
  appealType?: AppealType;
  submittedDate?: Date;
  submittedById?: string;
  submissionMethod?: SubmissionMethod;
  trackingNumber?: string;
  confirmationNumber?: string;
  originalDeadline: Date;
  extendedDeadline?: Date;
  payerResponseDeadline?: Date;
  appealStatus: AppealStatus;
  currentStep?: string;
  statusDate: Date;
  decisionDate?: Date;
  decisionType?: DecisionType;
  decisionReason?: string;
  decisionReceivedDate?: Date;
  appealedAmount: number;
  recoveredAmount?: number;
  finalDeniedAmount?: number;
  appealBasis: string;
  medicalNecessityRationale?: string;
  policyReference?: string;
  appealContactName?: string;
  appealContactPhone?: string;
  appealContactEmail?: string;
  nextAppealLevel?: AppealLevel;
  willEscalate?: boolean;
  escalationDeadline?: Date;
  communicationLog?: CommunicationEntry[];
  hasMedicalRecords: boolean;
  hasClinicalNotes: boolean;
  hasPhysicianStatement: boolean;
  hasPolicyDocumentation: boolean;
  assignedToId?: string;
  assignedAt?: Date;
  preparationTimeDays?: number;
  decisionTimeDays?: number;
  totalCycleTimeDays?: number;
  metadata?: Record<string, unknown>;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AppealLevel = 'FIRST_LEVEL' | 'RECONSIDERATION' | 'REDETERMINATION' | 'ALJ_HEARING' | 'MAC_REVIEW' | 'FEDERAL_COURT' | 'FAIR_HEARING' | 'STATE_APPEAL' | 'INTERNAL_REVIEW' | 'EXTERNAL_REVIEW' | 'ARBITRATION' | 'LITIGATION';
export type AppealType = 'REDETERMINATION' | 'RECONSIDERATION' | 'ADMINISTRATIVE_LAW_JUDGE' | 'MEDICARE_APPEALS_COUNCIL';
export type SubmissionMethod = 'ONLINE_PORTAL' | 'PORTAL' | 'FAX' | 'MAIL' | 'EMAIL' | 'ELECTRONIC';
export type AppealStatus = 'PREPARING' | 'SUBMITTED' | 'PENDING' | 'ADDITIONAL_INFO_REQUESTED' | 'UNDER_REVIEW' | 'DECISION_RECEIVED' | 'WON' | 'PARTIALLY_WON' | 'DENIED' | 'LOST' | 'PARTIAL_WIN' | 'WITHDRAWN';
export type DecisionType = 'FULLY_FAVORABLE' | 'PARTIALLY_FAVORABLE' | 'UNFAVORABLE' | 'DISMISSED' | 'APPROVED' | 'PARTIAL_APPROVAL' | 'PENDING_INFO';

export interface CommunicationEntry {
  date: string;
  type: string;
  summary: string;
  contact?: string;
}

/**
 * Appeal Document - Stores references to appeal supporting documents
 * Tracks document submission status and version history
 */
export interface AppealDocument {
  id: number;
  appealId: number;
  documentType: DocumentType;
  documentName: string;
  documentDescription?: string;
  filePath?: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  mimeType?: string;
  documentDate?: Date;
  author?: string;
  isRequired: boolean;
  isSubmitted: boolean;
  submittedDate?: Date;
  version: number;
  supersedesDocumentId?: number;
  isSensitive: boolean;
  accessRestricted: boolean;
  metadata?: Record<string, unknown>;
  notes?: string;
  uploadedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentType = 'APPEAL_LETTER' | 'MEDICAL_RECORDS' | 'CLINICAL_NOTES' | 'PHYSICIAN_STATEMENT' | 'POLICY_DOCUMENTATION' | 'SUPPORTING_EVIDENCE' | 'PAYER_CORRESPONDENCE' | 'DECISION_LETTER' | 'ADDITIONAL_DOCUMENTATION' | 'OTHER';

/**
 * Appeal Timeline - Track milestones and deadlines in appeal process
 * Supports deadline tracking and notification management
 */
export interface AppealTimeline {
  id: number;
  appealId: number;
  milestoneType: MilestoneType;
  milestoneDate: Date;
  dueDate?: Date;
  isCompleted: boolean;
  completedOnTime?: boolean;
  daysOverdue?: number;
  description: string;
  responsibleParty?: string;
  actionTaken?: string;
  notificationSent: boolean;
  notificationDate?: Date;
  metadata?: Record<string, unknown>;
  createdById?: string;
  createdAt: Date;
}

export type MilestoneType = 'DENIAL_RECEIVED' | 'APPEAL_INITIATED' | 'DOCUMENTS_GATHERED' | 'APPEAL_SUBMITTED' | 'ACKNOWLEDGMENT_RECEIVED' | 'ADDITIONAL_INFO_REQUESTED' | 'INFO_PROVIDED' | 'DECISION_RECEIVED' | 'PAYMENT_RECEIVED' | 'APPEAL_CLOSED';

// =============================================================================
// Denial Analytics Models - Trend Analysis
// =============================================================================

/**
 * Denial Analytics - Pre-calculated metrics for dashboard and reporting
 * Supports multiple time periods and dimensional breakdowns
 */
export interface DenialAnalytics {
  id: number;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  payerId?: number;
  denialCategoryId?: number;
  carcCode?: string;
  totalDenials: number;
  fullDenials: number;
  partialDenials: number;
  preventableDenials: number;
  totalDeniedAmount: number;
  totalAppealedAmount: number;
  totalRecoveredAmount: number;
  totalWrittenOffAmount: number;
  totalAppeals: number;
  appealsWon: number;
  appealsLost: number;
  appealsPending: number;
  denialRate?: number;
  appealRate?: number;
  appealSuccessRate?: number;
  preventableRate?: number;
  recoveryRate?: number;
  avgAppealCycleTime?: number;
  avgTimeToAppeal?: number;
  avgDecisionTime?: number;
  trendDirection?: TrendDirection;
  trendPercentage?: number;
  calculationDate: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type PeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';

// =============================================================================
// CARC/RARC Code Models - Standard Healthcare Codes
// =============================================================================

/**
 * CARC Code - Claim Adjustment Reason Code
 * Standard codes explaining claim adjustments/denials per HIPAA 835
 */
export interface CARCCode {
  id: number;
  code: string;
  description: string;
  shortDescription?: string;
  category: CARCCategory;
  groupCode: GroupCode;
  isDenial: boolean;
  isAppealable: boolean;
  severity: Severity;
  recommendedAction?: string;
  appealTemplate?: string;
  documentationRequired?: string[];
  commonPayerTypes?: string[];
  averageAppealSuccessRate?: number;
  isActive: boolean;
  effectiveDate?: Date;
  terminationDate?: Date;
  source: string;
  sourceUrl?: string;
  lastUpdatedFromSource?: Date;
  internalNotes?: string;
  examples?: Record<string, unknown>[];
  createdAt: Date;
  updatedAt: Date;
}

export type CARCCategory = 'CONTRACTUAL' | 'PATIENT_RESPONSIBILITY' | 'OTHER_ADJUSTMENT' | 'PAYER_INITIATED';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * RARC Code - Remittance Advice Remark Code
 * Additional information codes providing context for adjustments
 */
export interface RARCCode {
  id: number;
  code: string;
  description: string;
  shortDescription?: string;
  codeType?: RARCCodeType;
  relatedCarcCodes?: string[];
  recommendedAction?: string;
  requiresProviderAction: boolean;
  isActive: boolean;
  effectiveDate?: Date;
  terminationDate?: Date;
  source: string;
  sourceUrl?: string;
  lastUpdatedFromSource?: Date;
  internalNotes?: string;
  examples?: Record<string, unknown>[];
  createdAt: Date;
  updatedAt: Date;
}

export type RARCCodeType = 'ALERT' | 'INFORMATIONAL' | 'ACTION_REQUIRED';

/**
 * Denial Category - Custom categorization for denial analytics
 * Supports hierarchical categorization and CARC code grouping
 */
export interface DenialCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  description?: string;
  parentCategoryId?: number;
  level: number;
  carcCodes?: string[];
  isPreventable: boolean;
  typicalResolutionTimeDays?: number;
  colorCode?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payer Code Mapping - Map payer-specific codes to standard CARC/RARC
 * Supports automated code translation during ERA processing
 */
export interface PayerCodeMapping {
  id: number;
  payerName: string;
  payerIdentifier?: string;
  payerCode: string;
  payerCodeDescription?: string;
  standardCarcCode?: string;
  standardRarcCode?: string;
  mappingConfidence: MappingConfidence;
  mappingNotes?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MappingConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'MANUAL_REVIEW';

// =============================================================================
// Denial API Request/Response Types
// =============================================================================

export interface DenialFilters {
  priorityLevel?: PriorityLevel;
  assignedTo?: string;
  status?: DenialStatus;
  startDate?: string;
  endDate?: string;
  payerId?: number;
  limit?: number;
}

export interface DenialStats {
  totalDenials: number;
  totalDeniedAmount: number;
  fullDenials: number;
  partialDenials: number;
  preventableDenials: number;
  appealableDenials: number;
  criticalPriority: number;
  highPriority: number;
}

export interface TopDenialReason {
  carcCode: string;
  count: number;
  totalAmount: number;
  description?: string;
  isAppealable?: boolean;
  recommendedAction?: string;
}

export interface AppealFilters {
  assignedTo?: string;
  status?: AppealStatus;
  daysUntilDeadline?: number;
  appealLevel?: AppealLevel;
  limit?: number;
}

export interface AppealStats {
  totalAppeals: number;
  appealsPending: number;
  appealsWon: number;
  appealsLost: number;
  totalAppealedAmount: number;
  totalRecoveredAmount: number;
  successRate: number;
  avgCycleTime: number;
}

export interface DenialTrend {
  periodStart: Date;
  periodEnd: Date;
  totalDenials: number;
  totalDeniedAmount: number;
  denialRate: number;
  appealSuccessRate: number;
  recoveryRate: number;
  trendDirection: TrendDirection;
}

export interface TopDenyingPayer {
  payerId: number;
  totalDenials: number;
  totalDeniedAmount: number;
  avgDenialRate: number;
  avgAppealSuccessRate: number;
}

// =============================================================================
// FLACC Scale - Behavioral Pain Assessment
// =============================================================================

/**
 * FLACC (Face, Legs, Activity, Cry, Consolability) Scale
 * Pain assessment tool for pediatric and non-verbal patients
 */
export interface FlaccScale {
  id: number;
  patientId: number;
  encounterId?: number;
  noteId?: number;

  // Assessment metadata
  assessmentDate: Date;
  assessmentType?: FlaccAssessmentType;
  assessmentContext?: FlaccAssessmentContext;
  assessedById?: number;

  // Patient population context
  patientPopulation?: FlaccPatientPopulation;
  patientAgeMonths?: number;

  // FLACC behavioral scoring (0-2 each)
  faceScore: FlaccComponentScore;
  faceObservation?: string;
  faceNotes?: string;

  legsScore: FlaccComponentScore;
  legsObservation?: string;
  legsNotes?: string;

  activityScore: FlaccComponentScore;
  activityObservation?: string;
  activityNotes?: string;

  cryScore: FlaccComponentScore;
  cryObservation?: string;
  cryNotes?: string;

  consolabilityScore: FlaccComponentScore;
  consolabilityObservation?: string;
  consolabilityNotes?: string;

  // Total score and interpretation
  totalScore: number; // 0-10
  painSeverity?: FlaccPainSeverity;
  painPresent: boolean;

  // Clinical context
  painStatus?: FlaccPainStatus;
  painLocation?: string;
  painLocationNotes?: string;
  suspectedCause?: string;
  suspectedCauseNotes?: string;

  // Intervention tracking
  interventionProvided: boolean;
  interventionType?: FlaccInterventionType;
  medicationAdministered?: string;
  medicationDose?: string;
  medicationRoute?: MedicationRoute;
  medicationTime?: Date;
  nonPharmInterventions?: FlaccNonPharmIntervention[];
  reassessmentTime?: Date;
  reassessmentScore?: number;
  interventionEffectiveness?: FlaccInterventionEffectiveness;

  // Hospice care specific
  comfortGoalMet?: boolean;
  comfortGoalNotes?: string;
  caregiverPresent?: boolean;
  caregiverObservations?: string;
  caregiverEducationProvided?: boolean;
  carePlanUpdateNeeded?: boolean;
  carePlanRecommendations?: string;

  // Clinical notes
  clinicalNotes?: string;
  assessmentSummary?: string;
  followUpPlan?: string;

  // Signature and compliance
  signatureId?: number;
  signedAt?: Date;
  signedById?: number;

  // Amendment tracking
  amended: boolean;
  amendmentReason?: string;
  amendedAt?: Date;
  amendedById?: number;

  // Audit fields
  createdById?: number;
  updatedById?: number;
  createdAt: Date;
  updatedAt: Date;
}

// FLACC component score: 0, 1, or 2
export type FlaccComponentScore = 0 | 1 | 2;

export type FlaccAssessmentType = 'INITIAL' | 'FOLLOW_UP' | 'REASSESSMENT' | 'PRE_INTERVENTION' | 'POST_INTERVENTION';

export type FlaccAssessmentContext = 'ROUTINE' | 'PRN' | 'PRE_MEDICATION' | 'POST_MEDICATION' | 'PROCEDURE';

export type FlaccPatientPopulation = 'PEDIATRIC' | 'NON_VERBAL_ADULT' | 'COGNITIVELY_IMPAIRED' | 'SEDATED' | 'INTUBATED';

export type FlaccPainSeverity = 'NO_PAIN' | 'MILD' | 'MODERATE' | 'SEVERE';

export type FlaccPainStatus = 'ACUTE' | 'CHRONIC' | 'BREAKTHROUGH' | 'POST_PROCEDURAL';

export type FlaccInterventionType = 'PHARMACOLOGICAL' | 'NON_PHARMACOLOGICAL' | 'COMBINATION';

export type FlaccInterventionEffectiveness = 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'NOT_EFFECTIVE';

// FLACC scoring reference
export const FLACC_SCORE_DESCRIPTIONS = {
  face: {
    0: 'No particular expression or smile',
    1: 'Occasional grimace or frown, withdrawn, disinterested',
    2: 'Frequent to constant quivering chin, clenched jaw'
  },
  legs: {
    0: 'Normal position or relaxed',
    1: 'Uneasy, restless, tense',
    2: 'Kicking, or legs drawn up'
  },
  activity: {
    0: 'Lying quietly, normal position, moves easily',
    1: 'Squirming, shifting back and forth, tense',
    2: 'Arched, rigid or jerking'
  },
  cry: {
    0: 'No cry (awake or asleep)',
    1: 'Moans or whimpers, occasional complaint',
    2: 'Crying steadily, screams or sobs, frequent complaints'
  },
  consolability: {
    0: 'Content, relaxed',
    1: 'Reassured by occasional touching, hugging or being talked to, distractible',
    2: 'Difficult to console or comfort'
  }
} as const;

export const FLACC_SEVERITY_RANGES = {
  NO_PAIN: { min: 0, max: 0, label: 'No pain / relaxed' },
  MILD: { min: 1, max: 3, label: 'Mild discomfort' },
  MODERATE: { min: 4, max: 6, label: 'Moderate pain' },
  SEVERE: { min: 7, max: 10, label: 'Severe pain' }
} as const;

// Non-pharmacological intervention options for FLACC
export type FlaccNonPharmIntervention =
  | 'REPOSITIONING'
  | 'COMFORT_HOLD'
  | 'SWADDLING'
  | 'DISTRACTION'
  | 'PACIFIER'
  | 'MUSIC'
  | 'MASSAGE'
  | 'HEAT'
  | 'COLD'
  | 'SKIN_TO_SKIN'
  | 'ROCKING'
  | 'WHITE_NOISE'
  | 'FEEDING'
  | 'OTHER';

// =============================================================================
// Patient Identifiers - Multiple Identifier Types per Patient
// Manages MRN, SSN, Medicare ID, Medicaid ID with facility tracking
// =============================================================================

/**
 * Patient Identifier - Stores various patient identification numbers
 * Supports multiple identifiers per patient with type and facility tracking
 *
 * COMPLIANCE: Required for HIPAA, Medicare/Medicaid billing, and cross-facility patient matching
 */
export interface PatientIdentifier {
  id: number;
  patientId: number;

  // Identifier classification
  identifierType: PatientIdentifierType;
  identifierValue: string;

  // Facility/Issuer tracking
  facilityId?: number;
  facilityName?: string;
  issuingAuthority?: string;
  issuingState?: string; // Two-letter state code

  // Status flags
  isPrimary: boolean;
  isActive: boolean;
  isVerified: boolean;

  // Effective dates
  effectiveFrom?: Date;
  effectiveTo?: Date;

  // Verification tracking
  verifiedAt?: Date;
  verifiedById?: string;
  verificationMethod?: string;
  verificationNotes?: string;

  // Notes
  notes?: string;

  // Audit fields
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Patient Identifier Type - Classification of identifier
 * - MRN: Medical Record Number (internal, facility-specific)
 * - SSN: Social Security Number (sensitive PII)
 * - MEDICARE: Medicare Beneficiary Identifier (MBI)
 * - MEDICAID: Medicaid ID for dual-eligible patients
 * - INSURANCE: Commercial insurance member ID
 * - NPI: National Provider Identifier (if patient is also a provider)
 * - OTHER: Custom identifier types
 */
export type PatientIdentifierType =
  | 'MRN'
  | 'SSN'
  | 'MEDICARE'
  | 'MEDICAID'
  | 'INSURANCE'
  | 'NPI'
  | 'OTHER';

/**
 * Create Patient Identifier Request
 */
export interface CreatePatientIdentifierRequest {
  identifierType: PatientIdentifierType;
  identifierValue: string;
  facilityId?: number;
  facilityName?: string;
  issuingAuthority?: string;
  issuingState?: string;
  isPrimary?: boolean;
  isActive?: boolean;
  isVerified?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
}

/**
 * Update Patient Identifier Request
 */
export interface UpdatePatientIdentifierRequest {
  identifierType?: PatientIdentifierType;
  identifierValue?: string;
  facilityId?: number;
  facilityName?: string;
  issuingAuthority?: string;
  issuingState?: string;
  isPrimary?: boolean;
  isActive?: boolean;
  isVerified?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
}

/**
 * Verify Patient Identifier Request
 */
export interface VerifyPatientIdentifierRequest {
  verificationMethod?: string;
  verificationNotes?: string;
}

/**
 * Patient Identifiers Response - Response for listing identifiers
 */
export interface PatientIdentifiersResponse {
  status: number;
  data: PatientIdentifier[];
  count: number;
}

/**
 * Patient Identifier Response - Response for single identifier
 */
export interface PatientIdentifierResponse {
  status: number;
  data: PatientIdentifier;
  message?: string;
}

// =============================================================================
// PAINAD Scale - Pain Assessment in Advanced Dementia
// =============================================================================

/**
 * PAINAD (Pain Assessment in Advanced Dementia) Scale
 * Behavioral pain assessment tool for dementia patients who cannot self-report pain
 *
 * Reference: Warden V, Hurley AC, Volicer L. (2003)
 */
export interface PainadScale {
  id: number;
  patientId: number;
  encounterId?: number;
  noteId?: number;

  // Assessment metadata
  assessmentDate: Date;
  assessmentType?: PainadAssessmentType;
  assessmentContext?: PainadAssessmentContext;
  assessedById?: number;

  // Patient context for dementia assessment
  dementiaStage?: PainadDementiaStage;
  dementiaType?: PainadDementiaType;
  baselineCognitiveStatus?: string;
  verbalAbility?: PainadVerbalAbility;

  // PAINAD behavioral scoring (0-2 each)
  breathingScore: PainadComponentScore;
  breathingObservation?: string;
  breathingNotes?: string;

  negativeVocalizationScore: PainadComponentScore;
  negativeVocalizationObservation?: string;
  negativeVocalizationNotes?: string;

  facialExpressionScore: PainadComponentScore;
  facialExpressionObservation?: string;
  facialExpressionNotes?: string;

  bodyLanguageScore: PainadComponentScore;
  bodyLanguageObservation?: string;
  bodyLanguageNotes?: string;

  consolabilityScore: PainadComponentScore;
  consolabilityObservation?: string;
  consolabilityNotes?: string;

  // Total score and interpretation
  totalScore: number; // 0-10
  painSeverity?: PainadPainSeverity;
  painPresent: boolean;

  // Clinical context
  painStatus?: PainadPainStatus;
  suspectedPainLocation?: string;
  suspectedPainLocationNotes?: string;
  suspectedCause?: PainadSuspectedCause;
  suspectedCauseNotes?: string;
  triggeringActivity?: PainadTriggeringActivity;
  triggeringActivityNotes?: string;

  // Intervention tracking
  interventionProvided: boolean;
  interventionType?: PainadInterventionType;
  medicationAdministered?: string;
  medicationDose?: string;
  medicationRoute?: MedicationRoute;
  medicationTime?: Date;
  nonPharmInterventions?: PainadNonPharmIntervention[];
  reassessmentTime?: Date;
  reassessmentScore?: number;
  interventionEffectiveness?: PainadInterventionEffectiveness;

  // Hospice/dementia care specific
  comfortGoalMet?: boolean;
  comfortGoalNotes?: string;
  behaviorChangeFromBaseline?: PainadBehaviorChange;
  baselineBehaviorNotes?: string;
  caregiverPresent?: boolean;
  caregiverObservations?: string;
  caregiverEducationProvided?: boolean;
  caregiverAbleToAssess?: boolean;
  carePlanUpdateNeeded?: boolean;
  carePlanRecommendations?: string;
  familyCommunicationNotes?: string;

  // Clinical notes
  clinicalNotes?: string;
  assessmentSummary?: string;
  followUpPlan?: string;

  // Signature and compliance
  signatureId?: number;
  signedAt?: Date;
  signedById?: number;

  // Amendment tracking
  amended: boolean;
  amendmentReason?: string;
  amendedAt?: Date;
  amendedById?: number;

  // Audit fields
  createdById?: number;
  updatedById?: number;
  createdAt: Date;
  updatedAt: Date;
}

// PAINAD component score: 0, 1, or 2
export type PainadComponentScore = 0 | 1 | 2;

export type PainadAssessmentType = 'INITIAL' | 'FOLLOW_UP' | 'REASSESSMENT' | 'PRE_INTERVENTION' | 'POST_INTERVENTION';

export type PainadAssessmentContext = 'ROUTINE' | 'PRN' | 'PRE_MEDICATION' | 'POST_MEDICATION' | 'DURING_CARE';

export type PainadDementiaStage = 'MILD' | 'MODERATE' | 'SEVERE' | 'END_STAGE';

export type PainadDementiaType = 'ALZHEIMERS' | 'VASCULAR' | 'LEWY_BODY' | 'FRONTOTEMPORAL' | 'MIXED' | 'OTHER';

export type PainadVerbalAbility = 'VERBAL' | 'LIMITED_VERBAL' | 'NON_VERBAL';

export type PainadPainSeverity = 'NO_PAIN' | 'MILD' | 'MODERATE' | 'SEVERE';

export type PainadPainStatus = 'ACUTE' | 'CHRONIC' | 'BREAKTHROUGH' | 'END_OF_LIFE';

export type PainadSuspectedCause =
  | 'ARTHRITIS'
  | 'POSITIONING'
  | 'CONSTIPATION'
  | 'UTI'
  | 'ORAL_PAIN'
  | 'SKIN_BREAKDOWN'
  | 'CONTRACTURES'
  | 'FRACTURE'
  | 'NEUROPATHY'
  | 'UNKNOWN';

export type PainadTriggeringActivity =
  | 'AT_REST'
  | 'DURING_TURNING'
  | 'DURING_TRANSFERS'
  | 'DURING_ADL'
  | 'DURING_DRESSING';

export type PainadInterventionType = 'PHARMACOLOGICAL' | 'NON_PHARMACOLOGICAL' | 'COMBINATION';

export type PainadInterventionEffectiveness = 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'NOT_EFFECTIVE';

export type PainadBehaviorChange = 'NO_CHANGE' | 'MILD_CHANGE' | 'SIGNIFICANT_CHANGE';

export type PainadNonPharmIntervention =
  | 'REPOSITIONING'
  | 'MASSAGE'
  | 'HEAT'
  | 'COLD'
  | 'MUSIC_THERAPY'
  | 'AROMATHERAPY'
  | 'PRESENCE'
  | 'DISTRACTION'
  | 'GENTLE_TOUCH'
  | 'VERBAL_REASSURANCE'
  | 'ENVIRONMENTAL_MODIFICATION'
  | 'RANGE_OF_MOTION'
  | 'SPLINTING'
  | 'OTHER';

// PAINAD scoring reference
export const PAINAD_SCORE_DESCRIPTIONS = {
  breathing: {
    0: 'Normal',
    1: 'Occasional labored breathing, short period of hyperventilation',
    2: 'Noisy labored breathing, long period of hyperventilation, Cheyne-Stokes respirations'
  },
  negative_vocalization: {
    0: 'None',
    1: 'Occasional moan or groan, low-level speech with a negative or disapproving quality',
    2: 'Repeated troubled calling out, loud moaning or groaning, crying'
  },
  facial_expression: {
    0: 'Smiling or inexpressive',
    1: 'Sad, frightened, frown',
    2: 'Facial grimacing'
  },
  body_language: {
    0: 'Relaxed',
    1: 'Tense, distressed pacing, fidgeting',
    2: 'Rigid, fists clenched, knees pulled up, pulling or pushing away, striking out'
  },
  consolability: {
    0: 'No need to console',
    1: 'Distracted or reassured by voice or touch',
    2: 'Unable to console, distract, or reassure'
  }
} as const;

export const PAINAD_SEVERITY_RANGES = {
  NO_PAIN: { min: 0, max: 0, label: 'No pain' },
  MILD: { min: 1, max: 3, label: 'Mild pain' },
  MODERATE: { min: 4, max: 6, label: 'Moderate pain' },
  SEVERE: { min: 7, max: 10, label: 'Severe pain' }
} as const;

// =============================================================================
// Patient Payers - Insurance Payer Information
// Manages policy numbers, group numbers, and payer details for billing
// =============================================================================

/**
 * Patient Payer - Insurance payer information per patient
 * Stores comprehensive insurance details including policy/group numbers and payer information
 *
 * COMPLIANCE: Required for HIPAA, Medicare/Medicaid billing, and claim submission
 */
export interface PatientPayer {
  id: number;
  patientId: number;

  // Payer classification
  payerType: PatientPayerType;
  payerOrder: number; // 1=Primary, 2=Secondary, 3=Tertiary

  // Payer identification
  payerName: string;
  payerId?: string; // Payer ID for EDI submissions
  payerPhone?: string;
  payerFax?: string;
  payerEmail?: string;
  payerWebsite?: string;

  // Payer address
  payerAddressLine1?: string;
  payerAddressLine2?: string;
  payerCity?: string;
  payerState?: string; // Two-letter state code
  payerZip?: string;
  payerCountry?: string;

  // Policy information
  policyNumber?: string; // Member/subscriber ID
  groupNumber?: string; // Group/employer ID
  groupName?: string; // Employer/group name
  planName?: string; // Specific plan name
  planType?: string; // HMO, PPO, EPO, POS, etc.

  // Subscriber information (policy holder)
  subscriberId?: string;
  subscriberName?: string;
  subscriberDob?: Date;
  subscriberRelationship?: SubscriberRelationship;
  subscriberSsn?: string; // Last 4 or encrypted

  // Medicare-specific fields
  medicareBeneficiaryId?: string; // MBI (11-character)
  medicarePartAEffective?: Date;
  medicarePartBEffective?: Date;
  medicareHospiceElectionDate?: Date;
  medicareAdvantagePlan?: boolean;
  medicareAdvantagePlanName?: string;

  // Medicaid-specific fields
  medicaidId?: string;
  medicaidState?: string; // Two-letter state code
  medicaidPlanName?: string;
  isDualEligible?: boolean; // Medicare + Medicaid

  // Coverage dates
  effectiveDate?: Date;
  terminationDate?: Date;

  // Authorization/Pre-certification
  authorizationNumber?: string;
  authorizationStartDate?: Date;
  authorizationEndDate?: Date;
  authorizationUnits?: number;
  authorizationNotes?: string;

  // Coordination of benefits
  cobOrder?: number;
  acceptsAssignment?: boolean;
  assignmentOfBenefits?: boolean;

  // Eligibility verification
  isVerified?: boolean;
  verifiedAt?: Date;
  verifiedById?: string;
  verificationMethod?: string;
  verificationResponse?: string;
  lastEligibilityCheck?: Date;
  eligibilityStatus?: EligibilityStatus;

  // Status flags
  isActive: boolean;
  isPrimary: boolean;

  // Notes
  notes?: string;
  internalNotes?: string;

  // Audit fields
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Patient Payer Type - Classification of insurance payer
 */
export type PatientPayerType =
  | 'MEDICARE'
  | 'MEDICAID'
  | 'COMMERCIAL'
  | 'MANAGED_CARE'
  | 'TRICARE'
  | 'CHAMPVA'
  | 'WORKERS_COMP'
  | 'AUTO'
  | 'SELF_PAY'
  | 'OTHER';

/**
 * Subscriber Relationship - Relationship of patient to policy holder
 */
export type SubscriberRelationship = 'SELF' | 'SPOUSE' | 'CHILD' | 'OTHER';

/**
 * Eligibility Status - Current insurance eligibility status
 */
export type EligibilityStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'UNKNOWN';

/**
 * Create Patient Payer Request
 */
export interface CreatePatientPayerRequest {
  payerType: PatientPayerType;
  payerOrder?: number;
  payerName: string;
  payerId?: string;
  payerPhone?: string;
  payerFax?: string;
  payerEmail?: string;
  payerWebsite?: string;
  payerAddressLine1?: string;
  payerAddressLine2?: string;
  payerCity?: string;
  payerState?: string;
  payerZip?: string;
  payerCountry?: string;
  policyNumber?: string;
  groupNumber?: string;
  groupName?: string;
  planName?: string;
  planType?: string;
  subscriberId?: string;
  subscriberName?: string;
  subscriberDob?: string;
  subscriberRelationship?: SubscriberRelationship;
  medicareBeneficiaryId?: string;
  medicarePartAEffective?: string;
  medicarePartBEffective?: string;
  medicareHospiceElectionDate?: string;
  medicareAdvantagePlan?: boolean;
  medicareAdvantagePlanName?: string;
  medicaidId?: string;
  medicaidState?: string;
  medicaidPlanName?: string;
  isDualEligible?: boolean;
  effectiveDate?: string;
  terminationDate?: string;
  authorizationNumber?: string;
  authorizationStartDate?: string;
  authorizationEndDate?: string;
  authorizationUnits?: number;
  authorizationNotes?: string;
  cobOrder?: number;
  acceptsAssignment?: boolean;
  assignmentOfBenefits?: boolean;
  isVerified?: boolean;
  eligibilityStatus?: EligibilityStatus;
  isActive?: boolean;
  isPrimary?: boolean;
  notes?: string;
  internalNotes?: string;
}

/**
 * Update Patient Payer Request
 */
export interface UpdatePatientPayerRequest extends Partial<CreatePatientPayerRequest> {}

/**
 * Verify Patient Payer Request
 */
export interface VerifyPatientPayerRequest {
  verificationMethod?: string;
  verificationResponse?: string;
  eligibilityStatus?: EligibilityStatus;
}

/**
 * Reorder Patient Payers Request
 */
export interface ReorderPatientPayersRequest {
  payerOrders: Array<{
    id: number;
    order: number;
  }>;
}

/**
 * Patient Payers Response - Response for listing payers
 */
export interface PatientPayersResponse {
  status: number;
  data: PatientPayer[];
  count: number;
}

/**
 * Patient Payer Response - Response for single payer
 */
export interface PatientPayerResponse {
  status: number;
  data: PatientPayer;
  message?: string;
}

// =============================================================================
// Patient Pharmacy - Preferred Pharmacy Information
// Manages pharmacy details including NPI, DEA, address, and contact info
// =============================================================================

/**
 * Patient Pharmacy - Preferred pharmacy information
 * Stores comprehensive pharmacy details including NPI for e-prescribing
 *
 * COMPLIANCE: Required for HIPAA, Medicare Part D, and e-prescribing
 */
export interface PatientPharmacy {
  id: number;

  // Core pharmacy information
  name?: string;

  // Address fields
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string; // Two-letter state code
  zipCode?: string;
  country?: string;

  // Contact information
  phone?: string;
  fax?: string;
  email?: string;

  // National Provider Identifier (10-digit number)
  // Required for Medicare claims and e-prescribing
  npi?: string;

  // DEA number for controlled substance dispensing (9 characters)
  deaNumber?: string;

  // Pharmacy type classification
  pharmacyType?: PatientPharmacyType;

  // Operating hours (JSON string or structured data)
  operatingHours?: string;

  // Status flags
  isActive: boolean;
  is24Hour: boolean;
  acceptsMedicare: boolean;
  acceptsMedicaid: boolean;
  deliversMedications: boolean;

  // Notes
  notes?: string;

  // Audit timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Patient Pharmacy Type - Classification of pharmacy
 */
export type PatientPharmacyType =
  | 'RETAIL'
  | 'MAIL_ORDER'
  | 'SPECIALTY'
  | 'COMPOUNDING'
  | 'HOSPITAL'
  | 'CLINIC'
  | 'LONG_TERM_CARE'
  | 'NUCLEAR'
  | 'HOME_INFUSION'
  | 'OTHER';

/**
 * Create Patient Pharmacy Request
 */
export interface CreatePatientPharmacyRequest {
  name: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  fax?: string;
  email?: string;
  npi?: string;
  deaNumber?: string;
  pharmacyType?: PatientPharmacyType;
  operatingHours?: string;
  isActive?: boolean;
  is24Hour?: boolean;
  acceptsMedicare?: boolean;
  acceptsMedicaid?: boolean;
  deliversMedications?: boolean;
  notes?: string;
}

/**
 * Update Patient Pharmacy Request
 */
export interface UpdatePatientPharmacyRequest extends Partial<CreatePatientPharmacyRequest> {}

/**
 * Patient Pharmacies Response - Response for listing pharmacies
 */
export interface PatientPharmaciesResponse {
  status: number;
  data: PatientPharmacy[];
  count: number;
}

/**
 * Patient Pharmacy Response - Response for single pharmacy
 */
export interface PatientPharmacyResponse {
  status: number;
  data: PatientPharmacy;
  message?: string;
}

// =============================================================================
// Staff Management Models
// Module H - Employee tracking, credential expiration alerts, caseload management
// =============================================================================

/**
 * Staff Profile - Core employee information and demographics
 * Links to authentication user and tracks employment details, contact info, specialties
 */
export interface StaffProfile {
  id: number;
  userId?: string;

  // Personal information
  employeeId?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;

  // Employment details
  jobTitle?: string;
  department?: StaffDepartment;
  employmentType?: StaffEmploymentType;
  hireDate?: Date;
  terminationDate?: Date;
  employmentStatus: StaffEmploymentStatus;

  // Contact information
  email?: string;
  phone?: string;
  mobile?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;

  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string; // Two-letter state code
  zipCode?: string;

  // Professional details
  specialty?: string;
  yearsOfExperience?: number;
  isSupervisory?: boolean;

  // Availability
  serviceTerritory?: Record<string, unknown>;
  maxPatientLoad?: number;

  // Additional data
  notes?: string;
  metadata?: Record<string, unknown>;

  // Audit fields
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type StaffDepartment =
  | 'NURSING'
  | 'SOCIAL_WORK'
  | 'CHAPLAINCY'
  | 'ADMIN'
  | 'BILLING'
  | 'SCHEDULING'
  | 'MEDICAL'
  | 'PHARMACY'
  | 'OTHER';

export type StaffEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'PRN' | 'CONTRACT';

export type StaffEmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE';

/**
 * Staff Credential - Licenses, certifications, background checks
 * Tracks expiration dates for compliance monitoring
 */
export interface StaffCredential {
  id: number;
  staffId: number;

  // Credential information
  credentialType: StaffCredentialType;
  credentialName: string;
  credentialNumber?: string;

  // Issuing authority
  issuingAuthority?: string;
  issuingState?: string; // Two-letter state code

  // Dates
  issueDate?: Date;
  expirationDate: Date;
  verificationDate?: Date;

  // Status
  credentialStatus: StaffCredentialStatus;

  // Alerts
  alertDaysBeforeExpiration?: number;
  renewalReminderSent?: boolean;

  // Document storage
  documentUrl?: string;

  notes?: string;

  // Audit fields
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type StaffCredentialType =
  | 'RN_LICENSE'
  | 'LPN_LICENSE'
  | 'CNA_CERTIFICATION'
  | 'CPR'
  | 'BACKGROUND_CHECK'
  | 'TB_TEST'
  | 'NP_LICENSE'
  | 'MD_LICENSE'
  | 'SW_LICENSE'
  | 'CHAPLAIN_CERTIFICATION'
  | 'OTHER';

export type StaffCredentialStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING_RENEWAL';

/**
 * Staff Caseload - Patient assignments and territory management
 */
export interface StaffCaseload {
  id: number;
  staffId: number;
  patientId: number;

  // Assignment details
  assignmentRole: StaffAssignmentRole;
  isPrimary?: boolean;

  // Assignment period
  assignmentStartDate: Date;
  assignmentEndDate?: Date;
  assignmentStatus: StaffAssignmentStatus;

  // Visit frequency
  scheduledVisitsPerWeek?: number;
  actualVisitsThisWeek?: number;

  // Transfer information
  transferReason?: string;
  transferredToStaffId?: number;
  transferDate?: Date;

  notes?: string;

  // Audit fields
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type StaffAssignmentRole =
  | 'PRIMARY_NURSE'
  | 'SECONDARY_NURSE'
  | 'SOCIAL_WORKER'
  | 'CHAPLAIN'
  | 'AIDE'
  | 'PHYSICIAN'
  | 'NP';

export type StaffAssignmentStatus = 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED';

/**
 * Staff Schedule - Work schedules, shifts, on-call rotations, time-off
 */
export interface StaffSchedule {
  id: number;
  staffId: number;

  // Schedule type
  scheduleType: StaffScheduleType;

  // Shift details
  shiftDate: Date;
  startTime?: Date;
  endTime?: Date;

  // On-call details
  isOnCall?: boolean;
  onCallType?: StaffOnCallType;

  // Time-off details
  timeOffType?: StaffTimeOffType;
  timeOffStatus?: StaffTimeOffStatus;
  approvedById?: string;
  approvalDate?: Date;

  // Location
  workLocation?: string;

  notes?: string;

  // Audit fields
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type StaffScheduleType = 'SHIFT' | 'ON_CALL' | 'TIME_OFF' | 'TRAINING' | 'MEETING';

export type StaffOnCallType = 'PRIMARY' | 'BACKUP' | 'WEEKEND';

export type StaffTimeOffType = 'PTO' | 'SICK' | 'UNPAID' | 'BEREAVEMENT' | 'FMLA';

export type StaffTimeOffStatus = 'REQUESTED' | 'APPROVED' | 'DENIED' | 'CANCELLED';

/**
 * Staff Productivity - Performance metrics and visit tracking
 */
export interface StaffProductivity {
  id: number;
  staffId: number;

  // Reporting period
  reportingPeriodStart: Date;
  reportingPeriodEnd: Date;
  periodType?: StaffProductivityPeriodType;

  // Visit metrics
  totalVisitsScheduled?: number;
  totalVisitsCompleted?: number;
  totalVisitsMissed?: number;
  totalVisitTimeMinutes?: number;
  averageVisitDurationMinutes?: number;

  // Patient metrics
  totalPatientsAssigned?: number;
  newAdmissions?: number;
  discharges?: number;

  // Documentation metrics
  notesCompletedOnTime?: number;
  notesCompletedLate?: number;
  averageDocumentationTimeHours?: number;

  // Performance scores
  patientSatisfactionScore?: number;
  qualityScore?: number;

  // Compliance
  complianceIncidents?: number;
  safetyIncidents?: number;

  // Additional metrics
  metricsData?: Record<string, unknown>;

  notes?: string;

  // Audit fields
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type StaffProductivityPeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

/**
 * Staff Training - Continuing education and compliance training
 */
export interface StaffTraining {
  id: number;
  staffId: number;

  // Training information
  trainingName: string;
  trainingType: StaffTrainingType;
  trainingCategory?: StaffTrainingCategory;

  // Provider information
  trainingProvider?: string;
  instructorName?: string;

  // Dates
  trainingDate: Date;
  completionDate?: Date;
  expirationDate?: Date;

  // Status
  trainingStatus: StaffTrainingStatus;

  // Credits and scores
  hoursCompleted?: number;
  ceuCredits?: number;
  score?: number;
  passingScore?: number;
  passed?: boolean;

  // Certificate
  certificateNumber?: string;
  certificateUrl?: string;

  // Compliance tracking
  isRequired?: boolean;
  dueDate?: Date;

  notes?: string;

  // Audit fields
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type StaffTrainingType =
  | 'ORIENTATION'
  | 'ANNUAL_COMPLIANCE'
  | 'CONTINUING_EDUCATION'
  | 'SKILLS_COMPETENCY'
  | 'SAFETY';

export type StaffTrainingCategory =
  | 'HIPAA'
  | 'INFECTION_CONTROL'
  | 'OSHA'
  | 'CLINICAL_SKILLS'
  | 'DOCUMENTATION'
  | 'PATIENT_SAFETY'
  | 'OTHER';

export type StaffTrainingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

// =============================================================================
// Staff API Request/Response Types
// =============================================================================

/**
 * Staff Profile List Filters
 */
export interface StaffFilters {
  status?: StaffEmploymentStatus;
  department?: StaffDepartment;
  jobTitle?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create Staff Profile Request
 */
export interface CreateStaffProfileRequest {
  userId?: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  jobTitle?: string;
  department?: StaffDepartment;
  employmentType?: StaffEmploymentType;
  hireDate?: string;
  employmentStatus?: StaffEmploymentStatus;
  email?: string;
  phone?: string;
  mobile?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  specialty?: string;
  yearsOfExperience?: number;
  isSupervisory?: boolean;
  serviceTerritory?: Record<string, unknown>;
  maxPatientLoad?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Update Staff Profile Request
 */
export interface UpdateStaffProfileRequest extends Partial<CreateStaffProfileRequest> {
  terminationDate?: string;
}

/**
 * Create Staff Credential Request
 */
export interface CreateStaffCredentialRequest {
  credentialType: StaffCredentialType;
  credentialName: string;
  credentialNumber?: string;
  issuingAuthority?: string;
  issuingState?: string;
  issueDate?: string;
  expirationDate: string;
  verificationDate?: string;
  credentialStatus?: StaffCredentialStatus;
  alertDaysBeforeExpiration?: number;
  documentUrl?: string;
  notes?: string;
}

/**
 * Assign Patient to Staff Request
 */
export interface AssignPatientToStaffRequest {
  patientId: number;
  assignmentRole: StaffAssignmentRole;
  isPrimary?: boolean;
  assignmentStartDate?: string;
  scheduledVisitsPerWeek?: number;
  notes?: string;
}

/**
 * Create Staff Schedule Request
 */
export interface CreateStaffScheduleRequest {
  scheduleType: StaffScheduleType;
  shiftDate: string;
  startTime?: string;
  endTime?: string;
  isOnCall?: boolean;
  onCallType?: StaffOnCallType;
  timeOffType?: StaffTimeOffType;
  timeOffStatus?: StaffTimeOffStatus;
  workLocation?: string;
  notes?: string;
}

/**
 * Record Staff Productivity Request
 */
export interface RecordStaffProductivityRequest {
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  periodType?: StaffProductivityPeriodType;
  totalVisitsScheduled?: number;
  totalVisitsCompleted?: number;
  totalVisitsMissed?: number;
  totalVisitTimeMinutes?: number;
  totalPatientsAssigned?: number;
  newAdmissions?: number;
  discharges?: number;
  notesCompletedOnTime?: number;
  notesCompletedLate?: number;
  patientSatisfactionScore?: number;
  qualityScore?: number;
  complianceIncidents?: number;
  safetyIncidents?: number;
  metricsData?: Record<string, unknown>;
  notes?: string;
}

/**
 * Add Staff Training Request
 */
export interface AddStaffTrainingRequest {
  trainingName: string;
  trainingType: StaffTrainingType;
  trainingCategory?: StaffTrainingCategory;
  trainingProvider?: string;
  instructorName?: string;
  trainingDate: string;
  completionDate?: string;
  expirationDate?: string;
  trainingStatus?: StaffTrainingStatus;
  hoursCompleted?: number;
  ceuCredits?: number;
  score?: number;
  passingScore?: number;
  passed?: boolean;
  certificateNumber?: string;
  certificateUrl?: string;
  isRequired?: boolean;
  dueDate?: string;
  notes?: string;
}

/**
 * Staff Profile Response
 */
export interface StaffProfileResponse {
  status: number;
  data: StaffProfile;
  message?: string;
}

/**
 * Staff Profiles Response - List of staff profiles
 */
export interface StaffProfilesResponse {
  status: number;
  data: StaffProfile[];
  count: number;
}

/**
 * Staff Credentials Response
 */
export interface StaffCredentialsResponse {
  status: number;
  data: StaffCredential[];
  count: number;
}

/**
 * Expiring Credentials Response - Credentials expiring within threshold
 */
export interface ExpiringCredentialsResponse {
  status: number;
  data: Array<{
    credential: StaffCredential;
    staff: StaffProfile;
  }>;
  count: number;
  thresholdDays: number;
}

/**
 * Staff Caseload Response
 */
export interface StaffCaseloadResponse {
  status: number;
  data: Array<{
    assignment: StaffCaseload;
    patient: {
      id: number;
      firstName: string;
      lastName: string;
      medicalRecordNumber?: string;
    };
  }>;
  count: number;
}

/**
 * Staff Schedule Response
 */
export interface StaffScheduleResponse {
  status: number;
  data: StaffSchedule[];
  count: number;
}

/**
 * Staff Productivity Response
 */
export interface StaffProductivityResponse {
  status: number;
  data: StaffProductivity[];
  count: number;
}

/**
 * Staff Training Response
 */
export interface StaffTrainingResponse {
  status: number;
  data: StaffTraining[];
  count: number;
}

// =============================================================================
// Numeric Rating Scale (NRS) - Self-Reported Pain Assessment (0-10)
// Gold standard for pain assessment in cognitively intact patients
// =============================================================================

/**
 * Numeric Rating Scale Assessment
 * Self-reported pain assessment using 0-10 numeric scale
 *
 * CLINICAL USE:
 * - Primary tool for adult, cognitively intact patients who can self-report
 * - Ask patient to rate their pain from 0-10
 * - 0 = No pain, 10 = Worst possible pain
 *
 * HOSPICE CONSIDERATIONS:
 * - Focus on comfort goals rather than complete pain elimination
 * - Consider patient's acceptable pain level for goal setting
 * - Balance pain control with alertness preferences
 */
export interface NumericRatingScale {
  id: number;
  patientId: number;
  encounterId?: number;
  noteId?: number;

  // Assessment metadata
  assessmentDate: Date;
  assessmentType?: NrsAssessmentType;
  assessmentContext?: NrsAssessmentContext;
  assessedById?: number;

  // Primary pain score (0-10)
  painScore: number;
  painDescriptor?: NrsPainDescriptor;

  // Additional 24-hour pain context
  worstPain24h?: number;
  bestPain24h?: number;
  averagePain24h?: number;
  acceptablePainLevel?: number;

  // Pain interpretation
  painSeverity?: NrsPainSeverity;
  painPresent: boolean;
  reliefPercentage?: number;

  // Clinical context
  painStatus?: NrsPainStatus;
  painLocation?: string;
  painLocationNotes?: string;
  painRadiates?: boolean;
  radiationLocation?: string;
  suspectedCause?: string;
  suspectedCauseNotes?: string;
  painDuration?: NrsPainDuration;
  painOnset?: string;

  // Intervention tracking
  interventionProvided: boolean;
  interventionType?: NrsInterventionType;
  medicationAdministered?: string;
  medicationDose?: string;
  medicationRoute?: NrsMedicationRoute;
  medicationTime?: Date;
  nonPharmInterventions?: NrsNonPharmIntervention[];
  reassessmentTime?: Date;
  reassessmentScore?: number;
  interventionEffectiveness?: NrsInterventionEffectiveness;

  // Hospice care specific
  comfortGoalMet?: boolean;
  comfortGoalNotes?: string;
  caregiverPresent?: boolean;
  caregiverObservations?: string;
  caregiverEducationProvided?: boolean;
  carePlanUpdateNeeded?: boolean;
  carePlanRecommendations?: string;

  // Clinical notes
  clinicalNotes?: string;
  assessmentSummary?: string;
  followUpPlan?: string;

  // Signature and compliance
  signatureId?: number;
  signedAt?: Date;
  signedById?: number;

  // Amendment tracking
  amended: boolean;
  amendmentReason?: string;
  amendedAt?: Date;
  amendedById?: number;

  // Audit fields
  createdById?: number;
  updatedById?: number;
  createdAt: Date;
  updatedAt: Date;
}

// NRS type definitions
export type NrsAssessmentType = 'INITIAL' | 'FOLLOW_UP' | 'REASSESSMENT' | 'PRE_INTERVENTION' | 'POST_INTERVENTION';

export type NrsAssessmentContext = 'ROUTINE' | 'PRN' | 'PRE_MEDICATION' | 'POST_MEDICATION' | 'PROCEDURE';

export type NrsPainSeverity = 'NO_PAIN' | 'MILD' | 'MODERATE' | 'SEVERE';

export type NrsPainStatus = 'ACUTE' | 'CHRONIC' | 'BREAKTHROUGH' | 'POST_PROCEDURAL';

export type NrsPainDuration = 'CONSTANT' | 'INTERMITTENT' | 'BRIEF';

export type NrsInterventionType = 'PHARMACOLOGICAL' | 'NON_PHARMACOLOGICAL' | 'COMBINATION';

export type NrsInterventionEffectiveness = 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'NOT_EFFECTIVE';

export type NrsMedicationRoute = 'ORAL' | 'IV' | 'IM' | 'SQ' | 'RECTAL' | 'TOPICAL' | 'SL' | 'TRANSDERMAL';

export type NrsPainDescriptor =
  | 'ACHING'
  | 'SHARP'
  | 'BURNING'
  | 'STABBING'
  | 'THROBBING'
  | 'CRAMPING'
  | 'DULL'
  | 'SHOOTING'
  | 'TINGLING'
  | 'PRESSURE'
  | 'OTHER';

export type NrsNonPharmIntervention =
  | 'REPOSITIONING'
  | 'MASSAGE'
  | 'HEAT'
  | 'COLD'
  | 'RELAXATION'
  | 'DISTRACTION'
  | 'MUSIC'
  | 'GUIDED_IMAGERY'
  | 'BREATHING_EXERCISES'
  | 'MEDITATION'
  | 'TENS'
  | 'AROMATHERAPY'
  | 'ELEVATION'
  | 'COMPRESSION'
  | 'OTHER';

// NRS scoring reference constants
export const NRS_SCORE_DESCRIPTIONS = {
  0: 'No pain',
  1: 'Minimal pain - barely noticeable',
  2: 'Minor pain - does not interfere with activities',
  3: 'Noticeable pain - can be ignored',
  4: 'Moderate pain - can ignore if engaged in task',
  5: 'Moderately strong pain - cannot be ignored for long',
  6: 'Moderately strong pain - interferes with concentration',
  7: 'Severe pain - interferes with normal daily activities',
  8: 'Intense pain - difficult to do anything',
  9: 'Excruciating pain - cannot do anything',
  10: 'Unbearable pain - worst possible pain'
} as const;

export const NRS_SEVERITY_RANGES = {
  NO_PAIN: { min: 0, max: 0, label: 'No pain' },
  MILD: { min: 1, max: 3, label: 'Mild pain' },
  MODERATE: { min: 4, max: 6, label: 'Moderate pain' },
  SEVERE: { min: 7, max: 10, label: 'Severe pain' }
} as const;

/**
 * Create NRS Assessment Request
 */
export interface CreateNrsAssessmentRequest {
  painScore: number;
  painDescriptor?: NrsPainDescriptor;
  worstPain24h?: number;
  bestPain24h?: number;
  averagePain24h?: number;
  acceptablePainLevel?: number;
  assessmentType?: NrsAssessmentType;
  assessmentContext?: NrsAssessmentContext;
  assessmentDate?: string;
  painStatus?: NrsPainStatus;
  painLocation?: string;
  painLocationNotes?: string;
  painRadiates?: boolean;
  radiationLocation?: string;
  suspectedCause?: string;
  suspectedCauseNotes?: string;
  painDuration?: NrsPainDuration;
  painOnset?: string;
  interventionProvided?: boolean;
  interventionType?: NrsInterventionType;
  medicationAdministered?: string;
  medicationDose?: string;
  medicationRoute?: NrsMedicationRoute;
  medicationTime?: string;
  nonPharmInterventions?: NrsNonPharmIntervention[];
  reassessmentTime?: string;
  reassessmentScore?: number;
  interventionEffectiveness?: NrsInterventionEffectiveness;
  reliefPercentage?: number;
  comfortGoalMet?: boolean;
  comfortGoalNotes?: string;
  caregiverPresent?: boolean;
  caregiverObservations?: string;
  caregiverEducationProvided?: boolean;
  carePlanUpdateNeeded?: boolean;
  carePlanRecommendations?: string;
  clinicalNotes?: string;
  assessmentSummary?: string;
  followUpPlan?: string;
}

/**
 * Update NRS Assessment Request
 */
export interface UpdateNrsAssessmentRequest extends Partial<CreateNrsAssessmentRequest> {}

/**
 * NRS Assessment Response with interpretation
 */
export interface NrsAssessmentResponse {
  status: number;
  message?: string;
  data: NumericRatingScale;
  interpretation?: {
    painScore: number;
    painSeverity: NrsPainSeverity;
    painPresent: boolean;
    severityDescription: string;
  };
}

/**
 * NRS Assessment List Response
 */
export interface NrsAssessmentListResponse {
  status: number;
  message?: string;
  data: NumericRatingScale[];
  count: number;
  limit: number;
  offset: number;
}

/**
 * NRS Patient Statistics Response
 */
export interface NrsPatientStatsResponse {
  status: number;
  data: {
    totalAssessments: number;
    latestAssessment: NumericRatingScale | null;
    periodDays: number;
    averages: {
      painScore: number | null;
      worst24h: number | null;
      best24h: number | null;
      average24h: number | null;
    };
    scoreRange: {
      max: number | null;
      min: number | null;
    };
    severityDistribution: Record<NrsPainSeverity | 'UNKNOWN', number>;
  };
}

/**
 * NRS Patient Trend Response
 */
export interface NrsPatientTrendResponse {
  status: number;
  data: {
    periodDays: number;
    assessments: Array<{
      id: number;
      assessmentDate: Date;
      painScore: number;
      painSeverity: NrsPainSeverity;
      worstPain24h?: number;
      bestPain24h?: number;
      averagePain24h?: number;
      acceptablePainLevel?: number;
      interventionProvided: boolean;
      interventionEffectiveness?: NrsInterventionEffectiveness;
    }>;
    count: number;
  };
}

// =============================================================================
// Vital Signs - Comprehensive Patient Vital Signs Tracking
// Includes BP, HR, RR, Temp, SpO2, Pain with timestamp, value, and unit
// =============================================================================

/**
 * Vital Signs - Complete vital signs record for a patient
 * Tracks standard vital signs with timestamps, values, and units
 */
export interface VitalSign {
  id: number;
  patientId?: number;
  noteId?: number;
  encounterId?: number;

  // Measurement timestamp
  measurementTimestamp: Date;
  measuredById?: number;

  // Temperature
  degreesFahrenheit?: number;
  degreesCelsius?: number;
  temperatureUnit?: TemperatureUnit;
  temperatureMethod?: TemperatureMethod;
  temperatureNotes?: string;

  // Heart Rate
  heartRate?: number;
  heartRateUnit?: string;
  heartRhythm?: HeartRhythm;
  heartRateLocation?: HeartRateLocation;
  otherHeartRateLocation?: string;
  heartRateNotes?: string;

  // Blood Pressure
  bpSystolic?: number;
  bpDiastolic?: number;
  bpUnit?: string;
  bpPosition?: BpPosition;
  bpLocation?: BpLocation;
  otherBpLocation?: string;
  bpCuffSize?: string;
  bpAdditionalReadings?: string;
  bpNotes?: string;
  bpMmhg?: number;

  // Respiratory Rate
  respiratoryRate?: number;
  respiratoryRateUnit?: string;
  respiratoryRhythm?: RespiratoryRhythm;
  respiratoryPattern?: RespiratoryPattern;
  respiratoryNotes?: string;

  // Oxygen Saturation (SpO2)
  pulseOximetryPercentage?: number;
  pulseOxUnit?: string;
  pulseOxLocation?: string;
  pulseOxOtherLocation?: string;
  supplementalOxygen?: boolean;
  oxygenFlowRate?: number;
  oxygenDeliveryMethod?: OxygenDeliveryMethod;
  pulseOxNotes?: string;

  // Pain Assessment
  painScore?: number;
  painScoreUnit?: string;
  painScaleUsed?: PainScale;
  painLocation?: string;
  painLocationOther?: string;
  painQuality?: PainQuality;
  painRadiation?: string;
  painOnset?: string;
  painDuration?: string;
  painAggravatingFactors?: string;
  painRelievingFactors?: string;
  painInterventionGiven?: boolean;
  painInterventionDescription?: string;
  painPostInterventionScore?: number;
  painNotes?: string;

  // Body Measurements
  bodyHeightInches?: number;
  bodyHeightCm?: number;
  heightUnit?: string;
  bodyWeightLbs?: number;
  bodyWeightKg?: number;
  weightUnit?: string;
  bodyWeightPeriod?: string;
  weightChangePercentage?: number;
  weightChangePeriodDays?: number;
  bmiKgM2?: number;
  bmiPercentage?: number;

  // General Notes
  generalNotes?: string;
  patientPositionDuringAssessment?: string;
  patientActivityPrior?: string;

  // Clinical Flags
  isAbnormal?: boolean;
  abnormalValues?: string;
  requiresFollowUp?: boolean;
  followUpNotes?: string;
  notifiedProvider?: boolean;
  notifiedProviderAt?: Date;
  notifiedProviderId?: number;

  // Signature and Compliance (21 CFR Part 11)
  signatureId?: number;
  signedAt?: Date;
  signedById?: number;

  // Amendment tracking
  amended?: boolean;
  amendmentReason?: string;
  amendedAt?: Date;
  amendedById?: number;

  // Audit fields
  createdById?: number;
  updatedById?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Temperature units
export type TemperatureUnit = 'F' | 'C';

// Temperature methods
export type TemperatureMethod =
  | 'ORAL'
  | 'AXILLARY'
  | 'RECTAL'
  | 'TEMPORAL'
  | 'TYMPANIC'
  | 'OTHER';

// Heart rhythm types
export type HeartRhythm =
  | 'REGULAR'
  | 'IRREGULAR'
  | 'REGULARLY_IRREGULAR'
  | 'IRREGULARLY_IRREGULAR';

// Heart rate locations
export type HeartRateLocation =
  | 'RADIAL'
  | 'APICAL'
  | 'CAROTID'
  | 'BRACHIAL'
  | 'FEMORAL'
  | 'PEDAL';

// Blood pressure positions
export type BpPosition =
  | 'SITTING'
  | 'STANDING'
  | 'SUPINE'
  | 'LEFT_LATERAL';

// Blood pressure locations
export type BpLocation =
  | 'LEFT_ARM'
  | 'RIGHT_ARM'
  | 'LEFT_LEG'
  | 'RIGHT_LEG';

// Respiratory rhythms
export type RespiratoryRhythm =
  | 'REGULAR'
  | 'IRREGULAR'
  | 'CHEYNE_STOKES'
  | 'KUSSMAUL'
  | 'BIOTS';

// Respiratory patterns
export type RespiratoryPattern =
  | 'NORMAL'
  | 'SHALLOW'
  | 'DEEP'
  | 'LABORED'
  | 'APNEIC';

// Oxygen delivery methods
export type OxygenDeliveryMethod =
  | 'NASAL_CANNULA'
  | 'MASK'
  | 'VENTI_MASK'
  | 'NON_REBREATHER'
  | 'HIGH_FLOW';

// Pain scales
export type PainScale =
  | 'NRS'
  | 'VAS'
  | 'FACES'
  | 'FLACC'
  | 'PAINAD'
  | 'CPOT'
  | 'WONG_BAKER';

// Pain qualities
export type PainQuality =
  | 'SHARP'
  | 'DULL'
  | 'ACHING'
  | 'BURNING'
  | 'THROBBING'
  | 'STABBING';

// Vital sign ranges for abnormality detection
export interface VitalSignRange {
  low: number;
  high: number;
  criticalLow: number;
  criticalHigh: number;
}

export const VITAL_SIGN_RANGES: Record<string, VitalSignRange> = {
  temperature_fahrenheit: { low: 97.8, high: 99.1, criticalLow: 95.0, criticalHigh: 104.0 },
  heart_rate: { low: 60, high: 100, criticalLow: 40, criticalHigh: 150 },
  bp_systolic: { low: 90, high: 140, criticalLow: 70, criticalHigh: 180 },
  bp_diastolic: { low: 60, high: 90, criticalLow: 40, criticalHigh: 110 },
  respiratory_rate: { low: 12, high: 20, criticalLow: 8, criticalHigh: 30 },
  spo2: { low: 95, high: 100, criticalLow: 88, criticalHigh: 100 },
  pain_score: { low: 0, high: 3, criticalLow: 0, criticalHigh: 7 }
};

/**
 * Create Vital Signs Request
 */
export interface CreateVitalSignRequest {
  patientId?: number;
  noteId?: number;
  encounterId?: number;
  measurementTimestamp?: string;

  // Temperature
  degreesFahrenheit?: number;
  degreesCelsius?: number;
  temperatureUnit?: TemperatureUnit;
  temperatureMethod?: TemperatureMethod;
  temperatureNotes?: string;

  // Heart Rate
  heartRate?: number;
  heartRhythm?: HeartRhythm;
  heartRateLocation?: HeartRateLocation;
  otherHeartRateLocation?: string;
  heartRateNotes?: string;

  // Blood Pressure
  bpSystolic?: number;
  bpDiastolic?: number;
  bpPosition?: BpPosition;
  bpLocation?: BpLocation;
  otherBpLocation?: string;
  bpCuffSize?: string;
  bpNotes?: string;

  // Respiratory Rate
  respiratoryRate?: number;
  respiratoryRhythm?: RespiratoryRhythm;
  respiratoryPattern?: RespiratoryPattern;
  respiratoryNotes?: string;

  // Oxygen Saturation
  pulseOximetryPercentage?: number;
  pulseOxLocation?: string;
  supplementalOxygen?: boolean;
  oxygenFlowRate?: number;
  oxygenDeliveryMethod?: OxygenDeliveryMethod;
  pulseOxNotes?: string;

  // Pain
  painScore?: number;
  painScaleUsed?: PainScale;
  painLocation?: string;
  painQuality?: PainQuality;
  painOnset?: string;
  painDuration?: string;
  painAggravatingFactors?: string;
  painRelievingFactors?: string;
  painInterventionGiven?: boolean;
  painInterventionDescription?: string;
  painNotes?: string;

  // Body Measurements
  bodyHeightInches?: number;
  bodyHeightCm?: number;
  bodyWeightLbs?: number;
  bodyWeightKg?: number;
  bmiKgM2?: number;

  // Notes
  generalNotes?: string;
  patientPositionDuringAssessment?: string;
  patientActivityPrior?: string;
}

/**
 * Update Vital Signs Request
 */
export interface UpdateVitalSignRequest extends Partial<CreateVitalSignRequest> {}

/**
 * Amend Vital Signs Request
 */
export interface AmendVitalSignRequest extends UpdateVitalSignRequest {
  amendmentReason: string;
}

/**
 * Vital Signs Response - Single vital sign record
 */
export interface VitalSignResponse {
  status: number;
  data: VitalSign;
  message?: string;
  alerts?: {
    hasAbnormalValues: boolean;
    abnormalValues: string[];
  } | null;
}

/**
 * Vital Signs List Response
 */
export interface VitalSignsListResponse {
  status: number;
  data: VitalSign[];
  count: number;
  limit: number;
  offset: number;
}

/**
 * Vital Signs Stats Response
 */
export interface VitalSignsStatsResponse {
  status: number;
  data: {
    totalRecords: number;
    latestVitalSigns: VitalSign | null;
    periodDays: number;
    averages: {
      temperature: number | null;
      heartRate: number | null;
      bpSystolic: number | null;
      bpDiastolic: number | null;
      respiratoryRate: number | null;
      spo2: number | null;
      painScore: number | null;
    };
    ranges: {
      temperature: { max: number | null; min: number | null };
      heartRate: { max: number | null; min: number | null };
      bpSystolic: { max: number | null; min: number | null };
      painScore: { max: number | null };
    };
    abnormalCount: number;
  };
}

/**
 * Vital Signs Trend Response
 */
export interface VitalSignsTrendResponse {
  status: number;
  data: {
    periodDays: number;
    vitalSigns: Array<{
      id: number;
      measurementTimestamp: Date;
      degreesFahrenheit?: number;
      heartRate?: number;
      bpSystolic?: number;
      bpDiastolic?: number;
      respiratoryRate?: number;
      pulseOximetryPercentage?: number;
      painScore?: number;
      isAbnormal?: boolean;
    }>;
    count: number;
  };
}

/**
 * Vital Signs Reference Response
 */
export interface VitalSignsReferenceResponse {
  status: number;
  data: {
    name: string;
    description: string;
    measurements: {
      bloodPressure: {
        name: string;
        unit: string;
        components: string[];
        normalRanges: VitalSignRange;
      };
      heartRate: {
        name: string;
        unit: string;
        normalRanges: VitalSignRange;
      };
      respiratoryRate: {
        name: string;
        unit: string;
        normalRanges: VitalSignRange;
      };
      temperature: {
        name: string;
        unit: string;
        normalRanges: VitalSignRange;
      };
      spo2: {
        name: string;
        unit: string;
        normalRanges: VitalSignRange;
      };
      pain: {
        name: string;
        unit: string;
        normalRanges: VitalSignRange;
      };
    };
  };
}

// =============================================================================
// Electronic Signature Models - 21 CFR Part 11 Compliance
// Implements FDA electronic records and signatures requirements
// =============================================================================

/**
 * Signature Type - Method of capturing the signature
 * Per 21 CFR Part 11.200 electronic signature components
 */
export type ElectronicSignatureType =
  | 'TYPED'        // User typed their name as signature
  | 'DRAWN'        // User drew signature on screen (touch/stylus)
  | 'BIOMETRIC'    // Fingerprint, retina, or other biometric
  | 'PIN'          // Personal Identification Number confirmation
  | 'SMART_CARD'   // Hardware token/smart card authentication
  | 'DIGITAL_CERT'; // PKI digital certificate signature

/**
 * Signature Meaning - Legal significance and purpose of the signature
 * Per 21 CFR Part 11.50(a) requirements
 */
export type ElectronicSignatureMeaning =
  | 'AUTHOR'           // I created/wrote this document
  | 'REVIEWER'         // I have reviewed this document
  | 'APPROVER'         // I approve this document
  | 'VERIFIER'         // I verify the accuracy of this document
  | 'AUTHENTICATOR'    // I authenticate this document is genuine
  | 'WITNESS'          // I witnessed this event/signature
  | 'COSIGNER'         // I co-sign as supervisor/oversight
  | 'ORDERING_PROVIDER'// I am ordering this treatment/medication
  | 'CERTIFIER'        // I certify the information is true and accurate
  | 'ATTESTOR'         // I attest to the statements herein
  | 'RECIPIENT'        // I received/acknowledged this document
  | 'AMENDMENT';       // I am amending this document

/**
 * Signature Status - Lifecycle state of the signature
 */
export type ElectronicSignatureStatus =
  | 'VALID'            // Signature is valid and active
  | 'REVOKED'          // Signature has been revoked (with reason documented)
  | 'EXPIRED'          // Signature validity period has expired
  | 'SUPERSEDED'       // Replaced by a newer signature (amendment)
  | 'PENDING_REVIEW';  // Awaiting cosigner/supervisor review

/**
 * Electronic Signature - 21 CFR Part 11 compliant signature record
 *
 * Compliance features:
 * - 11.10(e): Secure, computer-generated, time-stamped audit trails
 * - 11.50(a): Signed records contain signer info, date/time, meaning
 * - 11.70: Linking of electronic signatures to electronic records
 * - 11.100: Signature uniqueness and verification
 * - 11.200: Electronic signature components and controls
 */
export interface ElectronicSignature {
  id: number;

  // Signer identification (21 CFR Part 11.100)
  signerId: string;
  signerName: string;
  signerEmail: string;
  signerCredentials?: string; // MD, RN, LCSW, etc.
  signerTitle?: string;
  sessionId?: string;

  // Signature data (21 CFR Part 11.50)
  signatureType: ElectronicSignatureType;
  signatureMeaning: ElectronicSignatureMeaning;
  signatureStatement: string;
  signatureData: string;
  signatureImageFormat?: string;

  // Document binding (21 CFR Part 11.70)
  documentType: string;
  documentId: string;
  documentVersion: string;
  documentHash: string;
  hashAlgorithm: string;

  // Timestamp & non-repudiation (21 CFR Part 11.10(e))
  signedAt: Date;
  serverTimestamp: Date;
  signerTimezone?: string;
  tsaTimestamp?: Date;
  tsaProvider?: string;

  // Authentication verification (21 CFR Part 11.200)
  authenticationMethod: string;
  mfaVerified: boolean;
  mfaType?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;

  // Status & lifecycle
  status: ElectronicSignatureStatus;
  supersededById?: number;
  revocationReason?: string;
  revokedAt?: Date;
  revokedById?: string;

  // Cosignature requirements
  requiresCosigner: boolean;
  requiredCosignerId?: string;
  requiredCosignerRole?: string;
  cosignerSignatureId?: number;
  cosignatureDeadline?: Date;

  // Compliance metadata
  auditLogId?: number;
  organizationId?: string;
  facilityId?: string;
  regulatoryContext?: string;
  metadata?: Record<string, unknown>;

  // Record timestamp (immutable - no updatedAt)
  createdAt: Date;
}

/**
 * Signature Audit Event - Detailed audit trail for signature-related events
 * Per 21 CFR Part 11.10(e) requirements
 */
export interface SignatureAuditEvent {
  id: number;
  signatureId: number;
  eventType: string; // CREATED, VIEWED, VERIFIED, REVOKED, EXPORTED, etc.
  eventDescription?: string;
  actorId?: string;
  actorName?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  eventMetadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Signature Verification Token - External verification capability
 * Allows third parties to verify signature authenticity
 */
export interface SignatureVerificationToken {
  id: number;
  signatureId: number;
  token: string;
  expiresAt?: Date;
  maxUses?: number;
  useCount: number;
  createdById?: string;
  isActive: boolean;
  revokedAt?: Date;
  createdAt: Date;
}

// =============================================================================
// Electronic Signature API Request/Response Types
// =============================================================================

/**
 * Create Electronic Signature Request
 */
export interface CreateElectronicSignatureRequest {
  documentType: string;
  documentId: string;
  documentContent?: string; // Content to hash (not stored)
  documentVersion?: string;
  signatureType: ElectronicSignatureType;
  signatureMeaning: ElectronicSignatureMeaning;
  signatureStatement: string;
  signatureData: string;
  signatureImageFormat?: string;
  requiresCosigner?: boolean;
  requiredCosignerId?: string;
  requiredCosignerRole?: string;
  cosignatureDeadline?: string;
  regulatoryContext?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Cosign Signature Request
 */
export interface CosignSignatureRequest {
  signatureType?: ElectronicSignatureType;
  signatureStatement?: string;
  signatureData: string;
  signatureImageFormat?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Verify Signature Request
 */
export interface VerifySignatureRequest {
  documentContent: string;
}

/**
 * Revoke Signature Request
 */
export interface RevokeSignatureRequest {
  revocationReason: string;
}

/**
 * Create Verification Token Request
 */
export interface CreateVerificationTokenRequest {
  expiresInHours?: number;
  maxUses?: number;
}

/**
 * Electronic Signature Response
 */
export interface ElectronicSignatureResponse {
  status: number;
  message?: string;
  data: Partial<ElectronicSignature>;
}

/**
 * Electronic Signatures List Response
 */
export interface ElectronicSignaturesResponse {
  status: number;
  data: ElectronicSignature[];
  count: number;
}

/**
 * Signature Verification Response
 */
export interface SignatureVerificationResponse {
  status: number;
  data: {
    signatureId: number;
    isValid: boolean;
    signatureStatus: ElectronicSignatureStatus;
    hashAlgorithm: string;
    signedAt: Date;
    signerName: string;
    signerCredentials?: string;
    verificationTimestamp: string;
  };
}

/**
 * Signature Audit Trail Response
 */
export interface SignatureAuditTrailResponse {
  status: number;
  data: {
    signature: ElectronicSignature;
    auditEvents: SignatureAuditEvent[];
  };
}

/**
 * Signature Compliance Report Response
 */
export interface SignatureComplianceReportResponse {
  status: number;
  data: {
    period: {
      start: Date;
      end: Date;
    };
    summary: {
      totalSignatures: number;
      pendingCosignatures: number;
      overdueCosignatures: number;
    };
    byStatus: Array<{ status: string; count: number }>;
    byMeaning: Array<{ meaning: string; count: number }>;
    byDocumentType: Array<{ documentType: string; count: number }>;
    generatedAt: string;
  };
}

/**
 * Verification Token Response
 */
export interface VerificationTokenResponse {
  status: number;
  message?: string;
  data: {
    token: string;
    expiresAt: Date;
    maxUses?: number;
    verificationUrl: string;
  };
}

// =============================================================================
// Scheduling & Conflict Tracking
// =============================================================================

/**
 * Scheduled Visit
 * Individual patient visit appointments with staff assignment
 */
export interface ScheduledVisit {
  id: number;
  patientId: number;
  staffId: number;

  // Visit details
  visitType: ScheduledVisitType;
  visitPurpose?: ScheduledVisitPurpose;

  // Scheduling
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime?: string;
  estimatedDurationMinutes?: number;

  // Visit status
  visitStatus: ScheduledVisitStatus;

  // Actual visit times (GPS tracking)
  actualCheckInTime?: Date;
  actualCheckOutTime?: Date;
  actualDurationMinutes?: number;

  // GPS location data
  checkInLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  // Distance from patient address
  checkInDistanceMeters?: number;
  checkOutDistanceMeters?: number;

  // Confirmation and reminders
  patientConfirmed: boolean;
  patientConfirmedAt?: Date;
  reminderSent: boolean;
  reminderSentAt?: Date;

  // Cancellation/Rescheduling
  cancelledAt?: Date;
  cancelledById?: string;
  cancellationReason?: string;
  rescheduledToVisitId?: number;

  // Billing integration
  billable: boolean;
  billed: boolean;
  billingCode?: string;

  // Visit notes/documentation
  visitNotes?: string;
  clinicalDocumentationId?: number;

  // Recurring visit relationship
  recurringVisitId?: number;

  // Additional data
  metadata?: Record<string, unknown>;

  // Audit fields
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduledVisitType = 'RN' | 'LPN' | 'CNA' | 'SOCIAL_WORKER' | 'CHAPLAIN' | 'VOLUNTEER' | 'PHYSICIAN';
export type ScheduledVisitPurpose = 'ROUTINE' | 'ADMISSION' | 'RECERTIFICATION' | 'PRN' | 'CRISIS' | 'RESPITE';
export type ScheduledVisitStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MISSED' | 'RESCHEDULED';

/**
 * Scheduling Conflict
 * Track and manage scheduling conflicts (double-bookings, time overlaps, etc.)
 */
export interface SchedulingConflict {
  id: number;

  // Conflicting visits
  visitId1: number;
  visitId2: number;

  // Staff and patient involved
  staffId?: number;
  patientId?: number;

  // Conflict details
  conflictType: SchedulingConflictType;
  conflictSeverity: SchedulingConflictSeverity;
  conflictStatus: SchedulingConflictStatus;

  // Conflict time window
  conflictDate: string;
  conflictStartTime?: string;
  conflictEndTime?: string;
  overlapMinutes?: number;

  // Description
  conflictDescription?: string;

  // Resolution
  resolutionType?: SchedulingConflictResolution;
  resolutionNotes?: string;
  resolvedById?: string;
  resolvedAt?: Date;

  // Auto-detection metadata
  detectedBy: 'SYSTEM' | 'MANUAL';
  detectionRule?: string;

  // Notification tracking
  notificationSent: boolean;
  notificationSentAt?: Date;
  notificationRecipients?: string[];

  // Additional data
  metadata?: Record<string, unknown>;

  // Audit fields
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SchedulingConflictType =
  | 'DOUBLE_BOOKING'
  | 'TIME_OVERLAP'
  | 'STAFF_UNAVAILABLE'
  | 'TRAVEL_TIME'
  | 'SKILL_MISMATCH';

export type SchedulingConflictSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SchedulingConflictStatus =
  | 'DETECTED'
  | 'FLAGGED'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'IGNORED';

export type SchedulingConflictResolution =
  | 'RESCHEDULE_VISIT_1'
  | 'RESCHEDULE_VISIT_2'
  | 'REASSIGN_STAFF'
  | 'CANCEL_VISIT'
  | 'COMBINE_VISITS'
  | 'MANUAL';

/**
 * Create Scheduling Conflict Request
 */
export interface CreateSchedulingConflictRequest {
  visitId1: number;
  visitId2: number;
  staffId?: number;
  patientId?: number;
  conflictType: SchedulingConflictType;
  conflictSeverity?: SchedulingConflictSeverity;
  conflictDate: string;
  conflictStartTime?: string;
  conflictEndTime?: string;
  overlapMinutes?: number;
  conflictDescription?: string;
  detectedBy?: 'SYSTEM' | 'MANUAL';
  detectionRule?: string;
}

/**
 * Resolve Conflict Request
 */
export interface ResolveConflictRequest {
  resolutionType: SchedulingConflictResolution;
  resolutionNotes?: string;
}

/**
 * Scheduling Conflict Response
 */
export interface SchedulingConflictResponse {
  status: number;
  data: SchedulingConflict[];
  count?: number;
  message?: string;
}

/**
 * Detect Conflicts Request
 */
export interface DetectConflictsRequest {
  staffId: number;
  date: string;
}

/**
 * Unresolved Conflicts Count Response
 */
export interface UnresolvedConflictsCountResponse {
  status: number;
  data: {
    unresolvedCount: number;
  };
}

// =============================================================================
// Appeal Letter Templates - Generate Appeal Letters from Templates
// =============================================================================

/**
 * Appeal Letter Template - Reusable templates for appeal letters
 * Supports placeholders, categorization, and version control
 */
export interface AppealLetterTemplate {
  id: number;
  templateId: string;
  templateName: string;
  templateDescription?: string;
  appealLevel?: AppealLevel;
  payerType?: PayerType;
  denialCategory?: string;
  letterSubject?: string;
  letterBody: string;
  closingStatement?: string;
  placeholders?: AppealLetterPlaceholder[];
  requiredDocuments?: string[];
  isActive: boolean;
  isDefault: boolean;
  timesUsed: number;
  lastUsedAt?: Date;
  regulatoryReference?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  version: number;
  previousVersionId?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdById?: string;
  updatedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppealLetterPlaceholder {
  key: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export type PayerType = 'MEDICARE' | 'MEDICAID' | 'COMMERCIAL';

/**
 * Appeal Letter - Generated letter from template
 * Tracks letter generation, finalization, and sending
 */
export interface AppealLetter {
  id: number;
  appealId: number;
  templateId?: number;
  letterId: string;
  letterType: AppealLetterType;
  letterSubject?: string;
  letterBody: string;
  closingStatement?: string;
  placeholderValues?: Record<string, string>;
  letterStatus: AppealLetterStatus;
  finalizedById?: string;
  finalizedAt?: Date;
  sentDate?: Date;
  sentMethod?: AppealLetterSentMethod;
  sentTo?: string;
  trackingNumber?: string;
  documentId?: number;
  filePath?: string;
  fileUrl?: string;
  version: number;
  isCurrentVersion: boolean;
  supersedesLetterId?: number;
  metadata?: Record<string, unknown>;
  notes?: string;
  createdById?: string;
  updatedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AppealLetterType = 'INITIAL_APPEAL' | 'RECONSIDERATION' | 'ESCALATION' | 'RESPONSE_TO_REQUEST';
export type AppealLetterStatus = 'DRAFT' | 'FINALIZED' | 'SENT' | 'ARCHIVED';
export type AppealLetterSentMethod = 'PORTAL' | 'FAX' | 'MAIL' | 'EMAIL';

// =============================================================================
// Appeal Workflow Templates - Structured Appeal Workflows
// =============================================================================

/**
 * Appeal Workflow Template - Define workflow steps for appeals
 * Supports step-by-step workflow with deadlines and responsibilities
 */
export interface AppealWorkflowTemplate {
  id: number;
  workflowId: string;
  workflowName: string;
  workflowDescription?: string;
  appealLevel?: AppealLevel;
  payerType?: PayerType;
  denialCategory?: string;
  steps: AppealWorkflowStep[];
  totalSteps: number;
  estimatedDurationDays?: number;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  previousVersionId?: number;
  metadata?: Record<string, unknown>;
  createdById?: string;
  updatedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppealWorkflowStep {
  stepNumber: number;
  stepName: string;
  description?: string;
  requiredActions?: string[];
  requiredDocuments?: string[];
  deadlineDays?: number;
  responsibleRole?: string;
  nextStepOnComplete?: number;
  nextStepOnFail?: number;
}

/**
 * Appeal Workflow Instance - Active workflow for a specific appeal
 * Tracks progress, steps, and completion status
 */
export interface AppealWorkflowInstance {
  id: number;
  appealId: number;
  workflowTemplateId?: number;
  instanceId: string;
  currentStep: number;
  currentStepName?: string;
  workflowStatus: AppealWorkflowStatus;
  stepsCompleted: number;
  totalSteps: number;
  progressPercentage: number;
  startedAt: Date;
  estimatedCompletionDate?: Date;
  actualCompletionDate?: Date;
  pausedAt?: Date;
  currentStepDueDate?: Date;
  currentStepStartedAt?: Date;
  assignedToId?: string;
  assignedAt?: Date;
  stepsProgress?: AppealWorkflowStepProgress[];
  daysInCurrentStep?: number;
  totalDaysElapsed?: number;
  stepsCompletedOnTime: number;
  stepsOverdue: number;
  isBlocked: boolean;
  blockerReason?: string;
  blockerSince?: Date;
  metadata?: Record<string, unknown>;
  notes?: string;
  createdById?: string;
  updatedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppealWorkflowStepProgress {
  stepNumber: number;
  stepName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  startedAt?: string;
  completedAt?: string;
  completedById?: string;
  notes?: string;
  documentsAttached?: string[];
  actionsCompleted?: string[];
}

export type AppealWorkflowStatus = 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// =============================================================================
// Appeal Status History - Comprehensive Status Tracking
// =============================================================================

/**
 * Appeal Status History - Track all status changes
 * Supports audit trail and notification tracking
 */
export interface AppealStatusHistory {
  id: number;
  appealId: number;
  previousStatus?: string;
  newStatus: string;
  statusCategory?: AppealStatusCategory;
  changeReason?: string;
  changeType?: AppealStatusChangeType;
  relatedDocumentId?: number;
  relatedMilestoneId?: number;
  relatedLetterId?: number;
  notificationSent: boolean;
  notificationRecipients?: string[];
  notificationSentAt?: Date;
  metadata?: Record<string, unknown>;
  changedById?: string;
  changedAt: Date;
}

export type AppealStatusCategory = 'WORKFLOW' | 'SUBMISSION' | 'DECISION' | 'DOCUMENT' | 'COMMUNICATION';
export type AppealStatusChangeType = 'MANUAL' | 'AUTOMATIC' | 'SYSTEM' | 'EXTERNAL';

// =============================================================================
// Appeal Letter Template API Types
// =============================================================================

export interface CreateLetterTemplateRequest {
  templateName: string;
  templateDescription?: string;
  appealLevel?: AppealLevel;
  payerType?: PayerType;
  denialCategory?: string;
  letterSubject?: string;
  letterBody: string;
  closingStatement?: string;
  placeholders?: AppealLetterPlaceholder[];
  requiredDocuments?: string[];
  regulatoryReference?: string;
  effectiveDate?: string;
  expirationDate?: string;
  tags?: string[];
}

export interface UpdateLetterTemplateRequest {
  templateName?: string;
  templateDescription?: string;
  appealLevel?: AppealLevel;
  payerType?: PayerType;
  denialCategory?: string;
  letterSubject?: string;
  letterBody?: string;
  closingStatement?: string;
  placeholders?: AppealLetterPlaceholder[];
  requiredDocuments?: string[];
  regulatoryReference?: string;
  effectiveDate?: string;
  expirationDate?: string;
  isActive?: boolean;
  tags?: string[];
}

export interface GenerateLetterRequest {
  templateId: number;
  placeholderValues?: Record<string, string>;
}

export interface UpdateLetterRequest {
  letterSubject?: string;
  letterBody?: string;
  closingStatement?: string;
  notes?: string;
}

export interface MarkLetterSentRequest {
  sentMethod: AppealLetterSentMethod;
  sentTo?: string;
  trackingNumber?: string;
}

// =============================================================================
// Appeal Workflow Template API Types
// =============================================================================

export interface CreateWorkflowTemplateRequest {
  workflowName: string;
  workflowDescription?: string;
  appealLevel?: AppealLevel;
  payerType?: PayerType;
  denialCategory?: string;
  steps: AppealWorkflowStep[];
  estimatedDurationDays?: number;
}

export interface InitializeWorkflowRequest {
  workflowTemplateId: number;
}

export interface AdvanceWorkflowRequest {
  notes?: string;
  actionsCompleted?: string[];
  documentsAttached?: string[];
}

export interface PauseWorkflowRequest {
  reason?: string;
}

// =============================================================================
// Appeal Details Response - Comprehensive Appeal Data
// =============================================================================

export interface AppealDetailsResponse {
  success: boolean;
  appeal: AppealCase;
  timeline: AppealTimeline[];
  documents: AppealDocument[];
  letters: AppealLetter[];
  workflow?: AppealWorkflowInstance;
  statusHistory: AppealStatusHistory[];
}

// =============================================================================
// ASC 606 Revenue Recognition Types
// FASB ASC 606 Five-Step Model Compliance
// =============================================================================

/**
 * ASC 606 Contract - Step 1: Identify the contract with a customer
 * Tracks contract identification, validation, and lifecycle
 */
export interface ASC606Contract {
  id: number;
  billing_contract_id?: number;
  payer_id: number;
  patient_id?: number;
  contract_number: string;
  contract_name?: string;
  contract_type: ASC606ContractType;
  contract_start_date: string;
  contract_end_date?: string;
  is_evergreen: boolean;
  total_contract_value?: number; // In cents
  estimated_contract_value?: number;
  currency: string;

  // ASC 606 Step 1 Criteria
  criteria_approval_commitment: boolean;
  criteria_rights_identified: boolean;
  criteria_payment_terms_identified: boolean;
  criteria_commercial_substance: boolean;
  criteria_collection_probable: boolean;

  // Validation
  is_valid_asc606_contract: boolean;
  validation_date?: Date;
  validation_notes?: string;
  contract_status: ASC606ContractStatus;

  // Collectibility
  collectibility_probability: number; // Basis points (0-10000)
  collectibility_assessment_date?: string;
  collectibility_notes?: string;

  // Financing component
  has_financing_component: boolean;
  financing_rate?: number;

  // Non-cash consideration
  has_non_cash_consideration: boolean;
  non_cash_consideration_value?: number;
  non_cash_consideration_description?: string;

  // Time zone
  contract_timezone: string;

  // Metadata
  metadata?: Record<string, unknown>;
  notes?: string;

  // Audit
  created_by_id?: string;
  updated_by_id?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export type ASC606ContractType =
  | 'SERVICE_AGREEMENT'
  | 'CAPITATION'
  | 'FEE_FOR_SERVICE'
  | 'BUNDLED_PAYMENT';

export type ASC606ContractStatus =
  | 'DRAFT'
  | 'PENDING_VALIDATION'
  | 'ACTIVE'
  | 'MODIFIED'
  | 'SUSPENDED'
  | 'TERMINATED'
  | 'COMPLETED';

/**
 * Performance Obligation - Step 2: Identify the performance obligations
 * Tracks distinct goods/services promised to customer
 */
export interface ASC606PerformanceObligation {
  id: number;
  contract_id: number;
  obligation_number: string;
  obligation_name: string;
  obligation_description?: string;
  obligation_type: ASC606ObligationType;

  // Distinctiveness
  is_distinct: boolean;
  is_separately_identifiable: boolean;
  distinctiveness_notes?: string;

  // Satisfaction pattern
  satisfaction_pattern: ASC606SatisfactionPattern;
  recognition_pattern: ASC606RecognitionPattern;

  // Standalone selling price (in cents)
  standalone_selling_price?: number;
  ssp_method?: ASC606SSPMethod;

  // Allocation
  allocated_price?: number;
  allocation_percentage?: number; // Basis points

  // Period
  obligation_start_date: string;
  obligation_end_date?: string;
  expected_duration_days?: number;

  // Status
  satisfaction_status: ASC606SatisfactionStatus;
  satisfaction_percentage: number; // Basis points
  satisfaction_date?: string;

  // Revenue (in cents)
  total_recognized: number;
  total_deferred: number;

  // Measurement
  output_measure_unit?: string;
  total_expected_outputs?: number;
  total_delivered_outputs: number;

  // Series guidance
  is_series: boolean;
  series_increment?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  notes?: string;

  // Audit
  created_by_id?: string;
  updated_by_id?: string;
  created_at: Date;
  updated_at: Date;
}

export type ASC606ObligationType =
  | 'HOSPICE_ROUTINE_CARE'
  | 'HOSPICE_CONTINUOUS_CARE'
  | 'HOSPICE_RESPITE_CARE'
  | 'HOSPICE_INPATIENT_CARE'
  | 'DME_EQUIPMENT'
  | 'PHARMACY_SERVICES'
  | 'SKILLED_NURSING'
  | 'THERAPY_SERVICES'
  | 'ADMINISTRATIVE_SERVICES'
  | 'BUNDLED_SERVICES';

export type ASC606SatisfactionPattern =
  | 'POINT_IN_TIME'
  | 'OVER_TIME_OUTPUT'
  | 'OVER_TIME_INPUT'
  | 'STRAIGHT_LINE';

export type ASC606RecognitionPattern =
  | 'STRAIGHT_LINE'
  | 'USAGE_BASED'
  | 'MILESTONE_BASED'
  | 'PERCENTAGE_OF_COMPLETION';

export type ASC606SSPMethod =
  | 'OBSERVABLE_PRICE'
  | 'ADJUSTED_MARKET'
  | 'EXPECTED_COST_PLUS_MARGIN'
  | 'RESIDUAL_APPROACH';

export type ASC606SatisfactionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SATISFIED'
  | 'PARTIALLY_SATISFIED'
  | 'CANCELLED';

/**
 * Transaction Price - Step 3: Determine the transaction price
 * Tracks transaction price components including variable consideration
 */
export interface ASC606TransactionPrice {
  id: number;
  contract_id: number;
  version: number;
  effective_date: string;
  superseded_date?: string;
  is_current: boolean;

  // Fixed consideration (in cents)
  fixed_consideration: number;

  // Variable consideration
  has_variable_consideration: boolean;
  variable_consideration_estimate?: number;
  variable_consideration_method?: ASC606VariableMethod;

  // Constraint
  constraint_applied: boolean;
  constrained_amount?: number;
  constraint_reason?: string;

  // Total (in cents)
  total_transaction_price: number;

  // Adjustments
  financing_adjustment?: number;
  non_cash_fair_value?: number;
  consideration_payable_to_customer?: number;

  // Calculation
  calculation_method?: string;
  calculation_assumptions?: Record<string, unknown>;

  // Approval
  approved: boolean;
  approved_by_id?: string;
  approved_at?: Date;

  // Metadata
  metadata?: Record<string, unknown>;
  notes?: string;

  // Audit
  created_by_id?: string;
  created_at: Date;
  updated_at: Date;
}

export type ASC606VariableMethod =
  | 'EXPECTED_VALUE'
  | 'MOST_LIKELY_AMOUNT';

/**
 * Price Allocation - Step 4: Allocate transaction price to obligations
 */
export interface ASC606PriceAllocation {
  id: number;
  contract_id: number;
  transaction_price_id: number;
  obligation_id: number;
  version: number;
  effective_date: string;
  is_current: boolean;

  // Standalone selling price (in cents)
  standalone_selling_price: number;
  ssp_determination_method: ASC606SSPDeterminationMethod;
  ssp_observable_source?: string;
  ssp_adjustments?: Record<string, unknown>;

  // Relative SSP
  relative_ssp_percentage: number; // Basis points

  // Allocation (in cents)
  allocated_amount: number;

  // Discount
  discount_amount?: number;
  discount_allocation_method?: ASC606DiscountMethod;

  // Variable consideration
  variable_consideration_allocated?: number;
  variable_consideration_allocation_method?: string;

  // Daily rate
  daily_accrual_rate?: number;

  // Calculation
  calculation_workpaper?: Record<string, unknown>;

  // Metadata
  metadata?: Record<string, unknown>;
  notes?: string;

  // Audit
  created_by_id?: string;
  created_at: Date;
  updated_at: Date;
}

export type ASC606SSPDeterminationMethod =
  | 'OBSERVABLE_STANDALONE'
  | 'ADJUSTED_MARKET_ASSESSMENT'
  | 'EXPECTED_COST_PLUS_MARGIN'
  | 'RESIDUAL';

export type ASC606DiscountMethod =
  | 'PROPORTIONAL'
  | 'SPECIFIC';

/**
 * Daily Revenue Accrual - Step 5: Recognize revenue as obligations are satisfied
 */
export interface ASC606DailyAccrual {
  id: number;
  contract_id: number;
  obligation_id: number;
  allocation_id?: number;
  claim_id?: number;
  patient_id?: number;

  // Date
  accrual_date: string;
  fiscal_year: number;
  fiscal_quarter: number;
  fiscal_month: number;
  period_label: string;

  // Day-specific
  is_leap_year: boolean;
  days_in_month: number;
  is_partial_period: boolean;

  // Recognition pattern
  recognition_pattern: ASC606RecognitionPattern;

  // Amounts (in cents)
  base_daily_rate: number;
  adjustment_factor: number; // Basis points
  adjusted_daily_amount: number;

  // Pro-rata
  prorate_numerator?: number;
  prorate_denominator?: number;
  prorated_amount?: number;

  // Cumulative (in cents)
  cumulative_recognized: number;
  remaining_to_recognize: number;
  satisfaction_percentage: number; // Basis points

  // Usage-based
  units_delivered?: number;
  unit_rate?: number;

  // Milestone
  milestone_achieved: boolean;
  milestone_name?: string;
  milestone_amount?: number;

  // Status
  status: ASC606AccrualStatus;
  posted_to_gl: boolean;
  gl_posting_date?: string;
  gl_journal_entry_id?: string;

  // Calculation metadata
  calculation_timestamp: Date;
  calculation_version: number;
  calculation_source?: ASC606CalculationSource;

  // Metadata
  metadata?: Record<string, unknown>;
  notes?: string;

  // Audit
  created_by_id?: string;
  created_at: Date;
  updated_at: Date;
}

export type ASC606AccrualStatus =
  | 'CALCULATED'
  | 'POSTED'
  | 'ADJUSTED'
  | 'REVERSED';

export type ASC606CalculationSource =
  | 'AUTOMATED_DAILY_JOB'
  | 'MANUAL_ENTRY'
  | 'RECALCULATION';

/**
 * Contract Modification - Handle contract amendments and changes
 */
export interface ASC606ContractModification {
  id: number;
  contract_id: number;
  modification_number: string;
  modification_date: string;
  effective_date: string;
  modification_type: ASC606ModificationType;
  modification_description?: string;
  scope_change?: string;
  price_change?: string;

  // Before (in cents)
  previous_total_price?: number;
  previous_remaining_price?: number;
  previous_satisfaction_percentage?: number;

  // After (in cents)
  new_total_price?: number;
  price_change_amount?: number;

  // Catch-up
  requires_catch_up: boolean;
  catch_up_amount?: number;
  catch_up_recognized_date?: string;

  // New/terminated obligations
  adds_new_obligations: boolean;
  new_obligations?: Record<string, unknown>[];
  terminates_obligations: boolean;
  terminated_obligations?: number[];

  // Reallocation
  requires_reallocation: boolean;
  reallocation_method?: ASC606ReallocationMethod;

  // Status
  modification_status: ASC606ModificationStatus;
  approved_by_id?: string;
  approved_at?: Date;
  applied_at?: Date;

  // Documentation
  supporting_documentation?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  notes?: string;

  // Audit
  created_by_id?: string;
  created_at: Date;
  updated_at: Date;
}

export type ASC606ModificationType =
  | 'SEPARATE_CONTRACT'
  | 'TERMINATION_AND_NEW'
  | 'CONTINUATION';

export type ASC606ModificationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'APPLIED'
  | 'REJECTED';

export type ASC606ReallocationMethod =
  | 'PROSPECTIVE'
  | 'RETROSPECTIVE';

/**
 * Reconciliation - Reconciliation with billing/invoicing
 */
export interface ASC606Reconciliation {
  id: number;
  period_label: string;
  fiscal_year: number;
  fiscal_quarter: number;

  // Amounts (in cents)
  total_recognized_revenue: number;
  total_billed_revenue: number;
  variance_amount: number;
  variance_percentage?: number; // Basis points

  // Breakdown
  deferred_revenue_beginning?: number;
  deferred_revenue_ending?: number;
  unbilled_receivables_beginning?: number;
  unbilled_receivables_ending?: number;
  contract_assets?: number;
  contract_liabilities?: number;

  // Items
  reconciliation_items?: ASC606ReconciliationItem[];

  // Status
  status: ASC606ReconciliationStatus;
  is_reconciled: boolean;
  reconciled_at?: Date;
  reconciled_by_id?: string;

  // Approval
  approved: boolean;
  approved_by_id?: string;
  approved_at?: Date;

  // Variance
  variance_explanation?: string;
  requires_adjustment: boolean;
  adjustment_journal_entry_id?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  notes?: string;

  // Audit
  created_by_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ASC606ReconciliationItem {
  description: string;
  amount: number;
  category: string;
}

export type ASC606ReconciliationStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'APPROVED'
  | 'LOCKED';

// ASC 606 API Response Types
export interface ASC606ContractResponse {
  success: boolean;
  data: ASC606Contract;
}

export interface ASC606ContractListResponse {
  success: boolean;
  count: number;
  data: ASC606Contract[];
}

export interface ASC606ContractDetailsResponse {
  success: boolean;
  data: {
    contract: ASC606Contract;
    obligations: ASC606PerformanceObligation[];
    transactionPrice: ASC606TransactionPrice | null;
    allocations: ASC606PriceAllocation[];
  };
}

export interface ASC606AccrualCalculationResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    dateRange: { startDate: string; endDate: string };
    contractsProcessed: number;
  };
}

export interface ASC606AccrualListResponse {
  success: boolean;
  count: number;
  summary: {
    totalRecognized: number;
    totalRecords: number;
  };
  data: ASC606DailyAccrual[];
}
