import { db } from '../config/db.drizzle.js';
import { hope_assessments, hope_submissions, hope_compliance_metrics, hope_symptom_tracking, patients, audit_logs } from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, sql, or, isNull, ne, count, asc } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';

// ============================================================================
// CMS COMPLIANCE VALIDATION RULES
// ============================================================================
// Reference: CMS HOPE 2.0 Guidance Manual, effective October 1, 2025
// Reference: 42 CFR § 418.56 - Condition of Participation: Hospice Aide and Homemaker Services
// Reference: 42 CFR § 418.58 - Condition of Participation: Quality Assessment and Performance Improvement
// ============================================================================

/**
 * Valid assessment types per CMS HOPE 2.0 specifications
 */
const VALID_ASSESSMENT_TYPES = ['ADMISSION', 'HUV1', 'HUV2', 'DISCHARGE', 'TRANSFER', 'RESUMPTION', 'RECERTIFICATION', 'SYMPTOM_FOLLOWUP'];

/**
 * Valid assessment statuses
 */
const VALID_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SIGNED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'OVERDUE', 'LOCKED'];

/**
 * Assessment timing rules per CMS requirements
 * CFR Reference: 42 CFR § 418.54(a) - Condition of Participation: Initial and Comprehensive Assessment
 */
const ASSESSMENT_TIMING_RULES = {
  ADMISSION: { windowDays: 5, description: 'Must be completed within 5 calendar days of hospice admission' },
  HUV1: { windowStartDay: 6, windowEndDay: 15, description: 'HOPE Update Visit 1: Days 6-15 after admission' },
  HUV2: { windowStartDay: 16, windowEndDay: 30, description: 'HOPE Update Visit 2: Days 16-30 after admission' },
  RECERTIFICATION: { windowDays: 5, description: 'Must be completed within 5 days of recertification date' },
  DISCHARGE: { windowDays: 2, description: 'Must be completed within 2 days of discharge' },
  TRANSFER: { windowDays: 2, description: 'Must be completed within 2 days of transfer' },
  RESUMPTION: { windowDays: 5, description: 'Must be completed within 5 days of resumption of care' },
  SYMPTOM_FOLLOWUP: { windowHours: 48, description: 'Required within 48 hours of moderate/severe symptom report' }
};

/**
 * Clinician types authorized to complete HOPE assessments
 * CFR Reference: 42 CFR § 418.76 - Condition of Participation: Hospice Care Team
 */
const AUTHORIZED_CLINICIAN_TYPES = {
  ADMISSION: ['RN', 'NURSE', 'DOCTOR', 'ADMIN'], // RN required for admission per CMS
  HUV1: ['RN', 'NURSE', 'LPN', 'PT', 'OT', 'ST', 'SW', 'DOCTOR', 'ADMIN'],
  HUV2: ['RN', 'NURSE', 'LPN', 'PT', 'OT', 'ST', 'SW', 'DOCTOR', 'ADMIN'],
  DISCHARGE: ['RN', 'NURSE', 'DOCTOR', 'ADMIN'],
  TRANSFER: ['RN', 'NURSE', 'DOCTOR', 'ADMIN'],
  RESUMPTION: ['RN', 'NURSE', 'DOCTOR', 'ADMIN'],
  RECERTIFICATION: ['RN', 'NURSE', 'DOCTOR', 'ADMIN'],
  SYMPTOM_FOLLOWUP: ['RN', 'NURSE', 'LPN', 'PT', 'OT', 'ST', 'SW', 'DOCTOR', 'ADMIN']
};

/**
 * Required OASIS-E/HOPE 2.0 fields by assessment type
 * CFR Reference: 42 CFR § 418.56(d) - OASIS Data Items
 */
const REQUIRED_FIELDS_BY_TYPE = {
  ADMISSION: [
    'a0310_assessment_reference_date',
    'i0010_principal_diagnosis_icd10'
  ],
  HUV1: [
    'a0310_assessment_reference_date',
    'i0010_principal_diagnosis_icd10'
  ],
  HUV2: [
    'a0310_assessment_reference_date',
    'i0010_principal_diagnosis_icd10'
  ],
  DISCHARGE: [
    'a0310_assessment_reference_date',
    'a0270_discharge_date'
  ],
  TRANSFER: [
    'a0310_assessment_reference_date',
    'a0270_discharge_date'
  ],
  RESUMPTION: [
    'a0310_assessment_reference_date',
    'i0010_principal_diagnosis_icd10'
  ],
  RECERTIFICATION: [
    'a0310_assessment_reference_date',
    'i0010_principal_diagnosis_icd10'
  ],
  SYMPTOM_FOLLOWUP: [
    'a0310_assessment_reference_date',
    'sfv_trigger_symptoms'
  ]
};

/**
 * CMS Validation Service for HOPE Assessments
 * Provides comprehensive validation according to CMS regulations
 */
class CMSValidationService {
  /**
   * Validate required fields for a specific assessment type
   * @param {string} assessmentType - The type of assessment
   * @param {object} data - Assessment data to validate
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validateRequiredFields(assessmentType, data) {
    const errors = [];
    const requiredFields = REQUIRED_FIELDS_BY_TYPE[assessmentType] || [];

    for (const field of requiredFields) {
      if (!data[field] && data[field] !== 0 && data[field] !== false) {
        errors.push({
          field,
          code: 'REQUIRED_FIELD_MISSING',
          message: `CMS Validation Error: Required field '${field}' is missing for ${assessmentType} assessment`,
          cfrReference: '42 CFR § 418.56(d)'
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate assessment timing against CMS rules
   * @param {string} assessmentType - The type of assessment
   * @param {Date} assessmentDate - The assessment date
   * @param {Date} admissionDate - The admission date
   * @param {Date} eventDate - The event date (e.g., discharge date, recert date)
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  static validateTiming(assessmentType, assessmentDate, admissionDate, eventDate = null) {
    const errors = [];
    const warnings = [];
    const rules = ASSESSMENT_TIMING_RULES[assessmentType];

    if (!rules) {
      return { valid: true, errors, warnings };
    }

    const assessDate = new Date(assessmentDate);
    const admitDate = admissionDate ? new Date(admissionDate) : null;
    const evtDate = eventDate ? new Date(eventDate) : null;

    switch (assessmentType) {
      case 'ADMISSION':
        if (admitDate) {
          const daysSinceAdmission = Math.floor((assessDate - admitDate) / (1000 * 60 * 60 * 24));
          if (daysSinceAdmission > rules.windowDays) {
            errors.push({
              field: 'assessment_date',
              code: 'TIMING_VIOLATION',
              message: `CMS Timing Violation: Admission assessment must be completed within ${rules.windowDays} days of admission. Current: ${daysSinceAdmission} days.`,
              cfrReference: '42 CFR § 418.54(a)'
            });
          } else if (daysSinceAdmission >= rules.windowDays - 1) {
            warnings.push({
              field: 'assessment_date',
              code: 'TIMING_WARNING',
              message: `Warning: Admission assessment approaching deadline. ${rules.windowDays - daysSinceAdmission} days remaining.`
            });
          }
        }
        break;

      case 'HUV1':
      case 'HUV2':
        if (admitDate) {
          const daysSinceAdmission = Math.floor((assessDate - admitDate) / (1000 * 60 * 60 * 24));
          if (daysSinceAdmission < rules.windowStartDay) {
            errors.push({
              field: 'assessment_date',
              code: 'TIMING_VIOLATION',
              message: `CMS Timing Violation: ${assessmentType} cannot be completed before day ${rules.windowStartDay}. Current: day ${daysSinceAdmission}.`,
              cfrReference: '42 CFR § 418.54'
            });
          } else if (daysSinceAdmission > rules.windowEndDay) {
            errors.push({
              field: 'assessment_date',
              code: 'TIMING_VIOLATION',
              message: `CMS Timing Violation: ${assessmentType} must be completed by day ${rules.windowEndDay}. Current: day ${daysSinceAdmission}.`,
              cfrReference: '42 CFR § 418.54'
            });
          }
        }
        break;

      case 'SYMPTOM_FOLLOWUP':
        if (evtDate) {
          const hoursSinceEvent = (assessDate - evtDate) / (1000 * 60 * 60);
          if (hoursSinceEvent > rules.windowHours) {
            errors.push({
              field: 'assessment_date',
              code: 'TIMING_VIOLATION',
              message: `CMS Timing Violation: Symptom follow-up must be completed within ${rules.windowHours} hours. Current: ${Math.floor(hoursSinceEvent)} hours.`,
              cfrReference: '42 CFR § 418.56'
            });
          }
        }
        break;

      case 'DISCHARGE':
      case 'TRANSFER':
        if (evtDate) {
          const daysSinceEvent = Math.floor((assessDate - evtDate) / (1000 * 60 * 60 * 24));
          if (daysSinceEvent > rules.windowDays) {
            errors.push({
              field: 'assessment_date',
              code: 'TIMING_VIOLATION',
              message: `CMS Timing Violation: ${assessmentType} assessment must be completed within ${rules.windowDays} days of event. Current: ${daysSinceEvent} days.`,
              cfrReference: '42 CFR § 418.54'
            });
          }
        }
        break;
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate clinician authorization for assessment type
   * @param {string} assessmentType - The type of assessment
   * @param {string} clinicianRole - The clinician's role
   * @returns {{ authorized: boolean, error: string|null }}
   */
  static validateClinicianAuthorization(assessmentType, clinicianRole) {
    const authorizedRoles = AUTHORIZED_CLINICIAN_TYPES[assessmentType] || [];
    const normalizedRole = (clinicianRole || '').toUpperCase();

    if (!authorizedRoles.includes(normalizedRole)) {
      return {
        authorized: false,
        error: {
          code: 'UNAUTHORIZED_CLINICIAN',
          message: `CMS Authorization Error: ${clinicianRole} is not authorized to complete ${assessmentType} assessments. Authorized roles: ${authorizedRoles.join(', ')}`,
          cfrReference: '42 CFR § 418.76'
        }
      };
    }

    return { authorized: true, error: null };
  }

