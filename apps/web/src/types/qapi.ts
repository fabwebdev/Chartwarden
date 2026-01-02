/**
 * QAPI Type Definitions
 *
 * TypeScript types for Quality Assurance and Performance Improvement (QAPI) data structures.
 * These types correspond to the backend API responses and request payloads for QAPI metrics,
 * initiatives, thresholds, and performance tracking.
 *
 * Compliance: CMS Conditions of Participation (CoPs), HIPAA, 21 CFR Part 11
 */

// ==============================|| ENUMS ||============================== //

export type MetricCategory =
  | 'DEFECT_RATE'
  | 'TEST_COVERAGE'
  | 'MTTR'
  | 'CUSTOMER_ISSUES'
  | 'CLINICAL'
  | 'OPERATIONAL'
  | 'SAFETY'
  | 'COMPLIANCE';

export type MetricType = 'PERCENTAGE' | 'COUNT' | 'DURATION' | 'RATIO' | 'SCORE';

export type MetricDataType = 'DECIMAL' | 'INTEGER' | 'BOOLEAN';

export type AggregationMethod = 'AVG' | 'SUM' | 'MIN' | 'MAX' | 'LATEST' | 'COUNT';

export type CollectionFrequency = 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type DataSource = 'MANUAL' | 'API' | 'CI_CD' | 'MONITORING' | 'TEST_FRAMEWORK' | 'AUTOMATION';

export type ThresholdType = 'WARNING' | 'CRITICAL' | 'SLA' | 'TARGET' | 'BASELINE';

export type ComparisonOperator = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ' | 'BETWEEN';

export type ImprovementDirection = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';

export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ThresholdStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'SLA_BREACH';

export type Environment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';

export type InitiativeType = 'QUALITY_IMPROVEMENT' | 'DEFECT_REDUCTION' | 'PROCESS_OPTIMIZATION';

export type InitiativeCategory = 'CLINICAL' | 'OPERATIONAL' | 'TECHNICAL' | 'COMPLIANCE';

export type InitiativePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type InitiativeStatus = 'PROPOSED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';

export type RelationshipType = 'PRIMARY_TARGET' | 'SECONDARY_TARGET' | 'MONITORING' | 'AFFECTED';

export type SnapshotType = 'BASELINE' | 'MIDPOINT' | 'FINAL' | 'CUSTOM';

export type DependencyType = 'BLOCKS' | 'REQUIRES' | 'RELATED' | 'INFORMS';

export type AggregationPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type TrendDirection = 'IMPROVING' | 'DECLINING' | 'STABLE';

export type AuthType = 'NONE' | 'BASIC' | 'BEARER' | 'API_KEY';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type WebhookTrigger = 'THRESHOLD_BREACH' | 'INITIATIVE_STATUS_CHANGE' | 'METRIC_VALUE_RECORDED';

export type EntityType =
  | 'METRIC'
  | 'INITIATIVE'
  | 'METRIC_DEFINITION'
  | 'METRIC_VALUE'
  | 'THRESHOLD'
  | 'INCIDENT'
  | 'GRIEVANCE';

export type ChangeAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'STATUS_CHANGE';

export type TagCategory = 'QUALITY' | 'SAFETY' | 'COMPLIANCE' | 'OPERATIONAL';

// ==============================|| PRODUCT AREAS ||============================== //

