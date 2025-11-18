/**
 * Event system for policy engine
 */

import type { EvaluationContext, EvaluationResult } from '../../types/policy';

// Base event interface
export interface DomainEvent {
  type: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Policy lifecycle events
export interface PolicySetCreatedEvent extends DomainEvent {
  type: 'policy_set.created';
  policySetId: string;
  name: string;
  rulesCount: number;
}

export interface PolicySetUpdatedEvent extends DomainEvent {
  type: 'policy_set.updated';
  policySetId: string;
  changes: string[];
}

export interface PolicySetDeletedEvent extends DomainEvent {
  type: 'policy_set.deleted';
  policySetId: string;
  name: string;
}

export interface PolicySetVersionCreatedEvent extends DomainEvent {
  type: 'policy_set.version_created';
  policySetId: string;
  versionNumber: number;
}

// Evaluation events
export interface EvaluationPerformedEvent extends DomainEvent {
  type: 'evaluation.performed';
  policySetId: string;
  context: EvaluationContext;
  result: EvaluationResult;
  durationMs: number;
}

export interface EvaluationFailedEvent extends DomainEvent {
  type: 'evaluation.failed';
  policySetId: string;
  context: EvaluationContext;
  error: string;
}

// Tag events
export interface TagCreatedEvent extends DomainEvent {
  type: 'tag.created';
  tagId: string;
  name: string;
}

export interface PolicySetTaggedEvent extends DomainEvent {
  type: 'policy_set.tagged';
  policySetId: string;
  tagId: string;
}

// Comment events
export interface CommentAddedEvent extends DomainEvent {
  type: 'comment.added';
  policySetId: string;
  commentId: string;
  userId: string;
}

// Union type of all events
export type PolicyEvent =
  | PolicySetCreatedEvent
  | PolicySetUpdatedEvent
  | PolicySetDeletedEvent
  | PolicySetVersionCreatedEvent
  | EvaluationPerformedEvent
  | EvaluationFailedEvent
  | TagCreatedEvent
  | PolicySetTaggedEvent
  | CommentAddedEvent;

// Event handler function type
export type EventHandler<T extends PolicyEvent = PolicyEvent> = (event: T) => Promise<void> | void;
