import { db } from '../db/index.js';
import {
  appeal_cases,
  appeal_documents,
  appeal_timeline,
  claim_denials,
  appeal_letter_templates,
  appeal_letters,
  appeal_workflow_templates,
  appeal_workflow_instances,
  appeal_status_history
} from '../db/schemas/index.js';
import { claims } from '../db/schemas/billing.schema.js';
import { patients } from '../db/schemas/patient.schema.js';
import { payers } from '../db/schemas/billing.schema.js';
import { eq, and, desc, gte, lte, sql, or, isNull } from 'drizzle-orm';
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

  // ============================================
  // LETTER TEMPLATE METHODS
  // ============================================

  /**
   * Get all active letter templates
   */
  async getLetterTemplates(filters = {}) {
    const { appealLevel, payerType, denialCategory, isActive = true } = filters;

    let whereConditions = [];

    if (isActive !== null) {
      whereConditions.push(eq(appeal_letter_templates.is_active, isActive));
    }

    if (appealLevel) {
      whereConditions.push(eq(appeal_letter_templates.appeal_level, appealLevel));
    }

    if (payerType) {
      whereConditions.push(eq(appeal_letter_templates.payer_type, payerType));
    }

    if (denialCategory) {
      whereConditions.push(eq(appeal_letter_templates.denial_category, denialCategory));
    }

    return await db.select()
      .from(appeal_letter_templates)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(appeal_letter_templates.is_default), desc(appeal_letter_templates.times_used));
  }

  /**
   * Get a specific letter template by ID
   */
  async getLetterTemplate(templateId) {
    const [template] = await db.select()
      .from(appeal_letter_templates)
      .where(eq(appeal_letter_templates.id, templateId))
      .limit(1);

    return template;
  }

  /**
   * Create a new letter template
   */
  async createLetterTemplate(templateData, userId) {
    const {
      templateName,
      templateDescription,
      appealLevel,
      payerType,
      denialCategory,
      letterSubject,
      letterBody,
      closingStatement,
      placeholders,
      requiredDocuments,
      regulatoryReference,
      effectiveDate,
      expirationDate,
      tags
    } = templateData;

    const [template] = await db.insert(appeal_letter_templates)
      .values({
        template_id: `TMPL-${nanoid(12)}`,
        template_name: templateName,
        template_description: templateDescription,
        appeal_level: appealLevel,
        payer_type: payerType,
        denial_category: denialCategory,
        letter_subject: letterSubject,
        letter_body: letterBody,
        closing_statement: closingStatement,
        placeholders: placeholders,
        required_documents: requiredDocuments,
        regulatory_reference: regulatoryReference,
        effective_date: effectiveDate,
        expiration_date: expirationDate,
        tags: tags,
        created_by_id: userId,
        updated_by_id: userId
      })
      .returning();

    return template;
  }

  /**
   * Update a letter template
   */
  async updateLetterTemplate(templateId, templateData, userId) {
    const {
      templateName,
      templateDescription,
      appealLevel,
      payerType,
      denialCategory,
      letterSubject,
      letterBody,
      closingStatement,
      placeholders,
      requiredDocuments,
      regulatoryReference,
      effectiveDate,
      expirationDate,
      isActive,
      tags
    } = templateData;

    const updateFields = {
      updated_at: new Date(),
      updated_by_id: userId
    };

    if (templateName !== undefined) updateFields.template_name = templateName;
    if (templateDescription !== undefined) updateFields.template_description = templateDescription;
    if (appealLevel !== undefined) updateFields.appeal_level = appealLevel;
    if (payerType !== undefined) updateFields.payer_type = payerType;
    if (denialCategory !== undefined) updateFields.denial_category = denialCategory;
    if (letterSubject !== undefined) updateFields.letter_subject = letterSubject;
    if (letterBody !== undefined) updateFields.letter_body = letterBody;
    if (closingStatement !== undefined) updateFields.closing_statement = closingStatement;
    if (placeholders !== undefined) updateFields.placeholders = placeholders;
    if (requiredDocuments !== undefined) updateFields.required_documents = requiredDocuments;
    if (regulatoryReference !== undefined) updateFields.regulatory_reference = regulatoryReference;
    if (effectiveDate !== undefined) updateFields.effective_date = effectiveDate;
    if (expirationDate !== undefined) updateFields.expiration_date = expirationDate;
    if (isActive !== undefined) updateFields.is_active = isActive;
    if (tags !== undefined) updateFields.tags = tags;

    await db.update(appeal_letter_templates)
      .set(updateFields)
      .where(eq(appeal_letter_templates.id, templateId));
  }

  /**
   * Generate appeal letter from template
   */
  async generateAppealLetter(appealId, templateId, placeholderValues, userId) {
    try {
      // Get the appeal details
      const [appeal] = await db.select()
        .from(appeal_cases)
        .where(eq(appeal_cases.id, appealId))
        .limit(1);

      if (!appeal) {
        throw new Error(`Appeal not found: ${appealId}`);
      }

      // Get the template
      const [template] = await db.select()
        .from(appeal_letter_templates)
        .where(eq(appeal_letter_templates.id, templateId))
        .limit(1);

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Get denial and related data for auto-populating placeholders
      const [denial] = await db.select()
        .from(claim_denials)
        .where(eq(claim_denials.id, appeal.denial_id))
        .limit(1);

      const [claim] = await db.select()
        .from(claims)
        .where(eq(claims.id, appeal.claim_id))
        .limit(1);

      // Auto-populate system placeholders
      const systemPlaceholders = {
        APPEAL_ID: appeal.appeal_id,
        APPEAL_LEVEL: appeal.appeal_level,
        APPEAL_BASIS: appeal.appeal_basis,
        DENIAL_DATE: denial?.denial_date || '',
        DENIED_AMOUNT: denial ? `$${(denial.denied_amount / 100).toFixed(2)}` : '',
        CLAIM_ID: claim?.claim_id || '',
        CURRENT_DATE: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        APPEAL_DEADLINE: appeal.original_deadline ? new Date(appeal.original_deadline).toLocaleDateString('en-US') : '',
        MEDICAL_NECESSITY_RATIONALE: appeal.medical_necessity_rationale || '',
        POLICY_REFERENCE: appeal.policy_reference || '',
        CONTACT_NAME: appeal.appeal_contact_name || '',
        CONTACT_PHONE: appeal.appeal_contact_phone || '',
        CONTACT_EMAIL: appeal.appeal_contact_email || ''
      };

      // Merge with user-provided placeholder values
      const allPlaceholders = { ...systemPlaceholders, ...placeholderValues };

      // Replace placeholders in template
      let generatedSubject = template.letter_subject || '';
      let generatedBody = template.letter_body;
      let generatedClosing = template.closing_statement || '';

      for (const [key, value] of Object.entries(allPlaceholders)) {
        const placeholder = `{{${key}}}`;
        generatedSubject = generatedSubject.replace(new RegExp(placeholder, 'g'), value || '');
        generatedBody = generatedBody.replace(new RegExp(placeholder, 'g'), value || '');
        generatedClosing = generatedClosing.replace(new RegExp(placeholder, 'g'), value || '');
      }

      // Create the generated letter
      const [letter] = await db.insert(appeal_letters)
        .values({
          appeal_id: appealId,
          template_id: templateId,
          letter_id: `LTR-${nanoid(12)}`,
          letter_type: this.determineLetterType(appeal.appeal_level),
          letter_subject: generatedSubject,
          letter_body: generatedBody,
          closing_statement: generatedClosing,
          placeholder_values: allPlaceholders,
          letter_status: 'DRAFT',
          created_by_id: userId,
          updated_by_id: userId
        })
        .returning();

      // Update template usage stats
      await db.update(appeal_letter_templates)
        .set({
          times_used: sql`${appeal_letter_templates.times_used} + 1`,
          last_used_at: new Date()
        })
        .where(eq(appeal_letter_templates.id, templateId));

      // Record status change
      await this.recordStatusChange(appealId, {
        previousStatus: appeal.appeal_status,
        newStatus: appeal.appeal_status,
        statusCategory: 'DOCUMENT',
        changeReason: `Appeal letter generated from template: ${template.template_name}`,
        changeType: 'AUTOMATIC',
        relatedLetterId: letter.id,
        userId
      });

      return letter;
    } catch (error) {
      logger.error('Error generating appeal letter:', error);
      throw error;
    }
  }

  /**
   * Get letters for an appeal
   */
  async getAppealLetters(appealId) {
    return await db.select()
      .from(appeal_letters)
      .where(eq(appeal_letters.appeal_id, appealId))
      .orderBy(desc(appeal_letters.created_at));
  }

  /**
   * Get a specific letter
   */
  async getAppealLetter(letterId) {
    const [letter] = await db.select()
      .from(appeal_letters)
      .where(eq(appeal_letters.id, letterId))
      .limit(1);

    return letter;
  }

  /**
   * Update letter content
   */
  async updateAppealLetter(letterId, letterData, userId) {
    const {
      letterSubject,
      letterBody,
      closingStatement,
      notes
    } = letterData;

    const updateFields = {
      updated_at: new Date(),
      updated_by_id: userId
    };

    if (letterSubject !== undefined) updateFields.letter_subject = letterSubject;
    if (letterBody !== undefined) updateFields.letter_body = letterBody;
    if (closingStatement !== undefined) updateFields.closing_statement = closingStatement;
    if (notes !== undefined) updateFields.notes = notes;

    await db.update(appeal_letters)
      .set(updateFields)
      .where(eq(appeal_letters.id, letterId));
  }

  /**
   * Finalize a letter (mark as ready to send)
   */
  async finalizeLetter(letterId, userId) {
    await db.update(appeal_letters)
      .set({
        letter_status: 'FINALIZED',
        finalized_by_id: userId,
        finalized_at: new Date(),
        updated_at: new Date(),
        updated_by_id: userId
      })
      .where(eq(appeal_letters.id, letterId));
  }

  /**
   * Mark letter as sent
   */
  async markLetterSent(letterId, sendingData, userId) {
    const {
      sentMethod,
      sentTo,
      trackingNumber
    } = sendingData;

    await db.update(appeal_letters)
      .set({
        letter_status: 'SENT',
        sent_date: new Date(),
        sent_method: sentMethod,
        sent_to: sentTo,
        tracking_number: trackingNumber,
        updated_at: new Date(),
        updated_by_id: userId
      })
      .where(eq(appeal_letters.id, letterId));
  }

  // ============================================
  // WORKFLOW TEMPLATE METHODS
  // ============================================

  /**
   * Get workflow templates
   */
  async getWorkflowTemplates(filters = {}) {
    const { appealLevel, payerType, isActive = true } = filters;

    let whereConditions = [];

    if (isActive !== null) {
      whereConditions.push(eq(appeal_workflow_templates.is_active, isActive));
    }

    if (appealLevel) {
      whereConditions.push(eq(appeal_workflow_templates.appeal_level, appealLevel));
    }

    if (payerType) {
      whereConditions.push(eq(appeal_workflow_templates.payer_type, payerType));
    }

    return await db.select()
      .from(appeal_workflow_templates)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(appeal_workflow_templates.is_default));
  }

  /**
   * Get a specific workflow template
   */
  async getWorkflowTemplate(templateId) {
    const [template] = await db.select()
      .from(appeal_workflow_templates)
      .where(eq(appeal_workflow_templates.id, templateId))
      .limit(1);

    return template;
  }

  /**
   * Create a workflow template
   */
  async createWorkflowTemplate(templateData, userId) {
    const {
      workflowName,
      workflowDescription,
      appealLevel,
      payerType,
      denialCategory,
      steps,
      estimatedDurationDays
    } = templateData;

    const totalSteps = Array.isArray(steps) ? steps.length : 0;

    const [template] = await db.insert(appeal_workflow_templates)
      .values({
        workflow_id: `WF-${nanoid(12)}`,
        workflow_name: workflowName,
        workflow_description: workflowDescription,
        appeal_level: appealLevel,
        payer_type: payerType,
        denial_category: denialCategory,
        steps: steps,
        total_steps: totalSteps,
        estimated_duration_days: estimatedDurationDays,
        created_by_id: userId,
        updated_by_id: userId
      })
      .returning();

    return template;
  }

  /**
   * Create default workflow templates
   */
  async createDefaultWorkflowTemplates(userId) {
    const defaultWorkflows = [
      {
        workflowName: 'Medicare Redetermination Workflow',
        workflowDescription: 'Standard workflow for Medicare Level 1 appeal (Redetermination)',
        appealLevel: 'REDETERMINATION',
        payerType: 'MEDICARE',
        steps: [
          {
            step_number: 1,
            step_name: 'Review Denial',
            description: 'Review the denial notice and identify appealable issues',
            required_actions: ['Review denial reason', 'Identify CARC/RARC codes', 'Assess appealability'],
            required_documents: [],
            deadline_days: 3,
            responsible_role: 'billing',
            next_step_on_complete: 2
          },
          {
            step_number: 2,
            step_name: 'Gather Documentation',
            description: 'Collect all supporting documentation for the appeal',
            required_actions: ['Request medical records', 'Obtain physician statement', 'Compile policy references'],
            required_documents: ['MEDICAL_RECORDS', 'CLINICAL_NOTES'],
            deadline_days: 7,
            responsible_role: 'billing',
            next_step_on_complete: 3
          },
          {
            step_number: 3,
            step_name: 'Draft Appeal Letter',
            description: 'Create the appeal letter using the appropriate template',
            required_actions: ['Select template', 'Customize letter', 'Review for completeness'],
            required_documents: ['APPEAL_LETTER'],
            deadline_days: 3,
            responsible_role: 'billing',
            next_step_on_complete: 4
          },
          {
            step_number: 4,
            step_name: 'Internal Review',
            description: 'Have appeal reviewed by supervisor before submission',
            required_actions: ['Supervisor review', 'Make corrections if needed', 'Obtain approval'],
            required_documents: [],
            deadline_days: 2,
            responsible_role: 'admin',
            next_step_on_complete: 5
          },
          {
            step_number: 5,
            step_name: 'Submit Appeal',
            description: 'Submit the appeal to the MAC within deadline',
            required_actions: ['Submit via portal/fax/mail', 'Record tracking number', 'Confirm receipt'],
            required_documents: [],
            deadline_days: 2,
            responsible_role: 'billing',
            next_step_on_complete: 6
          },
          {
            step_number: 6,
            step_name: 'Await Decision',
            description: 'Monitor for decision from MAC (up to 60 days)',
            required_actions: ['Monitor status', 'Respond to additional info requests', 'Track deadline'],
            required_documents: [],
            deadline_days: 60,
            responsible_role: 'billing',
            next_step_on_complete: 7
          },
          {
            step_number: 7,
            step_name: 'Process Decision',
            description: 'Review and process the appeal decision',
            required_actions: ['Review decision', 'Update records', 'Determine next steps'],
            required_documents: ['DECISION_LETTER'],
            deadline_days: 5,
            responsible_role: 'billing',
            next_step_on_complete: null
          }
        ],
        estimatedDurationDays: 82
      },
      {
        workflowName: 'Commercial Payer Internal Review',
        workflowDescription: 'Standard workflow for commercial payer internal review appeal',
        appealLevel: 'INTERNAL_REVIEW',
        payerType: 'COMMERCIAL',
        steps: [
          {
            step_number: 1,
            step_name: 'Review Denial EOB',
            description: 'Review the EOB and identify denial reasons',
            required_actions: ['Review EOB', 'Identify denial codes', 'Check contract terms'],
            required_documents: [],
            deadline_days: 2,
            responsible_role: 'billing',
            next_step_on_complete: 2
          },
          {
            step_number: 2,
            step_name: 'Gather Supporting Documents',
            description: 'Collect clinical documentation and contract references',
            required_actions: ['Pull medical records', 'Obtain auth documentation', 'Review contract'],
            required_documents: ['MEDICAL_RECORDS', 'POLICY_DOCUMENTATION'],
            deadline_days: 5,
            responsible_role: 'billing',
            next_step_on_complete: 3
          },
          {
            step_number: 3,
            step_name: 'Prepare Appeal',
            description: 'Draft appeal letter with supporting rationale',
            required_actions: ['Draft letter', 'Include policy references', 'Attach documentation'],
            required_documents: ['APPEAL_LETTER'],
            deadline_days: 3,
            responsible_role: 'billing',
            next_step_on_complete: 4
          },
          {
            step_number: 4,
            step_name: 'Submit to Payer',
            description: 'Submit appeal via payer-preferred method',
            required_actions: ['Submit appeal', 'Obtain confirmation', 'Track submission'],
            required_documents: [],
            deadline_days: 1,
            responsible_role: 'billing',
            next_step_on_complete: 5
          },
          {
            step_number: 5,
            step_name: 'Monitor Response',
            description: 'Track appeal and respond to any requests',
            required_actions: ['Monitor status', 'Respond to requests', 'Follow up as needed'],
            required_documents: [],
            deadline_days: 30,
            responsible_role: 'billing',
            next_step_on_complete: 6
          },
          {
            step_number: 6,
            step_name: 'Finalize Appeal',
            description: 'Process decision and close or escalate',
            required_actions: ['Review decision', 'Post payment or adjustment', 'Escalate if needed'],
            required_documents: ['DECISION_LETTER'],
            deadline_days: 3,
            responsible_role: 'billing',
            next_step_on_complete: null
          }
        ],
        estimatedDurationDays: 44
      }
    ];

    const createdWorkflows = [];
    for (const workflow of defaultWorkflows) {
      const created = await this.createWorkflowTemplate(workflow, userId);
      createdWorkflows.push(created);
    }

    return createdWorkflows;
  }

  /**
   * Initialize workflow for an appeal
   */
  async initializeWorkflow(appealId, workflowTemplateId, userId) {
    try {
      // Get the appeal
      const [appeal] = await db.select()
        .from(appeal_cases)
        .where(eq(appeal_cases.id, appealId))
        .limit(1);

      if (!appeal) {
        throw new Error(`Appeal not found: ${appealId}`);
      }

      // Get the workflow template
      const [template] = await db.select()
        .from(appeal_workflow_templates)
        .where(eq(appeal_workflow_templates.id, workflowTemplateId))
        .limit(1);

      if (!template) {
        throw new Error(`Workflow template not found: ${workflowTemplateId}`);
      }

      const steps = template.steps || [];
      const firstStep = steps[0] || {};

      // Calculate estimated completion date
      const estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + (template.estimated_duration_days || 30));

      // Calculate first step due date
      const firstStepDueDate = new Date();
      firstStepDueDate.setDate(firstStepDueDate.getDate() + (firstStep.deadline_days || 7));

      // Initialize steps progress
      const stepsProgress = steps.map((step, index) => ({
        step_number: step.step_number,
        step_name: step.step_name,
        status: index === 0 ? 'IN_PROGRESS' : 'PENDING',
        started_at: index === 0 ? new Date().toISOString() : null,
        completed_at: null,
        completed_by_id: null,
        notes: null,
        documents_attached: [],
        actions_completed: []
      }));

      // Create workflow instance
      const [instance] = await db.insert(appeal_workflow_instances)
        .values({
          appeal_id: appealId,
          workflow_template_id: workflowTemplateId,
          instance_id: `WFI-${nanoid(12)}`,
          current_step: 1,
          current_step_name: firstStep.step_name || 'Step 1',
          workflow_status: 'IN_PROGRESS',
          steps_completed: 0,
          total_steps: template.total_steps,
          progress_percentage: 0,
          estimated_completion_date: estimatedCompletion,
          current_step_due_date: firstStepDueDate,
          steps_progress: stepsProgress,
          assigned_to_id: userId,
          assigned_at: new Date(),
          created_by_id: userId,
          updated_by_id: userId
        })
        .returning();

      // Update appeal with workflow reference
      await db.update(appeal_cases)
        .set({
          current_step: firstStep.step_name || 'Workflow initiated',
          updated_at: new Date()
        })
        .where(eq(appeal_cases.id, appealId));

      // Create milestone
      await this.createMilestone(appealId, {
        milestoneType: 'WORKFLOW_STARTED',
        description: `Workflow "${template.workflow_name}" initialized`,
        responsibleParty: firstStep.responsible_role || 'Appeal Coordinator',
        dueDate: firstStepDueDate,
        userId
      });

      // Record status change
      await this.recordStatusChange(appealId, {
        previousStatus: appeal.appeal_status,
        newStatus: appeal.appeal_status,
        statusCategory: 'WORKFLOW',
        changeReason: `Workflow initialized: ${template.workflow_name}`,
        changeType: 'AUTOMATIC',
        userId
      });

      return instance;
    } catch (error) {
      logger.error('Error initializing workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow instance for an appeal
   */
  async getWorkflowInstance(appealId) {
    const [instance] = await db.select()
      .from(appeal_workflow_instances)
      .where(eq(appeal_workflow_instances.appeal_id, appealId))
      .orderBy(desc(appeal_workflow_instances.created_at))
      .limit(1);

    return instance;
  }

  /**
   * Advance workflow to next step
   */
  async advanceWorkflowStep(instanceId, completionData, userId) {
    try {
      const { notes, actionsCompleted = [], documentsAttached = [] } = completionData;

      // Get the instance
      const [instance] = await db.select()
        .from(appeal_workflow_instances)
        .where(eq(appeal_workflow_instances.id, instanceId))
        .limit(1);

      if (!instance) {
        throw new Error(`Workflow instance not found: ${instanceId}`);
      }

      // Get the template for step details
      const [template] = await db.select()
        .from(appeal_workflow_templates)
        .where(eq(appeal_workflow_templates.id, instance.workflow_template_id))
        .limit(1);

      const steps = template?.steps || [];
      const currentStepIndex = instance.current_step - 1;
      const currentStepDef = steps[currentStepIndex];
      const nextStepDef = steps[currentStepIndex + 1];

      // Update steps progress
      const stepsProgress = [...(instance.steps_progress || [])];
      if (stepsProgress[currentStepIndex]) {
        stepsProgress[currentStepIndex] = {
          ...stepsProgress[currentStepIndex],
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          completed_by_id: userId,
          notes: notes,
          actions_completed: actionsCompleted,
          documents_attached: documentsAttached
        };
      }

      // Check if on time
      const isOnTime = instance.current_step_due_date
        ? new Date() <= new Date(instance.current_step_due_date)
        : true;

      const stepsCompleted = instance.steps_completed + 1;
      const progressPercentage = Math.round((stepsCompleted / instance.total_steps) * 100);

      // Check if workflow is complete
      const isComplete = stepsCompleted >= instance.total_steps;

      if (isComplete) {
        // Complete the workflow
        await db.update(appeal_workflow_instances)
          .set({
            steps_completed: stepsCompleted,
            progress_percentage: 100,
            workflow_status: 'COMPLETED',
            actual_completion_date: new Date(),
            steps_progress: stepsProgress,
            steps_completed_on_time: instance.steps_completed_on_time + (isOnTime ? 1 : 0),
            steps_overdue: instance.steps_overdue + (isOnTime ? 0 : 1),
            updated_at: new Date(),
            updated_by_id: userId
          })
          .where(eq(appeal_workflow_instances.id, instanceId));

        // Create completion milestone
        await this.createMilestone(instance.appeal_id, {
          milestoneType: 'WORKFLOW_COMPLETED',
          description: 'Appeal workflow completed',
          responsibleParty: 'Appeal Coordinator',
          userId
        });

        return { isComplete: true, nextStep: null };
      }

      // Move to next step
      if (nextStepDef && stepsProgress[currentStepIndex + 1]) {
        stepsProgress[currentStepIndex + 1] = {
          ...stepsProgress[currentStepIndex + 1],
          status: 'IN_PROGRESS',
          started_at: new Date().toISOString()
        };
      }

      // Calculate next step due date
      const nextStepDueDate = new Date();
      nextStepDueDate.setDate(nextStepDueDate.getDate() + (nextStepDef?.deadline_days || 7));

      await db.update(appeal_workflow_instances)
        .set({
          current_step: instance.current_step + 1,
          current_step_name: nextStepDef?.step_name || `Step ${instance.current_step + 1}`,
          steps_completed: stepsCompleted,
          progress_percentage: progressPercentage,
          current_step_due_date: nextStepDueDate,
          current_step_started_at: new Date(),
          steps_progress: stepsProgress,
          steps_completed_on_time: instance.steps_completed_on_time + (isOnTime ? 1 : 0),
          steps_overdue: instance.steps_overdue + (isOnTime ? 0 : 1),
          days_in_current_step: 0,
          updated_at: new Date(),
          updated_by_id: userId
        })
        .where(eq(appeal_workflow_instances.id, instanceId));

      // Update appeal current step
      await db.update(appeal_cases)
        .set({
          current_step: nextStepDef?.step_name || `Step ${instance.current_step + 1}`,
          updated_at: new Date()
        })
        .where(eq(appeal_cases.id, instance.appeal_id));

      // Create milestone for step completion
      await this.createMilestone(instance.appeal_id, {
        milestoneType: 'STEP_COMPLETED',
        description: `Completed: ${currentStepDef?.step_name || 'Step'}`,
        responsibleParty: nextStepDef?.responsible_role || 'Appeal Coordinator',
        dueDate: nextStepDueDate,
        actionTaken: notes,
        userId
      });

      return {
        isComplete: false,
        nextStep: {
          stepNumber: instance.current_step + 1,
          stepName: nextStepDef?.step_name,
          dueDate: nextStepDueDate,
          responsibleRole: nextStepDef?.responsible_role
        }
      };
    } catch (error) {
      logger.error('Error advancing workflow step:', error);
      throw error;
    }
  }

  /**
   * Pause workflow
   */
  async pauseWorkflow(instanceId, reason, userId) {
    await db.update(appeal_workflow_instances)
      .set({
        workflow_status: 'PAUSED',
        paused_at: new Date(),
        notes: reason,
        updated_at: new Date(),
        updated_by_id: userId
      })
      .where(eq(appeal_workflow_instances.id, instanceId));
  }

  /**
   * Resume workflow
   */
  async resumeWorkflow(instanceId, userId) {
    await db.update(appeal_workflow_instances)
      .set({
        workflow_status: 'IN_PROGRESS',
        paused_at: null,
        updated_at: new Date(),
        updated_by_id: userId
      })
      .where(eq(appeal_workflow_instances.id, instanceId));
  }

  // ============================================
  // STATUS TRACKING METHODS
  // ============================================

  /**
   * Record a status change for an appeal
   */
  async recordStatusChange(appealId, changeData) {
    const {
      previousStatus,
      newStatus,
      statusCategory,
      changeReason,
      changeType,
      relatedDocumentId,
      relatedMilestoneId,
      relatedLetterId,
      userId
    } = changeData;

    await db.insert(appeal_status_history)
      .values({
        appeal_id: appealId,
        previous_status: previousStatus,
        new_status: newStatus,
        status_category: statusCategory,
        change_reason: changeReason,
        change_type: changeType,
        related_document_id: relatedDocumentId,
        related_milestone_id: relatedMilestoneId,
        related_letter_id: relatedLetterId,
        changed_by_id: userId
      });
  }

  /**
   * Get status history for an appeal
   */
  async getAppealStatusHistory(appealId) {
    return await db.select()
      .from(appeal_status_history)
      .where(eq(appeal_status_history.appeal_id, appealId))
      .orderBy(desc(appeal_status_history.changed_at));
  }

  /**
   * Get comprehensive appeal details with all related data
   */
  async getAppealDetails(appealId) {
    try {
      // Get the appeal
      const [appeal] = await db.select()
        .from(appeal_cases)
        .where(eq(appeal_cases.id, appealId))
        .limit(1);

      if (!appeal) {
        return null;
      }

      // Get related data in parallel
      const [
        timeline,
        documents,
        letters,
        workflowInstance,
        statusHistory
      ] = await Promise.all([
        this.getAppealTimeline(appealId),
        db.select().from(appeal_documents).where(eq(appeal_documents.appeal_id, appealId)),
        this.getAppealLetters(appealId),
        this.getWorkflowInstance(appealId),
        this.getAppealStatusHistory(appealId)
      ]);

      return {
        appeal,
        timeline,
        documents,
        letters,
        workflow: workflowInstance,
        statusHistory
      };
    } catch (error) {
      logger.error('Error getting appeal details:', error);
      throw error;
    }
  }

  // ============================================
  // ADDITIONAL HELPER METHODS
  // ============================================

  determineLetterType(appealLevel) {
    const letterTypeMap = {
      'REDETERMINATION': 'INITIAL_APPEAL',
      'RECONSIDERATION': 'RECONSIDERATION',
      'ALJ_HEARING': 'ESCALATION',
      'MAC_REVIEW': 'ESCALATION',
      'FEDERAL_COURT': 'ESCALATION',
      'INTERNAL_REVIEW': 'INITIAL_APPEAL',
      'EXTERNAL_REVIEW': 'ESCALATION',
      'FAIR_HEARING': 'ESCALATION'
    };
    return letterTypeMap[appealLevel] || 'INITIAL_APPEAL';
  }

  // ============================================
  // DATA EXPORT METHODS
  // ============================================

  /**
   * Export appeals to CSV format
   */
  async exportAppealsToCSV(filters = {}) {
    const { startDate, endDate, status, appealLevel } = filters;

    let whereConditions = [];

    if (startDate && endDate) {
      whereConditions.push(
        and(
          gte(appeal_cases.submitted_date, startDate),
          lte(appeal_cases.submitted_date, endDate)
        )
      );
    }

    if (status) {
      whereConditions.push(eq(appeal_cases.appeal_status, status));
    }

    if (appealLevel) {
      whereConditions.push(eq(appeal_cases.appeal_level, appealLevel));
    }

    const appeals = await db.select()
      .from(appeal_cases)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(appeal_cases.submitted_date))
      .limit(10000);

    // CSV header
    const headers = [
      'Appeal ID',
      'Denial ID',
      'Claim ID',
      'Appeal Level',
      'Appeal Type',
      'Status',
      'Submitted Date',
      'Submission Method',
      'Tracking Number',
      'Appealed Amount',
      'Recovered Amount',
      'Final Denied Amount',
      'Decision Type',
      'Decision Date',
      'Decision Reason',
      'Preparation Time (Days)',
      'Decision Time (Days)',
      'Total Cycle Time (Days)',
      'Appeal Basis',
      'Created At'
    ];

    // Convert to CSV rows
    const rows = appeals.map(a => [
      a.appeal_id,
      a.denial_id,
      a.claim_id,
      a.appeal_level,
      a.appeal_type,
      a.appeal_status,
      a.submitted_date,
      a.submission_method || '',
      a.tracking_number || '',
      (a.appealed_amount / 100).toFixed(2),
      a.recovered_amount ? (a.recovered_amount / 100).toFixed(2) : '',
      a.final_denied_amount ? (a.final_denied_amount / 100).toFixed(2) : '',
      a.decision_type || '',
      a.decision_date || '',
      a.decision_reason || '',
      a.preparation_time_days || '',
      a.decision_time_days || '',
      a.total_cycle_time_days || '',
      (a.appeal_basis || '').replace(/[\n\r]/g, ' ').substring(0, 200),
      a.created_at
    ]);

    // Escape CSV values
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV string
    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ];

    return csvLines.join('\n');
  }

  /**
   * Export appeals to PDF format
   */
  async exportAppealsToPDF(filters = {}) {
    const { startDate, endDate, reportType } = filters;

    // Get appeal statistics
    const stats = await this.getAppealStats({ startDate, endDate });

    // Get recent appeals
    const appeals = await db.select()
      .from(appeal_cases)
      .where(
        startDate && endDate
          ? and(
              gte(appeal_cases.submitted_date, startDate),
              lte(appeal_cases.submitted_date, endDate)
            )
          : undefined
      )
      .orderBy(desc(appeal_cases.submitted_date))
      .limit(reportType === 'detailed' ? 100 : 20);

    // Build report content
    const reportContent = {
      title: 'Appeals Management Report',
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: startDate ? startDate.toISOString().split('T')[0] : 'All time',
        end: endDate ? endDate.toISOString().split('T')[0] : 'Present'
      },
      summary: {
        totalAppeals: stats.totalAppeals || 0,
        totalAppealedAmount: (stats.totalAppealedAmount || 0) / 100,
        totalRecoveredAmount: (stats.totalRecoveredAmount || 0) / 100,
        wonAppeals: stats.wonAppeals || 0,
        partialAppeals: stats.partialAppeals || 0,
        deniedAppeals: stats.deniedAppeals || 0,
        pendingAppeals: stats.pendingAppeals || 0,
        successRate: stats.successRate || 0,
        recoveryRate: stats.recoveryRate || 0,
        avgPreparationTime: stats.avgPreparationTime || 0,
        avgDecisionTime: stats.avgDecisionTime || 0,
        avgCycleTime: stats.avgCycleTime || 0
      },
      appeals: appeals.map(a => ({
        appealId: a.appeal_id,
        level: a.appeal_level,
        status: a.appeal_status,
        appealedAmount: (a.appealed_amount || 0) / 100,
        recoveredAmount: (a.recovered_amount || 0) / 100,
        decisionType: a.decision_type,
        submittedDate: a.submitted_date
      }))
    };

    // Return JSON representation (in production, use PDF generation library)
    return Buffer.from(JSON.stringify(reportContent, null, 2));
  }

  // ============================================
  // PARTIAL APPROVAL METHODS
  // ============================================

  /**
   * Record a partial approval decision
   */
  async recordPartialApproval(appealId, partialApprovalData, userId) {
    const {
      approvedAmount,
      deniedAmount,
      approvedItems,
      deniedItems,
      decisionReason,
      willAppealRemainder
    } = partialApprovalData;

    // Get the appeal
    const [appeal] = await db.select()
      .from(appeal_cases)
      .where(eq(appeal_cases.id, appealId))
      .limit(1);

    if (!appeal) {
      throw new Error(`Appeal not found: ${appealId}`);
    }

    // Update appeal with partial approval
    await db.update(appeal_cases)
      .set({
        decision_type: 'PARTIAL_APPROVAL',
        decision_reason: decisionReason,
        decision_date: new Date(),
        decision_received_date: new Date(),
        recovered_amount: approvedAmount,
        final_denied_amount: deniedAmount,
        appeal_status: willAppealRemainder ? 'PENDING_ESCALATION' : 'PARTIAL_WIN',
        will_escalate: willAppealRemainder,
        metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
          partialApproval: {
            approvedItems,
            deniedItems,
            approvedAmount,
            deniedAmount,
            recordedAt: new Date().toISOString(),
            recordedBy: userId
          }
        })}::jsonb`,
        updated_at: new Date()
      })
      .where(eq(appeal_cases.id, appealId));

    // Create milestone
    await this.createMilestone(appealId, {
      milestoneType: 'PARTIAL_APPROVAL_RECEIVED',
      description: `Partial approval: $${(approvedAmount / 100).toFixed(2)} approved, $${(deniedAmount / 100).toFixed(2)} denied`,
      responsibleParty: 'Payer',
      actionTaken: decisionReason,
      userId
    });

    // Update denial record
    await this.updateDenialFromDecision(
      appeal.denial_id,
      'PARTIAL_APPROVAL',
      approvedAmount,
      deniedAmount
    );

    // Record status change
    await this.recordStatusChange(appealId, {
      previousStatus: appeal.appeal_status,
      newStatus: willAppealRemainder ? 'PENDING_ESCALATION' : 'PARTIAL_WIN',
      statusCategory: 'DECISION',
      changeReason: `Partial approval recorded: ${decisionReason}`,
      changeType: 'MANUAL',
      userId
    });

    return {
      approvedAmount,
      deniedAmount,
      willAppealRemainder,
      nextSteps: willAppealRemainder
        ? 'Prepare escalation for remaining denied amount'
        : 'Process partial recovery and close appeal'
    };
  }

  // ============================================
  // MULTI-CLAIM APPEAL METHODS
  // ============================================

  /**
   * Create an appeal spanning multiple claims
   */
  async createMultiClaimAppeal(denialIds, appealData, userId) {
    const {
      appealLevel,
      appealBasis,
      medicalNecessityRationale,
      policyReference
    } = appealData;

    // Get all denials
    const denials = await db.select()
      .from(claim_denials)
      .where(sql`id = ANY(${denialIds})`);

    if (denials.length === 0) {
      throw new Error('No valid denials found');
    }

    // Calculate total appealed amount
    const totalAppealedAmount = denials.reduce((sum, d) => sum + (d.denied_amount || 0), 0);

    // Get patient and payer from first denial
    const primaryDenial = denials[0];
    const [claim] = await db.select()
      .from(claims)
      .where(eq(claims.id, primaryDenial.claim_id))
      .limit(1);

    const payerType = claim?.payer_type || 'COMMERCIAL';

    // Calculate response deadline
    const payerResponseDeadline = this.calculateResponseDeadline(
      new Date(),
      payerType,
      appealLevel
    );

    // Create appeal case
    const [appealCase] = await db.insert(appeal_cases)
      .values({
        appeal_id: `APP-MULTI-${nanoid(10)}`,
        denial_id: primaryDenial.id,
        claim_id: primaryDenial.claim_id,
        appeal_level: appealLevel,
        appeal_type: 'MULTI_CLAIM',
        original_deadline: primaryDenial.appeal_deadline,
        payer_response_deadline: payerResponseDeadline,
        appeal_status: 'PREPARING',
        current_step: 'Gathering documentation for multiple claims',
        appealed_amount: totalAppealedAmount,
        appeal_basis: appealBasis,
        medical_necessity_rationale: medicalNecessityRationale,
        policy_reference: policyReference,
        assigned_to_id: userId,
        metadata: {
          multiClaimAppeal: true,
          denialIds: denialIds,
          claimCount: denials.length,
          claimIds: denials.map(d => d.claim_id)
        }
      })
      .returning();

    // Update all denials to link to this appeal
    for (const denialId of denialIds) {
      await db.update(claim_denials)
        .set({
          denial_status: 'APPEALING',
          will_appeal: true,
          appeal_decision_by_id: userId,
          appeal_decision_date: new Date(),
          updated_at: new Date()
        })
        .where(eq(claim_denials.id, denialId));
    }

    // Create initial milestone
    await this.createMilestone(appealCase.id, {
      milestoneType: 'MULTI_CLAIM_APPEAL_CREATED',
      description: `Multi-claim appeal created for ${denials.length} denials totaling $${(totalAppealedAmount / 100).toFixed(2)}`,
      responsibleParty: 'Appeal Coordinator',
      userId
    });

    return appealCase;
  }

  /**
   * Get all claims related to a multi-claim appeal
   */
  async getRelatedClaims(appealId) {
    const [appeal] = await db.select()
      .from(appeal_cases)
      .where(eq(appeal_cases.id, appealId))
      .limit(1);

    if (!appeal) {
      throw new Error(`Appeal not found: ${appealId}`);
    }

    const metadata = appeal.metadata || {};
    const denialIds = metadata.denialIds || [appeal.denial_id];

    const denials = await db.select()
      .from(claim_denials)
      .where(sql`id = ANY(${denialIds})`);

    // Enrich with claim details
    const claimsWithDetails = await Promise.all(
      denials.map(async (denial) => {
        const [claim] = await db.select()
          .from(claims)
          .where(eq(claims.id, denial.claim_id))
          .limit(1);

        return {
          denialId: denial.id,
          denialIdentifier: denial.denial_id,
          claimId: denial.claim_id,
          claimNumber: claim?.claim_id,
          patientId: denial.patient_id,
          deniedAmount: denial.denied_amount,
          denialDate: denial.denial_date,
          denialType: denial.denial_type,
          primaryReason: denial.primary_denial_reason
        };
      })
    );

    return claimsWithDetails;
  }

  // ============================================
  // AUDIT LOGGING METHODS
  // ============================================

  /**
   * Get audit log for an appeal
   */
  async getAppealAuditLog(appealId, limit = 100) {
    // Get status history
    const statusHistory = await this.getAppealStatusHistory(appealId);

    // Get timeline milestones
    const timeline = await this.getAppealTimeline(appealId);

    // Get the appeal for creation info
    const [appeal] = await db.select()
      .from(appeal_cases)
      .where(eq(appeal_cases.id, appealId))
      .limit(1);

    if (!appeal) {
      return [];
    }

    const auditLog = [];

    // Creation event
    auditLog.push({
      eventType: 'CREATED',
      timestamp: appeal.created_at,
      userId: appeal.assigned_to_id,
      details: {
        appealId: appeal.appeal_id,
        appealLevel: appeal.appeal_level,
        appealedAmount: appeal.appealed_amount
      }
    });

    // Add status history events
    for (const status of statusHistory) {
      auditLog.push({
        eventType: 'STATUS_CHANGE',
        timestamp: status.changed_at,
        userId: status.changed_by_id,
        details: {
          previousStatus: status.previous_status,
          newStatus: status.new_status,
          category: status.status_category,
          reason: status.change_reason
        }
      });
    }

    // Add milestone events
    for (const milestone of timeline) {
      auditLog.push({
        eventType: 'MILESTONE',
        timestamp: milestone.milestone_date,
        userId: milestone.created_by_id,
        details: {
          type: milestone.milestone_type,
          description: milestone.description,
          actionTaken: milestone.action_taken
        }
      });
    }

    // Submission event
    if (appeal.submitted_date) {
      auditLog.push({
        eventType: 'SUBMITTED',
        timestamp: appeal.submitted_date,
        userId: appeal.submitted_by_id,
        details: {
          method: appeal.submission_method,
          trackingNumber: appeal.tracking_number,
          confirmationNumber: appeal.confirmation_number
        }
      });
    }

    // Decision event
    if (appeal.decision_date) {
      auditLog.push({
        eventType: 'DECISION_RECEIVED',
        timestamp: appeal.decision_date,
        userId: null, // External event
        details: {
          decisionType: appeal.decision_type,
          recoveredAmount: appeal.recovered_amount,
          finalDeniedAmount: appeal.final_denied_amount,
          reason: appeal.decision_reason
        }
      });
    }

    // Sort by timestamp descending and limit
    auditLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return auditLog.slice(0, limit);
  }
}

export default new AppealTrackingService();