export interface ProductArea {
  id: number;
  name: string;
  code: string;
  description?: string;
  parent_id?: number;
  level: number;
  path?: string;
  department?: string;
  team?: string;
  owner_id?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  deleted_by_id?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductAreaRequest {
  name: string;
  code: string;
  description?: string;
  parent_id?: number;
  level?: number;
  path?: string;
  department?: string;
  team?: string;
  owner_id?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateProductAreaRequest extends Partial<CreateProductAreaRequest> {
  id: number;
}

// ==============================|| TAGS ||============================== //

export interface Tag {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  category?: TagCategory;
  is_active: boolean;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagRequest {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  category?: TagCategory;
  is_active?: boolean;
}

export interface UpdateTagRequest extends Partial<CreateTagRequest> {
  id: number;
}

// ==============================|| METRIC DEFINITIONS ||============================== //

export interface MetricDefinition {
  id: number;
  name: string;
  code: string;
  description?: string;
  category: MetricCategory;
  type: MetricType;
  unit?: string;
  data_type: MetricDataType;
  precision_digits: number;
  aggregation_method: AggregationMethod;
  calculation_formula?: string;
  numerator_definition?: string;
  denominator_definition?: string;
  product_area_id?: number;
  collection_frequency?: CollectionFrequency;
  data_source?: DataSource;
  source_system?: string;
  custom_attributes?: Record<string, any>;
  definition_version: number;
  effective_date?: string;
  deprecation_date?: string;
  is_active: boolean;
  is_public: boolean;
  is_cms_required: boolean;
  documentation_url?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  deleted_by_id?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMetricDefinitionRequest {
  name: string;
  code: string;
  description?: string;
  category: MetricCategory;
  type: MetricType;
  unit?: string;
  data_type?: MetricDataType;
  precision_digits?: number;
  aggregation_method?: AggregationMethod;
  calculation_formula?: string;
  numerator_definition?: string;
  denominator_definition?: string;
  product_area_id?: number;
  collection_frequency?: CollectionFrequency;
  data_source?: DataSource;
  source_system?: string;
  custom_attributes?: Record<string, any>;
  definition_version?: number;
  effective_date?: string;
  deprecation_date?: string;
  is_active?: boolean;
  is_public?: boolean;
  is_cms_required?: boolean;
  documentation_url?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMetricDefinitionRequest extends Partial<CreateMetricDefinitionRequest> {
  id: number;
}

// ==============================|| METRIC THRESHOLDS ||============================== //

export interface MetricThreshold {
  id: number;
  metric_definition_id: number;
  name: string;
  description?: string;
  threshold_type: ThresholdType;
  comparison_operator: ComparisonOperator;
  threshold_value?: string | number;
  threshold_value_min?: string | number;
  threshold_value_max?: string | number;
  improvement_direction?: ImprovementDirection;
  alert_enabled: boolean;
  alert_priority: AlertPriority;
  alert_message?: string;
  notification_channels?: string[];
  cooldown_minutes: number;
  applicable_environments?: Environment[];
  applicable_teams?: string[];
  is_active: boolean;
  effective_date?: string;
  expiration_date?: string;
  metadata?: Record<string, any>;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMetricThresholdRequest {
  metric_definition_id: number;
  name: string;
  description?: string;
  threshold_type: ThresholdType;
  comparison_operator: ComparisonOperator;
  threshold_value?: string | number;
  threshold_value_min?: string | number;
  threshold_value_max?: string | number;
  improvement_direction?: ImprovementDirection;
  alert_enabled?: boolean;
  alert_priority?: AlertPriority;
  alert_message?: string;
  notification_channels?: string[];
  cooldown_minutes?: number;
  applicable_environments?: Environment[];
  applicable_teams?: string[];
  is_active?: boolean;
  effective_date?: string;
  expiration_date?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMetricThresholdRequest extends Partial<CreateMetricThresholdRequest> {
  id: number;
}

// ==============================|| METRIC VALUES ||============================== //

export interface MetricValue {
  id: number;
  metric_definition_id: number;
  recorded_at: string;
  measurement_period_start?: string;
  measurement_period_end?: string;
  value: string | number;
  numerator?: string | number;
  denominator?: string | number;
  product_area_id?: number;
  environment?: Environment;
  release_version?: string;
  team?: string;
  is_validated: boolean;
  validated_by_id?: string;
  validated_at?: string;
  data_source?: DataSource;
  source_reference?: string;
  meets_target?: boolean;
  threshold_status?: ThresholdStatus;
  attributes?: Record<string, any>;
  notes?: string;
  metadata?: Record<string, any>;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMetricValueRequest {
  metric_definition_id: number;
  recorded_at: string;
  measurement_period_start?: string;
  measurement_period_end?: string;
  value: string | number;
  numerator?: string | number;
  denominator?: string | number;
  product_area_id?: number;
  environment?: Environment;
  release_version?: string;
  team?: string;
  is_validated?: boolean;
  validated_by_id?: string;
  validated_at?: string;
  data_source?: DataSource;
  source_reference?: string;
  meets_target?: boolean;
  threshold_status?: ThresholdStatus;
  attributes?: Record<string, any>;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMetricValueRequest extends Partial<CreateMetricValueRequest> {
  id: number;
}

// ==============================|| IMPROVEMENT INITIATIVES ||============================== //

export interface Milestone {
  id?: string;
  name: string;
  description?: string;
  due_date?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  completed_at?: string;
}

export interface Attachment {
  id?: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
  uploaded_at?: string;
}

export interface TicketReference {
  id?: string;
  system: 'JIRA' | 'GITHUB' | 'AZURE_DEVOPS' | 'OTHER';
  ticket_id: string;
  url: string;
  title?: string;
}

export interface ImprovementInitiative {
  id: number;
  title: string;
  code?: string;
  description?: string;
  initiative_type?: InitiativeType;
  category?: InitiativeCategory;
  priority: InitiativePriority;
  objectives?: string;
  success_criteria?: string;
  expected_impact?: string;
  status: InitiativeStatus;
  status_reason?: string;
  owner_id?: string;
  team?: string;
  department?: string;
  sponsor_id?: string;
  contributors?: string[];
  product_area_id?: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  progress_percentage: number;
  milestones?: Milestone[];
  documentation_url?: string;
  ticket_references?: TicketReference[];
  project_management_url?: string;
  resources_required?: string;
  estimated_cost?: string | number;
  actual_cost?: string | number;
  roi_expected?: string | number;
  roi_actual?: string | number;
  outcomes?: string;
  lessons_learned?: string;
  follow_up_actions?: string;
  approved_by_id?: string;
  approved_at?: string;
  approval_notes?: string;
  attachments?: Attachment[];
  notes?: string;
  metadata?: Record<string, any>;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  deleted_by_id?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateImprovementInitiativeRequest {
  title: string;
  code?: string;
  description?: string;
  initiative_type?: InitiativeType;
  category?: InitiativeCategory;
  priority?: InitiativePriority;
  objectives?: string;
  success_criteria?: string;
  expected_impact?: string;
  status?: InitiativeStatus;
  status_reason?: string;
  owner_id?: string;
  team?: string;
  department?: string;
  sponsor_id?: string;
  contributors?: string[];
  product_area_id?: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  progress_percentage?: number;
  milestones?: Milestone[];
  documentation_url?: string;
  ticket_references?: TicketReference[];
  project_management_url?: string;
  resources_required?: string;
  estimated_cost?: string | number;
  actual_cost?: string | number;
  roi_expected?: string | number;
  roi_actual?: string | number;
  outcomes?: string;
  lessons_learned?: string;
  follow_up_actions?: string;
  attachments?: Attachment[];
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateImprovementInitiativeRequest extends Partial<CreateImprovementInitiativeRequest> {
  id: number;
}

export interface ApproveInitiativeRequest {
  approval_notes?: string;
}

// ==============================|| INITIATIVE METRICS ||============================== //

export interface InitiativeMetric {
  id: number;
  initiative_id: number;
  metric_definition_id: number;
  relationship_type: RelationshipType;
  target_improvement?: string | number;
  actual_improvement?: string | number;
  correlation_strength?: string | number;
  correlation_notes?: string;
  is_active: boolean;
  notes?: string;
  metadata?: Record<string, any>;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInitiativeMetricRequest {
  initiative_id: number;
  metric_definition_id: number;
  relationship_type: RelationshipType;
  target_improvement?: string | number;
  actual_improvement?: string | number;
  correlation_strength?: string | number;
  correlation_notes?: string;
  is_active?: boolean;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateInitiativeMetricRequest extends Partial<CreateInitiativeMetricRequest> {
  id: number;
}

// ==============================|| METRIC SNAPSHOTS ||============================== //

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number;
}

export interface MetricSnapshot {
  id: number;
  initiative_id: number;
  metric_definition_id: number;
  snapshot_type: SnapshotType;
  snapshot_name?: string;
  snapshot_date: string;
  measurement_period_start?: string;
  measurement_period_end?: string;
  value: string | number;
  numerator?: string | number;
  denominator?: string | number;
  baseline_value?: string | number;
  absolute_change?: string | number;
  percentage_change?: string | number;
  sample_size?: number;
  standard_deviation?: string | number;
  confidence_interval?: ConfidenceInterval;
  analysis_notes?: string;
  metadata?: Record<string, any>;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMetricSnapshotRequest {
  initiative_id: number;
  metric_definition_id: number;
  snapshot_type: SnapshotType;
  snapshot_name?: string;
  snapshot_date: string;
  measurement_period_start?: string;
  measurement_period_end?: string;
  value: string | number;
  numerator?: string | number;
  denominator?: string | number;
  baseline_value?: string | number;
  absolute_change?: string | number;
  percentage_change?: string | number;
  sample_size?: number;
  standard_deviation?: string | number;
  confidence_interval?: ConfidenceInterval;
  analysis_notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMetricSnapshotRequest extends Partial<CreateMetricSnapshotRequest> {
  id: number;
}

// ==============================|| INITIATIVE DEPENDENCIES ||============================== //

export interface InitiativeDependency {
  id: number;
  initiative_id: number;
  depends_on_id: number;
  dependency_type: DependencyType;
  description?: string;
  is_required: boolean;
  is_active: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  metadata?: Record<string, any>;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInitiativeDependencyRequest {
  initiative_id: number;
  depends_on_id: number;
  dependency_type: DependencyType;
  description?: string;
  is_required?: boolean;
  is_active?: boolean;
  is_resolved?: boolean;
  resolved_at?: string;
  metadata?: Record<string, any>;
}

export interface UpdateInitiativeDependencyRequest extends Partial<CreateInitiativeDependencyRequest> {
  id: number;
}

// ==============================|| ENTITY TAGS ||============================== //

export interface EntityTag {
  id: number;
  tag_id: number;
  entity_type: EntityType;
  entity_id: number;
  created_by_id?: string;
  createdAt: string;
}

export interface CreateEntityTagRequest {
  tag_id: number;
  entity_type: EntityType;
  entity_id: number;
}

// ==============================|| METRIC AGGREGATIONS ||============================== //

export interface MetricAggregation {
  id: number;
  metric_definition_id: number;
  aggregation_period: AggregationPeriod;
  period_start: string;
  period_end: string;
  product_area_id?: number;
  team?: string;
  environment?: Environment;
  value_avg?: string | number;
  value_min?: string | number;
  value_max?: string | number;
  value_sum?: string | number;
  value_count?: number;
  value_stddev?: string | number;
  previous_period_value?: string | number;
  period_over_period_change?: string | number;
  trend_direction?: TrendDirection;
  target_met_count: number;
  warning_count: number;
  critical_count: number;
  last_refreshed_at: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface GetMetricAggregationsRequest {
  metric_definition_id?: number;
  aggregation_period?: AggregationPeriod;
  period_start?: string;
  period_end?: string;
  product_area_id?: number;
  team?: string;
  environment?: Environment;
}

// ==============================|| WEBHOOKS ||============================== //

export interface WebhookAuthConfig {
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

export interface WebhookFilterCriteria {
  metric_definition_ids?: number[];
  threshold_ids?: number[];
  initiative_ids?: number[];
  threshold_types?: ThresholdType[];
  environments?: Environment[];
}

export interface Webhook {
  id: number;
  name: string;
  description?: string;
  url: string;
  http_method: HttpMethod;
  auth_type?: AuthType;
  auth_config?: WebhookAuthConfig;
  custom_headers?: Record<string, string>;
  payload_template?: string;
  content_type: string;
  trigger_on?: WebhookTrigger[];
  filter_criteria?: WebhookFilterCriteria;
  max_retries: number;
  retry_delay_seconds: number;
  timeout_seconds: number;
  is_active: boolean;
  last_triggered_at?: string;
  last_success_at?: string;
  last_failure_at?: string;
  consecutive_failures: number;
  notes?: string;
  metadata?: Record<string, any>;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookRequest {
  name: string;
  description?: string;
  url: string;
  http_method?: HttpMethod;
  auth_type?: AuthType;
  auth_config?: WebhookAuthConfig;
  custom_headers?: Record<string, string>;
  payload_template?: string;
  content_type?: string;
  trigger_on?: WebhookTrigger[];
  filter_criteria?: WebhookFilterCriteria;
  max_retries?: number;
  retry_delay_seconds?: number;
  timeout_seconds?: number;
  is_active?: boolean;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateWebhookRequest extends Partial<CreateWebhookRequest> {
  id: number;
}

// ==============================|| WEBHOOK EVENTS ||============================== //

export interface WebhookEvent {
  id: number;
  webhook_id: number;
  event_type: string;
  triggered_at: string;
  request_url?: string;
  request_method?: HttpMethod;
  request_headers?: Record<string, any>;
  request_body?: string;
  response_status?: number;
  response_headers?: Record<string, any>;
  response_body?: string;
  response_time_ms?: number;
  success: boolean;
  error_message?: string;
  retry_count: number;
  trigger_context?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface GetWebhookEventsRequest {
  webhook_id?: number;
  success?: boolean;
  event_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// ==============================|| CHANGE LOG ||============================== //

export interface ChangeLogEntry {
  id: number;
  entity_type: EntityType;
  entity_id: number;
  action: ChangeAction;
  changes?: Record<string, { old: any; new: any }>;
  change_summary?: string;
  changed_by_id: string;
  changed_by_name?: string;
  changed_by_role?: string;
  change_reason?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  requires_review: boolean;
  reviewed_by_id?: string;
  reviewed_at?: string;
  changed_at: string;
  metadata?: Record<string, any>;
}

export interface GetChangeLogRequest {
  entity_type?: EntityType;
  entity_id?: number;
  action?: ChangeAction;
  changed_by_id?: string;
  start_date?: string;
  end_date?: string;
  requires_review?: boolean;
  limit?: number;
  offset?: number;
}

// ==============================|| API RESPONSE TYPES ||============================== //

export interface QAPIResponse<T> {
  data?: T;
  success?: boolean;
  message?: string;
  error?: string;
}

export interface QAPIListResponse<T> {
  data?: T[];
  success?: boolean;
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface PaginatedRequest {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// ==============================|| FILTER TYPES ||============================== //

export interface MetricValueFilters extends PaginatedRequest {
  metric_definition_id?: number;
  product_area_id?: number;
  environment?: Environment;
  team?: string;
  start_date?: string;
  end_date?: string;
  threshold_status?: ThresholdStatus;
  is_validated?: boolean;
}

export interface InitiativeFilters extends PaginatedRequest {
  status?: InitiativeStatus;
  priority?: InitiativePriority;
  category?: InitiativeCategory;
  initiative_type?: InitiativeType;
  owner_id?: string;
  team?: string;
  department?: string;
  product_area_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface MetricDefinitionFilters extends PaginatedRequest {
  category?: MetricCategory;
  type?: MetricType;
  product_area_id?: number;
  is_active?: boolean;
  is_cms_required?: boolean;
  data_source?: DataSource;
}

// ==============================|| DASHBOARD TYPES ||============================== //

export interface MetricSummary {
  metric_definition: MetricDefinition;
  latest_value?: MetricValue;
  aggregation?: MetricAggregation;
  thresholds: MetricThreshold[];
  trend_data: MetricValue[];
  breach_count: number;
}

export interface InitiativeSummary {
  initiative: ImprovementInitiative;
  linked_metrics: (InitiativeMetric & { metric_definition: MetricDefinition })[];
  snapshots: MetricSnapshot[];
  dependencies: InitiativeDependency[];
  progress_percentage: number;
}

export interface DashboardMetrics {
  total_metrics: number;
  active_initiatives: number;
  threshold_breaches_today: number;
  metrics_on_target: number;
  metrics_at_warning: number;
  metrics_critical: number;
}

export interface DashboardData {
  summary: DashboardMetrics;
  recent_metrics: MetricSummary[];
  active_initiatives: InitiativeSummary[];
  recent_breaches: (MetricValue & { metric_definition: MetricDefinition })[];
  trending_metrics: MetricSummary[];
}
