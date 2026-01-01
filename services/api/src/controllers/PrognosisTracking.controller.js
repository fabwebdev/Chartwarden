import { db } from "../config/db.drizzle.js";
import {
  prognosis_tracking,
  prognosis_history,
  prognosis_clinical_indicators,
  prognosis_outcomes,
  DISEASE_PROGRESSION_STATUS,
  PROGNOSIS_STATUS,
  CONFIDENCE_LEVELS,
  IMMINENCE_LEVELS,
  FUNCTIONAL_STATUS_SCALES,
  CLINICAL_INDICATOR_TYPES,
} from "../db/schemas/prognosisTracking.schema.js";
import { patients } from "../db/schemas/patient.schema.js";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { logger } from '../utils/logger.js';

/**
 * PrognosisTracking Controller
 * Handles comprehensive prognosis tracking for hospice patients
 * Includes versioning, clinical indicators, and outcome tracking
 */
class PrognosisTrackingController {
  /**
   * Get all prognosis tracking records with optional filters
   * GET /prognosis-tracking
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        status,
        progression_status,
        is_current,
        is_imminently_dying,
        limit = 50,
        offset = 0,
      } = request.query;

      let query = db
        .select()
        .from(prognosis_tracking)
        .where(isNull(prognosis_tracking.deleted_at))
        .orderBy(desc(prognosis_tracking.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Apply filters
      const conditions = [isNull(prognosis_tracking.deleted_at)];

      if (patient_id) {
        conditions.push(eq(prognosis_tracking.patient_id, parseInt(patient_id)));
      }
      if (status) {
        conditions.push(eq(prognosis_tracking.prognosis_status, status));
      }
      if (progression_status) {
        conditions.push(eq(prognosis_tracking.disease_progression_status, progression_status));
      }
      if (is_current !== undefined) {
        conditions.push(eq(prognosis_tracking.is_current, is_current === 'true'));
      }
      if (is_imminently_dying !== undefined) {
        conditions.push(eq(prognosis_tracking.is_imminently_dying, is_imminently_dying === 'true'));
      }

      const results = await db
        .select()
        .from(prognosis_tracking)
        .where(and(...conditions))
        .orderBy(desc(prognosis_tracking.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        success: true,
        data: results,
        meta: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: results.length,
        },
      };
    } catch (error) {
      logger.error("Error fetching prognosis tracking records:", error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching prognosis tracking records",
        },
      };
    }
  }

  /**
   * Get current prognosis for a patient
   * GET /prognosis-tracking/patient/:patientId/current
   */
  async getCurrentByPatient(request, reply) {
    try {
      const { patientId } = request.params;
      const patientIdNum = parseInt(patientId);

      if (isNaN(patientIdNum)) {
        reply.code(400);
        return {
          success: false,
          error: { code: "INVALID_PATIENT_ID", message: "Invalid patient ID" },
        };
      }

      const results = await db
        .select()
        .from(prognosis_tracking)
        .where(
          and(
            eq(prognosis_tracking.patient_id, patientIdNum),
            eq(prognosis_tracking.is_current, true),
            isNull(prognosis_tracking.deleted_at)
          )
        )
        .limit(1);

      if (results.length === 0) {
        reply.code(200);
        return {
          success: true,
          data: null,
          message: "No current prognosis found for this patient",
        };
      }

      // Fetch clinical indicators for current prognosis
      const indicators = await db
        .select()
        .from(prognosis_clinical_indicators)
        .where(eq(prognosis_clinical_indicators.prognosis_tracking_id, results[0].id))
        .orderBy(desc(prognosis_clinical_indicators.measurement_date));

      reply.code(200);
      return {
        success: true,
        data: {
          ...results[0],
          clinical_indicators: indicators,
        },
      };
    } catch (error) {
      logger.error("Error fetching current prognosis:", error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching current prognosis",
        },
      };
    }
  }

  /**
   * Get prognosis history for a patient
   * GET /prognosis-tracking/patient/:patientId/history
   */
  async getHistoryByPatient(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 20, offset = 0 } = request.query;
      const patientIdNum = parseInt(patientId);

      if (isNaN(patientIdNum)) {
        reply.code(400);
        return {
          success: false,
          error: { code: "INVALID_PATIENT_ID", message: "Invalid patient ID" },
        };
      }

      // Get all prognosis versions for patient
      const versions = await db
        .select()
        .from(prognosis_tracking)
        .where(
          and(
            eq(prognosis_tracking.patient_id, patientIdNum),
            isNull(prognosis_tracking.deleted_at)
          )
        )
        .orderBy(desc(prognosis_tracking.version))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Get audit history
      const auditHistory = await db
        .select()
        .from(prognosis_history)
        .where(eq(prognosis_history.patient_id, patientIdNum))
        .orderBy(desc(prognosis_history.change_date))
        .limit(50);

      reply.code(200);
      return {
        success: true,
        data: {
          versions,
          audit_trail: auditHistory,
        },
      };
    } catch (error) {
      logger.error("Error fetching prognosis history:", error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching prognosis history",
        },
      };
    }
  }

  /**
   * Get a specific prognosis tracking record
   * GET /prognosis-tracking/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;
      const recordId = parseInt(id);

      if (isNaN(recordId)) {
        reply.code(400);
        return {
          success: false,
          error: { code: "INVALID_ID", message: "Invalid prognosis tracking ID" },
        };
      }

      const results = await db
        .select()
        .from(prognosis_tracking)
        .where(
          and(
            eq(prognosis_tracking.id, recordId),
            isNull(prognosis_tracking.deleted_at)
          )
        )
        .limit(1);

      if (results.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Prognosis tracking record not found" },
        };
      }

      // Fetch clinical indicators
      const indicators = await db
        .select()
        .from(prognosis_clinical_indicators)
        .where(eq(prognosis_clinical_indicators.prognosis_tracking_id, recordId))
        .orderBy(desc(prognosis_clinical_indicators.measurement_date));

      reply.code(200);
      return {
        success: true,
        data: {
          ...results[0],
          clinical_indicators: indicators,
        },
      };
    } catch (error) {
      logger.error("Error fetching prognosis tracking record:", error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching prognosis tracking record",
        },
      };
    }
  }

  /**
   * Create a new prognosis tracking record
   * POST /prognosis-tracking
   */
  async create(request, reply) {
    try {
      const userId = request.user?.id || null;
      const {
        patient_id,
        disease_progression_status,
        // Include other fields from schema
        ...otherData
      } = request.body;

      // Validate required fields
      if (!patient_id) {
        reply.code(400);
        return {
          success: false,
          error: { code: "MISSING_PATIENT_ID", message: "Patient ID is required" },
        };
      }

      if (!disease_progression_status) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: "MISSING_PROGRESSION_STATUS",
            message: "Disease progression status is required",
          },
        };
      }

      // Validate disease progression status
      if (!Object.values(DISEASE_PROGRESSION_STATUS).includes(disease_progression_status)) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: "INVALID_PROGRESSION_STATUS",
            message: `Invalid disease progression status. Valid values: ${Object.values(DISEASE_PROGRESSION_STATUS).join(", ")}`,
          },
        };
      }

      const patientIdNum = parseInt(patient_id);

      // Check if patient exists
      const patientExists = await db
        .select({ id: patients.id })
        .from(patients)
        .where(eq(patients.id, patientIdNum))
        .limit(1);

      if (patientExists.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: { code: "PATIENT_NOT_FOUND", message: "Patient not found" },
        };
      }

      // Mark any existing current prognosis as not current
      const existingCurrent = await db
        .select({ id: prognosis_tracking.id, version: prognosis_tracking.version })
        .from(prognosis_tracking)
        .where(
          and(
            eq(prognosis_tracking.patient_id, patientIdNum),
            eq(prognosis_tracking.is_current, true),
            isNull(prognosis_tracking.deleted_at)
          )
        )
        .limit(1);

      const now = new Date();
      let previousVersionId = null;
      let newVersion = 1;

      if (existingCurrent.length > 0) {
        previousVersionId = existingCurrent[0].id;
        newVersion = existingCurrent[0].version + 1;

        // Update existing to mark as not current
        await db
          .update(prognosis_tracking)
          .set({
            is_current: false,
            superseded_at: now,
            superseded_by_id: userId,
            superseded_reason: otherData.superseded_reason || "New prognosis created",
            updatedAt: now,
          })
          .where(eq(prognosis_tracking.id, existingCurrent[0].id));
      }

      // Create new prognosis tracking record
      const newRecord = await db
        .insert(prognosis_tracking)
        .values({
          patient_id: patientIdNum,
          disease_progression_status,
          version: newVersion,
          is_current: true,
          previous_version_id: previousVersionId,
          prognosis_status: otherData.prognosis_status || "ACTIVE",
          created_by_id: userId,
          updated_by_id: userId,
          createdAt: now,
          updatedAt: now,
          // Spread other valid fields
          ...this._sanitizeInput(otherData),
        })
        .returning();

      // Create history record
      await db.insert(prognosis_history).values({
        prognosis_tracking_id: newRecord[0].id,
        patient_id: patientIdNum,
        change_type: "CREATE",
        change_date: now,
        changed_by_id: userId,
        snapshot: JSON.stringify(newRecord[0]),
        ip_address: request.ip,
        user_agent: request.headers["user-agent"],
        createdAt: now,
      });

      reply.code(201);
      return {
        success: true,
        data: newRecord[0],
        message: "Prognosis tracking record created successfully",
      };
    } catch (error) {
      logger.error("Error creating prognosis tracking record:", error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error creating prognosis tracking record",
        },
      };
    }
  }

  /**
   * Update a prognosis tracking record
   * PUT /prognosis-tracking/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id || null;
      const recordId = parseInt(id);

      if (isNaN(recordId)) {
        reply.code(400);
        return {
          success: false,
          error: { code: "INVALID_ID", message: "Invalid prognosis tracking ID" },
        };
      }

      // Check if record exists
      const existing = await db
        .select()
        .from(prognosis_tracking)
        .where(
          and(
            eq(prognosis_tracking.id, recordId),
            isNull(prognosis_tracking.deleted_at)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Prognosis tracking record not found" },
        };
      }

      const updateData = request.body;
      const now = new Date();

      // Validate disease progression status if provided
      if (
        updateData.disease_progression_status &&
        !Object.values(DISEASE_PROGRESSION_STATUS).includes(updateData.disease_progression_status)
      ) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: "INVALID_PROGRESSION_STATUS",
            message: `Invalid disease progression status. Valid values: ${Object.values(DISEASE_PROGRESSION_STATUS).join(", ")}`,
          },
        };
      }

      // Track what changed
      const changes = [];
      const fieldsToTrack = [
        "disease_progression_status",
        "prognosis_status",
        "functional_status_score",
        "is_imminently_dying",
        "imminence_level",
      ];

      for (const field of fieldsToTrack) {
        if (updateData[field] !== undefined && updateData[field] !== existing[0][field]) {
          changes.push({
            field,
            previous: existing[0][field],
            new: updateData[field],
          });
        }
      }

      // Update the record
      const updatedRecord = await db
        .update(prognosis_tracking)
        .set({
          ...this._sanitizeInput(updateData),
          updated_by_id: userId,
          updatedAt: now,
        })
        .where(eq(prognosis_tracking.id, recordId))
        .returning();

      // Create history records for significant changes
      for (const change of changes) {
        await db.insert(prognosis_history).values({
          prognosis_tracking_id: recordId,
          patient_id: existing[0].patient_id,
          change_type: change.field === "prognosis_status" ? "STATUS_CHANGE" : "UPDATE",
          change_date: now,
          changed_by_id: userId,
          field_changed: change.field,
          previous_value: String(change.previous),
          new_value: String(change.new),
          change_reason: updateData.change_reason,
          snapshot: JSON.stringify(updatedRecord[0]),
          ip_address: request.ip,
          user_agent: request.headers["user-agent"],
          createdAt: now,
        });
      }

      reply.code(200);
      return {
        success: true,
        data: updatedRecord[0],
        message: "Prognosis tracking record updated successfully",
      };
    } catch (error) {
      logger.error("Error updating prognosis tracking record:", error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error updating prognosis tracking record",
        },
      };
    }
  }

  /**
   * Soft delete a prognosis tracking record
   * DELETE /prognosis-tracking/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id || null;
      const recordId = parseInt(id);

      if (isNaN(recordId)) {
        reply.code(400);
        return {
          success: false,
          error: { code: "INVALID_ID", message: "Invalid prognosis tracking ID" },
        };
      }

      const existing = await db
        .select()
        .from(prognosis_tracking)
        .where(
          and(
            eq(prognosis_tracking.id, recordId),
            isNull(prognosis_tracking.deleted_at)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Prognosis tracking record not found" },
        };
      }

      const now = new Date();

      // Soft delete
      await db
        .update(prognosis_tracking)
        .set({
          deleted_at: now,
          is_current: false,
          prognosis_status: "ARCHIVED",
          updated_by_id: userId,
          updatedAt: now,
        })
        .where(eq(prognosis_tracking.id, recordId));

      // Log deletion in history
      await db.insert(prognosis_history).values({
        prognosis_tracking_id: recordId,
        patient_id: existing[0].patient_id,
        change_type: "ARCHIVE",
        change_date: now,
        changed_by_id: userId,
        change_reason: request.body?.reason || "Record archived",
        ip_address: request.ip,
        user_agent: request.headers["user-agent"],
        createdAt: now,
      });

      reply.code(200);
      return {
        success: true,
        message: "Prognosis tracking record archived successfully",
      };
    } catch (error) {
      logger.error("Error archiving prognosis tracking record:", error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error archiving prognosis tracking record",
        },
      };
    }
  }

  /**
   * Add clinical indicator to a prognosis record
   * POST /prognosis-tracking/:id/indicators
   */
  async addClinicalIndicator(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id || null;
      const recordId = parseInt(id);

      if (isNaN(recordId)) {
        reply.code(400);
        return {
          success: false,
          error: { code: "INVALID_ID", message: "Invalid prognosis tracking ID" },
        };
      }

      // Verify prognosis exists
      const existing = await db
        .select({ id: prognosis_tracking.id, patient_id: prognosis_tracking.patient_id })
        .from(prognosis_tracking)
        .where(eq(prognosis_tracking.id, recordId))
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Prognosis tracking record not found" },
        };
      }

      const {
        indicator_type,
        indicator_name,
        measurement_date,
        value_numeric,
        value_text,
        value_unit,
        ...otherData
      } = request.body;

      // Validate required fields
      if (!indicator_type || !indicator_name || !measurement_date) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: "indicator_type, indicator_name, and measurement_date are required",
          },
        };
      }

      // Validate indicator type
      if (!Object.values(CLINICAL_INDICATOR_TYPES).includes(indicator_type)) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: "INVALID_INDICATOR_TYPE",
            message: `Invalid indicator type. Valid values: ${Object.values(CLINICAL_INDICATOR_TYPES).join(", ")}`,
          },
        };
      }

      const now = new Date();

      // Get previous value for trend calculation
      const previousIndicator = await db
        .select()
        .from(prognosis_clinical_indicators)
        .where(
          and(
            eq(prognosis_clinical_indicators.patient_id, existing[0].patient_id),
            eq(prognosis_clinical_indicators.indicator_type, indicator_type),
            eq(prognosis_clinical_indicators.indicator_name, indicator_name)
          )
        )
        .orderBy(desc(prognosis_clinical_indicators.measurement_date))
        .limit(1);

      let trendData = {};
      if (previousIndicator.length > 0 && value_numeric !== undefined) {
        const prevValue = parseFloat(previousIndicator[0].value_numeric);
        const currValue = parseFloat(value_numeric);
        const daysDiff = Math.floor(
          (new Date(measurement_date) - new Date(previousIndicator[0].measurement_date)) /
            (1000 * 60 * 60 * 24)
        );

        let trendDirection = "STABLE";
        if (currValue > prevValue * 1.05) trendDirection = "WORSENING";
        else if (currValue < prevValue * 0.95) trendDirection = "IMPROVING";

        trendData = {
          previous_value: prevValue,
          change_percentage: ((currValue - prevValue) / prevValue) * 100,
          days_since_previous: daysDiff,
          trend_direction: trendDirection,
        };
      }

      const newIndicator = await db
        .insert(prognosis_clinical_indicators)
        .values({
          prognosis_tracking_id: recordId,
          patient_id: existing[0].patient_id,
          indicator_type,
          indicator_name,
          measurement_date: new Date(measurement_date),
          value_numeric: value_numeric ? parseFloat(value_numeric) : null,
          value_text,
          value_unit,
          recorded_by_id: userId,
          createdAt: now,
          updatedAt: now,
          ...trendData,
          ...otherData,
        })
        .returning();

      reply.code(201);
      return {
        success: true,
        data: newIndicator[0],
        message: "Clinical indicator added successfully",
      };
    } catch (error) {
      logger.error("Error adding clinical indicator:", error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error adding clinical indicator",
        },
      };
    }
  }

  /**
   * Get clinical indicators for a prognosis record
   * GET /prognosis-tracking/:id/indicators
   */
  async getClinicalIndicators(request, reply) {
    try {
      const { id } = request.params;
      const { type, limit = 50, offset = 0 } = request.query;
      const recordId = parseInt(id);

      if (isNaN(recordId)) {
        reply.code(400);
        return {
          success: false,
          error: { code: "INVALID_ID", message: "Invalid prognosis tracking ID" },
        };
      }

      let conditions = [eq(prognosis_clinical_indicators.prognosis_tracking_id, recordId)];

      if (type) {
        conditions.push(eq(prognosis_clinical_indicators.indicator_type, type));
      }

      const indicators = await db
        .select()
        .from(prognosis_clinical_indicators)
        .where(and(...conditions))
        .orderBy(desc(prognosis_clinical_indicators.measurement_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        success: true,
        data: indicators,
      };
    } catch (error) {
      logger.error("Error fetching clinical indicators:", error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching clinical indicators",
        },
      };
    }
  }

  /**
   * Record outcome for a prognosis
   * POST /prognosis-tracking/:id/outcomes
   */
  async recordOutcome(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id || null;
      const recordId = parseInt(id);

      if (isNaN(recordId)) {
        reply.code(400);
        return {
          success: false,
          error: { code: "INVALID_ID", message: "Invalid prognosis tracking ID" },
        };
      }

      // Verify prognosis exists
      const existing = await db
        .select()
        .from(prognosis_tracking)
        .where(eq(prognosis_tracking.id, recordId))
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Prognosis tracking record not found" },
        };
      }

      const {
        outcome_type,
        outcome_date,
        outcome_location,
        actual_los_days,
        ...otherData
      } = request.body;

      // Validate required fields
      if (!outcome_type) {
        reply.code(400);
        return {
          success: false,
          error: { code: "MISSING_OUTCOME_TYPE", message: "Outcome type is required" },
        };
      }

      const now = new Date();
      const prognosisData = existing[0];

      // Calculate accuracy metrics
      let losVariance = null;
      let losAccuracy = null;
      if (actual_los_days && prognosisData.expected_length_of_stay_days) {
        losVariance = actual_los_days - prognosisData.expected_length_of_stay_days;
        if (Math.abs(losVariance) <= 7) {
          losAccuracy = "ACCURATE";
        } else if (losVariance > 0) {
          losAccuracy = "UNDERESTIMATED";
        } else {
          losAccuracy = "OVERESTIMATED";
        }
      }

      const newOutcome = await db
        .insert(prognosis_outcomes)
        .values({
          prognosis_tracking_id: recordId,
          patient_id: prognosisData.patient_id,
          outcome_type,
          outcome_date: outcome_date ? new Date(outcome_date) : null,
          outcome_location,
          prognosis_date: prognosisData.createdAt,
          predicted_los_days: prognosisData.expected_length_of_stay_days,
          actual_los_days: actual_los_days ? parseInt(actual_los_days) : null,
          los_variance_days: losVariance,
          los_accuracy_category: losAccuracy,
          predicted_imminence_level: prognosisData.imminence_level,
          analyzed_by_id: userId,
          analysis_date: now,
          createdAt: now,
          updatedAt: now,
          ...otherData,
        })
        .returning();

      // Update prognosis status
      await db
        .update(prognosis_tracking)
        .set({
          prognosis_status: "FINALIZED",
          is_current: false,
          updatedAt: now,
          updated_by_id: userId,
        })
        .where(eq(prognosis_tracking.id, recordId));

      reply.code(201);
      return {
        success: true,
        data: newOutcome[0],
        message: "Outcome recorded successfully",
      };
    } catch (error) {
      logger.error("Error recording outcome:", error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error recording outcome",
        },
      };
    }
  }

  /**
   * Get prognosis trends for a patient
   * GET /prognosis-tracking/patient/:patientId/trends
   */
  async getPatientTrends(request, reply) {
    try {
      const { patientId } = request.params;
      const { indicator_type, days = 30 } = request.query;
      const patientIdNum = parseInt(patientId);

      if (isNaN(patientIdNum)) {
        reply.code(400);
        return {
          success: false,
          error: { code: "INVALID_PATIENT_ID", message: "Invalid patient ID" },
        };
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      let conditions = [
        eq(prognosis_clinical_indicators.patient_id, patientIdNum),
        sql`${prognosis_clinical_indicators.measurement_date} >= ${startDate}`,
      ];

      if (indicator_type) {
        conditions.push(eq(prognosis_clinical_indicators.indicator_type, indicator_type));
      }

      const indicators = await db
        .select()
        .from(prognosis_clinical_indicators)
        .where(and(...conditions))
        .orderBy(prognosis_clinical_indicators.measurement_date);

      // Group by indicator type and name for trend analysis
      const trends = {};
      for (const indicator of indicators) {
        const key = `${indicator.indicator_type}_${indicator.indicator_name}`;
        if (!trends[key]) {
          trends[key] = {
            type: indicator.indicator_type,
            name: indicator.indicator_name,
            unit: indicator.value_unit,
            data: [],
          };
        }
        trends[key].data.push({
          date: indicator.measurement_date,
          value: indicator.value_numeric || indicator.value_text,
          is_abnormal: indicator.is_abnormal,
          is_critical: indicator.is_critical,
        });
      }

      reply.code(200);
      return {
        success: true,
        data: {
          patient_id: patientIdNum,
          period_days: parseInt(days),
          trends: Object.values(trends),
        },
      };
    } catch (error) {
      logger.error("Error fetching patient trends:", error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching patient trends",
        },
      };
    }
  }

  /**
   * Get enum values for dropdowns
   * GET /prognosis-tracking/enums
   */
  async getEnums(request, reply) {
    return {
      success: true,
      data: {
        disease_progression_status: DISEASE_PROGRESSION_STATUS,
        prognosis_status: PROGNOSIS_STATUS,
        confidence_levels: CONFIDENCE_LEVELS,
        imminence_levels: IMMINENCE_LEVELS,
        functional_status_scales: FUNCTIONAL_STATUS_SCALES,
        clinical_indicator_types: CLINICAL_INDICATOR_TYPES,
      },
    };
  }

  /**
   * Sanitize input to only allow valid schema fields
   * @private
   */
  _sanitizeInput(data) {
    // List of allowed fields that can be set
    const allowedFields = [
      'prognosis_status',
      'admission_date',
      'expected_discharge_date',
      'expected_length_of_stay_days',
      'length_of_stay_range_min_days',
      'length_of_stay_range_max_days',
      'length_of_stay_confidence_level',
      'length_of_stay_notes',
      'prognosis_months',
      'prognosis_less_than_6_months',
      'terminal_diagnosis_confirmed',
      'terminal_diagnosis_date',
      'disease_progression_trend',
      'progression_rate',
      'progression_since_last_assessment',
      'disease_progression_notes',
      'vital_signs_trend',
      'vital_signs_summary',
      'vital_signs_last_assessment_date',
      'lab_values_summary',
      'lab_values_trend',
      'lab_values_last_date',
      'functional_status_score',
      'functional_status_scale',
      'functional_status_trend',
      'previous_functional_score',
      'functional_status_date',
      'functional_status_notes',
      'pps_ambulation',
      'pps_activity_evidence_of_disease',
      'pps_self_care',
      'pps_intake',
      'pps_conscious_level',
      'primary_diagnosis_icd10',
      'primary_diagnosis_description',
      'secondary_diagnoses',
      'comorbidities',
      'diagnosis_related_prognosis_factors',
      'symptom_burden_score',
      'symptom_burden_level',
      'primary_symptoms',
      'symptom_management_effectiveness',
      'is_imminently_dying',
      'imminence_level',
      'imminence_indicators',
      'imminence_assessment_date',
      'days_to_death_estimate',
      'hours_to_death_estimate',
      'patient_awareness_of_prognosis',
      'family_awareness_of_prognosis',
      'prognosis_discussion_date',
      'prognosis_discussed_with',
      'goals_of_care_aligned',
      'goals_of_care_notes',
      'overall_confidence_level',
      'confidence_percentage',
      'uncertainty_factors',
      'prediction_model_used',
      'surprise_question_response',
      'complications',
      'unexpected_events',
      'prognosis_modifying_factors',
      'last_review_date',
      'next_review_date',
      'review_frequency_days',
      'review_notes',
      'requires_idg_review',
      'idg_review_date',
      'idg_review_outcome',
      'clinical_summary',
      'prognosis_rationale',
      'treatment_response',
      'additional_notes',
      'signature',
      'signed_at',
      'signed_by_id',
      'cosignature',
      'cosigned_at',
      'cosigned_by_id',
      'requires_physician_signature',
      'physician_signature_date',
    ];

    const sanitized = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        sanitized[field] = data[field];
      }
    }
    return sanitized;
  }
}

export default new PrognosisTrackingController();
