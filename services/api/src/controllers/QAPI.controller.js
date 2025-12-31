import { db } from "../config/db.drizzle.js";
import {
  incidents,
  grievances,
  quality_measures,
  quality_measure_data,
  performance_improvement_projects,
  chart_audits,
  infection_control
} from "../db/schemas/qapi.schema.js";
import { eq, and, isNull, desc, gte, lte, sql } from "drizzle-orm";

/**
 * QAPI Controller
 * Manages Quality Assurance and Performance Improvement operations
 * including incidents, grievances, quality measures, PIPs, chart audits, and infection control
 */
class QAPIController {
  // ==================== INCIDENTS MANAGEMENT ====================

  /**
   * Get all incidents with optional filters
   */
  async getAllIncidents(request, reply) {
    try {
      const { patient_id, incident_type, severity, status, from_date, to_date } = request.query;

      let conditions = [isNull(incidents.deleted_at)];

      if (patient_id) {
        conditions.push(eq(incidents.patient_id, parseInt(patient_id)));
      }
      if (incident_type) {
        conditions.push(eq(incidents.incident_type, incident_type));
      }
      if (severity) {
        conditions.push(eq(incidents.severity, severity));
      }
      if (status) {
        conditions.push(eq(incidents.status, status));
      }
      if (from_date) {
        conditions.push(gte(incidents.incident_date, from_date));
      }
      if (to_date) {
        conditions.push(lte(incidents.incident_date, to_date));
      }

      const result = await db
        .select()
        .from(incidents)
        .where(and(...conditions))
        .orderBy(desc(incidents.incident_date));

      return {
        status: 200,
        message: "Incidents retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve incidents",
        error: error.message
      };
    }
  }

  /**
   * Get incident by ID
   */
  async getIncidentById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(incidents)
        .where(and(
          eq(incidents.id, parseInt(id)),
          isNull(incidents.deleted_at)
        ));

      if (result.length === 0) {
        reply.code(404);
        return {
          status: 404,
          message: "Incident not found"
        };
      }

