import { db } from '../../config/db.drizzle.js';
import {
  vital_signs,
  VITAL_SIGN_RANGES,
  VITAL_SIGN_VALID_RANGES,
  VITAL_SIGN_ALERT_THRESHOLDS,
  VITAL_SIGN_ERROR_CODES
} from '../../db/schemas/vitalSign.schema.js';
import { patients } from '../../db/schemas/index.js';
import { eq, and, desc, asc, sql, gte, lte, or, isNull, isNotNull, count } from 'drizzle-orm';
import { logger } from '../../utils/logger.js';
import AuditService from '../../services/AuditService.js';
import { ROLES } from '../../config/rbac.js';

/**
 * Vital Signs Controller
 * HIPAA-compliant vital signs management with comprehensive CRUD operations,
 * clinical validation, optimistic locking, soft delete, and audit logging.
 *
 * Features:
 * - Full CRUD operations with proper HTTP semantics
 * - Clinical validation with alerts for abnormal values
 * - Optimistic locking for concurrent modification detection
 * - Soft delete with audit trail
 * - Pagination with comprehensive metadata
 * - Role-based access control
 * - 21 CFR Part 11 compliance for electronic signatures
 */
class VitalSignsController {
  /**
   * Helper function to clean data - convert empty strings to null for numeric fields
   */
  cleanVitalSignData(data) {
    const cleaned = { ...data };

    // Integer fields - convert empty strings to null
    const integerFields = [
      'heart_rate',
      'bp_systolic',
      'bp_diastolic',
      'respiratory_rate',
      'bp_mmhg',
      'pain_score',
      'pain_post_intervention_score',
      'weight_change_period_days'
    ];

    // Decimal fields - convert empty strings to null
    const decimalFields = [
      'degrees_fahrenheit',
      'degrees_celsius',
      'pulse_oximetry_percentage',
      'oxygen_flow_rate',
      'body_height_inches',
      'body_height_cm',
      'body_weight_lbs',
      'body_weight_kg',
      'body_weight_ibs',
      'bmi_kg_m2',
      'bmi_percentage',
      'weight_change_percentage'
    ];

    // Clean integer fields
    integerFields.forEach(field => {
      if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {
        cleaned[field] = null;
      } else if (typeof cleaned[field] === 'string') {
        const parsed = parseInt(cleaned[field], 10);
        cleaned[field] = isNaN(parsed) ? null : parsed;
      }
    });

    // Clean decimal fields
    decimalFields.forEach(field => {
      if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {
        cleaned[field] = null;
      } else if (typeof cleaned[field] === 'string') {
        const parsed = parseFloat(cleaned[field]);
        cleaned[field] = isNaN(parsed) ? null : parsed;
      }
    });

    // Clean string fields - convert empty strings to null
    Object.keys(cleaned).forEach(key => {
      if (typeof cleaned[key] === 'string' && cleaned[key].trim() === '') {
        cleaned[key] = null;
      }
    });

    return cleaned;
  }

  /**
   * Convert temperature between Fahrenheit and Celsius
   */
  convertTemperature(value, fromUnit) {
    if (value === null || value === undefined) return null;
    const temp = parseFloat(value);
    if (isNaN(temp)) return null;

    if (fromUnit === 'C') {
      // Celsius to Fahrenheit
      return parseFloat((temp * 9 / 5 + 32).toFixed(2));
    } else {
      // Fahrenheit to Celsius
      return parseFloat(((temp - 32) * 5 / 9).toFixed(2));
    }
  }

