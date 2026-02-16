/**
 * Trace Collector fixture for correlating Playwright tests with OpenTelemetry traces.
 *
 * Part of: Parte 2 - Quando il Test Fallisce ma il Bug è nel Backend
 *
 * This fixture:
 * 1. Intercepts HTTP responses to extract trace IDs (traceparent header)
 * 2. Collects all trace IDs during a test
 * 3. On test failure, logs trace IDs and Grafana links for debugging
 */

import { test as base } from '@playwright/test';
import { buildGrafanaLink } from '../utils/grafana-link';

export interface TraceInfo {
  traceId: string;
  url: string;
  method: string;
  status: number;
  timestamp: Date;
}

export interface TraceCollector {
  traces: TraceInfo[];
  getTraceIds(): string[];
  getGrafanaLinks(): string[];
  printSummary(): void;
}

/**
 * Parse W3C traceparent header.
 * Format: {version}-{trace-id}-{parent-id}-{trace-flags}
 * Example: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 */
function parseTraceparent(header: string | null): string | null {
  if (!header) return null;
  const parts = header.split('-');
  if (parts.length >= 2) {
    return parts[1]; // trace-id is the second part
  }
  return null;
}

/**
 * Extended test fixture with trace collection.
 */
export const test = base.extend<{ traceCollector: TraceCollector }>({
  traceCollector: async ({ page }, use, testInfo) => {
    const traces: TraceInfo[] = [];

    // Intercept all responses to collect trace IDs
    page.on('response', (response) => {
      const traceparent = response.headers()['traceparent'];
      const traceId = parseTraceparent(traceparent);

      if (traceId) {
        traces.push({
          traceId,
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          timestamp: new Date(),
        });
      }
    });

    const collector: TraceCollector = {
      traces,

      getTraceIds() {
        return [...new Set(traces.map((t) => t.traceId))];
      },

      getGrafanaLinks() {
        return this.getTraceIds().map((id) => buildGrafanaLink(id));
      },

      printSummary() {
        console.log('\n📊 Trace Summary:');
        console.log(`   Collected ${traces.length} traced requests`);
        console.log(`   Unique traces: ${this.getTraceIds().length}`);
        console.log('\n🔗 Grafana Links:');
        this.getGrafanaLinks().forEach((link) => {
          console.log(`   ${link}`);
        });
      },
    };

    await use(collector);

    // On test failure, print trace info for debugging
    if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
      console.log('\n❌ Test failed - printing trace info for debugging:');
      collector.printSummary();
    }
  },
});

export { expect } from '@playwright/test';
