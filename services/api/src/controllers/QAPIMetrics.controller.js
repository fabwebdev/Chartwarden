import { db } from "../config/db.drizzle.js";
import {
  qapi_product_areas,
  qapi_tags,
  qapi_metric_definitions,
  qapi_metric_thresholds,
  qapi_metric_values,
  qapi_improvement_initiatives,
  qapi_initiative_metrics,
  qapi_metric_snapshots,
  qapi_initiative_dependencies,
  qapi_entity_tags,
  qapi_metric_aggregations,
  qapi_webhooks,
  qapi_webhook_events,
  qapi_change_log
} from "../db/schemas/qapiMetrics.schema.js";
import { eq, and, isNull, desc, asc, gte, lte, sql, or, inArray, ilike } from "drizzle-orm";

/**
 * QAPI Metrics Controller
 * Manages comprehensive quality assurance metrics, thresholds, initiatives, and performance tracking
 */
class QAPIMetricsController {

  // ==================== PRODUCT AREAS MANAGEMENT ====================

  /**
   * Get all product areas with optional hierarchy
   */
  async getAllProductAreas(request, reply) {
    try {
      const { parent_id, include_inactive } = request.query;

      let conditions = [];

      if (!include_inactive) {
        conditions.push(eq(qapi_product_areas.is_active, true));
      }
      conditions.push(isNull(qapi_product_areas.deleted_at));

      if (parent_id !== undefined) {
        if (parent_id === 'null' || parent_id === '') {
          conditions.push(isNull(qapi_product_areas.parent_id));
        } else {
          conditions.push(eq(qapi_product_areas.parent_id, parseInt(parent_id)));
        }
      }

      const result = await db
        .select()
        .from(qapi_product_areas)
        .where(and(...conditions))
        .orderBy(asc(qapi_product_areas.level), asc(qapi_product_areas.name));

      return {
        status: 200,
        message: "Product areas retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve product areas",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get product area by ID
   */
  async getProductAreaById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(qapi_product_areas)
        .where(and(
          eq(qapi_product_areas.id, parseInt(id)),
          isNull(qapi_product_areas.deleted_at)
        ));

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Product area not found" };
      }

      return {
        status: 200,
        message: "Product area retrieved successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve product area",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create product area
   */
  async createProductArea(request, reply) {
    try {
      const data = request.body;

      // Calculate path if parent exists
      let path = `/${data.code}`;
      let level = 0;

      if (data.parent_id) {
        const parent = await db
          .select()
          .from(qapi_product_areas)
          .where(eq(qapi_product_areas.id, data.parent_id));

        if (parent.length > 0) {
          path = `${parent[0].path}/${data.code}`;
          level = (parent[0].level || 0) + 1;
        }
      }

      const result = await db
        .insert(qapi_product_areas)
        .values({
          ...data,
          path,
          level,
          created_by_id: request.user?.id
        })
        .returning();

      await this._logChange(request, 'PRODUCT_AREA', result[0].id, 'CREATE', null, result[0]);

      reply.code(201);
      return {
        status: 201,
        message: "Product area created successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create product area",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update product area
   */
  async updateProductArea(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Get existing for audit log
      const existing = await db
        .select()
        .from(qapi_product_areas)
        .where(eq(qapi_product_areas.id, parseInt(id)));

      if (existing.length === 0) {
        reply.code(404);
        return { status: 404, message: "Product area not found" };
      }

      const result = await db
        .update(qapi_product_areas)
        .set({
          ...data,
          version: sql`${qapi_product_areas.version} + 1`,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(qapi_product_areas.id, parseInt(id)),
          isNull(qapi_product_areas.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Product area not found" };
      }

      await this._logChange(request, 'PRODUCT_AREA', parseInt(id), 'UPDATE', existing[0], result[0]);

      return {
        status: 200,
        message: "Product area updated successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to update product area",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete product area (soft delete)
   */
  async deleteProductArea(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(qapi_product_areas)
        .set({
          deleted_at: new Date(),
          deleted_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .where(and(
          eq(qapi_product_areas.id, parseInt(id)),
          isNull(qapi_product_areas.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Product area not found" };
      }

      await this._logChange(request, 'PRODUCT_AREA', parseInt(id), 'DELETE', result[0], null);

      return {
        status: 200,
        message: "Product area deleted successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to delete product area",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ==================== TAGS MANAGEMENT ====================

  /**
   * Get all tags
   */
  async getAllTags(request, reply) {
    try {
      const { category, include_inactive } = request.query;

      let conditions = [isNull(qapi_tags.deleted_at)];

      if (!include_inactive) {
        conditions.push(eq(qapi_tags.is_active, true));
      }
      if (category) {
        conditions.push(eq(qapi_tags.category, category));
      }

      const result = await db
        .select()
        .from(qapi_tags)
        .where(and(...conditions))
        .orderBy(asc(qapi_tags.category), asc(qapi_tags.name));

      return {
        status: 200,
        message: "Tags retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve tags",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create tag
   */
  async createTag(request, reply) {
    try {
      const data = request.body;

      // Generate slug if not provided
      if (!data.slug) {
        data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }

      const result = await db
        .insert(qapi_tags)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Tag created successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create tag",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ==================== METRIC DEFINITIONS MANAGEMENT ====================

  /**
   * Get all metric definitions
   */
  async getAllMetricDefinitions(request, reply) {
    try {
      const { category, product_area_id, include_inactive, search } = request.query;

      let conditions = [isNull(qapi_metric_definitions.deleted_at)];

      if (!include_inactive) {
        conditions.push(eq(qapi_metric_definitions.is_active, true));
      }
      if (category) {
        conditions.push(eq(qapi_metric_definitions.category, category));
      }
      if (product_area_id) {
        conditions.push(eq(qapi_metric_definitions.product_area_id, parseInt(product_area_id)));
      }
      if (search) {
        conditions.push(or(
          ilike(qapi_metric_definitions.name, `%${search}%`),
          ilike(qapi_metric_definitions.code, `%${search}%`),
          ilike(qapi_metric_definitions.description, `%${search}%`)
        ));
      }

      const result = await db
        .select()
        .from(qapi_metric_definitions)
        .where(and(...conditions))
        .orderBy(asc(qapi_metric_definitions.category), asc(qapi_metric_definitions.name));

      return {
        status: 200,
        message: "Metric definitions retrieved successfully",
        data: result,
        count: result.length
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve metric definitions",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get metric definition by ID
   */
  async getMetricDefinitionById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(qapi_metric_definitions)
        .where(and(
          eq(qapi_metric_definitions.id, parseInt(id)),
          isNull(qapi_metric_definitions.deleted_at)
        ));

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Metric definition not found" };
      }

      // Also get associated thresholds
      const thresholds = await db
        .select()
        .from(qapi_metric_thresholds)
        .where(and(
          eq(qapi_metric_thresholds.metric_definition_id, parseInt(id)),
          isNull(qapi_metric_thresholds.deleted_at),
          eq(qapi_metric_thresholds.is_active, true)
        ));

      return {
        status: 200,
        message: "Metric definition retrieved successfully",
        data: {
          ...result[0],
          thresholds
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve metric definition",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create metric definition
   */
  async createMetricDefinition(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(qapi_metric_definitions)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      await this._logChange(request, 'METRIC_DEFINITION', result[0].id, 'CREATE', null, result[0]);

      reply.code(201);
      return {
        status: 201,
        message: "Metric definition created successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create metric definition",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update metric definition
   */
  async updateMetricDefinition(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const existing = await db
        .select()
        .from(qapi_metric_definitions)
        .where(eq(qapi_metric_definitions.id, parseInt(id)));

      if (existing.length === 0) {
        reply.code(404);
        return { status: 404, message: "Metric definition not found" };
      }

      const result = await db
        .update(qapi_metric_definitions)
        .set({
          ...data,
          version: sql`${qapi_metric_definitions.version} + 1`,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(qapi_metric_definitions.id, parseInt(id)),
          isNull(qapi_metric_definitions.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Metric definition not found" };
      }

      await this._logChange(request, 'METRIC_DEFINITION', parseInt(id), 'UPDATE', existing[0], result[0]);

      return {
        status: 200,
        message: "Metric definition updated successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to update metric definition",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete metric definition (soft delete)
   */
  async deleteMetricDefinition(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(qapi_metric_definitions)
        .set({
          deleted_at: new Date(),
          deleted_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .where(and(
          eq(qapi_metric_definitions.id, parseInt(id)),
          isNull(qapi_metric_definitions.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Metric definition not found" };
      }

      await this._logChange(request, 'METRIC_DEFINITION', parseInt(id), 'DELETE', result[0], null);

      return {
        status: 200,
        message: "Metric definition deleted successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to delete metric definition",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ==================== METRIC THRESHOLDS MANAGEMENT ====================

  /**
   * Get thresholds for a metric
   */
  async getMetricThresholds(request, reply) {
    try {
      const { metric_id } = request.params;

      const result = await db
        .select()
        .from(qapi_metric_thresholds)
        .where(and(
          eq(qapi_metric_thresholds.metric_definition_id, parseInt(metric_id)),
          isNull(qapi_metric_thresholds.deleted_at)
        ))
        .orderBy(asc(qapi_metric_thresholds.threshold_type));

      return {
        status: 200,
        message: "Metric thresholds retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve metric thresholds",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create metric threshold
   */
  async createMetricThreshold(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(qapi_metric_thresholds)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      await this._logChange(request, 'METRIC_THRESHOLD', result[0].id, 'CREATE', null, result[0]);

      reply.code(201);
      return {
        status: 201,
        message: "Metric threshold created successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create metric threshold",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update metric threshold
   */
  async updateMetricThreshold(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(qapi_metric_thresholds)
        .set({
          ...data,
          version: sql`${qapi_metric_thresholds.version} + 1`,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(qapi_metric_thresholds.id, parseInt(id)),
          isNull(qapi_metric_thresholds.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Metric threshold not found" };
      }

      return {
        status: 200,
        message: "Metric threshold updated successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to update metric threshold",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete metric threshold (soft delete)
   */
  async deleteMetricThreshold(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(qapi_metric_thresholds)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id
        })
        .where(and(
          eq(qapi_metric_thresholds.id, parseInt(id)),
          isNull(qapi_metric_thresholds.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Metric threshold not found" };
      }

      return {
        status: 200,
        message: "Metric threshold deleted successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to delete metric threshold",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ==================== METRIC VALUES MANAGEMENT ====================

  /**
   * Record metric value (time-series data point)
   */
  async recordMetricValue(request, reply) {
    try {
      const data = request.body;

      // Evaluate thresholds if metric has them
      let thresholdStatus = null;
      let meetsTarget = null;

      if (data.metric_definition_id) {
        const thresholds = await db
          .select()
          .from(qapi_metric_thresholds)
          .where(and(
            eq(qapi_metric_thresholds.metric_definition_id, data.metric_definition_id),
            eq(qapi_metric_thresholds.is_active, true),
            isNull(qapi_metric_thresholds.deleted_at)
          ));

        const evaluation = this._evaluateThresholds(data.value, thresholds);
        thresholdStatus = evaluation.status;
        meetsTarget = evaluation.meetsTarget;

        // Check if we need to trigger webhooks
        if (evaluation.breached) {
          await this._triggerThresholdWebhooks(data.metric_definition_id, data.value, evaluation);
        }
      }

      const result = await db
        .insert(qapi_metric_values)
        .values({
          ...data,
          recorded_at: data.recorded_at || new Date(),
          threshold_status: thresholdStatus,
          meets_target: meetsTarget,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Metric value recorded successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to record metric value",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get metric values (time-series data)
   */
  async getMetricValues(request, reply) {
    try {
      const { metric_id, product_area_id, team, environment, from_date, to_date, limit = 1000 } = request.query;

      let conditions = [isNull(qapi_metric_values.deleted_at)];

      if (metric_id) {
        conditions.push(eq(qapi_metric_values.metric_definition_id, parseInt(metric_id)));
      }
      if (product_area_id) {
        conditions.push(eq(qapi_metric_values.product_area_id, parseInt(product_area_id)));
      }
      if (team) {
        conditions.push(eq(qapi_metric_values.team, team));
      }
      if (environment) {
        conditions.push(eq(qapi_metric_values.environment, environment));
      }
      if (from_date) {
        conditions.push(gte(qapi_metric_values.recorded_at, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(qapi_metric_values.recorded_at, new Date(to_date)));
      }

      const result = await db
        .select()
        .from(qapi_metric_values)
        .where(and(...conditions))
        .orderBy(desc(qapi_metric_values.recorded_at))
        .limit(parseInt(limit));

      return {
        status: 200,
        message: "Metric values retrieved successfully",
        data: result,
        count: result.length
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve metric values",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get metric aggregations (pre-computed summaries)
   */
  async getMetricAggregations(request, reply) {
    try {
      const { metric_id, product_area_id, period, from_date, to_date } = request.query;

      let conditions = [];

      if (metric_id) {
        conditions.push(eq(qapi_metric_aggregations.metric_definition_id, parseInt(metric_id)));
      }
      if (product_area_id) {
        conditions.push(eq(qapi_metric_aggregations.product_area_id, parseInt(product_area_id)));
      }
      if (period) {
        conditions.push(eq(qapi_metric_aggregations.aggregation_period, period));
      }
      if (from_date) {
        conditions.push(gte(qapi_metric_aggregations.period_start, from_date));
      }
      if (to_date) {
        conditions.push(lte(qapi_metric_aggregations.period_end, to_date));
      }

      const result = await db
        .select()
        .from(qapi_metric_aggregations)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(qapi_metric_aggregations.period_start));

      return {
        status: 200,
        message: "Metric aggregations retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve metric aggregations",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ==================== IMPROVEMENT INITIATIVES MANAGEMENT ====================

  /**
   * Get all improvement initiatives
   */
  async getAllInitiatives(request, reply) {
    try {
      const { status, priority, owner_id, product_area_id, search } = request.query;

      let conditions = [isNull(qapi_improvement_initiatives.deleted_at)];

      if (status) {
        conditions.push(eq(qapi_improvement_initiatives.status, status));
      }
      if (priority) {
        conditions.push(eq(qapi_improvement_initiatives.priority, priority));
      }
      if (owner_id) {
        conditions.push(eq(qapi_improvement_initiatives.owner_id, owner_id));
      }
      if (product_area_id) {
        conditions.push(eq(qapi_improvement_initiatives.product_area_id, parseInt(product_area_id)));
      }
      if (search) {
        conditions.push(or(
          ilike(qapi_improvement_initiatives.title, `%${search}%`),
          ilike(qapi_improvement_initiatives.description, `%${search}%`),
          ilike(qapi_improvement_initiatives.code, `%${search}%`)
        ));
      }

      const result = await db
        .select()
        .from(qapi_improvement_initiatives)
        .where(and(...conditions))
        .orderBy(desc(qapi_improvement_initiatives.createdAt));

      return {
        status: 200,
        message: "Initiatives retrieved successfully",
        data: result,
        count: result.length
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve initiatives",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get initiative by ID with related data
   */
  async getInitiativeById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(qapi_improvement_initiatives)
        .where(and(
          eq(qapi_improvement_initiatives.id, parseInt(id)),
          isNull(qapi_improvement_initiatives.deleted_at)
        ));

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Initiative not found" };
      }

      // Get linked metrics
      const linkedMetrics = await db
        .select({
          relationship: qapi_initiative_metrics,
          metric: qapi_metric_definitions
        })
        .from(qapi_initiative_metrics)
        .leftJoin(qapi_metric_definitions, eq(qapi_initiative_metrics.metric_definition_id, qapi_metric_definitions.id))
        .where(and(
          eq(qapi_initiative_metrics.initiative_id, parseInt(id)),
          isNull(qapi_initiative_metrics.deleted_at)
        ));

      // Get dependencies
      const dependencies = await db
        .select()
        .from(qapi_initiative_dependencies)
        .where(and(
          eq(qapi_initiative_dependencies.initiative_id, parseInt(id)),
          isNull(qapi_initiative_dependencies.deleted_at)
        ));

      // Get dependents (initiatives that depend on this one)
      const dependents = await db
        .select()
        .from(qapi_initiative_dependencies)
        .where(and(
          eq(qapi_initiative_dependencies.depends_on_id, parseInt(id)),
          isNull(qapi_initiative_dependencies.deleted_at)
        ));

      // Get snapshots
      const snapshots = await db
        .select()
        .from(qapi_metric_snapshots)
        .where(and(
          eq(qapi_metric_snapshots.initiative_id, parseInt(id)),
          isNull(qapi_metric_snapshots.deleted_at)
        ))
        .orderBy(asc(qapi_metric_snapshots.snapshot_date));

      return {
        status: 200,
        message: "Initiative retrieved successfully",
        data: {
          ...result[0],
          linkedMetrics,
          dependencies,
          dependents,
          snapshots
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve initiative",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create improvement initiative
   */
  async createInitiative(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(qapi_improvement_initiatives)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      await this._logChange(request, 'INITIATIVE', result[0].id, 'CREATE', null, result[0]);

      reply.code(201);
      return {
        status: 201,
        message: "Initiative created successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create initiative",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update initiative
   */
  async updateInitiative(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const existing = await db
        .select()
        .from(qapi_improvement_initiatives)
        .where(eq(qapi_improvement_initiatives.id, parseInt(id)));

      if (existing.length === 0) {
        reply.code(404);
        return { status: 404, message: "Initiative not found" };
      }

      // If status is changing, log it separately
      const statusChanged = data.status && data.status !== existing[0].status;

      const result = await db
        .update(qapi_improvement_initiatives)
        .set({
          ...data,
          version: sql`${qapi_improvement_initiatives.version} + 1`,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(qapi_improvement_initiatives.id, parseInt(id)),
          isNull(qapi_improvement_initiatives.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Initiative not found" };
      }

      const action = statusChanged ? 'STATUS_CHANGE' : 'UPDATE';
      await this._logChange(request, 'INITIATIVE', parseInt(id), action, existing[0], result[0]);

      return {
        status: 200,
        message: "Initiative updated successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to update initiative",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Approve initiative
   */
  async approveInitiative(request, reply) {
    try {
      const { id } = request.params;
      const { approval_notes } = request.body;

      const result = await db
        .update(qapi_improvement_initiatives)
        .set({
          status: 'APPROVED',
          approved_by_id: request.user?.id,
          approved_at: new Date(),
          approval_notes,
          version: sql`${qapi_improvement_initiatives.version} + 1`,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(qapi_improvement_initiatives.id, parseInt(id)),
          eq(qapi_improvement_initiatives.status, 'PROPOSED'),
          isNull(qapi_improvement_initiatives.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Initiative not found or not in PROPOSED status" };
      }

      await this._logChange(request, 'INITIATIVE', parseInt(id), 'STATUS_CHANGE', { status: 'PROPOSED' }, result[0]);

      return {
        status: 200,
        message: "Initiative approved successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to approve initiative",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete initiative (soft delete)
   */
  async deleteInitiative(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(qapi_improvement_initiatives)
        .set({
          deleted_at: new Date(),
          deleted_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .where(and(
          eq(qapi_improvement_initiatives.id, parseInt(id)),
          isNull(qapi_improvement_initiatives.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Initiative not found" };
      }

      await this._logChange(request, 'INITIATIVE', parseInt(id), 'DELETE', result[0], null);

      return {
        status: 200,
        message: "Initiative deleted successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to delete initiative",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ==================== INITIATIVE METRICS LINKING ====================

  /**
   * Link metric to initiative
   */
  async linkMetricToInitiative(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(qapi_initiative_metrics)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Metric linked to initiative successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to link metric to initiative",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Unlink metric from initiative
   */
  async unlinkMetricFromInitiative(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(qapi_initiative_metrics)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id
        })
        .where(and(
          eq(qapi_initiative_metrics.id, parseInt(id)),
          isNull(qapi_initiative_metrics.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Metric link not found" };
      }

      return {
        status: 200,
        message: "Metric unlinked from initiative successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to unlink metric from initiative",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ==================== METRIC SNAPSHOTS ====================

  /**
   * Create metric snapshot for initiative
   */
  async createMetricSnapshot(request, reply) {
    try {
      const data = request.body;

      // Calculate changes from baseline if applicable
      let absoluteChange = null;
      let percentageChange = null;

      if (data.baseline_value && data.value) {
        absoluteChange = parseFloat(data.value) - parseFloat(data.baseline_value);
        if (parseFloat(data.baseline_value) !== 0) {
          percentageChange = (absoluteChange / parseFloat(data.baseline_value)) * 100;
        }
      }

      const result = await db
        .insert(qapi_metric_snapshots)
        .values({
          ...data,
          absolute_change: absoluteChange,
          percentage_change: percentageChange,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Metric snapshot created successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create metric snapshot",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get snapshots for an initiative
   */
  async getInitiativeSnapshots(request, reply) {
    try {
      const { initiative_id } = request.params;

      const result = await db
        .select()
        .from(qapi_metric_snapshots)
        .where(and(
          eq(qapi_metric_snapshots.initiative_id, parseInt(initiative_id)),
          isNull(qapi_metric_snapshots.deleted_at)
        ))
        .orderBy(asc(qapi_metric_snapshots.snapshot_date));

      return {
        status: 200,
        message: "Initiative snapshots retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve initiative snapshots",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ==================== INITIATIVE DEPENDENCIES ====================

  /**
   * Add initiative dependency
   */
  async addInitiativeDependency(request, reply) {
    try {
      const data = request.body;

      // Prevent self-dependency
      if (data.initiative_id === data.depends_on_id) {
        reply.code(400);
        return { status: 400, message: "An initiative cannot depend on itself" };
      }

      // Check for circular dependency
      const hasCircular = await this._checkCircularDependency(data.initiative_id, data.depends_on_id);
      if (hasCircular) {
        reply.code(400);
        return { status: 400, message: "This would create a circular dependency" };
      }

      const result = await db
        .insert(qapi_initiative_dependencies)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Initiative dependency added successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to add initiative dependency",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Remove initiative dependency
   */
  async removeInitiativeDependency(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(qapi_initiative_dependencies)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id
        })
        .where(and(
          eq(qapi_initiative_dependencies.id, parseInt(id)),
          isNull(qapi_initiative_dependencies.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Dependency not found" };
      }

      return {
        status: 200,
        message: "Initiative dependency removed successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to remove initiative dependency",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ==================== WEBHOOKS MANAGEMENT ====================

  /**
   * Get all webhooks
   */
  async getAllWebhooks(request, reply) {
    try {
      const { include_inactive } = request.query;

      let conditions = [isNull(qapi_webhooks.deleted_at)];

      if (!include_inactive) {
        conditions.push(eq(qapi_webhooks.is_active, true));
      }

      const result = await db
        .select()
        .from(qapi_webhooks)
        .where(and(...conditions))
        .orderBy(asc(qapi_webhooks.name));

      return {
        status: 200,
        message: "Webhooks retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve webhooks",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create webhook
   */
  async createWebhook(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(qapi_webhooks)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Webhook created successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create webhook",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update webhook
   */
  async updateWebhook(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(qapi_webhooks)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(qapi_webhooks.id, parseInt(id)),
          isNull(qapi_webhooks.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Webhook not found" };
      }

      return {
        status: 200,
        message: "Webhook updated successfully",
        data: result[0]
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to update webhook",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete webhook (soft delete)
   */
  async deleteWebhook(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(qapi_webhooks)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id
        })
        .where(and(
          eq(qapi_webhooks.id, parseInt(id)),
          isNull(qapi_webhooks.deleted_at)
        ))
        .returning();

      if (result.length === 0) {
        reply.code(404);
        return { status: 404, message: "Webhook not found" };
      }

      return {
        status: 200,
        message: "Webhook deleted successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to delete webhook",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get webhook events
   */
  async getWebhookEvents(request, reply) {
    try {
      const { webhook_id, success, from_date, to_date, limit = 100 } = request.query;

      let conditions = [];

      if (webhook_id) {
        conditions.push(eq(qapi_webhook_events.webhook_id, parseInt(webhook_id)));
      }
      if (success !== undefined) {
        conditions.push(eq(qapi_webhook_events.success, success === 'true'));
      }
      if (from_date) {
        conditions.push(gte(qapi_webhook_events.triggered_at, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(qapi_webhook_events.triggered_at, new Date(to_date)));
      }

      const result = await db
        .select()
        .from(qapi_webhook_events)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(qapi_webhook_events.triggered_at))
        .limit(parseInt(limit));

      return {
        status: 200,
        message: "Webhook events retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve webhook events",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ==================== CHANGE LOG ====================

  /**
   * Get change log for an entity
   */
  async getChangeLog(request, reply) {
    try {
      const { entity_type, entity_id, from_date, to_date, limit = 100 } = request.query;

      let conditions = [];

      if (entity_type) {
        conditions.push(eq(qapi_change_log.entity_type, entity_type));
      }
      if (entity_id) {
        conditions.push(eq(qapi_change_log.entity_id, parseInt(entity_id)));
      }
      if (from_date) {
        conditions.push(gte(qapi_change_log.changed_at, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(qapi_change_log.changed_at, new Date(to_date)));
      }

      const result = await db
        .select()
        .from(qapi_change_log)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(qapi_change_log.changed_at))
        .limit(parseInt(limit));

      return {
        status: 200,
        message: "Change log retrieved successfully",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve change log",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Evaluate thresholds for a metric value
   */
  _evaluateThresholds(value, thresholds) {
    let status = 'OK';
    let meetsTarget = true;
    let breached = false;

    for (const threshold of thresholds) {
      const thresholdValue = parseFloat(threshold.threshold_value);
      const currentValue = parseFloat(value);
      let isBreach = false;

      switch (threshold.comparison_operator) {
        case 'GT':
          isBreach = currentValue > thresholdValue;
          break;
        case 'GTE':
          isBreach = currentValue >= thresholdValue;
          break;
        case 'LT':
          isBreach = currentValue < thresholdValue;
          break;
        case 'LTE':
          isBreach = currentValue <= thresholdValue;
          break;
        case 'EQ':
          isBreach = currentValue === thresholdValue;
          break;
        case 'NEQ':
          isBreach = currentValue !== thresholdValue;
          break;
        case 'BETWEEN':
          const min = parseFloat(threshold.threshold_value_min);
          const max = parseFloat(threshold.threshold_value_max);
          isBreach = currentValue >= min && currentValue <= max;
          break;
      }

      if (isBreach) {
        breached = true;
        if (threshold.threshold_type === 'CRITICAL') {
          status = 'CRITICAL';
          meetsTarget = false;
        } else if (threshold.threshold_type === 'WARNING' && status !== 'CRITICAL') {
          status = 'WARNING';
        } else if (threshold.threshold_type === 'SLA') {
          status = 'SLA_BREACH';
          meetsTarget = false;
        } else if (threshold.threshold_type === 'TARGET') {
          meetsTarget = false;
        }
      }
    }

    return { status, meetsTarget, breached };
  }

  /**
   * Trigger webhooks for threshold breach
   */
  async _triggerThresholdWebhooks(metricId, value, evaluation) {
    try {
      const webhooks = await db
        .select()
        .from(qapi_webhooks)
        .where(and(
          eq(qapi_webhooks.is_active, true),
          isNull(qapi_webhooks.deleted_at)
        ));

      for (const webhook of webhooks) {
        const triggerOn = webhook.trigger_on || [];
        if (!triggerOn.includes('THRESHOLD_BREACH')) continue;

        // Log webhook event (actual HTTP call would be done by a worker)
        await db
          .insert(qapi_webhook_events)
          .values({
            webhook_id: webhook.id,
            event_type: 'THRESHOLD_BREACH',
            triggered_at: new Date(),
            success: false, // Will be updated by worker
            trigger_context: {
              metric_id: metricId,
              value,
              evaluation
            }
          });

        // Update webhook last triggered
        await db
          .update(qapi_webhooks)
          .set({
            last_triggered_at: new Date()
          })
          .where(eq(qapi_webhooks.id, webhook.id));
      }
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to trigger webhooks:', error);
    }
  }

  /**
   * Check for circular dependency
   */
  async _checkCircularDependency(initiativeId, dependsOnId) {
    // Get all dependencies of dependsOnId recursively
    const visited = new Set();
    const queue = [dependsOnId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === initiativeId) {
        return true; // Circular dependency found
      }

      if (visited.has(current)) continue;
      visited.add(current);

      const deps = await db
        .select()
        .from(qapi_initiative_dependencies)
        .where(and(
          eq(qapi_initiative_dependencies.initiative_id, current),
          isNull(qapi_initiative_dependencies.deleted_at)
        ));

      for (const dep of deps) {
        queue.push(dep.depends_on_id);
      }
    }

    return false;
  }

  /**
   * Log a change to the audit log
   */
  async _logChange(request, entityType, entityId, action, oldValue, newValue) {
    try {
      const changes = {};
      if (oldValue && newValue) {
        for (const key of Object.keys(newValue)) {
          if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
            changes[key] = { old: oldValue[key], new: newValue[key] };
          }
        }
      }

      await db
        .insert(qapi_change_log)
        .values({
          entity_type: entityType,
          entity_id: entityId,
          action,
          changes: Object.keys(changes).length > 0 ? changes : null,
          changed_by_id: request.user?.id || 'system',
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent']
        });
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to log change:', error);
    }
  }
}

export default new QAPIMetricsController();