  /**
   * Validate vital signs data against clinical ranges
   * Returns validation errors if any values are outside valid ranges
   */
  validateClinicalRanges(data) {
    const errors = [];
    const { VITAL_SIGN_VALID_RANGES: ranges } = { VITAL_SIGN_VALID_RANGES };

    // Validate temperature
    if (data.degrees_fahrenheit !== null && data.degrees_fahrenheit !== undefined) {
      const temp = parseFloat(data.degrees_fahrenheit);
      if (temp < VITAL_SIGN_VALID_RANGES.temperature_fahrenheit.min ||
          temp > VITAL_SIGN_VALID_RANGES.temperature_fahrenheit.max) {
        errors.push({
          field: 'degrees_fahrenheit',
          message: `Temperature must be between ${VITAL_SIGN_VALID_RANGES.temperature_fahrenheit.min}°F and ${VITAL_SIGN_VALID_RANGES.temperature_fahrenheit.max}°F`,
          code: VITAL_SIGN_ERROR_CODES.TEMPERATURE_OUT_OF_RANGE,
          rejectedValue: temp
        });
      }
    }

    if (data.degrees_celsius !== null && data.degrees_celsius !== undefined) {
      const temp = parseFloat(data.degrees_celsius);
      if (temp < VITAL_SIGN_VALID_RANGES.temperature_celsius.min ||
          temp > VITAL_SIGN_VALID_RANGES.temperature_celsius.max) {
        errors.push({
          field: 'degrees_celsius',
          message: `Temperature must be between ${VITAL_SIGN_VALID_RANGES.temperature_celsius.min}°C and ${VITAL_SIGN_VALID_RANGES.temperature_celsius.max}°C`,
          code: VITAL_SIGN_ERROR_CODES.TEMPERATURE_OUT_OF_RANGE,
          rejectedValue: temp
        });
      }
    }

    // Validate blood pressure
    if (data.bp_systolic !== null && data.bp_systolic !== undefined) {
      const sys = parseInt(data.bp_systolic);
      if (sys < VITAL_SIGN_VALID_RANGES.bp_systolic.min ||
          sys > VITAL_SIGN_VALID_RANGES.bp_systolic.max) {
        errors.push({
          field: 'bp_systolic',
          message: `Systolic BP must be between ${VITAL_SIGN_VALID_RANGES.bp_systolic.min} and ${VITAL_SIGN_VALID_RANGES.bp_systolic.max} mmHg`,
          code: VITAL_SIGN_ERROR_CODES.BP_OUT_OF_RANGE,
          rejectedValue: sys
        });
      }
    }

    if (data.bp_diastolic !== null && data.bp_diastolic !== undefined) {
      const dia = parseInt(data.bp_diastolic);
      if (dia < VITAL_SIGN_VALID_RANGES.bp_diastolic.min ||
          dia > VITAL_SIGN_VALID_RANGES.bp_diastolic.max) {
        errors.push({
          field: 'bp_diastolic',
          message: `Diastolic BP must be between ${VITAL_SIGN_VALID_RANGES.bp_diastolic.min} and ${VITAL_SIGN_VALID_RANGES.bp_diastolic.max} mmHg`,
          code: VITAL_SIGN_ERROR_CODES.BP_OUT_OF_RANGE,
          rejectedValue: dia
        });
      }
    }

    // Validate systolic > diastolic
    if (data.bp_systolic !== null && data.bp_diastolic !== null &&
        data.bp_systolic !== undefined && data.bp_diastolic !== undefined) {
      const sys = parseInt(data.bp_systolic);
      const dia = parseInt(data.bp_diastolic);
      if (sys <= dia) {
        errors.push({
          field: 'bp_systolic',
          message: 'Systolic BP must be greater than diastolic BP',
          code: VITAL_SIGN_ERROR_CODES.BP_SYSTOLIC_DIASTOLIC_INVALID,
          rejectedValue: { systolic: sys, diastolic: dia }
        });
      }
    }

    // Validate heart rate
    if (data.heart_rate !== null && data.heart_rate !== undefined) {
      const hr = parseInt(data.heart_rate);
      if (hr < VITAL_SIGN_VALID_RANGES.heart_rate.min ||
          hr > VITAL_SIGN_VALID_RANGES.heart_rate.max) {
        errors.push({
          field: 'heart_rate',
          message: `Heart rate must be between ${VITAL_SIGN_VALID_RANGES.heart_rate.min} and ${VITAL_SIGN_VALID_RANGES.heart_rate.max} bpm`,
          code: VITAL_SIGN_ERROR_CODES.HEART_RATE_OUT_OF_RANGE,
          rejectedValue: hr
        });
      }
    }

    // Validate respiratory rate
    if (data.respiratory_rate !== null && data.respiratory_rate !== undefined) {
      const rr = parseInt(data.respiratory_rate);
      if (rr < VITAL_SIGN_VALID_RANGES.respiratory_rate.min ||
          rr > VITAL_SIGN_VALID_RANGES.respiratory_rate.max) {
        errors.push({
          field: 'respiratory_rate',
          message: `Respiratory rate must be between ${VITAL_SIGN_VALID_RANGES.respiratory_rate.min} and ${VITAL_SIGN_VALID_RANGES.respiratory_rate.max} breaths/min`,
          code: VITAL_SIGN_ERROR_CODES.RESPIRATORY_RATE_OUT_OF_RANGE,
          rejectedValue: rr
        });
      }
    }

    // Validate oxygen saturation
    if (data.pulse_oximetry_percentage !== null && data.pulse_oximetry_percentage !== undefined) {
      const spo2 = parseFloat(data.pulse_oximetry_percentage);
      if (spo2 < VITAL_SIGN_VALID_RANGES.oxygen_saturation.min ||
          spo2 > VITAL_SIGN_VALID_RANGES.oxygen_saturation.max) {
        errors.push({
          field: 'pulse_oximetry_percentage',
          message: `Oxygen saturation must be between ${VITAL_SIGN_VALID_RANGES.oxygen_saturation.min}% and ${VITAL_SIGN_VALID_RANGES.oxygen_saturation.max}%`,
          code: VITAL_SIGN_ERROR_CODES.OXYGEN_SATURATION_OUT_OF_RANGE,
          rejectedValue: spo2
        });
      }
    }

    // Validate notes length
    if (data.general_notes && data.general_notes.length > 1000) {
      errors.push({
        field: 'general_notes',
        message: 'Notes must not exceed 1000 characters',
        code: VITAL_SIGN_ERROR_CODES.VALIDATION_ERROR,
        rejectedValue: `${data.general_notes.length} characters`
      });
    }

    return errors;
  }

  /**
   * Validate measurement timestamp
   */
  async validateTimestamp(timestamp, patientId) {
    const errors = [];

    if (!timestamp) return errors;

    const recordedAt = new Date(timestamp);
    const now = new Date();

    // Check if timestamp is in the future
    if (recordedAt > now) {
      errors.push({
        field: 'measurement_timestamp',
        message: 'Recorded timestamp cannot be in the future',
        code: VITAL_SIGN_ERROR_CODES.RECORDED_TIMESTAMP_FUTURE,
        rejectedValue: timestamp
      });
    }

    // Check if timestamp is before patient's birth date (if available)
    if (patientId) {
      try {
        const patient = await db
          .select({ date_of_birth: patients.date_of_birth })
          .from(patients)
          .where(eq(patients.id, parseInt(patientId)))
          .limit(1);

        if (patient[0]?.date_of_birth) {
          const dob = new Date(patient[0].date_of_birth);
          if (recordedAt < dob) {
            errors.push({
              field: 'measurement_timestamp',
              message: 'Recorded timestamp cannot be before patient birth date',
              code: VITAL_SIGN_ERROR_CODES.RECORDED_TIMESTAMP_BEFORE_BIRTH,
              rejectedValue: timestamp
            });
          }
        }
      } catch (error) {
        logger.warn('Error checking patient DOB for timestamp validation:', error.message);
      }
    }

    return errors;
  }

  /**
   * Check for potential duplicate measurements (within 2 minutes)
   */
  async checkDuplicateMeasurement(patientId, timestamp) {
    if (!patientId || !timestamp) return null;

    const recordedAt = new Date(timestamp);
    const twoMinutesBefore = new Date(recordedAt.getTime() - 2 * 60 * 1000);
    const twoMinutesAfter = new Date(recordedAt.getTime() + 2 * 60 * 1000);

    try {
      const duplicates = await db
        .select({ id: vital_signs.id, measurement_timestamp: vital_signs.measurement_timestamp })
        .from(vital_signs)
        .where(and(
          eq(vital_signs.patient_id, parseInt(patientId)),
          isNull(vital_signs.deleted_at),
          gte(vital_signs.measurement_timestamp, twoMinutesBefore),
          lte(vital_signs.measurement_timestamp, twoMinutesAfter)
        ))
        .limit(1);

      return duplicates[0] || null;
    } catch (error) {
      logger.warn('Error checking for duplicate measurements:', error.message);
      return null;
    }
  }

