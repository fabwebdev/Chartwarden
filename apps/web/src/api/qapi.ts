/**
 * QAPI API Service
 *
 * Comprehensive API service for Quality Assurance and Performance Improvement endpoints.
 * All routes are mounted under /api/qapi-metrics and require authentication.
 *
 * @see services/api/src/routes/qapiMetrics.routes.js for backend route documentation
 */

import http from 'hooks/useCookie';
import type {
  ProductArea,
  CreateProductAreaRequest,
  UpdateProductAreaRequest,
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
  MetricDefinition,
  CreateMetricDefinitionRequest,
  UpdateMetricDefinitionRequest,
  MetricThreshold,
  CreateMetricThresholdRequest,
  UpdateMetricThresholdRequest,
  MetricValue,
  CreateMetricValueRequest,
  UpdateMetricValueRequest,
  ImprovementInitiative,
  CreateImprovementInitiativeRequest,
  UpdateImprovementInitiativeRequest,
  ApproveInitiativeRequest,
  InitiativeMetric,
  CreateInitiativeMetricRequest,
  UpdateInitiativeMetricRequest,
  MetricSnapshot,
  CreateMetricSnapshotRequest,
  UpdateMetricSnapshotRequest,
  InitiativeDependency,
  CreateInitiativeDependencyRequest,
  UpdateInitiativeDependencyRequest,
  Webhook,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookEvent,
  GetWebhookEventsRequest,
  ChangeLogEntry,
  GetChangeLogRequest,
  MetricAggregation,
  GetMetricAggregationsRequest,
  QAPIResponse,
  QAPIListResponse,
  MetricValueFilters,
  InitiativeFilters,
  MetricDefinitionFilters
} from '../types/qapi';

// ==============================|| PRODUCT AREAS MANAGEMENT ||============================== //

/**
 * Get all product areas
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getAllProductAreas = async (): Promise<QAPIListResponse<ProductArea>> => {
  const response = await http.get('/qapi-metrics/product-areas');
  return response.data;
};

/**
 * Get product area by ID
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getProductAreaById = async (id: number): Promise<QAPIResponse<ProductArea>> => {
  const response = await http.get(`/qapi-metrics/product-areas/${id}`);
  return response.data;
};

/**
 * Create product area
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const createProductArea = async (data: CreateProductAreaRequest): Promise<QAPIResponse<ProductArea>> => {
  const response = await http.post('/qapi-metrics/product-areas', data);
  return response.data;
};

/**
 * Update product area
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const updateProductArea = async (id: number, data: UpdateProductAreaRequest): Promise<QAPIResponse<ProductArea>> => {
  const response = await http.put(`/qapi-metrics/product-areas/${id}`, data);
  return response.data;
};

/**
 * Delete product area
 * @requires Permission: DELETE_CLINICAL_NOTES
 */
export const deleteProductArea = async (id: number): Promise<QAPIResponse<void>> => {
  const response = await http.delete(`/qapi-metrics/product-areas/${id}`);
  return response.data;
};

// ==============================|| TAGS MANAGEMENT ||============================== //

/**
 * Get all tags
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getAllTags = async (): Promise<QAPIListResponse<Tag>> => {
  const response = await http.get('/qapi-metrics/tags');
  return response.data;
};

/**
 * Create tag
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const createTag = async (data: CreateTagRequest): Promise<QAPIResponse<Tag>> => {
  const response = await http.post('/qapi-metrics/tags', data);
  return response.data;
};

// ==============================|| METRIC DEFINITIONS ||============================== //

/**
 * Get all metric definitions
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getAllMetricDefinitions = async (filters?: MetricDefinitionFilters): Promise<QAPIListResponse<MetricDefinition>> => {
  const response = await http.get('/qapi-metrics/metric-definitions', { params: filters });
  return response.data;
};

/**
 * Get metric definition by ID
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getMetricDefinitionById = async (id: number): Promise<QAPIResponse<MetricDefinition>> => {
  const response = await http.get(`/qapi-metrics/metric-definitions/${id}`);
  return response.data;
};

/**
 * Create metric definition
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const createMetricDefinition = async (data: CreateMetricDefinitionRequest): Promise<QAPIResponse<MetricDefinition>> => {
  const response = await http.post('/qapi-metrics/metric-definitions', data);
  return response.data;
};

/**
 * Update metric definition
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const updateMetricDefinition = async (id: number, data: UpdateMetricDefinitionRequest): Promise<QAPIResponse<MetricDefinition>> => {
  const response = await http.put(`/qapi-metrics/metric-definitions/${id}`, data);
  return response.data;
};

/**
 * Delete metric definition
 * @requires Permission: DELETE_CLINICAL_NOTES
 */
