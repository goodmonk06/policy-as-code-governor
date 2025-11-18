/**
 * Notification adapter implementations
 */

import type { INotificationAdapter } from './types';
import type { EvaluationContext } from '../../types/policy';
import { logger } from '../logger';

// Console-based notification adapter (default implementation)
export class ConsoleNotificationAdapter implements INotificationAdapter {
  async sendAlert(message: string, severity: 'info' | 'warning' | 'error', metadata?: Record<string, unknown>): Promise<void> {
    logger[severity](`[ALERT] ${message}`, metadata);
  }

  async sendPolicyViolation(policySetId: string, context: EvaluationContext, decision: string): Promise<void> {
    logger.warn('[POLICY_VIOLATION] Policy evaluation resulted in denial', {
      policySetId,
      decision,
      context
    });
  }
}

// Webhook-based notification adapter
export class WebhookNotificationAdapter implements INotificationAdapter {
  constructor(private webhookUrl: string) {}

  async sendAlert(message: string, severity: 'info' | 'warning' | 'error', metadata?: Record<string, unknown>): Promise<void> {
    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'alert',
          message,
          severity,
          metadata,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      logger.error('Failed to send webhook notification', error as Error);
    }
  }

  async sendPolicyViolation(policySetId: string, context: EvaluationContext, decision: string): Promise<void> {
    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'policy_violation',
          policySetId,
          decision,
          context,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      logger.error('Failed to send policy violation webhook', error as Error);
    }
  }
}

// Email notification adapter (stub implementation)
export class EmailNotificationAdapter implements INotificationAdapter {
  constructor(private emailConfig: { from: string; to: string[] }) {}

  async sendAlert(message: string, severity: 'info' | 'warning' | 'error', metadata?: Record<string, unknown>): Promise<void> {
    // In a real implementation, this would use an email service like SendGrid, AWS SES, etc.
    logger.info('[EMAIL] Would send alert email', {
      to: this.emailConfig.to,
      subject: `[${severity.toUpperCase()}] Policy Alert`,
      message,
      metadata
    });
  }

  async sendPolicyViolation(policySetId: string, context: EvaluationContext, decision: string): Promise<void> {
    logger.info('[EMAIL] Would send policy violation email', {
      to: this.emailConfig.to,
      policySetId,
      decision
    });
  }
}
