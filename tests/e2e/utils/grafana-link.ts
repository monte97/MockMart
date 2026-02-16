/**
 * Utility to build Grafana Tempo links from trace IDs.
 *
 * Part of: Parte 2 - Quando il Test Fallisce ma il Bug è nel Backend
 */

const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost/grafana';

/**
 * Build a direct link to a trace in Grafana Tempo.
 *
 * @param traceId - The OpenTelemetry trace ID (32 hex chars)
 * @returns URL to open the trace in Grafana
 *
 * @example
 * buildGrafanaLink('0af7651916cd43dd8448eb211c80319c')
 * // => 'http://localhost/grafana/explore?...'
 */
export function buildGrafanaLink(traceId: string): string {
  // Grafana Explore URL with Tempo datasource
  const params = new URLSearchParams({
    orgId: '1',
    left: JSON.stringify({
      datasource: 'tempo',
      queries: [
        {
          refId: 'A',
          datasource: { type: 'tempo', uid: 'tempo' },
          queryType: 'traceql',
          query: traceId,
        },
      ],
      range: { from: 'now-1h', to: 'now' },
    }),
  });

  return `${GRAFANA_URL}/explore?${params.toString()}`;
}

/**
 * Build a TraceQL query link for searching traces.
 *
 * @param query - TraceQL query string
 * @returns URL to run the query in Grafana
 *
 * @example
 * buildTraceQLLink('{ resource.service.name = "shop-api" && duration > 1s }')
 */
export function buildTraceQLLink(query: string): string {
  const params = new URLSearchParams({
    orgId: '1',
    left: JSON.stringify({
      datasource: 'tempo',
      queries: [
        {
          refId: 'A',
          datasource: { type: 'tempo', uid: 'tempo' },
          queryType: 'traceql',
          query,
        },
      ],
      range: { from: 'now-1h', to: 'now' },
    }),
  });

  return `${GRAFANA_URL}/explore?${params.toString()}`;
}
