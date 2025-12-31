import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, date } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

/**
 * QAPI (Quality Assurance Performance Improvement) Module Schemas
 * Module L - MEDIUM Priority
 *
 * Purpose: Quality improvement, incident tracking, performance monitoring
 * Compliance: CMS Conditions of Participation (CoPs) require comprehensive QAPI programs
 *
 * Tables:
 * - incidents: Adverse events, errors, safety concerns
 * - grievances: Patient/family complaints and resolution tracking
 * - quality_measures: Performance metrics and benchmarks
 * - quality_measure_data: Actual measurement data points
 * - performance_improvement_projects: PIPs for quality enhancement
 * - chart_audits: Documentation quality reviews
 * - infection_control: Infection prevention tracking
 */

/**
 * Incidents Table
 * Tracks adverse events, errors, near misses, and safety concerns
 */
export const incidents = pgTable('incidents', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id),

  // Incident details
  incident_date: date('incident_date').notNull(),
  incident_time: varchar('incident_time', { length: 20 }),
  reported_date: date('reported_date').notNull(),

  // Classification
  incident_type: varchar('incident_type', { length: 100 }).notNull(), // MEDICATION_ERROR, FALL, PRESSURE_INJURY, etc.
  incident_category: varchar('incident_category', { length: 50 }), // CLINICAL, ADMINISTRATIVE, SAFETY, ENVIRONMENTAL
  severity_level: varchar('severity_level', { length: 50 }), // MINOR, MODERATE, MAJOR, CATASTROPHIC

  // Description
  incident_description: text('incident_description').notNull(),
  location_of_incident: varchar('location_of_incident', { length: 255 }),
  witnesses: text('witnesses'),

  // Impact
  patient_outcome: varchar('patient_outcome', { length: 100 }), // NO_HARM, TEMPORARY_HARM, PERMANENT_HARM, DEATH
  harm_occurred: boolean('harm_occurred').default(false),
  immediate_action_taken: text('immediate_action_taken'),

  // Reporting
  reported_by_id: text('reported_by_id').references(() => users.id),
  reported_by_name: varchar('reported_by_name', { length: 255 }),
  staff_involved: text('staff_involved'),

  // Investigation
  investigation_required: boolean('investigation_required').default(false),
  investigation_status: varchar('investigation_status', { length: 50 }), // PENDING, IN_PROGRESS, COMPLETED
  root_cause: text('root_cause'),
  contributing_factors: text('contributing_factors'),

  // Corrective actions
  corrective_actions: text('corrective_actions'),
  preventive_actions: text('preventive_actions'),
  action_plan: text('action_plan'),

  // Follow-up
  follow_up_required: boolean('follow_up_required').default(false),
  follow_up_date: date('follow_up_date'),
  follow_up_notes: text('follow_up_notes'),

  // Status and closure
  incident_status: varchar('incident_status', { length: 50 }).default('OPEN').notNull(), // OPEN, UNDER_REVIEW, CLOSED
  closed_date: date('closed_date'),
  closed_by_id: text('closed_by_id').references(() => users.id),

  // Regulatory reporting
  reportable_to_state: boolean('reportable_to_state').default(false),
  state_report_date: date('state_report_date'),
  reportable_to_cms: boolean('reportable_to_cms').default(false),

  // Additional data
  notes: text('notes'),
  attachments: jsonb('attachments'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Grievances Table
 * Patient and family complaints with resolution tracking
 */
export const grievances = pgTable('grievances', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id),

  // Grievance details
  grievance_date: date('grievance_date').notNull(),
  received_date: date('received_date').notNull(),

  // Source
  complainant_name: varchar('complainant_name', { length: 255 }),
  complainant_relationship: varchar('complainant_relationship', { length: 100 }), // PATIENT, FAMILY, CAREGIVER, OTHER
  complainant_contact: text('complainant_contact'),

  // Classification
  grievance_type: varchar('grievance_type', { length: 100 }).notNull(), // CARE_QUALITY, STAFF_BEHAVIOR, COMMUNICATION, BILLING, etc.
  grievance_category: varchar('grievance_category', { length: 50 }), // CLINICAL, ADMINISTRATIVE, FINANCIAL
  priority_level: varchar('priority_level', { length: 50 }), // LOW, MEDIUM, HIGH, URGENT

  // Description
  grievance_description: text('grievance_description').notNull(),
  department_involved: varchar('department_involved', { length: 100 }),
  staff_involved: text('staff_involved'),

  // Investigation
  investigation_conducted: boolean('investigation_conducted').default(false),
  investigation_findings: text('investigation_findings'),
  investigation_completed_date: date('investigation_completed_date'),
  investigator_id: text('investigator_id').references(() => users.id),

  // Resolution
  resolution_description: text('resolution_description'),
  resolution_date: date('resolution_date'),
  resolved_by_id: text('resolved_by_id').references(() => users.id),

  // Response
  response_sent: boolean('response_sent').default(false),
  response_date: date('response_date'),
  response_method: varchar('response_method', { length: 50 }), // PHONE, EMAIL, LETTER, IN_PERSON

  // Outcome
  complainant_satisfied: boolean('complainant_satisfied'),
  corrective_actions: text('corrective_actions'),

  // Status
  grievance_status: varchar('grievance_status', { length: 50 }).default('OPEN').notNull(), // OPEN, INVESTIGATING, RESOLVED, CLOSED
  closed_date: date('closed_date'),

  // Timeliness tracking
  response_deadline: date('response_deadline'), // CMS requires response within specific timeframe
  is_overdue: boolean('is_overdue').default(false),

  // Additional data
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Quality Measures Table
 * Defines performance metrics and benchmarks
 */
export const quality_measures = pgTable('quality_measures', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Measure identification
  measure_name: varchar('measure_name', { length: 255 }).notNull(),
  measure_code: varchar('measure_code', { length: 50 }), // e.g., NQF codes
  measure_type: varchar('measure_type', { length: 100 }), // OUTCOME, PROCESS, STRUCTURE, PATIENT_EXPERIENCE

  // Description
  description: text('description'),
  numerator_definition: text('numerator_definition'),
  denominator_definition: text('denominator_definition'),
  exclusion_criteria: text('exclusion_criteria'),

  // Benchmarking
  target_value: integer('target_value'), // Target percentage or value
  benchmark_source: varchar('benchmark_source', { length: 255 }), // NATIONAL, STATE, INTERNAL

  // Measurement details
  measurement_frequency: varchar('measurement_frequency', { length: 50 }), // MONTHLY, QUARTERLY, ANNUALLY
  data_source: varchar('data_source', { length: 255 }), // EMR, SURVEY, MANUAL_REVIEW
  calculation_method: text('calculation_method'),

  // Reporting
  cms_reportable: boolean('cms_reportable').default(false),
  public_reporting: boolean('public_reporting').default(false),

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  effective_date: date('effective_date'),
  discontinuation_date: date('discontinuation_date'),

  // Additional data
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Quality Measure Data Table
 * Actual measurement data points over time
 */
export const quality_measure_data = pgTable('quality_measure_data', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  quality_measure_id: bigint('quality_measure_id', { mode: 'number' }).references(() => quality_measures.id).notNull(),

  // Measurement period
  measurement_period_start: date('measurement_period_start').notNull(),
  measurement_period_end: date('measurement_period_end').notNull(),

  // Data values
  numerator: integer('numerator').notNull(),
  denominator: integer('denominator').notNull(),
  exclusions: integer('exclusions').default(0),

  // Calculated values
  percentage: integer('percentage'), // Calculated as (numerator/denominator) * 100
  meets_target: boolean('meets_target'),
  variance_from_target: integer('variance_from_target'),

  // Comparison
  prior_period_percentage: integer('prior_period_percentage'),
  trend: varchar('trend', { length: 50 }), // IMPROVING, DECLINING, STABLE

  // Data quality
  data_collection_method: varchar('data_collection_method', { length: 100 }),
  data_validated: boolean('data_validated').default(false),
  validated_by_id: text('validated_by_id').references(() => users.id),
  validation_date: date('validation_date'),

  // Analysis
  analysis_notes: text('analysis_notes'),
  action_items: text('action_items'),

  // Additional data
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Performance Improvement Projects (PIPs) Table
 * Structured quality improvement initiatives
 */
export const performance_improvement_projects = pgTable('performance_improvement_projects', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Project identification
  project_name: varchar('project_name', { length: 255 }).notNull(),
  project_code: varchar('project_code', { length: 50 }),

  // Classification
  project_type: varchar('project_type', { length: 100 }), // CLINICAL_OUTCOME, PATIENT_SAFETY, PATIENT_EXPERIENCE, OPERATIONAL
  focus_area: varchar('focus_area', { length: 255 }), // PAIN_MANAGEMENT, SYMPTOM_CONTROL, etc.

  // Project details
  problem_statement: text('problem_statement').notNull(),
  background: text('background'),
  scope: text('scope'),

  // Goals and objectives
  aim_statement: text('aim_statement'),
  measurable_goals: text('measurable_goals'),
  target_completion_date: date('target_completion_date'),

  // Team
  project_leader_id: text('project_leader_id').references(() => users.id),
  team_members: text('team_members'),

  // Dates
  start_date: date('start_date').notNull(),
  end_date: date('end_date'),

  // Baseline data
  baseline_measurement: text('baseline_measurement'),
  baseline_date: date('baseline_date'),

  // Interventions
  interventions: text('interventions'),
  implementation_plan: text('implementation_plan'),

  // Monitoring
  measurement_strategy: text('measurement_strategy'),
  data_collection_frequency: varchar('data_collection_frequency', { length: 50 }),

  // Results
  outcomes: text('outcomes'),
  lessons_learned: text('lessons_learned'),
  sustainability_plan: text('sustainability_plan'),

  // Status
  project_status: varchar('project_status', { length: 50 }).default('PLANNING').notNull(), // PLANNING, ACTIVE, MONITORING, COMPLETED, SUSPENDED
  completion_percentage: integer('completion_percentage').default(0),

  // Success metrics
  target_achieved: boolean('target_achieved'),
  improvement_sustained: boolean('improvement_sustained'),

  // Additional data
  notes: text('notes'),
  attachments: jsonb('attachments'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Chart Audits Table
 * Documentation quality review and compliance audits
 */
export const chart_audits = pgTable('chart_audits', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Audit details
  audit_date: date('audit_date').notNull(),
  audit_type: varchar('audit_type', { length: 100 }), // INITIAL_ASSESSMENT, ONGOING_CARE, DISCHARGE, COMPREHENSIVE
  audit_period_start: date('audit_period_start'),
  audit_period_end: date('audit_period_end'),

  // Auditor
  auditor_id: text('auditor_id').references(() => users.id).notNull(),
  auditor_name: varchar('auditor_name', { length: 255 }),

  // Scope
  chart_sections_reviewed: text('chart_sections_reviewed'),

  // Compliance scoring
  total_elements: integer('total_elements'),
  compliant_elements: integer('compliant_elements'),
  non_compliant_elements: integer('non_compliant_elements'),
  compliance_percentage: integer('compliance_percentage'),

  // Findings
  strengths: text('strengths'),
  deficiencies: text('deficiencies'),
  missing_documentation: text('missing_documentation'),

  // Categories reviewed
  assessment_documentation: boolean('assessment_documentation'),
  plan_of_care: boolean('plan_of_care'),
  visit_notes: boolean('visit_notes'),
  medication_documentation: boolean('medication_documentation'),
  physician_orders: boolean('physician_orders'),
  consent_forms: boolean('consent_forms'),
  advance_directives: boolean('advance_directives'),

  // Regulatory compliance
  cms_compliance: boolean('cms_compliance'),
  state_compliance: boolean('state_compliance'),
  accreditation_compliance: boolean('accreditation_compliance'),

  // Corrective actions
  corrective_actions_required: boolean('corrective_actions_required').default(false),
  corrective_actions: text('corrective_actions'),
  responsible_party_id: text('responsible_party_id').references(() => users.id),
  correction_deadline: date('correction_deadline'),

  // Follow-up
  follow_up_required: boolean('follow_up_required').default(false),
  follow_up_date: date('follow_up_date'),
  follow_up_completed: boolean('follow_up_completed').default(false),

  // Status
  audit_status: varchar('audit_status', { length: 50 }).default('COMPLETED').notNull(), // COMPLETED, PENDING_REVIEW, CORRECTED

  // Additional data
  recommendations: text('recommendations'),
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Infection Control Table
 * Infection prevention tracking and surveillance
 */
export const infection_control = pgTable('infection_control', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id),

  // Event details
  event_date: date('event_date').notNull(),
  reported_date: date('reported_date').notNull(),

  // Infection classification
  infection_type: varchar('infection_type', { length: 100 }).notNull(), // UTI, RESPIRATORY, SKIN, WOUND, CLABSI, etc.
  infection_site: varchar('infection_site', { length: 255 }),
  organism_identified: varchar('organism_identified', { length: 255 }),

  // Acquisition
  healthcare_associated: boolean('healthcare_associated').default(false), // HAI tracking
  community_acquired: boolean('community_acquired').default(false),

  // Symptoms
  symptoms: text('symptoms'),
  onset_date: date('onset_date'),

  // Diagnosis
  culture_obtained: boolean('culture_obtained').default(false),
  culture_date: date('culture_date'),
  culture_results: text('culture_results'),

  // Treatment
  antibiotic_therapy: boolean('antibiotic_therapy').default(false),
  antibiotic_name: varchar('antibiotic_name', { length: 255 }),
  treatment_start_date: date('treatment_start_date'),
  treatment_end_date: date('treatment_end_date'),

  // Isolation precautions
  isolation_required: boolean('isolation_required').default(false),
  isolation_type: varchar('isolation_type', { length: 100 }), // CONTACT, DROPLET, AIRBORNE, STANDARD
  isolation_start_date: date('isolation_start_date'),
  isolation_end_date: date('isolation_end_date'),

  // Staff exposure
  staff_exposed: boolean('staff_exposed').default(false),
  exposed_staff: text('exposed_staff'),

  // Investigation
  investigation_conducted: boolean('investigation_conducted').default(false),
  probable_source: text('probable_source'),
  contributing_factors: text('contributing_factors'),

  // Prevention measures
  preventive_actions: text('preventive_actions'),
  education_provided: boolean('education_provided').default(false),

  // Outcome
  infection_resolved: boolean('infection_resolved'),
  resolution_date: date('resolution_date'),
  complications: text('complications'),

  // Reporting
  reportable_to_health_dept: boolean('reportable_to_health_dept').default(false),
  health_dept_report_date: date('health_dept_report_date'),

  // Status
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, RESOLVED, MONITORING

  // Additional data
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
