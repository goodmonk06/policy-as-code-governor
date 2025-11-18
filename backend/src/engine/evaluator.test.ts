import { describe, it, expect } from '@jest/globals';
import { PolicyEvaluator } from './evaluator';
import type { PolicyRule, EvaluationContext } from '../types/policy';

describe('PolicyEvaluator', () => {
  const evaluator = new PolicyEvaluator();

  describe('Basic condition evaluation', () => {
    it('should evaluate equals condition correctly', () => {
      const rules: PolicyRule[] = [{
        id: '1',
        name: 'Admin rule',
        effect: 'ALLOW',
        priority: 10,
        conditionJson: { equals: ['user.role', 'admin'] }
      }];

      const context: EvaluationContext = {
        user: { role: 'admin' }
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('ALLOW');
      expect(result.matchedRules).toHaveLength(1);
    });

    it('should evaluate in condition correctly', () => {
      const rules: PolicyRule[] = [{
        id: '1',
        name: 'Multi-role rule',
        effect: 'ALLOW',
        priority: 10,
        conditionJson: { in: ['user.role', ['admin', 'moderator', 'staff']] }
      }];

      const context: EvaluationContext = {
        user: { role: 'moderator' }
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('ALLOW');
    });

    it('should evaluate contains condition correctly', () => {
      const rules: PolicyRule[] = [{
        id: '1',
        name: 'Email domain rule',
        effect: 'ALLOW',
        priority: 10,
        conditionJson: { contains: ['user.email', '@company.com'] }
      }];

      const context: EvaluationContext = {
        user: { email: 'user@company.com' }
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('ALLOW');
    });

    it('should evaluate numeric comparisons correctly', () => {
      const rules: PolicyRule[] = [{
        id: '1',
        name: 'Experience rule',
        effect: 'ALLOW',
        priority: 10,
        conditionJson: { greaterThanOrEqual: ['user.experience', 5] }
      }];

      const context: EvaluationContext = {
        user: { experience: 7 }
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('ALLOW');
    });
  });

  describe('Logical operators', () => {
    it('should evaluate all (AND) operator correctly', () => {
      const rules: PolicyRule[] = [{
        id: '1',
        name: 'Admin AND delete',
        effect: 'ALLOW',
        priority: 10,
        conditionJson: {
          all: [
            { equals: ['user.role', 'admin'] },
            { equals: ['action', 'delete'] }
          ]
        }
      }];

      const context: EvaluationContext = {
        user: { role: 'admin' },
        action: 'delete'
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('ALLOW');

      // Test with one condition failing
      const context2: EvaluationContext = {
        user: { role: 'admin' },
        action: 'view'
      };

      const result2 = evaluator.evaluate(rules, context2);
      expect(result2.decision).toBe('DENY');
    });

    it('should evaluate any (OR) operator correctly', () => {
      const rules: PolicyRule[] = [{
        id: '1',
        name: 'Admin OR moderator',
        effect: 'ALLOW',
        priority: 10,
        conditionJson: {
          any: [
            { equals: ['user.role', 'admin'] },
            { equals: ['user.role', 'moderator'] }
          ]
        }
      }];

      const context: EvaluationContext = {
        user: { role: 'moderator' }
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('ALLOW');
    });

    it('should evaluate not operator correctly', () => {
      const rules: PolicyRule[] = [{
        id: '1',
        name: 'Not suspended',
        effect: 'ALLOW',
        priority: 10,
        conditionJson: {
          not: { equals: ['user.status', 'suspended'] }
        }
      }];

      const context: EvaluationContext = {
        user: { status: 'active' }
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('ALLOW');

      const context2: EvaluationContext = {
        user: { status: 'suspended' }
      };

      const result2 = evaluator.evaluate(rules, context2);
      expect(result2.decision).toBe('DENY');
    });
  });

  describe('Decision logic', () => {
    it('should return DENY when no rules match', () => {
      const rules: PolicyRule[] = [{
        id: '1',
        name: 'Admin only',
        effect: 'ALLOW',
        priority: 10,
        conditionJson: { equals: ['user.role', 'admin'] }
      }];

      const context: EvaluationContext = {
        user: { role: 'guest' }
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('DENY');
      expect(result.matchedRules).toHaveLength(0);
    });

    it('should prioritize DENY over ALLOW', () => {
      const rules: PolicyRule[] = [
        {
          id: '1',
          name: 'Allow all',
          effect: 'ALLOW',
          priority: 50,
          conditionJson: { equals: ['user.role', 'staff'] }
        },
        {
          id: '2',
          name: 'Deny delete',
          effect: 'DENY',
          priority: 100,
          conditionJson: {
            all: [
              { equals: ['user.role', 'staff'] },
              { equals: ['action', 'delete'] }
            ]
          }
        }
      ];

      const context: EvaluationContext = {
        user: { role: 'staff' },
        action: 'delete'
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('DENY');
      expect(result.matchedRules).toHaveLength(2);
    });

    it('should evaluate rules by priority order', () => {
      const rules: PolicyRule[] = [
        {
          id: '1',
          name: 'Low priority',
          effect: 'DENY',
          priority: 10,
          conditionJson: { equals: ['user.role', 'admin'] }
        },
        {
          id: '2',
          name: 'High priority',
          effect: 'ALLOW',
          priority: 100,
          conditionJson: { equals: ['user.role', 'admin'] }
        }
      ];

      const context: EvaluationContext = {
        user: { role: 'admin' }
      };

      const result = evaluator.evaluate(rules, context);
      // Both rules match, but DENY takes precedence
      expect(result.decision).toBe('DENY');
    });
  });

  describe('Complex nested conditions', () => {
    it('should evaluate deeply nested conditions', () => {
      const rules: PolicyRule[] = [{
        id: '1',
        name: 'Complex rule',
        effect: 'ALLOW',
        priority: 10,
        conditionJson: {
          all: [
            { equals: ['user.role', 'staff'] },
            {
              any: [
                { equals: ['user.certified', true] },
                { greaterThanOrEqual: ['user.experience', 5] }
              ]
            },
            {
              not: {
                equals: ['user.status', 'probation']
              }
            }
          ]
        }
      }];

      const context: EvaluationContext = {
        user: {
          role: 'staff',
          certified: false,
          experience: 7,
          status: 'active'
        }
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('ALLOW');
    });
  });

  describe('Path traversal', () => {
    it('should handle nested object paths', () => {
      const rules: PolicyRule[] = [{
        id: '1',
        name: 'Nested path',
        effect: 'ALLOW',
        priority: 10,
        conditionJson: { equals: ['resource.metadata.owner', 'user123'] }
      }];

      const context: EvaluationContext = {
        resource: {
          metadata: {
            owner: 'user123'
          }
        }
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('ALLOW');
    });

    it('should return undefined for non-existent paths', () => {
      const rules: PolicyRule[] = [{
        id: '1',
        name: 'Non-existent path',
        effect: 'ALLOW',
        priority: 10,
        conditionJson: { equals: ['nonexistent.path', 'value'] }
      }];

      const context: EvaluationContext = {
        user: { role: 'admin' }
      };

      const result = evaluator.evaluate(rules, context);
      expect(result.decision).toBe('DENY');
    });
  });

  describe('Result structure', () => {
    it('should return correct result structure', () => {
      const rules: PolicyRule[] = [{
        id: 'rule-123',
        name: 'Test rule',
        effect: 'ALLOW',
        priority: 50,
        conditionJson: { equals: ['user.role', 'admin'] }
      }];

      const context: EvaluationContext = {
        user: { role: 'admin' }
      };

      const result = evaluator.evaluate(rules, context);

      expect(result).toHaveProperty('decision');
      expect(result).toHaveProperty('matchedRules');
      expect(result).toHaveProperty('evaluatedAt');
      expect(result.evaluatedAt).toBeInstanceOf(Date);

      expect(result.matchedRules[0]).toHaveProperty('ruleId', 'rule-123');
      expect(result.matchedRules[0]).toHaveProperty('ruleName', 'Test rule');
      expect(result.matchedRules[0]).toHaveProperty('effect', 'ALLOW');
      expect(result.matchedRules[0]).toHaveProperty('priority', 50);
    });
  });
});
