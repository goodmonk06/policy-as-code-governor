import Fastify from 'fastify';
import cors from '@fastify/cors';
import { policySetRoutes } from './routes/policy-sets';
import { versionRoutes } from './routes/versions';
import { tagRoutes } from './routes/tags';
import { analyticsRoutes } from './routes/analytics';
import { logger } from './lib/logger';
import { PolicyEngineError, formatErrorResponse } from './lib/errors';
import { metrics } from './lib/metrics';

const PORT = parseInt(process.env.BACKEND_PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: false // We use our own logger
});

async function start() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: true, // Allow all origins in development
      credentials: true
    });

    // Global error handler
    fastify.setErrorHandler((error, request, reply) => {
      if (error instanceof PolicyEngineError) {
        logger.warn('Policy engine error', {
          code: error.code,
          message: error.message,
          path: request.url
        });
        return reply.code(error.statusCode).send(formatErrorResponse(error, request.url));
      }

      // Unhandled errors
      logger.error('Unhandled error', error, {
        path: request.url,
        method: request.method
      });

      metrics.recordCounter('unhandled_error', 1);

      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      });
    });

    // Request logging
    fastify.addHook('onRequest', async (request) => {
      logger.info('Incoming request', {
        method: request.method,
        url: request.url,
        ip: request.ip
      });
    });

    // Response logging and metrics
    fastify.addHook('onResponse', async (request, reply) => {
      const duration = reply.getResponseTime();
      metrics.recordHistogram('http.request.duration_ms', duration, {
        method: request.method,
        status: reply.statusCode
      });
      metrics.recordCounter('http.request.total', 1, {
        method: request.method,
        status: reply.statusCode
      });

      logger.info('Request completed', {
        method: request.method,
        url: request.url,
        status: reply.statusCode,
        durationMs: Math.round(duration)
      });
    });

    // Health check endpoint
    fastify.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };
    });

    // Metrics endpoint
    fastify.get('/metrics', async () => {
      return {
        metrics: metrics.getMetrics().slice(-100), // Last 100 metrics
        stats: {
          evaluationDuration: metrics.getStats('policy.evaluation.duration_ms'),
          requestDuration: metrics.getStats('http.request.duration_ms')
        }
      };
    });

    // Register routes
    await fastify.register(policySetRoutes);
    await fastify.register(versionRoutes);
    await fastify.register(tagRoutes);
    await fastify.register(analyticsRoutes);

    // Start server
    await fastify.listen({ port: PORT, host: HOST });

    logger.info('Policy-as-Code API started', {
      host: HOST,
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });

    console.log(`🚀 Policy-as-Code API is running on http://${HOST}:${PORT}`);
    console.log(`📚 Health check: http://${HOST}:${PORT}/health`);
    console.log(`📊 Metrics: http://${HOST}:${PORT}/metrics`);
  } catch (err) {
    logger.error('Failed to start server', err as Error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

start();
