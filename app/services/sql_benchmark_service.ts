import db from '@adonisjs/lucid/services/db'

import { QUERY, SEED, TABLES, type SqlEngineKey } from '#config/constants'
import type { BenchOptions, BenchResult, QueryType } from '#services/query_catalog'

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function toCount(rows: Array<Record<string, unknown>>): number {
  const value = rows[0]?.total
  return typeof value === 'number' ? value : Number(value ?? 0)
}

/**
 * Runs the benchmark query variants against a single SQL engine (mysql,
 * mariadb, postgres, sqlite) by switching the Lucid connection.
 *
 * Each method builds a query designed so the `indexed` / `scoped` toggles
 * produce a genuinely different execution plan (index seek vs full scan,
 * with vs without extra unindexed predicates).
 */
class SqlBenchmarkService {
  private client(engine: SqlEngineKey) {
    return db.connection(engine)
  }

  async run(engine: SqlEngineKey, queryType: QueryType, options: BenchOptions): Promise<BenchResult> {
    const start = process.hrtime.bigint()
    const rows = await this.execute(engine, queryType, options)
    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000

    return {
      engine,
      queryType,
      indexed: options.indexed,
      scoped: options.scoped,
      latencyMs,
      rows,
    }
  }

  private async execute(
    engine: SqlEngineKey,
    queryType: QueryType,
    options: BenchOptions
  ): Promise<number> {
    switch (queryType) {
      case 'point-lookup':
        return this.pointLookup(engine, options)
      case 'range-scan':
        return this.rangeScan(engine, options)
      case 'count':
        return this.count(engine, options)
      case 'scoping':
        return this.scoping(engine, options)
      case 'join':
        return this.join(engine, options)
      case 'sort-paginate':
        return this.sortPaginate(engine, options)
      default:
        throw new Error(`Unknown query type: ${queryType}`)
    }
  }

  /** Equality match with no LIMIT: index seek vs full table scan. */
  private async pointLookup(engine: SqlEngineKey, options: BenchOptions): Promise<number> {
    const column = options.indexed ? 'indexed_key' : 'unindexed_key'
    const value = randInt(1, SEED.keyspace)
    const rows = await this.client(engine)
      .from(TABLES.records)
      .select('id')
      .where(column, value)
    return rows.length
  }

  /** COUNT over a ~5% key range: index range scan vs full scan. */
  private async rangeScan(engine: SqlEngineKey, options: BenchOptions): Promise<number> {
    const column = options.indexed ? 'indexed_key' : 'unindexed_key'
    const span = Math.max(1, Math.floor(SEED.keyspace * QUERY.rangeFraction))
    const low = randInt(1, Math.max(1, SEED.keyspace - span))
    const result = await this.client(engine)
      .from(TABLES.records)
      .where(column, '>=', low)
      .andWhere(column, '<=', low + span)
      .count('* as total')
    return toCount(result)
  }

  /** Whole-table count vs filtered count. */
  private async count(engine: SqlEngineKey, options: BenchOptions): Promise<number> {
    const query = this.client(engine).from(TABLES.records)
    if (options.scoped) {
      query.where('status', 'active').whereNull('deleted_at')
    }
    const result = await query.count('* as total')
    return toCount(result)
  }

  /** Same page, with vs without the default (tenant + soft-delete) scope. */
  private async scoping(engine: SqlEngineKey, options: BenchOptions): Promise<number> {
    const query = this.client(engine).from(TABLES.records).select('id', 'amount')
    if (options.scoped) {
      query.whereNull('deleted_at').andWhere('tenant_id', randInt(1, SEED.tenantCount))
    }
    const rows = await query.orderBy('id', 'asc').limit(options.limit)
    return rows.length
  }

  /** Join records to their category and return a page. */
  private async join(engine: SqlEngineKey, options: BenchOptions): Promise<number> {
    const rows = await this.client(engine)
      .from(`${TABLES.records} as r`)
      .join(`${TABLES.categories} as c`, 'c.id', 'r.category_id')
      .select('r.id', 'r.amount', 'c.name')
      .limit(options.limit)
    return rows.length
  }

  /** Ordered pagination: indexed column (index order) vs unindexed (filesort). */
  private async sortPaginate(engine: SqlEngineKey, options: BenchOptions): Promise<number> {
    const column = options.indexed ? 'indexed_key' : 'unindexed_key'
    const rows = await this.client(engine)
      .from(TABLES.records)
      .select('id')
      .orderBy(column, 'asc')
      .offset(QUERY.paginateOffset)
      .limit(options.limit)
    return rows.length
  }

  /** Total row count, used by the /engines health endpoint. */
  async totalRows(engine: SqlEngineKey): Promise<number> {
    const result = await this.client(engine).from(TABLES.records).count('* as total')
    return toCount(result)
  }
}

const sqlBenchmarkService = new SqlBenchmarkService()
export default sqlBenchmarkService
