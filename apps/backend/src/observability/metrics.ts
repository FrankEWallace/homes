/**
 * In-process metrics registry (Phase 5 observability).
 *
 * Tracks HTTP request counts/latency and named operation latencies (e.g. the
 * PostGIS search path) so `/metrics` can expose p50/p95/p99 without a metrics
 * backend. Aggregation is intentionally simple (bounded reservoir per series);
 * graduate to an OpenTelemetry exporter / Prometheus client at scale behind the
 * same `record*()` surface.
 */

const MAX_SAMPLES = 1024; // bounded ring buffer per series — keeps memory flat

interface Series {
  count: number;
  errors: number;
  samples: number[]; // durations in ms
  next: number; // ring cursor
}

const httpTotal = { count: 0, errors: 0 };
const httpByRoute = new Map<string, Series>();
const ops = new Map<string, Series>();

function newSeries(): Series {
  return { count: 0, errors: 0, samples: [], next: 0 };
}

function push(series: Series, ms: number, isError: boolean) {
  series.count += 1;
  if (isError) series.errors += 1;
  if (series.samples.length < MAX_SAMPLES) series.samples.push(ms);
  else {
    series.samples[series.next] = ms;
    series.next = (series.next + 1) % MAX_SAMPLES;
  }
}

export function recordHttp(routeKey: string, ms: number, statusCode: number) {
  const isError = statusCode >= 500;
  httpTotal.count += 1;
  if (isError) httpTotal.errors += 1;
  let s = httpByRoute.get(routeKey);
  if (!s) {
    s = newSeries();
    httpByRoute.set(routeKey, s);
  }
  push(s, ms, isError);
}

export function recordOp(name: string, ms: number, isError = false) {
  let s = ops.get(name);
  if (!s) {
    s = newSeries();
    ops.set(name, s);
  }
  push(s, ms, isError);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function summarize(series: Series) {
  const sorted = [...series.samples].sort((a, b) => a - b);
  return {
    count: series.count,
    errors: series.errors,
    p50: Math.round(percentile(sorted, 50)),
    p95: Math.round(percentile(sorted, 95)),
    p99: Math.round(percentile(sorted, 99)),
    max: sorted.length ? Math.round(sorted[sorted.length - 1]) : 0,
  };
}

export function snapshot() {
  const routes: Record<string, ReturnType<typeof summarize>> = {};
  for (const [k, v] of httpByRoute) routes[k] = summarize(v);
  const operations: Record<string, ReturnType<typeof summarize>> = {};
  for (const [k, v] of ops) operations[k] = summarize(v);
  return {
    http: { total: httpTotal.count, errors: httpTotal.errors },
    routes,
    operations,
  };
}
