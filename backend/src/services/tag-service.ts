/**
 * Tag management service
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import { NotFoundError, ConflictError } from '../lib/errors';
import { eventBus } from '../lib/events/event-bus';

const prisma = new PrismaClient();

export class TagService {
  /**
   * Create a new tag
   */
  async createTag(name: string, color?: string, description?: string) {
    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictError(`Tag with name '${name}' already exists`);
    }

    const tag = await prisma.tag.create({
      data: { name, color, description }
    });

    logger.info('Tag created', { tagId: tag.id, name });

    await eventBus.emit({
      type: 'tag.created',
      tagId: tag.id,
      name,
      timestamp: new Date()
    });

    return tag;
  }

  /**
   * Get all tags
   */
  async getTags() {
    return prisma.tag.findMany({
      include: {
        _count: {
          select: { policySets: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get a specific tag
   */
  async getTag(id: string) {
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        policySets: {
          include: {
            policySet: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    });

    if (!tag) {
      throw new NotFoundError('Tag', id);
    }

    return tag;
  }

  /**
   * Update a tag
   */
  async updateTag(id: string, name?: string, color?: string, description?: string) {
    const tag = await prisma.tag.update({
      where: { id },
      data: { name, color, description }
    });

    logger.info('Tag updated', { tagId: id });
    return tag;
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string) {
    await prisma.tag.delete({ where: { id } });
    logger.info('Tag deleted', { tagId: id });
  }

  /**
   * Tag a policy set
   */
  async tagPolicySet(policySetId: string, tagId: string) {
    // Verify both exist
    const [policySet, tag] = await Promise.all([
      prisma.policySet.findUnique({ where: { id: policySetId } }),
      prisma.tag.findUnique({ where: { id: tagId } })
    ]);

    if (!policySet) {
      throw new NotFoundError('PolicySet', policySetId);
    }

    if (!tag) {
      throw new NotFoundError('Tag', tagId);
    }

    // Check if already tagged
    const existing = await prisma.policySetTag.findUnique({
      where: {
        policySetId_tagId: { policySetId, tagId }
      }
    });

    if (existing) {
      throw new ConflictError('Policy set is already tagged with this tag');
    }

    await prisma.policySetTag.create({
      data: { policySetId, tagId }
    });

    logger.info('Policy set tagged', { policySetId, tagId });

    await eventBus.emit({
      type: 'policy_set.tagged',
      policySetId,
      tagId,
      timestamp: new Date()
    });
  }

  /**
   * Remove a tag from a policy set
   */
  async untagPolicySet(policySetId: string, tagId: string) {
    await prisma.policySetTag.delete({
      where: {
        policySetId_tagId: { policySetId, tagId }
      }
    });

    logger.info('Policy set untagged', { policySetId, tagId });
  }

  /**
   * Get policy sets by tags
   */
  async getPolicySetsByTags(tagNames: string[]) {
    return prisma.policySet.findMany({
      where: {
        tags: {
          some: {
            tag: {
              name: {
                in: tagNames
              }
            }
          }
        }
      },
      include: {
        rules: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });
  }

  /**
   * Get tags for a policy set
   */
  async getPolicySetTags(policySetId: string) {
    const tags = await prisma.policySetTag.findMany({
      where: { policySetId },
      include: { tag: true }
    });

    return tags.map(pt => pt.tag);
  }
}

export const tagService = new TagService();