export const deleteMetricDefinition = async (id: number): Promise<QAPIResponse<void>> => {
  const response = await http.delete(`/qapi-metrics/metric-definitions/${id}`);
  return response.data;
};

// ==============================|| METRIC THRESHOLDS ||============================== //

/**
 * Get thresholds for a metric
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getMetricThresholds = async (metricId: number): Promise<QAPIListResponse<MetricThreshold>> => {
  const response = await http.get(`/qapi-metrics/metrics/${metricId}/thresholds`);
  return response.data;
};

/**
 * Create metric threshold
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const createMetricThreshold = async (data: CreateMetricThresholdRequest): Promise<QAPIResponse<MetricThreshold>> => {
  const response = await http.post('/qapi-metrics/metric-thresholds', data);
  return response.data;
};

/**
 * Update metric threshold
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const updateMetricThreshold = async (id: number, data: UpdateMetricThresholdRequest): Promise<QAPIResponse<MetricThreshold>> => {
  const response = await http.put(`/qapi-metrics/metric-thresholds/${id}`, data);
  return response.data;
};

/**
 * Delete metric threshold
 * @requires Permission: DELETE_CLINICAL_NOTES
 */
export const deleteMetricThreshold = async (id: number): Promise<QAPIResponse<void>> => {
  const response = await http.delete(`/qapi-metrics/metric-thresholds/${id}`);
  return response.data;
};

// ==============================|| METRIC VALUES (TIME-SERIES) ||============================== //

/**
 * Record metric value
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const recordMetricValue = async (data: CreateMetricValueRequest): Promise<QAPIResponse<MetricValue>> => {
  const response = await http.post('/qapi-metrics/metric-values', data);
  return response.data;
};

/**
 * Get metric values
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getMetricValues = async (filters?: MetricValueFilters): Promise<QAPIListResponse<MetricValue>> => {
  const response = await http.get('/qapi-metrics/metric-values', { params: filters });
  return response.data;
};

/**
 * Get metric aggregations
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getMetricAggregations = async (filters?: GetMetricAggregationsRequest): Promise<QAPIListResponse<MetricAggregation>> => {
  const response = await http.get('/qapi-metrics/metric-aggregations', { params: filters });
  return response.data;
};

// ==============================|| IMPROVEMENT INITIATIVES ||============================== //

/**
 * Get all initiatives
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getAllInitiatives = async (filters?: InitiativeFilters): Promise<QAPIListResponse<ImprovementInitiative>> => {
  const response = await http.get('/qapi-metrics/initiatives', { params: filters });
  return response.data;
};

/**
 * Get initiative by ID
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getInitiativeById = async (id: number): Promise<QAPIResponse<ImprovementInitiative>> => {
  const response = await http.get(`/qapi-metrics/initiatives/${id}`);
  return response.data;
};

/**
 * Create initiative
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const createInitiative = async (data: CreateImprovementInitiativeRequest): Promise<QAPIResponse<ImprovementInitiative>> => {
  const response = await http.post('/qapi-metrics/initiatives', data);
  return response.data;
};

/**
 * Update initiative
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const updateInitiative = async (id: number, data: UpdateImprovementInitiativeRequest): Promise<QAPIResponse<ImprovementInitiative>> => {
  const response = await http.put(`/qapi-metrics/initiatives/${id}`, data);
  return response.data;
};

/**
 * Approve initiative
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const approveInitiative = async (id: number, data?: ApproveInitiativeRequest): Promise<QAPIResponse<ImprovementInitiative>> => {
  const response = await http.post(`/qapi-metrics/initiatives/${id}/approve`, data);
  return response.data;
};

/**
 * Delete initiative
 * @requires Permission: DELETE_CLINICAL_NOTES
 */
