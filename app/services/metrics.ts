import { metrics } from '@opentelemetry/api'

import type { EngineKey } from '#config/constants'
import type { BenchResult, QueryType } from '#services/query_catalog'

/**
 * Custom benchmark metrics, recorded through the OpenTelemetry metrics API.
 * The MeterProvider is set up by @adonisjs/otel, so these flow out over OTLP
 * to the collector → Prometheus with no extra wiring.
 *
 * The histogram uses OTel's default explicit bucket boundaries (0, 5, 10, 25,
 * 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000 ms), which map
 * cleanly to `histogram_quantile()` in Grafana.
 */
const meter = metrics.getMeter('observer-benchmarks')

// No `unit` is set on these instruments on purpose: the Prometheus exporter
// appends the unit as a name suffix (e.g. ms -> `_milliseconds`), which would
// make the exported series `bench_query_duration_ms_milliseconds_bucket`. The
// milliseconds are already in the metric name.
const durationHistogram = meter.createHistogram('bench_query_duration_ms', {
  description: 'Benchmark query latency in milliseconds',
})

const runsCounter = meter.createCounter('bench_query_runs_total', {
  description: 'Total number of benchmark query runs',
})

const rowsHistogram = meter.createHistogram('bench_query_rows', {
  description: 'Number of rows returned/affected by a benchmark query',
})

const errorsCounter = meter.createCounter('bench_query_errors_total', {
  description: 'Total number of failed benchmark query runs',
})

function labels(result: Pick<BenchResult, 'engine' | 'queryType' | 'indexed' | 'scoped'>) {
  return {
    engine: result.engine,
    query_type: result.queryType,
    indexed: String(result.indexed),
    scoped: String(result.scoped),
  }
}

/**
 * Record a successful benchmark run.
 */
export function recordBench(result: BenchResult): void {
  const attrs = labels(result)
  durationHistogram.record(result.latencyMs, attrs)
  rowsHistogram.record(result.rows, attrs)
  runsCounter.add(1, attrs)
}

/**
 * Record a failed benchmark run.
 */
export function recordBenchError(
  engine: EngineKey,
  queryType: QueryType,
  indexed: boolean,
  scoped: boolean
): void {
  errorsCounter.add(1, {
    engine,
    query_type: queryType,
    indexed: String(indexed),
    scoped: String(scoped),
  })
}
