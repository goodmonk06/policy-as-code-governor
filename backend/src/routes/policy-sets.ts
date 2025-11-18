import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { PolicyEvaluator } from '../engine/evaluator';
import type { EvaluationContext, Condition } from '../types/policy';

const prisma = new PrismaClient();
const evaluator = new PolicyEvaluator();

// Validation schemas
const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ equals: z.tuple([z.string(), z.unknown()]) }),
    z.object({ notEquals: z.tuple([z.string(), z.unknown()]) }),
    z.object({ in: z.tuple([z.string(), z.array(z.unknown())]) }),
    z.object({ notIn: z.tuple([z.string(), z.array(z.unknown())]) }),
    z.object({ contains: z.tuple([z.string(), z.string()]) }),
    z.object({ startsWith: z.tuple([z.string(), z.string()]) }),
    z.object({ endsWith: z.tuple([z.string(), z.string()]) }),
    z.object({ greaterThan: z.tuple([z.string(), z.number()]) }),
    z.object({ lessThan: z.tuple([z.string(), z.number()]) }),
    z.object({ greaterThanOrEqual: z.tuple([z.string(), z.number()]) }),
    z.object({ lessThanOrEqual: z.tuple([z.string(), z.number()]) }),
    z.object({ all: z.array(conditionSchema) }),
    z.object({ any: z.array(conditionSchema) }),
    z.object({ not: conditionSchema })
  ])
);

const policyRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  effect: z.enum(['ALLOW', 'DENY']),
  conditionJson: conditionSchema,
  priority: z.number().default(0)
});

const createPolicySetSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  rules: z.array(policyRuleSchema)
});

const updatePolicySetSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  rules: z.array(policyRuleSchema).optional()
});

const evaluateSchema = z.object({
  context: z.record(z.unknown())
});

export async function policySetRoutes(fastify: FastifyInstance) {
  // Create a new PolicySet with rules
  fastify.post('/policy-sets', async (request, reply) => {
    try {
      const body = createPolicySetSchema.parse(request.body);

      const policySet = await prisma.policySet.create({
        data: {
          name: body.name,
          description: body.description,
          rules: {
            create: body.rules.map(rule => ({
              name: rule.name,
              description: rule.description,
              effect: rule.effect,
              conditionJson: rule.conditionJson as object,
              priority: rule.priority
            }))
          }
        },
        include: {
          rules: true
        }
      });

      return reply.code(201).send(policySet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get all PolicySets
  fastify.get('/policy-sets', async (request, reply) => {
    try {
      const policySets = await prisma.policySet.findMany({
        include: {
          rules: true,
          _count: {
            select: { evaluationLogs: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return reply.send(policySets);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get a specific PolicySet by ID
  fastify.get<{ Params: { id: string } }>('/policy-sets/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const policySet = await prisma.policySet.findUnique({
        where: { id },
        include: {
          rules: {
            orderBy: {
              priority: 'desc'
            }
          },
          _count: {
            select: { evaluationLogs: true }
          }
        }
      });

      if (!policySet) {
        return reply.code(404).send({ error: 'PolicySet not found' });
      }

      return reply.send(policySet);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update a PolicySet
  fastify.put<{ Params: { id: string } }>('/policy-sets/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const body = updatePolicySetSchema.parse(request.body);

      // Check if policy set exists
      const existing = await prisma.policySet.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: 'PolicySet not found' });
      }

      // Update policy set and rules
      const policySet = await prisma.$transaction(async (tx) => {
        // Update basic info
        const updated = await tx.policySet.update({
          where: { id },
          data: {
            name: body.name,
            description: body.description
          }
        });

        // If rules are provided, replace them
        if (body.rules) {
          // Delete existing rules
          await tx.policyRule.deleteMany({
            where: { policySetId: id }
          });

          // Create new rules
          await tx.policyRule.createMany({
            data: body.rules.map(rule => ({
              policySetId: id,
              name: rule.name,
              description: rule.description,
              effect: rule.effect,
              conditionJson: rule.conditionJson as object,
              priority: rule.priority
            }))
          });
        }

        // Return updated policy set with rules
        return tx.policySet.findUnique({
          where: { id },
          include: { rules: true }
        });
      });

      return reply.send(policySet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete a PolicySet
  fastify.delete<{ Params: { id: string } }>('/policy-sets/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      await prisma.policySet.delete({
        where: { id }
      });

      return reply.code(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Evaluate a PolicySet against a context
  fastify.post<{ Params: { id: string } }>('/policy-sets/:id/evaluate', async (request, reply) => {
    try {
      const { id } = request.params;
      const body = evaluateSchema.parse(request.body);

      // Fetch policy set with rules
      const policySet = await prisma.policySet.findUnique({
        where: { id },
        include: {
          rules: true
        }
      });

      if (!policySet) {
        return reply.code(404).send({ error: 'PolicySet not found' });
      }

      // Convert Prisma rules to PolicyRule format
      const rules = policySet.rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        effect: rule.effect as 'ALLOW' | 'DENY',
        conditionJson: rule.conditionJson as Condition,
        priority: rule.priority
      }));

      // Evaluate
      const result = evaluator.evaluate(rules, body.context as EvaluationContext);

      // Log the evaluation
      await prisma.evaluationLog.create({
        data: {
          policySetId: id,
          inputJson: body.context,
          resultJson: result as object,
          decision: result.decision
        }
      });

      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get evaluation logs for a PolicySet
  fastify.get<{ Params: { id: string } }>('/policy-sets/:id/logs', async (request, reply) => {
    try {
      const { id } = request.params;

      const logs = await prisma.evaluationLog.findMany({
        where: { policySetId: id },
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit to last 100 logs
      });

      return reply.send(logs);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
