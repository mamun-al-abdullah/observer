import type { EngineKey } from '#config/constants'

/**
 * The benchmark query variants. Each is implemented identically (as far as the
 * engine allows) by both the SQL runner and the Mongo runner, so results are
 * comparable across engines.
 */
export type QueryType =
  | 'point-lookup'
  | 'range-scan'
  | 'count'
  | 'scoping'
  | 'join'
  | 'sort-paginate'

export interface QueryVariant {
  type: QueryType
  label: string
  description: string
  /** Whether the `indexed` toggle changes this query's behaviour. */
  usesIndexedToggle: boolean
  /** Whether the `scoped` toggle changes this query's behaviour. */
  usesScopedToggle: boolean
}

export const QUERY_CATALOG: QueryVariant[] = [
  {
    type: 'point-lookup',
    label: 'Point lookup',
    description: 'Equality match on a single key. `indexed=true` targets the indexed column, `false` the unindexed one (full scan).',
    usesIndexedToggle: true,
    usesScopedToggle: false,
  },
  {
    type: 'range-scan',
    label: 'Range scan',
    description: 'Range filter over a key. `indexed=true` uses the indexed column, `false` forces a full scan.',
    usesIndexedToggle: true,
    usesScopedToggle: false,
  },
  {
    type: 'count',
    label: 'Count',
    description: 'Row counting. `scoped=true` counts a filtered subset; `false` counts the whole table.',
    usesIndexedToggle: false,
    usesScopedToggle: true,
  },
  {
    type: 'scoping',
    label: 'Scoping cost',
    description: 'Same base query with vs without the default scope (soft-delete + tenant filter) applied.',
    usesIndexedToggle: false,
    usesScopedToggle: true,
  },
  {
    type: 'join',
    label: 'Join',
    description: 'Join records to their category and return a limited page.',
    usesIndexedToggle: false,
    usesScopedToggle: false,
  },
  {
    type: 'sort-paginate',
    label: 'Sort + paginate',
    description: 'Ordered pagination. `indexed=true` orders by the indexed column, `false` by the unindexed column (filesort).',
    usesIndexedToggle: true,
    usesScopedToggle: false,
  },
]

export const QUERY_TYPES: QueryType[] = QUERY_CATALOG.map((q) => q.type)

export function isQueryType(value: string): value is QueryType {
  return QUERY_TYPES.includes(value as QueryType)
}

/**
 * Options that shape a single benchmark run.
 */
export interface BenchOptions {
  indexed: boolean
  scoped: boolean
  /** Page size for range/join/sort queries. */
  limit: number
}

export const DEFAULT_BENCH_OPTIONS: BenchOptions = {
  indexed: true,
  scoped: true,
  limit: 100,
}

/**
 * The result of one benchmark run, shared by both runners and emitted as a
 * metric + returned from the API.
 */
export interface BenchResult {
  engine: EngineKey
  queryType: QueryType
  indexed: boolean
  scoped: boolean
  latencyMs: number
  rows: number
}
