/**
 * Simple in-memory event bus for domain events
 */

import type { PolicyEvent, EventHandler } from './types';
import { logger } from '../logger';

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private wildcardHandlers: EventHandler[] = [];

  /**
   * Register an event handler for a specific event type
   */
  on<T extends PolicyEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as EventHandler);
    logger.debug('Event handler registered', { eventType });
  }

  /**
   * Register a wildcard handler that receives all events
   */
  onAny(handler: EventHandler): void {
    this.wildcardHandlers.push(handler);
    logger.debug('Wildcard event handler registered');
  }

  /**
   * Emit an event to all registered handlers
   */
  async emit<T extends PolicyEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    const allHandlers = [...handlers, ...this.wildcardHandlers];

    logger.debug('Emitting event', { type: event.type, handlerCount: allHandlers.length });

    const promises = allHandlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`Event handler failed for ${event.type}`, error as Error, {
          eventType: event.type
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Remove a specific handler
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        logger.debug('Event handler removed', { eventType });
      }
    }
  }

  /**
   * Remove all handlers for an event type
   */
  removeAllHandlers(eventType?: string): void {
    if (eventType) {
      this.handlers.delete(eventType);
      logger.debug('All handlers removed for event type', { eventType });
    } else {
      this.handlers.clear();
      this.wildcardHandlers = [];
      logger.debug('All event handlers removed');
    }
  }

  /**
   * Get the number of handlers for an event type
   */
  getHandlerCount(eventType: string): number {
    return (this.handlers.get(eventType) || []).length + this.wildcardHandlers.length;
  }
}

// Singleton instance
export const eventBus = new EventBus();
