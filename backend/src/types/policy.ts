// Policy evaluation types

export type RuleEffect = 'ALLOW' | 'DENY';
export type Decision = 'ALLOW' | 'DENY';

// Context structure for policy evaluation
export interface EvaluationContext {
  user?: {
    id?: string;
    role?: string;
    department?: string;
    [key: string]: unknown;
  };
  action?: string;
  resource?: {
    type?: string;
    id?: string;
    owner?: string;
    [key: string]: unknown;
  };
  environment?: {
    time?: string;
    ip?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Condition operators
export type Condition =
  | { equals: [string, unknown] }
  | { notEquals: [string, unknown] }
  | { in: [string, unknown[]] }
  | { notIn: [string, unknown[]] }
  | { contains: [string, string] }
  | { startsWith: [string, string] }
  | { endsWith: [string, string] }
  | { greaterThan: [string, number] }
  | { lessThan: [string, number] }
  | { greaterThanOrEqual: [string, number] }
  | { lessThanOrEqual: [string, number] }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

// Evaluation result
export interface EvaluationResult {
  decision: Decision;
  matchedRules: MatchedRule[];
  evaluatedAt: Date;
}

export interface MatchedRule {
  ruleId: string;
  ruleName: string;
  effect: RuleEffect;
  priority: number;
}

// Policy rule structure
export interface PolicyRule {
  id: string;
  name: string;
  effect: RuleEffect;
  conditionJson: Condition;
  priority: number;
}