  /**
   * Validate ICD-10 diagnosis code format
   * @param {string} icd10Code - The ICD-10 code
   * @returns {{ valid: boolean, error: string|null }}
   */
  static validateICD10Code(icd10Code) {
    if (!icd10Code) {
      return { valid: false, error: 'ICD-10 code is required' };
    }

    // ICD-10-CM format: Letter followed by 2 digits, optional decimal, then up to 4 more characters
    const icd10Pattern = /^[A-Z][0-9]{2}\.?[A-Z0-9]{0,4}$/i;
    if (!icd10Pattern.test(icd10Code)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_ICD10_FORMAT',
          message: `Invalid ICD-10-CM code format: ${icd10Code}. Expected format: Letter + 2 digits + optional decimal + up to 4 alphanumeric characters.`,
          cfrReference: '42 CFR § 418.56(d)'
        }
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Check for duplicate assessments
   * @param {number} patientId - Patient ID
   * @param {string} assessmentType - Assessment type
   * @param {Date} assessmentDate - Assessment date
   * @param {number|null} excludeId - Assessment ID to exclude (for updates)
   * @returns {Promise<{ isDuplicate: boolean, existingAssessment: object|null }>}
   */
  static async checkDuplicateAssessment(patientId, assessmentType, assessmentDate, excludeId = null) {
    const startOfDay = new Date(assessmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(assessmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    let conditions = [
      eq(hope_assessments.patient_id, patientId),
      eq(hope_assessments.assessment_type, assessmentType),
      gte(hope_assessments.assessment_date, startOfDay),
      lte(hope_assessments.assessment_date, endOfDay),
      isNull(hope_assessments.deleted_at)
    ];

    if (excludeId) {
      conditions.push(ne(hope_assessments.id, excludeId));
    }

    const existing = await db
      .select({ id: hope_assessments.id, assessment_status: hope_assessments.assessment_status })
      .from(hope_assessments)
      .where(and(...conditions))
      .limit(1);

    return {
      isDuplicate: existing.length > 0,
      existingAssessment: existing[0] || null
    };
  }

  /**
   * Check if assessment can be modified (not locked)
   * @param {object} assessment - The assessment record
   * @returns {{ canModify: boolean, reason: string|null }}
   */
  static checkModificationAllowed(assessment) {
    const lockedStatuses = ['SIGNED', 'SUBMITTED', 'ACCEPTED', 'LOCKED'];

    if (lockedStatuses.includes(assessment.assessment_status)) {
      return {
        canModify: false,
        reason: {
          code: 'ASSESSMENT_LOCKED',
          message: `Assessment is locked with status '${assessment.assessment_status}'. Modifications not allowed after signing/submission.`,
          cfrReference: '21 CFR Part 11 - Electronic Records'
        }
      };
    }

    // Check if past submission deadline (30 days for most assessments per CMS rules)
    if (assessment.due_date) {
      const dueDate = new Date(assessment.due_date);
      const now = new Date();
      const gracePeriodDays = 30; // CMS allows 30-day grace period
      dueDate.setDate(dueDate.getDate() + gracePeriodDays);

      if (now > dueDate) {
        return {
          canModify: false,
          reason: {
            code: 'SUBMISSION_WINDOW_CLOSED',
            message: `Submission window has closed. Due date was ${assessment.due_date} with 30-day grace period.`,
            cfrReference: '42 CFR § 418.54'
          }
        };
      }
    }

    return { canModify: true, reason: null };
  }
}

/**
 * Create an audit log entry for assessment state changes
 * @param {object} params - Audit log parameters
 */
async function createAuditLog({ userId, sessionId, action, resourceType, resourceId, oldValue, newValue, status, ipAddress, userAgent, metadata }) {
  try {
    await db.insert(audit_logs).values({
      user_id: userId,
      session_id: sessionId,
      action,
      resource_type: resourceType,
      resource_id: resourceId?.toString(),
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      status: status || 'success',
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: metadata ? JSON.stringify(metadata) : null
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    // Don't throw - audit log failure shouldn't break the main operation
  }
}

/**
 * HOPE Assessment Controller
 * Manages Hospice Outcomes & Patient Evaluation (HOPE) assessments
 * Critical: Non-compliance can result in 4% Medicare payment reduction
 *
 * CMS References:
 * - 42 CFR § 418.54 - Condition of Participation: Initial and Comprehensive Assessment
 * - 42 CFR § 418.56 - Condition of Participation: Hospice Aide and Homemaker Services
 * - 42 CFR § 418.58 - Condition of Participation: Quality Assessment and Performance Improvement
 * - 42 CFR § 418.76 - Condition of Participation: Hospice Care Team
 * - 21 CFR Part 11 - Electronic Records; Electronic Signatures
 */
class HOPEAssessmentController {
  /**
   * Get all HOPE assessments for a patient
   * GET /patients/:id/hope-assessments
   */
  async getPatientAssessments(request, reply) {
    try {
      const { id } = request.params;

      const assessments = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.patient_id, parseInt(id)))
        .orderBy(desc(hope_assessments.assessment_date));

      reply.code(200);
      return {
        status: 200,
        data: assessments
      };
    } catch (error) {
      logger.error('Error fetching patient HOPE assessments:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create admission assessment (within 5 days of admission)
   * POST /patients/:id/hope-assessments/admission
   *
   * CMS Reference: 42 CFR § 418.54(a) - Initial assessment within 5 days
   */
  async createAdmissionAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const assessmentType = 'ADMISSION';

      // Validate clinician authorization
      const authCheck = CMSValidationService.validateClinicianAuthorization(
        assessmentType,
        request.user?.role
      );
      if (!authCheck.authorized) {
        reply.code(403);
        return {
          status: 403,
          message: 'Not authorized to create this assessment type',
          error: authCheck.error
        };
      }

      // Calculate due date (5 days from admission)
      const admissionDate = data.a0220_admission_date ? new Date(data.a0220_admission_date) : new Date();
      const assessmentDate = new Date();
      const dueDate = new Date(admissionDate);
      dueDate.setDate(dueDate.getDate() + 5);

      // Check for duplicate assessment
      const duplicateCheck = await CMSValidationService.checkDuplicateAssessment(
        parseInt(id),
        assessmentType,
        assessmentDate
      );
      if (duplicateCheck.isDuplicate) {
        reply.code(409);
        return {
          status: 409,
          message: 'Duplicate assessment exists for this patient and time period',
          error: {
            code: 'DUPLICATE_ASSESSMENT',
            existingAssessmentId: duplicateCheck.existingAssessment?.id,
            message: `An ${assessmentType} assessment already exists for this patient on this date`
          }
        };
      }

      // Validate assessment timing
      const timingValidation = CMSValidationService.validateTiming(
        assessmentType,
        assessmentDate,
        admissionDate
      );

      // Set reference date if not provided
      const referenceDate = data.a0310_assessment_reference_date || assessmentDate;

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: assessmentType,
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          a0310_assessment_reference_date: referenceDate,
          a0220_admission_date: admissionDate,
          a0200_assessment_type_code: '01', // 01 = Admission
          a0250_assessment_reason: '01', // 01 = Admission
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'CREATE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: result[0].id,
        newValue: { assessment_type: assessmentType, patient_id: id },
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { assessmentType, cmsCompliant: timingValidation.valid }
      });

      reply.code(201);
      return {
        status: 201,
        message: 'Admission assessment created',
        data: result[0],
        validation: {
          timingWarnings: timingValidation.warnings,
          timingErrors: timingValidation.errors
        }
      };
    } catch (error) {
      logger.error('Error creating admission assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create HUV1 assessment (days 6-15 after admission)
   * POST /patients/:id/hope-assessments/huv1
   *
   * CMS Reference: 42 CFR § 418.54 - HOPE Update Visit 1
   */
  async createHUV1Assessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const assessmentType = 'HUV1';

      // Validate clinician authorization
      const authCheck = CMSValidationService.validateClinicianAuthorization(
        assessmentType,
        request.user?.role
      );
      if (!authCheck.authorized) {
        reply.code(403);
        return {
          status: 403,
          message: 'Not authorized to create this assessment type',
          error: authCheck.error
        };
      }

      const assessmentDate = new Date();
      const admissionDate = data.a0220_admission_date ? new Date(data.a0220_admission_date) : null;

      // Calculate due date (day 15 after admission)
      const dueDate = admissionDate ? new Date(admissionDate) : new Date(assessmentDate);
      dueDate.setDate(dueDate.getDate() + 15);

      // Check for duplicate assessment
      const duplicateCheck = await CMSValidationService.checkDuplicateAssessment(
        parseInt(id),
        assessmentType,
        assessmentDate
      );
      if (duplicateCheck.isDuplicate) {
        reply.code(409);
        return {
          status: 409,
          message: 'Duplicate assessment exists for this patient and time period',
          error: {
            code: 'DUPLICATE_ASSESSMENT',
            existingAssessmentId: duplicateCheck.existingAssessment?.id,
            message: `An ${assessmentType} assessment already exists for this patient on this date`
          }
        };
      }

      // Validate assessment timing
      const timingValidation = CMSValidationService.validateTiming(
        assessmentType,
        assessmentDate,
        admissionDate
      );

      // Set reference date if not provided
      const referenceDate = data.a0310_assessment_reference_date || assessmentDate;

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: assessmentType,
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          a0310_assessment_reference_date: referenceDate,
          a0200_assessment_type_code: '02', // 02 = HUV
          a0250_assessment_reason: '02', // 02 = Scheduled
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'CREATE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: result[0].id,
        newValue: { assessment_type: assessmentType, patient_id: id },
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { assessmentType, cmsCompliant: timingValidation.valid }
      });

      reply.code(201);
      return {
        status: 201,
        message: 'HUV1 assessment created',
        data: result[0],
        validation: {
          timingWarnings: timingValidation.warnings,
          timingErrors: timingValidation.errors
        }
      };
    } catch (error) {
      logger.error('Error creating HUV1 assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create HUV2 assessment (days 16-30 after admission)
   * POST /patients/:id/hope-assessments/huv2
   *
   * CMS Reference: 42 CFR § 418.54 - HOPE Update Visit 2
   */
  async createHUV2Assessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const assessmentType = 'HUV2';

      // Validate clinician authorization
      const authCheck = CMSValidationService.validateClinicianAuthorization(
        assessmentType,
        request.user?.role
      );
      if (!authCheck.authorized) {
        reply.code(403);
        return {
          status: 403,
          message: 'Not authorized to create this assessment type',
          error: authCheck.error
        };
      }

      const assessmentDate = new Date();
      const admissionDate = data.a0220_admission_date ? new Date(data.a0220_admission_date) : null;

      // Calculate due date (day 30 after admission)
      const dueDate = admissionDate ? new Date(admissionDate) : new Date(assessmentDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // Check for duplicate assessment
      const duplicateCheck = await CMSValidationService.checkDuplicateAssessment(
        parseInt(id),
        assessmentType,
        assessmentDate
      );
      if (duplicateCheck.isDuplicate) {
        reply.code(409);
        return {
          status: 409,
          message: 'Duplicate assessment exists for this patient and time period',
          error: {
            code: 'DUPLICATE_ASSESSMENT',
            existingAssessmentId: duplicateCheck.existingAssessment?.id,
            message: `An ${assessmentType} assessment already exists for this patient on this date`
          }
        };
      }

      // Validate assessment timing
      const timingValidation = CMSValidationService.validateTiming(
        assessmentType,
        assessmentDate,
        admissionDate
      );

      // Set reference date if not provided
      const referenceDate = data.a0310_assessment_reference_date || assessmentDate;

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: assessmentType,
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          a0310_assessment_reference_date: referenceDate,
          a0200_assessment_type_code: '02', // 02 = HUV
          a0250_assessment_reason: '02', // 02 = Scheduled
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'CREATE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: result[0].id,
        newValue: { assessment_type: assessmentType, patient_id: id },
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { assessmentType, cmsCompliant: timingValidation.valid }
      });

      reply.code(201);
      return {
        status: 201,
        message: 'HUV2 assessment created',
        data: result[0],
        validation: {
          timingWarnings: timingValidation.warnings,
          timingErrors: timingValidation.errors
        }
      };
    } catch (error) {
      logger.error('Error creating HUV2 assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create discharge assessment
   * POST /patients/:id/hope-assessments/discharge
   *
   * CMS Reference: 42 CFR § 418.54 - Discharge assessment within 2 days
   */
  async createDischargeAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const assessmentType = 'DISCHARGE';

      // Validate clinician authorization
      const authCheck = CMSValidationService.validateClinicianAuthorization(
        assessmentType,
        request.user?.role
      );
      if (!authCheck.authorized) {
        reply.code(403);
        return {
          status: 403,
          message: 'Not authorized to create this assessment type',
          error: authCheck.error
        };
      }

      const assessmentDate = new Date();
      const dischargeDate = data.a0270_discharge_date ? new Date(data.a0270_discharge_date) : assessmentDate;

      // Calculate due date (2 days from discharge)
      const dueDate = new Date(dischargeDate);
      dueDate.setDate(dueDate.getDate() + 2);

      // Check for duplicate assessment
      const duplicateCheck = await CMSValidationService.checkDuplicateAssessment(
        parseInt(id),
        assessmentType,
        assessmentDate
      );
      if (duplicateCheck.isDuplicate) {
        reply.code(409);
        return {
          status: 409,
          message: 'Duplicate assessment exists for this patient and time period',
          error: {
            code: 'DUPLICATE_ASSESSMENT',
            existingAssessmentId: duplicateCheck.existingAssessment?.id,
            message: `A ${assessmentType} assessment already exists for this patient on this date`
          }
        };
      }

      // Set reference date if not provided
      const referenceDate = data.a0310_assessment_reference_date || assessmentDate;

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: assessmentType,
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          a0310_assessment_reference_date: referenceDate,
          a0270_discharge_date: dischargeDate,
          a0200_assessment_type_code: '09', // 09 = Discharge
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'CREATE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: result[0].id,
        newValue: { assessment_type: assessmentType, patient_id: id },
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { assessmentType }
      });

      reply.code(201);
      return {
        status: 201,
        message: 'Discharge assessment created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating discharge assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create transfer assessment
   * POST /patients/:id/hope-assessments/transfer
   *
   * CMS Reference: 42 CFR § 418.54 - Transfer assessment within 2 days
   */
  async createTransferAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const assessmentType = 'TRANSFER';

      // Validate clinician authorization
      const authCheck = CMSValidationService.validateClinicianAuthorization(
        assessmentType,
        request.user?.role
      );
      if (!authCheck.authorized) {
        reply.code(403);
        return {
          status: 403,
          message: 'Not authorized to create this assessment type',
          error: authCheck.error
        };
      }

      const assessmentDate = new Date();
      const transferDate = data.a0270_discharge_date ? new Date(data.a0270_discharge_date) : assessmentDate;

      // Calculate due date (2 days from transfer)
      const dueDate = new Date(transferDate);
      dueDate.setDate(dueDate.getDate() + 2);

      // Check for duplicate assessment
      const duplicateCheck = await CMSValidationService.checkDuplicateAssessment(
        parseInt(id),
        assessmentType,
        assessmentDate
      );
      if (duplicateCheck.isDuplicate) {
        reply.code(409);
        return {
          status: 409,
          message: 'Duplicate assessment exists for this patient and time period',
          error: {
            code: 'DUPLICATE_ASSESSMENT',
            existingAssessmentId: duplicateCheck.existingAssessment?.id,
            message: `A ${assessmentType} assessment already exists for this patient on this date`
          }
        };
      }

      // Set reference date if not provided
      const referenceDate = data.a0310_assessment_reference_date || assessmentDate;

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: assessmentType,
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          a0310_assessment_reference_date: referenceDate,
          a0270_discharge_date: transferDate,
          a0200_assessment_type_code: '06', // 06 = Transfer
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'CREATE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: result[0].id,
        newValue: { assessment_type: assessmentType, patient_id: id },
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { assessmentType }
      });

      reply.code(201);
      return {
        status: 201,
        message: 'Transfer assessment created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating transfer assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create resumption of care assessment
   * POST /patients/:id/hope-assessments/resumption
   *
   * CMS Reference: 42 CFR § 418.54 - Resumption assessment within 5 days
   */
  async createResumptionAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const assessmentType = 'RESUMPTION';

      // Validate clinician authorization
      const authCheck = CMSValidationService.validateClinicianAuthorization(
        assessmentType,
        request.user?.role
      );
      if (!authCheck.authorized) {
        reply.code(403);
        return {
          status: 403,
          message: 'Not authorized to create this assessment type',
          error: authCheck.error
        };
      }

      const assessmentDate = new Date();
      const resumptionDate = data.resumption_date ? new Date(data.resumption_date) : assessmentDate;

      // Calculate due date (5 days from resumption)
      const dueDate = new Date(resumptionDate);
      dueDate.setDate(dueDate.getDate() + 5);

      // Check for duplicate assessment
      const duplicateCheck = await CMSValidationService.checkDuplicateAssessment(
        parseInt(id),
        assessmentType,
        assessmentDate
      );
      if (duplicateCheck.isDuplicate) {
        reply.code(409);
        return {
          status: 409,
          message: 'Duplicate assessment exists for this patient and time period',
          error: {
            code: 'DUPLICATE_ASSESSMENT',
            existingAssessmentId: duplicateCheck.existingAssessment?.id,
            message: `A ${assessmentType} assessment already exists for this patient on this date`
          }
        };
      }

      // Set reference date if not provided
      const referenceDate = data.a0310_assessment_reference_date || assessmentDate;

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: assessmentType,
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          a0310_assessment_reference_date: referenceDate,
          a0200_assessment_type_code: '04', // 04 = Resumption of care
          a0250_assessment_reason: '03', // 03 = Unscheduled
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'CREATE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: result[0].id,
        newValue: { assessment_type: assessmentType, patient_id: id },
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { assessmentType }
      });

