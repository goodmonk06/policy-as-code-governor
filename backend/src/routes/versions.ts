import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { versionService } from '../services/version-service';
import { ValidationError, formatErrorResponse } from '../lib/errors';
import { logger } from '../lib/logger';

const createVersionSchema = z.object({
  changeDescription: z.string().optional(),
  createdBy: z.string().optional()
});

const rollbackSchema = z.object({
  userId: z.string().optional()
});

export async function versionRoutes(fastify: FastifyInstance) {
  // Get all versions for a policy set
  fastify.get<{ Params: { id: string } }>('/policy-sets/:id/versions', async (request, reply) => {
    try {
      const { id } = request.params;
      const versions = await versionService.getVersions(id);
      return reply.send(versions);
    } catch (error) {
      logger.error('Failed to fetch versions', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create a new version
  fastify.post<{ Params: { id: string } }>('/policy-sets/:id/versions', async (request, reply) => {
    try {
      const { id } = request.params;
      const body = createVersionSchema.parse(request.body);

      const version = await versionService.createVersion(id, body.changeDescription, body.createdBy);
      return reply.code(201).send(version);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError('Invalid request body', error.errors);
        return reply.code(validationError.statusCode).send(formatErrorResponse(validationError, request.url));
      }
      logger.error('Failed to create version', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get a specific version
  fastify.get<{ Params: { id: string; version: string } }>('/policy-sets/:id/versions/:version', async (request, reply) => {
    try {
      const { id, version } = request.params;
      const versionData = await versionService.getVersion(id, parseInt(version, 10));
      return reply.send(versionData);
    } catch (error) {
      logger.error('Failed to fetch version', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Rollback to a version
  fastify.post<{ Params: { id: string; version: string } }>('/policy-sets/:id/rollback/:version', async (request, reply) => {
    try {
      const { id, version } = request.params;
      const body = rollbackSchema.parse(request.body);

      const result = await versionService.rollbackToVersion(id, parseInt(version, 10), body.userId);
      return reply.send(result);
    } catch (error) {
      logger.error('Failed to rollback version', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Compare two versions
  fastify.get<{ Params: { id: string }; Querystring: { v1: string; v2: string } }>('/policy-sets/:id/versions/compare', async (request, reply) => {
    try {
      const { id } = request.params;
      const { v1, v2 } = request.query;

      const comparison = await versionService.compareVersions(id, parseInt(v1, 10), parseInt(v2, 10));
      return reply.send(comparison);
    } catch (error) {
      logger.error('Failed to compare versions', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
