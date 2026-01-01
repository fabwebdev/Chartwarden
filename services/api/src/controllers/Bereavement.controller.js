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
  bereavement_follow_ups,
  bereavement_resources,
  bereavement_memorial_services,
  bereavement_memorial_attendees,
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

  // ============================================
  // FOLLOW-UP TRACKING
  // ============================================

  /**
   * Get follow-ups for a bereavement case
   * GET /bereavement/cases/:id/follow-ups
   */
  async getCaseFollowUps(request, reply) {
    try {
      const { id } = request.params;
      const { status, milestone_type } = request.query;

      let query = db
        .select({
          follow_up: bereavement_follow_ups,
          contact: bereavement_contacts
        })
        .from(bereavement_follow_ups)
        .leftJoin(
          bereavement_contacts,
          eq(bereavement_follow_ups.bereavement_contact_id, bereavement_contacts.id)
        )
        .where(and(
          eq(bereavement_follow_ups.bereavement_case_id, parseInt(id)),
          isNull(bereavement_follow_ups.deleted_at)
        ));

      const filters = [];
      if (status) {
        filters.push(eq(bereavement_follow_ups.follow_up_status, status));
      }
      if (milestone_type) {
        filters.push(eq(bereavement_follow_ups.milestone_type, milestone_type));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(bereavement_follow_ups.scheduled_date);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching follow-ups:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching follow-ups',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create follow-up for a bereavement case
   * POST /bereavement/cases/:id/follow-ups
   */
  async createFollowUp(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_follow_ups)
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
        message: 'Follow-up created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating follow-up:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating follow-up',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update follow-up
   * PATCH /bereavement/follow-ups/:id
   */
  async updateFollowUp(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_follow_ups)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_follow_ups.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Follow-up not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Follow-up updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating follow-up:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating follow-up',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Generate scheduled follow-ups for a bereavement case (standard milestones)
   * POST /bereavement/cases/:id/follow-ups/generate
   */
  async generateStandardFollowUps(request, reply) {
    try {
      const { id } = request.params;
      const { contact_id } = request.body;

      // Get the bereavement case to find the date of death
      const caseResult = await db
        .select()
        .from(bereavement_cases)
        .where(eq(bereavement_cases.id, parseInt(id)))
        .limit(1);

      if (!caseResult[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Bereavement case not found'
        };
      }

      const deathDate = new Date(caseResult[0].date_of_death);

      // Standard follow-up milestones
      const milestones = [
        { type: '1_WEEK', days: 7 },
        { type: '1_MONTH', days: 30 },
        { type: '3_MONTHS', days: 90 },
        { type: '6_MONTHS', days: 180 },
        { type: '1_YEAR', days: 365 }
      ];

      const followUps = milestones.map(milestone => {
        const scheduledDate = new Date(deathDate);
        scheduledDate.setDate(scheduledDate.getDate() + milestone.days);
        return {
          bereavement_case_id: parseInt(id),
          bereavement_contact_id: contact_id ? parseInt(contact_id) : null,
          milestone_type: milestone.type,
          scheduled_date: scheduledDate.toISOString().split('T')[0],
          follow_up_status: 'SCHEDULED',
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        };
      });

      const results = await db
        .insert(bereavement_follow_ups)
        .values(followUps)
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Standard follow-ups generated successfully',
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error generating follow-ups:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error generating follow-ups',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // RESOURCE TRACKING
  // ============================================

  /**
   * Get resources for a bereavement case
   * GET /bereavement/cases/:id/resources
   */
  async getCaseResources(request, reply) {
    try {
      const { id } = request.params;
      const { resource_type } = request.query;

      let query = db
        .select({
          resource: bereavement_resources,
          contact: bereavement_contacts
        })
        .from(bereavement_resources)
        .leftJoin(
          bereavement_contacts,
          eq(bereavement_resources.bereavement_contact_id, bereavement_contacts.id)
        )
        .where(and(
          eq(bereavement_resources.bereavement_case_id, parseInt(id)),
          isNull(bereavement_resources.deleted_at)
        ));

      if (resource_type) {
        query = query.where(eq(bereavement_resources.resource_type, resource_type));
      }

      const results = await query.orderBy(desc(bereavement_resources.date_provided));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching resources:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching resources',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add resource to a bereavement case
   * POST /bereavement/cases/:id/resources
   */
  async addResource(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_resources)
        .values({
          ...data,
          bereavement_case_id: parseInt(id),
          provided_by_id: request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Resource added successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding resource:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding resource',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update resource
   * PATCH /bereavement/resources/:id
   */
  async updateResource(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_resources)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_resources.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Resource not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Resource updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating resource:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating resource',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // MEMORIAL SERVICES
  // ============================================

  /**
   * Get all memorial services
   * GET /bereavement/memorial-services
   */
  async getAllMemorialServices(request, reply) {
    try {
      const { service_status, service_type } = request.query;

      let query = db
        .select()
        .from(bereavement_memorial_services)
        .where(isNull(bereavement_memorial_services.deleted_at));

      const filters = [];
      if (service_status) {
        filters.push(eq(bereavement_memorial_services.service_status, service_status));
      }
      if (service_type) {
        filters.push(eq(bereavement_memorial_services.service_type, service_type));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(desc(bereavement_memorial_services.service_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching memorial services:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching memorial services',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create memorial service
   * POST /bereavement/memorial-services
   */
  async createMemorialService(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(bereavement_memorial_services)
        .values({
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Memorial service created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating memorial service:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating memorial service',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get memorial service by ID
   * GET /bereavement/memorial-services/:id
   */
  async getMemorialServiceById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(bereavement_memorial_services)
        .where(and(
          eq(bereavement_memorial_services.id, parseInt(id)),
          isNull(bereavement_memorial_services.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Memorial service not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching memorial service:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching memorial service',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update memorial service
   * PATCH /bereavement/memorial-services/:id
   */
  async updateMemorialService(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_memorial_services)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_memorial_services.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Memorial service not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Memorial service updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating memorial service:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating memorial service',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get attendees for a memorial service
   * GET /bereavement/memorial-services/:id/attendees
   */
  async getMemorialServiceAttendees(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select({
          attendee: bereavement_memorial_attendees,
          contact: bereavement_contacts
        })
        .from(bereavement_memorial_attendees)
        .leftJoin(
          bereavement_contacts,
          eq(bereavement_memorial_attendees.bereavement_contact_id, bereavement_contacts.id)
        )
        .where(and(
          eq(bereavement_memorial_attendees.memorial_service_id, parseInt(id)),
          isNull(bereavement_memorial_attendees.deleted_at)
        ))
        .orderBy(bereavement_memorial_attendees.attendee_name);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching memorial service attendees:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching memorial service attendees',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Register attendee for a memorial service
   * POST /bereavement/memorial-services/:id/attendees
   */
  async registerMemorialServiceAttendee(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_memorial_attendees)
        .values({
          ...data,
          memorial_service_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Attendee registered successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error registering attendee:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error registering attendee',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update attendee registration
   * PATCH /bereavement/memorial-attendees/:id
   */
  async updateMemorialServiceAttendee(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_memorial_attendees)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_memorial_attendees.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Attendee registration not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Attendee registration updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating attendee registration:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating attendee registration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // CONTACT UPDATES (Enhanced)
  // ============================================

  /**
   * Update contact information
   * PATCH /bereavement/contacts/:id
   */
  async updateContact(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_contacts)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_contacts.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Contact not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Contact updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating contact:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating contact',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update contact grief assessment
   * PATCH /bereavement/contacts/:id/grief-assessment
   */
  async updateContactGriefAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_contacts)
        .set({
          grief_assessment_score: data.grief_assessment_score,
          grief_assessment_tool: data.grief_assessment_tool,
          grief_assessment_date: data.grief_assessment_date || new Date().toISOString().split('T')[0],
          grief_stage: data.grief_stage,
          grief_notes: data.grief_notes,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_contacts.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Contact not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Grief assessment updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating grief assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating grief assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update contact consent
   * PATCH /bereavement/contacts/:id/consent
   */
  async updateContactConsent(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_contacts)
        .set({
          consent_status: data.consent_status,
          consent_date: data.consent_date || new Date().toISOString().split('T')[0],
          consent_signature: data.consent_signature,
          privacy_preferences: data.privacy_preferences,
          can_share_info: data.can_share_info,
          can_contact_via_phone: data.can_contact_via_phone,
          can_contact_via_email: data.can_contact_via_email,
          can_contact_via_mail: data.can_contact_via_mail,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_contacts.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Contact not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Consent updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating consent:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating consent',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new BereavementController();