export const deleteInitiative = async (id: number): Promise<QAPIResponse<void>> => {
  const response = await http.delete(`/qapi-metrics/initiatives/${id}`);
  return response.data;
};

// ==============================|| INITIATIVE METRICS LINKING ||============================== //

/**
 * Link metric to initiative
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const linkMetricToInitiative = async (data: CreateInitiativeMetricRequest): Promise<QAPIResponse<InitiativeMetric>> => {
  const response = await http.post('/qapi-metrics/initiative-metrics', data);
  return response.data;
};

/**
 * Unlink metric from initiative
 * @requires Permission: DELETE_CLINICAL_NOTES
 */
export const unlinkMetricFromInitiative = async (id: number): Promise<QAPIResponse<void>> => {
  const response = await http.delete(`/qapi-metrics/initiative-metrics/${id}`);
  return response.data;
};

// ==============================|| METRIC SNAPSHOTS ||============================== //

/**
 * Create metric snapshot
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const createMetricSnapshot = async (data: CreateMetricSnapshotRequest): Promise<QAPIResponse<MetricSnapshot>> => {
  const response = await http.post('/qapi-metrics/metric-snapshots', data);
  return response.data;
};

/**
 * Get initiative snapshots
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getInitiativeSnapshots = async (initiativeId: number): Promise<QAPIListResponse<MetricSnapshot>> => {
  const response = await http.get(`/qapi-metrics/initiatives/${initiativeId}/snapshots`);
  return response.data;
};

// ==============================|| INITIATIVE DEPENDENCIES ||============================== //

/**
 * Add initiative dependency
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const addInitiativeDependency = async (data: CreateInitiativeDependencyRequest): Promise<QAPIResponse<InitiativeDependency>> => {
  const response = await http.post('/qapi-metrics/initiative-dependencies', data);
  return response.data;
};

/**
 * Remove initiative dependency
 * @requires Permission: DELETE_CLINICAL_NOTES
 */
export const removeInitiativeDependency = async (id: number): Promise<QAPIResponse<void>> => {
  const response = await http.delete(`/qapi-metrics/initiative-dependencies/${id}`);
  return response.data;
};

// ==============================|| WEBHOOKS MANAGEMENT ||============================== //

/**
 * Get all webhooks
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getAllWebhooks = async (): Promise<QAPIListResponse<Webhook>> => {
  const response = await http.get('/qapi-metrics/webhooks');
  return response.data;
};

/**
 * Create webhook
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const createWebhook = async (data: CreateWebhookRequest): Promise<QAPIResponse<Webhook>> => {
  const response = await http.post('/qapi-metrics/webhooks', data);
  return response.data;
};

/**
 * Update webhook
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const updateWebhook = async (id: number, data: UpdateWebhookRequest): Promise<QAPIResponse<Webhook>> => {
  const response = await http.put(`/qapi-metrics/webhooks/${id}`, data);
  return response.data;
};

/**
 * Delete webhook
 * @requires Permission: DELETE_CLINICAL_NOTES
 */
export const deleteWebhook = async (id: number): Promise<QAPIResponse<void>> => {
  const response = await http.delete(`/qapi-metrics/webhooks/${id}`);
  return response.data;
};

/**
 * Get webhook events
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getWebhookEvents = async (filters?: GetWebhookEventsRequest): Promise<QAPIListResponse<WebhookEvent>> => {
  const response = await http.get('/qapi-metrics/webhook-events', { params: filters });
  return response.data;
};

// ==============================|| CHANGE LOG (AUDIT TRAIL) ||============================== //

/**
 * Get change log
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS
 */
export const getChangeLog = async (filters?: GetChangeLogRequest): Promise<QAPIListResponse<ChangeLogEntry>> => {
  const response = await http.get('/qapi-metrics/change-log', { params: filters });
  return response.data;
};