      reply.code(201);
      return {
        status: 201,
        message: 'Resumption of care assessment created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating resumption assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create recertification assessment
   * POST /patients/:id/hope-assessments/recertification
   *
   * CMS Reference: 42 CFR § 418.54 - Recertification assessment within 5 days
   */
  async createRecertificationAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const assessmentType = 'RECERTIFICATION';

      // Validate clinician authorization
      const authCheck = CMSValidationService.validateClinicianAuthorization(
        assessmentType,
        request.user?.role
      );
      if (!authCheck.authorized) {
        reply.code(403);
        return {
          status: 403,
          message: 'Not authorized to create this assessment type',
          error: authCheck.error
        };
      }

      const assessmentDate = new Date();
      const recertDate = data.recertification_date ? new Date(data.recertification_date) : assessmentDate;

      // Calculate due date (5 days from recertification)
      const dueDate = new Date(recertDate);
      dueDate.setDate(dueDate.getDate() + 5);

      // Check for duplicate assessment
      const duplicateCheck = await CMSValidationService.checkDuplicateAssessment(
        parseInt(id),
        assessmentType,
        assessmentDate
      );
      if (duplicateCheck.isDuplicate) {
        reply.code(409);
        return {
          status: 409,
          message: 'Duplicate assessment exists for this patient and time period',
          error: {
            code: 'DUPLICATE_ASSESSMENT',
            existingAssessmentId: duplicateCheck.existingAssessment?.id,
            message: `A ${assessmentType} assessment already exists for this patient on this date`
          }
        };
      }

      // Set reference date if not provided
      const referenceDate = data.a0310_assessment_reference_date || assessmentDate;

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: assessmentType,
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          a0310_assessment_reference_date: referenceDate,
          a0200_assessment_type_code: '05', // 05 = Recertification
          a0250_assessment_reason: '02', // 02 = Scheduled
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'CREATE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: result[0].id,
        newValue: { assessment_type: assessmentType, patient_id: id },
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { assessmentType }
      });

      reply.code(201);
      return {
        status: 201,
        message: 'Recertification assessment created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating recertification assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create symptom follow-up visit (within 48hrs of moderate/severe symptoms)
   * POST /patients/:id/hope-assessments/sfv
   *
   * CMS Reference: 42 CFR § 418.56 - SFV within 48 hours of symptom report
   */
  async createSFVAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const assessmentType = 'SYMPTOM_FOLLOWUP';

      // Validate clinician authorization
      const authCheck = CMSValidationService.validateClinicianAuthorization(
        assessmentType,
        request.user?.role
      );
      if (!authCheck.authorized) {
        reply.code(403);
        return {
          status: 403,
          message: 'Not authorized to create this assessment type',
          error: authCheck.error
        };
      }

      // Validate that trigger symptoms are provided
      if (!data.sfv_trigger_symptoms) {
        reply.code(400);
        return {
          status: 400,
          message: 'SFV trigger symptoms are required',
          error: {
            code: 'MISSING_SFV_TRIGGER',
            message: 'Symptom follow-up visits require documentation of the triggering symptoms',
            cfrReference: '42 CFR § 418.56'
          }
        };
      }

      // Calculate due date (48 hours from symptom occurrence)
      const assessmentDate = new Date();
      const triggerDate = data.sfv_trigger_date ? new Date(data.sfv_trigger_date) : assessmentDate;
      const dueDate = new Date(triggerDate);
      dueDate.setHours(dueDate.getHours() + 48);

      // Validate timing
      const timingValidation = CMSValidationService.validateTiming(
        assessmentType,
        assessmentDate,
        null,
        triggerDate
      );

      // Set reference date if not provided
      const referenceDate = data.a0310_assessment_reference_date || assessmentDate;

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: assessmentType,
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          a0310_assessment_reference_date: referenceDate,
          sfv_triggered: true,
          sfv_trigger_date: triggerDate,
          sfv_due_date: dueDate,
          a0250_assessment_reason: '03', // 03 = Unscheduled
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'CREATE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: result[0].id,
        newValue: { assessment_type: assessmentType, patient_id: id, sfv_trigger_symptoms: data.sfv_trigger_symptoms },
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { assessmentType, cmsCompliant: timingValidation.valid }
      });

      reply.code(201);
      return {
        status: 201,
        message: 'Symptom follow-up assessment created',
        data: result[0],
        validation: {
          timingWarnings: timingValidation.warnings,
          timingErrors: timingValidation.errors
        }
      };
    } catch (error) {
      logger.error('Error creating SFV assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get assessment by ID
   * GET /hope-assessments/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update assessment
   * PATCH /hope-assessments/:id
   *
   * CMS Reference: 21 CFR Part 11 - Electronic Records (locking after signature)
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          i0010_principal_diagnosis_icd10: hope_assessments.i0010_principal_diagnosis_icd10,
          deleted_at: hope_assessments.deleted_at
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      // Check if deleted (soft delete)
      if (existing[0].deleted_at) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment has been deleted'
        };
      }

      // Use CMS validation service to check if modification is allowed
      const modCheck = CMSValidationService.checkModificationAllowed(existing[0]);
      if (!modCheck.canModify) {
        reply.code(403);
        return {
          status: 403,
          message: 'Assessment cannot be modified',
          error: modCheck.reason
        };
      }

      // Validate ICD-10 code if provided
      if (data.i0010_principal_diagnosis_icd10) {
        const icd10Validation = CMSValidationService.validateICD10Code(data.i0010_principal_diagnosis_icd10);
        if (!icd10Validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid ICD-10 code format',
            error: icd10Validation.error
          };
        }
      }

      // Store old values for audit log
      const oldValues = { ...existing[0] };

      const result = await db
        .update(hope_assessments)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(hope_assessments.id, parseInt(id)))
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'UPDATE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: id,
        oldValue: oldValues,
        newValue: data,
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Assessment updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete assessment (soft delete)
   * DELETE /hope-assessments/:id
   *
   * CMS Reference: 42 CFR § 418.310 - Record retention requirements
   * Note: Assessments are soft-deleted to maintain audit trail
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          deleted_at: hope_assessments.deleted_at
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      // Already deleted
      if (existing[0].deleted_at) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment has already been deleted'
        };
      }

      // Cannot delete signed or submitted assessments per 21 CFR Part 11
      const protectedStatuses = ['SIGNED', 'SUBMITTED', 'ACCEPTED'];
      if (protectedStatuses.includes(existing[0].assessment_status)) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete signed or submitted assessments',
          error: {
            code: 'DELETE_PROTECTED',
            message: `Assessments with status '${existing[0].assessment_status}' are protected and cannot be deleted per 21 CFR Part 11`,
            cfrReference: '21 CFR Part 11 - Electronic Records'
          }
        };
      }

      // Perform soft delete
      const result = await db
        .update(hope_assessments)
        .set({
          deleted_at: new Date(),
          assessment_status: 'LOCKED',
          z0300_record_status: 'INACTIVE',
          z0300_inactivation_reason: `Deleted by user ${request.user?.id} on ${new Date().toISOString()}`,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(hope_assessments.id, parseInt(id)))
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'DELETE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: id,
        oldValue: { assessment_status: existing[0].assessment_status },
        newValue: { deleted: true, assessment_status: 'LOCKED' },
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { softDelete: true }
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Assessment deleted successfully',
        data: {
          id: result[0].id,
          deleted_at: result[0].deleted_at
        }
      };
    } catch (error) {
      logger.error('Error deleting assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Validate assessment for CMS compliance
   * POST /hope-assessments/:id/validate
   *
   * Runs all CMS validation checks and returns detailed results
   */
  async validate(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      const assessment = existing[0];
      const validationResults = {
        isValid: true,
        errors: [],
        warnings: [],
        cmsCompliant: true
      };

      // Validate required fields
      const fieldValidation = CMSValidationService.validateRequiredFields(
        assessment.assessment_type,
        assessment
      );
      if (!fieldValidation.valid) {
        validationResults.isValid = false;
        validationResults.errors.push(...fieldValidation.errors);
      }

      // Validate ICD-10 code
      if (assessment.i0010_principal_diagnosis_icd10) {
        const icd10Validation = CMSValidationService.validateICD10Code(
          assessment.i0010_principal_diagnosis_icd10
        );
        if (!icd10Validation.valid) {
          validationResults.errors.push(icd10Validation.error);
          validationResults.isValid = false;
        }
      }

      // Validate timing
      const timingValidation = CMSValidationService.validateTiming(
        assessment.assessment_type,
        assessment.assessment_date,
        assessment.a0220_admission_date,
        assessment.a0270_discharge_date || assessment.sfv_trigger_date
      );
      if (!timingValidation.valid) {
        validationResults.errors.push(...timingValidation.errors);
        validationResults.cmsCompliant = false;
      }
      if (timingValidation.warnings.length > 0) {
        validationResults.warnings.push(...timingValidation.warnings);
      }

      // Check modification status
      const modCheck = CMSValidationService.checkModificationAllowed(assessment);
      if (!modCheck.canModify) {
        validationResults.warnings.push({
          code: 'LOCKED_FOR_MODIFICATION',
          message: 'Assessment is locked and cannot be modified',
          reason: modCheck.reason
        });
      }

      reply.code(200);
      return {
        status: 200,
        message: validationResults.isValid ? 'Assessment is valid' : 'Assessment has validation errors',
        data: validationResults
      };
    } catch (error) {
      logger.error('Error validating assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error validating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign assessment (21 CFR Part 11 compliance)
   * POST /hope-assessments/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      if (existing[0].assessment_status === 'SIGNED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Assessment already signed'
        };
      }

      // Generate signature hash (SHA-256 of assessment data)
      const dataToSign = JSON.stringify({
        id: existing[0].id,
        patient_id: existing[0].patient_id,
        assessment_type: existing[0].assessment_type,
        assessment_date: existing[0].assessment_date,
        completed_date: new Date().toISOString()
      });
      const signatureHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

      const signature = {
        signedBy: request.user?.id,
        signedByName: `${request.user?.firstName} ${request.user?.lastName}`,
        signedAt: new Date().toISOString(),
        signatureType: 'ELECTRONIC',
        signatureHash: signatureHash,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        meaning: 'Signature attesting to the accuracy and completeness of this HOPE assessment',
        credentials: request.user?.role || 'Unknown'
      };

      const result = await db
        .update(hope_assessments)
        .set({
          signature: signature,
          assessment_status: 'SIGNED',
          completed_date: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(hope_assessments.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Submit assessment to iQIES (CMS system)
   * POST /hope-assessments/:id/submit
   */
  async submit(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      if (existing[0].assessment_status !== 'SIGNED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Assessment must be signed before submission'
        };
      }

      // Create submission record
      const submissionPayload = {
        assessment_id: existing[0].id,
        patient_id: existing[0].patient_id,
        assessment_type: existing[0].assessment_type,
        assessment_date: existing[0].assessment_date,
        // ... full HOPE data would go here
        submitted_at: new Date().toISOString()
      };

      const submission = await db
        .insert(hope_submissions)
        .values({
          hope_assessment_id: parseInt(id),
          patient_id: existing[0].patient_id,
          submission_date: new Date(),
          submission_type: 'INITIAL',
          submission_status: 'PENDING',
          submission_payload: submissionPayload,
          submitted_by_id: request.user?.id
        })
        .returning();

      // Update assessment status
      await db
        .update(hope_assessments)
        .set({
          assessment_status: 'SUBMITTED',
          submitted_to_iqies: true,
          submission_id: submission[0].id.toString(),
          submission_date: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(hope_assessments.id, parseInt(id)));

      // TODO: Actual iQIES integration would happen here
      // This would involve calling the CMS iQIES API

      reply.code(200);
      return {
        status: 200,
        message: 'Assessment submitted to iQIES',
        data: {
          assessment: existing[0],
          submission: submission[0]
        }
      };
    } catch (error) {
      logger.error('Error submitting assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error submitting assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get pending assessments (not yet completed)
   * GET /hope-assessments/pending
   */
  async getPending(request, reply) {
    try {
      const assessments = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(
          or(
            eq(hope_assessments.assessment_status, 'NOT_STARTED'),
            eq(hope_assessments.assessment_status, 'IN_PROGRESS')
          )
        )
        .orderBy(hope_assessments.due_date);

      reply.code(200);
      return {
        status: 200,
        data: assessments,
        count: assessments.length
      };
    } catch (error) {
      logger.error('Error fetching pending assessments:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get overdue assessments (past due date)
   * GET /hope-assessments/overdue
   */
  async getOverdue(request, reply) {
    try {
      const now = new Date();

      const assessments = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(
          and(
            lte(hope_assessments.due_date, now),
            or(
              eq(hope_assessments.assessment_status, 'NOT_STARTED'),
              eq(hope_assessments.assessment_status, 'IN_PROGRESS')
            )
          )
        )
        .orderBy(hope_assessments.due_date);

      reply.code(200);
      return {
        status: 200,
        data: assessments,
        count: assessments.length
      };
    } catch (error) {
      logger.error('Error fetching overdue assessments:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get compliance metrics (90% threshold requirement)
   * GET /hope-assessments/compliance
   */
  async getCompliance(request, reply) {
    try {
      const { period_start, period_end, assessment_type } = request.query;

      let query = db.select({
        id: hope_compliance_metrics.id,
        reporting_period_start: hope_compliance_metrics.reporting_period_start,
        reporting_period_end: hope_compliance_metrics.reporting_period_end,
        reporting_year: hope_compliance_metrics.reporting_year,
        reporting_quarter: hope_compliance_metrics.reporting_quarter,
        assessment_type: hope_compliance_metrics.assessment_type,
        total_required: hope_compliance_metrics.total_required,
        total_completed: hope_compliance_metrics.total_completed,
        total_completed_timely: hope_compliance_metrics.total_completed_timely,
        total_overdue: hope_compliance_metrics.total_overdue,
        total_missing: hope_compliance_metrics.total_missing,
        completion_rate: hope_compliance_metrics.completion_rate,
        timeliness_rate: hope_compliance_metrics.timeliness_rate,
        compliance_rate: hope_compliance_metrics.compliance_rate,
        meets_threshold: hope_compliance_metrics.meets_threshold,
        penalty_applied: hope_compliance_metrics.penalty_applied,
        penalty_amount: hope_compliance_metrics.penalty_amount,
        status_breakdown: hope_compliance_metrics.status_breakdown,
        notes: hope_compliance_metrics.notes,
        action_plan: hope_compliance_metrics.action_plan,
        calculated_by_id: hope_compliance_metrics.calculated_by_id,
        createdAt: hope_compliance_metrics.createdAt,
        updatedAt: hope_compliance_metrics.updatedAt
      }).from(hope_compliance_metrics);

      if (period_start && period_end) {
        query = query.where(
          and(
            gte(hope_compliance_metrics.reporting_period_start, new Date(period_start)),
            lte(hope_compliance_metrics.reporting_period_end, new Date(period_end))
          )
        );
      }

      if (assessment_type) {
        query = query.where(eq(hope_compliance_metrics.assessment_type, assessment_type));
      }

      const metrics = await query.orderBy(desc(hope_compliance_metrics.reporting_period_end));

      reply.code(200);
      return {
        status: 200,
        data: metrics
      };
    } catch (error) {
      logger.error('Error fetching compliance metrics:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching compliance metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // ADDITIONAL REST API ENDPOINTS
  // ============================================================================

  /**
   * Create a new assessment (generic endpoint)
   * POST /assessments
   *
   * Creates a new HOPE assessment with automatic CMS validation
   * Supports all assessment types via request body
   */
  async create(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.patient_id) {
        reply.code(400);
        return {
          status: 400,
          message: 'Validation error',
          error: {
            code: 'MISSING_PATIENT_ID',
            message: 'patient_id is required'
          }
        };
      }

      if (!data.assessment_type) {
        reply.code(400);
        return {
          status: 400,
          message: 'Validation error',
          error: {
            code: 'MISSING_ASSESSMENT_TYPE',
            message: 'assessment_type is required'
          }
        };
      }

      // Validate assessment type
      if (!VALID_ASSESSMENT_TYPES.includes(data.assessment_type)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid assessment type',
          error: {
            code: 'INVALID_ASSESSMENT_TYPE',
            message: `assessment_type must be one of: ${VALID_ASSESSMENT_TYPES.join(', ')}`
          }
        };
      }

      // Validate clinician authorization
      const authCheck = CMSValidationService.validateClinicianAuthorization(
        data.assessment_type,
        request.user?.role
      );
      if (!authCheck.authorized) {
        reply.code(403);
        return {
          status: 403,
          message: 'Not authorized to create this assessment type',
          error: authCheck.error
        };
      }

      const assessmentDate = data.assessment_date ? new Date(data.assessment_date) : new Date();
      const admissionDate = data.a0220_admission_date ? new Date(data.a0220_admission_date) : assessmentDate;

      // Check for duplicate assessment
      const duplicateCheck = await CMSValidationService.checkDuplicateAssessment(
        parseInt(data.patient_id),
        data.assessment_type,
        assessmentDate
      );
      if (duplicateCheck.isDuplicate) {
        reply.code(409);
        return {
          status: 409,
          message: 'Duplicate assessment exists for this patient and time period',
          error: {
            code: 'DUPLICATE_ASSESSMENT',
            existingAssessmentId: duplicateCheck.existingAssessment?.id,
            message: `A ${data.assessment_type} assessment already exists for this patient on this date`
          }
        };
      }

      // Calculate due date based on assessment type
      let dueDate;
      const timingRules = ASSESSMENT_TIMING_RULES[data.assessment_type];
      if (timingRules) {
        dueDate = new Date(admissionDate);
        if (timingRules.windowDays) {
          dueDate.setDate(dueDate.getDate() + timingRules.windowDays);
        } else if (timingRules.windowEndDay) {
          dueDate.setDate(dueDate.getDate() + timingRules.windowEndDay);
        } else if (timingRules.windowHours) {
          dueDate.setHours(dueDate.getHours() + timingRules.windowHours);
        }
      }

      // Validate timing
      const timingValidation = CMSValidationService.validateTiming(
        data.assessment_type,
        assessmentDate,
        admissionDate,
        data.a0270_discharge_date || data.sfv_trigger_date
      );

      // Validate required fields for assessment type
      const fieldValidation = CMSValidationService.validateRequiredFields(
        data.assessment_type,
        data
      );

      // Set reference date if not provided
      const referenceDate = data.a0310_assessment_reference_date || assessmentDate;

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(data.patient_id),
          assessment_type: data.assessment_type,
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          a0310_assessment_reference_date: referenceDate,
          a0220_admission_date: admissionDate,
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'CREATE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: result[0].id,
        newValue: { assessment_type: data.assessment_type, patient_id: data.patient_id },
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { assessmentType: data.assessment_type, cmsCompliant: timingValidation.valid }
      });

      reply.code(201);
      return {
        status: 201,
        message: 'Assessment created successfully',
        data: result[0],
        validation: {
          timingWarnings: timingValidation.warnings,
          timingErrors: timingValidation.errors,
          fieldErrors: fieldValidation.errors
        }
      };
    } catch (error) {
      logger.error('Error creating assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * List all assessments with filters and pagination
   * GET /assessments
   *
   * Supports filtering by:
   * - patient_id: Filter by patient
   * - assessment_type: Filter by type (ADMISSION, HUV1, etc.)
   * - assessment_status: Filter by status
   * - date_from, date_to: Date range filter
   * - compliance_status: Filter by CMS compliance status
   * - limit, offset: Pagination
   * - sort_by, sort_order: Sorting
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        assessment_type,
        assessment_status,
        date_from,
        date_to,
        compliance_status,
        limit = 50,
        offset = 0,
        sort_by = 'assessment_date',
        sort_order = 'desc'
      } = request.query;

      // Build conditions
      const conditions = [isNull(hope_assessments.deleted_at)];

      if (patient_id) {
        conditions.push(eq(hope_assessments.patient_id, parseInt(patient_id)));
      }

      if (assessment_type) {
        conditions.push(eq(hope_assessments.assessment_type, assessment_type));
      }

      if (assessment_status) {
        conditions.push(eq(hope_assessments.assessment_status, assessment_status));
      }

      if (date_from) {
        conditions.push(gte(hope_assessments.assessment_date, new Date(date_from)));
      }

      if (date_to) {
        conditions.push(lte(hope_assessments.assessment_date, new Date(date_to)));
      }

      // Determine sort column
      let sortColumn;
      switch (sort_by) {
        case 'due_date':
          sortColumn = hope_assessments.due_date;
          break;
        case 'created_at':
          sortColumn = hope_assessments.createdAt;
          break;
        case 'updated_at':
          sortColumn = hope_assessments.updatedAt;
          break;
        case 'assessment_type':
          sortColumn = hope_assessments.assessment_type;
          break;
        case 'assessment_status':
          sortColumn = hope_assessments.assessment_status;
          break;
        default:
          sortColumn = hope_assessments.assessment_date;
      }

      const sortOrder = sort_order === 'asc' ? sortColumn : desc(sortColumn);

      // Get total count
      const countResult = await db
        .select({ count: sql`count(*)::int` })
        .from(hope_assessments)
        .where(and(...conditions));

      const total = countResult[0]?.count || 0;

      // Get paginated results
      const assessments = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          primary_diagnosis: hope_assessments.i0010_principal_diagnosis_icd10,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.z0200_submitted_to_iqies,
          submission_id: hope_assessments.z0200_submission_id,
          submission_date: hope_assessments.z0200_submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(and(...conditions))
        .orderBy(sortOrder)
        .limit(Math.min(parseInt(limit), 100))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: assessments,
        pagination: {
          total,
          limit: Math.min(parseInt(limit), 100),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + assessments.length < total
        }
      };
    } catch (error) {
      logger.error('Error listing assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error listing assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Full update of an assessment
   * PUT /assessments/:id
   *
   * Replaces the entire assessment (all fields must be provided)
   * CMS Reference: 21 CFR Part 11 - Electronic Records (locking after signature)
   */
  async replace(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          deleted_at: hope_assessments.deleted_at
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      if (existing[0].deleted_at) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment has been deleted'
        };
      }

      // Check if modification is allowed
      const modCheck = CMSValidationService.checkModificationAllowed(existing[0]);
      if (!modCheck.canModify) {
        reply.code(403);
        return {
          status: 403,
          message: 'Assessment cannot be modified',
          error: modCheck.reason
        };
      }

      // Validate ICD-10 code if provided
      if (data.i0010_principal_diagnosis_icd10) {
        const icd10Validation = CMSValidationService.validateICD10Code(data.i0010_principal_diagnosis_icd10);
        if (!icd10Validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid ICD-10 code format',
            error: icd10Validation.error
          };
        }
      }

      // Store old values for audit log
      const oldValues = { ...existing[0] };

      // Perform full update
      const result = await db
        .update(hope_assessments)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(hope_assessments.id, parseInt(id)))
        .returning();

      // Create audit log entry
      await createAuditLog({
        userId: request.user?.id,
        action: 'REPLACE_HOPE_ASSESSMENT',
        resourceType: 'hope_assessment',
        resourceId: id,
        oldValue: oldValues,
        newValue: data,
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Assessment replaced successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error replacing assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error replacing assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get assessment version history
   * GET /assessments/:id/history
   *
   * Retrieves complete version history from audit logs
   * CMS Reference: 42 CFR § 418.310 - Record retention requirements
   */
  async getHistory(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select({ id: hope_assessments.id })
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      // Get history from audit logs
      const history = await db
        .select({
          id: audit_logs.id,
          action: audit_logs.action,
          old_value: audit_logs.old_value,
          new_value: audit_logs.new_value,
          user_id: audit_logs.user_id,
          ip_address: audit_logs.ip_address,
          status: audit_logs.status,
          metadata: audit_logs.metadata,
          createdAt: audit_logs.createdAt
        })
        .from(audit_logs)
        .where(
          and(
            eq(audit_logs.resource_type, 'hope_assessment'),
            eq(audit_logs.resource_id, id.toString())
          )
        )
        .orderBy(desc(audit_logs.createdAt));

      reply.code(200);
      return {
        status: 200,
        data: {
          assessment_id: parseInt(id),
          version_count: history.length,
          history: history
        }
      };
    } catch (error) {
      logger.error('Error fetching assessment history:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessment history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get detailed CMS compliance status for an assessment
   * GET /assessments/:id/cms-compliance
   *
   * Returns comprehensive compliance check with missing requirements
   */
  async getCMSComplianceStatus(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      const assessment = existing[0];
      const complianceStatus = {
        assessment_id: assessment.id,
        assessment_type: assessment.assessment_type,
        overall_compliant: true,
        compliance_score: 100,
        checks: [],
        missing_requirements: [],
        warnings: [],
        cms_references: []
      };

      // 1. Required Fields Check
      const fieldValidation = CMSValidationService.validateRequiredFields(
        assessment.assessment_type,
        assessment
      );
      if (!fieldValidation.valid) {
        complianceStatus.overall_compliant = false;
        complianceStatus.checks.push({
          category: 'Required Fields',
          passed: false,
          errors: fieldValidation.errors
        });
        complianceStatus.missing_requirements.push(...fieldValidation.errors.map(e => ({
          field: e.field,
          description: e.message,
          cfrReference: e.cfrReference
        })));
        complianceStatus.compliance_score -= 20;
      } else {
        complianceStatus.checks.push({
          category: 'Required Fields',
          passed: true,
          message: 'All required fields present'
        });
      }

      // 2. Timing Check
      const timingValidation = CMSValidationService.validateTiming(
        assessment.assessment_type,
        assessment.assessment_date,
        assessment.a0220_admission_date,
        assessment.a0270_discharge_date || assessment.sfv_trigger_date
      );
      if (!timingValidation.valid) {
        complianceStatus.overall_compliant = false;
        complianceStatus.checks.push({
          category: 'Assessment Timing',
          passed: false,
          errors: timingValidation.errors
        });
        complianceStatus.compliance_score -= 30;
        complianceStatus.cms_references.push('42 CFR § 418.54');
      } else {
        complianceStatus.checks.push({
          category: 'Assessment Timing',
          passed: true,
          message: 'Assessment completed within required timeframe'
        });
      }
      if (timingValidation.warnings.length > 0) {
        complianceStatus.warnings.push(...timingValidation.warnings);
      }

      // 3. ICD-10 Validation
      if (assessment.i0010_principal_diagnosis_icd10) {
        const icd10Validation = CMSValidationService.validateICD10Code(
          assessment.i0010_principal_diagnosis_icd10
        );
        if (!icd10Validation.valid) {
          complianceStatus.overall_compliant = false;
          complianceStatus.checks.push({
            category: 'ICD-10 Code',
            passed: false,
            error: icd10Validation.error
          });
          complianceStatus.compliance_score -= 15;
        } else {
          complianceStatus.checks.push({
            category: 'ICD-10 Code',
            passed: true,
            message: 'Valid ICD-10-CM code format'
          });
        }
      }

      // 4. Signature Check (21 CFR Part 11)
      if (assessment.signature) {
        complianceStatus.checks.push({
          category: 'Electronic Signature',
          passed: true,
          message: '21 CFR Part 11 compliant electronic signature present',
          details: {
            signedBy: assessment.signature.signedByName,
            signedAt: assessment.signature.signedAt,
            signatureType: assessment.signature.signatureType
          }
        });
        complianceStatus.cms_references.push('21 CFR Part 11');
      } else if (['COMPLETED', 'SIGNED', 'SUBMITTED'].includes(assessment.assessment_status)) {
        complianceStatus.overall_compliant = false;
        complianceStatus.checks.push({
          category: 'Electronic Signature',
          passed: false,
          error: 'Assessment status indicates completion but signature is missing'
        });
        complianceStatus.missing_requirements.push({
          field: 'signature',
          description: 'Electronic signature required for completed assessments',
          cfrReference: '21 CFR Part 11'
        });
        complianceStatus.compliance_score -= 25;
      }

      // 5. Submission Status Check
      if (assessment.z0200_submitted_to_iqies) {
        complianceStatus.checks.push({
          category: 'CMS Submission',
          passed: true,
          message: 'Assessment submitted to iQIES',
          details: {
            submission_id: assessment.z0200_submission_id,
            submission_date: assessment.z0200_submission_date,
            status: assessment.z0200_submission_status
          }
        });
      } else if (assessment.due_date) {
        const now = new Date();
        const dueDate = new Date(assessment.due_date);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
          complianceStatus.warnings.push({
            category: 'CMS Submission',
            message: `Assessment is ${Math.abs(daysUntilDue)} days past due date`,
            cfrReference: '42 CFR § 418.54'
          });
        } else if (daysUntilDue <= 7) {
          complianceStatus.warnings.push({
            category: 'CMS Submission',
            message: `Assessment due in ${daysUntilDue} days`,
            cfrReference: '42 CFR § 418.54'
          });
        }
      }

      // Calculate final compliance score (minimum 0)
      complianceStatus.compliance_score = Math.max(0, complianceStatus.compliance_score);

      // Add standard CMS references
      complianceStatus.cms_references = [...new Set([
        ...complianceStatus.cms_references,
        '42 CFR § 418.54 - Initial and Comprehensive Assessment',
        '42 CFR § 418.56 - Hospice Aide and Homemaker Services',
        '42 CFR § 418.76 - Hospice Care Team'
      ])];

      reply.code(200);
      return {
        status: 200,
        data: complianceStatus
      };
    } catch (error) {
      logger.error('Error checking CMS compliance:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error checking CMS compliance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get CMS requirements by assessment type
   * GET /cms-requirements
   *
   * Returns current CMS requirement rules for different assessment types
   */
  async getCMSRequirements(request, reply) {
    try {
      const { assessment_type } = request.query;

      const requirements = {};

      const typesToInclude = assessment_type
        ? [assessment_type]
        : VALID_ASSESSMENT_TYPES;

      for (const type of typesToInclude) {
        requirements[type] = {
          assessment_type: type,
          timing_rules: ASSESSMENT_TIMING_RULES[type] || null,
          required_fields: REQUIRED_FIELDS_BY_TYPE[type] || [],
          authorized_clinicians: AUTHORIZED_CLINICIAN_TYPES[type] || [],
          cms_references: [
            '42 CFR § 418.54 - Condition of Participation: Initial and Comprehensive Assessment',
            '42 CFR § 418.56 - Condition of Participation: Hospice Aide and Homemaker Services',
            '42 CFR § 418.76 - Condition of Participation: Hospice Care Team',
            '21 CFR Part 11 - Electronic Records; Electronic Signatures'
          ],
          compliance_threshold: 90, // 90% completion required
          penalty_for_non_compliance: '4% Medicare payment reduction',
          effective_date: '2025-10-01' // HOPE 2.0 effective date
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: requirements,
        metadata: {
          valid_assessment_types: VALID_ASSESSMENT_TYPES,
          valid_statuses: VALID_STATUSES,
          hope_version: '2.0',
          effective_date: '2025-10-01'
        }
      };
    } catch (error) {
      logger.error('Error fetching CMS requirements:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching CMS requirements',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get aggregate compliance dashboard data
   * GET /reports/compliance
   *
   * Returns aggregate compliance data for dashboard display
   * Filters: date range, facility, assessment type
   */
  async getComplianceDashboard(request, reply) {
    try {
      const {
        date_from,
        date_to,
        assessment_type,
        group_by = 'assessment_type'
      } = request.query;

      // Build date conditions
      const dateConditions = [isNull(hope_assessments.deleted_at)];
      if (date_from) {
        dateConditions.push(gte(hope_assessments.assessment_date, new Date(date_from)));
      }
      if (date_to) {
        dateConditions.push(lte(hope_assessments.assessment_date, new Date(date_to)));
      }
      if (assessment_type) {
        dateConditions.push(eq(hope_assessments.assessment_type, assessment_type));
      }

      // Get overall statistics
      const totalStats = await db
        .select({
          total: sql`count(*)::int`,
          completed: sql`count(*) filter (where assessment_status in ('COMPLETED', 'SIGNED', 'SUBMITTED', 'ACCEPTED'))::int`,
          pending: sql`count(*) filter (where assessment_status in ('NOT_STARTED', 'IN_PROGRESS'))::int`,
          overdue: sql`count(*) filter (where due_date < now() and assessment_status in ('NOT_STARTED', 'IN_PROGRESS'))::int`,
          submitted: sql`count(*) filter (where z0200_submitted_to_iqies = true)::int`,
          signed: sql`count(*) filter (where signature is not null)::int`
        })
        .from(hope_assessments)
        .where(and(...dateConditions));

      // Get statistics by assessment type
      const typeStats = await db
        .select({
          assessment_type: hope_assessments.assessment_type,
          total: sql`count(*)::int`,
          completed: sql`count(*) filter (where assessment_status in ('COMPLETED', 'SIGNED', 'SUBMITTED', 'ACCEPTED'))::int`,
          pending: sql`count(*) filter (where assessment_status in ('NOT_STARTED', 'IN_PROGRESS'))::int`,
          overdue: sql`count(*) filter (where due_date < now() and assessment_status in ('NOT_STARTED', 'IN_PROGRESS'))::int`
        })
        .from(hope_assessments)
        .where(and(...dateConditions))
        .groupBy(hope_assessments.assessment_type);

      // Get statistics by status
      const statusStats = await db
        .select({
          assessment_status: hope_assessments.assessment_status,
          count: sql`count(*)::int`
        })
        .from(hope_assessments)
        .where(and(...dateConditions))
        .groupBy(hope_assessments.assessment_status);

      // Calculate compliance rate
      const stats = totalStats[0] || { total: 0, completed: 0, pending: 0, overdue: 0, submitted: 0, signed: 0 };
      const complianceRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      const meetsThreshold = complianceRate >= 90;

      // Get recent overdue assessments
      const overdueAssessments = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          due_date: hope_assessments.due_date,
          days_overdue: sql`extract(day from now() - due_date)::int`
        })
        .from(hope_assessments)
        .where(
          and(
            ...dateConditions,
            sql`due_date < now()`,
            or(
              eq(hope_assessments.assessment_status, 'NOT_STARTED'),
              eq(hope_assessments.assessment_status, 'IN_PROGRESS')
            )
          )
        )
        .orderBy(hope_assessments.due_date)
        .limit(10);

      reply.code(200);
      return {
        status: 200,
        data: {
          summary: {
            ...stats,
            compliance_rate: complianceRate,
            meets_threshold: meetsThreshold,
            threshold: 90,
            potential_penalty: meetsThreshold ? null : '4% Medicare payment reduction'
          },
          by_type: typeStats,
          by_status: statusStats,
          recent_overdue: overdueAssessments,
          period: {
            from: date_from || null,
            to: date_to || null
          },
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error generating compliance dashboard:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error generating compliance dashboard',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new HOPEAssessmentController();
