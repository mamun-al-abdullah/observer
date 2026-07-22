import { SEED } from '#config/constants'

export interface RecordRow {
  indexed_key: number
  unindexed_key: number
  status: string
  tenant_id: number
  amount: number
  category_id: number
  created_at: string
  deleted_at: string | null
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Formats a timestamp as `YYYY-MM-DD HH:MM:SS` — accepted by MySQL, MariaDB,
 * Postgres and SQLite alike (MySQL rejects the ISO-8601 `T`/`Z` form).
 */
function sqlDateTime(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Generates one synthetic record. Shared by the SQL and Mongo seeders so both
 * datasets have identical shape and distribution.
 */
export function makeRecord(now: number): RecordRow {
  const createdAt = sqlDateTime(now - randInt(0, 365) * DAY_MS)
  const deleted = Math.random() < SEED.softDeletedFraction
  return {
    indexed_key: randInt(1, SEED.keyspace),
    unindexed_key: randInt(1, SEED.keyspace),
    status: SEED.statuses[randInt(0, SEED.statuses.length - 1)],
    tenant_id: randInt(1, SEED.tenantCount),
    amount: randInt(1, 10_000_000) / 100,
    category_id: randInt(1, SEED.categoryCount),
    created_at: createdAt,
    deleted_at: deleted ? sqlDateTime(now - randInt(0, 30) * DAY_MS) : null,
  }
}

/**
 * The category rows (shared id space so the Mongo `$lookup` join mirrors the
 * SQL foreign-key join).
 */
export function makeCategories(now: number): Array<{ id: number; name: string; created_at: string }> {
  const createdAt = sqlDateTime(now)
  return Array.from({ length: SEED.categoryCount }, (_, i) => ({
    id: i + 1,
    name: `Category ${i + 1}`,
    created_at: createdAt,
  }))
}
