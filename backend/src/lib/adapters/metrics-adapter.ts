/**
 * Metrics adapter implementations for external monitoring systems
 */

import type { IMetricsAdapter } from './types';
import { logger } from '../logger';

// In-memory metrics adapter (default, already using our metrics system)
export class InMemoryMetricsAdapter implements IMetricsAdapter {
  private metrics: Array<{
    name: string;
    type: 'counter' | 'gauge' | 'histogram';
    value: number;
    labels?: Record<string, string | number>;
    timestamp: Date;
  }> = [];

  async recordCounter(name: string, value: number, labels?: Record<string, string | number>): Promise<void> {
    this.metrics.push({ name, type: 'counter', value, labels, timestamp: new Date() });
  }

  async recordGauge(name: string, value: number, labels?: Record<string, string | number>): Promise<void> {
    this.metrics.push({ name, type: 'gauge', value, labels, timestamp: new Date() });
  }

  async recordHistogram(name: string, value: number, labels?: Record<string, string | number>): Promise<void> {
    this.metrics.push({ name, type: 'histogram', value, labels, timestamp: new Date() });
  }

  async flush(): Promise<void> {
    logger.info('Flushing metrics', { count: this.metrics.length });
    this.metrics = [];
  }

  getMetrics() {
    return [...this.metrics];
  }
}

// Prometheus-compatible metrics adapter (stub)
export class PrometheusMetricsAdapter implements IMetricsAdapter {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  async recordCounter(name: string, value: number, labels?: Record<string, string | number>): Promise<void> {
    const key = this.formatKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  async recordGauge(name: string, value: number, labels?: Record<string, string | number>): Promise<void> {
    const key = this.formatKey(name, labels);
    this.gauges.set(key, value);
  }

  async recordHistogram(name: string, value: number, labels?: Record<string, string | number>): Promise<void> {
    const key = this.formatKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key)!.push(value);
  }

  async flush(): Promise<void> {
    // In a real implementation, this would push to Prometheus pushgateway
    logger.info('Would flush metrics to Prometheus', {
      counters: this.counters.size,
      gauges: this.gauges.size,
      histograms: this.histograms.size
    });
  }

  private formatKey(name: string, labels?: Record<string, string | number>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  // Export metrics in Prometheus format
  exportMetrics(): string {
    const lines: string[] = [];

    for (const [key, value] of this.counters.entries()) {
      lines.push(`# TYPE ${key.split('{')[0]} counter`);
      lines.push(`${key} ${value}`);
    }

    for (const [key, value] of this.gauges.entries()) {
      lines.push(`# TYPE ${key.split('{')[0]} gauge`);
      lines.push(`${key} ${value}`);
    }

    for (const [key, values] of this.histograms.entries()) {
      const name = key.split('{')[0];
      lines.push(`# TYPE ${name} histogram`);
      // In a real implementation, would calculate buckets
      lines.push(`${key}_count ${values.length}`);
      lines.push(`${key}_sum ${values.reduce((a, b) => a + b, 0)}`);
    }

    return lines.join('\n');
  }
}

// DataDog metrics adapter (stub)
export class DataDogMetricsAdapter implements IMetricsAdapter {
  constructor(private apiKey: string, private appKey: string) {}

  async recordCounter(name: string, value: number, labels?: Record<string, string | number>): Promise<void> {
    // In a real implementation, would call DataDog API
    logger.debug('[DataDog] Recording counter', { name, value, labels });
  }

  async recordGauge(name: string, value: number, labels?: Record<string, string | number>): Promise<void> {
    logger.debug('[DataDog] Recording gauge', { name, value, labels });
  }

  async recordHistogram(name: string, value: number, labels?: Record<string, string | number>): Promise<void> {
    logger.debug('[DataDog] Recording histogram', { name, value, labels });
  }

  async flush(): Promise<void> {
    logger.info('[DataDog] Would flush metrics to DataDog');
  }
}
