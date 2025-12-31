import { db } from '../config/db.drizzle.js';
import {
  bereavement_cases,
  bereavement_contacts,
  bereavement_plans,
  bereavement_encounters,
  bereavement_risk_assessments,
  support_groups,
  support_group_sessions,
  support_group_participants,
  patients
} from '../db/schemas/index.js';
import { eq, and, desc, isNull, gte, lte, sql } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';
/**
 * Bereavement Controller
 * Module K - MEDIUM Priority
 *
 * Purpose: 13-month bereavement requirement, grief support services
 * Compliance: CMS requires hospices to provide bereavement services for 13 months after patient death
 *
 * Endpoints:
 * - Bereavement case management (create, update, close)
 * - Contact management (family/friends receiving services)
 * - Care plan development
 * - Encounter documentation
 * - Risk assessments
 * - Support group management
 */
class BereavementController {
  // ============================================
  // BEREAVEMENT CASES
  // ============================================

  /**
   * Get all bereavement cases
   * GET /bereavement/cases
   */
  async getAllCases(request, reply) {
    try {
      const { limit = 50, offset = 0, case_status, service_level } = request.query;

      let query = db
        .select({
          case: bereavement_cases,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(bereavement_cases)
        .leftJoin(patients, eq(bereavement_cases.patient_id, patients.id))
        .where(isNull(bereavement_cases.deleted_at));

      const filters = [];
      if (case_status) {
        filters.push(eq(bereavement_cases.case_status, case_status));
      }
      if (service_level) {
        filters.push(eq(bereavement_cases.service_level, service_level));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query
        .orderBy(desc(bereavement_cases.date_of_death))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching bereavement cases:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching bereavement cases',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create bereavement case
   * POST /bereavement/cases
   */
  async createCase(request, reply) {
    try {
      const data = request.body;

      // Calculate bereavement period (13 months from date of death)
      if (data.date_of_death && !data.bereavement_end_date) {
        const deathDate = new Date(data.date_of_death);
        const endDate = new Date(deathDate);
        endDate.setMonth(endDate.getMonth() + 13);
        data.bereavement_end_date = endDate.toISOString().split('T')[0];
        data.bereavement_start_date = data.date_of_death;
      }

      const result = await db
        .insert(bereavement_cases)
        .values({
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Bereavement case created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating bereavement case:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating bereavement case',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get bereavement case by ID
   * GET /bereavement/cases/:id
   */
  async getCaseById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select({
          case: bereavement_cases,
          patient: patients
        })
        .from(bereavement_cases)
        .leftJoin(patients, eq(bereavement_cases.patient_id, patients.id))
        .where(and(
          eq(bereavement_cases.id, parseInt(id)),
          isNull(bereavement_cases.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Bereavement case not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching bereavement case:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching bereavement case',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update bereavement case
   * PATCH /bereavement/cases/:id
   */
  async updateCase(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_cases)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_cases.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Bereavement case not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Bereavement case updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating bereavement case:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating bereavement case',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // BEREAVEMENT CONTACTS
  // ============================================

  /**
   * Get contacts for a bereavement case
   * GET /bereavement/cases/:id/contacts
   */
  async getCaseContacts(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(bereavement_contacts)
        .where(and(
          eq(bereavement_contacts.bereavement_case_id, parseInt(id)),
          isNull(bereavement_contacts.deleted_at)
        ))
        .orderBy(desc(bereavement_contacts.is_primary_contact), bereavement_contacts.last_name);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching bereavement contacts:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching bereavement contacts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add contact to bereavement case
   * POST /bereavement/cases/:id/contacts
   */
  async addContact(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_contacts)
        .values({
          ...data,
          bereavement_case_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Bereavement contact added successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding bereavement contact:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding bereavement contact',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // BEREAVEMENT PLANS
  // ============================================

  /**
   * Get bereavement plans for a case
   * GET /bereavement/cases/:id/plans
   */
  async getCasePlans(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(bereavement_plans)
        .where(and(
          eq(bereavement_plans.bereavement_case_id, parseInt(id)),
          isNull(bereavement_plans.deleted_at)
        ))
        .orderBy(desc(bereavement_plans.plan_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching bereavement plans:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching bereavement plans',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create bereavement plan
   * POST /bereavement/cases/:id/plans
   */
  async createPlan(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_plans)
        .values({
          ...data,
          bereavement_case_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Bereavement plan created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating bereavement plan:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating bereavement plan',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // BEREAVEMENT ENCOUNTERS
  // ============================================

  /**
   * Get encounters for a bereavement case
   * GET /bereavement/cases/:id/encounters
   */
  async getCaseEncounters(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select({
          encounter: bereavement_encounters,
          contact: bereavement_contacts
        })
        .from(bereavement_encounters)
        .leftJoin(
          bereavement_contacts,
          eq(bereavement_encounters.bereavement_contact_id, bereavement_contacts.id)
        )
        .where(and(
          eq(bereavement_encounters.bereavement_case_id, parseInt(id)),
          isNull(bereavement_encounters.deleted_at)
        ))
        .orderBy(desc(bereavement_encounters.encounter_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching bereavement encounters:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching bereavement encounters',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create bereavement encounter
   * POST /bereavement/cases/:id/encounters
   */
  async createEncounter(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_encounters)
        .values({
          ...data,
          bereavement_case_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Bereavement encounter created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating bereavement encounter:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating bereavement encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // RISK ASSESSMENTS
  // ============================================

  /**
   * Get risk assessments for a case
   * GET /bereavement/cases/:id/risk-assessments
   */
  async getCaseRiskAssessments(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(bereavement_risk_assessments)
        .where(and(
          eq(bereavement_risk_assessments.bereavement_case_id, parseInt(id)),
          isNull(bereavement_risk_assessments.deleted_at)
        ))
        .orderBy(desc(bereavement_risk_assessments.assessment_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching risk assessments:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching risk assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create risk assessment
   * POST /bereavement/cases/:id/risk-assessments
   */
  async createRiskAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Calculate risk score based on boolean factors
      let riskScore = 0;
      const riskFactors = [
        'sudden_death', 'traumatic_death', 'suicide', 'child_death', 'multiple_losses',
        'history_of_mental_illness', 'history_of_substance_abuse', 'limited_social_support',
        'financial_stress', 'caregiver_burden', 'prolonged_grief', 'depression_symptoms',
        'anxiety_symptoms', 'suicidal_ideation', 'functional_impairment'
      ];

      riskFactors.forEach(factor => {
        if (data[factor] === true) {
          riskScore++;
        }
      });

      // Determine risk level
      let riskLevel = 'LOW';
      if (riskScore >= 8) {
        riskLevel = 'HIGH';
      } else if (riskScore >= 4) {
        riskLevel = 'MODERATE';
      }

      const result = await db
        .insert(bereavement_risk_assessments)
        .values({
          ...data,
          total_risk_score: riskScore,
          risk_level: data.risk_level || riskLevel,
          bereavement_case_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Risk assessment created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating risk assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating risk assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // SUPPORT GROUPS
  // ============================================

  /**
   * Get all support groups
   * GET /bereavement/support-groups
   */
  async getAllSupportGroups(request, reply) {
    try {
      const { group_status, group_type } = request.query;

      let query = db
        .select()
        .from(support_groups)
        .where(isNull(support_groups.deleted_at));

      const filters = [];
      if (group_status) {
        filters.push(eq(support_groups.group_status, group_status));
      }
      if (group_type) {
        filters.push(eq(support_groups.group_type, group_type));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(support_groups.group_name);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching support groups:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching support groups',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create support group
   * POST /bereavement/support-groups
   */
  async createSupportGroup(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(support_groups)
        .values({
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Support group created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating support group:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating support group',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get support group sessions
   * GET /bereavement/support-groups/:id/sessions
   */
  async getSupportGroupSessions(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(support_group_sessions)
        .where(and(
          eq(support_group_sessions.support_group_id, parseInt(id)),
          isNull(support_group_sessions.deleted_at)
        ))
        .orderBy(desc(support_group_sessions.session_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching support group sessions:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching support group sessions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create support group session
   * POST /bereavement/support-groups/:id/sessions
   */
  async createSupportGroupSession(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(support_group_sessions)
        .values({
          ...data,
          support_group_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Support group session created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating support group session:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating support group session',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new BereavementController();
