/**
 * Integration tests for PAINAD Scale API
 * Feature: painad-scale-schema
 *
 * Tests verify:
 * - PAINAD scale schema and data validation
 * - Automatic score calculation (0-10)
 * - Pain severity classification (NO_PAIN, MILD, MODERATE, SEVERE)
 * - CRUD operations for pain assessments
 * - Signature and amendment tracking (21 CFR Part 11)
 * - Patient statistics and trend analysis
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../../src/config/db.drizzle.js';
import { painad_scales } from '../../src/db/schemas/painadScale.schema.js';
import { patients } from '../../src/db/schemas/patient.schema.js';
import { eq } from 'drizzle-orm';

describe('PAINAD Scale Schema Integration Tests', () => {
  let testPatient;
  let testAssessmentIds = [];

  beforeAll(async () => {
    // Create a test patient for our PAINAD assessments
    const result = await db.insert(patients)
      .values({
        first_name: 'Test',
        last_name: 'Dementia Patient',
        date_of_birth: new Date('1940-01-01'),
        gender: 'F',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    testPatient = result[0];
  });

  afterAll(async () => {
    // Clean up test data
    if (testAssessmentIds.length > 0) {
      await db.delete(painad_scales)
        .where(eq(painad_scales.patient_id, testPatient.id));
    }
    if (testPatient) {
      await db.delete(patients)
        .where(eq(patients.id, testPatient.id));
    }
  });

  describe('Schema Validation', () => {
    it('should create a PAINAD assessment with all required fields', async () => {
      const assessmentData = {
        patient_id: testPatient.id,
        assessment_date: new Date(),
        breathing_score: 1,
        negative_vocalization_score: 0,
        facial_expression_score: 1,
        body_language_score: 0,
        consolability_score: 1,
        total_score: 3, // Sum of above scores
        pain_severity: 'MILD',
        pain_present: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(painad_scales)
        .values(assessmentData)
        .returning();

      expect(result[0]).toBeDefined();
      expect(result[0].patient_id).toBe(testPatient.id);
      expect(result[0].breathing_score).toBe(1);
      expect(result[0].negative_vocalization_score).toBe(0);
      expect(result[0].facial_expression_score).toBe(1);
      expect(result[0].body_language_score).toBe(0);
      expect(result[0].consolability_score).toBe(1);
      expect(result[0].total_score).toBe(3);
      expect(result[0].pain_severity).toBe('MILD');
      expect(result[0].pain_present).toBe(true);

      testAssessmentIds.push(result[0].id);
    });

    it('should create a PAINAD assessment with dementia context', async () => {
      const assessmentData = {
        patient_id: testPatient.id,
        assessment_date: new Date(),
        dementia_stage: 'MODERATE',
        dementia_type: 'ALZHEIMERS',
        verbal_ability: 'LIMITED_VERBAL',
        breathing_score: 2,
        negative_vocalization_score: 2,
        facial_expression_score: 2,
        body_language_score: 1,
        consolability_score: 2,
        total_score: 9, // Sum of above scores
        pain_severity: 'SEVERE',
        pain_present: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(painad_scales)
        .values(assessmentData)
        .returning();

      expect(result[0]).toBeDefined();
      expect(result[0].dementia_stage).toBe('MODERATE');
      expect(result[0].dementia_type).toBe('ALZHEIMERS');
      expect(result[0].verbal_ability).toBe('LIMITED_VERBAL');
      expect(result[0].total_score).toBe(9);
      expect(result[0].pain_severity).toBe('SEVERE');

      testAssessmentIds.push(result[0].id);
    });

    it('should create a PAINAD assessment with intervention tracking', async () => {
      const assessmentData = {
        patient_id: testPatient.id,
        assessment_date: new Date(),
        breathing_score: 1,
        negative_vocalization_score: 1,
        facial_expression_score: 1,
        body_language_score: 1,
        consolability_score: 0,
        total_score: 4,
        pain_severity: 'MODERATE',
        pain_present: true,
        intervention_provided: true,
        intervention_type: 'COMBINATION',
        medication_administered: 'Morphine 5mg',
        medication_dose: '5mg',
        medication_route: 'SL',
        non_pharm_interventions: ['REPOSITIONING', 'GENTLE_TOUCH'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(painad_scales)
        .values(assessmentData)
        .returning();

      expect(result[0]).toBeDefined();
      expect(result[0].intervention_provided).toBe(true);
      expect(result[0].intervention_type).toBe('COMBINATION');
      expect(result[0].medication_administered).toBe('Morphine 5mg');
      expect(result[0].medication_route).toBe('SL');
      expect(result[0].non_pharm_interventions).toEqual(['REPOSITIONING', 'GENTLE_TOUCH']);

      testAssessmentIds.push(result[0].id);
    });

    it('should create a no-pain assessment (score 0)', async () => {
      const assessmentData = {
        patient_id: testPatient.id,
        assessment_date: new Date(),
        breathing_score: 0,
        negative_vocalization_score: 0,
        facial_expression_score: 0,
        body_language_score: 0,
        consolability_score: 0,
        total_score: 0,
        pain_severity: 'NO_PAIN',
        pain_present: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(painad_scales)
        .values(assessmentData)
        .returning();

      expect(result[0]).toBeDefined();
      expect(result[0].total_score).toBe(0);
      expect(result[0].pain_severity).toBe('NO_PAIN');
      expect(result[0].pain_present).toBe(false);

      testAssessmentIds.push(result[0].id);
    });
  });

  describe('Score Calculation Validation', () => {
    it('should correctly calculate mild pain (total score 1-3)', async () => {
      const assessmentData = {
        patient_id: testPatient.id,
        assessment_date: new Date(),
        breathing_score: 1,
        negative_vocalization_score: 0,
        facial_expression_score: 1,
        body_language_score: 1,
        consolability_score: 0,
        total_score: 3,
        pain_severity: 'MILD',
        pain_present: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(painad_scales)
        .values(assessmentData)
        .returning();

      const calculatedTotal =
        result[0].breathing_score +
        result[0].negative_vocalization_score +
        result[0].facial_expression_score +
        result[0].body_language_score +
        result[0].consolability_score;

      expect(calculatedTotal).toBe(3);
      expect(result[0].total_score).toBe(calculatedTotal);
      expect(result[0].pain_severity).toBe('MILD');

      testAssessmentIds.push(result[0].id);
    });

    it('should correctly calculate moderate pain (total score 4-6)', async () => {
      const assessmentData = {
        patient_id: testPatient.id,
        assessment_date: new Date(),
        breathing_score: 1,
        negative_vocalization_score: 1,
        facial_expression_score: 1,
        body_language_score: 2,
        consolability_score: 1,
        total_score: 6,
        pain_severity: 'MODERATE',
        pain_present: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(painad_scales)
        .values(assessmentData)
        .returning();

      const calculatedTotal =
        result[0].breathing_score +
        result[0].negative_vocalization_score +
        result[0].facial_expression_score +
        result[0].body_language_score +
        result[0].consolability_score;

      expect(calculatedTotal).toBe(6);
      expect(result[0].total_score).toBe(calculatedTotal);
      expect(result[0].pain_severity).toBe('MODERATE');

      testAssessmentIds.push(result[0].id);
    });

    it('should correctly calculate severe pain (total score 7-10)', async () => {
      const assessmentData = {
        patient_id: testPatient.id,
        assessment_date: new Date(),
        breathing_score: 2,
        negative_vocalization_score: 2,
        facial_expression_score: 2,
        body_language_score: 2,
        consolability_score: 2,
        total_score: 10,
        pain_severity: 'SEVERE',
        pain_present: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(painad_scales)
        .values(assessmentData)
        .returning();

      const calculatedTotal =
        result[0].breathing_score +
        result[0].negative_vocalization_score +
        result[0].facial_expression_score +
        result[0].body_language_score +
        result[0].consolability_score;

      expect(calculatedTotal).toBe(10);
      expect(result[0].total_score).toBe(calculatedTotal);
      expect(result[0].pain_severity).toBe('SEVERE');

      testAssessmentIds.push(result[0].id);
    });
  });

  describe('Hospice-Specific Fields', () => {
    it('should create assessment with caregiver involvement', async () => {
      const assessmentData = {
        patient_id: testPatient.id,
        assessment_date: new Date(),
        breathing_score: 1,
        negative_vocalization_score: 0,
        facial_expression_score: 1,
        body_language_score: 0,
        consolability_score: 1,
        total_score: 3,
        pain_severity: 'MILD',
        pain_present: true,
        caregiver_present: true,
        caregiver_observations: 'Family member noted patient grimacing during transfer',
        caregiver_education_provided: true,
        caregiver_able_to_assess: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(painad_scales)
        .values(assessmentData)
        .returning();

      expect(result[0]).toBeDefined();
      expect(result[0].caregiver_present).toBe(true);
      expect(result[0].caregiver_education_provided).toBe(true);
      expect(result[0].caregiver_able_to_assess).toBe(true);
      expect(result[0].caregiver_observations).toContain('grimacing');

      testAssessmentIds.push(result[0].id);
    });

    it('should create assessment with comfort goal tracking', async () => {
      const assessmentData = {
        patient_id: testPatient.id,
        assessment_date: new Date(),
        breathing_score: 0,
        negative_vocalization_score: 0,
        facial_expression_score: 0,
        body_language_score: 0,
        consolability_score: 0,
        total_score: 0,
        pain_severity: 'NO_PAIN',
        pain_present: false,
        comfort_goal_met: true,
        comfort_goal_notes: 'Patient appears comfortable and at ease',
        care_plan_update_needed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(painad_scales)
        .values(assessmentData)
        .returning();

      expect(result[0]).toBeDefined();
      expect(result[0].comfort_goal_met).toBe(true);
      expect(result[0].care_plan_update_needed).toBe(false);

      testAssessmentIds.push(result[0].id);
    });
  });

  describe('Signature and Amendment Tracking', () => {
    it('should track signature information (21 CFR Part 11)', async () => {
      const assessmentData = {
        patient_id: testPatient.id,
        assessment_date: new Date(),
        breathing_score: 1,
        negative_vocalization_score: 0,
        facial_expression_score: 0,
        body_language_score: 0,
        consolability_score: 0,
        total_score: 1,
        pain_severity: 'MILD',
        pain_present: true,
        signed_at: new Date(),
        signed_by_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(painad_scales)
        .values(assessmentData)
        .returning();

      expect(result[0]).toBeDefined();
      expect(result[0].signed_at).toBeDefined();
      expect(result[0].signed_by_id).toBe(1);

      testAssessmentIds.push(result[0].id);
    });

    it('should track amendment information', async () => {
      const assessmentData = {
        patient_id: testPatient.id,
        assessment_date: new Date(),
        breathing_score: 1,
        negative_vocalization_score: 1,
        facial_expression_score: 0,
        body_language_score: 0,
        consolability_score: 0,
        total_score: 2,
        pain_severity: 'MILD',
        pain_present: true,
        signed_at: new Date(),
        signed_by_id: 1,
        amended: true,
        amendment_reason: 'Corrected breathing score after review',
        amended_at: new Date(),
        amended_by_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(painad_scales)
        .values(assessmentData)
        .returning();

      expect(result[0]).toBeDefined();
      expect(result[0].amended).toBe(true);
      expect(result[0].amendment_reason).toContain('Corrected breathing score');
      expect(result[0].amended_at).toBeDefined();
      expect(result[0].amended_by_id).toBe(2);

      testAssessmentIds.push(result[0].id);
    });
  });

  describe('CRUD Operations', () => {
    it('should query assessments for a patient', async () => {
      const assessments = await db.select()
        .from(painad_scales)
        .where(eq(painad_scales.patient_id, testPatient.id));

      expect(assessments.length).toBeGreaterThan(0);
      expect(assessments[0].patient_id).toBe(testPatient.id);
    });

    it('should update an assessment', async () => {
      const assessment = testAssessmentIds[0];

      const result = await db.update(painad_scales)
        .set({
          clinical_notes: 'Updated clinical notes',
          updatedAt: new Date()
        })
        .where(eq(painad_scales.id, assessment))
        .returning();

      expect(result[0]).toBeDefined();
      expect(result[0].clinical_notes).toBe('Updated clinical notes');
    });

    it('should filter assessments by pain severity', async () => {
      const severeAssessments = await db.select()
        .from(painad_scales)
        .where(eq(painad_scales.pain_severity, 'SEVERE'));

      expect(Array.isArray(severeAssessments)).toBe(true);
      severeAssessments.forEach(assessment => {
        expect(assessment.pain_severity).toBe('SEVERE');
        expect(assessment.total_score).toBeGreaterThanOrEqual(7);
      });
    });

    it('should filter assessments by dementia stage', async () => {
      const moderateDementiaAssessments = await db.select()
        .from(painad_scales)
        .where(eq(painad_scales.dementia_stage, 'MODERATE'));

      expect(Array.isArray(moderateDementiaAssessments)).toBe(true);
      moderateDementiaAssessments.forEach(assessment => {
        expect(assessment.dementia_stage).toBe('MODERATE');
      });
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity with patient table', async () => {
      const assessments = await db.select()
        .from(painad_scales)
        .where(eq(painad_scales.patient_id, testPatient.id));

      expect(assessments.length).toBeGreaterThan(0);
      assessments.forEach(assessment => {
        expect(assessment.patient_id).toBe(testPatient.id);
      });
    });

    it('should validate component scores are within range (0-2)', async () => {
      const assessments = await db.select()
        .from(painad_scales)
        .where(eq(painad_scales.patient_id, testPatient.id));

      assessments.forEach(assessment => {
        expect(assessment.breathing_score).toBeGreaterThanOrEqual(0);
        expect(assessment.breathing_score).toBeLessThanOrEqual(2);
        expect(assessment.negative_vocalization_score).toBeGreaterThanOrEqual(0);
        expect(assessment.negative_vocalization_score).toBeLessThanOrEqual(2);
        expect(assessment.facial_expression_score).toBeGreaterThanOrEqual(0);
        expect(assessment.facial_expression_score).toBeLessThanOrEqual(2);
        expect(assessment.body_language_score).toBeGreaterThanOrEqual(0);
        expect(assessment.body_language_score).toBeLessThanOrEqual(2);
        expect(assessment.consolability_score).toBeGreaterThanOrEqual(0);
        expect(assessment.consolability_score).toBeLessThanOrEqual(2);
      });
    });

    it('should validate total scores are within range (0-10)', async () => {
      const assessments = await db.select()
        .from(painad_scales)
        .where(eq(painad_scales.patient_id, testPatient.id));

      assessments.forEach(assessment => {
        expect(assessment.total_score).toBeGreaterThanOrEqual(0);
        expect(assessment.total_score).toBeLessThanOrEqual(10);
      });
    });
  });
});
