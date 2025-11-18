import type {
  Condition,
  EvaluationContext,
  PolicyRule,
  EvaluationResult,
  MatchedRule,
  Decision
} from '../types/policy';

/**
 * Core policy evaluation engine
 * Evaluates a set of policy rules against a given context
 */
export class PolicyEvaluator {
  /**
   * Evaluates a list of policy rules against the provided context
   * Returns DENY if any DENY rule matches, otherwise ALLOW if any ALLOW rule matches
   * Default is DENY (fail-closed)
   */
  evaluate(rules: PolicyRule[], context: EvaluationContext): EvaluationResult {
    // Sort rules by priority (higher priority first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    const matchedRules: MatchedRule[] = [];

    // Evaluate each rule
    for (const rule of sortedRules) {
      const matches = this.evaluateCondition(rule.conditionJson, context);

      if (matches) {
        matchedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          effect: rule.effect,
          priority: rule.priority
        });
      }
    }

    // Decision logic: DENY takes precedence
    const decision = this.determineDecision(matchedRules);

    return {
      decision,
      matchedRules,
      evaluatedAt: new Date()
    };
  }

  /**
   * Determines the final decision based on matched rules
   * - If any DENY rule matched, return DENY
   * - If any ALLOW rule matched, return ALLOW
   * - Otherwise, return DENY (default deny)
   */
  private determineDecision(matchedRules: MatchedRule[]): Decision {
    if (matchedRules.length === 0) {
      return 'DENY'; // Default deny
    }

    // DENY takes precedence
    const hasDeny = matchedRules.some(rule => rule.effect === 'DENY');
    if (hasDeny) {
      return 'DENY';
    }

    // If we have ALLOW rules and no DENY, allow
    const hasAllow = matchedRules.some(rule => rule.effect === 'ALLOW');
    if (hasAllow) {
      return 'ALLOW';
    }

    return 'DENY'; // Fallback
  }

  /**
   * Evaluates a condition tree against the context
   */
  private evaluateCondition(condition: Condition, context: EvaluationContext): boolean {
    // Handle logical operators
    if ('all' in condition) {
      return condition.all.every(c => this.evaluateCondition(c, context));
    }

    if ('any' in condition) {
      return condition.any.some(c => this.evaluateCondition(c, context));
    }

    if ('not' in condition) {
      return !this.evaluateCondition(condition.not, context);
    }

    // Handle comparison operators
    if ('equals' in condition) {
      const [path, value] = condition.equals;
      return this.getValueByPath(context, path) === value;
    }

    if ('notEquals' in condition) {
      const [path, value] = condition.notEquals;
      return this.getValueByPath(context, path) !== value;
    }

    if ('in' in condition) {
      const [path, values] = condition.in;
      const contextValue = this.getValueByPath(context, path);
      return values.includes(contextValue);
    }

    if ('notIn' in condition) {
      const [path, values] = condition.notIn;
      const contextValue = this.getValueByPath(context, path);
      return !values.includes(contextValue);
    }

    if ('contains' in condition) {
      const [path, substring] = condition.contains;
      const contextValue = this.getValueByPath(context, path);
      return typeof contextValue === 'string' && contextValue.includes(substring);
    }

    if ('startsWith' in condition) {
      const [path, prefix] = condition.startsWith;
      const contextValue = this.getValueByPath(context, path);
      return typeof contextValue === 'string' && contextValue.startsWith(prefix);
    }

    if ('endsWith' in condition) {
      const [path, suffix] = condition.endsWith;
      const contextValue = this.getValueByPath(context, path);
      return typeof contextValue === 'string' && contextValue.endsWith(suffix);
    }

    if ('greaterThan' in condition) {
      const [path, value] = condition.greaterThan;
      const contextValue = this.getValueByPath(context, path);
      return typeof contextValue === 'number' && contextValue > value;
    }

    if ('lessThan' in condition) {
      const [path, value] = condition.lessThan;
      const contextValue = this.getValueByPath(context, path);
      return typeof contextValue === 'number' && contextValue < value;
    }

    if ('greaterThanOrEqual' in condition) {
      const [path, value] = condition.greaterThanOrEqual;
      const contextValue = this.getValueByPath(context, path);
      return typeof contextValue === 'number' && contextValue >= value;
    }

    if ('lessThanOrEqual' in condition) {
      const [path, value] = condition.lessThanOrEqual;
      const contextValue = this.getValueByPath(context, path);
      return typeof contextValue === 'number' && contextValue <= value;
    }

    // Unknown condition type
    return false;
  }

  /**
   * Retrieves a value from the context using dot notation path
   * e.g., "user.role" -> context.user.role
   */
  private getValueByPath(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