  /**
   * Check if vital signs are abnormal based on defined ranges
   * @param {object} data - Vital sign data
   * @returns {object} { isAbnormal: boolean, abnormalValues: string[], clinicalAlerts: object[] }
   */
  checkAbnormalValues(data) {
    const abnormalValues = [];
    const clinicalAlerts = [];

    // Check temperature
    if (data.degrees_fahrenheit !== null && data.degrees_fahrenheit !== undefined) {
      const temp = parseFloat(data.degrees_fahrenheit);
      const range = VITAL_SIGN_RANGES.temperature_fahrenheit;
      const alerts = VITAL_SIGN_ALERT_THRESHOLDS.temperature_fahrenheit;

      if (temp < range.critical_low || temp > range.critical_high) {
        abnormalValues.push(`TEMP_CRITICAL:${temp}F`);
        clinicalAlerts.push({
          type: 'CRITICAL',
          measurement: 'temperature',
          value: temp,
          unit: 'F',
          message: temp < range.critical_low
            ? 'Hypothermia - Critical low temperature'
            : 'Hyperthermia - Critical high temperature'
        });
      } else if (temp < alerts.low_alert || temp > alerts.high_alert) {
        abnormalValues.push(`TEMP_ABNORMAL:${temp}F`);
        clinicalAlerts.push({
          type: 'WARNING',
          measurement: 'temperature',
          value: temp,
          unit: 'F',
          message: temp < alerts.low_alert ? 'Low temperature' : 'Elevated temperature (fever)'
        });
      }
    }

    // Check heart rate
    if (data.heart_rate !== null && data.heart_rate !== undefined) {
      const hr = parseInt(data.heart_rate);
      const range = VITAL_SIGN_RANGES.heart_rate;
      const alerts = VITAL_SIGN_ALERT_THRESHOLDS.heart_rate;

      if (hr < range.critical_low || hr > range.critical_high) {
        abnormalValues.push(`HR_CRITICAL:${hr}`);
        clinicalAlerts.push({
          type: 'CRITICAL',
          measurement: 'heart_rate',
          value: hr,
          unit: 'bpm',
          message: hr < range.critical_low ? 'Severe bradycardia' : 'Severe tachycardia'
        });
      } else if (hr < alerts.low_normal || hr > alerts.high_normal) {
        abnormalValues.push(`HR_ABNORMAL:${hr}`);
        clinicalAlerts.push({
          type: 'WARNING',
          measurement: 'heart_rate',
          value: hr,
          unit: 'bpm',
          message: hr < alerts.low_normal ? 'Bradycardia' : 'Tachycardia'
        });
      }
    }

    // Check blood pressure systolic
    if (data.bp_systolic !== null && data.bp_systolic !== undefined) {
      const sys = parseInt(data.bp_systolic);
      const range = VITAL_SIGN_RANGES.bp_systolic;
      const alerts = VITAL_SIGN_ALERT_THRESHOLDS.bp_systolic;

      if (sys < range.critical_low || sys > range.critical_high) {
        abnormalValues.push(`BP_SYS_CRITICAL:${sys}`);
        clinicalAlerts.push({
          type: 'CRITICAL',
          measurement: 'bp_systolic',
          value: sys,
          unit: 'mmHg',
          message: sys < range.critical_low ? 'Severe hypotension' : 'Severe hypertension'
        });
      } else if (sys < alerts.low_warn || sys > alerts.high_warn) {
        abnormalValues.push(`BP_SYS_ABNORMAL:${sys}`);
        clinicalAlerts.push({
          type: 'WARNING',
          measurement: 'bp_systolic',
          value: sys,
          unit: 'mmHg',
          message: sys < alerts.low_warn ? 'Hypotension' : 'Hypertension'
        });
      }
    }

    // Check blood pressure diastolic
    if (data.bp_diastolic !== null && data.bp_diastolic !== undefined) {
      const dia = parseInt(data.bp_diastolic);
      const range = VITAL_SIGN_RANGES.bp_diastolic;
      const alerts = VITAL_SIGN_ALERT_THRESHOLDS.bp_diastolic;

      if (dia < range.critical_low || dia > range.critical_high) {
        abnormalValues.push(`BP_DIA_CRITICAL:${dia}`);
        clinicalAlerts.push({
          type: 'CRITICAL',
          measurement: 'bp_diastolic',
          value: dia,
          unit: 'mmHg',
          message: dia < range.critical_low ? 'Severe hypotension (diastolic)' : 'Severe hypertension (diastolic)'
        });
      } else if (dia < alerts.low_warn || dia > alerts.high_warn) {
        abnormalValues.push(`BP_DIA_ABNORMAL:${dia}`);
      }
    }

    // Check respiratory rate
    if (data.respiratory_rate !== null && data.respiratory_rate !== undefined) {
      const rr = parseInt(data.respiratory_rate);
      const range = VITAL_SIGN_RANGES.respiratory_rate;
      const alerts = VITAL_SIGN_ALERT_THRESHOLDS.respiratory_rate;

      if (rr < range.critical_low || rr > range.critical_high) {
        abnormalValues.push(`RR_CRITICAL:${rr}`);
        clinicalAlerts.push({
          type: 'CRITICAL',
          measurement: 'respiratory_rate',
          value: rr,
          unit: 'breaths/min',
          message: rr < range.critical_low ? 'Severe bradypnea' : 'Severe tachypnea'
        });
      } else if (rr < alerts.low_normal || rr > alerts.high_normal) {
        abnormalValues.push(`RR_ABNORMAL:${rr}`);
        clinicalAlerts.push({
          type: 'WARNING',
          measurement: 'respiratory_rate',
          value: rr,
          unit: 'breaths/min',
          message: rr < alerts.low_normal ? 'Bradypnea' : 'Tachypnea'
        });
      }
    }

    // Check SpO2
    if (data.pulse_oximetry_percentage !== null && data.pulse_oximetry_percentage !== undefined) {
      const spo2 = parseFloat(data.pulse_oximetry_percentage);
      const range = VITAL_SIGN_RANGES.spo2;
      const alerts = VITAL_SIGN_ALERT_THRESHOLDS.oxygen_saturation;

      if (spo2 < range.critical_low) {
        abnormalValues.push(`SPO2_CRITICAL:${spo2}%`);
        clinicalAlerts.push({
          type: 'CRITICAL',
          measurement: 'oxygen_saturation',
          value: spo2,
          unit: '%',
          message: 'Severe hypoxemia - Immediate attention required'
        });
      } else if (spo2 < alerts.critical) {
        abnormalValues.push(`SPO2_HYPOXEMIA:${spo2}%`);
        clinicalAlerts.push({
          type: 'CRITICAL',
          measurement: 'oxygen_saturation',
          value: spo2,
          unit: '%',
          message: 'Hypoxemia - Immediate attention required'
        });
      } else if (spo2 < alerts.warning) {
        abnormalValues.push(`SPO2_ABNORMAL:${spo2}%`);
        clinicalAlerts.push({
          type: 'WARNING',
          measurement: 'oxygen_saturation',
          value: spo2,
          unit: '%',
          message: 'Low oxygen saturation'
        });
      }
    }

    // Check pain score
    if (data.pain_score !== null && data.pain_score !== undefined) {
      const pain = parseInt(data.pain_score);
      const range = VITAL_SIGN_RANGES.pain_score;

      if (pain >= range.critical_high) {
        abnormalValues.push(`PAIN_CRITICAL:${pain}`);
        clinicalAlerts.push({
          type: 'CRITICAL',
          measurement: 'pain_score',
          value: pain,
          unit: '0-10',
          message: 'Severe pain - Intervention needed'
        });
      } else if (pain > range.high) {
        abnormalValues.push(`PAIN_ABNORMAL:${pain}`);
        clinicalAlerts.push({
          type: 'WARNING',
          measurement: 'pain_score',
          value: pain,
          unit: '0-10',
          message: 'Moderate to significant pain'
        });
      }
    }

    return {
      isAbnormal: abnormalValues.length > 0,
      abnormalValues,
      clinicalAlerts
    };
  }

