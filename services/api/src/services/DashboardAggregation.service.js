import { db } from '../db/index.js';
import { claims, payments, ar_aging, payers, billing_periods } from '../db/schemas/billing.schema.js';
import { patients } from '../db/schemas/patient.schema.js';
import { encounters } from '../db/schemas/encounters.schema.js';
import { eq, sql, gte, lte, and, isNull, count, sum, avg, desc, inArray } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import MetricsEngine from './MetricsEngine.service.js';
import CacheService from './CacheService.js';

/**
 * Dashboard Aggregation Service
 *
 * Aggregates data from multiple sources into unified dashboard views.
 * Provides pre-computed metrics for executive, clinical, and financial dashboards.
 *
 * Features:
 *   - Executive dashboard with KPIs across all domains
 *   - Clinical dashboard with patient and care metrics
 *   - Financial dashboard with revenue cycle metrics
 *   - Operational dashboard with efficiency metrics
 *   - Real-time data with optional caching
 *   - Comparative period analysis
 */
class DashboardAggregationService {
  constructor() {
    this.cachePrefix = 'dashboard:';
    this.cacheTTL = 300; // 5 minutes
  }

  // ==========================================================================
  // EXECUTIVE DASHBOARD
  // ==========================================================================

  /**
   * Get comprehensive executive dashboard
   * @param {object} options - Dashboard options
   * @returns {Promise<object>} Executive dashboard data
   */
  async getExecutiveDashboard(options = {}) {
    const {
      period = 'current_month',
      includeComparison = true,
      useCache = true
    } = options;

    const cacheKey = `${this.cachePrefix}executive:${period}`;

    try {
      // Check cache first
      if (useCache) {
        const cached = await CacheService.get(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch (error) {
      // Cache miss or error - continue to fetch fresh data
    }

    try {
      const dateRange = this.getPeriodDateRange(period);
      const prevDateRange = this.getPreviousPeriodDateRange(period);

      // Fetch all dashboard data in parallel
      const [
        financialSummary,
        clinicalSummary,
        operationalSummary,
        complianceSummary,
        previousPeriodData
      ] = await Promise.all([
        this.getFinancialSummary(dateRange.start, dateRange.end),
        this.getClinicalSummary(dateRange.start, dateRange.end),
        this.getOperationalSummary(dateRange.start, dateRange.end),
        this.getComplianceSummary(dateRange.start, dateRange.end),
        includeComparison ? this.getFinancialSummary(prevDateRange.start, prevDateRange.end) : null
      ]);

      const dashboard = {
        period: {
          label: this.formatPeriodLabel(period),
          start: dateRange.start.toISOString().split('T')[0],
          end: dateRange.end.toISOString().split('T')[0]
        },
        kpis: this.calculateKPIs(financialSummary, clinicalSummary, previousPeriodData),
        financial: financialSummary,
        clinical: clinicalSummary,
        operational: operationalSummary,
        compliance: complianceSummary,
        alerts: await this.getActiveAlerts(),
        generated_at: new Date().toISOString()
      };

      // Cache the result
      try {
        await CacheService.set(cacheKey, JSON.stringify(dashboard), this.cacheTTL);
      } catch (error) {
        // Cache set failed - continue without caching
      }

      return dashboard;
    } catch (error) {
      logger.error('Error getting executive dashboard:', error);
      throw new Error(`Failed to get executive dashboard: ${error.message}`);
    }
  }

  /**
   * Calculate KPIs with trends
   */
  calculateKPIs(current, clinical, previous) {
    const kpis = [];

    // Revenue
    kpis.push({
      id: 'total_revenue',
      label: 'Total Revenue',
      value: current.total_payments,
      formatted: MetricsEngine.formatCurrency(current.total_payments),
      trend: previous ? this.calculateTrend(current.total_payments, previous.total_payments) : null,
      type: 'currency'
    });

    // Clean Claim Rate
    kpis.push({
      id: 'clean_claim_rate',
      label: 'Clean Claim Rate',
      value: current.clean_claim_rate,
      formatted: `${current.clean_claim_rate}%`,
      trend: previous ? this.calculateTrend(current.clean_claim_rate, previous.clean_claim_rate) : null,
      status: MetricsEngine.evaluateMetric('clean_claim_rate', current.clean_claim_rate),
      target: 95,
      type: 'percentage'
    });

    // Days to Payment
    kpis.push({
      id: 'days_to_payment',
      label: 'Avg Days to Payment',
      value: current.avg_days_to_payment,
      formatted: `${current.avg_days_to_payment} days`,
      trend: previous ? this.calculateTrend(current.avg_days_to_payment, previous.avg_days_to_payment, true) : null,
      status: MetricsEngine.evaluateMetric('days_to_payment', current.avg_days_to_payment),
      target: 30,
      type: 'days'
    });

    // Net Collection Rate
    kpis.push({
      id: 'net_collection_rate',
      label: 'Net Collection Rate',
      value: current.net_collection_rate,
      formatted: `${current.net_collection_rate}%`,
      trend: previous ? this.calculateTrend(current.net_collection_rate, previous.net_collection_rate) : null,
      status: MetricsEngine.evaluateMetric('net_collection_rate', current.net_collection_rate),
      target: 98,
      type: 'percentage'
    });

    // Denial Rate
    kpis.push({
      id: 'denial_rate',
      label: 'Denial Rate',
      value: current.denial_rate,
      formatted: `${current.denial_rate}%`,
      trend: previous ? this.calculateTrend(current.denial_rate, previous.denial_rate, true) : null,
      status: MetricsEngine.evaluateMetric('denial_rate', current.denial_rate),
      target: 5,
      type: 'percentage'
    });

    // Active Patients
    kpis.push({
      id: 'active_patients',
      label: 'Active Patients',
      value: clinical.active_patients,
      formatted: clinical.active_patients.toString(),
      trend: previous ? this.calculateTrend(clinical.active_patients, previous?.active_patients || 0) : null,
      type: 'count'
    });

    return kpis;
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(startDate, endDate) {
    try {
      const [claimData, arData, denialData, paymentData] = await Promise.all([
        // Claims summary
        db.select({
          total_claims: sql`COUNT(*)::int`,
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`,
          total_paid: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`,
          total_adjustments: sql`COALESCE(SUM(${claims.total_adjustments}), 0)::bigint`,
          clean_claims: sql`COUNT(CASE WHEN ${claims.scrubbing_passed} = true THEN 1 END)::int`,
          denied_claims: sql`COUNT(CASE WHEN ${claims.claim_status} IN ('DENIED', 'REJECTED') THEN 1 END)::int`
        })
        .from(claims)
        .where(and(
          gte(claims.service_start_date, startDate),
          lte(claims.service_start_date, endDate),
          isNull(claims.deleted_at)
        )),

        // AR aging summary
        db.select({
          current: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} = 'CURRENT_0_30' THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          aging_31_60: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} = 'AGING_31_60' THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          aging_61_90: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} = 'AGING_61_90' THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          aging_over_90: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} IN ('AGING_91_120', 'AGING_OVER_120') THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          total_ar: sql`COALESCE(SUM(${ar_aging.balance}), 0)::bigint`
        })
        .from(ar_aging)
        .where(and(
          gte(ar_aging.calculated_date, startDate),
          lte(ar_aging.calculated_date, endDate)
        )),

        // Denial analysis
        db.select({
          payer_id: claims.payer_id,
          payer_name: payers.payer_name,
          denial_count: sql`COUNT(CASE WHEN ${claims.claim_status} IN ('DENIED', 'REJECTED') THEN 1 END)::int`,
          total_claims: sql`COUNT(*)::int`
        })
        .from(claims)
        .leftJoin(payers, eq(claims.payer_id, payers.id))
        .where(and(
          gte(claims.service_start_date, startDate),
          lte(claims.service_start_date, endDate),
          isNull(claims.deleted_at)
        ))
        .groupBy(claims.payer_id, payers.payer_name)
        .orderBy(desc(sql`COUNT(CASE WHEN ${claims.claim_status} IN ('DENIED', 'REJECTED') THEN 1 END)`))
        .limit(5),

        // Days to payment
        db.select({
          avg_days: sql`AVG(EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::numeric`
        })
        .from(claims)
        .where(and(
          gte(claims.service_start_date, startDate),
          lte(claims.service_start_date, endDate),
          sql`${claims.paid_date} IS NOT NULL`,
          sql`${claims.submission_date} IS NOT NULL`,
          isNull(claims.deleted_at)
        ))
      ]);

      const claim = claimData[0];
      const ar = arData[0];
      const totalClaims = parseInt(claim?.total_claims || 0);
      const cleanClaims = parseInt(claim?.clean_claims || 0);
      const deniedClaims = parseInt(claim?.denied_claims || 0);
      const totalCharges = parseInt(claim?.total_charges || 0);
      const totalPayments = parseInt(claim?.total_paid || 0);
      const totalAdjustments = parseInt(claim?.total_adjustments || 0);
      const expectedRevenue = totalCharges - totalAdjustments;

      return {
        total_claims: totalClaims,
        total_charges: totalCharges,
        total_charges_formatted: MetricsEngine.formatCurrency(totalCharges),
        total_payments: totalPayments,
        total_payments_formatted: MetricsEngine.formatCurrency(totalPayments),
        total_adjustments: totalAdjustments,
        clean_claim_rate: totalClaims > 0 ? parseFloat(((cleanClaims / totalClaims) * 100).toFixed(1)) : 0,
        denial_rate: totalClaims > 0 ? parseFloat(((deniedClaims / totalClaims) * 100).toFixed(1)) : 0,
        net_collection_rate: expectedRevenue > 0 ? parseFloat(((totalPayments / expectedRevenue) * 100).toFixed(1)) : 0,
        avg_days_to_payment: paymentData[0]?.avg_days ? parseFloat(parseFloat(paymentData[0].avg_days).toFixed(1)) : 0,
        ar_aging: {
          current: parseInt(ar?.current || 0),
          aging_31_60: parseInt(ar?.aging_31_60 || 0),
          aging_61_90: parseInt(ar?.aging_61_90 || 0),
          aging_over_90: parseInt(ar?.aging_over_90 || 0),
          total: parseInt(ar?.total_ar || 0)
        },
        top_denial_payers: denialData.map(d => ({
          payer_id: d.payer_id,
          payer_name: d.payer_name || 'Unknown',
          denial_count: d.denial_count,
          total_claims: d.total_claims,
          denial_rate: d.total_claims > 0 ? parseFloat(((d.denial_count / d.total_claims) * 100).toFixed(1)) : 0
        }))
      };
    } catch (error) {
      logger.error('Error getting financial summary:', error);
      return {
        total_claims: 0,
        total_charges: 0,
        total_payments: 0,
        clean_claim_rate: 0,
        denial_rate: 0,
        net_collection_rate: 0,
        avg_days_to_payment: 0,
        ar_aging: { current: 0, aging_31_60: 0, aging_61_90: 0, aging_over_90: 0, total: 0 },
        top_denial_payers: []
      };
    }
  }

