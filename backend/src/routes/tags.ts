import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { tagService } from '../services/tag-service';
import { ValidationError, formatErrorResponse } from '../lib/errors';
import { logger } from '../lib/logger';

const createTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional()
});

const updateTagSchema = z.object({
  name: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional()
});

const tagPolicySetSchema = z.object({
  tagId: z.string()
});

export async function tagRoutes(fastify: FastifyInstance) {
  // Create a new tag
  fastify.post('/tags', async (request, reply) => {
    try {
      const body = createTagSchema.parse(request.body);
      const tag = await tagService.createTag(body.name, body.color, body.description);
      return reply.code(201).send(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError('Invalid request body', error.errors);
        return reply.code(validationError.statusCode).send(formatErrorResponse(validationError, request.url));
      }
      logger.error('Failed to create tag', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get all tags
  fastify.get('/tags', async (request, reply) => {
    try {
      const tags = await tagService.getTags();
      return reply.send(tags);
    } catch (error) {
      logger.error('Failed to fetch tags', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get a specific tag
  fastify.get<{ Params: { id: string } }>('/tags/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const tag = await tagService.getTag(id);
      return reply.send(tag);
    } catch (error) {
      logger.error('Failed to fetch tag', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update a tag
  fastify.put<{ Params: { id: string } }>('/tags/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const body = updateTagSchema.parse(request.body);
      const tag = await tagService.updateTag(id, body.name, body.color, body.description);
      return reply.send(tag);
    } catch (error) {
      logger.error('Failed to update tag', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete a tag
  fastify.delete<{ Params: { id: string } }>('/tags/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      await tagService.deleteTag(id);
      return reply.code(204).send();
    } catch (error) {
      logger.error('Failed to delete tag', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Tag a policy set
  fastify.post<{ Params: { id: string } }>('/policy-sets/:id/tags', async (request, reply) => {
    try {
      const { id } = request.params;
      const body = tagPolicySetSchema.parse(request.body);
      await tagService.tagPolicySet(id, body.tagId);
      return reply.code(201).send({ message: 'Policy set tagged successfully' });
    } catch (error) {
      logger.error('Failed to tag policy set', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Remove tag from policy set
  fastify.delete<{ Params: { id: string; tagId: string } }>('/policy-sets/:id/tags/:tagId', async (request, reply) => {
    try {
      const { id, tagId } = request.params;
      await tagService.untagPolicySet(id, tagId);
      return reply.code(204).send();
    } catch (error) {
      logger.error('Failed to untag policy set', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get tags for a policy set
  fastify.get<{ Params: { id: string } }>('/policy-sets/:id/tags', async (request, reply) => {
    try {
      const { id } = request.params;
      const tags = await tagService.getPolicySetTags(id);
      return reply.send(tags);
    } catch (error) {
      logger.error('Failed to fetch policy set tags', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Search policy sets by tags
  fastify.get<{ Querystring: { tags: string } }>('/policy-sets/search/by-tags', async (request, reply) => {
    try {
      const tagNames = request.query.tags.split(',').map(t => t.trim());
      const policySets = await tagService.getPolicySetsByTags(tagNames);
      return reply.send(policySets);
    } catch (error) {
      logger.error('Failed to search by tags', error as Error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
