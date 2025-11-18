/**
 * Metrics collection and tracking
 */

interface MetricLabels {
  [key: string]: string | number;
}

interface MetricData {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: MetricLabels;
  timestamp: Date;
}

class MetricsCollector {
  private metrics: MetricData[] = [];
  private readonly maxMetrics = 10000;

  recordCounter(name: string, value: number = 1, labels?: MetricLabels) {
    this.record({
      name,
      type: 'counter',
      value,
      labels,
      timestamp: new Date()
    });
  }

  recordGauge(name: string, value: number, labels?: MetricLabels) {
    this.record({
      name,
      type: 'gauge',
      value,
      labels,
      timestamp: new Date()
    });
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels) {
    this.record({
      name,
      type: 'histogram',
      value,
      labels,
      timestamp: new Date()
    });
  }

  private record(metric: MetricData) {
    this.metrics.push(metric);

    // Keep metrics buffer from growing too large
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(): MetricData[] {
    return [...this.metrics];
  }

  getMetricsByName(name: string): MetricData[] {
    return this.metrics.filter(m => m.name === name);
  }

  clear() {
    this.metrics = [];
  }

  // Get aggregated stats for a metric
  getStats(name: string): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  } | null {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: metrics.length,
      sum,
      avg: sum / metrics.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }
}

export const metrics = new MetricsCollector();
export { MetricsCollector, MetricLabels, MetricData };