      return {
        status: 200,
        message: "Incident retrieved successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve incident",
        error: error.message
      };
    }
  }

  /**
   * Create new incident report
   */
  async createIncident(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(incidents)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Incident created successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create incident",
        error: error.message
      };
    }
  }

  /**
   * Update incident (for investigation/corrective actions)
   */
  async updateIncident(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(incidents)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(incidents.id, parseInt(id)),
          isNull(incidents.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return {
          status: 404,
          message: "Incident not found"
        };
      }

      return {
        status: 200,
        message: "Incident updated successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to update incident",
        error: error.message
      };
    }
  }

  /**
   * Close incident with resolution
   */
  async closeIncident(request, reply) {
    try {
      const { id } = request.params;
      const { resolution_notes, corrective_actions } = request.body;

      const result = await db
        .update(incidents)
        .set({
          status: 'CLOSED',
          resolution_notes,
          corrective_actions,
          closed_date: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(incidents.id, parseInt(id)),
          isNull(incidents.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return {
          status: 404,
          message: "Incident not found"
        };
      }

      return {
        status: 200,
        message: "Incident closed successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to close incident",
        error: error.message
      };
    }
  }

  /**
   * Delete incident (soft delete)
   */
  async deleteIncident(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(incidents)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id
        })
        .where(and(
          eq(incidents.id, parseInt(id)),
          isNull(incidents.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return {
          status: 404,
          message: "Incident not found"
        };
      }

      return {
        status: 200,
        message: "Incident deleted successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to delete incident",
        error: error.message
      };
    }
  }

  // ==================== GRIEVANCES MANAGEMENT ====================

  /**
   * Get all grievances with optional filters
   */
  async getAllGrievances(request, reply) {
    try {
      const { patient_id, grievance_type, priority, status, from_date, to_date } = request.query;

      let conditions = [isNull(grievances.deleted_at)];

      if (patient_id) {
        conditions.push(eq(grievances.patient_id, parseInt(patient_id)));
      }
      if (grievance_type) {
        conditions.push(eq(grievances.grievance_type, grievance_type));
      }
      if (priority) {
        conditions.push(eq(grievances.priority, priority));
      }
      if (status) {
        conditions.push(eq(grievances.status, status));
      }
      if (from_date) {
        conditions.push(gte(grievances.received_date, from_date));
      }
      if (to_date) {
        conditions.push(lte(grievances.received_date, to_date));
      }

      const result = await db
        .select()
        .from(grievances)
        .where(and(...conditions))
        .orderBy(desc(grievances.received_date));

      return {
        status: 200,
        message: "Grievances retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve grievances",
        error: error.message
      };
    }
  }

  /**
   * Get grievance by ID
   */
  async getGrievanceById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(grievances)
        .where(and(
          eq(grievances.id, parseInt(id)),
          isNull(grievances.deleted_at)
        ));

      if (result.length === 0) {
        reply.code(404);
        return {
          status: 404,
          message: "Grievance not found"
        };
      }

      return {
        status: 200,
        message: "Grievance retrieved successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve grievance",
        error: error.message
      };
    }
  }

  /**
   * Create new grievance
   */
  async createGrievance(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(grievances)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Grievance created successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create grievance",
        error: error.message
      };
    }
  }

  /**
   * Update grievance investigation
   */
  async updateGrievance(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(grievances)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(grievances.id, parseInt(id)),
          isNull(grievances.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return {
          status: 404,
          message: "Grievance not found"
        };
      }

      return {
        status: 200,
        message: "Grievance updated successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to update grievance",
        error: error.message
      };
    }
  }

  /**
   * Resolve grievance
   */
  async resolveGrievance(request, reply) {
    try {
      const { id } = request.params;
      const { resolution, resolution_notes } = request.body;

      const result = await db
        .update(grievances)
        .set({
          status: 'RESOLVED',
          resolution,
          resolution_notes,
          resolution_date: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(grievances.id, parseInt(id)),
          isNull(grievances.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return {
          status: 404,
          message: "Grievance not found"
        };
      }

      return {
        status: 200,
        message: "Grievance resolved successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to resolve grievance",
        error: error.message
      };
    }
  }

  /**
   * Delete grievance (soft delete)
   */
  async deleteGrievance(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(grievances)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id
        })
        .where(and(
          eq(grievances.id, parseInt(id)),
          isNull(grievances.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return {
          status: 404,
          message: "Grievance not found"
        };
      }

      return {
        status: 200,
        message: "Grievance deleted successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to delete grievance",
        error: error.message
      };
    }
  }

  // ==================== QUALITY MEASURES ====================

  /**
   * Get all quality measures
   */
  async getAllQualityMeasures(request, reply) {
    try {
      const { category, status, cms_required } = request.query;

      let conditions = [isNull(quality_measures.deleted_at)];

      if (category) {
        conditions.push(eq(quality_measures.category, category));
      }
      if (status) {
        conditions.push(eq(quality_measures.status, status));
      }
      if (cms_required !== undefined) {
        conditions.push(eq(quality_measures.cms_required, cms_required === 'true'));
      }

      const result = await db
        .select()
        .from(quality_measures)
        .where(and(...conditions))
        .orderBy(quality_measures.measure_name);

      return {
        status: 200,
        message: "Quality measures retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve quality measures",
        error: error.message
      };
    }
  }

  /**
   * Create quality measure
   */
  async createQualityMeasure(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(quality_measures)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Quality measure created successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create quality measure",
        error: error.message
      };
    }
  }

  /**
   * Record quality measure data point
   */
  async recordMeasureData(request, reply) {
    try {
      const data = request.body;

      // Calculate variance from target if both values exist
      let variance = null;
      if (data.actual_value !== null && data.target_value !== null) {
        variance = data.actual_value - data.target_value;
      }

      const result = await db
        .insert(quality_measure_data)
        .values({
          ...data,
          variance,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Quality measure data recorded successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to record quality measure data",
        error: error.message
      };
    }
  }

  /**
   * Get measure trends (data points over time)
   */
  async getMeasureTrends(request, reply) {
    try {
      const { measure_id, from_date, to_date } = request.query;

      if (!measure_id) {
        reply.code(400);
        return {
          status: 400,
          message: "measure_id is required"
        };
      }

      let conditions = [
        eq(quality_measure_data.quality_measure_id, parseInt(measure_id)),
        isNull(quality_measure_data.deleted_at)
      ];

      if (from_date) {
        conditions.push(gte(quality_measure_data.measurement_date, from_date));
      }
      if (to_date) {
        conditions.push(lte(quality_measure_data.measurement_date, to_date));
      }

      const result = await db
        .select()
        .from(quality_measure_data)
        .where(and(...conditions))
        .orderBy(quality_measure_data.measurement_date);

      return {
        status: 200,
        message: "Measure trends retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve measure trends",
        error: error.message
      };
    }
  }

  // ==================== PERFORMANCE IMPROVEMENT PROJECTS ====================

  /**
   * Get all PIPs
   */
  async getAllPIPs(request, reply) {
    try {
      const { status, priority } = request.query;

      let conditions = [isNull(performance_improvement_projects.deleted_at)];

      if (status) {
        conditions.push(eq(performance_improvement_projects.status, status));
      }
      if (priority) {
        conditions.push(eq(performance_improvement_projects.priority, priority));
      }

      const result = await db
        .select()
        .from(performance_improvement_projects)
        .where(and(...conditions))
        .orderBy(desc(performance_improvement_projects.start_date));

      return {
        status: 200,
        message: "PIPs retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve PIPs",
        error: error.message
      };
    }
  }

  /**
   * Create new PIP
   */
  async createPIP(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(performance_improvement_projects)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "PIP created successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create PIP",
        error: error.message
      };
    }
  }

  /**
   * Update PIP status and progress
   */
  async updatePIP(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(performance_improvement_projects)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(performance_improvement_projects.id, parseInt(id)),
          isNull(performance_improvement_projects.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return {
          status: 404,
          message: "PIP not found"
        };
      }

      return {
        status: 200,
        message: "PIP updated successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to update PIP",
        error: error.message
      };
    }
  }

  // ==================== CHART AUDITS ====================

  /**
   * Conduct chart audit
   */
  async conductChartAudit(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(chart_audits)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Chart audit recorded successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to record chart audit",
        error: error.message
      };
    }
  }

  /**
   * Get audit results with filters
   */
  async getAuditResults(request, reply) {
    try {
      const { patient_id, auditor_id, from_date, to_date } = request.query;

      let conditions = [isNull(chart_audits.deleted_at)];

      if (patient_id) {
        conditions.push(eq(chart_audits.patient_id, parseInt(patient_id)));
      }
      if (auditor_id) {
        conditions.push(eq(chart_audits.auditor_id, auditor_id));
      }
      if (from_date) {
        conditions.push(gte(chart_audits.audit_date, from_date));
      }
      if (to_date) {
        conditions.push(lte(chart_audits.audit_date, to_date));
      }

      const result = await db
        .select()
        .from(chart_audits)
        .where(and(...conditions))
        .orderBy(desc(chart_audits.audit_date));

      return {
        status: 200,
        message: "Audit results retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve audit results",
        error: error.message
      };
    }
  }

  // ==================== INFECTION CONTROL ====================

  /**
   * Get all infection reports
   */
  async getAllInfections(request, reply) {
    try {
      const { patient_id, infection_type, source, from_date, to_date } = request.query;

      let conditions = [isNull(infection_control.deleted_at)];

      if (patient_id) {
        conditions.push(eq(infection_control.patient_id, parseInt(patient_id)));
      }
      if (infection_type) {
        conditions.push(eq(infection_control.infection_type, infection_type));
      }
      if (source) {
        conditions.push(eq(infection_control.source, source));
      }
      if (from_date) {
        conditions.push(gte(infection_control.onset_date, from_date));
      }
      if (to_date) {
        conditions.push(lte(infection_control.onset_date, to_date));
      }

      const result = await db
        .select()
        .from(infection_control)
        .where(and(...conditions))
        .orderBy(desc(infection_control.onset_date));

      return {
        status: 200,
        message: "Infection reports retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve infection reports",
        error: error.message
      };
    }
  }

  /**
   * Report new infection
   */
  async reportInfection(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(infection_control)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Infection reported successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to report infection",
        error: error.message
      };
    }
  }

  /**
   * Update infection report
   */
  async updateInfection(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(infection_control)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(infection_control.id, parseInt(id)),
          isNull(infection_control.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return {
          status: 404,
          message: "Infection report not found"
        };
      }

      return {
        status: 200,
        message: "Infection report updated successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to update infection report",
        error: error.message
      };
    }
  }
}

export default new QAPIController();
