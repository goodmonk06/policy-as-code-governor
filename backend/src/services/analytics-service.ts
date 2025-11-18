/**
 * Analytics and metrics aggregation service
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

export class AnalyticsService {
  /**
   * Aggregate evaluation metrics for a specific date
   */
  async aggregateMetricsForDate(policySetId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all evaluations for this policy set on this date
    const logs = await prisma.evaluationLog.findMany({
      where: {
        policySetId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        decision: true,
        durationMs: true,
        errorMessage: true
      }
    });

    if (logs.length === 0) {
      return null;
    }

    const allowCount = logs.filter(l => l.decision === 'ALLOW').length;
    const denyCount = logs.filter(l => l.decision === 'DENY').length;
    const errorCount = logs.filter(l => l.errorMessage != null).length;

    const durations = logs
      .filter(l => l.durationMs != null)
      .map(l => l.durationMs!);

    const avgDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;

    const minDurationMs = durations.length > 0 ? Math.min(...durations) : null;
    const maxDurationMs = durations.length > 0 ? Math.max(...durations) : null;

    // Upsert metrics
    const metrics = await prisma.evaluationMetrics.upsert({
      where: {
        policySetId_date: {
          policySetId,
          date: startOfDay
        }
      },
      create: {
        policySetId,
        date: startOfDay,
        totalEvaluations: logs.length,
        allowCount,
        denyCount,
        errorCount,
        avgDurationMs,
        minDurationMs,
        maxDurationMs
      },
      update: {
        totalEvaluations: logs.length,
        allowCount,
        denyCount,
        errorCount,
        avgDurationMs,
        minDurationMs,
        maxDurationMs
      }
    });

    logger.info('Metrics aggregated', {
      policySetId,
      date: startOfDay.toISOString(),
      total: logs.length
    });

    return metrics;
  }

  /**
   * Get metrics summary for a policy set
   */
  async getPolicySetMetrics(policySetId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const metrics = await prisma.evaluationMetrics.findMany({
      where: {
        policySetId,
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    });

    const totals = metrics.reduce(
      (acc, m) => ({
        totalEvaluations: acc.totalEvaluations + m.totalEvaluations,
        allowCount: acc.allowCount + m.allowCount,
        denyCount: acc.denyCount + m.denyCount,
        errorCount: acc.errorCount + m.errorCount
      }),
      { totalEvaluations: 0, allowCount: 0, denyCount: 0, errorCount: 0 }
    );

    return {
      policySetId,
      period: { days, startDate },
      totals,
      dailyMetrics: metrics
    };
  }

  /**
   * Get overall system analytics
   */
  async getSystemAnalytics(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const [
      totalPolicySets,
      activePolicySets,
      totalRules,
      recentEvaluations,
      topPolicySets
    ] = await Promise.all([
      prisma.policySet.count(),
      prisma.policySet.count({ where: { isActive: true } }),
      prisma.policyRule.count({ where: { isEnabled: true } }),
      prisma.evaluationLog.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.evaluationLog.groupBy({
        by: ['policySetId'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      })
    ]);

    // Enrich top policy sets with names
    const enrichedTopPolicySets = await Promise.all(
      topPolicySets.map(async (item) => {
        const policySet = await prisma.policySet.findUnique({
          where: { id: item.policySetId },
          select: { id: true, name: true }
        });
        return {
          ...policySet,
          evaluationCount: item._count.id
        };
      })
    );

    // Get decision distribution
    const decisionCounts = await prisma.evaluationLog.groupBy({
      by: ['decision'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true }
    });

    return {
      period: { days, startDate },
      totals: {
        policySets: totalPolicySets,
        activePolicySets,
        rules: totalRules,
        recentEvaluations
      },
      topPolicySets: enrichedTopPolicySets,
      decisionDistribution: decisionCounts.map(d => ({
        decision: d.decision,
        count: d._count.id
      }))
    };
  }

  /**
   * Get evaluation trend data
   */
  async getEvaluationTrend(policySetId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const metrics = await prisma.evaluationMetrics.findMany({
      where: {
        policySetId,
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    });

    return metrics.map(m => ({
      date: m.date,
      total: m.totalEvaluations,
      allow: m.allowCount,
      deny: m.denyCount,
      errors: m.errorCount,
      avgDuration: m.avgDurationMs
    }));
  }

  /**
   * Aggregate metrics for all policy sets for yesterday
   * (This would typically be run as a cron job)
   */
  async aggregateYesterdayMetrics() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const policySets = await prisma.policySet.findMany({
      select: { id: true }
    });

    const results = [];
    for (const ps of policySets) {
      try {
        const metrics = await this.aggregateMetricsForDate(ps.id, yesterday);
        if (metrics) {
          results.push(metrics);
        }
      } catch (error) {
        logger.error('Failed to aggregate metrics', error as Error, {
          policySetId: ps.id
        });
      }
    }

    logger.info('Bulk metrics aggregation completed', {
      date: yesterday.toISOString(),
      aggregated: results.length
    });

    return results;
  }
}

export const analyticsService = new AnalyticsService();
