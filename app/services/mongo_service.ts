import { MongoClient, type Db, type Collection } from 'mongodb'

import { CONNECTIONS, QUERY, SEED, TABLES } from '#config/constants'
import { makeCategories, makeRecord } from '#services/record_factory'
import type { BenchOptions, BenchResult, QueryType } from '#services/query_catalog'

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * MongoDB benchmark runner. MongoDB is not supported by Lucid, so it gets its
 * own native-driver path that mirrors the SQL variants as closely as the
 * document model allows (same fields, same indexes, same query shapes).
 */
class MongoService {
  #client?: MongoClient
  #db?: Db

  async connect(): Promise<void> {
    if (this.#db) return
    this.#client = new MongoClient(CONNECTIONS.mongo.url, { serverSelectionTimeoutMS: 5000 })
    await this.#client.connect()
    this.#db = this.#client.db(CONNECTIONS.mongo.database)
  }

  async close(): Promise<void> {
    await this.#client?.close()
    this.#client = undefined
    this.#db = undefined
  }

  private async db(): Promise<Db> {
    if (!this.#db) await this.connect()
    return this.#db!
  }

  private async records(): Promise<Collection> {
    return (await this.db()).collection(TABLES.records)
  }

  private async categories(): Promise<Collection> {
    return (await this.db()).collection(TABLES.categories)
  }

  /** Index only `indexed_key` (+ `category_id` for the join); never `unindexed_key`. */
  async ensureIndexes(): Promise<void> {
    const records = await this.records()
    await records.createIndex({ indexed_key: 1 })
    await records.createIndex({ category_id: 1 })
  }

  async seed(
    rowCount: number,
    batchSize: number,
    onProgress?: (inserted: number) => void
  ): Promise<number> {
    const records = await this.records()
    const categories = await this.categories()
    const now = Date.now()

    await records.deleteMany({})
    await categories.deleteMany({})
    await records.dropIndexes().catch(() => {})

    await categories.insertMany(
      makeCategories(now).map((c) => ({ _id: c.id as any, name: c.name, created_at: c.created_at }))
    )

    let inserted = 0
    while (inserted < rowCount) {
      const n = Math.min(batchSize, rowCount - inserted)
      const batch = Array.from({ length: n }, () => makeRecord(now))
      await records.insertMany(batch, { ordered: false })
      inserted += n
      onProgress?.(inserted)
    }

    // Build indexes after the bulk load, matching the SQL schema.
    await this.ensureIndexes()
    return inserted
  }

  async totalRows(): Promise<number> {
    return (await this.records()).countDocuments({})
  }

  async run(queryType: QueryType, options: BenchOptions): Promise<BenchResult> {
    const start = process.hrtime.bigint()
    const rows = await this.execute(queryType, options)
    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000

    return {
      engine: 'mongo',
      queryType,
      indexed: options.indexed,
      scoped: options.scoped,
      latencyMs,
      rows,
    }
  }

  private async execute(queryType: QueryType, options: BenchOptions): Promise<number> {
    switch (queryType) {
      case 'point-lookup':
        return this.pointLookup(options)
      case 'range-scan':
        return this.rangeScan(options)
      case 'count':
        return this.count(options)
      case 'scoping':
        return this.scoping(options)
      case 'join':
        return this.join(options)
      case 'sort-paginate':
        return this.sortPaginate(options)
      default:
        throw new Error(`Unknown query type: ${queryType}`)
    }
  }

  private async pointLookup(options: BenchOptions): Promise<number> {
    const field = options.indexed ? 'indexed_key' : 'unindexed_key'
    const value = randInt(1, SEED.keyspace)
    const docs = await (await this.records())
      .find({ [field]: value }, { projection: { _id: 1 } })
      .toArray()
    return docs.length
  }

  private async rangeScan(options: BenchOptions): Promise<number> {
    const field = options.indexed ? 'indexed_key' : 'unindexed_key'
    const span = Math.max(1, Math.floor(SEED.keyspace * QUERY.rangeFraction))
    const low = randInt(1, Math.max(1, SEED.keyspace - span))
    return (await this.records()).countDocuments({ [field]: { $gte: low, $lte: low + span } })
  }

  private async count(options: BenchOptions): Promise<number> {
    const filter = options.scoped ? { status: 'active', deleted_at: null } : {}
    return (await this.records()).countDocuments(filter)
  }

  private async scoping(options: BenchOptions): Promise<number> {
    const filter = options.scoped
      ? { deleted_at: null, tenant_id: randInt(1, SEED.tenantCount) }
      : {}
    const docs = await (await this.records())
      .find(filter, { projection: { _id: 1, amount: 1 } })
      .sort({ _id: 1 })
      .limit(options.limit)
      .toArray()
    return docs.length
  }

  private async join(options: BenchOptions): Promise<number> {
    const docs = await (await this.records())
      .aggregate([
        { $limit: options.limit },
        {
          $lookup: {
            from: TABLES.categories,
            localField: 'category_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $project: { _id: 1, amount: 1, 'category.name': 1 } },
      ])
      .toArray()
    return docs.length
  }

  private async sortPaginate(options: BenchOptions): Promise<number> {
    const field = options.indexed ? 'indexed_key' : 'unindexed_key'
    const docs = await (await this.records())
      .find({}, { projection: { _id: 1 } })
      .sort({ [field]: 1 })
      .skip(QUERY.paginateOffset)
      .limit(options.limit)
      .allowDiskUse(true)
      .toArray()
    return docs.length
  }
}

const mongo = new MongoService()
export default mongo
