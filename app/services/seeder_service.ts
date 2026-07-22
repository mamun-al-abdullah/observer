import db from '@adonisjs/lucid/services/db'

import { TABLES, type SqlEngineKey } from '#config/constants'
import { makeCategories, makeRecord } from '#services/record_factory'
import mongo from '#services/mongo_service'

/**
 * Seeds a single SQL engine: truncates, loads the shared category set, then
 * bulk-inserts `rowCount` records in batches. Assumes migrations have already
 * created the tables (the `bench:seed` command runs them first).
 */
export async function seedSqlEngine(
  engine: SqlEngineKey,
  rowCount: number,
  batchSize: number,
  onProgress?: (inserted: number) => void
): Promise<number> {
  const client = db.connection(engine)
  const now = Date.now()

  // SQLite renders multiInsert as a UNION ALL chain and caps compound SELECTs
  // at 500 terms, so keep its batches small. Other engines handle large batches.
  const effectiveBatch = engine === 'sqlite' ? Math.min(batchSize, 400) : batchSize

  // Order matters for engines that enforce it; records first, then categories.
  await client.from(TABLES.records).delete()
  await client.from(TABLES.categories).delete()

  await client.table(TABLES.categories).multiInsert(makeCategories(now))

  let inserted = 0
  while (inserted < rowCount) {
    const n = Math.min(effectiveBatch, rowCount - inserted)
    const batch = Array.from({ length: n }, () => makeRecord(now))
    await client.table(TABLES.records).multiInsert(batch)
    inserted += n
    onProgress?.(inserted)
  }

  return inserted
}

/**
 * Seeds the MongoDB collections (delegates to the Mongo service, which owns
 * its native-driver logic and index creation).
 */
export async function seedMongo(
  rowCount: number,
  batchSize: number,
  onProgress?: (inserted: number) => void
): Promise<number> {
  return mongo.seed(rowCount, batchSize, onProgress)
}
