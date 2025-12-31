import { db } from "../config/db.drizzle.js";
import {
  patients,
  certifications,
  scheduled_visits,
  visit_compliance,
  bereavement_cases,
  incidents,
  grievances,
  quality_measure_data,
  claims,
  ar_aging,
  billing_periods,
  staff_profiles,
  staff_caseload,
  staff_credentials,
  idg_meetings,
  medications,
  chart_audits
} from "../db/schemas/index.js";
import { eq, and, isNull, desc, gte, lte, sql, count, sum, avg, inArray } from "drizzle-orm";

/**
 * Reports Controller
 * Generates various reports by querying existing data across all modules
 * No database tables needed - aggregates data from existing tables
 */
class ReportsController {
  // ==================== CENSUS REPORTS ====================

  /**
   * Get current census - all active patients
   * GET /reports/census/current
   */
  async getCurrentCensus(request, reply) {
    try {
      const { level_of_care } = request.query;

      let conditions = [
        eq(patients.status, 'ACTIVE'),
        isNull(patients.deleted_at)
      ];

      const result = await db
        .select({
          patient_id: patients.id,
          patient_name: sql`CONCAT(${patients.first_name}, ' ', ${patients.last_name})`,
          mrn: patients.mrn,
          admission_date: patients.admission_date,
          primary_diagnosis: patients.primary_diagnosis,
          level_of_care: patients.level_of_care,
          attending_physician: patients.attending_physician
        })
        .from(patients)
        .where(and(...conditions))
        .orderBy(patients.last_name, patients.first_name);

      const summary = await db
        .select({
          total_patients: count(),
          level_of_care: patients.level_of_care
        })
        .from(patients)
        .where(and(...conditions))
        .groupBy(patients.level_of_care);

      return {
        status: 200,
        message: "Current census retrieved successfully",
        data: {
          patients: result,
          summary: summary,
          total_count: result.length,
          as_of_date: new Date().toISOString()
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve current census",
        error: error.message
      };
    }
  }

  /**
   * Get census by level of care
   * GET /reports/census/by-level-of-care
   */
  async getCensusByLevelOfCare(request, reply) {
    try {
      const result = await db
        .select({
          level_of_care: patients.level_of_care,
          patient_count: count(),
          avg_length_of_stay: sql`EXTRACT(DAY FROM AVG(CURRENT_DATE - ${patients.admission_date}))`
        })
        .from(patients)
        .where(and(
          eq(patients.status, 'ACTIVE'),
          isNull(patients.deleted_at)
        ))
        .groupBy(patients.level_of_care);

      return {
        status: 200,
        message: "Census by level of care retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve census by level of care",
        error: error.message
      };
    }
  }

  /**
   * Get admissions and discharges for date range
   * GET /reports/census/admissions-discharges
   */
  async getAdmissionsDischarges(request, reply) {
    try {
      const { from_date, to_date } = request.query;

      if (!from_date || !to_date) {
        reply.code(400);
        return {
          status: 400,
          message: "from_date and to_date are required"
        };
      }

      const admissions = await db
        .select({
          patient_id: patients.id,
          patient_name: sql`CONCAT(${patients.first_name}, ' ', ${patients.last_name})`,
          admission_date: patients.admission_date,
          level_of_care: patients.level_of_care
        })
        .from(patients)
        .where(and(
          gte(patients.admission_date, from_date),
          lte(patients.admission_date, to_date),
          isNull(patients.deleted_at)
        ))
        .orderBy(patients.admission_date);

      const discharges = await db
        .select({
          patient_id: patients.id,
          patient_name: sql`CONCAT(${patients.first_name}, ' ', ${patients.last_name})`,
          discharge_date: patients.discharge_date,
          discharge_reason: patients.discharge_reason
        })
        .from(patients)
        .where(and(
          gte(patients.discharge_date, from_date),
          lte(patients.discharge_date, to_date),
          isNull(patients.deleted_at)
        ))
        .orderBy(patients.discharge_date);

      return {
        status: 200,
        message: "Admissions and discharges retrieved successfully",
        data: {
          admissions: admissions,
          discharges: discharges,
          admission_count: admissions.length,
          discharge_count: discharges.length,
          from_date,
          to_date
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve admissions and discharges",
        error: error.message
      };
    }
  }

  /**
   * Get average length of stay
   * GET /reports/census/average-los
   */
  async getAverageLengthOfStay(request, reply) {
    try {
      const result = await db
        .select({
          level_of_care: patients.level_of_care,
          avg_los_days: sql`ROUND(AVG(EXTRACT(DAY FROM (COALESCE(${patients.discharge_date}, CURRENT_DATE) - ${patients.admission_date})))::numeric, 1)`,
          patient_count: count()
        })
        .from(patients)
        .where(isNull(patients.deleted_at))
        .groupBy(patients.level_of_care);

      return {
        status: 200,
        message: "Average length of stay retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve average length of stay",
        error: error.message
      };
    }
  }

  // ==================== CLINICAL COMPLIANCE REPORTS ====================

  /**
   * Get patients due for recertification
   * GET /reports/compliance/recertifications-due
   */
  async getRecertificationsDue(request, reply) {
    try {
      const { days_ahead = 30 } = request.query;

      const result = await db
        .select({
          patient_id: certifications.patient_id,
          patient_name: sql`CONCAT(${patients.first_name}, ' ', ${patients.last_name})`,
          certification_id: certifications.id,
          certification_period: certifications.certification_period,
          end_date: certifications.end_date,
          days_until_due: sql`EXTRACT(DAY FROM (${certifications.end_date} - CURRENT_DATE))`,
          certification_status: certifications.certification_status
        })
        .from(certifications)
        .innerJoin(patients, eq(certifications.patient_id, patients.id))
        .where(and(
          eq(patients.status, 'ACTIVE'),
          lte(certifications.end_date, sql`CURRENT_DATE + INTERVAL '${sql.raw(days_ahead.toString())} days'`),
          gte(certifications.end_date, sql`CURRENT_DATE`),
          isNull(certifications.deleted_at),
          isNull(patients.deleted_at)
        ))
        .orderBy(certifications.end_date);

      return {
        status: 200,
        message: "Recertifications due retrieved successfully",
        data: {
          recertifications: result,
          count: result.length,
          days_ahead: parseInt(days_ahead)
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve recertifications due",
        error: error.message
      };
    }
  }

  /**
   * Get patients with overdue visits
   * GET /reports/compliance/overdue-visits
   */
  async getOverdueVisits(request, reply) {
    try {
      const result = await db
        .select({
          patient_id: visit_compliance.patient_id,
          patient_name: sql`CONCAT(${patients.first_name}, ' ', ${patients.last_name})`,
          last_visit_date: visit_compliance.last_visit_date,
          days_since_visit: sql`EXTRACT(DAY FROM (CURRENT_DATE - ${visit_compliance.last_visit_date}))`,
          visit_frequency_required: visit_compliance.visit_frequency_required,
          compliance_status: visit_compliance.compliance_status
        })
        .from(visit_compliance)
        .innerJoin(patients, eq(visit_compliance.patient_id, patients.id))
        .where(and(
          eq(patients.status, 'ACTIVE'),
          eq(visit_compliance.compliance_status, 'NON_COMPLIANT'),
          isNull(visit_compliance.deleted_at),
          isNull(patients.deleted_at)
        ))
        .orderBy(visit_compliance.last_visit_date);

      return {
        status: 200,
        message: "Overdue visits retrieved successfully",
        data: {
          patients: result,
          count: result.length
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve overdue visits",
        error: error.message
      };
    }
  }

  /**
   * Get IDG meeting compliance
   * GET /reports/compliance/idg-meetings
   */
  async getIDGMeetingCompliance(request, reply) {
    try {
      const { from_date, to_date } = request.query;

      let conditions = [isNull(idg_meetings.deleted_at)];

      if (from_date) {
        conditions.push(gte(idg_meetings.meeting_date, from_date));
      }
      if (to_date) {
        conditions.push(lte(idg_meetings.meeting_date, to_date));
      }

      const meetings = await db
        .select({
          meeting_date: idg_meetings.meeting_date,
          total_patients_discussed: sql`jsonb_array_length(${idg_meetings.patients_discussed})`,
          meeting_duration_minutes: idg_meetings.meeting_duration_minutes,
          status: idg_meetings.status
        })
        .from(idg_meetings)
        .where(and(...conditions))
        .orderBy(desc(idg_meetings.meeting_date));

      const summary = await db
        .select({
          total_meetings: count(),
          avg_patients_per_meeting: sql`AVG(jsonb_array_length(${idg_meetings.patients_discussed}))`,
          avg_duration_minutes: avg(idg_meetings.meeting_duration_minutes)
        })
        .from(idg_meetings)
        .where(and(...conditions));

      return {
        status: 200,
        message: "IDG meeting compliance retrieved successfully",
        data: {
          meetings: meetings,
          summary: summary[0],
          from_date,
          to_date
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve IDG meeting compliance",
        error: error.message
      };
    }
  }

  /**
   * Get medication reconciliation status
   * GET /reports/compliance/medication-reconciliation
   */
  async getMedicationReconciliation(request, reply) {
    try {
      const result = await db
        .select({
          patient_id: patients.id,
          patient_name: sql`CONCAT(${patients.first_name}, ' ', ${patients.last_name})`,
          admission_date: patients.admission_date,
          medication_count: count(medications.id)
        })
        .from(patients)
        .leftJoin(medications, eq(medications.patient_id, patients.id))
        .where(and(
          eq(patients.status, 'ACTIVE'),
          isNull(patients.deleted_at)
        ))
        .groupBy(patients.id, patients.first_name, patients.last_name, patients.admission_date)
        .orderBy(patients.last_name);

      return {
        status: 200,
        message: "Medication reconciliation status retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve medication reconciliation status",
        error: error.message
      };
    }
  }

  // ==================== BILLING REPORTS ====================

  /**
   * Get claims pending submission
   * GET /reports/billing/pending-claims
   */
  async getPendingClaims(request, reply) {
    try {
      const result = await db
        .select({
          claim_id: claims.id,
          patient_id: claims.patient_id,
          patient_name: sql`CONCAT(${patients.first_name}, ' ', ${patients.last_name})`,
          claim_number: claims.claim_number,
          claim_type: claims.claim_type,
          claim_status: claims.claim_status,
          service_start_date: claims.service_start_date,
          service_end_date: claims.service_end_date,
          total_charges: claims.total_charges,
          days_pending: sql`EXTRACT(DAY FROM (CURRENT_DATE - ${claims.createdAt}))`
        })
        .from(claims)
        .innerJoin(patients, eq(claims.patient_id, patients.id))
        .where(and(
          inArray(claims.claim_status, ['DRAFT', 'READY_FOR_SUBMISSION', 'PENDING']),
          isNull(claims.deleted_at),
          isNull(patients.deleted_at)
        ))
        .orderBy(claims.createdAt);

      const summary = await db
        .select({
          total_claims: count(),
          total_charges: sum(claims.total_charges)
        })
        .from(claims)
        .where(and(
          inArray(claims.claim_status, ['DRAFT', 'READY_FOR_SUBMISSION', 'PENDING']),
          isNull(claims.deleted_at)
        ));

      return {
        status: 200,
        message: "Pending claims retrieved successfully",
        data: {
          claims: result,
          summary: summary[0]
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve pending claims",
        error: error.message
      };
    }
  }

  /**
   * Get AR aging summary
   * GET /reports/billing/ar-aging-summary
   */
  async getARAgingSummary(request, reply) {
    try {
      const result = await db
        .select({
          aging_bucket: ar_aging.aging_bucket,
          total_balance: sum(ar_aging.balance),
          claim_count: count()
        })
        .from(ar_aging)
        .where(isNull(ar_aging.deleted_at))
        .groupBy(ar_aging.aging_bucket)
        .orderBy(ar_aging.aging_bucket);

      const total = await db
        .select({
          total_ar: sum(ar_aging.balance),
          total_claims: count()
        })
        .from(ar_aging)
        .where(isNull(ar_aging.deleted_at));

      return {
        status: 200,
        message: "AR aging summary retrieved successfully",
        data: {
          by_bucket: result,
          totals: total[0],
          as_of_date: new Date().toISOString()
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve AR aging summary",
        error: error.message
      };
    }
  }

  /**
   * Get revenue by payer
   * GET /reports/billing/revenue-by-payer
   */
  async getRevenueByPayer(request, reply) {
    try {
      const { from_date, to_date } = request.query;

      let conditions = [isNull(claims.deleted_at)];

      if (from_date) {
        conditions.push(gte(claims.paid_date, from_date));
      }
      if (to_date) {
        conditions.push(lte(claims.paid_date, to_date));
      }

      const result = await db
        .select({
          payer_id: claims.payer_id,
          total_charges: sum(claims.total_charges),
          total_paid: sum(claims.total_paid),
          claim_count: count()
        })
        .from(claims)
        .where(and(...conditions))
        .groupBy(claims.payer_id)
        .orderBy(desc(sum(claims.total_paid)));

      return {
        status: 200,
        message: "Revenue by payer retrieved successfully",
        data: {
          payers: result,
          from_date,
          to_date
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve revenue by payer",
        error: error.message
      };
    }
  }

  /**
   * Get unbilled periods
   * GET /reports/billing/unbilled-periods
   */
  async getUnbilledPeriods(request, reply) {
    try {
      const result = await db
        .select({
          patient_id: billing_periods.patient_id,
          patient_name: sql`CONCAT(${patients.first_name}, ' ', ${patients.last_name})`,
          period_start: billing_periods.period_start,
          period_end: billing_periods.period_end,
          level_of_care: billing_periods.level_of_care,
          days_unbilled: sql`EXTRACT(DAY FROM (CURRENT_DATE - ${billing_periods.period_end}))`
        })
        .from(billing_periods)
        .innerJoin(patients, eq(billing_periods.patient_id, patients.id))
        .where(and(
          eq(billing_periods.billed, false),
          lte(billing_periods.period_end, sql`CURRENT_DATE`),
          isNull(billing_periods.deleted_at),
          isNull(patients.deleted_at)
        ))
        .orderBy(billing_periods.period_end);

      return {
        status: 200,
        message: "Unbilled periods retrieved successfully",
        data: {
          periods: result,
          count: result.length
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve unbilled periods",
        error: error.message
      };
    }
  }

  // ==================== QAPI REPORTS ====================

  /**
   * Get incidents summary
   * GET /reports/qapi/incidents-summary
   */
  async getIncidentsSummary(request, reply) {
    try {
      const { from_date, to_date } = request.query;

      let conditions = [isNull(incidents.deleted_at)];

      if (from_date) {
        conditions.push(gte(incidents.incident_date, from_date));
      }
      if (to_date) {
        conditions.push(lte(incidents.incident_date, to_date));
      }

      const by_type = await db
        .select({
          incident_type: incidents.incident_type,
          count: count(),
          high_severity: sql`COUNT(CASE WHEN ${incidents.severity} = 'HIGH' THEN 1 END)`,
          moderate_severity: sql`COUNT(CASE WHEN ${incidents.severity} = 'MODERATE' THEN 1 END)`,
          low_severity: sql`COUNT(CASE WHEN ${incidents.severity} = 'LOW' THEN 1 END)`
        })
        .from(incidents)
        .where(and(...conditions))
        .groupBy(incidents.incident_type);

      const by_status = await db
        .select({
          status: incidents.status,
          count: count()
        })
        .from(incidents)
        .where(and(...conditions))
        .groupBy(incidents.status);

      return {
        status: 200,
        message: "Incidents summary retrieved successfully",
        data: {
          by_type,
          by_status,
          from_date,
          to_date
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve incidents summary",
        error: error.message
      };
    }
  }

  /**
   * Get grievances summary
   * GET /reports/qapi/grievances-summary
   */
  async getGrievancesSummary(request, reply) {
    try {
      const { from_date, to_date } = request.query;

      let conditions = [isNull(grievances.deleted_at)];

      if (from_date) {
        conditions.push(gte(grievances.received_date, from_date));
      }
      if (to_date) {
        conditions.push(lte(grievances.received_date, to_date));
      }

      const by_type = await db
        .select({
          grievance_type: grievances.grievance_type,
          count: count(),
          high_priority: sql`COUNT(CASE WHEN ${grievances.priority} = 'HIGH' THEN 1 END)`
        })
        .from(grievances)
        .where(and(...conditions))
        .groupBy(grievances.grievance_type);

      const by_status = await db
        .select({
          status: grievances.status,
          count: count()
        })
        .from(grievances)
        .where(and(...conditions))
        .groupBy(grievances.status);

      return {
        status: 200,
        message: "Grievances summary retrieved successfully",
        data: {
          by_type,
          by_status,
          from_date,
          to_date
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve grievances summary",
        error: error.message
      };
    }
  }

  /**
   * Get quality measures dashboard
   * GET /reports/qapi/quality-measures-dashboard
   */
  async getQualityMeasuresDashboard(request, reply) {
    try {
      const { from_date, to_date } = request.query;

      let conditions = [isNull(quality_measure_data.deleted_at)];

      if (from_date) {
        conditions.push(gte(quality_measure_data.measurement_date, from_date));
      }
      if (to_date) {
        conditions.push(lte(quality_measure_data.measurement_date, to_date));
      }

      const result = await db
        .select({
          quality_measure_id: quality_measure_data.quality_measure_id,
          avg_actual_value: avg(quality_measure_data.actual_value),
          avg_target_value: avg(quality_measure_data.target_value),
          avg_variance: avg(quality_measure_data.variance),
          measurement_count: count()
        })
        .from(quality_measure_data)
        .where(and(...conditions))
        .groupBy(quality_measure_data.quality_measure_id);

      return {
        status: 200,
        message: "Quality measures dashboard retrieved successfully",
        data: {
          measures: result,
          from_date,
          to_date
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve quality measures dashboard",
        error: error.message
      };
    }
  }

  /**
   * Get chart audit scores
   * GET /reports/qapi/chart-audit-scores
   */
  async getChartAuditScores(request, reply) {
    try {
      const { from_date, to_date } = request.query;

      let conditions = [isNull(chart_audits.deleted_at)];

      if (from_date) {
        conditions.push(gte(chart_audits.audit_date, from_date));
      }
      if (to_date) {
        conditions.push(lte(chart_audits.audit_date, to_date));
      }

      const summary = await db
        .select({
          avg_compliance_score: avg(chart_audits.compliance_score),
          total_audits: count(),
          documentation_complete_rate: sql`ROUND(100.0 * COUNT(CASE WHEN ${chart_audits.documentation_complete} = true THEN 1 END) / COUNT(*), 2)`,
          signatures_present_rate: sql`ROUND(100.0 * COUNT(CASE WHEN ${chart_audits.signatures_present} = true THEN 1 END) / COUNT(*), 2)`,
          orders_current_rate: sql`ROUND(100.0 * COUNT(CASE WHEN ${chart_audits.orders_current} = true THEN 1 END) / COUNT(*), 2)`
        })
        .from(chart_audits)
        .where(and(...conditions));

      const by_auditor = await db
        .select({
          auditor_id: chart_audits.auditor_id,
          avg_compliance_score: avg(chart_audits.compliance_score),
          audit_count: count()
        })
        .from(chart_audits)
        .where(and(...conditions))
        .groupBy(chart_audits.auditor_id);

      return {
        status: 200,
        message: "Chart audit scores retrieved successfully",
        data: {
          summary: summary[0],
          by_auditor,
          from_date,
          to_date
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve chart audit scores",
        error: error.message
      };
    }
  }

  // ==================== STAFF REPORTS ====================

  /**
   * Get staff productivity
   * GET /reports/staff/productivity
   */
  async getStaffProductivity(request, reply) {
    try {
      const { from_date, to_date } = request.query;

      const result = await db
        .select({
          staff_id: staff_profiles.id,
          staff_name: sql`CONCAT(${staff_profiles.first_name}, ' ', ${staff_profiles.last_name})`,
          role: staff_profiles.role,
          caseload_count: count(staff_caseload.id)
        })
        .from(staff_profiles)
        .leftJoin(staff_caseload, eq(staff_caseload.staff_id, staff_profiles.id))
        .where(and(
          eq(staff_profiles.employment_status, 'ACTIVE'),
          isNull(staff_profiles.deleted_at)
        ))
        .groupBy(staff_profiles.id, staff_profiles.first_name, staff_profiles.last_name, staff_profiles.role)
        .orderBy(staff_profiles.last_name);

      return {
        status: 200,
        message: "Staff productivity retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve staff productivity",
        error: error.message
      };
    }
  }

  /**
   * Get credential expiration alerts
   * GET /reports/staff/credential-expirations
   */
  async getCredentialExpirations(request, reply) {
    try {
      const { days_ahead = 90 } = request.query;

      const result = await db
        .select({
          staff_id: staff_credentials.staff_id,
          staff_name: sql`CONCAT(${staff_profiles.first_name}, ' ', ${staff_profiles.last_name})`,
          credential_type: staff_credentials.credential_type,
          credential_number: staff_credentials.credential_number,
          expiration_date: staff_credentials.expiration_date,
          days_until_expiration: sql`EXTRACT(DAY FROM (${staff_credentials.expiration_date} - CURRENT_DATE))`
        })
        .from(staff_credentials)
        .innerJoin(staff_profiles, eq(staff_credentials.staff_id, staff_profiles.id))
        .where(and(
          lte(staff_credentials.expiration_date, sql`CURRENT_DATE + INTERVAL '${sql.raw(days_ahead.toString())} days'`),
          gte(staff_credentials.expiration_date, sql`CURRENT_DATE`),
          isNull(staff_credentials.deleted_at),
          isNull(staff_profiles.deleted_at)
        ))
        .orderBy(staff_credentials.expiration_date);

      return {
        status: 200,
        message: "Credential expirations retrieved successfully",
        data: {
          credentials: result,
          count: result.length,
          days_ahead: parseInt(days_ahead)
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve credential expirations",
        error: error.message
      };
    }
  }

  /**
   * Get caseload by staff
   * GET /reports/staff/caseload-summary
   */
  async getCaseloadSummary(request, reply) {
    try {
      const result = await db
        .select({
          staff_id: staff_profiles.id,
          staff_name: sql`CONCAT(${staff_profiles.first_name}, ' ', ${staff_profiles.last_name})`,
          role: staff_profiles.role,
          active_patients: count(staff_caseload.id)
        })
        .from(staff_profiles)
        .leftJoin(
          staff_caseload,
          and(
            eq(staff_caseload.staff_id, staff_profiles.id),
            eq(staff_caseload.status, 'ACTIVE')
          )
        )
        .where(and(
          eq(staff_profiles.employment_status, 'ACTIVE'),
          isNull(staff_profiles.deleted_at)
        ))
        .groupBy(staff_profiles.id, staff_profiles.first_name, staff_profiles.last_name, staff_profiles.role)
        .orderBy(desc(count(staff_caseload.id)));

      return {
        status: 200,
        message: "Caseload summary retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve caseload summary",
        error: error.message
      };
    }
  }

  // ==================== BEREAVEMENT REPORTS ====================

  /**
   * Get active bereavement cases
   * GET /reports/bereavement/active-cases
   */
  async getActiveBereavementCases(request, reply) {
    try {
      const result = await db
        .select({
          case_id: bereavement_cases.id,
          patient_id: bereavement_cases.patient_id,
          patient_name: sql`CONCAT(${patients.first_name}, ' ', ${patients.last_name})`,
          date_of_death: bereavement_cases.date_of_death,
          bereavement_end_date: bereavement_cases.bereavement_end_date,
          days_remaining: sql`EXTRACT(DAY FROM (${bereavement_cases.bereavement_end_date} - CURRENT_DATE))`,
          case_status: bereavement_cases.case_status,
          service_level: bereavement_cases.service_level
        })
        .from(bereavement_cases)
        .innerJoin(patients, eq(bereavement_cases.patient_id, patients.id))
        .where(and(
          eq(bereavement_cases.case_status, 'ACTIVE'),
          isNull(bereavement_cases.deleted_at),
          isNull(patients.deleted_at)
        ))
        .orderBy(bereavement_cases.bereavement_end_date);

      return {
        status: 200,
        message: "Active bereavement cases retrieved successfully",
        data: {
          cases: result,
          count: result.length
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve active bereavement cases",
        error: error.message
      };
    }
  }

  /**
   * Get executive dashboard summary
   * GET /reports/executive/dashboard
   */
  async getExecutiveDashboard(request, reply) {
    try {
      // Current census
      const census = await db
        .select({ count: count() })
        .from(patients)
        .where(and(
          eq(patients.status, 'ACTIVE'),
          isNull(patients.deleted_at)
        ));

      // Claims pending
      const pendingClaims = await db
        .select({ count: count(), total_charges: sum(claims.total_charges) })
        .from(claims)
        .where(and(
          inArray(claims.claim_status, ['DRAFT', 'READY_FOR_SUBMISSION', 'PENDING']),
          isNull(claims.deleted_at)
        ));

      // Active incidents
      const activeIncidents = await db
        .select({ count: count() })
        .from(incidents)
        .where(and(
          eq(incidents.status, 'OPEN'),
          isNull(incidents.deleted_at)
        ));

      // Active grievances
      const activeGrievances = await db
        .select({ count: count() })
        .from(grievances)
        .where(and(
          inArray(grievances.status, ['OPEN', 'UNDER_INVESTIGATION']),
          isNull(grievances.deleted_at)
        ));

      // Recertifications due in 30 days
      const recertsDue = await db
        .select({ count: count() })
        .from(certifications)
        .where(and(
          lte(certifications.end_date, sql`CURRENT_DATE + INTERVAL '30 days'`),
          gte(certifications.end_date, sql`CURRENT_DATE`),
          isNull(certifications.deleted_at)
        ));

      return {
        status: 200,
        message: "Executive dashboard retrieved successfully",
        data: {
          current_census: census[0].count,
          pending_claims: pendingClaims[0].count,
          pending_claims_value: pendingClaims[0].total_charges,
          active_incidents: activeIncidents[0].count,
          active_grievances: activeGrievances[0].count,
          recertifications_due_30_days: recertsDue[0].count,
          as_of_date: new Date().toISOString()
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve executive dashboard",
        error: error.message
      };
    }
  }
}

export default new ReportsController();