  /**
   * Get clinical summary
   */
  async getClinicalSummary(startDate, endDate) {
    try {
      const [patientData, encounterData] = await Promise.all([
        db.select({
          active_patients: sql`COUNT(DISTINCT ${claims.patient_id})::int`
        })
        .from(claims)
        .where(and(
          gte(claims.service_start_date, startDate),
          lte(claims.service_start_date, endDate),
          isNull(claims.deleted_at)
        )),

        db.select({
          total_encounters: sql`COUNT(*)::int`,
          completed_encounters: sql`COUNT(CASE WHEN ${encounters.encounter_status} = 'COMPLETED' THEN 1 END)::int`,
          avg_duration: sql`COALESCE(AVG(${encounters.encounter_duration_minutes}), 0)::numeric`,
          by_discipline: sql`jsonb_object_agg(COALESCE(${encounters.discipline}, 'UNKNOWN'), encounter_count) FILTER (WHERE ${encounters.discipline} IS NOT NULL)`
        })
        .from(
          db.select({
            discipline: encounters.discipline,
            encounter_count: sql`COUNT(*)::int`
          })
          .from(encounters)
          .where(and(
            gte(encounters.encounter_date, startDate),
            lte(encounters.encounter_date, endDate),
            isNull(encounters.deleted_at)
          ))
          .groupBy(encounters.discipline)
          .as('discipline_counts')
        ),

        db.select({
          total_encounters: sql`COUNT(*)::int`,
          completed_encounters: sql`COUNT(CASE WHEN ${encounters.encounter_status} = 'COMPLETED' THEN 1 END)::int`,
          avg_duration: sql`COALESCE(AVG(${encounters.encounter_duration_minutes}), 0)::numeric`
        })
        .from(encounters)
        .where(and(
          gte(encounters.encounter_date, startDate),
          lte(encounters.encounter_date, endDate),
          isNull(encounters.deleted_at)
        ))
      ]);

      const encounterStats = await db
        .select({
          total_encounters: sql`COUNT(*)::int`,
          completed_encounters: sql`COUNT(CASE WHEN ${encounters.encounter_status} = 'COMPLETED' THEN 1 END)::int`,
          avg_duration: sql`COALESCE(AVG(${encounters.encounter_duration_minutes}), 0)::numeric`
        })
        .from(encounters)
        .where(and(
          gte(encounters.encounter_date, startDate),
          lte(encounters.encounter_date, endDate),
          isNull(encounters.deleted_at)
        ));

      const disciplineBreakdown = await db
        .select({
          discipline: encounters.discipline,
          count: sql`COUNT(*)::int`
        })
        .from(encounters)
        .where(and(
          gte(encounters.encounter_date, startDate),
          lte(encounters.encounter_date, endDate),
          isNull(encounters.deleted_at)
        ))
        .groupBy(encounters.discipline);

      return {
        active_patients: parseInt(patientData[0]?.active_patients || 0),
        total_encounters: parseInt(encounterStats[0]?.total_encounters || 0),
        completed_encounters: parseInt(encounterStats[0]?.completed_encounters || 0),
        avg_encounter_duration: parseFloat(encounterStats[0]?.avg_duration || 0).toFixed(1),
        encounter_completion_rate: encounterStats[0]?.total_encounters > 0
          ? parseFloat(((encounterStats[0].completed_encounters / encounterStats[0].total_encounters) * 100).toFixed(1))
          : 0,
        by_discipline: disciplineBreakdown.map(d => ({
          discipline: d.discipline || 'Unknown',
          count: d.count
        }))
      };
    } catch (error) {
      logger.error('Error getting clinical summary:', error);
      return {
        active_patients: 0,
        total_encounters: 0,
        completed_encounters: 0,
        avg_encounter_duration: 0,
        encounter_completion_rate: 0,
        by_discipline: []
      };
    }
  }

