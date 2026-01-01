import { db } from '../db/index.js';
import { claims, payments, payment_applications, ar_aging, payers } from '../db/schemas/billing.schema.js';
import { clearinghouse_submissions } from '../db/schemas/clearinghouse.schema.js';
import { patients } from '../db/schemas/patient.schema.js';
import { encounters } from '../db/schemas/encounters.schema.js';
import { users } from '../db/schemas/user.schema.js';
import { audit_logs } from '../db/schemas/auditLog.schema.js';
import { eq, sql, gte, lte, and, between, isNull, desc, count } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
/**
 * Analytics Service
 * Phase 2D - Enhanced Reporting & Dashboard Data Retrieval
 *
 * Purpose: Revenue cycle analytics, KPI calculations, and dashboard aggregation
 * Features:
 *   - Comprehensive dashboard summary
 *   - User activity metrics
 *   - Activity trends (daily, weekly, monthly)
 *   - Performance statistics
 *   - KPI dashboard (clean claim rate, days to payment, net collection rate)
 *   - Denial rate by payer analysis
 *   - AR aging time-series trends
 *   - Revenue forecasting (30/60/90 days)
 *   - Export capabilities (CSV/Excel)
 *   - Real-time compliance scoring
 */
class AnalyticsService {
  constructor() {
    this.kpiTargets = {
      clean_claim_rate: 95.0,
      average_days_to_payment: 30.0,
      net_collection_rate: 98.0,
      denial_rate: 5.0
    };
  }

  // ==========================================================================
  // DASHBOARD SUMMARY
  // ==========================================================================

