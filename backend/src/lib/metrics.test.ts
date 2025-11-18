import { describe, it, expect, beforeEach } from '@jest/globals';
import { MetricsCollector } from './metrics';

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it('should record counter metrics', () => {
    metrics.recordCounter('test.counter', 1);
    metrics.recordCounter('test.counter', 5);

    const allMetrics = metrics.getMetrics();
    expect(allMetrics).toHaveLength(2);
    expect(allMetrics[0].name).toBe('test.counter');
    expect(allMetrics[0].type).toBe('counter');
    expect(allMetrics[0].value).toBe(1);
  });

  it('should record gauge metrics', () => {
    metrics.recordGauge('test.gauge', 42);

    const allMetrics = metrics.getMetrics();
    expect(allMetrics).toHaveLength(1);
    expect(allMetrics[0].type).toBe('gauge');
    expect(allMetrics[0].value).toBe(42);
  });

  it('should record histogram metrics', () => {
    metrics.recordHistogram('test.histogram', 100);
    metrics.recordHistogram('test.histogram', 200);

    const allMetrics = metrics.getMetrics();
    expect(allMetrics).toHaveLength(2);
    expect(allMetrics.every(m => m.type === 'histogram')).toBe(true);
  });

  it('should store metrics with labels', () => {
    metrics.recordCounter('http.requests', 1, { method: 'GET', status: 200 });

    const allMetrics = metrics.getMetrics();
    expect(allMetrics[0].labels).toEqual({ method: 'GET', status: 200 });
  });

  it('should get metrics by name', () => {
    metrics.recordCounter('test.a', 1);
    metrics.recordCounter('test.b', 2);
    metrics.recordCounter('test.a', 3);

    const metricsA = metrics.getMetricsByName('test.a');
    expect(metricsA).toHaveLength(2);
    expect(metricsA.every(m => m.name === 'test.a')).toBe(true);
  });

  it('should calculate stats for metrics', () => {
    metrics.recordHistogram('test.duration', 100);
    metrics.recordHistogram('test.duration', 200);
    metrics.recordHistogram('test.duration', 300);

    const stats = metrics.getStats('test.duration');
    expect(stats).not.toBeNull();
    expect(stats?.count).toBe(3);
    expect(stats?.sum).toBe(600);
    expect(stats?.avg).toBe(200);
    expect(stats?.min).toBe(100);
    expect(stats?.max).toBe(300);
  });

  it('should return null stats for non-existent metric', () => {
    const stats = metrics.getStats('nonexistent');
    expect(stats).toBeNull();
  });

  it('should clear all metrics', () => {
    metrics.recordCounter('test', 1);
    metrics.recordCounter('test', 2);

    metrics.clear();

    expect(metrics.getMetrics()).toHaveLength(0);
  });

  it('should limit metrics buffer size', () => {
    const collector = new MetricsCollector();

    // Record more than max metrics
    for (let i = 0; i < 12000; i++) {
      collector.recordCounter('test', 1);
    }

    const allMetrics = collector.getMetrics();
    expect(allMetrics.length).toBeLessThanOrEqual(10000);
  });

  it('should include timestamp in metrics', () => {
    const before = new Date();
    metrics.recordCounter('test', 1);
    const after = new Date();

    const allMetrics = metrics.getMetrics();
    const timestamp = allMetrics[0].timestamp;

    expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
