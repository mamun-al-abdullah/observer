import type { EngineKey } from '#config/constants'
import { recordBench, recordBenchError } from '#services/metrics'
import mongo from '#services/mongo_service'
import sqlBenchmarkService from '#services/sql_benchmark_service'
import type { BenchOptions, BenchResult, QueryType } from '#services/query_catalog'

/**
 * Single entry point for running a benchmark variant against any engine. It
 * routes to the SQL runner or the Mongo runner and records the OTel metrics,
 * so both the HTTP controller and the load generator share identical behaviour.
 */
export async function runBenchmark(
  engine: EngineKey,
  queryType: QueryType,
  options: BenchOptions
): Promise<BenchResult> {
  try {
    const result =
      engine === 'mongo'
        ? await mongo.run(queryType, options)
        : await sqlBenchmarkService.run(engine, queryType, options)

    recordBench(result)
    return result
  } catch (error) {
    recordBenchError(engine, queryType, options.indexed, options.scoped)
    throw error
  }
}

/**
 * Total row count for an engine (used by the health endpoint).
 */
export async function engineRowCount(engine: EngineKey): Promise<number> {
  return engine === 'mongo' ? mongo.totalRows() : sqlBenchmarkService.totalRows(engine)
}
