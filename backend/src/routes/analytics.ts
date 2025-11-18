import { FastifyInstance } from 'fastify';
import { analyticsService } from '../services/analytics-service';
import { logger } from '../lib/logger';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Get system-wide analytics
  fastify.get<{ Querystring: { days?: string } }>('/analytics/summary', async (request, reply) => {
    try {
      const days = request.query.days ? parseInt(request.query.days, 10) : 7;
      const analytics = await analyticsService.getSystemAnalytics(days);
      return reply.send(analytics);
    } catch (error) {
      logger.error('Failed to fetch system analytics', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get metrics for a specific policy set
  fastify.get<{ Params: { id: string }; Querystring: { days?: string } }>('/analytics/policy-sets/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const days = request.query.days ? parseInt(request.query.days, 10) : 30;
      const metrics = await analyticsService.getPolicySetMetrics(id, days);
      return reply.send(metrics);
    } catch (error) {
      logger.error('Failed to fetch policy set metrics', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get evaluation trend for a policy set
  fastify.get<{ Params: { id: string }; Querystring: { days?: string } }>('/analytics/policy-sets/:id/trend', async (request, reply) => {
    try {
      const { id } = request.params;
      const days = request.query.days ? parseInt(request.query.days, 10) : 30;
      const trend = await analyticsService.getEvaluationTrend(id, days);
      return reply.send(trend);
    } catch (error) {
      logger.error('Failed to fetch evaluation trend', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Trigger metrics aggregation for a specific date
  fastify.post<{ Params: { id: string }; Body: { date: string } }>('/analytics/policy-sets/:id/aggregate', async (request, reply) => {
    try {
      const { id } = request.params;
      const date = new Date(request.body.date);
      const metrics = await analyticsService.aggregateMetricsForDate(id, date);
      return reply.send(metrics);
    } catch (error) {
      logger.error('Failed to aggregate metrics', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Trigger bulk aggregation for yesterday
  fastify.post('/analytics/aggregate-yesterday', async (request, reply) => {
    try {
      const results = await analyticsService.aggregateYesterdayMetrics();
      return reply.send({ aggregated: results.length, results });
    } catch (error) {
      logger.error('Failed to aggregate yesterday metrics', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
