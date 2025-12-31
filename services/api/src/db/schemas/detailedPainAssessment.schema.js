import { pgTable, bigint, integer, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

/**
 * Detailed Pain Assessment Schema
 * Comprehensive pain assessments including location, quality, severity, triggers, and interventions
 * Supports hospice care clinical documentation requirements
 */
export const detailed_pain_assessments = pgTable('detailed_pain_assessments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).notNull(),
  encounter_id: bigint('encounter_id', { mode: 'number' }),

  // Assessment metadata
  assessment_date: timestamp('assessment_date').defaultNow().notNull(),
  assessment_type: varchar('assessment_type', { length: 50 }), // INITIAL, FOLLOW_UP, REASSESSMENT
  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),

  // Pain presence and status
  pain_present: boolean('pain_present').default(false),
  pain_status: varchar('pain_status', { length: 50 }), // ACTIVE, CONTROLLED, RESOLVED, WORSENING

  // Pain Location - Multiple body locations can be affected
  primary_pain_location: varchar('primary_pain_location', { length: 255 }),
  primary_pain_location_side: varchar('primary_pain_location_side', { length: 50 }), // LEFT, RIGHT, BILATERAL, MIDLINE
  secondary_pain_locations: jsonb('secondary_pain_locations'), // Array of {location, side, description}
  pain_radiation: text('pain_radiation'), // Description of where pain radiates to
  pain_location_notes: text('pain_location_notes'),

  // Pain Quality/Character - How the pain feels
  pain_quality: jsonb('pain_quality'), // Array: SHARP, DULL, ACHING, BURNING, THROBBING, STABBING, CRAMPING, SHOOTING, etc.
  pain_quality_description: text('pain_quality_description'),

  // Pain Severity
  pain_scale_type: varchar('pain_scale_type', { length: 50 }), // NUMERIC_0_10, FACES, WONG_BAKER, VAS, PAINAD, FLACC
  pain_level_current: integer('pain_level_current'), // 0-10 scale typically
  pain_level_at_rest: integer('pain_level_at_rest'),
  pain_level_with_activity: integer('pain_level_with_activity'),
  pain_level_worst_24h: integer('pain_level_worst_24h'),
  pain_level_best_24h: integer('pain_level_best_24h'),
  pain_level_average: integer('pain_level_average'),
  acceptable_pain_level: integer('acceptable_pain_level'), // Patient's goal for acceptable pain level

  // Pain Timing/Pattern
  pain_onset: varchar('pain_onset', { length: 255 }), // When did pain start
  pain_duration: varchar('pain_duration', { length: 100 }), // CONSTANT, INTERMITTENT, BRIEF, PROLONGED
  pain_frequency: varchar('pain_frequency', { length: 100 }), // CONTINUOUS, DAILY, WEEKLY, OCCASIONAL
  pain_pattern: varchar('pain_pattern', { length: 100 }), // CONSTANT, FLUCTUATING, PREDICTABLE, UNPREDICTABLE
  time_of_day_worst: varchar('time_of_day_worst', { length: 100 }), // MORNING, AFTERNOON, EVENING, NIGHT

  // Pain Triggers (Aggravating Factors)
  pain_triggers: jsonb('pain_triggers'), // Array of trigger objects
  trigger_movement: boolean('trigger_movement'),
  trigger_position_changes: boolean('trigger_position_changes'),
  trigger_breathing: boolean('trigger_breathing'),
  trigger_eating: boolean('trigger_eating'),
  trigger_stress: boolean('trigger_stress'),
  trigger_weather: boolean('trigger_weather'),
  trigger_touch: boolean('trigger_touch'),
  trigger_temperature: boolean('trigger_temperature'),
  other_triggers: text('other_triggers'),

  // Relieving Factors
  relieving_factors: jsonb('relieving_factors'), // Array of relief methods
  relief_rest: boolean('relief_rest'),
  relief_position: boolean('relief_position'),
  relief_heat: boolean('relief_heat'),
  relief_cold: boolean('relief_cold'),
  relief_massage: boolean('relief_massage'),
  relief_distraction: boolean('relief_distraction'),
  relief_medication: boolean('relief_medication'),
  other_relief: text('other_relief'),

  // Pain Impact on Function
  impact_on_sleep: integer('impact_on_sleep'), // 0-10 scale
  impact_on_mobility: integer('impact_on_mobility'),
  impact_on_appetite: integer('impact_on_appetite'),
  impact_on_mood: integer('impact_on_mood'),
  impact_on_daily_activities: integer('impact_on_daily_activities'),
  impact_on_social: integer('impact_on_social'),
  functional_impact_notes: text('functional_impact_notes'),

  // Current Pain Interventions
  current_interventions: jsonb('current_interventions'), // Array of intervention objects

  // Pharmacological interventions
  current_medications: jsonb('current_medications'), // Array of {name, dose, route, frequency, effectiveness}
  breakthrough_medication: varchar('breakthrough_medication', { length: 255 }),
  breakthrough_dose: varchar('breakthrough_dose', { length: 100 }),
  breakthrough_effectiveness: integer('breakthrough_effectiveness'), // 0-10
  medication_side_effects: text('medication_side_effects'),

  // Non-pharmacological interventions
  non_pharm_interventions: jsonb('non_pharm_interventions'), // Array: HEAT, COLD, MASSAGE, REPOSITIONING, DISTRACTION, RELAXATION, etc.
  non_pharm_effectiveness: text('non_pharm_effectiveness'),

  // Intervention Effectiveness
  overall_pain_control: varchar('overall_pain_control', { length: 50 }), // EXCELLENT, GOOD, FAIR, POOR, UNCONTROLLED
  intervention_effectiveness: integer('intervention_effectiveness'), // 0-10
  time_to_relief: varchar('time_to_relief', { length: 100 }), // Minutes/hours for interventions to work
  duration_of_relief: varchar('duration_of_relief', { length: 100 }),

  // Goals and Plan
  pain_management_goal: text('pain_management_goal'),
  recommended_interventions: jsonb('recommended_interventions'),
  follow_up_plan: text('follow_up_plan'),
  referral_needed: boolean('referral_needed'),
  referral_type: varchar('referral_type', { length: 100 }), // PAIN_SPECIALIST, PALLIATIVE_CARE, PHYSICAL_THERAPY, etc.

  // Breakthrough Pain Assessment
  breakthrough_pain_present: boolean('breakthrough_pain_present'),
  breakthrough_frequency: varchar('breakthrough_frequency', { length: 100 }),
  breakthrough_duration: varchar('breakthrough_duration', { length: 100 }),
  breakthrough_predictable: boolean('breakthrough_predictable'),
  breakthrough_triggers: text('breakthrough_triggers'),

  // Patient/Caregiver Education
  patient_education_provided: boolean('patient_education_provided'),
  education_topics: jsonb('education_topics'),
  patient_understanding: varchar('patient_understanding', { length: 50 }), // GOOD, FAIR, POOR, NEEDS_REINFORCEMENT
  caregiver_education_provided: boolean('caregiver_education_provided'),

  // Clinical Notes
  clinical_notes: text('clinical_notes'),
  assessment_summary: text('assessment_summary'),

  // Signature and compliance
  signature_id: bigint('signature_id', { mode: 'number' }),
  signed_at: timestamp('signed_at'),

  // Audit fields
  created_by_id: bigint('created_by_id', { mode: 'number' }),
  updated_by_id: bigint('updated_by_id', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
