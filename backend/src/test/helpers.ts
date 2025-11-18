/**
 * Test utilities and helpers
 */

import type { PolicyRule, EvaluationContext } from '../types/policy';

export function createMockRule(overrides: Partial<PolicyRule> = {}): PolicyRule {
  return {
    id: 'test-rule-id',
    name: 'Test Rule',
    effect: 'ALLOW',
    priority: 10,
    conditionJson: { equals: ['user.role', 'admin'] },
    ...overrides
  };
}

export function createMockContext(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  return {
    user: {
      id: 'user-123',
      role: 'admin',
      department: 'engineering'
    },
    action: 'view',
    resource: {
      type: 'document',
      id: 'doc-456'
    },
    ...overrides
  };
}

export function createAdminContext(): EvaluationContext {
  return {
    user: {
      id: 'admin-123',
      role: 'admin',
      email: 'admin@company.com'
    },
    action: 'manage',
    resource: { type: 'system' }
  };
}

export function createStaffContext(): EvaluationContext {
  return {
    user: {
      id: 'staff-123',
      role: 'staff',
      department: 'operations',
      email: 'staff@company.com'
    },
    action: 'view',
    resource: { type: 'document' }
  };
}

export function createGuestContext(): EvaluationContext {
  return {
    user: {
      id: 'guest-123',
      role: 'guest'
    },
    action: 'view',
    resource: { type: 'public-document' }
  };
}
