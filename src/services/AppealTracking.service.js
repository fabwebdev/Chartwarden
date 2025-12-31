import { db } from '../db/index.js';
import {
  appeal_cases,
  appeal_documents,
  appeal_timeline,
  claim_denials
} from '../db/schemas/index.js';
import { claims } from '../db/schemas/billing.schema.js';
import { eq, and, desc, gte, lte, sql, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { logger } from '../utils/logger.js';
/**
 * Appeal Tracking Service
 * Phase 3C - Complete Appeal Workflow Management
 *
 * Purpose: Manage appeal cases from creation through resolution
 * Features:
 *   - Appeal case creation and workflow management
 *   - Multi-level appeal tracking (Level 1, 2, 3, ALJ)
 *   - Document management and tracking
 *   - Milestone and deadline tracking
 *   - Appeal outcome recording
 *   - Escalation management
 */
class AppealTrackingService {
  constructor() {
    // Appeal levels by payer type
    this.appealLevels = {
      MEDICARE: [
        'REDETERMINATION',      // Level 1: 120 days
        'RECONSIDERATION',      // Level 2: 180 days
        'ALJ_HEARING',          // Level 3: 90 days (if $180+)
        'MAC_REVIEW',           // Level 4: 60 days
        'FEDERAL_COURT'         // Level 5: 60 days (if $1,670+)
      ],
      MEDICAID: [
        'RECONSIDERATION',      // Level 1: 60 days (state-specific)
        'FAIR_HEARING',         // Level 2: varies by state
        'STATE_APPEAL',         // Level 3: varies
        'FEDERAL_COURT'         // Level 4: varies
      ],
      COMMERCIAL: [
        'INTERNAL_REVIEW',      // Level 1: 180 days
        'EXTERNAL_REVIEW',      // Level 2: varies
        'ARBITRATION',          // Level 3: varies
        'LITIGATION'            // Level 4: varies
      ]
    };

    // Response deadlines by payer type and level
    this.responseDeadlines = {
      MEDICARE: {
        REDETERMINATION: 60,
        RECONSIDERATION: 60,
        ALJ_HEARING: 90,
        MAC_REVIEW: 90,
        FEDERAL_COURT: 120
      },
      MEDICAID: {
        RECONSIDERATION: 30,
        FAIR_HEARING: 90,
        STATE_APPEAL: 60,
        FEDERAL_COURT: 120
      },
      COMMERCIAL: {
        INTERNAL_REVIEW: 30,
        EXTERNAL_REVIEW: 60,
        ARBITRATION: 90,
        LITIGATION: 180
      }
    };
  }

  /**
   * Create appeal case from denial
   */
  async createAppealCase(denialId, appealData, userId) {
    try {
      const {
        appealLevel,
        appealBasis,
        medicalNecessityRationale,
        policyReference,
        appealContactName,
        appealContactPhone,
        appealContactEmail
      } = appealData;

      // Get denial details
      const [denial] = await db.select()
        .from(claim_denials)
        .where(eq(claim_denials.id, denialId))
        .limit(1);

      if (!denial) {
        throw new Error(`Denial not found: ${denialId}`);
      }

      // Get claim details for payer type
      const [claim] = await db.select()
        .from(claims)
        .where(eq(claims.id, denial.claim_id))
        .limit(1);

      if (!claim) {
        throw new Error(`Claim not found: ${denial.claim_id}`);
      }

      const payerType = claim.payer_type || 'COMMERCIAL';

      // Calculate response deadline
      const payerResponseDeadline = this.calculateResponseDeadline(
        new Date(),
        payerType,
        appealLevel
      );

      // Create appeal case
      const [appealCase] = await db.insert(appeal_cases)
        .values({
          appeal_id: `APP-${nanoid(12)}`,
          denial_id: denialId,
          claim_id: denial.claim_id,
          appeal_level: appealLevel,
          appeal_type: this.determineAppealType(appealLevel, payerType),
          original_deadline: denial.appeal_deadline,
          payer_response_deadline: payerResponseDeadline,
          appeal_status: 'PREPARING',
          current_step: 'Gathering documentation',
          appealed_amount: denial.denied_amount,
          appeal_basis: appealBasis,
          medical_necessity_rationale: medicalNecessityRationale,
          policy_reference: policyReference,
          appeal_contact_name: appealContactName,
          appeal_contact_phone: appealContactPhone,
          appeal_contact_email: appealContactEmail,
          assigned_to_id: userId
        })
        .returning();

      // Create initial timeline milestone
      await this.createMilestone(appealCase.id, {
        milestoneType: 'APPEAL_CREATED',
        description: `Appeal case created for ${appealLevel}`,
        responsibleParty: 'Appeal Coordinator',
        userId
      });

      // Update denial status
      await db.update(claim_denials)
        .set({
          denial_status: 'APPEALING',
          updated_at: new Date()
        })
        .where(eq(claim_denials.id, denialId));

      return appealCase;
    } catch (error) {
      logger.error('Error creating appeal case:', error)
      throw error;
    }
  }

  /**
   * Submit appeal to payer
   */
  async submitAppeal(appealId, submissionData, userId) {
    const {
      submissionMethod,
      trackingNumber,
      confirmationNumber,
      submittedDate = new Date()
    } = submissionData;

    // Verify all required documents are present
    const requiredDocs = await this.getRequiredDocuments(appealId);
    const missingDocs = requiredDocs.filter(doc => !doc.is_submitted);

    if (missingDocs.length > 0) {
      throw new Error(`Missing required documents: ${missingDocs.map(d => d.document_type).join(', ')}`);
    }

    // Update appeal case
    await db.update(appeal_cases)
      .set({
        submitted_date: submittedDate,
        submitted_by_id: userId,
        submission_method: submissionMethod,
        tracking_number: trackingNumber,
        confirmation_number: confirmationNumber,
        appeal_status: 'SUBMITTED',
        current_step: 'Awaiting payer response',
        status_date: new Date(),
        updated_at: new Date()
      })
      .where(eq(appeal_cases.id, appealId));

    // Create milestone
    await this.createMilestone(appealId, {
      milestoneType: 'APPEAL_SUBMITTED',
      description: `Appeal submitted via ${submissionMethod}`,
      responsibleParty: 'Payer',
      actionTaken: `Tracking: ${trackingNumber}`,
      userId
    });

    // Calculate preparation time
    const [appeal] = await db.select()
      .from(appeal_cases)
      .where(eq(appeal_cases.id, appealId))
      .limit(1);

    const prepTime = Math.ceil(
      (new Date(submittedDate) - new Date(appeal.created_at)) / (1000 * 60 * 60 * 24)
    );

    await db.update(appeal_cases)
      .set({
        preparation_time_days: prepTime,
        updated_at: new Date()
      })
      .where(eq(appeal_cases.id, appealId));
  }

  /**
   * Record appeal decision
   */
  async recordDecision(appealId, decisionData, userId) {
    const {
      decisionType,
      decisionReason,
      decisionDate = new Date(),
      decisionReceivedDate = new Date(),
      recoveredAmount = 0,
      finalDeniedAmount = 0
    } = decisionData;

    // Get appeal details
    const [appeal] = await db.select()
      .from(appeal_cases)
      .where(eq(appeal_cases.id, appealId))
      .limit(1);

    if (!appeal) {
      throw new Error(`Appeal not found: ${appealId}`);
    }

    // Determine next steps based on decision
    const nextLevel = this.getNextAppealLevel(appeal.appeal_level, decisionType);
    const willEscalate = nextLevel !== null && recoveredAmount < appeal.appealed_amount;

    // Calculate decision time
    const decisionTime = Math.ceil(
      (new Date(decisionDate) - new Date(appeal.submitted_date)) / (1000 * 60 * 60 * 24)
    );

    const totalCycleTime = Math.ceil(
      (new Date(decisionDate) - new Date(appeal.created_at)) / (1000 * 60 * 60 * 24)
    );

    // Update appeal case
    await db.update(appeal_cases)
      .set({
        decision_date: decisionDate,
        decision_type: decisionType,
        decision_reason: decisionReason,
        decision_received_date: decisionReceivedDate,
        recovered_amount: recoveredAmount,
        final_denied_amount: finalDeniedAmount,
        appeal_status: this.determineAppealStatus(decisionType, willEscalate),
        current_step: this.determineCurrentStep(decisionType, willEscalate),
        next_appeal_level: nextLevel,
        will_escalate: willEscalate,
        decision_time_days: decisionTime,
        total_cycle_time_days: totalCycleTime,
        updated_at: new Date()
      })
      .where(eq(appeal_cases.id, appealId));

    // Create milestone
    await this.createMilestone(appealId, {
      milestoneType: 'DECISION_RECEIVED',
      description: `Decision: ${decisionType} - ${decisionReason}`,
      responsibleParty: 'Payer',
      actionTaken: `Recovered: $${(recoveredAmount / 100).toFixed(2)}`,
      userId
    });

    // Update denial based on outcome
    await this.updateDenialFromDecision(
      appeal.denial_id,
      decisionType,
      recoveredAmount,
      finalDeniedAmount
    );

    return { nextLevel, willEscalate };
  }

  /**
   * Escalate appeal to next level
   */
  async escalateAppeal(appealId, escalationData, userId) {
    const { escalationReason, additionalDocumentation } = escalationData;

    // Get current appeal
    const [currentAppeal] = await db.select()
      .from(appeal_cases)
      .where(eq(appeal_cases.id, appealId))
      .limit(1);

    if (!currentAppeal) {
      throw new Error(`Appeal not found: ${appealId}`);
    }

    if (!currentAppeal.next_appeal_level) {
      throw new Error('No next appeal level available');
    }

    // Create new appeal case for next level
    const [newAppeal] = await db.insert(appeal_cases)
      .values({
        appeal_id: `APP-${nanoid(12)}`,
        denial_id: currentAppeal.denial_id,
        claim_id: currentAppeal.claim_id,
        appeal_level: currentAppeal.next_appeal_level,
        appeal_type: 'ESCALATION',
        original_deadline: this.calculateEscalationDeadline(
          currentAppeal.decision_date,
          currentAppeal.next_appeal_level
        ),
        appeal_status: 'PREPARING',
        current_step: 'Preparing escalation documentation',
        appealed_amount: currentAppeal.final_denied_amount,
        appeal_basis: `${currentAppeal.appeal_basis}\n\nEscalation Reason: ${escalationReason}`,
        medical_necessity_rationale: currentAppeal.medical_necessity_rationale,
        policy_reference: currentAppeal.policy_reference,
        assigned_to_id: userId
      })
      .returning();

    // Update original appeal
    await db.update(appeal_cases)
      .set({
        appeal_status: 'ESCALATED',
        current_step: `Escalated to ${currentAppeal.next_appeal_level}`,
        updated_at: new Date()
      })
      .where(eq(appeal_cases.id, appealId));

    // Create milestone on both appeals
    await this.createMilestone(appealId, {
      milestoneType: 'APPEAL_ESCALATED',
      description: `Escalated to ${currentAppeal.next_appeal_level}`,
      responsibleParty: 'Appeal Coordinator',
      actionTaken: escalationReason,
      userId
    });

    await this.createMilestone(newAppeal.id, {
      milestoneType: 'APPEAL_CREATED',
      description: `Escalated appeal from ${currentAppeal.appeal_level}`,
      responsibleParty: 'Appeal Coordinator',
      userId
    });

    return newAppeal;
  }

  /**
   * Attach document to appeal
   */
  async attachDocument(appealId, documentData, userId) {
    const {
      documentType,
      documentName,
      documentDescription,
      filePath,
      fileUrl,
      fileSize,
      fileType,
      mimeType,
      documentDate,
      author,
      isRequired = false,
      isSensitive = true
    } = documentData;

    const [document] = await db.insert(appeal_documents)
      .values({
        appeal_id: appealId,
        document_type: documentType,
        document_name: documentName,
        document_description: documentDescription,
        file_path: filePath,
        file_url: fileUrl,
        file_size: fileSize,
        file_type: fileType,
        mime_type: mimeType,
        document_date: documentDate,
        author: author,
        is_required: isRequired,
        is_sensitive: isSensitive,
        uploaded_by_id: userId
      })
      .returning();

    // Create milestone if required document
    if (isRequired) {
      await this.createMilestone(appealId, {
        milestoneType: 'DOCUMENT_UPLOADED',
        description: `Required document uploaded: ${documentType}`,
        responsibleParty: 'Appeal Coordinator',
        userId
      });
    }

    // Update document flags on appeal case
    await this.updateDocumentFlags(appealId, documentType);

    return document;
  }

  /**
   * Mark document as submitted
   */
  async markDocumentSubmitted(documentId, userId) {
    await db.update(appeal_documents)
      .set({
        is_submitted: true,
        submitted_date: new Date(),
        updated_at: new Date()
      })
      .where(eq(appeal_documents.id, documentId));
  }

  /**
   * Create timeline milestone
   */
  async createMilestone(appealId, milestoneData) {
    const {
      milestoneType,
      description,
      dueDate = null,
      responsibleParty,
      actionTaken = null,
      userId
    } = milestoneData;

    await db.insert(appeal_timeline)
      .values({
        appeal_id: appealId,
        milestone_type: milestoneType,
        milestone_date: new Date(),
        due_date: dueDate,
        description: description,
        responsible_party: responsibleParty,
        action_taken: actionTaken,
        is_completed: true,
        completed_on_time: dueDate ? new Date() <= new Date(dueDate) : null,
        created_by_id: userId
      });
  }

  /**
   * Get appeals requiring action
   */
  async getAppealsRequiringAction(filters = {}) {
    const { assignedTo, status, daysUntilDeadline = 30 } = filters;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysUntilDeadline);

    let query = db.select()
      .from(appeal_cases)
      .where(
        or(
          eq(appeal_cases.appeal_status, 'PREPARING'),
          eq(appeal_cases.appeal_status, 'SUBMITTED'),
          and(
            lte(appeal_cases.original_deadline, cutoffDate),
            eq(appeal_cases.appeal_status, 'PREPARING')
          )
        )
      );

    if (assignedTo) {
      query = query.where(eq(appeal_cases.assigned_to_id, assignedTo));
    }

    if (status) {
      query = query.where(eq(appeal_cases.appeal_status, status));
    }

    const appeals = await query
      .orderBy(
        desc(appeal_cases.original_deadline),
        desc(appeal_cases.appealed_amount)
      )
      .limit(filters.limit || 50);

    return appeals;
  }

  /**
   * Get appeal statistics
   */
  async getAppealStats(filters = {}) {
    const { startDate, endDate, appealLevel } = filters;

    let whereConditions = [];

    if (startDate && endDate) {
      whereConditions.push(
        and(
          gte(appeal_cases.submitted_date, startDate),
          lte(appeal_cases.submitted_date, endDate)
        )
      );
    }

    if (appealLevel) {
      whereConditions.push(eq(appeal_cases.appeal_level, appealLevel));
    }

    const stats = await db.select({
      totalAppeals: sql`COUNT(*)::int`,
      totalAppealedAmount: sql`SUM(${appeal_cases.appealed_amount})::bigint`,
      totalRecoveredAmount: sql`SUM(${appeal_cases.recovered_amount})::bigint`,
      wonAppeals: sql`COUNT(CASE WHEN ${appeal_cases.decision_type} = 'APPROVED' THEN 1 END)::int`,
      partialAppeals: sql`COUNT(CASE WHEN ${appeal_cases.decision_type} = 'PARTIAL_APPROVAL' THEN 1 END)::int`,
      deniedAppeals: sql`COUNT(CASE WHEN ${appeal_cases.decision_type} = 'DENIED' THEN 1 END)::int`,
      pendingAppeals: sql`COUNT(CASE WHEN ${appeal_cases.appeal_status} IN ('PREPARING', 'SUBMITTED') THEN 1 END)::int`,
      avgPreparationTime: sql`AVG(${appeal_cases.preparation_time_days})::int`,
      avgDecisionTime: sql`AVG(${appeal_cases.decision_time_days})::int`,
      avgCycleTime: sql`AVG(${appeal_cases.total_cycle_time_days})::int`
    })
      .from(appeal_cases)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const result = stats[0];

    // Calculate success rate
    const totalDecided = (result.wonAppeals || 0) + (result.partialAppeals || 0) + (result.deniedAppeals || 0);
    const successRate = totalDecided > 0
      ? Math.round(((result.wonAppeals + result.partialAppeals) / totalDecided) * 100)
      : 0;

    // Calculate recovery rate
    const recoveryRate = result.totalAppealedAmount > 0
      ? Math.round((result.totalRecoveredAmount / result.totalAppealedAmount) * 100)
      : 0;

    return {
      ...result,
      successRate,
      recoveryRate
    };
  }

  /**
   * Get required documents for appeal
   */
  async getRequiredDocuments(appealId) {
    return await db.select()
      .from(appeal_documents)
      .where(
        and(
          eq(appeal_documents.appeal_id, appealId),
          eq(appeal_documents.is_required, true)
        )
      );
  }

  /**
   * Get appeal timeline
   */
  async getAppealTimeline(appealId) {
    return await db.select()
      .from(appeal_timeline)
      .where(eq(appeal_timeline.appeal_id, appealId))
      .orderBy(desc(appeal_timeline.milestone_date));
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  calculateResponseDeadline(submittedDate, payerType, appealLevel) {
    const days = this.responseDeadlines[payerType]?.[appealLevel] || 60;
    const deadline = new Date(submittedDate);
    deadline.setDate(deadline.getDate() + days);
    return deadline;
  }

  calculateEscalationDeadline(decisionDate, appealLevel) {
    // Most payers allow 60 days to escalate
    const deadline = new Date(decisionDate);
    deadline.setDate(deadline.getDate() + 60);
    return deadline;
  }

  determineAppealType(appealLevel, payerType) {
    const levels = this.appealLevels[payerType] || this.appealLevels.COMMERCIAL;
    const index = levels.indexOf(appealLevel);
    return index === 0 ? 'INITIAL_APPEAL' : 'ESCALATION';
  }

  getNextAppealLevel(currentLevel, decisionType) {
    // Only offer next level if appeal was denied
    if (decisionType === 'APPROVED') return null;

    // Find current level in all payer types
    for (const [payerType, levels] of Object.entries(this.appealLevels)) {
      const index = levels.indexOf(currentLevel);
      if (index !== -1 && index < levels.length - 1) {
        return levels[index + 1];
      }
    }

    return null;
  }

  determineAppealStatus(decisionType, willEscalate) {
    if (decisionType === 'APPROVED') return 'WON';
    if (decisionType === 'PARTIAL_APPROVAL') return 'PARTIAL_WIN';
    if (willEscalate) return 'PENDING_ESCALATION';
    return 'LOST';
  }

  determineCurrentStep(decisionType, willEscalate) {
    if (decisionType === 'APPROVED') return 'Appeal successful - claim paid';
    if (decisionType === 'PARTIAL_APPROVAL') return 'Partial approval - reviewing recovery';
    if (willEscalate) return 'Preparing escalation to next level';
    return 'Appeal exhausted - final denial';
  }

  async updateDocumentFlags(appealId, documentType) {
    const flagMap = {
      'MEDICAL_RECORDS': 'has_medical_records',
      'CLINICAL_NOTES': 'has_clinical_notes',
      'PHYSICIAN_STATEMENT': 'has_physician_statement',
      'POLICY_DOCUMENTATION': 'has_policy_documentation'
    };

    const flagField = flagMap[documentType];
    if (flagField) {
      await db.update(appeal_cases)
        .set({
          [flagField]: true,
          updated_at: new Date()
        })
        .where(eq(appeal_cases.id, appealId));
    }
  }

  async updateDenialFromDecision(denialId, decisionType, recoveredAmount, finalDeniedAmount) {
    let resolutionType;
    let denialStatus;

    if (decisionType === 'APPROVED') {
      resolutionType = 'APPEAL_WON';
      denialStatus = 'RESOLVED';
    } else if (decisionType === 'PARTIAL_APPROVAL') {
      resolutionType = 'PARTIAL_RECOVERY';
      denialStatus = 'RESOLVED';
    } else {
      resolutionType = 'APPEAL_LOST';
      denialStatus = 'APPEALING'; // May escalate
    }

    await db.update(claim_denials)
      .set({
        resolution_type: resolutionType,
        resolution_amount: recoveredAmount,
        denial_status: denialStatus,
        updated_at: new Date()
      })
      .where(eq(claim_denials.id, denialId));
  }
}

export default new AppealTrackingService();