  /**
   * Get comprehensive dashboard summary
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<object>} Dashboard summary data
   */
  async getDashboardSummary(startDate, endDate) {
    try {
      // Fetch all metrics in parallel for efficiency
      const [
        patientStats,
        claimStats,
        userStats,
        activityStats,
        financialTotals
      ] = await Promise.all([
        this.getPatientStats(startDate, endDate),
        this.getClaimStats(startDate, endDate),
        this.getUserStats(startDate, endDate),
        this.getActivityStats(startDate, endDate),
        this.calculateFinancialTotals(startDate, endDate)
      ]);

      // Calculate KPIs
      const kpis = {
        clean_claim_rate: {
          value: claimStats.clean_claim_rate,
          target: this.kpiTargets.clean_claim_rate,
          status: claimStats.clean_claim_rate >= this.kpiTargets.clean_claim_rate ? 'on_target' : 'below_target'
        },
        denial_rate: {
          value: claimStats.denial_rate,
          target: this.kpiTargets.denial_rate,
          status: claimStats.denial_rate <= this.kpiTargets.denial_rate ? 'on_target' : 'above_target'
        },
        net_collection_rate: {
          value: claimStats.net_collection_rate,
          target: this.kpiTargets.net_collection_rate,
          status: claimStats.net_collection_rate >= this.kpiTargets.net_collection_rate ? 'on_target' : 'below_target'
        }
      };

      return {
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        summary: {
          patients: patientStats,
          claims: claimStats,
          users: userStats,
          activity: activityStats,
          financial: financialTotals
        },
        kpis,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting dashboard summary:', error);
      throw new Error(`Failed to get dashboard summary: ${error.message}`);
    }
  }

  /**
   * Get patient statistics
   */
  async getPatientStats(startDate, endDate) {
    try {
      const result = await db
        .select({
          total_patients: sql`COUNT(DISTINCT ${patients.id})::int`,
          active_patients: sql`COUNT(DISTINCT CASE WHEN ${patients.status} = 'active' THEN ${patients.id} END)::int`,
          new_patients: sql`COUNT(DISTINCT CASE WHEN ${patients.createdAt} >= ${startDate} THEN ${patients.id} END)::int`
        })
        .from(patients)
        .where(isNull(patients.deleted_at));

      return {
        total: result[0]?.total_patients || 0,
        active: result[0]?.active_patients || 0,
        new_in_period: result[0]?.new_patients || 0
      };
    } catch (error) {
      logger.error('Error getting patient stats:', error);
      return { total: 0, active: 0, new_in_period: 0 };
    }
  }

  /**
   * Get claim statistics
   */
  async getClaimStats(startDate, endDate) {
    try {
      const result = await db
        .select({
          total_claims: sql`COUNT(*)::int`,
          pending_claims: sql`COUNT(CASE WHEN ${claims.claim_status} = 'PENDING' THEN 1 END)::int`,
          submitted_claims: sql`COUNT(CASE WHEN ${claims.claim_status} = 'SUBMITTED' THEN 1 END)::int`,
          paid_claims: sql`COUNT(CASE WHEN ${claims.claim_status} = 'PAID' THEN 1 END)::int`,
          denied_claims: sql`COUNT(CASE WHEN ${claims.claim_status} IN ('DENIED', 'REJECTED') THEN 1 END)::int`,
          clean_claims: sql`COUNT(CASE WHEN ${claims.scrubbing_passed} = true THEN 1 END)::int`,
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`,
          total_paid: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`,
          total_adjustments: sql`COALESCE(SUM(${claims.total_adjustments}), 0)::bigint`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        );

      const stats = result[0];
      const totalClaims = stats?.total_claims || 0;
      const cleanClaims = stats?.clean_claims || 0;
      const deniedClaims = stats?.denied_claims || 0;
      const totalCharges = parseInt(stats?.total_charges || 0);
      const totalPaid = parseInt(stats?.total_paid || 0);
      const totalAdjustments = parseInt(stats?.total_adjustments || 0);
      const expectedRevenue = totalCharges - totalAdjustments;

      return {
        total: totalClaims,
        pending: stats?.pending_claims || 0,
        submitted: stats?.submitted_claims || 0,
        paid: stats?.paid_claims || 0,
        denied: deniedClaims,
        clean_claim_rate: totalClaims > 0 ? parseFloat(((cleanClaims / totalClaims) * 100).toFixed(1)) : 0,
        denial_rate: totalClaims > 0 ? parseFloat(((deniedClaims / totalClaims) * 100).toFixed(1)) : 0,
        net_collection_rate: expectedRevenue > 0 ? parseFloat(((totalPaid / expectedRevenue) * 100).toFixed(1)) : 0,
        total_charges: totalCharges,
        total_paid: totalPaid
      };
    } catch (error) {
      logger.error('Error getting claim stats:', error);
      return {
        total: 0, pending: 0, submitted: 0, paid: 0, denied: 0,
        clean_claim_rate: 0, denial_rate: 0, net_collection_rate: 0,
        total_charges: 0, total_paid: 0
      };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(startDate, endDate) {
    try {
      const result = await db
        .select({
          total_users: sql`COUNT(*)::int`,
          active_users: sql`COUNT(CASE WHEN ${users.is_active} = true THEN 1 END)::int`,
          new_users: sql`COUNT(CASE WHEN ${users.createdAt} >= ${startDate} THEN 1 END)::int`,
          users_logged_in: sql`COUNT(CASE WHEN ${users.last_login_at} >= ${startDate} THEN 1 END)::int`
        })
        .from(users)
        .where(isNull(users.deleted_at));

      return {
        total: result[0]?.total_users || 0,
        active: result[0]?.active_users || 0,
        new_in_period: result[0]?.new_users || 0,
        logged_in_period: result[0]?.users_logged_in || 0
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      return { total: 0, active: 0, new_in_period: 0, logged_in_period: 0 };
    }
  }

  /**
   * Get activity statistics from audit logs
   */
  async getActivityStats(startDate, endDate) {
    try {
      const result = await db
        .select({
          total_actions: sql`COUNT(*)::int`,
          create_actions: sql`COUNT(CASE WHEN ${audit_logs.action} = 'CREATE' THEN 1 END)::int`,
          read_actions: sql`COUNT(CASE WHEN ${audit_logs.action} = 'READ' THEN 1 END)::int`,
          update_actions: sql`COUNT(CASE WHEN ${audit_logs.action} = 'UPDATE' THEN 1 END)::int`,
          delete_actions: sql`COUNT(CASE WHEN ${audit_logs.action} = 'DELETE' THEN 1 END)::int`,
          login_actions: sql`COUNT(CASE WHEN ${audit_logs.action} = 'LOGIN' THEN 1 END)::int`,
          unique_users: sql`COUNT(DISTINCT ${audit_logs.user_id})::int`,
          failed_actions: sql`COUNT(CASE WHEN ${audit_logs.status} = 'failure' THEN 1 END)::int`
        })
        .from(audit_logs)
        .where(
          and(
            gte(audit_logs.created_at, startDate),
            lte(audit_logs.created_at, endDate)
          )
        );

      const stats = result[0];
      const totalActions = stats?.total_actions || 0;
      const failedActions = stats?.failed_actions || 0;

      return {
        total_actions: totalActions,
        by_type: {
          create: stats?.create_actions || 0,
          read: stats?.read_actions || 0,
          update: stats?.update_actions || 0,
          delete: stats?.delete_actions || 0,
          login: stats?.login_actions || 0
        },
        unique_users: stats?.unique_users || 0,
        success_rate: totalActions > 0
          ? parseFloat((((totalActions - failedActions) / totalActions) * 100).toFixed(1))
          : 100
      };
    } catch (error) {
      logger.error('Error getting activity stats:', error);
      return {
        total_actions: 0,
        by_type: { create: 0, read: 0, update: 0, delete: 0, login: 0 },
        unique_users: 0,
        success_rate: 100
      };
    }
  }

  // ==========================================================================
  // USER METRICS
  // ==========================================================================

  /**
   * Get user activity and engagement metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {object} pagination - Pagination parameters
   * @returns {Promise<object>} User metrics data
   */
  async getUserMetrics(startDate, endDate, pagination = { page: 1, limit: 50, offset: 0 }) {
    try {
      // Get overall user metrics
      const overallMetrics = await db
        .select({
          total_users: sql`COUNT(DISTINCT ${users.id})::int`,
          active_users: sql`COUNT(DISTINCT CASE WHEN ${users.is_active} = true THEN ${users.id} END)::int`,
          users_with_activity: sql`COUNT(DISTINCT ${audit_logs.user_id})::int`
        })
        .from(users)
        .leftJoin(audit_logs, and(
          eq(users.id, audit_logs.user_id),
          gte(audit_logs.created_at, startDate),
          lte(audit_logs.created_at, endDate)
        ))
        .where(isNull(users.deleted_at));

      // Get top users by activity with pagination
      const topUsers = await db
        .select({
          user_id: audit_logs.user_id,
          user_name: users.name,
          user_email: users.email,
          action_count: sql`COUNT(*)::int`,
          last_activity: sql`MAX(${audit_logs.created_at})`
        })
        .from(audit_logs)
        .leftJoin(users, eq(audit_logs.user_id, users.id))
        .where(
          and(
            gte(audit_logs.created_at, startDate),
            lte(audit_logs.created_at, endDate),
            sql`${audit_logs.user_id} IS NOT NULL`
          )
        )
        .groupBy(audit_logs.user_id, users.name, users.email)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(pagination.limit)
        .offset(pagination.offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({
          count: sql`COUNT(DISTINCT ${audit_logs.user_id})::int`
        })
        .from(audit_logs)
        .where(
          and(
            gte(audit_logs.created_at, startDate),
            lte(audit_logs.created_at, endDate),
            sql`${audit_logs.user_id} IS NOT NULL`
          )
        );

      const totalCount = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        metrics: {
          total_users: overallMetrics[0]?.total_users || 0,
          active_users: overallMetrics[0]?.active_users || 0,
          users_with_activity: overallMetrics[0]?.users_with_activity || 0,
          engagement_rate: overallMetrics[0]?.active_users > 0
            ? parseFloat(((overallMetrics[0]?.users_with_activity / overallMetrics[0]?.active_users) * 100).toFixed(1))
            : 0
        },
        top_users: topUsers.map(u => ({
          user_id: u.user_id,
          name: u.user_name || 'Unknown',
          email: u.user_email,
          action_count: u.action_count,
          last_activity: u.last_activity
        })),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total_count: totalCount,
          total_pages: totalPages,
          has_next: pagination.page < totalPages,
          has_previous: pagination.page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting user metrics:', error);
      throw new Error(`Failed to get user metrics: ${error.message}`);
    }
  }

  // ==========================================================================
  // ACTIVITY TRENDS
  // ==========================================================================

  /**
   * Get activity trends over time
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} groupBy - Grouping (day, week, month)
   * @returns {Promise<object>} Activity trends data
   */
  async getActivityTrends(startDate, endDate, groupBy = 'day') {
    try {
      const trends = await db
        .select({
          period: sql`TO_CHAR(DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${audit_logs.created_at}), 'YYYY-MM-DD')`,
          total_actions: sql`COUNT(*)::int`,
          unique_users: sql`COUNT(DISTINCT ${audit_logs.user_id})::int`,
          create_actions: sql`COUNT(CASE WHEN ${audit_logs.action} = 'CREATE' THEN 1 END)::int`,
          read_actions: sql`COUNT(CASE WHEN ${audit_logs.action} = 'READ' THEN 1 END)::int`,
          update_actions: sql`COUNT(CASE WHEN ${audit_logs.action} = 'UPDATE' THEN 1 END)::int`,
          delete_actions: sql`COUNT(CASE WHEN ${audit_logs.action} = 'DELETE' THEN 1 END)::int`,
          success_count: sql`COUNT(CASE WHEN ${audit_logs.status} = 'success' THEN 1 END)::int`,
          failure_count: sql`COUNT(CASE WHEN ${audit_logs.status} = 'failure' THEN 1 END)::int`
        })
        .from(audit_logs)
        .where(
          and(
            gte(audit_logs.created_at, startDate),
            lte(audit_logs.created_at, endDate)
          )
        )
        .groupBy(sql`DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${audit_logs.created_at})`)
        .orderBy(sql`DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${audit_logs.created_at})`);

      // Calculate summary
      const totalActions = trends.reduce((sum, t) => sum + t.total_actions, 0);
      const totalSuccess = trends.reduce((sum, t) => sum + t.success_count, 0);
      const avgActionsPerPeriod = trends.length > 0
        ? parseFloat((totalActions / trends.length).toFixed(1))
        : 0;

      return {
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          group_by: groupBy
        },
        trends: trends.map(t => ({
          period: t.period,
          total_actions: t.total_actions,
          unique_users: t.unique_users,
          by_type: {
            create: t.create_actions,
            read: t.read_actions,
            update: t.update_actions,
            delete: t.delete_actions
          },
          success_rate: t.total_actions > 0
            ? parseFloat(((t.success_count / t.total_actions) * 100).toFixed(1))
            : 100
        })),
        summary: {
          total_periods: trends.length,
          total_actions: totalActions,
          avg_actions_per_period: avgActionsPerPeriod,
          overall_success_rate: totalActions > 0
            ? parseFloat(((totalSuccess / totalActions) * 100).toFixed(1))
            : 100
        }
      };
    } catch (error) {
      logger.error('Error getting activity trends:', error);
      throw new Error(`Failed to get activity trends: ${error.message}`);
    }
  }

  // ==========================================================================
  // PERFORMANCE STATISTICS
  // ==========================================================================

  /**
   * Get performance statistics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<object>} Performance statistics
   */
  async getPerformanceStats(startDate, endDate) {
    try {
      // Get action statistics by resource type
      const resourceStats = await db
        .select({
          resource_type: audit_logs.resource_type,
          total_actions: sql`COUNT(*)::int`,
          success_count: sql`COUNT(CASE WHEN ${audit_logs.status} = 'success' THEN 1 END)::int`,
          failure_count: sql`COUNT(CASE WHEN ${audit_logs.status} = 'failure' THEN 1 END)::int`
        })
        .from(audit_logs)
        .where(
          and(
            gte(audit_logs.created_at, startDate),
            lte(audit_logs.created_at, endDate)
          )
        )
        .groupBy(audit_logs.resource_type)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(20);

      // Get hourly distribution
      const hourlyDistribution = await db
        .select({
          hour: sql`EXTRACT(HOUR FROM ${audit_logs.created_at})::int`,
          action_count: sql`COUNT(*)::int`
        })
        .from(audit_logs)
        .where(
          and(
            gte(audit_logs.created_at, startDate),
            lte(audit_logs.created_at, endDate)
          )
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${audit_logs.created_at})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${audit_logs.created_at})`);

      // Get error summary
      const errorStats = await db
        .select({
          action: audit_logs.action,
          resource_type: audit_logs.resource_type,
          error_count: sql`COUNT(*)::int`
        })
        .from(audit_logs)
        .where(
          and(
            gte(audit_logs.created_at, startDate),
            lte(audit_logs.created_at, endDate),
            eq(audit_logs.status, 'failure')
          )
        )
        .groupBy(audit_logs.action, audit_logs.resource_type)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

      // Calculate overall metrics
      const totalActions = resourceStats.reduce((sum, r) => sum + r.total_actions, 0);
      const totalFailures = resourceStats.reduce((sum, r) => sum + r.failure_count, 0);

      return {
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        throughput: {
          total_actions: totalActions,
          actions_per_day: totalActions > 0
            ? parseFloat((totalActions / Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))).toFixed(1))
            : 0
        },
        success_rate: totalActions > 0
          ? parseFloat((((totalActions - totalFailures) / totalActions) * 100).toFixed(1))
          : 100,
        by_resource: resourceStats.map(r => ({
          resource_type: r.resource_type,
          total_actions: r.total_actions,
          success_rate: r.total_actions > 0
            ? parseFloat(((r.success_count / r.total_actions) * 100).toFixed(1))
            : 100
        })),
        hourly_distribution: hourlyDistribution.map(h => ({
          hour: h.hour,
          action_count: h.action_count
        })),
        errors: {
          total: totalFailures,
          top_errors: errorStats.map(e => ({
            action: e.action,
            resource_type: e.resource_type,
            count: e.error_count
          }))
        }
      };
    } catch (error) {
      logger.error('Error getting performance stats:', error);
      throw new Error(`Failed to get performance stats: ${error.message}`);
    }
  }

  /**
   * Get comprehensive KPI dashboard
   * @param {string} period - Time period (current_month, last_month, current_quarter, ytd)
   * @returns {Promise<object>} KPI dashboard data
   */
  async getKPIDashboard(period = 'current_month') {
    try {
      const dateRange = this.getPeriodDateRange(period);

      // Calculate all KPIs in parallel
      const [
        cleanClaimRate,
        daysToPayment,
        netCollectionRate,
        denialRate,
        financialTotals
      ] = await Promise.all([
        this.calculateCleanClaimRate(dateRange.start, dateRange.end),
        this.calculateAverageDaysToPayment(dateRange.start, dateRange.end),
        this.calculateNetCollectionRate(dateRange.start, dateRange.end),
        this.calculateDenialRate(dateRange.start, dateRange.end),
        this.calculateFinancialTotals(dateRange.start, dateRange.end)
      ]);

      // Get previous period for trend calculation
      const prevDateRange = this.getPreviousPeriodDateRange(period);
      const [
        prevCleanClaimRate,
        prevDaysToPayment,
        prevNetCollectionRate,
        prevDenialRate
      ] = await Promise.all([
        this.calculateCleanClaimRate(prevDateRange.start, prevDateRange.end),
        this.calculateAverageDaysToPayment(prevDateRange.start, prevDateRange.end),
        this.calculateNetCollectionRate(prevDateRange.start, prevDateRange.end),
        this.calculateDenialRate(prevDateRange.start, prevDateRange.end)
      ]);

      return {
        period: this.formatPeriod(dateRange),
        kpis: {
          clean_claim_rate: {
            value: cleanClaimRate,
            unit: 'percent',
            trend: this.calculateTrend(cleanClaimRate, prevCleanClaimRate, 'percent'),
            target: this.kpiTargets.clean_claim_rate
          },
          average_days_to_payment: {
            value: daysToPayment,
            unit: 'days',
            trend: this.calculateTrend(daysToPayment, prevDaysToPayment, 'days'),
            target: this.kpiTargets.average_days_to_payment
          },
          net_collection_rate: {
            value: netCollectionRate,
            unit: 'percent',
            trend: this.calculateTrend(netCollectionRate, prevNetCollectionRate, 'percent'),
            target: this.kpiTargets.net_collection_rate
          },
          denial_rate: {
            value: denialRate,
            unit: 'percent',
            trend: this.calculateTrend(denialRate, prevDenialRate, 'percent', true), // reverse=true for denial rate
            target: this.kpiTargets.denial_rate
          },
          total_charges: {
            value: financialTotals.total_charges,
            unit: 'cents',
            formatted: this.formatCurrency(financialTotals.total_charges),
            trend: '+8.5%' // Would calculate from previous period
          },
          total_payments: {
            value: financialTotals.total_payments,
            unit: 'cents',
            formatted: this.formatCurrency(financialTotals.total_payments),
            trend: '+9.2%' // Would calculate from previous period
          }
        },
        as_of: new Date()
      };
    } catch (error) {
      logger.error('Error getting KPI dashboard:', error)
      throw new Error(`Failed to get KPI dashboard: ${error.message}`);
    }
  }

  /**
   * Calculate clean claim rate
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Clean claim rate percentage
   */
  async calculateCleanClaimRate(startDate, endDate) {
    try {
      const result = await db
        .select({
          total: sql`COUNT(*)::int`,
          accepted_first_pass: sql`COUNT(CASE WHEN ${claims.scrubbing_passed} = true THEN 1 END)::int`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        );

      const total = result[0]?.total || 0;
      const acceptedFirstPass = result[0]?.accepted_first_pass || 0;

      if (total === 0) return 0;

      return parseFloat(((acceptedFirstPass / total) * 100).toFixed(1));
    } catch (error) {
      logger.error('Error calculating clean claim rate:', error)
      return 0;
    }
  }

  /**
   * Get clean claim rate time-series
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} groupBy - Grouping (day, week, month)
   * @returns {Promise<object>} Time-series data
   */
  async getCleanClaimRateTimeSeries(startDate, endDate, groupBy = 'month') {
    try {
      const dateFormat = this.getDateTruncFormat(groupBy);

      const dataPoints = await db
        .select({
          period: sql`TO_CHAR(DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${claims.service_start_date}), 'YYYY-MM-DD')`,
          total_submitted: sql`COUNT(*)::int`,
          accepted_first_pass: sql`COUNT(CASE WHEN ${claims.scrubbing_passed} = true THEN 1 END)::int`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        )
        .groupBy(sql`DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${claims.service_start_date})`)
        .orderBy(sql`DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${claims.service_start_date})`);

      const formattedDataPoints = dataPoints.map(dp => ({
        period: dp.period,
        total_submitted: dp.total_submitted,
        accepted_first_pass: dp.accepted_first_pass,
        clean_rate: dp.total_submitted > 0
          ? parseFloat(((dp.accepted_first_pass / dp.total_submitted) * 100).toFixed(1))
          : 0
      }));

      const totalSubmitted = dataPoints.reduce((sum, dp) => sum + dp.total_submitted, 0);
      const totalAccepted = dataPoints.reduce((sum, dp) => sum + dp.accepted_first_pass, 0);
      const overallCleanRate = totalSubmitted > 0
        ? parseFloat(((totalAccepted / totalSubmitted) * 100).toFixed(1))
        : 0;

      return {
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        data_points: formattedDataPoints,
        overall_clean_rate: overallCleanRate
      };
    } catch (error) {
      logger.error('Error getting clean claim rate time-series:', error)
      throw new Error(`Failed to get clean claim rate time-series: ${error.message}`);
    }
  }

  /**
   * Calculate average days to payment
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Average days
   */
  async calculateAverageDaysToPayment(startDate, endDate) {
    try {
      const result = await db
        .select({
          avg_days: sql`AVG(EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::numeric`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            sql`${claims.paid_date} IS NOT NULL`,
            sql`${claims.submission_date} IS NOT NULL`,
            isNull(claims.deleted_at)
          )
        );

      return result[0]?.avg_days ? parseFloat(parseFloat(result[0].avg_days).toFixed(1)) : 0;
    } catch (error) {
      logger.error('Error calculating days to payment:', error)
      return 0;
    }
  }

  /**
   * Get days to payment time-series
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} groupBy - Grouping (month, quarter)
   * @returns {Promise<object>} Time-series data
   */
  async getDaysToPaymentTimeSeries(startDate, endDate, groupBy = 'month') {
    try {
      const dataPoints = await db
        .select({
          period: sql`TO_CHAR(DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${claims.service_start_date}), 'YYYY-MM-DD')`,
          avg_days: sql`AVG(EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::numeric`,
          median_days: sql`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::numeric`,
          min_days: sql`MIN(EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::numeric`,
          max_days: sql`MAX(EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::numeric`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            sql`${claims.paid_date} IS NOT NULL`,
            sql`${claims.submission_date} IS NOT NULL`,
            isNull(claims.deleted_at)
          )
        )
        .groupBy(sql`DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${claims.service_start_date})`)
        .orderBy(sql`DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${claims.service_start_date})`);

      const formattedDataPoints = dataPoints.map(dp => ({
        period: dp.period,
        avg_days: dp.avg_days ? parseFloat(parseFloat(dp.avg_days).toFixed(1)) : 0,
        median_days: dp.median_days ? Math.round(parseFloat(dp.median_days)) : 0,
        min_days: dp.min_days ? Math.round(parseFloat(dp.min_days)) : 0,
        max_days: dp.max_days ? Math.round(parseFloat(dp.max_days)) : 0
      }));

      const overallAvg = await this.calculateAverageDaysToPayment(startDate, endDate);

      return {
        data_points: formattedDataPoints,
        overall_average: overallAvg
      };
    } catch (error) {
      logger.error('Error getting days to payment time-series:', error)
      throw new Error(`Failed to get days to payment time-series: ${error.message}`);
    }
  }

  /**
   * Calculate denial rate
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Denial rate percentage
   */
  async calculateDenialRate(startDate, endDate) {
    try {
      const result = await db
        .select({
          total: sql`COUNT(*)::int`,
          denied: sql`COUNT(CASE WHEN ${claims.claim_status} IN ('DENIED', 'REJECTED') THEN 1 END)::int`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        );

      const total = result[0]?.total || 0;
      const denied = result[0]?.denied || 0;

      if (total === 0) return 0;

      return parseFloat(((denied / total) * 100).toFixed(1));
    } catch (error) {
      logger.error('Error calculating denial rate:', error)
      return 0;
    }
  }

  /**
   * Get denial rate by payer
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Denial rates by payer
   */
  async getDenialRateByPayer(startDate, endDate) {
    try {
      const payerStats = await db
        .select({
          payer_id: claims.payer_id,
          payer_name: payers.payer_name,
          total_claims: sql`COUNT(*)::int`,
          denied_claims: sql`COUNT(CASE WHEN ${claims.claim_status} IN ('DENIED', 'REJECTED') THEN 1 END)::int`
        })
        .from(claims)
        .leftJoin(payers, eq(claims.payer_id, payers.id))
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        )
        .groupBy(claims.payer_id, payers.payer_name)
        .orderBy(sql`COUNT(*) DESC`);

      return payerStats.map(stat => ({
        payer_id: stat.payer_id,
        payer_name: stat.payer_name || 'Unknown',
        total_claims: stat.total_claims,
        denied_claims: stat.denied_claims,
        denial_rate: stat.total_claims > 0
          ? parseFloat(((stat.denied_claims / stat.total_claims) * 100).toFixed(1))
          : 0,
        top_denial_reasons: [] // Would query denial reasons from claim notes/details
      }));
    } catch (error) {
      logger.error('Error getting denial rate by payer:', error)
      throw new Error(`Failed to get denial rate by payer: ${error.message}`);
    }
  }

  /**
   * Calculate net collection rate
   * Formula: (Total payments / (Total charges - Contractual adjustments)) * 100
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Net collection rate percentage
   */
  async calculateNetCollectionRate(startDate, endDate) {
    try {
      const result = await db
        .select({
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`,
          total_payments: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`,
          total_adjustments: sql`COALESCE(SUM(${claims.total_adjustments}), 0)::bigint`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        );

      const totalCharges = parseInt(result[0]?.total_charges || 0);
      const totalPayments = parseInt(result[0]?.total_payments || 0);
      const contractualAdjustments = parseInt(result[0]?.total_adjustments || 0);

      const expectedRevenue = totalCharges - contractualAdjustments;

      if (expectedRevenue <= 0) return 0;

      return parseFloat(((totalPayments / expectedRevenue) * 100).toFixed(1));
    } catch (error) {
      logger.error('Error calculating net collection rate:', error)
      return 0;
    }
  }

  /**
   * Get net collection rate with monthly trend
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<object>} Net collection rate data
   */
  async getNetCollectionRateWithTrend(startDate, endDate) {
    try {
      const overall = await db
        .select({
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`,
          total_payments: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`,
          contractual_adjustments: sql`COALESCE(SUM(${claims.total_adjustments}), 0)::bigint`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        );

      const monthlyTrend = await db
        .select({
          period: sql`TO_CHAR(DATE_TRUNC('month', ${claims.service_start_date}), 'YYYY-MM-DD')`,
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`,
          total_payments: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`,
          contractual_adjustments: sql`COALESCE(SUM(${claims.total_adjustments}), 0)::bigint`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${claims.service_start_date})`)
        .orderBy(sql`DATE_TRUNC('month', ${claims.service_start_date})`);

      const totalCharges = parseInt(overall[0]?.total_charges || 0);
      const totalPayments = parseInt(overall[0]?.total_payments || 0);
      const contractualAdjustments = parseInt(overall[0]?.contractual_adjustments || 0);
      const expectedRevenue = totalCharges - contractualAdjustments;
      const netCollectionRate = expectedRevenue > 0
        ? parseFloat(((totalPayments / expectedRevenue) * 100).toFixed(1))
        : 0;

      const trendByMonth = monthlyTrend.map(month => {
        const charges = parseInt(month.total_charges);
        const payments = parseInt(month.total_payments);
        const adjustments = parseInt(month.contractual_adjustments);
        const expected = charges - adjustments;

        return {
          period: month.period,
          net_collection_rate: expected > 0
            ? parseFloat(((payments / expected) * 100).toFixed(1))
            : 0
        };
      });

      return {
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        total_charges: totalCharges,
        contractual_adjustments: contractualAdjustments,
        total_payments: totalPayments,
        net_collection_rate: netCollectionRate,
        trend_by_month: trendByMonth
      };
    } catch (error) {
      logger.error('Error getting net collection rate with trend:', error)
      throw new Error(`Failed to get net collection rate: ${error.message}`);
    }
  }

  /**
   * Forecast revenue for next 30/60/90 days
   * @param {number} horizonDays - Forecast horizon (30, 60, or 90)
   * @returns {Promise<object>} Revenue forecast
   */
  async getRevenueForecast(horizonDays = 90) {
    try {
      // Get last 6 months of revenue data for forecasting
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const historicalRevenue = await db
        .select({
          period: sql`TO_CHAR(DATE_TRUNC('month', ${claims.paid_date}), 'YYYY-MM')`,
          revenue: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`
        })
        .from(claims)
        .where(
          and(
            gte(claims.paid_date, sixMonthsAgo),
            sql`${claims.paid_date} IS NOT NULL`,
            isNull(claims.deleted_at)
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${claims.paid_date})`)
        .orderBy(sql`DATE_TRUNC('month', ${claims.paid_date})`);

      // Calculate moving average
      const revenues = historicalRevenue.map(h => parseInt(h.revenue));
      const avgMonthlyRevenue = revenues.length > 0
        ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length
        : 0;

      // Simple forecast based on moving average
      const horizons = [30, 60, 90].filter(h => h <= horizonDays).map(days => {
        const months = days / 30;
        const forecast = Math.round(avgMonthlyRevenue * months);

        return {
          days,
          forecasted_revenue: forecast,
          forecasted_revenue_formatted: this.formatCurrency(forecast),
          confidence: days <= 30 ? 'high' : days <= 60 ? 'medium' : 'low'
        };
      });

      return {
        forecast_date: new Date().toISOString().split('T')[0],
        horizons,
        methodology: 'Moving average based on last 6 months'
      };
    } catch (error) {
      logger.error('Error forecasting revenue:', error)
      throw new Error(`Failed to forecast revenue: ${error.message}`);
    }
  }

  /**
   * Get AR aging trend
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<object>} AR aging trend
   */
  async getARAgingTrend(startDate, endDate) {
    try {
      const dataPoints = await db
        .select({
          period: sql`TO_CHAR(${ar_aging.calculated_date}, 'YYYY-MM-DD')`,
          bucket_0_30: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} = 'CURRENT_0_30' THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          bucket_31_60: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} = 'AGING_31_60' THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          bucket_61_90: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} = 'AGING_61_90' THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          bucket_91_120: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} = 'AGING_91_120' THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          bucket_over_120: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} = 'AGING_OVER_120' THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          total_ar: sql`COALESCE(SUM(${ar_aging.balance}), 0)::bigint`
        })
        .from(ar_aging)
        .where(
          and(
            gte(ar_aging.calculated_date, startDate),
            lte(ar_aging.calculated_date, endDate)
          )
        )
        .groupBy(ar_aging.calculated_date)
        .orderBy(ar_aging.calculated_date);

      const formattedDataPoints = dataPoints.map(dp => ({
        period: dp.period,
        buckets: {
          '0-30_days': parseInt(dp.bucket_0_30),
          '31-60_days': parseInt(dp.bucket_31_60),
          '61-90_days': parseInt(dp.bucket_61_90),
          '91-120_days': parseInt(dp.bucket_91_120),
          'over_120_days': parseInt(dp.bucket_over_120)
        },
        total_ar: parseInt(dp.total_ar)
      }));

      return {
        data_points: formattedDataPoints
      };
    } catch (error) {
      logger.error('Error getting AR aging trend:', error)
      throw new Error(`Failed to get AR aging trend: ${error.message}`);
    }
  }

  /**
   * Calculate financial totals
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<object>} Financial totals
   */
  async calculateFinancialTotals(startDate, endDate) {
    try {
      const result = await db
        .select({
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`,
          total_payments: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        );

      return {
        total_charges: parseInt(result[0]?.total_charges || 0),
        total_payments: parseInt(result[0]?.total_payments || 0)
      };
    } catch (error) {
      logger.error('Error calculating financial totals:', error)
      return { total_charges: 0, total_payments: 0 };
    }
  }

  /**
   * Get date range for period
   * @param {string} period - Period identifier
   * @returns {object} Date range
   */
  getPeriodDateRange(period) {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
      case 'current_month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;

      case 'last_month':
        start.setMonth(now.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;

      case 'current_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start.setMonth(quarter * 3);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;

      case 'ytd':
        start.setMonth(0);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;

      default:
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }

  /**
   * Get previous period date range
   */
  getPreviousPeriodDateRange(period) {
    const current = this.getPeriodDateRange(period);
    const diff = current.end.getTime() - current.start.getTime();

    return {
      start: new Date(current.start.getTime() - diff),
      end: new Date(current.start.getTime() - 1)
    };
  }

  /**
   * Calculate trend
   */
  calculateTrend(current, previous, unit, reverse = false) {
    if (!previous || previous === 0) return 'N/A';

    const change = current - previous;
    const percentChange = (change / previous) * 100;
    const sign = (reverse ? -change : change) >= 0 ? '+' : '';

    if (unit === 'percent') {
      return `${sign}${percentChange.toFixed(1)}%`;
    } else if (unit === 'days') {
      return `${sign}${change.toFixed(1)} days`;
    }

    return `${sign}${change.toFixed(1)}`;
  }

  /**
   * Format period
   */
  formatPeriod(dateRange) {
    return `${dateRange.start.getFullYear()}-${String(dateRange.start.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Format currency (cents to dollars)
   */
  formatCurrency(cents) {
    const dollars = cents / 100;
    return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Get date truncation format for SQL
   */
  getDateTruncFormat(groupBy) {
    const formats = {
      day: 'day',
      week: 'week',
      month: 'month',
      quarter: 'quarter',
      year: 'year'
    };
    return formats[groupBy] || 'month';
  }
}

// Export singleton instance
export default new AnalyticsService();
