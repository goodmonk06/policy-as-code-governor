/**
 * Adapter interface definitions for extensibility
 */

import type { EvaluationContext, EvaluationResult } from '../../types/policy';

// Notification adapter for alerting on policy events
export interface INotificationAdapter {
  sendAlert(message: string, severity: 'info' | 'warning' | 'error', metadata?: Record<string, unknown>): Promise<void>;
  sendPolicyViolation(policySetId: string, context: EvaluationContext, decision: string): Promise<void>;
}

// Metrics adapter for external metrics systems
export interface IMetricsAdapter {
  recordCounter(name: string, value: number, labels?: Record<string, string | number>): Promise<void>;
  recordGauge(name: string, value: number, labels?: Record<string, string | number>): Promise<void>;
  recordHistogram(name: string, value: number, labels?: Record<string, string | number>): Promise<void>;
  flush(): Promise<void>;
}

// External auth adapter for fetching user attributes
export interface IExternalAuthAdapter {
  getUserAttributes(userId: string): Promise<Record<string, unknown>>;
  getGroupMemberships(userId: string): Promise<string[]>;
  validateToken(token: string): Promise<{ valid: boolean; userId?: string }>;
}

// Storage adapter for pluggable persistence
export interface IStorageAdapter {
  savePolicySet(data: unknown): Promise<string>;
  getPolicySet(id: string): Promise<unknown>;
  deletePolicySet(id: string): Promise<void>;
  listPolicySets(): Promise<unknown[]>;
}

// Audit log adapter for external audit systems
export interface IAuditAdapter {
  logPolicyChange(policySetId: string, action: string, userId: string, details: unknown): Promise<void>;
  logEvaluation(evaluation: EvaluationResult, context: EvaluationContext): Promise<void>;
}
