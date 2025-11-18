/**
 * Policy versioning service
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import { NotFoundError } from '../lib/errors';
import { eventBus } from '../lib/events/event-bus';

const prisma = new PrismaClient();

export class PolicyVersionService {
  /**
   * Create a new version snapshot of a policy set
   */
  async createVersion(policySetId: string, changeDescription?: string, createdBy?: string): Promise<unknown> {
    const policySet = await prisma.policySet.findUnique({
      where: { id: policySetId },
      include: { rules: true }
    });

    if (!policySet) {
      throw new NotFoundError('PolicySet', policySetId);
    }

    // Get the current version number
    const latestVersion = await prisma.policyVersion.findFirst({
      where: { policySetId },
      orderBy: { versionNumber: 'desc' }
    });

    const versionNumber = (latestVersion?.versionNumber || 0) + 1;

    const version = await prisma.policyVersion.create({
      data: {
        policySetId,
        versionNumber,
        name: policySet.name,
        description: policySet.description,
        rulesSnapshot: policySet.rules as unknown as object,
        changeDescription,
        createdBy
      }
    });

    logger.info('Policy version created', {
      policySetId,
      versionNumber,
      rulesCount: policySet.rules.length
    });

    await eventBus.emit({
      type: 'policy_set.version_created',
      policySetId,
      versionNumber,
      timestamp: new Date()
    });

    return version;
  }

  /**
   * Get all versions of a policy set
   */
  async getVersions(policySetId: string) {
    return prisma.policyVersion.findMany({
      where: { policySetId },
      orderBy: { versionNumber: 'desc' }
    });
  }

  /**
   * Get a specific version
   */
  async getVersion(policySetId: string, versionNumber: number) {
    const version = await prisma.policyVersion.findUnique({
      where: {
        policySetId_versionNumber: { policySetId, versionNumber }
      }
    });

    if (!version) {
      throw new NotFoundError('PolicyVersion', `${policySetId}:${versionNumber}`);
    }

    return version;
  }

  /**
   * Rollback policy set to a specific version
   */
  async rollbackToVersion(policySetId: string, versionNumber: number, userId?: string) {
    const version = await this.getVersion(policySetId, versionNumber);
    const rulesSnapshot = version.rulesSnapshot as Array<{
      name: string;
      description?: string;
      effect: string;
      conditionJson: unknown;
      priority: number;
      isEnabled?: boolean;
    }>;

    // Update the policy set with the historical rules
    await prisma.$transaction(async (tx) => {
      // Delete current rules
      await tx.policyRule.deleteMany({
        where: { policySetId }
      });

      // Recreate rules from snapshot
      await tx.policyRule.createMany({
        data: rulesSnapshot.map(rule => ({
          policySetId,
          name: rule.name,
          description: rule.description,
          effect: rule.effect as 'ALLOW' | 'DENY',
          conditionJson: rule.conditionJson as object,
          priority: rule.priority,
          isEnabled: rule.isEnabled !== false
        }))
      });

      // Update policy set metadata
      await tx.policySet.update({
        where: { id: policySetId },
        data: {
          name: version.name,
          description: version.description
        }
      });
    });

    // Create a new version marking this as a rollback
    await this.createVersion(
      policySetId,
      `Rolled back to version ${versionNumber}`,
      userId
    );

    logger.info('Policy set rolled back', {
      policySetId,
      targetVersion: versionNumber,
      userId
    });

    return version;
  }

  /**
   * Compare two versions
   */
  async compareVersions(policySetId: string, versionA: number, versionB: number) {
    const [v1, v2] = await Promise.all([
      this.getVersion(policySetId, versionA),
      this.getVersion(policySetId, versionB)
    ]);

    const rulesA = v1.rulesSnapshot as Array<{ name: string; effect: string }>;
    const rulesB = v2.rulesSnapshot as Array<{ name: string; effect: string }>;

    const added = rulesB.filter(
      rb => !rulesA.some(ra => ra.name === rb.name)
    );

    const removed = rulesA.filter(
      ra => !rulesB.some(rb => rb.name === ra.name)
    );

    const modified = rulesB.filter(rb => {
      const matchingA = rulesA.find(ra => ra.name === rb.name);
      return matchingA && JSON.stringify(matchingA) !== JSON.stringify(rb);
    });

    return {
      versionA: v1,
      versionB: v2,
      changes: {
        added,
        removed,
        modified
      }
    };
  }
}

export const versionService = new PolicyVersionService();
