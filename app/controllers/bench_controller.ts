import type { HttpContext } from '@adonisjs/core/http'

import { ENGINE_KEYS, isEngineKey } from '#config/constants'
import { runBenchmark } from '#services/benchmark_service'
import { DEFAULT_BENCH_OPTIONS, isQueryType, type BenchOptions } from '#services/query_catalog'

function parseBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback
  return value === 'true' || value === '1'
}

function parseOptions(request: HttpContext['request']): BenchOptions {
  const limit = Number(request.input('limit', DEFAULT_BENCH_OPTIONS.limit))
  return {
    indexed: parseBool(request.input('indexed'), DEFAULT_BENCH_OPTIONS.indexed),
    scoped: parseBool(request.input('scoped'), DEFAULT_BENCH_OPTIONS.scoped),
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_BENCH_OPTIONS.limit,
  }
}

export default class BenchController {
  /**
   * GET /bench/:engine/:queryType — run a single variant against one engine.
   */
  async show({ params, request, response }: HttpContext) {
    const { engine, queryType } = params
    if (!isEngineKey(engine)) {
      return response.badRequest({ error: `Unknown engine: ${engine}`, engines: ENGINE_KEYS })
    }
    if (!isQueryType(queryType)) {
      return response.badRequest({ error: `Unknown query type: ${queryType}` })
    }

    const options = parseOptions(request)
    const result = await runBenchmark(engine, queryType, options)
    return result
  }

  /**
   * GET /bench/compare/:queryType — run the same variant across every engine.
   */
  async compare({ params, request, response }: HttpContext) {
    const { queryType } = params
    if (!isQueryType(queryType)) {
      return response.badRequest({ error: `Unknown query type: ${queryType}` })
    }

    const options = parseOptions(request)
    const settled = await Promise.allSettled(
      ENGINE_KEYS.map((engine) => runBenchmark(engine, queryType, options))
    )

    const results = settled.map((outcome, i) => {
      const engine = ENGINE_KEYS[i]
      if (outcome.status === 'fulfilled') {
        return { engine, ok: true, latencyMs: outcome.value.latencyMs, rows: outcome.value.rows }
      }
      return { engine, ok: false, error: String(outcome.reason?.message ?? outcome.reason) }
    })

    return { queryType, options, results }
  }
}