  /**
   * Check if at least one vital measurement is provided
   */
  hasAtLeastOneMeasurement(data) {
    const measurementFields = [
      'degrees_fahrenheit',
      'degrees_celsius',
      'bp_systolic',
      'bp_diastolic',
      'heart_rate',
      'respiratory_rate',
      'pulse_oximetry_percentage',
      'pain_score'
    ];

    return measurementFields.some(field =>
      data[field] !== null && data[field] !== undefined && data[field] !== ''
    );
  }

  /**
   * Build pagination metadata
   */
  buildPaginationMetadata(total, limit, offset) {
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      totalCount: total,
      currentPage,
      totalPages,
      limit,
      offset,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1
    };
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(request, action, recordId, additionalData = {}) {
    try {
      await AuditService.createAuditLog({
        user_id: request.user?.id,
        action,
        resource_type: 'vital_signs',
        resource_id: String(recordId),
        ip_address: request.ip,
        user_agent: request.headers?.['user-agent'],
        metadata: JSON.stringify({
          ...additionalData,
          patient_id: additionalData.patient_id
        })
      });
    } catch (error) {
      logger.error('Failed to create audit log for vital signs:', error);
    }
  }

  // =========================================
  // CRUD OPERATIONS
  // =========================================

  /**
   * Get all vital signs (with optional filters)
   * GET /vital-signs
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        limit = 50,
        offset = 0,
        from_date,
        to_date,
        abnormal_only,
        include_deleted,
        sortBy = 'measurement_timestamp',
        sortOrder = 'desc'
      } = request.query;

      const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
      const offsetNum = Math.max(0, parseInt(offset) || 0);

      let conditions = [];

      if (patient_id) {
        conditions.push(eq(vital_signs.patient_id, parseInt(patient_id)));
      }

      if (from_date) {
        conditions.push(gte(vital_signs.measurement_timestamp, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(vital_signs.measurement_timestamp, new Date(to_date)));
      }

      if (abnormal_only === 'true') {
        conditions.push(eq(vital_signs.is_abnormal, true));
      }

      // Only admins can see deleted records
      const isAdmin = request.user?.role === ROLES.ADMIN;
      if (include_deleted !== 'true' || !isAdmin) {
        conditions.push(isNull(vital_signs.deleted_at));
      }

      // Get total count
      const countResult = await db
        .select({ value: count() })
        .from(vital_signs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      const total = Number(countResult[0]?.value || 0);

      // Build order by
      const orderColumn = vital_signs[sortBy] || vital_signs.measurement_timestamp;
      const orderDirection = sortOrder === 'asc' ? asc : desc;

      // Get paginated results
      let query = db.select().from(vital_signs);
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const vitalSignsList = await query
        .orderBy(orderDirection(orderColumn))
        .limit(limitNum)
        .offset(offsetNum);

      reply.code(200);
      return {
        success: true,
        data: vitalSignsList,
        pagination: this.buildPaginationMetadata(total, limitNum, offsetNum)
      };
    } catch (error) {
      logger.error('Error fetching vital signs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Server error while fetching vital signs',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Get all vital signs for a specific patient
   * GET /patients/:patientId/vital-signs
   */
  async getPatientVitalSigns(request, reply) {
    try {
      const { patientId } = request.params;
      const {
        limit = 50,
        offset = 0,
        dateFrom,
        dateTo,
        sortBy = 'measurement_timestamp',
        sortOrder = 'desc',
        include_deleted
      } = request.query;

      const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
      const offsetNum = Math.max(0, parseInt(offset) || 0);

      let conditions = [eq(vital_signs.patient_id, parseInt(patientId))];

      if (dateFrom) {
        conditions.push(gte(vital_signs.measurement_timestamp, new Date(dateFrom)));
      }
      if (dateTo) {
        conditions.push(lte(vital_signs.measurement_timestamp, new Date(dateTo)));
      }

      // Only admins can see deleted records
      const isAdmin = request.user?.role === ROLES.ADMIN;
      if (include_deleted !== 'true' || !isAdmin) {
        conditions.push(isNull(vital_signs.deleted_at));
      }

      // Get total count
      const countResult = await db
        .select({ value: count() })
        .from(vital_signs)
        .where(and(...conditions));
      const total = Number(countResult[0]?.value || 0);

      // Build order by
      const orderColumn = vital_signs[sortBy] || vital_signs.measurement_timestamp;
      const orderDirection = sortOrder === 'asc' ? asc : desc;

      const vitalSignsList = await db
        .select()
        .from(vital_signs)
        .where(and(...conditions))
        .orderBy(orderDirection(orderColumn))
        .limit(limitNum)
        .offset(offsetNum);

      // Apply clinical flags to abnormal values
      const dataWithFlags = vitalSignsList.map(record => {
        if (record.is_abnormal && record.abnormal_values) {
          try {
            record.clinical_flags = JSON.parse(record.abnormal_values);
          } catch {
            record.clinical_flags = [];
          }
        }
        return record;
      });

      reply.code(200);
      return {
        success: true,
        data: dataWithFlags,
        pagination: this.buildPaginationMetadata(total, limitNum, offsetNum)
      };
    } catch (error) {
      logger.error('Error fetching patient vital signs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching vital signs',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Get latest vital signs for a patient
   * GET /patients/:patientId/vital-signs/latest
   */
  async getLatestVitalSigns(request, reply) {
    try {
      const { patientId } = request.params;

      const result = await db
        .select()
        .from(vital_signs)
        .where(and(
          eq(vital_signs.patient_id, parseInt(patientId)),
          isNull(vital_signs.deleted_at)
        ))
        .orderBy(desc(vital_signs.measurement_timestamp))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_NOT_FOUND,
            message: 'No vital signs found for this patient',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      reply.code(200);
      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching latest vital signs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching latest vital signs',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Get a single vital sign record by ID
   * GET /vital-signs/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(vital_signs)
        .where(eq(vital_signs.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_NOT_FOUND,
            message: 'Vital signs record not found',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Check if deleted and user is not admin
      if (result[0].deleted_at && request.user?.role !== ROLES.ADMIN) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_NOT_FOUND,
            message: 'Vital signs record not found',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Add audit trail info
      const record = result[0];
      record.audit_trail = {
        created: {
          at: record.createdAt,
          by: record.created_by_id
        },
        modified: record.updatedAt !== record.createdAt ? {
          at: record.updatedAt,
          by: record.updated_by_id
        } : null,
        deleted: record.deleted_at ? {
          at: record.deleted_at,
          by: record.deleted_by_id
        } : null
      };

      reply.code(200);
      return {
        success: true,
        data: record
      };
    } catch (error) {
      logger.error('Error fetching vital signs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Server error while fetching vital signs',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Create vital signs for a patient
   * POST /patients/:patientId/vital-signs
   */
  async create(request, reply) {
    try {
      const patientId = request.params?.patientId || request.body?.patient_id;

      if (!patientId) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.VALIDATION_ERROR,
            message: 'Patient ID is required',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Verify patient exists
      const patient = await db
        .select({ id: patients.id })
        .from(patients)
        .where(eq(patients.id, parseInt(patientId)))
        .limit(1);

      if (!patient[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: 'Patient not found',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      const cleanedData = this.cleanVitalSignData(request.body);

      // Check at least one measurement is provided
      if (!this.hasAtLeastOneMeasurement(cleanedData)) {
        reply.code(422);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.AT_LEAST_ONE_MEASUREMENT_REQUIRED,
            message: 'At least one vital sign measurement is required',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Validate clinical ranges
      const validationErrors = this.validateClinicalRanges(cleanedData);
      if (validationErrors.length > 0) {
        reply.code(422);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.VALIDATION_ERROR,
            message: 'One or more fields contain invalid values',
            timestamp: new Date().toISOString(),
            path: request.url,
            fields: validationErrors
          }
        };
      }

      // Validate timestamp
      const timestamp = cleanedData.measurement_timestamp || new Date().toISOString();
      const timestampErrors = await this.validateTimestamp(timestamp, patientId);
      if (timestampErrors.length > 0) {
        reply.code(422);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid measurement timestamp',
            timestamp: new Date().toISOString(),
            path: request.url,
            fields: timestampErrors
          }
        };
      }

      // Check for duplicates (warn but don't block)
      const duplicate = await this.checkDuplicateMeasurement(patientId, timestamp);

      // Handle temperature unit conversion
      if (cleanedData.temperature_unit === 'C' && cleanedData.degrees_celsius && !cleanedData.degrees_fahrenheit) {
        cleanedData.degrees_fahrenheit = this.convertTemperature(cleanedData.degrees_celsius, 'C');
      } else if (cleanedData.temperature_unit === 'F' && cleanedData.degrees_fahrenheit && !cleanedData.degrees_celsius) {
        cleanedData.degrees_celsius = this.convertTemperature(cleanedData.degrees_fahrenheit, 'F');
      }

      // Check for abnormal values
      const { isAbnormal, abnormalValues, clinicalAlerts } = this.checkAbnormalValues(cleanedData);

      const insertData = {
        ...cleanedData,
        patient_id: parseInt(patientId),
        is_abnormal: isAbnormal,
        abnormal_values: abnormalValues.length > 0 ? JSON.stringify(abnormalValues) : null,
        measurement_timestamp: new Date(timestamp),
        measured_by_id: cleanedData.measured_by_id || request.user?.id,
        created_by_id: request.user?.id,
        updated_by_id: request.user?.id,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Remove fields that shouldn't be in insert
      delete insertData.id;

      const newVitalSign = await db.insert(vital_signs).values(insertData).returning();
      const vitalSign = newVitalSign[0];

      // Create audit log
      await this.createAuditLog(request, 'CREATE', vitalSign.id, {
        patient_id: patientId,
        has_abnormal_values: isAbnormal
      });

      const response = {
        success: true,
        message: 'Vital signs created successfully',
        data: vitalSign
      };

      // Include clinical alerts if any
      if (clinicalAlerts.length > 0) {
        response.alerts = {
          has_abnormal_values: true,
          clinical_alerts: clinicalAlerts
        };
      }

      // Include duplicate warning if applicable
      if (duplicate) {
        response.warnings = [{
          code: VITAL_SIGN_ERROR_CODES.DUPLICATE_MEASUREMENT,
          message: 'A vital signs record exists within 2 minutes of this measurement',
          existing_record_id: duplicate.id,
          existing_timestamp: duplicate.measurement_timestamp
        }];
      }

      reply.code(201);
      return response;
    } catch (error) {
      logger.error('Error creating vital signs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Server error while creating vital signs',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Store new vital signs (alias for create)
   * POST /vital-signs/store
   */
  async store(request, reply) {
    return this.create(request, reply);
  }

  /**
   * Full record update (PUT)
   * PUT /vital-signs/:id
   */
  async fullUpdate(request, reply) {
    try {
      const { id } = request.params;
      const vitalSignData = this.cleanVitalSignData(request.body);
      const idNum = parseInt(id);

      // Check at least one measurement is provided
      if (!this.hasAtLeastOneMeasurement(vitalSignData)) {
        reply.code(422);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.AT_LEAST_ONE_MEASUREMENT_REQUIRED,
            message: 'At least one vital sign measurement is required',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Check if record exists
      const existing = await db
        .select()
        .from(vital_signs)
        .where(eq(vital_signs.id, idNum))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_NOT_FOUND,
            message: 'Vital signs record not found',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Check if record is deleted
      if (existing[0].deleted_at) {
        reply.code(410);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_DELETED,
            message: 'Cannot update deleted vital signs record',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Check if record is signed
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          success: false,
          error: {
            code: 'RECORD_SIGNED',
            message: 'Cannot update signed vital signs. Use amendment instead.',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Optimistic locking check
      const clientVersion = vitalSignData.version;
      if (clientVersion !== undefined && clientVersion !== existing[0].version) {
        reply.code(409);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.CONCURRENT_MODIFICATION,
            message: 'Record has been modified by another user',
            timestamp: new Date().toISOString(),
            path: request.url,
            currentVersion: existing[0].version,
            yourVersion: clientVersion
          }
        };
      }

      // Validate clinical ranges
      const validationErrors = this.validateClinicalRanges(vitalSignData);
      if (validationErrors.length > 0) {
        reply.code(422);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.VALIDATION_ERROR,
            message: 'One or more fields contain invalid values',
            timestamp: new Date().toISOString(),
            path: request.url,
            fields: validationErrors
          }
        };
      }

      // Handle temperature unit conversion
      if (vitalSignData.temperature_unit === 'C' && vitalSignData.degrees_celsius && !vitalSignData.degrees_fahrenheit) {
        vitalSignData.degrees_fahrenheit = this.convertTemperature(vitalSignData.degrees_celsius, 'C');
      } else if (vitalSignData.temperature_unit === 'F' && vitalSignData.degrees_fahrenheit && !vitalSignData.degrees_celsius) {
        vitalSignData.degrees_celsius = this.convertTemperature(vitalSignData.degrees_fahrenheit, 'F');
      }

      // Check for abnormal values
      const { isAbnormal, abnormalValues, clinicalAlerts } = this.checkAbnormalValues(vitalSignData);

      // Remove fields that shouldn't be updated
      const { id: _, patient_id, created_by_id, createdAt, version, ...updateFields } = vitalSignData;

      const result = await db
        .update(vital_signs)
        .set({
          ...updateFields,
          is_abnormal: isAbnormal,
          abnormal_values: abnormalValues.length > 0 ? JSON.stringify(abnormalValues) : null,
          updated_by_id: request.user?.id,
          version: existing[0].version + 1,
          updatedAt: new Date()
        })
        .where(eq(vital_signs.id, idNum))
        .returning();

      // Create audit log
      await this.createAuditLog(request, 'UPDATE', result[0].id, {
        patient_id: existing[0].patient_id,
        update_type: 'FULL',
        previous_version: existing[0].version
      });

      const response = {
        success: true,
        message: 'Vital signs updated successfully',
        data: result[0]
      };

      if (clinicalAlerts.length > 0) {
        response.alerts = {
          has_abnormal_values: true,
          clinical_alerts: clinicalAlerts
        };
      }

      reply.code(200);
      return response;
    } catch (error) {
      logger.error('Error in full update vital signs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Server error while updating vital signs',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Partial record update (PATCH)
   * PATCH /vital-signs/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const vitalSignData = this.cleanVitalSignData(request.body);
      const idNum = parseInt(id);

      // Check if at least one field is being updated
      const updateableFields = Object.keys(vitalSignData).filter(key =>
        !['id', 'patient_id', 'created_by_id', 'createdAt', 'version'].includes(key) &&
        vitalSignData[key] !== undefined
      );

      if (updateableFields.length === 0) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.VALIDATION_ERROR,
            message: 'At least one field must be provided for update',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Check if record exists
      const existing = await db
        .select()
        .from(vital_signs)
        .where(eq(vital_signs.id, idNum))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_NOT_FOUND,
            message: 'Vital signs record not found',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Check if record is deleted
      if (existing[0].deleted_at) {
        reply.code(410);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_DELETED,
            message: 'Cannot update deleted vital signs record',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Check if record is signed
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          success: false,
          error: {
            code: 'RECORD_SIGNED',
            message: 'Cannot update signed vital signs. Use amendment instead.',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Optimistic locking check
      const clientVersion = vitalSignData.version;
      if (clientVersion !== undefined && clientVersion !== existing[0].version) {
        reply.code(409);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.CONCURRENT_MODIFICATION,
            message: 'Record has been modified by another user',
            timestamp: new Date().toISOString(),
            path: request.url,
            currentVersion: existing[0].version,
            yourVersion: clientVersion
          }
        };
      }

      // Merge with existing data for validation
      const mergedData = { ...existing[0], ...vitalSignData };

      // Validate clinical ranges on merged data
      const validationErrors = this.validateClinicalRanges(mergedData);
      if (validationErrors.length > 0) {
        reply.code(422);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.VALIDATION_ERROR,
            message: 'One or more fields contain invalid values',
            timestamp: new Date().toISOString(),
            path: request.url,
            fields: validationErrors
          }
        };
      }

      // Handle temperature unit conversion
      if (vitalSignData.temperature_unit === 'C' && vitalSignData.degrees_celsius && !vitalSignData.degrees_fahrenheit) {
        vitalSignData.degrees_fahrenheit = this.convertTemperature(vitalSignData.degrees_celsius, 'C');
      } else if (vitalSignData.temperature_unit === 'F' && vitalSignData.degrees_fahrenheit && !vitalSignData.degrees_celsius) {
        vitalSignData.degrees_celsius = this.convertTemperature(vitalSignData.degrees_fahrenheit, 'F');
      }

      // Check for abnormal values on merged data
      const { isAbnormal, abnormalValues, clinicalAlerts } = this.checkAbnormalValues(mergedData);

      // Build update object with only provided fields
      const updateData = {
        is_abnormal: isAbnormal,
        abnormal_values: abnormalValues.length > 0 ? JSON.stringify(abnormalValues) : null,
        updated_by_id: request.user?.id,
        version: existing[0].version + 1,
        updatedAt: new Date()
      };

      // Add only the fields that were actually provided
      updateableFields.forEach(field => {
        if (vitalSignData[field] !== undefined) {
          updateData[field] = vitalSignData[field];
        }
      });

      const result = await db
        .update(vital_signs)
        .set(updateData)
        .where(eq(vital_signs.id, idNum))
        .returning();

      // Create audit log
      await this.createAuditLog(request, 'UPDATE', result[0].id, {
        patient_id: existing[0].patient_id,
        update_type: 'PARTIAL',
        updated_fields: updateableFields,
        previous_version: existing[0].version
      });

      const response = {
        success: true,
        message: 'Vital signs updated successfully',
        data: result[0]
      };

      if (clinicalAlerts.length > 0) {
        response.alerts = {
          has_abnormal_values: true,
          clinical_alerts: clinicalAlerts
        };
      }

      reply.code(200);
      return response;
    } catch (error) {
      logger.error('Error in update vital signs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Server error while updating vital signs',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Soft delete vital signs by ID
   * DELETE /vital-signs/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;
      const idNum = parseInt(id);

      const existing = await db
        .select()
        .from(vital_signs)
        .where(eq(vital_signs.id, idNum))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_NOT_FOUND,
            message: 'Vital signs record not found',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Check if already deleted
      if (existing[0].deleted_at) {
        reply.code(410);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_DELETED,
            message: 'Vital signs record has already been deleted',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Don't allow deletion of signed records
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          success: false,
          error: {
            code: 'RECORD_SIGNED',
            message: 'Cannot delete signed vital signs',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      // Soft delete
      await db
        .update(vital_signs)
        .set({
          deleted_at: new Date(),
          deleted_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          version: existing[0].version + 1,
          updatedAt: new Date()
        })
        .where(eq(vital_signs.id, idNum));

      // Create audit log
      await this.createAuditLog(request, 'DELETE', idNum, {
        patient_id: existing[0].patient_id
      });

      reply.code(204);
      return;
    } catch (error) {
      logger.error('Error deleting vital signs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error deleting vital signs',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Restore soft-deleted vital signs
   * POST /vital-signs/:id/restore
   */
  async restore(request, reply) {
    try {
      const { id } = request.params;
      const idNum = parseInt(id);

      // Only admins can restore
      if (request.user?.role !== ROLES.ADMIN) {
        reply.code(403);
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can restore deleted records',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      const existing = await db
        .select()
        .from(vital_signs)
        .where(eq(vital_signs.id, idNum))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_NOT_FOUND,
            message: 'Vital signs record not found',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      if (!existing[0].deleted_at) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'NOT_DELETED',
            message: 'Record is not deleted',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      const result = await db
        .update(vital_signs)
        .set({
          deleted_at: null,
          deleted_by_id: null,
          updated_by_id: request.user?.id,
          version: existing[0].version + 1,
          updatedAt: new Date()
        })
        .where(eq(vital_signs.id, idNum))
        .returning();

      // Create audit log
      await this.createAuditLog(request, 'RESTORE', idNum, {
        patient_id: existing[0].patient_id
      });

      reply.code(200);
      return {
        success: true,
        message: 'Vital signs record restored successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error restoring vital signs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error restoring vital signs',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Sign vital signs (21 CFR Part 11 compliance)
   * POST /vital-signs/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(vital_signs)
        .where(and(
          eq(vital_signs.id, parseInt(id)),
          isNull(vital_signs.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_NOT_FOUND,
            message: 'Vital signs not found',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      if (existing[0].signed_at) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'ALREADY_SIGNED',
            message: 'Vital signs already signed',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      const result = await db
        .update(vital_signs)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          version: existing[0].version + 1,
          updatedAt: new Date()
        })
        .where(eq(vital_signs.id, parseInt(id)))
        .returning();

      await this.createAuditLog(request, 'SIGN', result[0].id, {
        patient_id: existing[0].patient_id
      });

      reply.code(200);
      return {
        success: true,
        message: 'Vital signs signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing vital signs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error signing vital signs',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Amend signed vital signs
   * POST /vital-signs/:id/amend
   */
  async amend(request, reply) {
    try {
      const { id } = request.params;
      const { amendment_reason, ...updateData } = request.body;

      if (!amendment_reason) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.VALIDATION_ERROR,
            message: 'Amendment reason is required',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      const existing = await db
        .select()
        .from(vital_signs)
        .where(and(
          eq(vital_signs.id, parseInt(id)),
          isNull(vital_signs.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.RECORD_NOT_FOUND,
            message: 'Vital signs not found',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      if (!existing[0].signed_at) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'NOT_SIGNED',
            message: 'Cannot amend unsigned vital signs. Use update instead.',
            timestamp: new Date().toISOString(),
            path: request.url
          }
        };
      }

      const cleanedData = this.cleanVitalSignData(updateData);
      const mergedData = { ...existing[0], ...cleanedData };

      // Validate clinical ranges
      const validationErrors = this.validateClinicalRanges(mergedData);
      if (validationErrors.length > 0) {
        reply.code(422);
        return {
          success: false,
          error: {
            code: VITAL_SIGN_ERROR_CODES.VALIDATION_ERROR,
            message: 'One or more fields contain invalid values',
            timestamp: new Date().toISOString(),
            path: request.url,
            fields: validationErrors
          }
        };
      }

      const { isAbnormal, abnormalValues, clinicalAlerts } = this.checkAbnormalValues(mergedData);

      const result = await db
        .update(vital_signs)
        .set({
          ...cleanedData,
          is_abnormal: isAbnormal,
          abnormal_values: abnormalValues.length > 0 ? JSON.stringify(abnormalValues) : null,
          amended: true,
          amendment_reason,
          amended_at: new Date(),
          amended_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          version: existing[0].version + 1,
          updatedAt: new Date()
        })
        .where(eq(vital_signs.id, parseInt(id)))
        .returning();

      await this.createAuditLog(request, 'AMEND', result[0].id, {
        patient_id: existing[0].patient_id,
        amendment_reason
      });

      const response = {
        success: true,
        message: 'Vital signs amended successfully',
        data: result[0]
      };

      if (clinicalAlerts.length > 0) {
        response.alerts = {
          has_abnormal_values: true,
          clinical_alerts: clinicalAlerts
        };
      }

      reply.code(200);
      return response;
    } catch (error) {
      logger.error('Error amending vital signs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error amending vital signs',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Get vital signs statistics for a patient
   * GET /patients/:patientId/vital-signs/stats
   */
  async getPatientStats(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Get the most recent vital signs
      const latestVitalSigns = await db
        .select()
        .from(vital_signs)
        .where(and(
          eq(vital_signs.patient_id, parseInt(patientId)),
          isNull(vital_signs.deleted_at)
        ))
        .orderBy(desc(vital_signs.measurement_timestamp))
        .limit(1);

      // Get count of vital signs
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(vital_signs)
        .where(and(
          eq(vital_signs.patient_id, parseInt(patientId)),
          isNull(vital_signs.deleted_at)
        ));

      // Get average values for the time period
      const avgResult = await db
        .select({
          avg_temp: sql`avg(degrees_fahrenheit)`,
          avg_heart_rate: sql`avg(heart_rate)`,
          avg_bp_systolic: sql`avg(bp_systolic)`,
          avg_bp_diastolic: sql`avg(bp_diastolic)`,
          avg_respiratory_rate: sql`avg(respiratory_rate)`,
          avg_spo2: sql`avg(pulse_oximetry_percentage)`,
          avg_pain: sql`avg(pain_score)`,
          max_temp: sql`max(degrees_fahrenheit)`,
          min_temp: sql`min(degrees_fahrenheit)`,
          max_heart_rate: sql`max(heart_rate)`,
          min_heart_rate: sql`min(heart_rate)`,
          max_bp_systolic: sql`max(bp_systolic)`,
          min_bp_systolic: sql`min(bp_systolic)`,
          max_pain: sql`max(pain_score)`,
          abnormal_count: sql`sum(case when is_abnormal then 1 else 0 end)`
        })
        .from(vital_signs)
        .where(
          and(
            eq(vital_signs.patient_id, parseInt(patientId)),
            isNull(vital_signs.deleted_at),
            gte(vital_signs.measurement_timestamp, startDate)
          )
        );

      reply.code(200);
      return {
        success: true,
        data: {
          total_records: parseInt(countResult[0]?.count || 0),
          latest_vital_signs: latestVitalSigns[0] || null,
          period_days: parseInt(days),
          averages: {
            temperature: parseFloat(avgResult[0]?.avg_temp) || null,
            heart_rate: parseFloat(avgResult[0]?.avg_heart_rate) || null,
            bp_systolic: parseFloat(avgResult[0]?.avg_bp_systolic) || null,
            bp_diastolic: parseFloat(avgResult[0]?.avg_bp_diastolic) || null,
            respiratory_rate: parseFloat(avgResult[0]?.avg_respiratory_rate) || null,
            spo2: parseFloat(avgResult[0]?.avg_spo2) || null,
            pain_score: parseFloat(avgResult[0]?.avg_pain) || null
          },
          ranges: {
            temperature: {
              max: parseFloat(avgResult[0]?.max_temp) || null,
              min: parseFloat(avgResult[0]?.min_temp) || null
            },
            heart_rate: {
              max: parseInt(avgResult[0]?.max_heart_rate) || null,
              min: parseInt(avgResult[0]?.min_heart_rate) || null
            },
            bp_systolic: {
              max: parseInt(avgResult[0]?.max_bp_systolic) || null,
              min: parseInt(avgResult[0]?.min_bp_systolic) || null
            },
            pain_score: {
              max: parseInt(avgResult[0]?.max_pain) || null
            }
          },
          abnormal_count: parseInt(avgResult[0]?.abnormal_count) || 0
        }
      };
    } catch (error) {
      logger.error('Error fetching vital signs stats:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching vital signs statistics',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Get vital signs trend for a patient
   * GET /patients/:patientId/vital-signs/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const vitalSignsList = await db
        .select({
          id: vital_signs.id,
          measurement_timestamp: vital_signs.measurement_timestamp,
          degrees_fahrenheit: vital_signs.degrees_fahrenheit,
          heart_rate: vital_signs.heart_rate,
          bp_systolic: vital_signs.bp_systolic,
          bp_diastolic: vital_signs.bp_diastolic,
          respiratory_rate: vital_signs.respiratory_rate,
          pulse_oximetry_percentage: vital_signs.pulse_oximetry_percentage,
          pain_score: vital_signs.pain_score,
          is_abnormal: vital_signs.is_abnormal
        })
        .from(vital_signs)
        .where(
          and(
            eq(vital_signs.patient_id, parseInt(patientId)),
            isNull(vital_signs.deleted_at),
            gte(vital_signs.measurement_timestamp, startDate)
          )
        )
        .orderBy(desc(vital_signs.measurement_timestamp))
        .limit(parseInt(limit));

      reply.code(200);
      return {
        success: true,
        data: {
          period_days: parseInt(days),
          vital_signs: vitalSignsList.reverse(), // Chronological order for charting
          count: vitalSignsList.length
        }
      };
    } catch (error) {
      logger.error('Error fetching vital signs trend:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching vital signs trend data',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }

  /**
   * Get vital signs reference information
   * GET /vital-signs/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        success: true,
        data: {
          name: 'Vital Signs',
          description: 'Standard vital signs for patient assessment',
          measurements: {
            blood_pressure: {
              name: 'Blood Pressure',
              unit: 'mmHg',
              components: ['Systolic', 'Diastolic'],
              valid_range: VITAL_SIGN_VALID_RANGES.bp_systolic,
              normal_range: {
                systolic: { low: 90, high: 140 },
                diastolic: { low: 60, high: 90 }
              }
            },
            heart_rate: {
              name: 'Heart Rate',
              unit: 'BPM',
              valid_range: VITAL_SIGN_VALID_RANGES.heart_rate,
              normal_range: VITAL_SIGN_RANGES.heart_rate
            },
            respiratory_rate: {
              name: 'Respiratory Rate',
              unit: 'breaths/min',
              valid_range: VITAL_SIGN_VALID_RANGES.respiratory_rate,
              normal_range: VITAL_SIGN_RANGES.respiratory_rate
            },
            temperature: {
              name: 'Temperature',
              unit: 'F/C',
              valid_range: VITAL_SIGN_VALID_RANGES.temperature_fahrenheit,
              normal_range: VITAL_SIGN_RANGES.temperature_fahrenheit
            },
            spo2: {
              name: 'Oxygen Saturation (SpO2)',
              unit: '%',
              valid_range: VITAL_SIGN_VALID_RANGES.oxygen_saturation,
              normal_range: VITAL_SIGN_RANGES.spo2
            },
            pain: {
              name: 'Pain Score',
              unit: '0-10 scale',
              normal_range: VITAL_SIGN_RANGES.pain_score
            }
          },
          validation_rules: {
            temperature: 'Must be between 95-106°F (35-41.1°C)',
            blood_pressure: 'Systolic 70-200 mmHg, Diastolic 40-130 mmHg, Systolic > Diastolic',
            heart_rate: 'Must be between 40-200 bpm',
            respiratory_rate: 'Must be between 8-40 breaths/min',
            oxygen_saturation: 'Must be between 70-100%'
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching vital signs reference:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching vital signs reference',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };
    }
  }
}

// Create controller instance
const controller = new VitalSignsController();

// Export instance methods for routes (bound to controller instance)
export const index = controller.index.bind(controller);
export const store = controller.store.bind(controller);
export const show = controller.show.bind(controller);
export const update = controller.update.bind(controller);

// Export controller instance for new routes
export default controller;