  /**
   * Get operational summary
   */
  async getOperationalSummary(startDate, endDate) {
    try {
      const [claimStatusData, payerData] = await Promise.all([
        // Claims by status
        db.select({
          status: claims.claim_status,
          count: sql`COUNT(*)::int`,
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`
        })
        .from(claims)
        .where(and(
          gte(claims.service_start_date, startDate),
          lte(claims.service_start_date, endDate),
          isNull(claims.deleted_at)
        ))
        .groupBy(claims.claim_status),

        // Claims by payer
        db.select({
          payer_id: claims.payer_id,
          payer_name: payers.payer_name,
          claim_count: sql`COUNT(*)::int`,
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`,
          total_paid: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`
        })
        .from(claims)
        .leftJoin(payers, eq(claims.payer_id, payers.id))
        .where(and(
          gte(claims.service_start_date, startDate),
          lte(claims.service_start_date, endDate),
          isNull(claims.deleted_at)
        ))
        .groupBy(claims.payer_id, payers.payer_name)
        .orderBy(desc(sql`SUM(${claims.total_charges})`))
        .limit(10)
      ]);

      return {
        claims_by_status: claimStatusData.map(s => ({
          status: s.status,
          count: s.count,
          total_charges: parseInt(s.total_charges),
          total_charges_formatted: MetricsEngine.formatCurrency(parseInt(s.total_charges))
        })),
        claims_by_payer: payerData.map(p => ({
          payer_id: p.payer_id,
          payer_name: p.payer_name || 'Unknown',
          claim_count: p.claim_count,
          total_charges: parseInt(p.total_charges),
          total_charges_formatted: MetricsEngine.formatCurrency(parseInt(p.total_charges)),
          total_paid: parseInt(p.total_paid),
          total_paid_formatted: MetricsEngine.formatCurrency(parseInt(p.total_paid)),
          collection_rate: parseInt(p.total_charges) > 0
            ? parseFloat(((parseInt(p.total_paid) / parseInt(p.total_charges)) * 100).toFixed(1))
            : 0
        }))
      };
    } catch (error) {
      logger.error('Error getting operational summary:', error);
      return {
        claims_by_status: [],
        claims_by_payer: []
      };
    }
  }

  /**
   * Get compliance summary
   */
  async getComplianceSummary(startDate, endDate) {
    try {
      const auditData = await db
        .select({
          total_claims: sql`COUNT(*)::int`,
          scrubbing_passed: sql`COUNT(CASE WHEN ${claims.scrubbing_passed} = true THEN 1 END)::int`,
          scrubbing_failed: sql`COUNT(CASE WHEN ${claims.scrubbing_passed} = false THEN 1 END)::int`,
          pending_scrubbing: sql`COUNT(CASE WHEN ${claims.scrubbing_status} = 'PENDING' THEN 1 END)::int`
        })
        .from(claims)
        .where(and(
          gte(claims.service_start_date, startDate),
          lte(claims.service_start_date, endDate),
          isNull(claims.deleted_at)
        ));

      const data = auditData[0];
      const totalClaims = parseInt(data?.total_claims || 0);
      const passed = parseInt(data?.scrubbing_passed || 0);
      const failed = parseInt(data?.scrubbing_failed || 0);

      return {
        total_claims_audited: totalClaims,
        scrubbing_pass_rate: totalClaims > 0 ? parseFloat(((passed / totalClaims) * 100).toFixed(1)) : 0,
        scrubbing_fail_rate: totalClaims > 0 ? parseFloat(((failed / totalClaims) * 100).toFixed(1)) : 0,
        pending_audit: parseInt(data?.pending_scrubbing || 0),
        compliance_score: totalClaims > 0 ? parseFloat(((passed / totalClaims) * 100).toFixed(1)) : 100
      };
    } catch (error) {
      logger.error('Error getting compliance summary:', error);
      return {
        total_claims_audited: 0,
        scrubbing_pass_rate: 0,
        scrubbing_fail_rate: 0,
        pending_audit: 0,
        compliance_score: 0
      };
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts() {
    try {
      const alerts = [];

      // Check for high denial rates
      const denialData = await db
        .select({
          denial_rate: sql`(COUNT(CASE WHEN ${claims.claim_status} IN ('DENIED', 'REJECTED') THEN 1 END)::float / NULLIF(COUNT(*)::float, 0) * 100)::numeric`
        })
        .from(claims)
        .where(and(
          gte(claims.service_start_date, sql`CURRENT_DATE - INTERVAL '30 days'`),
          isNull(claims.deleted_at)
        ));

      const denialRate = parseFloat(denialData[0]?.denial_rate || 0);
      if (denialRate > 10) {
        alerts.push({
          type: 'critical',
          category: 'financial',
          title: 'High Denial Rate',
          message: `Current denial rate is ${denialRate.toFixed(1)}% (target: <5%)`,
          action: 'Review denied claims and address common denial reasons'
        });
      } else if (denialRate > 5) {
        alerts.push({
          type: 'warning',
          category: 'financial',
          title: 'Elevated Denial Rate',
          message: `Current denial rate is ${denialRate.toFixed(1)}% (target: <5%)`,
          action: 'Monitor denial trends and take preventive actions'
        });
      }

      // Check for aging AR
      const arData = await db
        .select({
          aging_over_90: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} IN ('AGING_91_120', 'AGING_OVER_120') THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          total_ar: sql`COALESCE(SUM(${ar_aging.balance}), 0)::bigint`
        })
        .from(ar_aging)
        .where(eq(ar_aging.calculated_date, sql`CURRENT_DATE`));

      const agingOver90 = parseInt(arData[0]?.aging_over_90 || 0);
      const totalAR = parseInt(arData[0]?.total_ar || 0);

      if (totalAR > 0 && (agingOver90 / totalAR) > 0.2) {
        alerts.push({
          type: 'warning',
          category: 'financial',
          title: 'High Aging AR',
          message: `${((agingOver90 / totalAR) * 100).toFixed(1)}% of AR is over 90 days old`,
          action: 'Prioritize collection efforts on aging accounts'
        });
      }

      return alerts;
    } catch (error) {
      logger.error('Error getting active alerts:', error);
      return [];
    }
  }

  // ==========================================================================
  // SPECIALIZED DASHBOARDS
  // ==========================================================================

  /**
   * Get financial dashboard with detailed revenue cycle metrics
   */
  async getFinancialDashboard(options = {}) {
    const { period = 'current_month' } = options;
    const dateRange = this.getPeriodDateRange(period);

    try {
      const [
        financialSummary,
        revenueTrend,
        arAgingTrend,
        payerMix
      ] = await Promise.all([
        this.getFinancialSummary(dateRange.start, dateRange.end),
        MetricsEngine.getMetricTimeSeries('revenue', dateRange.start, dateRange.end, 'week'),
        this.getARAgingTrend(dateRange.start, dateRange.end),
        this.getPayerMixAnalysis(dateRange.start, dateRange.end)
      ]);

      return {
        period: {
          label: this.formatPeriodLabel(period),
          start: dateRange.start.toISOString().split('T')[0],
          end: dateRange.end.toISOString().split('T')[0]
        },
        summary: financialSummary,
        revenue_trend: revenueTrend,
        ar_aging_trend: arAgingTrend,
        payer_mix: payerMix,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting financial dashboard:', error);
      throw new Error(`Failed to get financial dashboard: ${error.message}`);
    }
  }

  /**
   * Get clinical dashboard with patient care metrics
   */
  async getClinicalDashboard(options = {}) {
    const { period = 'current_month' } = options;
    const dateRange = this.getPeriodDateRange(period);

    try {
      const [
        clinicalSummary,
        encounterTrend,
        disciplineDistribution
      ] = await Promise.all([
        this.getClinicalSummary(dateRange.start, dateRange.end),
        MetricsEngine.getMetricTimeSeries('encounters', dateRange.start, dateRange.end, 'week'),
        this.getDisciplineDistribution(dateRange.start, dateRange.end)
      ]);

      return {
        period: {
          label: this.formatPeriodLabel(period),
          start: dateRange.start.toISOString().split('T')[0],
          end: dateRange.end.toISOString().split('T')[0]
        },
        summary: clinicalSummary,
        encounter_trend: encounterTrend,
        discipline_distribution: disciplineDistribution,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting clinical dashboard:', error);
      throw new Error(`Failed to get clinical dashboard: ${error.message}`);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get AR aging trend
   */
  async getARAgingTrend(startDate, endDate) {
    try {
      const result = await db
        .select({
          date: ar_aging.calculated_date,
          current: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} = 'CURRENT_0_30' THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          aging_31_60: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} = 'AGING_31_60' THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          aging_61_90: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} = 'AGING_61_90' THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`,
          aging_over_90: sql`COALESCE(SUM(CASE WHEN ${ar_aging.aging_bucket} IN ('AGING_91_120', 'AGING_OVER_120') THEN ${ar_aging.balance} ELSE 0 END), 0)::bigint`
        })
        .from(ar_aging)
        .where(and(
          gte(ar_aging.calculated_date, startDate),
          lte(ar_aging.calculated_date, endDate)
        ))
        .groupBy(ar_aging.calculated_date)
        .orderBy(ar_aging.calculated_date);

      return result.map(r => ({
        date: r.date,
        current: parseInt(r.current),
        aging_31_60: parseInt(r.aging_31_60),
        aging_61_90: parseInt(r.aging_61_90),
        aging_over_90: parseInt(r.aging_over_90),
        total: parseInt(r.current) + parseInt(r.aging_31_60) + parseInt(r.aging_61_90) + parseInt(r.aging_over_90)
      }));
    } catch (error) {
      logger.error('Error getting AR aging trend:', error);
      return [];
    }
  }

  /**
   * Get payer mix analysis
   */
  async getPayerMixAnalysis(startDate, endDate) {
    try {
      const result = await db
        .select({
          payer_id: claims.payer_id,
          payer_name: payers.payer_name,
          payer_type: payers.payer_type,
          claim_count: sql`COUNT(*)::int`,
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`,
          total_paid: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`
        })
        .from(claims)
        .leftJoin(payers, eq(claims.payer_id, payers.id))
        .where(and(
          gte(claims.service_start_date, startDate),
          lte(claims.service_start_date, endDate),
          isNull(claims.deleted_at)
        ))
        .groupBy(claims.payer_id, payers.payer_name, payers.payer_type)
        .orderBy(desc(sql`SUM(${claims.total_charges})`));

      const total = result.reduce((sum, r) => sum + parseInt(r.total_charges), 0);

      return result.map(r => ({
        payer_id: r.payer_id,
        payer_name: r.payer_name || 'Unknown',
        payer_type: r.payer_type || 'Other',
        claim_count: r.claim_count,
        total_charges: parseInt(r.total_charges),
        total_paid: parseInt(r.total_paid),
        percentage: total > 0 ? parseFloat(((parseInt(r.total_charges) / total) * 100).toFixed(1)) : 0
      }));
    } catch (error) {
      logger.error('Error getting payer mix analysis:', error);
      return [];
    }
  }

  /**
   * Get discipline distribution
   */
  async getDisciplineDistribution(startDate, endDate) {
    try {
      const result = await db
        .select({
          discipline: encounters.discipline,
          count: sql`COUNT(*)::int`,
          avg_duration: sql`COALESCE(AVG(${encounters.encounter_duration_minutes}), 0)::numeric`,
          unique_patients: sql`COUNT(DISTINCT ${encounters.patient_id})::int`
        })
        .from(encounters)
        .where(and(
          gte(encounters.encounter_date, startDate),
          lte(encounters.encounter_date, endDate),
          isNull(encounters.deleted_at)
        ))
        .groupBy(encounters.discipline)
        .orderBy(desc(sql`COUNT(*)`));

      const total = result.reduce((sum, r) => sum + r.count, 0);

      return result.map(r => ({
        discipline: r.discipline || 'Unknown',
        count: r.count,
        avg_duration_minutes: parseFloat(r.avg_duration).toFixed(1),
        unique_patients: r.unique_patients,
        percentage: total > 0 ? parseFloat(((r.count / total) * 100).toFixed(1)) : 0
      }));
    } catch (error) {
      logger.error('Error getting discipline distribution:', error);
      return [];
    }
  }

  /**
   * Calculate trend between two values
   */
  calculateTrend(current, previous, lowerIsBetter = false) {
    if (!previous || previous === 0) {
      return { direction: 'neutral', percentage: 0 };
    }

    const change = ((current - previous) / previous) * 100;
    let direction = 'neutral';

    if (Math.abs(change) > 1) {
      if (lowerIsBetter) {
        direction = change < 0 ? 'positive' : 'negative';
      } else {
        direction = change > 0 ? 'positive' : 'negative';
      }
    }

    return {
      direction,
      percentage: parseFloat(change.toFixed(1)),
      raw_change: parseFloat((current - previous).toFixed(2))
    };
  }

  /**
   * Get date range for period
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

      case 'last_30_days':
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;

      case 'last_90_days':
        start.setDate(now.getDate() - 90);
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
   * Format period label
   */
  formatPeriodLabel(period) {
    const labels = {
      current_month: 'Current Month',
      last_month: 'Last Month',
      current_quarter: 'Current Quarter',
      ytd: 'Year to Date',
      last_30_days: 'Last 30 Days',
      last_90_days: 'Last 90 Days'
    };
    return labels[period] || period;
  }
}

export default new DashboardAggregationService();
