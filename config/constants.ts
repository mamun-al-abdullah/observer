/*
|--------------------------------------------------------------------------
| Global constants (single source of truth)
|--------------------------------------------------------------------------
|
| Per project decision, all *domain* tunables live here as plain constants
| instead of environment variables: seed row counts, per-engine connection
| details, the load-generator profile, and the OpenTelemetry endpoint.
|
| Hostnames are the docker-compose service names, so the whole stack works
| out of the box with `make up`. This project is Docker-first.
|
*/

/**
 * The database engines under test. `key` is used everywhere as the stable
 * identifier (routes, metric labels, Lucid connection names, Mongo db).
 */
export type EngineKey = 'mysql' | 'mariadb' | 'postgres' | 'sqlite' | 'mongo'
export type SqlEngineKey = Exclude<EngineKey, 'mongo'>
export type EngineKind = 'sql' | 'mongo'

export interface EngineMeta {
  key: EngineKey
  label: string
  kind: EngineKind
}

export const ENGINES: EngineMeta[] = [
  { key: 'mysql', label: 'MySQL 8', kind: 'sql' },
  { key: 'mariadb', label: 'MariaDB', kind: 'sql' },
  { key: 'postgres', label: 'PostgreSQL 17', kind: 'sql' },
  { key: 'sqlite', label: 'SQLite', kind: 'sql' },
  { key: 'mongo', label: 'MongoDB', kind: 'mongo' },
]

export const ENGINE_KEYS: EngineKey[] = ENGINES.map((e) => e.key)

export const SQL_ENGINE_KEYS: EngineKey[] = ENGINES.filter((e) => e.kind === 'sql').map(
  (e) => e.key
)

export function isEngineKey(value: string): value is EngineKey {
  return ENGINE_KEYS.includes(value as EngineKey)
}

/**
 * Per-engine connection details. Shared password kept simple on purpose —
 * this is a throwaway local benchmarking lab, not a production system.
 */
export const DB_PASSWORD = 'benchpass'
export const DB_NAME = 'benchmark'

export const CONNECTIONS = {
  mysql: {
    host: 'mysql',
    port: 3306,
    user: 'root',
    password: DB_PASSWORD,
    database: DB_NAME,
  },
  mariadb: {
    host: 'mariadb',
    port: 3306,
    user: 'root',
    password: DB_PASSWORD,
    database: DB_NAME,
  },
  postgres: {
    host: 'postgres',
    port: 5432,
    user: 'benchmark',
    password: DB_PASSWORD,
    database: DB_NAME,
  },
  sqlite: {
    /** Relative to the app root; lives on a mounted volume in Docker. */
    filename: 'tmp/benchmark.sqlite3',
  },
  mongo: {
    url: 'mongodb://mongo:27017',
    database: DB_NAME,
  },
} as const

/**
 * Table / collection names, shared by SQL migrations and the Mongo runner
 * so both paths stay in lock-step.
 */
export const TABLES = {
  records: 'records',
  categories: 'categories',
} as const

/**
 * Seeding controls. To seed a different volume, pass `--rows` to the
 * `bench:seed` command (e.g. `node ace bench:seed all --rows=1000000`);
 * this value is only the default.
 */
export const SEED = {
  defaultRowCount: 100_000,
  batchSize: 2_000,
  categoryCount: 50,
  tenantCount: 20,
  statuses: ['active', 'pending', 'archived', 'cancelled'] as const,
  /** Fraction of rows that are soft-deleted (deleted_at set), for scope demos. */
  softDeletedFraction: 0.1,
  /**
   * `indexed_key` and `unindexed_key` are drawn from [1, keyspace]. With a
   * keyspace much smaller than the row count, an equality match returns a
   * handful of rows while forcing a full scan when the column is unindexed.
   */
  keyspace: 10_000,
}

/**
 * Shaping parameters for the benchmark queries themselves.
 */
export const QUERY = {
  /** Fraction of the keyspace covered by a range-scan. */
  rangeFraction: 0.05,
  /** OFFSET used by the sort+paginate query (deep-ish page). */
  paginateOffset: 1_000,
}

/**
 * Load generator: continuously exercises every engine × query-variant so the
 * Grafana dashboards show live, comparable time-series.
 */
export const LOADGEN = {
  /** Base URL of the benchmark API (docker service name). */
  baseUrl: 'http://app:3333',
  /** Concurrent in-flight benchmark requests. */
  concurrency: 6,
  /** Pause between iterations of a single worker (ms). */
  intervalMs: 200,
  /** Engines the generator hits (defaults to all). */
  engines: ENGINE_KEYS,
}

/**
 * OpenTelemetry export target (the collector's OTLP/HTTP receiver).
 */
export const OTEL = {
  serviceName: 'observer-app',
  otlpEndpoint: 'http://otel-collector:4318',
}

/**
 * HTTP server binding used by the benchmark API.
 */
export const SERVER = {
  port: 3333,
  host: '0.0.0.0',
}
